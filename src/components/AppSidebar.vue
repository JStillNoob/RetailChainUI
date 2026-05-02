<script setup lang="ts">
/**
 * AppSidebar — Role-based sidebar component.
 *
 * Props:
 *   v-model:collapsed  — icon-only collapsed mode
 *   v-model:mobileOpen — mobile drawer open state
 *   theme              — 'light' (default) | 'dark' (Super Admin)
 */
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import { navConfig, defaultNavConfig } from '../config/navConfig.ts'
import type { NavGroup, NavItem } from '../config/navConfig.ts'

defineOptions({ name: 'AppSidebar' })

// ── Props & Emits ─────────────────────────────────────────────────────────────
interface Props {
  collapsed?: boolean
  mobileOpen?: boolean
  theme?: 'light' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  collapsed:  false,
  mobileOpen: false,
  theme:      'light',
})

const emit = defineEmits<{
  (e: 'update:collapsed',  value: boolean): void
  (e: 'update:mobileOpen', value: boolean): void
  (e: 'logout'): void
}>()

// ── Dependencies ──────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

// ── Role-based navigation ─────────────────────────────────────────────────────
const navGroups = computed<NavGroup[]>(() =>
  navConfig[auth.roleTypeName] ?? defaultNavConfig
)

// ── Active route helper ───────────────────────────────────────────────────────
const isActive = (to?: string) => {
  if (!to) return false
  if (to === '/dashboard' || to === '/admin') return route.path === to
  return route.path.startsWith(to)
}

const isAnyChildActive = (item: NavItem): boolean =>
  !!item.children?.some(c => isActive(c.to) || isAnyChildActive(c))

// ── Expand/collapse state for tree-parent items ───────────────────────────────
const expanded = reactive<Record<string, boolean>>({})

function toggleExpanded(item: NavItem) {
  expanded[item.id] = !expanded[item.id]
}

const isExpanded = (item: NavItem) =>
  expanded[item.id] ?? isAnyChildActive(item)

// Auto-expand a parent when navigating into one of its children.
watch(() => route.path, () => {
  for (const group of navGroups.value) {
    for (const item of group.items) {
      if (item.children && isAnyChildActive(item)) expanded[item.id] = true
    }
  }
}, { immediate: true })

// ── Dark-theme flag ───────────────────────────────────────────────────────────
const isDark = computed(() => props.theme === 'dark')



// ── Handlers ──────────────────────────────────────────────────────────────────
const toggleCollapse = () => emit('update:collapsed', !props.collapsed)
const closeMobile    = () => emit('update:mobileOpen', false)

const handleUpgrade = () => {
  router.push('/dashboard/upgrade')
}
</script>

<template>
  <!-- Mobile backdrop -->
  <Teleport to="body">
    <div
      v-if="mobileOpen"
      class="sidebar-overlay"
      aria-hidden="true"
      @click="closeMobile"
    />
  </Teleport>

  <!-- ════════ SIDEBAR ════════ -->
  <aside
    class="app-sidebar"
    :class="{
      'app-sidebar--collapsed': collapsed,
      'app-sidebar--open':      mobileOpen,
      'app-sidebar--dark':      isDark,
    }"
    aria-label="Main navigation"
  >
    <!-- ── Brand bar ── -->
    <div class="sidebar-brand">
      <!-- Dark theme (Super Admin): system logo or badge fallback -->
      <template v-if="isDark">
        <div class="brand-inner" v-if="!collapsed">
          <template v-if="auth.systemLogo">
            <img :src="auth.systemLogo" alt="System Logo" class="brand-logo brand-logo--dark" />
          </template>
          <template v-else>
            <div class="brand-badge-sa">SA</div>
            <div class="brand-text">
              <div class="brand-name-dark">RetailChain</div>
              <div class="brand-role-dark">Super Admin</div>
            </div>
          </template>
        </div>
        <template v-else>
          <img v-if="auth.systemLogo" :src="auth.systemLogo" alt="System Logo" class="brand-icon" />
          <div v-else class="brand-badge-sa brand-badge-sa--sm">SA</div>
        </template>
      </template>

      <!-- Light theme: company logo (set by TenantAdmin) or static fallback -->
      <template v-else>
        <router-link to="/" class="brand-link" aria-label="RetailChain home">
          <img
            v-if="!collapsed"
            src="/src/assets/images/logo.png"
            alt="RetailChain"
            class="brand-logo"
          />
          <img
            v-else
            src="/src/assets/images/logo-icon.png"
            alt="RetailChain"
            class="brand-icon"
          />
        </router-link>
      </template>

      <!-- Collapse toggle -->
      <button
        v-if="!collapsed || isDark"
        class="collapse-btn"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        id="sidebar-toggle-btn"
        aria-controls="sidebar-nav"
        :aria-expanded="!collapsed"
        @click="toggleCollapse"
      >
        <i :class="collapsed ? 'ph ph-caret-right' : 'ph ph-caret-left'" />
      </button>

      <!-- Collapsed light: toggle sits below icon -->
      <button
        v-if="collapsed && !isDark"
        class="collapse-btn collapse-btn--reopen"
        title="Expand sidebar"
        aria-controls="sidebar-nav"
        aria-expanded="false"
        @click="toggleCollapse"
      >
        <i class="ph ph-caret-right" />
      </button>
    </div>

    <!-- ── Navigation ── -->
    <nav id="sidebar-nav" class="sidebar-nav">
      <template v-for="group in navGroups" :key="group.groupLabel ?? 'default'">
        <!-- Section label -->
        <h3
          v-if="group.groupLabel && !collapsed"
          class="nav-section-label"
        >
          {{ group.groupLabel }}
        </h3>

        <!-- Nav links -->
        <template v-for="item in group.items" :key="item.id">

          <!-- Tree-parent (has children) -->
          <template v-if="item.children && item.children.length">
            <button
              type="button"
              :id="item.id"
              class="nav-item nav-item--parent"
              :class="{ 'nav-item--active': isAnyChildActive(item) }"
              :title="collapsed ? item.label : ''"
              :aria-label="item.label"
              :aria-expanded="isExpanded(item)"
              :aria-controls="`${item.id}-children`"
              @click="toggleExpanded(item)"
            >
              <i :class="`ph-fill ${item.icon}`" class="nav-item__icon" aria-hidden="true" />
              <span v-if="!collapsed" class="nav-item__label">{{ item.label }}</span>
              <i
                v-if="!collapsed"
                class="ph ph-caret-right nav-item__chevron"
                :class="{ 'nav-item__chevron--open': isExpanded(item) }"
                aria-hidden="true"
              />
            </button>

            <!-- Children — only when expanded and sidebar not collapsed -->
            <div
              v-if="!collapsed"
              v-show="isExpanded(item)"
              :id="`${item.id}-children`"
              class="nav-children"
            >
              <router-link
                v-for="child in item.children"
                :key="child.id"
                :to="child.to ?? '/'"
                :id="child.id"
                class="nav-item nav-item--child"
                :class="{ 'nav-item--active': isActive(child.to) }"
                :aria-label="child.label"
                :aria-current="isActive(child.to) ? 'page' : undefined"
                @click="closeMobile"
              >
                <i :class="`ph-fill ${child.icon}`" class="nav-item__icon" aria-hidden="true" />
                <span class="nav-item__label">{{ child.label }}</span>
              </router-link>
            </div>
          </template>

          <!-- Plain leaf link -->
          <router-link
            v-else
            :to="item.to ?? '/'"
            :id="item.id"
            class="nav-item"
            :class="{ 'nav-item--active': isActive(item.to) }"
            :title="collapsed ? item.label : ''"
            :aria-label="item.label"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            @click="closeMobile"
          >
            <i :class="`ph-fill ${item.icon}`" class="nav-item__icon" aria-hidden="true" />
            <span v-if="!collapsed" class="nav-item__label">{{ item.label }}</span>
          </router-link>

        </template>
      </template>

    </nav>

    <!-- ── Go Premium Ad (Sticky Bottom) ── -->
    <div v-if="(auth.planName === 'Starter Plan' || auth.planName === 'No Plan') && auth.roleTypeName === 'TenantAdmin' && !collapsed && !isDark" class="premium-ad-container">
      <div class="premium-ad">
        <div class="premium-ad-icon"><i class="ph-fill ph-crown"></i></div>
        <div class="premium-ad-content">
          <h4>Free Trial</h4>
          <p>Upgrade to unlock forecasting & unlimited products.</p>
        </div>
        <button class="premium-ad-btn" @click="handleUpgrade">Go Premium</button>
      </div>
    </div>

  </aside>
</template>

<style scoped>
/* ══════════════════════════════════════════════════
   DESIGN TOKENS + SIDEBAR SHELL
══════════════════════════════════════════════════ */
.app-sidebar {
  /* ── Light-theme tokens ── */
  --sidebar-w:           260px;
  --sidebar-w-collapsed:  72px;
  --sidebar-bg:          #ffffff;
  --sidebar-border:      #e2e8f0;
  --nav-label-color:     #7e96b5;
  --nav-item-color:      #3d5473;
  --nav-item-icon:       #5b7a9e;
  --nav-hover-bg:        rgba(255, 255, 255, 0.45);
  --nav-hover-color:     #1e3a5f;
  --nav-active-bg:       #ffffff;
  --nav-active-shadow:   0 4px 16px rgba(59, 130, 246, 0.10), 0 1px 4px rgba(0,0,0,0.06);
  --nav-active-color:    #1a2e4a;
  --nav-active-icon:     #2563eb;
  --transition:          0.22s cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Layout ── */
  width: var(--sidebar-w);
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
  flex-shrink: 0;
  transition: width var(--transition);
  z-index: 50;
}

.app-sidebar--collapsed {
  width: var(--sidebar-w-collapsed);
}

/* ══════════════════════════════════════════════════
   BRAND BAR
══════════════════════════════════════════════════ */
.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  padding: 0 18px;
  flex-shrink: 0;
  gap: 8px;
}

.app-sidebar--collapsed .sidebar-brand {
  flex-direction: column;
  justify-content: center;
  padding: 12px 0;
  height: auto;
  gap: 6px;
}

.brand-link {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  min-width: 0;
  flex: 1;
}

.brand-logo {
  height: 48px;
  width: auto;
  max-width: 160px;
  object-fit: contain;
}

/* System logo in dark SA sidebar — allow full width, brightness invert for dark bg */
.brand-logo--dark {
  height: 40px;
  max-width: 150px;
  filter: brightness(0) invert(1);
  object-fit: contain;
}

.brand-icon {
  height: 38px;
  width: 38px;
  object-fit: contain;
  border-radius: 10px;
}

/* Collapse toggle — rounded square button matching the screenshot */
.collapse-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  color: #4a6080;
  font-size: 14px;
  transition: all var(--transition);
}

.collapse-btn:hover {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
  border-color: rgba(37, 99, 235, 0.2);
}

/* Reopen button when collapsed */
.collapse-btn--reopen {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(255, 255, 255, 0.9);
}

/* ══════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════ */
.sidebar-nav {
  flex: 1;
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Scrollbar styling */
.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(94, 130, 182, 0.25);
  border-radius: 99px;
}

/* ── Section label ── */
.nav-section-label {
  margin: 0;
  padding: 18px 12px 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--nav-label-color);
  user-select: none;
}

/* First section label — less top padding */
.nav-section-label:first-child {
  padding-top: 8px;
}

/* ── Nav item — flat row (not pill by default) ── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--nav-item-color);
  text-decoration: none;
  transition: all var(--transition);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  margin: 1px 0;
  position: relative;
}

.nav-item:hover {
  background: var(--nav-hover-bg);
  color: var(--nav-hover-color);
}

.nav-item:hover .nav-item__icon {
  color: var(--nav-hover-color);
}

/* ── Active item — white card with shadow ── */
.nav-item--active {
  background: var(--nav-active-bg);
  color: var(--nav-active-color);
  font-weight: 700;
  box-shadow: var(--nav-active-shadow);
}

.nav-item--active .nav-item__icon {
  color: var(--nav-active-icon);
}

/* ── Icon ── */
.nav-item__icon {
  font-size: 19px;
  flex-shrink: 0;
  color: var(--nav-item-icon);
  transition: color var(--transition);
}

/* ── Label ── */
.nav-item__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tree parent button (looks like nav-item but is a <button>) ── */
.nav-item--parent {
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  font-family: inherit;
}

.nav-item__chevron {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--nav-item-icon);
  transition: transform var(--transition);
}
.nav-item__chevron--open {
  transform: rotate(90deg);
}

/* ── Children container — indented column ── */
.nav-children {
  display: flex;
  flex-direction: column;
  margin: 2px 0 6px 12px;
  padding-left: 14px;
  border-left: 1.5px dashed #e2e8f0;
}

.nav-item--child {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
}

.nav-item--child .nav-item__icon {
  font-size: 16px;
}

/* Dark theme: dashed guide line */
.app-sidebar--dark .nav-children {
  border-left-color: rgba(255, 255, 255, 0.08);
}

/* ── Collapsed mode ── */
.app-sidebar--collapsed .sidebar-nav {
  padding: 8px 10px 12px;
  align-items: center;
}

.app-sidebar--collapsed .nav-section-label {
  display: none;
}

.app-sidebar--collapsed .nav-item {
  width: 44px;
  justify-content: center;
  padding: 11px 0;
  margin: 2px auto;
  border-radius: 12px;
  gap: 0;
}

/* ── Premium Ad ── */
.premium-ad-container {
  padding: 0 12px 16px;
  background: var(--sidebar-bg);
  flex-shrink: 0;
  border-top: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 -4px 12px rgba(0,0,0,0.02);
  z-index: 10;
}
.premium-ad {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.premium-ad-icon {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px;
}
.premium-ad-content h4 {
  margin: 0 0 4px; font-size: 13.5px; font-weight: 800; color: #0f172a;
}
.premium-ad-content p {
  margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;
}
.premium-ad-btn {
  background: #6366f1; color: #fff; border: none; padding: 10px;
  border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 0.2s; text-align: center;
}
.premium-ad-btn:hover { background: #4f46e5; }

/* ══════════════════════════════════════════════════
   MOBILE OVERLAY
══════════════════════════════════════════════════ */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.38);
  z-index: 49;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

/* ══════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .app-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100dvh;
    transform: translateX(-100%);
    box-shadow: 6px 0 40px rgba(0, 0, 0, 0.14);
    width: var(--sidebar-w) !important;
    transition: transform var(--transition);
  }

  .app-sidebar--open {
    transform: translateX(0);
  }

  .collapse-btn {
    display: none;
  }
}

/* ══════════════════════════════════════════════════
   DARK THEME  (theme="dark" — Super Admin)
══════════════════════════════════════════════════ */
.app-sidebar--dark {
  --sidebar-bg:        #0f172a;
  --sidebar-border:    rgba(255, 255, 255, 0.06);
  --nav-label-color:   rgba(255, 255, 255, 0.22);
  --nav-item-color:    #64748b;
  --nav-item-icon:     #4f6480;
  --nav-hover-bg:      rgba(255, 255, 255, 0.05);
  --nav-hover-color:   #cbd5e1;
  --nav-active-bg:     rgba(99, 102, 241, 0.18);
  --nav-active-shadow: none;
  --nav-active-color:  #a5b4fc;
  --nav-active-icon:   #818cf8;
}

/* Dark — scrollbar */
.app-sidebar--dark .sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}


/* Dark — collapse toggle */
.app-sidebar--dark .collapse-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  color: #64748b;
  box-shadow: none;
}
.app-sidebar--dark .collapse-btn:hover {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

/* ── Dark theme: SA brand badge ── */
.brand-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.brand-badge-sa {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.5px;
  user-select: none;
}

.brand-badge-sa--sm {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 11px;
  margin: auto;
}

.brand-name-dark {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.brand-role-dark {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #6366f1;
}
</style>
