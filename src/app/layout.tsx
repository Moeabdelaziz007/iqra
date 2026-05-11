import '../styles/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IQRA | Sovereign RAG Engine',
  description: 'Autonomous Quranic Research & Numerical Pattern Discovery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="main-bg-overlay"></div>
        {children}
      </body>
    </html>
  )
}
