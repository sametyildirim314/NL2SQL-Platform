using Microsoft.Extensions.DependencyInjection;
using MediatR;

namespace NL2SQL.CoreBackend.Application;

/// <summary>
/// Application katmanı servis kayıtları.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        return services;
    }
}
