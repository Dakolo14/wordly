import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function main() {
  const wordsPath = path.resolve(__dirname, 'words.json');
  
  if (!fs.existsSync(wordsPath)) {
    console.error('Error: words.json not found. Run generate-words.ts first.');
    process.exit(1);
  }

  const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
  console.log(`Read ${words.length} words from words.json. Seeding to Firestore...`);

  let count = 0;
  const batchSize = 100;
  let batch = db.batch();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if word already exists to prevent exact duplicates? 
    // We'll just generate a unique document ID based on the word itself
    const docId = word.word.toLowerCase().replace(/\\s+/g, '-');
    const docRef = db.collection('words').doc(docId);
    
    batch.set(docRef, {
      ...word,
      used: false,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true }); // merge true so we don't overwrite if it exists but is already used
    
    count++;
    
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Committed ${count} words...`);
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
    console.log(`Committed ${count} words...`);
  }

  console.log('Successfully seeded all words to Firestore!');
}

main().catch(console.error);
