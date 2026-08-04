'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--color-surface)] p-8 rounded-2xl shadow-sm border border-[var(--color-surface-border)]">
        <h2 className="text-3xl font-bold mb-2 text-center">Reset Password</h2>
        <p className="text-center opacity-70 mb-6 text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-6 text-sm border border-green-100">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 opacity-80">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--color-surface-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow"
              placeholder="you@example.com"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !!message}
            className="w-full mt-2 py-3 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm opacity-80">
          Remember your password?{' '}
          <Link href="/login" className="text-[var(--color-accent)] font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
