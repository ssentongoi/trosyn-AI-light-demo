# Trosyn Sync Service

LAN Synchronization Service for Trosyn AI, enabling offline-first operation with periodic data synchronization over the local network.

## Features

- **Node Discovery**: Automatic discovery of nodes on the local network using UDP multicast
- **Secure Communication**: JWT-based authentication and authorization
- **Document Synchronization**: Efficient sync of documents between nodes
- **Conflict Resolution**: Built-in conflict detection and resolution strategies
- **Offline Support**: Designed for reliable operation in offline or unstable network conditions

## Getting Started

### Prerequisites

- Python 3.9+
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ssentongoi/Trosyn-AI.git
   cd Trosyn-AI
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -e ".[dev]"
   ```

### Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   ```env
   # Authentication
   TROSYN_AUTH_SECRET_KEY=your-secret-key-here
   TROSYN_AUTH_ALGORITHM=HS256
   
   # Node Configuration
   NODE_TYPE=TROSYSN_ADMIN_HUB  # or TROSYSN_DEPT_NODE
   NODE_PORT=8000
   ```

### Running the Service

Start the service using Uvicorn:

```bash
uvicorn trosyn_sync.main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`

## API Documentation

Once the service is running, you can access:

- **Interactive API Docs**: `http://localhost:8000/docs`
- **Alternative API Docs**: `http://localhost:8000/redoc`

## Development

### Code Style

This project uses:
- **Black** for code formatting
- **isort** for import sorting
- **mypy** for static type checking

Run the following commands before committing:

```bash
black .
isort .
mypy .
```

### Testing

Run the test suite:

```bash
pytest
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
