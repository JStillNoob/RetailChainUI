<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import { saveBusinessDetails, getSubscriptionPlans, subscribeToPlan } from '../services/auth.ts'
import { getStoreTypes } from '../services/superadmin.ts'

defineOptions({ name: 'TenantOnboarding' })

const router = useRouter()
const auth   = useAuthStore()

const step = ref(1) // 1=Business Setup, 2=Plan Selection, 3=Done

// Form data for Step 1
const storeName = ref('')
const firstName = ref('')
const lastName = ref('')
const storeTypeId = ref<number | ''>('')
const contactNumber = ref('')
const street = ref('')
const city = ref('')
const province = ref('')
const zipCode = ref('')
const savingBusiness = ref(false)
const error = ref('')

// Form data for Step 2
const plans = ref<any[]>([])
const loadingPlans = ref(false)
const selectedPlanId = ref<number | null>(null)
const isAnnual = ref(false)
const subscribing = ref(false)

// Data for Step 1 (Store types)
const storeTypes = ref<any[]>([])
const loadingTypes = ref(false)

onMounted(async () => {
  loadingTypes.value = true
  try {
    storeTypes.value = await getStoreTypes()
  } catch(e) {
    storeTypes.value = [
      { storeTypeId: 1, typeName: 'Food & Health' },
      { storeTypeId: 2, typeName: 'Technology' },
      { storeTypeId: 3, typeName: 'Construction & Tools' },
      { storeTypeId: 4, typeName: 'Fashion & Lifestyle' },
      { storeTypeId: 5, typeName: 'Home & General Merchandise' }
    ]
  } finally {
    loadingTypes.value = false
  }
})

async function submitBusinessDetails() {
  if (!storeName.value || !firstName.value || !storeTypeId.value || !contactNumber.value) {
    error.value = 'Please fill in all required fields.'
    return
  }
  error.value = ''
  savingBusiness.value = true
  try {
    await saveBusinessDetails({
      storeName: storeName.value,
      firstName: firstName.value,
      lastName: lastName.value,
      storeTypeId: Number(storeTypeId.value),
      contactNumber: contactNumber.value,
      street: street.value,
      city: city.value,
      province: province.value,
      zipCode: zipCode.value
    })
    
    // Auth updates via profile fetch
    await auth.fetchProfile()
    
    // Load plans for Step 2
    loadingPlans.value = true
    step.value = 2
    plans.value = await getSubscriptionPlans()
  } catch (err: any) {
    error.value = 'Failed to save business details: ' + (err.message || 'Unknown error')
  } finally {
    savingBusiness.value = false
    loadingPlans.value = false
  }
}

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
    await auth.markOnboardingComplete()
    await auth.fetchProfile()
    
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl // Redirect to PayMongo
    } else {
      step.value = 3 // Free plan, go to done
    }
  } catch (err: any) {
    error.value = 'Failed to subscribe: ' + (err.message || 'Unknown error')
  } finally {
    subscribing.value = false
  }
}

async function finish() {
  router.replace('/dashboard/products')
}

const steps = [
  { n: 1, label: 'Business Details' },
  { n: 2, label: 'Select Plan' },
  { n: 3, label: 'Done' },
]

const getPlanColor = (index: number) => {
    if (index === 0) return '#22C55E' // Starter
    if (index === 1) return '#3B82F6' // Standard
    return '#A855F7' // Premium
}
</script>

<template>
  <div class="onboarding-shell">
    <div class="ob-bg-left"></div>
    <div class="ob-bg-right"></div>

    <div class="ob-card" :class="{'ob-card-wide': step === 2}">
      <div class="ob-brand">
        <img src="@/assets/images/logo.png" alt="RetailChain" class="ob-logo" />
      </div>

      <div class="ob-stepper">
        <template v-for="(s, i) in steps" :key="s.n">
          <div class="ob-step" :class="{ done: step > s.n, active: step === s.n }">
            <div class="ob-step-dot">
              <i v-if="step > s.n" class="ph-fill ph-check-circle"></i>
              <span v-else>{{ s.n }}</span>
            </div>
            <span class="ob-step-label">{{ s.label }}</span>
          </div>
          <div v-if="i < steps.length - 1" class="ob-step-line" :class="{ done: step > s.n }"></div>
        </template>
      </div>

      <!-- ══ STEP 1: BUSINESS SETUP ══ -->
      <Transition name="slide" mode="out-in">
        <div v-if="step === 1" class="ob-content" key="step1">
          <h1 class="ob-heading">Tell us about your business</h1>
          <p class="ob-sub">We need a few details to set up your store's operating environment.</p>

          <div class="ob-form">
            <div class="ob-form-row">
              <div class="ob-form-group">
                <label>Store Name <span class="req">*</span></label>
                <input v-model="storeName" placeholder="My Retail Store" />
              </div>
              <div class="ob-form-group">
                <label>Business Type <span class="req">*</span></label>
                <select v-model="storeTypeId" :disabled="loadingTypes" class="rc-select">
                  <option value="" disabled>{{ loadingTypes ? 'Loading...' : 'Select Type' }}</option>
                  <option v-for="t in storeTypes" :key="t.storeTypeId" :value="t.storeTypeId">{{ t.typeName }}</option>
                </select>
              </div>
            </div>

            <div class="ob-form-row">
              <div class="ob-form-group">
                <label>Owner First Name <span class="req">*</span></label>
                <input v-model="firstName" placeholder="Juan" />
              </div>
              <div class="ob-form-group">
                <label>Owner Last Name</label>
                <input v-model="lastName" placeholder="dela Cruz" />
              </div>
            </div>

            <div class="ob-form-group" style="margin-bottom: 14px">
              <label>Contact Number <span class="req">*</span></label>
              <input v-model="contactNumber" placeholder="+63 900 000 0000" />
            </div>

            <div class="ob-form-row">
              <div class="ob-form-group">
                <label>City <span class="req">*</span></label>
                <input v-model="city" placeholder="Manila" />
              </div>
              <div class="ob-form-group">
                <label>Province</label>
                <input v-model="province" placeholder="Metro Manila" />
              </div>
            </div>

            <div v-if="error" class="ob-error">
              <i class="ph-fill ph-warning-circle"></i> {{ error }}
            </div>
          </div>

          <div class="ob-actions">
            <div></div>
            <button class="ob-btn-primary" @click="submitBusinessDetails" :disabled="savingBusiness">
              <i :class="savingBusiness ? 'ph ph-circle-notch spin' : ''"></i>
              {{ savingBusiness ? 'Saving...' : 'Next Step' }} <i v-if="!savingBusiness" class="ph ph-arrow-right"></i>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ══ STEP 2: PLAN SELECTION ══ -->
      <Transition name="slide" mode="out-in">
        <div v-if="step === 2" class="ob-content" key="step2">
          <h1 class="ob-heading">Select your Subscription Plan</h1>
          <p class="ob-sub">Choose a plan that fits your retail operations. Cancel anytime.</p>

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

          <div v-if="error" class="ob-error" style="margin-top:20px;">
            <i class="ph-fill ph-warning-circle"></i> {{ error }}
          </div>

          <div class="ob-actions ob-actions-center" style="margin-top: 30px;">
            <button class="ob-btn-primary ob-btn-wide" @click="confirmSubscription" :disabled="!selectedPlanId || subscribing">
              <i :class="subscribing ? 'ph ph-circle-notch spin' : 'ph ph-credit-card'"></i>
              {{ subscribing ? 'Processing...' : 'Confirm & Subscribe' }}
            </button>
          </div>
        </div>
      </Transition>

      <!-- ══ STEP 3: DONE ══ -->
      <Transition name="slide" mode="out-in">
        <div v-if="step === 3" class="ob-content ob-done" key="step3">
          <div class="ob-done-icon">
            <i class="ph-fill ph-check-circle"></i>
          </div>
          <h1 class="ob-heading">You're all set! 🚀</h1>
          <p class="ob-sub">
            Your store is ready. Head to your dashboard and start
            adding products!
          </p>

          <div class="ob-actions ob-actions-center">
            <button class="ob-btn-primary ob-btn-wide" @click="finish">
              <i class="ph ph-package"></i>
              Go to Dashboard
            </button>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
/* ══ SHELL ══ */
.onboarding-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f4ff;
  padding: 24px;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

.ob-bg-left {
  position: absolute; width: 500px; height: 500px; left: -150px; top: -100px;
  background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%); border-radius: 50%; pointer-events: none;
}
.ob-bg-right {
  position: absolute; width: 400px; height: 400px; right: -100px; bottom: -100px;
  background: radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%); border-radius: 50%; pointer-events: none;
}

/* ══ CARD ══ */
.ob-card {
  position: relative; z-index: 1; background: #fff; border-radius: 24px;
  box-shadow: 0 20px 60px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.05);
  padding: 40px 48px; width: 100%; max-width: 560px;
  transition: max-width 0.3s;
}
.ob-card-wide { max-width: 900px; }

/* ══ BRAND ══ */
.ob-brand { display: flex; justify-content: center; margin-bottom: 28px; }
.ob-logo  { height: 56px; width: auto; object-fit: contain; }

/* ══ STEPPER ══ */
.ob-stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 36px; }
.ob-step { display: flex; flex-direction: column; align-items: center; gap: 5px; min-width: 80px; }
.ob-step-dot {
  width: 34px; height: 34px; border-radius: 50%; border: 2px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #94a3b8; background: #fff; transition: all 0.3s;
}
.ob-step.active .ob-step-dot { border-color: #6366f1; background: #6366f1; color: #fff; box-shadow: 0 0 0 4px rgba(99,102,241,0.18); }
.ob-step.done .ob-step-dot { border-color: #22c55e; background: #22c55e; color: #fff; }
.ob-step-label { font-size: 11px; font-weight: 600; color: #94a3b8; transition: color 0.3s; }
.ob-step.active .ob-step-label { color: #6366f1; font-weight: 700; }
.ob-step.done  .ob-step-label  { color: #22c55e; }
.ob-step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 4px; margin-bottom: 20px; transition: background 0.3s; }
.ob-step-line.done { background: #22c55e; }

/* ══ CONTENT ══ */
.ob-content { display: flex; flex-direction: column; align-items: center; text-align: center; }
.ob-heading { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 10px; line-height: 1.2; }
.ob-sub { font-size: 14px; color: #64748b; line-height: 1.7; max-width: 400px; margin: 0 0 28px; }

/* ── Form ── */
.ob-form { align-self: stretch; text-align: left; }
.ob-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.ob-form-group { display: flex; flex-direction: column; gap: 5px; }
.ob-form-group label { font-size: 12px; font-weight: 600; color: #374151; }
.ob-form-group input, .rc-select {
  border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 10px 13px;
  font-size: 13.5px; color: #0f172a; background: #fff; font-family: inherit;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box;
}
.ob-form-group input:focus, .rc-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.req { color: #ef4444; }

/* ── Error ── */
.ob-error { display: flex; align-items: center; gap: 7px; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 9px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-top: 10px;}

/* ── Actions ── */
.ob-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; align-self: stretch; margin-top: 28px; }
.ob-actions-center { justify-content: center; }
.ob-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; padding: 12px 26px; border-radius: 11px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(99,102,241,0.35); transition: all 0.18s; }
.ob-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.45); }
.ob-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.ob-btn-wide { width: 100%; justify-content: center; max-width: 300px; }

/* ── Done step ── */
.ob-done-icon { width: 80px; height: 80px; background: rgba(34,197,94,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 44px; color: #22c55e; margin-bottom: 20px; }

/* ══ SUBSCRIPTION PLANS ══ */
.billing-toggle-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; font-size: 14px; font-weight: 600; color: #64748b; }
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

.plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; }
.plan-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: left; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
.plan-card:hover { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.plan-card.selected { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); background: #f8fafc; }
.plan-header { border-top: 4px solid #6366f1; margin: -24px -24px 20px -24px; padding: 24px 24px 0 24px; }
.plan-name { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
.plan-price { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 20px; }
.plan-features { display: flex; flex-direction: column; gap: 12px; }
.feature-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: #475569; }
.feature-item i { font-size: 16px; margin-top: 2px; }

/* ══ SLIDE TRANSITION ══ */
.slide-enter-active, .slide-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-enter-from { opacity: 0; transform: translateX(24px); }
.slide-leave-to   { opacity: 0; transform: translateX(-24px); }
.spin { animation: spin 0.75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 800px) {
  .plans-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .ob-card { padding: 28px 20px; }
  .ob-heading { font-size: 22px; }
  .ob-form-row { grid-template-columns: 1fr; }
}
</style>
