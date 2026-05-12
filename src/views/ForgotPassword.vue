<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { forgotPassword, verifyResetOtp, resetPassword } from '../services/auth.ts'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.vue'
import logo from '@/assets/images/logo.png'

defineOptions({ name: 'ForgotPasswordPage' })

const router = useRouter()

// Steps: 'email' → 'otp' → 'new-password' → 'done'
const step      = ref<'email' | 'otp' | 'new-password' | 'done'>('email')
const loading   = ref(false)
const error     = ref('')
const success   = ref('')

// Step 1 — email
const email = ref('')

// Step 2 — OTP
const otp         = ref('')
const resetToken  = ref('')
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  resendCooldown.value = 120
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

// Step 3 — new password
const newPassword     = ref('')
const confirmPassword = ref('')
const showPwd         = ref(false)

const meterRef = ref<InstanceType<typeof PasswordStrengthMeter> | null>(null)
const isStrong  = computed(() => meterRef.value?.isStrong ?? false)

async function submitEmail() {
  if (!email.value.trim()) { error.value = 'Please enter your email.'; return }
  error.value = ''
  loading.value = true
  try {
    await forgotPassword(email.value.trim())
    step.value = 'otp'
    startCooldown()
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'An error occurred.'
  } finally { loading.value = false }
}

async function resendCode() {
  if (resendCooldown.value > 0) return
  error.value = ''
  loading.value = true
  try {
    await forgotPassword(email.value.trim())
    startCooldown()
    success.value = 'A new code has been sent.'
    setTimeout(() => { success.value = '' }, 3000)
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to resend.'
  } finally { loading.value = false }
}

async function submitOtp() {
  if (otp.value.length !== 6) { error.value = 'Enter the 6-digit code.'; return }
  error.value = ''
  loading.value = true
  try {
    const res    = await verifyResetOtp(email.value.trim(), otp.value.trim())
    resetToken.value = res.resetToken
    step.value = 'new-password'
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Invalid code.'
  } finally { loading.value = false }
}

async function submitNewPassword() {
  if (!newPassword.value) { error.value = 'Please enter a new password.'; return }
  if (!isStrong.value) { error.value = 'Password does not meet all requirements.'; return }
  if (newPassword.value !== confirmPassword.value) { error.value = 'Passwords do not match.'; return }
  error.value = ''
  loading.value = true
  try {
    await resetPassword(resetToken.value, newPassword.value)
    step.value = 'done'
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to reset password.'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div class="w-full max-w-[420px]">
      <div class="flex justify-center mb-8">
        <router-link to="/"><img :src="logo" alt="RetailChain" class="h-14 w-auto object-contain" /></router-link>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

        <!-- Step: email -->
        <template v-if="step === 'email'">
          <div class="mb-6">
            <h1 class="text-2xl font-extrabold text-slate-900">Forgot password?</h1>
            <p class="text-sm text-slate-500 mt-1">Enter your email and we'll send a reset code.</p>
          </div>
          <div v-if="error" class="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
            <i class="ph-fill ph-warning-circle mt-0.5 flex-shrink-0"></i><span>{{ error }}</span>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Email address</label>
              <input v-model="email" type="email" placeholder="you@example.com" @keydown.enter="submitEmail"
                class="ps-input w-full" />
            </div>
            <button @click="submitEmail" :disabled="loading" class="ps-btn ps-btn-primary w-full justify-center">
              <i :class="loading ? 'ph ph-spinner animate-spin' : 'ph ph-paper-plane-right'"></i>
              {{ loading ? 'Sending…' : 'Send Reset Code' }}
            </button>
            <div class="text-center">
              <router-link to="/login" class="text-sm text-blue-600 hover:underline font-medium">← Back to Sign In</router-link>
            </div>
          </div>
        </template>

        <!-- Step: OTP -->
        <template v-else-if="step === 'otp'">
          <div class="mb-6">
            <h1 class="text-2xl font-extrabold text-slate-900">Enter reset code</h1>
            <p class="text-sm text-slate-500 mt-1">We sent a 6-digit code to <strong class="text-slate-700">{{ email }}</strong>.</p>
          </div>
          <div v-if="error" class="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
            <i class="ph-fill ph-warning-circle mt-0.5 flex-shrink-0"></i><span>{{ error }}</span>
          </div>
          <div v-if="success" class="mb-4 flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">
            <i class="ph-fill ph-check-circle mt-0.5 flex-shrink-0"></i><span>{{ success }}</span>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">6-digit code</label>
              <input v-model="otp" type="text" inputmode="numeric" maxlength="6" placeholder="000000"
                @keydown.enter="submitOtp" class="ps-input w-full text-center text-2xl tracking-[0.5em] font-bold" />
            </div>
            <button @click="submitOtp" :disabled="loading" class="ps-btn ps-btn-primary w-full justify-center">
              <i :class="loading ? 'ph ph-spinner animate-spin' : 'ph ph-check'"></i>
              {{ loading ? 'Verifying…' : 'Verify Code' }}
            </button>
            <div class="text-center text-sm text-slate-500">
              Didn't get it?
              <button @click="resendCode" :disabled="resendCooldown > 0 || loading"
                class="ml-1 font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline">
                {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code' }}
              </button>
            </div>
          </div>
        </template>

        <!-- Step: new password -->
        <template v-else-if="step === 'new-password'">
          <div class="mb-6">
            <h1 class="text-2xl font-extrabold text-slate-900">Set new password</h1>
            <p class="text-sm text-slate-500 mt-1">Choose a strong password for your account.</p>
          </div>
          <div v-if="error" class="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
            <i class="ph-fill ph-warning-circle mt-0.5 flex-shrink-0"></i><span>{{ error }}</span>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">New password</label>
              <div class="relative">
                <input v-model="newPassword" :type="showPwd ? 'text' : 'password'" placeholder="New password"
                  class="ps-input w-full pr-10" />
                <button type="button" @click="showPwd = !showPwd"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <i :class="showPwd ? 'ph-fill ph-eye-slash' : 'ph-fill ph-eye'"></i>
                </button>
              </div>
              <PasswordStrengthMeter ref="meterRef" :password="newPassword" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Confirm password</label>
              <input v-model="confirmPassword" :type="showPwd ? 'text' : 'password'" placeholder="Repeat password"
                class="ps-input w-full" />
            </div>
            <button @click="submitNewPassword" :disabled="loading" class="ps-btn ps-btn-primary w-full justify-center">
              <i :class="loading ? 'ph ph-spinner animate-spin' : 'ph ph-lock-key'"></i>
              {{ loading ? 'Saving…' : 'Reset Password' }}
            </button>
          </div>
        </template>

        <!-- Step: done -->
        <template v-else>
          <div class="text-center py-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ph-fill ph-check-circle text-green-500 text-3xl"></i>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900">Password reset!</h1>
            <p class="text-sm text-slate-500 mt-2">Your password has been reset successfully. You can now sign in.</p>
            <button @click="router.push('/login')" class="ps-btn ps-btn-primary mt-6 w-full justify-center">
              <i class="ph ph-sign-in"></i> Go to Sign In
            </button>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>
