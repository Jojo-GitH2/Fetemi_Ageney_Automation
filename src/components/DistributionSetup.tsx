import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  selectedDraft: string;
  onApprove: (data: { scheduleDate?: string }) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const DistributionSetup: React.FC<Props> = ({ selectedDraft, onApprove, onBack, isSubmitting }) => {
  const [publishType, setPublishType] = useState<'immediate' | 'schedule'>('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [error, setError] = useState('');

  const handleApprove = () => {
    setError('');
    if (publishType === 'schedule') {
      if (!scheduleDate) {
        setError('Please select a date and time to schedule.');
        return;
      }
      const selectedTime = new Date(scheduleDate).getTime();
      if (selectedTime <= Date.now()) {
        setError('Schedule time must be in the future.');
        return;
      }
      onApprove({ scheduleDate });
    } else {
      onApprove({});
    }
  };

  return (
    <div className="step-container animate-fade-in">
      <div className="step-header">
        <h2>Step 3: Distribution Setup</h2>
        <p>Configure publishing options for your selected draft.</p>
      </div>

      <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
        <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}><strong>Selected Draft:</strong></p>
        <div className="markdown-content" style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '0.9rem', color: 'var(--text-main)' }}>
          <ReactMarkdown>{selectedDraft}</ReactMarkdown>
        </div>
      </div>

      {isSubmitting ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Sending approval to n8n webhook... Executing final workflow.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                checked={publishType === 'immediate'}
                onChange={() => { setPublishType('immediate'); setError(''); }}
              />
              Publish Immediately
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                checked={publishType === 'schedule'}
                onChange={() => { setPublishType('schedule'); setError(''); }}
              />
              Schedule for Later
            </label>
          </div>

          {publishType === 'schedule' && (
            <div className="animate-fade-in" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Select Date & Time</label>
              <input 
                type="datetime-local" 
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
          )}

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" onClick={onBack} style={{ background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
              Back to Drafts
            </button>
            <button type="button" className="success" onClick={handleApprove}>
              Approve & Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};
