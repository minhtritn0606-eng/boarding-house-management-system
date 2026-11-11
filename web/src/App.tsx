import './App.css'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RoomProvider } from './context/RoomContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import DetailPage from './pages/DetailPage'
import LoginPage from './pages/LoginPage'
import CreateRoomPage from './pages/CreateRoomPage'
import EditRoomPage from './pages/EditRoomPage'
import MyRoomsPage from './pages/MyRoomsPage'
import NotificationsPage from './pages/NotificationsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ChatBot from './components/ChatBot'

function UserLayout() {
  const location = useLocation()
  const isNotificationsPage = location.pathname.startsWith('/notifications')

  return (
    <div className={`app-shell ${isNotificationsPage ? 'app-shell--fixed' : ''}`}>
      <Navbar />
      <div className={`container ${isNotificationsPage ? 'container--fixed' : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<ListingPage />} />
          <Route path="/rooms/:id" element={<DetailPage />} />
          <Route path="/rooms/:id/edit" element={<EditRoomPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-room" element={<CreateRoomPage />} />
          <Route path="/my-rooms" element={<MyRoomsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </div>
      {!isNotificationsPage && <Footer />}
      {/* 💬 Trợ Lý Chatbot AI nổi trên tất cả các trang người dùng */}
      <ChatBot />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* 🛡️ Trang Admin độc lập với giao diện riêng biệt toàn màn hình */}
              <Route path="/admin" element={<AdminDashboardPage />} />

              {/* 🌐 Các trang công khai dành cho Người tìm trọ & Chủ trọ */}
              <Route path="*" element={<UserLayout />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </RoomProvider>
    </AuthProvider>
  )
}
