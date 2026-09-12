import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationPickerProps {
  address?: string
  district?: string
  city?: string
  latitude?: number
  longitude?: number
  onChange: (coords: { latitude: number; longitude: number } | null) => void
}

// Custom crisp SVG Pin Icon (no external asset dependencies)
const customPinIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `
    <div style="
      position: relative;
      width: 34px;
      height: 34px;
      background: #dc2626;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
    ">
      <div style="
        width: 11px;
        height: 11px;
        background: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
})

// Comprehensive Vietnam Coordinates & Landmark Dictionary
const VIETNAM_GEO_DICT: Record<string, { lat: number; lng: number }> = {
  // Đà Nẵng & Các Trường ĐH / Địa danh
  'đh bách khoa đà nẵng': { lat: 16.0738, lng: 108.1499 },
  'đại học bách khoa': { lat: 16.0738, lng: 108.1499 },
  'đh sư phạm đà nẵng': { lat: 16.0601, lng: 108.1585 },
  'đại học sư phạm': { lat: 16.0601, lng: 108.1585 },
  'đh kinh tế đà nẵng': { lat: 16.0526, lng: 108.2435 },
  'đại học kinh tế': { lat: 16.0526, lng: 108.2435 },
  'đh ngoại ngữ đà nẵng': { lat: 16.0336, lng: 108.2127 },
  'đại học duy tân': { lat: 16.0608, lng: 108.2178 },
  'chợ hòa khánh': { lat: 16.0692, lng: 108.1518 },
  'bến xe đà nẵng': { lat: 16.0612, lng: 108.1678 },
  'cầu rồng': { lat: 16.0610, lng: 108.2274 },
  'cầu sông hàn': { lat: 16.0718, lng: 108.2245 },
  'bệnh viện ung bướu': { lat: 16.0789, lng: 108.1554 },

  // Đường phố & Phường tại Đà Nẵng
  'ngô thì nhậm': { lat: 16.0769, lng: 108.1542 },
  'nguyễn lương bằng': { lat: 16.0745, lng: 108.1512 },
  'tôn đức thắng': { lat: 16.0620, lng: 108.1670 },
  'nguyễn văn linh': { lat: 16.0615, lng: 108.2155 },
  'hàm nghi': { lat: 16.0645, lng: 108.2110 },
  'hùng vương': { lat: 16.0695, lng: 108.2195 },
  'lê duẩn': { lat: 16.0720, lng: 108.2160 },
  'hòa khánh nam': { lat: 16.0678, lng: 108.1524 },
  'hòa khánh bắc': { lat: 16.0792, lng: 108.1478 },
  'hòa khánh': { lat: 16.0745, lng: 108.1512 },
  'hòa minh': { lat: 16.0633, lng: 108.1685 },
  'hòa hiệp nam': { lat: 16.0965, lng: 108.1287 },
  'hòa hiệp bắc': { lat: 16.1215, lng: 108.1132 },
  'liên chiểu': { lat: 16.0738, lng: 108.1499 },
  'hải châu': { lat: 16.0684, lng: 108.2208 },
  'thanh khê': { lat: 16.0628, lng: 108.1932 },
  'sơn trà': { lat: 16.0825, lng: 108.2433 },
  'ngũ hành sơn': { lat: 16.0189, lng: 108.2568 },
  'cẩm lệ': { lat: 16.0152, lng: 108.1996 },
  'hòa vang': { lat: 16.0125, lng: 108.1345 },
  'đà nẵng': { lat: 16.0544, lng: 108.2022 },

  // Hà Nội & TP.HCM
  'hà nội': { lat: 21.0285, lng: 105.8542 },
  'cầu giấy': { lat: 21.0362, lng: 105.7906 },
  'đống đa': { lat: 21.0181, lng: 105.8299 },
  'bách khoa hà nội': { lat: 21.0056, lng: 105.8433 },
  'thanh xuân': { lat: 20.9984, lng: 105.8087 },
  'ba đình': { lat: 21.0341, lng: 105.8239 },
  'hồ chí minh': { lat: 10.8231, lng: 106.6297 },
  'tp.hcm': { lat: 10.8231, lng: 106.6297 },
  'quận 1': { lat: 10.7756, lng: 106.7004 },
  'quận 3': { lat: 10.7843, lng: 106.6843 },
  'bình thạnh': { lat: 10.8106, lng: 106.7091 },
  'thủ đức': { lat: 10.8494, lng: 106.7537 },
}

export default function LocationPicker({
  address = '',
  district = '',
  city = 'Đà Nẵng',
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  // Default coordinate: Da Nang center
  const defaultLat = latitude || 16.0738
  const defaultLng = longitude || 108.1499
  const hasCoords = latitude !== undefined && longitude !== undefined

  // Change Google Maps Layer (Roadmap vs Satellite Hybrid)
  const updateTileLayer = (type: 'roadmap' | 'satellite') => {
    if (!mapInstanceRef.current) return
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current)
    }

    // Google Maps Roadmap ('m') vs Google Maps Satellite Hybrid ('y')
    const lyrs = type === 'satellite' ? 'y' : 'm'
    const newLayer = L.tileLayer(
      `https://{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`,
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      }
    )
    newLayer.addTo(mapInstanceRef.current)
    tileLayerRef.current = newLayer
    setMapType(type)
  }

  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: hasCoords ? 18 : 15,
        zoomControl: true,
      })

      // Initial Google Maps Tile layer
      const googleTileLayer = L.tileLayer(
        'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps',
        }
      )
      googleTileLayer.addTo(map)
      tileLayerRef.current = googleTileLayer

      // Marker setup
      if (hasCoords) {
        const marker = L.marker([latitude, longitude], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map)

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onChange({
            latitude: Number(pos.lat.toFixed(6)),
            longitude: Number(pos.lng.toFixed(6)),
          })
        })
        markerRef.current = marker
      }

      // Click to pin on map
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng
        const fixedLat = Number(lat.toFixed(6))
        const fixedLng = Number(lng.toFixed(6))

        if (markerRef.current) {
          markerRef.current.setLatLng([fixedLat, fixedLng])
        } else {
          const newMarker = L.marker([fixedLat, fixedLng], {
            icon: customPinIcon,
            draggable: true,
          }).addTo(map)

          newMarker.on('dragend', () => {
            const pos = newMarker.getLatLng()
            onChange({
              latitude: Number(pos.lat.toFixed(6)),
              longitude: Number(pos.lng.toFixed(6)),
            })
          })
          markerRef.current = newMarker
        }

        onChange({ latitude: fixedLat, longitude: fixedLng })
        setSearchMsg('Đã ghim vị trí tại điểm bạn chọn!')
      })

      mapInstanceRef.current = map

      setTimeout(() => map.invalidateSize(), 100)
      setTimeout(() => map.invalidateSize(), 300)
      setTimeout(() => map.invalidateSize(), 600)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        tileLayerRef.current = null
      }
    }
  }, [])

  // Sync external coordinates
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    if (latitude !== undefined && longitude !== undefined) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude])
      } else {
        const newMarker = L.marker([latitude, longitude], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map)

        newMarker.on('dragend', () => {
          const pos = newMarker.getLatLng()
          onChange({
            latitude: Number(pos.lat.toFixed(6)),
            longitude: Number(pos.lng.toFixed(6)),
          })
        })
        markerRef.current = newMarker
      }
    } else if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
  }, [latitude, longitude])

  // Helper to place marker and pan map
  const applyCoordinates = (lat: number, lng: number, zoomLevel = 18, msg = 'Đã ghim vị trí!') => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoomLevel, { duration: 1.0 })

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const newMarker = L.marker([lat, lng], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(mapInstanceRef.current)

        newMarker.on('dragend', () => {
          const pos = newMarker.getLatLng()
          onChange({
            latitude: Number(pos.lat.toFixed(6)),
            longitude: Number(pos.lng.toFixed(6)),
          })
        })
        markerRef.current = newMarker
      }
    }

    onChange({ latitude: lat, longitude: lng })
    setSearchMsg(msg)
  }

  // Parse Raw Coordinates or Google Maps URL
  const parseCoordinatesOrGoogleUrl = (text: string): { lat: number; lng: number } | null => {
    const raw = text.trim()

    // 1. Match coordinates "16.074521, 108.151234" or "16.074521 108.151234"
    const coordMatch = raw.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1])
      const lng = parseFloat(coordMatch[2])
      if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
      }
    }

    // 2. Match Google Maps URL "@16.074521,108.151234" or "q=16.074521,108.151234"
    const urlMatch = raw.match(/[@=](-?\d+\.\d+),(-?\d+\.\d+)/)
    if (urlMatch) {
      const lat = parseFloat(urlMatch[1])
      const lng = parseFloat(urlMatch[2])
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
    }

    return null
  }

  // Execute Search from Input or Address Prop
  const performGeocodeSearch = async (searchTerm: string) => {
    setSearchMsg('')
    const cleanTerm = searchTerm.trim()

    if (!cleanTerm) {
      setSearchMsg('Vui lòng nhập tên đường, địa danh hoặc tọa độ để tìm.')
      return
    }

    // 1. Check if user entered coordinates or Google Maps link directly
    const directCoords = parseCoordinatesOrGoogleUrl(cleanTerm)
    if (directCoords) {
      applyCoordinates(directCoords.lat, directCoords.lng, 19, 'Đã ghim vị trí theo tọa độ / link Google Maps!')
      return
    }

    setIsSearching(true)

    // Build progressive search queries
    const queries = [
      [cleanTerm, district, city, 'Việt Nam'].filter(Boolean).join(', '),
      `${cleanTerm}, ${city}, Việt Nam`,
      `${cleanTerm}, Đà Nẵng, Việt Nam`,
      cleanTerm,
      // Strip alley prefixes (e.g. "K120/15" -> "120")
      cleanTerm.replace(/^(k\d+\/\d+|ngõ\s+\d+|hẻm\s+\d+)\s*,?\s*/i, '') + `, ${district || ''} ${city}`,
    ]

    let foundCoords: { lat: number; lng: number } | null = null

    // 2. Search Online Photon / OpenStreetMap API
    for (const q of queries) {
      if (!q.trim()) continue
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates
            foundCoords = {
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
            }
            break
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to Local Vietnam Landmark / Street Dictionary
    if (!foundCoords) {
      const lower = cleanTerm.toLowerCase()
      for (const [key, coords] of Object.entries(VIETNAM_GEO_DICT)) {
        if (lower.includes(key) || key.includes(lower)) {
          foundCoords = coords
          break
        }
      }
    }

    setIsSearching(false)

    if (foundCoords) {
      applyCoordinates(
        foundCoords.lat,
        foundCoords.lng,
        18,
        'Đã tìm thấy vị trí! (Bạn có thể kéo thả ghim đỏ để chỉnh chính xác đến từng mét)'
      )
    } else {
      setSearchMsg('Chưa nhận diện được địa chỉ này. Bạn có thể nhấn trực tiếp trên bản đồ hoặc dán link Google Maps.')
    }
  }

  // Get current GPS position with high accuracy
  const handleGetCurrentGps = () => {
    setSearchMsg('')
    if (!navigator.geolocation) {
      setSearchMsg('Trình duyệt không hỗ trợ định vị GPS.')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setGpsLoading(false)
        applyCoordinates(lat, lng, 19, 'Đã ghim vị trí GPS chính xác của bạn!')
      },
      (err) => {
        console.warn('GPS error:', err)
        setGpsLoading(false)
        setSearchMsg('Không thể lấy GPS (vui lòng cho phép quyền truy cập vị trí trên trình duyệt).')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Clear pin
  const handleClearPin = () => {
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    onChange(null)
    setSearchMsg('')
  }

  return (
    <div className="location-picker-container">
      <div className="location-picker-header">
        <label className="location-picker-label">
          Ghim vị trí trên bản đồ Google Maps (Chính xác đến từng mét)
        </label>
        <div className="location-picker-actions">
          {/* Map Layer Switcher: Roadmap vs Satellite */}
          <div className="map-layer-switch">
            <button
              type="button"
              className={`btn-layer-toggle ${mapType === 'roadmap' ? 'active' : ''}`}
              onClick={() => updateTileLayer('roadmap')}
            >
              Bản đồ
            </button>
            <button
              type="button"
              className={`btn-layer-toggle ${mapType === 'satellite' ? 'active' : ''}`}
              onClick={() => updateTileLayer('satellite')}
            >
              Ảnh vệ tinh
            </button>
          </div>

          <button
            type="button"
            className="btn-map-action"
            onClick={handleGetCurrentGps}
            disabled={gpsLoading}
          >
            {gpsLoading ? 'Đang lấy GPS...' : 'Lấy GPS hiện tại'}
          </button>

          {hasCoords && (
            <button
              type="button"
              className="btn-map-action btn-clear-pin"
              onClick={handleClearPin}
            >
              Xóa ghim
            </button>
          )}
        </div>
      </div>

      {/* Interactive Search Bar directly on the Map */}
      <div className="location-search-bar-row">
        <input
          type="text"
          className="location-search-input"
          placeholder="Nhập tên đường, địa danh (ví dụ: ĐH Bách Khoa, Ngô Thì Nhậm) hoặc tọa độ..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              performGeocodeSearch(searchInput || address)
            }
          }}
        />
        <button
          type="button"
          className="btn-search-locate"
          onClick={() => performGeocodeSearch(searchInput || address)}
          disabled={isSearching}
        >
          {isSearching ? 'Đang tìm...' : 'Tìm vị trí'}
        </button>
      </div>

      {/* Leaflet Map Frame */}
      <div
        ref={mapContainerRef}
        className="location-picker-map"
        style={{
          width: '100%',
          height: '300px',
          borderRadius: '10px',
          border: '1.5px solid #cbd5e1',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Status & Feedback */}
      <div className="location-picker-status-row">
        {hasCoords ? (
          <div className="location-coords-badge">
            <span className="coords-dot"></span>
            <span>
              Đã ghim: <strong>{latitude?.toFixed(6)}, {longitude?.toFixed(6)}</strong>
            </span>
          </div>
        ) : (
          <span className="coords-empty-text">
            Chưa ghim tọa độ — Nhấp vào bản đồ hoặc kéo ghim đỏ để đánh dấu đúng căn nhà.
          </span>
        )}

        {searchMsg && <span className="location-search-msg">{searchMsg}</span>}
      </div>
    </div>
  )
}
