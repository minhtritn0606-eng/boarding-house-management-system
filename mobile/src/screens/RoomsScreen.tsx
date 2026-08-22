import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native'
import { useRooms } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import type { MobileRoom, RoomType, RoomStatus } from '../types/room'

const ALL_AMENITIES = [
  'Điều hòa',
  'Gác lửng',
  'Nóng lạnh',
  'Wifi tốc độ cao',
  'Tủ lạnh',
  'Máy giặt chung',
  'Bếp riêng',
  'Ban công',
  'Khóa vân tay',
  'Chỗ để xe riêng',
]

export default function RoomsScreen() {
  const { user } = useAuth()
  const { rooms, branches, addRoom, updateRoom, deleteRoom, toggleRoomStatus, getRoomsByOwner } =
    useRooms()

  const myRooms = getRoomsByOwner(user?.email)

  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'rented' | 'available'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<MobileRoom | null>(null)

  // Add/Edit Form State
  const [formHouseName, setFormHouseName] = useState(branches[0]?.name || 'Dãy trọ chính')
  const [formRoomNumber, setFormRoomNumber] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formArea, setFormArea] = useState('')
  const [formFloor, setFormFloor] = useState('1')
  const [formRoomType, setFormRoomType] = useState<RoomType>('private')
  const [formStatus, setFormStatus] = useState<RoomStatus>('available')
  const [formAmenities, setFormAmenities] = useState<string[]>([])
  const [formNote, setFormNote] = useState('')

  // Filter Logic
  const filteredRooms = myRooms.filter((room) => {
    // Branch filter
    if (selectedBranch !== 'all' && room.houseName !== selectedBranch) return false
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

  const rentedCount = myRooms.filter((r) => r.status === 'rented').length
  const availableCount = myRooms.filter((r) => r.status === 'available').length

  const openAddModal = () => {
    setFormHouseName(branches[0]?.name || 'Dãy trọ chính')
    setFormRoomNumber('')
    setFormTitle('')
    setFormPrice('')
    setFormArea('')
    setFormFloor('1')
    setFormRoomType('private')
    setFormStatus('available')
    setFormAmenities(['Wifi tốc độ cao', 'Nóng lạnh'])
    setFormNote('')
    setEditingRoom(null)
    setIsAddModalOpen(true)
  }

  const openEditModal = (room: MobileRoom) => {
    setEditingRoom(room)
    setFormHouseName(room.houseName)
    setFormRoomNumber(room.roomNumber)
    setFormTitle(room.title)
    setFormPrice(String(room.price))
    setFormArea(String(room.area))
    setFormFloor(String(room.floor || 1))
    setFormRoomType(room.roomType)
    setFormStatus(room.status)
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
        houseName: formHouseName,
        roomNumber: formRoomNumber.trim(),
        title: formTitle.trim(),
        price: priceNum,
        area: areaNum,
        floor: floorNum,
        roomType: formRoomType,
        status: formStatus,
        amenities: formAmenities,
        note: formNote.trim(),
      })
      Alert.alert('Thành công', 'Đã cập nhật thông tin phòng trọ!')
    } else {
      addRoom({
        houseName: formHouseName,
        roomNumber: formRoomNumber.trim(),
        title: formTitle.trim(),
        price: priceNum,
        area: areaNum,
        floor: floorNum,
        roomType: formRoomType,
        status: formStatus,
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Quản lý Phòng trọ</Text>
          <Text style={styles.screenSubtitle}>
            {myRooms.length} phòng ({availableCount} trống • {rentedCount} đang thuê)
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>➕ Thêm phòng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Search Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo số phòng, tên phòng hoặc khách thuê..."
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

        {/* Branch Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.branchScroll}
        >
          <TouchableOpacity
            style={[styles.branchChip, selectedBranch === 'all' && styles.branchChipActive]}
            onPress={() => setSelectedBranch('all')}
          >
            <Text
              style={[
                styles.branchChipText,
                selectedBranch === 'all' && styles.branchChipTextActive,
              ]}
            >
              Tất cả dãy nhà ({myRooms.length})
            </Text>
          </TouchableOpacity>

          {branches.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.branchChip, selectedBranch === b.name && styles.branchChipActive]}
              onPress={() => setSelectedBranch(b.name)}
            >
              <Text
                style={[
                  styles.branchChipText,
                  selectedBranch === b.name && styles.branchChipTextActive,
                ]}
              >
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filter Tabs */}
        <View style={styles.statusFilterBar}>
          <TouchableOpacity
            style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
              Tất cả ({myRooms.length})
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
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>Không tìm thấy phòng phù hợp</Text>
            <Text style={styles.emptyDesc}>
              Hãy thử thay đổi bộ lọc hoặc thêm phòng trọ mới vào hệ thống.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
              <Text style={styles.emptyAddBtnText}>➕ Thêm phòng ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.roomList}>
            {filteredRooms.map((room) => {
              const isAvailable = room.status === 'available'
              return (
                <View key={room.id} style={styles.roomCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.roomBadgeRow}>
                      <View style={styles.roomNumberPill}>
                        <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
                      </View>
                      <Text style={styles.houseTag}>{room.houseName}</Text>
                    </View>

                    {/* Status Toggle Button */}
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        isAvailable ? styles.statusAvailable : styles.statusRented,
                      ]}
                      onPress={() => toggleRoomStatus(room.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isAvailable ? '#f59e0b' : '#22c55e' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusToggleText,
                          { color: isAvailable ? '#92400e' : '#166534' },
                        ]}
                      >
                        {isAvailable ? 'Còn trống' : 'Đang thuê'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Room Title */}
                  <Text style={styles.roomTitle}>{room.title}</Text>

                  {/* Key Metrics */}
                  <View style={styles.metricRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Giá thuê</Text>
                      <Text style={styles.metricPrice}>
                        {room.price.toLocaleString('vi-VN')}₫
                        <Text style={styles.metricPeriod}>/tháng</Text>
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Diện tích</Text>
                      <Text style={styles.metricValue}>{room.area} m²</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Tầng</Text>
                      <Text style={styles.metricValue}>Tầng {room.floor || 1}</Text>
                    </View>
                  </View>

                  {/* Tenant Info if Rented */}
                  {!isAvailable && room.tenantName && (
                    <View style={styles.tenantBox}>
                      <Text style={styles.tenantIcon}>👤</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tenantName}>Khách: {room.tenantName}</Text>
                        {room.tenantPhone && (
                          <Text style={styles.tenantPhone}>📞 {room.tenantPhone}</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Amenities Tags */}
                  <View style={styles.amenityRow}>
                    {(room.amenities || []).slice(0, 3).map((am, i) => (
                      <View key={i} style={styles.amenityTag}>
                        <Text style={styles.amenityText}>{am}</Text>
                      </View>
                    ))}
                    {(room.amenities || []).length > 3 && (
                      <View style={[styles.amenityTag, styles.amenityMore]}>
                        <Text style={styles.amenityMoreText}>
                          +{(room.amenities || []).length - 3}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Actions */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => openEditModal(room)}
                    >
                      <Text style={styles.cardActionText}>✏️ Chỉnh sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardActionBtn, styles.deleteActionBtn]}
                      onPress={() => handleDeleteRoom(room)}
                    >
                      <Text style={styles.deleteActionText}>🗑️ Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

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
              {/* House Branch Selector */}
              <Text style={styles.formLabel}>Dãy nhà trọ *</Text>
              <View style={styles.branchSelectGrid}>
                {branches.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.branchSelectChip,
                      formHouseName === b.name && styles.branchSelectChipActive,
                    ]}
                    onPress={() => setFormHouseName(b.name)}
                  >
                    <Text
                      style={[
                        styles.branchSelectText,
                        formHouseName === b.name && styles.branchSelectTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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

              {/* Room Status */}
              <Text style={styles.formLabel}>Trạng thái ban đầu</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    formStatus === 'available' && styles.typeBtnActive,
                  ]}
                  onPress={() => setFormStatus('available')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      formStatus === 'available' && styles.typeBtnTextActive,
                    ]}
                  >
                    🟡 Còn trống
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    formStatus === 'rented' && styles.typeBtnActive,
                  ]}
                  onPress={() => setFormStatus('rented')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      formStatus === 'rented' && styles.typeBtnTextActive,
                    ]}
                  >
                    🟢 Đang cho thuê
                  </Text>
                </TouchableOpacity>
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
    </SafeAreaView>
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
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 32,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomNumberPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomNumberText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  houseTag: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
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
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metricPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
    marginTop: 2,
  },
  metricPeriod: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  tenantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  tenantIcon: {
    fontSize: 16,
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
    marginBottom: 12,
  },
  amenityTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  amenityMore: {
    backgroundColor: '#e2e8f0',
  },
  amenityMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  deleteActionBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
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
})
