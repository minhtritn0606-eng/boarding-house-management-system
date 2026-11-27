import React, { useState, useEffect } from 'react'
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
  Linking,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTenants } from '../context/TenantContext'
import { useRooms } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import type { Tenant, ContractStatus, Roommate } from '../types/tenant'
import type { TabType } from '../components/BottomTabBar'

interface TenantsScreenProps {
  onNavigateTab?: (tab: TabType, payload?: any) => void
  initialAction?: any
}

export default function TenantsScreen({ onNavigateTab, initialAction }: TenantsScreenProps) {
  const { user } = useAuth()
  const {
    tenants,
    addTenant,
    updateTenant,
    deleteTenant,
    updateContractStatus,
    refreshTenants,
    addRoommate,
    removeRoommate,
  } = useTenants()
  const { rooms, getRoomsByOwner } = useRooms()

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      if (refreshTenants) await refreshTenants()
    } catch { }
    setIsRefreshing(false)
  }

  const myRooms = getRoomsByOwner(user?.email)

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Roommate Modal State
  const [isRoommateModalOpen, setIsRoommateModalOpen] = useState(false)
  const [selectedTenantForRoommate, setSelectedTenantForRoommate] = useState<Tenant | null>(null)
  const [rmName, setRmName] = useState('')
  const [rmPhone, setRmPhone] = useState('')
  const [rmIdCard, setRmIdCard] = useState('')
  const [rmHometown, setRmHometown] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [isReRenting, setIsReRenting] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formIdCard, setFormIdCard] = useState('')
  const [formHometown, setFormHometown] = useState('')
  const [formJob, setFormJob] = useState('')
  const [formRoomNumber, setFormRoomNumber] = useState('P.101')
  const [formStartDate, setFormStartDate] = useState('2026-08-01')
  const [formEndDate, setFormEndDate] = useState('2027-07-31')
  const [formDeposit, setFormDeposit] = useState('2500000')
  const [formMonthlyRent, setFormMonthlyRent] = useState('2500000')
  const [formNotes, setFormNotes] = useState('')

  const matchedSelectedRoom = myRooms.find(
    (r) => r.roomNumber.toLowerCase() === formRoomNumber.trim().toLowerCase()
  )

  // Xử lý khi được chuyển hướng từ màn hình khác (Ví dụ: bấm Nhận khách từ thẻ phòng)
  useEffect(() => {
    if (initialAction) {
      if (initialAction.action === 'checkin') {
        const availableRooms = myRooms.filter((r) => r.status === 'available')
        let targetRoom = null

        if (initialAction.roomNumber) {
          targetRoom = myRooms.find((r) => r.roomNumber.toLowerCase() === initialAction.roomNumber.toLowerCase())
          if (targetRoom && targetRoom.status === 'rented') {
            Alert.alert(
              'Phòng đang được thuê',
              `Phòng ${targetRoom.roomNumber} hiện đang có khách thuê. Vui lòng chọn một phòng còn trống để check-in!`
            )
            return
          }
        }

        const chosenRoom = targetRoom || availableRooms[0]
        if (!chosenRoom && availableRooms.length === 0) {
          Alert.alert(
            'Không có phòng trống',
            'Tất cả các phòng hiện tại đều đang có người thuê. Bạn cần trả phòng trước khi check-in khách mới!'
          )
          return
        }

        setEditingTenant(null)
        setFormName('')
        setFormPhone('')
        setFormIdCard('')
        setFormHometown('')
        setFormJob('')
        setFormRoomNumber(chosenRoom ? chosenRoom.roomNumber : '')
        setFormStartDate(new Date().toISOString().split('T')[0])
        setFormEndDate('2027-08-01')
        const rentStr = String(initialAction.monthlyRent || (chosenRoom ? chosenRoom.price : '2500000'))
        setFormDeposit(rentStr)
        setFormMonthlyRent(rentStr)
        setFormNotes('')
        setIsModalOpen(true)
      } else if (initialAction.searchQuery) {
        setSearchQuery(initialAction.searchQuery)
      }
    }
  }, [initialAction])

  // Filter Logic
  const filteredTenants = tenants.filter((tenant) => {
    // Status filter
    if (filterStatus !== 'all' && tenant.status !== filterStatus) {
      return false
    }
    // Search query: tên, sđt, phòng, cccd của khách đại diện HOẶC người ở cùng
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchName = tenant.name.toLowerCase().includes(q)
      const matchPhone = tenant.phone.includes(q)
      const matchRoom = tenant.roomNumber.toLowerCase().includes(q)
      const matchIdCard = tenant.idCard.includes(q)
      const matchRoommate = (tenant.roommates || []).some((rm) =>
        rm.name.toLowerCase().includes(q) ||
        (rm.phone && rm.phone.includes(q)) ||
        (rm.idCard && rm.idCard.includes(q)) ||
        (rm.hometown && rm.hometown.toLowerCase().includes(q))
      )
      if (!matchName && !matchPhone && !matchRoom && !matchIdCard && !matchRoommate) return false
    }
    return true
  })

  // Format currency
  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ'
  }

  // Open Modal for Add
  const handleOpenAddModal = () => {
    const availableRooms = myRooms.filter((r) => r.status === 'available')
    if (availableRooms.length === 0) {
      Alert.alert(
        'Không có phòng trống',
        'Tất cả các phòng hiện tại đều đang có khách thuê. Bạn cần trả phòng trước khi tiếp nhận khách mới!'
      )
      return
    }

    const firstAvailable = availableRooms[0]
    setIsReRenting(false)
    setEditingTenant(null)
    setFormName('')
    setFormPhone('')
    setFormIdCard('')
    setFormHometown('')
    setFormJob('')
    setFormRoomNumber(firstAvailable.roomNumber)
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormEndDate('2027-08-01')
    setFormDeposit(String(firstAvailable.price))
    setFormMonthlyRent(String(firstAvailable.price))
    setFormNotes('')
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEditModal = (tenant: Tenant) => {
    setIsReRenting(false)
    setEditingTenant(tenant)
    setFormName(tenant.name)
    setFormPhone(tenant.phone)
    setFormIdCard(tenant.idCard)
    setFormHometown(tenant.hometown)
    setFormJob(tenant.job || '')
    setFormRoomNumber(tenant.roomNumber)
    setFormStartDate(tenant.rentStartDate)
    setFormEndDate(tenant.rentEndDate)
    setFormDeposit(String(tenant.deposit))
    setFormMonthlyRent(String(tenant.monthlyRent))
    setFormNotes(tenant.notes || '')
    setIsModalOpen(true)
  }

  // Re-rent Tenant (Thuê lại phòng cho khách đã thanh lý)
  const handleReRentTenant = (tenant: Tenant) => {
    const availableRooms = myRooms.filter((r) => r.status === 'available')
    if (availableRooms.length === 0) {
      Alert.alert(
        'Không có phòng trống',
        'Tất cả các phòng hiện tại đều đang có khách thuê. Bạn cần có phòng còn trống trước khi cho khách này thuê lại!'
      )
      return
    }

    // Ưu tiên chọn lại phòng cũ nếu phòng cũ đang trống, nếu không chọn phòng trống đầu tiên
    const oldRoomIsAvailable = availableRooms.find(
      (r) => r.roomNumber.toLowerCase() === tenant.roomNumber.toLowerCase()
    )
    const selectedRoom = oldRoomIsAvailable || availableRooms[0]

    const todayStr = new Date().toISOString().split('T')[0]
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    const nextYearStr = nextYear.toISOString().split('T')[0]

    const rentPrice = String(selectedRoom ? selectedRoom.price : (tenant.monthlyRent || 2500000))

    setIsReRenting(true)
    setEditingTenant(tenant)
    setFormName(tenant.name)
    setFormPhone(tenant.phone)
    setFormIdCard(tenant.idCard)
    setFormHometown(tenant.hometown)
    setFormJob(tenant.job || '')
    setFormRoomNumber(selectedRoom.roomNumber)
    setFormStartDate(todayStr)
    setFormEndDate(nextYearStr)
    setFormDeposit(rentPrice)
    setFormMonthlyRent(rentPrice)
    setFormNotes(tenant.notes ? `${tenant.notes} (Khách cũ thuê lại)` : 'Khách cũ thuê lại')
    setIsModalOpen(true)
  }

  // Save Tenant
  const handleSaveTenant = () => {
    if (!formName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên khách thuê!')
      return
    }
    if (!formPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ!')
      return
    }
    if (!formIdCard.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập CCCD/CMND của khách thuê!')
      return
    }

    if (!formRoomNumber.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn phòng để check-in khách thuê!')
      return
    }

    const matchedRoom = myRooms.find((r) => r.roomNumber.toLowerCase() === formRoomNumber.trim().toLowerCase())
    if (matchedRoom && matchedRoom.status === 'rented') {
      const isCurrentActiveTenantRoom = editingTenant && !isReRenting && editingTenant.status === 'active' && editingTenant.roomNumber.toLowerCase() === matchedRoom.roomNumber.toLowerCase()
      if (!isCurrentActiveTenantRoom) {
        Alert.alert(
          'Phòng đang được thuê',
          `Phòng ${matchedRoom.roomNumber} hiện đang có khách thuê${matchedRoom.tenantName ? ` (${matchedRoom.tenantName})` : ''}. Bạn chỉ được chọn phòng còn trống để check-in!`
        )
        return
      }
    }

    const rentAmount = matchedRoom ? Number(matchedRoom.price) : (Number(formMonthlyRent) || 2000000)
    const newStatus: ContractStatus = isReRenting ? 'active' : (editingTenant ? editingTenant.status : 'active')

    const tenantPayload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      idCard: formIdCard.trim(),
      hometown: formHometown.trim() || 'Chưa cập nhật',
      job: formJob.trim() || undefined,
      roomId: matchedRoom ? matchedRoom.id : `room_${formRoomNumber}`,
      roomNumber: formRoomNumber,
      houseName: matchedRoom?.houseName || editingTenant?.houseName || 'Nhà trọ',
      rentStartDate: formStartDate,
      rentEndDate: formEndDate,
      deposit: Number(formDeposit) || 0,
      monthlyRent: rentAmount,
      status: newStatus,
      notes: formNotes.trim() || undefined,
    }

    if (editingTenant) {
      updateTenant(editingTenant.id, tenantPayload)
      if (isReRenting) {
        Alert.alert(
          'Thuê lại thành công',
          `Khách ${formName} đã được nhận vào phòng ${formRoomNumber} thành công!`
        )
      } else {
        Alert.alert('Thành công', 'Đã cập nhật thông tin khách thuê!')
      }
    } else {
      addTenant(tenantPayload)
      Alert.alert('Thành công', 'Đã thêm khách thuê và hợp đồng mới thành công!')
    }

    setIsModalOpen(false)
    setIsReRenting(false)
  }

  // Call Tenant
  const handleCallTenant = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', `Số điện thoại: ${phone}`)
    })
  }

  // SMS Tenant
  const handleSmsTenant = (phone: string, name: string, roomNumber: string) => {
    const cleanPhone = phone.replace(/\s+/g, '')
    Linking.openURL(`sms:${cleanPhone}?body=Chào bạn ${name} (${roomNumber}), chủ trọ liên hệ bạn về phòng trọ...`).catch(() => {
      Alert.alert('Không thể mở ứng dụng tin nhắn', `Số điện thoại: ${phone}`)
    })
  }

  // Terminate Contract
  const handleTerminateContract = (tenant: Tenant) => {
    Alert.alert(
      'Thanh lý hợp đồng',
      `Bạn có chắc muốn thanh lý hợp đồng ${tenant.contractNumber} của khách ${tenant.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận thanh lý',
          style: 'destructive',
          onPress: () => {
            updateContractStatus(tenant.id, 'terminated')
            Alert.alert('Đã thanh lý', `Hợp đồng phòng ${tenant.roomNumber} đã kết thúc.`)
          },
        },
      ]
    )
  }

  // Delete Tenant
  const handleDeleteTenant = (tenant: Tenant) => {
    Alert.alert(
      'Xóa hồ sơ khách thuê',
      `Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ của khách ${tenant.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            await deleteTenant(tenant.id)
            Alert.alert('Đã xóa', `Đã xóa hồ sơ của khách ${tenant.name} thành công.`)
          },
        },
      ]
    )
  }

  // Roommate Handlers
  const handleOpenAddRoommate = (tenant: Tenant) => {
    setSelectedTenantForRoommate(tenant)
    setRmName('')
    setRmPhone('')
    setRmIdCard('')
    setRmHometown('')
    setIsRoommateModalOpen(true)
  }

  const handleSaveRoommate = async () => {
    if (!selectedTenantForRoommate) return
    if (!rmName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của người ở cùng.')
      return
    }

    try {
      await addRoommate(selectedTenantForRoommate.id, {
        name: rmName.trim(),
        phone: rmPhone.trim() || undefined,
        idCard: rmIdCard.trim() || undefined,
        hometown: rmHometown.trim() || undefined,
      })
      setIsRoommateModalOpen(false)
      Alert.alert('Đã lưu', `Đã thêm ${rmName.trim()} vào danh sách người ở phòng ${selectedTenantForRoommate.roomNumber}.`)
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm người ở cùng. Vui lòng thử lại!')
    }
  }

  const handleRemoveRoommate = (tenant: Tenant, roommate: Roommate) => {
    Alert.alert(
      'Xóa người ở cùng',
      `Bạn có chắc muốn xóa thông tin của "${roommate.name}" khỏi phòng ${tenant.roomNumber}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận xóa',
          style: 'destructive',
          onPress: async () => {
            await removeRoommate(tenant.id, roommate.id)
          },
        },
      ]
    )
  }

  const activeCount = tenants.filter((t) => t.status === 'active').length
  const totalOccupants = tenants
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + 1 + (t.roommates?.length || 0), 0)

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Khách thuê & Hợp đồng</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeCount} hợp đồng ({totalOccupants} người ở) • {tenants.length} tổng hồ sơ
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Thêm khách</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, số điện thoại, số phòng, CCCD..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <View style={styles.statusFilterRow}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'active', label: '🟢 Đang thuê' },
            { id: 'terminated', label: '🔴 Đã thanh lý' },
          ].map((st) => (
            <TouchableOpacity
              key={st.id}
              style={[styles.statusFilterBtn, filterStatus === st.id && styles.statusFilterBtnActive]}
              onPress={() => setFilterStatus(st.id)}
            >
              <Text style={[styles.statusFilterBtnText, filterStatus === st.id && styles.statusFilterBtnTextActive]}>
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tenants List */}
        {filteredTenants.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyTitle}>Không tìm thấy khách thuê nào</Text>
            <Text style={styles.emptyDesc}>Hãy thử thay đổi điều kiện tìm kiếm hoặc thêm khách thuê mới.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredTenants.map((item, idx) => {
              const isActive = item.status === 'active'
              const isExpanded = !!expandedIds[item.id]

              return (
                <View
                  key={`${item.id}-${idx}`}
                  style={[styles.tenantCard, !isActive && styles.tenantCardTerminated]}
                >
                  {/* Collapsible Header */}
                  <TouchableOpacity
                    style={styles.cardHeaderTouchable}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.avatarCircle, !isActive && { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                        <Text style={styles.avatarText}>👤</Text>
                      </View>
                      <View style={styles.cardHeaderInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.tenantName, !isActive && { color: '#64748b' }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              isActive ? styles.statusBadgeActive : styles.statusBadgeTerminated,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextTerminated,
                              ]}
                            >
                              {isActive ? 'ĐANG THUÊ' : 'ĐÃ THANH LÝ'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.subInfoRow}>
                          <Text style={[styles.roomSubTag, !isActive && { color: '#64748b' }]}>
                            {item.roomNumber === 'Chưa xếp phòng'
                              ? 'Chưa xếp phòng'
                              : item.roomNumber.toLowerCase().startsWith('phòng')
                                ? item.roomNumber
                                : `Phòng ${item.roomNumber}`}
                          </Text>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Text style={styles.phoneSubTag}>{item.phone}</Text>
                          {isActive && (
                            <>
                              <Text style={styles.dotSeparator}>•</Text>
                              <View style={styles.occupantPill}>
                                <Text style={styles.occupantPillText}>
                                  {1 + (item.roommates?.length || 0)} người
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Chi tiết hiển thị khi bấm mở rộng */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {isActive ? (
                        <>
                          <View style={styles.detailsGrid}>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Mã hợp đồng:</Text>
                              <Text style={styles.detailValueBold}>{item.contractNumber}</Text>
                            </View>

                            {item.idCard ? (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>CCCD / CMND:</Text>
                                <Text style={styles.detailValue}>{item.idCard}</Text>
                              </View>
                            ) : null}

                            {item.hometown ? (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Quê quán:</Text>
                                <Text style={styles.detailValue}>{item.hometown}</Text>
                              </View>
                            ) : null}

                            {item.job ? (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Nghề nghiệp:</Text>
                                <Text style={styles.detailValue}>{item.job}</Text>
                              </View>
                            ) : null}

                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Giá thuê phòng:</Text>
                              <Text style={styles.priceHighlight}>{formatVND(item.monthlyRent)}/tháng</Text>
                            </View>

                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Tiền cọc:</Text>
                              <Text style={styles.detailValue}>{formatVND(item.deposit)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Thời hạn HĐ:</Text>
                              <Text style={styles.detailValue}>
                                {item.rentStartDate} ➔ {item.rentEndDate}
                              </Text>
                            </View>

                            {item.notes ? (
                              <View style={styles.noteBox}>
                                <Text style={styles.noteText}>📝 {item.notes}</Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Người ở cùng (Roommates Section) */}
                          <View style={styles.roommatesSection}>
                            <View style={styles.roommatesHeaderRow}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.roommatesTitle}>
                                    Người ở cùng
                                  </Text>
                                  <View style={styles.roommateCountBadge}>
                                    <Text style={styles.roommateCountBadgeText}>
                                      {item.roommates?.length || 0}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.roommatesSubtitle}>
                                  Khai báo tạm trú & đối chiếu CCCD
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.addRoommateBtn}
                                onPress={() => handleOpenAddRoommate(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.addRoommateBtnText}>+ Thêm người</Text>
                              </TouchableOpacity>
                            </View>

                            {(!item.roommates || item.roommates.length === 0) ? (
                              <View style={styles.emptyRoommatesBox}>
                                <Text style={styles.emptyRoommatesText}>
                                  Phòng hiện chỉ có 1 khách đại diện ký hợp đồng. Bấm "+ Thêm người" để lưu thông tin người ở cùng/ở ghép.
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.roommateList}>
                                {item.roommates.map((rm) => (
                                  <View key={rm.id} style={styles.roommateItem}>
                                    <View style={styles.roommateAvatar}>
                                      <Text style={styles.roommateAvatarText}>👤</Text>
                                    </View>
                                    <View style={styles.roommateDetails}>
                                      <View style={styles.roommateNameRow}>
                                        <Text style={styles.roommateNameText} numberOfLines={1}>
                                          {rm.name}
                                        </Text>
                                        <TouchableOpacity
                                          onPress={() => handleRemoveRoommate(item, rm)}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                          style={styles.roommateDeleteBtn}
                                        >
                                          <Text style={styles.roommateDeleteBtnText}>✕</Text>
                                        </TouchableOpacity>
                                      </View>

                                      <View style={styles.roommateTagsRow}>
                                        {rm.phone ? (
                                          <TouchableOpacity
                                            style={styles.roommateTagCall}
                                            onPress={() => handleCallTenant(rm.phone!)}
                                            activeOpacity={0.7}
                                          >
                                            <Text style={styles.roommateTagCallText}>📞 {rm.phone}</Text>
                                          </TouchableOpacity>
                                        ) : null}

                                        {rm.idCard ? (
                                          <View style={styles.roommateTag}>
                                            <Text style={styles.roommateTagText}>CCCD: {rm.idCard}</Text>
                                          </View>
                                        ) : null}

                                        {rm.hometown ? (
                                          <View style={styles.roommateTag}>
                                            <Text style={styles.roommateTagText}>Quê: {rm.hometown}</Text>
                                          </View>
                                        ) : null}
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>

                          {/* Action Buttons (Đã bỏ nút nhắn tin) */}
                          <View style={styles.cardActionsContainer}>
                            <TouchableOpacity
                              style={styles.actionBillBtn}
                              onPress={() =>
                                onNavigateTab &&
                                onNavigateTab('bills', {
                                  action: 'createBill',
                                  roomNumber: item.roomNumber,
                                  houseName: item.houseName,
                                  tenantName: item.name,
                                  tenantPhone: item.phone,
                                  roomFee: item.monthlyRent,
                                })
                              }
                              activeOpacity={0.8}
                            >
                              <Text style={styles.actionBillBtnText}>🧾 Lập hóa đơn tháng này</Text>
                            </TouchableOpacity>

                            <View style={styles.cardActionsRow}>
                              <TouchableOpacity
                                style={styles.actionCallBtn}
                                onPress={() => handleCallTenant(item.phone)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.actionCallBtnText}>📞 Gọi điện</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionEditBtn}
                                onPress={() => handleOpenEditModal(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.actionEditBtnText}>✏️ Sửa HĐ</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionEndBtn}
                                onPress={() => handleTerminateContract(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.actionEndBtnText}>🚪 Trả phòng</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.terminatedDetailsBox}>
                            <View style={styles.terminatedRow}>
                              <Text style={styles.terminatedLabel}>Mã HĐ cũ:</Text>
                              <Text style={styles.terminatedValueBold}>{item.contractNumber}</Text>
                            </View>
                            {item.idCard ? (
                              <View style={styles.terminatedRow}>
                                <Text style={styles.terminatedLabel}>CCCD/CMND:</Text>
                                <Text style={styles.terminatedValue}>{item.idCard}</Text>
                              </View>
                            ) : null}
                            <View style={styles.terminatedRow}>
                              <Text style={styles.terminatedLabel}>Ngày kết thúc:</Text>
                              <Text style={styles.terminatedValue}>{item.rentEndDate || 'Đã trả phòng'}</Text>
                            </View>
                          </View>

                          <View style={styles.terminatedActionsContainer}>
                            <TouchableOpacity
                              style={styles.actionReRentBtn}
                              onPress={() => handleReRentTenant(item)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.actionReRentBtnText}>🔄 Thuê lại phòng (Tái ký HĐ)</Text>
                            </TouchableOpacity>

                            <View style={styles.terminatedActionsRow}>
                              <TouchableOpacity
                                style={styles.actionCallBtn}
                                onPress={() => handleCallTenant(item.phone)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.actionCallBtnText}>📞 Gọi lại</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionDeleteBtn, { flex: 1.6, marginLeft: 8 }]}
                                onPress={() => handleDeleteTenant(item)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.actionDeleteBtnText}>🗑️ Xóa hồ sơ</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Tenant Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isReRenting
                  ? 'Tái ký hợp đồng & Thuê lại phòng'
                  : editingTenant
                    ? 'Chỉnh sửa thông tin khách thuê'
                    : 'Thêm khách thuê & Hợp đồng mới'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Row 1: Họ tên + SĐT */}
              <View style={styles.formRow}>
                <View style={{ flex: 1.2, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Họ và tên (*)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Nguyễn Văn A"
                    value={formName}
                    onChangeText={setFormName}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Số điện thoại (*)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0988 123 456"
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />
                </View>
              </View>

              {/* Row 2: CCCD + Quê quán */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>CCCD / CMND (*)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="048200001234"
                    keyboardType="number-pad"
                    value={formIdCard}
                    onChangeText={setFormIdCard}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Quê quán</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Quảng Nam"
                    value={formHometown}
                    onChangeText={setFormHometown}
                  />
                </View>
              </View>

              {/* Row 3: Nghề nghiệp */}
              <View style={{ marginBottom: 4 }}>
                <Text style={styles.fieldLabel}>Nghề nghiệp</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Kỹ sư / Sinh viên / Tự do..."
                  value={formJob}
                  onChangeText={setFormJob}
                />
              </View>

              {/* Room Selection Header with Auto Rent Price Badge */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 4 }}>
                <Text style={styles.fieldLabel}>Chọn phòng Check-in</Text>
                {matchedSelectedRoom && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                      Giá thuê: {formatVND(matchedSelectedRoom.price)}/tháng
                    </Text>
                  </View>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {myRooms.map((r) => {
                  const isSelected = formRoomNumber.toLowerCase() === r.roomNumber.toLowerCase()
                  const isCurrentActiveTenantRoom = editingTenant && !isReRenting && editingTenant.status === 'active' && editingTenant.roomNumber.toLowerCase() === r.roomNumber.toLowerCase()
                  const isRented = r.status === 'rented' && !isCurrentActiveTenantRoom
                  const isAvailable = r.status === 'available' || isCurrentActiveTenantRoom

                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.modalChip,
                        isSelected && styles.modalChipActive,
                        isRented && { borderColor: '#e2e8f0', backgroundColor: '#f8fafc', opacity: 0.55 },
                      ]}
                      onPress={() => {
                        if (isRented) {
                          Alert.alert(
                            'Phòng đang được thuê',
                            `Phòng ${r.roomNumber} hiện đang có khách thuê${r.tenantName ? ` (${r.tenantName})` : ''}. Bạn chỉ được chọn phòng đang còn trống để check-in!`
                          )
                          return
                        }
                        setFormRoomNumber(r.roomNumber)
                        setFormMonthlyRent(String(r.price))
                        if (!formDeposit || formDeposit === '0' || formDeposit === '2000000' || formDeposit === '2500000') {
                          setFormDeposit(String(r.price))
                        }
                      }}
                      activeOpacity={isRented ? 1 : 0.7}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          isSelected && styles.modalChipTextActive,
                          isRented && { color: '#94a3b8' },
                        ]}
                      >
                        {r.roomNumber} {isAvailable ? '• Trống 🟢' : '• Đang thuê 🔒'}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Row 4: Số phòng + Tiền cọc */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Số phòng</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: P.101"
                    value={formRoomNumber}
                    onChangeText={setFormRoomNumber}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Tiền cọc (VNĐ)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="2500000"
                    keyboardType="number-pad"
                    value={formDeposit}
                    onChangeText={setFormDeposit}
                  />
                </View>
              </View>

              {/* Row 5: Ngày bắt đầu + Ngày kết thúc */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Ngày bắt đầu</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Ngày kết thúc</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                  />
                </View>
              </View>

              {/* Row 6: Ghi chú thêm (Gọn gàng) */}
              <Text style={styles.fieldLabel}>Ghi chú thêm (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, { height: 38, marginBottom: 4 }]}
                placeholder="Ghi chú về đồ đạc bàn giao, chu kỳ..."
                value={formNotes}
                onChangeText={setFormNotes}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveTenant} activeOpacity={0.8}>
                <Text style={styles.modalSubmitText}>
                  {isReRenting ? 'Xác nhận thuê lại' : editingTenant ? 'Cập nhật' : 'Lưu hợp đồng'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Roommate Modal */}
      <Modal
        visible={isRoommateModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsRoommateModalOpen(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Thêm người ở cùng</Text>
                <Text style={styles.modalSubtitleRoommate} numberOfLines={1}>
                  {selectedTenantForRoommate
                    ? `Phòng ${selectedTenantForRoommate.roomNumber} • Đ/d: ${selectedTenantForRoommate.name}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsRoommateModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.fieldLabel}>Họ và tên người ở cùng (*)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: Trần Văn B"
                  value={rmName}
                  onChangeText={setRmName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 0912 345 678"
                    keyboardType="phone-pad"
                    value={rmPhone}
                    onChangeText={setRmPhone}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Số CCCD / CMND</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 048201000123"
                    keyboardType="number-pad"
                    value={rmIdCard}
                    onChangeText={setRmIdCard}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={styles.fieldLabel}>Quê quán (nếu có)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: Quảng Trị, Huế, Đà Nẵng..."
                  value={rmHometown}
                  onChangeText={setRmHometown}
                />
              </View>

              <View style={{ backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#bfdbfe' }}>
                <Text style={{ fontSize: 11, color: '#1e40af', lineHeight: 16 }}>
                  💡 Thông tin người ở cùng được lưu vào cơ sở dữ liệu riêng, phục vụ khai báo tạm trú chính xác theo quy định.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsRoommateModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveRoommate}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitText}>Lưu người ở</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
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
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  filterSection: {
    marginVertical: 6,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  statusFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statusFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  statusFilterBtnActive: {
    backgroundColor: '#e2e8f0',
  },
  statusFilterBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statusFilterBtnTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 14,
  },
  tenantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderTouchable: {
    paddingVertical: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 20,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  roomSubTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#94a3b8',
  },
  phoneSubTag: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeTerminated: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: '#15803d',
  },
  statusBadgeTextTerminated: {
    color: '#b91c1c',
  },
  contractCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  roomBanner: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  roomBannerText: {
    fontSize: 12,
    color: '#475569',
  },
  roomHighlight: {
    fontWeight: '800',
    color: '#2563eb',
  },
  detailsGrid: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  detailValueBold: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  priceHighlight: {
    fontSize: 13,
    color: '#e11d48',
    fontWeight: '800',
  },
  noteBox: {
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  noteText: {
    fontSize: 11,
    color: '#92400e',
  },
  cardActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    gap: 8,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBillBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionBillBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  actionCallBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionEditBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEditBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  actionEndBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEndBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  actionDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDeleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  tenantCardTerminated: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  terminatedDetailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  terminatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  terminatedLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  terminatedValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  terminatedValueBold: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  terminatedActionsContainer: {
    marginTop: 4,
  },
  actionReRentBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionReRentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  terminatedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 4,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 6,
  },
  formRow: {
    flexDirection: 'row',
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  modalChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  modalChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  occupantPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  occupantPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  roommatesSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roommatesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roommatesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  roommateCountBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  roommateCountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  roommatesSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  addRoommateBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addRoommateBtnText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyRoommatesBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyRoommatesText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: 'center',
  },
  roommateList: {
    gap: 8,
  },
  roommateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roommateAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roommateAvatarText: {
    fontSize: 14,
  },
  roommateDetails: {
    flex: 1,
  },
  roommateNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roommateNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  roommateDeleteBtn: {
    padding: 2,
    marginLeft: 6,
  },
  roommateDeleteBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  roommateTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  roommateTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roommateTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  roommateTagCall: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  roommateTagCallText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  modalSubtitleRoommate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
})
