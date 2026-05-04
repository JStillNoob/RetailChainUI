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
  tenantName?: string
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
    planName:          data.planName,
    planId:            data.planId
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
