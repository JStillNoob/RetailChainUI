<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'LoginPage' })

const email    = ref('')
const password = ref('')
const showPwd  = ref(false)
const error    = ref('')
const loading  = ref(false)
const router   = useRouter()
const auth     = useAuthStore()

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const data = await auth.login(email.value, password.value)
    if (data.roleTypeName === 'SuperAdmin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } }
    error.value =
      axiosErr?.response?.data?.message ||
      'Login failed. Check your credentials or ensure the server is running.'
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

        <div class="auth-illustration">
          <div class="auth-info-card">
            <div class="aic-header">
              <i class="ph-fill ph-chart-line-up aic-icon"></i>
              <div>
                <div class="aic-title">Supply Chain Overview</div>
                <div class="aic-subtitle">Real-time insights</div>
              </div>
            </div>
            <div class="aic-stats">
              <div class="aic-stat">
                <span class="aic-stat-val">₱1.2M</span>
                <span class="aic-stat-lbl">Monthly Revenue</span>
              </div>
              <div class="aic-stat">
                <span class="aic-stat-val">98.4%</span>
                <span class="aic-stat-lbl">Fill Rate</span>
              </div>
              <div class="aic-stat">
                <span class="aic-stat-val">312</span>
                <span class="aic-stat-lbl">Open Orders</span>
              </div>
            </div>
            <div class="aic-chart">
              <svg viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,35 C25,32 50,22 75,20 C100,18 125,28 150,24 C175,20 187,15 200,12" stroke="#3B82F6" stroke-width="2" fill="none"/>
                <path d="M0,35 C25,32 50,22 75,20 C100,18 125,28 150,24 C175,20 187,15 200,12 L200,50 L0,50Z" fill="url(#lg1)"/>
              </svg>
            </div>
          </div>

          <div class="auth-mini-cards">
            <div class="auth-mini-card">
              <i class="ph-fill ph-package"></i>
              <div class="amc-text">
                <div class="amc-lbl">Inventory</div>
                <div class="amc-val">4,892 SKUs</div>
              </div>
            </div>
            <div class="auth-mini-card">
              <i class="ph-fill ph-storefront"></i>
              <div class="amc-text">
                <div class="amc-lbl">POS Today</div>
                <div class="amc-val">₱48,320</div>
              </div>
            </div>
          </div>
        </div>

        <div class="auth-left-footer">
          <p>"RetailChain transformed how we manage our 5 stores. Inventory is always accurate and ordering is seamless."</p>
          <div class="testimonial-author">
            <div class="ta-avatar">MR</div>
            <div>
              <div class="ta-name">Maria Reyes</div>
              <div class="ta-role">Owner, Reyes Grocery Chain</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel (Form) -->
    <div class="auth-right">
      <div class="auth-form-wrapper">
        <div class="auth-form-header">
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-subtitle">Sign in to your RetailChain account</p>
        </div>

        <div v-if="error" class="auth-error" role="alert">
          <i class="ph-fill ph-warning-circle"></i> {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="auth-form" id="login-form">
          <div class="rc-form-group">
            <label for="login-email" class="rc-label">Email address</label>
            <div class="rc-input-wrap">
              <i class="ph ph-envelope rc-input-icon"></i>
              <input
                id="login-email"
                v-model="email"
                type="email"
                class="rc-input"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <div class="rc-form-group">
            <div class="rc-label-row">
              <label for="login-password" class="rc-label">Password</label>
              <a href="#" class="rc-forgot">Forgot password?</a>
            </div>
            <div class="rc-input-wrap">
              <i class="ph ph-lock rc-input-icon"></i>
              <input
                id="login-password"
                v-model="password"
                :type="showPwd ? 'text' : 'password'"
                class="rc-input rc-input--has-toggle"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="rc-pwd-toggle" @click="showPwd = !showPwd" tabindex="-1">
                <i :class="showPwd ? 'ph ph-eye-slash' : 'ph ph-eye'"></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="rc-btn-primary"
            :disabled="loading"
            id="login-submit-btn"
          >
            <i :class="loading ? 'ph ph-circle-notch spin' : 'ph ph-sign-in'"></i>
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <div class="auth-divider"><span>or continue with</span></div>

        <div class="social-login">
          <button type="button" class="social-btn" id="google-login-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button type="button" class="social-btn" id="microsoft-login-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
              <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
              <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
              <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
            </svg>
            Microsoft
          </button>
        </div>

        <p class="auth-switch">
          Don't have an account?
          <router-link to="/register" class="auth-switch-link">Create account</router-link>
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
  flex: 1;
  background: linear-gradient(145deg, #1E2B5E 0%, #2D3E8B 60%, #1A237E 100%);
  padding: 40px;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.auth-left-content {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; height: 100%;
}
.auth-brand { margin-bottom: 40px; display: inline-block; text-decoration: none; }
.auth-logo-pill { display: inline-flex; align-items: center; }
.auth-logo-img { height: 80px; width: auto; max-width: 300px; object-fit: contain; display: block; }

.auth-illustration { flex: 1; display: flex; flex-direction: column; gap: 16px; justify-content: center; }
.auth-info-card {
  background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.15);
  backdrop-filter: blur(12px); border-radius: 20px; padding: 24px;
}
.aic-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.aic-icon { font-size: 28px; color: #60A5FA; }
.aic-title { font-size: 14px; font-weight: 700; color: #fff; }
.aic-subtitle { font-size: 12px; color: rgba(255,255,255,0.5); }
.aic-stats { display: flex; gap: 20px; margin-bottom: 20px; }
.aic-stat-val { display: block; font-size: 18px; font-weight: 800; color: #fff; }
.aic-stat-lbl { display: block; font-size: 12px; color: rgba(255,255,255,0.5); }
.aic-chart svg { width: 100%; height: 50px; }

.auth-mini-cards { display: flex; gap: 12px; }
.auth-mini-card {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  padding: 14px 16px; border-radius: 16px;
}
.auth-mini-card i { font-size: 22px; color: #60A5FA; flex-shrink: 0; }
.amc-lbl { font-size: 12px; color: rgba(255,255,255,0.5); }
.amc-val { font-size: 14px; font-weight: 700; color: #fff; }

.auth-left-footer { margin-top: 40px; }
.auth-left-footer p { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; font-style: italic; margin-bottom: 16px; }
.testimonial-author { display: flex; align-items: center; gap: 12px; }
.ta-avatar { width: 36px; height: 36px; background: linear-gradient(135deg,#3B82F6,#A855F7); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
.ta-name { font-size: 14px; font-weight: 600; color: #fff; }
.ta-role { font-size: 12px; color: rgba(255,255,255,0.75); }

/* ── Right panel ────────────────────────────────────────────────────────── */
.auth-right {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 40px; background: #F8FAFF;
}
.auth-form-wrapper { width: 100%; max-width: 420px; }
.auth-form-header { margin-bottom: 32px; }
.auth-title { font-size: 30px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px; color: #1E2B5E; }
.auth-subtitle { color: #5D6787; font-size: 14px; }

/* ── Error banner ────────────────────────────────────────────────────────── */
.auth-error {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: #DC2626; border-radius: 10px; padding: 12px 16px;
  font-size: 13.5px; font-weight: 500; margin-bottom: 20px;
}
.auth-error i { font-size: 17px; flex-shrink: 0; }

/* ── Form inputs (design-system aligned) ────────────────────────────────── */
.auth-form { display: flex; flex-direction: column; gap: 18px; margin-bottom: 24px; }

.rc-form-group { display: flex; flex-direction: column; gap: 6px; }
.rc-label { font-size: 13.5px; font-weight: 600; color: #1E2B5E; }
.rc-label-row { display: flex; align-items: center; justify-content: space-between; }
.rc-forgot { font-size: 12px; color: #3B82F6; font-weight: 600; text-decoration: none; }
.rc-forgot:hover { text-decoration: underline; }

.rc-input-wrap { position: relative; }
.rc-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #5D6787; font-size: 16px; pointer-events: none;
}
.rc-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  border: 1.5px solid rgba(180,192,230,0.6);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  color: #1E2B5E;
  background: rgba(255,255,255,0.9);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.rc-input::placeholder { color: #5D6787; opacity: 0.65; }
.rc-input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  background: #fff;
}
.rc-input--has-toggle { padding-right: 44px; }

.rc-pwd-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: #5D6787; font-size: 17px; padding: 2px;
  transition: color 0.15s; display: flex; align-items: center;
}
.rc-pwd-toggle:hover { color: #3B82F6; }

/* ── Primary button ─────────────────────────────────────────────────────── */
.rc-btn-primary {
  width: 100%;
  padding: 13px 24px;
  background: #3B82F6;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.18s;
  box-shadow: 0 4px 20px rgba(59,130,246,0.30);
}
.rc-btn-primary:hover:not(:disabled) {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(59,130,246,0.40);
}
.rc-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

/* ── Divider ─────────────────────────────────────────────────────────────── */
.auth-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 20px 0; color: #5D6787; font-size: 12px;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; height: 1px; background: rgba(180,192,230,0.4);
}

/* ── Social buttons ─────────────────────────────────────────────────────── */
.social-login { display: flex; gap: 10px; margin-bottom: 24px; }
.social-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: #fff; border: 1.5px solid rgba(180,192,230,0.5);
  border-radius: 10px; padding: 10px 16px;
  font-family: inherit; font-size: 13.5px; font-weight: 600;
  color: #1E2B5E; cursor: pointer; transition: all 0.15s;
}
.social-btn:hover { background: #f1f5f9; border-color: #3B82F6; }

/* ── Switch link ─────────────────────────────────────────────────────────── */
.auth-switch { text-align: center; font-size: 13.5px; color: #5D6787; }
.auth-switch-link { color: #3B82F6; font-weight: 700; }
.auth-switch-link:hover { text-decoration: underline; }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 768px) {
  .auth-page { flex-direction: column; }
  .auth-left { display: none; }
  .auth-right { padding: 32px 20px; }
}
</style>
