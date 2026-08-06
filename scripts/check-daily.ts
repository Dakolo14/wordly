import { adminDb } from '../src/lib/firebase/firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkDatabase() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Checking database for date:', today);

  try {
    const profiles = await adminDb.collection('profiles').get();
    console.log(`Found ${profiles.size} user profiles.`);

    for (const doc of profiles.docs) {
      console.log(`\nUser: ${doc.id} (Email: ${doc.data().email})`);
      
      const dailyWords = await doc.ref.collection('dailyWords').doc(today).get();
      if (dailyWords.exists) {
        console.log(`✅ Word assigned for today! Word ID: ${dailyWords.data()?.wordId}`);
      } else {
        console.log(`❌ No word assigned for today.`);
      }
    }
    
    console.log('\nFinished checking.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();
