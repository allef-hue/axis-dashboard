# 🚀 Guia Completo de Validação - Sistema de Permissões

Este guia cobre todos os passos para validar o Sistema de Permissões implementado.

---

## **PASSO 1️⃣: Executar SQL no Supabase**

### Acesse o Supabase Dashboard
1. Vá para https://supabase.com
2. Abra seu projeto AXIS
3. Clique em **SQL Editor** (ou **Desenvolvimento** → **SQL**)

### Copie e Execute o SQL Abaixo

```sql
-- ===== CRIAR TABELA DE ADMINS =====

CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

-- Habilitar Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ler/escrever (para futura expansão)
CREATE POLICY "admin_full_access" ON admins
  FOR ALL
  USING (auth.jwt()->>'email' IN (SELECT email FROM admins WHERE status = 'active'));

-- ===== INSERIR VOCÊ COMO ADMIN INICIAL =====

INSERT INTO admins (email, added_by, status) 
VALUES ('allef@grupovorp.com', 'system', 'active');
```

### ✅ Sucesso!
Você deve ver:
- Tabela `admins` criada
- 1 linha inserida (seu email)

---

## **PASSO 2️⃣: Deploy na Cloudflare Pages**

### Opção A: Deploy Automático (Recomendado)
```bash
git push origin main
```
- Cloudflare Pages detecta automaticamente
- Deploy leva ~2-3 minutos
- Você vê status no Cloudflare Dashboard

### Opção B: Deploy Manual
1. Vá para https://dash.cloudflare.com
2. Selecione o projeto AXIS
3. Clique em "Re-deploy"

**Aguarde deploy completar** (status verde ✅)

---

## **PASSO 3️⃣: Validar TUDO (End-to-End)**

### Cenário A: Login como Admin (Você)

**Setup:**
- Email: `allef@grupovorp.com`
- Senha: (a que você usa normalmente)

**Teste:**
1. ✅ Faça login no dashboard
2. ✅ Clique em ⚙️ **Configurações**
   - Deve abrir normalmente (você é admin)
3. ✅ Vá até aba **Equipe SDR**
   - Deve ver coluna "Email" com emails preenchidos
   - Exemplos:
     - João da Silva → `joao@grupovorp.com`
     - Rudhero → `rudhero@grupovorp.com`
     - Cauã → `caua@grupovorp.com`
4. ✅ **Edite um email** (ex: Cauã)
   - Mude de `caua@grupovorp.com` para `jose@grupovorp.com`
5. ✅ **Clique Salvar**
   - Modal deve fechar após sincronizar
   - Ver ✓ checkmark no SyncIndicator
6. ✅ **Verifique no Supabase**
   - Vá em **SQL Editor**
   - Execute:
     ```sql
     SELECT * FROM leadership_goals;
     ```
   - Procure por `"email": "jose@grupovorp.com"` no JSON (Cauã)

---

### Cenário B: Login como Usuário Normal (ex: José)

**Setup:**
- Crie um usuário no Supabase Auth com email: `jose@grupovorp.com`
- Ou use um email de teste

**Teste:**
1. ✅ Faça logout (você como admin)
2. ✅ Faça login como `jose@grupovorp.com`
3. ✅ Na aba **Pace Time**
   - Veja todos os cards (João, Rudhero, Nicolas, Bruno Nobre, Cauã)
4. ✅ **Clique "Meu Pace" no card Cauã**
   - Modal abre (José pode editar o card de Cauã porque é o email dele)
   - Preencha algum dado, salve
   - ✓ Deve sincronizar
5. ✅ **Clique "Meu Pace" em outro card (ex: João)**
   - Botão está DESABILITADO (opaco)
   - Hover mostra: "Apenas você ou admin pode editar"
   - Badge "Apenas leitura" aparece abaixo
6. ✅ **Tente acessar ⚙️ Configurações**
   - Modal abre com mensagem: "Apenas administradores podem acessar"
   - Botão "Fechar" disponível
7. ✅ **Visualize outras abas** (Ranking, Relatório, etc)
   - Deve funcionar normalmente (não é bloqueado)

---

### Cenário C: Verificar Sincronização

**Setup:** Estar logado como admin

**Teste:**
1. ✅ Abra **Configurações** → **Equipe SDR**
2. ✅ **Mude um email** (ex: João → `joao.silva@grupovorp.com`)
3. ✅ **Clique Salvar**
   - Observe o **SyncIndicator** (canto superior direito)
   - ⏳ Deve aparecer spinner (sincronizando)
   - Depois ✓ checkmark (sucesso)
   - Desaparece após 2 segundos
4. ✅ **Abra Supabase SQL Editor**
   - Execute:
     ```sql
     SELECT goals FROM leadership_goals ORDER BY updated_at DESC LIMIT 1;
     ```
   - Procure por `"email": "joao.silva@grupovorp.com"`
   - Deve estar lá (confirmação de sincronização)

---

### Cenário D: Validar Permissões Granulares

**Setup:** Ter 2 usuários abertos (admin e José)

**Teste:**
1. ✅ **Como admin**: Edite email de Cauã → `jose@grupovorp.com`
2. ✅ **Como admin**: Abra "Meu Pace" de Cauã, preencha dados
3. ✅ **Como José**: Refresh da página
   - Dados preenchidos PELO ADMIN aparecem para José
   - Confirma que dados estão sincronizados globalmente
4. ✅ **Como José**: Edite "Meu Pace" de Cauã
5. ✅ **Como admin**: Refresh da página
   - Dados editados POR JOSÉ aparecem para admin
   - Confirma que sincronização funciona nos dois sentidos

---

## **PASSO 4️⃣: Checklist de Validação**

### ✅ Core do Sistema
- [ ] Tabela `admins` criada no Supabase
- [ ] Seu email inserido como admin
- [ ] Coluna "Email" visível em Configurações
- [ ] Emails aparecem corretos nos configs

### ✅ Permissões - Admin
- [ ] Admin consegue acessar Configurações
- [ ] Admin consegue editar qualquer card
- [ ] Admin consegue editar emails
- [ ] SyncIndicator mostra sincronização

### ✅ Permissões - Usuário
- [ ] Usuário consegue fazer login
- [ ] Usuário vê todos os cards
- [ ] Usuário consegue editar APENAS seu card
- [ ] Botão desabilitado em cards de outros
- [ ] Mensagem "Apenas leitura" aparece
- [ ] NÃO consegue acessar Configurações

### ✅ Sincronização
- [ ] Dados salvos no localStorage (imediato)
- [ ] SyncIndicator mostra status
- [ ] Dados aparecem no Supabase (verifique SQL)
- [ ] Dados sincronizam entre abas/usuários

### ✅ Edge Cases
- [ ] Editar email e salvar funciona
- [ ] Adicionar novo SDR/Closer funciona
- [ ] Remover SDR/Closer funciona
- [ ] Email vazio (não obrigatório) funciona
- [ ] Fechar modal sem salvar não causa erro

---

## **PASSO 5️⃣: Troubleshooting**

### Problema: "Apenas administradores podem acessar" mesmo como admin
**Solução:**
1. Verifique se seu email está na tabela `admins`:
   ```sql
   SELECT * FROM admins WHERE email = 'allef@grupovorp.com';
   ```
2. Se não aparece, insira:
   ```sql
   INSERT INTO admins (email, added_by, status) 
   VALUES ('allef@grupovorp.com', 'system', 'active');
   ```
3. Faça logout e login novamente

### Problema: Botão "Meu Pace" não está desabilitado
**Solução:**
1. Verifique se o email do usuário bate com o email do card:
   - Card: `caua@grupovorp.com`
   - Usuário logado: `jose@grupovorp.com`
   - Se baterem, botão aparece habilitado (correto)
2. Se não baterem, botão deve estar desabilitado

### Problema: Email não aparece em Configurações
**Solução:**
1. Recarregue a página (Ctrl+Shift+R)
2. Verifique localStorage:
   - DevTools → Application → LocalStorage
   - Procure por `axis-sdr-configs` ou `axis-closer-configs`
   - Deve conter field `email`

### Problema: Sincronização muito lenta
**Solução:**
1. Verifique conexão de internet
2. Verifique status do Supabase (https://status.supabase.com)
3. Veja console do navegador para erros
   - DevTools → Console → Tab vermelha

---

## **PASSO 6️⃣: Próximos Passos**

Após validar tudo com sucesso:

1. ✅ Comunicar ao time os novos emails (config.ts)
2. ✅ Criar usuários para cada pessoa no Supabase Auth
3. ✅ Documentar fluxo de permissões
4. ✅ Treinar time sobre funcionalidade

---

## **Commits Relacionados**

```
a0e36ea - feat: Implement permission system with admin control and email-based access
b4c2115 - fix: Add await to saveConfigsCloud in handleSaveSettings for faster sync
d5ea9d5 - perf: Optimize admin status check in PermissionContext
3d3b9d6 - config: Add email addresses to SDR and Closer configs
```

---

## **Links Úteis**

- Supabase Dashboard: https://supabase.com/
- Cloudflare Pages: https://dash.cloudflare.com/
- GitHub Repo: https://github.com/allef-hue/axis-dashboard
- Docs: Este arquivo + SETUP_ADMINS_TABLE.md

---

## ✅ Validação Completa!

Se todos os itens do checklist estão marcados, o Sistema de Permissões está:
- ✅ Implementado
- ✅ Sincronizado
- ✅ Testado
- ✅ Pronto para produção
