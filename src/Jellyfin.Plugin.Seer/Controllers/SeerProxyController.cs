using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Seer.Controllers;

/// <summary>
/// Controller for securely proxying Seer API requests with authenticated user mapping
/// and serving embedded client assets.
/// </summary>
[ApiController]
[Route("Plugins/Seer")]
public class SeerProxyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SeerProxyController> _logger;
    private readonly IUserManager _userManager;
    private readonly ISessionManager _sessionManager;

    // In-memory cache for mapping Jellyfin user GUIDs to Seer User IDs (TTL: 5 minutes)
    private static readonly ConcurrentDictionary<Guid, CachedSeerUser> _seerUserCache = new();

    private record CachedSeerUser(int SeerId, int Permissions, DateTime CachedAt);

    private class CurrentJellyfinUser
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public bool IsAdministrator { get; set; }
    }

    public SeerProxyController(
        IHttpClientFactory httpClientFactory,
        ILogger<SeerProxyController> logger,
        IUserManager userManager,
        ISessionManager sessionManager)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _userManager = userManager;
        _sessionManager = sessionManager;
    }

    /// <summary>
    /// Serves embedded web assets (bundle.js, bundle.css) with HTTP cache headers.
    /// </summary>
    [HttpGet("Web/{filename}")]
    [AllowAnonymous]
    public IActionResult GetWebAsset(string filename)
    {
        var sanitizedFilename = Path.GetFileName(filename);
        var resourceName = $"Jellyfin.Plugin.Seer.Web.{sanitizedFilename}";
        var assembly = Assembly.GetExecutingAssembly();

        var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            return NotFound($"Asset '{sanitizedFilename}' not found.");
        }

        var contentType = sanitizedFilename.EndsWith(".css", StringComparison.OrdinalIgnoreCase)
            ? "text/css"
            : sanitizedFilename.EndsWith(".js", StringComparison.OrdinalIgnoreCase)
                ? "application/javascript"
                : "application/octet-stream";

        // If a cache-busting query parameter (e.g., ?v=...) is supplied, cache aggressively
        if (Request.Query.ContainsKey("v"))
        {
            Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
        }
        else
        {
            Response.Headers["Cache-Control"] = "public, max-age=3600";
        }

        return File(stream, contentType);
    }

    /// <summary>
    /// Proxies requests to the internal Seer instance with strict Jellyfin authentication
    /// and user-mapped permissions.
    /// </summary>
    [Route("Proxy/{**path}")]
    [Route("/avatarproxy/{**path}")]
    public async Task ProxyRequest()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || !config.EnableProxy)
        {
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            Response.ContentType = "application/json";
            await Response.WriteAsync("{\"message\": \"Seer proxy is disabled in plugin configuration.\"}");
            return;
        }

        var seerBaseUrl = (config.SeerServerUrl ?? "http://localhost:5055").TrimEnd('/');
        var rawPath = Request.Path.Value ?? string.Empty;
        string targetSubpath;
        if (rawPath.StartsWith("/avatarproxy", StringComparison.OrdinalIgnoreCase))
        {
            targetSubpath = rawPath;
        }
        else
        {
            targetSubpath = rawPath.Replace("/Plugins/Seer/Proxy", string.Empty, StringComparison.OrdinalIgnoreCase);
            if (!targetSubpath.StartsWith('/'))
            {
                targetSubpath = "/" + targetSubpath;
            }
        }

        bool isAuthSubmission = targetSubpath.StartsWith("/api/v1/auth/local", StringComparison.OrdinalIgnoreCase) ||
                                targetSubpath.StartsWith("/api/v1/auth/jellyfin", StringComparison.OrdinalIgnoreCase);

        // 1. Verify that a valid Jellyfin user session exists (unless this is an explicit login submission)
        CurrentJellyfinUser? jfUser = null;
        if (!isAuthSubmission)
        {
            jfUser = await ResolveCurrentJellyfinUserAsync();
            if (jfUser == null)
            {
                _logger.LogWarning("[SeerProxy] Unauthorized proxy attempt without a valid Jellyfin user session on path: {Path}", targetSubpath);
                Response.StatusCode = StatusCodes.Status401Unauthorized;
                Response.ContentType = "application/json";
                await Response.WriteAsync("{\"message\": \"Unauthorized: A valid Jellyfin user session is required.\"}");
                return;
            }
        }

        var queryParams = Request.Query
            .Where(q => !q.Key.Equals("api_key", StringComparison.OrdinalIgnoreCase))
            .SelectMany(q => q.Value.Select(v => $"{Uri.EscapeDataString(q.Key)}={Uri.EscapeDataString(v ?? string.Empty)}"))
            .ToList();
        var targetQuery = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : string.Empty;
        var targetUrl = $"{seerBaseUrl}{targetSubpath}{targetQuery}";

        try
        {
            var client = _httpClientFactory.CreateClient("SeerProxyClient");
            using var proxyMessage = new HttpRequestMessage(new HttpMethod(Request.Method), targetUrl);

            // 2. Safely copy incoming headers, excluding internal Jellyfin auth and connection headers
            foreach (var header in Request.Headers)
            {
                var key = header.Key;
                if (key.Equals("Host", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("X-Emby-Token", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("X-Emby-Authorization", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("X-MediaBrowser-Token", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("X-Seer-Url", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("X-Api-Key", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("X-API-User", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (key.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                {
                    var val = header.Value.ToString();
                    if (val.Contains("MediaBrowser", StringComparison.OrdinalIgnoreCase) ||
                        val.Contains("Bearer", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                }

                proxyMessage.Headers.TryAddWithoutValidation(key, header.Value.ToArray());
            }

            // 3. Determine user delegation mode
            bool hasSeerCookie = Request.Headers.TryGetValue("Cookie", out var cookieHeader) &&
                                 cookieHeader.ToString().Contains("connect.sid");

            if (!hasSeerCookie && !isAuthSubmission && jfUser != null)
            {
                if (config.EnableUserDelegation && !string.IsNullOrEmpty(config.SeerAdminApiKey))
                {
                    // Map the authenticated Jellyfin user to their corresponding Seer user ID
                    var seerUserId = await ResolveSeerUserIdAsync(client, seerBaseUrl, config.SeerAdminApiKey, jfUser);
                    if (!seerUserId.HasValue)
                    {
                        _logger.LogWarning("[SeerProxy] Jellyfin user {Username} ({Id}) is not registered in Seer", jfUser.Username, jfUser.Id);
                        Response.StatusCode = StatusCodes.Status403Forbidden;
                        Response.ContentType = "application/json";
                        var errJson = JsonSerializer.Serialize(new
                        {
                            message = $"Jellyfin user '{jfUser.Username}' is not registered in Seer. Please import your account in Overseerr/Jellyseerr."
                        });
                        await Response.WriteAsync(errJson);
                        return;
                    }

                    // Attach admin key together with user delegation header: Overseerr executes request strictly under this user's permissions
                    proxyMessage.Headers.TryAddWithoutValidation("X-Api-Key", config.SeerAdminApiKey);
                    proxyMessage.Headers.TryAddWithoutValidation("X-API-User", seerUserId.Value.ToString());
                }
                else
                {
                    // If user delegation is disabled and no cookie is present, do not attach admin key
                    _logger.LogDebug("[SeerProxy] No session cookie and user delegation is disabled. Forwarding without delegation headers.");
                }
            }

            // 4. Copy body for write operations
            if (HttpMethods.IsPost(Request.Method) || HttpMethods.IsPut(Request.Method) || HttpMethods.IsPatch(Request.Method))
            {
                proxyMessage.Content = new StreamContent(Request.Body);
                if (Request.ContentType != null)
                {
                    proxyMessage.Content.Headers.TryAddWithoutValidation("Content-Type", Request.ContentType);
                }
            }

            using var response = await client.SendAsync(proxyMessage, HttpCompletionOption.ResponseHeadersRead);
            Response.StatusCode = (int)response.StatusCode;

            // Copy response headers back to client
            foreach (var header in response.Headers)
            {
                if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase) &&
                    !header.Key.Equals("Server", StringComparison.OrdinalIgnoreCase))
                {
                    Response.Headers[header.Key] = header.Value.ToArray();
                }
            }

            if (response.Headers.TryGetValues("Set-Cookie", out var cookies))
            {
                Response.Headers["Set-Cookie"] = cookies.ToArray();
            }

            foreach (var header in response.Content.Headers)
            {
                if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
                {
                    Response.Headers[header.Key] = header.Value.ToArray();
                }
            }

            await response.Content.CopyToAsync(Response.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SeerProxy] Error communicating with Seer at {TargetUrl}", targetUrl);
            Response.StatusCode = StatusCodes.Status502BadGateway;
            Response.ContentType = "application/json";
            await Response.WriteAsync("{\"message\": \"Error communicating with Seer server. Please verify Seer URL and reachability in plugin settings.\"}");
        }
    }

    /// <summary>
    /// Resolves the currently authenticated Jellyfin user from claims, request headers, and ISessionManager.
    /// </summary>
    private async Task<CurrentJellyfinUser?> ResolveCurrentJellyfinUserAsync()
    {
        // 1. Check Claims from ASP.NET Core authentication middleware
        var userIdStr = User.FindFirst("Jellyfin-UserId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var claimUserId))
        {
            return BuildUserFromId(claimUserId);
        }

        // 2. Fall back to resolving the session token directly via ISessionManager
        var token = ExtractTokenFromRequest();
        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var session = await _sessionManager.GetSessionByAuthenticationToken(token, null, null);
                if (session != null && session.UserId != Guid.Empty)
                {
                    return BuildUserFromId(session.UserId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[SeerProxy] Could not resolve session from token");
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts Jellyfin authentication token from headers or query parameters.
    /// </summary>
    private string? ExtractTokenFromRequest()
    {
        // Check X-Emby-Token
        if (Request.Headers.TryGetValue("X-Emby-Token", out var embyToken) && !string.IsNullOrWhiteSpace(embyToken))
        {
            return embyToken.ToString();
        }

        // Check X-MediaBrowser-Token
        if (Request.Headers.TryGetValue("X-MediaBrowser-Token", out var mbToken) && !string.IsNullOrWhiteSpace(mbToken))
        {
            return mbToken.ToString();
        }

        // Check Authorization / X-Emby-Authorization header: MediaBrowser ... Token="..." or Bearer ...
        foreach (var headerName in new[] { "Authorization", "X-Emby-Authorization" })
        {
            if (Request.Headers.TryGetValue(headerName, out var authHeader) && !string.IsNullOrWhiteSpace(authHeader))
            {
                var authStr = authHeader.ToString();
                var match = Regex.Match(authStr, @"Token=""?([^"",\s]+)""?", RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    return match.Groups[1].Value;
                }
                if (authStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    return authStr.Substring(7).Trim();
                }
            }
        }

        // Check query string: ?api_key=...
        if (Request.Query.TryGetValue("api_key", out var apiKey) && !string.IsNullOrWhiteSpace(apiKey))
        {
            return apiKey.ToString();
        }

        return null;
    }

    /// <summary>
    /// Constructs a CurrentJellyfinUser object from a resolved Jellyfin User GUID.
    /// </summary>
    private CurrentJellyfinUser? BuildUserFromId(Guid userId)
    {
        var username = string.Empty;
        var isAdmin = false;

        try
        {
            var getUserMethod = _userManager.GetType().GetMethod("GetUserById", new[] { typeof(Guid) });
            var userObj = getUserMethod?.Invoke(_userManager, new object[] { userId });
            if (userObj != null)
            {
                var userType = userObj.GetType();
                var nameProp = userType.GetProperty("Username") ?? userType.GetProperty("Name");
                if (nameProp?.GetValue(userObj) is string u && !string.IsNullOrEmpty(u))
                {
                    username = u;
                }

                var policyProp = userType.GetProperty("Policy");
                var policyObj = policyProp?.GetValue(userObj);
                if (policyObj != null)
                {
                    var adminProp = policyObj.GetType().GetProperty("IsAdministrator");
                    if (adminProp?.GetValue(policyObj) is bool b)
                    {
                        isAdmin = b;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[SeerProxy] Could not reflect user details from IUserManager.");
        }

        if (string.IsNullOrEmpty(username))
        {
            username = User.Identity?.Name ?? string.Empty;
        }

        return new CurrentJellyfinUser
        {
            Id = userId,
            Username = username,
            IsAdministrator = isAdmin
        };
    }

    /// <summary>
    /// Looks up or imports the Seer user ID matching the active Jellyfin user.
    /// </summary>
    private async Task<int?> ResolveSeerUserIdAsync(
        HttpClient client,
        string seerBaseUrl,
        string adminApiKey,
        CurrentJellyfinUser jfUser)
    {
        // 1. Check in-memory cache
        if (_seerUserCache.TryGetValue(jfUser.Id, out var cached) &&
            DateTime.UtcNow - cached.CachedAt < TimeSpan.FromMinutes(5))
        {
            return cached.SeerId;
        }

        // 2. Fetch users from Seer
        var seerId = await QuerySeerUserIdAsync(client, seerBaseUrl, adminApiKey, jfUser);
        if (seerId.HasValue)
        {
            _seerUserCache[jfUser.Id] = new CachedSeerUser(seerId.Value, 0, DateTime.UtcNow);
            return seerId;
        }

        // 3. If not found, attempt auto-import from Jellyfin
        try
        {
            using var importReq = new HttpRequestMessage(HttpMethod.Post, $"{seerBaseUrl}/api/v1/user/import-from-jellyfin");
            importReq.Headers.TryAddWithoutValidation("X-Api-Key", adminApiKey);
            var importPayload = JsonSerializer.Serialize(new
            {
                jellyfinUserIds = new[] { jfUser.Id.ToString("N") }
            });
            importReq.Content = new StringContent(importPayload, Encoding.UTF8, "application/json");

            using var importRes = await client.SendAsync(importReq);
            if (importRes.IsSuccessStatusCode)
            {
                _logger.LogInformation("[SeerProxy] Successfully triggered import for Jellyfin user {Username} ({Id})", jfUser.Username, jfUser.Id);
                // Re-query user list
                seerId = await QuerySeerUserIdAsync(client, seerBaseUrl, adminApiKey, jfUser);
                if (seerId.HasValue)
                {
                    _seerUserCache[jfUser.Id] = new CachedSeerUser(seerId.Value, 0, DateTime.UtcNow);
                    return seerId;
                }
            }
            else
            {
                _logger.LogDebug("[SeerProxy] Auto-import returned status {Status} for user {Username}", importRes.StatusCode, jfUser.Username);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SeerProxy] Error attempting auto-import for user {Username}", jfUser.Username);
        }

        return null;
    }

    /// <summary>
    /// Queries the Seer /api/v1/user endpoint and finds a matching user by GUID (exact) or Username (fallback).
    /// </summary>
    private async Task<int?> QuerySeerUserIdAsync(
        HttpClient client,
        string seerBaseUrl,
        string adminApiKey,
        CurrentJellyfinUser jfUser)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{seerBaseUrl}/api/v1/user?take=100");
            req.Headers.TryAddWithoutValidation("X-Api-Key", adminApiKey);

            using var res = await client.SendAsync(req);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("[SeerProxy] Failed to fetch users from Seer: HTTP {StatusCode}", res.StatusCode);
                return null;
            }

            using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync());
            if (!doc.RootElement.TryGetProperty("results", out var results) || results.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            var jfGuidClean = jfUser.Id.ToString("N");

            // Pass 1: Exact match by Jellyfin User ID (GUID)
            foreach (var userEl in results.EnumerateArray())
            {
                if (!userEl.TryGetProperty("id", out var idProp) || idProp.ValueKind != JsonValueKind.Number)
                {
                    continue;
                }

                int id = idProp.GetInt32();

                if (userEl.TryGetProperty("jellyfinUserId", out var jfIdProp) &&
                    jfIdProp.ValueKind == JsonValueKind.String)
                {
                    var candidateId = jfIdProp.GetString()?.Replace("-", string.Empty);
                    if (string.Equals(candidateId, jfGuidClean, StringComparison.OrdinalIgnoreCase))
                    {
                        return id;
                    }
                }
            }

            // Pass 2: Fallback match by Jellyfin Username / display name
            foreach (var userEl in results.EnumerateArray())
            {
                if (!userEl.TryGetProperty("id", out var idProp) || idProp.ValueKind != JsonValueKind.Number)
                {
                    continue;
                }

                int id = idProp.GetInt32();

                if (userEl.TryGetProperty("jellyfinUsername", out var jfNameProp) &&
                    jfNameProp.ValueKind == JsonValueKind.String)
                {
                    if (string.Equals(jfNameProp.GetString(), jfUser.Username, StringComparison.OrdinalIgnoreCase))
                    {
                        return id;
                    }
                }

                if (userEl.TryGetProperty("username", out var nameProp) &&
                    nameProp.ValueKind == JsonValueKind.String)
                {
                    if (string.Equals(nameProp.GetString(), jfUser.Username, StringComparison.OrdinalIgnoreCase))
                    {
                        return id;
                    }
                }

                if (userEl.TryGetProperty("email", out var emailProp) &&
                    emailProp.ValueKind == JsonValueKind.String)
                {
                    var email = emailProp.GetString();
                    if (!string.IsNullOrEmpty(email) && email.StartsWith(jfUser.Username + "@", StringComparison.OrdinalIgnoreCase))
                    {
                        return id;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SeerProxy] Error querying Seer users list");
        }

        return null;
    }
}
