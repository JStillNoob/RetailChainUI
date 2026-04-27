import api from './api.ts'

export const getForecast = () =>
  api.get('/warehouse/inventory/forecast').then(r => r.data)

export const getProductForecast = (productId: number) =>
  api.get(`/warehouse/inventory/forecast/${productId}`).then(r => r.data)

// POST /api/warehouse/inventory/forecast/generate
// Computes 3-month moving average for all tenant products and saves to DemandForecast
export const generateForecast = () =>
  api.post('/warehouse/inventory/forecast/generate').then(r => r.data)
