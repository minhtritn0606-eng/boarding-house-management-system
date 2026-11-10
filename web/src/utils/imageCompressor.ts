/**
 * Image compression utility to optimize user uploaded photos
 * Scales high-resolution photos with 2K clarity and high-fidelity smoothing
 */
export async function compressImageFile(
  file: File,
  maxWidth = 2560,
  maxHeight = 1920,
  quality = 0.92
): Promise<string> {
  return new Promise((resolve) => {
    // If not standard image or SVG, read directly as data URL
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) || '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const src = readerEvent.target?.result as string
      if (!src) {
        resolve('')
        return
      }

      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Downscale proportionally only if strictly larger than 2K limits
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(src)
          return
        }

        // Enable high quality anti-aliasing / smoothing to prevent blurriness
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ctx.drawImage(img, 0, 0, width, height)

        try {
          // Attempt modern WebP for razor sharp results with smaller footprint, fallback to high-quality JPEG
          let compressed = canvas.toDataURL('image/webp', quality)
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality)
          }
          resolve(compressed)
        } catch {
          resolve(src)
        }
      }

      img.onerror = () => {
        resolve(src)
      }

      img.src = src
    }

    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}
