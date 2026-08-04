'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';

export default function Profile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayName(data.displayName || '');
          setEmailNotifications(data.emailNotifications !== false);
        }
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setFetching(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        displayName,
        emailNotifications
      });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading || !user || fetching) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto p-6">
      <header className="flex justify-between items-center py-6 mb-8 border-b border-[var(--color-surface-border)]">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <nav className="flex gap-4 items-center">
          <Link href="/dashboard" className="text-sm font-medium hover:text-[var(--color-accent)] transition-colors">Dashboard</Link>
        </nav>
      </header>
      
      <main className="flex-1">
        <div className="bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-surface-border)]">
          {message.text && (
            <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Email (Read Only)</label>
              <input 
                type="email" 
                disabled
                value={user.email || ''}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--color-surface-border)] opacity-50 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--color-surface-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow"
              />
            </div>

            <div className="flex items-center gap-3 p-4 border border-[var(--color-surface-border)] rounded-lg bg-[var(--background)]">
              <input 
                type="checkbox" 
                id="emailNotif"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-5 h-5 accent-[var(--color-accent)]"
              />
              <label htmlFor="emailNotif" className="text-sm font-medium cursor-pointer">
                Receive daily word by email
              </label>
            </div>
            
            <button 
              type="submit" 
              disabled={saving}
              className="mt-4 py-3 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <div className="mt-12 pt-6 border-t border-[var(--color-surface-border)]">
            <button 
              onClick={handleLogout}
              className="text-red-500 font-medium hover:underline text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
