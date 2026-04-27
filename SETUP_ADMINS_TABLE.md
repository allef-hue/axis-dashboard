# Setup: Tabela de Admins

Execute o SQL abaixo no **Supabase SQL Editor** para criar a tabela de admins necessária para o Sistema de Permissões.

## SQL para criar tabela de admins

```sql
-- Criar tabela admins
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

-- Habilitar RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins (emails na própria tabela) podem ler/escrever
CREATE POLICY "admin_full_access" ON admins
  FOR ALL
  USING (auth.jwt()->>'email' IN (SELECT email FROM admins WHERE status = 'active'));

-- Policy: Admins podem consultar a lista de admins
CREATE POLICY "admin_select" ON admins
  FOR SELECT
  USING (auth.jwt()->>'email' IN (SELECT email FROM admins WHERE status = 'active'));
```

## Próximas ações

1. **Execute o SQL acima** no Supabase Dashboard → SQL Editor
2. **Insira o primeiro admin** (você mesmo):
   ```sql
   INSERT INTO admins (email, added_by, status) 
   VALUES ('allef@grupovorp.com', 'system', 'active');
   ```

3. **Na dashboard**, você agora consegue:
   - Acessar a aba "Configurações"
   - Ver/editar emails de cada person (SDR/Closer)
   - Adicionar novos admins (futura expansão)

## Como funciona

- **Admin** (email na tabela `admins`):
  - Pode acessar a aba "Configurações"
  - Pode editar o "Meu Pace" de qualquer person
  - Pode visualizar tudo

- **Usuário Normal** (email correspondente a um person):
  - Pode editar APENAS seu próprio "Meu Pace" (matched por email)
  - Pode visualizar todas as abas
  - Botão "Meu Pace" desabilitado em cards de outros

## Campos da tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `email` | TEXT | Email do admin (ex: allef@grupovorp.com) |
| `added_by` | TEXT | Email de quem adicionou este admin |
| `added_at` | TIMESTAMP | Quando foi adicionado |
| `status` | TEXT | 'active' ou 'inactive' |

## Referência de Código

No arquivo **config.ts**, você pode adicionar o email de cada person ao criar os configs:

```typescript
const SDR_CONFIGS: SDRConfig[] = [
  {
    id: '1',
    nome: 'Cauã',
    email: 'jose@grupovorp.com',  // ← Email do usuário
    diasUteis: 22,
    metas: { ... }
  },
  // ...
];
```

Ou editar direto na aba "Equipe SDR" / "Equipe Closer" dentro de "Configurações" (como admin).
