import { useRef, useState } from 'react'
import { Camera, CheckCircle2, Trash2 } from 'lucide-react'
import { Avatar } from './ui'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 512

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the selected photo.'))
    reader.readAsDataURL(blob)
  })
}

async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Choose an image smaller than 8 MB.')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Could not prepare the selected photo.')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const compressed = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84))
  if (!compressed) throw new Error('Could not prepare the selected photo.')
  return readAsDataUrl(compressed)
}

export default function ProfilePhotoEditor({ name, profilePicture, onSave }) {
  const inputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const savePhoto = async imageData => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await onSave(imageData)
      setMessage(imageData ? 'Profile photo updated.' : 'Profile photo removed.')
    } catch (saveError) {
      setError(saveError.message || 'Could not update your profile photo.')
    } finally {
      setSaving(false)
    }
  }

  const handleSelect = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await onSave(await preparePhoto(file))
      setMessage('Profile photo updated.')
    } catch (uploadError) {
      setError(uploadError.message || 'Could not update your profile photo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="row" style={{ alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={saving}
        aria-label={profilePicture ? 'Change profile photo' : 'Upload profile photo'}
        title={profilePicture ? 'Change profile photo' : 'Upload profile photo'}
        style={{ border: 0, padding: 0, borderRadius: '50%', background: 'transparent', cursor: saving ? 'wait' : 'pointer', lineHeight: 0 }}
      >
        <Avatar name={name || 'User'} size={80} src={profilePicture} />
      </button>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
            aria-label="Choose a profile photo"
            style={{ display: 'none' }}
          />
          <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={saving}>
            <Camera size={15} /> {saving ? 'Saving…' : profilePicture ? 'Change photo' : 'Upload photo'}
          </button>
          {profilePicture && <button type="button" className="btn" onClick={() => savePhoto('')} disabled={saving}>
            <Trash2 size={15} /> Remove photo
          </button>}
        </div>
        <span className="muted small">JPG, PNG, or WebP. The image is resized before upload.</span>
        {message && <span className="muted small" role="status"><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{message}</span>}
        {error && <span className="alert err" role="alert">{error}</span>}
      </div>
    </div>
  )
}