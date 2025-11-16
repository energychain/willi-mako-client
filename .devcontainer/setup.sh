#!/bin/bash
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 WILLI-MAKO CLIENT SDK - GitHub Codespaces Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build project
echo "🔨 Building project..."
npm run build

# Link CLI globally
echo "🔗 Linking CLI globally..."
npm link

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 SCHNELLSTART - GitHub Codespaces"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Vollständige Anleitung: docs/CODESPACES_QUICKSTART.md"
echo ""
echo "🔐 1. Registriere dich kostenlos:"
echo "   https://stromhaltig.de/app/"
echo ""
echo "🔑 2. Setze dein Login (E-Mail + Passwort):"
echo "   export WILLI_MAKO_EMAIL='deine@email.de'"
echo "   export WILLI_MAKO_PASSWORD='dein-passwort'"
echo ""
echo "   Oder verwende direkt einen API-Token:"
echo "   export WILLI_MAKO_TOKEN='dein-api-token'"
echo ""
echo "🧪 3. Teste mit Beispiel-Use-Cases:"
echo "   npm run example:market-search    # Marktpartner suchen"
echo "   npm run example:edifact-analyze  # EDIFACT-Nachricht analysieren"
echo "   npm run example:utilmd           # UTILMD-Lieferantenwechsel"
echo "   npm run example:mscons           # MSCONS-Zählerstand-Clearing"
echo ""
echo "💡 Schnelltest ohne Login (Market Partner Search):"
echo "   willi-mako market-partners search -q 'Netze BW'"
echo ""
echo "🎯 Weitere Befehle:"
echo "   npm test            # Tests ausführen"
echo "   npm run lint        # Code prüfen"
echo "   willi-mako --help   # Alle CLI-Befehle"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
