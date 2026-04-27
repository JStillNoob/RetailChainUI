<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSubscriptionPlans, subscribeToPlan } from '../services/auth.ts'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'UpgradeView' })

const auth = useAuthStore()

const plans = ref<any[]>([])
const loadingPlans = ref(false)
const selectedPlanId = ref<number | null>(null)
const isAnnual = ref(false)
const subscribing = ref(false)
const error = ref('')

onMounted(async () => {
  loadingPlans.value = true
  try {
    const data = await getSubscriptionPlans()
    // Hide Starter plan from upgrade
    plans.value = data.filter((p: any) => p.price > 0)
  } catch (err: any) {
    error.value = 'Failed to load plans.'
  } finally {
    loadingPlans.value = false
  }
})

function calculatePrice(plan: any): string {
  if (plan.price === 0) return 'Free'
  let price = plan.price
  if (isAnnual.value) {
    price = price * 12 * 0.93 // 7% discount
    return '₱' + price.toFixed(2) + ' / yr'
  }
  return '₱' + price.toFixed(2) + ' / mo'
}

function selectPlan(planId: number) {
  selectedPlanId.value = planId
}

async function confirmSubscription() {
  if (!selectedPlanId.value) {
    error.value = 'Please select a subscription plan.'
    return
  }
  subscribing.value = true
  try {
    const res = await subscribeToPlan(selectedPlanId.value, isAnnual.value ? 'Annually' : 'Monthly')
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl
    } else {
      error.value = 'Checkout URL not returned.'
    }
  } catch (err: any) {
    error.value = 'Failed to initiate upgrade: ' + (err.message || 'Unknown error')
  } finally {
    subscribing.value = false
  }
}

const getPlanColor = (index: number) => {
    if (index === 0) return '#3B82F6' // Standard
    return '#A855F7' // Premium
}
</script>

<template>
  <div class="upgrade-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Upgrade Your Plan</h1>
        <p class="page-desc">Unlock forecasting, unlimited products, and more powerful features.</p>
      </div>
    </div>

    <div class="billing-toggle-wrap">
      <span :class="{'active': !isAnnual}">Monthly</span>
      <label class="toggle-switch">
        <input type="checkbox" v-model="isAnnual">
        <span class="slider round"></span>
      </label>
      <span :class="{'active': isAnnual}">Annually <span class="discount-badge">Save 7%</span></span>
    </div>

    <div v-if="loadingPlans" class="plans-loader">
       <i class="ph ph-circle-notch spin"></i> Loading plans...
    </div>
    
    <div v-else class="plans-grid">
      <div v-for="(plan, index) in plans" :key="plan.planId" 
           class="plan-card" 
           :class="{'selected': selectedPlanId === plan.planId}"
           @click="selectPlan(plan.planId)">
         
         <div class="plan-header" :style="{ borderTopColor: getPlanColor(index) }">
           <h3 class="plan-name">{{ plan.planName }}</h3>
           <div class="plan-price">
             {{ calculatePrice(plan) }}
           </div>
         </div>
         
         <div class="plan-features">
           <div class="feature-item" v-for="(feat, fi) in plan.features?.split(',')" :key="fi">
             <i class="ph-fill ph-check-circle" :style="{ color: getPlanColor(index) }"></i>
             <span>{{ feat.trim() }}</span>
           </div>
         </div>
      </div>
    </div>

    <div v-if="error" class="ob-error">
      <i class="ph-fill ph-warning-circle"></i> {{ error }}
    </div>

    <div class="actions" v-if="plans.length > 0">
      <button class="btn-primary" @click="confirmSubscription" :disabled="!selectedPlanId || subscribing">
        <i :class="subscribing ? 'ph ph-circle-notch spin' : 'ph ph-rocket-launch'"></i>
        {{ subscribing ? 'Preparing Checkout...' : 'Proceed to Checkout' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.upgrade-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.page-head { margin-bottom: 20px; text-align: center; }
.page-title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
.page-desc { font-size: 15px; color: #64748b; margin: 0; }

.billing-toggle-wrap { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px; font-size: 14px; font-weight: 600; color: #64748b; }
.billing-toggle-wrap .active { color: #0f172a; }
.discount-badge { background: #dcfce7; color: #16a34a; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }

.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: #6366f1; }
input:checked + .slider:before { transform: translateX(20px); }
.slider.round { border-radius: 24px; }
.slider.round:before { border-radius: 50%; }

.plans-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; width: 100%; margin-bottom: 30px; }
.plan-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: left; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
.plan-card:hover { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.plan-card.selected { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); background: #f8fafc; }
.plan-header { border-top: 4px solid #6366f1; margin: -24px -24px 20px -24px; padding: 24px 24px 0 24px; }
.plan-name { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
.plan-price { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 20px; }
.plan-features { display: flex; flex-direction: column; gap: 12px; }
.feature-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: #475569; }
.feature-item i { font-size: 16px; margin-top: 2px; }

.ob-error { display: flex; align-items: center; gap: 7px; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 9px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-top: 10px; justify-content: center;}

.actions { display: flex; justify-content: center; }
.btn-primary { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; padding: 14px 32px; border-radius: 11px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(99,102,241,0.35); transition: all 0.18s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.45); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.spin { animation: spin 0.75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .plans-grid { grid-template-columns: 1fr; }
}
</style>
