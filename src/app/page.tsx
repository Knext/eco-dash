import { Header } from '@/components/dashboard/Header'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <DashboardGrid />
    </div>
  )
}
