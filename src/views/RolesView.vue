<script setup lang="ts">
defineOptions({ name: 'RolesView' })

const ROLES = [
  {
    name: 'TenantAdmin',
    icon: 'ph-shield-star',
    color: 'indigo',
    description: 'Full access within their own tenant. Can manage users, products, suppliers, branches, and view all reports.',
    permissions: ['Users', 'Products', 'Inventory', 'Suppliers', 'Branches', 'Purchase Orders', 'Deliveries', 'Sales', 'Analytics', 'Audit Log'],
  },
  {
    name: 'ProcurementOfficer',
    icon: 'ph-file-text',
    color: 'blue',
    description: 'Manages suppliers and purchase orders. Can view and create purchase orders and manage supplier records.',
    permissions: ['Suppliers', 'Purchase Orders', 'Reports'],
  },
  {
    name: 'WarehouseStaff',
    icon: 'ph-warehouse',
    color: 'teal',
    description: 'Manages inventory and stock levels. Can receive stock, view products, and access demand forecasts.',
    permissions: ['Products (read)', 'Inventory', 'Stock Receiving', 'Demand Forecast'],
  },
  {
    name: 'LogisticsStaff',
    icon: 'ph-truck',
    color: 'orange',
    description: 'Handles delivery tracking and carrier management. Can update delivery statuses.',
    permissions: ['Deliveries', 'Carriers (read)', 'Reports'],
  },
  {
    name: 'Cashier',
    icon: 'ph-cash-register',
    color: 'green',
    description: 'Processes sales transactions at the Point of Sale. Can look up products and view their own transaction history.',
    permissions: ['Point of Sale', 'Sales History', 'Products (lookup)'],
  },
]

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700' },
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Roles</h1>
        <p class="ps-page-sub">System-defined roles and their access levels. Roles are assigned when creating or editing a staff user.</p>
      </div>
    </div>

    <!-- Info banner -->
    <div class="flex items-start gap-3 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
      <i class="ph-fill ph-info text-lg mt-0.5 flex-shrink-0"></i>
      <span>
        Roles are <strong>built-in and fixed</strong> by the system. You can assign any of the roles below to your staff members when creating or editing a user account.
      </span>
    </div>

    <!-- Roles grid -->
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
      <div
        v-for="role in ROLES"
        :key="role.name"
        :class="['ps-card p-5 border', colorMap[role.color]!.border]"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-3">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', colorMap[role.color]!.bg, colorMap[role.color]!.text]">
            <i :class="`ph-fill ${role.icon}`"></i>
          </div>
          <div>
            <div class="text-sm font-bold text-slate-800">{{ role.name }}</div>
          </div>
        </div>

        <!-- Description -->
        <p class="text-xs text-slate-500 leading-relaxed mb-4">{{ role.description }}</p>

        <!-- Permissions -->
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="perm in role.permissions"
            :key="perm"
            :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full', colorMap[role.color]!.badge]"
          >
            {{ perm }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>
