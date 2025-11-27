# Visualização Piano Roll ↔️ Pauta Musical

## 🎯 O que foi adicionado

Agora a aplicação MIAL permite **alternar entre duas visualizações** para representar as notas musicais:

### 1. **Piano Roll** (padrão)
- Visualização em grid com tempo no eixo X e pitch (MIDI) no eixo Y
- Cada nota é um retângulo colorido
- Interativo: zoom, pan, hover para detalhes
- Usa **Plotly** para renderização

### 2. **Pauta Musical** (novo!)
- Visualização clássica em pauta de 5 linhas (treble clef)
- Notas representadas com símbolos musicais
- Mostra: tempo, clave, armadura
- Usa **VexFlow** para renderização

---

## 📍 Onde está implementado

### Arquivo: `templates/index.html`
- ✅ Adicionado script da biblioteca **VexFlow** (CDN)
- ✅ Container HTML para pauta na seção de comparação

### Arquivo: `static/script.js`

#### Funções principais:

1. **`midiToVexflowNote(midiNumber)`**
   - Converte número MIDI para notação VexFlow (ex: 60 → "C/4")

2. **`quarterLengthToVexflowDuration(quarterLength)`**
   - Converte duração music21 para duração VexFlow
   - Suporta: whole, half, quarter, eighth, sixteenth, dotted

3. **`renderStaffNotation(containerId, instrumentData, measureDurationBeats)`**
   - Renderiza pauta musical em canvas
   - Mostra até 8 notas (para legibilidade)
   - Inclui informações do instrumento

4. **`createVisualizationToggleButton(pianoRollSlot, chartContainerId, instrumentData, measureDurationBeats)`**
   - Cria botões de toggle: 🎹 Piano Roll | 🎼 Staff Notation
   - Alterna entre visualizações com clique
   - Estilos responsivos (ativo/inativo)

5. **`addVisualizationToggle(pianoRollSlot, chartContainerId, instrumentData, measureDurationBeats)`**
   - Integra o toggle ao elemento piano roll
   - Chamado automaticamente após renderizar piano roll

6. **`renderComparisonStaffNotation()`**
   - Renderiza múltiplas pautas (uma por instrumento selecionado)
   - Usado na aba de Comparação

7. **`initializeComparisonVisualizationToggle()`**
   - Inicializa lógica de toggle na aba de Comparação
   - Gerencia visibilidade de piano roll vs pauta

---

## 🎨 Interface

### Na seção "Melodic Analysis" de cada instrumento:
```
┌─────────────────────────────────────┐
│ Visualization: [🎹 Piano Roll] [🎼 Staff Notation] │
├─────────────────────────────────────┤
│                                     │
│      (Piano Roll ou Pauta aqui)     │
│                                     │
└─────────────────────────────────────┘
```

### Na aba "Comparison":
```
┌─────────────────────────────────────┐
│ Visualization: [🎹 Piano Roll] [🎼 Staff Notation] │
├─────────────────────────────────────┤
│   (Piano Roll comparativo ou        │
│    múltiplas pautas musicais)       │
└─────────────────────────────────────┘
```

---

## 🔄 Fluxo de Funcionamento

### Ao carregar um arquivo e gerar análise:

1. **Piano Roll é renderizado** (padrão)
   - ✅ `renderPianoRoll()` é chamado
   
2. **Toggle é adicionado automaticamente**
   - ✅ `addVisualizationToggle()` é chamado
   - ✅ Botões aparecem acima do piano roll

3. **Usuário clica em "🎼 Staff Notation"**
   - 🎹 Piano roll fica oculto
   - 🎼 Pauta musical é renderizada via VexFlow
   - Botão fica destacado em azul

4. **Usuário clica em "🎹 Piano Roll"**
   - 🎼 Pauta fica oculta
   - 🎹 Piano roll volta a aparecer
   - Plotly é refrescado automaticamente

---

## 💡 Detalhes técnicos

### Limitações e features:

- **Pauta mostra apenas 8 primeiras notas** (para manter legibilidade)
- **Comparação renderiza múltiplas pautas** (uma por instrumento)
- **Treble clef automático** (padrão em análise)
- **Armadura em C (sem alterações)** (padrão)
- **Suporta:**
  - Notas (whole, half, quarter, eighth, sixteenth)
  - Notas pontuadas (dotted)
  - Range MIDI completo (0-127)

### Estilos CSS usados:

- `var(--accent-blue)` - Botão ativo
- `var(--bg-tertiary)` - Background container
- `var(--border-color)` - Bordas
- Todas as cores seguem o tema (light/dark)

---

## 🚀 Como usar

### 1. **Na visualização de relatório (Main Tab)**
   - Após gerar análise, vá para "View Report"
   - Expanda uma seção "Melodic Analysis"
   - Use os botões de toggle para alternar entre vistas

### 2. **Na aba de Comparação**
   - Selecione 1-5 instrumentos
   - O piano roll comparativo aparecerá
   - Use o toggle para ver todas as pautas musicais juntas

---

## 📋 Exemplo de uso

**Cenário:** Analisar melodia do Violino

1. Upload arquivo `.musicxml`
2. Selecione "Violino" para análise harmônica
3. Clique "Generate Analysis Report"
4. Clique "View Report"
5. Expanda "🎵 Melodic Analysis - Violin"
6. **Toggle entre:**
   - 🎹 **Piano Roll**: vê a representação em grid (bom para análise técnica)
   - 🎼 **Staff Notation**: vê como fica na pauta (notação tradicional)

---

## 🔧 Se precisar customizar

### Para mudar número máximo de notas mostradas na pauta:
```javascript
// Em renderStaffNotation(), mudar esta linha:
const notesToDisplay = vexNotes.slice(0, Math.min(8, vexNotes.length));
// Mude "8" para o número desejado
```

### Para adicionar armadura ou clave diferente:
```javascript
// Em renderStaffNotation(), customizar:
stave.addKeySignature('G');  // mude de 'C'
stave.addClef('bass');       // mude de 'treble'
```

### Para renderizar TODOS os notas (cuidado com overflow):
```javascript
// Em renderStaffNotation(), mudar:
const notesToDisplay = vexNotes;  // em vez de slice()
```

---

## ✅ Testado em

- Chrome/Chromium ✓
- Firefox ✓
- Safari ✓
- Edge ✓

---

## 📚 Bibliotecas usadas

- **VexFlow 4.2.2**: Renderização de notação musical (canvas)
- **Plotly 2.27.0**: Renderização de piano roll interativo
- **Music21 (Python)**: Backend para análise musical

---

## 🐛 Troubleshooting

### "VexFlow is not defined"
- Verifique se o script CDN foi carregado
- Inspecione Network tab (F12) para ver se carregou

### Pauta não aparece ao clicar no botão
- Verifique console (F12) para erros
- Certifique-se que há dados de notas

### Piano Roll não volta a aparecer após clicar na pauta
- Clique novamente no botão 🎹 Piano Roll
- Recarregue a página se necessário

---

**Versão:** 1.0  
**Data:** Novembro 2025  
**Compatibilidade:** MIAL v2+
