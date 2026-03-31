import './globals.css';

export const metadata = {
  title: 'FinPal — AI Financial Advisor',
  description: 'Real-time dashboard for your AI financial advisor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text font-mono">
        <nav className="border-b border-border px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="text-lg font-medium text-text hover:no-underline">
              🐬 FinPal
            </a>
            <div className="flex gap-6">
              <a href="/" className="text-muted hover:text-text transition-colors">
                Portfolio
              </a>
              <a href="/trades" className="text-muted hover:text-text transition-colors">
                Trades
              </a>
              <a href={process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3020'} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text transition-colors">
                Docs
              </a>
              <a href={process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3010'} className="text-muted hover:text-text transition-colors">
                ← Home
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
