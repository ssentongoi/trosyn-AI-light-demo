# Trosyn AI API

This is the API server for Trosyn AI, providing access to the Gemma 3.1B language model.

## Features

- Text completion with `/v1/completions`
- Chat completion with `/v1/chat/completions`
- Model information with `/v1/models`
- Health check with `/health`

## Prerequisites

- Python 3.8+
- pip
- Virtual environment (recommended)

## Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements-api.txt
   ```

3. Download the Gemma 3.1B model (GGUF format) and place it in the `models/` directory.

## Configuration

Environment variables:

- `LLM_MODEL_PATH`: Path to the model file (default: `models/gemma-3-1b-it-q4_0.gguf`)
- `LLM_CONTEXT_SIZE`: Context window size (default: 2048)
- `LLM_N_GPU_LAYERS`: Number of layers to offload to GPU (default: 0)

## Running the API

```bash
./run_api.sh
```

Or directly with uvicorn:

```bash
uvicorn src.api.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Example Requests

### Text Completion

```bash
curl -X POST "http://localhost:8000/v1/completions" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing in simple terms"}'
```

### Chat Completion

```bash
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### List Models

```bash
curl http://localhost:8000/v1/models
```

## Development

### Running Tests

```bash
pytest
```

### Linting

```bash
flake8 src/
```

## License

MIT
