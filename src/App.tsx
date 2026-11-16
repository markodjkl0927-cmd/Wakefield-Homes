import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { RequireRole } from '@/components/portal/guards'
import { FocusRescue, RouteFocus, ScrollToTop } from '@/components/PageLoader'
import { ConfirmHost, Toaster } from '@/components/ui'

/* Public website */
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const MoveInReadyPage = lazy(() => import('@/pages/public/MoveInReadyPage'))
const HomeDetailPage = lazy(() => import('@/pages/public/HomeDetailPage'))
const OurHomesPage = lazy(() => import('@/pages/public/OurHomesPage'))
const GalleryPage = lazy(() => import('@/pages/public/GalleryPage'))
const ModelDetailPage = lazy(() => import('@/pages/public/ModelDetailPage'))
const ViewMyHomePage = lazy(() => import('@/pages/public/ViewMyHomePage'))
const ViewMyHomeDetailPage = lazy(() => import('@/pages/public/ViewMyHomeDetailPage'))
const BoylHowPage = lazy(() => import('@/pages/public/BoylHowPage'))
const BoylFeaturesPage = lazy(() => import('@/pages/public/BoylFeaturesPage'))
const BoylPricesPage = lazy(() => import('@/pages/public/BoylPricesPage'))
const CommunitiesPage = lazy(() => import('@/pages/public/CommunitiesPage'))
const CommunityDetailPage = lazy(() => import('@/pages/public/CommunityDetailPage'))
const FinancePage = lazy(() => import('@/pages/public/FinancePage'))
const HomePurchasePage = lazy(() => import('@/pages/public/HomePurchasePage'))
const BoylFinancePage = lazy(() => import('@/pages/public/BoylFinancePage'))
const VpdesPage = lazy(() => import('@/pages/public/VpdesPage'))
const StoryPage = lazy(() => import('@/pages/public/StoryPage'))
const AwardsPage = lazy(() => import('@/pages/public/AwardsPage'))
const MembershipsPage = lazy(() => import('@/pages/public/MembershipsPage'))
const LicensesPage = lazy(() => import('@/pages/public/LicensesPage'))
const NewsPage = lazy(() => import('@/pages/public/NewsPage'))
const ReviewsPage = lazy(() => import('@/pages/public/ReviewsPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))

/* Access */
const AccessPage = lazy(() => import('@/pages/auth/AccessPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

/* Home Owner portal */
const OwnerOverview = lazy(() => import('@/pages/owner/OwnerOverview'))
const OwnerAgreements = lazy(() => import('@/pages/owner/OwnerAgreements'))
const OwnerAgreementDetail = lazy(() => import('@/pages/owner/OwnerAgreementDetail'))
const OwnerHomes = lazy(() => import('@/pages/owner/OwnerHomes'))
const OwnerHomeDetail = lazy(() => import('@/pages/owner/OwnerHomeDetail'))
const OwnerAppointments = lazy(() => import('@/pages/owner/OwnerAppointments'))
const OwnerMaintenance = lazy(() => import('@/pages/owner/OwnerMaintenance'))
const OwnerRequestDetail = lazy(() => import('@/pages/owner/OwnerRequestDetail'))
const OwnerProfile = lazy(() => import('@/pages/owner/OwnerProfile'))

/* Staff workspace */
const StaffOverview = lazy(() => import('@/pages/staff/StaffOverview'))
const StaffAppointments = lazy(() => import('@/pages/staff/StaffAppointments'))
const StaffRequests = lazy(() => import('@/pages/staff/StaffRequests'))
const StaffRequestDetail = lazy(() => import('@/pages/staff/StaffRequestDetail'))
const StaffHomes = lazy(() => import('@/pages/staff/StaffHomes'))
const StaffHomeEditor = lazy(() => import('@/pages/staff/StaffHomeEditor'))
const StaffAgreements = lazy(() => import('@/pages/staff/StaffAgreements'))
const StaffAgreementEditor = lazy(() => import('@/pages/staff/StaffAgreementEditor'))
const StaffHomeowners = lazy(() => import('@/pages/staff/StaffHomeowners'))
const StaffLeads = lazy(() => import('@/pages/staff/StaffLeads'))
const StaffMarket = lazy(() => import('@/pages/staff/StaffMarket'))

/* Super Admin */
const AdminOverview = lazy(() => import('@/pages/admin/AdminOverview'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminRoles = lazy(() => import('@/pages/admin/AdminRoles'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminActivity = lazy(() => import('@/pages/admin/AdminActivity'))

/* Internal: 3D viewer test bench — development builds only (never shipped in production). */
const ThreeLab = import.meta.env.DEV ? lazy(() => import('@/pages/dev/ThreeLab')) : null

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteFocus />
      <FocusRescue />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="move-in-ready" element={<MoveInReadyPage />} />
          <Route path="homes/:slug" element={<HomeDetailPage />} />
          <Route path="our-homes" element={<OurHomesPage />} />
          <Route path="our-homes/gallery" element={<GalleryPage />} />
          <Route path="our-homes/models/:slug" element={<ModelDetailPage />} />
          <Route path="view-my-home" element={<ViewMyHomePage />} />
          <Route path="view-my-home/:slug" element={<ViewMyHomeDetailPage />} />
          <Route path="build-on-your-lot" element={<BoylHowPage />} />
          <Route path="build-on-your-lot/features" element={<BoylFeaturesPage />} />
          <Route path="build-on-your-lot/price-list" element={<BoylPricesPage />} />
          <Route path="communities" element={<CommunitiesPage />} />
          <Route path="communities/:slug" element={<CommunityDetailPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="finance/home-purchase" element={<HomePurchasePage />} />
          <Route path="finance/build-on-your-lot" element={<BoylFinancePage />} />
          <Route path="vpdes" element={<VpdesPage />} />
          <Route path="about" element={<StoryPage />} />
          <Route path="about/awards" element={<AwardsPage />} />
          <Route path="about/memberships" element={<MembershipsPage />} />
          <Route path="about/licenses" element={<LicensesPage />} />
          <Route path="about/news" element={<NewsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="access" element={<AccessPage />} />
          <Route path="access/homeowners" element={<LoginPage portal="homeowner" />} />
          <Route path="access/staff" element={<LoginPage portal="staff" />} />
          {ThreeLab && <Route path="dev/3d" element={<ThreeLab />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="owner"
          element={
            <RequireRole roles={['homeowner']}>
              <PortalLayout area="owner" />
            </RequireRole>
          }
        >
          <Route index element={<OwnerOverview />} />
          <Route path="agreements" element={<OwnerAgreements />} />
          <Route path="agreements/:id" element={<OwnerAgreementDetail />} />
          <Route path="homes" element={<OwnerHomes />} />
          <Route path="homes/:id" element={<OwnerHomeDetail />} />
          <Route path="appointments" element={<OwnerAppointments />} />
          <Route path="maintenance" element={<OwnerMaintenance />} />
          <Route path="maintenance/:id" element={<OwnerRequestDetail />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Route>

        <Route
          path="staff"
          element={
            <RequireRole roles={['staff', 'admin']}>
              <PortalLayout area="staff" />
            </RequireRole>
          }
        >
          <Route index element={<StaffOverview />} />
          <Route path="appointments" element={<StaffAppointments />} />
          <Route path="requests" element={<StaffRequests />} />
          <Route path="requests/:id" element={<StaffRequestDetail />} />
          <Route path="homes" element={<StaffHomes />} />
          <Route path="homes/new" element={<StaffHomeEditor />} />
          <Route path="homes/:id" element={<StaffHomeEditor />} />
          <Route path="market" element={<StaffMarket />} />
          <Route path="agreements" element={<StaffAgreements />} />
          <Route path="agreements/new" element={<StaffAgreementEditor />} />
          <Route path="agreements/:id" element={<StaffAgreementEditor />} />
          <Route path="homeowners" element={<StaffHomeowners />} />
          <Route path="leads" element={<StaffLeads />} />
          <Route path="*" element={<Navigate to="/staff" replace />} />
        </Route>

        <Route
          path="admin"
          element={
            <RequireRole roles={['admin']}>
              <PortalLayout area="staff" />
            </RequireRole>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
      <Toaster />
      <ConfirmHost />
    </BrowserRouter>
  )
}
