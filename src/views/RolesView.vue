<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'RolesView' })

const { toast } = useToast()

const roles   = ref<any[]>([])
const loading = ref(true)

async function loadRoles() {
  loading.value = true
  try { roles.value = await api.get('/tenant/roles').then(r => r.data) }
  catch { toast('Failed to load roles.', 'error') }
  finally { loading.value = false }
}
onMounted(loadRoles)

const showAdd   = ref(false)
const addName   = ref('')
const addErr    = ref('')
const addSaving = ref(false)

async function createRole() {
  addErr.value = ''
  if (!addName.value.trim()) { addErr.value = 'Role name is required.'; return }
  addSaving.value = true
  try {
    await api.post('/tenant/roles', { roleName: addName.value.trim() })
    toast('Role created.'); showAdd.value = false; addName.value = ''
    await loadRoles()
  } catch (e: any) {
    addErr.value = e.response?.data?.message ?? 'Failed to create role.'
  } finally { addSaving.value = false }
}

async function deleteRole(r: any) {
  if (!confirm(`Delete role "${r.roleName}"?`)) return
  try { await api.delete(`/tenant/roles/${r.roleId}`); toast('Role deleted.'); await loadRoles() }
  catch (e: any) { toast(e.response?.data?.message ?? 'Failed to delete role.', 'error') }
}

const activeRole  = ref<any>(null)
const permissions = ref<any[]>([])
const permLoading = ref(false)
const permSaving  = ref(false)

const MODULES = ['Products', 'Inventory', 'Suppliers', 'PurchaseOrders', 'Deliveries', 'Sales', 'Users', 'Reports', 'Audit']

async function openPermissions(r: any) {
  activeRole.value = r; permLoading.value = true
  try {
    const data: any[] = await api.get(`/tenant/roles/${r.roleId}/permissions`).then(res => res.data)
    permissions.value = MODULES.map(mod => {
      const existing = data.find(p => p.module === mod)
      return { module: mod, canView: existing?.canView ?? false, canEdit: existing?.canEdit ?? false, canDelete: existing?.canDelete ?? false }
    })
  } catch { toast('Failed to load permissions.', 'error') }
  finally { permLoading.value = false }
}

async function savePermissions() {
  if (!activeRole.value) return
  permSaving.value = true
  try { await api.put(`/tenant/roles/${activeRole.value.roleId}/permissions`, permissions.value); toast('Permissions saved.') }
  catch { toast('Failed to save permissions.', 'error') }
  finally { permSaving.value = false }
}

function onEditCheck(p: any, field: 'canEdit' | 'canDelete') {
  if (p[field]) p.canView = true
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Roles &amp; Permissions</h1>
        <p class="ps-page-sub">Define what each staff role can access.</p>
      </div>
      <button @click="showAdd = true; addName = ''; addErr = ''" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> New Role
      </button>
    </div>

    <!-- Two-column layout -->
    <div class="grid gap-5" style="grid-template-columns: 320px 1fr; align-items: start;">

      <!-- Roles list -->
      <div class="ps-card">
        <div class="px-5 pt-5 pb-3 border-b border-slate-100">
          <h2 class="text-sm font-bold text-slate-700">Roles</h2>
        </div>
        <div class="p-3">
          <div v-if="loading" class="space-y-2">
            <div v-for="i in 4" :key="i" class="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
          <div v-else-if="roles.length === 0" class="flex flex-col items-center gap-2 py-10 text-slate-400">
            <i class="ph-fill ph-shield-check text-4xl text-slate-200"></i>
            <p class="text-xs">No roles yet.</p>
          </div>
          <div v-else class="flex flex-col gap-1">
            <div
              v-for="r in roles" :key="r.roleId"
              @click="openPermissions(r)"
              :class="['flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all border',
                activeRole?.roleId === r.roleId ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50']">
              <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <i class="ph-fill ph-shield-check text-indigo-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-slate-800 truncate">{{ r.roleName }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ r.roleType ?? 'Custom' }} · {{ r.permissionCount ?? 0 }} perms</div>
              </div>
              <button @click.stop="deleteRole(r)"
                class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                <i class="ph ph-trash text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions panel -->
      <div v-if="activeRole" class="ps-card overflow-hidden">
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">{{ activeRole.roleName }} — Permissions</div>
            <div class="ps-table-subtitle">{{ permissions.length }} module{{ permissions.length !== 1 ? 's' : '' }}</div>
          </div>
          <button @click="savePermissions" :disabled="permSaving" class="ps-btn ps-btn-primary">
            <i v-if="permSaving" class="ph ph-spinner animate-spin"></i>
            <i v-else class="ph ph-floppy-disk"></i>
            Save
          </button>
        </div>
        <div class="p-3">
          <div v-if="permLoading" class="space-y-2">
            <div v-for="i in 6" :key="i" class="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
          <table v-else class="ps-table">
            <thead>
              <tr>
                <th>Module</th>
                <th class="text-center" style="width: 80px">View</th>
                <th class="text-center" style="width: 80px">Edit</th>
                <th class="text-center" style="width: 80px">Delete</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in permissions" :key="p.module">
                <td class="font-medium text-slate-700">{{ p.module }}</td>
                <td class="text-center">
                  <input type="checkbox" v-model="p.canView" class="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
                </td>
                <td class="text-center">
                  <input type="checkbox" v-model="p.canEdit" @change="onEditCheck(p, 'canEdit')" class="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
                </td>
                <td class="text-center">
                  <input type="checkbox" v-model="p.canDelete" @change="onEditCheck(p, 'canDelete')" class="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="ps-card flex flex-col items-center justify-center gap-3 h-48 text-slate-400">
        <i class="ph ph-shield-check text-4xl text-slate-200"></i>
        <p class="text-sm">Select a role to manage its permissions.</p>
      </div>
    </div>

    <!-- Add Role Modal -->
    <Teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showAdd = false">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">New Role</h3>
            <button @click="showAdd = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-slate-700">Role Name *</label>
              <input v-model="addName" placeholder="e.g. Store Manager" @keyup.enter="createRole" class="ps-input" />
            </div>
            <div v-if="addErr" class="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {{ addErr }}
            </div>
          </div>
          <div class="flex justify-end gap-2.5 px-6 pb-6">
            <button @click="showAdd = false" class="ps-btn ps-btn-outline">Cancel</button>
            <button @click="createRole" :disabled="addSaving" class="ps-btn ps-btn-primary">
              <i v-if="addSaving" class="ph ph-spinner animate-spin"></i>
              {{ addSaving ? 'Creating…' : 'Create Role' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
}
</style>
