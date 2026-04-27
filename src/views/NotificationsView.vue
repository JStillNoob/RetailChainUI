<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'NotificationsView' })

const { toast }  = useToast()
const notifs     = ref<any[]>([])
const loading    = ref(true)
const markingAll = ref(false)
const typeFilter = ref('All')

const typeOpts = ['All', 'LowStockForecast', 'System', 'Info']

async function load() {
  loading.value = true
  try { notifs.value = await api.get('/tenant/notifications').then(r => r.data) }
  catch { toast('Failed to load notifications.', 'error') }
  finally { loading.value = false }
}
onMounted(load)

const filtered    = computed(() => typeFilter.value === 'All' ? notifs.value : notifs.value.filter(n => n.type === typeFilter.value))
const unreadCount = computed(() => notifs.value.filter(n => !n.isRead).length)

async function markRead(n: any) {
  if (n.isRead) return
  try { await api.put(`/tenant/notifications/${n.notificationId}/read`); n.isRead = true }
  catch { toast('Failed to mark as read.', 'error') }
}

async function markAllRead() {
  if (!unreadCount.value) return
  markingAll.value = true
  try {
    await api.put('/tenant/notifications/read-all')
    notifs.value.forEach(n => n.isRead = true)
    toast('All notifications marked as read.')
  } catch { toast('Failed to mark all as read.', 'error') }
  finally { markingAll.value = false }
}

const typeIcon = (type: string) => ({
  LowStockForecast: 'ph-warning-circle',
  System:           'ph-gear',
  Info:             'ph-info',
}[type] ?? 'ph-bell')

const typeBg = (type: string) => ({
  LowStockForecast: 'bg-red-50 text-red-500',
  System:           'bg-indigo-50 text-indigo-500',
  Info:             'bg-blue-50 text-blue-500',
}[type] ?? 'bg-slate-100 text-slate-400')

const typeTag = (type: string) => ({
  LowStockForecast: 'ps-tag ps-tag-red',
  System:           'ps-tag ps-tag-purple',
  Info:             'ps-tag ps-tag-blue',
}[type] ?? 'ps-tag ps-tag-slate')

const fmtDate = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Notifications</h1>
        <p class="ps-page-sub">
          {{ unreadCount ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
          <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <button v-if="unreadCount" @click="markAllRead" :disabled="markingAll" class="ps-btn ps-btn-primary">
          <i v-if="markingAll" class="ph ph-spinner animate-spin"></i>
          <i v-else class="ph ph-check"></i>
          Mark All Read
        </button>
      </div>
    </div>

    <!-- Inbox card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Inbox</div>
          <div class="ps-table-subtitle">{{ filtered.length }} of {{ notifs.length }}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="opt in typeOpts" :key="opt" @click="typeFilter = opt"
            :class="['inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
              typeFilter === opt ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']">
            {{ opt }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-slate-400">
        <i class="ph ph-spinner animate-spin text-xl text-blue-500"></i>
        <span class="text-sm">Loading…</span>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-bell text-5xl text-slate-200"></i>
        <p class="text-sm">{{ typeFilter !== 'All' ? 'No notifications of this type.' : 'No notifications yet.' }}</p>
      </div>
      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="n in filtered"
          :key="n.notificationId"
          @click="markRead(n)"
          :class="['flex items-start gap-3.5 px-6 py-4 cursor-pointer transition-colors duration-100 hover:bg-slate-50',
            !n.isRead ? 'bg-blue-50/40' : '']">
          <div :class="['w-9 h-9 rounded-xl flex items-center justify-center text-[17px] flex-shrink-0', typeBg(n.type)]">
            <i :class="'ph-fill ' + typeIcon(n.type)"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div :class="['text-sm text-slate-800 leading-snug', !n.isRead ? 'font-semibold' : '']">{{ n.message }}</div>
            <div class="flex items-center gap-2 mt-1.5">
              <span :class="typeTag(n.type)">{{ n.type }}</span>
              <span class="text-xs text-slate-400">{{ fmtDate(n.createdAt) }}</span>
            </div>
          </div>
          <div v-if="!n.isRead" class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
        </div>
      </div>
    </div>
  </div>
</template>
