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
  const todayStr = new Date().toISOString().split('T')[0];
  
  const wordsSnap = await db.collection('words').where('seqIndex', '==', 1).get();
  const firstWordId = wordsSnap.empty ? null : wordsSnap.docs[0].id;
  
  if (!firstWordId) {
    console.error('No word with seqIndex=1 found.');
    return;
  }

  const profilesSnapshot = await db.collection('profiles').get();
  console.log(`Checking ${profilesSnapshot.docs.length} profiles for today's word (${todayStr})...`);
  
  let batch = db.batch();
  let updates = 0;
  
  for (const userDoc of profilesSnapshot.docs) {
    const dailyWordRef = userDoc.ref.collection('dailyWords').doc(todayStr);
    const dailyWordDoc = await dailyWordRef.get();
    
    if (!dailyWordDoc.exists) {
      console.log(`User ${userDoc.id} is missing a word today. Assigning word: ${firstWordId}`);
      batch.set(dailyWordRef, {
        wordId: firstWordId,
        createdAt: new Date()
      });
      batch.update(userDoc.ref, { currentWordIndex: 2 });
      updates++;
    } else {
      console.log(`User ${userDoc.id} already has a word for today.`);
    }
  }
  
  if (updates > 0) {
    await batch.commit();
    console.log(`Successfully fixed ${updates} profiles!`);
  } else {
    console.log('All profiles are perfectly fine.');
  }
}

main().catch(console.error);
