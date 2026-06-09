import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ToastProvider } from '@/components/ui/toast'
import { AppLayout } from '@/components/layout/AppLayout'

import LoginPage from '@/pages/LoginPage'
import PrintVisitReportPage from '@/pages/PrintVisitReportPage'
import DashboardPage from '@/pages/DashboardPage'
import VisitsPage from '@/pages/VisitsPage'
import VisitDetailPage from '@/pages/VisitDetailPage'
import CreateVisitPage from '@/pages/CreateVisitPage'
import FindingsPage from '@/pages/FindingsPage'
import FindingDetailPage from '@/pages/FindingDetailPage'
import VesselCompliancePage from '@/pages/VesselCompliancePage'
import ReportsPage from '@/pages/ReportsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import ProfilePage from '@/pages/ProfilePage'
import UsersPage from '@/pages/admin/UsersPage'
import MasterDataPage from '@/pages/admin/MasterDataPage'
import InternalInspectionListPage from '@/pages/InternalInspectionListPage'
import InternalInspectionDetailPage from '@/pages/InternalInspectionDetailPage'
import CreateInternalInspectionPage from '@/pages/CreateInternalInspectionPage'
import ExternalInspectionListPage from '@/pages/ExternalInspectionListPage'
import ExternalInspectionDetailPage from '@/pages/ExternalInspectionDetailPage'
import CreateExternalInspectionPage from '@/pages/CreateExternalInspectionPage'
import InternalInspectionSchedulePage from '@/pages/InternalInspectionSchedulePage'
import CreateInspectionPlanPage from '@/pages/CreateInspectionPlanPage'
import PISKapalListPage from '@/pages/PISKapalListPage'
import CreatePISKapalPage from '@/pages/CreatePISKapalPage'
import PISKapalDetailPage from '@/pages/PISKapalDetailPage'
import EditPISKapalPage from '@/pages/EditPISKapalPage'
import NFBVettingPage from '@/pages/NFBVettingPage'
import CreateVisitPlanPage from '@/pages/CreateVisitPlanPage'
import CreateVisitRealisasiPage from '@/pages/CreateVisitRealisasiPage'
import VesselComplianceVisitDetailPage from '@/pages/VesselComplianceVisitDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { initSession } = useAuthStore()
  useEffect(() => { initSession() }, [initSession])

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="visits" element={<VisitsPage />} />
            <Route path="visits/new" element={<CreateVisitPage />} />
            <Route path="visits/:id" element={<VisitDetailPage />} />
            <Route path="findings" element={<FindingsPage />} />
            <Route path="findings/my-findings" element={<FindingsPage myFindingsOnly />} />
            <Route path="findings/:id" element={<FindingDetailPage />} />
            <Route path="vessel-compliance" element={<VesselCompliancePage />} />
            <Route path="vessel-compliance/plan/new" element={<CreateVisitPlanPage />} />
            <Route path="vessel-compliance/plan/realisasi" element={<CreateVisitRealisasiPage />} />
            <Route path="vessel-compliance/visit/:id" element={<VesselComplianceVisitDetailPage />} />
            <Route path="owner-findings" element={<FindingsPage ownerOnly />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin/users" element={<UsersPage />} />
            <Route path="admin/master-data" element={<MasterDataPage />} />
            <Route path="inspections/schedule" element={<InternalInspectionSchedulePage />} />
            <Route path="inspections/plan/new" element={<CreateInspectionPlanPage />} />
            <Route path="inspections/internal" element={<InternalInspectionListPage />} />
            <Route path="inspections/internal/new" element={<CreateInternalInspectionPage />} />
            <Route path="inspections/internal/:id" element={<InternalInspectionDetailPage />} />
            <Route path="inspections/external" element={<ExternalInspectionListPage />} />
            <Route path="inspections/external/new" element={<CreateExternalInspectionPage />} />
            <Route path="inspections/external/:id" element={<ExternalInspectionDetailPage />} />
            <Route path="pis-findings" element={<PISKapalListPage />} />
            <Route path="pis-findings/new" element={<CreatePISKapalPage />} />
            <Route path="pis-findings/:id" element={<PISKapalDetailPage />} />
            <Route path="pis-findings/:id/edit" element={<EditPISKapalPage />} />
            <Route path="nfb-vetting" element={<NFBVettingPage />} />
          </Route>
          {/* Print report — outside AppLayout, no sidebar/header */}
          <Route path="visits/:id/print" element={<ProtectedRoute><PrintVisitReportPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
