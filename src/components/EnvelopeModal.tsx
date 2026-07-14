// src/components/EnvelopeModal.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { EventSettings } from '../types/database'
import { useGuestInvite } from '../hooks/useGuestInvite'
import { GuestInviteCard } from './GuestInviteCard'
import { MessageModal } from './MessageModal'
import { GraduationCapIcon, SparkleIcon } from './icons'
import { supabase } from '../lib/supabaseClient'
import './EnvelopeModal.css'

type EnvelopeState = 'envelope' | 'opening' | 'sliding' | 'revealed'
type ViewState = 'card' | 'message' | 'complete'

// Nhịp mở thư: nắp xoay 0.8s, thư trượt ra + bao thư mờ dần 1.3s.
// Test đang advance 2200ms nên tổng phải giữ ≤ 2100ms.
const FLAP_OPEN_MS = 800
const REVEAL_AT_MS = 2100

export interface EnvelopeModalProps {
  guestId: string
  eventSettings: EventSettings | null
  onClose: () => void
}

export function EnvelopeModal({ guestId, eventSettings, onClose }: EnvelopeModalProps) {
  const reducedMotion = useReducedMotion()
  const [envelopeState, setEnvelopeState] = useState<EnvelopeState>(
    reducedMotion ? 'revealed' : 'envelope'
  )
  const [viewState, setViewState] = useState<ViewState>('card')
  const [messageError, setMessageError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const envelopeRef = useRef<HTMLButtonElement>(null)

  const { guest, loading, notFound, submitting, rsvpError, respond } = useGuestInvite({
    guestId,
    eventSettings,
  })

  const handleOpen = useCallback(() => {
    if (envelopeState !== 'envelope') return
    setEnvelopeState('opening')
    setTimeout(() => setEnvelopeState('sliding'), FLAP_OPEN_MS)
    setTimeout(() => setEnvelopeState('revealed'), REVEAL_AT_MS)
  }, [envelopeState])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (envelopeState === 'envelope' && envelopeRef.current) {
      envelopeRef.current.focus()
    }
  }, [envelopeState])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  async function handleRsvpRespond(status: 'attending' | 'not_attending' | 'maybe') {
    await respond(status)
    // After successful RSVP, show message modal
    if (!rsvpError) {
      setViewState('message')
    }
  }

  async function handleMessageSubmit(message: string) {
    if (!guest) return
    setMessageError(null)
    const { error } = await supabase.rpc('submit_guest_message', {
      guest_id: guest.id,
      msg: message,
    })

    if (error) {
      setMessageError('Gửi lời nhắn thất bại, vui lòng thử lại.')
      return
    }

    setViewState('complete')
    // Auto close after 2 seconds
    setTimeout(() => onClose(), 10000)
  }

  function handleMessageSkip() {
    setViewState('complete')
    setTimeout(() => onClose(), 10000)
  }

  const salutation = guest?.salutation ? `${guest.salutation} ` : ''

  return (
    <motion.div
      ref={overlayRef}
      className="envelope-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Thiệp mời riêng"
      onClick={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button type="button" className="envelope-close" onClick={onClose} aria-label="Đóng">
        ✕
      </button>

      {envelopeState !== 'revealed' ? (
        <motion.div
          className="envelope-scene"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 1 }}
        >
          <button
            ref={envelopeRef}
            type="button"
            className="envelope-frame"
            data-state={envelopeState}
            onClick={handleOpen}
            aria-label="Chạm để mở thư"
          >
            <span className="env-float">
              <span className="env-3d">
                {/* Lưng bao thư (lòng bao tối hơn để tạo chiều sâu) */}
                <span className="env-back" />

                {/* Lá thư nằm giữa lưng bao và túi trước; trượt lên khi mở.
                    layoutId cho phép nó morph thành thiệp đầy đủ lúc revealed. */}
                <motion.span
                  className="env-letter"
                  layoutId="invite-letter"
                  initial={false}
                  animate={{ y: envelopeState === 'sliding' ? '-124%' : '0%' }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="env-letter-inner">
                    <GraduationCapIcon className="env-letter-cap" />
                    <span className="env-letter-title">Thư mời lễ tốt nghiệp</span>
                    {guest && (
                      <span className="env-letter-name">
                        {salutation}
                        {guest.full_name}
                      </span>
                    )}
                    <span className="env-letter-line" />
                    <span className="env-letter-line env-letter-line-short" />
                  </span>
                </motion.span>

                {/* Túi trước: hai mép gấp hông + mép đáy che phần dưới lá thư */}
                <span className="env-pocket env-pocket-left" />
                <span className="env-pocket env-pocket-right" />
                <span className="env-pocket env-pocket-bottom" />

                {guest && (
                  <span className="env-recipient">
                    Gửi: {salutation}
                    {guest.full_name}
                  </span>
                )}

                {/* Nắp bao thư 2 mặt: mặt ngoài hồng đậm mang dấu niêm phong,
                    mặt trong nhạt lộ ra sau khi nắp ngửa ra sau (rotateX âm) */}
                <span className="env-flap">
                  <span className="env-flap-face env-flap-face-front">
                    <span className="env-flap-paper" />
                    <span className="env-seal">
                      <GraduationCapIcon className="env-seal-icon" />
                    </span>
                  </span>
                  <span className="env-flap-face env-flap-face-back">
                    <span className="env-flap-paper" />
                  </span>
                </span>

                <SparkleIcon className="env-sparkle env-sparkle-1" />
                <SparkleIcon className="env-sparkle env-sparkle-2" />
              </span>
            </span>
          </button>

          <p
            className={`envelope-hint${envelopeState === 'envelope' ? '' : ' envelope-hint-hidden'}`}
          >
            ✨ Chạm để mở thư
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="envelope-card-wrapper"
          layoutId="invite-letter"
          transition={{ layout: { type: 'spring', stiffness: 200, damping: 26 } }}
        >
          {loading && <p className="envelope-loading">Đang tải...</p>}
          {notFound && (
            <div className="envelope-error">
              <p>Không tìm thấy thiệp mời này.</p>
              <button type="button" className="envelope-retry" onClick={onClose}>
                Đóng
              </button>
            </div>
          )}
          {guest && viewState === 'card' && (
            <GuestInviteCard
              guest={guest}
              eventSettings={eventSettings}
              submitting={submitting}
              rsvpError={rsvpError}
              onRespond={handleRsvpRespond}
            />
          )}
          {guest && viewState === 'message' && (
            <MessageModal
              guestName={guest.full_name}
              onSubmit={handleMessageSubmit}
              onSkip={handleMessageSkip}
              error={messageError}
            />
          )}
          {viewState === 'complete' && (
            <div className="envelope-complete">
              <p className="envelope-complete-text">
                Sự hiện diện của bạn chính là món quà lớn nhất dành cho tui. Cảm ơn vì đã là một phần tuyệt vời trong hành trình trưởng thành của tui 😍✨
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
