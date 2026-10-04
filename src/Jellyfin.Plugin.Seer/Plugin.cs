using System;
using System.Collections.Generic;
using System.IO;
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
        AutoCleanupOldPluginVersions(applicationPaths.PluginsPath);
    }

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override string Name => "Physeerlia";

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

    /// <inheritdoc />
    public override void OnUninstalling()
    {
        base.OnUninstalling();
        try
        {
            if (File.Exists(ConfigurationFilePath))
            {
                File.Delete(ConfigurationFilePath);
            }
        }
        catch
        {
            // Ignore any failure on uninstallation cleanup
        }
    }
    /// <summary>
    /// Automatically detects and purges stale version directories for this plugin to prevent
    /// Jellyfin dual-assembly loading and controller route collisions on server restart.
    /// </summary>
    private void AutoCleanupOldPluginVersions(string pluginsPath)
    {
        try
        {
            if (string.IsNullOrEmpty(pluginsPath) || !Directory.Exists(pluginsPath))
            {
                return;
            }

            var currentAssemblyLocation = typeof(Plugin).Assembly.Location;
            if (string.IsNullOrEmpty(currentAssemblyLocation))
            {
                return;
            }

            var currentDir = Path.GetDirectoryName(currentAssemblyLocation);
            if (string.IsNullOrEmpty(currentDir))
            {
                return;
            }

            var allPluginDirs = Directory.GetDirectories(pluginsPath);
            foreach (var dir in allPluginDirs)
            {
                // Skip our own currently active directory
                if (string.Equals(Path.GetFullPath(dir), Path.GetFullPath(currentDir), StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var dirName = Path.GetFileName(dir);
                if (string.IsNullOrEmpty(dirName) || string.Equals(dirName, "configurations", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                // Only versioned folders of the form "<Name>_<Version>" that are STRICTLY OLDER
                // than the running assembly are considered stale. Newer or unversioned folders
                // are never touched (an older copy loaded side by side must not delete a newer one).
                bool isStalePlugin = false;
                var currentVersion = typeof(Plugin).Assembly.GetName().Version;
                var underscore = dirName.LastIndexOf('_');
                if (currentVersion != null
                    && underscore > 0
                    && dirName.Substring(0, underscore).Equals("Physeerlia", StringComparison.OrdinalIgnoreCase)
                    && Version.TryParse(dirName.Substring(underscore + 1), out var dirVersion)
                    && dirVersion < currentVersion)
                {
                    isStalePlugin = true;
                }

                if (isStalePlugin)
                {
                    try
                    {
                        Directory.Delete(dir, recursive: true);
                    }
                    catch
                    {
                        // Fallback: If OS locks directory, disable old assemblies so Jellyfin ignores them
                        try
                        {
                            foreach (var dll in Directory.GetFiles(dir, "*.dll"))
                            {
                                try
                                {
                                    var disabledName = dll + ".old_disabled";
                                    if (File.Exists(disabledName))
                                    {
                                        File.Delete(disabledName);
                                    }
                                    File.Move(dll, disabledName);
                                }
                                catch
                                {
                                    // ignore individual file move error
                                }
                            }
                        }
                        catch
                        {
                            // ignore
                        }
                    }
                }
            }
        }
        catch
        {
            // Fail-safe: Never crash plugin startup
        }
    }
}
