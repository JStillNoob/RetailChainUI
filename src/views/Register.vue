<script setup lang="ts">
import { ref, computed } from 'vue'
import { register } from '../services/auth.ts'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import authIllustration from '@/assets/images/Gemini_Generated_Image_tr35wvtr35wvtr35-removebg-preview.png'
import logo from '@/assets/images/logo.png'

defineOptions({ name: 'RegisterPage' })

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPwd = ref(false)
const showConfirm = ref(false)
const agreeTerms = ref(false)
const error = ref('')
const success = ref('')
const loading = ref(false)

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
const passwordLabel = computed(
  () => ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore.value] ?? '',
)
const passwordColor = computed(
  () => ['', '#EF4444', '#F97316', '#22C55E', '#3B82F6'][passwordScore.value] ?? '',
)

const handleRegister = async () => {
  error.value = ''
  success.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (!agreeTerms.value) {
    error.value = 'Please accept the Terms of Service to continue.'
    return
  }
  loading.value = true
  try {
    await register(email.value, password.value)
    success.value = 'Account created! Redirecting to setup...'
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
  <div class="h-screen flex bg-slate-50 overflow-hidden font-sans">
    <!-- ── Left: illustration panel ── -->
    <aside
      class="hidden lg:flex w-1/2 flex-col p-12 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden"
    >
      <!-- Decorative blurred orbs (Animated) -->
      <div
        class="absolute -top-32 -left-24 w-96 h-96 bg-purple-400/40 rounded-full blur-[80px] pointer-events-none animate-blob"
      ></div>
      <div
        class="absolute top-1/2 -right-24 w-80 h-80 bg-pink-400/40 rounded-full blur-[80px] pointer-events-none animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-400/40 rounded-full blur-[80px] pointer-events-none animate-blob animation-delay-4000"
      ></div>

      <!-- Brand -->
      <router-link
        to="/"
        class="absolute top-0 left-0 z-30 inline-flex items-center transform transition hover:scale-105 duration-300"
      >
        <img :src="logo" alt="RetailChain" class="h-20 w-auto object-contain drop-shadow-sm" />
      </router-link>

      <!-- Illustration -->
      <div
        class="relative top-15 z-0 flex-1 flex items-center justify-center min-h-0 mt-10 mb-4 illustration-wrapper scale-[1.15]"
      >
        <img
          :src="authIllustration"
          alt="RetailChain workspace"
          class="max-w-full h-100 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] floating-img"
        />
      </div>
      <!-- Tagline in Glass Card -->
      <div class="relative z-10 max-w-lg glass-panel p-8 rounded-3xl">
        <h2 class="text-3xl font-black text-slate-900 leading-tight tracking-tight">
          Start managing your retail chain in minutes.
        </h2>
        <p class="mt-3 text-base text-slate-600 leading-relaxed font-medium">
          Free 14-day trial. No credit card required. Experience seamless operations today.
        </p>
        <div class="mt-5 flex flex-wrap gap-3">
          <span
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/70 border border-white shadow-sm text-xs font-bold text-slate-700 hover:-translate-y-0.5 transition-transform"
          >
            <i class="ph-fill ph-shield-check text-blue-600 text-sm"></i> SOC 2
          </span>
          <span
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/70 border border-white shadow-sm text-xs font-bold text-slate-700 hover:-translate-y-0.5 transition-transform"
          >
            <i class="ph-fill ph-lock text-blue-600 text-sm"></i> 256-bit Encryption
          </span>
          <span
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/70 border border-white shadow-sm text-xs font-bold text-slate-700 hover:-translate-y-0.5 transition-transform"
          >
            <i class="ph-fill ph-cloud text-blue-600 text-sm"></i> 99.9% Uptime
          </span>
        </div>
      </div>
    </aside>

    <!-- ── Right: form panel ── -->
    <main
      class="flex-1 relative bg-white overflow-y-auto overflow-x-hidden shadow-[-20px_0_40px_rgba(0,0,0,0.02)] z-10 rounded-l-[2rem] lg:rounded-l-[3rem]"
    >
      <!-- Subtle background elements for the form side -->
      <div
        class="absolute top-0 right-0 w-full min-h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white pointer-events-none"
      ></div>

      <!-- Scrollable content wrapper -->
      <div class="min-h-full w-full flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div class="w-full max-w-[400px]">
          <!-- Mobile brand -->
          <router-link to="/" class="lg:hidden flex justify-center mb-8 fade-up">
            <img :src="logo" alt="RetailChain" class="h-12 w-auto object-contain drop-shadow-sm" />
          </router-link>

          <div class="text-center lg:text-left fade-up">
            <h1 class="text-[32px] font-extrabold text-slate-900 tracking-tight">
              Create your account
            </h1>
            <p class="mt-2 text-[15px] text-slate-500">Set up your retail store in minutes</p>
          </div>

          <!-- Alerts -->
          <div
            v-if="error"
            role="alert"
            class="mt-6 flex items-start gap-3 px-4 py-3 rounded-[10px] bg-red-50/80 border border-red-100 text-red-600 text-sm font-medium backdrop-blur-sm fade-up delay-100"
          >
            <i class="ph-fill ph-warning-circle text-lg mt-0.5"></i>
            <span>{{ error }}</span>
          </div>
          <div
            v-if="success"
            role="status"
            class="mt-6 flex items-start gap-3 px-4 py-3 rounded-[10px] bg-green-50/80 border border-green-100 text-green-700 text-sm font-medium backdrop-blur-sm fade-up delay-100"
          >
            <i class="ph-fill ph-check-circle text-lg mt-0.5"></i>
            <span>{{ success }}</span>
          </div>

          <form @submit.prevent="handleRegister" id="register-form" class="mt-8">
            <!-- Email -->
            <div class="fade-up delay-100">
              <label for="reg-email" class="block text-sm font-bold text-slate-800 mb-2 ml-1">
                Email address <span class="text-red-500">*</span>
              </label>
              <div class="auth-field">
                <i class="ph ph-envelope auth-field__icon"></i>
                <input
                  id="reg-email"
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="email"
                  required
                  class="auth-field__input"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="fade-up delay-200 mt-5">
              <label for="reg-password" class="block text-sm font-bold text-slate-800 mb-2 ml-1">
                Password <span class="text-red-500">*</span>
              </label>
              <div class="auth-field">
                <i class="ph ph-lock auth-field__icon"></i>
                <input
                  id="reg-password"
                  v-model="password"
                  :type="showPwd ? 'text' : 'password'"
                  placeholder="Min. 8 characters"
                  autocomplete="new-password"
                  required
                  class="auth-field__input"
                />
                <button
                  type="button"
                  @click="showPwd = !showPwd"
                  tabindex="-1"
                  aria-label="Toggle password visibility"
                  class="auth-field__btn"
                >
                  <i :class="showPwd ? 'ph-fill ph-eye-slash' : 'ph-fill ph-eye'"></i>
                </button>
              </div>
              <div
                v-if="password"
                class="mt-2 flex items-center gap-3 px-1 transition-all duration-300"
              >
                <div class="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500 ease-out"
                    :style="{ width: (passwordScore / 4) * 100 + '%', background: passwordColor }"
                  ></div>
                </div>
                <span class="text-xs font-bold whitespace-nowrap" :style="{ color: passwordColor }">
                  {{ passwordLabel }}
                </span>
              </div>
            </div>

            <!-- Confirm password -->
            <div class="fade-up delay-300 mt-5">
              <label
                for="confirm-password"
                class="block text-sm font-bold text-slate-800 mb-2 ml-1"
              >
                Confirm Password <span class="text-red-500">*</span>
              </label>
              <div class="auth-field">
                <i class="ph ph-lock-key auth-field__icon"></i>
                <input
                  id="confirm-password"
                  v-model="confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  placeholder="Repeat password"
                  autocomplete="new-password"
                  required
                  class="auth-field__input"
                />
                <i
                  v-if="confirmPassword"
                  :class="[
                    'ph-fill text-xl mr-2 transition-all duration-300',
                    password === confirmPassword
                      ? 'ph-check-circle text-green-500 scale-110'
                      : 'ph-x-circle text-red-500',
                  ]"
                ></i>
                <button
                  type="button"
                  @click="showConfirm = !showConfirm"
                  tabindex="-1"
                  aria-label="Toggle confirm password visibility"
                  class="auth-field__btn"
                >
                  <i :class="showConfirm ? 'ph-fill ph-eye-slash' : 'ph-fill ph-eye'"></i>
                </button>
              </div>
            </div>

            <!-- Terms -->
            <div class="fade-up delay-400 mt-5">
              <label class="flex items-start gap-3 cursor-pointer group">
                <div class="relative flex items-center justify-center mt-0.5">
                  <input
                    id="agree-terms"
                    v-model="agreeTerms"
                    type="checkbox"
                    class="peer w-5 h-5 appearance-none rounded-md border-[1.5px] border-slate-300 checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer"
                  />
                  <i
                    class="ph-bold ph-check absolute text-white text-xs opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                  ></i>
                </div>
                <span
                  class="text-sm font-medium text-slate-600 leading-relaxed group-hover:text-slate-800 transition-colors"
                >
                  I agree to the
                  <a href="#" class="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >Terms of Service</a
                  >
                  and
                  <a href="#" class="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >Privacy Policy</a
                  >
                </span>
              </label>
            </div>

            <!-- Submit -->
            <div class="fade-up delay-400 mt-6">
              <button
                type="submit"
                :disabled="loading"
                id="register-submit-btn"
                class="btn-primary w-full h-[52px] inline-flex items-center justify-center gap-2 rounded-[10px] text-white text-base font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <i v-if="loading" class="ph ph-circle-notch animate-spin text-xl"></i>
                <i v-else class="ph ph-user-plus text-xl -mt-0.5"></i>
                {{ loading ? 'Creating account…' : 'Create Account' }}
              </button>
            </div>
          </form>

          <p class="mt-8 text-center text-[15px] font-medium text-slate-500 fade-up delay-400">
            Already have an account?
            <router-link
              to="/login"
              class="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-1"
              >Sign in</router-link
            >
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-15px);
  }
  100% {
    transform: translateY(0px);
  }
}

.animate-blob {
  animation: blob 12s infinite alternate ease-in-out;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}

.fade-up {
  animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.delay-100 {
  animation-delay: 0.1s;
}
.delay-200 {
  animation-delay: 0.2s;
}
.delay-300 {
  animation-delay: 0.3s;
}
.delay-400 {
  animation-delay: 0.4s;
}

.floating-img {
  animation: float 6s ease-in-out infinite;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 40px -10px rgba(31, 38, 135, 0.1);
}

.auth-field {
  display: flex;
  align-items: center;
  height: 52px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0 6px 0 16px;
  transition: all 0.2s ease-in-out;
}
.auth-field:hover {
  border-color: #94a3b8;
  background: #ffffff;
}
.auth-field:focus-within {
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow:
    0 4px 12px -4px rgba(59, 130, 246, 0.15),
    0 0 0 3px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.auth-field__icon {
  font-size: 20px;
  color: #64748b;
  flex-shrink: 0;
  margin-right: 12px;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}
.auth-field:focus-within .auth-field__icon {
  color: #3b82f6;
  transform: scale(1.05);
}

.auth-field__input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
}
.auth-field__input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.auth-field__btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #64748b;
  font-size: 20px;
  border-radius: 10px;
  transition: all 0.2s ease;
}
.auth-field__btn:hover {
  color: #3b82f6;
  background: #eff6ff;
}
.auth-field__btn:active {
  transform: scale(0.95);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
  position: relative;
  overflow: hidden;
}
.btn-primary::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transform: skewX(-20deg);
  transition: all 0.5s ease;
}
.btn-primary:hover {
  box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.39);
  transform: translateY(-2px);
}
.btn-primary:hover::after {
  left: 150%;
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px 0 rgba(37, 99, 235, 0.39);
}

.social-btn {
  transition: all 0.2s ease-in-out;
}
.social-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.08);
}
.social-btn:active {
  transform: translateY(0);
}
</style>
