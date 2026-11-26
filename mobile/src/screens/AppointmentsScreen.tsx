import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { mobileAppointmentApi } from '../services/api'
import type { ViewingAppointment } from '../types/appointment'
import type { TabType } from '../components/BottomTabBar'

interface AppointmentsScreenProps {
  onNavigateTab?: (tab: TabType, payload?: any) => void
  initialAction?: any
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled'

export default function AppointmentsScreen({ onNavigateTab }: AppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<ViewingAppointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await mobileAppointmentApi.getAppointments()
      if (res && Array.isArray(res.appointments)) {
        const uniqueList: ViewingAppointment[] = []
        const seen = new Set<number>()
        for (const item of res.appointments) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            uniqueList.push(item)
          }
        }
        setAppointments(uniqueList)
      }
    } catch (err: any) {
      console.warn('[Appointments] Lỗi tải lịch hẹn:', err.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAppointments()
  }

  const handleUpdateStatus = async (id: number, newStatus: 'confirmed' | 'cancelled') => {
    setUpdatingId(id)
    try {
      await mobileAppointmentApi.updateAppointmentStatus(id, newStatus)
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      )
      Alert.alert(
        'Thành công',
        newStatus === 'confirmed'
          ? 'Đã xác nhận lịch hẹn xem phòng với khách.'
          : 'Đã từ chối lịch hẹn xem phòng.'
      )
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái lịch hẹn.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = (id: number) => {
    Alert.alert('Xóa lịch hẹn', 'Bạn có chắc chắn muốn xóa bản ghi lịch hẹn này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileAppointmentApi.deleteAppointment(id)
            setAppointments((prev) => prev.filter((a) => a.id !== id))
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa lịch hẹn lúc này.')
          }
        },
      },
    ])
  }

  const handleCall = (phone: string) => {
    if (!phone) return
    const cleaned = phone.replace(/[^0-9+]/g, '')
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', `Số điện thoại: ${phone}`)
    })
  }

  const handleZalo = (phone: string) => {
    if (!phone) return
    const cleaned = phone.replace(/[^0-9]/g, '')
    Linking.openURL(`https://zalo.me/${cleaned}`).catch(() => {
      Alert.alert('Không thể mở Zalo', `Số điện thoại: ${phone}`)
    })
  }

  const filteredList = appointments.filter((item) => {
    if (filterStatus === 'all') return true
    return item.status === filterStatus
  })

  const pendingCount = appointments.filter((a) => a.status === 'pending').length
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length

  const formatPrice = (num?: number) => {
    if (!num) return ''
    return num.toLocaleString('vi-VN') + ' đ/tháng'
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.screenTitle}>Lịch hẹn xem phòng</Text>
          <Text style={styles.screenSubtitle} numberOfLines={1}>
            {appointments.length} lịch hẹn • {pendingCount} chờ xác nhận
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        {/* Status Filter Bar - Minimalist Luxury Capsule */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'all' && styles.filterChipTextActive,
              ]}
            >
              Tất cả ({appointments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
            onPress={() => setFilterStatus('pending')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'pending' && styles.filterChipTextActive,
              ]}
            >
              Chờ duyệt ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'confirmed' && styles.filterChipActive]}
            onPress={() => setFilterStatus('confirmed')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'confirmed' && styles.filterChipTextActive,
              ]}
            >
              Đã duyệt ({confirmedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'cancelled' && styles.filterChipActive]}
            onPress={() => setFilterStatus('cancelled')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'cancelled' && styles.filterChipTextActive,
              ]}
            >
              Từ chối
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content list */}
        {isLoading && !isRefreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#0f172a" />
            <Text style={styles.loadingText}>Đang tải lịch hẹn...</Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có lịch hẹn</Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all'
                ? 'Hiện tại chưa có khách đặt lịch hẹn xem phòng nào.'
                : 'Không tìm thấy lịch hẹn ở trạng thái này.'}
            </Text>
          </View>
        ) : (
          filteredList.map((item, idx) => {
            const isPending = item.status === 'pending'
            const isConfirmed = item.status === 'confirmed'
            const isCancelled = item.status === 'cancelled'
            const isUpdating = updatingId === item.id

            return (
              <View key={`${item.id}-${idx}`} style={styles.card}>
                {/* Header card: Room Title & Status badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {item.roomTitle || item.houseName || 'Phòng trọ'}
                    </Text>
                    {item.roomPrice ? (
                      <Text style={styles.roomPrice}>{formatPrice(item.roomPrice)}</Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isPending && styles.badgePending,
                      isConfirmed && styles.badgeConfirmed,
                      isCancelled && styles.badgeCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isPending && styles.badgeTextPending,
                        isConfirmed && styles.badgeTextConfirmed,
                        isCancelled && styles.badgeTextCancelled,
                      ]}
                    >
                      {isPending
                        ? 'Chờ duyệt'
                        : isConfirmed
                        ? 'Đã xác nhận'
                        : 'Đã từ chối'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Visitor & Appointment Info */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Khách hẹn</Text>
                  <Text style={styles.infoValueBold}>{item.visitorName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <Text style={styles.infoValue}>{item.phone}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Thời gian xem</Text>
                  <Text style={styles.infoValueHighlight}>
                    {item.viewingTime} • {item.viewingDate}
                  </Text>
                </View>

                {item.note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>Ghi chú: "{item.note}"</Text>
                  </View>
                ) : null}

                {/* Fast Action Buttons: Call & Zalo */}
                <View style={styles.quickContactRow}>
                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.contactBtnText}>Gọi điện thoại</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactBtn, styles.contactBtnZalo]}
                    onPress={() => handleZalo(item.phone)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.contactBtnZaloText}>Nhắn Zalo</Text>
                  </TouchableOpacity>
                </View>

                {/* Moderation Actions (Accept / Reject) */}
                {isPending && (
                  <View style={styles.moderationRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn]}
                      onPress={() => handleUpdateStatus(item.id, 'confirmed')}
                      disabled={isUpdating}
                      activeOpacity={0.8}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Xác nhận lịch</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleUpdateStatus(item.id, 'cancelled')}
                      disabled={isUpdating}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rejectBtnText}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Delete button (small understated link) */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.deleteLinkText}>Xóa bản ghi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
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
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  roomPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  badgeConfirmed: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  badgeCancelled: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: '#b45309',
  },
  badgeTextConfirmed: {
    color: '#15803d',
  },
  badgeTextCancelled: {
    color: '#b91c1c',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  infoValueBold: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  infoValueHighlight: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  noteBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noteText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  contactBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  contactBtnZalo: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  contactBtnZaloText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  moderationRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: '#059669',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  rejectBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  cardFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  deleteLinkText: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
})
