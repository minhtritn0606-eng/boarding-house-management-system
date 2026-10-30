/**
 * Image compression utility to optimize user uploaded photos
 * Scales high-resolution photos down and converts to optimized Base64 Data URL
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.82
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

        // Downscale proportionally if larger than maximum limits
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

        ctx.drawImage(img, 0, 0, width, height)

        try {
          // Compress as image/jpeg (or webp if supported)
          const compressed = canvas.toDataURL('image/jpeg', quality)
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
