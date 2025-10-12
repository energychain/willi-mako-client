#!/bin/bash

# Social Media Announcement Script
# Generates ready-to-post announcements for all major platforms

set -e

VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME=$(node -p "require('./package.json').name")
NPM_URL="https://www.npmjs.com/package/$PACKAGE_NAME"
GITHUB_URL=$(node -p "require('./package.json').repository.url" | sed 's/git+//;s/.git$//')

echo "══════════════════════════════════════════════════════════"
echo "📢 Social Media Announcement Generator"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "Package: $PACKAGE_NAME"
echo "Version: $VERSION"
echo "NPM: $NPM_URL"
echo "GitHub: $GITHUB_URL"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Twitter
echo "🐦 TWITTER/X (280 chars per tweet)"
echo "══════════════════════════════════════════════════════════"
cat << EOF

🚀 Announcing $PACKAGE_NAME v$VERSION!

TypeScript SDK for automating German energy market workflows.

✅ Type-safe API client
✅ CLI included
✅ MCP server for AI
✅ MIT licensed

npm install $PACKAGE_NAME

$GITHUB_URL

#TypeScript #NodeJS #OpenSource #Energy
EOF
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# LinkedIn
echo "💼 LINKEDIN"
echo "══════════════════════════════════════════════════════════"
cat << EOF

🚀 Exciting News! 🚀

We're thrilled to announce $PACKAGE_NAME v$VERSION - a TypeScript SDK for automating energy market communication workflows.

⚡ Key Features:
✅ Type-safe API interactions
✅ Built-in CLI tool
✅ MCP server for AI agents
✅ Comprehensive documentation
✅ MIT licensed

Perfect for energy companies building ETL pipelines, compliance automation, and AI-powered workflows.

📦 Get Started:
npm install $PACKAGE_NAME

📖 Documentation:
$GITHUB_URL

#EnergyTech #OpenSource #TypeScript #API #Automation #DigitalTransformation
EOF
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Reddit (r/typescript)
echo "📱 REDDIT (r/typescript)"
echo "══════════════════════════════════════════════════════════"
cat << EOF

Title: [Release] $PACKAGE_NAME v$VERSION - TypeScript SDK for Energy Market Communication

Hi r/typescript! 👋

Just released $PACKAGE_NAME v$VERSION - a fully-typed TypeScript SDK for energy market workflows.

Features:
- Type-safe API client with Zod validation
- CLI tool built with Commander
- MCP server for AI agents
- Full OpenAPI 3.0 support

Tech Stack:
- TypeScript 5.9+
- Zod for runtime validation
- Vitest for testing
- ESM-only

Installation:
\`\`\`bash
npm install $PACKAGE_NAME
\`\`\`

Links:
- npm: $NPM_URL
- GitHub: $GITHUB_URL

Feedback welcome!
EOF
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Dev.to Title
echo "📝 DEV.TO"
echo "══════════════════════════════════════════════════════════"
cat << EOF

Title: Introducing $PACKAGE_NAME v$VERSION - TypeScript SDK for Energy Automation

Tags: typescript, nodejs, opensource, api

(Full article template available in docs/ANNOUNCEMENT_TEMPLATES.md)
EOF
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Hacker News
echo "🎯 HACKER NEWS (Show HN)"
echo "══════════════════════════════════════════════════════════"
cat << EOF

Title: Show HN: $PACKAGE_NAME – TypeScript SDK for German Energy Market Communication

URL: $GITHUB_URL

Comment:
Hi HN! Author here. Built this TypeScript SDK to automate compliance workflows in the German energy sector. Key challenges were type safety for complex data structures (solved with Zod), CLI + SDK in one package, and AI agent integration via MCP. Happy to answer questions!
EOF
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Stats
echo "📊 CURRENT PACKAGE STATS"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "Check live stats at:"
echo "- npm downloads: https://npmtrends.com/$PACKAGE_NAME"
echo "- Bundle size: https://bundlephobia.com/package/$PACKAGE_NAME@$VERSION"
echo "- Package health: https://snyk.io/advisor/npm-package/$PACKAGE_NAME"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
echo "✅ Announcements ready to copy & paste!"
echo ""
echo "Next steps:"
echo "1. Copy relevant announcement above"
echo "2. Post to platform"
echo "3. Track engagement"
echo "4. Update docs/QUICK_DISTRIBUTION.md checklist"
echo ""
echo "Good luck! 🚀"
echo ""
