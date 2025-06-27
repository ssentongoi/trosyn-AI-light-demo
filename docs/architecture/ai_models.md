# AI Models

Trosyn AI integrates with multiple AI models to provide a comprehensive knowledge management and assistance platform. This document outlines the supported models and their configurations.

## Core Models

### 1. Gemini 3.1B

**Purpose**: Primary language model for text generation and understanding

**Key Features**:
- 3.1 billion parameter model
- Optimized for dialogue and instruction following
- Supports context lengths up to 8K tokens
- Fine-tuned for technical and enterprise use cases

**Configuration**:
```yaml
model_name: "google/gemma-3b"  # Official model name
max_tokens: 8192               # Maximum context length
temperature: 0.7              # Sampling temperature
device: "auto"                # Automatically select best available device (cuda/mps/cpu)
```

**Usage**:
- Main conversational interface
- Document analysis and summarization
- Code generation and explanation
- Knowledge retrieval and synthesis

### 2. Unstructured

**Purpose**: Document processing and text extraction

**Key Features**:
- Supports multiple document formats (PDF, DOCX, TXT)
- Intelligent text extraction and cleaning
- Document chunking for processing large files
- Metadata extraction

**Supported Formats**:
- PDF (Portable Document Format)
- DOCX (Microsoft Word)
- TXT (Plain Text)

**Configuration**:
```yaml
chunk_size: 1000      # Characters per chunk
max_document_size: 10MB  # Maximum file size to process
preserve_formatting: true  # Maintain original formatting where possible
```

## Model Integration

### Memory Integration

Both models integrate with the Trosyn memory system to provide context-aware responses and maintain conversation history.

```mermaid
graph LR
    A[User Input] --> B[Document Processor]
    B --> C[Text Chunks]
    C --> D[Gemini 3.1B]
    D --> E[Response Generation]
    E --> F[Memory Storage]
    F --> G[User Response]
    G --> H[Feedback Loop]
```

## Future Models

### Gemini 3N (Planned)
- Next-generation model with improved reasoning
- Larger context window (16K+ tokens)
- Enhanced code understanding
- Better instruction following

## Configuration

Model configurations can be adjusted via environment variables:

```bash
# Gemini Configuration
export AI_MODEL_NAME="google/gemma-3b"
export AI_MAX_TOKENS=8192
export AI_TEMPERATURE=0.7

# Document Processing
export AI_CHUNK_SIZE=1000
export AI_MAX_DOCUMENT_SIZE=10485760  # 10MB in bytes
```

## Performance Considerations

- **Hardware Requirements**:
  - Minimum: 16GB RAM, 8GB GPU (for Gemini 3.1B)
  - Recommended: 32GB+ RAM, 16GB+ GPU
  
- **Memory Usage**:
  - Gemini 3.1B: ~12GB VRAM (FP16)
  - Document Processing: ~2GB RAM per 100MB of text

## Troubleshooting

### Common Issues

1. **Out of Memory Errors**
   - Reduce `max_tokens`
   - Enable gradient checkpointing
   - Use smaller batch sizes

2. **Slow Performance**
   - Enable GPU acceleration
   - Reduce context length
   - Use batching for multiple requests

For additional support, refer to the [Trosyn AI Documentation](#) or open an issue in our [GitHub repository](#).
