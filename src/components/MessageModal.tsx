// src/components/MessageModal.tsx
import { useState } from 'react'
import { motion } from 'motion/react'
import './MessageModal.css'

export interface MessageModalProps {
  guestName: string
  onSubmit: (message: string) => Promise<void>
  onSkip: () => void
  error?: string | null
}

export function MessageModal({ guestName, onSubmit, onSkip, error }: MessageModalProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    await onSubmit(message.trim())
    setSubmitting(false)
  }

  return (
    <motion.div
      className="message-modal"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="message-modal-content">
        <h2 className="message-modal-title">Gửi lời nhắn cho Ngọc Trinh</h2>
        <p className="message-modal-subtitle">
          Cảm ơn {guestName} đã phản hồi! Bạn có muốn gửi lời nhắn không?
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            className="message-modal-textarea"
            placeholder="Nhập lời nhắn của bạn..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={submitting}
          />
          <div className="message-modal-char-count">
            {message.length}/500
          </div>

          {error && <p className="message-modal-error">{error}</p>}

          <div className="message-modal-actions">
            <button
              type="button"
              className="message-modal-btn message-modal-btn-skip"
              onClick={onSkip}
              disabled={submitting}
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="message-modal-btn message-modal-btn-submit"
              disabled={!message.trim() || submitting}
            >
              {submitting ? 'Đang gửi...' : 'Gửi lời nhắn'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

