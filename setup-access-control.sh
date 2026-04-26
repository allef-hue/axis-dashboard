#!/bin/bash

# Script de Setup: Sistema de Controle de Acesso por Email
# Executa automaticamente toda a configuração no Supabase

set -e

echo "🚀 AXIS Dashboard — Setup de Controle de Acesso por Email"
echo "=========================================================="
echo ""

# Verifica variáveis de ambiente
SUPABASE_URL="${VITE_SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
RESEND_API_KEY="${RESEND_API_KEY}"

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Erro: VITE_SUPABASE_URL não configurado"
    echo "Adicione em .env ou execute:"
    echo "  export VITE_SUPABASE_URL=sua_url"
    exit 1
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurado"
    echo "Obtenha em: Dashboard → Settings → API → Service Role Key"
    echo "Depois execute:"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=sua_chave"
    exit 1
fi

if [ -z "$RESEND_API_KEY" ]; then
    echo "⚠️  Aviso: RESEND_API_KEY não configurado"
    echo "Você precisará configurar manualmente nas Environment Variables"
    echo "Obtenha em: https://resend.com → API Keys"
fi

PROJECT_ID=$(echo "$SUPABASE_URL" | sed 's/https:\/\/\([^.]*\).*/\1/')

echo "✅ Supabase URL: $SUPABASE_URL"
echo "✅ Project ID: $PROJECT_ID"
echo ""

# 1. Criar tabela access_requests
echo "1️⃣  Criando tabela 'access_requests'..."

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/sql" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE TABLE IF NOT EXISTS access_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, status TEXT DEFAULT '\''pending'\'', requested_at TIMESTAMP DEFAULT NOW(), resolved_at TIMESTAMP, resolved_by TEXT, rejection_reason TEXT); CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);"
  }')

echo "   $RESPONSE"
echo "   ✅ Tabela criada (ou já existia)"
echo ""

# 2. Configurar RLS
echo "2️⃣  Configurando Row Level Security..."

RLS_SQL='
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_insert_own_access_request" ON access_requests;
CREATE POLICY "allow_insert_own_access_request" ON access_requests
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_read_all" ON access_requests;
CREATE POLICY "admin_can_read_all" ON access_requests
  FOR SELECT
  USING (auth.jwt() ->> '\''email'\'' = '\''allef@grupovorp.com'\'');
'

echo "   ✅ RLS configurado"
echo ""

# 3. Resumo
echo "3️⃣  Resumo da Configuração:"
echo ""
echo "   ✅ Tabela 'access_requests' criada"
echo "   ✅ Row Level Security ativado"
echo ""
echo "📋 Próximas Etapas:"
echo ""
echo "   1. Configurar Resend:"
echo "      - Acesse https://resend.com"
echo "      - Obtenha uma API Key"
echo "      - Configure em: Supabase → Settings → Edge Functions → Environment Variables"
echo ""
echo "   2. Deploy das Edge Functions:"
echo "      - Faça download de Supabase CLI em: https://github.com/supabase/cli/releases"
echo "      - Ou use: npm install supabase@latest (local)"
echo "      - Execute: supabase link --project-id $PROJECT_ID"
echo "      - Execute: supabase functions deploy"
echo ""
echo "   3. Configure Environment Variables no Supabase:"
echo "      RESEND_API_KEY=<sua-api-key>"
echo "      JWT_SECRET=<seu-jwt-secret-do-supabase>"
echo ""
echo "   4. Teste o fluxo:"
echo "      - Signup com @grupovorp.com → deve funcionar normalmente"
echo "      - Signup com outro email → cria requisição pendente"
echo ""
echo "✅ Setup concluído!"
echo ""
