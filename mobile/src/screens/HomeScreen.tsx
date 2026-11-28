import React, { useState, useMemo } from 'react'
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
import Svg, { G, Circle } from 'react-native-svg'
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
  const totalOccupants = tenants
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + 1 + (t.roommates?.length || 0), 0)
  const unpaidBillsCount = bills.filter((b) => b.status === 'unpaid' || b.status === 'overdue').length

  // Thống kê chuyên sâu về nhà trọ
  const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0

  const potentialRevenue = useMemo(() => {
    return myRooms.reduce((sum, r) => sum + (Number(r.price) || 0), 0)
  }, [myRooms])

  const currentRentalRevenue = useMemo(() => {
    return myRooms
      .filter((r) => r.status === 'rented')
      .reduce((sum, r) => sum + (Number(r.price) || 0), 0)
  }, [myRooms])

  const avgRoomPrice = totalRooms > 0 ? Math.round(potentialRevenue / totalRooms) : 0

  const roomTypeStats = useMemo(() => {
    const privateRooms = myRooms.filter((r) => r.roomType === 'private').length
    const sharedRooms = myRooms.filter((r) => r.roomType === 'shared').length
    const studioRooms = myRooms.filter((r) => r.roomType === 'studio').length
    return [
      { key: 'private', label: 'Khép kín', count: privateRooms },
      { key: 'shared', label: 'Ở ghép', count: sharedRooms },
      { key: 'studio', label: 'Studio', count: studioRooms },
    ]
  }, [myRooms])

  const donutSlices = useMemo(() => {
    if (totalRooms === 0) return []
    const R = 44
    const C = 2 * Math.PI * R
    let accumulatedAngle = 0
    const colors = ['#2563eb', '#8b5cf6', '#f97316']

    return roomTypeStats
      .filter((item) => item.count > 0)
      .map((item, idx) => {
        const pct = item.count / totalRooms
        const strokeDasharray = `${pct * C} ${C}`
        const strokeDashoffset = -accumulatedAngle * C
        accumulatedAngle += pct
        return {
          ...item,
          color: colors[idx % colors.length],
          strokeDasharray,
          strokeDashoffset,
          percentage: Math.round(pct * 100),
        }
      })
  }, [roomTypeStats, totalRooms])

  const floorStats = useMemo(() => {
    const map = new Map<number, { total: number; rented: number; available: number }>()
    myRooms.forEach((r) => {
      const f = Number(r.floor) || 1
      const cur = map.get(f) || { total: 0, rented: 0, available: 0 }
      cur.total += 1
      if (r.status === 'rented') cur.rented += 1
      else cur.available += 1
      map.set(f, cur)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, data]) => ({ floor, ...data }))
  }, [myRooms])

  const formatShortMillions = (num: number) => {
    if (!num || num === 0) return '0'
    const inMillions = num / 1000000
    if (inMillions >= 1) {
      return inMillions % 1 === 0 ? `${inMillions}tr` : `${inMillions.toFixed(1)}tr`
    }
    return `${Math.round(num / 1000)}k`
  }

  // 6 tháng gần nhất cho biểu đồ cột doanh thu
  const monthlyRevenueData = useMemo(() => {
    const now = new Date()
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const monthBills = bills.filter((b) => Number(b.month) === m && Number(b.year) === y)
      const paid = monthBills.filter((b) => b.status === 'paid').reduce((s, b) => s + (b.totalAmount || 0), 0)
      const unpaid = monthBills.filter((b) => b.status !== 'paid').reduce((s, b) => s + (b.totalAmount || 0), 0)
      const total = paid + unpaid
      result.push({
        label: `T${m}`,
        fullLabel: `Tháng ${m}/${y}`,
        month: m,
        year: y,
        paid,
        unpaid,
        total: total > 0 ? total : (i === 0 ? currentRentalRevenue : 0),
        isCurrent: i === 0,
      })
    }
    return result
  }, [bills, currentRentalRevenue])

  const maxMonthlyRevenue = useMemo(() => {
    const maxVal = Math.max(...monthlyRevenueData.map((d) => d.total), 1)
    return maxVal > 0 ? maxVal : 5000000
  }, [monthlyRevenueData])

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

        <TouchableOpacity
          style={styles.headerSettingsBtn}
          onPress={() => onNavigateTab && onNavigateTab('settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.headerSettingsText}>⚙️ Cài đặt</Text>
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
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{totalOccupants}</Text>
              <Text style={styles.statLabel}>
                {totalOccupants > activeTenants ? `Người ở (${activeTenants} HĐ)` : 'Khách đang thuê'}
              </Text>
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

        {/* Boarding House Detailed Statistics & Visual Charts */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Chỉ số khai thác & Biểu đồ trực quan</Text>

          {/* Biểu đồ 1: Biểu đồ cột Doanh thu 6 tháng gần nhất */}
          <View style={styles.analyticsCard}>
            <View style={styles.revenueChartHeader}>
              <Text style={styles.analyticsCardTitle}>Biểu đồ doanh thu 6 tháng</Text>
              <View style={styles.revenueLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                  <Text style={styles.legendText}>Đã thu</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f87171' }]} />
                  <Text style={styles.legendText}>Chưa thu</Text>
                </View>
              </View>
            </View>

            {/* Bar Chart Container */}
            <View style={styles.chartContainer}>
              {/* Background Reference Lines */}
              <View style={styles.chartGridLines}>
                <View style={styles.chartGridLine} />
                <View style={styles.chartGridLine} />
                <View style={styles.chartGridLine} />
              </View>

              {/* Bars Row */}
              <View style={styles.chartBarsRow}>
                {monthlyRevenueData.map((item, idx) => {
                  const isZero = !item.total || item.total <= 0
                  const barHeightPercent = isZero
                    ? 0
                    : Math.max(8, Math.min(100, Math.round((item.total / maxMonthlyRevenue) * 100)))

                  const paidRatio = item.total > 0 ? item.paid / item.total : 1
                  const unpaidRatio = item.total > 0 ? item.unpaid / item.total : 0

                  return (
                    <View key={`${item.month}-${idx}`} style={styles.chartBarCol}>
                      {/* Amount on Top */}
                      <Text
                        style={[
                          styles.barTopAmount,
                          isZero && styles.barTopAmountZero,
                          item.isCurrent && !isZero && styles.barTopAmountActive,
                        ]}
                        numberOfLines={1}
                      >
                        {isZero ? '0' : formatShortMillions(item.total)}
                      </Text>

                      {/* Bar Track & Fill */}
                      <View style={styles.barTrack}>
                        {/* Background track line */}
                        <View style={styles.barTrackBg} />

                        {/* Seamless Stacked Bar */}
                        {!isZero && (
                          <View style={[styles.barFillContainer, { height: `${barHeightPercent}%` }]}>
                            {/* Unpaid on top (if any) */}
                            {item.unpaid > 0 && (
                              <View style={[styles.barPartUnpaid, { flex: unpaidRatio }]} />
                            )}
                            {/* Paid on bottom (if any) */}
                            {item.paid > 0 && (
                              <View
                                style={[
                                  styles.barPartPaid,
                                  { flex: paidRatio },
                                  item.isCurrent && styles.barPartPaidCurrent,
                                ]}
                              />
                            )}
                          </View>
                        )}

                        {/* If zero: subtle 2px baseline */}
                        {isZero && <View style={styles.barZeroBaseline} />}
                      </View>

                      {/* Month Label */}
                      <View style={[styles.monthLabelPill, item.isCurrent && styles.monthLabelPillActive]}>
                        <Text style={[styles.monthLabelText, item.isCurrent && styles.monthLabelTextActive]}>
                          {item.label}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Biểu đồ 2: Tỷ lệ lấp đầy & Thanh tiến trình xếp chồng theo tầng */}
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsCardHeader}>
              <View>
                <Text style={styles.analyticsCardTitle}>Tỷ lệ lấp đầy phòng</Text>
                <Text style={styles.analyticsCardSubtitle}>
                  Đã cho thuê {rentedRooms}/{totalRooms} phòng
                </Text>
              </View>
              <View style={styles.rateBadge}>
                <Text style={styles.rateBadgeText}>{occupancyRate}%</Text>
              </View>
            </View>

            {/* Overall Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${occupancyRate}%` },
                ]}
              />
            </View>

            {/* Breakdown Indicators */}
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.breakdownLabel}>Đang thuê:</Text>
                <Text style={styles.breakdownValue}>{rentedRooms} phòng</Text>
              </View>
              <View style={styles.breakdownItem}>
                <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.breakdownLabel}>Còn trống:</Text>
                <Text style={styles.breakdownValue}>{availableRooms} phòng </Text>
              </View>
            </View>

            {/* Biểu đồ xếp chồng theo tầng */}
            {floorStats.length > 0 && (
              <View style={styles.floorStackSection}>
                <View style={styles.chartHeaderWithLegend}>
                  <Text style={styles.subChartTitle}>Tiến độ lấp đầy theo tầng</Text>
                  <View style={styles.chartLegendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.legendText}>Thuê</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#fcd34d' }]} />
                      <Text style={styles.legendText}>Trống</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.floorBarsContainer}>
                  {floorStats.map((item) => {
                    const floorOccupancy = item.total > 0 ? Math.round((item.rented / item.total) * 100) : 0
                    return (
                      <TouchableOpacity
                        key={item.floor}
                        style={styles.floorBarCard}
                        onPress={() => onNavigateTab && onNavigateTab('rooms')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.floorBarMetaRow}>
                          <Text style={styles.floorBarTitle}>Tầng {item.floor}</Text>
                          <Text style={styles.floorBarRatioText}>
                            {item.rented}/{item.total} phòng ({floorOccupancy}%)
                          </Text>
                        </View>

                        {/* Stacked Progress Bar */}
                        <View style={styles.floorStackedTrack}>
                          <View
                            style={[
                              styles.floorStackedRented,
                              { width: `${floorOccupancy}%` },
                            ]}
                          />
                          <View
                            style={[
                              styles.floorStackedAvailable,
                              { width: `${100 - floorOccupancy}%` },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Biểu đồ 3: Biểu đồ tròn cơ cấu loại phòng */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Cơ cấu loại phòng</Text>

            <View style={styles.donutChartContainer}>
              {/* Donut SVG */}
              <View style={styles.donutSvgWrap}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  <G rotation="-90" origin="60, 60">
                    <Circle
                      cx="60"
                      cy="60"
                      r="44"
                      stroke="#f1f5f9"
                      strokeWidth="16"
                      fill="transparent"
                    />
                    {donutSlices.map((slice) => (
                      <Circle
                        key={slice.key}
                        cx="60"
                        cy="60"
                        r="44"
                        stroke={slice.color}
                        strokeWidth="16"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        fill="transparent"
                      />
                    ))}
                  </G>
                </Svg>
                {/* Center text inside donut hole */}
                <View style={styles.donutCenterLabel}>
                  <Text style={styles.donutCenterValue}>{totalRooms}</Text>
                  <Text style={styles.donutCenterSub}>phòng</Text>
                </View>
              </View>

              {/* Legend & Details Column */}
              <View style={styles.donutLegendCol}>
                {roomTypeStats.map((item, idx) => {
                  const colors = ['#2563eb', '#8b5cf6', '#f97316']
                  const pct = totalRooms > 0 ? Math.round((item.count / totalRooms) * 100) : 0
                  return (
                    <View key={item.key} style={styles.donutLegendRow}>
                      <View style={[styles.donutLegendDot, { backgroundColor: colors[idx % colors.length] }]} />
                      <View style={styles.donutLegendMeta}>
                        <Text style={styles.donutLegendName}>{item.label}</Text>
                        <Text style={styles.donutLegendCount}>
                          {item.count} phòng <Text style={styles.donutLegendPct}>({pct}%)</Text>
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Card 4: Ước tính doanh thu & Đơn giá */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Ước tính doanh thu & Đơn giá</Text>

            <View style={styles.financeGrid}>
              <View style={styles.financeItem}>
                <Text style={styles.financeLabel}>Tiềm năng tối đa (100%)</Text>
                <Text style={[styles.financeValue, { color: '#0f172a' }]}>{formatVND(potentialRevenue)}</Text>
                <Text style={styles.financeSub}>Khi lấp đầy tất cả phòng</Text>
              </View>
              <View style={[styles.financeItem, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9', paddingLeft: 12 }]}>
                <Text style={styles.financeLabel}>Thực tế từ phòng đang thuê</Text>
                <Text style={[styles.financeValue, { color: '#059669' }]}>{formatVND(currentRentalRevenue)}</Text>
                <Text style={styles.financeSub}>Từ {rentedRooms} phòng hiện tại</Text>
              </View>
            </View>

            <View style={styles.avgPriceRow}>
              <Text style={styles.avgPriceLabel}>Giá thuê bình quân / phòng:</Text>
              <Text style={styles.avgPriceValue}>{formatVND(avgRoomPrice)}/tháng</Text>
            </View>
          </View>
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
  headerSettingsBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSettingsText: {
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
  analyticsSection: {
    paddingHorizontal: 18,
    marginTop: 24,
    gap: 14,
  },
  analyticsCard: {
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
  analyticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  analyticsCardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rateBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  rateBadgeText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 999,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  financeGrid: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 12,
  },
  financeItem: {
    flex: 1,
  },
  financeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  financeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  financeSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  avgPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  avgPriceLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  avgPriceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  // Donut Chart Styles
  donutChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  donutSvgWrap: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 24,
  },
  donutCenterSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  donutLegendCol: {
    flex: 1,
    paddingLeft: 20,
    gap: 10,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  donutLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendMeta: {
    flex: 1,
  },
  donutLegendName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  donutLegendCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  donutLegendPct: {
    color: '#2563eb',
    fontWeight: '700',
  },

  // Chart Styles
  revenueChartHeader: {
    marginBottom: 8,
  },
  revenueLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  chartContainer: {
    height: 160,
    marginTop: 10,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  chartGridLines: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    bottom: 24,
    justifyContent: 'space-between',
  },
  chartGridLine: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 2,
    zIndex: 2,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopAmount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  barTopAmountZero: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
  barTopAmountActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  barTrack: {
    width: 20,
    height: 110,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  barTrackBg: {
    position: 'absolute',
    bottom: 0,
    width: 12,
    height: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  barFillContainer: {
    width: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'column',
    zIndex: 2,
  },
  barPartUnpaid: {
    width: '100%',
    backgroundColor: '#f87171',
  },
  barPartPaid: {
    width: '100%',
    backgroundColor: '#2563eb',
  },
  barPartPaidCurrent: {
    backgroundColor: '#1d4ed8',
  },
  barZeroBaseline: {
    width: 12,
    height: 2,
    backgroundColor: '#cbd5e1',
    borderRadius: 1,
    zIndex: 2,
  },
  monthLabelPill: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  monthLabelPillActive: {
    backgroundColor: '#eff6ff',
  },
  monthLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  monthLabelTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  floorStackSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  subChartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  chartHeaderWithLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  floorBarsContainer: {
    gap: 10,
  },
  floorBarCard: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  floorBarMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  floorBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  floorBarRatioText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  floorStackedTrack: {
    height: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  floorStackedRented: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  floorStackedAvailable: {
    height: '100%',
    backgroundColor: '#fde68a',
  },
  floorList: {
    marginTop: 8,
    gap: 6,
  },
  floorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  floorItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  floorCountSub: {
    fontSize: 11,
    color: '#64748b',
  },
  floorItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floorRentedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  floorAvailBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  floorFullBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
})
