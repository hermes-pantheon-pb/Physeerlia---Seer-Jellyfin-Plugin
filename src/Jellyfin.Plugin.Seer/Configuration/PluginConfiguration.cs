using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.Seer.Configuration;

/// <summary>
/// Server configuration for Seer Integration.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    public PluginConfiguration()
    {
        SeerServerUrl = "http://10.10.10.172:5055";
        SeerAdminApiKey = string.Empty;
        EnableProxy = true;
        EnableUserDelegation = true;
        DefaultEnableBackdrops = true;
        DefaultEnableGlassTheme = true;
    }

    /// <summary>
    /// Gets or sets the internal Overseerr / Jellyseerr URL accessible from the Jellyfin server.
    /// </summary>
    public string SeerServerUrl { get; set; }

    /// <summary>
    /// Gets or sets the Seer Master / Admin API key for delegated operations.
    /// </summary>
    public string SeerAdminApiKey { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the internal reverse proxy is active.
    /// </summary>
    public bool EnableProxy { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether requests are automatically delegated on behalf of logged-in Jellyfin users.
    /// </summary>
    public bool EnableUserDelegation { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether dynamic backdrops are enabled by default for clients.
    /// </summary>
    public bool DefaultEnableBackdrops { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the frosted glass Abyss theme is enabled by default.
    /// </summary>
    public bool DefaultEnableGlassTheme { get; set; }
}
