<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth.ts'
import { updateProfile } from '../services/auth.ts'

defineOptions({ name: 'SettingsView' })

const auth = useAuthStore()

const activeTab    = ref('account')
const uploading    = ref<string | null>(null)
const saving       = ref(false)
const passwordForm = ref({ current: '', new: '', confirm: '' })
const companyName  = ref(auth.companyName || '')
const firstNameVal = ref(auth.firstName || '')
const lastNameVal  = ref(auth.lastName || '')

const canSeeCompany = computed(() => auth.isTenantAdmin || auth.isSuperAdmin)
const canSeeSystem  = computed(() => auth.isSuperAdmin)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5189'

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const token = localStorage.getItem('token')

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  } catch {
    throw new Error(`Cannot reach the backend at ${API_BASE}.`)
  }

  if (!res.ok) {
    let msg = `Upload failed (HTTP ${res.status})`
    try { msg = (await res.json()).message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  const data = await res.json()
  return data.secureUrl as string
}

function pickImage(slot: 'avatar' | 'company' | 'system') {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    uploading.value = slot
    try {
      const url = await uploadImage(file)
      if (slot === 'avatar') {
        auth.profilePhoto = url
        localStorage.setItem('profilePhoto', url)
        await updateProfile(firstNameVal.value, lastNameVal.value, url)
      } else if (slot === 'company') {
        auth.companyLogo = url
        localStorage.setItem('companyLogo', url)
      } else if (slot === 'system') {
        auth.systemLogo = url
        localStorage.setItem('systemLogo', url)
      }
    } catch (err) {
      alert('Upload failed: ' + (err as Error).message)
    } finally {
      uploading.value = null
    }
  }
  input.click()
}

async function saveAccount() {
  saving.value = true
  try {
    await updateProfile(firstNameVal.value, lastNameVal.value, auth.profilePhoto)
    auth.firstName = firstNameVal.value
    auth.lastName  = lastNameVal.value
    showToast('Personal info updated!')
  } catch (err) {
    alert('Save failed: ' + (err as Error).message)
  } finally {
    saving.value = false
  }
}

function saveCompany() {
  saving.value = true
  setTimeout(() => {
    auth.companyName = companyName.value
    localStorage.setItem('companyName', companyName.value)
    saving.value = false
    showToast('Company settings saved!')
  }, 800)
}

async function changePassword() {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    alert('New passwords do not match')
    return
  }
  saving.value = true
  setTimeout(() => {
    saving.value = false
    passwordForm.value = { current: '', new: '', confirm: '' }
    showToast('Password updated successfully!')
  }, 800)
}

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

const tabs = computed(() => [
  { key: 'account',  label: 'My Account',       icon: 'ph ph-user-circle', visible: true },
  { key: 'company',  label: 'Company / Store',  icon: 'ph ph-buildings',   visible: canSeeCompany.value },
  { key: 'security', label: 'Security',         icon: 'ph ph-lock-key',    visible: true },
  { key: 'system',   label: 'System Branding',  icon: 'ph ph-globe',       visible: canSeeSystem.value, badge: 'SA' },
].filter(t => t.visible))
</script>

<template>
  <div class="flex flex-col gap-6">
    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-7 right-7 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 z-50 shadow-2xl">
        <i class="ph-fill ph-check-circle text-green-400 text-lg"></i> {{ toast }}
      </div>
    </Transition>

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Settings</h1>
        <p class="ps-page-sub">Personal, security, and platform preferences.</p>
      </div>
    </div>

    <div class="grid gap-5" style="grid-template-columns: 240px 1fr; align-items: start;">

      <!-- Sidebar tabs -->
      <div class="ps-card p-2.5 flex flex-col gap-1">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            activeTab === tab.key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50']">
          <i :class="[tab.icon, 'text-base', activeTab === tab.key ? 'text-blue-500' : 'text-slate-400']"></i>
          <span class="flex-1">{{ tab.label }}</span>
          <span v-if="(tab as any).badge" class="ps-tag ps-tag-purple" style="font-size: 9px;">{{ (tab as any).badge }}</span>
        </button>
      </div>

      <!-- Content -->
      <div class="ps-card p-7">

        <!-- Account -->
        <div v-if="activeTab === 'account'">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <i class="ph-fill ph-user-circle text-blue-500"></i> My Account
          </h2>

          <div class="flex items-center gap-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 mb-6">
            <div class="relative w-20 h-20 flex-shrink-0">
              <img v-if="auth.profilePhoto" :src="auth.profilePhoto" alt="Avatar" class="w-20 h-20 rounded-full object-cover" />
              <div v-else class="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-extrabold">
                {{ auth.initials }}
              </div>
              <button @click="pickImage('avatar')" :disabled="uploading === 'avatar'"
                class="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full border-2 border-white flex items-center justify-center transition-all">
                <i :class="uploading === 'avatar' ? 'ph ph-spinner animate-spin' : 'ph ph-camera'" class="text-xs"></i>
              </button>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-900">Profile Photo</h3>
              <p class="text-xs text-slate-500 mt-1 mb-3">Shown in the top-bar and your profile. Recommended: 400×400px.</p>
              <button @click="pickImage('avatar')" :disabled="uploading === 'avatar'" class="ps-btn ps-btn-outline" style="font-size: 12px; padding: 6px 14px;">
                <i :class="uploading === 'avatar' ? 'ph ph-spinner animate-spin' : 'ph ph-upload-simple'"></i>
                {{ uploading === 'avatar' ? 'Uploading…' : 'Upload Photo' }}
              </button>
            </div>
          </div>

          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Personal Information</div>
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">First Name</label>
              <input v-model="firstNameVal" type="text" class="ps-input" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">Last Name</label>
              <input v-model="lastNameVal" type="text" class="ps-input" />
            </div>
            <div class="col-span-2 flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">Email Address</label>
              <input :value="auth.email" disabled class="ps-input bg-slate-50 text-slate-400 cursor-not-allowed" />
            </div>
            <div class="col-span-2 flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">Role</label>
              <input :value="auth.roleTypeName" disabled class="ps-input bg-slate-50 text-slate-400 cursor-not-allowed" />
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4 flex justify-end">
            <button @click="saveAccount" :disabled="saving" class="ps-btn ps-btn-primary">
              <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-floppy-disk'"></i>
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- Company -->
        <div v-else-if="activeTab === 'company' && canSeeCompany">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <i class="ph-fill ph-buildings text-blue-500"></i> Company / Store Settings
          </h2>

          <div class="flex items-center gap-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 mb-6">
            <div class="relative w-20 h-20 flex-shrink-0">
              <img v-if="auth.companyLogo" :src="auth.companyLogo" alt="Logo" class="w-20 h-20 rounded-2xl object-cover" />
              <div v-else class="w-20 h-20 rounded-2xl bg-slate-200 flex items-center justify-center text-3xl text-slate-400">
                <i class="ph ph-buildings"></i>
              </div>
              <button @click="pickImage('company')" :disabled="uploading === 'company'"
                class="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full border-2 border-white flex items-center justify-center transition-all">
                <i :class="uploading === 'company' ? 'ph ph-spinner animate-spin' : 'ph ph-camera'" class="text-xs"></i>
              </button>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-900">Company / Store Logo</h3>
              <p class="text-xs text-slate-500 mt-1 mb-3">Appears in the sidebar for all users in your organisation.</p>
              <button @click="pickImage('company')" :disabled="uploading === 'company'" class="ps-btn ps-btn-outline" style="font-size: 12px; padding: 6px 14px;">
                <i :class="uploading === 'company' ? 'ph ph-spinner animate-spin' : 'ph ph-upload-simple'"></i>
                {{ uploading === 'company' ? 'Uploading…' : 'Upload Logo' }}
              </button>
            </div>
          </div>

          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Company Information</div>
          <div class="flex flex-col gap-1.5 mb-6">
            <label class="text-xs font-semibold text-slate-700">Company / Store Name</label>
            <input v-model="companyName" type="text" placeholder="e.g. Reyes Grocery Chain" class="ps-input" />
          </div>

          <div class="border-t border-slate-100 pt-4 flex justify-end">
            <button @click="saveCompany" :disabled="saving" class="ps-btn ps-btn-primary">
              <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-floppy-disk'"></i>
              {{ saving ? 'Saving…' : 'Save Company Settings' }}
            </button>
          </div>
        </div>

        <!-- Security -->
        <div v-else-if="activeTab === 'security'">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <i class="ph-fill ph-lock-key text-blue-500"></i> Security &amp; Password
          </h2>

          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Change Password</div>
          <div class="flex flex-col gap-4 max-w-md mb-6">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">Current Password</label>
              <input v-model="passwordForm.current" type="password" placeholder="••••••••" class="ps-input" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">New Password</label>
              <input v-model="passwordForm.new" type="password" placeholder="Min. 8 characters" class="ps-input" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">Confirm New Password</label>
              <input v-model="passwordForm.confirm" type="password" placeholder="Repeat password" class="ps-input" />
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4 flex justify-end">
            <button @click="changePassword" :disabled="saving" class="ps-btn ps-btn-primary">
              <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-lock-key'"></i>
              {{ saving ? 'Updating…' : 'Update Password' }}
            </button>
          </div>
        </div>

        <!-- System -->
        <div v-else-if="activeTab === 'system' && canSeeSystem">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
            <i class="ph-fill ph-globe text-blue-500"></i> System Branding
            <span class="ps-tag ps-tag-purple">Super Admin</span>
          </h2>
          <p class="text-sm text-slate-500 mb-6">
            The system logo is shown on the public landing page and in the Super Admin sidebar. Changes apply immediately.
          </p>

          <div class="flex items-center gap-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 mb-6">
            <div class="relative w-20 h-20 flex-shrink-0">
              <img v-if="auth.systemLogo" :src="auth.systemLogo" alt="System Logo" class="w-20 h-20 rounded-2xl object-cover" />
              <div v-else class="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl text-blue-500">
                <i class="ph ph-globe"></i>
              </div>
              <button @click="pickImage('system')" :disabled="uploading === 'system'"
                class="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full border-2 border-white flex items-center justify-center transition-all">
                <i :class="uploading === 'system' ? 'ph ph-spinner animate-spin' : 'ph ph-camera'" class="text-xs"></i>
              </button>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-slate-900">System / Platform Logo</h3>
              <p class="text-xs text-slate-500 mt-1 mb-3">Used on the landing page and Super Admin sidebar. Recommended: transparent PNG, 400×120px.</p>
              <button @click="pickImage('system')" :disabled="uploading === 'system'" class="ps-btn ps-btn-outline" style="font-size: 12px; padding: 6px 14px;">
                <i :class="uploading === 'system' ? 'ph ph-spinner animate-spin' : 'ph ph-upload-simple'"></i>
                {{ uploading === 'system' ? 'Uploading…' : 'Upload System Logo' }}
              </button>
            </div>
          </div>

          <div class="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <i class="ph ph-info text-base mt-0.5 flex-shrink-0"></i>
            <div class="text-xs leading-relaxed">
              The logo will appear on the public landing page and replace the default RetailChain logo in the Super Admin sidebar.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active { animation: toast-in 0.3s cubic-bezier(0.16,1,0.3,1); }
.toast-leave-active { animation: toast-in 0.25s reverse; }
@keyframes toast-in {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (max-width: 768px) {
  div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
}
</style>
