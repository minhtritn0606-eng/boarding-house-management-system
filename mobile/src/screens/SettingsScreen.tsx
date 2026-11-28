import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useBills } from '../context/BillContext'
import { mobileHouseApi } from '../services/api'
import type { TabType } from '../components/BottomTabBar'

interface SettingsScreenProps {
  onNavigateTab?: (tab: TabType, payload?: any) => void
  onNavigateBack?: () => void
}

type ModalType = 'none' | 'account' | 'house' | 'banking' | 'notification' | 'appInfo' | 'password' | 'utilities'

export default function SettingsScreen({ onNavigateTab, onNavigateBack }: SettingsScreenProps) {
  const { user, logout } = useAuth()
  const { rooms, branches, refreshRooms } = useRooms()
  const { utilitySettings, updateUtilitySettings } = useBills()

  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType>('none')

  // 1. Tài khoản & Hồ sơ chủ trọ
  const [ownerName, setOwnerName] = useState(user?.name || 'Trần Văn Nam')
  const [ownerPhone, setOwnerPhone] = useState(user?.phone || '0905 888 999')

  // 2. Thông tin cơ sở trọ (Đồng bộ trực tiếp từ bảng boarding_houses trong MySQL)
  const primaryHouse = branches.length > 0 ? branches[0] : null
  const defaultHouseName = primaryHouse?.name || rooms.find((r) => r.houseName && r.houseName !== 'Dãy trọ chính')?.houseName || rooms[0]?.houseName || 'Dãy trọ chính'
  const defaultHouseAddress = primaryHouse?.address || 'TP. Đà Nẵng'

  const [houseName, setHouseName] = useState(defaultHouseName)
  const [houseAddress, setHouseAddress] = useState(defaultHouseAddress)

  useEffect(() => {
    if (primaryHouse) {
      if (primaryHouse.name) setHouseName(primaryHouse.name)
      if (primaryHouse.address) setHouseAddress(primaryHouse.address)
    } else if (rooms.length > 0 && rooms[0]?.houseName) {
      setHouseName(rooms[0].houseName)
    }
  }, [primaryHouse, rooms])

  const [houseRulesText, setHouseRulesText] = useState(
    '1. Giờ đóng cổng dãy trọ: 23:00 - 05:00 sáng.\n' +
    '2. Giữ gìn an ninh trật tự chung, không làm ồn sau 22:00.\n' +
    '3. Để xe đúng nơi quy định, khóa cổ cẩn thận.\n' +
    '4. Nghiêm cấm tàng trữ chất cấm, cờ bạc, chất dễ cháy nổ.\n' +
    '5. Đóng tiền trọ và tiền dịch vụ từ ngày 01 đến 05 hàng tháng.'
  )

  // 3. Cấu hình đơn giá dịch vụ dãy trọ
  const [settingElectricRate, setSettingElectricRate] = useState(String(utilitySettings.electricRate))
  const [settingWaterRate, setSettingWaterRate] = useState(String(utilitySettings.waterRate))
  const [settingInternetFee, setSettingInternetFee] = useState(String(utilitySettings.internetFee))
  const [settingTrashFee, setSettingTrashFee] = useState(String(utilitySettings.trashFee))
  const [isSavingUtility, setIsSavingUtility] = useState(false)

  // 4. Thông tin ngân hàng nhận thanh toán (Chuẩn bị cho VietQR)
  const [bankName, setBankName] = useState('MB Bank')
  const [bankAccount, setBankAccount] = useState('0905888999')
  const [bankAccountHolder, setBankAccountHolder] = useState('TRAN VAN NAM')

  // 5. Thông báo & Nhắc nhở tự động
  const [remindBillDueDate, setRemindBillDueDate] = useState(true)
  const [remindDaysBefore, setRemindDaysBefore] = useState<3 | 5 | 7>(3)
  const [remindMeterRecord, setRemindMeterRecord] = useState(true)
  const [remindContractExpiry, setRemindContractExpiry] = useState(true)

  // 6. Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleCloseModal = () => {
    setActiveModal('none')
  }

  const handleOpenUtilitiesModal = () => {
    setSettingElectricRate(String(utilitySettings.electricRate))
    setSettingWaterRate(String(utilitySettings.waterRate))
    setSettingInternetFee(String(utilitySettings.internetFee))
    setSettingTrashFee(String(utilitySettings.trashFee))
    setActiveModal('utilities')
  }

  const handleSaveUtilities = async () => {
    const eRate = Number(settingElectricRate) || 0
    const wRate = Number(settingWaterRate) || 0
    const netFee = Number(settingInternetFee) || 0
    const trFee = Number(settingTrashFee) || 0

    if (eRate <= 0 || wRate <= 0) {
      Alert.alert('Lưu ý', 'Đơn giá điện và nước phải lớn hơn 0!')
      return
    }

    setIsSavingUtility(true)
    try {
      await updateUtilitySettings({
        electricRate: eRate,
        waterRate: wRate,
        internetFee: netFee,
        trashFee: trFee,
      })
      Alert.alert('Thành công', 'Đã lưu đơn giá dịch vụ của dãy trọ vào CSDL!')
      setActiveModal('none')
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu cài đặt đơn giá.')
    } finally {
      setIsSavingUtility(false)
    }
  }

  const [isSavingHouse, setIsSavingHouse] = useState(false)

  const handleSaveHouse = async () => {
    if (!houseName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên dãy trọ!')
      return
    }
    if (!houseAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ dãy trọ!')
      return
    }

    setIsSavingHouse(true)
    try {
      const targetHouseId = primaryHouse?.id ? Number(primaryHouse.id) : 1
      await mobileHouseApi.updateHouse(targetHouseId, {
        name: houseName.trim(),
        address: houseAddress.trim(),
      })
      if (refreshRooms) await refreshRooms()
      Alert.alert('Thành công', 'Đã cập nhật thông tin nhà trọ vào cơ sở dữ liệu!')
      setActiveModal('none')
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật thông tin nhà trọ.')
    } finally {
      setIsSavingHouse(false)
    }
  }

  const handleSaveModal = (msg: string) => {
    Alert.alert('Thành công', msg)
    setActiveModal('none')
  }

  const handleChangePassword = () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ các trường mật khẩu!')
      return
    }
    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không khớp', 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp!')
      return
    }

    Alert.alert('Thành công', 'Đã cập nhật mật khẩu mới cho tài khoản!')
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setActiveModal('none')
  }

  const handleConfirmLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản trị trên thiết bị này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    )
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (onNavigateBack ? onNavigateBack() : onNavigateTab?.('dashboard'))}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
          <Text style={styles.headerSubtitle}>Thiết lập tài khoản, nhà trọ & thanh toán</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* User Identity Banner */}
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={() => setActiveModal('account')}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(ownerName || 'N').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {ownerName || 'Chủ trọ'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || 'nam.owner@example.com'}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Quản trị viên cơ sở</Text>
            </View>
          </View>
          <Text style={styles.chevronIcon}>›</Text>
        </TouchableOpacity>

        {/* GROUP 1: Cơ sở nhà trọ & Thanh toán */}
        <Text style={styles.groupHeader}>CƠ SỞ & THANH TOÁN</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setActiveModal('house')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Thông tin nhà trọ</Text>

            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setActiveModal('banking')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Tài khoản ngân hàng & VietQR</Text>

            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleOpenUtilitiesModal}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Đơn giá điện nước dãy trọ</Text>

            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* GROUP 2: Hệ thống & Tự động hóa */}
        <Text style={styles.groupHeader}>HỆ THỐNG & NHẮC NHỞ</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setActiveModal('notification')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Cài đặt thông báo & Nhắc nợ</Text>

            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setActiveModal('appInfo')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Thông tin ứng dụng</Text>

            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* GROUP 3: Tài khoản & Bảo mật */}
        <Text style={styles.groupHeader}>TÀI KHOẢN & BẢO MẬT</Text>
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setActiveModal('account')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Hồ sơ cá nhân</Text>

            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setActiveModal('password')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Đổi mật khẩu</Text>
            </View>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* GROUP 4: Đăng xuất */}
        <View style={styles.groupCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleConfirmLogout}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.logoutTitle}>Đăng xuất</Text>
            </View>
            <Text style={[styles.chevronIcon, { color: '#ef4444' }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* POPUP MODAL 1: Cài đặt tài khoản & Hồ sơ */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'account'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hồ sơ người quản lý</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Họ và tên chủ trọ</Text>
              <TextInput
                style={styles.formInput}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="VD: Trần Văn Nam"
              />

              <Text style={styles.fieldLabel}>Số điện thoại liên hệ</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="phone-pad"
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                placeholder="VD: 0905 888 999"
              />

              <Text style={styles.fieldLabel}>Email đăng nhập (Không thay đổi)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputDisabled]}
                editable={false}
                value={user?.email || 'nam.owner@example.com'}
              />

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setActiveModal('password')}
              >
                <Text style={styles.linkButtonText}>Đổi mật khẩu tài khoản ➔</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => handleSaveModal('Đã cập nhật thông tin hồ sơ!')}
              >
                <Text style={styles.modalSubmitText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL 2: Thông tin nhà trọ & Nội quy */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'house'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin cơ sở nhà trọ</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Tên dãy trọ / Nhà trọ</Text>
              <TextInput
                style={styles.formInput}
                value={houseName}
                onChangeText={setHouseName}
                placeholder="VD: Dãy trọ Minh Tâm"
              />

              <Text style={styles.fieldLabel}>Địa chỉ dãy trọ</Text>
              <TextInput
                style={styles.formInput}
                value={houseAddress}
                onChangeText={setHouseAddress}
                placeholder="VD: 123 Đường số 8, Linh Xuân, TP. Thủ Đức"
              />

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSavingHouse && { opacity: 0.6 }]}
                disabled={isSavingHouse}
                onPress={handleSaveHouse}
              >
                <Text style={styles.modalSubmitText}>{isSavingHouse ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL 3: Ngân hàng & VietQR */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'banking'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tài khoản nhận thanh toán & VietQR</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerTitle}>Ứng dụng tạo mã VietQR tự động:</Text>
                <Text style={styles.infoBannerDesc}>
                  Thông tin này sẽ được dùng để tạo mã VietQR động khi gửi hóa đơn tiền phòng. Khách quét mã sẽ tự động có đúng số tiền, số tài khoản và nội dung chuyển khoản.
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Ngân hàng thụ hưởng</Text>
              <TextInput
                style={styles.formInput}
                value={bankName}
                onChangeText={setBankName}
                placeholder="VD: MB Bank, Vietcombank, Techcombank..."
              />

              {/* Quick bank picker */}
              <View style={styles.quickBankGrid}>
                {['MB Bank', 'Vietcombank', 'Techcombank', 'VPBank', 'ACB'].map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.quickBankChip, bankName === b && styles.quickBankChipActive]}
                    onPress={() => setBankName(b)}
                  >
                    <Text style={[styles.quickBankChipText, bankName === b && styles.quickBankChipTextActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Số tài khoản ngân hàng (STK)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={bankAccount}
                onChangeText={setBankAccount}
                placeholder="VD: 0905888999"
              />

              <Text style={styles.fieldLabel}>Tên chủ tài khoản (Viết in hoa không dấu)</Text>
              <TextInput
                style={styles.formInput}
                value={bankAccountHolder}
                onChangeText={(val) => setBankAccountHolder(val.toUpperCase())}
                placeholder="VD: TRAN VAN NAM"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => handleSaveModal('Đã lưu thông tin tài khoản ngân hàng!')}
              >
                <Text style={styles.modalSubmitText}>Lưu tài khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL 4: Cài đặt thông báo */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'notification'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cài đặt thông báo & Nhắc nhở</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.switchLabel}>Tự động nhắc tiền trọ</Text>
                  <Text style={styles.switchSubLabel}>
                    Hiển thị thông báo và tổng hợp danh sách phòng đến hạn thu tiền
                  </Text>
                </View>
                <Switch
                  value={remindBillDueDate}
                  onValueChange={setRemindBillDueDate}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={remindBillDueDate ? '#2563eb' : '#f8fafc'}
                />
              </View>

              {remindBillDueDate && (
                <View style={styles.subChoiceBox}>
                  <Text style={styles.subChoiceLabel}>Thời điểm gửi nhắc nhở:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {([3, 5, 7] as const).map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.choiceBtn, remindDaysBefore === d && styles.choiceBtnActive]}
                        onPress={() => setRemindDaysBefore(d)}
                      >
                        <Text style={[styles.choiceBtnText, remindDaysBefore === d && styles.choiceBtnTextActive]}>
                          Trước {d} ngày
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.switchRow, { marginTop: 14 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.switchLabel}>Nhắc chốt chỉ số Điện & Nước</Text>
                  <Text style={styles.switchSubLabel}>
                    Nhắc nhở ghi công tơ điện nước vào ngày 28 đến 30 hàng tháng
                  </Text>
                </View>
                <Switch
                  value={remindMeterRecord}
                  onValueChange={setRemindMeterRecord}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={remindMeterRecord ? '#2563eb' : '#f8fafc'}
                />
              </View>

              <View style={[styles.switchRow, { marginTop: 14 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.switchLabel}>Cảnh báo hợp đồng sắp hết hạn</Text>
                  <Text style={styles.switchSubLabel}>
                    Cảnh báo trước 15 ngày khi hợp đồng thuê phòng của khách sắp kết thúc
                  </Text>
                </View>
                <Switch
                  value={remindContractExpiry}
                  onValueChange={setRemindContractExpiry}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={remindContractExpiry ? '#2563eb' : '#f8fafc'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => handleSaveModal('Đã lưu cấu hình thông báo!')}
              >
                <Text style={styles.modalSubmitText}>Lưu cấu hình</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL 5: Thông tin ứng dụng */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'appInfo'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin ứng dụng</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.infoCardBlock}>
                <Text style={styles.infoCardTitle}>Hệ thống Quản lý Nhà trọ Thông minh</Text>
                <Text style={styles.infoCardVersion}>Phiên bản: 1.2.0 • Bản chuẩn đồ án</Text>
                <Text style={styles.infoCardDesc}>
                  Đồ án tốt nghiệp ngành Công nghệ Thông tin.
                </Text>
              </View>

              <View style={[styles.infoCardBlock, { marginTop: 10 }]}>
                <Text style={styles.infoCardSubtitle}>Kiến trúc công nghệ</Text>
                <Text style={styles.infoCardLine}>• Ứng dụng di động: React Native & TypeScript</Text>
                <Text style={styles.infoCardLine}>• Máy chủ dịch vụ: Node.js, Express REST API</Text>
                <Text style={styles.infoCardLine}>• Cơ sở dữ liệu: MySQL RDBMS quan hệ</Text>
                <Text style={styles.infoCardLine}>• Trạng thái máy chủ: 🟢 Hoạt động bình thường</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { flex: 1 }]}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalSubmitText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL 6: Đổi mật khẩu */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'password'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu tài khoản</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Mật khẩu hiện tại</Text>
              <TextInput
                style={styles.formInput}
                secureTextEntry
                placeholder="Nhập mật khẩu đang dùng"
                value={oldPassword}
                onChangeText={setOldPassword}
              />

              <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
              <TextInput
                style={styles.formInput}
                secureTextEntry
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.fieldLabel}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.formInput}
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCloseModal}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleChangePassword}>
                <Text style={styles.modalSubmitText}>Đổi mật khẩu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ============================================================== */}
      {/* POPUP MODAL 7: Đơn giá điện nước dãy trọ */}
      {/* ============================================================== */}
      <Modal
        visible={activeModal === 'utilities'}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đơn giá điện nước dãy trọ</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerTitle}>Đơn giá mặc định toàn dãy:</Text>
                <Text style={styles.infoBannerDesc}>
                  Đơn giá này được lưu vào CSDL và tự động điền khi tạo phòng mới cũng như khi lập hóa đơn hàng tháng.
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Đơn giá điện sinh hoạt (VNĐ / kWh)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={settingElectricRate}
                onChangeText={setSettingElectricRate}
                placeholder="VD: 3500"
              />

              <Text style={styles.fieldLabel}>Đơn giá nước sinh hoạt (VNĐ / m³)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={settingWaterRate}
                onChangeText={setSettingWaterRate}
                placeholder="VD: 15000"
              />

              <Text style={styles.fieldLabel}>Phí Internet / Wifi (VNĐ / tháng / phòng)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={settingInternetFee}
                onChangeText={setSettingInternetFee}
                placeholder="VD: 100000"
              />

              <Text style={styles.fieldLabel}>Phí thu gom rác & Vệ sinh (VNĐ / tháng / phòng)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={settingTrashFee}
                onChangeText={setSettingTrashFee}
                placeholder="VD: 30000"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCloseModal}
                disabled={isSavingUtility}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSavingUtility && { opacity: 0.6 }]}
                onPress={handleSaveUtilities}
                disabled={isSavingUtility}
              >
                <Text style={styles.modalSubmitText}>
                  {isSavingUtility ? 'Đang lưu...' : 'Lưu đơn giá CSDL'}
                </Text>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingBottom: 40,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  rowDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  chevronIcon: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 16,
  },
  logoutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  logoutDesc: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700',
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  formInputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  linkButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  infoBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  infoBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  infoBannerDesc: {
    fontSize: 11,
    color: '#2563eb',
    lineHeight: 16,
  },
  quickBankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  quickBankChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickBankChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  quickBankChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  quickBankChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 1,
  },
  switchSubLabel: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  subChoiceBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    marginLeft: 10,
  },
  subChoiceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  choiceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  choiceBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  choiceBtnText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  choiceBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  infoCardBlock: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCardVersion: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
  infoCardDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  infoCardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoCardLine: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
})
