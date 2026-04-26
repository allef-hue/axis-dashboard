# Setup: Sistema de Controle de Acesso por Email

Este documento descreve como configurar o sistema de aprovação de acesso por email no Supabase.

## 1. Criar a Tabela `access_requests`

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Cole o seguinte SQL e execute:

```sql
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  rejection_reason TEXT
);

CREATE INDEX idx_access_requests_status ON access_requests(status);

-- RLS Policy: Qualquer pessoa pode inserir (signup)
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_own_access_request" ON access_requests
  FOR INSERT
  WITH CHECK (true);

-- Policy de leitura: apenas admins podem ler
CREATE POLICY "admin_can_read_all" ON access_requests
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'allef@grupovorp.com'
  );
```

## 2. Deploy das Edge Functions

### 2.1 Instalar Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (via PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2.2 Login no Supabase

```bash
supabase login
# Gera um token em https://app.supabase.com/account/tokens/new
# Cole o token quando solicitado
```

### 2.3 Link o Projeto Local

```bash
cd /Applications/axis-dashboard

# Liste seus projetos
supabase projects list

# Link o projeto (substitua PROJECT_ID pelo seu ID)
supabase link --project-id YOUR_PROJECT_ID
```

### 2.4 Criar as Edge Functions

As functions já estão criadas em `supabase/functions/`. Agora você precisa fazer deploy:

```bash
# Faz deploy de todas as functions
supabase functions deploy

# Ou deploy específico:
supabase functions deploy send_access_request_email
supabase functions deploy process_access_decision
```

## 3. Configurar Variáveis de Ambiente

No Supabase Dashboard, vá para **Project Settings → Edge Functions → Environment Variables** e adicione:

```
RESEND_API_KEY=<sua-chave-da-api-resend>
JWT_SECRET=<use-o-secret-do-seu-supabase>
```

### Como obter RESEND_API_KEY:

1. Acesse [Resend.com](https://resend.com)
2. Crie uma conta ou faça login
3. Vá para **API Keys** (ou **Tokens**)
4. Crie uma nova chave API
5. Copie e cole em **RESEND_API_KEY**

### Como obter JWT_SECRET:

1. No Supabase Dashboard, vá para **Project Settings → API**
2. Procure por **JWT Secret** (ou **Service Role Key**)
3. Copie esse valor (deve começar com `eyJ...`)

## 4. Configurar Resend para Enviar Emails

### 4.1 Adicionar Domínio

Se quiser enviar de um domínio customizado (ex: noreply@axis-dashboard.com):

1. No Resend Dashboard, vá para **Domains**
2. Clique em **Add Domain**
3. Adicione seu domínio (ex: axis-dashboard.com)
4. Siga as instruções de DNS

Para teste/desenvolvimento, pode usar o domínio padrão do Resend.

### 4.2 Atualizar Email de Origem (se necessário)

Edite `supabase/functions/send_access_request_email/index.ts` e `supabase/functions/process_access_decision/index.ts`:

```typescript
// Mude isto:
from: 'noreply@axis-dashboard.com',

// Para isto (se usando domínio padrão Resend):
from: 'onboarding@resend.dev',
```

Depois refaça o deploy das functions.

## 5. Testar a Integração

### 5.1 Testar Signup com Domínio Autorizado

1. Acesse o AXIS Dashboard
2. Clique em "Cadastre-se"
3. Preencha com um email `@grupovorp.com` ou `@grupovorp.com.br`
4. Deve fazer signup normal (sem requisição de acesso)

### 5.2 Testar Signup com Domínio Externo

1. Cadastre-se com um email externo (ex: teste@empresa.com)
2. Você deve ver: "Requisição enviada! Você receberá um e-mail..."
3. Allef (allef@grupovorp.com) receberá um email com botões "Aprovar" e "Rejeitar"
4. Clique em "Aprovar":
   - O usuário receberá email com senha temporária
   - Conseguirá fazer login com email + senha temporária
5. Clique em "Rejeitar":
   - O usuário receberá notificação
   - Ao tentar login, verá: "Acesso não autorizado"

## 6. Troubleshooting

### Edge Functions não respondem

1. Verifique se foram deployadas:
   ```bash
   supabase functions list
   ```
2. Verifique logs:
   ```bash
   supabase functions logs send_access_request_email
   ```

### Emails não chegam

1. Verifique se RESEND_API_KEY está configurada
2. Verifique logs da Edge Function:
   ```bash
   supabase functions logs send_access_request_email
   ```
3. Verifique email de spam/lixo
4. Teste diretamente no Resend Dashboard

### Erro "JWT inválido"

1. Verifique se JWT_SECRET está correto
2. Não use aspas ao copiar o secret

## 7. Variáveis de Ambiente do Frontend

Certifique-se de que `.env.local` tem:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Essas já devem estar configuradas.

## 8. Fazer Deploy em Produção

Depois de testar tudo localmente:

```bash
# Build do frontend
npm run build

# Deploy das Edge Functions
supabase functions deploy

# Deploy no Cloudflare Pages
wrangler pages deploy dist --project-name axis-performance
```

## Fluxo Completo Esperado

1. ✅ Usuário com @grupovorp.com → Signup normal
2. ✅ Usuário com outro email → Requisição pendente criada
3. ✅ Email enviado para allef@grupovorp.com
4. ✅ Allef clica "Aprovar" ou "Rejeitar"
5. ✅ Usuário recebe email com resultado
6. ✅ Se aprovado → consegue fazer login com senha temporária
7. ✅ Se rejeitado → vê erro "Acesso não autorizado"

## Contato

Se tiver problemas, verifique:
- Logs da Edge Function: `supabase functions logs`
- Console do navegador (F12)
- Email de spam/lixo
