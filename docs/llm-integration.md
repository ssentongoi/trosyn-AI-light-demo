# LLM Integration Guide

This document provides instructions for setting up and using the local LLM (Gemini 3.1B) with Unstructured document processing in Trosyn AI.

## Prerequisites

- Python 3.10 or higher
- CMake 3.20 or higher
- C++ compiler with C++17 support
- Rust (if using llm-rs backend)
- Git

## Quick Start

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/yourusername/trosyn-ai.git
   cd trosyn-ai
   ```

2. **Run the setup script**:
   ```bash
   chmod +x scripts/setup_llm_env.sh
   ./scripts/setup_llm_env.sh
   ```

3. **Activate the virtual environment**:
   ```bash
   source venv/bin/activate
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Download the model**:
   ```bash
   mkdir -p models
   # Download Gemini 3.1B GGUF model to models/
   ```

## Configuration

Edit the `.env` file to configure:

- Path to GGUF model file
- Vector database settings
- Document processing directories
- Logging preferences

## Usage

### Running the LLM Service

```python
from src.llm_service import LLMService

# Initialize the service
llm = LLMService()

# Process a document
result = llm.process_document("path/to/document.pdf")

# Query the LLM
response = llm.generate("What is the main topic of this document?")
```

### API Endpoints

Start the FastAPI server:
```bash
uvicorn src.api.main:app --reload
```

Available endpoints:
- `POST /api/v1/process` - Process a document
- `POST /api/v1/generate` - Generate text using the LLM
- `GET /api/v1/status` - Check service status

## Development

### Testing

Run the test suite:
```bash
pytest tests/
```

### Adding New Features

1. Create a new branch:
   ```bash
   git checkout -b feature/new-feature
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. Push to the branch and create a pull request.

## Troubleshooting

### Common Issues

1. **Installation fails on macOS**
   - Ensure Xcode Command Line Tools are installed: `xcode-select --install`
   - Make sure Homebrew is up to date: `brew update`

2. **Model loading issues**
   - Verify the model file exists at the path specified in `.env`
   - Check that the model file is not corrupted

3. **Performance problems**
   - For better performance, consider using a GPU
   - Adjust `LLM_N_GPU_LAYERS` in `.env` to offload more layers to GPU

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
