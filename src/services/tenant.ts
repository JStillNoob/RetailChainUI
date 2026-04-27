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
