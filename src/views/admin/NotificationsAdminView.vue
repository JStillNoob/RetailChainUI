<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getNotifications, broadcastNotification } from '../../services/superadmin.ts'

defineOptions({ name: 'NotificationsAdminView' })

const notifications = ref<any[]>([])
const total         = ref(0)
const loading       = ref(true)
const sending       = ref(false)
const sent          = ref(false)
const showForm      = ref(false)
const form          = ref({ type: 'Announcement', message: '' })

async function load() {
  loading.value = true
  try { const d = await getNotifications(); notifications.value = d.items; total.value = d.total }
  finally { loading.value = false }
}
onMounted(load)

async function broadcast() {
  if (!form.value.message.trim()) return
  sending.value = true
  try {
    await broadcastNotification(form.value.type, form.value.message)
    sent.value = true; form.value.message = ''
    setTimeout(() => sent.value = false, 3000)
    await load()
  } finally { sending.value = false }
}

const typeTag = (t: string) => ({
  Announcement: 'ps-tag ps-tag-blue',
  Maintenance:  'ps-tag ps-tag-amber',
  Update:       'ps-tag ps-tag-purple',
  Alert:        'ps-tag ps-tag-red',
}[t] ?? 'ps-tag ps-tag-slate')
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">System Notifications</h1>
        <p class="ps-page-sub">Broadcast announcements to every tenant.</p>
      </div>
      <button class="ps-btn ps-btn-primary" @click="showForm = true">
        <i class="ph ph-plus"></i> New Message
      </button>
    </div>

    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Notification History</div>
          <div class="ps-table-subtitle">{{ total.toLocaleString() }} message{{ total !== 1 ? 's' : '' }}</div>
        </div>
        <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Message</th>
            <th>Sent To</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in notifications" :key="n.notificationId">
            <td><span :class="typeTag(n.type)">{{ n.type }}</span></td>
            <td class="text-slate-700 max-w-[320px] truncate">{{ n.message }}</td>
            <td class="text-slate-500">{{ n.userEmail }}</td>
            <td><span :class="['ps-tag', n.isRead ? 'ps-tag-green' : 'ps-tag-slate']">{{ n.isRead ? 'Read' : 'Unread' }}</span></td>
            <td class="text-slate-500 text-xs">{{ new Date(n.createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Broadcast Modal -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showForm = false">
        <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Send Platform Announcement</h3>
            <button @click="showForm = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Type</label>
                <select v-model="form.type" class="ps-input">
                  <option>Announcement</option><option>Maintenance</option><option>Update</option><option>Alert</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Message</label>
                <textarea v-model="form.message" rows="4" placeholder="Write your announcement here…" class="ps-input" style="font-family: inherit;"></textarea>
              </div>
              <div v-if="sent" class="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <i class="ph-fill ph-check-circle"></i> Sent successfully!
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2.5 px-6 pb-6">
            <button @click="showForm = false" class="ps-btn ps-btn-outline">Cancel</button>
            <button @click="broadcast" :disabled="sending" class="ps-btn ps-btn-primary">
              <i :class="sending ? 'ph ph-spinner animate-spin' : 'ph ph-paper-plane-tilt'"></i>
              {{ sending ? 'Sending…' : 'Broadcast' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
