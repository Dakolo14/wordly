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

  const handleSpeak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch dailyDoc and historyQuery concurrently
        const dailyDocRef = doc(db, 'dailyWords', today);
        const historyQuery = query(
          collection(db, 'dailyWords'),
          orderBy('createdAt', 'desc'),
          limit(7)
        );

        const [dailyDoc, historySnapshot] = await Promise.all([
          getDoc(dailyDocRef),
          getDocs(historyQuery)
        ]);
        
        // Concurrently fetch the word details for today and history
        const fetchWordDetailsPromises: Promise<void>[] = [];
        const historyData: DailyWord[] = [];

        if (dailyDoc.exists()) {
          const wordId = dailyDoc.data().wordId;
          fetchWordDetailsPromises.push(
            getDoc(doc(db, 'words', wordId)).then((wordDoc) => {
              if (wordDoc.exists()) {
                setTodayWord({
                  date: today,
                  wordId,
                  word: { id: wordDoc.id, ...wordDoc.data() } as Word,
                });
              }
            })
          );
        }
        
        for (const docSnap of historySnapshot.docs) {
          if (docSnap.id !== today) { // skip today in history
            const wordId = docSnap.data().wordId;
            fetchWordDetailsPromises.push(
              getDoc(doc(db, 'words', wordId)).then((wordDoc) => {
                if (wordDoc.exists()) {
                  historyData.push({
                    date: docSnap.id,
                    wordId,
                    word: { id: wordDoc.id, ...wordDoc.data() } as Word,
                  });
                }
              })
            );
          }
        }
        
        await Promise.all(fetchWordDetailsPromises);
        
        // Sort history Data descending by date because Promise.all might resolve out of order
        historyData.sort((a, b) => b.date.localeCompare(a.date));
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
              <div className="flex items-center justify-center gap-4 mb-4">
                <h2 className="text-5xl sm:text-7xl font-medium tracking-tight capitalize">{todayWord.word.word}</h2>
                <button 
                  onClick={() => handleSpeak(todayWord.word?.word || '')}
                  className="p-3 rounded-full bg-[var(--background)] border border-[var(--color-surface-border)] hover:bg-[var(--color-surface-border)] transition-colors opacity-70 hover:opacity-100"
                  aria-label="Listen to pronunciation"
                >
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xl sm:text-2xl font-medium capitalize">{item.word.word}</h4>
                    <button 
                      onClick={() => handleSpeak(item.word?.word || '')}
                      className="p-2 rounded-full hover:bg-[var(--background)] transition-colors opacity-60 hover:opacity-100"
                      aria-label="Listen to pronunciation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </button>
                  </div>
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
