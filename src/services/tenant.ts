import api from './api.ts'

// ── Products ─────────────────────────────────────────────────────────────────
export const getProducts = (params: Record<string, unknown> = {}) =>
  api.get('/tenant/products', { params }).then(r => r.data)

export const createProduct = (data: object) =>
  api.post('/tenant/products', data).then(r => r.data)

export const updateProduct = (id: number, data: object) =>
  api.put(`/tenant/products/${id}`, data).then(r => r.data)

export const deleteProduct = (id: number) =>
  api.delete(`/tenant/products/${id}`).then(r => r.data)

// ── Attribute Templates (per tenant's store type) ────────────────────────────
// Returns the list of Prod_Attr_Template rows for this tenant's store type
export const getProductAttrTemplates = () =>
  api.get('/tenant/product-attr-templates').then(r => r.data)

// ── Attribute Values ─────────────────────────────────────────────────────────
export const getProductAttrValues = (productId: number) =>
  api.get(`/tenant/products/${productId}/attr-values`).then(r => r.data)

export const saveProductAttrValues = (productId: number, values: object[]) =>
  api.post(`/tenant/products/${productId}/attr-values`, { values }).then(r => r.data)

// ── Inventory / Stock In ─────────────────────────────────────────────────────
export const getInventory = (params: Record<string, unknown> = {}) =>
  api.get('/warehouse/inventory', { params }).then(r => r.data)

export const stockIn = (data: { productId: number; quantity: number; note?: string; location?: string; branchId?: number }) =>
  api.post('/warehouse/inventory/adjust', { ...data, adjustmentType: 'StockIn' }).then(r => r.data)

// ── Branches ─────────────────────────────────────────────────────────────────
export const getBranches = () =>
  api.get('/tenant/branches').then(r => r.data)

export const createBranch = (data: { branchName: string; address?: string }) =>
  api.post('/tenant/branches', data).then(r => r.data)

export const updateBranch = (id: number, data: { branchName: string; address?: string; status?: string }) =>
  api.put(`/tenant/branches/${id}`, data).then(r => r.data)

export const deleteBranch = (id: number) =>
  api.delete(`/tenant/branches/${id}`).then(r => r.data)

export const getBranchInventory = (branchId: number, lowStock?: boolean) =>
  api.get(`/tenant/branches/${branchId}/inventory`, { params: { lowStock } }).then(r => r.data)

export const getBranchStockOverview = () =>
  api.get('/tenant/branches/stock-overview').then(r => r.data)

export const addProductToBranch = (branchId: number, data: { productId: number; initialQty?: number; minQty?: number }) =>
  api.post(`/tenant/branches/${branchId}/inventory`, data).then(r => r.data)

export const setMinQty = (branchId: number, inventoryId: number, minQty: number) =>
  api.patch(`/tenant/branches/${branchId}/inventory/${inventoryId}/min-qty`, { minQty }).then(r => r.data)

// ── Suppliers ────────────────────────────────────────────────────────────────
export const getSuppliers = () =>
  api.get('/tenant/suppliers').then(r => r.data)
