using Jellyfin.Plugin.Seer.Middleware;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.Seer;

/// <summary>
/// Registers dependency injection services for the Seer plugin.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // Intercepts index.html in memory to load Seer client assets with zero file mutation
        serviceCollection.AddTransient<IStartupFilter, SeerIndexHtmlInjectionFilter>();

        serviceCollection.AddHttpClient("SeerProxyClient", client =>
        {
            client.Timeout = System.TimeSpan.FromSeconds(30);
        }).ConfigurePrimaryHttpMessageHandler(() => new System.Net.Http.SocketsHttpHandler
        {
            UseCookies = false,
            AllowAutoRedirect = false
        });
    }
}
