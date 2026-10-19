import { useState } from 'react'
import { AlertTriangle, Pill, ShieldCheck } from 'lucide-react'
import { aiToolsApi } from '../../services/api'
import { Card } from '../common/ui'

export default function DrugInteractionCheck({ prescriptionItems, currentMedications }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const medicationNames = [...new Set([
    ...(currentMedications || []),
    ...(prescriptionItems || [])
  ].map(medication => String(medication || '').trim()).filter(Boolean))]
  const signature = medicationNames.map(name => name.toLowerCase()).sort().join('|')
  const currentResult = result?.signature === signature ? result.data : null
  const findings = currentResult?.interactions || []
  const potentialCount = findings.filter(item => item.status === 'potential').length
  const uncertainCount = findings.filter(item => item.status === 'uncertain').length

  const runCheck = async () => {
    setChecking(true)
    setError('')
    setResult(null)
    try {
      const data = await aiToolsApi.checkInteractions(medicationNames)
      setResult({ signature, data })
    } catch (requestError) {
      setError(requestError.message || 'The interaction service is unavailable.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Card title="Drug Interaction Check">
      <div className="stack">
        <p className="muted small" style={{ margin: 0 }}>
          Check the patient’s current medication list together with medicines in this prescription before approval.
        </p>
        {medicationNames.length > 0 ? (
          <div className="tags" aria-label="Medications included in the interaction check">
            {medicationNames.map(name => <span className="tag" key={name}><Pill size={13} /> {name}</span>)}
          </div>
        ) : <p className="muted small">Select a patient and add medicines to run an interaction check.</p>}
        <div>
          <button type="button" className="btn btn-primary" onClick={runCheck} disabled={checking || medicationNames.length < 2}>
            <ShieldCheck size={15} /> {checking ? 'Checking interactions…' : 'Check interactions'}
          </button>
          {medicationNames.length < 2 && <span className="muted small" style={{ marginLeft: 10 }}>At least two medicines are needed.</span>}
        </div>
        {currentResult?.warning && <p className="muted small" role="note">{currentResult.warning}</p>}
        {error && <div className="alert err" role="alert">
          <strong>Interaction check not completed.</strong> {error} No safety result is available; verify with a clinical reference before approving.
        </div>}
        {currentResult && currentResult.reviewStatus === 'inconclusive' && (
          <div className="alert err" role="status">
            <strong>Inconclusive screening:</strong> Ollama assessed {currentResult.assessedPairCount} of {currentResult.totalPairCount} medication pairs. Do not treat this as a no-interaction result.
          </div>
        )}
        {currentResult && currentResult.reviewStatus === 'review_required' && (
          <div className="stack" role="status">
            <div className="alert err">
              <strong>Clinical review required:</strong> {potentialCount} potential interaction(s), {uncertainCount} uncertain pair(s).
            </div>
            {findings.map((interaction, index) => (
              <div className="med conflict" key={`${interaction.drugs?.join('-') || 'interaction'}-${index}`}>
                <div className="med-head">
                  <strong>{interaction.status === 'uncertain' ? 'Unable to determine: ' : ''}{interaction.drugs?.join(' ↔ ') || 'Medication interaction'}</strong>
                  <span className={`badge ${interaction.severity === 'High' ? 'badge-red' : interaction.severity === 'Moderate' ? 'badge-orange' : 'badge-blue'}`}>
                    <AlertTriangle size={12} /> {interaction.status === 'uncertain' ? 'Uncertain' : interaction.severity || 'Review'}
                  </span>
                </div>
                {interaction.effect && <p><strong>Effect:</strong> {interaction.effect}</p>}
                {interaction.description && <p className="muted small">{interaction.description}</p>}
                {interaction.recommendation && <p><strong>Clinical action:</strong> {interaction.recommendation}</p>}
              </div>
            ))}
          </div>
        )}
        {currentResult && currentResult.reviewStatus === 'screened_no_potential' && (
          <div className="alert ok" role="status">Ollama identified no potential interactions across all {currentResult.assessedPairCount} medication pairs. This is not a safety clearance; verify the regimen clinically.</div>
        )}
      </div>
    </Card>
  )
}