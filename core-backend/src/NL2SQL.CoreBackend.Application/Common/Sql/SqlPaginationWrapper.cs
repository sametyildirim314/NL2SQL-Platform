using NL2SQL.CoreBackend.Domain.Enums;

namespace NL2SQL.CoreBackend.Application.Common.Sql;

/// <summary>
/// Üretilen SELECT'i alt sorgu ile sararak Core tarafında sayfalama uygular.
/// </summary>
public static class SqlPaginationWrapper
{
    public static string Wrap(string innerSql, DatabaseProvider provider, int skip, int take)
    {
        if (take <= 0)
            take = 50;
        if (skip < 0)
            skip = 0;

        var trimmed = innerSql.Trim().TrimEnd(';');
        return provider switch
        {
            DatabaseProvider.PostgreSQL or DatabaseProvider.MySql or DatabaseProvider.SqLite =>
                $"SELECT * FROM ({trimmed}) AS _nl2sql_q LIMIT {take} OFFSET {skip}",
            DatabaseProvider.MsSql =>
                System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"\bORDER BY\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase) 
                    ? (System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"\bTOP\b|\bOFFSET\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase) 
                        ? trimmed 
                        : $"{trimmed} OFFSET {skip} ROWS FETCH NEXT {take} ROWS ONLY")
                    : $"{trimmed} ORDER BY (SELECT NULL) OFFSET {skip} ROWS FETCH NEXT {take} ROWS ONLY",
            DatabaseProvider.Oracle =>
                $"SELECT * FROM ({trimmed}) _nl2sql_q OFFSET {skip} ROWS FETCH NEXT {take} ROWS ONLY",
            _ =>
                $"SELECT * FROM ({trimmed}) AS _nl2sql_q LIMIT {take} OFFSET {skip}"
        };
    }
}
