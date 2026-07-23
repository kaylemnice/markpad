#!/bin/bash
# MarkPad installer — builds the app and copies it to /Applications.
set -e
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building MarkPad.app..."
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build

APP_SRC=$(find dist -maxdepth 2 -name "MarkPad.app" -type d | head -1)
if [ -z "$APP_SRC" ]; then
  echo "❌ Build failed — MarkPad.app not found in dist/"
  exit 1
fi

echo "🚚 Installing to /Applications..."
rm -rf "/Applications/MarkPad.app"
cp -R "$APP_SRC" /Applications/

# Register with Launch Services so Finder knows MarkPad opens .md files
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f /Applications/MarkPad.app 2>/dev/null || true

echo ""
echo "✅ MarkPad installed! Find it in your Applications folder."
echo ""
echo "To make it the default for .md files:"
echo "  Right-click any .md file → Get Info → Open with: MarkPad → Change All…"
