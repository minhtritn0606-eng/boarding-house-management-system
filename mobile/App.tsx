import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import AuthScreen from './src/screens/AuthScreen'
import HomeScreen from './src/screens/HomeScreen'

function MainApp() {
  const { isAuthenticated } = useAuth()

  return (
    <>
      <StatusBar style="light" />
      {isAuthenticated ? <HomeScreen /> : <AuthScreen />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
