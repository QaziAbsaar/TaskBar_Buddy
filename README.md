# Humungousaur Desktop AI Agent

Humungousaur is a desktop companion built with Electron and Gemini.
He walks on your screen, opens a chat panel, and can perform PC actions like opening apps, searching the web, opening URLs, and running commands.

## Features

- Desktop character overlay with hover/angry states
- Chat panel with action execution support
- Tray menu controls (Open Chat, Settings, Show/Hide, Quit)
- Full settings panel for:
  - Gemini API key
  - Model selection
  - Temperature
  - Optional custom system prompt
- Persistent config storage in Electron user data

## Requirements

- Windows
- Node.js 18+
- Gemini API key from Google AI Studio

## Install

1. Open a terminal in this folder.
2. Install dependencies:

```bash
npm install
```

## Run

Use one of these:

```bash
npm start
```

or:

```powershell
.\start.ps1
```

## First-Time Setup

1. Launch the app.
2. Open Settings from either:
   - Tray icon -> Settings
   - Chat window gear icon
3. Enter your Gemini API key.
4. Choose a model and temperature.
5. (Optional) Add a custom system prompt.
6. Click Save.

## How To Use

- Click the character to open chat.
- Ask normal questions for conversation.
- Ask action commands like:
  - "Open notepad"
  - "Search web for best burger places"
  - "Open https://github.com"

## Supported Action Types

- `open_app`
- `open_path`
- `search_web`
- `open_url`
- `run_command`

## Troubleshooting

- Character/chat shows API key warning:
  - Open Settings and save a valid Gemini API key.
- API errors (401/invalid key):
  - Recheck key in Settings.
- Rate limit (429):
  - Wait briefly and retry.
- Settings not applying:
  - Save in Settings and reopen chat.

## Project Files

- `main.js` - Electron app lifecycle, windows, tray, IPC, config
- `llm.js` - Gemini setup, prompt, chat, response parsing
- `index.html` - Character overlay UI/behavior
- `command.html` - Chat interface
- `settings.html` - Settings interface
- `assets/` - Character and icon assets

## Notes

This app is currently configured for Gemini models. If you switch models in Settings, ensure your API key has access to that model.
