# 📋 Checklist: Setup Completo no Supabase

## ✅ Passo 1: Criar Tabela `access_requests`

### Via SQL Editor (Recomendado)

1. Acesse: https://app.supabase.com → seu projeto
2. Vá para: **SQL Editor** (no menu lateral)
3. Clique em "New Query"
4. Cole este SQL:

```sql
-- Criar tabela
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  rejection_reason TEXT
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- Ativar RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode inserir sua própria requisição
CREATE POLICY "allow_insert" ON access_requests
  FOR INSERT
  WITH CHECK (true);

-- Política: apenas admin (allef@grupovorp.com) pode ler tudo
CREATE POLICY "admin_read" ON access_requests
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'allef@grupovorp.com');

-- Política: sistema pode atualizar requisições
CREATE POLICY "admin_update" ON access_requests
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'allef@grupovorp.com');
```

5. Clique em **"Run"**
6. ✅ Deve aparecer: "Success. No rows returned."

---

## ✅ Passo 2: Obter Credenciais do Supabase

1. Acesse: **Settings** → **API**
2. Você verá:

| Chave | Copie |
|-------|-------|
| **Project URL** | `https://kcbpbnavfhtazausjhnr.supabase.co` (já temos) |
| **Service Role Key** | Começa com `eyJhbGciOiJIUzI1NiI...` ⬅️ **COPIE ISTO** |
| **JWT Secret** | Um texto aleatório (procure abaixo) ⬅️ **COPIE ISTO** |

3. Guarde essas duas chaves (você usará em breve)

---

## ✅ Passo 3: Configurar Resend API

### Criar conta e gerar chave

1. Acesse: https://resend.com
2. Faça login ou crie uma conta
3. Vá para: **API Keys** ou **Tokens** (no menu)
4. Clique em **"Create API Key"**
5. Dê um nome (ex: "AXIS Dashboard")
6. Copie a chave: `re_...`

---

## ✅ Passo 4: Configurar Environment Variables no Supabase

1. No Supabase Dashboard, vá para: **Settings** → **Edge Functions**
2. Procure por **Environment Variables**
3. Clique em **"Add variable"**
4. Adicione estas duas variáveis:

```
Chave: RESEND_API_KEY
Valor: re_... (a chave que você copiou do Resend)

Chave: JWT_SECRET
Valor: (o JWT Secret que você copiou em Passo 2)
```

5. Clique em **"Save"**

---

## ✅ Passo 5: Fazer Deploy das Edge Functions

### Opção A: Via Supabase CLI (Recomendado)

#### 1. Instalar Supabase CLI

**macOS (via Direct Download):**
```bash
# Download direto
mkdir -p ~/.supabase/bin
curl -L https://github.com/supabase/cli/releases/download/v1.182.3/supabase_1.182.3_darwin_arm64.tar.gz \
  | tar xz -C ~/.supabase/bin

# Adicionar ao PATH
export PATH="$PATH:~/.supabase/bin"
supabase --version
```

**Windows (via Direct Download):**
```powershell
# Download e descompacte: https://github.com/supabase/cli/releases
# Adicione ao PATH e execute: supabase --version
```

**Linux:**
```bash
mkdir -p ~/.supabase/bin
curl -L https://github.com/supabase/cli/releases/download/v1.182.3/supabase_1.182.3_linux_amd64.tar.gz \
  | tar xz -C ~/.supabase/bin
export PATH="$PATH:~/.supabase/bin"
```

#### 2. Fazer Login e Link

```bash
# Faça login (abre navegador)
supabase login

# Link seu projeto
# (pegue PROJECT_ID da URL: https://app.supabase.com/project/PROJECT_ID)
supabase link --project-id kcbpbnavfhtazausjhnr
```

#### 3. Deploy das Functions

```bash
cd /Applications/axis-dashboard

# Deploy todas as functions
supabase functions deploy

# Ou deploy específico:
supabase functions deploy send_access_request_email
supabase functions deploy process_access_decision
```

✅ Deve aparecer algo como:
```
Deploying function 'send_access_request_email'...
✅ Function 'send_access_request_email' deployed
```

### Opção B: Via Dashboard (Manual)

1. Supabase Dashboard → **Edge Functions** (no menu)
2. Clique em **"Create a new function"**
3. Nomeie: `send_access_request_email`
4. Copie o código de: `/Applications/axis-dashboard/supabase/functions/send_access_request_email/index.ts`
5. Repita para: `process_access_decision`

---

## ✅ Passo 6: Testar o Sistema

### Teste 1: Signup com Domínio Autorizado

1. Acesse o AXIS Dashboard
2. Clique em "Cadastre-se"
3. Preencha:
   - Nome: `João Silva`
   - Email: `joao@grupovorp.com` ⬅️ **domínio autorizado**
   - Senha: qualquer coisa
4. Clique em "Criar conta"

**Resultado esperado:**
- ✅ Mensagem: "Conta criada! Verifique seu e-mail..."
- ✅ Muda para tela de login
- ℹ️ Email de confirmação enviado (Supabase padrão)

### Teste 2: Signup com Domínio Externo

1. Clique em "Cadastre-se"
2. Preencha:
   - Nome: `Maria Silva`
   - Email: `maria@empresa.com` ⬅️ **domínio externo**
   - Senha: qualquer coisa
3. Clique em "Criar conta"

**Resultado esperado:**
- ✅ Mensagem: "Requisição enviada! Você receberá um e-mail..."
- ✅ Formulário limpa
- ✅ **Allef recebe email** com botões "Aprovar" e "Rejeitar"

### Teste 3: Aprovar Requisição

1. Allef (você) recebe email em `allef@grupovorp.com`
2. Email deve ter:
   - Nome: `Maria Silva`
   - Email: `maria@empresa.com`
   - Botão: **"Aprovar"** e **"Rejeitar"**
3. Clique em **"Aprovar"**

**Resultado esperado:**
- ✅ Página mostra: "Acesso aprovado!"
- ✅ Maria recebe email com:
  - Email: `maria@empresa.com`
  - Senha Temporária: (ex: `aB3cD4eF5gH6`)
- ✅ Maria consegue fazer login com email + senha temporária

### Teste 4: Testar Rejeição

1. Ou nesse mesmo email, clique em **"Rejeitar"**
2. Pessoa recebe notificação de rejeição
3. Ao tentar fazer login com email rejeitado:
   - ✅ Vê mensagem: "Acesso não autorizado"

### Teste 5: Requisição Pendente

1. Alguém tenta fazer login antes de Allef aprovar
2. Após signup com domínio externo, tenta fazer login
3. **Resultado esperado:**
   - ✅ Vê mensagem: "Sua requisição ainda está em análise"

---

## 🆘 Troubleshooting

### Problema: "Erro ao processar sua requisição"

**Soluções:**
1. ✅ Verifique se a tabela foi criada (Supabase → Table Editor)
2. ✅ Verifique se RESEND_API_KEY está configurado
3. ✅ Verifique console do navegador (F12 → Console)
4. ✅ Verifique logs da Edge Function: `supabase functions logs send_access_request_email`

### Problema: Email não chega para Allef

**Soluções:**
1. ✅ Confira se RESEND_API_KEY está correto
2. ✅ Confira email de spam/lixo
3. ✅ Verifique logs: `supabase functions logs send_access_request_email`
4. ✅ Teste Resend diretamente em: https://resend.com/emails

### Problema: "Token inválido"

**Soluções:**
1. ✅ Verifique se JWT_SECRET está correto
2. ✅ Links expiram? (Não devem, mas verifique logs)
3. ✅ Copie novamente o link do email e tente

### Problema: Edge Functions não encontradas

**Soluções:**
1. ✅ Faça deploy novamente: `supabase functions deploy`
2. ✅ Verifique se estão listadas: `supabase functions list`
3. ✅ Verifique logs para erros: `supabase functions logs`

---

## 📊 Resumo do Fluxo

```
DOMÍNIO AUTORIZADO (@grupovorp.com)
    ↓ Signup
    ✅ Conta criada normalmente

DOMÍNIO EXTERNO (outro@empresa.com)
    ↓ Signup
    ✅ Requisição criada (status: pending)
    ↓ Edge Function envia email para Allef
    ✅ Allef recebe email com links
    ↓ Allef clica "Aprovar"
    ✅ Usuário recebe senha temporária
    ✅ Consegue fazer login
    
    Ou:
    ↓ Allef clica "Rejeitar"
    ✅ Usuário recebe notificação
    ✅ Ao tentar login: "Acesso não autorizado"
```

---

## ✅ Tudo Pronto!

Após completar TODOS os passos acima, seu sistema de controle de acesso estará **100% funcional**! 🎉

Se tiver dúvidas, consulte:
- Logs no Supabase: `supabase functions logs`
- Console do navegador: F12 → Console
- SETUP_ACCESS_CONTROL.md (guia detalhado)
