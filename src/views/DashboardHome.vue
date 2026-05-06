<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.ts'
import { useRouter, useRoute } from 'vue-router'

defineOptions({ name: 'DashboardHome' })

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()
const role   = computed(() => auth.roleTypeName)

// ── Payment success congratulations ──────────────────────────────────────────
const showCongrats = ref(false)
const congratsPlan = ref('')

onMounted(() => {
  if (route.query.payment === 'success') {
    congratsPlan.value = (route.query.plan as string) || 'your plan'
    showCongrats.value = true
    // Clean the URL without reloading
    router.replace({ path: '/dashboard' })
  }
})

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

    <!-- ── Payment Success Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCongrats" class="ps-modal-backdrop" @click.self="showCongrats = false">
          <div class="ps-modal-card text-center" style="max-width: 440px">
            <!-- Confetti-style header -->
            <div class="flex flex-col items-center gap-3 px-8 pt-10 pb-6">
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <i class="ph-fill ph-crown text-4xl text-indigo-500"></i>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-slate-900">Congratulations!</h2>
                <p class="mt-2 text-slate-500 text-sm leading-relaxed">
                  You're now on the <strong class="text-indigo-600">{{ congratsPlan }}</strong>.<br>
                  All premium features are now unlocked and ready to use.
                </p>
              </div>

              <div class="w-full mt-2 p-4 bg-indigo-50 rounded-xl text-left space-y-2">
                <div class="flex items-center gap-2 text-sm text-indigo-700">
                  <i class="ph-fill ph-check-circle text-indigo-500"></i>
                  <span>Subscription activated successfully</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-indigo-700">
                  <i class="ph-fill ph-check-circle text-indigo-500"></i>
                  <span>Demand forecasting unlocked</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-indigo-700">
                  <i class="ph-fill ph-check-circle text-indigo-500"></i>
                  <span>Branch management enabled</span>
                </div>
              </div>
            </div>

            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-primary w-full justify-center" @click="showCongrats = false">
                <i class="ph ph-rocket-launch"></i> Get Started
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
