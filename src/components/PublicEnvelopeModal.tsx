// src/components/PublicEnvelopeModal.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { GraduationCapIcon, SparkleIcon } from './icons'
import './EnvelopeModal.css'
import './PublicEnvelopeModal.css'

type EnvelopeState = 'envelope' | 'opening' | 'sliding' | 'revealed'

// Cùng nhịp mở thư với EnvelopeModal.tsx để tái dùng animation env-* nguyên vẹn.
const FLAP_OPEN_MS = 800
const REVEAL_AT_MS = 2100

export interface PublicEnvelopeModalProps {
  message: string | null
  onClose: () => void
}

export function PublicEnvelopeModal({ message, onClose }: PublicEnvelopeModalProps) {
  const reducedMotion = useReducedMotion()
  const [envelopeState, setEnvelopeState] = useState<EnvelopeState>(
    reducedMotion ? 'revealed' : 'envelope'
  )
  const overlayRef = useRef<HTMLDivElement>(null)
  const envelopeRef = useRef<HTMLButtonElement>(null)

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

  return (
    <motion.div
      ref={overlayRef}
      className="envelope-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Thư mời lễ tốt nghiệp"
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
                <span className="env-back" />

                <motion.span
                  className="env-letter"
                  layoutId="public-invite-letter"
                  initial={false}
                  animate={{ y: envelopeState === 'sliding' ? '-124%' : '0%' }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="env-letter-inner">
                    <GraduationCapIcon className="env-letter-cap" />
                    <span className="env-letter-title">Thư mời lễ tốt nghiệp</span>
                    <span className="env-letter-line" />
                    <span className="env-letter-line env-letter-line-short" />
                  </span>
                </motion.span>

                <span className="env-pocket env-pocket-left" />
                <span className="env-pocket env-pocket-right" />
                <span className="env-pocket env-pocket-bottom" />

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
          layoutId="public-invite-letter"
          transition={{ layout: { type: 'spring', stiffness: 200, damping: 26 } }}
        >
          <div className="public-envelope-card">
            <GraduationCapIcon className="public-envelope-cap" />
            <h2 className="public-envelope-title">Thư mời lễ tốt nghiệp</h2>
            <p className="public-envelope-message">
              {message?.trim() ? message : 'Nội dung lời mời đang được cập nhật.'}
            </p>
            <button
              type="button"
              className="public-envelope-close-button"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
