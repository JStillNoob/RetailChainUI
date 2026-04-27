<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'

const auth = useAuthStore()
const emit = defineEmits<{
  (e: 'logout'): void
}>()

const router = useRouter()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const openSettings = () => {
  isOpen.value = false
  if (auth.isSuperAdmin) {
    router.push('/admin/settings')
  } else {
    router.push('/dashboard/settings')
  }
}

const handleLogoutClick = () => {
  isOpen.value = false
  emit('logout')
}

// Close dropdown when clicking outside
const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="user-dropdown-container" ref="dropdownRef">
    <!-- Trigger Button -->
    <button class="user-trigger" @click="toggleMenu" :class="{ 'is-open': isOpen }">
      <div v-if="auth.profilePhoto" class="user-avatar" :style="{ backgroundImage: `url(${auth.profilePhoto})` }"></div>
      <div v-else class="user-avatar placeholder">{{ auth.initials }}</div>
      
      <div class="user-meta">
        <div class="user-name">{{ auth.fullName }}</div>
        <div class="user-role">{{ auth.roleTypeName || 'Super Admin' }}</div>
      </div>
      
      <i class="ph ph-caret-down trigger-icon" />
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <button class="dropdown-item" @click="openSettings">
          <i class="ph ph-gear"></i>
          Account Settings
        </button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item logout-item" @click="handleLogoutClick">
          <i class="ph ph-sign-out"></i>
          Log out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-dropdown-container {
  position: relative;
  display: inline-block;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 12px;
  transition: background 0.15s;
}

.user-trigger:hover, .user-trigger.is-open {
  background: #f1f5f9;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.user-avatar.placeholder {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.user-meta {
  text-align: left;
}

.user-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.user-role {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-top: 2px;
}

.trigger-icon {
  color: #94a3b8;
  font-size: 16px;
  margin-left: 4px;
  transition: transform 0.2s;
}

.user-trigger.is-open .trigger-icon {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 200px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 8px;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
  text-align: left;
}

.dropdown-item i {
  font-size: 18px;
  color: #64748b;
}

.dropdown-item:hover {
  background: #f8fafc;
  color: #0f172a;
}
.dropdown-item:hover i {
  color: #3b82f6;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 6px 0;
}

.logout-item {
  color: #ef4444;
}
.logout-item i {
  color: #ef4444;
}
.logout-item:hover {
  background: #fef2f2;
  color: #dc2626;
}
.logout-item:hover i {
  color: #dc2626;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
