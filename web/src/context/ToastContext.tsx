import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (options: {
    type?: ToastType
    title?: string
    message: string
    duration?: number
  }) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 4500,
    }: {
      type?: ToastType
      title?: string
      message: string
      duration?: number
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const newToast: ToastItem = {
        id,
        type,
        title: title || (type === 'success' ? 'Thành công' : type === 'warning' ? 'Thông báo kiểm duyệt' : type === 'error' ? 'Lỗi' : 'Thông báo'),
        message,
        duration,
      }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, duration)
      }
    },
    [hideToast]
  )

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          borderLeft: '4px solid #10b981',
          badgeBg: '#dcfce7',
          badgeColor: '#15803d',
          badgeText: 'Thành công',
        }
      case 'warning':
        return {
          borderLeft: '4px solid #f59e0b',
          badgeBg: '#fef3c7',
          badgeColor: '#b45309',
          badgeText: 'Chờ duyệt AI',
        }
      case 'error':
        return {
          borderLeft: '4px solid #ef4444',
          badgeBg: '#fee2e2',
          badgeColor: '#b91c1c',
          badgeText: 'Từ chối / Lỗi',
        }
      case 'info':
      default:
        return {
          borderLeft: '4px solid #3b82f6',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
          badgeText: 'Thông báo',
        }
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {/* Floating Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '440px',
          width: 'calc(100% - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const styleConfig = getTypeStyles(toast.type)
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderLeft: styleConfig.borderLeft,
                borderRadius: '12px',
                padding: '16px 18px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      background: styleConfig.badgeBg,
                      color: styleConfig.badgeColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {styleConfig.badgeText}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                    {toast.title}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => hideToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    lineHeight: '1',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                  title="Đóng thông báo"
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  fontSize: '0.86rem',
                  color: '#475569',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                }}
              >
                {toast.message}
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
