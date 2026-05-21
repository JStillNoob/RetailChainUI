import api from './api.ts'

// ── PDF Export ──────────────────────────────────────────────────────────────

type ReportType = 'sales' | 'top-products' | 'inventory' | 'suppliers' | 'procurement' | 'audit-logs' | 'analytics'

const reportLabels: Record<ReportType, string> = {
  'sales':        'Sales_Report',
  'top-products': 'Top_Products',
  'inventory':    'Inventory_Status',
  'suppliers':    'Supplier_Performance',
  'procurement':  'Procurement_Cost',
  'audit-logs':   'Audit_Log',
  'analytics':    'Analytics_Report',
}

export async function exportReportPdf(
  type: ReportType,
  params?: Record<string, string>,
): Promise<void> {
  const response = await api.get(`/tenant/reports/export/${type}`, {
    params,
    responseType: 'blob',
  })

  const blob    = new Blob([response.data], { type: 'application/pdf' })
  const blobUrl = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href = blobUrl

  // Use server-supplied filename when CORS exposes Content-Disposition, otherwise fallback
  const cd: string  = response.headers['content-disposition'] ?? ''
  const match       = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd)
  const date        = new Date().toISOString().split('T')[0]
  a.download = match?.[1]?.replace(/['"]/g, '') ?? `${reportLabels[type]}_${date}.pdf`

  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

// ── Analytics ───────────────────────────────────────────────────────────────

export const getSalesByMonth = () =>
  api.get('/tenant/analytics/sales-by-month').then(r => r.data)

export const getTopProducts = () =>
  api.get('/tenant/analytics/top-products').then(r => r.data)

export const getInventoryStatus = () =>
  api.get('/tenant/analytics/inventory-status').then(r => r.data)

export const getSupplierPerformance = () =>
  api.get('/tenant/analytics/supplier-performance').then(r => r.data)

export const getProcurementCost = () =>
  api.get('/tenant/analytics/procurement-cost').then(r => r.data)

export const getDashboardKpis = (branchId?: number) =>
  api.get('/tenant/analytics/dashboard-kpis', { params: branchId ? { branchId } : {} }).then(r => r.data)

export const getDailySales = (days = 30, branchId?: number) =>
  api.get('/tenant/analytics/daily-sales', { params: { days, ...(branchId ? { branchId } : {}) } }).then(r => r.data)

export const getBranchSales = () =>
  api.get('/tenant/analytics/branch-sales').then(r => r.data)

export const getInventoryByBranch = () =>
  api.get('/tenant/analytics/inventory-by-branch').then(r => r.data)

export const getSalesHeatmap = () =>
  api.get('/tenant/analytics/sales-heatmap').then(r => r.data)

export const getForecastMonthly = () =>
  api.get('/tenant/analytics/forecast-monthly').then(r => r.data)
