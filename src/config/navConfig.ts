// Role-based nav configuration for the Dashboard sidebar.
// icon: use the Phosphor Icons class name WITHOUT the "ph-fill" prefix
//       (e.g. "ph-squares-four" → renders as "ph-fill ph-squares-four")
//       See https://phosphoricons.com for valid names.

export interface NavItem {
  /** Phosphor icon class name (without ph-fill prefix) e.g. 'ph-squares-four' */
  icon: string
  label: string
  to: string
  id: string
}

export interface NavGroup {
  /** Optional section header — hidden when sidebar is collapsed */
  groupLabel?: string
  items: NavItem[]
}

export const navConfig: Record<string, NavGroup[]> = {

  // ─────────────────────────────────────────────────────
  TenantAdmin: [
    {
      groupLabel: 'Overview',
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard',     to: '/dashboard',              id: 'nav-home' },
        { icon: 'ph-storefront',   label: 'My Store',       to: '/dashboard/store',        id: 'nav-store' },
      ],
    },
    {
      groupLabel: 'Management',
      items: [
        { icon: 'ph-users',           label: 'Users',       to: '/dashboard/users',        id: 'nav-users' },
        { icon: 'ph-shield-check',    label: 'Roles',       to: '/dashboard/roles',        id: 'nav-roles' },
        { icon: 'ph-package',         label: 'Products',    to: '/dashboard/products',     id: 'nav-products' },
        { icon: 'ph-users-three',     label: 'Suppliers',   to: '/dashboard/suppliers',    id: 'nav-suppliers' },
        { icon: 'ph-git-branch',      label: 'Branches',    to: '/dashboard/branches',     id: 'nav-branches' },
      ],
    },
    {
      groupLabel: 'Operations',
      items: [
        { icon: 'ph-arrow-circle-down', label: 'Stock In',    to: '/dashboard/stock-in', id: 'nav-stock-in' },
        { icon: 'ph-cash-register',     label: 'Cashiering',  to: '/dashboard/pos',      id: 'nav-pos' },
      ],
    },
    {
      groupLabel: 'Reports',
      items: [
        { icon: 'ph-chart-line-up',   label: 'Analytics',   to: '/dashboard/analytics',    id: 'nav-analytics' },
        { icon: 'ph-clipboard-text',  label: 'Audit Log',   to: '/dashboard/audit',        id: 'nav-audit' },
        { icon: 'ph-bell',            label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  ProcurementOfficer: [
    {
      groupLabel: 'Procurement',
      items: [
        { icon: 'ph-squares-four',  label: 'Dashboard',      to: '/dashboard',             id: 'nav-home' },
        { icon: 'ph-users-three',   label: 'Suppliers',      to: '/dashboard/suppliers',   id: 'nav-suppliers' },
        { icon: 'ph-file-text',     label: 'Purchase Orders', to: '/dashboard/procurement', id: 'nav-po' },
      ],
    },
    {
      groupLabel: 'Reports',
      items: [
        { icon: 'ph-chart-bar',   label: 'Reports',        to: '/dashboard/reports',      id: 'nav-reports' },
        { icon: 'ph-bell',        label: 'Notifications',  to: '/dashboard/notifications', id: 'nav-notif' },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  WarehouseStaff: [
    {
      groupLabel: 'Inventory',
      items: [
        { icon: 'ph-squares-four',    label: 'Dashboard',   to: '/dashboard',             id: 'nav-home' },
        { icon: 'ph-package',         label: 'Products',    to: '/dashboard/products',    id: 'nav-products' },
        { icon: 'ph-stack',           label: 'Inventory',   to: '/dashboard/inventory',   id: 'nav-inventory' },
        { icon: 'ph-arrow-circle-down', label: 'Receiving', to: '/dashboard/receiving',   id: 'nav-receiving' },
      ],
    },
    {
      groupLabel: 'Reports',
      items: [
        { icon: 'ph-chart-line-up',  label: 'Forecast',      to: '/dashboard/forecast',    id: 'nav-forecast' },
        { icon: 'ph-bell',           label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  LogisticsStaff: [
    {
      groupLabel: 'Logistics',
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard',   to: '/dashboard',           id: 'nav-home' },
        { icon: 'ph-truck',        label: 'Deliveries',  to: '/dashboard/logistics', id: 'nav-deliveries' },
      ],
    },
    {
      groupLabel: 'Reports',
      items: [
        { icon: 'ph-chart-bar',  label: 'Reports',       to: '/dashboard/reports',    id: 'nav-reports' },
        { icon: 'ph-bell',       label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  Cashier: [
    {
      groupLabel: 'Point of Sale',
      items: [
        { icon: 'ph-squares-four',     label: 'Dashboard',       to: '/dashboard',          id: 'nav-home' },
        { icon: 'ph-cash-register',    label: 'New Transaction',  to: '/dashboard/pos',      id: 'nav-pos' },
        { icon: 'ph-receipt',          label: 'Sales History',    to: '/dashboard/sales',    id: 'nav-sales' },
        { icon: 'ph-magnifying-glass', label: 'Product Lookup',   to: '/dashboard/products', id: 'nav-products' },
      ],
    },
    {
      groupLabel: 'Info',
      items: [
        { icon: 'ph-bell', label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  SuperAdmin: [
    {
      groupLabel: 'Overview',
      items: [
        { icon: 'ph-squares-four',   label: 'Dashboard',         to: '/admin',               id: 'admin-nav-home' },
      ],
    },
    {
      groupLabel: 'Management',
      items: [
        { icon: 'ph-buildings',      label: 'Tenants',           to: '/admin/tenants',       id: 'admin-nav-tenants' },
        { icon: 'ph-credit-card',    label: 'Subscriptions',     to: '/admin/subscriptions', id: 'admin-nav-subs' },
        { icon: 'ph-storefront',     label: 'Store Types',       to: '/admin/store-types',   id: 'admin-nav-store-types' },
        { icon: 'ph-users-three',    label: 'Admin Accounts',    to: '/admin/accounts',      id: 'admin-nav-accounts' },
      ],
    },
    {
      groupLabel: 'Reports',
      items: [
        { icon: 'ph-chart-bar',      label: 'Analytics',         to: '/admin/analytics',     id: 'admin-nav-analytics' },
        { icon: 'ph-bell',           label: 'Notifications',     to: '/admin/notifications', id: 'admin-nav-notif' },
        { icon: 'ph-clipboard-text', label: 'Audit Logs',        to: '/admin/audit-logs',    id: 'admin-nav-audit' },
      ],
    },
  ],
}

// Fallback shown when roleTypeName doesn't match any key
export const defaultNavConfig: NavGroup[] = [
  {
    items: [
      { icon: 'ph-squares-four', label: 'Dashboard', to: '/dashboard', id: 'nav-home' },
    ],
  },
]
