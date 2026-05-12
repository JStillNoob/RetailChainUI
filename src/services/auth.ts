import api from './api.ts'

export interface LoginResponse {
  token: string
  roleTypeName: string
  userId: number
  tenantId: number
  firstName: string
  middleName?: string
  lastName: string
  phone?: string
  dateOfBirth?: string
  email: string
  profilePhotoUrl?: string
  onboardingComplete?: boolean
  planName?: string
  planId?: number
  subscriptionEndDate?: string | null
  subscriptionStatus?: string
  subscriptionId?: number
  tenantName?: string
  isEmailVerified?: boolean
  pendingEmail?: string | null
}

// Decode JWT payload without a library (base64url → JSON)
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return {}
    const payload = parts[1] || ''
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}

// POST /api/auth/login
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { email, password })
  const data = response.data

  // Store token + user data
  localStorage.setItem('token', data.token)
  if (data.profilePhotoUrl) {
    localStorage.setItem('profilePhoto', data.profilePhotoUrl)
  }
  // Persist onboarding flag (backend may return it; fallback key per-user)
  if (data.onboardingComplete !== undefined) {
    localStorage.setItem(`onboarding_${data.userId}`, data.onboardingComplete ? '1' : '0')
  }
  localStorage.setItem('user', JSON.stringify({
    userId:            data.userId,
    tenantId:          data.tenantId,
    firstName:         data.firstName,
    lastName:          data.lastName,
    email:             data.email,
    roleTypeName:      data.roleTypeName,
    onboardingComplete: data.onboardingComplete ?? false,
    planName:           data.planName,
    planId:             data.planId,
    subscriptionStatus: data.subscriptionStatus,
    subscriptionId:     data.subscriptionId
  }))

  return data
}

// PATCH /api/auth/profile
export async function updateProfile(firstName: string, middleName: string, lastName: string, phone: string, dateOfBirth: string, profilePhotoUrl: string | null): Promise<void> {
  await api.patch('/auth/profile', { firstName, middleName, lastName, phone, dateOfBirth, profilePhotoUrl })
}

// GET /api/auth/profile
export async function getProfile(): Promise<any> {
  const response = await api.get('/auth/profile')
  return response.data
}

// PATCH /api/auth/onboarding-complete
export async function completeOnboarding(): Promise<void> {
  await api.patch('/auth/onboarding-complete')
}

// POST /api/auth/google
export async function googleLogin(accessToken: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/google', { accessToken })
  const data = response.data
  localStorage.setItem('token', data.token)
  if (data.profilePhotoUrl) localStorage.setItem('profilePhoto', data.profilePhotoUrl)
  if (data.onboardingComplete !== undefined)
    localStorage.setItem(`onboarding_${data.userId}`, data.onboardingComplete ? '1' : '0')
  localStorage.setItem('user', JSON.stringify({
    userId:             data.userId,
    tenantId:           data.tenantId,
    firstName:          data.firstName,
    lastName:           data.lastName,
    email:              data.email,
    roleTypeName:       data.roleTypeName,
    onboardingComplete: data.onboardingComplete ?? false,
    planName:           data.planName,
    planId:             data.planId,
    subscriptionStatus: data.subscriptionStatus,
    subscriptionId:     data.subscriptionId
  }))
  return data
}

// POST /api/auth/register
export async function register(
  email: string,
  password: string,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/register', {
    email, password,
  })
  return response.data
}

// POST /api/auth/onboarding/business-details
export async function saveBusinessDetails(data: any): Promise<void> {
  await api.post('/auth/onboarding/business-details', data)
}

// GET /api/auth/subscription-plans
export async function getSubscriptionPlans(): Promise<any[]> {
  const res = await api.get('/auth/subscription-plans')
  return res.data
}

// POST /api/auth/onboarding/subscribe
export async function subscribeToPlan(planId: number, billingCycle: string): Promise<{ checkoutUrl?: string, message: string }> {
  const res = await api.post('/auth/onboarding/subscribe', { planId, billingCycle })
  return res.data
}

// GET /api/auth/security-status
export async function getSecurityStatus(): Promise<{ isPasswordStrong: boolean; twoFactorEnabled: boolean; passwordChangedAt?: string }> {
  const res = await api.get('/auth/security-status')
  return res.data
}

// POST /api/auth/change-password
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post('/auth/change-password', { currentPassword, newPassword })
  return res.data
}

// POST /api/auth/forgot-password
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await api.post('/auth/forgot-password', { email })
  return res.data
}

// POST /api/auth/verify-reset-otp
export async function verifyResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
  const res = await api.post('/auth/verify-reset-otp', { email, otp })
  return res.data
}

// POST /api/auth/reset-password
export async function resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
  const res = await api.post('/auth/reset-password', { resetToken, newPassword })
  return res.data
}

// GET /api/auth/2fa/setup
export async function twoFactorSetup(): Promise<{ secret: string; otpauthUri: string }> {
  const res = await api.get('/auth/2fa/setup')
  return res.data
}

// POST /api/auth/2fa/enable
export async function twoFactorEnable(code: string): Promise<{ message: string }> {
  const res = await api.post('/auth/2fa/enable', { code })
  return res.data
}

// POST /api/auth/2fa/disable
export async function twoFactorDisable(code: string): Promise<{ message: string }> {
  const res = await api.post('/auth/2fa/disable', { code })
  return res.data
}

// POST /api/auth/2fa/verify
export async function twoFactorVerify(twoFactorToken: string, code: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/2fa/verify', { twoFactorToken, code })
  const data = res.data
  localStorage.setItem('token', data.token)
  if (data.profilePhotoUrl) localStorage.setItem('profilePhoto', data.profilePhotoUrl)
  if (data.onboardingComplete !== undefined)
    localStorage.setItem(`onboarding_${data.userId}`, data.onboardingComplete ? '1' : '0')
  localStorage.setItem('user', JSON.stringify({
    userId:             data.userId,
    tenantId:           data.tenantId,
    firstName:          data.firstName,
    lastName:           data.lastName,
    email:              data.email,
    roleTypeName:       data.roleTypeName,
    onboardingComplete: data.onboardingComplete ?? false,
    planName:           data.planName,
    planId:             data.planId,
    subscriptionStatus: data.subscriptionStatus,
    subscriptionId:     data.subscriptionId
  }))
  return data
}

// Logout — clear all stored data
export function logout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// Get stored user info
export function getStoredUser(): Record<string, unknown> | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// Check if current stored token is still valid (not expired)
export function isTokenValid(): boolean {
  const token = localStorage.getItem('token')
  if (!token) return false
  const payload = decodeJwt(token)
  const exp = payload['exp'] as number | undefined
  if (!exp) return false
  return Date.now() / 1000 < exp
}
