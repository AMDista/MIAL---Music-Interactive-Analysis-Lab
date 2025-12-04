# Plano de Implementação: Análise Tonal vs Serial

## 📋 Objetivo Geral

Implementar um sistema automático que detecte o ambiente de análise (Tonal ou Serial) e adapte toda a análise de simetria (retrograde, inversion, retrograde-inversion) de acordo com o ambiente escolhido.

---

## 🎯 Requisitos Funcionais

### 1. Detecção Automática de Tonalidade
- **Quando**: Na submissão do ficheiro de partitura
- **Como**: Analisar a assinatura de tonalidade (`keySignature`) da peça
- **Resultado**: Definir ambiente padrão como **TONAL**
- **Ação**: Se tonalidade detectada → Usar análise tonal; Se nenhuma/ambígua → Sugerir tonal como padrão

### 2. Checkbox de Seleção de Ambiente Serial
- **Localização**: Página inicial de análise (onde se escolhem parâmetros)
- **Label**: "Análise em Ambiente Serial (12-tone/Dodecafónico)"
- **Default**: Desmarcado (❌) → Ambiente **Tonal**
- **Quando marcado**: ✅ → Ambiente **Serial**
- **Posicionamento**: Próximo aos restantes parâmetros de análise

### 3. Comportamento Baseado na Seleção

#### ✅ Modo TONAL (Checkbox desmarcado - DEFAULT)
- Tonalidade é o centro de simetria
- Todas as transformações ocorrem em torno da tónica
- Funções afetadas:
  - `analyze_symmetry_tonal()` [a criar]
  - Retrograde: Reverso simples
  - Inversion: Com eixo na tónica → `inverted = (2 * tonic - pitch) % 12`
  - Retrograde-Inversion: Combinação das duas
  
#### ✅ Modo SERIAL (Checkbox marcado)
- Sem tonalidade central (todos os 12 tons iguais)
- Usa técnica de 12-tone (dodecafónica)
- Funções afetadas:
  - `analyze_symmetry_music21()` [já existe]
  - Retrograde: Via `music21.serial`
  - Inversion: Via `music21.serial`
  - Retrograde-Inversion: Via `music21.serial`

---

## 🔧 Implementação Necessária

### FASE 1: Frontend (HTML/JavaScript)

#### 1.1 Página Inicial de Análise (`templates/index.html`)

**Adicionar Checkbox**:
```html
<!-- Próximo aos parâmetros de análise existentes -->
<label for="serialAnalysis">
  <input type="checkbox" id="serialAnalysis" name="serialAnalysis">
  Análise em Ambiente Serial (12-tone/Dodecafónico)
</label>
```

**JavaScript Handler**:
```javascript
// Capturar estado do checkbox
document.getElementById('serialAnalysis').addEventListener('change', function() {
  const isSerial = this.checked;
  console.log('Ambiente Serial:', isSerial);
  // Armazenar em variável global ou localStorage
  window.analysisEnvironment = isSerial ? 'serial' : 'tonal';
});
```

**Envio do Parâmetro**:
- Quando submeter análise de simetria, incluir no JSON:
  ```json
  {
    "analysis_type": "symmetry",
    "file_path": "...",
    "part_index": 0,
    "environment": "tonal"  // ou "serial"
  }
  ```

#### 1.2 Detecção Automática de Tonalidade (JavaScript)

**Quando**: Após upload de ficheiro bem-sucedido
```javascript
// Fazer análise prévia (GET /api/detect-tonality)
fetch('/api/detect-tonality', {
  method: 'POST',
  body: JSON.stringify({ file_path: uploadedFilePath })
})
.then(response => response.json())
.then(data => {
  if (data.tonality_detected) {
    // Mostrar mensagem: "Tonalidade detectada: C Maior"
    console.log('Tonalidade:', data.tonality);
    // Definir environment como 'tonal' (checkbox desmarcado)
    document.getElementById('serialAnalysis').checked = false;
  } else {
    console.log('Nenhuma tonalidade clara detectada');
  }
});
```

---

### FASE 2: Backend (app.py)

#### 2.1 Novo Endpoint: Detecção de Tonalidade

**Localização**: Adicionar antes das funções de análise (por volta da linha 750)

```python
@app.route('/api/detect-tonality', methods=['POST'])
def detect_tonality():
    """Detect the tonality of a score"""
    data = request.json
    file_path = data.get('file_path')
    
    try:
        score = converter.parse(file_path)
        key_sig = score.analyze('key')
        
        if key_sig:
            return jsonify({
                'tonality_detected': True,
                'tonality': str(key_sig.tonic),
                'mode': key_sig.mode,  # 'major' ou 'minor'
                'tonic_pitch_class': key_sig.tonic.pitchClass
            })
        else:
            return jsonify({
                'tonality_detected': False,
                'message': 'Nenhuma tonalidade clara detectada'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 400
```

#### 2.2 Modificação do Endpoint de Análise Avançada

**Localização**: Linha 771 (rota `/api/advanced-analysis`)

**Modificação do Handler**:
```python
@app.route('/api/advanced-analysis', methods=['POST'])
def advanced_analysis():
    """Advanced analysis with environment awareness"""
    data = request.json
    analysis_type = data.get('analysis_type')
    environment = data.get('environment', 'tonal')  # Default: tonal
    
    # ... código existente ...
    
    if analysis_type == 'symmetry':
        if environment == 'serial':
            # Usar análise serial
            result = analyze_symmetry_music21(score, part_index)
        else:
            # Usar análise tonal (a criar)
            result = analyze_symmetry_tonal(score, part_index)
    
    return jsonify(result)
```

#### 2.3 Nova Função: `analyze_symmetry_tonal()`

**Localização**: Linha 1193 (antes de `analyze_symmetry_advanced`)

**Estrutura Geral**:
```python
def analyze_symmetry_tonal(score, part_index=0):
    """
    Analyze musical symmetry patterns in TONAL environment
    
    In tonal music, inversions and transformations are calculated
    with respect to the tonic (key center) of the piece.
    
    Transformations:
    - Retrograde: Reverse of pitch-class sequence
    - Inversion: Mirror around the tonic pitch
    - Retrograde-Inversion: Retrograde + Inversion
    """
    
    # 1. OBTER TONALIDADE
    key_sig = score.analyze('key')
    if key_sig:
        tonic_pc = key_sig.tonic.pitchClass
        tonality_name = str(key_sig.tonic)
        mode = key_sig.mode
    else:
        tonic_pc = 0  # Default: C
        tonality_name = "C"
        mode = "unknown"
    
    # 2. EXTRAIR NOTAS
    target_part = score.parts[part_index]
    notes_list = [n for n in target_part.recurse().notes if isinstance(n, note.Note)]
    pitch_sequence = [n.pitch.pitchClass for n in notes_list]
    
    # 3. CÁLCULO DE RETROGRADO
    # Fórmula: reversed_sequence
    reversed_sequence = pitch_sequence[::-1]
    retrograde_matches = sum(1 for i in range(len(pitch_sequence)) 
                            if pitch_sequence[i] == reversed_sequence[i])
    retrograde_score = (retrograde_matches / len(pitch_sequence)) * 100 if pitch_sequence else 0
    retrograde_measures = [notes_list[i].measureNumber for i in range(len(pitch_sequence))
                          if notes_list[i].measureNumber and 
                          pitch_sequence[i] == reversed_sequence[i]]
    
    # 4. CÁLCULO DE INVERSÃO (COM EIXO NA TÓNICA)
    # Fórmula: inverted = (2 * tonic - pitch) % 12
    inverted_sequence = [(2 * tonic_pc - p) % 12 for p in pitch_sequence]
    inversion_matches = sum(1 for i in range(len(pitch_sequence))
                           if pitch_sequence[i] == inverted_sequence[i])
    inversion_score = (inversion_matches / len(pitch_sequence)) * 100 if pitch_sequence else 0
    inversion_measures = [notes_list[i].measureNumber for i in range(len(pitch_sequence))
                         if notes_list[i].measureNumber and
                         pitch_sequence[i] == inverted_sequence[i]]
    
    # 5. CÁLCULO DE RETROGRADE-INVERSION
    # Aplicar inversão primeiro, depois retrograde
    ri_sequence = [(2 * tonic_pc - p) % 12 for p in pitch_sequence[::-1]]
    ri_matches = sum(1 for i in range(len(pitch_sequence))
                    if pitch_sequence[i] == ri_sequence[i])
    ri_score = (ri_matches / len(pitch_sequence)) * 100 if pitch_sequence else 0
    ri_measures = [notes_list[i].measureNumber for i in range(len(pitch_sequence))
                  if notes_list[i].measureNumber and
                  pitch_sequence[i] == ri_sequence[i]]
    
    # 6. RETORNAR RESULTADO
    return {
        'symmetry': {
            'retrograde_score': round(retrograde_score, 2),
            'inversion_score': round(inversion_score, 2),
            'retrograde_inversion_score': round(ri_score, 2),
            'retrograde_measures': list(set(retrograde_measures)),
            'inversion_measures': list(set(inversion_measures)),
            'ri_measures': list(set(ri_measures)),
            'method': 'tonal',
            'tonality': tonality_name,
            'tonic_pitch_class': tonic_pc,
            'mode': mode
        },
        'part_name': target_part.partName or f'Part {part_index}',
        'summary': f'Análise Tonal em {tonality_name} {mode.capitalize()}: R={retrograde_score:.1f}%, I={inversion_score:.1f}%, RI={ri_score:.1f}%'
    }
```

#### 2.4 Função Existente: `analyze_symmetry_music21()`

**Localização**: Linha 1253 (sem alterações)
- Renomear se necessário para clareza: `analyze_symmetry_serial()`
- Confirmar que retorna os 3 scores: R, I, RI

---

## 📊 Diferenças Implementadas

### Modo TONAL vs SERIAL

| Parâmetro | Tonal | Serial |
|-----------|-------|--------|
| **Retrograde** | `sequence[::-1]` | `music21.serial.zeroCenteredTransformation('R', 0)` |
| **Inversion** | `(2*tonic - p) % 12` | `music21.serial.zeroCenteredTransformation('I', 0)` |
| **Retrograde-Inversion** | `(2*tonic - p) % 12 para sequence[::-1]` | `music21.serial.zeroCenteredTransformation('RI', 0)` |
| **Eixo de Simetria** | Tónica da peça | Nenhum (12 tons iguais) |
| **Aplicável a** | Toda a música ocidental clássica | Música dodecafónica (Schoenberg, Berg) |
| **Detecção Automática** | Sim (via `score.analyze('key')`) | Não (requer input do utilizador) |
| **Resultado** | Inclui `tonality`, `tonic_pitch_class`, `mode` | Não inclui informação tonal |

---

## 🔄 Fluxo de Execução Esperado

### Cenário 1: Utilizador Faz Upload

```
1. Utilizador faz upload de ficheiro
   ↓
2. Frontend recebe sucesso de upload
   ↓
3. Frontend chama GET /api/detect-tonality
   ↓
4. Backend detecta: "C Maior (tonic_pc=0)"
   ↓
5. Frontend mostra mensagem: "Tonalidade detectada: C Maior"
   ↓
6. Checkbox "Análise Serial" fica desmarcado (DEFAULT)
   ↓
7. Utilizador clica "Advanced Analysis"
```

### Cenário 2a: Utilizador NÃO Marca Checkbox (TONAL)

```
1. Checkbox desmarcado (DEFAULT)
   ↓
2. Frontend envia: { analysis_type: 'symmetry', environment: 'tonal' }
   ↓
3. Backend chama analyze_symmetry_tonal()
   ↓
4. Calcula com eixo na tónica (C Maior → tonic_pc = 0)
   ↓
5. Inversion = (2*0 - p) % 12 = (-p) % 12
   ↓
6. Retorna resultado com 'tonality': 'C', 'method': 'tonal'
```

### Cenário 2b: Utilizador MARCA Checkbox (SERIAL)

```
1. Checkbox marcado
   ↓
2. Frontend envia: { analysis_type: 'symmetry', environment: 'serial' }
   ↓
3. Backend chama analyze_symmetry_music21()
   ↓
4. Converte para ToneRow via music21.serial
   ↓
5. Aplica transformações R, I, RI via zeroCenteredTransformation()
   ↓
6. Retorna resultado com 'method': 'music21'
```

---

## 📁 Ficheiros a Modificar

| Ficheiro | Linha | Ação | Descrição |
|----------|-------|------|-----------|
| `templates/index.html` | ~450-500 | ADD | Adicionar checkbox de análise serial |
| `templates/index.html` | ~1000+ | ADD | Adicionar JavaScript para captura e envio do parâmetro `environment` |
| `app.py` | ~750 | ADD | Novo endpoint `/api/detect-tonality` |
| `app.py` | ~771 | MODIFY | Modificar rota `/api/advanced-analysis` para aceitar `environment` |
| `app.py` | ~1193 | ADD | Nova função `analyze_symmetry_tonal()` |
| `app.py` | ~1253 | RENAME (opcional) | Renomear `analyze_symmetry_advanced()` para `analyze_symmetry_music21()` (se ainda não feito) |

---

## ⚙️ Considerações Técnicas

### 1. Backward Compatibility
- Endpoint `/api/advanced-analysis` deve aceitar análises sem `environment` (default: 'tonal')
- Assim, código JavaScript antigo continua a funcionar

### 2. Armazenamento do Ambiente
- Variável global JavaScript: `window.analysisEnvironment`
- OU localStorage: `localStorage.setItem('analysisEnv', isSerial ? 'serial' : 'tonal')`
- Recomendação: localStorage para persistência entre abas

### 3. Validação
- Backend deve validar: `environment in ['tonal', 'serial']`
- Se inválido, retornar erro ou usar default 'tonal'

### 4. UI/UX Sugestões
- Mostrar badge/label: "🎼 Modo: Tonal" ou "🎵 Modo: Serial (12-tone)"
- Tooltip no checkbox explicando a diferença
- Desabilitar checkbox se tonalidade não for detectada? (Ou manter sempre habilitado?)

### 5. Testes Recomendados
- Upload de peça tonal (Beethoven) → Deve detectar tonalidade
- Upload de peça serial (Schoenberg) → Tonalidade pode ser ambígua
- Análise tonal com checkbox desmarcado → Resultados com eixo na tónica
- Análise serial com checkbox marcado → Resultados sem eixo tonal

---

## 📝 Próximos Passos

1. **Implementar Frontend**: Adicionar checkbox e JavaScript
2. **Implementar Endpoint de Detecção**: `/api/detect-tonality`
3. **Implementar Função Tonal**: `analyze_symmetry_tonal()`
4. **Modificar Rota de Análise**: Aceitar parâmetro `environment`
5. **Testar**: Com peças tonais e seriais
6. **Documentar**: Atualizar README com nova funcionalidade

---

## 🎯 Resultado Final Esperado

Um sistema completo que:
- ✅ Detecta automaticamente a tonalidade após upload
- ✅ Oferece checkbox para escolha entre análise tonal ou serial
- ✅ Adapta cálculos de simetria ao ambiente escolhido
- ✅ Mantém compatibilidade com código existente
- ✅ Fornece feedback claro ao utilizador sobre qual ambiente está ativo
