import api from './api.ts'

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
