import { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { chatbotApi, type SuggestedRoom } from '../services/api'

interface Message {
  id: string
  sender: 'bot' | 'user'
  text: string
  timestamp: string
  suggestedRooms?: SuggestedRoom[]
}

const DEFAULT_QUICK_REPLIES = [
  'Tìm phòng dưới 2 triệu',
  'Phòng ở Liên Chiểu',
  'Phòng có điều hòa & gác lửng',
  'Cách liên hệ chủ trọ',
]

export default function ChatBot() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Extract currentRoomId if user is on /rooms/:id
  const matchRoom = location.pathname.match(/\/rooms\/(\d+)/)
  const currentRoomId = matchRoom ? matchRoom[1] : undefined

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Chào bạn! Tôi là **Trợ lý Tìm Phòng Trọ AI**. Bạn đang cần tìm phòng trọ ở khu vực nào hoặc tầm giá bao nhiêu? Hãy nhắn cho tôi nhé!',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setUnreadCount(0)
    }
  }, [messages, isOpen])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isLoading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setIsLoading(true)

    try {
      const res = await chatbotApi.sendMessage(text, currentRoomId)
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.reply || 'Cảm ơn câu hỏi của bạn. Tôi có thể hỗ trợ gì thêm không?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestedRooms: res.suggestedRooms || [],
      }
      setMessages((prev) => [...prev, botMsg])

      if (res.quickReplies && res.quickReplies.length > 0) {
        setQuickReplies(res.quickReplies)
      }

      if (!isOpen) {
        setUnreadCount((c) => c + 1)
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Xin lỗi, không thể kết nối tới máy chủ trợ lý. Bạn vui lòng thử lại sau nhé!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0)
  }

  const renderFormattedText = (content: string) => {
    // Basic Markdown **bold** renderer
    const parts = content.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.92rem',
            position: 'relative',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 99, 235, 0.45)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.35)'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>💬</span>
          <span>Trợ Lý Trọ AI</span>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: '800',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Popup Chat Window */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '560px',
            maxHeight: 'calc(100vh - 100px)',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 14px 38px rgba(15, 23, 42, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Trợ Lý Trọ AI</span>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                      color: '#0f172a',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Gemini AI
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  <span>Tự động tư vấn thông minh</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setMessages([
                  {
                    id: 'welcome-reset',
                    sender: 'bot',
                    text: 'Chào bạn! Tôi có thể hỗ trợ bạn tìm phòng trọ hoặc giải đáp thông tin bài đăng nào?',
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  },
                ])}
                title="Làm mới đoạn chat"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                Xóa lịch sử
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '2px 8px',
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Context Banner if on a specific room */}
          {currentRoomId && (
            <div
              style={{
                background: '#eff6ff',
                padding: '8px 14px',
                fontSize: '0.78rem',
                color: '#1d4ed8',
                borderBottom: '1px solid #dbeafe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>📍 Đang xem bài đăng phòng <strong>#{currentRoomId}</strong></span>
              <button
                type="button"
                onClick={() => handleSend(`Cho tôi biết thêm thông tin về phòng này`)}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Hỏi về phòng
              </button>
            </div>
          )}

          {/* Message History List */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: '#f8fafc',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.sender === 'user' ? '#2563eb' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    border: msg.sender === 'bot' ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  {renderFormattedText(msg.text)}

                  {/* Suggested Room Cards inside Bot reply */}
                  {msg.suggestedRooms && msg.suggestedRooms.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {msg.suggestedRooms.map((room) => (
                        <div
                          key={room.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            gap: '10px',
                            padding: '8px',
                          }}
                        >
                          <img
                            src={room.image}
                            alt={room.title}
                            style={{ width: '70px', height: '60px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {room.title}
                            </div>
                            <div style={{ color: '#2563eb', fontWeight: '800', fontSize: '0.85rem' }}>
                              {formatPrice(room.price)}/tháng
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              📍 {room.district} ({room.area}m²)
                            </div>
                            <Link
                              to={`/rooms/${room.id}`}
                              style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                fontSize: '0.75rem',
                                color: '#2563eb',
                                fontWeight: '700',
                                textDecoration: 'none',
                              }}
                            >
                              Xem chi tiết phòng &rarr;
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#fff', borderRadius: '12px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Trợ lý đang tìm thông tin...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Chips */}
          {quickReplies.length > 0 && !isLoading && (
            <div
              style={{
                padding: '8px 12px',
                background: '#ffffff',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {quickReplies.map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qr)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9'
                  }}
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input & Send Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            style={{
              padding: '10px 14px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Nhập câu hỏi (VD: Phòng dưới 2tr có gác lửng)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              style={{
                padding: '10px 16px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputMessage.trim() ? 0.6 : 1,
              }}
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
