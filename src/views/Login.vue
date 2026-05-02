<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import authIllustration from '@/assets/images/Gemini_Generated_Image_tr35wvtr35wvtr35-removebg-preview.png'
import logo from '@/assets/images/logo.png'

defineOptions({ name: 'LoginPage' })

const email = ref('')
const password = ref('')
const showPwd = ref(false)
const error = ref('')
const loading = ref(false)
const router = useRouter()
const auth = useAuthStore()

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const data = await auth.login(email.value, password.value)
    if (data.roleTypeName === 'SuperAdmin') router.push('/admin')
    else router.push('/dashboard')
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
  <div class="h-screen flex bg-slate-50 overflow-hidden font-sans">
    <!-- ── Left: illustration panel ── -->
    <aside
      class="hidden lg:flex w-1/2 flex-col p-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden"
    >
      <!-- Decorative blurred orbs (Animated) -->
      <div
        class="absolute -top-32 -left-24 w-96 h-96 bg-blue-400/40 rounded-full blur-[80px] pointer-events-none animate-blob"
      ></div>
      <div
        class="absolute top-1/2 -right-24 w-80 h-80 bg-purple-400/40 rounded-full blur-[80px] pointer-events-none animate-blob animation-delay-2000"
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
      <div class="relative z-0 max-w-lg glass-panel p-8 rounded-3xl">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-white/80 text-xs font-bold text-blue-700 mb-4 shadow-sm"
        >
          <i class="ph-fill ph-sparkle"></i> The future of retail
        </div>
        <h2 class="text-3xl font-black text-slate-900 leading-tight tracking-tight">
          Run your whole retail chain from one screen.
        </h2>
        <p class="mt-3 text-base text-slate-600 leading-relaxed font-medium">
          Inventory, cashiering, and supply chain — synced in real time across every branch with
          state-of-the-art accuracy.
        </p>
      </div>
    </aside>

    <!-- ── Right: form panel ── -->
    <main
      class="flex-1 relative bg-white overflow-y-auto overflow-x-hidden shadow-[-20px_0_40px_rgba(0,0,0,0.02)] z-10 rounded-l-[2rem] lg:rounded-l-[3rem]"
    >
      <!-- Subtle background elements for the form side -->
      <div
        class="absolute top-0 right-0 w-full min-h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white pointer-events-none"
      ></div>

      <!-- Scrollable content wrapper -->
      <div class="min-h-full w-full flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div class="w-full max-w-[400px]">
          <!-- Mobile brand -->
          <router-link to="/" class="lg:hidden flex justify-center mb-8 fade-up">
            <img :src="logo" alt="RetailChain" class="h-12 w-auto object-contain drop-shadow-sm" />
          </router-link>

          <div class="text-center lg:text-left fade-up">
            <h1 class="text-[32px] font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
            <p class="mt-2 text-[15px] text-slate-500">Sign in to your RetailChain account</p>
          </div>

          <!-- Error -->
          <div
            v-if="error"
            role="alert"
            class="mt-6 flex items-start gap-3 px-4 py-3 rounded-[10px] bg-red-50/80 border border-red-100 text-red-600 text-sm font-medium backdrop-blur-sm fade-up delay-100"
          >
            <i class="ph-fill ph-warning-circle text-lg mt-0.5"></i>
            <span>{{ error }}</span>
          </div>

          <form @submit.prevent="handleLogin" id="login-form" class="mt-8" autocomplete="off">
            <!-- Email -->
            <div class="fade-up delay-100">
              <label for="login-email" class="block text-sm font-bold text-slate-800 mb-2 ml-1">
                Email address
              </label>
              <div class="auth-field">
                <i class="ph ph-envelope auth-field__icon"></i>
                <input
                  id="login-email"
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="off"
                  required
                  class="auth-field__input"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="fade-up delay-200 mt-5">
              <div class="flex items-center justify-between mb-2 ml-1 mr-1">
                <label for="login-password" class="block text-sm font-bold text-slate-800"
                  >Password</label
                >
                <a
                  href="#"
                  class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >Forgot password?</a
                >
              </div>
              <div class="auth-field">
                <i class="ph ph-lock auth-field__icon"></i>
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPwd ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
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
            </div>

            <!-- Submit -->
            <div class="fade-up delay-300 mt-6">
              <button
                type="submit"
                :disabled="loading"
                id="login-submit-btn"
                class="btn-primary w-full h-[52px] inline-flex items-center justify-center gap-2 rounded-[10px] text-white text-base font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <i v-if="loading" class="ph ph-circle-notch animate-spin text-xl"></i>
                <i v-else class="ph ph-sign-in text-xl -mt-0.5"></i>
                {{ loading ? 'Signing in…' : 'Sign In' }}
              </button>
            </div>
          </form>

          <!-- Divider -->
          <div class="my-6 flex items-center gap-4 fade-up delay-400">
            <div class="flex-1 h-px bg-slate-200"></div>
            <span class="text-[13px] font-medium text-slate-400">or continue with</span>
            <div class="flex-1 h-px bg-slate-200"></div>
          </div>

          <!-- Social -->
          <div class="grid grid-cols-1 gap-4 fade-up delay-400">
            <button
              type="button"
              id="google-login-btn"
              class="social-btn w-full h-[48px] inline-flex items-center justify-center gap-2.5 rounded-[10px] border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z"
                  fill="#34A853"
                />
                <path
                  d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>

          <p class="mt-8 text-center text-[15px] font-medium text-slate-500 fade-up delay-400">
            Don't have an account?
            <router-link
              to="/register"
              class="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-1"
              >Create account</router-link
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
