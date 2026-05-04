import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as authLogin, logout as authLogout, getStoredUser, isTokenValid, completeOnboarding as apiCompleteOnboarding, getProfile } from '../services/auth.ts'
import type { LoginResponse } from '../services/auth.ts'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const token        = ref<string | null>(localStorage.getItem('token'))
  const userId       = ref<number | null>(null)
  const tenantId     = ref<number | null>(null)
  const firstName    = ref<string>('')
  const middleName   = ref<string>('')
  const lastName     = ref<string>('')
  const phone        = ref<string>('')
  const dateOfBirth  = ref<string>('')
  const email        = ref<string>('')
  const roleTypeName = ref<string>('')
  const planName     = ref<string>('No Plan')
  const planId       = ref<number>(0)
  const tenantName   = ref<string>('')

  // Personal profile photo (all users)
  const profilePhoto = ref<string | null>(localStorage.getItem('profilePhoto') || null)

  // Company/Tenant logo shown in the sidebar brand area (set by TenantAdmin)
  const companyLogo  = ref<string | null>(localStorage.getItem('companyLogo') || null)

  // Company display name (TenantAdmin can set this)
  const companyName  = ref<string>(localStorage.getItem('companyName') || '')

  // System logo — used on the landing page AND the SuperAdmin dark sidebar (SuperAdmin only)
  const systemLogo   = ref<string | null>(localStorage.getItem('systemLogo') || null)

  // Onboarding wizard flag — tracked per user id so different accounts don't collide
  const onboardingComplete = ref<boolean>(false)

  // ── Hydrate from localStorage on store init ────────────────────────────────
  function hydrate() {
    const stored = getStoredUser()
    if (stored && isTokenValid()) {
      userId.value       = stored.userId       as number
      tenantId.value     = stored.tenantId     as number
      firstName.value    = stored.firstName    as string
      middleName.value   = (stored.middleName as string) || ''
      lastName.value     = stored.lastName     as string
      phone.value        = (stored.phone as string) || ''
      dateOfBirth.value  = (stored.dateOfBirth as string) || ''
      email.value        = stored.email        as string
      roleTypeName.value = stored.roleTypeName as string
      planName.value     = (stored.planName    as string) || 'No Plan'
      planId.value       = (stored.planId      as number) || 0
      // Resolve onboarding flag: stored user object first, then per-user key
      const perUserKey = `onboarding_${stored.userId}`
      const raw = localStorage.getItem(perUserKey)
      onboardingComplete.value = raw === '1'
        || (stored.onboardingComplete as boolean | undefined) === true
      tenantName.value = (stored.tenantName as string) || ''
      
      // Update companyName if tenantName is set and not empty
      if (tenantName.value) {
        companyName.value = tenantName.value
        localStorage.setItem('companyName', tenantName.value)
      }
    } else {
      // Token expired or missing — clear everything
      authLogout()
      token.value = null
    }
  }
  hydrate()

  // ── Getters ────────────────────────────────────────────────────────────────
  const isLoggedIn   = computed(() => !!token.value && isTokenValid())
  const isSuperAdmin = computed(() => roleTypeName.value === 'SuperAdmin')
  const isTenantAdmin = computed(() => roleTypeName.value === 'TenantAdmin')
  const fullName     = computed(() => [firstName.value, middleName.value, lastName.value].filter(Boolean).join(' '))
  const initials     = computed(() => {
    const f = firstName.value?.[0] ?? ''
    const l = lastName.value?.[0]  ?? ''
    return (f + l).toUpperCase() || 'U'
  })

  // ── Actions ────────────────────────────────────────────────────────────────
  async function login(emailVal: string, password: string): Promise<LoginResponse> {
    const data = await authLogin(emailVal, password)
    token.value        = data.token
    userId.value       = data.userId
    tenantId.value     = data.tenantId
    firstName.value    = data.firstName
    middleName.value   = data.middleName || ''
    lastName.value     = data.lastName
    phone.value        = data.phone || ''
    dateOfBirth.value  = data.dateOfBirth || ''
    email.value        = data.email
    roleTypeName.value = data.roleTypeName
    planName.value     = data.planName || 'No Plan'
    planId.value       = data.planId || 0
    profilePhoto.value = data.profilePhotoUrl || null
    onboardingComplete.value = data.onboardingComplete ?? false
    tenantName.value   = data.tenantName || ''
    if (tenantName.value) {
      companyName.value = tenantName.value
      localStorage.setItem('companyName', tenantName.value)
    }
    return data
  }

  async function markOnboardingComplete() {
    onboardingComplete.value = true
    if (userId.value) {
      localStorage.setItem(`onboarding_${userId.value}`, '1')
    }
    const stored = getStoredUser()
    if (stored) {
      localStorage.setItem('user', JSON.stringify({ ...stored, onboardingComplete: true }))
    }
    
    try {
      await apiCompleteOnboarding()
    } catch (err) {
      console.error('Failed to notify backend of onboarding completion', err)
    }
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      const data = await getProfile()
      firstName.value    = data.firstName || ''
      middleName.value   = data.middleName || ''
      lastName.value     = data.lastName || ''
      phone.value        = data.phone || ''
      dateOfBirth.value  = data.dateOfBirth || ''
      email.value        = data.email || ''
      roleTypeName.value = data.roleTypeName || ''
      planName.value     = data.planName || 'No Plan'
      planId.value       = data.planId || 0
      profilePhoto.value = data.profilePhotoUrl || null
      onboardingComplete.value = data.onboardingComplete ?? false
      tenantId.value     = data.tenantId
      tenantName.value   = data.tenantName || ''
      if (tenantName.value) {
        companyName.value = tenantName.value
        localStorage.setItem('companyName', tenantName.value)
      }

      const stored = getStoredUser()
      if (stored) {
        localStorage.setItem('user', JSON.stringify({
          ...stored,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          planName: data.planName,
          planId: data.planId,
          onboardingComplete: data.onboardingComplete,
          tenantName: data.tenantName
        }))
      }
    } catch (err) {
      console.error('Failed to fetch profile', err)
    }
  }

  function logout() {
    authLogout()
    token.value        = null
    userId.value       = null
    tenantId.value     = null
    firstName.value    = ''
    middleName.value   = ''
    lastName.value     = ''
    phone.value        = ''
    dateOfBirth.value  = ''
    email.value        = ''
    roleTypeName.value = ''
    planName.value     = 'No Plan'
    planId.value       = 0
    profilePhoto.value = null
    companyLogo.value  = null
    companyName.value  = ''
    onboardingComplete.value = false
    // NOTE: systemLogo intentionally NOT cleared on logout — it's a global system setting
    localStorage.removeItem('profilePhoto')
    localStorage.removeItem('companyLogo')
    localStorage.removeItem('companyName')
  }

  return {
    // State
    token, userId, tenantId, firstName, middleName, lastName, phone, dateOfBirth, email, roleTypeName,
    profilePhoto, companyLogo, companyName, systemLogo, onboardingComplete,
    planName, planId,
    // Getters
    isLoggedIn, isSuperAdmin, isTenantAdmin, fullName, initials,
    // Actions
    login, logout, markOnboardingComplete, fetchProfile,
  }
})
