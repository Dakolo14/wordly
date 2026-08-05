import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const wordsToInsert = [
  {
    word: "Resplendent",
    partOfSpeech: "adjective",
    meaning: "Attractive and impressive through being richly colorful or sumptuous.",
    exampleSentence: "She was resplendent in a sea-green dress.",
    synonyms: ["splendid", "magnificent", "brilliant", "gorgeous"],
    difficulty: "intermediate"
  },
  {
    word: "Ubiquitous",
    partOfSpeech: "adjective",
    meaning: "Present, appearing, or found everywhere.",
    exampleSentence: "His ubiquitous influence was felt by all the family.",
    synonyms: ["omnipresent", "everywhere", "pervasive", "universal"],
    difficulty: "advanced"
  }
];

async function main() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  console.log(`Checking words for today (${todayStr}) and yesterday (${yesterdayStr})...`);
  
  const batch = db.batch();
  
  // Yesterday
  const yesterdayDocRef = db.collection('dailyWords').doc(yesterdayStr);
  const yesterdayDoc = await yesterdayDocRef.get();
  if (!yesterdayDoc.exists) {
    const wordData = wordsToInsert[0];
    const wordId = wordData.word.toLowerCase().replace(/\s+/g, '-');
    console.log(`Adding ${wordData.word} for yesterday.`);
    
    const wordRef = db.collection('words').doc(wordId);
    batch.set(wordRef, {
      ...wordData,
      used: true,
      createdAt: new Date()
    }, { merge: true });
    
    batch.set(yesterdayDocRef, {
      wordId: wordId,
      createdAt: yesterday
    });
  } else {
    console.log(`Yesterday (${yesterdayStr}) already has a word.`);
  }

  // Today
  const todayDocRef = db.collection('dailyWords').doc(todayStr);
  const todayDoc = await todayDocRef.get();
  if (!todayDoc.exists) {
    const wordData = wordsToInsert[1];
    const wordId = wordData.word.toLowerCase().replace(/\s+/g, '-');
    console.log(`Adding ${wordData.word} for today.`);
    
    const wordRef = db.collection('words').doc(wordId);
    batch.set(wordRef, {
      ...wordData,
      used: true,
      createdAt: new Date()
    }, { merge: true });
    
    batch.set(todayDocRef, {
      wordId: wordId,
      createdAt: today
    });
  } else {
    console.log(`Today (${todayStr}) already has a word.`);
  }
  
  await batch.commit();
  console.log("Successfully fixed missing words!");
}

main().catch(console.error);
