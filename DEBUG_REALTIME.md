# 🔍 DEBUG REALTIME - Guia de Teste

## Status Atual ✅

### Configuração
- ✅ Realtime.ts configurado com subscriptions
- ✅ App.tsx inicializa subscriptions na montagem
- ✅ Supabase REST API respondendo corretamente
- ✅ Dados sendo salvos em `day_data` table

### O que pode estar faltando
- ❓ Realtime habilitado nas tabelas
- ❓ RLS Policies corretas
- ❓ WebSocket conectado

---

## 🧪 Como Testar em Tempo Real

### 1. Abrir Console do Navegador
```
F12 → Console → Procurar por "[Realtime]"
```

Você deve ver algo como:
```
[Realtime] Iniciando subscriptions...
[Realtime] day_data subscription status: SUBSCRIBED
[Realtime] goals subscription status: SUBSCRIBED
```

### 2. Teste de Sincronização em Duas Abas

#### Aba 1 (Editor):
- Abrir http://localhost:5175
- Fazer login
- Ir para "Meu Pace" de um SDR
- **Salvar dados**

#### Aba 2 (Observador):
- Abrir http://localhost:5175 em outra aba (mesma conta)
- **NÃO fazer nada** — apenas observar

**Resultado esperado**: 
- No console da Aba 2, você deve ver:
```
[Realtime] day_data mudou: UPDATE
[Realtime] dayData atualizado para 2026-04-27
```
- Os dados da Aba 2 devem atualizar automaticamente

### 3. Verificar WebSocket no DevTools

Network → WS (filtar por WebSocket)

Procurar por:
```
wss://kcbpbnavfhtazausjhnr.supabase.co/realtime/v1?...
```

Se estiver com status:
- ✅ **ESTABLISHED** = Conectado ✓
- ❌ **CLOSED** = Desconectado (problema!)

---

## 🛠️ Se Não Estiver Funcionando

### Opção 1: Habilitar Realtime na Tabela

1. **Ir para Supabase Dashboard**
   - https://supabase.com/dashboard
   - Projeto: axis-dashboard
   - Database → Tables

2. **Tabela `day_data`**
   - Clicar em "day_data"
   - Procurar toggle "Realtime enabled"
   - **Ativar se estiver desligado**

3. **Tabela `leadership_goals`**
   - Clicar em "leadership_goals"
   - Procurar toggle "Realtime enabled"
   - **Ativar se estiver desligado**

### Opção 2: Verificar RLS Policies

1. **Ir para Database → Policies**
2. **Para `day_data`** — deve ter policy que permita SELECT:
```sql
SELECT * FROM day_data -- Sem restrição ou com user_id
```

3. **Para `leadership_goals`** — deve ter policy que permita SELECT:
```sql
SELECT * FROM leadership_goals
```

### Opção 3: Testar RLS Policies com SQL

1. **Abrir SQL Editor** em Supabase Dashboard
2. **Executar**:
```sql
-- Verificar se policies existem
SELECT 
  policyname, 
  permissive,
  tablename
FROM pg_policies
WHERE tablename IN ('day_data', 'leadership_goals');

-- Tentar ler dados
SELECT * FROM public.day_data LIMIT 1;
```

---

## 📋 Checklist de Verificação

- [ ] `[Realtime] Iniciando subscriptions...` no console
- [ ] `subscription status: SUBSCRIBED` (não CLOSED ou FAILED)
- [ ] WebSocket conectado (Network → WS)
- [ ] Tabelas têm Realtime habilitado
- [ ] RLS Policies permitem leitura
- [ ] Dados salvam em uma aba e atualizam em outra

---

## 🚨 Comandos SQL para Habilitar Realtime

Se estiver com problema, execute no Supabase SQL Editor:

```sql
-- Verificar status atual
SELECT tablename FROM pg_tables 
WHERE tablename IN ('day_data', 'leadership_goals');

-- Habilitar Realtime (se não estiver)
ALTER TABLE public.day_data REPLICA IDENTITY FULL;
ALTER TABLE public.leadership_goals REPLICA IDENTITY FULL;

-- Verificar RLS está ativo
SELECT * FROM pg_table_is_visible('public'::regnamespace::oid);

-- Se não houver policies, criar básicas:
CREATE POLICY "Enable read access for all users" ON public.day_data 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for all users" ON public.day_data 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.day_data 
FOR UPDATE 
USING (true);

-- Mesmo para leadership_goals
CREATE POLICY "Enable read access for all users" ON public.leadership_goals 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for all users" ON public.leadership_goals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.leadership_goals 
FOR UPDATE 
USING (true);
```

---

## 📞 Próximos Passos

1. **Abra DevTools** (F12) e teste os passos acima
2. **Se funcionar** → Sincronização em tempo real está OK! 🎉
3. **Se não funcionar** → Execute o SQL de "Habilitar Realtime" acima

---

Generated: 2026-04-27
Status: Ready to test
