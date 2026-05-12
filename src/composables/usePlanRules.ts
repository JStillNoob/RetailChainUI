import { ref, computed, readonly } from 'vue'
import { getPlanInfo } from '../services/tenant.ts'

interface PlanInfo {
  planName: string
  branchLimit: number       // -1 means unlimited
  branchesUsed: number
  canUseForecast: boolean
  branchLimitReached: boolean
}

const planInfo = ref<PlanInfo | null>(null)
const loading  = ref(false)
let   fetched  = false

async function fetchPlanInfo(force = false) {
  if (fetched && !force) return
  loading.value = true
  try {
    planInfo.value = await getPlanInfo()
    fetched = true
  } catch {
    // silently fail — components degrade gracefully
  } finally {
    loading.value = false
  }
}

export function usePlanRules() {
  const canUseForecast    = computed(() => planInfo.value?.canUseForecast ?? false)
  const branchLimitReached = computed(() => planInfo.value?.branchLimitReached ?? false)
  const branchesUsed      = computed(() => planInfo.value?.branchesUsed ?? 0)
  const branchLimit       = computed(() => planInfo.value?.branchLimit ?? 1)
  const planName          = computed(() => planInfo.value?.planName ?? '')

  const branchUsageLabel = computed(() => {
    if (!planInfo.value) return ''
    const limit = planInfo.value.branchLimit
    const used  = planInfo.value.branchesUsed
    return limit === -1 ? 'Unlimited branches' : `${used}/${limit} branch${limit === 1 ? '' : 'es'} used`
  })

  return {
    planInfo: readonly(planInfo),
    loading:  readonly(loading),
    canUseForecast,
    branchLimitReached,
    branchesUsed,
    branchLimit,
    planName,
    branchUsageLabel,
    fetchPlanInfo,
  }
}
