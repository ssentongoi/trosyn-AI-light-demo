#!/usr/bin/env node

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { llamaService } from '../services/llama/llamaService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config
const configPath = join(process.cwd(), 'config/aiConfig.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

async function testSpellcheck() {
  try {
    console.log('Initializing LlamaService with Gemma 3N model...');
    await llamaService.initialize();
    
    const testCases = [
      'Helo world, how are you todai?',
      'I hav a drem that one day this nation will rise up',
      'The qick brown fox jmps over the lzy dog',
      'This is a test of the emergncy broadcast system',
      'Pleas excuss any typos in this messge'
    ];

    for (const text of testCases) {
      console.log('\n--- Testing spellcheck ---');
      console.log('Input:', text);
      
      const startTime = Date.now();
      const result = await llamaService.spellcheck(text);
      const endTime = Date.now();
      
      console.log('Original:', result.original);
      console.log('Corrected:', result.corrected);
      console.log('Corrections:', result.corrections);
      console.log(`Time taken: ${endTime - startTime}ms`);
    }
    
    console.log('\nSpellcheck test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during spellcheck test:', error);
    process.exit(1);
  }
}

// Run the test
testSpellcheck();
