using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Seer.Controllers;

/// <summary>
/// Controller for proxying Seer API requests and serving embedded client assets.
/// </summary>
[ApiController]
[Route("Plugins/Seer")]
public class SeerProxyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SeerProxyController> _logger;

    public SeerProxyController(IHttpClientFactory httpClientFactory, ILogger<SeerProxyController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Serves embedded web assets (bundle.js, bundle.css).
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

        return File(stream, contentType);
    }

    /// <summary>
    /// Proxies requests to the internal Seer instance with transparent SSO delegation.
    /// </summary>
    [Route("Proxy/{**path}")]
    [Route("/avatarproxy/{**path}")]
    [AllowAnonymous]
    public async Task ProxyRequest()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || !config.EnableProxy)
        {
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await Response.WriteAsync("{\"message\": \"Seer proxy is disabled.\"}");
            return;
        }

        var seerBaseUrl = (config.SeerServerUrl ?? "http://localhost:5055").TrimEnd('/');
        var rawPath = Request.Path.Value ?? "";
        string targetSubpath;
        if (rawPath.StartsWith("/avatarproxy", StringComparison.OrdinalIgnoreCase))
        {
            targetSubpath = rawPath;
        }
        else
        {
            targetSubpath = rawPath.Replace("/Plugins/Seer/Proxy", "");
            if (!targetSubpath.StartsWith('/'))
            {
                targetSubpath = "/" + targetSubpath;
            }
        }

        var targetUrl = $"{seerBaseUrl}{targetSubpath}{Request.QueryString}";

        try
        {
            var client = _httpClientFactory.CreateClient("SeerProxyClient");
            using var proxyMessage = new HttpRequestMessage(new HttpMethod(Request.Method), targetUrl);

            // Copy incoming headers (Cookie, Authorization, Content-Type)
            foreach (var header in Request.Headers)
            {
                if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase) ||
                    header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                proxyMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }

            // Check if request already has an established user session cookie
            bool hasSeerCookie = Request.Headers.TryGetValue("Cookie", out var cookieHeader) &&
                                 cookieHeader.ToString().Contains("connect.sid");

            // Exclude explicit user login endpoints from auto-injecting admin API key
            bool isAuthSubmission = targetSubpath.StartsWith("/api/v1/auth/local", StringComparison.OrdinalIgnoreCase) ||
                                    targetSubpath.StartsWith("/api/v1/auth/jellyfin", StringComparison.OrdinalIgnoreCase);

            // Transparently inject Seer Admin API Key for zero-login SSO delegation when available
            if (!hasSeerCookie && !isAuthSubmission &&
                !string.IsNullOrEmpty(config.SeerAdminApiKey) &&
                !proxyMessage.Headers.Contains("X-Api-Key"))
            {
                proxyMessage.Headers.TryAddWithoutValidation("X-Api-Key", config.SeerAdminApiKey);
            }

            // Copy body for non-GET/HEAD requests
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

            // Copy response headers back
            foreach (var header in response.Headers)
            {
                if (!header.Key.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
                {
                    Response.Headers[header.Key] = header.Value.ToArray();
                }
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
            _logger.LogError(ex, "Error proxying request to Seer at {TargetUrl}", targetUrl);
            Response.StatusCode = StatusCodes.Status502BadGateway;
            Response.ContentType = "application/json";
            await Response.WriteAsync($"{{\"message\": \"Proxy error communicating with Seer: {ex.Message}\"}}");
        }
    }
}
