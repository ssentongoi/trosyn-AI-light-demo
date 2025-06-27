# Trosyn AI

**Trust + Sync + Node**

An offline-first, self-hosted enterprise knowledge and AI assistant platform.

## Project Structure

```
trosyn-ai/
├── docs/                  # Project documentation
│   ├── requirements/      # Requirements and specifications
│   ├── architecture/      # System architecture and design
│   └── api/               # API documentation
│
├── tasks/                # Task management
│   ├── active/           # Currently active tasks
│   ├── completed/        # Completed tasks
│   └── backlog/         # Future tasks
│
├── src/                  # Source code
│   ├── frontend/         # Frontend application
│   ├── backend/          # Backend services
│   └── shared/           # Shared code and utilities
│
└── prompts/             # AI assistant prompts
    ├── frontend/        # Frontend-specific prompts
    ├── backend/         # Backend-specific prompts
    ├── shared/          # Shared prompts and protocols
    └── other/           # Miscellaneous prompts
```

## 🤖 AI Models

Trosyn AI integrates with state-of-the-art AI models for knowledge management and assistance:

- **Gemini 3.1B**: Advanced language model for text generation and understanding
- **Unstructured**: Document processing for various file formats (PDF, DOCX, TXT)

For detailed information about model configurations and capabilities, see [AI Models Documentation](docs/architecture/ai_models.md).

## 📊 Project Status

For the latest updates on project progress, see [STATUS.md](STATUS.md).

## 🛠️ Task Management

This project uses a robust task management system to track progress and coordinate development.

### Key Components

- **Task Files**: Individual task files in `tasks/{active,backlog,completed}/`
- **Status Board**: Automatically generated `STATUS.md` file
- **Task Creation**: Scripts to create and manage tasks
- **Automated Reports**: Detailed status reports with metrics

### Using the Task System

1. **Create a New Task**
   ```bash
   # Basic task
   python3 scripts/create_task.py "Implement feature X"
   
   # With additional options
   python3 scripts/create_task.py "Fix critical bug" --priority high --status "in progress" --category "bugfix"
   ```

2. **Update Task Status**
   - Edit the task file directly and update the `Status:` field
   - The status will be automatically synced to `STATUS.md` on commit

3. **Generate Status Report**
   ```bash
   # Generate a detailed status report
   python3 detailed_status.py
   
   # View the report
   cat reports/status_report.md
   ```

4. **Using Taskfile (optional)**
   If you have [Task](https://taskfile.dev/) installed:
   ```bash
   # List available tasks
   task
   
   # Generate and show status report
   task status
   
   # Sync task statuses
   task tasks:sync
   ```

### Task Statuses

- ⏳ Pending: Task is queued but not started
- 🔄 In Progress: Actively being worked on
- ⛔ Blocked: Blocked by external factors
- ✅ Done: Completed task

## 📊 Project Status

## Getting Started

1. **Clone the repository**
   ```
   git clone https://github.com/your-username/trosyn-ai.git
   cd trosyn-ai
   ```

2. **Set up the development environment**
   - Install dependencies
   - Configure environment variables
   - Initialize the database

3. **Run the application**
   - Start the backend server
   - Start the frontend development server

## Key Features

- **Offline-First** - Full functionality without internet connectivity
- **Self-Hosted** - Complete data sovereignty and control
- **Departmental Isolation** - Separate knowledge bases per department
- **AI-Powered** - Local AI assistance with Gemini 3.1B (upgradable to 3N)
- **Secure** - End-to-end encryption and access controls

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Requirements](./docs/requirements/README.md)
- [Architecture](./docs/architecture/README.md)
- [API Reference](./docs/api/README.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).
# ssentongoi
