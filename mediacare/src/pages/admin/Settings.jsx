import { useState, useEffect } from 'react'
import {
  Settings, Shield, Sparkles, Server, Key, Lock, CheckCircle2,
  AlertTriangle, Save, RefreshCw
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAsync } from '../../hooks'
import {
  Card, PageHeader, LoadingState, ErrorState
} from '../../components/common/ui'

export default function AdminSettings() {
  const { data, loading, error, reload } = useAsync(adminApi.getSettings)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (data) setForm(JSON.parse(JSON.stringify(data)))
  }, [data])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.updateSettings(form)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateKey = () => {
    if (confirm('Are you sure you want to regenerate the FHIR API key? Existing connected hospital microservices will need their tokens updated.')) {
      const randomKey = `mc_live_${Math.random().toString(36).substring(2, 12)}*******************01a`
      setForm({
        ...form,
        integrations: { ...form.integrations, apiKeySecretMasked: randomKey }
      })
    }
  }

  return (
    <>
      <PageHeader
        title="Platform & System Settings"
        subtitle="Manage global platform configurations, AI clinical inference thresholds, security protocols, and HL7/FHIR integration keys."
        actions={
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save System Settings'}
          </button>
        }
      />

      {loading && <LoadingState label="Loading platform configuration…" />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {savedSuccess && (
        <div className="alert ok" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
          System configuration updated and propagated across all cluster nodes!
        </div>
      )}

      {form && (
        <form onSubmit={handleSave} className="stack">
          {form.general.maintenanceMode && (
            <div className="alert err">
              <AlertTriangle size={18} style={{ display: 'inline', marginRight: 6 }} />
              <strong>Warning:</strong> System Maintenance Mode is currently ACTIVE. Non-admin users are receiving maintenance notices.
            </div>
          )}

          <div className="grid-2">
            {/* General Platform Config */}
            <Card title="General Platform Policies">
              <div className="stack">
                <label className="field">
                  Platform Name / Network Title
                  <input
                    type="text"
                    value={form.general.platformName}
                    onChange={e => setForm({ ...form, general: { ...form.general, platformName: e.target.value } })}
                  />
                </label>

                <div className="grid-2">
                  <label className="field">
                    Environment
                    <input
                      type="text"
                      disabled
                      value={form.general.environment}
                    />
                  </label>

                  <label className="field">
                    Data Retention (Years)
                    <input
                      type="number"
                      value={form.general.dataRetentionYears}
                      onChange={e => setForm({ ...form, general: { ...form.general, dataRetentionYears: Number(e.target.value) } })}
                    />
                  </label>
                </div>

                <label className="field">
                  System Support / Escalation Contact
                  <input
                    type="email"
                    value={form.general.supportEmail}
                    onChange={e => setForm({ ...form, general: { ...form.general, supportEmail: e.target.value } })}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                  <div>
                    <strong>System Maintenance Mode</strong>
                    <div className="muted small">Restricts platform access exclusively to administrators for scheduled upgrades</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.general.maintenanceMode}
                    onChange={e => setForm({ ...form, general: { ...form.general, maintenanceMode: e.target.checked } })}
                  />
                </label>
              </div>
            </Card>

            {/* AI Model Safety & Thresholds */}
            <Card title="AI Clinical Engine & Safety Gates">
              <div className="stack">
                <label className="field">
                  Speech-to-Text Transcription Engine
                  <select
                    value={form.aiEngine.primaryModel}
                    onChange={e => setForm({ ...form, aiEngine: { ...form.aiEngine, primaryModel: e.target.value } })}
                  >
                    <option value="whisper-large-v3-med">Whisper-Large-v3-Med (Fine-tuned Clinical weights)</option>
                    <option value="whisper-medium-en">Whisper-Medium-EN (Fast low-latency)</option>
                    <option value="medicare-custom-llm">MediCare Custom Speech-to-SOAP Pipeline</option>
                  </select>
                </label>

                <label className="field">
                  Canvas Handwriting OCR Engine
                  <select
                    value={form.aiEngine.ocrEngine}
                    onChange={e => setForm({ ...form, aiEngine: { ...form.aiEngine, ocrEngine: e.target.value } })}
                  >
                    <option value="microsoft-trocr">Microsoft TrOCR (local handwritten model)</option>
                  </select>
                </label>

                <label className="field">
                  AI Minimum Confidence Threshold ({form.aiEngine.confidenceThresholdPercent}%)
                  <input
                    type="range"
                    min="75"
                    max="99"
                    value={form.aiEngine.confidenceThresholdPercent}
                    onChange={e => setForm({ ...form, aiEngine: { ...form.aiEngine, confidenceThresholdPercent: Number(e.target.value) } })}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                  <div>
                    <strong>Strict Drug-Drug Interaction Interceptor</strong>
                    <div className="muted small">Block finalization if high-risk interaction is detected without physician override</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.aiEngine.enforceInteractionCheck}
                    onChange={e => setForm({ ...form, aiEngine: { ...form.aiEngine, enforceInteractionCheck: e.target.checked } })}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer' }}>
                  <div>
                    <strong>Mandatory Patient Allergy Verification</strong>
                    <div className="muted small">Require verified allergy contraindication scan on all drug rows</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.aiEngine.enforceAllergyCheck}
                    onChange={e => setForm({ ...form, aiEngine: { ...form.aiEngine, enforceAllergyCheck: e.target.checked } })}
                  />
                </label>
              </div>
            </Card>

            {/* Security Policies */}
            <Card title="Security & Authentication Controls">
              <div className="stack">
                <div className="grid-2">
                  <label className="field">
                    Session Timeout (Minutes)
                    <select
                      value={form.security.sessionTimeoutMinutes}
                      onChange={e => setForm({ ...form, security: { ...form.security, sessionTimeoutMinutes: Number(e.target.value) } })}
                    >
                      <option value="15">15 Minutes (High Security)</option>
                      <option value="30">30 Minutes (Recommended)</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </label>

                  <label className="field">
                    Max Failed Login Attempts
                    <select
                      value={form.security.maxFailedLogins}
                      onChange={e => setForm({ ...form, security: { ...form.security, maxFailedLogins: Number(e.target.value) } })}
                    >
                      <option value="3">3 Attempts</option>
                      <option value="5">5 Attempts</option>
                      <option value="10">10 Attempts</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}>
                  <div>
                    <strong>Enforce 2FA for Clinical Staff</strong>
                    <div className="muted small">Mandatory 2FA authentication for all prescribing doctors and administrators</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.security.enforce2FA}
                    onChange={e => setForm({ ...form, security: { ...form.security, enforce2FA: e.target.checked } })}
                  />
                </label>
              </div>
            </Card>

            {/* HL7 / FHIR Integrations */}
            <Card title="HL7 / FHIR Gateway Integration">
              <div className="stack">
                <label className="field">
                  FHIR R4 Endpoint URL
                  <input
                    type="text"
                    value={form.integrations.hl7FhirEndpoint}
                    onChange={e => setForm({ ...form, integrations: { ...form.integrations, hl7FhirEndpoint: e.target.value } })}
                  />
                </label>

                <div>
                  <div className="muted small" style={{ marginBottom: 4 }}>Master API Token Secret</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <code style={{ flex: 1, background: '#f1f5f9', padding: '9px 12px', borderRadius: 8, fontSize: '0.85rem' }}>
                      {form.integrations.apiKeySecretMasked}
                    </code>
                    <button type="button" className="btn btn-sm" onClick={handleRegenerateKey}>
                      <Key size={14} /> Regenerate
                    </button>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '0.85rem', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ping-indicator" />
                  <span>Webhook Gateway Status: <strong>{form.integrations.webhookStatus}</strong></span>
                </div>
              </div>
            </Card>
          </div>
        </form>
      )}
    </>
  )
}
