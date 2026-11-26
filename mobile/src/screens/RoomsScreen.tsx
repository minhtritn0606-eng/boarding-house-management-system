import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRooms } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import type { MobileRoom, RoomType, RoomStatus } from '../types/room'
import type { TabType } from '../components/BottomTabBar'

const ALL_AMENITIES = [
  'Wifi tốc độ cao',
  'Điều hòa',
  'Máy giặt',
  'Bình nóng lạnh',
  'Nhà vệ sinh riêng',
  'Tủ lạnh',
  'Gác lửng',
  'Chỗ để xe',
  'Ban công',
  'Thang máy',
  'Giờ giấc tự do',
  'Bếp nấu ăn',
  'Camera an ninh',
  'Bảo vệ 24/7',
  'Khóa vân tay',
  'Không chung chủ',
  'Tủ quần áo',
  'Giường nệm',
  'Bàn làm việc',
  'Cửa sổ',
  'Nuôi thú cưng',
  'Sân phơi',
  'Tủ bếp',
  'Tivi',
]

interface RoomsScreenProps {
  onNavigateTab?: (tab: TabType, payload?: any) => void
  initialAction?: any
}

export default function RoomsScreen({ onNavigateTab, initialAction }: RoomsScreenProps) {
  const { user } = useAuth()
  const {
    rooms,
    addRoom,
    updateRoom,
    deleteRoom,
    togglePublishRoom,
    getRoomsByOwner,
    vacateRoom,
    refreshRooms,
  } = useRooms()

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (refreshRooms) {
        await refreshRooms()
      }
    } catch { }
    setIsRefreshing(false)
  }

  const myRooms = getRoomsByOwner(user?.email)

  const [filterStatus, setFilterStatus] = useState<'all' | 'rented' | 'available'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFloor, setFilterFloor] = useState<'all' | number>('all')
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false)
  const [expandedRoomIds, setExpandedRoomIds] = useState<Record<string, boolean>>({})

  const toggleExpandRoom = (id: string) => {
    setExpandedRoomIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<MobileRoom | null>(null)

  // Phản hồi khi được chuyển hướng từ màn hình khác (Dashboard / Khách thuê / Hóa đơn)
  useEffect(() => {
    if (initialAction) {
      if (initialAction.action === 'addRoom') {
        openAddModal()
      } else if (initialAction.filterStatus) {
        setFilterStatus(initialAction.filterStatus)
      } else if (initialAction.searchQuery) {
        setSearchQuery(initialAction.searchQuery)
      }
    }
  }, [initialAction])

  const handleCheckOutRoom = (room: MobileRoom) => {
    Alert.alert(
      'Trả phòng / Check-out',
      `Bạn có chắc chắn muốn làm thủ tục trả phòng cho phòng ${room.roomNumber}? Trạng thái phòng sẽ được chuyển về "Còn trống".`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận trả phòng',
          style: 'destructive',
          onPress: () => {
            vacateRoom(room.roomNumber)
            Alert.alert('Thành công', `Phòng ${room.roomNumber} đã được chuyển về trạng thái còn trống.`)
          },
        },
      ]
    )
  }

  // Add/Edit Form State
  const [formRoomNumber, setFormRoomNumber] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formArea, setFormArea] = useState('')
  const [formFloor, setFormFloor] = useState('1')
  const [formRoomType, setFormRoomType] = useState<RoomType>('private')
  const [formAmenities, setFormAmenities] = useState<string[]>([])
  const [formNote, setFormNote] = useState('')

  // Floor Filter Logic
  const availableFloors = useMemo(() => {
    const floorSet = new Set<number>()
    myRooms.forEach((r) => {
      const f = Number(r.floor) || 1
      floorSet.add(f)
    })
    const sorted = Array.from(floorSet).sort((a, b) => a - b)
    return sorted.length > 0 ? sorted : [1]
  }, [myRooms])

  const roomsInScope = useMemo(() => {
    if (filterFloor === 'all') return myRooms
    return myRooms.filter((r) => (Number(r.floor) || 1) === filterFloor)
  }, [myRooms, filterFloor])

  // Filter Logic
  const filteredRooms = useMemo(() => {
    return roomsInScope.filter((room) => {
      // Status filter
      if (filterStatus !== 'all' && room.status !== filterStatus) return false
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = room.roomNumber.toLowerCase().includes(q)
        const matchTitle = room.title.toLowerCase().includes(q)
        const matchTenant = (room.tenantName || '').toLowerCase().includes(q)
        if (!matchNumber && !matchTitle && !matchTenant) return false
      }
      return true
    })
  }, [roomsInScope, filterStatus, searchQuery])

  const rentedCount = roomsInScope.filter((r) => r.status === 'rented').length
  const availableCount = roomsInScope.filter((r) => r.status === 'available').length

  const openAddModal = () => {
    setFormRoomNumber('')
    setFormTitle('')
    setFormPrice('')
    setFormArea('')
    setFormFloor('1')
    setFormRoomType('private')
    setFormAmenities(['Wifi tốc độ cao', 'Nóng lạnh'])
    setFormNote('')
    setEditingRoom(null)
    setIsAddModalOpen(true)
  }

  const openEditModal = (room: MobileRoom) => {
    setEditingRoom(room)
    setFormRoomNumber(room.roomNumber)
    setFormTitle(room.title)
    setFormPrice(String(room.price))
    setFormArea(String(room.area))
    setFormFloor(String(room.floor || 1))
    setFormRoomType(room.roomType)
    setFormAmenities(room.amenities || [])
    setFormNote(room.note || '')
    setIsAddModalOpen(true)
  }

  const handleToggleAmenity = (amenity: string) => {
    if (formAmenities.includes(amenity)) {
      setFormAmenities((prev) => prev.filter((a) => a !== amenity))
    } else {
      setFormAmenities((prev) => [...prev, amenity])
    }
  }

  const handleSaveRoom = () => {
    if (!formRoomNumber.trim() || !formTitle.trim() || !formPrice.trim() || !formArea.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ Số phòng, Tiêu đề, Giá thuê và Diện tích')
      return
    }

    const priceNum = parseInt(formPrice.replace(/\D/g, ''), 10) || 2000000
    const areaNum = parseFloat(formArea) || 20
    const floorNum = parseInt(formFloor, 10) || 1

    if (editingRoom) {
      updateRoom(editingRoom.id, {
        roomNumber: formRoomNumber.trim(),
        title: formTitle.trim(),
        price: priceNum,
        area: areaNum,
        floor: floorNum,
        roomType: formRoomType,
        status: editingRoom.status, // Giữ nguyên trạng thái thực tế của phòng, không đổi thủ công tại form
        amenities: formAmenities,
        note: formNote.trim(),
      })
      Alert.alert('Thành công', 'Đã cập nhật thông tin phòng trọ!')
    } else {
      addRoom({
        houseName: '',
        roomNumber: formRoomNumber.trim(),
        title: formTitle.trim(),
        price: priceNum,
        area: areaNum,
        floor: floorNum,
        roomType: formRoomType,
        status: 'available', // Mặc định luôn là Còn trống khi tạo phòng mới
        ownerEmail: user?.email || 'nam.owner@example.com',
        amenities: formAmenities,
        note: formNote.trim(),
      })
      Alert.alert('Thành công', 'Đã thêm phòng trọ mới vào hệ thống!')
    }

    setIsAddModalOpen(false)
  }

  const handleDeleteRoom = (room: MobileRoom) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa "${room.roomNumber} - ${room.title}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: () => deleteRoom(room.id),
        },
      ]
    )
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.screenTitle}>Phòng trọ</Text>
          <Text style={styles.screenSubtitle} numberOfLines={1}>
            {myRooms.length} phòng • {availableCount} trống • {rentedCount} đang thuê
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Thêm phòng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        {/* Search & Floor Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm số phòng, tên phòng..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.floorFilterBtn,
              filterFloor !== 'all' && styles.floorFilterBtnActive,
            ]}
            onPress={() => setIsFloorModalOpen(true)}
            activeOpacity={0.7}
            delayPressIn={0}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text
              style={[
                styles.floorFilterBtnText,
                filterFloor !== 'all' && styles.floorFilterBtnTextActive,
              ]}
            >
              {filterFloor === 'all' ? 'Tất cả tầng ▾' : `Tầng ${filterFloor} ▾`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.statusFilterBar}>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
              Tất cả ({roomsInScope.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'available' && styles.filterTabActive]}
            onPress={() => setFilterStatus('available')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === 'available' && styles.filterTabTextActive,
              ]}
            >
              🟡 Còn trống ({availableCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'rented' && styles.filterTabActive]}
            onPress={() => setFilterStatus('rented')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === 'rented' && styles.filterTabTextActive,
              ]}
            >
              🟢 Đang thuê ({rentedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rooms List */}
        {filteredRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Không tìm thấy phòng</Text>
            <Text style={styles.emptyDesc}>
              Hãy thử thay đổi bộ lọc hoặc thêm phòng trọ mới vào hệ thống.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
              <Text style={styles.emptyAddBtnText}> Thêm phòng ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.roomList}>
            {filteredRooms.map((room, idx) => {
              const isAvailable = room.status === 'available'
              const isExpanded = !!expandedRoomIds[room.id]
              const roomTypeLabel =
                room.roomType === 'studio'
                  ? 'Studio'
                  : room.roomType === 'shared'
                    ? 'Ở ghép'
                    : 'Khép kín'

              return (
                <View
                  key={`${room.id}-${idx}`}
                  style={[styles.roomCard, isExpanded && styles.roomCardExpanded]}
                >
                  {/* Collapsible Header: Chạm để mở rộng / thu gọn */}
                  <TouchableOpacity
                    style={styles.cardHeaderTouchable}
                    onPress={() => toggleExpandRoom(room.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      {/* Left: Số phòng & Thông tin phòng */}
                      <View style={styles.roomHeaderLeft}>
                        <View style={styles.roomNumberPill}>
                          <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
                        </View>
                        <View style={styles.roomMetaCol}>
                          <Text style={styles.roomTitle} numberOfLines={1}>
                            {room.title}
                          </Text>
                          <Text style={styles.roomSubInfo}>
                            {roomTypeLabel} • {room.area}m² • Tầng {room.floor || 1}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Giá thuê & Trạng thái */}
                      <View style={styles.roomHeaderRight}>
                        <Text style={styles.headerPrice}>
                          {room.price.toLocaleString('vi-VN')}₫
                          <Text style={styles.headerPeriod}>/th</Text>
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            isAvailable ? styles.statusAvailable : styles.statusRented,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: isAvailable ? '#f59e0b' : '#22c55e' },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isAvailable ? '#92400e' : '#166534' },
                            ]}
                          >
                            {isAvailable ? 'Còn trống' : 'Đang thuê'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Chi tiết chỉ hiển thị khi mở rộng */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {/* Thông tin khách thuê nếu phòng đang cho thuê */}
                      {!isAvailable && room.tenantName && (
                        <View style={styles.tenantBox}>
                          <Text style={styles.tenantIcon}>👤</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tenantName}>
                              Khách thuê: {room.tenantName}
                            </Text>
                            {room.tenantPhone && (
                              <Text style={styles.tenantPhone}>{room.tenantPhone}</Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Tiện nghi phòng trọ */}
                      {(room.amenities || []).length > 0 && (
                        <View style={styles.amenityRow}>
                          {(room.amenities || []).map((am, i) => (
                            <View key={i} style={styles.amenityTag}>
                              <Text style={styles.amenityText}>{am}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Cụm thao tác nghiệp vụ (Đã bỏ icon bút chì và thùng rác) */}
                      <View style={styles.cardActionsContainer}>
                        {!isAvailable ? (
                          <>
                            {/* Hàng 1: Lập hóa đơn & Hồ sơ khách thuê */}
                            <View style={styles.actionsRow}>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.billBtn]}
                                onPress={() =>
                                  onNavigateTab &&
                                  onNavigateTab('bills', {
                                    action: 'createBill',
                                    roomNumber: room.roomNumber,
                                    houseName: room.houseName,
                                    tenantName: room.tenantName,
                                    tenantPhone: room.tenantPhone,
                                    roomFee: room.price,
                                  })
                                }
                                activeOpacity={0.7}
                              >
                                <Text style={styles.billBtnText}>Lập hóa đơn</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.tenantProfileBtn]}
                                onPress={() =>
                                  onNavigateTab &&
                                  onNavigateTab('tenants', { searchQuery: room.roomNumber })
                                }
                                activeOpacity={0.7}
                              >
                                <Text style={styles.tenantProfileBtnText}>Hồ sơ khách</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Hàng 2: Chỉnh sửa, Trả phòng, Xóa (Bỏ icon bút chì và thùng rác) */}
                            <View style={styles.actionsRow}>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.editBtn]}
                                onPress={() => openEditModal(room)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.checkoutBtn]}
                                onPress={() => handleCheckOutRoom(room)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.checkoutBtnText}>Trả phòng</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.deleteBtn]}
                                onPress={() => handleDeleteRoom(room)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.deleteBtnText}>Xóa</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : (
                          <>
                            {/* Hàng 1: Tiếp nhận khách Check-in */}
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.checkinBtn]}
                              onPress={() =>
                                onNavigateTab &&
                                onNavigateTab('tenants', {
                                  action: 'checkin',
                                  roomNumber: room.roomNumber,
                                  houseName: room.houseName,
                                  monthlyRent: room.price,
                                })
                              }
                              activeOpacity={0.7}
                            >
                              <Text style={styles.checkinBtnText}>Tiếp nhận khách (Check-in)</Text>
                            </TouchableOpacity>

                            {/* Hàng 2: Chỉnh sửa & Xóa (Bỏ icon bút chì và thùng rác) */}
                            <View style={styles.actionsRow}>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.editBtn]}
                                onPress={() => openEditModal(room)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, styles.deleteBtn]}
                                onPress={() => handleDeleteRoom(room)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.deleteBtnText}>Xóa phòng</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Floor Filter Modal (Ngăn kéo trượt từ dưới lên che cả bottom menu) */}
      <Modal
        visible={isFloorModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFloorModalOpen(false)}
      >
        <View style={styles.floorModalOverlay}>
          {/* Backdrop chạm ra ngoài để đóng */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsFloorModalOpen(false)}
          />

          {/* Ngăn kéo trượt từ đáy màn hình che cả menu */}
          <View style={styles.floorModalContent}>
            <View style={styles.floorModalHeader}>
              <Text style={styles.floorModalTitle}>Lọc theo tầng</Text>
              <TouchableOpacity
                onPress={() => setIsFloorModalOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.floorModalCloseBtn}
              >
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.floorOptionsContainer}>
              {/* Tất cả các tầng */}
              <TouchableOpacity
                style={[
                  styles.floorOptionItem,
                  filterFloor === 'all' && styles.floorOptionItemActive,
                ]}
                onPress={() => {
                  setFilterFloor('all')
                  setIsFloorModalOpen(false)
                }}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text
                  style={[
                    styles.floorOptionText,
                    filterFloor === 'all' && styles.floorOptionTextActive,
                  ]}
                >
                  Tất cả các tầng
                </Text>
                <View style={styles.floorOptionRight}>
                  <Text
                    style={[
                      styles.floorOptionCount,
                      filterFloor === 'all' && styles.floorOptionCountActive,
                    ]}
                  >
                    {myRooms.length} phòng
                  </Text>
                  {filterFloor === 'all' && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>

              {/* Từng tầng: Chỉ hiển thị tầng và số lượng phòng */}
              {availableFloors.map((fl) => {
                const isSelected = filterFloor === fl
                const count = myRooms.filter(
                  (r) => (Number(r.floor) || 1) === fl
                ).length
                return (
                  <TouchableOpacity
                    key={fl}
                    style={[
                      styles.floorOptionItem,
                      isSelected && styles.floorOptionItemActive,
                    ]}
                    onPress={() => {
                      setFilterFloor(fl)
                      setIsFloorModalOpen(false)
                    }}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <Text
                      style={[
                        styles.floorOptionText,
                        isSelected && styles.floorOptionTextActive,
                      ]}
                    >
                      Tầng {fl}
                    </Text>
                    <View style={styles.floorOptionRight}>
                      <Text
                        style={[
                          styles.floorOptionCount,
                          isSelected && styles.floorOptionCountActive,
                        ]}
                      >
                        {count} phòng
                      </Text>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Room Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoom ? '✏️ Chỉnh sửa phòng trọ' : '➕ Thêm phòng trọ mới'}
              </Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Room Number & Floor */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Số phòng (ví dụ P.101) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="P.104"
                    value={formRoomNumber}
                    onChangeText={setFormRoomNumber}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={styles.formLabel}>Tầng</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="1"
                    keyboardType="numeric"
                    value={formFloor}
                    onChangeText={setFormFloor}
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.formLabel}>Tên / Tiêu đề phòng *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Phòng đơn full nội thất ban công"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Price & Area */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Giá thuê (VNĐ/tháng) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="2500000"
                    keyboardType="numeric"
                    value={formPrice}
                    onChangeText={setFormPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Diện tích (m²) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="20"
                    keyboardType="numeric"
                    value={formArea}
                    onChangeText={setFormArea}
                  />
                </View>
              </View>

              {/* Room Type */}
              <Text style={styles.formLabel}>Loại phòng</Text>
              <View style={styles.typeRow}>
                {[
                  { key: 'private', label: 'Khép kín' },
                  { key: 'shared', label: 'Ở ghép' },
                  { key: 'studio', label: 'Studio' },
                ].map((t) => {
                  const isSelected = formRoomType === t.key
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                      onPress={() => setFormRoomType(t.key as RoomType)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.typeBtnText,
                          isSelected && styles.typeBtnTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Amenities */}
              <Text style={styles.formLabel}>Tiện nghi phòng trọ</Text>
              <View style={styles.amenitySelectGrid}>
                {ALL_AMENITIES.map((item) => {
                  const isChecked = formAmenities.includes(item)
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.amenitySelectChip,
                        isChecked && styles.amenitySelectChipActive,
                      ]}
                      onPress={() => handleToggleAmenity(item)}
                    >
                      <Text
                        style={[
                          styles.amenitySelectText,
                          isChecked && styles.amenitySelectTextActive,
                        ]}
                      >
                        {isChecked ? '✓ ' : '+ '}
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Note */}
              <Text style={styles.formLabel}>Ghi chú thêm (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Ghi chú về đồ dùng, hạn hợp đồng..."
                multiline
                value={formNote}
                onChangeText={setFormNote}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRoom}>
                <Text style={styles.saveBtnText}>
                  {editingRoom ? 'Cập nhật phòng' : 'Lưu & Thêm phòng'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    minHeight: 68,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 32,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 42,
  },
  floorFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  floorFilterBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  floorFilterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  floorFilterBtnTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94a3b8',
    padding: 4,
  },
  branchScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  branchChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  branchChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  branchChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  branchChipTextActive: {
    color: '#ffffff',
  },
  statusFilterBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  roomList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  roomCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  roomCardExpanded: {
    borderColor: '#cbd5e1',
  },
  cardHeaderTouchable: {
    paddingVertical: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  roomNumberPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  roomNumberText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  roomMetaCol: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  roomSubInfo: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  roomHeaderRight: {
    alignItems: 'flex-end',
  },
  headerPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 3,
  },
  headerPeriod: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  statusAvailable: {
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
  },
  statusRented: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tenantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  tenantIcon: {
    fontSize: 14,
  },
  tenantName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  tenantPhone: {
    fontSize: 11,
    color: '#64748b',
  },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  amenityTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  amenityText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  cardActionsContainer: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  billBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  tenantProfileBtn: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  tenantProfileBtnText: {
    color: '#7e22ce',
    fontSize: 12,
    fontWeight: '700',
  },
  checkinBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 9,
  },
  checkinBtnText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  checkoutBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  checkoutBtnText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Floor Drawer Modal Styles (Kéo từ dưới lên che cả bottom menu)
  floorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  floorModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 24,
  },
  floorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  floorModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  floorModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  floorOptionsContainer: {
    gap: 8,
  },
  floorOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  floorOptionItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  floorOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  floorOptionTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  floorOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floorOptionCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  floorOptionCountActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  branchSelectGrid: {
    gap: 6,
  },
  branchSelectChip: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  branchSelectChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  branchSelectText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  branchSelectTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  typeBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  amenitySelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenitySelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amenitySelectChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  amenitySelectText: {
    fontSize: 12,
    color: '#475569',
  },
  amenitySelectTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  crossActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  crossActionBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossActionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
})
