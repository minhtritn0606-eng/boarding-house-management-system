import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RoomProvider } from './context/RoomContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import DetailPage from './pages/DetailPage'
import LoginPage from './pages/LoginPage'
import CreateRoomPage from './pages/CreateRoomPage'
import EditRoomPage from './pages/EditRoomPage'
import MyRoomsPage from './pages/MyRoomsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ChatBot from './components/ChatBot'

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <BrowserRouter>
          <Routes>
            {/* 🛡️ Trang Admin độc lập với giao diện riêng biệt toàn màn hình */}
            <Route path="/admin" element={<AdminDashboardPage />} />

            {/* 🌐 Các trang công khai dành cho Người tìm trọ & Chủ trọ */}
            <Route
              path="*"
              element={
                <div className="app-shell">
                  <Navbar />
                  <div className="container">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/rooms" element={<ListingPage />} />
                      <Route path="/rooms/:id" element={<DetailPage />} />
                      <Route path="/rooms/:id/edit" element={<EditRoomPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/create-room" element={<CreateRoomPage />} />
                      <Route path="/my-rooms" element={<MyRoomsPage />} />
                    </Routes>
                  </div>
                  <Footer />
                  {/* 💬 Trợ Lý Chatbot AI nổi trên tất cả các trang người dùng */}
                  <ChatBot />
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </AuthProvider>
  )
}
