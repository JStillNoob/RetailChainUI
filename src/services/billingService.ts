import api from './api.ts'

export const getBillingSubscription = () =>
  api.get('/tenant/billing/subscription').then(r => r.data)

export const getBillingPlans = () =>
  api.get('/tenant/billing/plans').then(r => r.data)

export const getBillingHistory = () =>
  api.get('/tenant/billing/history').then(r => r.data)

export const requestRenewal = (billingCycle?: string) =>
  api.post('/tenant/billing/request-renewal', { billingCycle }).then(r => r.data)

export const confirmRenewal = (subscriptionId: number, billingCycle: string) =>
  api.post('/tenant/billing/confirm-renewal', { subscriptionId, billingCycle }).then(r => r.data)

export const requestPlanChange = (newPlanId: number, billingCycle?: string) =>
  api.post('/tenant/billing/request-plan-change', { newPlanId, billingCycle }).then(r => r.data)

export const confirmPlanChange = (subscriptionId: number, newPlanId: number, billingCycle?: string) =>
  api.post('/tenant/billing/confirm-plan-change', { subscriptionId, newPlanId, billingCycle }).then(r => r.data)

export const cancelPlanChange = () =>
  api.delete('/tenant/billing/cancel-plan-change').then(r => r.data)
