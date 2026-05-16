import type { Metadata } from 'next'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Economy Dashboard',
  description: '거시지표 기반 투자 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
