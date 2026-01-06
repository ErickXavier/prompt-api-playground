/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * UI Manager - Handles UI state and interactions
 */

import { StorageManager } from "./storageManager.js";

export class UIManager {
  constructor(chatManager) {
    this.chatManager = chatManager;
    this.elements = this.cacheElements();
    this.uiState = StorageManager.loadUIState();
    this.init();
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    return {
      // Sidebars
      leftSidebar: document.getElementById("left-sidebar"),
      rightSidebar: document.getElementById("right-sidebar"),
      leftToggle: document.getElementById("left-sidebar-toggle"),
      rightToggle: document.getElementById("right-sidebar-toggle"),
      showLeftBtn: document.getElementById("show-left-sidebar"),
      showRightBtn: document.getElementById("show-right-sidebar"),

      // Collapsed icons
      collapsedMenuBtn: document.getElementById("collapsed-menu-btn"),
      collapsedNewChatBtn: document.getElementById("collapsed-new-chat-btn"),
      collapsedSettingsBtn: document.getElementById("collapsed-settings-btn"),

      // Chat history
      chatHistory: document.getElementById("chat-history"),
      chatSearch: document.getElementById("chat-search"),
      newChatBtn: document.getElementById("new-chat-btn"),

      // Main area
      chatTitle: document.getElementById("current-chat-title"),
      messagesContainer: document.getElementById("messages-container"),
      responseArea: document.getElementById("response-area"),

      // Input
      promptInput: document.getElementById("prompt-input"),
      messageForm: document.getElementById("message-form"),
      submitButton: document.getElementById("submit-button"),
      costSpan: document.getElementById("cost"),
      tokenInfo: document.getElementById("token-info"),

      // Settings
      temperatureSlider: document.getElementById("session-temperature"),
      temperatureValue: document.getElementById("temperature-value"),
      topKInput: document.getElementById("session-top-k"),
      topKValue: document.getElementById("topk-value"),

      // Stats
      temperature: document.getElementById("temperature"),
      topK: document.getElementById("top-k"),
      tokensSoFar: document.getElementById("tokens-so-far"),
      tokensLeft: document.getElementById("tokens-left"),
      maxTokens: document.getElementById("max-tokens"),

      // Actions
      resetButton: document.getElementById("reset-button"),
      exportButton: document.getElementById("export-chat-btn"),
      copyLinkButton: document.getElementById("copy-link-button"),
      shareBtn: document.getElementById("share-btn"),

      // Other
      errorMessage: document.getElementById("error-message"),
      problematicArea: document.getElementById("problematic-area"),
    };
  }

  /**
   * Initialize UI
   */
  init() {
    // Apply saved UI state
    this.applySidebarState();

    // Set up event listeners
    this.setupEventListeners();

    // Render chat history
    this.renderChatHistory();

    // Auto-resize textarea
    this.setupTextareaAutoResize();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Sidebar toggles
    this.elements.leftToggle?.addEventListener("click", () =>
      this.toggleSidebar("left"),
    );
    this.elements.rightToggle?.addEventListener("click", () =>
      this.toggleSidebar("right"),
    );
    this.elements.showLeftBtn?.addEventListener("click", () =>
      this.showSidebar("left"),
    );
    this.elements.showRightBtn?.addEventListener("click", () =>
      this.showSidebar("right"),
    );

    // Collapsed icon buttons
    this.elements.collapsedMenuBtn?.addEventListener("click", () =>
      this.toggleSidebar("left"),
    );
    this.elements.collapsedNewChatBtn?.addEventListener("click", () =>
      this.onNewChat(),
    );
    this.elements.collapsedSettingsBtn?.addEventListener("click", () =>
      this.toggleSidebar("right"),
    );

    // New chat
    this.elements.newChatBtn?.addEventListener("click", () => this.onNewChat());

    // Chat search
    this.elements.chatSearch?.addEventListener("input", (e) =>
      this.onSearchChats(e.target.value),
    );

    // Chat title editing
    this.elements.chatTitle?.addEventListener("blur", () =>
      this.onChatTitleChange(),
    );
    this.elements.chatTitle?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.elements.chatTitle.blur();
      }
    });

    // Settings
    this.elements.temperatureSlider?.addEventListener("input", (e) => {
      if (this.elements.temperatureValue) {
        this.elements.temperatureValue.textContent = parseFloat(
          e.target.value,
        ).toFixed(1);
      }
    });

    this.elements.topKInput?.addEventListener("input", (e) => {
      if (this.elements.topKValue) {
        this.elements.topKValue.textContent = e.target.value;
      }
    });
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(side) {
    const sidebar =
      side === "left" ? this.elements.leftSidebar : this.elements.rightSidebar;
    const isCollapsed = sidebar.classList.toggle("collapsed");

    this.uiState[`${side}SidebarCollapsed`] = isCollapsed;
    StorageManager.saveUIState(this.uiState);
  }

  /**
   * Show sidebar
   */
  showSidebar(side) {
    const sidebar =
      side === "left" ? this.elements.leftSidebar : this.elements.rightSidebar;
    sidebar.classList.remove("collapsed");

    this.uiState[`${side}SidebarCollapsed`] = false;
    StorageManager.saveUIState(this.uiState);
  }

  /**
   * Apply saved sidebar state
   */
  applySidebarState() {
    if (this.uiState.leftSidebarCollapsed) {
      this.elements.leftSidebar?.classList.add("collapsed");
    }
    if (this.uiState.rightSidebarCollapsed) {
      this.elements.rightSidebar?.classList.add("collapsed");
    }
  }

  /**
   * Render chat history
   */
  renderChatHistory(filter = null) {
    const chats = filter
      ? this.chatManager.searchChats(filter)
      : this.chatManager.getAllChats();

    if (chats.length === 0) {
      this.elements.chatHistory.innerHTML = `
        <menu class="chat-history-empty">
          <p>${filter ? "No chats found" : "No chat history yet"}</p>
          <p class="hint">${filter ? "Try a different search" : "Start a new conversation"}</p>
        </menu>
      `;
      return;
    }

    const grouped = this.groupChatsByDate(chats);
    let html = "";

    for (const [label, groupChats] of Object.entries(grouped)) {
      if (groupChats.length > 0) {
        html += `<menu class="chat-group">`;
        html += `<div class="chat-group-label">${label}</div>`;

        groupChats.forEach((chat) => {
          const isActive = chat.id === this.chatManager.activeChat;
          html += `
            <li class="chat-item ${isActive ? "active" : ""}" data-chat-id="${chat.id}">
              <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
              <button class="chat-item-delete" data-chat-id="${chat.id}" title="Delete chat" aria-label="Delete chat">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M5.5 4V2.5a1 1 0 011-1h3a1 1 0 011 1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12.5 4v9.5a1 1 0 01-1 1h-7a1 1 0 01-1-1V4h9z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6.5 7v4M9.5 7v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </li>
          `;
        });

        html += `</menu>`;
      }
    }

    this.elements.chatHistory.innerHTML = html;

    // Add click listeners for chat items
    this.elements.chatHistory.querySelectorAll(".chat-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        // Don't trigger if clicking delete button
        if (e.target.closest(".chat-item-delete")) return;

        const chatId = item.dataset.chatId;
        this.onChatSelect(chatId);
      });
    });

    // Add click listeners for delete buttons
    this.elements.chatHistory
      .querySelectorAll(".chat-item-delete")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const chatId = btn.dataset.chatId;
          this.onChatDelete(chatId);
        });
      });
  }

  /**
   * Group chats by date for display
   */
  groupChatsByDate(chats) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const groups = {
      Chats: [],
      Yesterday: [],
      "Previous 7 days": [],
      "Previous 30 days": [],
      Older: [],
    };

    chats.forEach((chat) => {
      const age = now - chat.timestamp;

      if (age < oneDay) {
        groups["Chats"].push(chat);
      } else if (age < 2 * oneDay) {
        groups["Yesterday"].push(chat);
      } else if (age < 7 * oneDay) {
        groups["Previous 7 days"].push(chat);
      } else if (age < 30 * oneDay) {
        groups["Previous 30 days"].push(chat);
      } else {
        groups["Older"].push(chat);
      }
    });

    return groups;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (diff < oneHour) {
      const minutes = Math.floor(diff / (60 * 1000));
      return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
    } else if (diff < oneDay) {
      const hours = Math.floor(diff / oneHour);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (diff < 7 * oneDay) {
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
  }

  /**
   * Render message in chat
   */
  renderMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", role);

    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    bubble.textContent = content;

    messageDiv.appendChild(bubble);
    this.elements.responseArea.appendChild(messageDiv);

    // Scroll to bottom
    this.scrollToBottom();

    return bubble;
  }

  /**
   * Update message bubble content (for streaming)
   */
  updateMessageBubble(bubble, content) {
    bubble.innerHTML = content;
  }

  /**
   * Scroll messages to bottom
   */
  scrollToBottom() {
    this.elements.messagesContainer.scrollTop =
      this.elements.messagesContainer.scrollHeight;
  }

  /**
   * Clear messages area
   */
  clearMessages() {
    this.elements.responseArea.innerHTML = "";
  }

  /**
   * Show error message
   */
  showError(message) {
    this.elements.errorMessage.innerHTML = message;
    this.elements.errorMessage.style.display = "block";

    setTimeout(() => {
      this.elements.errorMessage.style.display = "none";
    }, 5000);
  }

  /**
   * Update session stats display
   */
  updateStats(session) {
    const numberFormat = new Intl.NumberFormat("en-US");
    const decimalFormat = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    if (this.elements.temperature) {
      this.elements.temperature.textContent = decimalFormat.format(
        session.temperature,
      );
    }
    if (this.elements.topK) {
      this.elements.topK.textContent = numberFormat.format(session.topK);
    }

    const maxTokens = session.inputQuota || session.maxTokens;
    const tokensUsed = session.inputUsage || session.tokensSoFar;
    const tokensLeft =
      session.tokensSoFar || session.inputQuota - session.inputUsage;

    if (this.elements.maxTokens) {
      this.elements.maxTokens.textContent = numberFormat.format(maxTokens);
    }
    if (this.elements.tokensSoFar) {
      this.elements.tokensSoFar.textContent = numberFormat.format(tokensUsed);
    }
    if (this.elements.tokensLeft) {
      this.elements.tokensLeft.textContent = numberFormat.format(tokensLeft);
    }
  }

  /**
   * Setup textarea auto-resize
   */
  setupTextareaAutoResize() {
    if (!this.elements.promptInput) return;

    this.elements.promptInput.addEventListener("input", () => {
      this.elements.promptInput.style.height = "auto";
      this.elements.promptInput.style.height =
        this.elements.promptInput.scrollHeight + "px";
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Event handlers (to be connected with main app)
   */
  onNewChat() {
    // Will be implemented in main app
    console.log("New chat requested");
  }

  onChatSelect(chatId) {
    // Will be implemented in main app
    console.log("Chat selected:", chatId);
  }

  onChatDelete(chatId) {
    // Will be implemented in main app
    console.log("Chat delete requested:", chatId);
  }

  onSearchChats(query) {
    this.renderChatHistory(query.trim() || null);
  }

  onChatTitleChange() {
    const activeChat = this.chatManager.getActiveChat();
    if (activeChat && this.elements.chatTitle) {
      const newTitle = this.elements.chatTitle.textContent.trim();
      if (newTitle && newTitle !== activeChat.title) {
        this.chatManager.updateChatTitle(activeChat.id, newTitle);
        this.renderChatHistory();
      }
    }
  }
}
