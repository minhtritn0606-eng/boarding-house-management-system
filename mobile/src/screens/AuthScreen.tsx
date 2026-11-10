import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'

export default function AuthScreen() {
  const { login, register, isLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [errorMessage, setErrorMessage] = useState('')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regRole, setRegRole] = useState<'landlord' | 'poster'>('landlord')
  const [regPropertyName, setRegPropertyName] = useState('')
  const [regPropertyAddress, setRegPropertyAddress] = useState('')
  const [regPropertyImage, setRegPropertyImage] = useState('')
  const [pendingNotice, setPendingNotice] = useState<{ email: string; role: string; message: string } | null>(null)

  const handleLogin = async () => {
    setErrorMessage('')
    const result = await login(loginEmail, loginPassword)
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công')
    }
  }

  const handleRegister = async () => {
    setErrorMessage('')
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp')
      return
    }

    if (regRole === 'landlord') {
      if (!regPropertyName.trim()) {
        setErrorMessage('Vui lòng nhập tên nhà trọ của bạn')
        return
      }
      if (!regPropertyAddress.trim()) {
        setErrorMessage('Vui lòng nhập địa chỉ nhà trọ của bạn')
        return
      }
    }

    const result = await register({
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      role: regRole,
      propertyName: regRole === 'landlord' ? regPropertyName.trim() : undefined,
      propertyAddress: regRole === 'landlord' ? regPropertyAddress.trim() : undefined,
      propertyImage: regRole === 'landlord' ? regPropertyImage.trim() : undefined,
    })
    if (result.success) {
      if (result.requiresApproval) {
        setPendingNotice({
          email: regEmail,
          role: regRole === 'landlord' ? 'Chủ trọ' : 'Người đăng bài',
          message: result.message || 'Hồ sơ đang chờ Quản trị viên xét duyệt.',
        })
      }
    } else {
      setErrorMessage(result.error || 'Đăng ký không thành công')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Banner */}
          <View style={styles.header}>
            <Text style={styles.brandTitle}>BoardingHouse</Text>
            <Text style={styles.brandSubtitle}>Hệ thống Quản lý Nhà trọ & Khách thuê</Text>
          </View>

          {/* Card Container */}
          <View style={styles.card}>
            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'login' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('login')
                  setErrorMessage('')
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}
                >
                  Đăng nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'register' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('register')
                  setErrorMessage('')
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}
                >
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Login Form */}
            {activeTab === 'login' ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email đăng nhập</Text>
                  <TextInput
                    style={styles.input}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Đăng nhập</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : pendingNotice ? (
              /* Màn hình thông báo chờ Admin duyệt */
              <View style={styles.pendingContainer}>
                <Text style={styles.pendingTitle}>Đăng Ký Thành Công</Text>
                <Text style={styles.pendingRole}>
                  Vai trò: {pendingNotice.role}
                </Text>
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingEmailLabel}>Email đăng ký:</Text>
                  <Text style={styles.pendingEmailValue}>{pendingNotice.email}</Text>
                  <Text style={styles.pendingDesc}>
                    Hồ sơ của bạn đang được Quản trị viên xét duyệt. Sau khi được duyệt, hệ thống sẽ tự động gửi email thông báo kích hoạt. Bạn vui lòng kiểm tra email trước khi đăng nhập.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => {
                    setPendingNotice(null)
                    setActiveTab('login')
                    setErrorMessage('')
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>Quay lại Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Register Form */
              <View style={styles.form}>
                {/* Lựa chọn vai trò */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Chọn vai trò tài khoản: *</Text>
                  <View style={styles.roleRow}>
                    <TouchableOpacity
                      style={[styles.roleCard, regRole === 'landlord' && styles.roleCardActive]}
                      onPress={() => setRegRole('landlord')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleTitle, regRole === 'landlord' && styles.roleTitleActive]}>
                        Chủ trọ
                      </Text>
                      <Text style={styles.roleSub}>Quản lý cơ sở trọ, phòng, khách thuê và hóa đơn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.roleCard, regRole === 'poster' && styles.roleCardActive]}
                      onPress={() => setRegRole('poster')}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleTitle, regRole === 'poster' && styles.roleTitleActive]}>
                        Người đăng bài
                      </Text>
                      <Text style={styles.roleSub}>Đăng tin tìm khách, nhận lịch hẹn xem phòng</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và tên *</Text>
                  <TextInput
                    style={styles.input}
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại *</Text>
                  <TextInput
                    style={styles.input}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu *</Text>
                  <TextInput
                    style={styles.input}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu *</Text>
                  <TextInput
                    style={styles.input}
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry
                  />
                </View>

                {/* Thông tin nhà trọ dành cho Chủ trọ */}
                {regRole === 'landlord' && (
                  <View style={{ backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 10, fontSize: 13 }}>
                      Thông tin cơ sở nhà trọ
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Tên nhà trọ *</Text>
                      <TextInput
                        style={styles.input}
                        value={regPropertyName}
                        onChangeText={setRegPropertyName}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Địa chỉ nhà trọ *</Text>
                      <TextInput
                        style={styles.input}
                        value={regPropertyAddress}
                        onChangeText={setRegPropertyAddress}
                      />
                    </View>

                    <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                      <Text style={styles.label}>Đường dẫn ảnh nhà trọ (URL)</Text>
                      <TextInput
                        style={styles.input}
                        value={regPropertyImage}
                        onChangeText={setRegPropertyImage}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.securityNotice}>
                  <Text style={styles.securityNoticeText}>
                    Tài khoản đăng ký mới sẽ được Quản trị viên đối chiếu thông tin và duyệt trước khi cho phép đăng nhập.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Đăng Ký Tài Khoản</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Gửi Đăng Ký Tài Khoản 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer Note */}
          <Text style={styles.footerText}>
            © 2026 BoardingHouse System • Dành riêng cho Chủ trọ
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoIcon: {
    fontSize: 30,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 18,
    marginTop: -20,
    borderRadius: 22,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 22,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
  },
  roleCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  roleTitleActive: {
    color: '#1d4ed8',
  },
  roleSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 13,
  },
  securityNotice: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginTop: 2,
  },
  securityNoticeText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pendingIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pendingIcon: {
    fontSize: 28,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  pendingRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 14,
  },
  pendingBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  pendingEmailLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  pendingEmailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  pendingDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
})
