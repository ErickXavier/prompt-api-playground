/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Storage Manager - Handles localStorage operations for chat history
 */

const STORAGE_KEYS = {
  CHAT_HISTORY: "prompt-api-chat-history",
  UI_STATE: "prompt-api-ui-state",
  ACTIVE_CHAT: "prompt-api-active-chat",
};

const MAX_CHATS = 50; // Limit to prevent localStorage overflow

export class StorageManager {
  /**
   * Save all chats to localStorage
   */
  static saveChatHistory(chats) {
    try {
      // Limit to MAX_CHATS, keeping most recent
      const limitedChats = chats
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_CHATS);

      localStorage.setItem(
        STORAGE_KEYS.CHAT_HISTORY,
        JSON.stringify(limitedChats),
      );
      return true;
    } catch (error) {
      console.error("Failed to save chat history:", error);
      // Handle quota exceeded error
      if (error.name === "QuotaExceededError") {
        // Try again with fewer chats
        this.saveChatHistory(chats.slice(0, Math.floor(MAX_CHATS / 2)));
      }
      return false;
    }
  }

  /**
   * Load all chats from localStorage
   */
  static loadChatHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to load chat history:", error);
      return [];
    }
  }

  /**
   * Save UI state (sidebar collapsed states, etc.)
   */
  static saveUIState(state) {
    try {
      localStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save UI state:", error);
    }
  }

  /**
   * Load UI state
   */
  static loadUIState() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.UI_STATE);
      return data
        ? JSON.parse(data)
        : {
            leftSidebarCollapsed: false,
            rightSidebarCollapsed: true,
          };
    } catch (error) {
      console.error("Failed to load UI state:", error);
      return {
        leftSidebarCollapsed: false,
        rightSidebarCollapsed: true,
      };
    }
  }

  /**
   * Save active chat ID
   */
  static saveActiveChat(chatId) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, chatId);
    } catch (error) {
      console.error("Failed to save active chat:", error);
    }
  }

  /**
   * Load active chat ID
   */
  static loadActiveChat() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
    } catch (error) {
      console.error("Failed to load active chat:", error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  static clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error("Failed to clear storage:", error);
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo() {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    return {
      used: totalSize,
      usedKB: (totalSize / 1024).toFixed(2),
      usedMB: (totalSize / 1024 / 1024).toFixed(2),
    };
  }
}
