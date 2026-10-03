using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.Seer;

/// <summary>
/// Registers dependency injection services for the Seer plugin.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddHttpClient("SeerProxyClient", client =>
        {
            client.Timeout = System.TimeSpan.FromSeconds(30);
        });
    }
}
