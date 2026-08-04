import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `
Generate a JSON array of 30 unique, interesting English words suitable for a "Word of the Day" vocabulary-building app.
Make sure the words are not extremely obscure, but rather useful words that an educated person might want to add to their active vocabulary (e.g., "ephemeral", "sycophant", "ubiquitous").

The output MUST be a valid JSON array of objects, where each object has the following structure:
{
  "word": "string",
  "partOfSpeech": "string (e.g., noun, verb, adjective)",
  "meaning": "string (clear and concise definition)",
  "exampleSentence": "string (a great example showing how to use the word)",
  "synonyms": ["string", "string"],
  "difficulty": "string (beginner, intermediate, or advanced)"
}

Do not include markdown blocks, just raw JSON.
`;

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is missing in .env.local');
    process.exit(1);
  }

  console.log('Generating words using Gemini API...');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: PROMPT,
    });
    
    let text = response.text || '[]';
    // Clean up potential markdown formatting
    if (text.startsWith('```json')) {
      text = text.substring(7);
    }
    if (text.startsWith('```')) {
      text = text.substring(3);
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    
    const words = JSON.parse(text.trim());
    
    const outPath = path.resolve(__dirname, 'words.json');
    fs.writeFileSync(outPath, JSON.stringify(words, null, 2));
    
    console.log(`Success! Generated ${words.length} words and saved to ${outPath}`);
  } catch (error) {
    console.error('Failed to generate words:', error);
  }
}

main();
