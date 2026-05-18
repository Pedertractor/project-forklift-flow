# Mapa da planta — supervisão (documentação de implementação futura)

Este documento descreve **o que será necessário** no **back-end** e no **front-end** do projeto **Forklift Flow** para uma tela de **mapa da planta** no **mesmo estilo conceitual** da página de referência `map-enterprise-view-page.tsx` do projeto **Machine Logs** (React + **react-konva**: imagem de fundo, pan/zoom, retângulos de setor, nós clicáveis, painel de detalhes).

**Público da tela:** `LEADER`, `SUPERVISOR`, `MANAGER`, `ADMIN` (supervisão; **não** é tela obrigatória para operadores de máquina ou de movimentação).

**Objetivos de produto:**

1. Ver **onde cada máquina está** desenhada sobre a planta (coordenadas no mesmo sistema de referência da imagem).
2. **Coluna lateral** (diferença em relação ao Machine Logs, que usa card flutuante inferior) com **resumo por máquina** e informações operacionais: **processo atual** e **há quanto tempo** está nesse processo.
3. Ferramenta na mesma tela (ou modo “edição”) para **definir/atualizar polígonos ou retângulos** das áreas de **expedição** e **recebimento** sobre o mapa.

**Estado atual do Forklift (importante):**

- O modelo `Machine` já possui o campo `position`, mas hoje é tratado como **texto livre** (rótulo operacional), **não** como par `x,y` no plano do mapa — ver [`schema.prisma`](../prisma/schema.prisma).
- `SUPERVISOR` e `MANAGER` têm **pouquíssimas rotas** liberadas hoje; qualquer API nova para o mapa precisa **incluir esses papéis explicitamente** — ver [`ROTAS_POR_ROLE.md`](./ROTAS_POR_ROLE.md).

---

## 1. Referência de UI (Machine Logs)

A página de referência usa, entre outros:

- **Layout:** área principal com `Stage` do Konva preenchendo o viewport (`ResizeObserver`), fundo claro/escuro, **zoom com roda**, **arrastar o mapa**, botão **resetar posição**, escala mín/máx.
- **Camadas:** imagem da planta; **retângulos semitransparentes** para “setores”; **grupo de máquinas** com nó visual + clique para selecionar.
- **Painel de detalhes:** após seleção, cartão com nome, imagem do tipo, métricas (no Forklift substituir por **processo + duração** e dados de reposição relevantes).

No Forklift, replique **padrões visuais** (Tailwind, bordas, tipografia, ícones Lucide, cartões `rounded-xl`, legendas) e a **mecânica Konva** (transform inicial `contain`, `clamp` de arraste, wheel zoom). A **coluna lateral** pode ser um `aside` fixo à direita com lista rolável e detalhe da máquina selecionada, mantendo o mapa à esquerda em `flex` — alinhado ao pedido de “informações na lateral”.

---

## 2. Modelo de dados (back-end / Prisma)

Tudo abaixo é **proposta**; nomes de tabelas e campos podem ser ajustados na implementação.

### 2.1 Planta e escala

| Necessidade | Sugestão |
|-------------|----------|
| Imagem de fundo do mapa | Armazenar **URL pública** ou **caminho estático** servido pelo front (`/planta-setor-x.png`) **ou** upload em bucket + URL. Opcional: tabela `PlantLayout` com `id`, `sectorId` (se houver várias plantas por setor), `imageUrl`, `width`, `height` (pixels da imagem original — usados para escala Konva). |
| Uma planta por contexto | Se o produto for **uma planta global**, pode ser **configuração singleton** (uma linha) ou arquivo em `public/` sem tabela na primeira versão. |

### 2.2 Posição da máquina no mapa

| Opção | Prós | Contras |
|--------|------|---------|
| **A)** Novos campos `mapPosX`, `mapPosY` (`Float`) em `Machine` | Simples de consultar junto com a máquina | Migração; máquinas sem coordenadas ficam de fora do desenho até cadastrar |
| **B)** Tabela `MachineMapPlacement` (`machineId`, `layoutId`, `x`, `y`, `rotation?`) | Várias plantas por máquina no futuro | Mais joins |

Recomendação inicial: **A** ou **B** com um único `layoutId` opcional; **não** reutilizar o string `position` como JSON de coordenadas sem migração clara (evita ambiguidade com o uso atual como texto).

### 2.3 Áreas de expedição e recebimento

Tratar como **regiões sobre a mesma imagem** (igual “blocos de setor” no Machine Logs, que usam `Rect`):

| Campo conceitual | Tipo sugerido |
|------------------|---------------|
| `id` | UUID |
| `kind` | Enum `EXPEDITION` \| `RECEIVING` (ou nomes em PT no enum) |
| `layoutId` | FK se existir tabela de planta |
| `x`, `y`, `width`, `height` | Float (coordenadas no **espaço da imagem**, mesma unidade que Konva) |
| `label` | String opcional (“Doca 1”) |
| `updatedAt` / `updatedByUserId` | Auditoria |

**Versão futura:** polígono (`points: Json` array `[x,y,...]`) se a UI permitir desenho livre; a primeira versão pode ser só **retângulo** (arrastar cantos no Konva ou formulário numérico).

### 2.4 “Processo” e tempo no processo

É necessário **definir formalmente** o que significa “processo” para a máquina no domínio Forklift. Exemplos alinhados ao que já existe:

| Estado derivado (exemplo) | Fonte de verdade no sistema |
|---------------------------|------------------------------|
| Sem operador vinculado | `Machine.userId` nulo |
| Com operador, sem pedido ativo | Último `MachineReplenishmentRequest` ou nenhum em status “em curso” |
| Aguardando preparo / pallet pronto / em transporte / na máquina / concluído | `RequestStatus` do pedido **atual** ligado à máquina (`destinationId` ou fluxo que vocês padronizarem) |
| Ciclo “finalizei” aguardando próximo passo | Orquestração §9 (`REGRAS_NEGOCIO_REPOSICAO_OPERADOR.md`) |

**Tempo no processo:** persistir **timestamp de entrada** no estado atual ou usar **event sourcing leve**:

- Tabela opcional `MachineProcessLog` (`machineId`, `processKey`, `startedAt`, `endedAt?`) atualizada por **transações** sempre que o status relevante mudar; **duração** = `now() - startedAt` para linha aberta.
- Alternativa mais barata: calcular só a partir de `updatedAt` do pedido — **menos preciso** se várias mudanças não refletirem “processo” de UI.

O contrato da API deve expor algo como:

```json
{
  "processKey": "AWAITING_PALLET_ON_MACHINE",
  "processLabel": "Pallet na máquina",
  "since": "2026-05-15T10:00:00.000Z"
}
```

O front formata `since` com `formatDistanceToNow` ou similar.

---

## 3. API HTTP (back-end)

Prefixo sugerido: `/api/plant-map` ou `/api/map` (nome final a critério do time).

### 3.1 Leitura (todos os papéis alvo + `ADMIN`)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `.../layout` | Retorna metadados da planta ativa (`imageUrl`, `width`, `height`, opcionalmente `sectorId`). |
| `GET` | `.../machines` | Lista máquinas com **coordenadas de mapa**, dados básicos (nome, tipo, setor), **processo atual** + **`since`**, opcionalmente resumo do pedido atual (`requestId`, `status`). |
| `GET` | `.../areas` | Lista retângulos/polígonos de **expedição** e **recebimento**. |

**Performance:** um único endpoint agregado `GET .../snapshot` (layout + máquinas + áreas) pode reduzir round-trips para o primeiro paint.

**Autorização:** `requireRoles(['LEADER','SUPERVISOR','MANAGER','ADMIN'])` — espelhar em [`ROTAS_POR_ROLE.md`](./ROTAS_POR_ROLE.md) quando implementado.

**Multi-setor:** se no futuro cada `Sector` tiver planta própria, filtrar por `sectorId` query param ou pelo `sectorId` do usuário em `GET /api/auth/me`.

### 3.2 Escrita — posição das máquinas

Quem pode **arrastar máquina no mapa** e persistir?

- **Mínimo viável:** só `ADMIN` (e talvez `LEADER`), via `PATCH /api/machines/:id` estendido com `mapPosX` / `mapPosY` **ou** `PUT .../machines/:id/placement`.
- **Supervisor/Gestor:** se o negócio permitir, liberar o mesmo endpoint para `SUPERVISOR` e `MANAGER`.

### 3.3 Escrita — áreas expedição / recebimento

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `POST` | `.../areas` | Cria região (`kind`, geometria). |
| `PATCH` | `.../areas/:areaId` | Atualiza geometria ou rótulo. |
| `DELETE` | `.../areas/:areaId` | Remove região. |

Validações: retângulo contido nos limites `0..imageWidth` e `0..imageHeight`; não sobrepor áreas do mesmo `kind` se for regra de negócio.

### 3.4 Serviços e repositórios

- **Serviço de “snapshot do mapa”:** monta DTO a partir de `Machine`, pedidos em aberto (`MachineReplenishmentRequest`), vínculo operador, e **motor de processo** (função pura + timestamps).
- **Atualização de `MachineProcessLog`:** hooks nos serviços que já mudam status de pedido ou vínculo de operador (ex.: após `finalize`, `mark-pallet-ready`, `complete-deliver`) — **documentar cada ponto de integração** na implementação real para não ficar processo defasado.

### 3.5 Testes

- Testes unitários do **resolvedor de processo** (entrada: máquina + pedidos mockados → saída: `processKey` + `since`).
- Testes de integração HTTP com JWT de cada papel (`403` para `OPERATOR_MACHINE`, `200` para `SUPERVISOR` após liberar roles).

---

## 4. Front-end (Forklift)

### 4.1 Rota e guard

- Nova rota, por exemplo `/mapa-planta` ou `/supervisao/mapa`.
- **Route guard:** permitir apenas `LEADER`, `SUPERVISOR`, `MANAGER`, `ADMIN` (ler `role` de `GET /api/auth/me`).
- Incluir item no menu lateral **apenas** para esses papéis.

### 4.2 Dependências

- `react-konva`, `konva` (mesma família do Machine Logs).
- Opcional: `useResizeObserver` ou `ResizeObserver` manual no container do mapa.

### 4.3 Componentes sugeridos

| Peça | Responsabilidade |
|------|------------------|
| `PlantMapStage` | `Stage` + layers: imagem, áreas exped/receb, nós de máquina. |
| `MachineMapNode` | Círculo ou ícone do `TypeMachine.urlImage`; hover; clique → seleciona. |
| `MapToolbar` | Reset zoom, legenda de cores por processo, toggle “modo edição” de áreas. |
| `MachineMapSidebar` | Lista todas as máquinas com **processo + tempo**; clique sincroniza seleção com o mapa; máquina selecionada mostra **card expandido** (estilo Machine Logs: grids `bg-slate-50`, tipografia). |
| `AreaEditorMode` | Quando ativo: desenhar/editar retângulos (Konva `Transformer` ou drag de cantos) e **salvar** via API; distinguir visualmente expedição vs recebimento (cores fixas). |

### 4.4 Dados e atualização

- **React Query** (`useQuery`) no snapshot com `refetchInterval` (ex.: 15–30 s) para tempo no processo e filas **sem WebSocket** na primeira versão.
- Opcional futuro: SSE/WebSocket — fora do escopo mínimo; mencionar em [`STATUS_IMPLEMENTACAO.md`](./STATUS_IMPLEMENTACAO.md) se for feito.

### 4.5 Assets

- Imagem da planta em `front-end/public/` ou URL configurada pela API `layout`.

### 4.6 Acessibilidade e UX

- Teclado: foco no sidebar; mapa pode ser `aria-label` descritivo.
- Estado vazio: mensagem quando não houver coordenadas cadastradas (“Cadastre posições no mapa…”).

---

## 5. Ordem sugerida de implementação

1. **Prisma:** campos de mapa na máquina + tabela de áreas + (opcional) log de processo.
2. **Motor de processo + testes** no back-end.
3. **GET snapshot** + roles.
4. **PATCH máquina / CRUD áreas** + roles.
5. **Front:** stage + sidebar leitura.
6. **Front:** modo edição de áreas e persistência.
7. Atualizar **documentação canônica** [`ROTAS_POR_ROLE.md`](./ROTAS_POR_ROLE.md), [`FLUXOS_TELAS_FRONTEND.md`](./FLUXOS_TELAS_FRONTEND.md), [`STATUS_IMPLEMENTACAO.md`](./STATUS_IMPLEMENTACAO.md) com status ✅ quando cada parte estiver pronta.

---

## 6. Riscos e decisões em aberto

| Tópico | Decisão necessária |
|--------|-------------------|
| Definição exata de “processo” | Alinhar com negócio (lista fechada de `processKey` + labels em PT). |
| Uma ou várias plantas | Afeta modelo `layout` e filtros. |
| Supervisor edita mapa? | Afeta apenas matriz de permissões. |
| Precisão do “tempo no processo” | Log dedicado vs inferência de timestamps existentes. |

---

*Documento exclusivamente de planejamento; nenhuma rota descrita aqui existe até ser implementada e listada em `ROTAS_POR_ROLE.md`.*
