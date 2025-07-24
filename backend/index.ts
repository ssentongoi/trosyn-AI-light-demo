import express from 'express';
import { summarizeText } from './routes/ai/summarize';
import { redactText } from './routes/ai/redact';
import { spellcheckText } from './routes/ai/spellcheck';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/api/ai/summarize', summarizeText);
app.post('/api/ai/redact', redactText);
app.post('/api/ai/spellcheck', spellcheckText);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
