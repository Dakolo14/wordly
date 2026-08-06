import { adminDb } from '../src/lib/firebase/firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function forceDaily() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Forcing daily words for date:', today);

  try {
    const wordsSnapshot = await adminDb.collection('words').get();
    const wordsMap = new Map<number, any>();
    wordsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.seqIndex) {
        wordsMap.set(data.seqIndex, { id: doc.id, ...data });
      }
    });

    const profilesSnapshot = await adminDb.collection('profiles').get();
    let batch = adminDb.batch();
    let count = 0;

    for (const userDoc of profilesSnapshot.docs) {
      const userData = userDoc.data();
      const currentWordIndex = userData.currentWordIndex || 1;
      const wordData = wordsMap.get(currentWordIndex);
      
      if (!wordData) continue;
      
      const userDailyWordRef = userDoc.ref.collection('dailyWords').doc(today);
      const existingDoc = await userDailyWordRef.get();
      
      if (!existingDoc.exists) {
        batch.set(userDailyWordRef, {
          wordId: wordData.id,
          createdAt: new Date()
        });
        batch.update(userDoc.ref, {
          currentWordIndex: currentWordIndex + 1
        });
        count++;
        console.log(`Assigned word index ${currentWordIndex} to ${userData.email}`);
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Successfully pushed ${count} words to users for today!`);
    } else {
      console.log('✅ No new words needed to be assigned (already assigned).');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceDaily();
