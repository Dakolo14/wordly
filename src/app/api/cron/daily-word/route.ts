import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/firebase-admin';
import { Resend } from 'resend';
import { GoogleGenAI } from '@google/genai';

// Prevent Next.js from trying to pre-render this route at build time
export const dynamic = 'force-dynamic';

const PROMPT = `
Generate a single unique, interesting English word suitable for a "Word of the Day" vocabulary-building app.
Make sure the word is not extremely obscure, but rather a useful word that an educated person might want to add to their active vocabulary (e.g., "ephemeral", "sycophant", "ubiquitous").

The output MUST be a valid JSON object with the following structure:
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

export async function GET(request: Request) {
  // 1. Validate Cron Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Initialize services inside the handler so they don't crash at build time
  const resend = new Resend(process.env.RESEND_API_KEY);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if a word already exists for today to prevent duplicates
    const dailyDoc = await adminDb.collection('dailyWords').doc(today).get();
    if (dailyDoc.exists) {
      return NextResponse.json({ message: 'Word for today already generated' });
    }

    // 2. Generate a word on the fly with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: PROMPT,
    });
    
    let text = response.text || '{}';
    if (text.startsWith('```json')) text = text.substring(7);
    if (text.startsWith('```')) text = text.substring(3);
    if (text.endsWith('```')) text = text.substring(0, text.length - 3);
    
    const wordData = JSON.parse(text.trim());
    
    const wordId = wordData.word.toLowerCase().replace(/\s+/g, '-');

    // 3. Save the generated word and create dailyWord
    const batch = adminDb.batch();
    
    const wordRef = adminDb.collection('words').doc(wordId);
    batch.set(wordRef, {
      ...wordData,
      used: true,
      createdAt: new Date()
    }, { merge: true });
    
    const dailyWordRef = adminDb.collection('dailyWords').doc(today);
    batch.set(dailyWordRef, {
      wordId: wordId,
      createdAt: new Date()
    });

    await batch.commit();

    // 4. Send Emails via Resend
    const profilesSnapshot = await adminDb.collection('profiles').where('emailNotifications', '==', true).get();
    const emails = profilesSnapshot.docs.map(doc => doc.data().email).filter(Boolean);

    if (emails.length > 0) {
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
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #ff6b6b; color: #fff; text-decoration: none; border-radius: 99px; font-weight: bold;">View in App</a>
          
          <p style="margin-top: 48px; font-size: 12px; color: #999;">
            You are receiving this because you enabled daily word notifications. 
            You can change this in your profile settings.
          </p>
        </div>
      `;

      await resend.emails.send({
        from: 'Word of the Day <onboarding@resend.dev>',
        to: emails,
        subject: `Word of the Day: ${wordData.word}`,
        html: htmlContent,
      });
    }

    return NextResponse.json({ success: true, word: wordData.word });
  } catch (error: any) {
    console.error('Daily word error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
