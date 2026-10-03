#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> 1. Building Web Bundle..."
cd web
npm install
npm run build
cd "$SCRIPT_DIR"

echo "==> 2. Web bundle built successfully in src/Jellyfin.Plugin.Seer/Web/"

if command -v dotnet >/dev/null 2>&1; then
    echo "==> 3. Building .NET 8.0 Plugin..."
    dotnet build src/Jellyfin.Plugin.Seer/Jellyfin.Plugin.Seer.csproj -c Release
    echo "==> 4. Packaging Plugin zip..."
    mkdir -p dist/package
    cp src/Jellyfin.Plugin.Seer/bin/Release/net8.0/Jellyfin.Plugin.Seer.dll dist/package/
    (cd dist/package && zip -r ../../jellyfin-plugin-seer.zip .)
    echo "==> Finished! Release zip created at jellyfin-plugin-seer.zip"
else
    echo "==> Note: dotnet CLI is not installed locally. The web bundle is ready and .NET builds will be handled via GitHub Actions CI."
fi
