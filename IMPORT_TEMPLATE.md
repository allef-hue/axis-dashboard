# 📊 Guia: Importar Dados via Planilha CSV

## Como Funciona

1. **Gere o template** no dashboard: Configurações → **Baixar Template**
2. **Preencha os dados** usando uma planilha (Excel, Google Sheets, etc.)
3. **Salve como CSV** (Arquivo → Salvar Como → Formato: CSV)
4. **Importe no dashboard**: Configurações → **Importar Dados** → Arraste o arquivo

---

## 📋 Formato do Template

### EQUIPE SDR

```
Data,Tipo,Pessoa ID,Leads,Agendamentos,Acontecidas,Receita Originada,Ligações WhatsApp,Tempo em Linha (min)
2026-04-26,sdr,joao_silva,25,8,6,3500,45,180
2026-04-26,sdr,maria_sdr,30,10,7,4200,52,210
```

**Indicadores SDR:**
| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Leads** | Leads gerados | 25 |
| **Agendamentos** | Reuniões agendadas | 8 |
| **Acontecidas** | Reuniões que aconteceram | 6 |
| **Receita Originada** | Valor gerado em vendas | 3500 |
| **Ligações WhatsApp** | Mensagens/calls via WhatsApp | 45 |
| **Tempo em Linha (min)** | Tempo total em atendimento | 180 |

---

### EQUIPE CLOSER

```
Data,Tipo,Pessoa ID,Reuniões,Contratos,Receita Gerada
2026-04-26,closer,carlos_closer,3,2,12000
```

**Indicadores Closer:**
| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Reuniões** | Reuniões feitas | 3 |
| **Contratos** | Contratos fechados | 2 |
| **Receita Gerada** | Valor total de vendas | 12000 |

---

## 🎯 Preenchendo no Excel / Google Sheets

### Passo 1: Abra o Template

Faça download do template e abra em seu programa de planilha preferido.

### Passo 2: Preencha os Dados

```
Data           | Tipo   | Pessoa ID      | Leads | Agendamentos | ... | Receita
2026-04-26     | sdr    | joao_silva     | 25    | 8            | ... | 3500
2026-04-27     | sdr    | joao_silva     | 22    | 7            | ... | 3200
2026-04-26     | closer | carlos_closer  | 3     | 2            | ... | 12000
```

### Passo 3: Salve como CSV

**No Excel:**
1. Arquivo → Salvar Como
2. Formato: **CSV (Separado por vírgula) (*.csv)**
3. Clique em Salvar

**No Google Sheets:**
1. Arquivo → Baixar → CSV
2. Pronto!

---

## ⚠️ Regras Importantes

| Regra | Detalhe |
|-------|---------|
| **Data obrigatória** | Formato: YYYY-MM-DD (ex: 2026-04-26) |
| **Tipo obrigatório** | Apenas "sdr" ou "closer" |
| **Pessoa ID obrigatória** | Deve ser um ID válido do dashboard |
| **Separador decimal** | Use ponto (.) não vírgula: 1500.50 |
| **Valores zerados** | Use 0 para dias sem atividade |
| **Sem cabeçalho duplicado** | Remove automaticamente, mas não adicione extras |

---

## ✅ Exemplos Válidos

### SDR de um dia

```
Data,Tipo,Pessoa ID,Leads,Agendamentos,Acontecidas,Receita Originada,Ligações WhatsApp,Tempo em Linha (min)
2026-04-26,sdr,joao_silva,25,8,6,3500,45,180
```

### SDR de múltiplos dias

```
Data,Tipo,Pessoa ID,Leads,Agendamentos,Acontecidas,Receita Originada,Ligações WhatsApp,Tempo em Linha (min)
2026-04-24,sdr,joao_silva,20,5,4,2500,30,150
2026-04-25,sdr,joao_silva,22,7,5,3000,40,170
2026-04-26,sdr,joao_silva,25,8,6,3500,45,180
```

### SDR + Closer no mesmo arquivo

```
Data,Tipo,Pessoa ID,Leads,Agendamentos,Acontecidas,Receita Originada,Ligações WhatsApp,Tempo em Linha (min)
2026-04-26,sdr,joao_silva,25,8,6,3500,45,180
2026-04-26,sdr,maria_sdr,30,10,7,4200,52,210
Data,Tipo,Pessoa ID,Reuniões,Contratos,Receita Gerada
2026-04-26,closer,carlos_closer,3,2,12000
```

---

## ❌ Exemplos Inválidos

```
❌ ERRADO: Data em formato errado
2026/04/26,sdr,joao_silva,...

❌ ERRADO: Pessoa ID não existe
2026-04-26,sdr,pessoa_inexistente,...

❌ ERRADO: Separador decimal com vírgula
2026-04-26,sdr,joao_silva,20,5,4,3500,50  ← Receita com vírgula: 3.500,00

❌ ERRADO: Tipo fora dos padrões
2026-04-26,SDR,joao_silva,...  ← Use "sdr" minúsculo
```

---

## 🆘 Troubleshooting

### "Arquivo vazio"
- Certifique-se que salvou como CSV
- Verifique se há dados além do cabeçalho

### "Linhas: colunas insuficientes"
- Cada linha de SDR precisa de 8 colunas mínimo
- Cada linha de Closer precisa de 6 colunas mínimo

### "Data inválida"
- Use formato YYYY-MM-DD
- Exemplo correto: 2026-04-26

### "Pessoa não encontrada"
- Verifique o ID da pessoa no dashboard
- IDs são case-sensitive (joao_silva ≠ Joao_Silva)

### "Tipo inválido"
- Use apenas "sdr" ou "closer"
- Minúsculas, sem espaços

---

## 💡 Dicas

✅ **Sempre comece com o template** gerado pelo dashboard  
✅ **Use o mesmo formato** para todos os arquivos  
✅ **Teste com um dia antes** de importar múltiplos dias  
✅ **Guarde cópias** do seu arquivo original  
✅ **Exporte regularmente** para ter backup dos dados

---

## 📞 Suporte

Se algo não funcionar, verifique:
1. Formato do CSV (use sempre vírgula como separador)
2. Datas no padrão YYYY-MM-DD
3. IDs das pessoas existem no dashboard
4. Nenhum carácter especial nos valores numéricos

Pronto para começar! 🚀
