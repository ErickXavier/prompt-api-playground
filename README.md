# Prompt API Playground

A client-side web application demonstrating Chrome's experimental **[Prompt API](https://developer.chrome.com/docs/ai/prompt-api)** powered by Gemini Nano. Chat with a local AI model running entirely in your browser. No server, no API keys, no data sent to the cloud.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-128%2B-green.svg)

## Features

- **100% Private**: All AI inference happens locally in your browser
- **Multi-Chat Support**: Create and manage multiple conversation threads
- **Persistent History**: Chat history saved in localStorage
- **Customizable Parameters**: Adjust temperature and top-K for response variety
- **Token Usage Tracking**: Monitor token consumption in real-time
- **Export Chats**: Export conversations as Markdown files
- **Keyboard Shortcuts**: Navigate efficiently with keyboard commands
- **Clean UI**: Collapsible sidebars with persistent state

## Quick Start

### Prerequisites

1. **Browser**: Chrome Dev or Canary (version 128 or higher)
2. **Enable Required Flags** at `chrome://flags`:
   - **Prompt API for Gemini Nano**: `Enabled`
   - **Enables optimization guide on device**: `Enabled BypassPerfRequirement`
3. **Download the AI Model** at `chrome://components`:
   - Find "Optimization Guide On Device Model"
   - Click "Check for update" to download Gemini Nano

> ⚠️ **Important**: The Prompt API is experimental and only available in Chrome Dev/Canary with specific flags enabled.

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/ErickXavier/prompt-api-playground.git
    cd prompt-api-playground
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:

    ```bash
    npm start
    ```

4. Open your browser and navigate to `https://localhost:8080`

> **Note**: The app automatically redirects to HTTPS (required for Prompt API access).

## Usage

### Basic Chat

1. Type your message in the input box at the bottom
2. Press **Enter** to send (or **Shift+Enter** for a new line)
3. Watch the AI respond in real-time with streaming text

### Managing Chats

- **New Chat**: Click the pencil icon in the left sidebar or press **Cmd/Ctrl+K**
- **Switch Chats**: Click any chat in the history sidebar
- **Delete Chat**: Hover over a chat and click the trash icon
- **Search Chats**: Use the search box at the top of the sidebar
- **Rename Chat**: Click the chat title at the top and edit it inline

### Adjusting Settings

Open the right sidebar (settings icon) to customize:

- **Temperature** (0.0 - 2.0): Controls randomness
  - Lower = More focused and deterministic
  - Higher = More creative and varied
- **Top-K** (1 - 128): Limits token sampling pool
  - Lower = More focused vocabulary
  - Higher = More diverse word choices

### Exporting Conversations

1. Click **Export Chat** in the settings sidebar
2. Downloads the current conversation as a Markdown file
3. Or use **Copy Chat** to copy the conversation to clipboard

### Keyboard Shortcuts

| Shortcut      | Action               |
| ------------- | -------------------- |
| `Cmd/Ctrl+K`  | New chat             |
| `Cmd/Ctrl+/`  | Toggle left sidebar  |
| `Cmd/Ctrl+.`  | Toggle right sidebar |
| `Escape`      | Close open sidebar   |
| `Enter`       | Send message         |
| `Shift+Enter` | New line in message  |

## Architecture

The application follows a clean **manager-based architecture**:

- **script.js**: Main orchestrator and Prompt API integration
- **ChatManager**: Handles chat CRUD operations and localStorage persistence
- **UIManager**: Manages DOM interactions and UI state
- **StorageManager**: Abstracts localStorage operations

### Key Technical Details

- **No Backend**: Pure client-side application
- **ES6 Modules**: Uses native JavaScript modules via CDN
- **Session Management**: Prompt API sessions are ephemeral; chat history is persisted separately
- **Markdown Support**: Assistant responses rendered with marked.js and sanitized with DOMPurify
- **localStorage**: Stores up to 50 most recent chats to prevent quota errors

## Documentation

- **[prompt-api-docs.md](prompt-api-docs.md)**: Comprehensive Portuguese guide to the Prompt API
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)**: Developer guide for AI coding agents

## Development

### Project Structure

```plaintext
prompt-api-playground/
├── index.html           # Main HTML structure
├── style.css            # Application styles
├── script.js            # Main application logic
├── chatManager.js       # Chat history management
├── uiManager.js         # UI state and interactions
├── storageManager.js    # localStorage abstraction
├── prompt-api-docs.md   # API documentation (PT-BR)
└── package.json         # Project configuration
```

### Code Style

- ES6+ JavaScript with async/await patterns
- JSDoc comments for public methods
- No build step—runs directly in browser
- Format code with: `npm run fix` (Prettier)

### Testing

Currently no automated tests. Manual testing checklist:

- [ ] Create/delete/switch between chats
- [ ] Messages persist across page reloads
- [ ] Temperature/Top-K settings affect responses
- [ ] Export to Markdown works
- [ ] Keyboard shortcuts function
- [ ] Sidebar states persist

## Troubleshooting

### "Prompt API not available" error

1. Verify you're using Chrome Dev or Canary (128+)
2. Check flags are enabled at `chrome://flags`
3. Confirm model downloaded at `chrome://components`
4. Restart Chrome after enabling flags

### Model not responding

1. Check browser console for errors
2. Verify secure context (HTTPS)
3. Try clearing localStorage and reloading
4. Recreate the session by adjusting temperature/top-K

### localStorage quota exceeded

The app limits storage to 50 chats. If you hit quota issues:

1. Click **Clear all Data** in settings (warning: deletes all chats)
2. Or manually delete old chats from the sidebar

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

Copyright 2024 Google LLC

## Author

Erick Xavier

- GitHub: [@ErickXavier](https://github.com/ErickXavier)

## Acknowledgments

- Built with Chrome's experimental [Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
- Powered by [Gemini Nano](https://deepmind.google/technologies/gemini/nano/)
- Markdown rendering by [marked.js](https://marked.js.org/)
- XSS protection by [DOMPurify](https://github.com/cure53/DOMPurify)

## Links

- [Chrome AI Early Preview Program](https://goo.gle/chrome-ai-dev-preview-join)
- [Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [GitHub Repository](https://github.com/ErickXavier/prompt-api-playground)

---

**If you find this project useful, please consider giving it a star on GitHub!**
