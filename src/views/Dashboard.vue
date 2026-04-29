<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import { navConfig, defaultNavConfig } from '../config/navConfig.ts'
import AppSidebar from '../components/AppSidebar.vue'
import TopbarUserDropdown from '../components/TopbarUserDropdown.vue'
import AppToast from '../components/AppToast.vue'

defineOptions({ name: 'DashboardLayout' })

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const sidebarCollapsed = ref(false)
const mobileOpen       = ref(false)

onMounted(() => {
  auth.fetchProfile()
})

// All nav items flattened (including tree-parent children) — used for page title lookup
const allItems = computed(() =>
  (navConfig[auth.roleTypeName] ?? defaultNavConfig)
    .flatMap(g => g.items)
    .flatMap(item => item.children?.length ? [item, ...item.children] : [item])
)

const currentPageLabel = computed(() => {
  const match = allItems.value.find(item => isActive(item.to))
  return match?.label ?? 'Dashboard'
})

const isActive = (to?: string) => {
  if (!to) return false
  if (to === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(to)
}


const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <!-- ════════════ SIDEBAR (role-based component) ════════════ -->
    <AppSidebar
      v-model:collapsed="sidebarCollapsed"
      v-model:mobileOpen="mobileOpen"
    />

    <!-- ════════════ MAIN AREA ════════════ -->
    <div class="main-area">
      <!-- Topbar -->
      <header class="topbar">
        <div class="topbar__left">
          <button
            class="topbar__mobile-trigger"
            id="mobile-menu-btn"
            aria-label="Open menu"
            @click="mobileOpen = true"
          >
            <i class="ph ph-list" />
          </button>
          <span class="topbar__page-title">{{ currentPageLabel }}</span>
        </div>

        <div class="topbar__right">
          <!-- Notifications -->
          <button class="topbar__icon-btn" title="Notifications" id="topbar-notif-btn">
            <i class="ph ph-bell" />
            <span class="notif-badge" />
          </button>

          <TopbarUserDropdown @logout="handleLogout" />
        </div>
      </header>

      <!-- Page content -->
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <AppToast />
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   SHELL  (sidebar tokens live in AppSidebar.vue)
══════════════════════════════════════════════════ */
.app-shell {
  --topbar-h: 68px;
  --transition: 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  min-height: 100vh;
  background: #F8FAFC;
}

/* ══════════════════════════════════════════════════
   MAIN AREA
══════════════════════════════════════════════════ */
.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  gap: 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
}

.topbar__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar__mobile-trigger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 22px;
  color: #334155;
  padding: 4px;
}

.topbar__page-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topbar__icon-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  color: #475569; /* darkened from #64748b for WCAG AA */
  transition: all var(--transition);
}
.topbar__icon-btn:hover {
  background: rgba(99, 102, 241, 0.07);
  color: #4f46e5; /* darkened from #6366f1 for hover contrast */
}
.topbar__icon-btn--logout:hover {
  background: rgba(239, 68, 68, 0.07);
  color: #dc2626; /* darkened from #ef4444 for hover contrast */
}

.notif-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 7px;
  height: 7px;
  background: #dc2626;
  border-radius: 50%;
  border: 2px solid #fff;
}

.topbar__divider {
  width: 1px;
  height: 28px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 8px;
}

/* User chip */
.topbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border-radius: 11px;
  cursor: pointer;
  transition: background var(--transition);
}
.topbar__user:hover {
  background: rgba(0, 0, 0, 0.03);
}

.topbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.topbar__user-meta {
  display: flex;
  flex-direction: column;
}
.topbar__user-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}
.topbar__user-role {
  font-size: 10px;
  color: #475569; /* darkened for contrast */
  font-weight: 500;
}

/* ── Content ── */
.main-content {
  flex: 1;
  padding: 28px;
}

/* ══════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .topbar__mobile-trigger {
    display: flex;
  }
  .main-content {
    padding: 20px 16px;
  }
  .topbar__user-meta {
    display: none;
  }
}

@media (max-width: 480px) {
  .topbar {
    padding: 0 16px;
  }
}
</style>
