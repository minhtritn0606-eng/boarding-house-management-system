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
  Linking,
} from 'react-native'
import { useTenants } from '../context/TenantContext'
import { useRooms } from '../context/RoomContext'
import type { Tenant, ContractStatus } from '../types/tenant'

export default function TenantsScreen() {
  const { tenants, addTenant, updateTenant, deleteTenant, updateContractStatus } = useTenants()
  const { branches, rooms } = useRooms()

  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formIdCard, setFormIdCard] = useState('')
  const [formHometown, setFormHometown] = useState('')
  const [formJob, setFormJob] = useState('')
  const [formHouseName, setFormHouseName] = useState(branches[0]?.name || '')
  const [formRoomNumber, setFormRoomNumber] = useState('P.101')
  const [formStartDate, setFormStartDate] = useState('2026-08-01')
  const [formEndDate, setFormEndDate] = useState('2027-07-31')
  const [formDeposit, setFormDeposit] = useState('2500000')
  const [formMonthlyRent, setFormMonthlyRent] = useState('2500000')
  const [formNotes, setFormNotes] = useState('')

  // Filter Logic
  const filteredTenants = tenants.filter((tenant) => {
    // Branch filter
    if (selectedBranch !== 'all' && tenant.houseName !== selectedBranch) {
      return false
    }
    // Status filter
    if (filterStatus !== 'all' && tenant.status !== filterStatus) {
      return false
    }
    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchName = tenant.name.toLowerCase().includes(q)
      const matchPhone = tenant.phone.includes(q)
      const matchRoom = tenant.roomNumber.toLowerCase().includes(q)
      const matchIdCard = tenant.idCard.includes(q)
      if (!matchName && !matchPhone && !matchRoom && !matchIdCard) return false
    }
    return true
  })

  // Format currency
  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ'
  }

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingTenant(null)
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormIdCard('')
    setFormHometown('')
    setFormJob('')
    setFormHouseName(branches[0]?.name || 'Dãy trọ Hòa Khánh (Đà Nẵng)')
    setFormRoomNumber('P.103')
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormEndDate('2027-08-01')
    setFormDeposit('2000000')
    setFormMonthlyRent('2000000')
    setFormNotes('')
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormName(tenant.name)
    setFormPhone(tenant.phone)
    setFormEmail(tenant.email || '')
    setFormIdCard(tenant.idCard)
    setFormHometown(tenant.hometown)
    setFormJob(tenant.job || '')
    setFormHouseName(tenant.houseName)
    setFormRoomNumber(tenant.roomNumber)
    setFormStartDate(tenant.rentStartDate)
    setFormEndDate(tenant.rentEndDate)
    setFormDeposit(String(tenant.deposit))
    setFormMonthlyRent(String(tenant.monthlyRent))
    setFormNotes(tenant.notes || '')
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

    const matchedRoom = rooms.find((r) => r.roomNumber === formRoomNumber)

    const tenantPayload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      idCard: formIdCard.trim(),
      hometown: formHometown.trim() || 'Chưa cập nhật',
      job: formJob.trim() || undefined,
      roomId: matchedRoom ? matchedRoom.id : `room_${formRoomNumber}`,
      roomNumber: formRoomNumber,
      houseName: formHouseName,
      rentStartDate: formStartDate,
      rentEndDate: formEndDate,
      deposit: Number(formDeposit) || 0,
      monthlyRent: Number(formMonthlyRent) || 0,
      status: (editingTenant ? editingTenant.status : 'active') as ContractStatus,
      notes: formNotes.trim() || undefined,
    }

    if (editingTenant) {
      updateTenant(editingTenant.id, tenantPayload)
      Alert.alert('Thành công', 'Đã cập nhật thông tin khách thuê!')
    } else {
      addTenant(tenantPayload)
      Alert.alert('Thành công', 'Đã thêm khách thuê và hợp đồng mới thành công!')
    }

    setIsModalOpen(false)
  }

  // Call Tenant
  const handleCallTenant = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', `Số điện thoại: ${phone}`)
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
      `Bạn có chắc chắn muốn xóa khách ${tenant.name} khỏi danh sách?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: () => {
            deleteTenant(tenant.id)
            Alert.alert('Đã xóa', 'Đã xóa hồ sơ khách thuê thành công.')
          },
        },
      ]
    )
  }

  const activeCount = tenants.filter((t) => t.status === 'active').length

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👥 Khách Thuê & Hợp Đồng</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount} khách đang thuê • {tenants.length} tổng hồ sơ
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Thêm khách</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
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

        {/* Branch Filter Pills */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, selectedBranch === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedBranch('all')}
            >
              <Text style={[styles.filterChipText, selectedBranch === 'all' && styles.filterChipTextActive]}>
                Tất cả dãy trọ ({tenants.length})
              </Text>
            </TouchableOpacity>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.filterChip, selectedBranch === b.name && styles.filterChipActive]}
                onPress={() => setSelectedBranch(b.name)}
              >
                <Text style={[styles.filterChipText, selectedBranch === b.name && styles.filterChipTextActive]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            {filteredTenants.map((item) => {
              const isActive = item.status === 'active'
              return (
                <View key={item.id} style={styles.tenantCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>👤</Text>
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.tenantName}>{item.name}</Text>
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
                      <Text style={styles.contractCode}>HĐ: {item.contractNumber}</Text>
                    </View>
                  </View>

                  {/* Room & Branch banner */}
                  <View style={styles.roomBanner}>
                    <Text style={styles.roomBannerText}>
                      🏠 <Text style={styles.roomHighlight}>{item.roomNumber}</Text> • {item.houseName}
                    </Text>
                  </View>

                  {/* Details grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>📞 Điện thoại:</Text>
                      <Text style={styles.detailValueBold}>{item.phone}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>🪪 CCCD/CMND:</Text>
                      <Text style={styles.detailValue}>{item.idCard}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>📍 Quê quán:</Text>
                      <Text style={styles.detailValue}>{item.hometown}</Text>
                    </View>

                    {item.job && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>💼 Nghề nghiệp:</Text>
                        <Text style={styles.detailValue}>{item.job}</Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>💵 Giá thuê:</Text>
                      <Text style={styles.priceHighlight}>{formatVND(item.monthlyRent)}/tháng</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>🔒 Tiền cọc:</Text>
                      <Text style={styles.detailValue}>{formatVND(item.deposit)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>📅 Thời hạn HĐ:</Text>
                      <Text style={styles.detailValue}>
                        {item.rentStartDate} ➔ {item.rentEndDate}
                      </Text>
                    </View>

                    {item.notes && (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteText}>📝 {item.notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
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

                    {isActive ? (
                      <TouchableOpacity
                        style={styles.actionEndBtn}
                        onPress={() => handleTerminateContract(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionEndBtnText}>🛑 Thanh lý</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionDeleteBtn}
                        onPress={() => handleDeleteTenant(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionDeleteBtnText}>🗑️ Xóa</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                {editingTenant ? 'Chỉnh sửa thông tin khách thuê' : 'Thêm khách thuê & Hợp đồng mới'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Họ và tên khách thuê (*)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="VD: Nguyễn Văn A"
                value={formName}
                onChangeText={setFormName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Số điện thoại (*)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 0988 123 456"
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>CCCD / CMND (*)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 048200001234"
                    keyboardType="number-pad"
                    value={formIdCard}
                    onChangeText={setFormIdCard}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Quê quán / Tỉnh thành</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Quảng Nam"
                    value={formHometown}
                    onChangeText={setFormHometown}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Nghề nghiệp</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Kỹ sư / Sinh viên"
                    value={formJob}
                    onChangeText={setFormJob}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                placeholder="VD: tenant@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formEmail}
                onChangeText={setFormEmail}
              />

              {/* House & Room Selection */}
              <Text style={styles.fieldLabel}>Dãy trọ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {branches.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.modalChip, formHouseName === b.name && styles.modalChipActive]}
                    onPress={() => setFormHouseName(b.name)}
                  >
                    <Text style={[styles.modalChipText, formHouseName === b.name && styles.modalChipTextActive]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Số phòng</Text>
              <TextInput
                style={styles.formInput}
                placeholder="VD: P.103"
                value={formRoomNumber}
                onChangeText={setFormRoomNumber}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Giá thuê (VNĐ/tháng)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="2500000"
                    keyboardType="number-pad"
                    value={formMonthlyRent}
                    onChangeText={setFormMonthlyRent}
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

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Ngày bắt đầu thuê</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Ngày kết thúc hợp đồng</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Ghi chú thêm</Text>
              <TextInput
                style={[styles.formInput, { height: 64 }]}
                placeholder="Ghi chú về tiền cọc, đồ đạc bàn giao, ngày thanh toán..."
                multiline
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
                <Text style={styles.modalSubmitText}>{editingTenant ? 'Cập nhật' : 'Lưu hợp đồng'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionCallBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
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
  },
  actionEditBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  actionEndBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  actionEndBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  actionDeleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  actionDeleteBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 8,
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
})
