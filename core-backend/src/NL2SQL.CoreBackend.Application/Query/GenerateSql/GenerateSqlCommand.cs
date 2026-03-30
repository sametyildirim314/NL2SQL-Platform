using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NL2SQL.CoreBackend.Application.Common.Interfaces;
using NL2SQL.CoreBackend.Application.Common.Models;
using NL2SQL.CoreBackend.Application.Common.Models.AIBackend;
using NL2SQL.CoreBackend.Application.Common.Options;
using NL2SQL.CoreBackend.Application.Common.Sql;
using NL2SQL.CoreBackend.Application.Query.DTOs;
using NL2SQL.CoreBackend.Domain.Entities;
using NL2SQL.CoreBackend.Domain.Enums;

namespace NL2SQL.CoreBackend.Application.Query.GenerateSql;

public record GenerateSqlCommand(Guid UserId, GenerateSqlRequest Request)
    : IRequest<ApiResponse<GenerateSqlResponse>>;

public sealed class GenerateSqlCommandHandler : IRequestHandler<GenerateSqlCommand, ApiResponse<GenerateSqlResponse>>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly IUnitOfWork _uow;
    private readonly IAIBackendService _ai;
    private readonly ISqlSecurityValidator _validator;
    private readonly ISqlExecutionService _sqlExec;
    private readonly IAiQueryConcurrencyGate _gate;
    private readonly IOptions<QueryExecutionOptions> _options;
    private readonly ILogger<GenerateSqlCommandHandler> _logger;

    public GenerateSqlCommandHandler(
        IUnitOfWork uow,
        IAIBackendService ai,
        ISqlSecurityValidator validator,
        ISqlExecutionService sqlExec,
        IAiQueryConcurrencyGate gate,
        IOptions<QueryExecutionOptions> options,
        ILogger<GenerateSqlCommandHandler> logger)
    {
        _uow = uow;
        _ai = ai;
        _validator = validator;
        _sqlExec = sqlExec;
        _gate = gate;
        _options = options;
        _logger = logger;
    }

    public async Task<ApiResponse<GenerateSqlResponse>> Handle(GenerateSqlCommand cmd, CancellationToken ct)
    {
        var req = cmd.Request;
        var opt = _options.Value;

        var pageSize = req.PageSize <= 0 ? opt.DefaultPageSize : Math.Min(req.PageSize, opt.MaxPageSize);
        var skip = (req.Page - 1) * pageSize;

        var connections = await _uow.DatabaseConnections.FindAsync(
            c => c.UserId == cmd.UserId && c.DbId == req.DbId && c.IsActive, ct);
        var conn = connections.FirstOrDefault();
        if (conn is null)
            return ApiResponse<GenerateSqlResponse>.Fail("Veritabanı bağlantısı bulunamadı veya devre dışı.");

        await using (await _gate.AcquireAsync(ct).ConfigureAwait(false))
        {
        var aiRequest = new AIGenerateSqlRequest
        {
            DbId = conn.DbId,
            ConnectionString = conn.ConnectionString.ToSqlAlchemyUri(conn.Provider),
            Query = req.Query.Trim(),
            UserId = cmd.UserId.ToString(),
            DryRunLimit = req.DryRunLimit ?? opt.DefaultDryRunLimit
        };

        AIGenerateSqlResponse aiResp;
        try
        {
            aiResp = await _ai.GenerateSqlAsync(aiRequest, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI Backend çağrısı başarısız");
            await SaveHistoryAsync(
                cmd.UserId,
                conn.DbId,
                req.Query,
                null,
                null,
                ExecutionStatus.Failed,
                null,
                ex.Message,
                null,
                ct);
            return ApiResponse<GenerateSqlResponse>.Fail("AI servisi şu anda kullanılamıyor.");
        }

        if (!IsAiSuccess(aiResp))
        {
            var err = aiResp.Error ?? aiResp.Message ?? "SQL üretilemedi.";
            await SaveHistoryAsync(
                cmd.UserId,
                conn.DbId,
                req.Query,
                null,
                aiResp.Explanation,
                ExecutionStatus.Failed,
                null,
                err,
                null,
                ct);
            return ApiResponse<GenerateSqlResponse>.Fail(err);
        }

        var sql = aiResp.SqlQuery?.Trim();
        if (string.IsNullOrEmpty(sql))
        {
            await SaveHistoryAsync(
                cmd.UserId,
                conn.DbId,
                req.Query,
                null,
                aiResp.Explanation,
                ExecutionStatus.Failed,
                null,
                "AI üretilen SQL boş.",
                null,
                ct);
            return ApiResponse<GenerateSqlResponse>.Fail("AI üretilen SQL boş.");
        }

        var validation = _validator.Validate(sql, conn.Provider);
        var validationResult = BuildValidationResult(validation);

        if (!validation.IsValid)
        {
            await SaveHistoryAsync(
                cmd.UserId,
                conn.DbId,
                req.Query,
                sql,
                aiResp.Explanation,
                ExecutionStatus.Rejected,
                null,
                validation.Message,
                null,
                ct);

            return ApiResponse<GenerateSqlResponse>.Ok(new GenerateSqlResponse(
                Status: "rejected",
                SqlQuery: sql,
                Explanation: aiResp.Explanation,
                Data: null,
                Error: validation.Message,
                Validation: validationResult,
                ExecutionTimeMs: null,
                IsValidated: false,
                ImpactRows: null,
                AiErrorCode: aiResp.ErrorCode));
        }

        var paginatedSql = SqlPaginationWrapper.Wrap(sql, conn.Provider, skip, pageSize);

        var exec = await _sqlExec.ExecuteReadOnlyAsync(
            conn.ConnectionString,
            conn.Provider,
            paginatedSql,
            opt.CommandTimeoutSeconds,
            ct);

        if (!exec.Success)
        {
            await SaveHistoryAsync(
                cmd.UserId,
                conn.DbId,
                req.Query,
                sql,
                aiResp.Explanation,
                ExecutionStatus.Failed,
                (int?)exec.ElapsedMs,
                exec.ErrorMessage,
                null,
                ct);

            return ApiResponse<GenerateSqlResponse>.Ok(new GenerateSqlResponse(
                Status: "execution_failed",
                SqlQuery: sql,
                Explanation: aiResp.Explanation,
                Data: null,
                Error: exec.ErrorMessage,
                Validation: validationResult,
                ExecutionTimeMs: (int)exec.ElapsedMs,
                IsValidated: aiResp.IsValidated ?? true,
                ImpactRows: aiResp.ImpactRows,
                AiErrorCode: aiResp.ErrorCode));
        }

        var data = exec.Rows ?? Array.Empty<Dictionary<string, object?>>();
        var json = JsonSerializer.Serialize(data, JsonOptions);

        await SaveHistoryAsync(
            cmd.UserId,
            conn.DbId,
            req.Query,
            sql,
            aiResp.Explanation,
            ExecutionStatus.Success,
            (int)exec.ElapsedMs,
            null,
            json,
            ct);

        return ApiResponse<GenerateSqlResponse>.Ok(new GenerateSqlResponse(
            Status: "success",
            SqlQuery: sql,
            Explanation: aiResp.Explanation,
            Data: data.ToList(),
            Error: null,
            Validation: validationResult,
            ExecutionTimeMs: (int)exec.ElapsedMs,
            IsValidated: aiResp.IsValidated ?? true,
            ImpactRows: aiResp.ImpactRows ?? exec.RowCount,
            AiErrorCode: aiResp.ErrorCode));
        }
    }

    private static bool IsAiSuccess(AIGenerateSqlResponse r)
    {
        if (string.Equals(r.Status, "failed", StringComparison.OrdinalIgnoreCase))
            return false;
        if (string.Equals(r.Status, "error", StringComparison.OrdinalIgnoreCase))
            return false;
        if (!string.IsNullOrEmpty(r.Error))
            return false;
        return string.Equals(r.Status, "success", StringComparison.OrdinalIgnoreCase)
            || (!string.IsNullOrEmpty(r.SqlQuery) && string.IsNullOrEmpty(r.Error));
    }

    private static ValidationResult BuildValidationResult(SqlValidationResult v)
    {
        if (v.IsValid)
        {
            return new ValidationResult(
                new ValidationCheck(true, "Geçerli"),
                new ValidationCheck(true, "Geçerli"),
                new ValidationCheck(true, "Geçerli"),
                new ValidationCheck(null, "Henüz uygulanmıyor"),
                new ValidationCheck(null, "Henüz uygulanmıyor"));
        }

        var msg = v.Message ?? "";
        var code = v.ErrorCode;

        var syntaxFail = code is "SQL_PARSE" or "SQL_EMPTY";
        var injFail = code == "SQL_BLOCKED";
        var secFail = code is "SQL_DML_DDL" or "SQL_MULTI" or "SQL_NOT_SELECT";

        return new ValidationResult(
            new ValidationCheck(!syntaxFail, syntaxFail ? msg : ""),
            new ValidationCheck(!secFail, secFail ? msg : ""),
            new ValidationCheck(!injFail, injFail ? msg : ""),
            new ValidationCheck(null, "Henüz uygulanmıyor"),
            new ValidationCheck(null, "Henüz uygulanmıyor"));
    }

    private async Task SaveHistoryAsync(
        Guid userId,
        string dbId,
        string nlQuery,
        string? generatedSql,
        string? explanation,
        ExecutionStatus status,
        int? executionTimeMs,
        string? errorMessage,
        string? resultJson,
        CancellationToken ct)
    {
        var h = new QueryHistory
        {
            UserId = userId,
            DbId = dbId,
            NaturalLanguageQuery = nlQuery,
            GeneratedSql = generatedSql,
            Explanation = explanation,
            ExecutionStatus = status,
            ExecutionTimeMs = executionTimeMs,
            ErrorMessage = errorMessage,
            ResultDataJson = resultJson
        };
        await _uow.QueryHistories.AddAsync(h, ct);
        await _uow.SaveChangesAsync(ct);
    }
}
