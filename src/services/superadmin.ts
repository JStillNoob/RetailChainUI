import api from './api.ts'

// ── Tenants ────────────────────────────────────────────────────────────────
export const getTenants = (page = 1, pageSize = 20, search = '') =>
  api.get('/superadmin/tenants', { params: { page, pageSize, search } }).then(r => r.data)

export const getTenant = (id: number) =>
  api.get(`/superadmin/tenants/${id}`).then(r => r.data)

export const updateTenantStatus = (id: number, status: string) =>
  api.put(`/superadmin/tenants/${id}/status`, { status }).then(r => r.data)

export const deleteTenant = (id: number) =>
  api.delete(`/superadmin/tenants/${id}`).then(r => r.data)

// ── Subscription Plans ─────────────────────────────────────────────────────
export const getPlans = () =>
  api.get('/superadmin/plans').then(r => r.data)

export const createPlan = (data: object) =>
  api.post('/superadmin/plans', data).then(r => r.data)

export const updatePlan = (id: number, data: object) =>
  api.put(`/superadmin/plans/${id}`, data).then(r => r.data)

export const deletePlan = (id: number) =>
  api.delete(`/superadmin/plans/${id}`).then(r => r.data)

// ── Subscriptions ──────────────────────────────────────────────────────────
export const getSubscriptions = (status?: string) =>
  api.get('/superadmin/subscriptions', { params: { status } }).then(r => r.data)

export const changeSubscriptionPlan = (id: number, planId: number) =>
  api.put(`/superadmin/subscriptions/${id}/plan`, { planId }).then(r => r.data)

// ── Store Types ────────────────────────────────────────────────────────────
export const getStoreTypes = (includeArchived: boolean = false) =>
  api.get('/superadmin/store-types', { params: { includeArchived } }).then(r => r.data)

export const createStoreType = (data: object) =>
  api.post('/superadmin/store-types', data).then(r => r.data)

export const updateStoreType = (id: number, data: object) =>
  api.put(`/superadmin/store-types/${id}`, data).then(r => r.data)

export const deleteStoreType = (id: number) =>
  api.delete(`/superadmin/store-types/${id}`).then(r => r.data)

export const archiveStoreType = (id: number) =>
  api.patch(`/superadmin/store-types/${id}/archive`).then(r => r.data)

export const getStoreTypeTemplates = (id: number) =>
  api.get(`/superadmin/store-types/${id}/templates`).then(r => r.data)

export const createTemplate = (storeTypeId: number, data: object) =>
  api.post(`/superadmin/store-types/${storeTypeId}/templates`, data).then(r => r.data)

export const deleteTemplate = (storeTypeId: number, templateId: number) =>
  api.delete(`/superadmin/store-types/${storeTypeId}/templates/${templateId}`).then(r => r.data)

// ── Analytics ─────────────────────────────────────────────────────────────
export const getAnalyticsOverview = () =>
  api.get('/superadmin/analytics/overview').then(r => r.data)

export const getRevenueData = () =>
  api.get('/superadmin/analytics/revenue').then(r => r.data)

export const getActiveTenants = () =>
  api.get('/superadmin/analytics/active-tenants').then(r => r.data)

// ── Notifications ──────────────────────────────────────────────────────────
export const getNotifications = (page = 1, pageSize = 30) =>
  api.get('/superadmin/notifications', { params: { page, pageSize } }).then(r => r.data)

export const broadcastNotification = (type: string, message: string) =>
  api.post('/superadmin/notifications/broadcast', { type, message }).then(r => r.data)

// ── Audit Logs ─────────────────────────────────────────────────────────────
export const getAuditLogs = (params: Record<string, unknown> = {}) =>
  api.get('/superadmin/audit-logs', { params }).then(r => r.data)

// ── Admin Accounts ─────────────────────────────────────────────────────────
export const getAdmins = () =>
  api.get('/superadmin/admins').then(r => r.data)

export const createAdmin = (data: object) =>
  api.post('/superadmin/admins', data).then(r => r.data)

export const updateAdmin = (id: number, data: object) =>
  api.put(`/superadmin/admins/${id}`, data).then(r => r.data)

export const deleteAdmin = (id: number) =>
  api.delete(`/superadmin/admins/${id}`).then(r => r.data)
