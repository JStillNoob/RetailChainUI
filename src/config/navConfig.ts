// Role-based nav configuration for the Dashboard sidebar.
// icon: use the Phosphor Icons class name WITHOUT the "ph-fill" prefix
//       (e.g. "ph-squares-four" → renders as "ph-fill ph-squares-four")
//       See https://phosphoricons.com for valid names.

export interface NavItem {
  /** Phosphor icon class name (without ph-fill prefix) e.g. 'ph-squares-four' */
  icon: string
  label: string
  /** Route the link points to. Optional for tree-parent items that only group children. */
  to?: string
  id: string
  /** Optional nested items rendered as an expandable subtree. */
  children?: NavItem[]
}

export interface NavGroup {
  /** Optional section header — hidden when sidebar is collapsed */
  groupLabel?: string
  items: NavItem[]
}

export const navConfig: Record<string, NavGroup[]> = {

  // ─────────────────────────────────────────────────────
  // Hick's Law: 6 top-level categories, submenus expand on click.
  TenantAdmin: [
    {
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard', to: '/dashboard', id: 'nav-home' },

        {
          icon: 'ph-storefront', label: 'Store Setup', id: 'nav-store-setup',
          children: [
            { icon: 'ph-house',         label: 'My Store',  to: '/dashboard/store',     id: 'nav-store' },
            { icon: 'ph-users',         label: 'Users',     to: '/dashboard/users',     id: 'nav-users' },
            { icon: 'ph-shield-check',  label: 'Roles',     to: '/dashboard/roles',     id: 'nav-roles' },
            { icon: 'ph-git-branch',    label: 'Branches',  to: '/dashboard/branches',  id: 'nav-branches' },
            { icon: 'ph-users-three',   label: 'Suppliers', to: '/dashboard/suppliers', id: 'nav-suppliers' },
          ],
        },

        {
          icon: 'ph-package', label: 'Inventory', id: 'nav-inventory-group',
          children: [
            { icon: 'ph-book-open',         label: 'Catalog',  to: '/dashboard/resources', id: 'nav-resources' },
            { icon: 'ph-list-bullets',      label: 'Products', to: '/dashboard/products',  id: 'nav-products-catalog' },
            { icon: 'ph-arrow-circle-down', label: 'Stock In', to: '/dashboard/stock-in',  id: 'nav-products-stockin' },
            { icon: 'ph-arrows-left-right', label: 'Transfer', to: '/dashboard/transfer',  id: 'nav-transfer' },
          ],
        },

        {
          icon: 'ph-cash-register', label: 'Sales', id: 'nav-sales-group',
          children: [
            { icon: 'ph-cash-register', label: 'Cashier',       to: '/dashboard/pos',   id: 'nav-pos' },
            { icon: 'ph-receipt',       label: 'Sales History', to: '/dashboard/sales', id: 'nav-sales' },
          ],
        },

        { icon: 'ph-shopping-cart-simple', label: 'Purchasing', to: '/dashboard/purchasing', id: 'nav-purchasing' },

        {
          icon: 'ph-chart-bar', label: 'Reports', id: 'nav-reports-group',
          children: [
            { icon: 'ph-chart-line-up',  label: 'Analytics',     to: '/dashboard/analytics',     id: 'nav-analytics' },
            { icon: 'ph-chart-bar',      label: 'Forecast',      to: '/dashboard/forecast',      id: 'nav-forecast' },
            { icon: 'ph-clipboard-text', label: 'Audit Log',     to: '/dashboard/audit',         id: 'nav-audit' },
            { icon: 'ph-bell',           label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
          ],
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  ProcurementOfficer: [
    {
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard', to: '/dashboard', id: 'nav-home' },

        {
          icon: 'ph-shopping-cart-simple', label: 'Purchasing', id: 'nav-purchasing-group',
          children: [
            { icon: 'ph-users-three', label: 'Suppliers',       to: '/dashboard/suppliers',   id: 'nav-suppliers' },
            { icon: 'ph-file-text',   label: 'Purchase Orders', to: '/dashboard/procurement', id: 'nav-po' },
          ],
        },

        {
          icon: 'ph-chart-bar', label: 'Reports', id: 'nav-reports-group',
          children: [
            { icon: 'ph-chart-bar', label: 'Reports',       to: '/dashboard/reports',       id: 'nav-reports' },
            { icon: 'ph-bell',      label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
          ],
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  WarehouseStaff: [
    {
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard', to: '/dashboard', id: 'nav-home' },

        {
          icon: 'ph-package', label: 'Inventory', id: 'nav-inventory-group',
          children: [
            { icon: 'ph-list-bullets', label: 'Products',  to: '/dashboard/products',  id: 'nav-products' },
            { icon: 'ph-stack',        label: 'Stock',     to: '/dashboard/inventory', id: 'nav-inventory' },
          ],
        },

        {
          icon: 'ph-shopping-cart-simple', label: 'Purchasing', id: 'nav-purchasing-group',
          children: [
            { icon: 'ph-arrow-circle-down', label: 'Receiving', to: '/dashboard/receiving', id: 'nav-receiving' },
          ],
        },

        {
          icon: 'ph-chart-bar', label: 'Reports', id: 'nav-reports-group',
          children: [
            { icon: 'ph-chart-line-up', label: 'Forecast',      to: '/dashboard/forecast',      id: 'nav-forecast' },
            { icon: 'ph-bell',          label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
          ],
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  LogisticsStaff: [
    {
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard',  to: '/dashboard',           id: 'nav-home' },
        { icon: 'ph-truck',        label: 'Deliveries', to: '/dashboard/logistics', id: 'nav-deliveries' },

        {
          icon: 'ph-chart-bar', label: 'Reports', id: 'nav-reports-group',
          children: [
            { icon: 'ph-chart-bar', label: 'Reports',       to: '/dashboard/reports',       id: 'nav-reports' },
            { icon: 'ph-bell',      label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
          ],
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  Cashier: [
    {
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard', to: '/dashboard', id: 'nav-home' },

        {
          icon: 'ph-cash-register', label: 'Sales', id: 'nav-sales-group',
          children: [
            { icon: 'ph-cash-register',    label: 'New Transaction', to: '/dashboard/pos',      id: 'nav-pos' },
            { icon: 'ph-receipt',          label: 'Sales History',   to: '/dashboard/sales',    id: 'nav-sales' },
            { icon: 'ph-magnifying-glass', label: 'Product Lookup',  to: '/dashboard/products', id: 'nav-products' },
          ],
        },

        { icon: 'ph-bell', label: 'Notifications', to: '/dashboard/notifications', id: 'nav-notif' },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────
  SuperAdmin: [
    {
      items: [
        { icon: 'ph-squares-four', label: 'Dashboard', to: '/admin', id: 'admin-nav-home' },

        {
          icon: 'ph-gear', label: 'Management', id: 'admin-nav-mgmt',
          children: [
            { icon: 'ph-buildings',   label: 'Tenants',        to: '/admin/tenants',       id: 'admin-nav-tenants' },
            { icon: 'ph-credit-card', label: 'Subscriptions',  to: '/admin/subscriptions', id: 'admin-nav-subs' },
            { icon: 'ph-storefront',  label: 'Store Types',    to: '/admin/store-types',   id: 'admin-nav-store-types' },
            { icon: 'ph-users-three', label: 'Admin Accounts', to: '/admin/accounts',      id: 'admin-nav-accounts' },
          ],
        },

        {
          icon: 'ph-chart-bar', label: 'Reports', id: 'admin-nav-reports',
          children: [
            { icon: 'ph-chart-line-up',  label: 'Analytics',     to: '/admin/analytics',     id: 'admin-nav-analytics' },
            { icon: 'ph-clipboard-text', label: 'Audit Logs',    to: '/admin/audit-logs',    id: 'admin-nav-audit' },
            { icon: 'ph-bell',           label: 'Notifications', to: '/admin/notifications', id: 'admin-nav-notif' },
          ],
        },
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
