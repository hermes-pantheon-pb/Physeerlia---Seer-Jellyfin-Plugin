using System;
using System.Collections.Generic;
using Jellyfin.Plugin.Seer.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.Seer;

/// <summary>
/// The main Seer integration plugin for Jellyfin.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override string Name => "Seer Integration";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("b1b87a2a-4db3-4fc9-b59a-143c7b39922e");

    /// <inheritdoc />
    public override string Description => "Native Overseerr and Jellyseerr requests and discovery integration.";

    /// <summary>
    /// Serves plugin admin configuration page in the Jellyfin Dashboard.
    /// </summary>
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = "seer",
                DisplayName = "Seer",
                EmbeddedResourcePath = string.Format("{0}.Configuration.configPage.html", GetType().Namespace),
                EnableInMainMenu = true,
                MenuIcon = "travel_explore"
            }
        };
    }
}
