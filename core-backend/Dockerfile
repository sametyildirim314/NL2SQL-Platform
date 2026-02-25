# ============================================================
# NL2SQL Core Backend Dockerfile (.NET 8 Web API)
# Multi-stage, production-ready, security-hardened
# ============================================================

# ----- Stage 1: Build -----
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /src

# Dependency restore (cache-friendly layer)
COPY ["src/NL2SQL.CoreBackend.API/NL2SQL.CoreBackend.API.csproj", "NL2SQL.CoreBackend.API/"]
COPY ["src/NL2SQL.CoreBackend.Application/NL2SQL.CoreBackend.Application.csproj", "NL2SQL.CoreBackend.Application/"]
COPY ["src/NL2SQL.CoreBackend.Domain/NL2SQL.CoreBackend.Domain.csproj", "NL2SQL.CoreBackend.Domain/"]
COPY ["src/NL2SQL.CoreBackend.Infrastructure/NL2SQL.CoreBackend.Infrastructure.csproj", "NL2SQL.CoreBackend.Infrastructure/"]
RUN dotnet restore "NL2SQL.CoreBackend.API/NL2SQL.CoreBackend.API.csproj"

# Tüm kaynak kodu kopyala ve yayınla
COPY src/ .
RUN dotnet publish "NL2SQL.CoreBackend.API/NL2SQL.CoreBackend.API.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ----- Stage 2: Runtime -----
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime

LABEL maintainer="devops@nurolteknoloji.com" \
      description="NL2SQL Core Backend & SQL Validator Service (.NET 8)" \
      version="1.0.0"

WORKDIR /app

# Güvenlik: ICU kütüphanesi (globalization) + curl (healthcheck)
RUN apk add --no-cache icu-libs curl && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Globalization desteği
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# ASP.NET Core konfigürasyonu
ENV ASPNETCORE_URLS=http://+:8001
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish .

RUN chown -R appuser:appgroup /app
USER appuser

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

EXPOSE 8001

ENTRYPOINT ["dotnet", "NL2SQL.CoreBackend.API.dll"]
