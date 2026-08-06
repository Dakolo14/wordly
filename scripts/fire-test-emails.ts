import { adminDb } from '../src/lib/firebase/firebase-admin';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function fireTestEmails() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Firing Word of the Day emails for all users for date: ${today}...\n`);

  try {
    const profiles = await adminDb.collection('profiles').get();
    let sentCount = 0;
    let failedCount = 0;

    for (const userDoc of profiles.docs) {
      const userData = userDoc.data();
      const email = userData.email;

      // Check if they have a word assigned today
      const dailyWordDoc = await userDoc.ref.collection('dailyWords').doc(today).get();
      
      if (!dailyWordDoc.exists) {
        console.log(`[SKIP] No word assigned for ${email} today.`);
        continue;
      }

      const wordId = dailyWordDoc.data()?.wordId;
      const wordSnapshot = await adminDb.collection('words').doc(wordId).get();
      const wordData = wordSnapshot.data();

      if (!wordData) {
        console.log(`[SKIP] Word data missing for ${email}.`);
        continue;
      }

      console.log(`Preparing email for ${email}... Word: ${wordData.word}`);

      const htmlContent = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; text-align: center; color: #171717;">
          <h2 style="color: #ff6b6b; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">Word of the Day</h2>
          <h1 style="font-size: 48px; margin-bottom: 8px; text-transform: capitalize;">${wordData.word}</h1>
          <p style="font-style: italic; color: #666; margin-bottom: 24px;">${wordData.partOfSpeech}</p>
          <p style="font-size: 20px; line-height: 1.5; margin-bottom: 32px;">${wordData.meaning}</p>
          
          <div style="background-color: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 32px; text-align: left;">
            <p style="text-transform: uppercase; font-size: 12px; font-weight: bold; color: #888; margin-bottom: 8px;">Example</p>
            <p style="font-size: 16px; font-style: italic;">"${wordData.exampleSentence}"</p>
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wordlyyy.vercel.app'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #ff6b6b; color: #fff; text-decoration: none; border-radius: 99px; font-weight: bold;">View in App</a>
          
          <p style="margin-top: 48px; font-size: 12px; color: #999;">
            This is a test broadcast of the Wordly Daily Mail system!
          </p>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"Word of the Day" <${process.env.EMAIL_USER}>`,
          to: [email],
          subject: `Word of the Day: ${wordData.word}`,
          html: htmlContent,
        });

        console.log(`✅ Successfully sent to ${email}`);
        sentCount++;
      } catch (err: any) {
        console.error(`❌ Error attempting to send to ${email}: ${err.message}`);
        failedCount++;
      }
    }
    
    console.log(`\nFinished. Sent: ${sentCount}, Failed: ${failedCount}`);
    console.log(`(Note: Resend Free Tier will block emails sent to non-verified addresses)`);
    process.exit(0);
  } catch (error) {
    console.error('Critical Error:', error);
    process.exit(1);
  }
}

fireTestEmails();
