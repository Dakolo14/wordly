import * as path from 'path';
import * as dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function check() {
  const wordsSnap = await db.collection('words').where('seqIndex', '==', 1).get();
  console.log('Words with seqIndex=1:', wordsSnap.size);

  const profilesSnap = await db.collection('profiles').get();
  console.log('Total profiles:', profilesSnap.size);
  profilesSnap.docs.forEach(doc => {
    console.log('Profile:', doc.id, doc.data());
  });
}
check();
