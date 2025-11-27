# MusicXML Score Analyzer with AI

A modern web application for MusicXML score analysis, combining traditional music theory with the power of Artificial Intelligence.

![Application Screenshot](static/screenshot.png) *Note: Add a screenshot here if desired.*

## 🚀 Main Features

### 🎼 Musical Analysis
*   **MusicXML Upload:** Support for `.xml` and `.musicxml` files.
*   **General Information:** Automatic extraction of title, key, measures, instruments, and time signatures.
*   **Melodic Analysis:**
    *   Count of most common intervals.
    *   Melodic direction analysis (ascending/descending).
    *   Rhythmic analysis and note density.
*   **Harmonic Analysis:**
    *   Harmonic reduction based on selected instruments.
    *   Identification of chords and tonal functions (Roman numerals).
*   **Reports:** Detailed visualization in collapsible sections and export to TXT.

### 🤖 AI Integration
*   **AI Panel:** Integrated into each report section for deep contextual analysis.
*   **Model Flexibility:**
    *   **Online:** Compatible with OpenAI (GPT-3.5, GPT-4, etc.).
    *   **Local:** Compatible with LM Studio, LocalAI, and Ollama.
*   **Customizable Prompts:** Prompt editor to save your favorite analysis instructions.
*   **Automatic Context:** The prompt sent to the AI automatically includes the section title and analyzed data.

### 🎨 Modern Interface
*   **Themes:** Toggle between **Dark Mode** (default, with blue and purple accents) and **Light Mode** (sober and concise).
*   **Responsive Design:** Adaptable to desktops, tablets, and mobile devices.
*   **Rich Visualization:** Real-time Markdown formatting in AI responses.

### ⚙️ Advanced Settings
*   **Persistence:** API settings, models, and themes are saved on the server (`config.json`), keeping your preferences on any device.
*   **Key Management:** Secure interface to configure URLs and API Keys.
*   **AI Prompts Configuration:** Customize the base prompts used for different types of analysis:
    *   **Piano Roll Analysis:** Detailed melodic and statistical analysis prompts
    *   **Comparison Analysis:** Cross-instrument comparative analysis prompts
    *   **Melodic Quick Analysis:** Quick melodic context analysis
    *   **General Panel Analysis:** Finishing statement for general AI analysis
*   **Placeholder Support:** Use dynamic placeholders like `{instrumentName}`, `{totalNotes}`, `{startMeasure}`, etc. to create flexible, reusable prompts.

## 🛠️ Installation and Execution

### Prerequisites
*   Python 3.8+
*   pip

### Steps
1.  **Clone the repository:**
    ```bash
    git clone [repository-url]
    cd [folder-name]
    ```

2.  **Create a virtual environment (optional, but recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the application:**
    ```bash
    python3 app.py
    ```

5.  **Access in browser:**
    Open `http://127.0.0.1:8080`

## ⚙️ AI Configuration

To use AI features, go to **Advanced Options** (gear icon in the top right corner):

### OpenAI (Online)
1.  In "Remote API", enter the URL (default: `https://api.openai.com/v1`).
2.  Enter your OpenAI **API Key**.
3.  Set the model (e.g., `gpt-3.5-turbo`).

### LM Studio / LocalAI (Local)
1.  In "Local API", enter your local server URL (e.g., `http://localhost:1234/v1` for LM Studio).
2.  The API Key can be any string if not required.
3.  Set the name of the model loaded on your local server.

### 🎵 AI Analysis Prompts

Customize the prompts used for different types of analysis in the **Advanced Options** modal under "🎵 AI Analysis Prompts":

#### **Available Prompt Types**

1. **Piano Roll Analysis**
   - Used for detailed melodic and statistical analysis of piano roll data
   - Includes statistical information, interval analysis, rhythmic patterns
   - Supports placeholders: `{instrumentName}`, `{totalNotes}`, `{pitchRangeMin}`, `{pitchRangeMax}`, `{pitchRangeSemitones}`, `{totalDuration}`, `{avgDuration}`, `{topIntervals}`, `{rhythmicPatterns}`

2. **Comparison Analysis**
   - Used for cross-instrument comparative analysis
   - Focuses on melodic relationships, instrumental dialogue, and contrast
   - Supports placeholders: `{startMeasure}`, `{endMeasure}`, `{instrumentsData}`

3. **Melodic Quick Analysis**
   - Used for quick melodic context analysis
   - Analyzes intervals, direction, density, and rhythmic patterns
   - Supports placeholders: `{instrumentName}`

4. **General Panel Analysis**
   - Finishing statement for general AI analysis
   - Ensures AI focuses on analysis rather than repeating raw data
   - No placeholders (static text)

#### **How to Edit Prompts**

1. Open **Advanced Options** (gear icon)
2. Scroll to the **"🎵 AI Analysis Prompts"** section
3. Edit any of the 4 textarea fields with your custom prompts
4. Use the placeholder variables to make prompts dynamic
5. Click **"Save Settings"** to persist your changes

#### **Example: Custom Piano Roll Analysis Prompt**

```
# Musical Analysis: {instrumentName}

## Data Summary
- Total Notes: {totalNotes}
- Range: {pitchRangeMin} to {pitchRangeMax}
- Duration: {totalDuration} beats

## Analysis
Please analyze the following melodic characteristics:
- Contour and direction
- Interval usage and preferences
- Rhythmic patterns and density
- Suggested interpretive approach
```

### ⚙️ Configuration Files

- **`config.json`**: User settings (API keys, theme, context phrases, custom prompts) - automatically created on first run
- **`config/ai_models.json`**: Default AI model configurations and base prompt templates
- **`config/README.md`**: Detailed documentation of the configuration system



## 📂 Project Structure

*   `app.py`: Flask server and backend logic.
*   `config.json`: Stores user settings (automatically created) - includes API keys, theme, context phrases, and custom AI prompts.
*   `config/ai_models.json`: Default AI model configurations, available models, context phrases, analysis settings, and base prompt templates.
*   `config/README.md`: Documentation of the configuration system and how to customize it.
*   `templates/index.html`: HTML structure of the application.
*   `static/style.css`: CSS styles with theme variables.
*   `static/script.js`: Frontend logic, API calls, state management, and prompt loading/saving.

## 🤝 Contribution

Feel free to open issues or submit pull requests to improve this analyzer!

---
Developed with ❤️ and Music.