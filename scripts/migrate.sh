#!/bin/bash

echo "🚀 Starting clean reinstall..."

# Backup package-lock.json if it exists
if [ -f "package-lock.json" ]; then
    echo "📦 Backing up package-lock.json..."
    cp package-lock.json package-lock.json.backup
fi

# Clean node_modules and reinstall
echo "🧹 Cleaning node_modules..."
rm -rf node_modules
rm -f package-lock.json

echo "📦 Reinstalling dependencies..."
npm install

# Check for TypeScript compilation errors
echo "🔍 Checking TypeScript compilation..."
npm run typecheck

# Try building
echo "🏗️  Building..."
npm run build

echo "✅ Done!"
echo ""
echo "🎯 Next steps:"
echo "1. Make sure .env is configured correctly"
echo "2. Start the database: docker compose up -d postgres"
echo "3. Test the application: npm run start:dev"
echo "4. Access the health check: http://localhost:8080/api/health"
echo ""
echo "📋 Useful commands:"
echo "  npm run start:dev    # Modern development (build watch + serve)"
echo "  npm run dev          # Legacy development (ts-node-dev)"
echo "  npm test             # Unit tests"
echo "  npm run lint         # Linting"
