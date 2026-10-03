using MediaBrowser.Common.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.Seer;

/// <summary>
/// Registers dependency injection services for the Seer plugin.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection)
    {
        serviceCollection.AddHttpClient("SeerProxyClient", client =>
        {
            client.Timeout = System.TimeSpan.FromSeconds(30);
        });
    }
}
