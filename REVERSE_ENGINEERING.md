# MusicXML Score Analyzer - Arquitetura & Conceção

## Índice
1. [Filosofia do Projeto](#filosofia-do-projeto)
2. [Fluxo de Dados](#fluxo-de-dados)
3. [Módulos de Análise](#módulos-de-análise)
4. [Análise Comparativa e Padrões](#análise-comparativa-e-padrões)
5. [Arquitetura Moderna](#arquitetura-moderna)
6. [Integração de IA](#integração-de-ia)

---

## Filosofia do Projeto

### O Desafio
O projeto moderniza a análise musical profissional com:
- **Automatização completa** de análises tradicionais (harmónica, melódica, rítmica)
- **Acessibilidade** através de interface web responsiva
- **Integração de IA** para análise contextual profunda
- **Análise comparativa** entre múltiplas obras
- **Detecção de padrões**: temas recorrentes, padrões rítmicos e melódicos

### Evolução da Arquitetura
Este projeto é uma **evolução ágil** da versão original:

| Aspeto | Versão Original | Versão Atual |
|--------|-----------------|-------------|
| **Backend** | Laravel 4.2 + SQLite | Python/Flask + Em memória |
| **Processamento** | XML parsing manual (PHP) | Music21 (abstrações musicais) |
| **Interface** | HTML básico | Web moderna com colapsáveis |
| **IA** | Não integrada | Integração nativa (OpenAI, LocalAI, Ollama) |
| **Análise** | Busca de padrões estrita | Análise multidimensional + Comparativa |
| **Dados** | Persistência em BD | Cache de sessão |
| **Escalabilidade** | Limitada pela BD | Processamento escalável em tempo real |

### Princípios de Design
1. **Abstração Musical**: Leveraging Music21 library para representações de alto nível
2. **Sem Infraestrutura Pesada**: Processamento em tempo real, sem banco de dados
3. **Análise Inteligente**: Complementação com IA para insights contextuais
4. **Interface Moderna**: Dashboard interativo com collapsible sections
5. **Interoperabilidade**: Suporte para múltiplas IA (OpenAI, LocalAI, Ollama)

---

## Fluxo de Dados

### Pipeline de Processamento

```
┌─────────────────────────────────────────────────────────────────┐
│                 UTILIZADOR ENVIA FICHEIRO                       │
│                      (Upload MusicXML)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Validação & Normalização                      │
│  • Verifica formato (.xml, .musicxml)                           │
│  • Valida estrutura XML                                         │
│  • Normalizações de encoding (UTF-8)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Carregamento com Music21 Library                   │
│  • Parser nativo MusicXML (robusto, versão 4.0+)               │
│  • Análise automática de estrutura                              │
│  • Normalização de notação (enarmónicas, oitavas)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           EXTRAÇÃO DE METADADOS & ANÁLISE INICIAL               │
│  • Título, compositor, arranjador                               │
│  • Armadura de clave (key), compasso (meter)                    │
│  • Instrumentação completa                                      │
│  • Claves (treble, bass, alto, etc.)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
         ┌──────────▼──────────┐   ┌──▼────────────────┐
         │  ANÁLISES PARALELAS │   │  CACHE DE SESSÃO  │
         │                     │   │  (Em memória)     │
         │ • Harmónica         │   │                   │
         │ • Melódica          │   │ • Metadados       │
         │ • Rítmica           │   │ • Estatísticas    │
         │ • Comparativa       │   │ • Análises        │
         └──────────┬──────────┘   └───────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DASHBOARD INTERATIVO                           │
│          (Collapsible sections com AI Panel integrado)         │
└─────────────────────────────────────────────────────────────────┘
```

### Conceitos Centrais do Fluxo

#### 1. **Music21 Score Object**
```python
from music21 import converter

score = converter.parse('ficheiro.xml')

# Score é uma árvore hierárquica:
# Score
#  ├── Metadata (título, compositor, etc.)
#  ├── Part 1 (Violino I)
#  │   ├── Measure 1
#  │   │   ├── Note (C, octave 4, duration 0.25)
#  │   │   ├── Note (E, octave 4, duration 0.25)
#  │   │   └── Rest
#  │   ├── Measure 2
#  │   └── ...
#  ├── Part 2 (Violino II)
#  └── ...
```

#### 2. **Processamento por Camadas**
- **Nível 1 (Score)**: Ficheiro completo
- **Nível 2 (Parts)**: Instrumentos individuais
- **Nível 3 (Measures)**: Compassos
- **Nível 4 (Notes/Chords/Rests)**: Elementos musicais

#### 3. **Conversão para Estruturas Analisáveis**
```python
# De representação XML complexa:
# <note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration>

# Para objeto Music21 simples:
note = score.parts[0].measure(1)[0]
pitch = note.pitch.midi  # 49 (C#4 em MIDI)
duration = note.quarterLength  # 1.0 (em quarter notes)
```

---

## Módulos de Análise

### 1. Análise Geral (General Information)

**Extração de Metadados**:
```python
metadata = score.metadata

# Compositor
composer = metadata.composer

# Título
title = metadata.title

# Instrumentação
instruments = [part.instrument.partName for part in score.parts]

# Armadura e compasso
key_signature = score.parts[0].keySignature
time_signature = score.parts[0].timeSignature
```

**Dados Calculados**:
- Número de compassos
- Densidade de notas (notas por compasso)
- Range de frequências (nota mais baixa / mais alta)

### 2. Análise Melódica

**Características Extraídas**:

1. **Intervalos Mais Comuns**
```python
from music21 import interval

melodic_intervals = []
part = score.parts[0]

for i in range(len(part.notes) - 1):
    curr_note = part.notes[i]
    next_note = part.notes[i + 1]
    
    if curr_note.isNote and next_note.isNote:
        ivl = interval.Interval(curr_note, next_note)
        melodic_intervals.append(ivl.semitones)

# Contar frequências
from collections import Counter
interval_frequency = Counter(melodic_intervals)
```

2. **Direção Melódica** (Ascending/Descending)
```python
ascending = sum(1 for i in melodic_intervals if i > 0)
descending = sum(1 for i in melodic_intervals if i < 0)
```

3. **Análise Rítmica**
```python
rhythmic_patterns = []
for note in part.notes:
    if note.isNote:
        duration_type = note.duration.type  # 'quarter', 'eighth', etc.
        rhythmic_patterns.append(duration_type)
```

4. **Densidade de Notas**
```python
# Notas por compasso
total_notes = sum(1 for n in part.notes if n.isNote)
total_measures = len(part.measures)
density = total_notes / total_measures
```

### 3. Análise Harmónica

**Processamento Harmónico**:

```python
from music21 import chord

# Para cada compasso, extrair acordes/notas simultâneas
for measure in score.measures:
    vertical_elements = measure.getElementsByClass(['Chord', 'Note'])
    
    # Análise de vozes/polifonia
    # Redução harmónica (identificar acordes principais)
    
    # Funções tonais (roman numerals)
    for element in vertical_elements:
        if isinstance(element, chord.Chord):
            # Identificar tipo de acorde (major, minor, dominant, etc.)
            root = element.root()
            quality = element.quality
```

**Redução Harmónica**:
- Extração de notas mais longas (acordes)
- Mapeamento de acordes para símbolos (I, IV, V, etc.)
- Análise de progressões harmónicas

### 4. Análise Comparativa (Novo)

**Objetivo**: Comparar múltiplas partes/obras

```python
# Comparação entre instrumentos
instruments_profiles = {}

for part in score.parts:
    instrument_name = part.instrument.partName
    
    instruments_profiles[instrument_name] = {
        'total_notes': len(part.notes),
        'pitch_range': (min_pitch, max_pitch),
        'average_duration': avg_duration,
        'most_common_intervals': top_intervals,
        'rhythmic_density': density,
        'melodic_contour': contour_analysis
    }

# Comparação de padrões entre pares
for instr1 in score.parts:
    for instr2 in score.parts:
        if instr1 != instr2:
            # Análise de sobreposição melódica
            # Análise de complementaridade rítmica
            # Dialogos temáticos
```

### 5. Detecção de Padrões Recorrentes

**Busca de Temas Repetidos**:

```python
# Extrair frases melódicas (subsequências de 4-8 notas)
from music21 import stream

def extract_melodic_phrases(part, phrase_length=4):
    phrases = []
    notes_list = [n for n in part.notes if n.isNote]
    
    for i in range(len(notes_list) - phrase_length):
        phrase_intervals = []
        for j in range(phrase_length):
            ivl = interval.Interval(notes_list[j], notes_list[j+1])
            phrase_intervals.append(ivl.semitones)
        
        phrases.append(tuple(phrase_intervals))
    
    return phrases

phrases = extract_melodic_phrases(score.parts[0])

# Contar ocorrências
phrase_frequency = Counter(phrases)
recurring_themes = phrase_frequency.most_common(10)
```

**Padrões Rítmicos**:

```python
def extract_rhythmic_patterns(part, pattern_length=4):
    patterns = []
    notes_list = part.notes
    
    for i in range(len(notes_list) - pattern_length):
        pattern = tuple(notes_list[i+j].duration.quarterLength 
                       for j in range(pattern_length))
        patterns.append(pattern)
    
    return patterns
```

---

## Análise Comparativa e Padrões

### Comparação Multidimensional

```python
def comparative_analysis(score):
    """
    Análise comparativa entre partes/instrumentos
    """
    
    comparison_matrix = {
        'instruments': [],
        'melodic_similarity': {},
        'rhythmic_complementarity': {},
        'pitch_range_distribution': {},
        'temporal_density': {}
    }
    
    parts = score.parts
    
    # 1. Similaridade Melódica
    for i, part1 in enumerate(parts):
        for j, part2 in enumerate(parts[i+1:]):
            similarity = calculate_melodic_similarity(part1, part2)
            comparison_matrix['melodic_similarity'][f"{part1.id}-{part2.id}"] = similarity
    
    # 2. Complementaridade Rítmica
    for i, part1 in enumerate(parts):
        for j, part2 in enumerate(parts[i+1:]):
            complementarity = analyze_rhythmic_overlap(part1, part2)
            comparison_matrix['rhythmic_complementarity'][f"{part1.id}-{part2.id}"] = complementarity
    
    # 3. Distribuição de Pitch
    for part in parts:
        distribution = analyze_pitch_distribution(part)
        comparison_matrix['pitch_range_distribution'][part.id] = distribution
    
    return comparison_matrix
```

### Temas Recorrentes (Cross-Work Analysis)

```python
# Quando múltiplos ficheiros são carregados:
def find_recurring_themes(score_list):
    """
    Encontra temas melódicos que se repetem entre obras
    """
    
    all_phrases = {}
    
    for score in score_list:
        for part in score.parts:
            phrases = extract_melodic_phrases(part)
            
            for phrase in phrases:
                if phrase not in all_phrases:
                    all_phrases[phrase] = []
                all_phrases[phrase].append({
                    'score': score.metadata.title,
                    'instrument': part.instrument.partName
                })
    
    # Temas que aparecem em múltiplas obras
    recurring = {phrase: locations 
                 for phrase, locations in all_phrases.items() 
                 if len(locations) > 1}
    
    return recurring
```

---

## Arquitetura Moderna

### Stack Tecnológico

```
┌────────────────────────────────────────────────────┐
│        FRONTEND (JavaScript/HTML/CSS)              │
│                                                    │
│  • Collapsible Sections: UI moderna, interativa    │
│  • Real-time Markdown rendering: AI responses      │
│  • Theme Toggle: Dark/Light mode                   │
│  • Responsive Design: Desktop/Tablet/Mobile        │
└─────────────────┬────────────────────────────────┘
                  │ (AJAX/REST API)
                  │
┌─────────────────▼────────────────────────────────┐
│      BACKEND (Python/Flask)                      │
│                                                  │
│  app.py (Main server)                           │
│  ├── Routes: /upload, /analyze, /ai-panel       │
│  ├── Middleware: Authentication, Validation     │
│  └── Error Handling: Graceful degradation       │
│                                                  │
└─────────────────┬────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌────▼──────┐  ┌───▼────┐
│ Music21│  │ AI Client │  │ Config │
│ Parser │  │  Manager  │  │ System │
└────────┘  └───────────┘  └────────┘
    │             │
    │        ┌────▼──────────────┐
    │        │  Remote/Local AI  │
    │        │                   │
    │        │ • OpenAI (GPT)    │
    │        │ • LM Studio       │
    │        │ • LocalAI         │
    │        │ • Ollama          │
    │        └───────────────────┘
    │
    └─→ Cache (Em Memória)
       └─ Sessão do utilizador
```

### Fluxo de Requisição (Request Flow)

```
1. Utilizador seleciona ficheiro MusicXML
   └→ Upload via drag-drop ou input

2. POST /upload
   └→ Backend valida ficheiro
   └→ Carrega com Music21
   └→ Armazena em cache de sessão

3. Análises paralelas iniciadas
   ├→ GET /analyze/general
   ├→ GET /analyze/melodic
   ├→ GET /analyze/harmonic
   └→ GET /analyze/comparative

4. Resultados populam Dashboard
   ├→ Collapsible sections renderizadas
   ├→ Cada seção tem AI Panel
   └→ Prompt pré-preenchido com contexto

5. Utilizador clica em AI Panel
   └→ POST /ai-panel/{section_type}
   └→ Envia contexto (dados + section title)
   └→ Backend chama AI service
   └→ Resposta em Markdown
   └→ Frontend renderiza em tempo real
```

### Config.json (Novo Schema)

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 8080,
    "debug": false
  },
  "theme": {
    "mode": "dark",
    "accent": "blue"
  },
  "ai": {
    "provider": "openai",
    "openai": {
      "api_key": "sk-...",
      "model": "gpt-3.5-turbo",
      "base_url": "https://api.openai.com/v1"
    },
    "local": {
      "enabled": true,
      "provider": "lm_studio",
      "base_url": "http://localhost:1234/v1",
      "model": "mistral-7b"
    }
  },
  "analysis": {
    "melodic": {
      "phrase_length": 4,
      "interval_threshold": 2
    },
    "comparative": {
      "enabled": true,
      "cross_work_analysis": true
    },
    "prompts": {
      "piano_roll": "Analyze the melodic...",
      "comparison": "Compare these instruments...",
      "melodic_quick": "Quick melodic analysis...",
      "general_panel": "Provide concluding remarks..."
    }
  }
}
```

---

## Integração de IA

### Sistema de Prompts Contextual

**Fluxo de Envio para IA**:

```python
def generate_ai_prompt(section_type, analyzed_data, instrument_name=None):
    """
    Cria prompt contextual baseado no tipo de análise
    """
    
    config = load_config()
    base_prompt = config['analysis']['prompts'][section_type]
    
    # Substituir placeholders
    context = {
        '{instrumentName}': instrument_name or 'All instruments',
        '{totalNotes}': analyzed_data.get('total_notes'),
        '{pitchRangeMin}': analyzed_data.get('min_pitch'),
        '{pitchRangeMax}': analyzed_data.get('max_pitch'),
        '{topIntervals}': format_intervals(analyzed_data.get('intervals')),
        '{rhythmicPatterns}': format_patterns(analyzed_data.get('patterns')),
        '{startMeasure}': analyzed_data.get('start_measure'),
        '{endMeasure}': analyzed_data.get('end_measure'),
        '{instrumentsData}': format_comparison(analyzed_data.get('comparison'))
    }
    
    final_prompt = base_prompt
    for placeholder, value in context.items():
        final_prompt = final_prompt.replace(placeholder, str(value))
    
    return final_prompt
```

### Multi-Provider AI Support

```python
class AIClient:
    def __init__(self, config):
        self.provider = config.get('ai', {}).get('provider', 'openai')
        self.config = config
    
    def query(self, prompt):
        if self.provider == 'openai':
            return self._query_openai(prompt)
        elif self.provider == 'local':
            return self._query_local(prompt)
        elif self.provider == 'ollama':
            return self._query_ollama(prompt)
    
    def _query_openai(self, prompt):
        import openai
        openai.api_key = self.config['ai']['openai']['api_key']
        
        response = openai.ChatCompletion.create(
            model=self.config['ai']['openai']['model'],
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.choices[0].message.content
    
    def _query_local(self, prompt):
        """LM Studio, LocalAI compatible"""
        import requests
        
        response = requests.post(
            f"{self.config['ai']['local']['base_url']}/chat/completions",
            json={
                "model": self.config['ai']['local']['model'],
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        
        return response.json()['choices'][0]['message']['content']
    
    def _query_ollama(self, prompt):
        """Ollama compatible"""
        import ollama
        
        response = ollama.chat(
            model=self.config['ai']['ollama']['model'],
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response['message']['content']
```

---

## Conclusão

O Music XML Analyzer foi concebido sob princípios:

1. **Abstração**: Converter representação musical complexa em valores numéricos simples
2. **Separação de Conceitos**: Melodia ≠ Ritmo ≠ Tonalidade
3. **Preservação de Contexto**: Manter informação musical (instrumento, voz, compasso)
4. **Eficiência**: Usar XPath para queries rápidas, cache para evitar reprocessamento
5. **Precisão**: Algoritmo de sliding window garante match exato

O sistema é uma ponte entre:
- **Notação Musical** (MusicXML)
- **Processamento Programático** (Arrays, comparações)
- **Interface Amigável** (Vexflow, D3.js, visualizações)

Permitindo a qualquer pessoa, sem treino profundo em música ou programação, analisar e descobrir padrões em partituras.
