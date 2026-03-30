using System.Data.Common;
using NL2SQL.CoreBackend.Domain.Enums;

namespace NL2SQL.CoreBackend.Application.Common.Sql;

public static class SqlConnectionStringExtensions
{
    public static string ToSqlAlchemyUri(this string adoNetConnectionString, DatabaseProvider provider)
    {
        try
        {
            var builder = new DbConnectionStringBuilder { ConnectionString = adoNetConnectionString };
            
            return provider switch
            {
                DatabaseProvider.PostgreSQL => BuildPostgresUri(builder),
                DatabaseProvider.MsSql => BuildMsSqlUri(builder),
                _ => adoNetConnectionString // Default behavior
            };
        }
        catch
        {
            // Eğer parse edilemezse veya bozuk formattaysa orijinalini dönerek sorumluluğu bırak.
            return adoNetConnectionString;
        }
    }

    private static string BuildPostgresUri(DbConnectionStringBuilder builder)
    {
        var host = GetValue(builder, "Host", "Server", "Data Source");
        var port = GetValue(builder, "Port");
        if (string.IsNullOrEmpty(port)) port = "5432";
        
        var db = GetValue(builder, "Database", "Initial Catalog");
        var user = GetValue(builder, "Username", "User Id", "Uid");
        var pass = GetValue(builder, "Password", "Pwd");

        return $"postgresql+psycopg2://{Uri.EscapeDataString(user)}:{Uri.EscapeDataString(pass)}@{host}:{port}/{Uri.EscapeDataString(db)}";
    }

    private static string BuildMsSqlUri(DbConnectionStringBuilder builder)
    {
        var host = GetValue(builder, "Server", "Data Source");
        if (host.Contains(','))
            host = host.Replace(',', ':');
        var db = GetValue(builder, "Database", "Initial Catalog");
        var user = GetValue(builder, "User Id", "Username", "Uid");
        var pass = GetValue(builder, "Password", "Pwd");

        // SQLAlchemy için host içindeki "\" (ters bölü) Named Instance belirtiyorsa url encode'a tabi olabilir. 
        // SQLAlchemy 2.0 mssql+pymssql dialect'i '\\' bekler, ancak url'de escape edilebilir:
        // mssql+pymssql://user:pass@host\instance/db
        return $"mssql+pymssql://{Uri.EscapeDataString(user)}:{Uri.EscapeDataString(pass)}@{host}/{Uri.EscapeDataString(db)}?charset=utf8";
    }

    private static string GetValue(DbConnectionStringBuilder builder, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (builder.TryGetValue(key, out var val) && val is string s)
                return s;
        }
        return string.Empty;
    }
}
