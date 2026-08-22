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
  Share,
} from 'react-native'
import { useBills } from '../context/BillContext'
import { useTenants } from '../context/TenantContext'
import { useRooms } from '../context/RoomContext'
import type { BillItem, BillStatus } from '../types/bill'

export default function BillsScreen() {
  const {
    bills,
    utilitySettings,
    addBill,
    updateBill,
    deleteBill,
    markAsPaid,
    totalUnpaidAmount,
    totalPaidAmount,
  } = useBills()
  const { tenants } = useTenants()
  const { rooms, branches } = useRooms()

  const [selectedMonth, setSelectedMonth] = useState<number>(8)
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<BillItem | null>(null)

  // Form State
  const [formHouseName, setFormHouseName] = useState(branches[0]?.name || '')
  const [formRoomNumber, setFormRoomNumber] = useState('P.101')
  const [formTenantName, setFormTenantName] = useState('')
  const [formTenantPhone, setFormTenantPhone] = useState('')
  const [formMonth, setFormMonth] = useState(8)
  const [formYear, setFormYear] = useState(2026)
  const [formRoomFee, setFormRoomFee] = useState('2500000')
  const [formOldElectric, setFormOldElectric] = useState('1400')
  const [formNewElectric, setFormNewElectric] = useState('1470')
  const [formOldWater, setFormOldWater] = useState('100')
  const [formNewWater, setFormNewWater] = useState('106')
  const [formInternetFee, setFormInternetFee] = useState(String(utilitySettings.internetFee))
  const [formTrashFee, setFormTrashFee] = useState(String(utilitySettings.trashFee))
  const [formOtherFee, setFormOtherFee] = useState('0')
  const [formOtherFeeNote, setFormOtherFeeNote] = useState('')
  const [formDueDate, setFormDueDate] = useState('2026-08-25')
  const [formStatus, setFormStatus] = useState<BillStatus>('unpaid')
  const [formNote, setFormNote] = useState('')

  // Format currency
  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ'
  }

  // Filter bills
  const filteredBills = bills.filter((b) => {
    if (b.month !== selectedMonth || b.year !== selectedYear) {
      return false
    }
    if (filterStatus !== 'all' && b.status !== filterStatus) {
      return false
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchRoom = b.roomNumber.toLowerCase().includes(q)
      const matchName = b.tenantName.toLowerCase().includes(q)
      const matchPhone = b.tenantPhone.includes(q)
      if (!matchRoom && !matchName && !matchPhone) return false
    }
    return true
  })

  // Auto populate tenant info when room is picked
  const handleSelectRoomForForm = (roomNum: string) => {
    setFormRoomNumber(roomNum)
    const activeTenant = tenants.find((t) => t.roomNumber === roomNum && t.status === 'active')
    if (activeTenant) {
      setFormTenantName(activeTenant.name)
      setFormTenantPhone(activeTenant.phone)
      setFormRoomFee(String(activeTenant.monthlyRent))
      setFormHouseName(activeTenant.houseName)
    } else {
      const roomObj = rooms.find((r) => r.roomNumber === roomNum)
      if (roomObj) {
        setFormRoomFee(String(roomObj.price))
        setFormHouseName(roomObj.houseName)
      }
      setFormTenantName('')
      setFormTenantPhone('')
    }
  }

  // Open modal create
  const handleOpenAddModal = () => {
    setEditingBill(null)
    const firstTenant = tenants.find((t) => t.status === 'active')
    if (firstTenant) {
      setFormHouseName(firstTenant.houseName)
      setFormRoomNumber(firstTenant.roomNumber)
      setFormTenantName(firstTenant.name)
      setFormTenantPhone(firstTenant.phone)
      setFormRoomFee(String(firstTenant.monthlyRent))
    } else {
      setFormHouseName(branches[0]?.name || '')
      setFormRoomNumber('P.101')
      setFormTenantName('')
      setFormTenantPhone('')
      setFormRoomFee('2500000')
    }
    setFormMonth(selectedMonth)
    setFormYear(selectedYear)
    setFormOldElectric('1200')
    setFormNewElectric('1265')
    setFormOldWater('80')
    setFormNewWater('86')
    setFormInternetFee(String(utilitySettings.internetFee))
    setFormTrashFee(String(utilitySettings.trashFee))
    setFormOtherFee('0')
    setFormOtherFeeNote('')
    setFormDueDate('2026-08-25')
    setFormStatus('unpaid')
    setFormNote('')
    setIsModalOpen(true)
  }

  // Open modal edit
  const handleOpenEditModal = (bill: BillItem) => {
    setEditingBill(bill)
    setFormHouseName(bill.houseName)
    setFormRoomNumber(bill.roomNumber)
    setFormTenantName(bill.tenantName)
    setFormTenantPhone(bill.tenantPhone)
    setFormMonth(bill.month)
    setFormYear(bill.year)
    setFormRoomFee(String(bill.roomFee))
    setFormOldElectric(String(bill.oldElectricMeter))
    setFormNewElectric(String(bill.newElectricMeter))
    setFormOldWater(String(bill.oldWaterMeter))
    setFormNewWater(String(bill.newWaterMeter))
    setFormInternetFee(String(bill.internetFee))
    setFormTrashFee(String(bill.trashFee))
    setFormOtherFee(String(bill.otherFee || 0))
    setFormOtherFeeNote(bill.otherFeeNote || '')
    setFormDueDate(bill.dueDate)
    setFormStatus(bill.status)
    setFormNote(bill.note || '')
    setIsModalOpen(true)
  }

  // Save bill
  const handleSaveBill = () => {
    if (!formTenantName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên người thanh toán/khách thuê!')
      return
    }

    const payload = {
      roomNumber: formRoomNumber,
      houseName: formHouseName,
      tenantName: formTenantName.trim(),
      tenantPhone: formTenantPhone.trim(),
      month: Number(formMonth),
      year: Number(formYear),
      roomFee: Number(formRoomFee) || 0,
      oldElectricMeter: Number(formOldElectric) || 0,
      newElectricMeter: Number(formNewElectric) || 0,
      electricRate: utilitySettings.electricRate,
      oldWaterMeter: Number(formOldWater) || 0,
      newWaterMeter: Number(formNewWater) || 0,
      waterRate: utilitySettings.waterRate,
      internetFee: Number(formInternetFee) || 0,
      trashFee: Number(formTrashFee) || 0,
      otherFee: Number(formOtherFee) || 0,
      otherFeeNote: formOtherFeeNote.trim() || undefined,
      dueDate: formDueDate,
      status: formStatus,
      note: formNote.trim() || undefined,
    }

    if (editingBill) {
      updateBill(editingBill.id, payload)
      Alert.alert('Thành công', 'Đã cập nhật hóa đơn!')
    } else {
      addBill(payload)
      Alert.alert('Thành công', 'Đã tạo hóa đơn mới thành công!')
    }

    setIsModalOpen(false)
  }

  // Quick mark paid
  const handleConfirmPaid = (bill: BillItem) => {
    Alert.alert(
      'Xác nhận thu tiền',
      `Thu tiền hóa đơn phòng ${bill.roomNumber} (${bill.tenantName}) số tiền ${formatVND(bill.totalAmount)}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiền mặt',
          onPress: () => {
            markAsPaid(bill.id, 'cash')
            Alert.alert('Thành công', 'Đã ghi nhận thanh toán tiền mặt!')
          },
        },
        {
          text: 'Chuyển khoản',
          onPress: () => {
            markAsPaid(bill.id, 'banking')
            Alert.alert('Thành công', 'Đã ghi nhận thanh toán chuyển khoản!')
          },
        },
      ]
    )
  }

  // Share bill via SMS / Zalo
  const handleShareBill = (bill: BillItem) => {
    const text = `[HÓA ĐƠN TIỀN TRỌ T${bill.month}/${bill.year}]
Phòng: ${bill.roomNumber} (${bill.houseName})
Khách thuê: ${bill.tenantName}
- Tiền phòng: ${formatVND(bill.roomFee)}
- Điện (${bill.newElectricMeter} - ${bill.oldElectricMeter} = ${bill.electricUsage} kWh): ${formatVND(bill.electricAmount)}
- Nước (${bill.newWaterMeter} - ${bill.oldWaterMeter} = ${bill.waterUsage} m3): ${formatVND(bill.waterAmount)}
- Internet: ${formatVND(bill.internetFee)}
- Rác: ${formatVND(bill.trashFee)}
${bill.otherFee ? `- Phụ phí: ${formatVND(bill.otherFee)} (${bill.otherFeeNote})` : ''}
👉 TỔNG CỘNG: ${formatVND(bill.totalAmount)}
Hạn đóng tiền: ${bill.dueDate}
Vui lòng thanh toán qua STK chủ trọ.`

    Share.share({
      message: text,
      title: `Hóa đơn phòng ${bill.roomNumber}`,
    }).catch(() => {})
  }

  // Delete bill
  const handleDeleteBill = (bill: BillItem) => {
    Alert.alert('Xóa hóa đơn', `Bạn có chắc muốn xóa hóa đơn phòng ${bill.roomNumber}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận xóa',
        style: 'destructive',
        onPress: () => {
          deleteBill(bill.id)
          Alert.alert('Đã xóa', 'Đã xóa hóa đơn thành công.')
        },
      },
    ])
  }

  // Live estimate total calculation for modal
  const calcElectricUsage = Math.max(0, (Number(formNewElectric) || 0) - (Number(formOldElectric) || 0))
  const calcElectricAmount = calcElectricUsage * utilitySettings.electricRate
  const calcWaterUsage = Math.max(0, (Number(formNewWater) || 0) - (Number(formOldWater) || 0))
  const calcWaterAmount = calcWaterUsage * utilitySettings.waterRate
  const calcTotal =
    (Number(formRoomFee) || 0) +
    calcElectricAmount +
    calcWaterAmount +
    (Number(formInternetFee) || 0) +
    (Number(formTrashFee) || 0) +
    (Number(formOtherFee) || 0)

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💵 Hóa Đơn & Tiện Ích</Text>
          <Text style={styles.headerSubtitle}>
            Tháng {selectedMonth}/{selectedYear} • {bills.length} hóa đơn
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Lập hóa đơn</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Revenue Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={[styles.statCol, { borderRightWidth: 1, borderRightColor: '#e2e8f0' }]}>
            <Text style={styles.statColLabel}>🟢 ĐÃ THU ĐƯỢC</Text>
            <Text style={[styles.statColValue, { color: '#16a34a' }]}>{formatVND(totalPaidAmount)}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statColLabel}>🔴 CẦN THU / CÒN NỢ</Text>
            <Text style={[styles.statColValue, { color: '#dc2626' }]}>{formatVND(totalUnpaidAmount)}</Text>
          </View>
        </View>

        {/* Month Selector Carousel */}
        <View style={styles.monthRow}>
          <Text style={styles.sectionLabel}>📅 Chọn tháng:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {[6, 7, 8, 9, 10, 11, 12].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                onPress={() => setSelectedMonth(m)}
              >
                <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                  Tháng {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo số phòng, tên khách thuê, SĐT..."
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
            { id: 'all', label: 'Tất cả hóa đơn' },
            { id: 'unpaid', label: '🔴 Chưa thanh toán' },
            { id: 'paid', label: '🟢 Đã thanh toán' },
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

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>Chưa có hóa đơn cho tháng {selectedMonth}/{selectedYear}</Text>
            <Text style={styles.emptyDesc}>Bấm "+ Lập hóa đơn" để tạo phiếu thu điện nước cho các phòng.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredBills.map((bill) => {
              const isPaid = bill.status === 'paid'
              return (
                <View key={bill.id} style={styles.billCard}>
                  {/* Bill Top Bar */}
                  <View style={styles.billCardHeader}>
                    <View>
                      <View style={styles.roomTagRow}>
                        <Text style={styles.billRoomNumber}>{bill.roomNumber}</Text>
                        <View style={[styles.billStatusBadge, isPaid ? styles.badgePaid : styles.badgeUnpaid]}>
                          <Text style={[styles.billStatusText, isPaid ? styles.textPaid : styles.textUnpaid]}>
                            {isPaid ? '✓ ĐÃ THU TIỀN' : 'CHƯA THANH TOÁN'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.billTenantName}>
                        Khách: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{bill.tenantName}</Text> •{' '}
                        {bill.tenantPhone}
                      </Text>
                    </View>

                    <Text style={styles.totalPriceHighlight}>{formatVND(bill.totalAmount)}</Text>
                  </View>

                  {/* Breakdown Table */}
                  <View style={styles.breakdownBox}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.itemLabel}>🏠 Tiền phòng:</Text>
                      <Text style={styles.itemVal}>{formatVND(bill.roomFee)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                      <Text style={styles.itemLabel}>
                        ⚡ Điện ({bill.oldElectricMeter} ➔ {bill.newElectricMeter} = {bill.electricUsage} kWh):
                      </Text>
                      <Text style={styles.itemVal}>{formatVND(bill.electricAmount)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                      <Text style={styles.itemLabel}>
                        💧 Nước ({bill.oldWaterMeter} ➔ {bill.newWaterMeter} = {bill.waterUsage} m³):
                      </Text>
                      <Text style={styles.itemVal}>{formatVND(bill.waterAmount)}</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                      <Text style={styles.itemLabel}>🌐 Internet & Rác:</Text>
                      <Text style={styles.itemVal}>{formatVND(bill.internetFee + bill.trashFee)}</Text>
                    </View>

                    {Boolean(bill.otherFee && bill.otherFee > 0) && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.itemLabel}>📦 Phụ phí ({bill.otherFeeNote || 'Khác'}):</Text>
                        <Text style={styles.itemVal}>{formatVND(bill.otherFee || 0)}</Text>
                      </View>
                    )}

                    <View style={styles.dueDateRow}>
                      <Text style={styles.dueDateLabel}>
                        {isPaid
                          ? `Đã thanh toán ngày: ${bill.paidDate || 'Hôm nay'} (${bill.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'})`
                          : `Hạn đóng: ${bill.dueDate}`}
                      </Text>
                    </View>
                  </View>

                  {/* Bill Actions */}
                  <View style={styles.cardActions}>
                    {!isPaid && (
                      <TouchableOpacity
                        style={styles.actionCollectBtn}
                        onPress={() => handleConfirmPaid(bill)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionCollectBtnText}>💰 Thu tiền</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionShareBtn}
                      onPress={() => handleShareBill(bill)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionShareBtnText}>📤 Gửi bill</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionEditBtn}
                      onPress={() => handleOpenEditModal(bill)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionEditBtnText}>✏️ Sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionDeleteBtn}
                      onPress={() => handleDeleteBill(bill)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionDeleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Add / Edit Bill */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBill ? 'Chỉnh sửa hóa đơn' : 'Lập hóa đơn tiền nhà & Điện nước'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Select Room */}
              <Text style={styles.fieldLabel}>Chọn phòng lập hóa đơn</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {rooms.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.modalChip, formRoomNumber === r.roomNumber && styles.modalChipActive]}
                    onPress={() => handleSelectRoomForForm(r.roomNumber)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        formRoomNumber === r.roomNumber && styles.modalChipTextActive,
                      ]}
                    >
                      {r.roomNumber} ({r.houseName.slice(0, 10)}...)
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Tên khách thuê (*)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Nguyễn Văn A"
                    value={formTenantName}
                    onChangeText={setFormTenantName}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: 0988 123 456"
                    keyboardType="phone-pad"
                    value={formTenantPhone}
                    onChangeText={setFormTenantPhone}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Tiền phòng (VNĐ)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2500000"
                keyboardType="number-pad"
                value={formRoomFee}
                onChangeText={setFormRoomFee}
              />

              {/* Electric Inputs */}
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>⚡ Điện sinh hoạt (Đơn giá: {formatVND(utilitySettings.electricRate)}/kWh)</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldSubLabel}>Chỉ số cũ</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="number-pad"
                      value={formOldElectric}
                      onChangeText={setFormOldElectric}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.fieldSubLabel}>Chỉ số mới</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="number-pad"
                      value={formNewElectric}
                      onChangeText={setFormNewElectric}
                    />
                  </View>
                </View>
                <Text style={styles.calcPreviewText}>
                  = {calcElectricUsage} kWh ➔ {formatVND(calcElectricAmount)}
                </Text>
              </View>

              {/* Water Inputs */}
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>💧 Nước sinh hoạt (Đơn giá: {formatVND(utilitySettings.waterRate)}/m³)</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldSubLabel}>Chỉ số cũ</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="number-pad"
                      value={formOldWater}
                      onChangeText={setFormOldWater}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.fieldSubLabel}>Chỉ số mới</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="number-pad"
                      value={formNewWater}
                      onChangeText={setFormNewWater}
                    />
                  </View>
                </View>
                <Text style={styles.calcPreviewText}>
                  = {calcWaterUsage} m³ ➔ {formatVND(calcWaterAmount)}
                </Text>
              </View>

              {/* Other Services */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Internet (VNĐ)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="number-pad"
                    value={formInternetFee}
                    onChangeText={setFormInternetFee}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Rác / Vệ sinh (VNĐ)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="number-pad"
                    value={formTrashFee}
                    onChangeText={setFormTrashFee}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Phụ phí phát sinh</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0"
                    keyboardType="number-pad"
                    value={formOtherFee}
                    onChangeText={setFormOtherFee}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Lý do phụ phí</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="VD: Phí sửa vòi nước"
                    value={formOtherFeeNote}
                    onChangeText={setFormOtherFeeNote}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Hạn nộp tiền</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={formDueDate}
                    onChangeText={setFormDueDate}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Trạng thái</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        formStatus === 'unpaid' && styles.statusToggleBtnActiveUnpaid,
                      ]}
                      onPress={() => setFormStatus('unpaid')}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          formStatus === 'unpaid' && styles.statusToggleTextActive,
                        ]}
                      >
                        Chưa thu
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        formStatus === 'paid' && styles.statusToggleBtnActivePaid,
                      ]}
                      onPress={() => setFormStatus('paid')}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          formStatus === 'paid' && styles.statusToggleTextActive,
                        ]}
                      >
                        Đã thu
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Total Calculation Display */}
              <View style={styles.totalPreviewBox}>
                <Text style={styles.totalPreviewLabel}>TỔNG CỘNG HÓA ĐƠN:</Text>
                <Text style={styles.totalPreviewValue}>{formatVND(calcTotal)}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveBill} activeOpacity={0.8}>
                <Text style={styles.modalSubmitText}>{editingBill ? 'Cập nhật' : 'Lưu hóa đơn'}</Text>
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
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  statCol: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  statColLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 4,
  },
  statColValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  monthChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  monthChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  monthChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
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
  billCard: {
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
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  roomTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  billRoomNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  billStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgePaid: {
    backgroundColor: '#dcfce7',
  },
  badgeUnpaid: {
    backgroundColor: '#fee2e2',
  },
  billStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPaid: {
    color: '#15803d',
  },
  textUnpaid: {
    color: '#b91c1c',
  },
  billTenantName: {
    fontSize: 12,
    color: '#64748b',
  },
  totalPriceHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  breakdownBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    gap: 4,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemLabel: {
    fontSize: 12,
    color: '#475569',
  },
  itemVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  dueDateRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dueDateLabel: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCollectBtn: {
    flex: 2,
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionCollectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionShareBtn: {
    flex: 1.5,
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionShareBtnText: {
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
  actionDeleteBtn: {
    width: 36,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDeleteBtnText: {
    fontSize: 14,
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
  fieldSubLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
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
  subCard: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  subCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  calcPreviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'right',
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
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  statusToggleBtnActiveUnpaid: {
    backgroundColor: '#fee2e2',
  },
  statusToggleBtnActivePaid: {
    backgroundColor: '#dcfce7',
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statusToggleTextActive: {
    fontWeight: '800',
    color: '#0f172a',
  },
  totalPreviewBox: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalPreviewLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e40af',
  },
  totalPreviewValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1d4ed8',
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
