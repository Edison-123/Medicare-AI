import { Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Card, PageHeader } from '../../components/common/ui'
import ProfilePhotoEditor from '../../components/common/ProfilePhotoEditor'

export default function AdminProfile() {
  const { user, updateProfilePicture } = useAuth()

  return (
    <>
      <PageHeader title="Admin Profile" subtitle="Your administrator account details." />
      <Card title="Account">
        <div style={{ marginBottom: 20 }}>
          <ProfilePhotoEditor
            name={user?.name || 'Administrator'}
            profilePicture={user?.profilePicture}
            onSave={updateProfilePicture}
          />
        </div>
        <div className="stack">
          <div className="row" style={{ gap: 10 }}>
            <Mail size={17} aria-hidden="true" />
            <span>{user?.sub || user?.email || 'Email unavailable'}</span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Administrator access</span>
          </div>
        </div>
      </Card>
    </>
  )
}