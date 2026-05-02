<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getStoreTypes, createStoreType, deleteStoreType, archiveStoreType,
  getStoreTypeTemplates, createTemplate, deleteTemplate,
} from '../../services/superadmin.ts'

defineOptions({ name: 'StoreTypesView' })

const types      = ref<any[]>([])
const loading    = ref(true)
const showCreate = ref(false)
const form       = ref({ typeName: '', description: '' })

async function load() {
  loading.value = true
  try { types.value = await getStoreTypes(true) }
  finally { loading.value = false }
}
onMounted(load)

async function submit() {
  if (!form.value.typeName.trim()) return
  try {
    await createStoreType(form.value)
    showCreate.value = false
    form.value = { typeName: '', description: '' }
    await load()
  } catch (e: any) {
    alert('Failed to add store type: ' + (e?.response?.data?.message || e.message))
  }
}
async function remove(id: number) {
  if (!confirm('Delete this store type? This will also remove all its attribute templates.')) return
  await deleteStoreType(id)
  await load()
}

async function archive(id: number, currentStatus: boolean) {
  const action = currentStatus ? 'Restore' : 'Archive'
  if (!confirm(`${action} this store type?`)) return
  await archiveStoreType(id)
  await load()
}

const showTemplates    = ref(false)
const selectedType     = ref<any>(null)
const templates        = ref<any[]>([])
const templatesLoading = ref(false)
const templateForm     = ref({ fieldName: '', fieldType: 'text', isRequired: false })
const templateSaving   = ref(false)

const fieldTypes = [
  { value: 'text',    label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'date',    label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
]

async function openTemplates(type: any) {
  selectedType.value  = type
  showTemplates.value = true
  templateForm.value  = { fieldName: '', fieldType: 'text', isRequired: false }
  await loadTemplates(type.storeTypeId)
}

async function loadTemplates(id: number) {
  templatesLoading.value = true
  try { templates.value = await getStoreTypeTemplates(id) }
  catch { templates.value = [] }
  finally { templatesLoading.value = false }
}

async function submitTemplate() {
  if (!templateForm.value.fieldName.trim()) return
  templateSaving.value = true
  try {
    await createTemplate(selectedType.value.storeTypeId, templateForm.value)
    templateForm.value = { fieldName: '', fieldType: 'text', isRequired: false }
    await loadTemplates(selectedType.value.storeTypeId)
    await load()
  } catch (e: any) {
    alert('Failed to create template: ' + (e?.response?.data?.message || e.message))
  } finally {
    templateSaving.value = false
  }
}

async function removeTemplate(templateId: number) {
  if (!confirm('Delete this attribute template?')) return
  await deleteTemplate(selectedType.value.storeTypeId, templateId)
  await loadTemplates(selectedType.value.storeTypeId)
  await load()
}

const fieldTypeLabel = (v: string) => fieldTypes.find(f => f.value === v)?.label ?? v
const fieldTypeIcon = (v: string) => v === 'date' ? 'ph ph-calendar' : v === 'number' ? 'ph ph-hash' : v === 'boolean' ? 'ph ph-toggle-right' : 'ph ph-text-t'

// Pagination
const page       = ref(1)
const pageSize   = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(types.value.length / pageSize.value)))
const paged      = computed(() => types.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Store Types</h1>
        <p class="ps-page-sub">Categorize tenant stores and define their custom product fields.</p>
      </div>
      <button class="ps-btn ps-btn-primary" @click="showCreate = true">
        <i class="ph ph-plus"></i> New Store Type
      </button>
    </div>

    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Store Types</div>
          <div class="ps-table-subtitle">{{ types.length }} type{{ types.length !== 1 ? 's' : '' }}</div>
        </div>
      </div>
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>Type Name</th>
            <th>Description</th>
            <th>Tenants</th>
            <th>Attribute Templates</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in paged" :key="t.storeTypeId">
            <td class="font-bold text-slate-800">
              {{ t.typeName }}
              <span v-if="t.isArchived" class="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">Archived</span>
            </td>
            <td class="text-slate-500">{{ t.description ?? '—' }}</td>
            <td><span class="ps-tag ps-tag-slate">{{ t.tenantCount ?? 0 }}</span></td>
            <td>
              <div class="flex items-center gap-2">
                <span class="ps-tag ps-tag-purple">{{ t.templateCount ?? 0 }} fields</span>
                <button @click="openTemplates(t)" class="ps-btn ps-btn-outline" style="padding: 5px 12px; font-size: 11px;">
                  <i class="ph ph-sliders"></i> Manage
                </button>
              </div>
            </td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                <button @click="archive(t.storeTypeId, t.isArchived)" :title="t.isArchived ? 'Restore' : 'Archive'"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all">
                  <i :class="t.isArchived ? 'ph ph-arrow-u-up-left' : 'ph ph-archive'"></i>
                </button>
                <button @click="remove(t.storeTypeId)" title="Delete"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                  <i class="ph ph-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="!loading && types.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in totalPages" :key="p" :class="['ps-pg-btn', p === page && 'ps-pg-btn--active']" @click="goTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, types.length) }} of {{ types.length }} types</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCreate" class="ps-modal-backdrop" @click.self="showCreate = false">
          <div class="ps-modal-card">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Add Store Type</h3>
              <button class="ps-modal-close" @click="showCreate = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div>
                <label class="ps-label">Type Name</label>
                <input v-model="form.typeName" placeholder="e.g. Electronics" class="ps-input" />
              </div>
              <div>
                <label class="ps-label">Description</label>
                <input v-model="form.description" placeholder="Brief description…" class="ps-input" />
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showCreate = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" @click="submit">Add Store Type</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Slide-over template panel -->
    <Teleport to="body">
      <Transition name="panel">
        <div v-if="showTemplates" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end" @click.self="showTemplates = false">
          <div class="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
            <div class="flex items-start justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <i class="ph-fill ph-sliders text-blue-500"></i> Attribute Templates
                </h2>
                <p class="text-sm text-slate-500 mt-0.5">Fields for <strong class="text-slate-700">{{ selectedType?.typeName }}</strong></p>
              </div>
              <button @click="showTemplates = false" class="text-slate-400 hover:text-slate-700 text-xl p-1"><i class="ph ph-x"></i></button>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-5">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Defined Fields</div>

              <div v-if="templatesLoading" class="flex items-center gap-2 text-slate-400 text-sm py-4">
                <i class="ph ph-spinner animate-spin"></i> Loading…
              </div>

              <div v-else-if="templates.length === 0" class="text-center py-8 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <i class="ph ph-rows text-3xl"></i>
                <p class="text-sm mt-2">No attribute templates yet.<br>Add your first field below.</p>
              </div>

              <div v-else class="flex flex-col gap-2">
                <div v-for="tmpl in templates" :key="tmpl.templateId ?? tmpl.prodAttrTemplateId"
                  class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-base">
                      <i :class="fieldTypeIcon(tmpl.fieldType)"></i>
                    </div>
                    <div>
                      <div class="text-sm font-bold text-slate-800">{{ tmpl.fieldName }}</div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        {{ fieldTypeLabel(tmpl.fieldType) }}
                        <span v-if="tmpl.isRequired" class="text-red-500 font-semibold ml-1">· Required</span>
                      </div>
                    </div>
                  </div>
                  <button @click="removeTemplate(tmpl.templateId ?? tmpl.prodAttrTemplateId)"
                    class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                    <i class="ph ph-trash"></i>
                  </button>
                </div>
              </div>

              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-6 mb-3">Add New Field</div>
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div class="flex gap-3">
                  <div class="flex-1 flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-slate-700">Field Name *</label>
                    <input v-model="templateForm.fieldName" placeholder="e.g. Serial Number" @keydown.enter.prevent="submitTemplate" class="ps-input" />
                  </div>
                  <div class="flex flex-col gap-1.5" style="min-width: 130px">
                    <label class="text-xs font-semibold text-slate-700">Field Type</label>
                    <select v-model="templateForm.fieldType" class="ps-input">
                      <option v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</option>
                    </select>
                  </div>
                </div>
                <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mt-3">
                  <input type="checkbox" v-model="templateForm.isRequired" class="w-4 h-4 accent-blue-500" />
                  <span>This field is required when adding a product</span>
                </label>
                <button @click="submitTemplate" :disabled="templateSaving || !templateForm.fieldName.trim()"
                  class="ps-btn ps-btn-primary w-full justify-center mt-3">
                  <i :class="templateSaving ? 'ph ph-spinner animate-spin' : 'ph ph-plus'"></i>
                  {{ templateSaving ? 'Adding…' : 'Add Field' }}
                </button>
              </div>

              <div class="flex items-start gap-2.5 mt-5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <i class="ph ph-info text-base mt-0.5 flex-shrink-0"></i>
                <div class="text-xs leading-relaxed">
                  These fields will automatically appear when a tenant of type
                  <strong>{{ selectedType?.typeName }}</strong> adds a new product.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.panel-enter-active, .panel-leave-active { transition: opacity 0.25s ease; }
.panel-enter-active > div:last-child,
.panel-leave-active > div:last-child { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-enter-from, .panel-leave-to { opacity: 0; }
.panel-enter-from > div:last-child,
.panel-leave-to > div:last-child { transform: translateX(100%); }
</style>
