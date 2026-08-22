import React, { useState } from 'react'
import { View, StyleSheet, SafeAreaView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { RoomProvider, useRooms } from './src/context/RoomContext'
import { TenantProvider } from './src/context/TenantContext'
import { BillProvider } from './src/context/BillContext'

import AuthScreen from './src/screens/AuthScreen'
import HomeScreen from './src/screens/HomeScreen'
import RoomsScreen from './src/screens/RoomsScreen'
import TenantsScreen from './src/screens/TenantsScreen'
import BillsScreen from './src/screens/BillsScreen'
import BottomTabBar, { type TabType } from './src/components/BottomTabBar'

function MainApp() {
  const { isAuthenticated } = useAuth()
  const { rooms } = useRooms()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    )
  }

  const availableRoomsCount = rooms.filter((r) => r.status === 'available').length

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <HomeScreen onNavigateTab={(tab) => setActiveTab(tab)} />
      case 'rooms':
        return <RoomsScreen />
      case 'tenants':
        return <TenantsScreen />
      case 'bills':
        return <BillsScreen />
      default:
        return <HomeScreen onNavigateTab={(tab) => setActiveTab(tab)} />
    }
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar style="light" />
      <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableRoomsCount={availableRoomsCount}
      />
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <TenantProvider>
          <BillProvider>
            <MainApp />
          </BillProvider>
        </TenantProvider>
      </RoomProvider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  screenWrapper: {
    flex: 1,
  },
})
