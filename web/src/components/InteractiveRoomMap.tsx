import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Room } from '../data/sampleRooms'

interface InteractiveRoomMapProps {
  rooms: Room[]
  selectedRoomId?: number | null
  onSelectRoom?: (room: Room) => void
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  // Đà Nẵng & Các Trường ĐH
  'bách khoa': { lat: 16.0738, lng: 108.1499 },
  'sư phạm': { lat: 16.0601, lng: 108.1585 },
  'kinh tế': { lat: 16.0526, lng: 108.2435 },
  'ngoại ngữ': { lat: 16.0336, lng: 108.2127 },
  'duy tân': { lat: 16.0608, lng: 108.2178 },
  'chợ hòa khánh': { lat: 16.0692, lng: 108.1518 },
  'hòa khánh': { lat: 16.0738, lng: 108.1499 },
  'hòa minh': { lat: 16.0633, lng: 108.1685 },
  'liên chiểu': { lat: 16.0738, lng: 108.1499 },
  'hải châu': { lat: 16.0684, lng: 108.2208 },
  'thanh khê': { lat: 16.0628, lng: 108.1932 },
  'sơn trà': { lat: 16.0825, lng: 108.2433 },
  'ngũ hành sơn': { lat: 16.0189, lng: 108.2568 },
  'cẩm lệ': { lat: 16.0152, lng: 108.1996 },
  'hòa vang': { lat: 16.0125, lng: 108.1345 },
  'vku': { lat: 15.9805, lng: 108.2513 },
  'lê trung đình': { lat: 15.9805, lng: 108.2513 },
  'lê thiện trị': { lat: 15.9785, lng: 108.2511 },
  'huỳnh văn nghệ': { lat: 15.9783, lng: 108.2500 },
  'huỳnh lắm': { lat: 15.9846, lng: 108.2537 },
  'nguyễn lương bằng': { lat: 16.0745, lng: 108.1512 },
  'tôn đức thắng': { lat: 16.062, lng: 108.167 },
  'đà nẵng': { lat: 16.0544, lng: 108.2022 },
  // Hà Nội & TP.HCM
  'hà nội': { lat: 21.0285, lng: 105.8542 },
  'cầu giấy': { lat: 21.0362, lng: 105.7906 },
  'đống đa': { lat: 21.0181, lng: 105.8299 },
  'hồ chí minh': { lat: 10.8231, lng: 106.6297 },
  'tp.hcm': { lat: 10.8231, lng: 106.6297 },
  'quận 1': { lat: 10.7756, lng: 106.7004 },
  'quận 3': { lat: 10.7843, lng: 106.6843 },
}

export function getRoomCoordinates(room: Room): { lat: number; lng: number } {
  // Convert potential string numbers from MySQL to float
  const numLat = Number(room.latitude)
  const numLng = Number(room.longitude)
  if (!isNaN(numLat) && !isNaN(numLng) && numLat > 5 && numLng > 100) {
    return { lat: numLat, lng: numLng }
  }

  const text = `${room.title || ''} ${room.address || ''} ${room.district || ''} ${room.city || ''}`.toLowerCase()
  let baseLat = 16.0684
  let baseLng = 108.2208

  for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
    if (text.includes(key)) {
      baseLat = coords.lat
      baseLng = coords.lng
      break
    }
  }

  const idNum = Number(room.id) || 1
  const angle = idNum * 137.5 * (Math.PI / 180)
  const radius = 0.002 + (idNum % 7) * 0.0008
  return {
    lat: Number((baseLat + Math.sin(angle) * radius).toFixed(6)),
    lng: Number((baseLng + Math.cos(angle) * radius).toFixed(6)),
  }
}

function formatPriceShort(price: any): string {
  const p = Number(price) || 0
  if (p >= 1000000) {
    const tr = (p / 1000000).toFixed(1).replace('.0', '')
    return `${tr} tr`
  }
  if (p >= 1000) {
    return `${Math.round(p / 1000)}k`
  }
  return `${p}đ`
}

function createPriceDivIcon(price: any, isSelected: boolean): L.DivIcon {
  const priceText = formatPriceShort(price)
  const bg = isSelected ? '#059669' : '#ffffff'
  const textColor = isSelected ? '#ffffff' : '#0f172a'
  const border = isSelected ? '2px solid #047857' : '1.5px solid #cbd5e1'
  const scale = isSelected ? 'scale(1.2)' : 'scale(1)'
  const zIdx = isSelected ? 9999 : 100
  const shadow = isSelected
    ? '0 6px 18px rgba(5, 150, 105, 0.45)'
    : '0 3px 10px rgba(0, 0, 0, 0.16)'

  return L.divIcon({
    className: 'custom-leaflet-price-pin-wrapper',
    html: `
      <div class="map-price-marker-pin ${isSelected ? 'selected' : ''}" style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: ${scale};
        transform-origin: bottom center;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
        z-index: ${zIdx};
        user-select: none;
      ">
        <div style="
          background: ${bg};
          color: ${textColor};
          border: ${border};
          font-weight: 800;
          font-size: 13px;
          line-height: 1.2;
          padding: 5px 11px;
          border-radius: 20px;
          box-shadow: ${shadow};
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: -0.2px;
          transition: all 0.15s ease;
        ">
          <span>${priceText}</span>
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${bg};
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
        "></div>
      </div>
    `,
    iconSize: [72, 38],
    iconAnchor: [36, 34],
    popupAnchor: [0, -34],
  })
}

function InteractiveRoomMap({
  rooms,
  selectedRoomId,
  onSelectRoom,
}: InteractiveRoomMapProps) {
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerByRoomIdRef = useRef<Map<number, L.Marker>>(new Map())

  const [mapReady, setMapReady] = useState(false)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')

  const onSelectRoomRef = useRef(onSelectRoom)
  useEffect(() => {
    onSelectRoomRef.current = onSelectRoom
  }, [onSelectRoom])

  const prevSelectedIdRef = useRef<number | null>(null)
  const prevRoomIdsSignatureRef = useRef<string>('')

  // Global navigation helper for Leaflet popups
  useEffect(() => {
    ; (window as any).__navigateToRoom = (id: number) => {
      navigate(`/rooms/${id}`)
    }
    return () => {
      delete (window as any).__navigateToRoom
    }
  }, [navigate])

  // Switch between Roadmap & Satellite Hybrid without recreating the map
  const updateTileLayer = (type: 'roadmap' | 'satellite') => {
    if (!mapInstanceRef.current) return
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current)
    }

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

  // 1. Initialize Map instance once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [16.0684, 108.2208],
        zoom: 13,
        zoomControl: true,
      })

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

      const markersGroup = L.layerGroup().addTo(map)
      markersLayerRef.current = markersGroup

      mapInstanceRef.current = map
      setMapReady(true)

      setTimeout(() => {
        map.invalidateSize()
      }, 150)
      setTimeout(() => {
        map.invalidateSize()
      }, 500)
    }

    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersLayerRef.current = null
        setMapReady(false)
      }
    }
  }, [])

  // 2. Render Markers on Map
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markersLayerRef.current) return
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current

    // Signature based on IDs and prices
    const currentSignature = rooms.map((r) => `${r.id}_${r.price}`).join('|')
    const hasFilterChanged = currentSignature !== prevRoomIdsSignatureRef.current

    if (hasFilterChanged) {
      prevRoomIdsSignatureRef.current = currentSignature
      markersGroup.clearLayers()
      markerByRoomIdRef.current.clear()

      if (rooms.length === 0) return

      const bounds = L.latLngBounds([])

      rooms.forEach((room) => {
        const coords = getRoomCoordinates(room)
        bounds.extend([coords.lat, coords.lng])

        const isSelected = room.id === selectedRoomId
        const icon = createPriceDivIcon(room.price, isSelected)

        const marker = L.marker([coords.lat, coords.lng], {
          icon,
          title: `${room.title} - ${new Intl.NumberFormat('vi-VN').format(Number(room.price) || 0)} đ`,
        })

        const displayImg =
          (room.images && room.images.length > 0 && room.images[0]) ||
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80'

        const roomTypeLabel =
          room.roomType === 'private'
            ? 'Phòng đơn'
            : room.roomType === 'shared'
              ? 'Phòng đôi'
              : 'Căn hộ mini'

        const popupHtml = `
          <div class="map-room-popup-card">
            <div class="popup-thumb-wrap">
              <img src="${displayImg}" alt="${room.title}" class="popup-thumb-img" onerror="this.src='https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80'" />
              <span class="popup-type-tag">${roomTypeLabel}</span>
            </div>
            <div class="popup-body">
              <div class="popup-price-row">
                <span class="popup-price-val">${new Intl.NumberFormat('vi-VN').format(Number(room.price) || 0)} đ</span>
                <span class="popup-price-period">/ tháng</span>
              </div>
              <h4 class="popup-room-title" title="${room.title}">${room.title}</h4>
              <div class="popup-meta-line">
                <span>📍 ${room.district || room.city}</span>
                ${room.area ? `<span>📐 ${room.area} m²</span>` : ''}
              </div>
              <button type="button" class="btn-popup-view-room" onclick="window.__navigateToRoom(${room.id})">
                Xem chi tiết phòng ➔
              </button>
            </div>
          </div>
        `

        marker.bindPopup(popupHtml, {
          maxWidth: 280,
          minWidth: 260,
          className: 'custom-map-leaflet-popup',
        })

        marker.on('click', () => {
          onSelectRoomRef.current?.(room)
        })

        marker.addTo(markersGroup)
        markerByRoomIdRef.current.set(room.id, marker)
      })

      // Auto fit bounds only when rooms list changes
      if (bounds.isValid()) {
        if (rooms.length === 1) {
          const c = getRoomCoordinates(rooms[0])
          map.setView([c.lat, c.lng], 15)
        } else {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
        }
      }
    }
  }, [mapReady, rooms, selectedRoomId])

  // 3. Smooth room selection without resetting map or reloading tiles
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const prevId = prevSelectedIdRef.current

    // Unselect previous marker
    if (prevId && prevId !== selectedRoomId) {
      const prevMarker = markerByRoomIdRef.current.get(prevId)
      const prevRoom = rooms.find((r) => r.id === prevId)
      if (prevMarker && prevRoom) {
        prevMarker.setIcon(createPriceDivIcon(prevRoom.price, false))
        prevMarker.setZIndexOffset(0)
      }
    }

    // Select new marker
    if (selectedRoomId) {
      const currMarker = markerByRoomIdRef.current.get(selectedRoomId)
      const currRoom = rooms.find((r) => r.id === selectedRoomId)
      if (currMarker && currRoom) {
        currMarker.setIcon(createPriceDivIcon(currRoom.price, true))
        currMarker.setZIndexOffset(1000)

        const coords = getRoomCoordinates(currRoom)
        const currentZoom = map.getZoom()

        if (currentZoom >= 15) {
          map.panTo([coords.lat, coords.lng], {
            animate: true,
            duration: 0.45,
          })
        } else {
          map.flyTo([coords.lat, coords.lng], 15, {
            animate: true,
            duration: 0.6,
          })
        }

        currMarker.openPopup()
      }
    }

    prevSelectedIdRef.current = selectedRoomId || null
  }, [selectedRoomId, mapReady, rooms])

  const handleFitAll = () => {
    const map = mapInstanceRef.current
    if (!map || rooms.length === 0) return
    const bounds = L.latLngBounds([])
    rooms.forEach((r) => {
      const c = getRoomCoordinates(r)
      bounds.extend([c.lat, c.lng])
    })
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }

  return (
    <div className="interactive-room-map-wrapper">
      {/* Floating map controls */}
      <div className="map-floating-controls">
        <div className="map-type-segmented-control">
          <button
            type="button"
            className={`map-type-btn ${mapType === 'roadmap' ? 'active' : ''}`}
            onClick={() => updateTileLayer('roadmap')}
          >
            Bản đồ
          </button>
          <button
            type="button"
            className={`map-type-btn ${mapType === 'satellite' ? 'active' : ''}`}
            onClick={() => updateTileLayer('satellite')}
          >
            Vệ tinh
          </button>
        </div>

        <button
          type="button"
          className="map-fit-bounds-btn"
          onClick={handleFitAll}
          title="Thu phóng vừa tất cả phòng"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span>Xem tất cả</span>
        </button>

        <div className="map-rooms-counter-pill">
          <span>📍 <strong>{rooms.length}</strong> phòng</span>
        </div>
      </div>

      {/* Leaflet map DOM element */}
      <div ref={mapContainerRef} className="interactive-room-map-canvas" />
    </div>
  )
}

export default React.memo(InteractiveRoomMap)
