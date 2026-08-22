import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'

export type TabType = 'dashboard' | 'rooms' | 'tenants' | 'bills'

interface Props {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  availableRoomsCount?: number
}

export default function BottomTabBar({ activeTab, onTabChange, availableRoomsCount = 0 }: Props) {
  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Tổng quan',
      icon: '🏠',
    },
    {
      id: 'rooms' as TabType,
      label: 'Phòng trọ',
      icon: '🏢',
      badge: availableRoomsCount > 0 ? `${availableRoomsCount} trống` : undefined,
    },
    {
      id: 'tenants' as TabType,
      label: 'Khách thuê',
      icon: '👥',
    },
    {
      id: 'bills' as TabType,
      label: 'Hóa đơn',
      icon: '💵',
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
              <Text style={styles.tabIcon}>{tab.icon}</Text>
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563eb',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -24,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
})
