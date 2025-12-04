# Plano de Implementação: Renderização de Pautas nos Resultados de Análise Simétrica

## 📋 Objetivo

Melhorar a experiência de análise simétrica (Retrógrado, Inverso, Retrógrado-Inverso) permitindo a visualização de imagens das pautas musicais dos instrumentos nos compassos identificados, em vez de apenas mostrar números de compassos.

---

## ⚠️ PRÉ-REQUISITOS CRÍTICOS

### 1. **Corrigir WASM do Verovio**
**PROBLEMA CRÍTICO**: O ficheiro `static/verovio-toolkit.wasm` está corrompido (é HTML em vez de WebAssembly binary).

**SOLUÇÃO OBRIGATÓRIA antes da implementação**:
```bash
cd static/
# Fazer backup do ficheiro corrompido
mv verovio-toolkit.wasm verovio-toolkit.wasm.backup

# Download do WASM correto (versão 4.3.1 ou mais recente)
wget https://www.verovio.org/javascript/latest/verovio-toolkit.wasm

# Verificar que é um ficheiro WASM válido
file verovio-toolkit.wasm
# Output esperado: "verovio-toolkit.wasm: WebAssembly (wasm) binary module"
```

**Sem este fix, a renderização de pautas NÃO funcionará.**

### 2. **Implementar Sistema de Cache de File Paths**
**PROBLEMA**: Ficheiros temporários podem ser apagados antes da renderização.

**SOLUÇÃO**: Adicionar ao `app.py`:
```python
# Adicionar no topo do ficheiro, após imports
import time
from threading import Lock

# Cache global de scores para evitar re-parsing
score_cache = {}
score_cache_lock = Lock()
CACHE_EXPIRY = 3600  # 1 hora

def get_cached_score(file_path):
    """
    Obtém score do cache ou faz parse e guarda no cache.
    Evita múltiplas chamadas a converter.parse() para o mesmo ficheiro.
    """
    with score_cache_lock:
        if file_path in score_cache:
            score, timestamp = score_cache[file_path]
            if time.time() - timestamp < CACHE_EXPIRY:
                return score
            else:
                # Expirado, remover
                del score_cache[file_path]

        # Parse e guardar no cache
        score = converter.parse(file_path)
        score_cache[file_path] = (score, time.time())
        return score

def clear_expired_cache():
    """Limpar entradas expiradas do cache."""
    with score_cache_lock:
        expired_keys = [
            k for k, (_, timestamp) in score_cache.items()
            if time.time() - timestamp >= CACHE_EXPIRY
        ]
        for key in expired_keys:
            del score_cache[key]
```

**Usar `get_cached_score()` em vez de `converter.parse()` em TODOS os endpoints.**

---

## 🎯 Escopo

### Funcionalidades Principais
1. **Identificação de Compassos:** Manter a atual detecção de compassos onde ocorrem as transformações simétricas
2. **Renderização de Pautas:** Gerar imagens das pautas para os compassos relevantes
3. **Seleção de Instrumento:** Permitir escolher **UM** instrumento para renderizar (limitação atual do backend)
4. **Integração na UI:** Exibir as pautas nos relatórios de análise simétrica

### Escopo Fora
- Análises que não envolvam simetria (apenas nos relatórios de Retrograde, Inversion, RI)
- Exportação de imagens em formatos além de SVG
- Geração de múltiplas páginas em PDF
- **Seleção múltipla de instrumentos** (backend atual analisa apenas 1 instrumento)

---

## 🔧 Arquitetura Técnica

### 1. Backend (Python/Flask)

#### Estratégia de Renderização com Verovio

**Abordagem:** Em vez de usar Verovio no backend, usamos a instância **existente do lado do cliente** (já carregada em `templates/index.html`). Isto evita:
- Duplicação de dependências
- Sincronização de versões
- Processamento redundante no servidor

#### Nova Função: `extract_measures_from_musicxml()`
```python
# Arquivo: app.py

def extract_measures_from_musicxml(file_path, measure_numbers, part_index=0):
    """
    Extrai compassos específicos de um MusicXML usando music21.

    Args:
        file_path: Caminho para ficheiro MusicXML
        measure_numbers: Lista de números de compassos [1, 5, 12]
        part_index: Índice do instrumento a extrair (default: 0)

    Returns:
        str: MusicXML trimado com compassos selecionados

    Raises:
        ValueError: Se measure_numbers inválido ou part_index fora do range
        FileNotFoundError: Se file_path não existe
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    if not measure_numbers or not isinstance(measure_numbers, list):
        raise ValueError("measure_numbers must be a non-empty list")

    # Usar cache para evitar re-parsing
    score = get_cached_score(file_path)

    if part_index >= len(score.parts):
        raise ValueError(f"Part index {part_index} out of range (total parts: {len(score.parts)})")

    # Validar números de compassos
    total_measures = len(score.parts[0].getElementsByClass('Measure'))
    invalid_measures = [m for m in measure_numbers if m < 1 or m > total_measures]
    if invalid_measures:
        raise ValueError(f"Invalid measure numbers {invalid_measures}. Valid range: 1-{total_measures}")

    # Criar novo score apenas com o part selecionado
    new_score = stream.Score()
    target_part = score.parts[part_index]
    new_part = stream.Part()

    # Copiar metadata do part original
    new_part.partName = target_part.partName
    for element in target_part.getElementsByClass(['Instrument', 'Clef', 'KeySignature', 'TimeSignature']):
        if element.offset == 0:  # Elementos iniciais
            new_part.insert(0, element)

    # Extrair compassos solicitados
    all_measures = target_part.getElementsByClass('Measure')
    for measure_num in sorted(set(measure_numbers)):  # Ordenar e remover duplicados
        if 1 <= measure_num <= len(all_measures):
            measure = all_measures[measure_num - 1]  # Índice começa em 0
            new_part.append(measure)

    new_score.append(new_part)

    # Converter para MusicXML string
    musicxml_string = new_score.write('musicxml')

    # Se write() retornou um path (ficheiro temporário), ler conteúdo
    if isinstance(musicxml_string, str) and os.path.exists(musicxml_string):
        with open(musicxml_string, 'r', encoding='utf-8') as f:
            musicxml_content = f.read()
        try:
            os.remove(musicxml_string)  # Limpar ficheiro temporário
        except:
            pass
        return musicxml_content

    return musicxml_string
```

#### Função Auxiliar: `calculate_gaps()`
```python
def calculate_gaps(measure_numbers):
    """
    Calcula gaps entre compassos não contínuos.

    Args:
        measure_numbers: Lista de números de compassos [1, 5, 12]

    Returns:
        dict: {
            'is_contiguous': bool,
            'gaps': [{'from': int, 'to': int, 'gap': int}],
            'total_measures': int
        }

    Example:
        Input: [1, 5, 12]
        Output: {
            'is_contiguous': False,
            'gaps': [
                {'from': 1, 'to': 5, 'gap': 3},
                {'from': 5, 'to': 12, 'gap': 6}
            ],
            'total_measures': 3
        }
    """
    if not measure_numbers:
        return {'is_contiguous': True, 'gaps': [], 'total_measures': 0}

    sorted_measures = sorted(set(measure_numbers))
    gaps = []

    for i in range(len(sorted_measures) - 1):
        current = sorted_measures[i]
        next_measure = sorted_measures[i + 1]
        if next_measure - current > 1:
            gap = next_measure - current - 1
            gaps.append({
                'from': current,
                'to': next_measure,
                'gap': gap
            })

    return {
        'is_contiguous': len(gaps) == 0,
        'gaps': gaps,
        'total_measures': len(sorted_measures)
    }
```

#### Novo Endpoint: `/api/analysis/render-staff`
```python
@app.route('/api/analysis/render-staff', methods=['POST'])
def render_staff():
    """
    Endpoint para renderização de pautas de compassos específicos.

    Request Body:
        {
            "measures": [1, 5, 12],
            "part_index": 0,
            "file_path": "/path/to/file.musicxml"
        }

    Response:
        {
            "musicxml": "<score-partwise>...</score-partwise>",
            "metadata": {
                "measures": [1, 5, 12],
                "is_contiguous": false,
                "gaps": [...],
                "part_name": "Violin",
                "total_measures": 3
            }
        }
    """
    try:
        data = request.json

        # Validação de parâmetros
        measures = data.get('measures', [])
        part_index = data.get('part_index', 0)
        file_path = data.get('file_path')

        if not measures:
            return jsonify({'error': 'No measures provided'}), 400

        if not isinstance(measures, list):
            return jsonify({'error': 'measures must be a list'}), 400

        if len(measures) > 50:
            return jsonify({'error': 'Too many measures (max 50)'}), 400

        if not file_path:
            return jsonify({'error': 'No file_path provided'}), 400

        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        # Limpar cache expirado
        clear_expired_cache()

        # Extrair MusicXML trimado
        try:
            musicxml_trimmed = extract_measures_from_musicxml(
                file_path, measures, part_index
            )
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            return jsonify({'error': f'Failed to extract measures: {str(e)}'}), 500

        if not musicxml_trimmed:
            return jsonify({'error': 'Failed to extract measures'}), 500

        # Calcular metadados
        gap_info = calculate_gaps(measures)

        # Obter nome do instrumento
        score = get_cached_score(file_path)
        part_name = "Unknown"
        if part_index < len(score.parts):
            part_name = score.parts[part_index].partName or f"Part {part_index + 1}"

        metadata = {
            'measures': sorted(set(measures)),
            'is_contiguous': gap_info['is_contiguous'],
            'gaps': gap_info['gaps'],
            'part_name': part_name,
            'total_measures': gap_info['total_measures']
        }

        return jsonify({
            'musicxml': musicxml_trimmed,
            'metadata': metadata
        }), 200

    except Exception as e:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
```

---

### 2. Frontend (JavaScript/HTML)

#### Estrutura de Dados Compatível com Backend Atual
```javascript
// Estrutura atual retornada pelo backend (analyze_symmetry_music21)
// NÃO ALTERAR - compatível com app.py linhas 1400-1467
const symmetryData = {
    retrograde_score: 85.5,  // Percentagem de similaridade
    retrograde_measures: [1, 5, 12],  // Lista de compassos
    inversion_score: 72.3,
    inversion_measures: [2, 7],
    retrograde_inversion_score: 68.9,
    ri_measures: [3, 9],
    method: 'music21'
};
```

#### Componente Visual: `StaffRenderingViewer`

**HTML Structure** (inserir após resultados textuais em `renderSymmetryAdvanced()`):
```html
<div class="staff-rendering-viewer" style="display: none;" id="staff-viewer-container">
    <!-- Cabeçalho com Controles -->
    <div class="staff-viewer-header">
        <h3>🎼 Visualização de Pautas - <span id="staff-analysis-type">Retrograde</span></h3>

        <div class="staff-controls-bar">
            <!-- Controle de Zoom -->
            <div class="control-group">
                <label>Zoom:</label>
                <input type="range" min="20" max="200" value="100" step="10"
                       id="staff-zoom-slider" class="slider">
                <span id="staff-zoom-value">100%</span>
            </div>

            <!-- Botões de Navegação -->
            <div class="control-group">
                <button id="staff-scroll-left" class="nav-btn" title="Scroll Left">
                    ← Scroll
                </button>
                <button id="staff-scroll-right" class="nav-btn" title="Scroll Right">
                    Scroll →
                </button>
                <button id="staff-fit-width" class="nav-btn" title="Fit to Width">
                    ⬚ Fit Width
                </button>
            </div>

            <!-- Informações de Continuidade -->
            <div class="control-group info-badge">
                <span id="staff-continuity-info" class="badge">
                    ⚠️ Compassos não contínuos
                </span>
            </div>

            <!-- Botão de Renderização -->
            <button id="render-staff-btn" class="btn-primary">
                🎨 Renderizar Pautas
            </button>
        </div>
    </div>

    <!-- Área de Renderização com Scroll -->
    <div class="staff-viewer-container">
        <div class="staff-svg-wrapper" id="staff-svg-wrapper">
            <!-- SVG renderizado aqui -->
            <div id="staff-rendering-output"></div>
        </div>
    </div>

    <!-- Rodapé com Informações -->
    <div class="staff-viewer-footer">
        <span id="staff-info-text">
            Clique em "Renderizar Pautas" para visualizar os compassos identificados
        </span>
    </div>
</div>
```

#### Estilos CSS (adicionar a `style.css`)

**IMPORTANTE**: Usar variáveis CSS existentes do `style.css`:
- `--card-bg` em vez de `--bg-primary`
- `--light-text` em vez de `--text-primary`
- `--secondary-text` em vez de `--text-secondary`
- `--border-color` (já existe)

```css
/* ========================================
   Staff Rendering Viewer
   ======================================== */

.staff-rendering-viewer {
    margin-top: 2rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
    height: auto;
    max-height: 800px;
}

.staff-viewer-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--card-bg);
}

.staff-viewer-header h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--light-text);
}

.staff-controls-bar {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.control-group label {
    font-weight: 500;
    color: var(--secondary-text);
    min-width: 60px;
    font-size: 0.9rem;
}

.control-group .slider {
    width: 120px;
    cursor: pointer;
}

.control-group #staff-zoom-value {
    min-width: 50px;
    text-align: right;
    color: var(--secondary-text);
    font-size: 0.9rem;
}

.nav-btn {
    padding: 0.5rem 1rem;
    background: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
}

.nav-btn:hover {
    background: var(--hover-blue);
}

.info-badge .badge {
    padding: 0.5rem 1rem;
    background: #fff3cd;
    color: #856404;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
}

.info-badge .badge.contiguous {
    background: #d4edda;
    color: #155724;
}

/* Dark mode para badges */
[data-theme="dark"] .info-badge .badge {
    background: #2d3748;
    color: #ffd700;
}

[data-theme="dark"] .info-badge .badge.contiguous {
    background: #1e4620;
    color: #4caf50;
}

.btn-primary {
    padding: 0.5rem 1.5rem;
    background: var(--accent-purple);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background 0.2s;
}

.btn-primary:hover {
    background: var(--hover-purple);
}

.staff-viewer-container {
    flex: 1;
    overflow: auto;
    background: var(--darker-bg);
    position: relative;
    min-height: 300px;
}

.staff-svg-wrapper {
    display: inline-block;
    padding: 1.5rem;
    width: 100%;
}

/* SVG responsivo */
.staff-svg-wrapper svg {
    max-width: 100%;
    height: auto;
    background: white;
    border-radius: 4px;
    transition: transform 0.2s ease;
}

/* Indicadores de Gap entre Compassos */
.measure-gap-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    padding: 1rem;
    margin: 1rem 0;
    border-left: 4px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    font-size: 0.85rem;
    font-weight: 500;
}

[data-theme="dark"] .measure-gap-indicator {
    background: #2d3748;
    color: #ffd700;
    border-left-color: #ffc107;
}

.staff-viewer-footer {
    padding: 1rem 1.5rem;
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    font-size: 0.85rem;
    color: var(--secondary-text);
}

/* Loading e Error states */
.staff-rendering-output .loading {
    padding: 3rem;
    text-align: center;
    font-size: 1.2rem;
    color: var(--accent-blue);
}

.staff-rendering-output .error-message {
    padding: 2rem;
    text-align: center;
    font-size: 1rem;
    color: var(--error-red);
    background: rgba(244, 67, 54, 0.1);
    border-radius: 4px;
    margin: 1rem;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
    .staff-controls-bar {
        flex-direction: column;
        gap: 1rem;
    }

    .control-group {
        width: 100%;
        justify-content: space-between;
    }

    .control-group label {
        min-width: auto;
    }

    .staff-viewer-container {
        max-height: 400px;
    }

    .staff-viewer-header h3 {
        font-size: 1rem;
    }
}
```

#### Classe JavaScript: `StaffRenderingViewer`

**IMPORTANTE**: Instanciar APÓS renderizar HTML, NÃO em `DOMContentLoaded`.

```javascript
// ========================================
// STAFF RENDERING VIEWER
// ========================================

class StaffRenderingViewer {
    constructor(analysisType, measures, partIndex) {
        this.analysisType = analysisType;  // 'retrograde', 'inversion', 'ri'
        this.measures = measures || [];
        this.partIndex = partIndex || 0;
        this.currentZoom = 100;
        this.metadata = null;

        // Mostrar o container
        const container = document.getElementById('staff-viewer-container');
        if (container) {
            container.style.display = 'flex';

            // Atualizar tipo de análise no header
            const typeLabel = document.getElementById('staff-analysis-type');
            if (typeLabel) {
                const typeNames = {
                    'retrograde': 'Retrógrado',
                    'inversion': 'Inversão',
                    'ri': 'Retrógrado-Inversão'
                };
                typeLabel.textContent = typeNames[analysisType] || analysisType;
            }

            // Setup event listeners APÓS HTML estar no DOM
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const renderBtn = document.getElementById('render-staff-btn');
        const zoomSlider = document.getElementById('staff-zoom-slider');
        const scrollLeftBtn = document.getElementById('staff-scroll-left');
        const scrollRightBtn = document.getElementById('staff-scroll-right');
        const fitWidthBtn = document.getElementById('staff-fit-width');

        if (renderBtn) {
            renderBtn.addEventListener('click', () => this.renderStaff());
        }

        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => this.setZoom(e.target.value));
        }

        if (scrollLeftBtn) {
            scrollLeftBtn.addEventListener('click', () => this.scroll(-100));
        }

        if (scrollRightBtn) {
            scrollRightBtn.addEventListener('click', () => this.scroll(100));
        }

        if (fitWidthBtn) {
            fitWidthBtn.addEventListener('click', () => this.fitToWidth());
        }
    }

    async renderStaff() {
        try {
            // Validar file path
            if (!currentFilePath) {
                throw new Error('Nenhum ficheiro carregado. Por favor, carregue um ficheiro MusicXML primeiro.');
            }

            if (!this.measures || this.measures.length === 0) {
                throw new Error('Nenhum compasso identificado para renderizar.');
            }

            // Mostrar loading
            this.showLoading();

            // 1. Buscar MusicXML trimado do backend
            const response = await fetch('/api/analysis/render-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    measures: this.measures,
                    part_index: this.partIndex,
                    file_path: currentFilePath
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP Error: ${response.status}`);
            }

            const data = await response.json();

            // Validar resposta
            if (!data.musicxml) {
                throw new Error('Backend não retornou MusicXML válido.');
            }

            this.metadata = data.metadata;

            // 2. Aguardar Verovio estar pronto
            await window.verovioReady;

            if (!window.vrvToolkit) {
                throw new Error('Verovio Toolkit não inicializado. Recarregue a página.');
            }

            // 3. Configurar Verovio
            window.vrvToolkit.setOptions({
                scale: 40,
                adjustPageHeight: true,
                pageHeight: 6000,
                pageWidth: 2100,
                breaks: 'none',
                noFooter: true,
                noHeader: true,
                footer: 'none',
                header: 'none'
            });

            // 4. Carregar MusicXML
            const loaded = window.vrvToolkit.loadData(data.musicxml);

            if (!loaded) {
                throw new Error('Verovio falhou ao carregar MusicXML. Verifique a sintaxe do ficheiro.');
            }

            // 5. Renderizar SVG
            const svg = window.vrvToolkit.renderToSVG(1, {});

            if (!svg) {
                throw new Error('Verovio falhou ao gerar SVG.');
            }

            // 6. Exibir com indicadores de gaps
            this.displayStaffWithGapIndicators(svg, data.metadata);

            // 7. Atualizar informações
            this.updateFooterInfo(data.metadata);

        } catch (error) {
            this.showError(error.message);
            console.error('Error rendering staff:', error);
        }
    }

    displayStaffWithGapIndicators(svg, metadata) {
        const container = document.getElementById('staff-rendering-output');
        if (!container) return;

        container.innerHTML = '';

        // Mostrar aviso de gaps se necessário
        if (!metadata.is_contiguous && metadata.gaps && metadata.gaps.length > 0) {
            const warning = document.createElement('div');
            warning.className = 'measure-gap-indicator';
            warning.innerHTML = `
                ⚠️ <strong>Compassos não contínuos:</strong>
                ${metadata.gaps.map(g => `+${g.gap} compassos entre ${g.from} e ${g.to}`).join(', ')}
            `;
            container.appendChild(warning);
        }

        // Inserir SVG
        const svgDiv = document.createElement('div');
        svgDiv.innerHTML = svg;
        container.appendChild(svgDiv);

        // Atualizar badge de continuidade
        this.updateContinuityBadge(metadata.is_contiguous);

        // Reset zoom
        this.currentZoom = 100;
        const slider = document.getElementById('staff-zoom-slider');
        if (slider) slider.value = 100;
        document.getElementById('staff-zoom-value').textContent = '100%';
    }

    setZoom(percentage) {
        this.currentZoom = parseInt(percentage);
        const svg = document.querySelector('#staff-rendering-output svg');
        if (svg) {
            const scale = percentage / 100;
            svg.style.transform = `scale(${scale})`;
            svg.style.transformOrigin = 'top left';
        }

        const label = document.getElementById('staff-zoom-value');
        if (label) {
            label.textContent = `${percentage}%`;
        }
    }

    scroll(pixels) {
        const container = document.querySelector('.staff-viewer-container');
        if (container) {
            container.scrollLeft += pixels;
        }
    }

    fitToWidth() {
        const container = document.querySelector('.staff-viewer-container');
        const svg = document.querySelector('#staff-rendering-output svg');

        if (svg && container) {
            try {
                const bbox = svg.getBBox();
                const availableWidth = container.clientWidth - 48; // padding
                const scale = Math.min((availableWidth / bbox.width) * 100, 200); // Max 200%

                this.currentZoom = Math.round(scale);

                const slider = document.getElementById('staff-zoom-slider');
                if (slider) slider.value = this.currentZoom;

                this.setZoom(this.currentZoom);
            } catch (e) {
                console.warn('Could not calculate fit-to-width:', e);
                this.setZoom(100); // Fallback to 100%
            }
        }
    }

    updateContinuityBadge(isContiguous) {
        const badge = document.getElementById('staff-continuity-info');
        if (badge) {
            if (isContiguous) {
                badge.classList.add('contiguous');
                badge.textContent = '✅ Compassos contínuos';
            } else {
                badge.classList.remove('contiguous');
                badge.textContent = '⚠️ Compassos não contínuos';
            }
        }
    }

    updateFooterInfo(metadata) {
        const footer = document.getElementById('staff-info-text');
        if (!footer) return;

        const measuresText = `Compassos: ${metadata.measures.join(', ')}`;
        const partText = `Instrumento: ${metadata.part_name}`;

        let gapText = '';
        if (!metadata.is_contiguous && metadata.gaps && metadata.gaps.length > 0) {
            const gapSummary = metadata.gaps.map(g => `+${g.gap}`).join(', ');
            gapText = `| Intervalos: ${gapSummary}`;
        }

        footer.textContent = `${measuresText} | ${partText} ${gapText}`;
    }

    showLoading() {
        const output = document.getElementById('staff-rendering-output');
        if (output) {
            output.innerHTML = '<div class="loading">⏳ Renderizando pautas...</div>';
        }
    }

    showError(message) {
        const output = document.getElementById('staff-rendering-output');
        if (output) {
            output.innerHTML = `
                <div class="error-message">
                    ❌ <strong>Erro:</strong> ${message}
                </div>
            `;
        }
    }
}

// NÃO instanciar em DOMContentLoaded!
// A classe será instanciada APÓS renderizar análise simétrica
```

#### Integração em `renderSymmetryAdvanced()`

**Modificar a função existente em `script.js`** (linha ~3884):

```javascript
function renderSymmetryAdvanced(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    const sym = data.symmetry || {};
    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>`;

    // Show analysis method and tonality info if available
    if (sym.method || sym.tonality) {
        html += `<div style="margin-bottom: 15px; padding: 10px; background: var(--bg-secondary); border-radius: 4px; font-size: 0.9em;">`;

        if (sym.method) {
            const methodLabel = sym.method === 'tonal' ? '🎼 Análise Tonal' : '🎵 Análise Serial (12-tone)';
            html += `<div style="margin-bottom: 5px;"><strong>Método:</strong> ${methodLabel}</div>`;
        }

        if (sym.tonality && sym.method === 'tonal') {
            const modeLabel = sym.mode === 'major' ? 'Maior' : sym.mode === 'minor' ? 'Menor' : sym.mode;
            html += `<div><strong>Tonalidade:</strong> ${sym.tonality} ${modeLabel} (Tónica: ${sym.tonic_pitch_class})</div>`;
            html += `<div style="margin-top: 5px; font-size: 0.85em; color: var(--secondary-text);">Inversões calculadas em torno da tónica</div>`;
        }

        html += `</div>`;
    }

    html += `<table class="statistics-table">
            <tr>
                <td><strong>Retrograde Similarity (R):</strong></td>
                <td>${sym.retrograde_score}%</td>
            </tr>`;

    if (sym.retrograde_measures && sym.retrograde_measures.length > 0) {
        html += `
            <tr>
                <td colspan="2" style="padding-left: 30px; font-size: 0.9em; color: #999;">
                    Found in measures: ${sym.retrograde_measures.join(', ')}
                </td>
            </tr>`;
    }

    html += `
            <tr>
                <td><strong>Inversion Similarity (I):</strong></td>
                <td>${sym.inversion_score}%</td>
            </tr>`;

    if (sym.inversion_measures && sym.inversion_measures.length > 0) {
        html += `
            <tr>
                <td colspan="2" style="padding-left: 30px; font-size: 0.9em; color: #999;">
                    Found in measures: ${sym.inversion_measures.join(', ')}
                </td>
            </tr>`;
    }

    if (sym.retrograde_inversion_score !== undefined) {
        html += `
            <tr>
                <td><strong>Retrograde-Inversion (RI):</strong></td>
                <td>${sym.retrograde_inversion_score}%</td>
            </tr>`;

        if (sym.ri_measures && sym.ri_measures.length > 0) {
            html += `
            <tr>
                <td colspan="2" style="padding-left: 30px; font-size: 0.9em; color: #999;">
                    Found in measures: ${sym.ri_measures.join(', ')}
                </td>
            </tr>`;
        }
    }

    html += `
        </table>
        <p style="margin-top: 15px; font-size: 0.9rem; color: #999;">
            Higher percentages indicate stronger symmetrical patterns in the pitch sequence.
        </p>
    </div>`;

    // ======== NOVO: Inserir Staff Rendering Viewer ========
    // Só mostrar se houver compassos identificados
    const hasMeasures = (sym.retrograde_measures && sym.retrograde_measures.length > 0) ||
                        (sym.inversion_measures && sym.inversion_measures.length > 0) ||
                        (sym.ri_measures && sym.ri_measures.length > 0);

    if (hasMeasures) {
        html += `
        <!-- Staff Rendering Viewer -->
        <div class="staff-rendering-viewer" style="display: none;" id="staff-viewer-container">
            <div class="staff-viewer-header">
                <h3>🎼 Visualização de Pautas - <span id="staff-analysis-type">Análise Simétrica</span></h3>

                <div class="staff-controls-bar">
                    <div class="control-group">
                        <label>Zoom:</label>
                        <input type="range" min="20" max="200" value="100" step="10"
                               id="staff-zoom-slider" class="slider">
                        <span id="staff-zoom-value">100%</span>
                    </div>

                    <div class="control-group">
                        <button id="staff-scroll-left" class="nav-btn">← Scroll</button>
                        <button id="staff-scroll-right" class="nav-btn">Scroll →</button>
                        <button id="staff-fit-width" class="nav-btn">⬚ Fit Width</button>
                    </div>

                    <div class="control-group info-badge">
                        <span id="staff-continuity-info" class="badge">
                            ⚠️ Compassos não contínuos
                        </span>
                    </div>

                    <button id="render-staff-btn" class="btn-primary">
                        🎨 Renderizar Pautas
                    </button>
                </div>
            </div>

            <div class="staff-viewer-container">
                <div class="staff-svg-wrapper" id="staff-svg-wrapper">
                    <div id="staff-rendering-output"></div>
                </div>
            </div>

            <div class="staff-viewer-footer">
                <span id="staff-info-text">
                    Clique em "Renderizar Pautas" para visualizar os compassos identificados
                </span>
            </div>
        </div>
        `;

        // IMPORTANTE: Instanciar StaffRenderingViewer APÓS o HTML ser inserido no DOM
        // Usar setTimeout para garantir que o HTML está renderizado
        setTimeout(() => {
            // Determinar qual tipo de análise tem mais compassos
            let analysisType = 'retrograde';
            let measures = sym.retrograde_measures || [];

            if ((sym.inversion_measures || []).length > measures.length) {
                analysisType = 'inversion';
                measures = sym.inversion_measures;
            }

            if ((sym.ri_measures || []).length > measures.length) {
                analysisType = 'ri';
                measures = sym.ri_measures;
            }

            // Obter part_index da análise atual (assumindo que está armazenado globalmente)
            const partIndex = window.currentSymmetryPartIndex || 0;

            // Instanciar viewer
            window.staffViewer = new StaffRenderingViewer(analysisType, measures, partIndex);
        }, 100);
    }

    return html;
}
```

#### Armazenar `part_index` Globalmente

**Modificar função que chama análise simétrica** (encontrar onde `selectSymmetryAnalysis` é chamado):

```javascript
// Adicionar no topo do script.js, junto com outras variáveis globais
let currentSymmetryPartIndex = 0;

// Modificar onde a análise simétrica é solicitada
async function selectSymmetryAnalysis(analysisType) {
    // ... código existente ...

    // Antes de fazer o fetch, armazenar part_index
    const partIndex = parseInt(document.getElementById('symmetry-part-select')?.value || 0);
    window.currentSymmetryPartIndex = partIndex;

    // ... resto do código ...
}
```

---

## 🚀 Estratégia de Implementação

### Ordem Correta de Implementação

**CRÍTICO**: Seguir esta ordem para evitar erros:

### Fase 0: Pré-Requisitos (OBRIGATÓRIO - 30 min)
- [ ] ✅ **CRÍTICO**: Corrigir `static/verovio-toolkit.wasm` (download do ficheiro correto)
- [ ] ✅ **CRÍTICO**: Implementar `get_cached_score()` e sistema de cache em `app.py`
- [ ] ✅ Testar que Verovio inicializa corretamente (verificar console do browser)
- [ ] ✅ Testar cache com ficheiro de exemplo

### Fase 1: Backend (3-4 horas)
- [ ] Implementar `extract_measures_from_musicxml()` em `app.py`
- [ ] Implementar `calculate_gaps()` em `app.py`
- [ ] Implementar `clear_expired_cache()` em `app.py`
- [ ] Criar endpoint `/api/analysis/render-staff` em `app.py`
- [ ] Adicionar validação de parâmetros completa
- [ ] Adicionar error handling robusto
- [ ] **Testar endpoint com Postman/curl antes de prosseguir**

### Fase 2: Frontend CSS (1 hora)
- [ ] Adicionar estilos CSS a `static/style.css`
- [ ] Testar estilos em dark mode e light mode
- [ ] Testar responsividade (mobile, tablet, desktop)

### Fase 3: Frontend JavaScript (3-4 horas)
- [ ] Adicionar classe `StaffRenderingViewer` a `static/script.js`
- [ ] Adicionar variável `currentSymmetryPartIndex` no topo de `script.js`
- [ ] Modificar `renderSymmetryAdvanced()` para incluir HTML do viewer
- [ ] Modificar `selectSymmetryAnalysis()` para armazenar `part_index`
- [ ] **Testar inicialização da classe no console do browser**
- [ ] **Testar renderização com ficheiro de exemplo**

### Fase 4: Integração e Testes (2-3 horas)
- [ ] Testar fluxo completo: Upload → Análise Simétrica → Renderizar Pautas
- [ ] Testar com diferentes tipos de análise (Retrograde, Inversion, RI)
- [ ] Testar edge cases:
  - [ ] Compassos não contínuos
  - [ ] Score com múltiplos instrumentos
  - [ ] Ficheiro sem compassos identificados
  - [ ] Ficheiro muito grande (>100 compassos)
- [ ] Testar controles de zoom, scroll, fit-to-width
- [ ] Testar em diferentes browsers (Chrome, Firefox, Safari)

### Fase 5: Otimização e Documentação (1-2 horas)
- [ ] Adicionar cache de SVG no frontend (opcional)
- [ ] Otimizar performance para ficheiros grandes
- [ ] Documentar novos endpoints em README
- [ ] Criar changelog entry

**Tempo Total Estimado:** 10-14 horas

---

## ⚠️ Tratamento de Erros - Casos Críticos

### 1. Verovio WASM Não Carregado
```javascript
// Verificar antes de usar
if (!window.vrvToolkit) {
    throw new Error('Verovio não inicializado. Verifique static/verovio-toolkit.wasm');
}
```

### 2. File Path Inválido ou Expirado
```python
# Backend
if not os.path.exists(file_path):
    return jsonify({'error': 'File not found or expired. Please upload again.'}), 404
```

### 3. Compassos Fora do Range
```python
# Backend - validação
total_measures = len(score.parts[0].getElementsByClass('Measure'))
invalid = [m for m in measures if m < 1 or m > total_measures]
if invalid:
    return jsonify({
        'error': f'Invalid measures {invalid}. Valid range: 1-{total_measures}'
    }), 400
```

### 4. Part Index Inválido
```python
# Backend
if part_index >= len(score.parts):
    return jsonify({
        'error': f'Invalid part index {part_index}. Total parts: {len(score.parts)}'
    }), 400
```

### 5. MusicXML Malformado
```javascript
// Frontend
const loaded = window.vrvToolkit.loadData(data.musicxml);
if (!loaded) {
    throw new Error('MusicXML inválido ou corrompido');
}
```

---

## 🧪 Testes de Validação

### Backend Tests
```python
# test_staff_rendering.py

def test_calculate_gaps_contiguous():
    """Compassos contínuos devem retornar is_contiguous=True"""
    result = calculate_gaps([1, 2, 3, 4])
    assert result['is_contiguous'] == True
    assert len(result['gaps']) == 0

def test_calculate_gaps_non_contiguous():
    """Compassos não-contínuos devem calcular gaps corretamente"""
    result = calculate_gaps([1, 5, 12])
    assert result['is_contiguous'] == False
    assert len(result['gaps']) == 2
    assert result['gaps'][0] == {'from': 1, 'to': 5, 'gap': 3}
    assert result['gaps'][1] == {'from': 5, 'to': 12, 'gap': 6}

def test_extract_measures_invalid_file():
    """File path inválido deve lançar FileNotFoundError"""
    with pytest.raises(FileNotFoundError):
        extract_measures_from_musicxml('/invalid/path.xml', [1, 2], 0)

def test_extract_measures_invalid_numbers():
    """Measure numbers inválidos devem lançar ValueError"""
    with pytest.raises(ValueError):
        extract_measures_from_musicxml('test.xml', [999], 0)

def test_render_staff_endpoint_success():
    """Endpoint deve retornar MusicXML + metadata"""
    response = client.post('/api/analysis/render-staff', json={
        'measures': [1, 2, 3],
        'part_index': 0,
        'file_path': 'test_files/example.musicxml'
    })
    assert response.status_code == 200
    data = response.json
    assert 'musicxml' in data
    assert 'metadata' in data
    assert data['metadata']['total_measures'] == 3
```

### Frontend Tests (Manual)
```
TESTE 1: Renderização Básica
✓ Upload ficheiro MusicXML
✓ Executar análise simétrica
✓ Verificar que viewer aparece
✓ Clicar "Renderizar Pautas"
✓ SVG deve aparecer em ~2-3 segundos

TESTE 2: Controles de Zoom
✓ Slider de zoom deve escalar SVG
✓ Fit to Width deve ajustar automaticamente
✓ Valores de zoom devem atualizar label

TESTE 3: Scroll
✓ Botões ← → devem scrollar horizontalmente
✓ Scroll deve ser smooth

TESTE 4: Compassos Não-Contínuos
✓ Indicador de gap deve aparecer
✓ Badge deve mostrar "⚠️ Compassos não contínuos"
✓ Footer deve listar intervalos

TESTE 5: Error Handling
✓ File path inválido → mostrar erro
✓ Verovio falha → mostrar erro
✓ Compassos inválidos → mostrar erro
```

---

## 📊 Resumo de Problemas Corrigidos

| # | Problema Original | Solução Implementada |
|---|-------------------|---------------------|
| 1 | WASM corrompido | Instruções para download correto + validação |
| 2 | Endpoint ausente | Especificação completa do endpoint |
| 3 | Função de extração ausente | Implementação completa com validação |
| 4 | File path temporário | Sistema de cache `get_cached_score()` |
| 5 | Estrutura de dados incompatível | Usar estrutura atual do backend |
| 6 | Seleção múltipla de instrumentos | Limitado a 1 instrumento (backend atual) |
| 7 | Classe não instanciada | Instanciar APÓS HTML com `setTimeout()` |
| 8 | Métodos auxiliares ausentes | Implementados na classe |
| 9 | `currentFilePath` undefined | Validação antes de usar |
| 10 | Zoom com `transform: scale()` | Implementação corrigida + fallback |
| 11 | Variáveis CSS não definidas | Usar variáveis existentes de `style.css` |
| 12 | Media query sobrescreve theme | Usar `[data-theme]` em vez de media query |
| 13 | Parsing redundante | Sistema de cache global |
| 14 | MusicXML grande | Extração otimizada apenas compassos necessários |
| 15 | Validação de compassos | Validação completa no backend |

---

## 📞 Referências

- [Verovio Toolkit (JavaScript)](https://www.verovio.org/tutorial.xhtml)
- [Music21 Documentation](https://web.mit.edu/music21/doc/)
- [Music21 MusicXML Parsing](https://web.mit.edu/music21/doc/moduleReference/moduleConverter.html)
- [Flask Request/Response](https://flask.palletsprojects.com/en/2.3.x/api/#flask.Request)
- [MDN - SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)

---

## ✅ Checklist Final

### Antes de Começar Implementação
- [ ] ✅ **CRÍTICO**: Verovio WASM baixado e validado
- [ ] ✅ **CRÍTICO**: Sistema de cache implementado
- [ ] ✅ Backup do código atual criado
- [ ] ✅ Ambiente de testes preparado

### Backend
- [ ] Função `get_cached_score()` implementada
- [ ] Função `clear_expired_cache()` implementada
- [ ] Função `extract_measures_from_musicxml()` implementada
- [ ] Função `calculate_gaps()` implementada
- [ ] Endpoint `/api/analysis/render-staff` criado
- [ ] Validação de parâmetros completa
- [ ] Error handling robusto
- [ ] Testes unitários criados e passando

### Frontend
- [ ] Variável `currentSymmetryPartIndex` adicionada
- [ ] CSS adicionado a `style.css`
- [ ] Classe `StaffRenderingViewer` adicionada
- [ ] Função `renderSymmetryAdvanced()` modificada
- [ ] Função `selectSymmetryAnalysis()` modificada
- [ ] Testes manuais executados

### Integração
- [ ] Testado com Retrograde Analysis
- [ ] Testado com Inversion Analysis
- [ ] Testado com RI Analysis
- [ ] Testado em dark mode e light mode
- [ ] Testado em mobile, tablet, desktop
- [ ] Testado em Chrome, Firefox, Safari

### Documentação
- [ ] README atualizado
- [ ] Changelog criado
- [ ] Comentários no código adicionados

---

**NOTA FINAL**: Este plano corrigido elimina TODOS os 15 problemas identificados. Seguir a ordem de implementação é CRÍTICO para evitar erros. Não pular a Fase 0 (Pré-Requisitos).
