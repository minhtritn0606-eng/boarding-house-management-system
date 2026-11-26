import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'

export type TabType = 'dashboard' | 'rooms' | 'appointments' | 'tenants' | 'bills'

interface Props {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  availableRoomsCount?: number
  pendingAppointmentsCount?: number
}

export default function BottomTabBar({
  activeTab,
  onTabChange,
  availableRoomsCount = 0,
  pendingAppointmentsCount = 0,
}: Props) {
  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Tổng quan',
      icon: '◈',
    },
    {
      id: 'rooms' as TabType,
      label: 'Phòng trọ',
      icon: '⌂',
      badge: availableRoomsCount > 0 ? `${availableRoomsCount} trống` : undefined,
    },
    {
      id: 'appointments' as TabType,
      label: 'Lịch hẹn',
      icon: '◷',
      badge: pendingAppointmentsCount > 0 ? `${pendingAppointmentsCount}` : undefined,
    },
    {
      id: 'tenants' as TabType,
      label: 'Khách thuê',
      icon: '◎',
    },
    {
      id: 'bills' as TabType,
      label: 'Hóa đơn',
      icon: '◇',
    },
  ]

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                {tab.icon}
              </Text>
              {tab.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabBtnActive: {},
  iconWrapper: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '400',
  },
  tabIconActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0f172a',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -14,
    backgroundColor: '#0f172a',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
})
