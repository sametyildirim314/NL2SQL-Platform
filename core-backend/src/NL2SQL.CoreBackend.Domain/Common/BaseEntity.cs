namespace NL2SQL.CoreBackend.Domain.Common;

public abstract class BaseEntity
{   
    public Guid Id { get; set; } = Guid.NewGuid();//PK
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;//Oluşturulma zamanı
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;//Güncellenme zamanı
}
