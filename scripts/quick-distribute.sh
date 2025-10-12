#!/bin/bash

# Quick Distribution Automation Script
# Automates initial distribution tasks

set -e

REPO_URL="https://github.com/energychain/willi-mako-client"
NPM_URL="https://www.npmjs.com/package/willi-mako-client"

echo "══════════════════════════════════════════════════════════"
echo "🚀 Quick Distribution - Automated Setup"
echo "══════════════════════════════════════════════════════════"
echo ""

# 1. Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found"

    read -p "Add GitHub Topics? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Adding GitHub Topics..."
        gh repo edit energychain/willi-mako-client \
            --add-topic typescript \
            --add-topic nodejs \
            --add-topic api-client \
            --add-topic sdk \
            --add-topic cli \
            --add-topic energy \
            --add-topic utility \
            --add-topic edi \
            --add-topic etl \
            --add-topic compliance \
            --add-topic open-source \
            --add-topic mcp-server \
            --add-topic automation \
            --add-topic german-energy || echo "⚠️  Manual setup required via GitHub UI"
        echo "✅ Topics added"
    fi

    read -p "Enable GitHub Discussions? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Enabling GitHub Discussions..."
        gh repo edit energychain/willi-mako-client --enable-discussions || echo "⚠️  Manual setup required via GitHub Settings"
        echo "✅ Discussions enabled"
    fi
else
    echo "⚠️  GitHub CLI not found. Install with: sudo apt install gh"
    echo "   Manual steps required:"
    echo "   1. Go to $REPO_URL/settings"
    echo "   2. Add Topics (click ⚙️ next to About)"
    echo "   3. Enable Discussions in Features section"
fi

echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# 2. JSR Publish
read -p "Publish to JSR (JavaScript Registry)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v jsr &> /dev/null || command -v npx &> /dev/null; then
        echo "Publishing to JSR..."
        npx jsr@latest publish --allow-dirty || echo "⚠️  JSR publish failed. Check jsr.json configuration."
        echo "✅ JSR publish attempted"
    else
        echo "⚠️  npm/npx not found. Install Node.js first."
    fi
fi

echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# 3. Generate announcements
read -p "Generate announcement templates? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/generate-announcements.sh
fi

echo ""
echo "══════════════════════════════════════════════════════════"
echo "📊 Quick Links for Manual Tasks"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "✅ Automatic (already indexed):"
echo "   - npm: $NPM_URL"
echo "   - Libraries.io: https://libraries.io/npm/willi-mako-client"
echo "   - Bundlephobia: https://bundlephobia.com/package/willi-mako-client"
echo ""
echo "📝 Manual registration required:"
echo "   - OpenBase: https://openbase.com/js/willi-mako-client"
echo "   - Best of JS: https://github.com/bestofjs/bestofjs-webui/issues/new"
echo "   - Dev.to: https://dev.to/new"
echo "   - Reddit r/typescript: https://reddit.com/r/typescript/submit"
echo "   - Twitter/X: https://twitter.com/compose/tweet"
echo "   - LinkedIn: https://www.linkedin.com/feed/"
echo "   - Hacker News: https://news.ycombinator.com/submit"
echo "   - Product Hunt: https://www.producthunt.com/posts/new"
echo ""
echo "📧 Newsletter submissions:"
echo "   - Node Weekly: hello@cooperpress.com"
echo "   - JavaScript Weekly: hello@cooperpress.com"
echo "   - TypeScript Weekly: @typescriptweek (Twitter)"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
echo "✅ Automated setup complete!"
echo ""
echo "Next steps:"
echo "1. Review docs/QUICK_DISTRIBUTION.md for detailed checklist"
echo "2. Review docs/ANNOUNCEMENT_TEMPLATES.md for copy-paste content"
echo "3. Track progress in docs/DISTRIBUTION_STRATEGY.md"
echo ""
echo "Good luck with the launch! 🚀"
echo ""
