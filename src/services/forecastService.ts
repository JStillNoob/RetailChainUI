import api from './api.ts'

// ── PDF Exports ─────────────────────────────────────────────────────────────

async function downloadPdf(url: string, params: Record<string, string | undefined>, fallbackName: string): Promise<void> {
  const response = await api.get(url, { params, responseType: 'blob' })
  const blob     = new Blob([response.data], { type: 'application/pdf' })
  const blobUrl  = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href = blobUrl
  const cd: string = response.headers['content-disposition'] ?? ''
  const match      = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd)
  const date       = new Date().toISOString().split('T')[0]
  a.download = match?.[1]?.replace(/['"]/g, '') ?? `${fallbackName}_${date}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

export const exportInventoryPdf = (params?: { lowStock?: string; search?: string }) =>
  downloadPdf('/warehouse/reports/export/inventory', params ?? {}, 'Inventory_Status')

export const exportForecastPdf = (search?: string) =>
  downloadPdf('/warehouse/reports/export/forecast', search ? { search } : {}, 'Demand_Forecast')

export const exportReordersPdf = (status?: string) =>
  downloadPdf('/warehouse/reports/export/reorders', status ? { status } : {}, 'Reorder_Recommendations')

export const exportSalesHistoryPdf = (params?: { date?: string; branchId?: string }) =>
  downloadPdf('/cashier/reports/export/sales-history', params ?? {}, 'Sales_History')

// ── Data fetchers ────────────────────────────────────────────────────────────

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
