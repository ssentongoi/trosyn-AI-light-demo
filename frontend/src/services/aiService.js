import api from './api';

const aiService = {
  /**
   * Send a message to the AI assistant
   * @param {string} message - The user's message
   * @param {Array} attachments - Array of file attachments
   * @param {string} conversationId - Optional conversation ID for continuing a conversation
   * @param {Function} onChunk - Callback for streaming chunks
   * @returns {Promise<Object>} - The AI's response or stream controller
   */
  async sendMessage(message, attachments = [], conversationId = null, onChunk = null) {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('stream', !!onChunk);
    
    if (conversationId) {
      formData.append('conversation_id', conversationId);
    }
    
    // Add attachments if any
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
    
    try {
      // For streaming responses
      if (onChunk) {
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Make the request with streaming enabled
        const response = await fetch(`${api.defaults.baseURL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
          signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to send message');
        }

        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.done) break;
                    if (parsed.content) {
                      onChunk(parsed.content);
                    }
                  } catch (e) {
                    console.error('Error parsing stream data:', e);
                  }
                }
              }
            }
            
            // Signal completion
            onChunk(null, true);
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Stream error:', error);
              onChunk(null, false, error.message);
            }
          }
        };
        
        // Start processing the stream
        processStream();
        
        // Return the abort controller so the caller can cancel the stream
        return {
          controller,
          abort: () => controller.abort(),
        };
      } 
      
      // For non-streaming responses
      const response = await api.post('/chat', {
        message,
        conversation_id: conversationId,
        stream: false,
      });
      
      return {
        success: true,
        data: response.data,
      };
      
    } catch (error) {
      console.error('Error sending message to AI:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to send message',
      };
    }
  },
  
  /**
   * Get conversation history
   * @param {string} conversationId - ID of the conversation to retrieve
   * @returns {Promise<Object>} - Conversation with messages
   */
  async getConversation(conversationId) {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to fetch conversation',
      };
    }
  },
  
  /**
   * Get list of user's conversations
   * @param {number} limit - Number of conversations to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - Array of user's conversations
   */
  async getConversations(limit = 20, offset = 0) {
    try {
      const response = await api.get('/chat/conversations', {
        params: { limit, offset }
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to fetch conversations',
      };
    }
  },
  
  /**
   * Delete a conversation
   * @param {string} conversationId - ID of the conversation to delete
   * @returns {Promise<Object>} - Success status
   */
  async deleteConversation(conversationId) {
    try {
      await api.delete(`/chat/conversations/${conversationId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete conversation',
      };
    }
  },
  
  /**
   * Create a new conversation
   * @param {string} title - Optional title for the conversation
   * @returns {Promise<Object>} - The created conversation
   */
  async createConversation(title = 'New Chat') {
    try {
      const response = await api.post('/chat/conversations', { title });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create conversation',
      };
    }
  },
};

export default aiService;
