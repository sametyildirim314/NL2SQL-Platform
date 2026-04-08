using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NL2SQL.CoreBackend.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveResultDataJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "result_data_json",
                table: "query_history");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "result_data_json",
                table: "query_history",
                type: "jsonb",
                nullable: true);
        }
    }
}
