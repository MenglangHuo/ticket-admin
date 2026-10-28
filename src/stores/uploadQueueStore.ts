import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BackgroundUploadTask } from '@/types/upload'
import { ticketApi } from '@/api/ticketApi'
import { compressFiles } from '@/utils/imageCompressor'
import { useToastStore } from './toastStore'

/**
 * Background Upload Queue Store
 *
 * Implements Single Responsibility Principle (SRP) to manage
 * non-blocking background file uploads with progress reporting and retry capability.
 */
export const useUploadQueueStore = defineStore('uploadQueue', () => {
  const toastStore = useToastStore()
  const tasks = ref<BackgroundUploadTask[]>([])

  const activeTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'compressing' || t.status === 'uploading'),
  )

  const hasActiveTasks = computed(() => activeTasks.value.length > 0)

  /**
   * Enqueue a new background upload task for a ticket.
   */
  async function enqueueUpload(
    ticketId: number,
    ticketKey: string,
    files: File[],
    onCompletedCallback?: (attachments: any[]) => void,
  ): Promise<string> {
    if (!files || files.length === 0) return ''

    const taskId = Math.random().toString(36).substring(2, 9)
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0)

    const task: BackgroundUploadTask = {
      id: taskId,
      ticketId,
      ticketKey,
      fileCount: files.length,
      totalBytes,
      progress: 0,
      status: 'compressing',
      files,
      createdAt: Date.now(),
    }

    tasks.value.unshift(task)

    // Execute upload in background
    runTask(task, onCompletedCallback)

    return taskId
  }

  async function runTask(
    task: BackgroundUploadTask,
    onCompletedCallback?: (attachments: any[]) => void,
  ) {
    try {
      task.status = 'compressing'
      task.progress = 5

      // Step 1: Optimize images client-side before sending to server
      const optimizedFiles = await compressFiles(task.files)

      task.status = 'uploading'
      task.progress = 15

      // Step 2: Stream multipart files to backend with live progress
      const response = await ticketApi.uploadAttachments(
        task.ticketId,
        optimizedFiles,
        (percent) => {
          task.progress = Math.max(15, percent)
        },
      )

      task.progress = 100
      task.status = 'completed'

      const uploadedList = response?.data || []
      if (onCompletedCallback && Array.isArray(uploadedList)) {
        onCompletedCallback(uploadedList)
      }

      toastStore.success(
        'Upload Complete',
        `${task.fileCount} attachment(s) uploaded to ${task.ticketKey}`,
      )

      // Auto dismiss completed task after 4 seconds
      setTimeout(() => {
        dismissTask(task.id)
      }, 4000)
    } catch (err: any) {
      task.status = 'error'
      task.errorMessage = err.response?.data?.message || err.message || 'Upload failed'
      toastStore.error(
        'Attachment Upload Failed',
        `Failed to upload attachments to ${task.ticketKey}: ${task.errorMessage}`,
      )
    }
  }

  function retryUpload(
    taskId: string,
    onCompletedCallback?: (attachments: any[]) => void,
  ) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return
    task.errorMessage = undefined
    task.progress = 0
    runTask(task, onCompletedCallback)
  }

  function dismissTask(taskId: string) {
    tasks.value = tasks.value.filter((t) => t.id !== taskId)
  }

  return {
    tasks,
    activeTasks,
    hasActiveTasks,
    enqueueUpload,
    retryUpload,
    dismissTask,
  }
})
