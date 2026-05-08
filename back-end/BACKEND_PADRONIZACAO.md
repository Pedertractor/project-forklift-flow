# Padronizacao de Backend - Project_ForkLift

Este documento define o padrao oficial do backend para manter consistencia de arquitetura, manutencao e colaboracao entre todas as pessoas do time.

## Estrutura atual do projeto

```txt
back-end/
  bruno-api/
    Auth/
    Users/
    System/
    environments/
      local.bru
    bruno.json
  prisma/
    migrations/
    schema.prisma
    seed.ts
  scripts/
  src/
    @types/
    constants/
    controllers/
    env/
    errors/
    external-api/
    generated/
    https/
      errors/
      routes/
    integrations/
    lib/
    middleware/
    middlewares/
    plugins/
    repositories/
    routes/
    services/
    shared/
    types/
    utils/
    app.ts
    server.ts
  .env.example
  docker-compose.yaml
  Dockerfile
  package.json
```

## Responsabilidade por pasta (cargo de cada camada)

### Camada de entrada e API

- `src/routes/`: registro das rotas Fastify por dominio (`auth`, `users`, etc.). Nao colocar regra de negocio.
- `src/controllers/`: traduz request/response HTTP, valida campos de entrada e chama services.
- `src/plugins/`: registro de plugins globais do Fastify (ex.: JWT).
- `src/middleware/`: regras de autorizacao/autenticacao reutilizaveis (ex.: `require-roles`).
- `src/app.ts`: composicao da aplicacao (plugins, tratamento de erro e registro de rotas).
- `src/server.ts`: inicializacao do servidor (`listen`).

### Camada de negocio e dados

- `src/services/`: casos de uso e regras de negocio.
- `src/repositories/`: acesso ao banco e consultas persistentes por entidade.
- `src/lib/`: clientes compartilhados de infraestrutura (ex.: Prisma client).
- `src/shared/`: utilitarios de dominio compartilhados (ex.: senha/hash).
- `src/errors/`: erros de dominio para regras de negocio.

### Camada de contrato e integracao

- `src/types/`: contratos e tipagens compartilhadas entre camadas.
- `src/external-api/`: consumo de APIs externas e adaptadores de integracao.
- `src/env/`: leitura/validacao de variaveis de ambiente.
- `src/constants/`: constantes reutilizaveis.
- `src/utils/`: funcoes utilitarias sem acoplamento de framework.
- `src/@types/`: augmentations e tipos globais.

### Pastas especiais

- `src/generated/`: codigo gerado automaticamente (Prisma). Nao editar manualmente.
- `src/https/`: legado de organizacao HTTP. Para novas features, priorizar `src/routes` + `src/controllers`.
- `src/middlewares/`: manter apenas para legado; novas implementacoes devem ir em `src/middleware`.
- `prisma/`: schema, migracoes e seed do banco.
- `scripts/`: scripts administrativos e operacionais.

## Padrao obrigatorio de documentacao de rotas (Bruno API)

Toda rota nova alterada ou removida no backend deve ser refletida no `back-end/bruno-api` no mesmo PR.

### Estrutura da colecao Bruno

- `bruno-api/bruno.json`: metadados da colecao.
- `bruno-api/environments/local.bru`: variaveis locais (`baseUrl`, `token`, `userId`).
- `bruno-api/Auth/`: requests de autenticacao.
- `bruno-api/Users/`: requests de usuarios.
- `bruno-api/System/`: requests tecnicos (ex.: health check).

### Convencao de criacao de request no Bruno

- Criar 1 arquivo `.bru` por endpoint.
- Nomear arquivo com verbo + contexto (ex.: `Create user.bru`, `Get me.bru`).
- Sempre usar variaveis de ambiente:
  - `{{baseUrl}}` para URL base.
  - `{{token}}` para rotas com `auth: bearer`.
  - `{{userId}}` quando houver parametro de path dinamico.
- Incluir `docs {}` com objetivo da rota e pre-requisitos (role, params obrigatorios).
- Manter `seq` das pastas e requests para facilitar leitura no Bruno.

### Checklist de PR (obrigatorio)

- [ ] Rota criada/alterada em `src/routes/*`.
- [ ] Controller/service/repository ajustados.
- [ ] Request correspondente criado/atualizado em `back-end/bruno-api`.
- [ ] Environment atualizado se houver nova variavel.
- [ ] Documentacao desta padronizacao revisada quando houver nova pasta/camada.

## Fluxo recomendado para nova funcionalidade

1. Criar/ajustar rota em `src/routes`.
2. Implementar controller em `src/controllers`.
3. Implementar regra em `src/services`.
4. Persistir/consultar em `src/repositories`.
5. Criar/atualizar request no `bruno-api`.
6. Validar localmente e abrir PR com backend + Bruno sincronizados.

## Ferramentas base padronizadas

- Runtime e framework: Node.js + Fastify.
- Banco: PostgreSQL + Prisma ORM.
- Linguagem/build: TypeScript + TSX.
- Container: Docker + Docker Compose.
