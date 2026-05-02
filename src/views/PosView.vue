<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, computed, onMounted, nextTick } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'PosView' })

const { confirmDialog } = useConfirm()
const { toast } = useToast()

interface ApiProduct {
  productId:   number
  productName: string
  sku:         string
  unitPrice:   number
  qtyOnHand:   number
  inStock:     boolean
}

interface CartItem {
  productId:   number
  productName: string
  sku:         string
  unitPrice:   number
  quantity:    number
  qtyOnHand:   number
}

const products      = ref<ApiProduct[]>([])
const prodSearch    = ref('')
const prodLoading   = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

async function searchProducts() {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(async () => {
    prodLoading.value = true
    try {
      const params: Record<string, string> = {}
      if (prodSearch.value) params.search = prodSearch.value
      products.value = await api.get('/cashier/products', { params }).then(r => r.data)
    } catch { toast('Failed to load products.', 'error') }
    finally { prodLoading.value = false }
  }, 300)
}
onMounted(searchProducts)

// ── Cart ────────────────────────────────────────────────────────────────────
const cart         = ref<CartItem[]>([])
const customerName = ref('')

function addToCart(p: ApiProduct) {
  if (!p.inStock) { toast('Product is out of stock.', 'error'); return }
  const existing = cart.value.find(c => c.productId === p.productId)
  if (existing) {
    if (existing.quantity >= p.qtyOnHand) { toast('No more stock available.', 'error'); return }
    existing.quantity++
  } else {
    cart.value.push({
      productId:   p.productId,
      productName: p.productName,
      sku:         p.sku,
      unitPrice:   Number(p.unitPrice),
      quantity:    1,
      qtyOnHand:   Number(p.qtyOnHand),
    })
  }
}

function increment(item: CartItem) {
  if (item.quantity >= item.qtyOnHand) { toast('No more stock available.', 'error'); return }
  item.quantity++
}
function decrement(item: CartItem, idx: number) {
  if (item.quantity > 1) item.quantity--
  else cart.value.splice(idx, 1)
}
function removeFromCart(idx: number) { cart.value.splice(idx, 1) }
function clearCart() {
  if (cart.value.length === 0) return
  if (await confirmDialog('Clear the cart?')) { cart.value = []; customerName.value = '' }
}

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.unitPrice * i.quantity, 0))
const cartCount = computed(() => cart.value.reduce((s, i) => s + i.quantity, 0))

const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)

// ── Payment ─────────────────────────────────────────────────────────────────
const showPayment = ref(false)
const tendered    = ref('')
const processing  = ref(false)
const payErr      = ref('')

const change = computed(() => (parseFloat(tendered.value) || 0) - cartTotal.value)

function openPayment() {
  if (cart.value.length === 0) { toast('Cart is empty.', 'error'); return }
  tendered.value = ''
  payErr.value   = ''
  showPayment.value = true
}

function keypadInput(key: string) {
  if (key === 'C')      { tendered.value = ''; return }
  if (key === '⌫')      { tendered.value = tendered.value.slice(0, -1); return }
  if (key === 'EXACT')  { tendered.value = cartTotal.value.toFixed(2); return }
  if (key === '.' && tendered.value.includes('.')) return
  if (tendered.value === '0' && key !== '.') tendered.value = ''
  tendered.value += key
}

interface Receipt {
  transactionId: number
  transactionDate: string
  customerName: string
  items: CartItem[]
  total: number
  tendered: number
  changeAmount: number
}
const receipt     = ref<Receipt | null>(null)
const showReceipt = ref(false)

async function processPayment() {
  payErr.value = ''
  const tenderedAmt = parseFloat(tendered.value) || 0
  if (tenderedAmt < cartTotal.value) { payErr.value = 'Amount tendered is less than total.'; return }
  processing.value = true
  try {
    const res = await api.post('/cashier/sales', {
      methodId: null,
      amountTendered: tenderedAmt,
      items: cart.value.map(c => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
    })
    receipt.value = {
      transactionId:   res.data.transactionId,
      transactionDate: new Date().toISOString(),
      customerName:    customerName.value.trim(),
      items:           cart.value.map(c => ({ ...c })),
      total:           cartTotal.value,
      tendered:        tenderedAmt,
      changeAmount:    Number(res.data.changeAmount ?? (tenderedAmt - cartTotal.value)),
    }
    showPayment.value = false
    showReceipt.value = true
    cart.value         = []
    customerName.value = ''
    toast('Sale complete.')
    await searchProducts()
  } catch (e: any) {
    payErr.value = e.response?.data?.message ?? 'Transaction failed.'
  } finally {
    processing.value = false
  }
}

// ── Receipt: print + download ───────────────────────────────────────────────
function buildReceiptText(r: Receipt): string {
  const lines: string[] = []
  lines.push('────────────  RECEIPT  ────────────')
  lines.push(`Transaction #: ${r.transactionId}`)
  lines.push(`Date: ${new Date(r.transactionDate).toLocaleString('en-PH')}`)
  if (r.customerName) lines.push(`Customer: ${r.customerName}`)
  lines.push('-----------------------------------')
  for (const i of r.items) {
    lines.push(`${i.productName} (${i.sku || '—'})`)
    lines.push(`   ${i.quantity} × ${phpFmt(i.unitPrice)}  =  ${phpFmt(i.quantity * i.unitPrice)}`)
  }
  lines.push('-----------------------------------')
  lines.push(`Total      : ${phpFmt(r.total)}`)
  lines.push(`Tendered   : ${phpFmt(r.tendered)}`)
  lines.push(`Change     : ${phpFmt(r.changeAmount)}`)
  lines.push('===================================')
  lines.push('Thank you!')
  return lines.join('\n')
}

async function printReceipt() {
  document.body.classList.add('pos-printing')
  await nextTick()
  window.print()
  document.body.classList.remove('pos-printing')
}

function downloadReceipt() {
  if (!receipt.value) return
  const text = buildReceiptText(receipt.value)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `receipt-${receipt.value.transactionId}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="pos-shell">

    <!-- Top bar -->
    <div class="pos-topbar">
      <div class="flex items-center gap-3">
        <i class="ph ph-cash-register text-2xl text-blue-300"></i>
        <div>
          <div class="text-lg font-black text-white tracking-wide">Cashiering</div>
          <div class="text-xs text-slate-400">Sell products and complete transactions</div>
        </div>
      </div>
      <div class="text-xs text-slate-400">
        {{ cartCount }} item{{ cartCount === 1 ? '' : 's' }} in cart
      </div>
    </div>

    <div class="pos-grid">

      <!-- ── Left: product search grid ── -->
      <div class="pos-panel">
        <div class="flex items-center gap-3 mb-4">
          <div class="pos-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="prodSearch" placeholder="Search products by name or SKU…" @input="searchProducts" />
          </div>
          <button @click="searchProducts" class="pos-icon-btn" :disabled="prodLoading" title="Refresh">
            <i :class="prodLoading ? 'ph ph-spinner animate-spin' : 'ph ph-arrows-clockwise'"></i>
          </button>
        </div>

        <div v-if="prodLoading" class="flex items-center justify-center py-20">
          <i class="ph ph-spinner animate-spin text-3xl text-blue-500"></i>
        </div>
        <div v-else-if="products.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
          <i class="ph ph-package text-5xl text-slate-200"></i>
          <p class="text-sm">No products found.</p>
        </div>
        <div v-else class="pos-product-grid">
          <button
            v-for="p in products" :key="p.productId"
            type="button"
            @click="addToCart(p)"
            :class="['pos-product-tile', !p.inStock && 'pos-product-tile--disabled']"
            :disabled="!p.inStock">
            <div class="text-base font-extrabold text-slate-900 leading-tight line-clamp-2">{{ p.productName }}</div>
            <div class="text-xs text-slate-400 mt-0.5">{{ p.sku || '—' }}</div>
            <div class="flex items-end justify-between mt-3">
              <div class="text-xl font-black text-blue-600">{{ phpFmt(p.unitPrice) }}</div>
              <span :class="['ps-tag', p.inStock ? 'ps-tag-green' : 'ps-tag-red']" style="font-size: 11px;">
                {{ p.inStock ? `${Number(p.qtyOnHand).toLocaleString()} in stock` : 'Out of stock' }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- ── Right: cart ── -->
      <div class="pos-panel pos-cart">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-black text-slate-900 uppercase tracking-wider">Cart</div>
          <button v-if="cart.length" @click="clearCart" class="pos-clear-btn">
            <i class="ph ph-trash"></i> Clear
          </button>
        </div>

        <label class="ps-label">Customer Name (optional)</label>
        <input v-model="customerName" placeholder="Walk-in customer" class="pos-customer-input" />

        <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 py-8">
          <i class="ph ph-shopping-cart text-5xl text-slate-200"></i>
          <p class="text-sm">Cart is empty.</p>
          <p class="text-xs">Tap a product to add it.</p>
        </div>

        <div v-else class="flex-1 flex flex-col overflow-y-auto min-h-0 mt-3 pr-1">
          <div v-for="(item, i) in cart" :key="item.productId" class="pos-cart-row">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-extrabold text-slate-900 truncate">{{ item.productName }}</div>
              <div class="text-xs text-slate-400">{{ phpFmt(item.unitPrice) }} each</div>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="pos-qty-btn" @click="decrement(item, i)"><i class="ph ph-minus"></i></button>
              <span class="text-base font-black text-slate-900 w-7 text-center">{{ item.quantity }}</span>
              <button class="pos-qty-btn" @click="increment(item)"><i class="ph ph-plus"></i></button>
            </div>
            <div class="text-sm font-black text-slate-900 min-w-[80px] text-right">
              {{ phpFmt(item.unitPrice * item.quantity) }}
            </div>
            <button class="pos-remove-btn" @click="removeFromCart(i)" aria-label="Remove">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>

        <div class="border-t-2 border-dashed border-slate-200 pt-4 mt-3">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-extrabold text-slate-500 uppercase tracking-wider">Total</span>
            <span class="text-3xl font-black text-slate-900">{{ phpFmt(cartTotal) }}</span>
          </div>
          <button @click="openPayment" :disabled="cart.length === 0" class="pos-pay-btn">
            <i class="ph ph-cash-register text-xl"></i> Process Payment
          </button>
        </div>
      </div>
    </div>

    <!-- ── Payment Modal ── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showPayment" class="ps-modal-backdrop" @click.self="showPayment = false">
          <div class="ps-modal-card" style="max-width: 460px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Payment</h3>
              <button class="ps-modal-close" @click="showPayment = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="bg-slate-900 rounded-xl p-5 text-center">
                <div class="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Amount Due</div>
                <div class="text-4xl font-black text-white mt-1">{{ phpFmt(cartTotal) }}</div>
              </div>
              <div>
                <label class="ps-label">Amount Tendered (₱) *</label>
                <input v-model="tendered" type="number" min="0" step="0.01" placeholder="0.00"
                  class="ps-input pos-tendered-input" />
              </div>

              <!-- Numeric keypad -->
              <div class="pos-keypad">
                <button v-for="k in ['7','8','9','4','5','6','1','2','3','0','.','⌫']"
                  :key="k" type="button" class="pos-keypad-btn" @click="keypadInput(k)">
                  <span v-if="k === '⌫'"><i class="ph ph-backspace"></i></span>
                  <span v-else>{{ k }}</span>
                </button>
                <button type="button" class="pos-keypad-btn pos-keypad-btn--accent col-span-3"
                  @click="keypadInput('EXACT')">Exact ({{ phpFmt(cartTotal) }})</button>
              </div>

              <div v-if="parseFloat(tendered) >= cartTotal && parseFloat(tendered) > 0"
                class="text-center text-lg font-black text-green-600">
                Change: {{ phpFmt(change) }}
              </div>
              <div v-if="payErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ payErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showPayment = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="processing" @click="processPayment">
                <i v-if="processing" class="ph ph-spinner animate-spin"></i>
                {{ processing ? 'Processing…' : 'Complete Sale' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Receipt Modal ── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showReceipt && receipt" class="ps-modal-backdrop" @click.self="showReceipt = false">
          <div class="ps-modal-card" style="max-width: 420px">
            <div class="ps-modal-header">
              <div class="flex items-center gap-2">
                <i class="ph ph-check-circle text-green-500 text-xl"></i>
                <h3 class="ps-modal-title">Sale Complete!</h3>
              </div>
              <button class="ps-modal-close" @click="showReceipt = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>

            <!-- Printable receipt area -->
            <div id="pos-receipt" class="ps-modal-body">
              <div class="text-center">
                <div class="text-base font-black text-slate-900">RECEIPT</div>
                <div class="text-xs text-slate-500 mt-0.5">
                  Transaction #{{ receipt.transactionId }}
                </div>
                <div class="text-xs text-slate-400">
                  {{ new Date(receipt.transactionDate).toLocaleString('en-PH') }}
                </div>
                <div v-if="receipt.customerName" class="text-xs text-slate-600 mt-1">
                  Customer: <strong>{{ receipt.customerName }}</strong>
                </div>
              </div>

              <div class="border-t border-dashed border-slate-300 pt-3 flex flex-col gap-2">
                <div v-for="item in receipt.items" :key="item.productId" class="text-sm">
                  <div class="flex justify-between font-bold text-slate-800">
                    <span>{{ item.productName }}</span>
                    <span>{{ phpFmt(item.unitPrice * item.quantity) }}</span>
                  </div>
                  <div class="text-xs text-slate-500">
                    {{ item.quantity }} × {{ phpFmt(item.unitPrice) }}
                  </div>
                </div>
              </div>

              <div class="border-t border-dashed border-slate-300 pt-3 flex flex-col gap-1.5">
                <div class="flex justify-between text-base font-black text-slate-900">
                  <span>Total</span><strong>{{ phpFmt(receipt.total) }}</strong>
                </div>
                <div class="flex justify-between text-sm text-slate-500">
                  <span>Tendered</span><span>{{ phpFmt(receipt.tendered) }}</span>
                </div>
                <div class="flex justify-between text-base font-black text-green-600">
                  <span>Change</span><strong>{{ phpFmt(receipt.changeAmount) }}</strong>
                </div>
              </div>

              <div class="text-center text-xs text-slate-400 mt-2">— Thank you —</div>
            </div>

            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="downloadReceipt">
                <i class="ph ph-download-simple"></i> Download
              </button>
              <button class="ps-btn ps-btn-outline" @click="printReceipt">
                <i class="ph ph-printer"></i> Print
              </button>
              <button class="ps-btn ps-btn-primary" @click="showReceipt = false">New Sale</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Distinct full-screen POS look — dark frame, light interior panels */
.pos-shell {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  border-radius: 18px;
  padding: 18px;
  margin: -8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: calc(100vh - 90px);
}

.pos-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 0;
}

.pos-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 14px;
  flex: 1;
  min-height: 0;
}
@media (max-width: 980px) {
  .pos-grid { grid-template-columns: 1fr; }
}

.pos-panel {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pos-cart {
  display: flex;
  flex-direction: column;
}

.pos-search {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 0 14px;
  height: 56px;
}
.pos-search i {
  font-size: 20px;
  color: #64748b;
  margin-right: 10px;
}
.pos-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
.pos-search input::placeholder { color: #94a3b8; font-weight: 500; }

.pos-icon-btn {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.pos-icon-btn:hover { background: #e2e8f0; }
.pos-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.pos-product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  padding: 2px;
}

.pos-product-tile {
  text-align: left;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pos-product-tile:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(59,130,246,0.18);
}
.pos-product-tile--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f8fafc;
}
.pos-product-tile--disabled:hover {
  transform: none;
  border-color: #e2e8f0;
  background: #f8fafc;
  box-shadow: none;
}

.pos-customer-input {
  width: 100%;
  height: 44px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
  margin-top: 4px;
  margin-bottom: 8px;
}
.pos-customer-input:focus { border-color: #3b82f6; }

.pos-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #ef4444;
  padding: 6px 10px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
}
.pos-clear-btn:hover { background: #fef2f2; }

.pos-cart-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.pos-cart-row:last-child { border-bottom: none; }

.pos-qty-btn {
  width: 32px;
  height: 32px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.12s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pos-qty-btn:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
}

.pos-remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pos-remove-btn:hover { color: #ef4444; background: #fef2f2; }

.pos-pay-btn {
  width: 100%;
  height: 64px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(59,130,246,0.4);
  transition: transform 0.12s, box-shadow 0.12s;
}
.pos-pay-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(59,130,246,0.5);
}
.pos-pay-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.pos-tendered-input {
  font-size: 28px !important;
  font-weight: 900 !important;
  text-align: right;
  height: 64px !important;
}

.pos-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pos-keypad-btn {
  height: 52px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.12s;
}
.pos-keypad-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
.pos-keypad-btn--accent {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
  font-size: 14px;
}
.col-span-3 { grid-column: span 3; }
</style>

<style>
/* Print: when .pos-printing is on body, hide everything except the receipt. */
@media print {
  body.pos-printing > *:not(.ps-modal-backdrop) { display: none !important; }
  body.pos-printing .ps-modal-backdrop {
    position: static !important;
    background: transparent !important;
    inset: auto !important;
  }
  body.pos-printing .ps-modal-card {
    box-shadow: none !important;
    max-width: 100% !important;
    border: none !important;
  }
  body.pos-printing .ps-modal-header,
  body.pos-printing .ps-modal-footer,
  body.pos-printing .ps-modal-close { display: none !important; }
  body.pos-printing #pos-receipt { padding: 0 !important; }
}
</style>
