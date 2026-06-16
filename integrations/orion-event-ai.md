# Integração Orion — Application Event (Fork)

Guia para configurar e manter o monitoramento de uso da aplicação via Orion.

---

## 1. Variáveis de ambiente

No `.env` do back-end:

```env
# API de eventos do Orion (NÃO é a URL do painel web)
ORION_URL=http://10.20.2.77:6161/api/applications/events
ORION_APP_TOKEN=<token-da-aplicacao-cadastrada-no-orion>
```

**Importante sobre as portas:**

| Porta | Função |
|-------|--------|
| **6161** | API de eventos (onde o back-end envia POST) |
| **6262** | Painel web do Orion (só para abrir no navegador) |

O `ORION_APP_TOKEN` é exibido ao cadastrar a aplicação no Orion.

Se `ORION_URL` ou `ORION_APP_TOKEN` estiverem vazios, a integração é ignorada silenciosamente (útil em dev local).

Após alterar o `.env`, **reinicie o back-end** — o hot-reload não recarrega variáveis de ambiente.

---

## 2. Onde monitorar (e onde NÃO monitorar)

### Evitar `POST /auth/login`

**Não notifique o Orion no login** quando o JWT tiver validade longa (ex.: 7 dias).

Motivo: o usuário faz login uma vez por semana, mas usa o app todos os dias com o token já em cache. Monitorar só o login dá a falsa impressão de que ninguém usa o sistema no restante da semana.

### Preferir `GET /auth/me`

**Monitore o `GET /auth/me`** — é a rota que o front chama com o usuário já autenticado (ao abrir o app, navegar, voltar para a aba, etc.).

Isso reflete **quem está usando o app de fato**, não só quem digitou senha na semana.

### Evitar `POST /auth/password` para auditoria operacional

Troca de senha é evento de **segurança**, não de uso diário. Só vale monitorar se a equipe de TI quiser rastrear alterações de senha explicitamente.

---

## 3. Implementação no back-end

### Arquivos da integração

| Arquivo | Responsabilidade |
|---------|------------------|
| `back-end/src/external-api/orion/notify-orion.ts` | Helper `notifyOrion` e `notifyOrionAppAccess` |
| `back-end/src/external-api/orion/index.ts` | Reexportações |
| `back-end/src/types/external-api/orion-event.types.ts` | Tipos do body |
| `back-end/src/controllers/auth-controller.ts` | Chamada em `GET /auth/me` |

### Helper reutilizável

```typescript
import { notifyOrionAppAccess } from '../external-api/orion/index.js'

// Em GET /auth/me, após carregar o usuário com sucesso:
notifyOrionAppAccess({
  id: user.id,
  name: user.name,
  card: user.card,
  role: user.role,
})
```

### Payload enviado ao Orion

```json
{
  "userId": "uuid-do-usuario",
  "userName": "Nome do Colaborador",
  "cardNumberUser": "12345",
  "metadata": {
    "action": "app_access",
    "role": "OPERATOR_MACHINE"
  }
}
```

O **IP** é registrado automaticamente pelo Orion (não enviar no body).

**Headers:**

- `Content-Type: application/json`
- `Authorization: Bearer {ORION_APP_TOKEN}`

**Resposta de sucesso:** `201` → `{ "id": "...", "createdAt": "..." }`

### Campos aceitos (body JSON)

| Campo            | Tipo   | Obrigatório | Descrição                                                       |
| ---------------- | ------ | ----------- | --------------------------------------------------------------- |
| `userId`         | string | **Sim**     | Identificador do usuário na aplicação (mín. 1 caractere)        |
| `userName`       | string | Não         | Nome exibido no painel Orion                                    |
| `cardNumberUser` | string | Não         | Número do cartão/crachá do usuário                              |
| `metadata`       | object | Não         | Objeto JSON livre (ex.: `{ "action": "app_access", "role": "..." }`) |

---

## 4. Throttle (evitar spam)

O front chama `/auth/me` com frequência (cache de ~5 min, refetch ao focar a janela). Sem controle, cada troca de aba geraria um evento no Orion.

**Regra atual:** no máximo **1 evento por usuário a cada 30 minutos**.

- O throttle só é aplicado **após sucesso** (201 do Orion)
- Se o Orion estiver fora ou a URL errada, novas tentativas continuam sendo feitas (não trava por 30 min após falha)

---

## 5. Como adicionar monitoramento em outra rota

Chame `notifyOrion` **após a ação concluir com sucesso**, de forma assíncrona (sem bloquear a resposta):

```typescript
import { notifyOrion } from '../external-api/orion/index.js'

void notifyOrion({
  userId: user.id,
  userName: user.name,
  cardNumberUser: user.card,
  metadata: {
    action: 'module_access',
    module: 'operador_maquina',
    detail: 'vinculou_maquina',
  },
})
```

Rotas candidatas para auditoria operacional (além do `/me`):

- Vincular/desvincular máquina
- Solicitar retirada ou abastecimento
- Aceitar/concluir tarefa de transporte
- Reset de senha pelo admin

---

## 6. Como testar se está funcionando

### Teste direto na API do Orion

```bash
curl -X POST "http://10.20.2.77:6161/api/applications/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"userId":"teste","userName":"Teste","metadata":{"action":"app_access"}}'
```

Esperado: HTTP **201** com `id` e `createdAt`.

Se retornar **405** → provavelmente está apontando para a porta do painel web (6262), não para a API (6161).

### Teste pelo Fork

1. Reinicie o back-end com o `.env` correto
2. Faça login no Fork (ou recarregue a página já logado)
3. Verifique o log do back-end:
   - Sucesso: `[orion] evento registrado <uuid>`
   - Falha de conexão: `[orion] fetch failed`
   - Token inválido: `[orion] 401 {...}`
4. Confira o evento no painel Orion (`http://10.20.2.77:6262`)

---

## 7. Erros comuns

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| `405 Not Allowed` (nginx) | URL aponta para o painel web (6262) | Usar porta **6161** com `/api/applications/events` |
| `ECONNREFUSED` | Orion API fora do ar ou firewall | Verificar se o serviço na 6161 está rodando |
| `401` | Token inválido ou app não cadastrada | Conferir `ORION_APP_TOKEN` no painel Orion |
| Evento não aparece após login | Monitoramento está no `/me`, não no login | Recarregar o app logado ou navegar para rota privada |
| Nenhum evento novo por 30 min | Throttle funcionando | Normal — aguardar ou testar com outro usuário |

---

## 8. Resumo das decisões

| Rota | Monitorar? | Motivo |
|------|------------|--------|
| `POST /auth/login` | **Não** | JWT longo (7d) — login raro, não reflete uso diário |
| `GET /auth/me` | **Sim** | Chamada frequente com sessão ativa — reflete quem usa o app |
| `POST /auth/password` | Opcional | Só se quiser auditoria de segurança (troca de senha) |
| Ações operacionais | Recomendado | Eventos de negócio (máquina, tarefas, abastecimento) |

---

## 9. Uso com IA (Cursor, Copilot, etc.)

Referencie este arquivo no chat e peça a rota desejada:

```
@integrations/orion-event-ai.md vincule a rota POST /minha-rota
```

### Regras para o agente seguir

1. Usar apenas os campos do contrato: `userId`, `userName`, `cardNumberUser`, `metadata`
2. Chamar **após** a ação concluir com sucesso
3. Não bloquear a resposta da rota em caso de falha do Orion (`void notifyOrion(...)`)
4. **Não** monitorar `POST /auth/login` quando o JWT for de longa duração (ex.: 7 dias)
5. Para auditoria de uso ativo, preferir `GET /auth/me` com throttle
6. Não inventar campos ou endpoints fora do contrato documentado
7. `ORION_URL` deve apontar para a **API** (porta 6161), não para o painel web (porta 6262)
8. Erros do Orion devem ser logados com `[orion]` e não propagados ao cliente

### Exemplo de implementação em nova rota

```typescript
// Exemplo: rota monitorada
app.post('/financeiro/acesso', async (req, res) => {
  const user = req.user
  // ... lógica da rota ...
  void notifyOrion({
    userId: user.id,
    userName: user.name,
    metadata: { action: 'module_access', module: 'financeiro' },
  })
  return res.json({ ok: true })
})
```
