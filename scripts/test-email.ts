import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('Sending test email using Resend...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Word of the Day <onboarding@resend.dev>',
      // We will ask you to change this to your email if it fails!
      to: ['ajosedare4u@gmail.com'], 
      subject: 'Test: Word of the Day',
      html: '<h1>This is a test email from Wordly</h1><p>If you see this, Resend is working!</p>',
    });

    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent successfully!', data);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

testEmail();
