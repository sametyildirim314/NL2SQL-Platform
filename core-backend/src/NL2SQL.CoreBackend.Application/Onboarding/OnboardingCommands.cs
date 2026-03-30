using MediatR;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using NL2SQL.CoreBackend.Application.Common.Interfaces;
using NL2SQL.CoreBackend.Application.Common.Models;
using NL2SQL.CoreBackend.Application.Common.Models.AIBackend;
using NL2SQL.CoreBackend.Application.Common.Sql;
using NL2SQL.CoreBackend.Application.Onboarding.DTOs;
using NL2SQL.CoreBackend.Domain.Entities;

namespace NL2SQL.CoreBackend.Application.Onboarding;

public record ExtractSchemaCommand(Guid UserId, ExtractSchemaRequestDto Request)
    : IRequest<ApiResponse<ExtractSchemaResponseDto>>;

public record RegisterSchemaCommand(Guid UserId, RegisterSchemaRequestDto Request)
    : IRequest<ApiResponse<RegisterSchemaResponseDto>>;

public sealed class OnboardingMutationHandlers :
    IRequestHandler<ExtractSchemaCommand, ApiResponse<ExtractSchemaResponseDto>>,
    IRequestHandler<RegisterSchemaCommand, ApiResponse<RegisterSchemaResponseDto>>
{
    private static readonly JsonSerializerOptions CacheJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly IUnitOfWork _uow;
    private readonly IAIBackendService _ai;
    private readonly ILogger<OnboardingMutationHandlers> _logger;

    public OnboardingMutationHandlers(
        IUnitOfWork uow,
        IAIBackendService ai,
        ILogger<OnboardingMutationHandlers> logger)
    {
        _uow = uow;
        _ai = ai;
        _logger = logger;
    }

    public async Task<ApiResponse<ExtractSchemaResponseDto>> Handle(ExtractSchemaCommand cmd, CancellationToken ct)
    {
        var req = cmd.Request;
        var dbId = req.DbId.Trim();

        var conn = (await _uow.DatabaseConnections.FindAsync(
            c => c.UserId == cmd.UserId && c.DbId == dbId && c.IsActive, ct)).FirstOrDefault();
        if (conn is null)
            return ApiResponse<ExtractSchemaResponseDto>.Fail("Veritabanı bağlantısı bulunamadı veya devre dışı.");

        var cs = string.IsNullOrWhiteSpace(req.ConnectionString) ? conn.ConnectionString : req.ConnectionString.Trim();
        if (string.IsNullOrEmpty(cs))
            return ApiResponse<ExtractSchemaResponseDto>.Fail("Bağlantı dizisi boş.");

        var aiReq = new AIExtractSchemaRequest { DbId = conn.DbId, ConnectionString = cs.ToSqlAlchemyUri(conn.Provider) };

        AIExtractSchemaResponse ai;
        try
        {
            ai = await _ai.ExtractSchemaAsync(aiReq, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI extract çağrısı başarısız");
            return ApiResponse<ExtractSchemaResponseDto>.Fail("AI servisi şu anda kullanılamıyor.");
        }

        if (!string.IsNullOrEmpty(ai.Error))
            return ApiResponse<ExtractSchemaResponseDto>.Fail(ai.Error);

        var dto = new ExtractSchemaResponseDto
        {
            DbId = ai.DbId,
            Tables = ai.Tables.Select(MapTable).ToList(),
            FewShotExamples = ai.FewShotExamples ?? []
        };

        return ApiResponse<ExtractSchemaResponseDto>.Ok(dto);
    }

    public async Task<ApiResponse<RegisterSchemaResponseDto>> Handle(RegisterSchemaCommand cmd, CancellationToken ct)
    {
        var req = cmd.Request;
        var dbId = req.DbId.Trim();

        var conn = (await _uow.DatabaseConnections.FindAsync(
            c => c.UserId == cmd.UserId && c.DbId == dbId && c.IsActive, ct)).FirstOrDefault();
        if (conn is null)
            return ApiResponse<RegisterSchemaResponseDto>.Fail("Veritabanı bağlantısı bulunamadı veya devre dışı.");

        if (req.Tables.Count == 0)
            return ApiResponse<RegisterSchemaResponseDto>.Fail("En az bir tablo gerekli.");

        var aiReq = new AIRegisterSchemaRequest
        {
            DbId = dbId,
            Tables = req.Tables.Select(ToAiTable).ToList(),
            FewShotExamples = req.FewShotExamples ?? []
        };

        AIRegisterSchemaResponse ai;
        try
        {
            ai = await _ai.RegisterSchemaAsync(aiReq, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI register çağrısı başarısız");
            return ApiResponse<RegisterSchemaResponseDto>.Fail("AI servisi şu anda kullanılamıyor.");
        }

        if (!string.IsNullOrEmpty(ai.Error))
            return ApiResponse<RegisterSchemaResponseDto>.Fail(ai.Error);

        await UpsertSchemaCacheAsync(conn, req, ct);

        var dto = new RegisterSchemaResponseDto
        {
            Status = ai.Status,
            DbId = ai.DbId,
            ChunksSaved = ai.ChunksSaved
        };

        return ApiResponse<RegisterSchemaResponseDto>.Ok(dto, "Şema kaydedildi.");
    }

    private async Task UpsertSchemaCacheAsync(
        DatabaseConnection conn,
        RegisterSchemaRequestDto req,
        CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(req, CacheJsonOptions);

        var caches = await _uow.SchemaCaches.FindAsync(s => s.DbId == req.DbId, ct);
        var entity = caches.OrderByDescending(x => x.UpdatedAt).FirstOrDefault();

        if (entity is null)
        {
            await _uow.SchemaCaches.AddAsync(new SchemaCache
            {
                DbId = req.DbId,
                DatabaseName = conn.DisplayName,
                SchemaJson = json,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            }, ct);
        }
        else
        {
            entity.DatabaseName = conn.DisplayName;
            entity.SchemaJson = json;
            entity.ExpiresAt = DateTime.UtcNow.AddHours(24);
            _uow.SchemaCaches.Update(entity);
        }

        await _uow.SaveChangesAsync(ct);
    }

    private static TableSchemaItemDto MapTable(AITableSchema t) => new()
    {
        Name = t.Name,
        Columns = t.Columns,
        HumanDescription = t.HumanDescription,
        BusinessRules = t.BusinessRules
    };

    private static AITableSchema ToAiTable(TableSchemaItemDto t) => new()
    {
        Name = t.Name,
        Columns = t.Columns,
        HumanDescription = t.HumanDescription?.Trim() ?? "",
        BusinessRules = t.BusinessRules?.Trim() ?? ""
    };
}
