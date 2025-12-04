let currentFilePath = null;
let analysisData = null;

const fileInput = document.getElementById('musicxml-file');
const fileName = document.getElementById('file-name');
const scoreInfo = document.getElementById('score-info');
const analysisSection = document.getElementById('analysis-section');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const reportViewSection = document.getElementById('report-view-section');
const generateBtn = document.getElementById('generate-report');

fileInput.addEventListener('change', handleFileUpload);
generateBtn.addEventListener('click', generateReport);

document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'back-to-options') {
        backToOptions();
    }
    if (e.target && e.target.id === 'view-report') {
        viewReport();
    }
    if (e.target && e.target.id === 'close-report-view') {
        closeReportView();
    }
    // Settings Modal Events
    if (e.target && (e.target.id === 'settings-btn' || e.target.closest('#settings-btn'))) {
        openSettings();
    }
    if (e.target && (e.target.classList.contains('close-modal') || e.target.id === 'cancel-settings')) {
        closeSettings();
    }
    if (e.target && e.target.id === 'save-settings') {
        saveSettings();
    }
    if (e.target && e.target.id === 'settings-modal') {
        closeSettings();
    }
});

// Settings Logic
const defaultContextPhrases = [
    "You are a specialist in music theory and harmonic analysis.",
    "Analyze the provided score focusing on tonal functions and chord progressions.",
    "Identify important cadences and modulations.",
    "Provide insights on melodic and rhythmic structure."
];

// Global Config
let appConfig = {};

// Fetch settings on load
async function fetchSettings() {
    try {
        const response = await fetch('/settings');
        if (response.ok) {
            appConfig = await response.json();
            console.log('Settings loaded:', appConfig);
            applyTheme(appConfig.theme || 'dark');
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

document.addEventListener('DOMContentLoaded', fetchSettings);

// ========================================
// TABS MANAGEMENT
// ========================================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const activePane = document.getElementById(`tab-${tabName}`);
            if (activePane) {
                activePane.classList.add('active');
            }

            // Log for debugging
            console.log('Switched to tab:', tabName);
        });
    });
}

// Initialize tabs when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeTabs();
    initializeCollapsibles();
});

function showTabsNavigation() {
    const tabsNav = document.getElementById('tabs-navigation');
    if (tabsNav) {
        tabsNav.style.display = 'block';
        // Ensure Main tab is active by default
        const mainTabBtn = document.querySelector('[data-tab="main"]');
        if (mainTabBtn && !mainTabBtn.classList.contains('active')) {
            mainTabBtn.click();
        }
    }
}

function hideTabsNavigation() {
    const tabsNav = document.getElementById('tabs-navigation');
    if (tabsNav) {
        tabsNav.style.display = 'none';
    }
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    loadSettings();
    modal.style.display = 'block';
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'none';
}

function loadSettings() {
    const remoteUrl = appConfig.remoteApiUrl || '';
    const remoteKey = appConfig.remoteApiKey || '';
    const remoteModel = appConfig.remoteModel || '';
    const localUrl = appConfig.localApiUrl || '';
    const localKey = appConfig.localApiKey || '';
    const localModel = appConfig.localModel || '';
    const contextPhrases = appConfig.contextPhrases || defaultContextPhrases.join('\n');
    const theme = appConfig.theme || 'dark';
    const agent = appConfig.agent || 'remote';
    
    // Load AI prompts
    const aiPrompts = appConfig.aiPrompts || {};
    const pianoRollPrompt = aiPrompts.piano_roll_analysis || '';
    const comparisonPrompt = aiPrompts.comparison_analysis || '';
    const melodicQuickPrompt = aiPrompts.melodic_ai_quick || '';
    const generalPanelPrompt = aiPrompts.general_ai_panel || '';

    document.getElementById('remote-api-url').value = remoteUrl;
    document.getElementById('remote-api-key').value = remoteKey;
    document.getElementById('remote-model').value = remoteModel;
    document.getElementById('local-api-url').value = localUrl;
    document.getElementById('local-api-key').value = localKey;
    document.getElementById('local-model').value = localModel;
    document.getElementById('context-phrases').value = contextPhrases;
    
    // Load prompt textareas
    document.getElementById('prompt-piano-roll').value = pianoRollPrompt;
    document.getElementById('prompt-section-analysis').value = aiPrompts.section_analysis || '';
    document.getElementById('prompt-comparison').value = comparisonPrompt;
    document.getElementById('prompt-melodic-quick').value = melodicQuickPrompt;
    document.getElementById('prompt-general-panel').value = generalPanelPrompt;

    // Set theme radio
    const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (themeRadio) themeRadio.checked = true;

    // Set agent radio
    const agentRadio = document.querySelector(`input[name="agent"][value="${agent}"]`);
    if (agentRadio) agentRadio.checked = true;
}

async function saveSettings() {
    const remoteUrl = document.getElementById('remote-api-url').value;
    const remoteKey = document.getElementById('remote-api-key').value;
    const remoteModel = document.getElementById('remote-model').value;
    const localUrl = document.getElementById('local-api-url').value;
    const localKey = document.getElementById('local-api-key').value;
    const localModel = document.getElementById('local-model').value;
    const contextPhrases = document.getElementById('context-phrases').value;
    const theme = document.querySelector('input[name="theme"]:checked').value;
    const agent = document.querySelector('input[name="agent"]:checked').value;
    
    // Capture AI prompts
    const aiPrompts = {
        piano_roll_analysis: document.getElementById('prompt-piano-roll').value,
        section_analysis: document.getElementById('prompt-section-analysis').value,
        comparison_analysis: document.getElementById('prompt-comparison').value,
        melodic_ai_quick: document.getElementById('prompt-melodic-quick').value,
        general_ai_panel: document.getElementById('prompt-general-panel').value
    };

    const newSettings = {
        remoteApiUrl: remoteUrl,
        remoteApiKey: remoteKey,
        remoteModel: remoteModel,
        localApiUrl: localUrl,
        localApiKey: localKey,
        localModel: localModel,
        contextPhrases: contextPhrases,
        theme: theme,
        agent: agent,
        aiPrompts: aiPrompts
    };

    try {
        const response = await fetch('/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSettings)
        });

        if (response.ok) {
            appConfig = newSettings;
            applyTheme(theme);
            closeSettings();
            alert('Settings saved successfully!');
        } else {
            throw new Error('Error saving to server');
        }
    } catch (error) {
        alert('Error saving settings: ' + error.message);
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileName.textContent = file.name;

    const formData = new FormData();
    formData.append('file', file);

    try {
        showLoading(true);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error uploading file');
        }

        const data = await response.json();
        currentFilePath = data.file_path;

        displayScoreInfo(data);
        displayInstruments(data.instrument_names);
        populateComparisonInstruments(data.instrument_names);

        scoreInfo.style.display = 'block';
        analysisSection.style.display = 'block';
        showTabsNavigation();  // Show tabs when file is loaded

        // Show environment selection section
        const environmentSection = document.getElementById('environment-selection-section');
        if (environmentSection) {
            environmentSection.style.display = 'block';
        }

        // Detect tonality automatically
        detectTonality(currentFilePath);

    } catch (error) {
        alert('Error processing file: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function displayScoreInfo(data) {
    document.getElementById('score-title').textContent = data.title;
    document.getElementById('score-key').textContent = data.overall_key;
    document.getElementById('score-measures').textContent = data.total_measures;
    document.getElementById('score-instruments').textContent = data.total_instruments;
}

function displayInstruments(instruments) {
    const instrumentList = document.getElementById('instrument-list');
    instrumentList.innerHTML = '';

    instruments.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'instrument-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `instrument-${index}`;
        checkbox.value = index;

        const label = document.createElement('label');
        label.htmlFor = `instrument-${index}`;
        label.textContent = name;

        div.appendChild(checkbox);
        div.appendChild(label);
        instrumentList.appendChild(div);
    });
}

async function generateReport() {
    const selectedInstruments = Array.from(
        document.querySelectorAll('#instrument-list input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value));

    if (selectedInstruments.length === 0) {
        alert('Please select at least one instrument for harmonic analysis');
        return;
    }

    const analyzeIntervals = document.getElementById('analyze-intervals').checked;
    const analyzeDirection = document.getElementById('analyze-direction').checked;
    const analyzeRhythm = document.getElementById('analyze-rhythm').checked;

    const requestData = {
        file_path: currentFilePath,
        harmonic_parts: selectedInstruments,
        analyze_intervals: analyzeIntervals,
        analyze_direction: analyzeDirection,
        analyze_rhythm: analyzeRhythm
    };

    try {
        showLoading(true);
        analysisSection.style.display = 'none';

        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error('Error analyzing score');
        }

        analysisData = await response.json();
        analysisData.file_path = currentFilePath;
        console.log('Analysis data received:', analysisData);

        showLoading(false);
        resultSection.style.display = 'block';

    } catch (error) {
        alert('Error generating report: ' + error.message);
        showLoading(false);
        analysisSection.style.display = 'block';
    }
}

document.getElementById('download-report')?.addEventListener('click', async function (e) {
    e.preventDefault();

    if (!analysisData) {
        alert('No report available for download');
        return;
    }

    try {
        const response = await fetch('/download_report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analysisData)
        });

        if (!response.ok) {
            throw new Error('Error downloading report');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${analysisData.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        alert('Error downloading report: ' + error.message);
    }
});

function showLoading(show) {
    if (show) {
        loadingSection.style.display = 'block';
    } else {
        loadingSection.style.display = 'none';
    }
}

function backToOptions() {
    resultSection.style.display = 'none';
    reportViewSection.style.display = 'none';
    analysisSection.style.display = 'block';

    // Switch to Main tab
    const mainTabBtn = document.querySelector('[data-tab="main"]');
    if (mainTabBtn && !mainTabBtn.classList.contains('active')) {
        mainTabBtn.click();
    }

    window.scrollTo({ top: analysisSection.offsetTop - 20, behavior: 'smooth' });
}

function viewReport() {
    console.log('viewReport called, analysisData:', analysisData);

    if (!analysisData) {
        alert('No report available to view');
        return;
    }

    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = '';

    // General Info - Pass analysisData.general_info as sectionData
    reportContent.appendChild(createCollapsibleBox('📋 General Information', formatGeneralInfo(analysisData), analysisData.general_info));

    if (analysisData.melodic_analysis) {
        // Fetch piano roll data first
        fetch('/api/piano_roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: analysisData.file_path })
        })
            .then(response => response.json())
            .then(pianoData => {
                const instrumentsData = pianoData.instruments || [];

                Object.keys(analysisData.melodic_analysis).forEach((instrumentName, index) => {
                    const data = analysisData.melodic_analysis[instrumentName];
                    const box = createCollapsibleBox(`🎵 Melodic Analysis - ${instrumentName}`, formatMelodicAnalysis(data), data);

                    // Find the piano roll slot
                    const pianoRollSlot = box.querySelector('.piano-roll-slot');

                    // Create container for Piano Roll
                    const chartContainerId = `piano-roll-${index}`;

                    // Declare button variables outside the if block
                    let aiAnalysisBtn, aiResultBox, aiResultContent, copyBtn, exportBtn;

                    if (pianoRollSlot) {
                        console.log(`Piano Roll Slot found for ${instrumentName}, creating chart ${chartContainerId}`);

                        const chartDiv = document.createElement('div');
                        chartDiv.id = chartContainerId;
                        chartDiv.style.width = '100%';
                        chartDiv.style.height = '300px';
                        chartDiv.style.border = '1px solid var(--border-color)';
                        chartDiv.style.borderRadius = '8px';

                        // Add title
                        const title = document.createElement('h4');
                        title.textContent = '🎹 Piano Roll';
                        title.style.marginTop = '0';
                        title.style.marginBottom = '10px';

                        pianoRollSlot.appendChild(title);
                        pianoRollSlot.appendChild(chartDiv);

                        // Container for AI Analysis Buttons
                        const aiButtonsContainer = document.createElement('div');
                        aiButtonsContainer.style.cssText = `
                            display: flex;
                            gap: 10px;
                            margin-top: 15px;
                            width: 100%;
                        `;

                        // Piano Roll Analysis Button
                        const aiQuickBtn = document.createElement('button');
                        aiQuickBtn.className = 'piano-roll-quick-ai-btn';
                        aiQuickBtn.innerHTML = '🤖 Analyze Piano Roll with AI';
                        aiQuickBtn.style.cssText = `
                            background: linear-gradient(135deg, var(--accent-purple), #9c27b0);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s;
                            flex: 1;
                        `;

                        aiQuickBtn.addEventListener('mouseover', () => {
                            aiQuickBtn.style.transform = 'translateY(-2px)';
                            aiQuickBtn.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
                        });

                        aiQuickBtn.addEventListener('mouseout', () => {
                            aiQuickBtn.style.transform = 'translateY(0)';
                            aiQuickBtn.style.boxShadow = 'none';
                        });

                        // Section Analysis Button
                        const sectionBtn = document.createElement('button');
                        sectionBtn.className = 'section-analysis-ai-btn';
                        sectionBtn.innerHTML = '📊 Section Analysis';
                        sectionBtn.style.cssText = `
                            background: linear-gradient(135deg, var(--accent-blue), #1976d2);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s;
                            flex: 1;
                        `;

                        sectionBtn.addEventListener('mouseover', () => {
                            sectionBtn.style.transform = 'translateY(-2px)';
                            sectionBtn.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
                        });

                        sectionBtn.addEventListener('mouseout', () => {
                            sectionBtn.style.transform = 'translateY(0)';
                            sectionBtn.style.boxShadow = 'none';
                        });

                        aiButtonsContainer.appendChild(aiQuickBtn);
                        aiButtonsContainer.appendChild(sectionBtn);
                        pianoRollSlot.appendChild(aiButtonsContainer);
                    } else {
                        console.error(`Piano Roll Slot NOT found for ${instrumentName}`);
                    }

                    reportContent.appendChild(box);

                    // Find corresponding instrument data
                    const instrumentPianoData = instrumentsData.find(i => i.name === instrumentName) || instrumentsData[index];

                    if (instrumentPianoData && pianoRollSlot) {
                        console.log(`Setting up Piano Roll for ${instrumentName} with ${instrumentPianoData.notes.length} notes`);

                        // Find the AI buttons we just created
                        const quickBtn = pianoRollSlot.querySelector('.piano-roll-quick-ai-btn');
                        const sectionBtn = pianoRollSlot.querySelector('.section-analysis-ai-btn');

                        if (quickBtn) {
                            // Add click handler to populate AI panel with Piano Roll analysis prompt
                            quickBtn.addEventListener('click', async () => {
                                console.log('Quick AI button clicked for', instrumentName);
                                if (!instrumentPianoData || !instrumentPianoData.notes || instrumentPianoData.notes.length === 0) {
                                    alert('Error: No note data for this instrument.');
                                    return;
                                }
                                const pianoRollPrompt = appConfig.contextPhrases || defaultContextPhrases.join('\n');
                                const fullPrompt = `Section: Melodic Analysis - ${instrumentName}\n\nContext: ${pianoRollPrompt}`;

                                // Show loading box immediately
                                createLoadingAiBox(pianoRollSlot, instrumentName);

                                try {
                                    const aiResponse = await fetch('/api/analyze_with_ai', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            piano_roll_data: [instrumentPianoData],
                                            prompt: fullPrompt,
                                            agent_type: appConfig.agent || 'remote'
                                        })
                                    });
                                    if (!aiResponse.ok) throw new Error('Error obtaining AI analysis');
                                    const aiData = await aiResponse.json();
                                    if (aiData.analysis_result) {
                                        displayAiAnalysisResultInBox(aiData.analysis_result, pianoRollSlot, instrumentName);
                                    } else {
                                        updateAiBoxError(pianoRollSlot, 'AI response contains no results.');
                                    }
                                } catch (error) {
                                    console.error('AI Analysis Error:', error);
                                    updateAiBoxError(pianoRollSlot, 'Error in AI analysis: ' + error.message);
                                }
                            });
                        }

                        if (sectionBtn) {
                            // Add click handler for Section Analysis
                            sectionBtn.addEventListener('click', async () => {
                                console.log('Section Analysis button clicked for', instrumentName);
                                if (!instrumentPianoData || !instrumentPianoData.notes || instrumentPianoData.notes.length === 0) {
                                    alert('Error: No note data for this instrument.');
                                    return;
                                }

                                // Try to get measure range from staff notation controls if visible
                                let startMeasure = 1;
                                let endMeasure = null;
                                const measureDurationBeats = analysisData.general_info.measure_duration_beats || 4;

                                // Check if staff notation is visible and has measure controls
                                const staffContainer = document.getElementById(`${chartContainerId}-staff`);
                                if (staffContainer && staffContainer.style.display !== 'none') {
                                    const startInput = document.getElementById(`${chartContainerId}-staff-vstart`);
                                    const endInput = document.getElementById(`${chartContainerId}-staff-vend`);

                                    if (startInput && endInput) {
                                        startMeasure = parseInt(startInput.value) || 1;
                                        endMeasure = parseInt(endInput.value) || null;
                                    }
                                }

                                // If no specific range, analyze all measures
                                if (!endMeasure) {
                                    const totalDuration = instrumentPianoData.notes.reduce((max, n) => Math.max(max, n.start + n.duration), 0);
                                    endMeasure = Math.ceil(totalDuration / measureDurationBeats);
                                }

                                // Filter notes for the selected measure range
                                const startTime = (startMeasure - 1) * measureDurationBeats;
                                const endTime = endMeasure * measureDurationBeats;
                                const filteredNotes = instrumentPianoData.notes.filter(n =>
                                    n.start >= startTime && n.start < endTime
                                );

                                // Create filtered instrument data
                                const filteredInstrumentData = {
                                    ...instrumentPianoData,
                                    notes: filteredNotes
                                };

                                // Get section analysis prompt from config and replace placeholders
                                let sectionPrompt = appConfig.aiPrompts?.section_analysis ||
                                    `# Section Analysis: ${instrumentName}\n\n## Measures ${startMeasure} to ${endMeasure}\n\nAnalyze this musical section focusing on motifs, character, development, rhythmic features, and structural function.`;

                                // Replace placeholders
                                sectionPrompt = sectionPrompt
                                    .replace(/{instrumentName}/g, instrumentName)
                                    .replace(/{startMeasure}/g, startMeasure)
                                    .replace(/{endMeasure}/g, endMeasure)
                                    .replace(/{totalNotes}/g, filteredNotes.length)
                                    .replace(/{measureDurationBeats}/g, measureDurationBeats);

                                // Show loading box immediately
                                createLoadingAiBox(pianoRollSlot, `${instrumentName} (Measures ${startMeasure}-${endMeasure})`);

                                try {
                                    const aiResponse = await fetch('/api/analyze_with_ai', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            piano_roll_data: [filteredInstrumentData],
                                            prompt: sectionPrompt,
                                            agent_type: appConfig.agent || 'remote'
                                        })
                                    });
                                    if (!aiResponse.ok) throw new Error('Error obtaining Section Analysis');
                                    const aiData = await aiResponse.json();
                                    if (aiData.analysis_result) {
                                        displayAiAnalysisResultInBox(aiData.analysis_result, pianoRollSlot, `${instrumentName} (Measures ${startMeasure}-${endMeasure})`);
                                    } else {
                                        updateAiBoxError(pianoRollSlot, 'AI response contains no results.');
                                    }
                                } catch (error) {
                                    console.error('Section Analysis Error:', error);
                                    updateAiBoxError(pianoRollSlot, 'Error in Section Analysis: ' + error.message);
                                }
                            });
                        }

                        // Render chart after a slight delay to ensure DOM is ready
                        setTimeout(() => {
                            const measureDurationBeats = analysisData.general_info.measure_duration_beats || 4;
                            renderPianoRoll(chartContainerId, instrumentPianoData, measureDurationBeats);
                            
                            // Add visualization toggle (piano roll <-> staff notation)
                            addVisualizationToggle(pianoRollSlot, chartContainerId, instrumentPianoData, measureDurationBeats);
                        }, 200);
                    } else {
                        console.error(`No piano data found for ${instrumentName}`);
                    }
                });
            })
            .catch(err => console.error('Error loading piano roll data:', err));
    }

    if (analysisData.harmonic_analysis) {
        // Pass harmonic analysis data as sectionData
        reportContent.appendChild(createCollapsibleBox('🎹 Harmonic Analysis', formatHarmonicAnalysis(analysisData.harmonic_analysis), analysisData.harmonic_analysis));
    }

    resultSection.style.display = 'none';
    reportViewSection.style.display = 'block';

    setTimeout(() => {
        window.scrollTo({ top: reportViewSection.offsetTop - 20, behavior: 'smooth' });
    }, 100);

    initializeCollapsibles();
}

function renderPianoRoll(containerId, instrument, measureDurationBeats = 4) {
    console.log(`renderPianoRoll called for container: ${containerId}, instrument: ${instrument.name}, measure beats: ${measureDurationBeats}`);

    if (!instrument) {
        console.error('No instrument data provided to renderPianoRoll');
        return;
    }

    const notes = instrument.notes;
    console.log(`Rendering ${notes.length} notes for ${instrument.name}`);

    // Calculate max pitch for Y-axis
    const maxPitch = Math.max(...notes.map(n => n.pitch), 60);
    const minPitch = Math.min(...notes.map(n => n.pitch), 20);

    // Calculate max time for X-axis
    const maxTime = Math.max(...notes.map(n => n.start + n.duration), 1);

    // Create shapes for note rectangles only
    const noteShapes = notes.map(note => ({
        type: 'rect',
        x0: note.start,
        x1: note.start + note.duration,
        y0: note.pitch - 0.4,
        y1: note.pitch + 0.4,
        fillcolor: getComputedStyle(document.documentElement).getPropertyValue('--accent-blue'),
        line: { width: 0 },
        layer: 'below'
    }));

    const layout = {
        title: {
            text: `Piano Roll - ${instrument.name}`,
            font: { color: getComputedStyle(document.documentElement).getPropertyValue('--secondary-text'), size: 12 }
        },
        xaxis: {
            title: `Time (${measureDurationBeats} beats per measure)`,
            showgrid: true,
            zeroline: true,
            gridcolor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
            gridwidth: 1,
            tickmode: 'auto',
            range: [-0.5, maxTime + 0.5]
        },
        yaxis: {
            title: 'Pitch (MIDI)',
            showgrid: true,
            zeroline: false,
            gridcolor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
            gridwidth: 1,
            tickmode: 'auto',
            range: [minPitch - 1, maxPitch + 1]
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--light-text')
        },
        shapes: noteShapes,
        height: 300,
        margin: { t: 30, r: 20, b: 60, l: 60 },
        dragmode: 'pan',
        hovermode: 'closest'
    };

    const trace = {
        x: notes.map(n => n.start + n.duration / 2),
        y: notes.map(n => n.pitch),
        text: notes.map(n => `${n.name}<br>Start: ${n.start}<br>Dur: ${n.duration}<br>Velocity: ${n.velocity}`),
        mode: 'markers',
        marker: { opacity: 0 },
        hoverinfo: 'text'
    };

    const config = {
        responsive: true,
        scrollZoom: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'zoom2d', 'autoScale2d']
    };

    Plotly.newPlot(containerId, [trace], layout, config);

    // Fix zoom state after scroll wheel zoom
    const plotElement = document.getElementById(containerId);
    let zoomTimeout;

    plotElement.on('plotly_relayout', function (data) {
        // Detect scroll wheel zoom events (they trigger xaxis.range changes)
        if (data['xaxis.range[0]'] !== undefined || data['yaxis.range[0]'] !== undefined) {
            // Clear any pending timeout
            clearTimeout(zoomTimeout);

            // After zoom completes, force the layout to stay fixed
            zoomTimeout = setTimeout(function () {
                const currentLayout = plotElement.layout;
                const updates = {};

                // Fix the current ranges to prevent auto-reset
                updates['xaxis.range'] = [currentLayout.xaxis.range[0], currentLayout.xaxis.range[1]];
                updates['yaxis.range'] = [currentLayout.yaxis.range[0], currentLayout.yaxis.range[1]];

                Plotly.relayout(containerId, updates);
            }, 100);
        }
    });
}

function closeReportView() {
    reportViewSection.style.display = 'none';
    resultSection.style.display = 'block';
    window.scrollTo({ top: resultSection.offsetTop - 20, behavior: 'smooth' });
}

function createCollapsibleBox(title, contentHtml, sectionData = null) {
    const box = document.createElement('div');
    box.className = 'collapsible-box';  // Start closed by default

    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.innerHTML = `
        <span class="collapsible-title">${title}</span>
        <span class="collapsible-icon">▼</span>
    `;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'collapsible-content';

    const body = document.createElement('div');
    body.className = 'collapsible-body';

    if (sectionData) {
        // 1. Piano Roll Slot (Top)
        const pianoRollSlot = document.createElement('div');
        pianoRollSlot.className = 'piano-roll-slot';
        pianoRollSlot.style.width = '100%';
        pianoRollSlot.style.marginBottom = '20px';
        body.appendChild(pianoRollSlot);

        // 2. Split View Container (Bottom)
        const splitView = document.createElement('div');
        splitView.className = 'split-view';
        splitView.style.display = 'flex';
        splitView.style.gap = '20px';
        splitView.style.flexWrap = 'wrap';

        // Analysis Content
        const analysisContent = document.createElement('div');
        analysisContent.className = 'analysis-content';
        analysisContent.style.flex = '1';
        analysisContent.style.minWidth = '300px';
        analysisContent.innerHTML = contentHtml;
        splitView.appendChild(analysisContent);

        // AI Panel
        const aiPanel = document.createElement('div');
        aiPanel.className = 'ai-panel';
        aiPanel.style.flex = '1';
        aiPanel.style.minWidth = '300px';
        renderAIPanel(aiPanel, sectionData, title);
        splitView.appendChild(aiPanel);

        body.appendChild(splitView);
    } else {
        body.innerHTML = contentHtml;
    }

    contentDiv.appendChild(body);
    box.appendChild(header);
    box.appendChild(contentDiv);

    return box;
}

function formatGeneralInfo(data) {
    const info = data.general_info;
    return `
        <p><strong>Title:</strong> <span class="highlight-value">${data.title}</span></p>
        <p><strong>Total Instruments:</strong> <span class="highlight-value">${info.total_instruments}</span></p>
        <p><strong>Overall Key:</strong> <span class="highlight-value">${info.overall_key}</span></p>
        <p><strong>Total Measures:</strong> <span class="highlight-value">${info.total_measures}</span></p>
        <p><strong>Time Signatures:</strong> <span class="highlight-value">${info.time_signatures.join(', ')}</span></p>
        <div class="section-divider"></div>
        <h4>Instruments:</h4>
        <ul>
            ${info.instrument_names.map(name => `<li>${name}</li>`).join('')}
        </ul>
        <div class="section-divider"></div>
        <h4>Notes per Instrument:</h4>
        <ul>
            ${Object.entries(info.notes_per_instrument).map(([inst, count]) =>
        `<li><strong>${inst}:</strong> <span class="highlight-value">${count}</span> notes</li>`
    ).join('')}
        </ul>
    `;
}

function formatMelodicAnalysis(data) {
    let html = '';

    if (data.intervals) {
        html += `
            <h4>🎼 Most Common Intervals:</h4>
            <ul>
                ${Object.entries(data.intervals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([interval, count]) =>
                    `<li><strong>${interval}:</strong> <span class="highlight-value">${count}</span> occurrences</li>`
                ).join('')}
            </ul>
            <div class="section-divider"></div>
        `;
    }

    if (data.ascending !== undefined) {
        html += `
            <h4>📈 Melodic Direction:</h4>
            <ul>
                <li><strong>Ascending:</strong> <span class="highlight-value">${data.ascending}</span></li>
                <li><strong>Descending:</strong> <span class="highlight-value">${data.descending}</span></li>
                <li><strong>Mean Direction:</strong> <span class="highlight-value">${data.mean_direction}</span></li>
            </ul>
            <div class="section-divider"></div>
        `;
    }

    if (data.rhythm) {
        html += `
            <h4>🥁 Rhythmic Analysis:</h4>
            <p><strong>Note Density:</strong> <span class="highlight-value">${data.rhythm.density.toFixed(2)}</span> notes per measure</p>
            <h4>Rhythmic Values:</h4>
            <ul>
                ${Object.entries(data.rhythm.values)
                .sort((a, b) => b[1] - a[1])
                .map(([value, count]) =>
                    `<li><strong>${value}:</strong> <span class="highlight-value">${count}</span> occurrences</li>`
                ).join('')}
            </ul>
        `;
    }

    return html || '<p>No melodic analysis available</p>';
}

function formatHarmonicAnalysis(data) {
    let html = `
        <p><strong>Selected Instruments:</strong> <span class="highlight-value">${data.selected_instruments.join(', ')}</span></p>
        <p><strong>Reduction Key:</strong> <span class="highlight-value">${data.reduction_key}</span></p>
        <div class="section-divider"></div>
        <h4>🎹 Chords and Tonal Functions per Measure:</h4>
    `;

    data.chord_report.forEach(measure => {
        html += `
            <div style="margin: 15px 0; padding: 15px; background: rgba(255, 255, 255, 0.02); border-radius: 8px;">
                <p><strong>Measure ${measure.measure}:</strong></p>
                <p style="margin-left: 20px;">
                    <strong>Chords:</strong> <span class="highlight-value">${measure.chords.join(', ')}</span>
                </p>
                <p style="margin-left: 20px;">
                    <strong>Tonal Functions:</strong> <span class="highlight-value">${measure.tonal_functions.join(', ')}</span>
                </p>
            </div>
        `;
    });

    return html;
}

function renderAIPanel(container, sectionData, sectionTitle) {
    container.innerHTML = `
        <div class="ai-panel-header">
            <span>🤖 AI Analysis</span>
        </div>
        
        <div class="ai-control-group">
            <label>Model Source:</label>
            <select class="ai-select" id="ai-source-${Date.now()}">
                <!-- Options populated via JS -->
            </select>
        </div>

        <div class="ai-control-group">
            <label>Model:</label>
            <input type="text" class="ai-input" placeholder="Ex: gpt-3.5-turbo" value="">
        </div>

        <div class="ai-control-group">
            <label>Prompt:</label>
            <select class="ai-select prompt-select">
                <option value="">Select a prompt...</option>
            </select>
        </div>

        <div class="ai-buttons-row" style="display: flex; gap: 10px; margin-top: 10px;">
            <button class="ai-analyze-btn" style="flex: 1;">
                <span>⚡ Analyze</span>
            </button>
            <button class="ai-clear-btn" style="background: transparent; border: 1px solid var(--border-color); color: var(--secondary-text); padding: 0 15px; border-radius: 6px; cursor: pointer;">
                🗑️
            </button>
        </div>

        <div class="ai-loading">
            <div class="ai-spinner"></div>
            <p>Processing...</p>
        </div>

        <div class="ai-result-box">
            <div class="ai-actions">
                <button class="ai-action-btn copy-btn">Copy</button>
                <button class="ai-action-btn export-btn">Export TXT</button>
            </div>
            <div class="ai-result-content"></div>
        </div>
    `;

    // Get elements
    const sourceSelect = container.querySelector('select[id^="ai-source"]');
    const modelInput = container.querySelector('.ai-input');
    const promptSelect = container.querySelector('.prompt-select');
    const analyzeBtn = container.querySelector('.ai-analyze-btn');
    const clearBtn = container.querySelector('.ai-clear-btn');
    const loadingDiv = container.querySelector('.ai-loading');
    const resultBox = container.querySelector('.ai-result-box');
    const resultContent = container.querySelector('.ai-result-content');
    const copyBtn = container.querySelector('.copy-btn');
    const exportBtn = container.querySelector('.export-btn');

    // Populate Source Options based on available keys
    // Populate Source Options based on available keys
    const remoteKey = appConfig.remoteApiKey;
    const localKey = appConfig.localApiKey; // Optional for local but usually implies config exists
    const localUrl = appConfig.localApiUrl;

    let hasSource = false;

    if (remoteKey) {
        const opt = document.createElement('option');
        opt.value = 'remote';
        opt.textContent = 'Online (OpenAI Compatible)';
        sourceSelect.appendChild(opt);
        hasSource = true;
    }

    if (localUrl) { // Check URL for local as key might be empty
        const opt = document.createElement('option');
        opt.value = 'local';
        opt.textContent = 'Local (LM Studio/LocalAI)';
        sourceSelect.appendChild(opt);
        hasSource = true;
    }

    if (!hasSource) {
        const opt = document.createElement('option');
        opt.textContent = 'No API configured';
        sourceSelect.appendChild(opt);
        sourceSelect.disabled = true;
        analyzeBtn.disabled = true;
    }

    // Populate Prompts
    // Populate Prompts
    const contextPhrases = (appConfig.contextPhrases || defaultContextPhrases.join('\n')).split('\n');
    contextPhrases.forEach(phrase => {
        if (phrase.trim()) {
            const option = document.createElement('option');
            option.value = phrase.trim();
            option.textContent = phrase.trim().substring(0, 50) + (phrase.length > 50 ? '...' : '');
            promptSelect.appendChild(option);
        }
    });

    // Set initial model based on source
    const updateModelInput = () => {
        if (sourceSelect.disabled) return;

        const source = sourceSelect.value;
        const savedModel = source === 'remote'
            ? appConfig.remoteModel
            : appConfig.localModel;
        modelInput.value = savedModel || (source === 'remote' ? 'gpt-3.5-turbo' : 'local-model');
    };

    sourceSelect.addEventListener('change', updateModelInput);
    updateModelInput();

    // Analyze Action
    analyzeBtn.addEventListener('click', () => {
        const source = sourceSelect.value;
        const model = modelInput.value;
        const prompt = promptSelect.value;

        if (!model) {
            alert('Please define the model name.');
            return;
        }
        if (!prompt) {
            alert('Please select a prompt.');
            return;
        }

        // Find the visible content from the sibling element
        const analysisContentDiv = container.parentElement.querySelector('.analysis-content');
        const visibleText = analysisContentDiv ? analysisContentDiv.innerText : JSON.stringify(sectionData, null, 2);

        performAIAnalysis(source, model, prompt, visibleText, sectionTitle, resultBox, resultContent, loadingDiv);
    });

    // Clear Action
    clearBtn.addEventListener('click', () => {
        resultBox.classList.remove('active');
        resultContent.textContent = '';
        loadingDiv.classList.remove('active');
    });

    // Copy Action
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultContent.textContent).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    });

    // Export Action
    exportBtn.addEventListener('click', () => {
        const text = resultContent.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analise_IA_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

async function performAIAnalysis(source, model, prompt, contentText, sectionTitle, resultBox, resultContent, loadingDiv) {
    loadingDiv.classList.add('active');
    resultBox.classList.remove('active');

    const baseUrl = source === 'remote'
        ? appConfig.remoteApiUrl
        : appConfig.localApiUrl;

    const apiKey = source === 'remote'
        ? appConfig.remoteApiKey
        : appConfig.localApiKey;

    if (!baseUrl) {
        alert('API URL not configured. Check Advanced Options.');
        loadingDiv.classList.remove('active');
        return;
    }

    // Construct the prompt as requested:
    // 1. Selected Prompt
    // 2. Section Title
    // 3. Visible Report Content
    // 4. Fixed Prompt
    // Changed "devolve a informação" to "Analise os dados" to avoid echoing
    const fixedPrompt = appConfig.aiPrompts?.general_ai_panel || "Based on the data above, answer the initial prompt. Do not repeat the raw data. Answer only with the analysis in English, without unnecessary introductions.";
    const fullPrompt = `${prompt}\n\nContext: ${sectionTitle}\n\nReport Content:\n${contentText}\n\n${fixedPrompt}`;

    console.log('Sending Prompt to AI:', fullPrompt);

    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "user", content: fullPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('AI Response:', result);

        const content = result.choices[0]?.message?.content || "No response from AI.";

        // Parse Markdown if marked is available, otherwise use plain text
        if (typeof marked !== 'undefined') {
            resultContent.innerHTML = marked.parse(content);
        } else {
            resultContent.textContent = content;
        }

        resultBox.classList.add('active');

    } catch (error) {
        alert(`Analysis failed: ${error.message}`);
        console.error(error);
    } finally {
        loadingDiv.classList.remove('active');
    }
    // Piano Roll AI Analysis Function
    async function analyzePianoRollWithAI(instrumentData, button, resultBox, resultContent) {
        if (!instrumentData || !instrumentData.notes || instrumentData.notes.length === 0) {
            alert('No note data to analyze.');
            return;
        }

        // Get model selection from button's dataset
        const modelConfig = button.dataset.modelConfig;
        if (!modelConfig) {
            alert('Error: Model configuration not found.');
            return;
        }

        const [source, model] = modelConfig.split('|');

        if (!model) {
            alert('Please select a model.');
            return;
        }

        // Check if API is configured
        const hasRemote = appConfig.remoteApiKey;
        const hasLocal = appConfig.localApiUrl;

        if (!hasRemote && !hasLocal) {
            alert('Please configure an AI API in Advanced Options first.');
            return;
        }

        // Show loading state
        button.disabled = true;
        button.textContent = '⏳ Analyzing...';
        resultBox.style.display = 'none';

        try {
            // Statistical Analysis
            const stats = analyzePianoRollStatistics(instrumentData.notes);

            // Build comprehensive prompt - use dynamic template from config
            let basePrompt = appConfig.aiPrompts?.piano_roll_analysis || `# Piano Roll Analysis: {instrumentName}

## Statistical Data

**General Information:**
- Total notes: {totalNotes}
- Range: {minPitch} to {maxPitch} ({pitchRange} semitones)
- Total duration: {totalDuration} beats
- Average duration per note: {avgDuration} beats

**Most Common Melodic Intervals:**
{topIntervals}

**Identified Rhythmic Patterns:**
{rhythmicPatterns}

**First 20 Notes (for context):**
{firstNotes}

---

## Analysis Task

Please provide a **complete and detailed** musical analysis of this Piano Roll, including:

### 1. **Melodic Contour**
- Describe the general direction (ascending, descending, undulating, static)
- Identify climax points or important moments
- Analyze the tessitura used

### 2. **Interval Analysis**
- Interpret the musical meaning of the most common intervals
- Identify if there is a preference for steps or leaps
- Comment on the expressive function of the intervals

### 3. **Rhythmic Characteristics**
- Analyze the predominant rhythmic patterns
- Identify rhythmic regularity or variation
- Comment on the rhythmic character (fluid, syncopated, regular, etc.)

### 4. **Motifs and Repetitions**
- Identify possible recurrent melodic motifs
- Detect sequences or repetitive patterns
- Analyze the suggested formal structure

### 5. **Harmonic Context and Interpretation**
- Suggest possible harmonic functions
- Recommend interpretive approaches
- Comment on the suggested musical style or period

**Format:** Answer in **English**, using **Markdown** to structure the response (headings, lists, bold, etc.). Be clear, objective, and musically informative.`;
            
            // Replace placeholders with actual data
            const prompt = basePrompt
                .replace('{instrumentName}', instrumentData.name)
                .replace('{totalNotes}', stats.totalNotes)
                .replace('{minPitch}', stats.pitchRange.minName)
                .replace('{maxPitch}', stats.pitchRange.maxName)
                .replace('{pitchRange}', stats.pitchRange.max - stats.pitchRange.min)
                .replace('{totalDuration}', stats.totalDuration.toFixed(2))
                .replace('{avgDuration}', stats.avgDuration.toFixed(2))
                .replace('{topIntervals}', stats.topIntervals.join(', '))
                .replace('{rhythmicPatterns}', stats.rhythmicPatterns.join(', '))
                .replace('{firstNotes}', stats.firstNotes);

            // Determine API settings based on source
            const useRemote = source === 'remote';
            const apiUrl = useRemote
                ? 'https://api.openai.com/v1/chat/completions'
                : appConfig.localApiUrl;
            const apiKey = useRemote ? appConfig.remoteApiKey : (appConfig.localApiKey || '');

            console.log(`Piano Roll AI Analysis - Source: ${source}, Model: ${model}, URL: ${apiUrl}`);

            // Make API request
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a music analysis expert with deep knowledge of theory, harmony, and interpretation. Analyze Piano Roll data and provide detailed and pedagogically useful musical insights.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error ${response.status}: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            console.log('Piano Roll AI Response received:', aiResponse.substring(0, 100) + '...');

            // Display result with markdown rendering
            resultContent.innerHTML = marked.parse(aiResponse);
            resultBox.style.display = 'block';

        } catch (error) {
            alert(`Analysis error: ${error.message}`);
            console.error('Piano Roll AI Analysis Error:', error);
        } finally {
            button.disabled = false;
            button.textContent = '🤖 Analyze Piano Roll with AI';
        }
    }

    // Statistical Analysis Helper
    function analyzePianoRollStatistics(notes) {
        const totalNotes = notes.length;

        // Pitch analysis
        const pitches = notes.map(n => n.pitch);
        const pitchRange = {
            min: Math.min(...pitches),
            max: Math.max(...pitches),
            minName: notes.find(n => n.pitch === Math.min(...pitches)).name,
            maxName: notes.find(n => n.pitch === Math.max(...pitches)).name
        };

        // Duration analysis
        const durations = notes.map(n => n.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / totalNotes;
        const totalDuration = notes[notes.length - 1].start + notes[notes.length - 1].duration;

        // Interval analysis
        const intervals = [];
        for (let i = 1; i < notes.length; i++) {
            const interval = Math.abs(notes[i].pitch - notes[i - 1].pitch);
            intervals.push(interval);
        }

        const intervalCounts = {};
        intervals.forEach(int => {
            intervalCounts[int] = (intervalCounts[int] || 0) + 1;
        });

        const topIntervals = Object.entries(intervalCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([interval, count]) => {
                const names = ['unison', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
                return `${names[interval] || interval + ' semitones'} (${count}x)`;
            });

        // Rhythmic patterns
        const rhythmPatterns = {};
        for (let i = 0; i < Math.min(notes.length - 2, 50); i++) {
            const pattern = `${notes[i].duration.toFixed(2)}-${notes[i + 1].duration.toFixed(2)}-${notes[i + 2].duration.toFixed(2)}`;
            rhythmPatterns[pattern] = (rhythmPatterns[pattern] || 0) + 1;
        }

        const topRhythms = Object.entries(rhythmPatterns)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([pattern]) => pattern);

        // First notes for context
        const firstNotes = notes.slice(0, 20)
            .map(n => `${n.name} (start: ${n.start.toFixed(1)}, duration: ${n.duration.toFixed(2)})`)
            .join('\n');

        return {
            totalNotes,
            pitchRange,
            avgDuration,
            totalDuration,
            topIntervals,
            rhythmicPatterns: topRhythms,
            firstNotes
        };
    }
}

function displayAiAnalysisResult(markdownContent) {
    const modal = document.getElementById('ai-analysis-modal');
    const contentDiv = document.getElementById('ai-analysis-content');

    // Convert markdown to HTML using the `marked` library
    contentDiv.innerHTML = marked.parse(markdownContent);

    modal.style.display = 'block';

    // Close modal logic
    const closeAiModal = document.getElementById('close-ai-modal');

    closeAiModal.onclick = function () {
        modal.style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

function displayAiAnalysisResultInBox(markdownContent, pianoRollSlot, instrumentName) {
    // Remove existing AI analysis box if present
    const existingBox = pianoRollSlot.querySelector('.ai-analysis-box');
    if (existingBox) {
        existingBox.remove();
    }

    // Create a collapsible box for the AI analysis
    const aiBox = document.createElement('div');
    aiBox.className = 'ai-analysis-box';
    aiBox.style.marginTop = '20px';
    aiBox.style.border = '2px solid var(--accent-purple)';
    aiBox.style.borderRadius = '8px';
    aiBox.style.overflow = 'hidden';
    aiBox.style.backgroundColor = 'var(--bg-secondary)';

    // Create header
    const header = document.createElement('div');
    header.className = 'ai-analysis-header';
    header.style.cssText = `
        background: linear-gradient(135deg, var(--accent-purple), #9c27b0);
        color: white;
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
    `;
    header.innerHTML = `
        <span style="font-weight: 600; font-size: 1rem;">🤖 AI Analysis - ${instrumentName}</span>
        <span style="font-size: 1.2rem; transition: transform 0.3s;">▼</span>
    `;

    // Create toolbar for copy and download buttons
    const toolbar = document.createElement('div');
    toolbar.className = 'ai-analysis-toolbar';
    toolbar.style.cssText = `
        display: none;
        padding: 12px 16px;
        background: var(--bg-tertiary);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    `;

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'ai-action-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.style.cssText = `
        background: var(--accent-blue);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s;
    `;
    copyBtn.addEventListener('mouseover', () => {
        copyBtn.style.transform = 'translateY(-2px)';
        copyBtn.style.boxShadow = '0 4px 8px rgba(33, 150, 243, 0.3)';
    });
    copyBtn.addEventListener('mouseout', () => {
        copyBtn.style.transform = 'translateY(0)';
        copyBtn.style.boxShadow = 'none';
    });
    copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(markdownContent);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            alert('Error copying: ' + err.message);
        }
    });

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'ai-action-btn';
    downloadBtn.innerHTML = '⬇️ Download MD';
    downloadBtn.style.cssText = `
        background: var(--success-green);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.3s;
    `;
    downloadBtn.addEventListener('mouseover', () => {
        downloadBtn.style.transform = 'translateY(-2px)';
        downloadBtn.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.3)';
    });
    downloadBtn.addEventListener('mouseout', () => {
        downloadBtn.style.transform = 'translateY(0)';
        downloadBtn.style.boxShadow = 'none';
    });
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `Analise_IA_${instrumentName.replace(/\s+/g, '_')}_${timestamp}.md`;
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdownContent));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    });

    toolbar.appendChild(copyBtn);
    toolbar.appendChild(downloadBtn);

    // Create content container
    const content = document.createElement('div');
    content.className = 'ai-analysis-content';
    content.style.cssText = `
        padding: 16px;
        max-height: 600px;
        overflow-y: auto;
        display: block;
    `;
    content.innerHTML = marked.parse(markdownContent);

    // Toggle functionality
    let isOpen = true;
    header.addEventListener('click', () => {
        isOpen = !isOpen;
        content.style.display = isOpen ? 'block' : 'none';
        toolbar.style.display = isOpen ? 'flex' : 'none';
        const arrow = header.querySelector('span:last-child');
        arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    aiBox.appendChild(header);
    aiBox.appendChild(toolbar);
    aiBox.appendChild(content);
    pianoRollSlot.appendChild(aiBox);
}

function createLoadingAiBox(pianoRollSlot, instrumentName) {
    // Remove existing AI analysis box if present
    const existingBox = pianoRollSlot.querySelector('.ai-analysis-box');
    if (existingBox) {
        existingBox.remove();
    }

    // Create a collapsible box for the AI analysis
    const aiBox = document.createElement('div');
    aiBox.className = 'ai-analysis-box';
    aiBox.style.marginTop = '20px';
    aiBox.style.border = '2px solid var(--accent-purple)';
    aiBox.style.borderRadius = '8px';
    aiBox.style.overflow = 'hidden';
    aiBox.style.backgroundColor = 'var(--bg-secondary)';

    // Create header
    const header = document.createElement('div');
    header.className = 'ai-analysis-header';
    header.style.cssText = `
        background: linear-gradient(135deg, var(--accent-purple), #9c27b0);
        color: white;
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
    `;
    header.innerHTML = `
        <span style="font-weight: 600; font-size: 1rem;">🤖 AI Analysis - ${instrumentName}</span>
        <span style="font-size: 1.2rem; transition: transform 0.3s;">▼</span>
    `;

    // Create content container with loading animation
    const content = document.createElement('div');
    content.className = 'ai-analysis-content';
    content.style.cssText = `
        padding: 16px;
        max-height: 800px;
        overflow-y: auto;
        display: block;
    `;
    content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="display: inline-block; margin-bottom: 10px;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--accent-purple);
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                " id="loading-spinner"></div>
            </div>
            <p style="color: var(--text-secondary); font-weight: 500; margin: 10px 0;">Processing...</p>
            <p style="color: var(--text-tertiary); font-size: 0.9rem;">Analyzing Piano Roll with AI. Please wait...</p>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    // Toggle functionality
    let isOpen = true;
    header.addEventListener('click', () => {
        isOpen = !isOpen;
        content.style.display = isOpen ? 'block' : 'none';
        const arrow = header.querySelector('span:last-child');
        arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    aiBox.appendChild(header);
    aiBox.appendChild(content);
    pianoRollSlot.appendChild(aiBox);
}

function updateAiBoxError(pianoRollSlot, errorMessage) {
    const existingBox = pianoRollSlot.querySelector('.ai-analysis-box');
    if (existingBox) {
        const content = existingBox.querySelector('.ai-analysis-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #ff6b6b;">
                    <p style="font-weight: 500; margin: 10px 0;">❌ Analysis Error</p>
                    <p style="color: var(--text-secondary); font-size: 0.95rem;">${errorMessage}</p>
                </div>
            `;
        }
    }
}

/* ========================================
   COMPARISON TAB FUNCTIONALITY
   ======================================== */

const INSTRUMENT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#82E0AA'
];

let comparisonState = {
    selectedInstruments: [],
    visibleInstruments: new Set(),
    instrumentColors: {}
};

function initComparisonTab() {
    // When a file is loaded, populate comparison instruments
    const compareTab = document.querySelector('[data-tab="comparison"]');
    if (!compareTab) return;
}

function populateComparisonInstruments(instrumentNames) {
    const container = document.getElementById('comparison-instruments');
    if (!container) return;

    container.innerHTML = '';

    instrumentNames.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'instrument-comparison-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `comparison-instrument-${index}`;
        checkbox.value = index;
        checkbox.dataset.instrumentName = name;

        checkbox.addEventListener('change', () => {
            updateComparisonSelection();
        });

        const label = document.createElement('label');
        label.htmlFor = `comparison-instrument-${index}`;
        label.textContent = name;

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

function updateComparisonSelection() {
    const checkboxes = document.querySelectorAll('#comparison-instruments input[type="checkbox"]');
    const selected = Array.from(checkboxes).filter(cb => cb.checked);

    // Limit to 5 instruments
    if (selected.length > 5) {
        selected[selected.length - 1].checked = false;
        return;
    }

    // Update comparison state
    comparisonState.selectedInstruments = selected.map(cb => ({
        index: parseInt(cb.value),
        name: cb.dataset.instrumentName
    }));

    // Initialize visible set and colors
    comparisonState.visibleInstruments.clear();
    comparisonState.instrumentColors = {};

    comparisonState.selectedInstruments.forEach((instr, idx) => {
        comparisonState.visibleInstruments.add(instr.index);
        comparisonState.instrumentColors[instr.index] = INSTRUMENT_COLORS[idx % INSTRUMENT_COLORS.length];
    });

    // Disable checkboxes if max selected
    checkboxes.forEach(cb => {
        const isSelected = cb.checked;
        const isDisabled = selected.length >= 5 && !isSelected;

        cb.disabled = isDisabled;
        cb.closest('.instrument-comparison-item').classList.toggle('disabled', isDisabled);
    });

    if (comparisonState.selectedInstruments.length > 0) {
        updateComparisonLegend();
        renderComparisonPianoRoll();

        // Show piano roll and legend, hide empty state
        document.getElementById('comparison-piano-roll-wrapper').style.display = 'block';
        document.getElementById('comparison-legend-container').style.display = 'block';
        document.getElementById('comparison-empty-state').style.display = 'none';
    } else {
        // Hide piano roll and legend, show empty state
        document.getElementById('comparison-piano-roll-wrapper').style.display = 'none';
        document.getElementById('comparison-legend-container').style.display = 'none';
        document.getElementById('comparison-empty-state').style.display = 'block';
    }
}

function updateComparisonLegend() {
    const legendContainer = document.getElementById('comparison-legend-items');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';

    comparisonState.selectedInstruments.forEach(instr => {
        const color = comparisonState.instrumentColors[instr.index];

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.dataset.instrumentIndex = instr.index;

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color-box';
        colorBox.style.backgroundColor = color;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.instrumentIndex = instr.index;

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                comparisonState.visibleInstruments.add(instr.index);
            } else {
                comparisonState.visibleInstruments.delete(instr.index);
            }
            updateComparisonPianoRoll();
        });

        const label = document.createElement('label');
        label.textContent = instr.name;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(checkbox);
        legendItem.appendChild(label);
        legendContainer.appendChild(legendItem);
    });
}

function renderComparisonPianoRoll() {
    // Fetch data for selected instruments
    const instrumentIndices = comparisonState.selectedInstruments.map(i => i.index);

    fetch('/comparison_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            file_path: currentFilePath,
            instrument_indices: instrumentIndices,
            measure_duration_beats: 4 // Default, will be updated
        })
    })
        .then(response => response.json())
        .then(data => {
            comparisonState.currentData = data; // Store data for AI analysis
            window.comparisonMeasureDuration = data.measure_duration_beats; // Store for highlighting
            updateComparisonPianoRoll(data);
        })
        .catch(error => {
            console.error('Error fetching comparison data:', error);
        });
}

function updateComparisonPianoRoll(data = null) {
    const containerId = 'comparison-piano-roll';
    const container = document.getElementById(containerId);

    if (!container) return;

    if (!data) {
        // If no data provided, just refresh visibility
        if (window.comparisonPlotlyInstance) {
            // Filter shapes based on visible instruments
            const allShapes = window.comparisonPlotlyInstance.data;
            // Update Plotly to show/hide shapes
            Plotly.restyle(containerId, { visible: true });
        }
        return;
    }

    const shapes = [];
    const minTime = 0;
    let maxTime = 0;

    // Build shapes for each visible instrument
    data.instruments.forEach(instr => {
        if (!comparisonState.visibleInstruments.has(instr.index)) {
            return;
        }

        const color = comparisonState.instrumentColors[instr.index];

        instr.notes.forEach(note => {
            const noteData = note;
            const duration = noteData.duration || 0.5;

            shapes.push({
                type: 'rect',
                x0: noteData.start_time,
                x1: noteData.start_time + duration,
                y0: noteData.pitch - 0.4,
                y1: noteData.pitch + 0.4,
                fillcolor: color,
                opacity: 0.6,
                line: {
                    color: color,
                    width: 1
                },
                name: instr.name,
                hovertemplate: `<b>${instr.name}</b><br>Pitch: ${noteData.pitch}<br>Tempo: ${noteData.start_time.toFixed(2)}<extra></extra>`
            });

            maxTime = Math.max(maxTime, noteData.start_time + duration);
        });
    });

    const measureDurationBeats = data.measure_duration_beats || 4;

    const layout = {
        title: 'Comparative Piano Roll',
        xaxis: {
            title: 'Time (beats)',
            zeroline: false,
            gridcolor: 'rgba(128, 128, 128, 0.2)',
            tickmode: 'auto',
            nticks: 10,
            range: [minTime - 0.5, maxTime + 0.5]
        },
        yaxis: {
            title: 'Pitch (MIDI)',
            zeroline: false,
            gridcolor: 'rgba(128, 128, 128, 0.2)',
            dtick: 1,
            range: [20, 100]
        },
        plot_bgcolor: 'rgba(20, 20, 30, 0.5)',
        paper_bgcolor: 'transparent',
        hovermode: 'closest',
        margin: { l: 60, r: 20, t: 40, b: 60 },
        height: 500,
        dragmode: 'pan',
        uirevision: 'true'
    };

    const config = {
        responsive: true,
        scrollZoom: true,
        displayModeBar: true
    };

    const plotData = [{
        y: [],
        mode: 'markers',
        opacity: 0
    }];

    Plotly.newPlot(containerId, plotData, layout, config);

    // Add shapes
    Plotly.relayout(containerId, { shapes: shapes });

    // Store instance for later reference
    window.comparisonPlotlyInstance = document.getElementById(containerId);

    // Add event listener for scroll zoom
    const plotElement = document.getElementById(containerId);
    let zoomTimeout;

    plotElement.on('plotly_relayout', function (data) {
        // Detect scroll wheel zoom events (they trigger xaxis.range changes)
        if (data['xaxis.range[0]'] !== undefined || data['yaxis.range[0]'] !== undefined) {
            // Clear any pending timeout
            clearTimeout(zoomTimeout);

            // After zoom completes, force the layout to stay fixed
            zoomTimeout = setTimeout(function () {
                const currentLayout = plotElement.layout;
                const updates = {};

                // Fix the current ranges to prevent auto-reset
                updates['xaxis.range'] = [currentLayout.xaxis.range[0], currentLayout.xaxis.range[1]];
                updates['yaxis.range'] = [currentLayout.yaxis.range[0], currentLayout.yaxis.range[1]];

                Plotly.relayout(containerId, updates);
            }, 100);
        }
    });
}

// Initialize comparison tab when DOM is ready
document.addEventListener('DOMContentLoaded', initComparisonTab);


// Comparison Tab - Measure Selection and AI Analysis logic

document.addEventListener('DOMContentLoaded', function () {
    // Highlight Button
    const highlightBtn = document.getElementById('comp-highlight-btn');
    if (highlightBtn) {
        highlightBtn.addEventListener('click', updateComparisonHighlight);
    }

    // AI Analyze Button
    const aiAnalyzeBtn = document.getElementById('comp-ai-analyze-btn');
    if (aiAnalyzeBtn) {
        aiAnalyzeBtn.addEventListener('click', analyzeComparisonWithAI);
    }
});

function updateComparisonHighlight() {
    const startMeasure = parseInt(document.getElementById('comp-start-measure').value);
    const endMeasure = parseInt(document.getElementById('comp-end-measure').value);
    const containerId = 'comparison-piano-roll';

    if (isNaN(startMeasure) || isNaN(endMeasure) || startMeasure > endMeasure) {
        alert('Please enter a valid measure range.');
        return;
    }

    // A better approach: When fetching comparison data, store the measure_duration_beats in a global variable
    const measureDuration = window.comparisonMeasureDuration || 4;

    // Calculate time range (measures are 1-indexed usually)
    const startTime = (startMeasure - 1) * measureDuration;
    const endTime = endMeasure * measureDuration;

    const plotElement = document.getElementById(containerId);
    if (!plotElement || !plotElement.layout) return;

    // Add a shape for the highlight
    const highlightShape = {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: startTime,
        x1: endTime,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(255, 255, 255, 0.1)',
        line: {
            color: 'rgba(255, 255, 255, 0.5)',
            width: 2,
            dash: 'dot'
        },
        layer: 'above' // Draw on top of notes
    };

    // Let's try to update the layout with new shapes by appending to existing ones
    const currentShapes = plotElement.layout.shapes || [];

    // Filter out previous highlights (if any) to avoid accumulation
    const noteShapes = currentShapes.filter(s => s.fillcolor !== 'rgba(255, 255, 255, 0.1)');

    const newShapes = [...noteShapes, highlightShape];

    Plotly.relayout(containerId, { shapes: newShapes });

    // Zoom to the selected range
    Plotly.relayout(containerId, {
        'xaxis.range': [startTime - 1, endTime + 1]
    });
}

async function analyzeComparisonWithAI() {
    const startMeasure = parseInt(document.getElementById('comp-start-measure').value);
    const endMeasure = parseInt(document.getElementById('comp-end-measure').value);

    if (isNaN(startMeasure) || isNaN(endMeasure) || startMeasure > endMeasure) {
        alert('Please select a valid measure range for analysis.');
        return;
    }

    const resultContainer = document.getElementById('comparison-ai-result-container');

    // Check if we have data
    if (!comparisonState.selectedInstruments || comparisonState.selectedInstruments.length === 0) {
        alert('Select instruments to analyze.');
        return;
    }

    if (!comparisonState.currentData) {
        alert('Score data not found. Please reload the comparison.');
        return;
    }

    const measureDuration = comparisonState.currentData.measure_duration_beats || 4;
    const startTime = (startMeasure - 1) * measureDuration;
    const endTime = endMeasure * measureDuration;

    // Filter notes
    const filteredInstruments = [];

    comparisonState.currentData.instruments.forEach(instr => {
        // Only include visible/selected instruments
        if (!comparisonState.visibleInstruments.has(instr.index)) return;

        const filteredNotes = instr.notes.filter(note => {
            const noteEnd = note.start_time + note.duration;
            // Check if note overlaps with the range
            return (note.start_time >= startTime && note.start_time < endTime) ||
                (noteEnd > startTime && noteEnd <= endTime) ||
                (note.start_time <= startTime && noteEnd >= endTime);
        });

        if (filteredNotes.length > 0) {
            filteredInstruments.push({
                name: instr.name,
                notes: filteredNotes
            });
        }
    });

    if (filteredInstruments.length === 0) {
        alert('No notes found in the selected range for the visible instruments.');
        return;
    }

    // Prepare UI for AI result
    createLoadingAiBox(resultContainer, `Comparison (Measures ${startMeasure}-${endMeasure})`);

    // Format notes for the prompt
    let instrumentsDataString = "";
    filteredInstruments.forEach(inst => {
        const notesStr = inst.notes.map(n => `${n.name} (t:${n.start_time.toFixed(2)}-${(n.start_time + n.duration).toFixed(2)})`).join(', ');
        instrumentsDataString += `${inst.name} - ${notesStr}\n`;
    });

    // Prepare Prompt - use dynamic template from config
    let baseComparisonPrompt = appConfig.aiPrompts?.comparison_analysis || `You are a music analyst, provide a structured thought on the following information:
    
    Measures to analyze (highlighted measures) - Measure {startMeasure} to {endMeasure}
    
    {instrumentsData}
    
    Perform a detailed comparative analysis between the melodic lines of the selected instruments.
    
    Focus specifically on:
    1. **Melodic Relationship:** How do the melodies interact? Is there imitation, counterpoint, unison, or complementarity?
    2. **Instrumental Dialogue:** Identify questions and answers, or moments where one instrument takes the lead while the other accompanies.
    3. **Contrast and Similarity:** Compare the melodic contours, rhythms, and note density of each instrument in this excerpt.
    4. **Synthesis:** What is the resulting musical effect of this specific combination in this excerpt?`;
    
    const prompt = baseComparisonPrompt
        .replace('{startMeasure}', startMeasure)
        .replace('{endMeasure}', endMeasure)
        .replace('{instrumentsData}', instrumentsDataString);

    const fullPrompt = `Section: Instrument Comparison (Measures ${startMeasure}-${endMeasure})\n\nContext: ${prompt}`;

    try {
        const aiResponse = await fetch('/api/analyze_with_ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                piano_roll_data: filteredInstruments,
                prompt: fullPrompt,
                agent_type: appConfig.agent || 'remote'
            })
        });

        if (!aiResponse.ok) throw new Error('Erro ao obter análise da IA');

        const aiData = await aiResponse.json();

        if (aiData.analysis_result) {
            displayAiAnalysisResultInBox(aiData.analysis_result, resultContainer, `Comparison (${startMeasure}-${endMeasure})`);
        } else {
            updateAiBoxError(resultContainer, 'AI response contains no results.');
        }

    } catch (error) {
        console.error('AI Comparison Analysis Error:', error);
        updateAiBoxError(resultContainer, 'Error in AI analysis: ' + error.message);
    }
}


// Chatbot Logic
document.addEventListener('DOMContentLoaded', function () {
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatHistory = document.getElementById('chat-history');

    if (chatInput && chatSendBtn && chatHistory) {
        // Send on click
        chatSendBtn.addEventListener('click', sendMessage);

        // Send on Enter
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;

            // Add User Message
            appendMessage(message, 'user-message');
            chatInput.value = '';

            // Show loading state (optional, or just a temporary message)
            const loadingId = appendMessage('Thinking...', 'ai-message', true);

            try {
                // Gather context: The last analysis result if available
                // We can look for the last AI result in the DOM or store it
                // For now, let's just send the user message and the agent type

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: message,
                        agent_type: appConfig.agent || 'remote'
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error communicating with chatbot');
                }

                // Remove loading message
                removeMessage(loadingId);

                if (data.response) {
                    appendMessage(data.response, 'ai-message');
                } else {
                    appendMessage('Sorry, I could not generate a response.', 'ai-message');
                }

            } catch (error) {
                console.error('Chatbot Error:', error);
                removeMessage(loadingId);
                appendMessage('Error: ' + error.message, 'ai-message');
            }
        }

        function appendMessage(text, className, isLoading = false) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${className}`;
            msgDiv.textContent = text;
            if (isLoading) msgDiv.id = 'chat-loading-' + Date.now();

            chatHistory.appendChild(msgDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
            return msgDiv.id;
        }

        function removeMessage(id) {
            if (!id) return;
            const el = document.getElementById(id);
            if (el) el.remove();
        }
    }

    // About Modal Logic
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutModal = document.getElementById('close-about-modal');

    if (aboutBtn && aboutModal && closeAboutModal) {
        aboutBtn.addEventListener('click', () => {
            aboutModal.style.display = 'block';
        });

        closeAboutModal.addEventListener('click', () => {
            aboutModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === aboutModal) {
                aboutModal.style.display = 'none';
            }
        });
    }
});

/* ========================================
   STAFF NOTATION RENDERING WITH VEXFLOW
   ======================================== */

/**
 * Convert MIDI note number to Vexflow note name (e.g., 60 -> "C/4")
 */
function midiToVexflowNote(midiNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteName = noteNames[midiNumber % 12];
    return `${noteName}/${octave}`;
}

/**
 * Convert quarter length duration to Vexflow duration notation
 * quarterLength: 1 = quarter note, 0.5 = eighth note, 2 = half note, etc.
 */
function quarterLengthToVexflowDuration(quarterLength) {
    const quarterNoteDuration = 0.25; // 1 beat = 0.25 in terms of whole notes
    const wholeDuration = quarterLength * quarterNoteDuration;
    
    if (Math.abs(wholeDuration - 1) < 0.001) return '1';  // whole note
    if (Math.abs(wholeDuration - 0.5) < 0.001) return 'h'; // half note
    if (Math.abs(wholeDuration - 0.25) < 0.001) return 'q'; // quarter note
    if (Math.abs(wholeDuration - 0.125) < 0.001) return '8'; // eighth note
    if (Math.abs(wholeDuration - 0.0625) < 0.001) return '16'; // sixteenth note
    
    // For dotted notes and triplets, use approximations
    if (Math.abs(wholeDuration - 0.375) < 0.001) return 'qd'; // quarter dotted
    if (Math.abs(wholeDuration - 0.1875) < 0.001) return '8d'; // eighth dotted
    
    return 'q'; // default to quarter note
}

/* ========================================
   MEASURE GROUPING AND PAGINATION SYSTEM
   ======================================== */

/**
 * Group notes by measure number based on their start time
 * @param {Array} notes - Array of note objects with {pitch, start, duration, name}
 * @param {number} beatsPerMeasure - Number of beats per measure (default 4)
 * @returns {Array} Array of measure objects with {number, notes, startBeat, endBeat}
 */
function groupNotesByMeasure(notes, beatsPerMeasure = 4) {
    if (!notes || notes.length === 0) {
        return [];
    }

    const measures = [];
    const measureMap = new Map();

    // Group notes by their measure number
    notes.forEach(note => {
        const measureNumber = Math.floor(note.start / beatsPerMeasure) + 1;

        if (!measureMap.has(measureNumber)) {
            measureMap.set(measureNumber, {
                number: measureNumber,
                notes: [],
                startBeat: (measureNumber - 1) * beatsPerMeasure,
                endBeat: measureNumber * beatsPerMeasure
            });
        }

        measureMap.get(measureNumber).notes.push(note);
    });

    // Convert map to sorted array
    const sortedMeasures = Array.from(measureMap.values()).sort((a, b) => a.number - b.number);

    console.log(`Grouped ${notes.length} notes into ${sortedMeasures.length} measures`);
    return sortedMeasures;
}

/**
 * Calculate the optimal clef for a set of notes based on their pitch range
 * @param {Array} notes - Array of note objects
 * @returns {string} 'treble', 'bass', or 'alto'
 */
function determineOptimalClef(notes) {
    if (!notes || notes.length === 0) return 'treble';

    const pitches = notes.map(n => n.pitch);
    const avgPitch = pitches.reduce((sum, p) => sum + p, 0) / pitches.length;

    // MIDI 60 = C4 (middle C)
    if (avgPitch < 55) return 'bass';      // Below G3
    if (avgPitch > 67) return 'treble';    // Above G4
    return 'treble';                        // Default to treble for middle range
}

/**
 * Global state for staff notation pagination
 */
const staffNotationState = {
    currentPage: 1,
    measuresPerPage: 4,
    totalMeasures: 0,
    allMeasures: [],
    instrumentData: null,
    containerId: null,
    beatsPerMeasure: 4,
    selectedRange: { start: 1, end: 4 },
    highlightedRange: null
};

/**
 * Check if VexFlow is loaded
 */
function isVexFlowAvailable() {
    const available = typeof Vex !== 'undefined' && Vex && Vex.Flow && Vex.Flow.Renderer;
    console.log('VexFlow availability check:', available, { 
        vexDefined: typeof Vex !== 'undefined',
        flowDefined: typeof Vex !== 'undefined' && Vex.Flow,
        rendererDefined: typeof Vex !== 'undefined' && Vex.Flow && Vex.Flow.Renderer
    });
    return available;
}

/**
 * Initialize VexFlow check on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded. Checking VexFlow...');
    setTimeout(() => {
        if (isVexFlowAvailable()) {
            console.log('✓ VexFlow is available');
        } else {
            console.warn('✗ VexFlow not available yet, may load later');
        }
    }, 500);
});

/**
 * Render staff notation using Vexflow with measure range support
 * @param {string} containerId - HTML element ID where to render
 * @param {object} instrumentData - object with name and notes array
 * @param {number} measureDurationBeats - beats per measure (typically 4)
 * @param {number} startMeasure - starting measure number (default 1)
 * @param {number} endMeasure - ending measure number (default 4)
 */
async function renderStaffNotation(containerId, instrumentData, measureDurationBeats = 4, startMeasure = 1, endMeasure = 4) {
    const container = document.getElementById(containerId);
    if (!container || !instrumentData || !instrumentData.notes) {
        console.error('Invalid container or instrument data for staff notation');
        return;
    }

    console.log(`Rendering staff notation for ${instrumentData.name}: measures ${startMeasure}-${endMeasure} (${instrumentData.notes.length} total notes)`);

    // Show loading state
    container.innerHTML = `<div style="color: var(--text-secondary); padding: 20px; text-align: center;">
        <div style="display: inline-block; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; border: 3px solid var(--accent-blue); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        <p style="margin: 10px 0;">Loading staff notation...</p>
    </div>`;

    // Wait for VexFlow to be ready
    try {
        await vexFlowReady;
    } catch (err) {
        console.error('VexFlow did not become available:', err);
        container.innerHTML = `<div style="color: var(--warning-orange); padding: 20px; text-align: center; background: rgba(255,152,0,0.1); border-radius: 8px; border: 1px solid var(--warning-orange);">
            <p style="font-weight: bold; margin: 0 0 10px 0;">⚠️ Staff Notation Unavailable</p>
            <p style="font-size: 0.9rem; margin: 0 0 8px 0;">The music notation library could not be loaded.</p>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 10px 0;">Error: ${err.message || 'Unknown error'}</p>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Try refreshing the page or check your network connection.</p>
        </div>`;
        return;
    }

    try {
        // Group notes by measure
        const allMeasures = groupNotesByMeasure(instrumentData.notes, measureDurationBeats);

        if (allMeasures.length === 0) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <p>No notes to display</p>
            </div>`;
            return;
        }

        // Update global state
        staffNotationState.allMeasures = allMeasures;
        staffNotationState.totalMeasures = allMeasures.length;
        staffNotationState.instrumentData = instrumentData;
        staffNotationState.containerId = containerId;
        staffNotationState.beatsPerMeasure = measureDurationBeats;
        staffNotationState.selectedRange = { start: startMeasure, end: endMeasure };

        // Filter measures in the requested range
        const validEnd = Math.min(endMeasure, allMeasures.length);
        const validStart = Math.max(1, Math.min(startMeasure, validEnd));
        const selectedMeasures = allMeasures.filter(m => m.number >= validStart && m.number <= validEnd);

        if (selectedMeasures.length === 0) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                <p>No measures in selected range (${validStart}-${validEnd})</p>
            </div>`;
            return;
        }

        // Determine optimal clef
        const allNotesInRange = selectedMeasures.flatMap(m => m.notes);
        const clef = determineOptimalClef(allNotesInRange);

        // Clear container and create wrapper
        container.innerHTML = '';

        // Create controls panel
        const controlsDiv = createStaffControls(containerId, allMeasures.length, validStart, validEnd, measureDurationBeats);
        container.appendChild(controlsDiv);

        // Create canvas wrapper
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.cssText = 'width: 100%; overflow-x: auto; background: var(--bg-tertiary); border-radius: 8px; padding: 20px; margin-top: 15px;';

        // Calculate canvas dimensions
        const measuresPerLine = Math.min(4, selectedMeasures.length);
        const numLines = Math.ceil(selectedMeasures.length / measuresPerLine);
        const canvasWidth = Math.max(1200, measuresPerLine * 300);
        const canvasHeight = Math.max(400, numLines * 180 + 100);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = `staff-canvas-${containerId}`;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvasWrapper.appendChild(canvas);
        container.appendChild(canvasWrapper);

        // Get Vexflow Renderer and Context
        const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        const context = renderer.getContext();
        context.setFont('Arial', 10);

        // Render each measure
        let xPosition = 10;
        let yPosition = 40;
        const staveWidth = 280;
        const lineHeight = 180;

        selectedMeasures.forEach((measure, index) => {
            try {
                // Move to next line if needed
                if (index > 0 && index % measuresPerLine === 0) {
                    xPosition = 10;
                    yPosition += lineHeight;
                }

                // Create stave for this measure
                const stave = new Vex.Flow.Stave(xPosition, yPosition, staveWidth);

                // Add clef, time signature, and key signature to first measure of each line
                if (index % measuresPerLine === 0) {
                    stave.addClef(clef);
                    stave.addTimeSignature(`${measureDurationBeats}/4`);
                }

                // Add measure number above the stave
                stave.setText(`${measure.number}`, Vex.Flow.Modifier.Position.ABOVE);

                stave.setContext(context).draw();

                // Convert notes to VexFlow format
                if (measure.notes && measure.notes.length > 0) {
                    const vexNotes = [];
                    let currentBeat = 0;

                    measure.notes.forEach(note => {
                        try {
                            const vexflowNote = midiToVexflowNote(note.pitch);
                            const duration = quarterLengthToVexflowDuration(note.duration);

                            const vexNote = new Vex.Flow.StaveNote({
                                keys: [vexflowNote],
                                duration: duration,
                                clef: clef
                            });

                            // Add accidentals if needed
                            if (vexflowNote.includes('#')) {
                                vexNote.addModifier(new Vex.Flow.Accidental('#'), 0);
                            } else if (vexflowNote.includes('b')) {
                                vexNote.addModifier(new Vex.Flow.Accidental('b'), 0);
                            }

                            vexNotes.push(vexNote);
                            currentBeat += note.duration;
                        } catch (e) {
                            console.warn(`Could not create note for MIDI ${note.pitch} in measure ${measure.number}:`, e);
                        }
                    });

                    // Fill remaining beats with rests if needed
                    while (currentBeat < measureDurationBeats && vexNotes.length < 8) {
                        const remainingBeats = measureDurationBeats - currentBeat;
                        const restDuration = remainingBeats >= 4 ? 'w' : (remainingBeats >= 2 ? 'h' : 'q');
                        vexNotes.push(new Vex.Flow.StaveNote({
                            keys: ['b/4'],
                            duration: `${restDuration}r`,
                            clef: clef
                        }));
                        currentBeat += (restDuration === 'w' ? 4 : (restDuration === 'h' ? 2 : 1));
                    }

                    if (vexNotes.length > 0) {
                        // Create voice and add notes
                        const voice = new Vex.Flow.Voice({
                            num_beats: measureDurationBeats,
                            beat_value: 4
                        });
                        voice.addTickables(vexNotes);

                        // Format and draw
                        new Vex.Flow.Formatter()
                            .joinVoices([voice])
                            .format([voice], staveWidth - 20);

                        voice.draw(context, stave);
                    }
                }

                xPosition += staveWidth + 10;

            } catch (error) {
                console.error(`Error rendering measure ${measure.number}:`, error);
            }
        });

        // Add info footer
        context.font = '12px Arial';
        context.fillStyle = 'var(--text-secondary)';
        context.fillText(`${instrumentData.name} - Measures ${validStart}-${validEnd} of ${allMeasures.length}`, 15, canvasHeight - 20);

    } catch (error) {
        console.error('Error rendering staff notation:', error);
        container.innerHTML = `<div style="color: var(--error-red); padding: 20px; text-align: center; background: rgba(244,67,54,0.1); border-radius: 8px; border: 1px solid var(--error-red);">
            <p style="font-weight: bold; margin-bottom: 10px;">📋 Staff Notation Error</p>
            <p style="font-size: 0.9rem;">Unable to render staff notation.</p>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px;">Error: ${error.message}</p>
        </div>`;
    }
}

/**
 * Create staff notation controls panel
 * @param {string} containerId - Container element ID
 * @param {number} totalMeasures - Total number of measures in the piece
 * @param {number} currentStart - Current start measure
 * @param {number} currentEnd - Current end measure
 * @param {number} beatsPerMeasure - Beats per measure
 * @returns {HTMLElement} Controls div
 */
function createStaffControls(containerId, totalMeasures, currentStart, currentEnd, beatsPerMeasure) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'staff-controls';
    controlsDiv.style.cssText = `
        display: flex;
        gap: 15px;
        padding: 15px;
        background: var(--bg-secondary);
        border-radius: 8px;
        align-items: center;
        flex-wrap: wrap;
        border: 1px solid var(--border-color);
    `;

    // Label
    const label = document.createElement('span');
    label.textContent = 'Measures:';
    label.style.cssText = 'font-weight: 500; color: var(--text-primary);';
    controlsDiv.appendChild(label);

    // Start measure input
    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.id = `${containerId}-staff-start`;
    startInput.min = 1;
    startInput.max = totalMeasures;
    startInput.value = currentStart;
    startInput.style.cssText = `
        width: 70px;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        font-size: 0.95rem;
    `;
    controlsDiv.appendChild(startInput);

    // "to" text
    const toText = document.createElement('span');
    toText.textContent = 'to';
    toText.style.cssText = 'color: var(--text-secondary);';
    controlsDiv.appendChild(toText);

    // End measure input
    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.id = `${containerId}-staff-end`;
    endInput.min = 1;
    endInput.max = totalMeasures;
    endInput.value = currentEnd;
    endInput.style.cssText = `
        width: 70px;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        font-size: 0.95rem;
    `;
    controlsDiv.appendChild(endInput);

    // Render button
    const renderBtn = document.createElement('button');
    renderBtn.textContent = '🔍 Render';
    renderBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: var(--accent-blue);
        color: white;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
    `;
    renderBtn.addEventListener('click', () => {
        const start = parseInt(startInput.value);
        const end = parseInt(endInput.value);
        if (start > 0 && end > 0 && start <= end && end <= totalMeasures) {
            renderStaffNotation(
                containerId,
                staffNotationState.instrumentData,
                beatsPerMeasure,
                start,
                end
            );
        } else {
            alert(`Please enter valid measure range (1-${totalMeasures})`);
        }
    });
    renderBtn.addEventListener('mouseenter', () => {
        renderBtn.style.transform = 'translateY(-2px)';
        renderBtn.style.boxShadow = '0 4px 12px rgba(77, 158, 255, 0.4)';
    });
    renderBtn.addEventListener('mouseleave', () => {
        renderBtn.style.transform = 'translateY(0)';
        renderBtn.style.boxShadow = 'none';
    });
    controlsDiv.appendChild(renderBtn);

    // Previous page button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '◀ Prev';
    prevBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: transparent;
        color: var(--text-primary);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
    `;
    prevBtn.addEventListener('click', () => {
        const measuresPerPage = currentEnd - currentStart + 1;
        const newEnd = Math.max(measuresPerPage, currentStart - 1);
        const newStart = Math.max(1, newEnd - measuresPerPage + 1);
        renderStaffNotation(
            containerId,
            staffNotationState.instrumentData,
            beatsPerMeasure,
            newStart,
            newEnd
        );
    });
    prevBtn.disabled = currentStart <= 1;
    if (prevBtn.disabled) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    }
    controlsDiv.appendChild(prevBtn);

    // Next page button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next ▶';
    nextBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: transparent;
        color: var(--text-primary);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
    `;
    nextBtn.addEventListener('click', () => {
        const measuresPerPage = currentEnd - currentStart + 1;
        const newStart = Math.min(totalMeasures - measuresPerPage + 1, currentEnd + 1);
        const newEnd = Math.min(totalMeasures, newStart + measuresPerPage - 1);
        renderStaffNotation(
            containerId,
            staffNotationState.instrumentData,
            beatsPerMeasure,
            newStart,
            newEnd
        );
    });
    nextBtn.disabled = currentEnd >= totalMeasures;
    if (nextBtn.disabled) {
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    }
    controlsDiv.appendChild(nextBtn);

    // Info text
    const infoText = document.createElement('span');
    infoText.style.cssText = 'margin-left: auto; color: var(--text-secondary); font-size: 0.9rem;';
    infoText.textContent = `Total: ${totalMeasures} measures`;
    controlsDiv.appendChild(infoText);

    return controlsDiv;
}

/**
 * Create a toggle button to switch between piano roll and staff notation
 */
function createVisualizationToggleButton(pianoRollSlot, chartContainerId, instrumentData, measureDurationBeats) {
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        padding: 10px;
        background: var(--bg-tertiary);
        border-radius: 8px;
        align-items: center;
    `;

    // Label
    const label = document.createElement('span');
    label.textContent = 'Visualization:';
    label.style.fontWeight = '500';
    toggleContainer.appendChild(label);

    // Piano Roll Button
    const pianoBtn = document.createElement('button');
    pianoBtn.innerHTML = '🎹 Piano Roll';
    pianoBtn.style.cssText = `
        padding: 8px 15px;
        border: none;
        border-radius: 6px;
        background: var(--accent-blue);
        color: white;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
    `;
    pianoBtn.classList.add('active');

    // Staff Notation Button
    const staffBtn = document.createElement('button');
    staffBtn.innerHTML = '🎼 Staff Notation';
    staffBtn.style.cssText = `
        padding: 8px 15px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font-weight: 500;
        border: 1px solid var(--border-color);
        transition: all 0.3s;
    `;

    // State tracking
    let isShowingPianoRoll = true;
    let staffNotationRendered = false;

    // Piano Roll click handler
    pianoBtn.addEventListener('click', () => {
        if (!isShowingPianoRoll) {
            isShowingPianoRoll = true;
            
            // Update button styles
            pianoBtn.style.background = 'var(--accent-blue)';
            pianoBtn.style.color = 'white';
            staffBtn.style.background = 'transparent';
            staffBtn.style.color = 'var(--text-secondary)';
            staffBtn.style.border = '1px solid var(--border-color)';

            // Show piano roll
            const chartDiv = document.getElementById(chartContainerId);
            if (chartDiv) {
                chartDiv.style.display = 'block';
                // Refresh Plotly to recalculate layout
                Plotly.Plots.resize(chartContainerId);
            }

            // Hide staff notation
            const staffDiv = document.getElementById(`${chartContainerId}-staff`);
            if (staffDiv) {
                staffDiv.style.display = 'none';
            }
        }
    });

    // Staff Notation click handler (async to await VexFlow loader)
    staffBtn.addEventListener('click', async () => {
        if (isShowingPianoRoll) {
            isShowingPianoRoll = false;

            // Update button styles
            pianoBtn.style.background = 'transparent';
            pianoBtn.style.color = 'var(--text-secondary)';
            pianoBtn.style.border = '1px solid var(--border-color)';
            staffBtn.style.background = 'var(--accent-blue)';
            staffBtn.style.color = 'white';

            // Hide piano roll
            const chartDiv = document.getElementById(chartContainerId);
            if (chartDiv) {
                chartDiv.style.display = 'none';
            }

            // Show or create staff notation
            let staffDiv = document.getElementById(`${chartContainerId}-staff`);
            if (!staffDiv) {
                staffDiv = document.createElement('div');
                staffDiv.id = `${chartContainerId}-staff`;
                staffDiv.style.width = '100%';
                staffDiv.style.border = '1px solid var(--border-color)';
                staffDiv.style.borderRadius = '8px';
                staffDiv.style.overflow = 'auto';
                
                // Insert after the piano roll div
                const chartDiv = document.getElementById(chartContainerId);
                if (chartDiv && chartDiv.parentNode) {
                    chartDiv.parentNode.insertBefore(staffDiv, chartDiv.nextSibling);
                } else {
                    pianoRollSlot.appendChild(staffDiv);
                }

                // Render staff notation with Verovio (professional quality)
                try {
                    await renderStaffNotationVerovio(`${chartContainerId}-staff`, instrumentData, measureDurationBeats, 1, 4);
                    staffNotationRendered = true;
                } catch (err) {
                    console.error('Failed to render staff notation with Verovio:', err);
                    // Fallback to VexFlow
                    console.log('Attempting fallback to VexFlow...');
                    try {
                        await renderStaffNotation(`${chartContainerId}-staff`, instrumentData, measureDurationBeats, 1, 4);
                        staffNotationRendered = true;
                    } catch (err2) {
                        console.error('VexFlow fallback also failed:', err2);
                        staffDiv.innerHTML = `<div style="color: #ff9800; padding: 20px; text-align: center; background: rgba(255,152,0,0.1); border-radius: 8px; border: 1px solid #ff9800;">
                            <p style="font-weight: bold; margin: 0 0 10px 0;">⚠️ Staff Notation Unavailable</p>
                            <p style="font-size: 0.9rem; margin: 0 0 8px 0;">Both Verovio and VexFlow failed to load.</p>
                            <p style="font-size: 0.85rem; color: #666; margin: 0;">Error: ${err.message}</p>
                        </div>`;
                    }
                }
            } else {
                staffDiv.style.display = 'block';
            }
        }
    });

    toggleContainer.appendChild(pianoBtn);
    toggleContainer.appendChild(staffBtn);

    return toggleContainer;
}

/**
 * Enhanced version that adds toggle to piano roll sections
 * Call this after creating the piano roll
 */
function addVisualizationToggle(pianoRollSlot, chartContainerId, instrumentData, measureDurationBeats) {
    // Check if toggle already exists
    const existingToggle = pianoRollSlot.querySelector('[data-toggle-control]');
    if (existingToggle) return;

    const toggle = createVisualizationToggleButton(pianoRollSlot, chartContainerId, instrumentData, measureDurationBeats);
    toggle.setAttribute('data-toggle-control', 'true');

    // Insert at the beginning of the slot, before the title
    const firstChild = pianoRollSlot.firstChild;
    if (firstChild) {
        pianoRollSlot.insertBefore(toggle, firstChild);
    } else {
        pianoRollSlot.appendChild(toggle);
    }
}

/* ========================================
   COMPARISON TAB VISUALIZATION TOGGLE
   ======================================== */

function initializeComparisonVisualizationToggle() {
    const toggleBtns = document.querySelectorAll('.comp-viz-toggle-btn');
    const pianoRollContainer = document.getElementById('comparison-piano-roll');
    const staffContainer = document.getElementById('comparison-piano-roll-staff');

    if (!toggleBtns.length) return;

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const vizType = btn.getAttribute('data-viz');

            // Update button styles
            toggleBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--text-secondary)';
                b.style.border = '1px solid var(--border-color)';
            });

            btn.classList.add('active');
            btn.style.background = 'var(--accent-blue)';
            btn.style.color = 'white';
            btn.style.border = 'none';

            // Toggle visibility
            if (vizType === 'piano-roll') {
                pianoRollContainer.style.display = 'block';
                if (staffContainer) staffContainer.style.display = 'none';

                // Refresh Plotly
                if (window.comparisonPlotlyInstance) {
                    setTimeout(() => Plotly.Plots.resize('comparison-piano-roll'), 100);
                }
            } else if (vizType === 'staff') {
                pianoRollContainer.style.display = 'none';
                if (staffContainer) {
                    staffContainer.style.display = 'block';
                    // Don't auto-render - user must click "Render Staff" button
                }
            }
        });
    });

    // Initialize "Render Staff" button for comparison view
    const renderBtn = document.getElementById('comparison-staff-render-btn');
    if (renderBtn) {
        renderBtn.addEventListener('click', () => {
            console.log('🎼 Render Staff button clicked');
            renderComparisonStaffWithVerovio().catch(err => {
                console.error('❌ Error rendering comparison staff:', err);
            });
        });
    }
}

/**
 * Render combined staff notation for comparison tab using Verovio
 * This renders all selected instruments in a single vertically-aligned score
 * (Kept for compatibility - actual rendering is done by renderComparisonStaffWithVerovio)
 */
async function renderComparisonStaffNotation() {
    console.log('🎼 renderComparisonStaffNotation called');

    // This function is now triggered by the "Render Staff" button
    // The actual rendering logic is in renderComparisonStaffWithVerovio()
    await renderComparisonStaffWithVerovio();
}

/**
 * Render comparison staff notation using Verovio with combined MusicXML endpoint
 */
async function renderComparisonStaffWithVerovio() {
    console.log('🎼 Starting Verovio-based comparison staff rendering');

    const outputDiv = document.getElementById('comparison-verovio-output');
    const infoDiv = document.getElementById('comparison-staff-info');

    if (!outputDiv) {
        console.error('Output div not found');
        return;
    }

    // Check if we have instruments selected
    if (!comparisonState.selectedInstruments || comparisonState.selectedInstruments.length === 0) {
        outputDiv.innerHTML = `<div style="text-align: center; color: #999; padding: 40px;">
            <p>⚠️ No instruments selected</p>
            <p style="font-size: 0.9rem; margin-top: 10px;">Please select at least one instrument from the checkboxes above.</p>
        </div>`;
        return;
    }

    // Check if we have a file path
    if (!comparisonState.currentData || !comparisonState.currentData.file_path) {
        outputDiv.innerHTML = `<div style="text-align: center; color: #999; padding: 40px;">
            <p>⚠️ No score loaded</p>
            <p style="font-size: 0.9rem; margin-top: 10px;">Please upload a score first.</p>
        </div>`;
        return;
    }

    // Get measure range from inputs
    const startInput = document.getElementById('comparison-staff-vstart');
    const endInput = document.getElementById('comparison-staff-vend');
    const startMeasure = startInput ? parseInt(startInput.value) || 1 : 1;
    const endMeasure = endInput ? parseInt(endInput.value) || null : null;

    // Show loading state
    outputDiv.innerHTML = `<div style="text-align: center; padding: 40px;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
        <p style="color: #666; font-size: 1.1rem;">Generating combined score...</p>
        <p style="color: #999; font-size: 0.9rem; margin-top: 10px;">Instruments: ${comparisonState.selectedInstruments.map(i => i.name).join(', ')}</p>
    </div>`;

    if (infoDiv) {
        infoDiv.textContent = 'Generating combined MusicXML...';
    }

    try {
        // Wait for Verovio to be ready
        await window.verovioReady;

        // Get instrument indices
        const instrumentIndices = comparisonState.selectedInstruments.map(i => i.index);

        console.log('📤 Fetching combined MusicXML for instruments:', instrumentIndices);
        console.log('📏 Measure range:', startMeasure, '-', endMeasure || 'end');

        // Fetch combined MusicXML from backend
        const response = await fetch('/get_combined_musicxml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_path: comparisonState.currentData.file_path,
                instrument_indices: instrumentIndices,
                start_measure: startMeasure,
                end_measure: endMeasure
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        console.log('✅ Received combined MusicXML');
        console.log('🎵 Instruments:', data.instrument_names.join(', '));

        // Calculate ideal page width based on number of instruments and measures
        // Estimate: ~200-250 pixels per measure per instrument
        const estimatedWidth = Math.max(10000, (data.instrument_count || 1) * (data.measures || 30) * 250);

        // Load MusicXML into Verovio with optimized options for continuous horizontal layout
        window.vrvToolkit.setOptions({
            scale: 40,
            adjustPageHeight: false,
            adjustPageWidth: false,  // Don't auto-adjust, use our calculated width
            pageHeight: 3000,  // Very large height to prevent vertical breaks
            pageWidth: estimatedWidth,  // Dynamically calculated width
            pageMarginTop: 30,
            pageMarginBottom: 30,
            pageMarginLeft: 30,
            pageMarginRight: 30,
            svgViewBox: true,
            breaks: 'none',    // DISABLE all automatic breaks
            noFooter: true,    // Remove footer to save space
            noHeader: true,    // Remove header to save space
            foot: 'none',
            header: 'none',
            ignoreLayout: false
        });

        window.vrvToolkit.loadData(data.musicxml);

        // Render SVG - use continuous rendering
        let svg = window.vrvToolkit.renderToSVG(1);

        // Parse SVG to add inline styles for proper scrolling
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        
        if (svgElement) {
            // Ensure SVG has display block and proper sizing
            svgElement.style.display = 'block';
            svgElement.style.marginBottom = '50px';
            svgElement.setAttribute('data-original-width', svgElement.getAttribute('width') || 2000);
            svgElement.setAttribute('data-original-height', svgElement.getAttribute('height') || 1000);
            
            // Serialize back to string
            svg = new XMLSerializer().serializeToString(svgDoc);
        }

        // Display in output div
        outputDiv.innerHTML = svg;

        // Update info
        if (infoDiv) {
            infoDiv.innerHTML = `✅ Showing ${data.instrument_count} instrument(s) - Measures ${data.measures} (Width: ${estimatedWidth}px)`;
        }

        console.log('✅ Verovio rendering complete');
        console.log(`📏 Estimated width: ${estimatedWidth}px`);

        // Initialize zoom controls and scrolling
        setTimeout(() => {
            addComparisonStaffScrolling();
            initComparisonStaffZoomControls();
        }, 100);

    } catch (error) {
        console.error('❌ Error rendering comparison staff:', error);
        outputDiv.innerHTML = `<div style="text-align: center; color: #d32f2f; padding: 40px; background: #ffebee; border-radius: 8px; margin: 20px;">
            <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">❌ Rendering Error</p>
            <p style="font-size: 0.95rem;">${error.message}</p>
            <p style="font-size: 0.85rem; color: #666; margin-top: 15px;">Please try selecting different instruments or measure ranges.</p>
        </div>`;

        if (infoDiv) {
            infoDiv.textContent = '❌ Error rendering score';
        }
    }
}

/**
 * Create staff controls for comparison view
 */
function createComparisonStaffControls(totalMeasures, currentStart, currentEnd, beatsPerMeasure) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'staff-controls';
    controlsDiv.style.cssText = `
        display: flex;
        gap: 15px;
        padding: 15px;
        background: var(--bg-secondary);
        border-radius: 8px;
        align-items: center;
        flex-wrap: wrap;
        border: 1px solid var(--border-color);
    `;

    const label = document.createElement('span');
    label.textContent = 'Measures:';
    label.style.cssText = 'font-weight: 500; color: var(--text-primary);';
    controlsDiv.appendChild(label);

    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.id = 'comp-staff-start';
    startInput.min = 1;
    startInput.max = totalMeasures;
    startInput.value = currentStart;
    startInput.style.cssText = `
        width: 70px; padding: 8px; border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--bg-tertiary);
        color: var(--text-primary);
    `;
    controlsDiv.appendChild(startInput);

    const toText = document.createElement('span');
    toText.textContent = 'to';
    toText.style.cssText = 'color: var(--text-secondary);';
    controlsDiv.appendChild(toText);

    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.id = 'comp-staff-end';
    endInput.min = 1;
    endInput.max = totalMeasures;
    endInput.value = currentEnd;
    endInput.style.cssText = `
        width: 70px; padding: 8px; border-radius: 4px;
        border: 1px solid var(--border-color);
        background: var(--bg-tertiary);
        color: var(--text-primary);
    `;
    controlsDiv.appendChild(endInput);

    const renderBtn = document.createElement('button');
    renderBtn.textContent = '🔍 Render';
    renderBtn.style.cssText = `
        padding: 8px 16px; border: none; border-radius: 6px;
        background: var(--accent-blue); color: white;
        cursor: pointer; font-weight: 500;
    `;
    renderBtn.addEventListener('click', () => {
        const start = parseInt(startInput.value);
        const end = parseInt(endInput.value);
        if (start > 0 && end > 0 && start <= end && end <= totalMeasures) {
            renderComparisonStaffNotation(start, end);
        }
    });
    controlsDiv.appendChild(renderBtn);

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '◀ Prev';
    prevBtn.style.cssText = `
        padding: 8px 16px; border: 1px solid var(--border-color);
        border-radius: 6px; background: transparent;
        color: var(--text-primary); cursor: pointer;
    `;
    prevBtn.addEventListener('click', () => {
        const range = currentEnd - currentStart + 1;
        const newEnd = Math.max(range, currentStart - 1);
        const newStart = Math.max(1, newEnd - range + 1);
        renderComparisonStaffNotation(newStart, newEnd);
    });
    prevBtn.disabled = currentStart <= 1;
    if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
    controlsDiv.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next ▶';
    nextBtn.style.cssText = `
        padding: 8px 16px; border: 1px solid var(--border-color);
        border-radius: 6px; background: transparent;
        color: var(--text-primary); cursor: pointer;
    `;
    nextBtn.addEventListener('click', () => {
        const range = currentEnd - currentStart + 1;
        const newStart = Math.min(totalMeasures - range + 1, currentEnd + 1);
        const newEnd = Math.min(totalMeasures, newStart + range - 1);
        renderComparisonStaffNotation(newStart, newEnd);
    });
    nextBtn.disabled = currentEnd >= totalMeasures;
    if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
    controlsDiv.appendChild(nextBtn);

    const infoText = document.createElement('span');
    infoText.style.cssText = 'margin-left: auto; color: var(--text-secondary); font-size: 0.9rem;';
    infoText.textContent = `Total: ${totalMeasures} measures`;
    controlsDiv.appendChild(infoText);

    return controlsDiv;
}

// Initialize comparison visualization toggle when document is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeComparisonVisualizationToggle, 500);
});

// Also reinitialize when file is loaded (in case elements are recreated)
const originalUpdateComparisonSelection = updateComparisonSelection;
if (typeof originalUpdateComparisonSelection === 'function') {
    window.updateComparisonSelection = function() {
        originalUpdateComparisonSelection.call(this);
        setTimeout(initializeComparisonVisualizationToggle, 100);
    };
}

/* ========================================
   VEROVIO RENDERING SYSTEM (Professional Music Engraving)
   - Primary rendering engine using MusicXML -> SVG
   - Superior typographic quality and deterministic output
   ======================================== */

/**
 * Render staff notation using Verovio Toolkit
 * @param {string} containerId - Container element ID
 * @param {object} instrumentData - Instrument data with index, name, notes
 * @param {number} measureDurationBeats - Beats per measure
 * @param {number} startMeasure - Start measure
 * @param {number} endMeasure - End measure
 */
async function renderStaffNotationVerovio(containerId, instrumentData, measureDurationBeats = 4, startMeasure = 1, endMeasure = 4) {
    const container = document.getElementById(containerId);
    if (!container || !instrumentData) {
        console.error('Invalid container or instrument data');
        return;
    }

    console.log(`🎼 [Verovio] Rendering ${instrumentData.name}: measures ${startMeasure}-${endMeasure}`);

    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">
        <div style="display: inline-block; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; border: 3px solid var(--accent-purple); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        <p>Loading professional notation (Verovio)...</p>
    </div>`;

    try {
        await window.verovioReady;

        const response = await fetch('/get_instrument_musicxml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_path: currentFilePath,
                instrument_index: instrumentData.index,
                start_measure: startMeasure,
                end_measure: endMeasure
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        container.innerHTML = '';

        // Controls
        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 10px; padding: 15px; background: linear-gradient(135deg, rgba(187,134,252,0.1), rgba(77,158,255,0.1)); border-radius: 8px; align-items: center; border: 2px solid var(--accent-purple); margin-bottom: 15px;';
        controls.innerHTML = `
            <span style="background: var(--accent-purple); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">✨ Verovio</span>
            <span style="font-weight: 500;">Measures:</span>
            <input type="number" id="${containerId}-vstart" value="${startMeasure}" min="1" style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);">
            <span>to</span>
            <input type="number" id="${containerId}-vend" value="${endMeasure}" min="1" style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary);">
            <button id="${containerId}-vrender" style="padding: 6px 12px; border: none; border-radius: 6px; background: linear-gradient(135deg, var(--accent-purple), #9c27b0); color: white; cursor: pointer; font-weight: 500;">🎼 Render</button>
            <button id="${containerId}-vswitch" style="padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; color: var(--text-primary); cursor: pointer; margin-left: auto;">🔄 VexFlow</button>
        `;
        container.appendChild(controls);

        document.getElementById(`${containerId}-vrender`).onclick = () => {
            const s = parseInt(document.getElementById(`${containerId}-vstart`).value);
            const e = parseInt(document.getElementById(`${containerId}-vend`).value);
            renderStaffNotationVerovio(containerId, instrumentData, measureDurationBeats, s, e);
        };
        document.getElementById(`${containerId}-vswitch`).onclick = () => {
            const s = parseInt(document.getElementById(`${containerId}-vstart`).value);
            const e = parseInt(document.getElementById(`${containerId}-vend`).value);
            renderStaffNotation(containerId, instrumentData, measureDurationBeats, s, e);
        };

        // SVG container
        const svgDiv = document.createElement('div');
        svgDiv.style.cssText = 'width: 100%; overflow-x: auto; background: var(--bg-tertiary); border-radius: 8px; padding: 20px; border: 1px solid var(--border-color);';
        container.appendChild(svgDiv);

        // Verovio rendering
        window.vrvToolkit.setOptions({
            scale: 40,
            adjustPageHeight: true,
            pageWidth: 2100,
            breaks: 'auto'
        });

        const loaded = window.vrvToolkit.loadData(data.musicxml);
        if (!loaded) throw new Error('Failed to parse MusicXML');

        const svg = window.vrvToolkit.renderToSVG(1, {});
        if (!svg) throw new Error('Failed to render SVG');

        svgDiv.innerHTML = svg;

        const footer = document.createElement('div');
        footer.style.cssText = 'margin-top: 10px; text-align: center; font-size: 0.85rem; color: var(--text-secondary);';
        footer.textContent = `${data.instrument_name} | Measures ${data.measures} | Verovio ${window.vrvToolkit.getVersion()}`;
        container.appendChild(footer);

        console.log('✅ Verovio render complete');

    } catch (error) {
        console.error('Verovio error:', error);
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--error-red); background: rgba(244,67,54,0.1); border-radius: 8px; border: 1px solid var(--error-red);">
            <p style="font-weight: bold; margin-bottom: 10px;">Verovio Error</p>
            <p style="font-size: 0.9rem;">${error.message}</p>
            <button onclick="renderStaffNotation('${containerId}', ${JSON.stringify(instrumentData).replace(/"/g, '&quot;')}, ${measureDurationBeats}, ${startMeasure}, ${endMeasure})"
                    style="margin-top: 15px; padding: 10px 20px; background: var(--accent-blue); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Try VexFlow
            </button>
        </div>`;
    }
}

/* ========================================
   VEXFLOW LOADER (Legacy fallback system)
   - Kept for compatibility
   ======================================== */

// Use the promise created by the HTML loader, or create a fallback
const vexFlowReady = window.verovioReady || window.__vexFlowPromise || new Promise((resolve, reject) => {
    console.log('⚠️ VexFlow promise not found in window, creating fallback...');

    // Expose resolvers on window for HTML script
    window._resolveVexFlowReady = resolve;
    window._rejectVexFlowReady = reject;

    // Check if already loaded
    if (typeof Vex !== 'undefined' && Vex && Vex.Flow && Vex.Flow.Renderer) {
        console.log('✓ VexFlow already loaded at script.js initialization');
        resolve();
        return;
    }

    // Monitor for VexFlow availability
    const checkInterval = 100;
    const maxWait = 60000; // 60 seconds max
    let elapsed = 0;

    const intervalId = setInterval(() => {
        if (typeof Vex !== 'undefined' && Vex && Vex.Flow && Vex.Flow.Renderer) {
            clearInterval(intervalId);
            console.log(`✓ VexFlow detected after ${elapsed}ms`);
            resolve();
        } else {
            elapsed += checkInterval;
            if (elapsed >= maxWait) {
                clearInterval(intervalId);
                console.error(`✗ VexFlow loading timed out after ${maxWait/1000}s`);
                reject(new Error('VexFlow loading timed out'));
            }
        }
    }, checkInterval);
});

// Export for debugging
window.vexFlowReady = vexFlowReady;

/* ========================================
   ADVANCED ANALYSIS TAB
   ======================================== */

async function selectAdvancedAnalysis(analysisType) {
    if (!currentFilePath) {
        alert('Please upload a file first');
        return;
    }

    const resultContainer = document.getElementById('advanced-result-container');
    const resultBody = document.getElementById('result-body');
    const resultTitle = document.getElementById('result-title');

    resultContainer.style.display = 'block';
    resultTitle.textContent = `Loading ${analysisType}...`;
    resultBody.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';

    try {
        const response = await fetch('/api/advanced-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_path: currentFilePath,
                analysis_type: analysisType
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        renderAdvancedAnalysisResult(analysisType, data);
    } catch (error) {
        console.error('Error in advanced analysis:', error);
        resultBody.innerHTML = `<div style="color: #ff6b6b; padding: 20px;">Error: ${error.message}</div>`;
    }
}

function renderAdvancedAnalysisResult(analysisType, data) {
    const resultBody = document.getElementById('result-body');
    const resultTitle = document.getElementById('result-title');

    const analysisLabels = {
        'cadences': '🔗 Cadence Detection',
        'modulation': '🔄 Modulation Analysis',
        'voice_leading': '🎼 Voice Leading',
        'dissonance': '⚡ Dissonance Analysis',
        'harmonic_functions': 'Ⅰ Harmonic Functions',
        'phrase_structure': '📍 Phrase Structure',
        'texture_advanced': '📊 Texture Analysis',
        'chromatic_analysis': '🎹 Chromaticism',
        'symmetry': '↔️ Symmetry Analysis',
        'symmetry_music21': '🎼 Symmetry (Music21)',
        'statistics': '📈 Statistics'
    };

    resultTitle.textContent = analysisLabels[analysisType] || analysisType;

    let html = '';

    if (analysisType === 'cadences') {
        html = renderCadencesAdvanced(data);
    } else if (analysisType === 'modulation') {
        html = renderModulation(data);
    } else if (analysisType === 'voice_leading') {
        html = renderVoiceLeading(data);
    } else if (analysisType === 'dissonance') {
        html = renderDissonance(data);
    } else if (analysisType === 'harmonic_functions') {
        html = renderHarmonicFunctions(data);
    } else if (analysisType === 'phrase_structure') {
        html = renderPhraseStructure(data);
    } else if (analysisType === 'texture_advanced') {
        html = renderTextureAdvanced(data);
    } else if (analysisType === 'chromatic_analysis') {
        html = renderChromaticAdvanced(data);
    } else if (analysisType === 'symmetry') {
        html = renderSymmetryAdvanced(data);
    } else if (analysisType === 'symmetry_music21') {
        html = renderSymmetryAdvanced(data);
    } else if (analysisType === 'statistics') {
        html = renderStatisticsAdvanced(data);
    } else {
        html = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    resultBody.innerHTML = html;
    initializeCollapsibles();
}

function renderCadencesAdvanced(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    if (!data.cadences || data.cadences.length === 0) {
        return `<div style="padding: 20px; color: #999;">No cadences detected in this score.</div>`;
    }

    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>
        <table class="statistics-table">
            <thead><tr><th>Measure</th><th>Type</th><th>Strength</th><th>Instrument</th></tr></thead>
            <tbody>`;

    data.cadences.forEach(cadence => {
        html += `<tr>
            <td>M. ${cadence.measure}</td>
            <td>${cadence.type}</td>
            <td>${(cadence.strength * 100).toFixed(0)}%</td>
            <td>${cadence.instrument}</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
}

function renderModulation(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>`;

    if (data.modulations && data.modulations.length > 0) {
        html += `<table class="statistics-table">
            <thead><tr><th>From M.</th><th>To M.</th><th>From Key</th><th>To Key</th></tr></thead>
            <tbody>`;

        data.modulations.forEach(mod => {
            html += `<tr>
                <td>${mod.from_measure}</td>
                <td>${mod.to_measure}</td>
                <td>${mod.from_key}</td>
                <td>${mod.to_key}</td>
            </tr>`;
        });

        html += `</tbody></table>`;
    } else {
        html += `<p style="color: #999;">No modulations detected.</p>`;
    }

    html += `</div>`;
    return html;
}

function renderVoiceLeading(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>`;

    if (data.voice_analysis && data.voice_analysis.length > 0) {
        html += `<table class="statistics-table">
            <thead><tr><th>Voice</th><th>Total Notes</th><th>Leaps</th><th>Stepwise</th><th>Avg Leap</th><th>Range</th></tr></thead>
            <tbody>`;

        data.voice_analysis.forEach(voice => {
            html += `<tr>
                <td>${voice.instrument}</td>
                <td>${voice.total_notes}</td>
                <td>${voice.leaps}</td>
                <td>${voice.stepwise_motion}</td>
                <td>${voice.average_leap}</td>
                <td>${voice.pitch_range}</td>
            </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

function renderDissonance(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    const diss = data.dissonance || {};
    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>
        <p><strong>Dissonance Ratio:</strong> ${diss.dissonance_percentage}%</p>
        <p><strong>Total Intervals Analyzed:</strong> ${data.total_intervals_analyzed}</p>`;

    if (diss.dissonant_intervals && diss.dissonant_intervals.length > 0 && diss.dissonant_intervals.length <= 20) {
        html += `<h4 style="margin-top: 15px;">Sample Dissonant Intervals (first 20):</h4>
            <table class="statistics-table">
            <thead><tr><th>From</th><th>To</th><th>Interval</th><th>Voice</th></tr></thead>
            <tbody>`;

        diss.dissonant_intervals.slice(0, 20).forEach(interval => {
            html += `<tr>
                <td>${interval.from}</td>
                <td>${interval.to}</td>
                <td>${interval.interval}</td>
                <td>${interval.instrument}</td>
            </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

function renderHarmonicFunctions(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    const harm = data.harmonic_functions || {};
    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>
        <table class="statistics-table">
            <tr>
                <td><strong>Triads:</strong></td>
                <td>${harm.triads || 0}</td>
            </tr>
            <tr>
                <td><strong>Seventh Chords:</strong></td>
                <td>${harm.seventh_chords || 0}</td>
            </tr>
            <tr>
                <td><strong>Extended Chords:</strong></td>
                <td>${harm.extended_chords || 0}</td>
            </tr>
        </table>`;

    if (harm.chord_breakdown && Object.keys(harm.chord_breakdown).length > 0) {
        html += `<h4 style="margin-top: 15px;">Chord Distribution:</h4>
            <table class="statistics-table">
            <thead><tr><th>Chord</th><th>Occurrences</th></tr></thead>
            <tbody>`;

        Object.entries(harm.chord_breakdown).sort((a, b) => b[1] - a[1]).forEach(([chord, count]) => {
            html += `<tr><td>${chord}</td><td>${count}</td></tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

function renderPhraseStructure(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>`;

    if (data.phrases && data.phrases.length > 0) {
        html += `<table class="statistics-table">
            <thead><tr><th>Voice</th><th>Start</th><th>End</th><th>Length</th></tr></thead>
            <tbody>`;

        data.phrases.forEach(phrase => {
            html += `<tr>
                <td>${phrase.instrument}</td>
                <td>M. ${phrase.start_measure}</td>
                <td>M. ${phrase.end_measure}</td>
                <td>${phrase.length} measures</td>
            </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

function renderTextureAdvanced(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    const tex = data.texture || {};
    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>
        <table class="statistics-table">
            <tr>
                <td><strong>Average Note Density:</strong></td>
                <td>${tex.average_note_density} notes/measure</td>
            </tr>
        </table>`;

    if (tex.harmonic_rhythm && tex.harmonic_rhythm.length > 0) {
        const sampled = tex.harmonic_rhythm.filter((_, i) => i % 4 === 0).slice(0, 15);

        html += `<h4 style="margin-top: 15px;">Texture Progression (sampled every 4 measures):</h4>
            <table class="statistics-table">
            <thead><tr><th>Measure</th><th>Note Count</th><th>Density</th></tr></thead>
            <tbody>`;

        sampled.forEach(item => {
            html += `<tr>
                <td>M. ${item.measure}</td>
                <td>${item.note_count}</td>
                <td>${item.density}</td>
            </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

function renderChromaticAdvanced(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    const chrom = data.chromaticism || {};
    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>
        <table class="statistics-table">
            <tr>
                <td><strong>Chromatic Notes:</strong></td>
                <td>${chrom.chromatic_notes}</td>
            </tr>
            <tr>
                <td><strong>Diatonic Percentage:</strong></td>
                <td>${chrom.diatonic_percentage}%</td>
            </tr>
        </table>`;

    if (chrom.accidentals && Object.keys(chrom.accidentals).length > 0) {
        html += `<h4 style="margin-top: 15px;">Accidentals Distribution:</h4>
            <table class="statistics-table">
            <thead><tr><th>Type</th><th>Count</th></tr></thead>
            <tbody>`;

        Object.entries(chrom.accidentals).forEach(([type, count]) => {
            html += `<tr><td>${type}</td><td>${count}</td></tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

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

    return html;
}

function renderStatisticsAdvanced(data) {
    if (data.error) {
        return `<div style="padding: 20px; color: #ff6b6b;">${data.error}</div>`;
    }

    const stats = data.statistics || {};
    let html = `<div class="analysis-result">
        <p style="margin-bottom: 20px; color: #4d9eff;"><strong>${data.summary}</strong></p>
        <table class="statistics-table">
            <tr>
                <td><strong>Total Notes:</strong></td>
                <td>${stats.total_notes}</td>
            </tr>
            <tr>
                <td><strong>Unique Pitches:</strong></td>
                <td>${stats.unique_pitches}</td>
            </tr>
            <tr>
                <td><strong>Total Measures:</strong></td>
                <td>${stats.total_measures}</td>
            </tr>
            <tr>
                <td><strong>Parts/Instruments:</strong></td>
                <td>${stats.parts_count}</td>
            </tr>
            <tr>
                <td><strong>Average Duration (per note):</strong></td>
                <td>${stats.average_duration} quarter notes</td>
            </tr>
            <tr>
                <td><strong>Average Notes per Measure:</strong></td>
                <td>${stats.average_notes_per_measure}</td>
            </tr>
        </table>`;

    if (stats.pitch_distribution && Object.keys(stats.pitch_distribution).length > 0) {
        html += `<h4 style="margin-top: 15px;">Pitch Distribution:</h4>
            <table class="statistics-table">
            <thead><tr><th>Pitch</th><th>Count</th></tr></thead>
            <tbody>`;

        Object.entries(stats.pitch_distribution).sort((a, b) => b[1] - a[1]).forEach(([pitch, count]) => {
            html += `<tr><td>${pitch}</td><td>${count}</td></tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
}

function initializeCollapsibles() {
    if (!window.collapsiblesInitialized) {
        document.addEventListener('click', function(e) {
            const header = e.target.closest('.collapsible-header');
            if (!header) return;

            console.log('Collapsible header clicked:', header);

            const box = header.closest('.collapsible-box');
            if (box) {
                console.log('Toggling box:', box, 'Current classes:', box.className);
                box.classList.toggle('active');
                console.log('After toggle:', box.className);
            }
        });
        window.collapsiblesInitialized = true;
    }
}

function closeAdvancedResult() {
    document.getElementById('advanced-result-container').style.display = 'none';
}

async function exportAnalysisData(format) {
    if (format === 'json') {
        const dataStr = JSON.stringify(analysisData, null, 2);
        downloadFile(dataStr, 'analysis_data.json', 'application/json');
    } else if (format === 'csv') {
        // Convert to CSV (simplified)
        alert('CSV export coming soon!');
    }
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}


async function selectSymmetryAnalysis(analysisType) {
    if (!currentFilePath) {
        alert('Please upload a file first');
        return;
    }

    const container = document.getElementById('symmetry-instruments-container');
    const title = document.getElementById('symmetry-title');
    const select = document.getElementById('symmetry-instrument-select');
    const resultsDiv = document.getElementById('symmetry-results');

    console.log('selectSymmetryAnalysis called with type:', analysisType);
    console.log('Select element found:', select);
    console.log('Container element found:', container);

    title.textContent = analysisType === 'symmetry_music21'
        ? 'Select Instrument for Symmetry Analysis (Music21)'
        : 'Select Instrument for Symmetry Analysis';

    container.style.display = 'block';
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';

    window.currentSymmetryAnalysisType = analysisType;
    console.log('currentSymmetryAnalysisType set to:', window.currentSymmetryAnalysisType);

    try {
        console.log('Fetching parts from /api/get-parts with file_path:', currentFilePath);
        const response = await fetch('/api/get-parts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: currentFilePath })
        });

        console.log('Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        console.log('Parts received:', data);

        if (data.error) {
            console.error('Error in response data:', data.error);
            select.innerHTML = `<option value="">Error loading instruments</option>`;
            return;
        }

        console.log('Calling populateInstrumentSelect with', data.parts.length, 'parts');
        populateInstrumentSelect(data.parts);
    } catch (error) {
        console.error('Error loading instruments:', error);
        console.error('Error details:', error.message, error.stack);
        select.innerHTML = `<option value="">Error: ${error.message}</option>`;
    }
}

function populateInstrumentSelect(parts) {
    const select = document.getElementById('symmetry-instrument-select');

    console.log('populateInstrumentSelect called');
    console.log('Populating select with parts:', parts);
    console.log('Parts count:', parts ? parts.length : 'null');

    if (!parts || parts.length === 0) {
        console.warn('No parts provided or empty array');
        select.innerHTML = '<option value="">No instruments found</option>';
        return;
    }

    let html = '<option value="">-- Select an instrument --</option>';
    parts.forEach((part, index) => {
        console.log(`Adding part ${index}:`, part.name, part.instrument, part.notes_count);
        html += `<option value="${part.index}" data-name="${part.name}">${part.name} (${part.instrument}) - ${part.notes_count} notes</option>`;
    });

    console.log('Generated HTML options:', html.substring(0, 200) + '...');
    select.innerHTML = html;
    select.disabled = false;
    console.log('Select populated and enabled');

    select.onchange = function() {
        console.log('Select changed, value:', this.value);
        const selectedOption = this.options[this.selectedIndex];
        console.log('Selected option:', selectedOption.text);
        if (this.value !== '') {
            const partIndex = parseInt(this.value);
            const partName = selectedOption.dataset.name;
            console.log('Analyzing part:', partIndex, partName);
            analyzeSymmetryForInstrument(partIndex, partName);
        } else {
            console.log('No selection, clearing results');
            const resultsDiv = document.getElementById('symmetry-results');
            resultsDiv.style.display = 'none';
            resultsDiv.innerHTML = '';
        }
    };
}

async function analyzeSymmetryForInstrument(partIndex, partName) {
    const resultsDiv = document.getElementById('symmetry-results');
    const analysisType = window.currentSymmetryAnalysisType || 'symmetry';

    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="spinner" style="margin: 20px auto;"></div>
        <p style="text-align: center; color: #999;">Analyzing ${partName}...</p>
    `;

    try {
        // Get environment from checkbox (only for 'symmetry' type, not 'symmetry_music21')
        const environment = (analysisType === 'symmetry')
            ? (window.analysisEnvironment || 'tonal')
            : 'serial';  // symmetry_music21 always uses serial

        const requestBody = {
            file_path: currentFilePath,
            analysis_type: analysisType,
            part_index: partIndex
        };

        // Only add environment parameter for regular symmetry analysis
        if (analysisType === 'symmetry') {
            requestBody.environment = environment;
        }

        console.log('Sending symmetry analysis request:', requestBody);

        const response = await fetch('/api/advanced-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        displaySymmetryResult(partName, data);
    } catch (error) {
        console.error('Error in symmetry analysis:', error);
        resultsDiv.innerHTML = `<div style="color: #ff6b6b; padding: 20px;">Error: ${error.message}</div>`;
    }
}

function displaySymmetryResult(partName, data) {
    const resultsDiv = document.getElementById('symmetry-results');
    resultsDiv.innerHTML = `
        <h4 style="color: var(--accent-blue); margin-bottom: 15px;">${partName}</h4>
        ${renderSymmetryAdvanced(data)}
    `;
}

function closeSymmetryInstruments() {
    const container = document.getElementById('symmetry-instruments-container');
    container.style.display = 'none';

    const resultsDiv = document.getElementById('symmetry-results');
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';

    const select = document.getElementById('symmetry-instrument-select');
    select.innerHTML = '<option value="">-- Select an instrument --</option>';
    select.onchange = null;
}

// ============ TONAL VS SERIAL ANALYSIS FUNCTIONS ============

/**
 * Detect tonality of the uploaded score
 */
async function detectTonality(filePath) {
    if (!filePath) return;

    try {
        const response = await fetch('/api/detect-tonality', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filePath })
        });

        if (!response.ok) {
            console.warn('Tonality detection failed');
            return;
        }

        const data = await response.json();

        if (data.tonality_detected) {
            // Store tonality info globally
            window.detectedTonality = {
                tonality: data.tonality,
                mode: data.mode,
                tonic_pitch_class: data.tonic_pitch_class
            };

            // Update UI to show detected tonality
            const tonalityInfo = document.getElementById('tonality-info');
            const detectedTonalitySpan = document.getElementById('detected-tonality');

            if (tonalityInfo && detectedTonalitySpan) {
                detectedTonalitySpan.textContent = `${data.tonality} ${data.mode === 'major' ? 'Maior' : data.mode === 'minor' ? 'Menor' : data.mode}`;
                tonalityInfo.style.display = 'block';
            }

            // Ensure checkbox is unchecked (default to tonal)
            const serialCheckbox = document.getElementById('serialAnalysis');
            if (serialCheckbox) {
                serialCheckbox.checked = false;
                updateEnvironmentBadge(false);
            }

            console.log('Tonality detected:', data.tonality, data.mode);
        } else {
            console.log('No clear tonality detected');
            window.detectedTonality = null;
        }
    } catch (error) {
        console.error('Error detecting tonality:', error);
    }
}

/**
 * Update environment badge based on checkbox state
 */
function updateEnvironmentBadge(isSerial) {
    const badge = document.getElementById('environment-badge');
    if (badge) {
        badge.textContent = isSerial ? '🎵 Serial (12-tone)' : '🎼 Tonal';
    }

    // Update mode descriptions
    const tonalDesc = document.getElementById('mode-description-tonal');
    const serialDesc = document.getElementById('mode-description-serial');
    if (tonalDesc && serialDesc) {
        tonalDesc.style.display = isSerial ? 'none' : 'block';
        serialDesc.style.display = isSerial ? 'block' : 'none';
    }

    // Filter advanced analysis cards
    filterAdvancedAnalysisCards(isSerial);

    // Store in global variable
    window.analysisEnvironment = isSerial ? 'serial' : 'tonal';
    console.log('Analysis environment set to:', window.analysisEnvironment);
}

/**
 * Filter advanced analysis cards based on environment
 */
function filterAdvancedAnalysisCards(isSerial) {
    const tonalOnlyCards = document.querySelectorAll('[data-tonal-only="true"]');

    tonalOnlyCards.forEach(card => {
        if (isSerial) {
            // Hide tonal-only analyses in serial mode
            card.style.display = 'none';
        } else {
            // Show all analyses in tonal mode
            card.style.display = 'block';
        }
    });

    console.log(`Filtered ${tonalOnlyCards.length} tonal-only analysis cards (serial mode: ${isSerial})`);
}

/**
 * Initialize checkbox event listener
 */
document.addEventListener('DOMContentLoaded', function() {
    const serialCheckbox = document.getElementById('serialAnalysis');
    if (serialCheckbox) {
        serialCheckbox.addEventListener('change', function() {
            updateEnvironmentBadge(this.checked);
        });

        // Initialize with default value
        updateEnvironmentBadge(false);
    }
});

/**
 * Initialize zoom and scroll controls for comparison staff view
 */
function initComparisonStaffZoomControls() {
    // Track zoom level - start at 40% but allow proper persistence
    if (!window.comparisonStaffZoomLevel) {
        window.comparisonStaffZoomLevel = 40;
    }
    
    const outputDiv = document.getElementById('comparison-verovio-output');

    // Zoom In Button
    const zoomInBtn = document.getElementById('comparison-staff-zoom-in');
    if (zoomInBtn) {
        zoomInBtn.onclick = () => {
            const newZoom = Math.min(200, Math.round((window.comparisonStaffZoomLevel + 10) / 10) * 10);
            window.comparisonStaffZoomLevel = newZoom;
            updateComparisonStaffZoom();
        };
    }

    // Zoom Out Button
    const zoomOutBtn = document.getElementById('comparison-staff-zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
            const newZoom = Math.max(20, Math.round((window.comparisonStaffZoomLevel - 10) / 10) * 10);
            window.comparisonStaffZoomLevel = newZoom;
            updateComparisonStaffZoom();
        };
    }

    // Zoom Reset Button
    const zoomResetBtn = document.getElementById('comparison-staff-zoom-reset');
    if (zoomResetBtn) {
        zoomResetBtn.onclick = () => {
            window.comparisonStaffZoomLevel = 40;
            updateComparisonStaffZoom();
        };
    }

    // Enable scrolling with proper dimensions
    if (outputDiv) {
        outputDiv.style.overflow = 'auto';
        outputDiv.style.maxHeight = '800px';
        outputDiv.style.minHeight = '400px';
        // Add padding to ensure scroll works even if content width doesn't exceed container
        outputDiv.style.paddingBottom = '100px';
        outputDiv.style.paddingRight = '20px';
    }
}

/**
 * Update zoom level for comparison staff view
 */
function updateComparisonStaffZoom() {
    const outputDiv = document.getElementById('comparison-verovio-output');
    const zoomLevelDisplay = document.getElementById('comparison-staff-zoom-level');

    if (outputDiv && window.comparisonStaffZoomLevel) {
        // Scale all SVG content by changing width/height instead of transform
        const svgs = outputDiv.querySelectorAll('svg');
        svgs.forEach(svg => {
            const scale = window.comparisonStaffZoomLevel / 100;
            
            // Get original dimensions
            const originalWidth = svg.getAttribute('data-original-width') || svg.getBBox().width || 2000;
            const originalHeight = svg.getAttribute('data-original-height') || svg.getBBox().height || 1000;
            
            // Store original dimensions if not already stored
            if (!svg.getAttribute('data-original-width')) {
                svg.setAttribute('data-original-width', originalWidth);
                svg.setAttribute('data-original-height', originalHeight);
            }
            
            // Apply zoom by changing actual dimensions (not transform)
            svg.style.width = (originalWidth * scale) + 'px';
            svg.style.height = (originalHeight * scale) + 'px';
            svg.style.display = 'block';
            svg.style.marginBottom = '50px';
        });

        // Update zoom level display
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${window.comparisonStaffZoomLevel}%`;
        }

        // Force reflow to recalculate scroll dimensions
        setTimeout(() => {
            outputDiv.scrollLeft = outputDiv.scrollLeft; // Trigger scroll recalculation
        }, 50);

        console.log(`🔍 Zoom level updated to ${window.comparisonStaffZoomLevel}%`);
    }
}

/**
 * Add scroll listeners to comparison staff view
 */
function addComparisonStaffScrolling() {
    const outputDiv = document.getElementById('comparison-verovio-output');
    if (outputDiv) {
        // Already has overflow: auto from CSS
        console.log('✅ Scrolling enabled for comparison staff view');
    }
}
