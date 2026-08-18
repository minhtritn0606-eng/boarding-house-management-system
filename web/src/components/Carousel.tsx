import { useState } from 'react'

type Props = { images?: string[] }

export default function Carousel({ images = [] }: Props) {
  const [idx, setIdx] = useState(0)
  if (!images || images.length === 0) return null

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)
  const next = () => setIdx((i) => (i + 1) % images.length)

  return (
    <div className="carousel">
      <button className="carousel-btn" onClick={prev}>‹</button>
      <img src={images[idx]} alt={`slide-${idx}`} />
      <button className="carousel-btn" onClick={next}>›</button>
    </div>
  )
}
