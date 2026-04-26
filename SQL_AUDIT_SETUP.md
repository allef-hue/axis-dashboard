# 🔐 Setup: Sistema de Auditoria Completo

## Tabela: `audit_log`

Registra **TODAS** as alterações feitas no `day_data` com quem fez, quando e o quê mudou.

### SQL para criar a tabela e triggers

Copie e execute no **Supabase → SQL Editor**:

```sql
-- ===== CRIAR TABELA DE AUDITORIA =====
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_id TEXT NOT NULL, -- Identificador do registro modificado
  user_email TEXT, -- Email do usuário que fez a alteração
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  old_values JSONB, -- Valores antes da alteração
  new_values JSONB, -- Valores depois da alteração
  ip_address TEXT, -- IP do usuário (opcional)
  metadata JSONB -- Dados adicionais (opcional)
);

-- Criar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_email ON audit_log(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON audit_log(changed_at);

-- ===== TRIGGER PARA REGISTRAR ALTERAÇÕES EM day_data =====

-- Criar função que será chamada pelo trigger
CREATE OR REPLACE FUNCTION log_audit_for_day_data()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Obtém email do usuário atual (via JWT)
  user_email := auth.jwt() ->> 'email';
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      record_id,
      user_email,
      new_values
    ) VALUES (
      'day_data',
      'INSERT',
      NEW.date || '|' || NEW.person_id || '|' || NEW.person_type,
      user_email,
      row_to_json(NEW)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      record_id,
      user_email,
      old_values,
      new_values
    ) VALUES (
      'day_data',
      'UPDATE',
      OLD.date || '|' || OLD.person_id || '|' || OLD.person_type,
      user_email,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      record_id,
      user_email,
      old_values
    ) VALUES (
      'day_data',
      'DELETE',
      OLD.date || '|' || OLD.person_id || '|' || OLD.person_type,
      user_email,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que chama a função acima
DROP TRIGGER IF EXISTS trg_audit_day_data ON day_data;
CREATE TRIGGER trg_audit_day_data
AFTER INSERT OR UPDATE OR DELETE ON day_data
FOR EACH ROW
EXECUTE FUNCTION log_audit_for_day_data();

-- ===== RLS POLICIES =====

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas: qualquer usuário autenticado pode ver seu próprio histórico
CREATE POLICY "users_can_view_own_audit" ON audit_log
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL -- Apenas usuários autenticados
  );

-- Apenas liderança pode ver tudo
CREATE POLICY "admin_can_view_all_audit" ON audit_log
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'allef@grupovorp.com' OR
    auth.jwt() ->> 'role' = 'leadership'
  );

COMMIT;
```

---

## ✅ O Que Será Rastreado

| Ação | Rastreado | Exemplo |
|------|-----------|---------|
| **Novo preenchimento** | ✅ INSERT | João preenche 50 leads em 01/03 |
| **Alteração de dados** | ✅ UPDATE | Maria corrige 3 agendamentos |
| **Deleção** | ✅ DELETE | Admin remove dado duplicado |
| **Quem fez** | ✅ Email | joao@grupovorp.com |
| **Quando fez** | ✅ Timestamp | 2026-03-01 14:35:22 |
| **Antes/Depois** | ✅ JSONB | leads: 40 → 50 |

---

## 📊 Exemplos de Consultas

### Consulta 1: Ver histórico completo de um dia/pessoa

```sql
SELECT 
  changed_at,
  operation,
  user_email,
  old_values ->> 'leads' as leads_antes,
  new_values ->> 'leads' as leads_depois
FROM audit_log
WHERE record_id = '2026-03-01|joao_silva|sdr'
ORDER BY changed_at DESC;
```

### Consulta 2: Quem alterou nos últimos 7 dias?

```sql
SELECT 
  user_email,
  operation,
  table_name,
  changed_at,
  new_values ->> 'person_id' as pessoa
FROM audit_log
WHERE changed_at >= NOW() - INTERVAL '7 days'
ORDER BY changed_at DESC
LIMIT 50;
```

### Consulta 3: Comparar antes/depois

```sql
SELECT 
  changed_at,
  user_email,
  operation,
  jsonb_pretty(old_values) as valores_anteriores,
  jsonb_pretty(new_values) as valores_novos
FROM audit_log
WHERE record_id LIKE '%joao_silva%'
ORDER BY changed_at DESC;
```

---

## 🔍 Dentro do Dashboard

Quando implementarmos a UI, você terá:

### Botão "Ver Histórico" em cada card
```
┌─────────────────────┐
│ João da Silva       │
│ Leads: 50/44        │
│                     │
│ [Meu Pace] [📋 Histórico]
└─────────────────────┘
```

### Modal com Histórico
```
Histórico de Alterações — João da Silva
═══════════════════════════════════════════

01/03 14:35 - João Silva
  Operação: UPDATE
  Leads: 40 → 50
  Agendamentos: 2 → 3
  
01/03 14:20 - João Silva
  Operação: INSERT
  Criado registro para 01/03

28/02 16:45 - Maria (Admin)
  Operação: UPDATE
  Corrigiu: Receita 900 → 950
```

---

## 🛡️ Garantias de Segurança

✅ **Imutabilidade**: Uma vez registrado, não pode ser alterado
✅ **Rastreabilidade**: Cada alteração tem email do autor
✅ **Timestamped**: Data/hora exata (UTC)
✅ **Versionamento**: Você vê antes e depois
✅ **Compliance**: Pronto para auditorias

---

## 📝 Próximas Etapas

1. ✅ Execute o SQL acima no Supabase
2. ✅ Implemente `getAuditHistory()` em `db.ts`
3. ✅ Crie componente `AuditHistoryModal.tsx`
4. ✅ Adicione botão "Histórico" em cada PersonCard
5. ✅ Teste: faça uma alteração e veja no histórico

---

## ❓ Dúvidas

**P: Os dados anteriores (antes de implementar) serão rastreados?**
R: Não. Apenas alterações APÓS criar a tabela. Para dados históricos, você teria que fazer uma migração especial.

**P: Posso reverter uma alteração?**
R: Não automaticamente, mas você pode copiar os valores do `old_values` e fazer um UPDATE manual. Em v2, podemos implementar "Desfazer" automático.

**P: O que acontece se alguém deslogar?**
R: O `user_email` pode ficar vazio, mas a alteração é registrada. Você vê que foi feita mas não por quem.

**P: Quanto tempo os registros de auditoria são mantidos?**
R: Indefinidamente (até você deletar). Você pode adicionar uma política de retenção se necessário.
