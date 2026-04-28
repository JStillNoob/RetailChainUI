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
      <Transition name="ps-modal">
        <div v-if="showForm" class="ps-modal-backdrop" @click.self="showForm = false">
          <div class="ps-modal-card" style="max-width: 520px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Send Platform Announcement</h3>
              <button class="ps-modal-close" @click="showForm = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div>
                <label class="ps-label">Type</label>
                <select v-model="form.type" class="ps-input">
                  <option>Announcement</option><option>Maintenance</option><option>Update</option><option>Alert</option>
                </select>
              </div>
              <div>
                <label class="ps-label">Message</label>
                <textarea v-model="form.message" rows="4" placeholder="Write your announcement here…" class="ps-input"></textarea>
              </div>
              <div v-if="sent" class="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                <i class="ph-fill ph-check-circle"></i> Sent successfully!
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showForm = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="sending" @click="broadcast">
                <i :class="sending ? 'ph ph-spinner animate-spin' : 'ph ph-paper-plane-tilt'"></i>
                {{ sending ? 'Sending…' : 'Broadcast' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
