import { describe, it, expect } from 'vitest'
import { isCompressibleImage, compressImageFile, compressFiles } from '@/utils/imageCompressor'

describe('imageCompressor utility', () => {
  it('correctly identifies compressible raster images', () => {
    const png = new File(['dummy'], 'test.png', { type: 'image/png' })
    const jpeg = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })
    const webp = new File(['dummy'], 'test.webp', { type: 'image/webp' })
    const gif = new File(['dummy'], 'test.gif', { type: 'image/gif' })
    const svg = new File(['dummy'], 'test.svg', { type: 'image/svg+xml' })
    const pdf = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })

    expect(isCompressibleImage(png)).toBe(true)
    expect(isCompressibleImage(jpeg)).toBe(true)
    expect(isCompressibleImage(webp)).toBe(true)
    expect(isCompressibleImage(gif)).toBe(false)
    expect(isCompressibleImage(svg)).toBe(false)
    expect(isCompressibleImage(pdf)).toBe(false)
  })

  it('skips compression when file size is below minimum threshold', async () => {
    const smallFile = new File(['small'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await compressImageFile(smallFile, { minSizeToCompress: 1000 })
    expect(result).toBe(smallFile)
  })

  it('handles batch file compression without errors', async () => {
    const file1 = new File(['hello'], 'doc.pdf', { type: 'application/pdf' })
    const file2 = new File(['small'], 'img.png', { type: 'image/png' })

    const results = await compressFiles([file1, file2])
    expect(results).toHaveLength(2)
    expect(results[0]?.name).toBe('doc.pdf')
    expect(results[1]?.name).toBe('img.png')
  })
})
