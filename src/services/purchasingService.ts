import api from './api.ts'

export const getPurchaseQueue = () =>
  api.get('/purchasing/queue').then(r => r.data)

export const getSuppliers = () =>
  api.get('/purchasing/suppliers').then(r => r.data)

export const createPurchaseOrder = (data: {
  supplierId: number
  recommendationIds: number[]
  expectedDate?: string
  notes?: string
}) => api.post('/purchasing/orders', data).then(r => r.data)

export const getPurchaseOrders = (status?: string) =>
  api.get('/purchasing/orders', { params: status ? { status } : undefined }).then(r => r.data)

export const getPurchaseOrder = (id: number) =>
  api.get(`/purchasing/orders/${id}`).then(r => r.data)

export const confirmPurchaseOrder = (id: number) =>
  api.post(`/purchasing/orders/${id}/confirm`).then(r => r.data)

export const receivePurchaseOrder = (id: number, data: { carrierId?: number; trackingNo?: string }) =>
  api.post(`/purchasing/orders/${id}/receive`, data).then(r => r.data)

export const cancelPurchaseOrder = (id: number) =>
  api.delete(`/purchasing/orders/${id}`).then(r => r.data)
