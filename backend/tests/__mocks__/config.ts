// Mock configuration for tests
export const mockConfig = {
  mode: 'mock',
  features: {
    summarization: {
      enabled: true,
      maxLength: 150,
      defaultLanguage: 'en',
      maxTokens: 500,
      temperature: 0.7
    },
    redaction: {
      enabled: true,
      redactionTypes: ['email', 'phone', 'ssn', 'credit_card'],
      replacement: '[REDACTED]',
      temperature: 0.3
    },
    spellcheck: {
      enabled: true,
      defaultLanguage: 'en-US',
      maxSuggestions: 3,
      temperature: 0.3
    }
  },
  models: {
    gemma3n: {
      path: './shared_data/models/gemma3n/model.gguf',
      contextSize: 4096,
      gpuLayers: 0
    }
  },
  limits: {
    maxInputLength: 10000,
    maxOutputLength: 5000,
    requestTimeout: 30000
  },
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 100
  },
  logging: {
    level: 'info',
    enableRequestLogging: true
  },
  environment: 'test'
};

export default mockConfig;
