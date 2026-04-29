<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.ts'
import { navConfig, defaultNavConfig } from '../../config/navConfig.ts'
import AppSidebar from '../../components/AppSidebar.vue'
import TopbarUserDropdown from '../../components/TopbarUserDropdown.vue'

defineOptions({ name: 'AdminLayout' })

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const sidebarCollapsed = ref(false)
const mobileOpen       = ref(false)

// All nav items flattened (including tree-parent children) — for page title lookup
const allItems = computed(() =>
  (navConfig[auth.roleTypeName] ?? defaultNavConfig)
    .flatMap(g => g.items)
    .flatMap(item => item.children?.length ? [item, ...item.children] : [item])
)

const currentLabel = computed(() => {
  const match = allItems.value.find(n => isActive(n.to))
  return match?.label ?? 'Super Admin'
})

const isActive = (to?: string) => {
  if (!to) return false
  if (to === '/admin') return route.path === '/admin'
  return route.path.startsWith(to)
}

const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="admin-shell">
    <!-- ════════ SIDEBAR (role-based, light theme) ════════ -->
    <AppSidebar
      v-model:collapsed="sidebarCollapsed"
      v-model:mobileOpen="mobileOpen"
    />

    <!-- ════════ MAIN AREA ════════ -->
    <div class="admin-main">
      <!-- Topbar -->
      <header class="admin-topbar">
        <div class="topbar-left">
          <button
            class="mobile-trigger"
            id="admin-mobile-menu"
            aria-label="Open menu"
            @click="mobileOpen = true"
          >
            <i class="ph ph-list" />
          </button>
          <div class="page-breadcrumb">
            <span class="breadcrumb-root">Admin</span>
            <i class="ph ph-caret-right breadcrumb-sep" aria-hidden="true" />
            <span class="breadcrumb-current">{{ currentLabel }}</span>
          </div>
        </div>

        <div class="topbar-right">
          <router-link
            to="/admin/notifications"
            class="topbar-btn"
            title="Notifications"
            id="admin-topbar-notif"
            aria-label="Notifications"
          >
            <i class="ph ph-bell" aria-hidden="true" />
          </router-link>

          <TopbarUserDropdown @logout="handleLogout" />
        </div>
      </header>

      <!-- Content -->
      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ── Shell ── */
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #F8FAFC;
  font-family: 'Inter', sans-serif;
}

/* ── Main area ── */
.admin-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ── */
.admin-topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  gap: 16px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 40;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mobile-trigger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: #334155;
  padding: 4px;
}

.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-root {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.breadcrumb-sep {
  font-size: 12px;
  color: #cbd5e1;
}

.breadcrumb-current {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #475569;
  text-decoration: none;
  transition: all 0.15s;
}

.topbar-btn:hover {
  background: #f1f5f9;
  color: #4f46e5;
}

.topbar-btn--logout:hover {
  background: rgba(239, 68, 68, 0.07);
  color: #dc2626;
}

.topbar-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  margin: 0 4px;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.15s;
}

.topbar-user:hover {
  background: #f8fafc;
}

.topbar-avatar {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  user-select: none;
}

.topbar-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.topbar-role-badge {
  font-size: 10px;
  color: #6366f1;
  font-weight: 600;
}

/* ── Content ── */
.admin-content {
  flex: 1;
  padding: 28px;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .mobile-trigger {
    display: flex;
  }
  .admin-content {
    padding: 20px 16px;
  }
  .topbar-user-info {
    display: none;
  }
}

@media (max-width: 480px) {
  .admin-topbar {
    padding: 0 16px;
  }
}
</style>
