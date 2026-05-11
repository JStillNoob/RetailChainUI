import api from './api.ts'

export const getForecast = () =>
  api.get('/warehouse/inventory/forecast').then(r => r.data)

export const getProductForecast = (productId: number) =>
  api.get(`/warehouse/inventory/forecast/${productId}`).then(r => r.data)

export const generateForecast = () =>
  api.post('/warehouse/inventory/forecast/generate').then(r => r.data)

export const backfillForecastActuals = () =>
  api.post('/warehouse/inventory/forecast/backfill').then(r => r.data)

export const overrideForecast = (id: number, forecastedQty: number, note: string) =>
  api.patch(`/warehouse/inventory/forecast/${id}/override`, { forecastedQty, note }).then(r => r.data)

export const getReorderRecommendations = (params?: { status?: string; branchId?: number }) =>
  api.get('/warehouse/inventory/reorder', { params }).then(r => r.data)

export const updateReorderStatus = (id: number, status: string) =>
  api.patch(`/warehouse/inventory/reorder/${id}/status`, { status }).then(r => r.data)

export const createPoFromRecommendation = (id: number, supplierId: number, expectedDate?: string) =>
  api.post(`/warehouse/inventory/reorder/${id}/create-po`, { supplierId, expectedDate: expectedDate || null }).then(r => r.data)
