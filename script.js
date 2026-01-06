/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { marked } from "https://cdn.jsdelivr.net/npm/marked@13.0.3/lib/marked.esm.js";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs";
import { ChatManager } from "./chatManager.js";
import { UIManager } from "./uiManager.js";

const NUMBER_FORMAT_LANGUAGE = "en-US";
const SYSTEM_PROMPT = "You are a helpful and friendly assistant.";

(async () => {
  // Initialize managers
  const chatManager = new ChatManager();
  let uiManager = null;

  const errorMessage = document.getElementById("error-message");
  const costSpan = document.getElementById("cost");
  const promptInput = document.getElementById("prompt-input");
  const responseArea = document.getElementById("response-area");
  const copyLinkButton = document.getElementById("copy-link-button");
  const resetButton = document.getElementById("reset-button");
  const rawResponse = document.querySelector(".raw-response");
  const form = document.getElementById("message-form");
  const maxTokensInfo = document.getElementById("max-tokens");
  const temperatureInfo = document.getElementById("temperature");
  const tokensLeftInfo = document.getElementById("tokens-left");
  const tokensSoFarInfo = document.getElementById("tokens-so-far");
  const topKInfo = document.getElementById("top-k");
  const sessionTemperature = document.getElementById("session-temperature");
  const sessionTopK = document.getElementById("session-top-k");
  const messagesContainer = document.getElementById("messages-container");
  const newChatBtn = document.getElementById("new-chat-btn");
  const exportChatBtn = document.getElementById("export-chat-btn");
  const chatTitle = document.getElementById("current-chat-title");
  const infoBtn = document.getElementById("info-btn");
  const aboutModal = document.getElementById("about-modal");
  const closeModalBtn = document.getElementById("close-modal");
  const alertDialog = document.getElementById("alert-dialog");
  const alertMessage = document.getElementById("alert-message");
  const alertOkBtn = document.getElementById("alert-ok-btn");
  const confirmDialog = document.getElementById("confirm-dialog");
  const confirmMessage = document.getElementById("confirm-message");
  const confirmOkBtn = document.getElementById("confirm-ok-btn");
  const confirmCancelBtn = document.getElementById("confirm-cancel-btn");

  let session = null;
  let currentMessageBubble = null;

  // Custom alert function
  function showAlert(message) {
    return new Promise((resolve) => {
      alertMessage.textContent = message;
      alertDialog.showModal();

      const handleOk = () => {
        alertDialog.close();
        alertOkBtn.removeEventListener("click", handleOk);
        resolve();
      };

      alertOkBtn.addEventListener("click", handleOk);
    });
  }

  // Custom confirm function
  function showConfirm(message) {
    return new Promise((resolve) => {
      confirmMessage.textContent = message;
      confirmDialog.showModal();

      const handleOk = () => {
        confirmDialog.close();
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        resolve(true);
      };

      const handleCancel = () => {
        confirmDialog.close();
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        resolve(false);
      };

      confirmOkBtn.addEventListener("click", handleOk);
      confirmCancelBtn.addEventListener("click", handleCancel);
    });
  }

  if (!("LanguageModel" in self)) {
    // Hide welcome content and show setup instructions
    // const welcomeContent = document.getElementById("welcome-content");
    const setupInstructions = document.getElementById("setup-instructions");

    // if (welcomeContent) welcomeContent.style.display = "none";
    if (setupInstructions) setupInstructions.style.display = "block";

    // Disable chat input and new chat buttons
    const promptInput = document.getElementById("prompt-input");
    const newChatBtn = document.getElementById("new-chat-btn");
    const collapsedNewChatBtn = document.getElementById("collapsed-new-chat-btn");
    const temperatureInput = document.getElementById("session-temperature");
    const topKInput = document.getElementById("session-top-k");

    if (promptInput) promptInput.disabled = true;
    if (newChatBtn) newChatBtn.disabled = true;
    if (collapsedNewChatBtn) collapsedNewChatBtn.disabled = true;
    if (temperatureInput) temperatureInput.disabled = true;
    if (topKInput) topKInput.disabled = true;

    return;
  }

  // Initialize UI Manager
  uiManager = new UIManager(chatManager);

  // Override UI Manager event handlers
  uiManager.onNewChat = createNewChat;
  uiManager.onChatSelect = loadChat;
  uiManager.onChatDelete = deleteChat;

  /**
   * Create new chat
   */
  function createNewChat() {
    // Save current chat if exists
    const currentChat = chatManager.getActiveChat();

    // Create new chat
    const newChat = chatManager.createNewChat({
      temperature: Number(sessionTemperature.value),
      topK: Number(sessionTopK.value),
    });

    // Clear UI
    responseArea.innerHTML = "";
    messagesContainer.classList.remove("has-messages");
    chatTitle.textContent = newChat.title;

    // Update chat history UI
    uiManager.renderChatHistory();

    // Reset session
    session?.destroy();
    session = null;
    updateSession();

    // Focus input
    promptInput.focus();
  }

  /**
   * Load existing chat
   */
  function loadChat(chatId) {
    const chat = chatManager.getChat(chatId);
    if (!chat) return;

    // Set as active
    chatManager.setActiveChat(chatId);

    // Update title
    chatTitle.textContent = chat.title;

    // Clear and load messages
    responseArea.innerHTML = "";
    chat.messages.forEach((msg) => {
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("message", msg.role);

      const bubble = document.createElement("div");
      bubble.classList.add("message-bubble");

      if (msg.role === "user") {
        bubble.textContent = msg.content;
      } else {
        bubble.innerHTML = DOMPurify.sanitize(marked.parse(msg.content));
      }

      messageDiv.appendChild(bubble);
      responseArea.appendChild(messageDiv);
    });

    // Show/hide welcome message based on messages
    if (chat.messages.length > 0) {
      messagesContainer.classList.add("has-messages");
    } else {
      messagesContainer.classList.remove("has-messages");
    }

    // Recreate session with saved settings
    session?.destroy();
    session = null;

    if (chat.settings) {
      sessionTemperature.value = chat.settings.temperature;
      sessionTopK.value = chat.settings.topK;
    }

    updateSession();

    // Update chat history UI
    uiManager.renderChatHistory();

    // Focus input
    promptInput.focus();
  }

  /**
   * Delete chat
   */
  async function deleteChat(chatId) {
    const confirmed = await showConfirm(
      "Are you sure you want to delete this chat?",
    );
    if (!confirmed) {
      return;
    }

    const wasActive = chatManager.activeChat === chatId;
    chatManager.deleteChat(chatId);

    // If we deleted the active chat, create a new one
    if (wasActive) {
      createNewChat();
    } else {
      // Just refresh the chat history
      uiManager.renderChatHistory();
    }
  }

  /**
   * Scroll to bottom of messages
   */
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  const promptModel = async (highlight = false) => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // Ensure we have an active chat
    let activeChat = chatManager.getActiveChat();
    if (!activeChat) {
      activeChat = chatManager.createNewChat({
        temperature: Number(sessionTemperature.value),
        topK: Number(sessionTopK.value),
      });
      uiManager.renderChatHistory();
    }

    // Add user message to chat
    chatManager.addMessage(activeChat.id, "user", prompt);

    // Update chat title in UI if it changed
    if (chatTitle.textContent !== activeChat.title) {
      chatTitle.textContent = activeChat.title;
      uiManager.renderChatHistory();
    }

    // Render user message
    const userMessageDiv = document.createElement("div");
    userMessageDiv.classList.add("message", "user");
    const userBubble = document.createElement("div");
    userBubble.classList.add("message-bubble");
    userBubble.textContent = prompt;
    userMessageDiv.appendChild(userBubble);
    responseArea.appendChild(userMessageDiv);

    // Hide welcome message on first message
    messagesContainer.classList.add("has-messages");

    // Render assistant response placeholder
    const assistantMessageDiv = document.createElement("div");
    assistantMessageDiv.classList.add("message", "assistant");
    const assistantBubble = document.createElement("div");
    assistantBubble.classList.add("message-bubble");
    assistantBubble.textContent = "Generating response...";
    assistantMessageDiv.appendChild(assistantBubble);
    responseArea.appendChild(assistantMessageDiv);
    currentMessageBubble = assistantBubble;

    scrollToBottom();

    // Clear input
    promptInput.value = "";
    promptInput.style.height = "auto";
    costSpan.textContent = "";

    try {
      if (!session) {
        await updateSession();
        updateStats();
      }
      const stream = await session.promptStreaming(prompt);

      let result = "";
      let previousChunk = "";
      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        result += newChunk;
        p.innerHTML = DOMPurify.sanitize(marked.parse(result));
        if (rawResponse) {
          rawResponse.innerText = result;
        }
        previousChunk = chunk;
        scrollToBottom();
      }

      // Save assistant response to chat
      chatManager.addMessage(activeChat.id, "assistant", result);
    } catch (error) {
      p.textContent = `Error: ${error.message}`;
      p.style.color = "var(--accent-error)";
    } finally {
      updateStats();
      scrollToBottom();
    }
  };

  const updateStats = () => {
    if (!session) {
      return;
    }

    // Use UI Manager if available
    if (uiManager) {
      uiManager.updateStats(session);
    }

    // Legacy direct updates for compatibility
    const numberFormat = new Intl.NumberFormat(NUMBER_FORMAT_LANGUAGE);
    const decimalNumberFormat = new Intl.NumberFormat(NUMBER_FORMAT_LANGUAGE, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    if (temperatureInfo) {
      temperatureInfo.textContent = decimalNumberFormat.format(
        session.temperature,
      );
    }
    if (topKInfo) {
      topKInfo.textContent = numberFormat.format(session.topK);
    }

    // In the new API shape, currently in Chrome Canary, `session.maxTokens` was renamed to
    // `session.inputQuota` and `session.tokensSoFar` was renamed to `session.inputUsage`.
    // `session.tokensSoFar` was removed, but the value can be calculated by subtracting
    // `inputUsage` from `inputQuota`. Both APIs shapes are checked in the code below.
    const maxTokens = session.inputQuota || session.maxTokens;
    const tokensLeft =
      session.tokensSoFar || session.inputQuota - session.inputUsage;
    const tokensSoFar = session.inputUsage || session.tokensSoFar;

    if (maxTokensInfo) {
      maxTokensInfo.textContent = numberFormat.format(maxTokens);
    }
    if (tokensLeftInfo) {
      tokensLeftInfo.textContent = numberFormat.format(tokensLeft);
    }
    if (tokensSoFarInfo) {
      tokensSoFarInfo.textContent = numberFormat.format(tokensSoFar);
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await promptModel();
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  promptInput.addEventListener("focus", () => {
    promptInput.select();
  });

  promptInput.addEventListener("input", async () => {
    const value = promptInput.value.trim();
    if (!value || !session) {
      costSpan.textContent = "";
      return;
    }

    let cost;

    // The API that returns the token count for a prompt changed between Chrome Stable and Canary
    // and the method was renamed from `countPromptTokens(input)` to `measureInputUsage(input)`.
    // The code below ensures both cases are handled.
    if (session.countPromptTokens) {
      cost = await session.countPromptTokens(value);
    } else if (session.measureInputUsage) {
      cost = await session.measureInputUsage(value);
    }

    if (!cost) {
      return;
    }
    costSpan.textContent = `${cost} token${cost === 1 ? "" : "s"}`;
  });

  resetButton.addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "Are you sure you want to clear all data? This will delete all chat history and settings.",
    );
    if (!confirmed) {
      return;
    }

    // Clear chat manager and UI first
    chatManager.chats = [];
    chatManager.activeChat = null;
    uiManager.renderChatHistory();

    // Clear response area
    responseArea.innerHTML = "";
    messagesContainer.classList.remove("has-messages");
    chatTitle.textContent = "New Chat";

    // Clear localStorage
    localStorage.clear();

    // Destroy current session
    session?.destroy();
    session = null;

    // Reload the page to start fresh
    window.location.reload();
  });

  exportChatBtn?.addEventListener("click", async () => {
    const activeChat = chatManager.getActiveChat();
    if (!activeChat) {
      await showAlert("No active chat to export");
      return;
    }

    const markdown = chatManager.exportChatAsMarkdown(activeChat.id);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // About modal handlers
  infoBtn?.addEventListener("click", () => {
    aboutModal.showModal();
  });

  closeModalBtn?.addEventListener("click", () => {
    aboutModal.close();
  });

  // Close dialog when clicking outside (on backdrop)
  aboutModal?.addEventListener("click", (e) => {
    const rect = aboutModal.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      aboutModal.close();
    }
  });

  copyLinkButton.addEventListener("click", () => {
    const activeChat = chatManager.getActiveChat();
    if (!activeChat) return;

    const markdown = chatManager.exportChatAsMarkdown(activeChat.id);
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        const text = copyLinkButton.textContent;
        copyLinkButton.textContent = "Copied!";
        setTimeout(() => {
          copyLinkButton.textContent = text;
        }, 2000);
      })
      .catch(async (err) => {
        await showAlert("Failed to copy: " + err);
      });
  });

  const updateSession = async () => {
    if (self.LanguageModel) {
      const activeChat = chatManager.getActiveChat();
      const settings = activeChat?.settings || {};

      session = await LanguageModel.create({
        temperature:
          Number(sessionTemperature.value) || settings.temperature || 1.0,
        topK: Number(sessionTopK.value) || settings.topK || 3,
        initialPrompts: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
        ],
      });
    }
    updateStats();
  };

  sessionTemperature.addEventListener("input", async () => {
    // Update value display
    const tempValue = document.getElementById("temperature-value");
    if (tempValue) {
      tempValue.textContent = parseFloat(sessionTemperature.value).toFixed(1);
    }

    // Update active chat settings
    const activeChat = chatManager.getActiveChat();
    if (activeChat) {
      activeChat.settings.temperature = Number(sessionTemperature.value);
      chatManager.save();
    }

    await updateSession();
  });

  sessionTopK.addEventListener("input", async () => {
    // Update value display
    const topKValue = document.getElementById("topk-value");
    if (topKValue) {
      topKValue.textContent = sessionTopK.value;
    }

    // Update active chat settings
    const activeChat = chatManager.getActiveChat();
    if (activeChat) {
      activeChat.settings.topK = Number(sessionTopK.value);
      chatManager.save();
    }

    await updateSession();
  });

  if (!session) {
    let { defaultTopK, maxTopK, defaultTemperature, maxTemperature } =
      "LanguageModel" in self
        ? await LanguageModel.params()
        : {
            defaultTopK: 3,
            maxTopK: 128,
            defaultTemperature: 1,
            maxTemperature: 2,
          };
    defaultTopK ||= 3; // https://crbug.com/441711146
    sessionTemperature.value = defaultTemperature;
    sessionTemperature.max = maxTemperature;
    sessionTopK.value = defaultTopK;
    sessionTopK.max = maxTopK;

    // Update value displays
    const tempValue = document.getElementById("temperature-value");
    const topKValueEl = document.getElementById("topk-value");
    if (tempValue) tempValue.textContent = defaultTemperature.toFixed(1);
    if (topKValueEl) topKValueEl.textContent = defaultTopK;

    // Load last active chat or create first one
    const lastActiveId = chatManager.activeChat || chatManager.chats[0]?.id;
    if (lastActiveId) {
      loadChat(lastActiveId);
    } else {
      // Create first chat
      createNewChat();
    }

    await updateSession();
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Cmd/Ctrl + K: New chat
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      createNewChat();
    }

    // Cmd/Ctrl + /: Toggle left sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      uiManager?.toggleSidebar("left");
    }

    // Cmd/Ctrl + .: Toggle right sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === ".") {
      e.preventDefault();
      uiManager?.toggleSidebar("right");
    }
  });

  // Auto-save on page unload
  window.addEventListener("beforeunload", () => {
    chatManager.save();
  });
})();
