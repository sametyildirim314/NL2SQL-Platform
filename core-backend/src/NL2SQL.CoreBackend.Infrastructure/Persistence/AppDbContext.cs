using Microsoft.EntityFrameworkCore;
using NL2SQL.CoreBackend.Domain.Entities;

namespace NL2SQL.CoreBackend.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core DbContext – PostgreSQL.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<QueryHistory> QueryHistories => Set<QueryHistory>();
    public DbSet<SchemaCache> SchemaCaches => Set<SchemaCache>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<QueryHistory>(entity =>
        {
            entity.ToTable("query_history");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NaturalLanguageQuery).IsRequired();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt).IsDescending();
        });

        modelBuilder.Entity<SchemaCache>(entity =>
        {
            entity.ToTable("schema_cache");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DatabaseName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.SchemaJson).HasColumnType("jsonb");
            entity.HasIndex(e => e.DatabaseName);
            entity.HasIndex(e => e.ExpiresAt);
        });
    }
}
