namespace NL2SQL.CoreBackend.Domain.Entities;

/// <summary>
/// Kullanıcının doğal dil sorgusunun ve üretilen SQL'in geçmişini tutar.
/// </summary>
public class QueryHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string NaturalLanguageQuery { get; set; } = string.Empty;
    public string? GeneratedSql { get; set; }
    public string ExecutionStatus { get; set; } = "pending";
    public int? ExecutionTimeMs { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
