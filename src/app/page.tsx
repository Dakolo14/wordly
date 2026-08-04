import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 text-center">
      <div className="max-w-3xl flex flex-col items-center">
        <h1 className="text-6xl sm:text-7xl font-medium mb-6 tracking-tight animate-[pop_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
          Word of the Day
        </h1>
        <p className="text-xl sm:text-2xl text-[var(--foreground)] opacity-80 mb-12 max-w-xl animate-[pop_0.8s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
          One new word a day. Sharper vocabulary, effortlessly.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-[pop_1s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
          <Link 
            href="/login" 
            className="px-8 py-3 rounded-full bg-[var(--color-surface)] border border-[var(--color-surface-border)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg font-medium"
          >
            Log in
          </Link>
          <Link 
            href="/register" 
            className="px-8 py-3 rounded-full bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors text-lg font-medium shadow-sm hover:shadow-md"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
