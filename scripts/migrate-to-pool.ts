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

async function main() {
  console.log('Starting migration to User-Specific Daily Words (Option 2)...');
  
  // 1. Assign seqIndex to all existing words
  const wordsSnapshot = await db.collection('words').get();
  const words = wordsSnapshot.docs;
  console.log(`Found ${words.length} words in the database.`);
  
  let batch = db.batch();
  let seqIndex = 1;
  let wordsProcessed = 0;
  
  for (const doc of words) {
    batch.update(doc.ref, { seqIndex });
    seqIndex++;
    wordsProcessed++;
    
    if (wordsProcessed % 100 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (wordsProcessed % 100 !== 0) {
    await batch.commit();
  }
  console.log(`Assigned seqIndex 1 to ${wordsProcessed} to all words.`);
  
  // 2. Fetch today and yesterday from global dailyWords to port to users
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const todayDoc = await db.collection('dailyWords').doc(todayStr).get();
  const todayWordId = todayDoc.exists ? todayDoc.data()?.wordId : null;
  
  const yesterdayDoc = await db.collection('dailyWords').doc(yesterdayStr).get();
  const yesterdayWordId = yesterdayDoc.exists ? yesterdayDoc.data()?.wordId : null;
  
  // 3. Migrate all users
  const profilesSnapshot = await db.collection('profiles').get();
  console.log(`Migrating ${profilesSnapshot.docs.length} users...`);
  
  batch = db.batch();
  let usersProcessed = 0;
  
  for (const userDoc of profilesSnapshot.docs) {
    // Set currentWordIndex to 3 (since we will give them 2 words if they exist)
    batch.update(userDoc.ref, { currentWordIndex: 3 });
    
    // Copy yesterday's word to their personal subcollection
    if (yesterdayWordId) {
      const userYesterdayRef = userDoc.ref.collection('dailyWords').doc(yesterdayStr);
      batch.set(userYesterdayRef, {
        wordId: yesterdayWordId,
        createdAt: yesterday
      });
    }
    
    // Copy today's word to their personal subcollection
    if (todayWordId) {
      const userTodayRef = userDoc.ref.collection('dailyWords').doc(todayStr);
      batch.set(userTodayRef, {
        wordId: todayWordId,
        createdAt: new Date()
      });
    }
    
    usersProcessed++;
    if (usersProcessed % 50 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (usersProcessed % 50 !== 0) {
    await batch.commit();
  }
  
  console.log('Migration complete!');
}

main().catch(console.error);
