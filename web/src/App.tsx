import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RoomProvider } from './context/RoomContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ListingPage from './pages/ListingPage'
import DetailPage from './pages/DetailPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import CreateRoomPage from './pages/CreateRoomPage'
import MyRoomsPage from './pages/MyRoomsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

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
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/create-room" element={<CreateRoomPage />} />
                      <Route path="/my-rooms" element={<MyRoomsPage />} />
                    </Routes>
                  </div>
                  <Footer />
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </AuthProvider>
  )
}
