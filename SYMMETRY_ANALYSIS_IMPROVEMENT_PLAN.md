# Plano de Melhoramento: Análise de Simetria Musical com music21

## Problemas Identificados

### 1. **Apenas Retrograde está a renderizar no Staff Viewer**
**Causa**: No código JavaScript ([script.js:3975-3984](static/script.js#L3975-L3984)), a prioridade de renderização está definida como:
```javascript
if (sym.retrograde_measures && sym.retrograde_measures.length > 0) {
    targetAnalysisType = 'Retrograde';
    targetMeasures = sym.retrograde_measures;
} else if (sym.inversion_measures && sym.inversion_measures.length > 0) {
    targetAnalysisType = 'Inversion';
    targetMeasures = sym.inversion_measures;
} else if (sym.ri_measures && sym.ri_measures.length > 0) {
    targetAnalysisType = 'Retrograde-Inversion';
    targetMeasures = sym.ri_measures;
}
```

**Problema**: Sempre renderiza apenas o primeiro tipo que tiver compassos, em vez de permitir ao utilizador escolher qual tipo visualizar.

### 2. **Metodologia de Cálculo de Similaridade Incorreta**

#### Problema Fundamental
A análise atual usa **correspondência posição-a-posição** ([app.py:1560-1563](app.py#L1560-L1563)):

```python
retrograde_matches = sum(1 for i in range(len(pitch_sequence))
                        if pitch_sequence[i] == reversed_sequence[i])
retrograde_score = (retrograde_matches / len(pitch_sequence)) * 100
```

**Por que isto está errado?**

1. **Retrograde**: Comparar `pitch_sequence[i] == reversed_sequence[i]` não faz sentido musical
   - Exemplo: Sequência `[C, D, E, F]` → Retrograde `[F, E, D, C]`
   - Na posição 0: `C == F`? Não!
   - Na posição 1: `D == E`? Não!
   - **Resultado**: 0% similaridade mesmo quando o retrograde é perfeito!

2. **Inversion**: O mesmo problema - compara posições que não deveriam ser comparadas

3. **Compassos extraídos são inúteis**: Se a comparação posicional não encontra matches, não há compassos para renderizar

#### O que deveria ser feito

**Para Retrograde**: Verificar se a sequência inteira invertida existe **como subsequência** na obra
**Para Inversion**: Verificar se a sequência invertida existe como subsequência
**Para RI**: Verificar se a sequência retrógrada-invertida existe como subsequência

### 3. **Uso Incorreto da Biblioteca music21**

#### Funções music21 utilizadas atualmente

**Em `analyze_symmetry_music21()` ([app.py:1673-1751](app.py#L1673-L1751))**:
```python
from music21 import serial

original_series = serial.pcToToneRow(pitch_sequence[:row_length])
retrograde_series = original_series.zeroCenteredTransformation('R', 0)
inversion_series = original_series.zeroCenteredTransformation('I', 0)
retrograde_inversion_series = original_series.zeroCenteredTransformation('RI', 0)
```

**Problemas**:
1. Limita análise aos primeiros 12 tons (`row_length = min(12, len(pitch_sequence))`)
2. Usa transformações seriais mesmo em música tonal
3. Não procura padrões dentro da obra completa
4. A comparação posicional subsequente anula o trabalho do music21

#### Funções music21 que DEVERIAM ser usadas

##### **1. Para Análise de Padrões Melódicos**
```python
from music21 import search

# Procurar padrões melódicos
pattern = search.noteNamePattern(note_list, 'C D E')
matches = search.noteNameSearch(score, pattern)
```

##### **2. Para Análise de Contorno Melódico**
```python
from music21.search import serial as serialSearch

# Criar contorno melódico
contour = serialSearch.ContourSearcher(note_sequence)
retrograde_contour = contour.retrograde()
matches = contour.findSegments(score)
```

##### **3. Para Análise Tonal (Correto)**
```python
from music21 import pitch, interval

# Calcular inversão tonal correta
key_center = score.analyze('key')
tonic = key_center.tonic

def tonal_inversion(note, axis):
    """Inverte uma nota em torno de um eixo tonal"""
    interval_from_axis = interval.Interval(axis, note.pitch)
    inverted_interval = interval_from_axis.reverse()
    return axis.transpose(inverted_interval)
```

##### **4. Para Encontrar Subsequências**
```python
from music21.search import serial

# Procurar subsequências seriais
row = serial.TwelveToneRow([0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10])
retrograde = row.zeroCenteredTransformation('R', 0)

# Procurar esta sequência na partitura
searcher = serial.RowScoreSearcher(score)
matches = searcher.search(retrograde)
```

---

## Plano de Melhoramento

### **FASE 1: Corrigir Algoritmo de Detecção de Simetria**

#### 1.1. Implementar Busca de Subsequências
**Ficheiro**: `app.py`
**Localização**: Substituir funções `analyze_symmetry_tonal()`, `analyze_symmetry_advanced()`, `analyze_symmetry_music21()`

**Nova Abordagem**:
```python
def find_pattern_occurrences(score, pattern_pitch_classes, part_index=0):
    """
    Encontra todas as ocorrências de um padrão na partitura.

    Args:
        score: Partitura music21
        pattern_pitch_classes: Lista de pitch classes do padrão [0-11]
        part_index: Índice do instrumento

    Returns:
        List of tuples: [(start_measure, end_measure, start_note_idx, end_note_idx), ...]
    """
    part = score.parts[part_index]
    notes = part.flatten().notes

    occurrences = []
    pattern_length = len(pattern_pitch_classes)

    for i in range(len(notes) - pattern_length + 1):
        # Extrair segmento
        segment_pcs = [n.pitch.pitchClass for n in notes[i:i+pattern_length]]

        # Comparar com padrão
        if segment_pcs == pattern_pitch_classes:
            start_measure = notes[i].measureNumber
            end_measure = notes[i + pattern_length - 1].measureNumber
            occurrences.append((start_measure, end_measure, i, i + pattern_length - 1))

    return occurrences
```

#### 1.2. Novo Cálculo de Similaridade
**Métrica proposta**: **Coverage Percentage**

```python
def calculate_symmetry_coverage(original_notes, pattern_occurrences):
    """
    Calcula percentagem de cobertura do padrão na obra original.

    Coverage = (Total de notas cobertas pelo padrão / Total de notas) × 100
    """
    total_notes = len(original_notes)
    covered_indices = set()

    for start_idx, end_idx in pattern_occurrences:
        covered_indices.update(range(start_idx, end_idx + 1))

    coverage = (len(covered_indices) / total_notes) * 100
    return coverage
```

**Exemplo**:
- Obra tem 100 notas
- Padrão retrógrado aparece 3 vezes, cobrindo 45 notas no total
- Coverage = 45%

#### 1.3. Nova Função `analyze_symmetry_improved()`

```python
def analyze_symmetry_improved(score, part_index=0, environment='tonal'):
    """
    Análise de simetria melhorada usando busca de subsequências.

    Returns:
        {
            'retrograde_score': float,  # % de cobertura
            'inversion_score': float,
            'ri_score': float,
            'retrograde_occurrences': [(start_m, end_m), ...],
            'inversion_occurrences': [(start_m, end_m), ...],
            'ri_occurrences': [(start_m, end_m), ...],
            'method': 'tonal' or 'serial',
            'tonality': str,
            'tonic_pitch_class': int
        }
    """
    part = score.parts[part_index]
    notes = part.flatten().notes
    pitch_sequence = [n.pitch.pitchClass for n in notes]

    # Análise de tonalidade
    if environment == 'tonal':
        key_sig = score.analyze('key')
        tonic_pc = key_sig.tonic.pitchClass
        mode = key_sig.mode

        # Inversão tonal em torno da tónica
        inverted_sequence = [(2 * tonic_pc - p) % 12 for p in pitch_sequence]
    else:
        tonic_pc = 0
        mode = None
        # Inversão cromática
        inverted_sequence = [(12 - p) % 12 for p in pitch_sequence]

    # Gerar transformações
    retrograde_sequence = pitch_sequence[::-1]
    ri_sequence = inverted_sequence[::-1]

    # Encontrar ocorrências
    retrograde_occurrences = find_pattern_occurrences(score, retrograde_sequence, part_index)
    inversion_occurrences = find_pattern_occurrences(score, inverted_sequence, part_index)
    ri_occurrences = find_pattern_occurrences(score, ri_sequence, part_index)

    # Calcular cobertura
    retrograde_score = calculate_symmetry_coverage(notes,
                                                   [(o[2], o[3]) for o in retrograde_occurrences])
    inversion_score = calculate_symmetry_coverage(notes,
                                                  [(o[2], o[3]) for o in inversion_occurrences])
    ri_score = calculate_symmetry_coverage(notes,
                                          [(o[2], o[3]) for o in ri_occurrences])

    # Extrair compassos únicos
    retrograde_measures = sorted(set(m for start_m, end_m, _, _ in retrograde_occurrences
                                     for m in range(start_m, end_m + 1)))
    inversion_measures = sorted(set(m for start_m, end_m, _, _ in inversion_occurrences
                                   for m in range(start_m, end_m + 1)))
    ri_measures = sorted(set(m for start_m, end_m, _, _ in ri_occurrences
                            for m in range(start_m, end_m + 1)))

    return {
        'retrograde_score': round(retrograde_score, 2),
        'inversion_score': round(inversion_score, 2),
        'retrograde_inversion_score': round(ri_score, 2),
        'retrograde_measures': retrograde_measures,
        'inversion_measures': inversion_measures,
        'ri_measures': ri_measures,
        'retrograde_occurrences': [(s, e) for s, e, _, _ in retrograde_occurrences],
        'inversion_occurrences': [(s, e) for s, e, _, _ in inversion_occurrences],
        'ri_occurrences': [(s, e) for s, e, _, _ in ri_occurrences],
        'method': environment,
        'tonality': f"{key_sig.tonic.name} {mode}" if environment == 'tonal' else None,
        'tonic_pitch_class': tonic_pc,
        'mode': mode
    }
```

---

### **FASE 2: Melhorar Análise com music21.search**

#### 2.1. Usar `music21.search.serial` para Padrões Complexos

```python
from music21.search import serial as serialSearch

def find_serial_transformations(score, part_index=0):
    """
    Usa music21.search.serial para encontrar transformações seriais.
    """
    part = score.parts[part_index]
    notes = list(part.flatten().notes)

    # Criar ToneRow a partir da sequência
    pitch_classes = [n.pitch.pitchClass for n in notes[:12]]  # Primeira série
    row = serial.pcToToneRow(pitch_classes)

    # Gerar transformações
    transformations = {
        'P0': row,
        'R0': row.zeroCenteredTransformation('R', 0),
        'I0': row.zeroCenteredTransformation('I', 0),
        'RI0': row.zeroCenteredTransformation('RI', 0)
    }

    # Procurar cada transformação na partitura
    results = {}
    for name, transformed_row in transformations.items():
        searcher = serialSearch.RowScoreSearcher(score)
        matches = searcher.search(transformed_row, part_index)
        results[name] = matches

    return results
```

#### 2.2. Análise de Contorno Melódico

```python
from music21.search import serial as serialSearch

def analyze_melodic_contour(score, part_index=0):
    """
    Analisa contorno melódico e suas transformações.
    """
    part = score.parts[part_index]
    notes = list(part.flatten().notes)

    # Extrair contorno (sequência de subidas/descidas)
    contour = []
    for i in range(len(notes) - 1):
        interval_obj = interval.Interval(notes[i].pitch, notes[i+1].pitch)
        if interval_obj.semitones > 0:
            contour.append(1)  # Ascending
        elif interval_obj.semitones < 0:
            contour.append(-1)  # Descending
        else:
            contour.append(0)  # Repeated

    # Contorno retrógrado
    retrograde_contour = contour[::-1]

    # Contorno invertido (inverter direções)
    inversion_contour = [-c for c in contour]

    # Procurar ocorrências de cada contorno
    # (implementar busca de padrão para contornos)

    return {
        'original_contour': contour,
        'retrograde_contour': retrograde_contour,
        'inversion_contour': inversion_contour
    }
```

---

### **FASE 3: Interface - Seleção de Tipo de Simetria no Viewer**

#### 3.1. Adicionar Seletor de Tipo no HTML
**Ficheiro**: `static/script.js`
**Localização**: Função `renderSymmetryAdvanced()` - linha ~3990

**Modificação**:
```javascript
// Dentro do HTML do viewer, adicionar seletor
<div class="control-group">
    <label>Tipo de Simetria:</label>
    <select id="symmetry-type-selector" class="symmetry-selector">
        ${sym.retrograde_measures?.length > 0 ?
            `<option value="retrograde">Retrógrado (${sym.retrograde_measures.length} compassos)</option>` : ''}
        ${sym.inversion_measures?.length > 0 ?
            `<option value="inversion">Inversão (${sym.inversion_measures.length} compassos)</option>` : ''}
        ${sym.ri_measures?.length > 0 ?
            `<option value="ri">Retrógrado-Inversão (${sym.ri_measures.length} compassos)</option>` : ''}
    </select>
</div>
```

#### 3.2. Event Listener para Trocar Tipo

```javascript
const symmetrySelector = document.getElementById('symmetry-type-selector');
if (symmetrySelector) {
    symmetrySelector.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        let newMeasures = [];
        let newAnalysisType = '';

        switch(selectedType) {
            case 'retrograde':
                newMeasures = sym.retrograde_measures;
                newAnalysisType = 'Retrógrado';
                break;
            case 'inversion':
                newMeasures = sym.inversion_measures;
                newAnalysisType = 'Inversão';
                break;
            case 'ri':
                newMeasures = sym.ri_measures;
                newAnalysisType = 'Retrógrado-Inversão';
                break;
        }

        // Recriar viewer com novo tipo
        const viewer = new StaffRenderingViewer(
            newAnalysisType,
            newMeasures,
            currentSymmetryPartIndex
        );
    });
}
```

---

### **FASE 4: Melhorar Apresentação de Resultados**

#### 4.1. Mostrar Ocorrências Individuais
**Problema atual**: Apenas mostra lista de todos os compassos
**Melhoria**: Mostrar cada ocorrência separadamente

**Novo formato de resposta**:
```json
{
    "retrograde_score": 45.2,
    "retrograde_occurrences": [
        {"start_measure": 5, "end_measure": 12, "length": 8},
        {"start_measure": 23, "end_measure": 30, "length": 8},
        {"start_measure": 45, "end_measure": 52, "length": 8}
    ]
}
```

**Apresentação no frontend**:
```
Retrograde Similarity: 45.2%
├─ Ocorrência 1: Compassos 5-12 (8 compassos)
├─ Ocorrência 2: Compassos 23-30 (8 compassos)
└─ Ocorrência 3: Compassos 45-52 (8 compassos)
```

#### 4.2. Renderizar Cada Ocorrência Separadamente no Viewer

Adicionar navegação entre ocorrências:
```
[← Anterior] Ocorrência 1 de 3 [Seguinte →]
Compassos 5-12
```

---

## Resumo das Alterações

### Ficheiros a Modificar

1. **`app.py`**:
   - Substituir `analyze_symmetry_tonal()` por `analyze_symmetry_improved()`
   - Substituir `analyze_symmetry_music21()` com uso correto de `music21.search.serial`
   - Adicionar funções auxiliares: `find_pattern_occurrences()`, `calculate_symmetry_coverage()`
   - Modificar endpoint `/api/advanced-analysis` para retornar ocorrências detalhadas

2. **`static/script.js`**:
   - Modificar `renderSymmetryAdvanced()` para adicionar seletor de tipo
   - Adicionar event listener para trocar entre tipos de simetria
   - Modificar apresentação para mostrar ocorrências individuais
   - Adicionar navegação entre ocorrências no viewer

3. **`static/style.css`**:
   - Adicionar estilos para `.symmetry-selector`
   - Adicionar estilos para navegação de ocorrências

### Benefícios Esperados

1. ✅ **Análise Correta**: Percentagens refletem cobertura real de padrões simétricos
2. ✅ **Compassos Corretos**: Renderização mostra exatamente onde os padrões ocorrem
3. ✅ **Flexibilidade**: Utilizador pode escolher qual tipo de simetria visualizar
4. ✅ **Detalhamento**: Mostra cada ocorrência separadamente
5. ✅ **Uso Correto de music21**: Aproveita capacidades avançadas da biblioteca

### Prioridade de Implementação

**CRÍTICO** (Fase 1):
- Novo algoritmo de detecção de subsequências
- Novo cálculo de similaridade (coverage)

**IMPORTANTE** (Fase 3):
- Seletor de tipo de simetria no viewer
- Permitir visualizar I e RI, não apenas R

**DESEJÁVEL** (Fases 2 e 4):
- Análise com music21.search.serial
- Navegação entre ocorrências
- Análise de contorno melódico
