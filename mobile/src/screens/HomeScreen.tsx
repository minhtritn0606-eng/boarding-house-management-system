import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function HomeScreen() {
  const { user, logout } = useAuth()

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Profile Banner */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>CHỦ TRỌ</Text>
                </View>
              </View>
              <Text style={styles.userName}>{user?.name || 'Chủ trọ'}</Text>
              <Text style={styles.userEmail}>📧 {user?.email}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>Đăng xuất ⎋</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Tổng quan nhà trọ</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <Text style={styles.statIcon}>🏢</Text>
              <Text style={[styles.statValue, { color: '#1d4ed8' }]}>12</Text>
              <Text style={styles.statLabel}>Tổng số phòng</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Text style={styles.statIcon}>🟢</Text>
              <Text style={[styles.statValue, { color: '#15803d' }]}>9</Text>
              <Text style={styles.statLabel}>Đang cho thuê</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}>
              <Text style={styles.statIcon}>🟡</Text>
              <Text style={[styles.statValue, { color: '#a16207' }]}>3</Text>
              <Text style={styles.statLabel}>Phòng còn trống</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={[styles.statValue, { color: '#7e22ce' }]}>15</Text>
              <Text style={styles.statLabel}>Khách đang thuê</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>⚡ Thao tác nhanh</Text>
          
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <View style={[styles.actionIconBox, { backgroundColor: '#eff6ff' }]}>
              <Text style={styles.actionIcon}>➕</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Đăng tin phòng trọ mới</Text>
              <Text style={styles.actionDesc}>Thêm phòng, tải ảnh và công khai bài đăng</Text>
            </View>
            <Text style={styles.actionArrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <View style={[styles.actionIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Text style={styles.actionIcon}>📋</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Quản lý Hợp đồng thuê</Text>
              <Text style={styles.actionDesc}>Xem danh sách hợp đồng & khách thuê</Text>
            </View>
            <Text style={styles.actionArrow}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <View style={[styles.actionIconBox, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.actionIcon}>💵</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Hóa đơn & Thu tiền trọ</Text>
              <Text style={styles.actionDesc}>Tạo hóa đơn điện nước và ghi nhận thanh toán</Text>
            </View>
            <Text style={styles.actionArrow}>➔</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 26,
  },
  profileInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  logoutBtnText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
  },
  statsSection: {
    paddingHorizontal: 18,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 18,
    marginTop: 24,
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
  },
})
