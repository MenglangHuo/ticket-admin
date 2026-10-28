import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUploadQueueStore } from '@/stores/uploadQueueStore'
import { ticketApi } from '@/api/ticketApi'

describe('useUploadQueueStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('enqueues background upload task and tracks completion', async () => {
    const uploadSpy = vi.spyOn(ticketApi, 'uploadAttachments').mockResolvedValue({
      data: [
        {
          id: 1,
          ticket_id: 50,
          file_name: 'test.png',
          file_url: 'http://example.com/test.png',
          file_size: 100,
          mime_type: 'image/png',
          created_at: '2026-10-27',
        },
      ],
      success: true,
    })

    const store = useUploadQueueStore()
    const dummyFile = new File(['data'], 'test.png', { type: 'image/png' })

    const onComplete = vi.fn()
    const taskId = await store.enqueueUpload(50, 'TCK-50', [dummyFile], onComplete)

    expect(taskId).toBeTruthy()
    expect(store.tasks.length).toBe(1)
    const task = store.tasks[0]!
    expect(task.ticketId).toBe(50)
    expect(task.ticketKey).toBe('TCK-50')

    // Wait for async task execution
    await new Promise((r) => setTimeout(r, 50))

    expect(uploadSpy).toHaveBeenCalledWith(50, expect.any(Array), expect.any(Function))
    expect(task.status).toBe('completed')
    expect(task.progress).toBe(100)
    expect(onComplete).toHaveBeenCalled()
  })

  it('handles upload failure gracefully and records error message', async () => {
    vi.spyOn(ticketApi, 'uploadAttachments').mockRejectedValue(new Error('Network disconnected'))

    const store = useUploadQueueStore()
    const dummyFile = new File(['data'], 'error.pdf', { type: 'application/pdf' })

    await store.enqueueUpload(60, 'TCK-60', [dummyFile])
    await new Promise((r) => setTimeout(r, 50))

    const task = store.tasks[0]!
    expect(task.status).toBe('error')
    expect(task.errorMessage).toContain('Network disconnected')
  })

  it('allows dismissing a task', async () => {
    const store = useUploadQueueStore()
    const dummyFile = new File(['data'], 'file.png', { type: 'image/png' })
    const taskId = await store.enqueueUpload(70, 'TCK-70', [dummyFile])

    expect(store.tasks.length).toBe(1)
    store.dismissTask(taskId)
    expect(store.tasks.length).toBe(0)
  })
})
