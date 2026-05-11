# Padronizacao de Frontend - Project_ForkLift

Este documento define o padrao oficial do frontend para manter consistencia de arquitetura, manutencao e colaboracao entre todas as pessoas do time.

## Idioma: plataforma (pt-BR) vs codigo (en)

- **Produto / interface (portugues Brasil — pt-BR):** todo texto visivel ao usuario deve estar em pt-BR: rotulos de formulario, placeholders, mensagens de validacao (Zod), `aria-label`, toasts, titulos de pagina, textos de erro amigaveis, conteudo de `index.html` (`lang="pt-BR"`, `<title>`, etc.). Comentarios no codigo podem ser em pt-BR quando ajudarem o time local.
- **Codigo (ingles):** identificadores tecnicos permanecem em ingles: nomes de arquivos, pastas, variaveis, funcoes, classes, tipos TypeScript, hooks, chaves de API internas, `queryKey` do TanStack Query, nomes de propriedades alinhados ao contrato JSON do backend quando o backend for em ingles.

Resumo: **o usuario ve pt-BR; o repositorio segue ingles nos simbolos de codigo**, salvo strings de produto e documentacao voltada ao time em portugues.

## Estrutura do projeto

```txt
front-end/
  public/
    favicon.svg
    icons.svg
  src/
    assets/
    components/
      ui/
      layout/
    pages/
    hooks/
    services/
    store/
    lib/
    schemas/
    types/
    utils/
    constants/
    styles/
    App.tsx
    main.tsx
    index.css
  .gitignore
  eslint.config.js
  .prettierrc
  index.html
  package.json
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
```

## Responsabilidade por pasta (cargo de cada camada)

### Camada de visualizacao

- `src/pages/`: paginas da aplicacao, uma por rota. Responsavel apenas por compor componentes e consumir hooks — sem logica de negocio, sem chamadas diretas de API.
- `src/components/ui/`: componentes visuais atomicos e reutilizaveis (ex.: `Button`, `Input`, `Badge`, `Modal`). Inclui componentes gerados pelo shadcn/ui.
- `src/components/layout/`: componentes estruturais de pagina (ex.: `Header`, `Sidebar`, `Footer`, `PageWrapper`).
- `src/styles/`: estilos globais, tokens de design e extensoes do tema Tailwind.
- `src/assets/`: imagens, fontes e arquivos estaticos importados no codigo.
- `public/`: arquivos servidos diretamente pelo servidor sem processamento do Vite.

### Camada de estado e dados

- `src/hooks/`: custom hooks que encapsulam logica de estado, efeitos, integracao com TanStack Query e acesso aos services.
- `src/store/`: estado global com Zustand. Um arquivo por slice de dominio (ex.: `auth.store.ts`, `ui.store.ts`).
- `src/services/`: funcoes de chamada HTTP com `fetch` nativo, organizadas por dominio (ex.: `users.service.ts`, `auth.service.ts`). Toda comunicacao com o backend passa por aqui.
- `src/lib/`: configuracoes e instancias compartilhadas de infraestrutura (ex.: cliente fetch configurado, instancia do QueryClient).

### Camada de contrato e suporte

- `src/schemas/`: schemas Zod para validacao de formularios e parsing de dados externos. Um arquivo por dominio (ex.: `user.schema.ts`).
- `src/types/`: interfaces e tipos TypeScript compartilhados entre camadas. Nao colocar schemas Zod aqui — apenas tipos puros.
- `src/utils/`: funcoes utilitarias puras e sem acoplamento de framework (ex.: `formatDate.ts`, `masks.ts`).
- `src/constants/`: constantes reutilizaveis (ex.: endpoints, enumeracoes de roles). Mensagens de erro ou textos fixos exibidos ao usuario devem estar em **pt-BR** (ou centralizados aqui / em modulo dedicado, ainda em pt-BR).

### Arquivos raiz de src

- `src/App.tsx`: composicao de rotas com React Router e providers globais (QueryClientProvider, temas, stores).
- `src/main.tsx`: ponto de entrada — monta o React no DOM.
- `src/index.css`: estilos globais base e diretivas do Tailwind (`@tailwind base/components/utilities`).

## Convencao de nomenclatura (codigo em ingles)

Nomes de **arquivos, pastas, simbolos TypeScript/JavaScript** (variaveis, funcoes, tipos, componentes, hooks, etc.) seguem as convencoes abaixo e sao escritos em **ingles**, conforme a secao **Idioma** no inicio deste documento.

| Tipo             | Convencao             | Exemplo            |
| ---------------- | --------------------- | ------------------ |
| Componente React | PascalCase            | `UserCard.tsx`     |
| Pagina           | PascalCase com sufixo | `LoginPage.tsx`    |
| Hook customizado | camelCase com `use`   | `useAuth.ts`       |
| Service          | camelCase com sufixo  | `users.service.ts` |
| Store Zustand    | camelCase com sufixo  | `auth.store.ts`    |
| Schema Zod       | camelCase com sufixo  | `user.schema.ts`   |
| Tipo / Interface | PascalCase            | `UserPayload.ts`   |
| Utilitario       | camelCase             | `formatDate.ts`    |
| Constante        | SCREAMING_SNAKE_CASE  | `API_ENDPOINTS.ts` |

## Organizacao de componentes

Componentes nao triviais (com subcomponentes, tipos extensos ou variantes) devem ter sua propria pasta:

```txt
components/ui/UserCard/
  index.tsx           <- exportacao publica
  UserCard.tsx        <- implementacao
  UserCard.types.ts   <- tipos e props
```

Componentes simples e atomicos podem ser arquivos avulsos dentro de `ui/` sem pasta propria.

Componentes gerados pelo shadcn/ui ficam em `src/components/ui/` e **nao devem ser editados manualmente**. Customizacoes vao em componentes wrapper separados.

## Padrao de chamada de API (services)

- Toda chamada HTTP usa `fetch` nativo — sem Axios.
- Nunca fazer chamadas de rede diretamente em componentes, paginas ou hooks.
- O cliente fetch configurado (headers padrao, base URL, tratamento de erro) fica em `src/lib/api.ts`.
- Cada service e organizado por dominio e exporta funcoes nomeadas e tipadas.

```ts
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export { apiFetch };
```

```ts
// src/services/users.service.ts
import { apiFetch } from '@/lib/api';
import type { User } from '@/types/user.types';

export async function getUsers(): Promise<User[]> {
  return apiFetch<User[]>('/users');
}

export async function getUserById(id: string): Promise<User> {
  return apiFetch<User>(`/users/${id}`);
}

export async function createUser(body: CreateUserPayload): Promise<User> {
  return apiFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
```

## Padrao de data fetching (TanStack Query)

- Toda chamada de leitura (GET) deve ser encapsulada em um hook com `useQuery`.
- Toda mutacao (POST, PUT, PATCH, DELETE) deve usar `useMutation`.
- Nunca chamar services diretamente em componentes — sempre via hook.
- `queryKey` deve ser semantico e previsivel para facilitar invalidacao de cache.

```ts
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser } from '@/services/users.service';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Padrao de estado global (Zustand)

- Usar Zustand apenas para estado verdadeiramente global (ex.: usuario autenticado, preferencias de UI, notificacoes).
- Estado local de componente continua com `useState`/`useReducer`.
- Cada slice e um arquivo separado em `src/store/`.
- Exportar o hook do store diretamente do arquivo do slice.

```ts
// src/store/auth.store.ts
import { create } from 'zustand';
import type { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

## Padrao de formularios (React Hook Form + Zod)

- Schemas de validacao ficam em `src/schemas/` e sao reutilizados entre formularios e services.
- O tipo do payload e inferido do schema Zod — nunca duplicar tipos manualmente.
- `useForm` sempre recebe `zodResolver` como resolver.

```ts
// src/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres'),
});

export type CreateUserPayload = z.infer<typeof createUserSchema>;
```

```tsx
// src/pages/CreateUserPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserSchema,
  type CreateUserPayload,
} from '@/schemas/user.schema';
import { useCreateUser } from '@/hooks/useUsers';

export function CreateUserPage() {
  const { mutate: createUser } = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserPayload>({
    resolver: zodResolver(createUserSchema),
  });

  function onSubmit(data: CreateUserPayload) {
    createUser(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      {/* ... */}
    </form>
  );
}
```

## Padrao de rotas (React Router)

- Todas as rotas sao definidas em `src/App.tsx`.
- Rotas protegidas (autenticadas) usam um componente wrapper `PrivateRoute`.
- Lazy loading de paginas com `React.lazy` + `Suspense` para melhor performance.

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { PrivateRoute } from '@/components/layout/PrivateRoute';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Carregando…</div>}>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route path='/dashboard' element={<DashboardPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

## Alias de importacao

Alias `@` aponta para `src/`. Configurado no `vite.config.ts` e no `tsconfig.app.json`.

```ts
// vite.config.ts
import path from 'path'

resolve: {
  alias: { '@': path.resolve(__dirname, 'src') }
}
```

```json
// tsconfig.app.json
"paths": { "@/*": ["./src/*"] }
```

Usar sempre `@/` nas importacoes internas:

```ts
// Correto
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';

// Errado
import { Button } from '../../../components/ui/Button';
```

## Variaveis de ambiente

- Toda variavel de ambiente e prefixada com `VITE_` para ser exposta ao cliente.
- Acessadas exclusivamente via `src/constants/env.ts` — nunca `import.meta.env` espalhado pelo codigo.
- O arquivo `.env.example` deve estar sempre atualizado com todas as variaveis necessarias.

```ts
// src/constants/env.ts
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL as string,
  APP_ENV: import.meta.env.VITE_APP_ENV as string,
};
```

## Fluxo recomendado para nova funcionalidade

1. Definir tipos em `src/types/`.
2. Criar schema Zod em `src/schemas/` (se houver formulario ou validacao).
3. Criar/ajustar funcoes em `src/services/`.
4. Criar/ajustar hook com TanStack Query em `src/hooks/`.
5. Atualizar store Zustand em `src/store/` (se houver estado global envolvido).
6. Compor componentes em `src/components/`.
7. Montar a pagina em `src/pages/`.
8. Registrar a rota em `src/App.tsx`.

## Checklist de PR (obrigatorio)

- [ ] Tipos definidos em `src/types/` antes da implementacao.
- [ ] Schema Zod criado/atualizado em `src/schemas/` para formularios e payloads.
- [ ] Chamadas HTTP isoladas em `src/services/` usando `apiFetch` de `src/lib/api.ts`.
- [ ] Queries e mutations encapsuladas em hooks com TanStack Query em `src/hooks/`.
- [ ] Estado global em `src/store/` com slice dedicado por dominio.
- [ ] Componentes shadcn/ui nao editados diretamente — customizacoes em wrappers.
- [ ] Nenhum import relativo profundo (usar alias `@/`).
- [ ] Variaveis de ambiente acessadas via `src/constants/env.ts`.
- [ ] Nenhum `console.log` de debug commitado.
- [ ] ESLint e Prettier rodados antes de abrir o PR.
- [ ] Textos de interface, validacao e acessibilidade em **portugues (Brasil)**; identificadores de codigo em **ingles**.

## Ferramentas base padronizadas

| Categoria              | Ferramenta                   |
| ---------------------- | ---------------------------- |
| Framework              | React 19 + Vite (latest)     |
| Linguagem              | TypeScript                   |
| Estilo                 | Tailwind CSS                 |
| Componentes            | shadcn/ui                    |
| Rotas                  | React Router v6/v7           |
| Data fetching / cache  | TanStack Query (React Query) |
| Estado global          | Zustand                      |
| Formularios            | React Hook Form + Zod        |
| HTTP client            | Fetch nativo via wrapper     |
| Linting / formato      | ESLint + Prettier            |
| Gerenciador de pacotes | npm                          |
