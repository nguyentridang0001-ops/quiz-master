// pages/_app.js
import '../styles/globals.css'
import { useEffect, useState } from 'react'

import { SessionProvider } from 'next-auth/react'

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  // simple theme persist
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const t = localStorage.getItem('qm_theme') || 'dark'
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('qm_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <SessionProvider session={session}>
      <div style={{ position: 'fixed', right: 18, top: 18, zIndex: 60 }}>
        <button onClick={toggleTheme} className="btn ghost" title="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      <Component {...pageProps} />
    </SessionProvider>
  )
}
