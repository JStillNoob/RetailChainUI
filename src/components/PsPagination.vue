<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  showSize?: boolean
  showSummary?: boolean
  recordLabel?: string
  siblings?: number
}>(), {
  pageSizeOptions: () => [10, 25, 50, 100],
  showSize: true,
  showSummary: true,
  recordLabel: 'records',
  siblings: 1,
})

const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:pageSize', v: number): void
  (e: 'change'): void
}>()

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize)))
)

const fromRecord = computed(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
)
const toRecord = computed(() =>
  Math.min(props.page * props.pageSize, props.total)
)

type PgItem = { type: 'page'; value: number } | { type: 'ellipsis'; key: string }

const items = computed<PgItem[]>(() => {
  const total = totalPages.value
  const current = Math.min(Math.max(props.page, 1), total)
  const sib = props.siblings

  const range = (start: number, end: number): PgItem[] => {
    const out: PgItem[] = []
    for (let i = start; i <= end; i++) out.push({ type: 'page', value: i })
    return out
  }

  // First + last + current + 2*siblings + 2 ellipsis slots
  const totalVisible = 2 * sib + 5
  if (total <= totalVisible) return range(1, total)

  const leftSibling  = Math.max(current - sib, 1)
  const rightSibling = Math.min(current + sib, total)

  const showLeftDots  = leftSibling > 3
  const showRightDots = rightSibling < total - 2

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + 2 * sib
    return [...range(1, leftCount), { type: 'ellipsis', key: 'r' }, { type: 'page', value: total }]
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + 2 * sib
    return [{ type: 'page', value: 1 }, { type: 'ellipsis', key: 'l' }, ...range(total - rightCount + 1, total)]
  }

  return [
    { type: 'page', value: 1 },
    { type: 'ellipsis', key: 'l' },
    ...range(leftSibling, rightSibling),
    { type: 'ellipsis', key: 'r' },
    { type: 'page', value: total },
  ]
})

function goTo(p: number) {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('update:page', p)
  emit('change')
}

function changeSize(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  emit('update:pageSize', v)
  emit('update:page', 1)
  emit('change')
}
</script>

<template>
  <div v-if="total > 0" class="ps-pagination">
    <div class="ps-pg-summary" v-if="showSummary">
      Showing <strong>{{ fromRecord.toLocaleString() }}</strong>–<strong>{{ toRecord.toLocaleString() }}</strong>
      of <strong>{{ total.toLocaleString() }}</strong> {{ recordLabel }}
    </div>

    <div class="ps-pg-controls">
      <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)" aria-label="First page">
        <i class="ph ph-caret-double-left"></i>
      </button>
      <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)" aria-label="Previous page">
        <i class="ph ph-caret-left"></i>
      </button>

      <template v-for="(item, idx) in items" :key="item.type === 'page' ? `p-${item.value}` : `e-${item.key}-${idx}`">
        <span v-if="item.type === 'ellipsis'" class="ps-pg-ellipsis">…</span>
        <button v-else
          :class="['ps-pg-btn', item.value === page && 'ps-pg-btn--active']"
          @click="goTo(item.value)"
        >{{ item.value }}</button>
      </template>

      <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)" aria-label="Next page">
        <i class="ph ph-caret-right"></i>
      </button>
      <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)" aria-label="Last page">
        <i class="ph ph-caret-double-right"></i>
      </button>
    </div>

    <div class="ps-pg-size-wrap" v-if="showSize">
      <span class="ps-pg-size-label">Rows</span>
      <select :value="pageSize" class="ps-pg-size" @change="changeSize">
        <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>
  </div>
</template>
