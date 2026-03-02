import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './dashboard/DashboardLayout'
import { DashboardHome } from './dashboard/DashboardHome'
import { SettingsPage } from '../pages/SettingsPage'

export function Dashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  )
}
