<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ password: string }>()

const checks = computed(() => [
  { label: 'At least 7 characters',       ok: props.password.length >= 7 },
  { label: 'Uppercase letter (A–Z)',       ok: /[A-Z]/.test(props.password) },
  { label: 'Lowercase letter (a–z)',       ok: /[a-z]/.test(props.password) },
  { label: 'Number (0–9)',                 ok: /\d/.test(props.password) },
  { label: 'Special character (!@#$…)',   ok: /[^A-Za-z0-9]/.test(props.password) },
])

const passed = computed(() => checks.value.filter(c => c.ok).length)

const barColor = computed(() => {
  if (passed.value <= 1) return '#EF4444'
  if (passed.value <= 2) return '#F97316'
  if (passed.value <= 3) return '#EAB308'
  if (passed.value === 4) return '#22C55E'
  return '#3B82F6'
})

const label = computed(() => {
  if (!props.password) return ''
  if (passed.value <= 1) return 'Very weak'
  if (passed.value <= 2) return 'Weak'
  if (passed.value <= 3) return 'Fair'
  if (passed.value === 4) return 'Good'
  return 'Strong'
})

const isStrong = computed(() => passed.value === 5)
defineExpose({ isStrong })
</script>

<template>
  <div v-if="password" class="mt-2 space-y-2">
    <div class="flex items-center gap-3 px-1">
      <div class="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :style="{ width: (passed / 5) * 100 + '%', background: barColor }"
        ></div>
      </div>
      <span class="text-xs font-bold whitespace-nowrap transition-colors" :style="{ color: barColor }">
        {{ label }}
      </span>
    </div>
    <div class="grid grid-cols-1 gap-0.5 px-1">
      <div v-for="c in checks" :key="c.label" class="flex items-center gap-2 text-[11px]">
        <i :class="c.ok ? 'ph-fill ph-check-circle text-green-500' : 'ph ph-circle text-slate-300'" class="text-sm flex-shrink-0"></i>
        <span :class="c.ok ? 'text-slate-700' : 'text-slate-400'">{{ c.label }}</span>
      </div>
    </div>
  </div>
</template>
