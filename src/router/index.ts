import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import LandingPage   from '../views/LandingPage.vue'
import Login         from '../views/Login.vue'
import Register      from '../views/Register.vue'
import Dashboard     from '../views/Dashboard.vue'
import DashboardHome from '../views/DashboardHome.vue'

// Lazy-loaded Super Admin views
const AdminLayout        = () => import('../views/admin/AdminLayout.vue')
const AdminDashboard     = () => import('../views/admin/AdminDashboard.vue')
const TenantsView        = () => import('../views/admin/TenantsView.vue')
const SubscriptionsView  = () => import('../views/admin/SubscriptionsView.vue')
const StoreTypesView     = () => import('../views/admin/StoreTypesView.vue')
const AnalyticsView      = () => import('../views/admin/AnalyticsView.vue')
const NotificationsAdminView = () => import('../views/admin/NotificationsAdminView.vue')
const AuditLogsView      = () => import('../views/admin/AuditLogsView.vue')
const AdminAccountsView  = () => import('../views/admin/AdminAccountsView.vue')
const SettingsView       = () => import('../views/SettingsView.vue')

// Lazy-loaded Tenant views
const ProductsView       = () => import('../views/ProductsView.vue')
const TenantOnboarding   = () => import('../views/TenantOnboarding.vue')
const ForecastView       = () => import('../views/ForecastView.vue')
const TenantAuditView    = () => import('../views/TenantAuditView.vue')
const ReportsDashboard   = () => import('../views/ReportsDashboard.vue')
const UpgradeView        = () => import('../views/UpgradeView.vue')

// ── Newly built views ────────────────────────────────────────────────────────
const StoreView            = () => import('../views/StoreView.vue')
const UsersView            = () => import('../views/UsersView.vue')
const RolesView            = () => import('../views/RolesView.vue')
const SuppliersView        = () => import('../views/SuppliersView.vue')
const TenantAnalyticsView  = () => import('../views/TenantAnalyticsView.vue')
const NotificationsView    = () => import('../views/NotificationsView.vue')
const ProcurementView      = () => import('../views/ProcurementView.vue')
const InventoryView        = () => import('../views/InventoryView.vue')
const ReceivingView        = () => import('../views/ReceivingView.vue')
const StockInView          = () => import('../views/StockInView.vue')
const StockTransferView    = () => import('../views/StockTransferView.vue')
const LogisticsView        = () => import('../views/LogisticsView.vue')
const PosView              = () => import('../views/PosView.vue')
const SalesHistoryView     = () => import('../views/SalesHistoryView.vue')
const BranchesView           = () => import('../views/BranchesView.vue')
const ResourceCatalogView    = () => import('../views/ResourceCatalogView.vue')
const PurchasingView         = () => import('../views/PurchasingView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    // ── Public ──────────────────────────────────────────────────────────────
    {
      path: '/',
      name: 'landing',
      component: LandingPage,
      meta: { title: 'RetailChain — Make Your Life Simpler' },
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { title: 'Sign In — RetailChain', guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      meta: { title: 'Create Account — RetailChain', guest: true },
    },

    // ── Onboarding (TenantAdmin first login) ─────────────────────────────────
    {
      path: '/onboarding',
      name: 'onboarding',
      component: TenantOnboarding,
      meta: {
        title: 'Welcome — RetailChain',
        requiresAuth: true,
        onboardingRoute: true,
      },
    },

    // ── Super Admin Portal (/admin) ─────────────────────────────────────────
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, role: 'SuperAdmin' },
      children: [
        { path: '',              name: 'admin-dashboard',      component: AdminDashboard,        meta: { title: 'Super Admin Dashboard — RetailChain' } },
        { path: 'tenants',       name: 'admin-tenants',        component: TenantsView,           meta: { title: 'Tenant Management — RetailChain' } },
        { path: 'subscriptions', name: 'admin-subscriptions',  component: SubscriptionsView,     meta: { title: 'Subscription & Billing — RetailChain' } },
        { path: 'store-types',   name: 'admin-store-types',    component: StoreTypesView,        meta: { title: 'Store Types — RetailChain' } },
        { path: 'analytics',     name: 'admin-analytics',      component: AnalyticsView,         meta: { title: 'Analytics & Reports — RetailChain' } },
        { path: 'notifications', name: 'admin-notifications',  component: NotificationsAdminView,meta: { title: 'Notifications — RetailChain' } },
        { path: 'audit-logs',    name: 'admin-audit-logs',     component: AuditLogsView,         meta: { title: 'Audit Logs — RetailChain' } },
        { path: 'accounts',      name: 'admin-accounts',       component: AdminAccountsView,     meta: { title: 'Admin Accounts — RetailChain' } },
        { path: 'settings',      name: 'admin-settings',       component: SettingsView,          meta: { title: 'Account Settings — RetailChain' } },
      ],
    },

    // ── Tenant Dashboard (/dashboard) ───────────────────────────────────────
    {
      path: '/dashboard',
      component: Dashboard,
      meta: { requiresAuth: true },
      children: [
        // ── Shared / Default ─────────────────────────────────────────────
        { path: '',               name: 'dashboard',      component: DashboardHome,          meta: { title: 'Dashboard — RetailChain' } },

        // ── TenantAdmin ──────────────────────────────────────────────────
        { path: 'store',          name: 'store',          component: StoreView,              meta: { title: 'My Store — RetailChain' } },
        { path: 'users',          name: 'users',          component: UsersView,              meta: { title: 'Users — RetailChain' } },
        { path: 'roles',          name: 'roles',          component: RolesView,              meta: { title: 'Roles — RetailChain' } },
        { path: 'resources',      name: 'resources',      component: ResourceCatalogView,    meta: { title: 'Resource Catalog — RetailChain' } },
        { path: 'products',       name: 'products',       component: ProductsView,           meta: { title: 'Products — RetailChain' } },
        { path: 'suppliers',      name: 'suppliers',      component: SuppliersView,          meta: { title: 'Suppliers — RetailChain' } },
        { path: 'branches',       name: 'branches',       component: BranchesView,           meta: { title: 'Branch Management — RetailChain' } },
        { path: 'analytics',      name: 'analytics',      component: TenantAnalyticsView,    meta: { title: 'Analytics — RetailChain' } },
        { path: 'audit',          name: 'audit',          component: TenantAuditView,        meta: { title: 'Audit Log — RetailChain' } },
        { path: 'notifications',  name: 'notifications',  component: NotificationsView,      meta: { title: 'Notifications — RetailChain' } },

        // ── ProcurementOfficer ───────────────────────────────────────────
        { path: 'procurement',    name: 'procurement',    component: ProcurementView,        meta: { title: 'Purchase Orders — RetailChain' } },
        { path: 'reports',        name: 'reports',        component: ReportsDashboard,       meta: { title: 'Reports — RetailChain' } },

        // ── WarehouseStaff ───────────────────────────────────────────────
        { path: 'inventory',      name: 'inventory',      component: InventoryView,          meta: { title: 'Inventory — RetailChain' } },
        { path: 'receiving',      name: 'receiving',      component: ReceivingView,          meta: { title: 'Receiving — RetailChain' } },
        { path: 'stock-in',       name: 'stock-in',       component: StockInView,            meta: { title: 'Stock In — RetailChain' } },
        { path: 'transfer',       name: 'transfer',       component: StockTransferView,      meta: { title: 'Stock Transfer — RetailChain' } },
        { path: 'forecast',       name: 'forecast',       component: ForecastView,           meta: { title: 'Demand Forecast — RetailChain' } },
        { path: 'purchasing',     name: 'purchasing',     component: PurchasingView,         meta: { title: 'Purchasing — RetailChain' } },

        // ── LogisticsStaff ───────────────────────────────────────────────
        { path: 'logistics',      name: 'logistics',      component: LogisticsView,          meta: { title: 'Deliveries — RetailChain' } },

        // ── Cashier ──────────────────────────────────────────────────────
        { path: 'pos',            name: 'pos',            component: PosView,                meta: { title: 'POS — RetailChain' } },
        { path: 'sales',          name: 'sales',          component: SalesHistoryView,       meta: { title: 'Sales History — RetailChain' } },

        // ── Shared ───────────────────────────────────────────────────────
        { path: 'settings',       name: 'settings',       component: SettingsView,           meta: { title: 'Settings — RetailChain' } },
        { path: 'upgrade',        name: 'upgrade',        component: UpgradeView,            meta: { title: 'Upgrade Plan — RetailChain' } },
      ],
    },

    // ── 404 ─────────────────────────────────────────────────────────────────
    { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
  ],
})

// ── Navigation Guards ────────────────────────────────────────────────────────
router.beforeEach((to) => {
  if (to.meta.title) document.title = to.meta.title as string

  const auth = useAuthStore()

  // Logged-in users cannot visit guest-only pages (login, register, landing)
  if (to.meta.guest && auth.isLoggedIn) {
    return auth.isSuperAdmin ? { name: 'admin-dashboard' } : { name: 'dashboard' }
  }

  // Unauthenticated users must log in first
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  // Non-SuperAdmins cannot access the admin portal via URL
  if (to.meta.role === 'SuperAdmin' && !auth.isSuperAdmin) {
    return { name: 'dashboard' }
  }

  // Redirect to onboarding if setup not yet complete
  if (
    auth.isLoggedIn &&
    auth.isTenantAdmin &&
    !auth.onboardingComplete &&
    !to.meta.onboardingRoute &&
    to.path.startsWith('/dashboard')
  ) {
    return { name: 'onboarding' }
  }

  // Redirect to upgrade page if subscription has expired (client-side check)
  if (
    auth.isLoggedIn &&
    !auth.isSuperAdmin &&
    auth.isSubscriptionExpired &&
    to.name !== 'upgrade' &&
    to.path.startsWith('/dashboard')
  ) {
    return { name: 'upgrade' }
  }
})

export default router
