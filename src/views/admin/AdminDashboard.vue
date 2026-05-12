<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.ts'
import { getDashboardData } from '../../services/superadmin.ts'

defineOptions({ name: 'AdminDashboard' })

const router = useRouter()
const auth   = useAuthStore()

// ── Types ─────────────────────────────────────────────────────────────────
interface DashboardData {
  overview: {
    totalTenants: number
    activeTenants: number
    suspendedTenants: number
    activeSubscriptions: number
    trialSubscriptions: number
    expiredSubscriptions: number
    monthlyRevenue: number
    newThisMonth: number
  }
  revenueTrend: { year: number; month: number; label: string; revenue: number }[]
  attentionItems: { tenantId: number; tenantName: string; email: string; issueType: string; issue: string; subscriptionId: number; endDate: string }[]
  subscriptionStatusDist: { status: string; count: number }[]
  planDistribution: { planName: string; count: number }[]
  recentRegistrations: { tenantId: number; name: string; email: string; status: string; planName: string; subscriptionStatus: string; createdAt: string }[]
  systemUsage: { totalUsers: number; totalBranches: number; totalProducts: number; totalTransactions: number }
}

// ── State ─────────────────────────────────────────────────────────────────
const data    = ref<DashboardData | null>(null)
const loading = ref(true)
const error   = ref('')

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

async function load() {
  loading.value = true
  error.value   = ''
  try {
    data.value = await getDashboardData()
  } catch {
    error.value = 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Formatters ────────────────────────────────────────────────────────────
const formatCurrency = (v: number) =>
  '₱' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

const formatShort = (v: number) => {
  if (v >= 1_000_000) return '₱' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return '₱' + (v / 1_000).toFixed(0) + 'K'
  return '₱' + v.toFixed(0)
}

const formatNumber = (v: number) =>
  new Intl.NumberFormat('en-US').format(v)

// ── Summary cards (4 only — Hick's Law) ───────────────────────────────────
const summaryCards = computed(() => {
  const o    = data.value?.overview
  if (!o) return []
  const attn = data.value?.attentionItems?.length ?? 0

  return [
    {
      label:       'Total Tenants',
      value:       formatNumber(o.totalTenants),
      detail:      `${formatNumber(o.activeTenants)} active · ${o.suspendedTenants} suspended`,
      iconBg:      'bg-blue-50',
      iconColor:   'text-blue-500',
      icon:        'ph-buildings',
      pill:        o.newThisMonth > 0 ? `+${o.newThisMonth} new` : null,
      pillOk:      true,
      borderAlert: false,
    },
    {
      label:       'Active Subscriptions',
      value:       formatNumber(o.activeSubscriptions),
      detail:      o.expiredSubscriptions > 0
        ? `${o.expiredSubscriptions} expired · ${o.trialSubscriptions} trial`
        : `${o.trialSubscriptions} on trial`,
      iconBg:      'bg-emerald-50',
      iconColor:   'text-emerald-500',
      icon:        'ph-credit-card',
      pill:        o.expiredSubscriptions > 0 ? `${o.expiredSubscriptions} expired` : null,
      pillOk:      false,
      borderAlert: o.expiredSubscriptions > 0,
    },
    {
      label:       'Monthly Revenue',
      value:       formatCurrency(o.monthlyRevenue),
      detail:      `${formatNumber(o.activeSubscriptions)} active subscriptions`,
      iconBg:      'bg-violet-50',
      iconColor:   'text-violet-500',
      icon:        'ph-currency-dollar',
      pill:        null,
      pillOk:      true,
      borderAlert: false,
    },
    {
      label:       'Needs Attention',
      value:       String(attn),
      detail:      attn === 0 ? 'Platform is healthy' : `${o.expiredSubscriptions} expired · ${o.suspendedTenants} suspended`,
      iconBg:      attn === 0 ? 'bg-emerald-50'      : 'bg-red-50',
      iconColor:   attn === 0 ? 'text-emerald-500'   : 'text-red-500',
      icon:        attn === 0 ? 'ph-check-circle'    : 'ph-warning-circle',
      pill:        null,
      pillOk:      true,
      borderAlert: attn > 0,
    },
  ]
})

// ── Revenue line chart ─────────────────────────────────────────────────────
const CW = 680, CH = 220
const PAD = { left: 64, right: 16, top: 20, bottom: 44 }
const IW  = CW - PAD.left - PAD.right   // 600
const IH  = CH - PAD.top  - PAD.bottom  // 156

const revenueChart = computed(() => {
  const trend = data.value?.revenueTrend
  if (!trend?.length) return null

  const maxRev = Math.max(...trend.map(t => t.revenue), 1)

  const pts = trend.map((t, i) => ({
    x: +(PAD.left + (i / (trend.length - 1)) * IW).toFixed(1),
    y: +(PAD.top  + IH - (t.revenue / maxRev) * IH).toFixed(1),
    label: t.label,
    revenue: t.revenue,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const bottom   = PAD.top + IH
  const area     = `M ${polyline.replaceAll(' ', ' L ')} L ${pts[pts.length - 1]!.x},${bottom} L ${PAD.left},${bottom} Z`

  const ySteps = [0, 0.25, 0.5, 0.75, 1]
  const yLabels = ySteps.map(pct => ({
    y: (PAD.top + IH - pct * IH).toFixed(1),
    val: formatShort(pct * maxRev),
  }))

  const xLabels = pts.filter((_, i) => i % 2 === 0).map(p => ({ x: p.x.toFixed(1), label: p.label }))

  return { pts, polyline, area, yLabels, xLabels, maxRev }
})

// ── Donut chart ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Active:    '#10b981',
  Trial:     '#3b82f6',
  Expired:   '#ef4444',
  Suspended: '#f59e0b',
  Cancelled: '#94a3b8',
}

const donutData = computed(() => {
  const dist  = data.value?.subscriptionStatusDist ?? []
  const total = dist.reduce((s, d) => s + d.count, 0)
  if (!total) return { segments: [], total: 0 }

  const r     = 62
  const circ  = 2 * Math.PI * r

  let cum = 0
  const segments = dist.map(item => {
    const len = (item.count / total) * circ
    const seg = {
      status:      item.status,
      count:       item.count,
      pct:         Math.round((item.count / total) * 100),
      color:       STATUS_COLORS[item.status] ?? '#94a3b8',
      dasharray:   `${len.toFixed(2)} ${circ.toFixed(2)}`,
      dashoffset:  (-cum).toFixed(2),
    }
    cum += len
    return seg
  })

  return { segments, total }
})

// ── Plan bar chart ─────────────────────────────────────────────────────────
const PLAN_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

const planBars = computed(() => {
  const dist = data.value?.planDistribution ?? []
  const max  = Math.max(...dist.map(p => p.count), 1)
  return dist.map((p, i) => ({
    ...p,
    pct:   Math.round((p.count / max) * 100),
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }))
})

// ── Attention helpers ──────────────────────────────────────────────────────
type IssueStyleDef = { icon: string; iconColor: string; badgeBg: string; badgeText: string }
const issueStyles: Record<string, IssueStyleDef> = {
  expired:  { icon: 'ph-x-circle',        iconColor: 'text-red-500',    badgeBg: 'bg-red-100',    badgeText: 'text-red-700'    },
  suspended:{ icon: 'ph-pause-circle',    iconColor: 'text-amber-500',  badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700'  },
  expiring: { icon: 'ph-clock-countdown', iconColor: 'text-orange-500', badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
}
const fallbackIssueStyle: IssueStyleDef = { icon: 'ph-x-circle', iconColor: 'text-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700' }
const issueStyle = (type: string): IssueStyleDef => issueStyles[type] ?? fallbackIssueStyle

// ── Subscription status badge ──────────────────────────────────────────────
const subStatusBadge = (s: string) => {
  const map: Record<string, string> = {
    Active:    'badge-green',
    Trial:     'badge-blue',
    Expired:   'badge-red',
    Suspended: 'badge-amber',
    Cancelled: 'badge-slate',
    None:      'badge-slate',
  }
  return map[s] ?? 'badge-slate'
}

const tenantStatusBadge = (s: string) => {
  const map: Record<string, string> = {
    Active:    'badge-green',
    Suspended: 'badge-amber',
    Inactive:  'badge-slate',
  }
  return map[s] ?? 'badge-slate'
}
</script>

<template>
  <div class="dash">

    <!-- ══ Welcome Banner ═════════════════════════════════════════════════ -->
    <div class="welcome">
      <div>
        <h1 class="welcome__title">Welcome back, {{ auth.firstName || 'Admin' }}</h1>
        <p class="welcome__date"><i class="ph ph-calendar-blank" /> {{ today }}</p>
      </div>
      <button class="refresh-btn" @click="load">
        <i class="ph ph-arrows-clockwise" /> Refresh
      </button>
    </div>

    <!-- ══ Loading skeletons ══════════════════════════════════════════════ -->
    <template v-if="loading">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="i" class="h-24 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div class="grid-main">
        <div class="skel-panel" style="height:280px" />
        <div class="skel-panel" style="height:280px" />
      </div>
    </template>

    <!-- ══ Error ══════════════════════════════════════════════════════════ -->
    <div v-else-if="error" class="error-bar">
      <i class="ph-fill ph-warning-circle" /> {{ error }}
    </div>

    <template v-else-if="data">

      <!-- ══ Summary Cards (4) ════════════════════════════════════════════ -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="card in summaryCards"
          :key="card.label"
          :class="[
            'bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2',
            card.borderAlert ? 'border-red-200' : 'border-slate-200'
          ]"
        >
          <div class="flex items-center justify-between">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center', card.iconBg, card.iconColor]">
              <i :class="['ph-fill', card.icon, 'text-lg']" />
            </div>
            <span
              v-if="card.pill"
              :class="['text-xs font-semibold', card.pillOk ? 'text-emerald-600' : 'text-red-600']"
            >{{ card.pill }}</span>
          </div>
          <div class="text-xl font-bold text-slate-900 leading-tight">{{ card.value }}</div>
          <div class="text-xs text-slate-500">{{ card.label }}</div>
          <div v-if="card.detail" class="text-[11px] text-slate-400">{{ card.detail }}</div>
        </div>
      </div>

      <!-- ══ Main Section: Revenue Chart + Attention Panel ════════════════ -->
      <div class="grid-main">

        <!-- Revenue Trend Line Chart -->
        <div class="panel panel--chart">
          <div class="panel__header">
            <div>
              <p class="panel__title">Platform Revenue Trend</p>
              <p class="panel__sub">New subscription revenue — last 12 months</p>
            </div>
          </div>

          <div v-if="revenueChart" class="chart-wrap">
            <svg :viewBox="`0 0 ${CW} ${CH}`" width="100%" :height="CH" class="revenue-svg">
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.18" />
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
                </linearGradient>
              </defs>

              <!-- Y-axis grid lines + labels -->
              <g v-for="yl in revenueChart.yLabels" :key="yl.y">
                <line
                  :x1="PAD.left" :y1="yl.y" :x2="CW - PAD.right" :y2="yl.y"
                  stroke="#e2e8f0" stroke-width="1"
                />
                <text :x="PAD.left - 6" :y="+yl.y + 4" text-anchor="end"
                      font-size="11" fill="#94a3b8">{{ yl.val }}</text>
              </g>

              <!-- X-axis labels -->
              <g v-for="xl in revenueChart.xLabels" :key="xl.x">
                <text :x="xl.x" :y="CH - 10" text-anchor="middle"
                      font-size="11" fill="#94a3b8">{{ xl.label }}</text>
              </g>

              <!-- Area fill -->
              <path :d="revenueChart.area" fill="url(#rev-grad)" />

              <!-- Line -->
              <polyline
                :points="revenueChart.polyline"
                fill="none" stroke="#3b82f6" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              />

              <!-- Data point dots -->
              <circle
                v-for="pt in revenueChart.pts" :key="pt.x"
                :cx="pt.x" :cy="pt.y" r="3.5"
                fill="#3b82f6" stroke="#fff" stroke-width="1.5"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div v-else class="chart-empty">
            <i class="ph-fill ph-chart-line-up" />
            <span>No revenue data yet</span>
          </div>
        </div>

        <!-- Tenants Needing Attention -->
        <div class="panel panel--attention">
          <div class="panel__header">
            <div>
              <p class="panel__title">Needs Attention</p>
              <p class="panel__sub">Urgent platform issues</p>
            </div>
            <span v-if="data.attentionItems.length" class="badge-count">
              {{ data.attentionItems.length }}
            </span>
          </div>

          <div v-if="data.attentionItems.length" class="attention-list">
            <div
              v-for="item in data.attentionItems"
              :key="item.subscriptionId"
              class="attention-item"
            >
              <div :class="['attention-item__icon', issueStyle(item.issueType).iconColor]">
                <i :class="['ph-fill', issueStyle(item.issueType).icon]" />
              </div>
              <div class="attention-item__body">
                <p class="attention-item__name">{{ item.tenantName }}</p>
                <p class="attention-item__email">{{ item.email }}</p>
                <span :class="['attention-badge', issueStyle(item.issueType).badgeBg, issueStyle(item.issueType).badgeText]">
                  {{ item.issue }}
                </span>
              </div>
              <button
                class="attention-item__action"
                @click="router.push('/admin/subscriptions')"
              >Manage</button>
            </div>
          </div>

          <div v-else class="all-clear">
            <i class="ph-fill ph-check-circle text-emerald-500" />
            <span>All subscriptions are healthy</span>
          </div>
        </div>
      </div>

      <!-- ══ Second Section: Donut + Bar Chart ════════════════════════════ -->
      <div class="grid-half">

        <!-- Subscription Status Donut -->
        <div class="panel">
          <div class="panel__header">
            <div>
              <p class="panel__title">Subscription Status</p>
              <p class="panel__sub">Distribution across all tenants</p>
            </div>
          </div>

          <div v-if="donutData.total" class="donut-wrap">
            <svg viewBox="0 0 200 200" width="180" height="180" class="donut-svg">
              <!-- Background ring -->
              <circle cx="100" cy="100" r="62" fill="none" stroke="#f1f5f9" stroke-width="22" />
              <!-- Segments -->
              <circle
                v-for="seg in donutData.segments"
                :key="seg.status"
                cx="100" cy="100" r="62"
                fill="none"
                :stroke="seg.color"
                stroke-width="22"
                :stroke-dasharray="seg.dasharray"
                :stroke-dashoffset="seg.dashoffset"
                transform="rotate(-90, 100, 100)"
                stroke-linecap="butt"
              />
              <!-- Center label -->
              <text x="100" y="96" text-anchor="middle" font-size="26" font-weight="700" fill="#0f172a">
                {{ donutData.total }}
              </text>
              <text x="100" y="116" text-anchor="middle" font-size="11" fill="#94a3b8">
                Total Subs
              </text>
            </svg>

            <div class="donut-legend">
              <div v-for="seg in donutData.segments" :key="seg.status" class="donut-legend__item">
                <span class="donut-legend__dot" :style="{ background: seg.color }" />
                <span class="donut-legend__label">{{ seg.status }}</span>
                <span class="donut-legend__count">{{ seg.count }}</span>
                <span class="donut-legend__pct">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>

          <div v-else class="chart-empty">
            <i class="ph-fill ph-chart-pie-slice" />
            <span>No subscription data</span>
          </div>
        </div>

        <!-- Plan Distribution Bar -->
        <div class="panel">
          <div class="panel__header">
            <div>
              <p class="panel__title">Plan Distribution</p>
              <p class="panel__sub">Active subscriptions per plan</p>
            </div>
          </div>

          <div v-if="planBars.length" class="bars-wrap">
            <div v-for="bar in planBars" :key="bar.planName" class="bar-row">
              <div class="bar-label">{{ bar.planName }}</div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: bar.pct + '%', background: bar.color }"
                />
              </div>
              <div class="bar-count">{{ bar.count }}</div>
            </div>
          </div>

          <div v-else class="chart-empty">
            <i class="ph-fill ph-chart-bar" />
            <span>No plan data</span>
          </div>
        </div>
      </div>

      <!-- ══ Bottom Section: Registrations Table + System Usage ════════════ -->
      <div class="grid-bottom">

        <!-- Recent Registrations Table -->
        <div class="panel">
          <div class="panel__header">
            <div>
              <p class="panel__title">Recent Tenant Registrations</p>
              <p class="panel__sub">Last 10 tenant sign-ups</p>
            </div>
            <button class="link-btn" @click="router.push('/admin/tenants')">
              View all <i class="ph ph-arrow-right" />
            </button>
          </div>

          <div class="table-wrap">
            <table class="reg-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Sub Status</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="reg in data.recentRegistrations" :key="reg.tenantId">
                  <td class="reg-name">{{ reg.name }}</td>
                  <td class="reg-email">{{ reg.email }}</td>
                  <td>
                    <span class="plan-chip">{{ reg.planName }}</span>
                  </td>
                  <td>
                    <span :class="['badge', subStatusBadge(reg.subscriptionStatus)]">
                      {{ reg.subscriptionStatus }}
                    </span>
                  </td>
                  <td>
                    <span :class="['badge', tenantStatusBadge(reg.status)]">
                      {{ reg.status }}
                    </span>
                  </td>
                  <td class="reg-date">{{ reg.createdAt }}</td>
                  <td>
                    <button class="tbl-btn" @click="router.push('/admin/tenants')">
                      Manage
                    </button>
                  </td>
                </tr>
                <tr v-if="!data.recentRegistrations.length">
                  <td colspan="7" class="empty-row">No tenant registrations yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- System Usage -->
        <div class="panel">
          <div class="panel__header">
            <div>
              <p class="panel__title">System Usage</p>
              <p class="panel__sub">Platform-wide totals</p>
            </div>
          </div>

          <div class="usage-grid">
            <div class="usage-card">
              <div class="usage-card__icon bg-blue-50 text-blue-600">
                <i class="ph-fill ph-users" />
              </div>
              <p class="usage-card__val">{{ formatNumber(data.systemUsage.totalUsers) }}</p>
              <p class="usage-card__label">Total Users</p>
            </div>
            <div class="usage-card">
              <div class="usage-card__icon bg-violet-50 text-violet-600">
                <i class="ph-fill ph-git-branch" />
              </div>
              <p class="usage-card__val">{{ formatNumber(data.systemUsage.totalBranches) }}</p>
              <p class="usage-card__label">Total Branches</p>
            </div>
            <div class="usage-card">
              <div class="usage-card__icon bg-emerald-50 text-emerald-600">
                <i class="ph-fill ph-package" />
              </div>
              <p class="usage-card__val">{{ formatNumber(data.systemUsage.totalProducts) }}</p>
              <p class="usage-card__label">Total Products</p>
            </div>
            <div class="usage-card">
              <div class="usage-card__icon bg-amber-50 text-amber-600">
                <i class="ph-fill ph-receipt" />
              </div>
              <p class="usage-card__val">{{ formatNumber(data.systemUsage.totalTransactions) }}</p>
              <p class="usage-card__label">Transactions</p>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
/* ── Shell ─────────────────────────────────────────────────────────────── */
.dash {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1360px;
  margin: 0 auto;
  width: 100%;
}

/* ── Welcome Banner ────────────────────────────────────────────────────── */
.welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.welcome__title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}
.welcome__date {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1d4ed8;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
  transition: all .15s;
}
.refresh-btn:hover { background: #dbeafe; }


/* ── Grid layouts ──────────────────────────────────────────────────────── */
.grid-main {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  align-items: start;
}
.grid-half {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.grid-bottom {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1100px) {
  .grid-main, .grid-half, .grid-bottom {
    grid-template-columns: 1fr;
  }
}

/* ── Panel base ────────────────────────────────────────────────────────── */
.panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  overflow: hidden;
}
.panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 0;
  gap: 12px;
}
.panel__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.panel__sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

/* ── Revenue chart panel ───────────────────────────────────────────────── */
.chart-wrap {
  padding: 16px 8px 12px;
  overflow-x: auto;
}
.revenue-svg { display: block; overflow: visible; }
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  color: #94a3b8;
  font-size: 13px;
}
.chart-empty i { font-size: 32px; }

/* ── Attention panel ───────────────────────────────────────────────────── */
.badge-count {
  flex-shrink: 0;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}
.attention-list {
  padding: 12px 0 8px;
  display: flex;
  flex-direction: column;
}
.attention-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 22px;
  border-bottom: 1px solid #f1f5f9;
  transition: background .1s;
}
.attention-item:last-child { border-bottom: none; }
.attention-item:hover { background: #f8fafc; }
.attention-item__icon {
  flex-shrink: 0;
  font-size: 20px;
  padding-top: 2px;
}
.attention-item__body { flex: 1; min-width: 0; }
.attention-item__name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.attention-item__email {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.attention-badge {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  margin-top: 4px;
}
.attention-item__action {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #1d4ed8;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: background .1s;
  align-self: center;
}
.attention-item__action:hover { background: #dbeafe; }
.all-clear {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 28px 22px;
  font-size: 13px;
  color: #64748b;
}
.all-clear i { font-size: 22px; }

/* ── Donut chart ───────────────────────────────────────────────────────── */
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 22px 24px;
  flex-wrap: wrap;
}
.donut-svg { flex-shrink: 0; }
.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 140px;
}
.donut-legend__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}
.donut-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.donut-legend__label { flex: 1; color: #334155; font-weight: 500; }
.donut-legend__count { color: #0f172a; font-weight: 700; }
.donut-legend__pct   { color: #94a3b8; font-size: 11px; min-width: 32px; text-align: right; }

/* ── Bar chart ─────────────────────────────────────────────────────────── */
.bars-wrap {
  padding: 20px 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-label {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  width: 120px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-track {
  flex: 1;
  height: 10px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width .4s ease;
}
.bar-count {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  width: 24px;
  text-align: right;
  flex-shrink: 0;
}

/* ── Registrations table ───────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.reg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.reg-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: .06em;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.reg-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.reg-table tbody tr:hover td { background: #f8fafc; }
.reg-table tbody tr:last-child td { border-bottom: none; }
.reg-name  { font-weight: 700; color: #0f172a; white-space: nowrap; }
.reg-email { color: #64748b; white-space: nowrap; }
.reg-date  { color: #94a3b8; white-space: nowrap; font-size: 12px; }
.empty-row { text-align: center; color: #94a3b8; padding: 32px !important; }
.plan-chip {
  display: inline-block;
  background: #f1f5f9;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.link-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
}
.link-btn:hover { text-decoration: underline; }
.tbl-btn {
  font-size: 11.5px;
  font-weight: 600;
  color: #1d4ed8;
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  white-space: nowrap;
}
.tbl-btn:hover { background: #dbeafe; }

/* ── System Usage Grid ─────────────────────────────────────────────────── */
.usage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 20px 22px 24px;
}
.usage-card {
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  text-align: center;
}
.usage-card__icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  margin: 0 auto 10px;
}
.usage-card__val {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}
.usage-card__label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 3px;
}

/* ── Shared Badges ─────────────────────────────────────────────────────── */
.badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.badge-green  { background: #dcfce7; color: #15803d; }
.badge-blue   { background: #dbeafe; color: #1d4ed8; }
.badge-amber  { background: #fef3c7; color: #b45309; }
.badge-red    { background: #fee2e2; color: #b91c1c; }
.badge-slate  { background: #f1f5f9; color: #475569; }

/* ── Skeleton ──────────────────────────────────────────────────────────── */
.skel-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  animation: pulse .9s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .55; }
}

/* ── Error ─────────────────────────────────────────────────────────────── */
.error-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #fca5a5;
  border-radius: 12px;
  padding: 16px 20px;
  color: #b91c1c;
  font-size: 13.5px;
}
</style>
