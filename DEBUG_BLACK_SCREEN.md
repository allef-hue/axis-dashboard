# 🔍 DEBUG: Black Screen ao Clicar em "Meu Pace"

## Status Atual ✅

### Correções Realizadas
- ✅ Adicionado error boundaries ao EditModal
- ✅ Melhorado inicialização de campos com valores padrão
- ✅ Adicionado logging detalhado para debugar
- ✅ Validação de config e fieldKeys
- ✅ Build sem erros TypeScript

### Possíveis Causas
1. ❓ Erro de renderização (React error boundary não capturado)
2. ❓ CSS issue (elementos invisíveis ou posicionamento errado)
3. ❓ Problema de data/carregamento (dayData undefined)
4. ❓ Issue de z-index ou posicionamento
5. ❓ Problema com inicialização async

---

## 🧪 Guia de Teste - Passo a Passo

### Pré-requisitos
- ✅ Estar logado no AXIS
- ✅ Estar na aba "Pace Time"
- ✅ DevTools aberto (F12)

### Passo 1: Abrir o Console
```
F12 → Console
```

Procure por mensagens com `[EditModal]`. Você deve ver:
```
[EditModal] Mounting with type: sdr|closer config: [Nome da pessoa] data: {...}
[EditModal] Fields initialized: {leads: "0", agendamentos: "0", ...}
```

**Se NÃO aparecer estas mensagens**: O EditModal não está sendo montado.
- Verifique: `editingPerson?.type === 'sdr'` em App.tsx
- Verifique se `setEditingPerson` está sendo chamado

---

### Passo 2: Clicar em "Meu Pace"
1. Abra o painel lateral de uma pessoa (SDR ou Closer)
2. Clique no botão **"Meu Pace"** (também chamado "Editar")
3. **Observe o console simultaneamente**

**Resultado esperado**:
- Modal com overlay escuro aparece
- Modal com conteúdo (header, formulário, botões) é visível
- Console mostra `[EditModal] Mounting...`

**Se aparecer tela preta**:
- Verifique os erros no console (step 3)
- Verifique a aba Elements/Inspector (step 4)

---

### Passo 3: Verificar Erros no Console
Abra a aba **Console** do DevTools e procure por:

#### ❌ Erros em Vermelho
Copie a mensagem completa e relate:
```
ERROR: [tipo de erro]
[stack trace]
```

#### ⚠️ Warnings em Amarelo
Não devem afetar, mas anote se houver muitos.

#### ℹ️ Logs Informativos
Procure por:
- `[EditModal] Mounting...` - Component montado
- `[EditModal] Fields initialized...` - Campos inicializados
- `[Realtime]...` - Sincronização em tempo real

**Se não houver nenhum `[EditModal]` log**:
- O componente NÃO está sendo renderizado
- Verifique a condicional em App.tsx (linha 747)

---

### Passo 4: Inspecionar o DOM

Abra a aba **Elements** (ou Inspector) e procure por:

```html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <!-- Título e botão fechar -->
    </div>
    <div class="modal-date-selector">
      <!-- Seletor de data -->
    </div>
    <div class="modal-body">
      <!-- Campos do formulário aqui -->
    </div>
    <div class="modal-footer">
      <!-- Botões -->
    </div>
  </div>
</div>
```

**Checklist do DOM**:
- [ ] `.modal-overlay` está presente?
- [ ] `.modal` está dentro do overlay?
- [ ] `.modal-body` contém `<input>` fields?
- [ ] Quantos fields estão renderizados? (esperado: 7 para SDR, 6 para Closer)

**Se `.modal-body` estiver vazio**:
- Significa que `fieldKeys.map()` retornou nada
- Isso só pode acontecer se `fieldKeys` for vazio ou undefined
- Verifique os logs do console (Passo 3)

---

### Passo 5: Verificar Estilos Computados

No DevTools Inspector, clique no elemento `.form-input` (campo de input):
```
DevTools → Elements → Selecione um <input> → Styles (lado direito)
```

Verifique:
- ✅ `color: #f0f0f0` (ou variação de branco em dark mode)
- ✅ `background: rgba(255,255,255,0.04)` (ou similar em dark mode)
- ✅ `display: (não deve ser none)`
- ✅ `visibility: (deve ser visible, não hidden)`
- ✅ `opacity: 1` (não deve ser 0)
- ✅ `width: (deve ter algum valor, não 0)`
- ✅ `height: (deve ter algum valor, não 0)`

**Se algum estilo estiver errado**:
- Anote qual estilo e qual é o valor esperado
- Isso indica problema de CSS

---

### Passo 6: Verificar a Aba Network

No DevTools:
```
F12 → Network
```

Clique em "Meu Pace" e veja se há requisições falhadas:
- ❌ Se há erros 4xx ou 5xx: Problema de API
- ✅ Se tudo é 200/304: Sem problemas de rede

---

## 🛠️ Possíveis Soluções

### Se o EditModal não está montando
**Arquivo**: `src/App.tsx` linha 747
```typescript
// Adicione um console.log para debugar
console.log('editingPerson:', editingPerson);
console.log('editingSDRConfig:', editingSDRConfig);
console.log('editingCloserConfig:', editingCloserConfig);
```

### Se fieldKeys está vazio
**Arquivo**: `src/components/EditModal.tsx` linha 71
```typescript
// Verifique se type é 'sdr' ou 'closer'
if (!fieldKeys || fieldKeys.length === 0) {
  console.error('fieldKeys vazio! type:', type);
}
```

### Se os campos não estão visíveis
**Arquivo**: `src/index.css` linha 1138
```css
.form-input {
  /* Verifique color, background, display, visibility */
  color: var(--text);  /* Deve ser branco/claro */
  background: rgba(255, 255, 255, 0.04);  /* Deve estar visível */
}
```

---

## 📋 Checklist de Verificação

Responda a cada pergunta:

- [ ] EditModal está sendo montado? (veja console)
- [ ] Modal overlay está visível? (tela escura aparece?)
- [ ] Modal box está visível? (veja Elements)
- [ ] Modal header está visível? (título e botão X?)
- [ ] Modal body contém inputs? (veja Elements → modal-body)
- [ ] Inputs têm visibilidade correta? (veja Styles)
- [ ] Não há erros no console? (veja Console)
- [ ] Network requests são bem-sucedidas? (veja Network)

**Se SIM para todos**: Sistema funcionando ✅  
**Se NÃO para alguns**: Relate qual(is) pergunta(s) é NO

---

## 📞 Como Relatar o Problema

Ao relatar, forneça:

1. **Seu navegador/versão**: Chrome 90+? Safari? Firefox?
2. **OS**: Windows? Mac? Linux?
3. **Resposta para cada item do Checklist** acima
4. **Console logs**: Cole mensagens exatas (copie do console)
5. **Screenshot da tela preta**: Mostre exatamente o que aparece
6. **DOM structure**: Abra Elements e copie a estrutura HTML do modal

---

## 🚀 Solução Rápida

Se você quer tentar resolver sozinho:

1. Abra `src/components/EditModal.tsx`
2. Procure por `export default function EditModal`
3. Verifique que a função retorna um JSX (não uma string ou null)
4. Verifique que `fieldKeys` não é vazio (linha 71-74)
5. Verifique que `config` não é undefined (há verificação na linha ~76)
6. Execute `npm run build` para compilar
7. Recarregue a página no navegador

---

**Última atualização**: 2026-04-27
**Status**: Aguardando testes e feedback do usuário
