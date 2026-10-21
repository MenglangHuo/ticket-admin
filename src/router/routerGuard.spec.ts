import { describe, it, expect, beforeEach } from 'vitest'
import router from './index'

describe('Router Role Guard', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await router.push('/login')
  })

  it('redirects unauthorized branch admin to login with role_unauthorized query and clears tokens', async () => {
    localStorage.setItem('bronx_access_token', 'stale_token')
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 300,
        username: 'branch_manager',
        role: 'BRANCH ADMIN',
      }),
    )

    await router.push('/ticket')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.error).toBe('role_unauthorized')
    expect(localStorage.getItem('bronx_access_token')).toBeNull()
    expect(localStorage.getItem('bronx_user')).toBeNull()
  })

  it('allows user with role TICKET ADMIN to access protected /ticket route', async () => {
    localStorage.setItem('bronx_access_token', 'ticket_token')
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 301,
        username: 'ticket_admin',
        role: 'TICKET ADMIN',
      }),
    )

    await router.push('/ticket')

    expect(router.currentRoute.value.name).toBe('ticket')
  })

  it('allows user with role HQ ADMIN to access protected /ticket route', async () => {
    localStorage.setItem('bronx_access_token', 'hq_token')
    localStorage.setItem(
      'bronx_user',
      JSON.stringify({
        id: 1,
        username: 'hq_admin',
        role: 'HQ ADMIN',
      }),
    )

    await router.push('/ticket')

    expect(router.currentRoute.value.name).toBe('ticket')
  })
})
