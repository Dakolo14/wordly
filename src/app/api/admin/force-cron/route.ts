import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebase-admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Only allow the specific admin email
    if (decodedToken.email !== 'ajosedare4u@gmail.com') {
      return new Response('Forbidden', { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wordlyyy.vercel.app';
    const cronUrl = `${appUrl}/api/cron/daily-word`;
    
    const res = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cron failed: ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json({ success: true, message: 'Cron triggered successfully', data });
  } catch (error: any) {
    console.error('Admin force cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
