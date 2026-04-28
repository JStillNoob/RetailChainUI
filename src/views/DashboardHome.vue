<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'DashboardHome' })

const auth = useAuthStore()
const role = computed(() => auth.roleTypeName)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const adminLinks = [
  {
    to: '/dashboard/users',
    icon: 'ph-fill ph-users',
    label: 'Users',
    desc: 'Staff & roles',
    bg: 'bg-blue-50',
    color: 'text-blue-500',
  },
  {
    to: '/dashboard/products',
    icon: 'ph-fill ph-package',
    label: 'Products',
    desc: 'Catalog management',
    bg: 'bg-amber-50',
    color: 'text-amber-500',
  },
  {
    to: '/dashboard/suppliers',
    icon: 'ph-fill ph-users-three',
    label: 'Suppliers',
    desc: 'Partner network',
    bg: 'bg-purple-50',
    color: 'text-purple-500',
  },
  {
    to: '/dashboard/analytics',
    icon: 'ph-fill ph-chart-line-up',
    label: 'Analytics',
    desc: 'Business insights',
    bg: 'bg-emerald-50',
    color: 'text-emerald-500',
  },
  {
    to: '/dashboard/audit',
    icon: 'ph-fill ph-clipboard-text',
    label: 'Audit Log',
    desc: 'Activity history',
    bg: 'bg-sky-50',
    color: 'text-sky-500',
  },
  {
    to: '/dashboard/store',
    icon: 'ph-fill ph-storefront',
    label: 'Store Settings',
    desc: 'Profile & address',
    bg: 'bg-rose-50',
    color: 'text-rose-500',
  },
]

const warehouseLinks = [
  {
    to: '/dashboard/inventory',
    icon: 'ph-fill ph-stack',
    label: 'Inventory',
    desc: 'Stock levels',
    bg: 'bg-blue-50',
    color: 'text-blue-500',
  },
  {
    to: '/dashboard/receiving',
    icon: 'ph-fill ph-arrow-circle-down',
    label: 'Receiving',
    desc: 'Confirm deliveries',
    bg: 'bg-emerald-50',
    color: 'text-emerald-500',
  },
  {
    to: '/dashboard/products',
    icon: 'ph-fill ph-package',
    label: 'Products',
    desc: 'Catalog',
    bg: 'bg-amber-50',
    color: 'text-amber-500',
  },
  {
    to: '/dashboard/forecast',
    icon: 'ph-fill ph-chart-line-up',
    label: 'Demand Forecast',
    desc: 'Predictive insights',
    bg: 'bg-purple-50',
    color: 'text-purple-500',
  },
]

const procurementLinks = [
  {
    to: '/dashboard/procurement',
    icon: 'ph-fill ph-file-text',
    label: 'Purchase Orders',
    desc: 'Manage POs',
    bg: 'bg-amber-50',
    color: 'text-amber-500',
  },
  {
    to: '/dashboard/suppliers',
    icon: 'ph-fill ph-users-three',
    label: 'Suppliers',
    desc: 'Partner network',
    bg: 'bg-purple-50',
    color: 'text-purple-500',
  },
  {
    to: '/dashboard/reports',
    icon: 'ph-fill ph-chart-bar',
    label: 'Reports',
    desc: 'Spend analysis',
    bg: 'bg-blue-50',
    color: 'text-blue-500',
  },
]

const logisticsLinks = [
  {
    to: '/dashboard/logistics',
    icon: 'ph-fill ph-truck',
    label: 'Deliveries',
    desc: 'Track shipments',
    bg: 'bg-sky-50',
    color: 'text-sky-500',
  },
  {
    to: '/dashboard/reports',
    icon: 'ph-fill ph-chart-bar',
    label: 'Reports',
    desc: 'Performance',
    bg: 'bg-blue-50',
    color: 'text-blue-500',
  },
]

const cashierLinks = [
  {
    to: '/dashboard/sales',
    icon: 'ph-fill ph-receipt',
    label: 'Sales History',
    desc: 'Past transactions',
    bg: 'bg-emerald-50',
    color: 'text-emerald-500',
  },
  {
    to: '/dashboard/products',
    icon: 'ph-fill ph-magnifying-glass',
    label: 'Product Lookup',
    desc: 'Browse catalog',
    bg: 'bg-amber-50',
    color: 'text-amber-500',
  },
]
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">
    <!-- Greeting -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ greeting }}, {{ auth.firstName || 'User' }} 👋
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ auth.roleTypeName }} ·
          {{
            new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          }}
        </p>
      </div>
    </div>

    <!-- TenantAdmin -->
    <template v-if="role === 'TenantAdmin'">
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Access
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <router-link
            v-for="link in adminLinks"
            :key="link.to"
            :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-9 h-9 rounded-lg',
                link.bg,
                link.color,
                'group-hover:scale-105 transition-transform',
              ]"
            >
              <i :class="[link.icon, 'text-lg']"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 leading-tight">{{ link.label }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ link.desc }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </template>

    <!-- WarehouseStaff -->
    <template v-else-if="role === 'WarehouseStaff'">
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Access
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <router-link
            v-for="link in warehouseLinks"
            :key="link.to"
            :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-9 h-9 rounded-lg',
                link.bg,
                link.color,
                'group-hover:scale-105 transition-transform',
              ]"
            >
              <i :class="[link.icon, 'text-lg']"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 leading-tight">{{ link.label }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ link.desc }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </template>

    <!-- ProcurementOfficer -->
    <template v-else-if="role === 'ProcurementOfficer'">
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Access
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <router-link
            v-for="link in procurementLinks"
            :key="link.to"
            :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-9 h-9 rounded-lg',
                link.bg,
                link.color,
                'group-hover:scale-105 transition-transform',
              ]"
            >
              <i :class="[link.icon, 'text-lg']"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 leading-tight">{{ link.label }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ link.desc }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </template>

    <!-- LogisticsStaff -->
    <template v-else-if="role === 'LogisticsStaff'">
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Access
        </p>
        <div class="grid grid-cols-2 gap-3">
          <router-link
            v-for="link in logisticsLinks"
            :key="link.to"
            :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-9 h-9 rounded-lg',
                link.bg,
                link.color,
                'group-hover:scale-105 transition-transform',
              ]"
            >
              <i :class="[link.icon, 'text-lg']"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 leading-tight">{{ link.label }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ link.desc }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </template>

    <!-- Cashier -->
    <template v-else-if="role === 'Cashier'">
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Access
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <router-link
            to="/dashboard/pos"
            class="bg-blue-500 hover:bg-blue-600 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all flex flex-col items-start gap-2.5 text-white"
          >
            <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
              <i class="ph-fill ph-cash-register text-lg"></i>
            </div>
            <div>
              <p class="text-sm font-bold leading-tight">New Transaction</p>
              <p class="text-[11px] text-white/80 mt-0.5">Open POS register</p>
            </div>
          </router-link>
          <router-link
            v-for="link in cashierLinks"
            :key="link.to"
            :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-9 h-9 rounded-lg',
                link.bg,
                link.color,
                'group-hover:scale-105 transition-transform',
              ]"
            >
              <i :class="[link.icon, 'text-lg']"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 leading-tight">{{ link.label }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ link.desc }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>
