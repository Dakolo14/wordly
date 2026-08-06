import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/firebase-admin';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Fetch all available words into memory
    const wordsSnapshot = await adminDb.collection('words').get();
    const wordsMap = new Map<number, any>();
    wordsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.seqIndex) {
        wordsMap.set(data.seqIndex, { id: doc.id, ...data });
      }
    });

    // 2. Fetch all user profiles
    const profilesSnapshot = await adminDb.collection('profiles').get();
    
    // We will group emails by the word they are receiving today
    const emailsToSend: { [wordId: string]: { wordData: any, emails: string[] } } = {};
    
    let batch = adminDb.batch();
    let updatesCount = 0;

    for (const userDoc of profilesSnapshot.docs) {
      const userData = userDoc.data();
      let currentWordIndex = userData.currentWordIndex || 1;
      
      let wordData = wordsMap.get(currentWordIndex);
      
      // If they run out of words, loop back to the beginning!
      if (!wordData && wordsMap.size > 0) {
        currentWordIndex = 1;
        wordData = wordsMap.get(1);
      }

      if (!wordData) {
        console.warn(`Database is completely empty for user ${userDoc.id}`);
        continue;
      }
      
      // Assign word to user's dailyWords subcollection
      const userDailyWordRef = userDoc.ref.collection('dailyWords').doc(today);
      
      // Check if already assigned for today to avoid duplicates
      const existingDoc = await userDailyWordRef.get();
      if (!existingDoc.exists) {
        batch.set(userDailyWordRef, {
          wordId: wordData.id,
          createdAt: new Date()
        });
        
        // Increment the user's index
        batch.update(userDoc.ref, {
          currentWordIndex: currentWordIndex + 1
        });
        
        updatesCount++;

        // Queue email if enabled
        if (userData.emailNotifications && userData.email) {
          if (!emailsToSend[wordData.id]) {
            emailsToSend[wordData.id] = { wordData, emails: [] };
          }
          emailsToSend[wordData.id].emails.push(userData.email);
        }
      }

      // Commit in chunks of 400 to stay under Firestore's 500 limit
      if (updatesCount >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        updatesCount = 0;
      }
    }
    
    if (updatesCount > 0) {
      await batch.commit();
    }

    // 3. Send out grouped emails
    for (const [wordId, data] of Object.entries(emailsToSend)) {
      if (data.emails.length > 0) {
        const htmlContent = `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; text-align: center; color: #171717;">
            <h2 style="color: #ff6b6b; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">Word of the Day</h2>
            <h1 style="font-size: 48px; margin-bottom: 8px; text-transform: capitalize;">${data.wordData.word}</h1>
            <p style="font-style: italic; color: #666; margin-bottom: 24px;">${data.wordData.partOfSpeech}</p>
            <p style="font-size: 20px; line-height: 1.5; margin-bottom: 32px;">${data.wordData.meaning}</p>
            
            <div style="background-color: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 32px; text-align: left;">
              <p style="text-transform: uppercase; font-size: 12px; font-weight: bold; color: #888; margin-bottom: 8px;">Example</p>
              <p style="font-size: 16px; font-style: italic;">"${data.wordData.exampleSentence}"</p>
            </div>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #ff6b6b; color: #fff; text-decoration: none; border-radius: 99px; font-weight: bold;">View in App</a>
            
            <p style="margin-top: 48px; font-size: 12px; color: #999;">
              You are receiving this because you enabled daily word notifications. 
              You can change this in your profile settings.
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: `"Word of the Day" <${process.env.EMAIL_USER}>`,
          to: data.emails,
          subject: `Word of the Day: ${data.wordData.word}`,
          html: htmlContent,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Processed daily words for all users.' });
  } catch (error: any) {
    console.error('Daily word error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
