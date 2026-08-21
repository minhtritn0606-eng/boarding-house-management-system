import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import type { DemoAccount } from '../types'

export default function AuthScreen() {
  const { login, register, loginWithDemo, demoAccounts, isLoading } = useAuth()

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
    const result = await register({
      name: regName,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
    })
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng ký không thành công')
    }
  }

  const handleDemoSelect = (demo: DemoAccount) => {
    setErrorMessage('')
    loginWithDemo(demo)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
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
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🏡</Text>
            </View>
            <Text style={styles.brandTitle}>BoardingHouse</Text>
            <Text style={styles.brandSubtitle}>Ứng dụng Quản lý Nhà trọ & Khách thuê</Text>
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
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Login Form */}
            {activeTab === 'login' ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email hoặc Số điện thoại</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="nam.owner@example.com"
                    placeholderTextColor="#94a3b8"
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
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    placeholderTextColor="#94a3b8"
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
                    <Text style={styles.submitBtnText}>Đăng nhập ngay ➔</Text>
                  )}
                </TouchableOpacity>

                {/* Demo Accounts Section */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoHeading}>⚡ Hoặc đăng nhập nhanh bằng tài khoản Demo:</Text>
                  {demoAccounts.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.demoCard}
                      onPress={() => handleDemoSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.demoAvatar}>
                        <Text style={styles.demoAvatarText}>👤</Text>
                      </View>
                      <View style={styles.demoInfo}>
                        <Text style={styles.demoName}>{item.name}</Text>
                        <Text style={styles.demoLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.demoArrow}>➔</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              /* Register Form */
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và tên chủ trọ *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: Nguyễn Văn Nam"
                    placeholderTextColor="#94a3b8"
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0912 345 678"
                    placeholderTextColor="#94a3b8"
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="chutro@example.com"
                    placeholderTextColor="#94a3b8"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu (tối thiểu 6 ký tự) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry
                  />
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
                    <Text style={styles.submitBtnText}>Tạo tài khoản Chủ trọ 🚀</Text>
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
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  demoHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
  },
  demoAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  demoAvatarText: {
    fontSize: 16,
  },
  demoInfo: {
    flex: 1,
  },
  demoName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  demoLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  demoArrow: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 22,
  },
})
