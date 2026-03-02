import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './dashboard/DashboardLayout'
import { DashboardHome } from './dashboard/DashboardHome'
import { SettingsPage } from '../pages/SettingsPage'
import { UsagePage } from '../pages/UsagePage'

export function Dashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  )
}
