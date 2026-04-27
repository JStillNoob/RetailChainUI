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
