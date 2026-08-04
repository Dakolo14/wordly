'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';

interface Word {
  id: string;
  word: string;
  partOfSpeech: string;
  meaning: string;
  exampleSentence: string;
  synonyms?: string[];
  difficulty?: string;
}

interface DailyWord {
  date: string;
  wordId: string;
  word?: Word;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [todayWord, setTodayWord] = useState<DailyWord | null>(null);
  const [history, setHistory] = useState<DailyWord[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch today's word
        const dailyDocRef = doc(db, 'dailyWords', today);
        const dailyDoc = await getDoc(dailyDocRef);
        
        if (dailyDoc.exists()) {
          const wordId = dailyDoc.data().wordId;
          const wordDocRef = doc(db, 'words', wordId);
          const wordDoc = await getDoc(wordDocRef);
          
          if (wordDoc.exists()) {
            setTodayWord({
              date: today,
              wordId,
              word: { id: wordDoc.id, ...wordDoc.data() } as Word,
            });
          }
        }
        
        // Fetch history (last 7 days)
        const historyQuery = query(
          collection(db, 'dailyWords'),
          orderBy('createdAt', 'desc'),
          limit(7)
        );
        const historySnapshot = await getDocs(historyQuery);
        
        const historyData: DailyWord[] = [];
        for (const docSnap of historySnapshot.docs) {
          if (docSnap.id !== today) { // skip today in history
            const wordId = docSnap.data().wordId;
            const wordDoc = await getDoc(doc(db, 'words', wordId));
            if (wordDoc.exists()) {
              historyData.push({
                date: docSnap.id,
                wordId,
                word: { id: wordDoc.id, ...wordDoc.data() } as Word,
              });
            }
          }
        }
        setHistory(historyData);
        
      } catch (error) {
        console.error("Error fetching word data:", error);
      } finally {
        setFetching(false);
      }
    }
    
    fetchData();
  }, [user]);

  if (loading || !user || fetching) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col w-full px-6 sm:px-12 md:px-24 mx-auto">
      <header className="flex justify-between items-center py-6 mb-8 border-b border-[var(--color-surface-border)]">
        <h1 className="text-xl sm:text-2xl font-medium tracking-tight">Word of the Day</h1>
        <nav className="flex gap-4 items-center">
          <button 
            onClick={handleLogout}
            className="text-sm font-medium opacity-60 hover:opacity-100 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col gap-12">
        {/* Today's Word Section */}
        <section className="bg-[var(--color-surface)] p-8 sm:p-12 rounded-3xl shadow-sm border border-[var(--color-surface-border)] animate-[pop_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
          {todayWord && todayWord.word ? (
            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-medium text-[var(--color-accent)] mb-2 uppercase tracking-widest">Today's Word</span>
              <h2 className="text-5xl sm:text-7xl font-medium mb-4 tracking-tight capitalize">{todayWord.word.word}</h2>
              <span className="px-3 py-1 rounded-full bg-[var(--background)] border border-[var(--color-surface-border)] text-sm italic mb-6">
                {todayWord.word.partOfSpeech}
              </span>
              <p className="text-xl sm:text-2xl mb-8 max-w-2xl">{todayWord.word.meaning}</p>
              
              <div className="bg-[var(--background)] w-full max-w-2xl p-6 rounded-2xl border border-[var(--color-surface-border)] text-left mx-auto">
                <h3 className="text-sm font-medium uppercase tracking-wider mb-2 opacity-60">Example</h3>
                <p className="text-lg italic">&ldquo;{todayWord.word.exampleSentence}&rdquo;</p>
              </div>
              
              {todayWord.word.synonyms && todayWord.word.synonyms.length > 0 && (
                <div className="mt-8 flex gap-2 flex-wrap justify-center">
                  <span className="text-sm opacity-60 mr-2 flex items-center">Synonyms:</span>
                  {todayWord.word.synonyms.map(syn => (
                    <span key={syn} className="text-sm px-3 py-1 bg-[var(--background)] border border-[var(--color-surface-border)] rounded-full">
                      {syn}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-medium mb-2">No word for today yet!</h2>
              <p className="opacity-70">Check back later once the daily word is generated.</p>
            </div>
          )}
        </section>

        {/* History Section */}
        {history.length > 0 && (
          <section>
            <h3 className="text-xl font-medium mb-6">Previous Words</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {history.map((item) => item.word && (
                <div key={item.date} className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-surface-border)]">
                  <div className="text-xs opacity-60 mb-2">{new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  <h4 className="text-xl sm:text-2xl font-medium capitalize mb-1">{item.word.word}</h4>
                  <div className="text-sm italic opacity-70 mb-3">{item.word.partOfSpeech}</div>
                  <p className="text-sm line-clamp-2 opacity-90">{item.word.meaning}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
