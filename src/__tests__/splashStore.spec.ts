import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSplashStore } from '@/stores/splashStore'

describe('splashStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default visible state for first-load', () => {
    const store = useSplashStore()
    expect(store.isVisible).toBe(true)
    expect(store.isInitialLoading).toBe(true)
    expect(store.isLoading).toBe(true)
    expect(store.title).toBe('Ticket Admin')
    expect(store.subtitle).toBe('Ticket Management')
    expect(store.message).toBe('Loading application...')
    expect(store.progress).toBeNull()
  })

  it('shows splash screen with updated message and options', () => {
    const store = useSplashStore()
    store.hide(0)
    expect(store.isVisible).toBe(false)

    store.show('Loading tickets...', {
      title: 'Custom Portal',
      subtitle: 'Syncing data',
      progress: 45,
    })

    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('Loading tickets...')
    expect(store.title).toBe('Custom Portal')
    expect(store.subtitle).toBe('Syncing data')
    expect(store.progress).toBe(45)
  })

  it('hides immediately when delayMs is 0', () => {
    const store = useSplashStore()
    store.hide(0)

    expect(store.isVisible).toBe(false)
    expect(store.isInitialLoading).toBe(false)
    expect(store.progress).toBeNull()
  })

  it('hides after specified delay timer', () => {
    const store = useSplashStore()
    store.hide(200)

    expect(store.isVisible).toBe(true)
    vi.advanceTimersByTime(199)
    expect(store.isVisible).toBe(true)

    vi.advanceTimersByTime(1)
    expect(store.isVisible).toBe(false)
    expect(store.isInitialLoading).toBe(false)
  })

  it('cancels pending hide if show() is called again', () => {
    const store = useSplashStore()
    store.hide(200)

    // Call show before timer fires
    store.show('New operation')
    vi.advanceTimersByTime(300)

    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('New operation')
  })

  it('finishInitialLoad smoothly hides initial splash', () => {
    const store = useSplashStore()
    store.finishInitialLoad(150)

    expect(store.isVisible).toBe(true)
    vi.advanceTimersByTime(150)
    expect(store.isVisible).toBe(false)
    expect(store.isInitialLoading).toBe(false)
  })

  it('setProgress and setMessage update state properly', () => {
    const store = useSplashStore()
    store.setProgress(80)
    expect(store.progress).toBe(80)

    store.setMessage('Almost done...')
    expect(store.message).toBe('Almost done...')
  })

  it('wraps an async promise with splash screen loading state', async () => {
    const store = useSplashStore()
    store.hide(0)
    expect(store.isVisible).toBe(false)

    const asyncTask = new Promise<string>((resolve) => {
      setTimeout(() => resolve('done'), 100)
    })

    const wrappedPromise = store.wrap(asyncTask, 'Processing...')
    expect(store.isVisible).toBe(true)
    expect(store.message).toBe('Processing...')

    vi.advanceTimersByTime(100)
    const result = await wrappedPromise
    expect(result).toBe('done')

    // Advances timer for hide delay
    vi.advanceTimersByTime(200)
    expect(store.isVisible).toBe(false)
  })

  it('removes pre-mount #app-splash-screen element from the DOM', () => {
    const el = document.createElement('div')
    el.id = 'app-splash-screen'
    document.body.appendChild(el)

    const store = useSplashStore()
    store.removePreMountSplash(350)

    expect(el.classList.contains('splash-fade-out')).toBe(true)
    vi.advanceTimersByTime(350)
    expect(document.getElementById('app-splash-screen')).toBeNull()
  })
})
