namespace NL2SQL.CoreBackend.Domain.Entities;

/// <summary>
/// Veritabanı şema bilgisinin önbellek kaydı.
/// </summary>
public class SchemaCache
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DatabaseName { get; set; } = string.Empty;
    public string SchemaJson { get; set; } = "{}";
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(1);
}
