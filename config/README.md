# AI Models Configuration

This directory contains configuration files for the MIAL application, specifically for AI model integration.

## `ai_models.json`

This file centralizes all AI model configurations, allowing easy manual editing without modifying the main application code.

### Structure

```json
{
  "remote": {
    "name": "Display name for the remote API",
    "api_url": "https://api.example.com/v1",
    "api_key": "your-api-key-here",
    "default_model": "model-name",
    "available_models": ["model1", "model2", "model3"],
    "enabled": true,
    "description": "Brief description of this API"
  },
  "local": {
    "name": "Display name for local API",
    "api_url": "http://localhost:1234/v1",
    "api_key": "not-needed",
    "default_model": "local-model",
    "available_models": ["model1", "model2"],
    "enabled": false,
    "description": "Brief description"
  },
  "context_phrases": [
    "Phrase 1 for AI context",
    "Phrase 2 for AI context"
  ],
  "analysis_settings": {
    "temperature": 0.7,
    "max_tokens": 2000,
    "timeout_seconds": 30
  }
}
```

### Configuration Priority

The application uses the following priority when loading configurations:

1. **User Settings** (stored in `config.json` via the UI's "Advanced Options")
   - These override the defaults from `ai_models.json`
   - Set in the application's settings panel

2. **`ai_models.json` Defaults** (this file)
   - Used when user settings are not configured
   - Provides fallback defaults

### How to Edit

#### Remote API Configuration

If you want to change the remote API provider (e.g., from OpenAI to Azure OpenAI or a local proxy):

```json
"remote": {
  "api_url": "https://your-custom-endpoint.com/v1",
  "api_key": "",
  "default_model": "gpt-3.5-turbo",
  "available_models": ["gpt-3.5-turbo", "gpt-4", "custom-model"]
}
```

#### Local API Configuration

If you have LM Studio or LocalAI running on a different port:

```json
"local": {
  "api_url": "http://localhost:8000/v1",
  "api_key": "not-needed",
  "default_model": "local-model"
}
```

#### Analysis Settings

Adjust the temperature (creativity) and token limits:

```json
"analysis_settings": {
  "temperature": 0.5,      // Lower = more deterministic (0-1)
  "max_tokens": 4000,      // Maximum response length
  "timeout_seconds": 60    // Request timeout
}
```

#### Context Phrases

Add or modify AI system prompts for music analysis:

```json
"context_phrases": [
  "You are an expert in Baroque music.",
  "Focus on harmonic progressions and chord functions.",
  "Identify modulations and cadence types."
]
```

### Usage in Application

- **User Settings Panel**: Advanced Options → AI Configuration
  - These settings override `ai_models.json` when set
  - Stored in `config.json`
  - Can be changed via the UI

- **Default Fallback**: If no user settings are configured, the application uses defaults from `ai_models.json`

### Examples

#### Example 1: Using Azure OpenAI

```json
"remote": {
  "name": "Azure OpenAI",
  "api_url": "https://your-resource.openai.azure.com/v1",
  "api_key": "your-azure-api-key",
  "default_model": "gpt-4-deployment-name"
}
```

#### Example 2: Using a Local LLM via LM Studio

```json
"local": {
  "name": "Local LLM (LM Studio)",
  "api_url": "http://localhost:1234/v1",
  "api_key": "not-needed",
  "default_model": "mistral-7b-instruct-v0.1",
  "available_models": ["mistral-7b-instruct-v0.1", "neural-chat-7b"]
}
```

#### Example 3: High-Quality Analysis (Slower, More Expensive)

```json
"analysis_settings": {
  "temperature": 0.8,
  "max_tokens": 4000,
  "timeout_seconds": 60
}
```

---

## Notes

- **No Security Measures**: This file is intended for personal use only. API keys are stored in plain text. 
- **User Settings Override**: Configurations set via the UI's "Advanced Options" will take precedence over `ai_models.json` defaults.
- **Reload Required**: Changes to this file require restarting the application to take effect.
- **Optional Fields**: Fields marked as not required can be omitted (e.g., `enabled` defaults to `true`).

---

## Related Files

- **`config.json`**: User-configurable settings (created by the app, not included in repo)
- **`app.py`**: Backend code that loads both configurations
- **`static/script.js`**: Frontend code that calls the AI endpoints
