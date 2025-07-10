# Trosyn Editor Backend

Backend service for Trosyn Editor, providing document save and export functionality.

## Features

- Save editor content as JSON files
- Export content to multiple formats (TXT, HTML, JSON)
- RESTful API endpoints
- Error handling and logging
- TypeScript support

## Prerequisites

- Node.js 16.x or later
- npm 8.x or later

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   ```

## Development

1. Start the development server:
   ```bash
   npm run dev
   ```
2. The server will be available at `http://localhost:3000`

## Building for Production

1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## API Endpoints

### Save Content

- **URL**: `/api/editor/save`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "content": {
      "blocks": [
        {
          "type": "paragraph",
          "data": {
            "text": "Your content here"
          }
        }
      ]
    }
  }
  ```
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Document saved successfully",
    "filename": "document_2023-11-01T12-00-00Z.json"
  }
  ```

### Export Content

- **URL**: `/api/editor/export`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "content": {
      "blocks": [
        {
          "type": "paragraph",
          "data": {
            "text": "Your content here"
          }
        }
      ]
    },
    "format": "txt"
  }
  ```
- **Success Response**: File download with the exported content

## Available Formats

- `txt`: Plain text format
- `html`: HTML document
- `json`: Raw JSON data

## Testing

Run the test suite:

```bash
npm test
```

## License

MIT
