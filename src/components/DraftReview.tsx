import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  drafts: string[];
  onSelectDraft: (draft: string) => void;
  onBack: () => void;
}

export const DraftReview: React.FC<Props> = ({ drafts, onSelectDraft, onBack }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleContinue = () => {
    if (selectedIdx !== null) {
      onSelectDraft(drafts[selectedIdx]);
    }
  };

  return (
    <div className="step-container animate-fade-in">
      <div className="step-header">
        <h2>Step 2: Draft Review</h2>
        <p>Review the generated content and select the best draft.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {drafts.map((draft, idx) => (
          <div 
            key={idx} 
            className={`draft-card ${selectedIdx === idx ? 'selected' : ''}`}
            onClick={() => setSelectedIdx(idx)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input 
                type="radio" 
                name="draftSelection"
                checked={selectedIdx === idx}
                readOnly
                style={{ marginTop: '5px' }}
              />
              <div>
                <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>
                  Option {idx + 1}
                </strong>
                <div className="markdown-content" style={{ lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '8px' }}>
                  <ReactMarkdown>{draft}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" onClick={onBack} style={{ background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
          Back to Ingestion
        </button>
        <button 
          type="button" 
          className="primary" 
          disabled={selectedIdx === null}
          onClick={handleContinue}
        >
          Select Draft & Continue
        </button>
      </div>
    </div>
  );
};
