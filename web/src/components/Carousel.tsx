import { useState } from 'react'

type Props = { images?: string[] }

export default function Carousel({ images = [] }: Props) {
  const [idx, setIdx] = useState(0)
  if (!images || images.length === 0) return null

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIdx((i) => (i - 1 + images.length) % images.length)
  }
  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIdx((i) => (i + 1) % images.length)
  }

  return (
    <div className="carousel-wrapper">
      <div className="carousel-container">
        <img
          src={images[idx]}
          alt={`Hình ảnh phòng ${idx + 1}`}
          className="carousel-main-image"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="carousel-nav-btn prev"
              onClick={prev}
              aria-label="Ảnh trước"
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel-nav-btn next"
              onClick={next}
              aria-label="Ảnh kế tiếp"
            >
              ›
            </button>
            <div className="carousel-counter">
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="carousel-thumbnails">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              className={`carousel-thumb-btn ${i === idx ? 'active' : ''}`}
              onClick={() => setIdx(i)}
            >
              <img src={img} alt={`Thumbnail ${i + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
