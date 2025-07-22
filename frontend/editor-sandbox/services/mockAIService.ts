import { OutputData } from '@editorjs/editorjs';

// This function simulates a call to an AI service.
export const getAIChatResponse = async (message: string): Promise<string> => {
  console.log(`Simulating AI chat response for: "${message}"`);

  // Simulate a random failure
  if (Math.random() < 0.2) { // 20% chance of failure
    throw new Error('Mock AI service failed: Could not generate chat response.');
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (message.toLowerCase().includes('hello')) {
    return 'Hello there! How can I help you with your document today?';
  }
  if (message.toLowerCase().includes('summarize')) {
    return 'I can help with that. Just paste the text here or use the summarize action on the selected text.';
  }

  return `I'm a mock AI, and I received your message: "${message}". I don't have much to say about that right now.`;
};

export const processTextWithAI = async (
  action: string,
  data: OutputData
): Promise<OutputData> => {
  console.log(`Simulating AI action: ${action}`);

  // Simulate a random failure
  if (Math.random() < 0.2) { // 20% chance of failure
    throw new Error(`Mock AI service failed: Could not perform '${action}' action.`);
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const newBlocks = data.blocks.map(block => {
    if (block.type === 'paragraph' || block.type === 'header') {
      const originalText = block.data.text || '';
      let newText = originalText;

      switch (action) {
        case 'summarize':
          newText = `[Summary]: ${originalText.substring(0, 100)}...`;
          break;
        case 'fix-grammar':
          newText = `[Grammar Fixed]: ${originalText.replace(/\b(hte|teh)\b/gi, 'the')}`;
          break;
        case 'improve-writing':
          newText = `[Improved]: This is a much better version of '${originalText}'`;
          break;
        case 'make-shorter':
          newText = `[Shorter]: ${originalText.split(' ').slice(0, 5).join(' ')}...`;
          break;
        case 'make-longer':
          newText = `[Longer]: ${originalText} And then, some more words were added to make this text significantly longer than it was before.`;
          break;
        default:
          break;
      }
      return {
        ...block,
        data: {
          ...block.data,
          text: newText,
        },
      };
    }
    return block;
  });

  return {
    ...data,
    blocks: newBlocks,
  };
};
