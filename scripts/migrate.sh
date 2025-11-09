#!/bin/bash

echo "🚀 Iniciando migração para versão modernizada..."

# Backup do package-lock.json se existir
if [ -f "package-lock.json" ]; then
    echo "📦 Fazendo backup do package-lock.json..."
    cp package-lock.json package-lock.json.backup
fi

# Limpar node_modules e reinstalar
echo "🧹 Limpando node_modules..."
rm -rf node_modules
rm -f package-lock.json

echo "📦 Reinstalando dependências modernizadas..."
npm install

# Verificar se há erros de compilação
echo "🔍 Verificando compilação TypeScript..."
npm run typecheck

# Tentar build
echo "🏗️  Tentando build..."
npm run build

echo "✅ Migração concluída!"
echo ""
echo "🎯 Próximos passos:"
echo "1. Verifique se o .env está configurado corretamente"
echo "2. Suba o banco: docker-compose up postgres"
echo "3. Teste a aplicação: npm run start:dev"
echo "4. Acesse o health check: http://localhost:8080/health"
echo ""
echo "📋 Comandos úteis:"
echo "  npm run start:dev    # Desenvolvimento moderno"
echo "  npm run dev          # Desenvolvimento legacy" 
echo "  npm run test         # Testes"
echo "  npm run lint         # Linting"