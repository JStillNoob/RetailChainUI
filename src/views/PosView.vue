<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'PosView' })

const { toast } = useToast()

const products    = ref<any[]>([])
const prodSearch  = ref('')
const prodLoading = ref(false)
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

interface CartItem { productId: number; productName: string; unitPrice: number; quantity: number; sku: string }
const cart = ref<CartItem[]>([])

function addToCart(p: any) {
  if (!p.inStock) { toast('Product is out of stock.', 'error'); return }
  const existing = cart.value.find(c => c.productId === p.productId)
  if (existing) { existing.quantity++ }
  else { cart.value.push({ productId: p.productId, productName: p.productName, unitPrice: Number(p.unitPrice), quantity: 1, sku: p.sku }) }
}

function removeFromCart(idx: number) { cart.value.splice(idx, 1) }
function clearCart() { if (confirm('Clear the cart?')) cart.value = [] }

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.unitPrice * i.quantity, 0))

const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)

const showPayment = ref(false)
const payForm     = ref({ methodId: null as number | null, tendered: '' })
const processing  = ref(false)
const payErr      = ref('')
const receipt     = ref<any>(null)
const showReceipt = ref(false)

async function openPayment() {
  if (cart.value.length === 0) { toast('Cart is empty.', 'error'); return }
  payForm.value = { methodId: null, tendered: '' }
  payErr.value  = ''
  showPayment.value = true
}

const change = computed(() => (parseFloat(payForm.value.tendered) || 0) - cartTotal.value)

async function processPayment() {
  payErr.value = ''
  const tendered = parseFloat(payForm.value.tendered) || 0
  if (tendered < cartTotal.value) { payErr.value = 'Amount tendered is less than total.'; return }
  processing.value = true
  try {
    const res = await api.post('/cashier/sales', {
      methodId: payForm.value.methodId, amountTendered: tendered,
      items: cart.value.map(c => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
    })
    receipt.value     = { ...res.data, cartSnapshot: [...cart.value], tendered, cartTotal: cartTotal.value }
    showPayment.value = false; showReceipt.value = true; cart.value = []
    toast('Transaction successful!'); await searchProducts()
  } catch (e: any) {
    payErr.value = e.response?.data?.message ?? 'Transaction failed.'
  } finally { processing.value = false }
}
</script>

<template>
  <div class="pos-layout">

    <!-- ── Left: Product Search ── -->
    <div class="ps-card p-5 flex flex-col gap-3 overflow-hidden">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-bold text-slate-900">Product Search</div>
          <div class="text-xs text-slate-400 mt-0.5">{{ products.length }} item{{ products.length !== 1 ? 's' : '' }}</div>
        </div>
        <i class="ph ph-magnifying-glass text-blue-500 text-lg"></i>
      </div>

      <div class="ps-search">
        <i class="ph ph-magnifying-glass"></i>
        <input v-model="prodSearch" placeholder="Search by name or SKU…" @input="searchProducts" style="width: 100%" />
      </div>

      <div v-if="prodLoading" class="flex items-center justify-center py-10">
        <i class="ph ph-spinner animate-spin text-2xl text-blue-500"></i>
      </div>
      <div v-else-if="products.length === 0" class="flex flex-col items-center gap-2 py-10 text-slate-400">
        <i class="ph ph-package text-4xl text-slate-200"></i>
        <p class="text-xs">No products found.</p>
      </div>
      <div v-else class="grid gap-2.5 overflow-y-auto flex-1" style="grid-template-columns: repeat(auto-fill, minmax(148px, 1fr))">
        <div
          v-for="p in products" :key="p.productId"
          @click="addToCart(p)"
          :class="['border rounded-xl p-3 cursor-pointer transition-all',
            p.inStock ? 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 hover:-translate-y-0.5' : 'border-slate-100 opacity-50 cursor-not-allowed']">
          <div class="text-sm font-bold text-slate-800 leading-tight mb-1">{{ p.productName }}</div>
          <div class="text-[11px] text-slate-400 mb-2">{{ p.sku }}</div>
          <div class="flex items-center justify-between flex-wrap gap-1">
            <span class="text-sm font-extrabold text-blue-600">{{ phpFmt(p.unitPrice) }}</span>
            <span :class="['ps-tag', p.inStock ? 'ps-tag-green' : 'ps-tag-red']" style="font-size: 10px;">
              {{ p.inStock ? `${Number(p.qtyOnHand).toLocaleString()} in stock` : 'Out of stock' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Right: Cart ── -->
    <div class="ps-card p-5 flex flex-col">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="text-sm font-bold text-slate-900">Cart</div>
          <div class="text-xs text-slate-400 mt-0.5">{{ cart.length }} item{{ cart.length !== 1 ? 's' : '' }}</div>
        </div>
        <button v-if="cart.length" @click="clearCart"
          class="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
          <i class="ph ph-trash"></i> Clear
        </button>
      </div>

      <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-40">
        <i class="ph ph-shopping-cart text-4xl text-slate-200"></i>
        <p class="text-xs">Add products from the left panel.</p>
      </div>

      <div v-else class="flex-1 flex flex-col gap-0 overflow-y-auto min-h-0">
        <div v-for="(item, i) in cart" :key="item.productId"
          class="flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-slate-800 truncate">{{ item.productName }}</div>
            <div class="text-[11px] text-slate-400">{{ phpFmt(item.unitPrice) }} each</div>
          </div>
          <div class="flex items-center gap-1.5">
            <button @click="item.quantity > 1 ? item.quantity-- : removeFromCart(i)"
              class="w-6 h-6 border border-slate-200 rounded-md flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-xs">
              <i class="ph ph-minus"></i>
            </button>
            <span class="text-sm font-bold text-slate-800 w-6 text-center">{{ item.quantity }}</span>
            <button @click="item.quantity++"
              class="w-6 h-6 border border-slate-200 rounded-md flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all text-xs">
              <i class="ph ph-plus"></i>
            </button>
          </div>
          <div class="text-sm font-bold text-slate-800 min-w-[68px] text-right">{{ phpFmt(item.unitPrice * item.quantity) }}</div>
          <button @click="removeFromCart(i)" class="text-slate-300 hover:text-red-500 transition-all text-sm p-0.5">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3 mt-3">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold text-slate-500">Total</span>
          <span class="text-2xl font-black text-slate-900">{{ phpFmt(cartTotal) }}</span>
        </div>
        <button @click="openPayment" :disabled="cart.length === 0"
          class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(59,130,246,0.35)]">
          <i class="ph ph-cash-register text-lg"></i> Process Payment
        </button>
      </div>
    </div>

    <!-- Payment Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showPayment" class="ps-modal-backdrop" @click.self="showPayment = false">
          <div class="ps-modal-card" style="max-width: 400px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Payment</h3>
              <button class="ps-modal-close" @click="showPayment = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="bg-slate-50 rounded-lg p-4 text-center">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Due</div>
                <div class="text-4xl font-black text-slate-900 mt-1">{{ phpFmt(cartTotal) }}</div>
              </div>
              <div>
                <label class="ps-label">Amount Tendered (₱) *</label>
                <input v-model="payForm.tendered" type="number" min="0" step="0.01" placeholder="0.00"
                  class="ps-input" style="font-size: 18px; font-weight: 700; text-align: right; height: 48px;" />
              </div>
              <div v-if="parseFloat(payForm.tendered) >= cartTotal && parseFloat(payForm.tendered) > 0"
                class="text-center text-base font-bold text-green-600">
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

    <!-- Receipt Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showReceipt && receipt" class="ps-modal-backdrop" @click.self="showReceipt = false">
          <div class="ps-modal-card" style="max-width: 400px">
            <div class="ps-modal-header">
              <div class="flex items-center gap-2">
                <i class="ph ph-check-circle text-green-500 text-xl"></i>
                <h3 class="ps-modal-title">Sale Complete!</h3>
              </div>
              <button class="ps-modal-close" @click="showReceipt = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <p class="text-xs text-center text-slate-400">Transaction #{{ receipt.transactionId }}</p>
              <div class="flex flex-col gap-2">
                <div v-for="item in receipt.cartSnapshot" :key="item.productId"
                  class="flex justify-between text-sm text-slate-600">
                  <span>{{ item.productName }} × {{ item.quantity }}</span>
                  <span>{{ phpFmt(item.unitPrice * item.quantity) }}</span>
                </div>
              </div>
              <div class="border-t border-dashed border-slate-200 pt-3 flex flex-col gap-2">
                <div class="flex justify-between text-[15px] font-bold text-slate-900">
                  <span>Total</span><strong>{{ phpFmt(receipt.cartTotal) }}</strong>
                </div>
                <div class="flex justify-between text-sm text-slate-500">
                  <span>Tendered</span><span>{{ phpFmt(receipt.tendered) }}</span>
                </div>
                <div class="flex justify-between text-[15px] font-bold text-green-600">
                  <span>Change</span><strong>{{ phpFmt(receipt.changeAmount) }}</strong>
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-primary" @click="showReceipt = false">New Transaction</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.pos-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  height: calc(100vh - 68px - 56px);
  max-height: 700px;
}
@media (max-width: 900px) {
  .pos-layout { grid-template-columns: 1fr; height: auto; max-height: none; }
}
</style>
