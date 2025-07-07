import api from './api';

/**
 * Service for handling chat-related API calls
 */
const chatService = {
  /**
   * Get all conversations for the current user
   * @param {Object} params - Query parameters (skip, limit, etc.)
   * @returns {Promise<Array>} List of conversations
   */
  getConversations: async (params = {}) => {
    try {
      const response = await api.get('/chat/conversations', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      throw error;
    }
  },

  /**
   * Get a single conversation with its messages
   * @param {string} conversationId - ID of the conversation to fetch
   * @returns {Promise<Object>} The conversation with its messages
   */
  getConversation: async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new conversation
   * @param {Object} conversationData - Data for the new conversation
   * @returns {Promise<Object>} The created conversation
   */
  createConversation: async (conversationData) => {
    try {
      const response = await api.post('/chat/conversations', conversationData);
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },

  /**
   * Delete a conversation
   * @param {string} conversationId - ID of the conversation to delete
   * @returns {Promise<void>}
   */
  deleteConversation: async (conversationId) => {
    try {
      await api.delete(`/chat/conversations/${conversationId}`);
    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message in a conversation
   * @param {Object} messageData - The message data
   * @param {string} messageData.content - The message content
   * @param {string} [messageData.conversationId] - Optional conversation ID
   * @returns {Promise<Object>} The created message and conversation info
   */
  sendMessage: async (messageData) => {
    try {
      const response = await api.post('/chat/messages', {
        role: 'user',
        content: messageData.content,
        conversation_id: messageData.conversationId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  /**
   * Stream a chat completion from the server
   * @param {Object} chatData - The chat data
   * @param {string} chatData.message - The user's message
   * @param {string} [chatData.conversationId] - Optional conversation ID
   * @param {Function} onChunk - Callback for each chunk of the response
   * @param {Function} onComplete - Callback when the stream is complete
   * @param {Function} onError - Callback for any errors
   */
  streamChatCompletion: async (chatData, { onChunk, onComplete, onError }) => {
    try {
      const response = await fetch('/api/v1/chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: chatData.message,
          conversation_id: chatData.conversationId,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to stream chat completion');
      }

      if (!response.body) {
        throw new Error('Response body is not readable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (onComplete) onComplete();
          break;
        }

        // Decode the chunk and process it
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete messages in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              if (onComplete) onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (onChunk) onChunk(parsed);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streamChatCompletion:', error);
      if (onError) onError(error);
    }
  },

  /**
   * Get a non-streaming chat completion
   * @param {Object} chatData - The chat data
   * @param {string} chatData.message - The user's message
   * @param {string} [chatData.conversationId] - Optional conversation ID
   * @returns {Promise<Object>} The AI's response
   */
  getChatCompletion: async (chatData) => {
    try {
      const response = await api.post('/chat/chat', {
        message: chatData.message,
        conversation_id: chatData.conversationId,
        stream: false
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get chat completion:', error);
      throw error;
    }
  }
};

export default chatService;
