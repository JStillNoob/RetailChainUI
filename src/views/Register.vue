<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { register } from '../services/auth.ts'
import { getStoreTypes } from '../services/superadmin.ts'
import { useRouter } from 'vue-router'

defineOptions({ name: 'RegisterPage' })

const router = useRouter()

import { useAuthStore } from '../stores/auth.ts'

const auth = useAuthStore()

const valueProps = [
  { icon: 'ph-package',       title: 'Full Inventory Control', desc: 'Track every SKU in real-time with dynamic product fields', color: '#3B82F6' },
  { icon: 'ph-storefront',    title: 'Built-in POS',           desc: 'Cashiering that auto-syncs with your stock levels',       color: '#22C55E' },
  { icon: 'ph-chart-line-up', title: 'Demand Forecasting',     desc: 'AI-assisted stock planning using Moving Average',         color: '#A855F7' },
]

const passwordScore = computed(() => {
  const pw = password.value
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
})
const passwordLabel = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore.value] ?? '')
const passwordColor = computed(() => (['', '#EF4444', '#F97316', '#22C55E', '#3B82F6'])[passwordScore.value] ?? '')

const email           = ref('')
const password        = ref('')
const confirmPassword = ref('')
const showPwd         = ref(false)
const showConfirm     = ref(false)
const agreeTerms      = ref(false)
const error           = ref('')
const success         = ref('')
const loading         = ref(false)

const handleRegister = async () => {
  error.value = ''
  success.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields.'; return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'; return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'; return
  }
  if (!agreeTerms.value) {
    error.value = 'Please accept the Terms of Service to continue.'; return
  }
  loading.value = true
  try {
    await register(email.value, password.value)
    success.value = 'Account created! Redirecting to setup...'
    // Auto login
    await auth.login(email.value, password.value)
    setTimeout(() => router.push('/onboarding'), 1500)
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } }
    error.value = axiosErr?.response?.data?.message || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- Left Panel -->
    <div class="auth-left">
      <div class="geo-bg"></div>
      <div class="auth-left-content">
        <router-link to="/" class="auth-brand">
          <div class="auth-logo-pill">
            <img src="@/assets/images/logo.png" alt="RetailChain" class="auth-logo-img" />
          </div>
        </router-link>

        <div class="auth-value-props">
          <h2 class="avp-title">Start managing your retail supply chain today</h2>
          <p class="avp-desc">
            Join hundreds of Philippine retail businesses streamlining their operations with RetailChain.
            Free 14-day trial. No credit card required.
          </p>

          <div class="avp-list">
            <div v-for="prop in valueProps" :key="prop.title" class="avp-item">
              <div class="avp-icon" :style="{ background: prop.color + '22', color: prop.color }">
                <i :class="['ph-fill', prop.icon]"></i>
              </div>
              <div>
                <div class="avp-item-title">{{ prop.title }}</div>
                <div class="avp-item-desc">{{ prop.desc }}</div>
              </div>
            </div>
          </div>

          <div class="avp-badges">
            <div class="avp-badge"><i class="ph-fill ph-shield-check"></i><span>SOC 2 Compliant</span></div>
            <div class="avp-badge"><i class="ph-fill ph-lock"></i><span>256-bit Encryption</span></div>
            <div class="avp-badge"><i class="ph-fill ph-cloud"></i><span>99.9% Uptime</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="auth-right">
      <div class="auth-form-wrapper">
        <div class="auth-form-header">
          <h1 class="auth-title">Create your account</h1>
          <p class="auth-subtitle">Set up your retail store in minutes</p>
        </div>

        <div v-if="error" class="auth-error" role="alert">
          <i class="ph-fill ph-warning-circle"></i> {{ error }}
        </div>
        <div v-if="success" class="auth-success" role="status">
          <i class="ph-fill ph-check-circle"></i> {{ success }}
        </div>

        <form @submit.prevent="handleRegister" class="auth-form" id="register-form">



          <!-- Email -->
          <div class="rc-form-group">
            <label for="reg-email" class="rc-label">Email address <span class="req">*</span></label>
            <div class="rc-input-wrap">
              <i class="ph ph-envelope rc-input-icon"></i>
              <input id="reg-email" v-model="email" type="email" class="rc-input" placeholder="you@example.com" autocomplete="email" required />
            </div>
          </div>

          <!-- Password -->
          <div class="rc-form-group">
            <label for="reg-password" class="rc-label">Password <span class="req">*</span></label>
            <div class="rc-input-wrap">
              <i class="ph ph-lock rc-input-icon"></i>
              <input
                id="reg-password"
                v-model="password"
                :type="showPwd ? 'text' : 'password'"
                class="rc-input rc-input--has-toggle"
                placeholder="Min. 8 characters"
                autocomplete="new-password"
                required
              />
              <button type="button" class="rc-pwd-toggle" @click="showPwd = !showPwd" tabindex="-1">
                <i :class="showPwd ? 'ph ph-eye-slash' : 'ph ph-eye'"></i>
              </button>
            </div>
            <div v-if="password" class="pw-strength">
              <div class="pw-bar-track">
                <div class="pw-bar-fill" :style="{ width: (passwordScore / 4 * 100) + '%', background: passwordColor }"></div>
              </div>
              <span class="pw-label" :style="{ color: passwordColor }">{{ passwordLabel }}</span>
            </div>
          </div>

          <!-- Confirm password -->
          <div class="rc-form-group">
            <label for="confirm-password" class="rc-label">Confirm Password <span class="req">*</span></label>
            <div class="rc-input-wrap">
              <i class="ph ph-lock-key rc-input-icon"></i>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="showConfirm ? 'text' : 'password'"
                class="rc-input rc-input--has-toggle"
                placeholder="Repeat password"
                autocomplete="new-password"
                required
              />
              <button type="button" class="rc-pwd-toggle" @click="showConfirm = !showConfirm" tabindex="-1">
                <i :class="showConfirm ? 'ph ph-eye-slash' : 'ph ph-eye'"></i>
              </button>
              <i
                v-if="confirmPassword"
                class="ph-fill match-icon"
                :class="password === confirmPassword ? 'ph-check-circle match-ok' : 'ph-x-circle match-err'"
              ></i>
            </div>
          </div>

          <!-- Terms checkbox -->
          <label class="checkbox-row">
            <input type="checkbox" v-model="agreeTerms" id="agree-terms" class="rc-checkbox" />
            <span class="checkbox-text">
              I agree to the <a href="#" class="auth-switch-link">Terms of Service</a> and <a href="#" class="auth-switch-link">Privacy Policy</a>
            </span>
          </label>

          <button type="submit" class="rc-btn-primary" :disabled="loading" id="register-submit-btn">
            <i :class="loading ? 'ph ph-circle-notch spin' : 'ph ph-user-plus'"></i>
            {{ loading ? 'Creating account…' : 'Create Account' }}
          </button>
        </form>

        <p class="auth-switch">
          Already have an account?
          <router-link to="/login" class="auth-switch-link">Sign in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Page shell ─────────────────────────────────────────────────────────── */
.auth-page { display: flex; min-height: 100vh; }

/* ── Left panel ─────────────────────────────────────────────────────────── */
.auth-left {
  flex: 1; background: linear-gradient(145deg, #1E2B5E 0%, #2D3E8B 60%, #1A237E 100%);
  padding: 40px; display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.auth-left-content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; }
.auth-brand { margin-bottom: 40px; display: inline-block; text-decoration: none; }
.auth-logo-pill { display: inline-flex; align-items: center; }
.auth-logo-img { height: 80px; width: auto; max-width: 300px; object-fit: contain; display: block; }

.auth-value-props { display: flex; flex-direction: column; justify-content: center; flex: 1; }
.avp-title { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 14px; }
.avp-desc  { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.7; margin-bottom: 36px; }
.avp-list  { display: flex; flex-direction: column; gap: 20px; margin-bottom: 36px; }
.avp-item  { display: flex; align-items: flex-start; gap: 14px; }
.avp-icon  { width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.avp-item-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 2px; }
.avp-item-desc  { font-size: 12px; color: rgba(255,255,255,0.55); }
.avp-badges { display: flex; gap: 10px; flex-wrap: wrap; }
.avp-badge { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 9999px; padding: 5px 12px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75); }
.avp-badge i { font-size: 14px; color: #60A5FA; }

/* ── Right panel ────────────────────────────────────────────────────────── */
.auth-right {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 40px; background: #F8FAFF; overflow-y: auto;
}
.auth-form-wrapper { width: 100%; max-width: 460px; padding: 8px 0; }
.auth-form-header { margin-bottom: 28px; }
.auth-title { font-size: 30px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px; color: #1E2B5E; }
.auth-subtitle { color: #5D6787; font-size: 14px; }

/* ── Alerts ─────────────────────────────────────────────────────────────── */
.auth-error, .auth-success {
  display: flex; align-items: center; gap: 8px;
  border-radius: 10px; padding: 12px 16px;
  font-size: 13.5px; font-weight: 500; margin-bottom: 18px;
}
.auth-error   { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #DC2626; }
.auth-success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #16A34A; }
.auth-error i, .auth-success i { font-size: 17px; flex-shrink: 0; }

/* ── Form layout ─────────────────────────────────────────────────────────── */
.auth-form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ── Inputs ─────────────────────────────────────────────────────────────── */
.rc-form-group { display: flex; flex-direction: column; gap: 5px; }
.rc-label { font-size: 13px; font-weight: 600; color: #1E2B5E; }
.req { color: #EF4444; }

.rc-input-wrap { position: relative; }
.rc-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #5D6787; font-size: 16px; pointer-events: none; z-index: 1;
}
.rc-input {
  width: 100%;
  padding: 11px 16px 11px 42px;
  border: 1.5px solid rgba(180,192,230,0.6);
  border-radius: 10px;
  font-family: inherit;
  font-size: 13.5px;
  color: #1E2B5E;
  background: rgba(255,255,255,0.9);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  appearance: none;
}
.rc-input::placeholder { color: #5D6787; opacity: 0.65; }
.rc-input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  background: #fff;
}
.rc-input--has-toggle { padding-right: 44px; }
.rc-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235D6787' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }

.rc-pwd-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: #5D6787; font-size: 17px; padding: 2px;
  transition: color 0.15s; display: flex; align-items: center;
}
.rc-pwd-toggle:hover { color: #3B82F6; }

.match-icon { position: absolute; right: 38px; top: 50%; transform: translateY(-50%); font-size: 16px; pointer-events: none; }
.match-ok  { color: #22C55E; }
.match-err { color: #EF4444; }

/* ── Password strength ───────────────────────────────────────────────────── */
.pw-strength { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
.pw-bar-track { flex: 1; height: 4px; background: rgba(180,192,230,0.4); border-radius: 2px; overflow: hidden; }
.pw-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
.pw-label { font-size: 12px; font-weight: 600; white-space: nowrap; }

/* ── Checkbox ────────────────────────────────────────────────────────────── */
.checkbox-row { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
.rc-checkbox {
  width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0;
  accent-color: #3B82F6; cursor: pointer;
}
.checkbox-text { font-size: 13px; color: #5D6787; line-height: 1.5; }

/* ── Primary button ─────────────────────────────────────────────────────── */
.rc-btn-primary {
  width: 100%; padding: 13px 24px;
  background: #3B82F6; color: #fff;
  border: none; border-radius: 10px;
  font-family: inherit; font-size: 15px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.18s;
  box-shadow: 0 4px 20px rgba(59,130,246,0.30);
}
.rc-btn-primary:hover:not(:disabled) {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(59,130,246,0.40);
}
.rc-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

/* ── Switch link ─────────────────────────────────────────────────────────── */
.auth-switch { text-align: center; font-size: 13.5px; color: #5D6787; margin-top: 16px; }
.auth-switch-link { color: #3B82F6; font-weight: 700; }
.auth-switch-link:hover { text-decoration: underline; }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .auth-page { flex-direction: column; }
  .auth-left { display: none; }
  .auth-right { padding: 32px 20px; }
  .form-row-2 { grid-template-columns: 1fr; }
}
</style>
