# Trosyn Backend

A robust Node.js backend built with Express, TypeScript, and modern tooling. This project provides a solid foundation for building scalable and maintainable APIs.

## Features

- 🚀 **Express.js** - Fast, unopinionated web framework for Node.js
- 🔒 **Security** - Helmet, CORS, and rate limiting out of the box
- 📝 **API Documentation** - Ready for OpenAPI/Swagger integration
- ✅ **Type Safety** - Full TypeScript support
- 🧪 **Testing** - Cypress for end-to-end testing
- 🛠️ **Developer Experience** - ESLint, Prettier, and Husky pre-configured
- 🔄 **Hot Reloading** - Nodemon for development

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- (Optional) Docker for containerization

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/trosyn-backend.git
   cd trosyn-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The server will be available at `http://localhost:3000`

## Project Structure

```
├── src/
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── middleware/   # Custom middleware
│   ├── models/       # Database models
│   ├── routes/       # Route definitions
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── server.ts     # Application entry point
├── cypress/          # End-to-end tests
├── .env.example      # Environment variables example
└── package.json      # Project configuration
```

## Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build the application
- `npm start` - Start production server
- `npm test` - Run Cypress tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## API Endpoints

### Health Check

- `GET /health` - Check if the server is running

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Open Cypress Test Runner
npx cypress open
```

## Deployment

### Prerequisites

- Docker (optional)
- Node.js 16.x or higher

### With Docker

```bash
# Build the Docker image
docker build -t trosyn-backend .

# Run the container
docker run -p 3000:3000 trosyn-backend
```

### Without Docker

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Node environment | development |
| LOG_LEVEL | Logging level | info |
| RATE_LIMIT_WINDOW_MS | Rate limit window in milliseconds | 900000 (15 minutes) |
| RATE_LIMIT_MAX | Maximum requests per window | 100 |
| ALLOWED_ORIGINS | Comma-separated list of allowed origins | http://localhost:3000 |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRES_IN | JWT expiration time | 30d |
| DATABASE_URL | Database connection string | - |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Cypress](https://www.cypress.io/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
