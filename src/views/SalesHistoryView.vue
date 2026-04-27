<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'SalesHistoryView' })

const { toast } = useToast()

const sales      = ref<any[]>([])
const total      = ref(0)
const page       = ref(1)
const pageSize   = ref(10)
const loading    = ref(true)
const dateFilter = ref(new Date().toISOString().slice(0, 10))

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value }
    if (dateFilter.value) params.date = dateFilter.value
    const res = await api.get('/cashier/sales', { params }).then(r => r.data)
    sales.value = res.items ?? []
    total.value = res.total ?? 0
  } catch { toast('Failed to load sales history.', 'error') }
  finally { loading.value = false }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) { page.value = p; load() } }
onMounted(load)

const showDetail = ref(false)
const detail     = ref<any>(null)
const detLoading = ref(false)

async function viewDetail(id: number) {
  showDetail.value = true; detLoading.value = true
  try { detail.value = await api.get(`/cashier/sales/${id}`).then(r => r.data) }
  catch { toast('Failed to load transaction.', 'error') }
  finally { detLoading.value = false }
}

const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)

const fmtDateTime = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const todayTotal = computed(() => sales.value.reduce((s, t) => s + Number(t.totalAmount), 0))
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Sales History</h1>
        <p class="ps-page-sub">Your transaction records and revenue snapshot.</p>
      </div>
    </div>

    <!-- KPI summary -->
    <div v-if="sales.length > 0" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-500">
            <i class="ph-fill ph-receipt text-lg"></i>
          </div>
          <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            <i class="ph ph-arrow-up text-[10px]"></i> Active
          </span>
        </div>
        <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ total.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1.5">{{ dateFilter ? 'Transactions Today' : 'Total Transactions' }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500">
            <i class="ph-fill ph-currency-circle-dollar text-lg"></i>
          </div>
          <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            <i class="ph ph-trend-up text-[10px]"></i>
          </span>
        </div>
        <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ phpFmt(todayTotal) }}</p>
        <p class="text-xs text-slate-500 mt-1.5">{{ dateFilter ? "Today's Revenue (page)" : 'Revenue (page)' }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50 text-purple-500">
            <i class="ph-fill ph-cash-register text-lg"></i>
          </div>
        </div>
        <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ phpFmt(sales.length ? todayTotal / sales.length : 0) }}</p>
        <p class="text-xs text-slate-500 mt-1.5">Avg. Transaction</p>
      </div>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Transactions</div>
          <div class="ps-table-subtitle">{{ total.toLocaleString() }} record{{ total !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <input v-model="dateFilter" type="date" @change="page = 1; load()" class="ps-pg-size" style="padding: 9px 12px;" />
          <button @click="dateFilter = ''; page = 1; load()" class="ps-btn ps-btn-outline">All Dates</button>
          <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
            <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
          </button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="sales.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-receipt text-5xl text-slate-200"></i>
        <p class="text-sm">No transactions found.</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>TX #</th>
            <th>Date &amp; Time</th>
            <th>Items</th>
            <th>Total</th>
            <th>Tendered</th>
            <th>Change</th>
            <th>Payment</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in sales" :key="t.transactionId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="font-semibold text-slate-800">#{{ t.transactionId }}</td>
            <td class="text-slate-500">{{ fmtDateTime(t.transactionDate) }}</td>
            <td><span class="ps-tag ps-tag-slate">{{ t.itemCount }}</span></td>
            <td class="font-bold text-slate-800">{{ phpFmt(t.totalAmount) }}</td>
            <td class="text-slate-500">{{ phpFmt(t.amountTendered) }}</td>
            <td class="text-slate-500">{{ phpFmt(t.changeAmount) }}</td>
            <td><span class="ps-tag ps-tag-blue">{{ t.paymentMethod ?? 'Cash' }}</span></td>
            <td>
              <button @click="viewDetail(t.transactionId)"
                class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="View">
                <i class="ph ph-eye"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && sales.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in totalPages" :key="p" :class="['ps-pg-btn', p === page && 'ps-pg-btn--active']" @click="goTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Page {{ page }} of {{ totalPages }} · {{ total.toLocaleString() }} total</span>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetail" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showDetail = false">
        <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Transaction #{{ detail?.transactionId }}</h3>
            <button @click="showDetail = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <div v-if="detLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400">
              <i class="ph ph-spinner animate-spin text-xl text-blue-500"></i> Loading…
            </div>
            <template v-else-if="detail">
              <div class="flex flex-wrap gap-4 text-sm mb-5">
                <span><strong class="text-slate-700">Date:</strong> <span class="text-slate-500">{{ fmtDateTime(detail.transactionDate) }}</span></span>
                <span><strong class="text-slate-700">Payment:</strong> <span class="text-slate-500">{{ detail.paymentMethod ?? 'Cash' }}</span></span>
              </div>
              <table class="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Qty</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Unit Price</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in detail.items" :key="item.itemId" class="border-t border-slate-100">
                    <td class="px-3 py-2 text-slate-700">{{ item.productName }}</td>
                    <td class="px-3 py-2 text-right text-slate-600">{{ Number(item.quantity).toLocaleString() }}</td>
                    <td class="px-3 py-2 text-right text-slate-500">{{ phpFmt(item.unitPrice) }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-slate-800">{{ phpFmt(item.subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="border-t border-dashed border-slate-200 mt-4 pt-4 flex flex-col gap-2">
                <div class="flex justify-between text-sm text-slate-600"><span>Total</span><strong class="text-slate-900">{{ phpFmt(detail.totalAmount) }}</strong></div>
                <div class="flex justify-between text-sm text-slate-500"><span>Tendered</span><span>{{ phpFmt(detail.amountTendered) }}</span></div>
                <div class="flex justify-between text-[15px] font-bold text-green-600"><span>Change</span><span>{{ phpFmt(detail.changeAmount) }}</span></div>
              </div>
            </template>
          </div>
          <div class="flex justify-end px-6 pb-6">
            <button @click="showDetail = false" class="ps-btn ps-btn-outline">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
