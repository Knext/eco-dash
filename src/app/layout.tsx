import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Economy Dashboard',
  description: '거시지표 기반 투자 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
