<template>
  <div class="ai-assistant">
    <div class="ai-header">
      <h3>AI Assistant</h3>
      <button 
        class="close-button"
        @click="$emit('close')"
        aria-label="Close AI Assistant"
      >
        &times;
      </button>
    </div>
    
    <div class="ai-messages" ref="messagesContainer">
      <div 
        v-for="(message, index) in messages" 
        :key="index"
        :class="['message', message.role]"
      >
        <div class="message-content">
          {{ message.content }}
        </div>
        <div class="message-meta">
          <span class="role">{{ message.role === 'user' ? 'You' : 'AI' }}</span>
          <span class="time">{{ formatTime(message.timestamp) }}</span>
        </div>
      </div>
      
      <div v-if="isLoading" class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    
    <div class="ai-toolbar">
      <button 
        v-for="action in quickActions" 
        :key="action.id"
        @click="executeAction(action.id)"
        :disabled="isLoading"
        class="action-button"
        :title="action.description"
      >
        {{ action.label }}
      </button>
    </div>
    
    <div class="ai-input-container">
      <textarea
        v-model="userInput"
        @keydown.enter.exact.prevent="handleSubmit"
        placeholder="Ask me to summarize, redact, or check spelling..."
        :disabled="isLoading"
        rows="3"
      ></textarea>
      <button 
        @click="handleSubmit"
        :disabled="!userInput.trim() || isLoading"
        class="send-button"
      >
        {{ isLoading ? 'Processing...' : 'Send' }}
      </button>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUpdated } from 'vue';
import { useAI } from '../hooks/useAI';

export default defineComponent({
  name: 'AskAI',
  
  setup() {
    const { 
      isLoading, 
      error, 
      result, 
      progress, 
      summarize, 
      redact, 
      spellcheck, 
      reset: resetAI 
    } = useAI();
    
    const messages = ref<Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>>([]);
    
    const userInput = ref('');
    const messagesContainer = ref<HTMLElement | null>(null);
    
    const quickActions = [
      { id: 'summarize', label: 'Summarize', description: 'Generate a summary of the selected text' },
      { id: 'redact', label: 'Redact', description: 'Remove sensitive information' },
      { id: 'spellcheck', label: 'Spellcheck', description: 'Check spelling and grammar' },
    ];
    
    const scrollToBottom = () => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    };
    
    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    };
    
    const addMessage = (role: 'user' | 'assistant', content: string) => {
      messages.value.push({
        role,
        content,
        timestamp: new Date()
      });
    };
    
    const executeAction = async (actionId: string) => {
      const textToProcess = getSelectedText() || userInput.value;
      
      if (!textToProcess.trim()) {
        error.value = 'Please select some text or type a message';
        return;
      }
      
      addMessage('user', `[${actionId}] ${textToProcess}`);
      userInput.value = '';
      
      try {
        let result;
        
        switch (actionId) {
          case 'summarize':
            result = await summarize(textToProcess);
            break;
            
          case 'redact':
            result = await redact(textToProcess);
            break;
            
          case 'spellcheck':
            result = await spellcheck(textToProcess);
            break;
            
          default:
            throw new Error(`Unknown action: ${actionId}`);
        }
        
        if (result) {
          addMessage('assistant', formatAIMessage(actionId, result, textToProcess));
        }
      } catch (err) {
        console.error('AI action failed:', err);
        error.value = err.message || 'Failed to process your request';
      }
    };
    
    const formatAIMessage = (action: string, result: any, originalText: string): string => {
      switch (action) {
        case 'summarize':
          return `📝 Summary:\n${result}`;
          
        case 'redact':
          return `🔒 Redacted text:\n${result}`;
          
        case 'spellcheck':
          if (result.issueCount === 0) {
            return '✅ No spelling or grammar issues found!';
          }
          return `✏️ Found ${result.issueCount} issues. Corrected text:\n${result.corrected}`;
          
        default:
          return `AI Response: ${JSON.stringify(result, null, 2)}`;
      }
    };
    
    const getSelectedText = (): string => {
      return window.getSelection()?.toString() || '';
    };
    
    const handleSubmit = async () => {
      if (!userInput.value.trim() || isLoading.value) return;
      
      const userMessage = userInput.value;
      addMessage('user', userMessage);
      userInput.value = '';
      
      try {
        // Simple command detection
        const lowerInput = userMessage.toLowerCase();
        
        if (lowerInput.startsWith('/summarize') || lowerInput.includes('summarize')) {
          const textToSummarize = lowerInput.replace(/^\/summarize\s*/i, '');
          const result = await summarize(textToSummarize || userMessage);
          if (result) {
            addMessage('assistant', `📝 Summary:\n${result}`);
          }
        } 
        else if (lowerInput.startsWith('/redact') || lowerInput.includes('redact')) {
          const textToRedact = lowerInput.replace(/^\/redact\s*/i, '');
          const result = await redact(textToRedact || userMessage);
          if (result) {
            addMessage('assistant', `🔒 Redacted text:\n${result}`);
          }
        }
        else if (lowerInput.startsWith('/spellcheck') || lowerInput.includes('spellcheck') || lowerInput.includes('spelling')) {
          const textToCheck = lowerInput.replace(/^\/spellcheck\s*/i, '');
          const result = await spellcheck(textToCheck || userMessage);
          if (result) {
            if (result.issueCount === 0) {
              addMessage('assistant', '✅ No spelling or grammar issues found!');
            } else {
              addMessage('assistant', `✏️ Found ${result.issueCount} issues. Corrected text:\n${result.corrected}`);
            }
          }
        }
        else {
          // Default response for general messages
          addMessage('assistant', `I can help you with:
- Summarizing text
- Redacting sensitive information
- Checking spelling and grammar

Try starting your message with '/summarize', '/redact', or '/spellcheck'`);
        }
      } catch (err) {
        console.error('Error processing message:', err);
        error.value = 'Failed to process your message';
      }
    };
    
    // Auto-scroll when messages change
    onUpdated(() => {
      scrollToBottom();
    });
    
    // Initial welcome message
    onMounted(() => {
      addMessage('assistant', 'Hello! I\'m your AI assistant. How can I help you today?');
    });
    
    return {
      messages,
      userInput,
      isLoading,
      error,
      progress,
      quickActions,
      messagesContainer,
      executeAction,
      handleSubmit,
      formatTime,
    };
  },
});
</script>

<style scoped>
.ai-assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #4a6cf7;
  color: white;
}

.ai-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 8px;
  border-radius: 4px;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.ai-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f8f9fa;
}

.message {
  margin-bottom: 16px;
  max-width: 85%;
}

.message.user {
  margin-left: auto;
  text-align: right;
}

.message.assistant {
  margin-right: auto;
}

.message-content {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 18px;
  background: #e9ecef;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: left;
}

.user .message-content {
  background: #4a6cf7;
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant .message-content {
  background: #e9ecef;
  color: #212529;
  border-bottom-left-radius: 4px;
}

.message-meta {
  font-size: 0.75em;
  color: #6c757d;
  margin-top: 4px;
  padding: 0 8px;
}

.user .message-meta {
  text-align: right;
}

.ai-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: #f1f3f5;
  border-top: 1px solid #dee2e6;
  border-bottom: 1px solid #dee2e6;
  overflow-x: auto;
}

.action-button {
  padding: 6px 12px;
  background: white;
  border: 1px solid #ced4da;
  border-radius: 16px;
  font-size: 0.85em;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background: #e9ecef;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-input-container {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #e9ecef;
}

textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95em;
  resize: none;
  margin-bottom: 8px;
}

textarea:focus {
  outline: none;
  border-color: #4a6cf7;
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
}

.send-button {
  width: 100%;
  padding: 8px 16px;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #3a5bd9;
}

.send-button:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

.error-message {
  padding: 8px 16px;
  background: #fff5f5;
  color: #e53e3e;
  font-size: 0.85em;
  border-top: 1px solid #fed7d7;
}

.typing-indicator {
  display: flex;
  padding: 12px 16px;
  background: #e9ecef;
  border-radius: 18px;
  width: fit-content;
  margin-bottom: 16px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background: #6c757d;
  border-radius: 50%;
  display: inline-block;
  margin: 0 2px;
  opacity: 0.4;
}

.typing-indicator span:nth-child(1) {
  animation: 1s blink infinite 0.3333s;
}

.typing-indicator span:nth-child(2) {
  animation: 1s blink infinite 0.6666s;
}

.typing-indicator span:nth-child(3) {
  animation: 1s blink infinite 0.9999s;
}

@keyframes blink {
  50% {
    opacity: 1;
  }
}
</style>
