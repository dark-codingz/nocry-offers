import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NoCry Offers',
  description: 'Sistema de gerenciamento de ofertas',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var key='nocry-theme';
    var stored=localStorage.getItem(key);
    var prefers=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    var theme = stored || prefers;
    if(theme==='dark'){ document.documentElement.classList.add('dark'); }
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();`,
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
:root {
  --nav-dock-size: 56px;
}
@media (max-width: 640px) {
  .safe-top {
    padding-top: calc(var(--nav-dock-size) + 8px);
  }
}
          `
        }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}

