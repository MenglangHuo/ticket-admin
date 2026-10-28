/**
 * Types for Background File Upload Manager
 */

export type UploadTaskStatus = 'compressing' | 'uploading' | 'completed' | 'error'

export interface BackgroundUploadTask {
  id: string
  ticketId: number
  ticketKey: string
  fileCount: number
  totalBytes: number
  progress: number // 0 to 100
  status: UploadTaskStatus
  errorMessage?: string
  files: File[]
  createdAt: number
}
