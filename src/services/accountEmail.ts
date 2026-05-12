import api from './api.ts'

export interface EmailStatus {
  email: string
  isEmailVerified: boolean
  emailVerifiedAt: string | null
  pendingEmail: string | null
  resendCooldownSec: number
}

export const getEmailStatus = (): Promise<EmailStatus> =>
  api.get('/account/email/status').then(r => r.data)

export const sendVerificationOtp = (): Promise<{ message: string; target: string }> =>
  api.post('/account/email/send-otp').then(r => r.data)

export const verifyOtp = (code: string): Promise<{ message: string; email: string; isEmailVerified: boolean; emailVerifiedAt: string }> =>
  api.post('/account/email/verify-otp', { code }).then(r => r.data)

export const requestEmailChange = (newEmail: string): Promise<{ message: string; pendingEmail: string }> =>
  api.post('/account/email/change-request', { newEmail }).then(r => r.data)

export const cancelEmailChange = (): Promise<{ message: string }> =>
  api.post('/account/email/cancel-change').then(r => r.data)
