<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'StoreView' })

const { toast } = useToast()

const store = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const form = ref({
  name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  province: '',
  zipCode: '',
  logoUrl: '',
})

async function load() {
  loading.value = true
  try {
    store.value = await api.get('/tenant/store').then((r) => r.data)
    form.value = {
      name: store.value.name ?? '',
      email: store.value.email ?? '',
      phone: store.value.phone ?? '',
      street: store.value.street ?? '',
      city: store.value.city ?? '',
      province: store.value.province ?? '',
      zipCode: store.value.zipCode ?? '',
      logoUrl: store.value.logoUrl ?? '',
    }
  } catch {
    toast('Failed to load store info.', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function save() {
  if (!form.value.name.trim()) {
    toast('Store name is required.', 'error')
    return
  }
  saving.value = true
  try {
    await api.put('/tenant/store', form.value)
    toast('Store profile saved.')
    await load()
  } catch {
    toast('Failed to save store profile.', 'error')
  } finally {
    saving.value = false
  }
}

const fmtDate = (d: string) =>
  d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
</script>

<template>
  <div class="store-page">
    <!-- Page header -->
    <div class="mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <h1 class="ps-page-title">My Store</h1>
        <div class="flex items-center gap-2 flex-wrap">
          <span v-if="store?.storeType" class="ps-tag ps-tag-slate">
            <i class="ph ph-storefront mr-1.5"></i>{{ store.storeType }}
          </span>
          <span v-if="store?.activePlan" class="ps-tag ps-tag-green">{{
            store.activePlan.planName
          }}</span>
          <span
            v-if="store?.status"
            :class="['ps-tag', store.status === 'Active' ? 'ps-tag-green' : 'ps-tag-slate']"
          >
            {{ store.status }}
          </span>
        </div>
      </div>
      <p class="ps-page-sub mt-1.5">Manage your store profile and contact information.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-5">
      <div class="grid gap-5" style="grid-template-columns: 320px 1fr">
        <div class="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>
        <div class="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>
      </div>
    </div>

    <template v-else-if="store">
      <!-- Two-column layout: brand panel + form -->
      <div class="store-grid">
        <!-- Left: Brand / Logo card -->
        <div class="ps-card p-6 pb-8 flex flex-col gap-4">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Brand
          </div>

          <div class="flex flex-col items-center gap-3 py-4">
            <div
              v-if="form.logoUrl"
              class="w-32 h-32 rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-center overflow-hidden"
            >
              <img
                :src="form.logoUrl"
                alt="Store logo"
                class="max-w-full max-h-full object-contain"
              />
            </div>
            <div
              v-else
              class="w-32 h-32 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-5xl"
            >
              <i class="ph-fill ph-storefront"></i>
            </div>
            <div class="text-base font-bold text-slate-900 text-center">
              {{ form.name || 'Untitled Store' }}
            </div>
            <div v-if="store.createdAt" class="text-xs text-slate-400 flex items-center gap-1.5">
              <i class="ph ph-calendar"></i> Member since {{ fmtDate(store.createdAt) }}
            </div>
          </div>

          <div class="flex flex-col gap-2 px-1 mt-2">
            <label class="text-xs font-semibold text-slate-700">Logo URL</label>
            <input v-model="form.logoUrl" placeholder="https://…" class="ps-input" />
            <p class="text-[11px] text-slate-400 mt-1">
              Paste a hosted image URL for your store logo.
            </p>
          </div>
        </div>

        <!-- Right: Information form -->
        <div class="ps-card overflow-hidden">
          <div class="ps-table-toolbar">
            <div>
              <div class="ps-table-title">Store Information</div>
              <div class="ps-table-subtitle">Your customer-facing details</div>
            </div>
          </div>

          <div class="p-6 flex flex-col gap-8">
            <!-- Basic info -->
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-5">
                Basic Info
              </div>
              <div class="grid grid-cols-2 gap-5">
                <div class="col-span-2 flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">Store Name *</label>
                  <input v-model="form.name" placeholder="Your store name" class="ps-input" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">Email</label>
                  <input
                    v-model="form.email"
                    type="email"
                    placeholder="store@email.com"
                    class="ps-input"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">Phone</label>
                  <input v-model="form.phone" placeholder="+63 9XX XXX XXXX" class="ps-input" />
                </div>
              </div>
            </div>

            <hr class="border-slate-100" />

            <!-- Address -->
            <div class="pt-2">
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-5">
                Address
              </div>
              <div class="grid grid-cols-12 gap-5">
                <div class="col-span-12 flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">Street</label>
                  <input v-model="form.street" placeholder="Street address" class="ps-input" />
                </div>
                <div class="col-span-5 flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">City</label>
                  <input v-model="form.city" placeholder="City / Municipality" class="ps-input" />
                </div>
                <div class="col-span-5 flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">Province</label>
                  <input v-model="form.province" placeholder="Province" class="ps-input" />
                </div>
                <div class="col-span-2 flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">ZIP</label>
                  <input v-model="form.zipCode" placeholder="0000" class="ps-input" />
                </div>
              </div>
            </div>
          </div>

          <div
            class="flex justify-end gap-3 px-6 py-5 border-t border-slate-100 bg-slate-50/40 rounded-b-[16px]"
          >
            <button @click="load" :disabled="saving" class="ps-btn ps-btn-outline">Discard</button>
            <button @click="save" :disabled="saving" class="ps-btn ps-btn-primary">
              <i v-if="saving" class="ph ph-spinner animate-spin"></i>
              <i v-else class="ph ph-floppy-disk"></i>
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Subscription card -->
      <div v-if="store.activePlan" class="ps-card overflow-hidden">
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">Active Subscription</div>
            <div class="ps-table-subtitle">Your current plan and renewal date</div>
          </div>
          <span class="ps-tag ps-tag-green">{{ store.activePlan.planName }}</span>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div
                class="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                <i class="ph ph-package text-blue-500"></i> Plan
              </div>
              <div class="text-base font-bold text-slate-900">{{ store.activePlan.planName }}</div>
            </div>
            <div class="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div
                class="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                <i class="ph ph-currency-circle-dollar text-green-500"></i> Price
              </div>
              <div class="text-base font-bold text-slate-900">
                ₱{{ Number(store.activePlan.price).toLocaleString() }}
                <span class="text-xs font-medium text-slate-400"
                  >/ {{ store.activePlan.billingCycle }}</span
                >
              </div>
            </div>
            <div
              v-if="store.activePlan.endDate"
              class="bg-slate-50 border border-slate-100 rounded-xl p-4"
            >
              <div
                class="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                <i class="ph ph-calendar-check text-amber-500"></i> Renews
              </div>
              <div class="text-base font-bold text-slate-900">
                {{ fmtDate(store.activePlan.endDate) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Constrain the whole page so inputs don't stretch the full viewport */
.store-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.store-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) {
  .store-grid {
    grid-template-columns: 1fr;
  }
}
</style>
