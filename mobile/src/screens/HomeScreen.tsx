import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../context/RoomContext'
import { useTenants } from '../context/TenantContext'
import { useBills } from '../context/BillContext'
import type { TabType } from '../components/BottomTabBar'

interface HomeScreenProps {
  onNavigateTab?: (tab: TabType, payload?: any) => void
}

export default function HomeScreen({ onNavigateTab }: HomeScreenProps) {
  const { user, logout } = useAuth()
  const { rooms, getRoomsByOwner, refreshRooms } = useRooms()
  const { tenants } = useTenants()
  const { bills, totalUnpaidAmount, totalPaidAmount, refreshBills } = useBills()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const myRooms = getRoomsByOwner(user?.email)
  const totalRooms = myRooms.length
  const rentedRooms = myRooms.filter((r) => r.status === 'rented').length
  const availableRooms = myRooms.filter((r) => r.status === 'available').length
  const activeTenants = tenants.filter((t) => t.status === 'active').length
  const unpaidBillsCount = bills.filter((b) => b.status === 'unpaid' || b.status === 'overdue').length

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refreshRooms ? refreshRooms() : Promise.resolve(),
        refreshBills ? refreshBills() : Promise.resolve(),
      ])
    } catch { }
    setIsRefreshing(false)
  }

  const formatVND = (num: number) => {
    return num.toLocaleString('vi-VN') + ' đ'
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Unified Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Tổng quan</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {user?.name || 'Chủ trọ'} • Chủ trọ
          </Text>
        </View>

        <TouchableOpacity style={styles.headerActionBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.headerActionText}>Đăng xuất</Text>
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


        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }]}
              onPress={() => onNavigateTab && onNavigateTab('rooms')}
              activeOpacity={0.8}
            >
              <Text style={[styles.statValue, { color: '#0f172a' }]}>{totalRooms}</Text>
              <Text style={styles.statLabel}>Tổng số phòng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }]}
              onPress={() => onNavigateTab && onNavigateTab('rooms', { filterStatus: 'rented' })}
              activeOpacity={0.8}
            >
              <Text style={[styles.statValue, { color: '#059669' }]}>{rentedRooms}</Text>
              <Text style={styles.statLabel}>Đang cho thuê</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }]}
              onPress={() => onNavigateTab && onNavigateTab('rooms', { filterStatus: 'available' })}
              activeOpacity={0.8}
            >
              <Text style={[styles.statValue, { color: '#d97706' }]}>{availableRooms}</Text>
              <Text style={styles.statLabel}>Phòng còn trống</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }]}
              onPress={() => onNavigateTab && onNavigateTab('tenants')}
              activeOpacity={0.8}
            >
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{activeTenants}</Text>
              <Text style={styles.statLabel}>Khách đang thuê</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue Summary Card */}
        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Doanh thu & Hóa đơn tháng</Text>
          <View style={styles.revenueCard}>
            <View style={styles.revenueRow}>
              <View style={styles.revenueCol}>
                <Text style={styles.revenueLabel}>Đã thu tháng này</Text>
                <Text style={[styles.revenueValue, { color: '#059669' }]}>{formatVND(totalPaidAmount)}</Text>
              </View>
              <View style={[styles.revenueCol, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9', paddingLeft: 16 }]}>
                <Text style={styles.revenueLabel}>Chưa thu ({unpaidBillsCount})</Text>
                <Text style={[styles.revenueValue, { color: '#dc2626' }]}>{formatVND(totalUnpaidAmount)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewBillsBtn}
              onPress={() => onNavigateTab && onNavigateTab('bills', { action: unpaidBillsCount > 0 ? 'filterUnpaid' : undefined })}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBillsText}>
                {unpaidBillsCount > 0 ? `Có ${unpaidBillsCount} hóa đơn chưa thu ›` : `Xem chi tiết ${bills.length} hóa đơn ›`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab('appointments')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.actionIconText}>◷</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Lịch hẹn xem phòng</Text>
              <Text style={styles.actionDesc}>Duyệt yêu cầu hẹn, gọi điện thoại & nhắn Zalo cho khách</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab('rooms', { action: 'addRoom' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.actionIconText}>+</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Thêm phòng trọ mới</Text>
              <Text style={styles.actionDesc}>Tạo phòng, thiết lập giá thuê, diện tích & tiện ích</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab('tenants', { action: 'checkin' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.actionIconText}>◎</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Tiếp nhận khách thuê (Check-in)</Text>
              <Text style={styles.actionDesc}>Lập hợp đồng vào phòng trống, đồng bộ trạng thái</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onNavigateTab && onNavigateTab('bills', { action: 'createBill' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.actionIconText}>◇</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Ghi chỉ số & Lập hóa đơn</Text>
              <Text style={styles.actionDesc}>Tính tiền điện nước tự động & gửi bill qua Zalo</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActionBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 40,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 18,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
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
  revenueSection: {
    paddingHorizontal: 18,
    marginTop: 24,
  },
  revenueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  revenueRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  revenueCol: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  viewBillsBtn: {
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewBillsText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
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
  actionIconText: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '700',
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
