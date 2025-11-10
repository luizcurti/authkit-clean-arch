# Advanced TDD Clean Architecture API

API REST desenvolvida com Clean Architecture, TDD, SOLID principles e TypeScript.

## 🚀 Tecnologias

- Node.js 20+
- TypeScript 5.9
- Express 4.x
- PostgreSQL 15+
- TypeORM
- Jest (TDD)
- Clean Architecture
- SOLID Principles

## 📚 Documentação da API

A documentação completa da API está disponível via Swagger UI.

### Acessar Documentação

Após iniciar o servidor, acesse:

```
http://localhost:8080/api-docs
```

### Endpoints Disponíveis

#### Authentication
- `POST /api/login/facebook` - Login com Facebook OAuth

#### User
- `PUT /api/users/picture` - Upload de foto de perfil (requer autenticação)
- `DELETE /api/users/picture` - Remover foto de perfil (requer autenticação)

#### Health Check
- `GET /api/health` - Health check básico
- `GET /api/health/detailed` - Health check detalhado (database, memória, sistema)

### Autenticação

A API utiliza JWT (JSON Web Token) para autenticação.

1. Obtenha um token através do endpoint `/api/login/facebook`
2. Inclua o token no header `Authorization` das requisições:
   ```
   Authorization: Bearer <seu-token-jwt>
   ```

### Exemplos de Requisição

#### Login com Facebook
```bash
curl -X POST http://localhost:8080/api/login/facebook \
  -H "Content-Type: application/json" \
  -d '{"token": "seu-token-facebook"}'
```

#### Upload de Foto
```bash
curl -X PUT http://localhost:8080/api/users/picture \
  -H "Authorization: Bearer <seu-jwt>" \
  -F "picture=@foto.jpg"
```

#### Health Check
```bash
curl http://localhost:8080/api/health
```

## 🛠️ Instalação

```bash
# Clone o repositório
git clone <repository-url>

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Execute as migrations
npm run migrate

# Inicie o servidor
npm run dev
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar com coverage
npm run test:coverage

# Executar em watch mode
npm run test:watch
```

**Cobertura atual: 96.94%** | 169 testes passando

## 📦 Build

```bash
# Build para produção
npm run build

# Iniciar em produção
npm start
```

## 🔍 Lint

```bash
# Executar ESLint
npm run lint
```

## 📖 Documentação Adicional

- [Swagger/OpenAPI Spec](./src/main/docs/swagger.json)
- [Variáveis de Ambiente](.env.example)

## 🏗️ Arquitetura

O projeto segue os princípios de Clean Architecture:

```
src/
├── domain/          # Entidades e casos de uso (regras de negócio)
├── application/     # Controllers, DTOs, validações
├── infra/          # Implementações (DB, APIs externas, gateways)
└── main/           # Configuração, rotas, factories
```