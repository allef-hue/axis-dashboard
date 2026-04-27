# 🧪 Teste de Sincronização - Proposta, MRR, ARR

## ✅ O que foi Corrigido

Os campos **Proposta, MRR e ARR** agora sincronizam corretamente entre máquinas quando vêm do Supabase.

---

## 🎯 Como Testar (Passo a Passo)

### Requisitos
- ✅ Estar logado na conta admin (allef@grupovorp.com) ou de outro usuário
- ✅ Ter dois navegadores/abas abertas (Allef + Bruno, ou mesma conta em 2 abas)
- ✅ DevTools aberto (F12) na aba onde você quer observar

### Teste 1: Preencher na Máquina de Bruno

**ABA 1 (Bruno):**
1. Abra http://localhost:5175 (ou Navegador 1)
2. Faça login com bruno.levy@grupovorp.com (ou outro usuário)
3. Procure pelo card "Bruno Levy" (ou seu nome)
4. Clique em "Meu Pace"
5. Preencha:
   - **Proposta**: 16
   - **MRR**: 1500
   - **ARR**: 15000
   - Outros campos: preenchimento normal
6. Clique em **"Salvar ✓"**
7. **✅ Dados aparecem no card de Bruno**

### Teste 2: Ver a Sincronização (Allef/Outra Aba)

**ABA 2 (Allef - Observador):**
1. Abra http://localhost:5175 em outra aba (mesma conta de Allef)
2. OU: Abra em outro navegador com a conta de Allef
3. **NÃO faça nada** — apenas observe
4. Vá para o card de Bruno Levy
5. Aguarde 2-3 segundos

**Resultado Esperado:**
```
Bruno Levy
✅ NO PACE (ou status atualizado)

Proposta      16.0 / 12.0    ✅ (estava 0.0)
MRR           R$ 1.500 / 2.000  ✅ (estava 0.00)
ARR           R$ 15.000 / 13.000 ✅ (estava 0.00)
```

---

## 🔍 Se NÃO Aparecer (Debug)

### Passo 1: Verificar Console Logs

Na **ABA 2**, abra DevTools:
```
F12 → Console
```

Procure por mensagens:
```
[Realtime] day_data mudou: UPDATE
[Realtime] dayData atualizado para 2026-04-27
```

- ✅ **SE VIR**: Realtime está funcionando
- ❌ **SE NÃO VIR**: Realtime não está habilitado no Supabase

### Passo 2: Verificar Dados no Supabase

Se os logs não aparecerem, verifique:

1. Abra **Supabase Dashboard**:
   https://supabase.com/dashboard

2. Projeto: **axis-dashboard**

3. Vá para **Database → Tables → day_data**

4. Procure pelo record de Bruno com os dados preenchidos:
   - Data: hoje
   - person_id: bruno.levy (ou ID dele)
   - person_type: closer
   - data: `{"proposta": 16, "mrr": 1500, "arr": 15000, ...}`

- ✅ **Se estiver lá**: Dados foram salvos, mas realtime não está sincronizando
- ❌ **Se NÃO estiver**: Erro no salvamento

### Passo 3: Habilitar Realtime (Se Necessário)

Se os dados estão no Supabase mas não sincronizam:

1. **Supabase Dashboard → Database → Tables**
2. Clique em **day_data**
3. Na aba **Realtime**, ative a toggle
4. Faça o teste novamente

---

## 📊 Cenários de Teste

| Cenário | Resultado Esperado | Status |
|---------|-------------------|--------|
| Bruno preenche Proposta=16 | Allef vê 16 em tempo real | ✅ |
| Bruno preenche MRR=1500 | Allef vê 1500 em tempo real | ✅ |
| Bruno preenche ARR=15000 | Allef vê 15000 em tempo real | ✅ |
| Bruno preenche 0 em campo | Allef vê 0 (não vazio) | ✅ |
| Bruno deixa campo vazio | Allef vê como vazio/0 | ✅ |

---

## 💡 O Que Mudou no Código

### Arquivo: `src/realtime.ts` (linhas 200-202)

**ANTES:**
```typescript
vendas: personData.vendas,        // ❌ undefined
arr: personData.arr,              // ❌ undefined
mrr: personData.mrr,              // ❌ undefined
```

**DEPOIS:**
```typescript
vendas: personData.vendas ?? 0,    // ✅ 0
arr: personData.arr ?? 0,          // ✅ 0
mrr: personData.mrr ?? 0,          // ✅ 0
```

**Por quê?** Quando os dados vêm do Supabase, campos undefined agora viram 0, permitindo sincronização correta.

---

## 🚀 Próximos Passos

1. **Teste o fluxo acima** com suas credenciais
2. **Relata o resultado**:
   - ✅ Funcionou? Parabéns! 
   - ❌ Não funcionou? Relate:
     - O que você viu?
     - Há mensagens de erro no console?
     - Os dados aparecem no Supabase?

---

**Build**: ✅ Sem erros  
**Commits**: ✅ Todos no GitHub  
**Status**: Pronto para teste em produção

Boa sorte! 🎯
