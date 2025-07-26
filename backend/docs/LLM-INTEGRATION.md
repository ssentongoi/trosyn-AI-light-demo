# Gemma 3N LLM Integration

This document provides an overview of the Gemma 3N language model integration in the Trosyn AI backend.

## Overview

The Gemma 3N model is integrated using the llama.cpp HTTP server, which provides a stable and efficient interface for text generation tasks. The integration includes three main features:

1. **Text Summarization** - Generate concise summaries of input text
2. **Text Redaction** - Remove or mask sensitive information from text
3. **Spellcheck & Grammar Correction** - Identify and correct spelling and grammar errors

## Prerequisites

- Node.js 18+
- llama.cpp server running (see Setup section)
- Gemma 3N model files (GGUF format)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Prepare the Model

1. Download the Gemma 3N GGUF model file to `shared_data/models/gemma3n/model.gguf`
2. Ensure the model file has the correct permissions

### 3. Start the llama.cpp Server

```bash
# Build the llama.cpp server (first time only)
npm run build:llama

# Start the server (in a separate terminal)
npm run start:llama

# Or start both backend and llama server together
export LLAMA_SERVER_URL=http://localhost:8080/completion
npm run dev:with-llama
```

## Configuration

Environment variables:

```env
# Required
LLAMA_SERVER_URL=http://localhost:8080/completion

# Optional
LLAMA_REQUEST_TIMEOUT=120000  # 2 minutes
```

## API Endpoints

### Summarize Text

**Endpoint:** `POST /api/ai/summarize`

**Request Body:**
```json
{
  "text": "Long text to summarize...",
  "maxLength": 100
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Summarized text..."
}
```

### Redact Sensitive Information

**Endpoint:** `POST /api/ai/redact`

**Request Body:**
```json
{
  "text": "John's email is john@example.com",
  "sensitiveInfo": ["john@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "redactedText": "John's email is [REDACTED]"
}
```

### Check and Correct Spelling

**Endpoint:** `POST /api/ai/spellcheck`

**Request Body:**
```json
{
  "text": "Ths is a testt with somee errors."
}
```

**Response:**
```json
{
  "success": true,
  "original": "Ths is a testt with somee errors.",
  "corrected": "This is a test with some errors.",
  "corrections": [
    {"original": "Ths", "corrected": "This"},
    {"original": "testt", "corrected": "test"},
    {"original": "somee", "corrected": "some"}
  ]
}
```

## Monitoring and Logging

- The service logs all LLM API calls to the console with timing information
- Error responses include detailed error messages when available
- Monitor the llama.cpp server logs for model-specific issues

## Troubleshooting

### Common Issues

1. **Server Not Responding**
   - Verify the llama.cpp server is running
   - Check the server logs for errors
   - Ensure the model file is accessible

2. **Empty or Nonsense Responses**
   - Check the prompt format in the service code
   - Verify the model is compatible with the expected input format
   - Try adjusting the temperature parameter

3. **Slow Responses**
   - Increase the request timeout if needed
   - Check system resource usage (CPU/GPU)
   - Consider using a more powerful server for production

### Viewing Logs

```bash
# Backend logs
npm run dev

# llama.cpp server logs (if started separately)
npm run start:llama
```

## Performance Considerations

- The first request after server startup will be slower as the model loads
- Response times depend on model size and hardware
- For production use, consider:
  - Using a GPU-accelerated server
  - Implementing request queuing
  - Adding caching for frequent similar requests

## Security

- The LLM server should not be exposed to the public internet
- Validate and sanitize all input text
- Implement rate limiting to prevent abuse
- Monitor for prompt injection attempts

## License

This integration is part of the Trosyn AI platform. See the main LICENSE file for details.
