#!/bin/bash
# Automated NPM Publishing Script
# This script will be executed after the @stromdao organization is created

set -e

echo "🚀 Starting automated NPM publishing process..."
echo ""

# Check if logged in
echo "✓ Checking npm authentication..."
npm whoami || (echo "❌ Not logged in to npm" && exit 1)

echo ""
echo "✓ Running pre-publish checks..."

# Clean and build
echo "  → Cleaning..."
npm run clean

echo "  → Building..."
npm run build

echo "  → Running tests..."
npm test

echo ""
echo "✓ All checks passed!"
echo ""
echo "📦 Publishing to npm registry..."
npm publish

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Package published to npm"
    echo ""
    echo "🎉 Package is now available:"
    echo "   → npm install willi-mako-client"
    echo "   → https://www.npmjs.com/package/willi-mako-client"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Create a git tag: git tag v0.1.0"
    echo "   2. Push tag: git push origin v0.1.0"
    echo "   3. GitHub Actions will create a release automatically"
else
    echo "❌ Publishing failed. Please check the error message above."
    exit 1
fi
