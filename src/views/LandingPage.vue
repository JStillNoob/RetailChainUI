<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.ts'
import logo from '@/assets/images/logo.png'

const router = useRouter()
const auth = useAuthStore()
const mobileMenuOpen = ref(false)
const isScrolled = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('opacity-0', 'translate-y-12')
          entry.target.classList.add('opacity-100', 'translate-y-0')
        } else {
          entry.target.classList.remove('opacity-100', 'translate-y-0')
          entry.target.classList.add('opacity-0', 'translate-y-12')
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  )

  document.querySelectorAll('.scroll-animate').forEach((el) => {
    observer?.observe(el)
  })

  const handleScroll = () => {
    isScrolled.value = window.scrollY > 20
  }

  window.addEventListener('scroll', handleScroll)

  onUnmounted(() => {
    if (observer) observer.disconnect()
    window.removeEventListener('scroll', handleScroll)
  })
})

const features = [
  {
    icon: 'ph-package',
    title: 'Inventory Management',
    desc: 'Real-time stock tracking with dynamic product attributes. Supports expiry dates, serial numbers, warranty info, and more.',
    color: '#3B82F6',
  },
  {
    icon: 'ph-chart-line-up',
    title: 'Demand Forecasting',
    desc: 'Moving Average algorithm analyzes historical sales to predict future demand — preventing overstocking and shortages.',
    color: '#A855F7',
  },
  {
    icon: 'ph-storefront',
    title: 'POS / Cashiering',
    desc: 'Record sales, compute totals and change, and auto-deduct inventory. Fast, intuitive, and always in sync.',
    color: '#22C55E',
  },
  {
    icon: 'ph-truck',
    title: 'Procurement & Logistics',
    desc: 'Coordinate with suppliers, manage purchase orders, track deliveries and streamline your entire procurement workflow.',
    color: '#F97316',
  },
  {
    icon: 'ph-users-three',
    title: 'Multi-Tenant Architecture',
    desc: 'Securely isolated data environments for each retail business using shared DB with tenant_id separation.',
    color: '#EF4444',
  },
  {
    icon: 'ph-cloud',
    title: 'Cloud-Based ERP',
    desc: 'Access your entire supply chain from anywhere, anytime. Scalable infrastructure that grows with your business.',
    color: '#06B6D4',
  },
]

const retailTypes = [
  { icon: 'ph-shopping-cart', label: 'Grocery Stores' },
  { icon: 'ph-storefront', label: 'Mini-Marts' },
  { icon: 'ph-desktop', label: 'Computer Shops' },
  { icon: 'ph-first-aid', label: 'Pharmacies' },
  { icon: 'ph-t-shirt', label: 'Clothing Stores' },
  { icon: 'ph-wrench', label: 'Hardware Retailers' },
]

const plans = [
  {
    name: 'Starter',
    price: '₱999',
    period: '/mo',
    desc: 'Perfect for small single-store businesses.',
    features: [
      '1 Store / Tenant',
      'Up to 500 SKUs',
      'POS Module',
      'Basic Inventory',
      'Email Support',
    ],
    popular: false,
  },
  {
    name: 'Growth',
    price: '₱2,499',
    period: '/mo',
    desc: 'For growing retailers managing multiple branches.',
    features: [
      '3 Stores / Tenants',
      'Unlimited SKUs',
      'POS + Procurement',
      'Demand Forecasting',
      'Supplier Management',
      'Priority Support',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Tailored for large retail chains and corporations.',
    features: [
      'Unlimited Stores',
      'Full ERP Suite',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Guarantee',
      '24/7 Support',
    ],
    popular: false,
  },
]
</script>

<template>
  <div class="landing">
    <!-- ===== DYNAMIC NAVBAR ===== -->
    <nav
      class="fixed top-0 left-0 w-full z-[100] transition-colors duration-500 ease-in-out"
      :class="
        isScrolled
          ? 'bg-slate-200/50 backdrop-blur-xl border-b border-white/30 shadow-md px-8'
          : 'bg-transparent border-transparent px-8'
      "
    >
      <div
        class="mx-auto flex w-full items-center justify-between transition-all duration-500 ease-in-out px-4 md:px-8 lg:px-12"
        :class="isScrolled ? 'py-3' : 'py-5'"
      >
        <!-- Left: Logo -->
        <div class="z-10 w-48 lg:w-80 flex justify-end items-center">
          <a
            href="/"
            class="inline-flex items-center transform transition hover:scale-105 duration-300"
          >
            <img
              :src="logo"
              alt="RetailChain"
              class="w-auto object-contain drop-shadow-sm transition-all duration-500"
              :class="isScrolled ? 'h-12' : 'h-20'"
            />
          </a>
        </div>

        <!-- Center: Links -->
        <ul
          class="nav-links hidden md:flex flex-1 justify-center items-center gap-6 lg:gap-10 text-base xl:text-lg font-semibold whitespace-nowrap transition-colors duration-700 m-0 p-0"
          :class="isScrolled ? 'text-gray-800' : 'text-gray-600'"
        >
          <li>
            <a
              href="#features"
              class="inline-block hover:text-blue-600 active:scale-95 active:text-blue-700 transition-all duration-300"
              >Features</a
            >
          </li>
          <li>
            <a
              href="#retail-types"
              class="inline-block hover:text-blue-600 active:scale-95 active:text-blue-700 transition-all duration-300"
              >Who It's For</a
            >
          </li>
          <li>
            <a
              href="#pricing"
              class="inline-block hover:text-blue-600 active:scale-95 active:text-blue-700 transition-all duration-300"
              >Pricing</a
            >
          </li>
          <li>
            <a
              href="#about"
              class="inline-block hover:text-blue-600 active:scale-95 active:text-blue-700 transition-all duration-300"
              >About</a
            >
          </li>
        </ul>

        <!-- Right: Auth Buttons -->
        <div
          class="nav-cta z-10 w-48 lg:w-80 flex justify-start items-center gap-2 lg:gap-4 whitespace-nowrap"
        >
          <button
            class="btn btn-ghost hover:bg-blue-50 text-blue-600 font-bold text-base xl:text-lg px-4 lg:px-6 py-2.5 rounded-full transition-all"
            @click="router.push('/login')"
          >
            Log In
          </button>
          <button
            class="btn btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-indigo-500/30 text-white font-bold text-base xl:text-lg px-6 lg:px-8 py-2.5 rounded-full transition-all"
            @click="router.push('/register')"
          >
            Get Started
          </button>

          <!-- Mobile Menu Toggle -->
          <button
            class="mobile-menu-btn block md:hidden ml-2"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <i class="ph ph-list" v-if="!mobileMenuOpen"></i>
            <i class="ph ph-x" v-else></i>
          </button>
        </div>
      </div>
    </nav>

    <!-- ===== HERO ===== -->
    <section class="hero relative overflow-hidden" id="home">
      <div class="geo-bg"></div>

      <div class="hero-content relative z-10 pt-20">
        <div class="hero-badge animate-bounce transition-colors hover:text-cyan-500 duration-500">
          <i class="ph-fill ph-sparkle text-yellow-400"></i>
          Cloud-Based Multi-Tenant ERP
        </div>
        <h1 class="hero-title animate-float-slow transition-transform hover:scale-105 duration-700">
          The Smart Supply Chain<br />
          Platform for <span class="hero-highlight animate-glow">Retail Stores</span>
        </h1>
        <p class="hero-desc">
          From supplier coordination to cashiering — RetailChain unifies your entire retail
          operation in one powerful, cloud-based platform. Built for grocery stores, pharmacies,
          computer shops, and every retail business in between.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" @click="router.push('/register')">
            <i class="ph ph-rocket-launch"></i>
            Start Free Trial
          </button>
          <button class="btn btn-outline btn-lg">
            <i class="ph ph-play-circle"></i>
            Watch Demo
          </button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-value">500+</span>
            <span class="hero-stat-label">Retail Stores</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-value">6</span>
            <span class="hero-stat-label">Retail Types</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-value">99.9%</span>
            <span class="hero-stat-label">Uptime SLA</span>
          </div>
        </div>
      </div>

      <!-- Dashboard Mockup -->
      <div class="hero-mockup group">
        <div
          class="mockup-frame animate-float shadow-2xl transition-all duration-700 hover:shadow-cyan-500/40 hover:-translate-y-4"
        >
          <div class="mockup-topbar">
            <div class="mockup-dots"><span></span><span></span><span></span></div>
            <div class="mockup-url">iscms.app/dashboard</div>
          </div>
          <div class="mockup-content">
            <!-- Sidebar strip -->
            <div class="mockup-sidebar">
              <div class="mockup-logo-sm animate-pulse">IS</div>
              <div class="mockup-nav-item active animate-pulse"></div>
              <div class="mockup-nav-item"></div>
              <div class="mockup-nav-item"></div>
              <div class="mockup-nav-item"></div>
            </div>
            <!-- Main area -->
            <div class="mockup-main">
              <div class="mockup-stats-row">
                <div class="mockup-stat-card">
                  <div class="msc-label">Revenue</div>
                  <div class="msc-value">₱128K</div>
                  <div class="msc-badge green">+18%</div>
                </div>
                <div class="mockup-stat-card">
                  <div class="msc-label">Orders</div>
                  <div class="msc-value">3,284</div>
                  <div class="msc-badge blue">+12%</div>
                </div>
                <div class="mockup-stat-card">
                  <div class="msc-label">Stock</div>
                  <div class="msc-value">98.2%</div>
                  <div class="msc-badge green">On Track</div>
                </div>
              </div>
              <div class="mockup-chart">
                <div class="mockup-chart-label">Sales Trend</div>
                <svg viewBox="0 0 240 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,50 C20,45 40,35 60,38 C80,41 100,28 120,25 C140,22 160,32 180,28 C200,24 220,18 240,15"
                    stroke="#3B82F6"
                    stroke-width="2"
                    fill="none"
                  />
                  <path
                    d="M0,50 C20,45 40,35 60,38 C80,41 100,28 120,25 C140,22 160,32 180,28 C200,24 220,18 240,15 L240,70 L0,70 Z"
                    fill="url(#chartGrad)"
                  />
                </svg>
              </div>
              <div class="mockup-table-preview">
                <div class="mtp-row header">
                  <span>Product</span><span>Stock</span><span>Status</span>
                </div>
                <div class="mtp-row">
                  <span>Paracetamol 500mg</span><span>240</span><span class="mtp-badge ok">OK</span>
                </div>
                <div class="mtp-row">
                  <span>USB-C Laptop</span><span>12</span><span class="mtp-badge low">Low</span>
                </div>
                <div class="mtp-row">
                  <span>White Rice 25kg</span><span>85</span><span class="mtp-badge ok">OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== PARTNER BRANDS STRIP ===== -->
    <section class="brands-strip">
      <p class="brands-label">Trusted by retail businesses across the Philippines</p>
      <div
        class="brands-logos scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
      >
        <span>GrocerHub</span>
        <span>PharmaCare</span>
        <span>TechMart PH</span>
        <span>StyleNest</span>
        <span>BuildRight</span>
        <span>MiniMart Pro</span>
      </div>
    </section>

    <!-- ===== FEATURES ===== -->
    <section class="section features" id="features">
      <div class="section-inner">
        <div class="section-header">
          <div class="section-tag">Core Features</div>
          <h2 class="section-title">Everything Your Retail<br />Business Needs</h2>
          <p class="section-desc">
            A comprehensive platform that covers your entire supply chain from procurement to point
            of sale.
          </p>
        </div>
        <div class="features-grid">
          <div
            v-for="(feat, idx) in features"
            :key="feat.title"
            class="feature-card card scroll-animate opacity-0 translate-y-12 transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-blue-500/20 hover:bg-gradient-to-br hover:from-white hover:to-blue-50 cursor-pointer group"
            :style="{ transitionDelay: idx * 150 + 'ms' }"
          >
            <div
              class="feature-icon transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
              :style="{ background: feat.color + '18', color: feat.color }"
            >
              <i :class="['ph-fill', feat.icon]"></i>
            </div>
            <h3 class="feature-title group-hover:text-blue-600 transition-colors duration-300">
              {{ feat.title }}
            </h3>
            <p class="feature-desc">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== WHO IT'S FOR ===== -->
    <section class="section retail-section" id="retail-types">
      <div class="section-inner">
        <div class="retail-split">
          <div
            class="retail-text scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
          >
            <div class="section-tag">Who It's For</div>
            <h2 class="section-title">Built for Every<br />Type of Retail Store</h2>
            <p class="section-desc">
              RetailChain adapts to your specific industry with a dynamic product attribute system —
              expiry dates for pharmacies, serial numbers for electronics, and custom fields for
              every scenario.
            </p>
            <ul class="retail-list">
              <li><i class="ph-fill ph-check-circle"></i> Industry-specific product fields</li>
              <li><i class="ph-fill ph-check-circle"></i> Flexible multi-product category setup</li>
              <li><i class="ph-fill ph-check-circle"></i> Separate tenant environments</li>
            </ul>
            <button class="btn btn-primary" @click="router.push('/register')">
              Get Started Free
            </button>
          </div>

          <div class="retail-types-grid">
            <div
              v-for="(rt, idx) in retailTypes"
              :key="rt.label"
              class="retail-type-card card card-body scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
              :style="{ transitionDelay: idx * 100 + 'ms' }"
            >
              <div class="rt-icon"><i :class="['ph-fill', rt.icon]"></i></div>
              <span class="rt-label">{{ rt.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== SUPPLY CHAIN FLOW ===== -->
    <section class="section flow-section" id="about">
      <div class="section-inner">
        <div class="section-header">
          <div class="section-tag">How It Works</div>
          <h2 class="section-title">One Platform,<br />Full Supply Chain Coverage</h2>
        </div>
        <div class="flow-steps">
          <div
            class="flow-step scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
          >
            <div class="flow-step-num">01</div>
            <div class="flow-step-icon"><i class="ph-fill ph-users-three"></i></div>
            <h4>Supplier Coordination</h4>
            <p>
              Manage vendors, negotiate pricing, and issue purchase orders directly from the
              platform.
            </p>
          </div>
          <div class="flow-arrow"><i class="ph ph-arrow-right"></i></div>
          <div
            class="flow-step scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
            style="transition-delay: 150ms"
          >
            <div class="flow-step-num">02</div>
            <div class="flow-step-icon"><i class="ph-fill ph-package"></i></div>
            <h4>Inventory Tracking</h4>
            <p>Real-time stock management with dynamic attributes per product and retail type.</p>
          </div>
          <div class="flow-arrow"><i class="ph ph-arrow-right"></i></div>
          <div
            class="flow-step scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
            style="transition-delay: 300ms"
          >
            <div class="flow-step-num">03</div>
            <div class="flow-step-icon"><i class="ph-fill ph-storefront"></i></div>
            <h4>POS / Cashiering</h4>
            <p>Process sales, compute change, and auto-deduct inventory in real time.</p>
          </div>
          <div class="flow-arrow"><i class="ph ph-arrow-right"></i></div>
          <div
            class="flow-step scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
            style="transition-delay: 450ms"
          >
            <div class="flow-step-num">04</div>
            <div class="flow-step-icon"><i class="ph-fill ph-chart-line-up"></i></div>
            <h4>Demand Forecasting</h4>
            <p>Moving Average analysis predicts stock needs to prevent shortages and waste.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== PRICING ===== -->
    <section class="section pricing-section" id="pricing">
      <div class="section-inner">
        <div class="section-header">
          <div class="section-tag">Pricing</div>
          <h2 class="section-title">Simple, Transparent Pricing</h2>
          <p class="section-desc">Start free. Scale as you grow. No hidden fees.</p>
        </div>
        <div class="pricing-grid">
          <div
            v-for="(plan, idx) in plans"
            :key="plan.name"
            class="pricing-card card scroll-animate opacity-0 translate-y-12 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer"
            :class="{ 'pricing-popular ring-2 ring-blue-500 shadow-blue-500/30': plan.popular }"
            :style="{ transitionDelay: idx * 200 + 'ms' }"
          >
            <div v-if="plan.popular" class="popular-badge">Most Popular</div>
            <div class="card-body">
              <div class="plan-name">{{ plan.name }}</div>
              <div class="plan-price">
                <span class="plan-amount">{{ plan.price }}</span>
                <span class="plan-period">{{ plan.period }}</span>
              </div>
              <p class="plan-desc">{{ plan.desc }}</p>
              <hr class="divider" style="margin: 20px 0" />
              <ul class="plan-features">
                <li v-for="f in plan.features" :key="f">
                  <i class="ph-fill ph-check-circle"></i>
                  {{ f }}
                </li>
              </ul>
              <button
                class="btn w-full"
                :class="plan.popular ? 'btn-primary' : 'btn-outline'"
                style="margin-top: 24px; width: 100%"
                @click="router.push('/register')"
              >
                {{ plan.price === 'Custom' ? 'Contact Sales' : 'Get Started' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CTA BANNER ===== -->
    <section class="section cta-section">
      <div class="section-inner">
        <div
          class="cta-card card card-body scroll-animate opacity-0 translate-y-12 transition-all duration-1000 ease-out"
        >
          <div class="geo-bg"></div>
          <div class="cta-content">
            <h2>Ready to Transform Your Retail Operations?</h2>
            <p>
              Join hundreds of retail stores already using RetailChain to manage their supply chain
              smarter.
            </p>
            <div class="cta-actions">
              <button class="btn btn-primary btn-lg" @click="router.push('/register')">
                <i class="ph ph-rocket-launch"></i>
                Start Free Trial
              </button>
              <button class="btn btn-outline btn-lg" @click="router.push('/login')">Sign In</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="footer">
      <div class="section-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <div class="footer-brand-logo">
              <img :src="logo" alt="RetailChain" class="footer-logo-img" />
            </div>
            <p>The Smart Supply Chain Platform for Retail Stores.</p>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#retail-types">Retail Types</a>
            </div>
            <div class="footer-col">
              <h5>Company</h5>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
            <div class="footer-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>
        <hr class="divider" />
        <div class="footer-bottom">
          <span>© 2026 RetailChain. All rights reserved.</span>
          <span>Built with for Philippine Retail</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  overflow-x: hidden;
}

/* ===== NAVBAR ===== */
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 22px;
  color: var(--color-brand-dark);
  padding: 4px;
}
.brand-logo {
  height: 120px;
  width: auto;
  max-width: 320px;
  object-fit: contain;
  display: block;
}
.footer-brand-logo {
  display: inline-flex;
  align-items: center;
  margin-bottom: 10px;
}
.footer-logo-img {
  height: 75px;
  width: auto;
  max-width: 280px;
  object-fit: contain;
  display: block;
}
.nav-links {
  list-style: none;
}
.nav-links a {
  font-weight: 600;
  color: var(--color-brand-muted);
  transition: color var(--transition-fast);
}
.nav-links a:hover {
  color: var(--color-brand-dark);
}
.nav-cta {
}

/* ===== HERO ===== */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  gap: 60px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 80px 32px;
}
.hero-content {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--border-radius-pill);
  font-size: var(--text-xs);
  font-weight: 600;
  margin-bottom: 24px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hero-title {
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-brand-dark);
  margin-bottom: 20px;
  letter-spacing: -1px;
}
.hero-highlight {
  background: linear-gradient(135deg, #3b82f6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-desc {
  font-size: var(--text-lg);
  color: var(--color-brand-muted);
  max-width: 520px;
  margin-bottom: 36px;
  line-height: 1.7;
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}
.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}
.hero-stat {
  text-align: left;
}
.hero-stat-value {
  display: block;
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--color-brand-dark);
}
.hero-stat-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-brand-muted);
  font-weight: 500;
}
.hero-stat-divider {
  width: 1px;
  height: 36px;
  background: var(--border-color);
}

/* ===== MOCKUP ===== */
.hero-mockup {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  max-width: 580px;
}
.mockup-frame {
  background: var(--color-surface-solid);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}
.mockup-topbar {
  background: #f8fafc;
  border-bottom: 1px solid var(--border-color);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.mockup-dots {
  display: flex;
  gap: 5px;
}
.mockup-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e2e8f0;
}
.mockup-dots span:nth-child(1) {
  background: #fc6b6b;
}
.mockup-dots span:nth-child(2) {
  background: #fcad45;
}
.mockup-dots span:nth-child(3) {
  background: #49c97f;
}
.mockup-url {
  flex: 1;
  background: #eef2ff;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 11px;
  color: var(--color-brand-muted);
  text-align: center;
}
.mockup-content {
  display: flex;
  height: 340px;
}
.mockup-sidebar {
  width: 48px;
  background: var(--color-brand-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 10px;
}
.mockup-logo-sm {
  width: 28px;
  height: 28px;
  background: var(--color-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  margin-bottom: 8px;
}
.mockup-nav-item {
  width: 28px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
}
.mockup-nav-item.active {
  background: var(--color-primary);
}
.mockup-main {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8faff;
}
.mockup-stats-row {
  display: flex;
  gap: 10px;
}
.mockup-stat-card {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}
.msc-label {
  font-size: 9px;
  color: var(--color-brand-muted);
  margin-bottom: 2px;
}
.msc-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-brand-dark);
  margin-bottom: 4px;
}
.msc-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 99px;
}
.msc-badge.green {
  background: #d1fae5;
  color: #065f46;
}
.msc-badge.blue {
  background: #dbeafe;
  color: #1e40af;
}
.mockup-chart {
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
}
.mockup-chart-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-brand-dark);
  margin-bottom: 6px;
}
.mockup-chart svg {
  width: 100%;
  height: 60px;
}
.mockup-table-preview {
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  flex: 1;
}
.mtp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 9px;
  color: var(--color-brand-dark);
}
.mtp-row.header {
  color: var(--color-brand-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 6px;
  margin-bottom: 2px;
}
.mtp-row span:first-child {
  flex: 2;
}
.mtp-row span:nth-child(2) {
  flex: 1;
}
.mtp-row span:last-child {
  flex: 1;
}
.mtp-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 8px;
  font-weight: 600;
}
.mtp-badge.ok {
  background: #d1fae5;
  color: #065f46;
}
.mtp-badge.low {
  background: #fed7aa;
  color: #92400e;
}

/* ===== SHARED SECTION ===== */
.section {
  padding: 80px 0;
}
.section-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
}
.section-header {
  text-align: center;
  margin-bottom: 56px;
}
.section-tag {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-primary);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: var(--border-radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}
.section-title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 800;
  color: var(--color-brand-dark);
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}
.section-desc {
  font-size: var(--text-base);
  color: var(--color-brand-muted);
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.7;
}

/* ===== BRANDS STRIP ===== */
.brands-strip {
  background: var(--color-surface);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  padding: 24px 32px;
  text-align: center;
}
.brands-label {
  font-size: var(--text-xs);
  color: var(--color-brand-muted);
  font-weight: 500;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.brands-logos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  flex-wrap: wrap;
}
.brands-logos span {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-brand-muted);
  opacity: 0.6;
}

/* ===== FEATURES GRID ===== */
.features {
  background: transparent;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.feature-card {
  padding: 28px;
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base);
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 16px;
}
.feature-title {
  font-size: var(--text-base);
  font-weight: 700;
  margin-bottom: 8px;
}
.feature-desc {
  font-size: var(--text-sm);
  color: var(--color-brand-muted);
  line-height: 1.6;
}

/* ===== RETAIL SECTION ===== */
.retail-section {
  background: var(--color-bg-pattern);
}
.retail-split {
  display: flex;
  align-items: center;
  gap: 72px;
}
.retail-text {
  flex: 1;
}
.retail-text .section-header {
  text-align: left;
  margin-bottom: 0;
}
.retail-text .section-tag {
  margin-bottom: 12px;
}
.retail-text .section-title {
  margin-bottom: 12px;
}
.retail-text .section-desc {
  margin: 0 0 24px 0;
  max-width: 100%;
}
.retail-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}
.retail-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-brand-dark);
}
.retail-list li i {
  color: var(--color-green);
  font-size: 18px;
}
.retail-types-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.retail-type-card {
  text-align: center;
  transition: transform var(--transition-base);
  cursor: default;
}
.retail-type-card:hover {
  transform: translateY(-3px);
}
.rt-icon {
  width: 44px;
  height: 44px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin: 0 auto 10px;
}
.rt-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-brand-dark);
}

/* ===== FLOW ===== */
.flow-section {
  background: var(--color-surface);
  border-top: 1px solid var(--border-color);
}
.flow-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.flow-step {
  flex: 1;
  min-width: 180px;
  max-width: 220px;
  text-align: center;
}
.flow-step-num {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 2px;
  margin-bottom: 12px;
  text-transform: uppercase;
}
.flow-step-icon {
  width: 56px;
  height: 56px;
  background: var(--color-primary-light);
  border: 2px solid rgba(59, 130, 246, 0.15);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: var(--color-primary);
  margin: 0 auto 16px;
}
.flow-step h4 {
  font-size: var(--text-base);
  font-weight: 700;
  margin-bottom: 8px;
}
.flow-step p {
  font-size: var(--text-sm);
  color: var(--color-brand-muted);
  line-height: 1.5;
}
.flow-arrow {
  font-size: 20px;
  color: var(--color-brand-muted);
  opacity: 0.4;
  margin-top: 68px;
  flex-shrink: 0;
}

/* ===== PRICING ===== */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}
.pricing-card {
  position: relative;
  transition: transform var(--transition-base);
}
.pricing-card:hover {
  transform: translateY(-4px);
}
.pricing-popular {
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 1px var(--color-primary),
    var(--shadow-md);
}
.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
  padding: 4px 16px;
  border-radius: var(--border-radius-pill);
  white-space: nowrap;
}
.plan-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-brand-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}
.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}
.plan-amount {
  font-size: var(--text-4xl);
  font-weight: 800;
  color: var(--color-brand-dark);
}
.plan-period {
  font-size: var(--text-sm);
  color: var(--color-brand-muted);
  font-weight: 500;
}
.plan-desc {
  font-size: var(--text-sm);
  color: var(--color-brand-muted);
}
.plan-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.plan-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-sm);
  color: var(--color-brand-dark);
  font-weight: 500;
}
.plan-features li i {
  color: var(--color-green);
  font-size: 16px;
  flex-shrink: 0;
}

/* ===== CTA ===== */
.cta-section {
  background: transparent;
}
.cta-card {
  position: relative;
  overflow: hidden;
  text-align: center;
}
.cta-content {
  position: relative;
  z-index: 1;
}
.cta-card h2 {
  font-size: var(--text-3xl);
  margin-bottom: 12px;
}
.cta-card p {
  font-size: var(--text-base);
  color: var(--color-brand-muted);
  margin-bottom: 28px;
}
.cta-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* ===== FOOTER ===== */
.footer {
  background: #0f172a; /* Dark navy matching the "RETAILCHAIN" text */
  padding: 48px 0 24px;
  color: rgba(255, 255, 255, 0.6);
  border-top: 4px solid;
  border-image: linear-gradient(to right, #0d9488, #06b6d4) 1; /* Teal to Cyan gradient matching the storefront icon */
}
.footer .brand-name {
  color: #fff;
}
.footer .brand-icon {
  background: var(--color-primary);
}
.footer-top {
  display: flex;
  gap: 64px;
  margin-bottom: 36px;
}
.footer-brand {
  flex: 1.5;
}
.footer-brand p {
  margin-top: 12px;
  font-size: var(--text-sm);
  line-height: 1.7;
}
.footer-links {
  display: flex;
  gap: 48px;
}
.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-col h5 {
  font-size: var(--text-sm);
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}
.footer-col a {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.5);
  transition: color var(--transition-fast);
}
.footer-col a:hover {
  color: #fff;
}
.footer .divider {
  border-color: rgba(255, 255, 255, 0.1);
}
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20px;
  font-size: var(--text-sm);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  .hero {
    flex-direction: column;
    min-height: auto;
    padding-top: 60px;
  }
  .hero-mockup {
    max-width: 100%;
    width: 100%;
  }
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .retail-split {
    flex-direction: column;
    gap: 40px;
  }
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin: 0 auto;
  }
  .flow-steps {
    gap: 20px;
  }
  .flow-arrow {
    display: none;
  }
}
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .mobile-menu-btn {
    display: block;
  }
  .nav-cta .btn-outline {
    display: none;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .retail-types-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .footer-top {
    flex-direction: column;
    gap: 32px;
  }
  .footer-links {
    flex-wrap: wrap;
    gap: 28px;
  }
  .brands-logos {
    gap: 24px;
  }
  .hero-stats {
    flex-wrap: wrap;
    gap: 16px;
  }
}
</style>
