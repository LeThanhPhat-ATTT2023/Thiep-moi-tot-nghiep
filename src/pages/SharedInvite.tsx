// src/pages/SharedInvite.tsx
import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { useEventInfo } from '../hooks/useEventInfo'
import { EventInfoSections } from '../components/EventInfoSections'
import { PublicEnvelopeModal } from '../components/PublicEnvelopeModal'
import { PinKeypad } from '../components/PinKeypad'
import { InviteFrame } from '../components/InviteFrame'
import { MusicPlayerWidget } from '../components/MusicPlayerWidget'
import { SparkleIcon } from '../components/icons'
import { HOST_NAME } from '../lib/constants'
import '../styles/tokens.css'
import '../styles/public-shared.css'
import './PublicInvite.css'
import './HomePage.css'
import './SharedInvite.css'

const SHARED_INVITE_PASSWORD = '2307'
const PIN_ERROR_RESET_MS = 600

type GateState = 'gate' | 'unlocked'

export function SharedInvite() {
  const [gateState, setGateState] = useState<GateState>('gate')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const { settings, gallery, loading, error, reload } = useEventInfo()

  function handlePinChange(next: string) {
    setPin(next)
    setPinError(false)
    if (next.length === 4) {
      if (next === SHARED_INVITE_PASSWORD) {
        setGateState('unlocked')
      } else {
        setPinError(true)
        setTimeout(() => {
          setPin('')
          setPinError(false)
        }, PIN_ERROR_RESET_MS)
      }
    }
  }

  if (gateState === 'gate') {
    return (
      <div className="home-page">
        <InviteFrame>
          <div className="home-hero">
            <SparkleIcon className="home-hero-sparkle home-hero-sparkle-1" />
            <SparkleIcon className="home-hero-sparkle home-hero-sparkle-2" />
            <span className="home-hero-pill home-hero-pill-happy">Happy</span>
            <h1 className="home-hero-title">Graduation</h1>
            <span className="home-hero-pill home-hero-pill-name">{HOST_NAME}</span>
          </div>

          <div className="home-message-zone">
            <p className="home-message">
              Cảm ơn vì đã là một phần rực rỡ trong những năm tháng thanh xuân của mình.
              Nhập mật khẩu để cùng mở ra tấm vé đến ngày lễ tốt nghiệp nhé!
            </p>
            <MusicPlayerWidget />
          </div>

          <div className="home-search-section">
            <p className="home-search-label">Vui lòng nhập mật khẩu❤️</p>
            <PinKeypad value={pin} maxLength={4} onChange={handlePinChange} shake={pinError} />
            {pinError && (
              <p className="shared-invite-gate-error" role="alert">
                Sai mật khẩu, vui lòng thử lại.
              </p>
            )}
          </div>
        </InviteFrame>
      </div>
    )
  }

  if (loading) return <p className="page-loading">Đang tải...</p>

  if (error) {
    return (
      <div className="page-error">
        <p role="alert">{error}</p>
        <button className="retry-button" type="button" onClick={reload}>
          Thử lại
        </button>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="public-invite-page">
      <InviteFrame>
        <EventInfoSections settings={settings} gallery={gallery} />

        <div className="public-invite-section public-invite-cta-section">
          <button
            type="button"
            className="public-invite-cta"
            onClick={() => setInviteOpen(true)}
          >
            Xem lời mời riêng dành cho bạn
          </button>
        </div>
      </InviteFrame>

      <MusicPlayerWidget variant="floating" />

      <AnimatePresence>
        {inviteOpen && (
          <PublicEnvelopeModal
            message={settings.public_invite_message}
            onClose={() => setInviteOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
