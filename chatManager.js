/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chat Manager - Handles chat history CRUD operations
 */

import { StorageManager } from "./storageManager.js";

export class ChatManager {
  constructor() {
    this.chats = StorageManager.loadChatHistory();
    this.activeChat = null;
  }

  /**
   * Create a new chat
   */
  createNewChat(settings = {}) {
    const chat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Chat",
      timestamp: Date.now(),
      messages: [],
      settings: {
        temperature: settings.temperature || 1.0,
        topK: settings.topK || 3,
      },
    };

    this.chats.unshift(chat);
    this.activeChat = chat.id;
    this.save();

    return chat;
  }

  /**
   * Get a chat by ID
   */
  getChat(chatId) {
    return this.chats.find((chat) => chat.id === chatId);
  }

  /**
   * Get all chats
   */
  getAllChats() {
    return this.chats;
  }

  /**
   * Update chat
   */
  updateChat(chatId, updates) {
    const chat = this.getChat(chatId);
    if (chat) {
      Object.assign(chat, updates);
      chat.timestamp = Date.now(); // Update timestamp
      this.save();
      return chat;
    }
    return null;
  }

  /**
   * Update chat title
   */
  updateChatTitle(chatId, title) {
    return this.updateChat(chatId, { title });
  }

  /**
   * Add message to chat
   */
  addMessage(chatId, role, content) {
    const chat = this.getChat(chatId);
    if (chat) {
      chat.messages.push({
        role,
        content,
        timestamp: Date.now(),
      });

      // Auto-generate title from first user message
      if (
        chat.title === "New Chat" &&
        role === "user" &&
        chat.messages.length === 1
      ) {
        chat.title = this.generateTitle(content);
      }

      chat.timestamp = Date.now();
      this.save();
      return chat;
    }
    return null;
  }

  /**
   * Delete a chat
   */
  deleteChat(chatId) {
    const index = this.chats.findIndex((chat) => chat.id === chatId);
    if (index !== -1) {
      this.chats.splice(index, 1);

      // If deleted chat was active, select another
      if (this.activeChat === chatId) {
        this.activeChat = this.chats.length > 0 ? this.chats[0].id : null;
      }

      this.save();
      return true;
    }
    return false;
  }

  /**
   * Set active chat
   */
  setActiveChat(chatId) {
    if (this.getChat(chatId) || chatId === null) {
      this.activeChat = chatId;
      StorageManager.saveActiveChat(chatId);
      return true;
    }
    return false;
  }

  /**
   * Get active chat
   */
  getActiveChat() {
    if (!this.activeChat && this.chats.length > 0) {
      this.activeChat = this.chats[0].id;
    }
    return this.activeChat ? this.getChat(this.activeChat) : null;
  }

  /**
   * Search chats
   */
  searchChats(query) {
    const lowerQuery = query.toLowerCase();
    return this.chats.filter((chat) => {
      // Search in title
      if (chat.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      // Search in messages
      return chat.messages.some((msg) =>
        msg.content.toLowerCase().includes(lowerQuery),
      );
    });
  }

  /**
   * Get chats grouped by date
   */
  getChatsByDate() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    const groups = {
      today: [],
      yesterday: [],
      last7days: [],
      last30days: [],
      older: [],
    };

    this.chats.forEach((chat) => {
      const age = now - chat.timestamp;

      if (age < oneDay) {
        groups.today.push(chat);
      } else if (age < 2 * oneDay) {
        groups.yesterday.push(chat);
      } else if (age < sevenDays) {
        groups.last7days.push(chat);
      } else if (age < thirtyDays) {
        groups.last30days.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    return groups;
  }

  /**
   * Generate title from content
   */
  generateTitle(content) {
    // Extract first meaningful sentence or first 50 characters
    let title = content.trim();

    // Get first sentence
    const sentenceEnd = title.search(/[.!?]\s/);
    if (sentenceEnd !== -1) {
      title = title.substring(0, sentenceEnd + 1);
    }

    // Limit to 50 characters
    if (title.length > 50) {
      title = title.substring(0, 47) + "...";
    }

    return title || "New Chat";
  }

  /**
   * Export chat as JSON
   */
  exportChatAsJSON(chatId) {
    const chat = this.getChat(chatId);
    if (chat) {
      return JSON.stringify(chat, null, 2);
    }
    return null;
  }

  /**
   * Export chat as Markdown
   */
  exportChatAsMarkdown(chatId) {
    const chat = this.getChat(chatId);
    if (!chat) return null;

    let markdown = `# ${chat.title}\n\n`;
    markdown += `*Created: ${new Date(chat.timestamp).toLocaleString()}*\n\n`;
    markdown += `---\n\n`;

    chat.messages.forEach((msg) => {
      const role = msg.role === "user" ? "**You**" : "**Assistant**";
      markdown += `${role}:\n\n${msg.content}\n\n---\n\n`;
    });

    return markdown;
  }

  /**
   * Save chats to storage
   */
  save() {
    StorageManager.saveChatHistory(this.chats);
    if (this.activeChat) {
      StorageManager.saveActiveChat(this.activeChat);
    }
  }

  /**
   * Clear all chats
   */
  clearAll() {
    this.chats = [];
    this.activeChat = null;
    return StorageManager.clearAll();
  }
}
