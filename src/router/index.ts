import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true, standalone: true },
    },
    {
      path: '/two-factor',
      name: 'two-factor',
      component: () => import('@/views/TwoFactorView.vue'),
      meta: { requiresPendingTwoFactor: true, standalone: true },
      alias: ['/two_factor'],
    },
    {
      path: '/',
      redirect: '/ticket',
    },
    {
      path: '/ticket',
      name: 'ticket',
      component: () => import('@/views/TicketsView.vue'),
      meta: { requiresAuth: true },
      alias: ['/tickets'],
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('@/views/ClientsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/client-ticket',
      name: 'client-ticket',
      component: () => import('@/views/ClientTicketView.vue'),
      meta: { public: true, standalone: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/ticket',
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('bronx_access_token');
  const isAuthenticated = !!token;

  // Check if there is an active pending 2FA challenge
  let hasPendingTwoFactor = false;
  const pendingRaw = sessionStorage.getItem('bronx_pending_2fa');
  if (pendingRaw) {
    try {
      const parsed = JSON.parse(pendingRaw);
      hasPendingTwoFactor = !!(parsed && (!parsed.expiresAt || Date.now() <= parsed.expiresAt));
    } catch {
      hasPendingTwoFactor = false;
    }
  }

  // If already authenticated and trying to visit login or two-factor
  if (isAuthenticated && (to.meta.guestOnly || to.meta.requiresPendingTwoFactor)) {
    return { name: 'ticket' };
  }

  // If page requires completed authentication
  if (to.meta.requiresAuth && !isAuthenticated) {
    if (hasPendingTwoFactor) {
      return { name: 'two-factor' };
    }
    return { name: 'login' };
  }

  // If page requires pending two-factor verification
  if (to.meta.requiresPendingTwoFactor && !hasPendingTwoFactor) {
    return { name: 'login' };
  }
});

export default router;
