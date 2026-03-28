import React, { useState } from 'react';

interface Props {
  onGenerate: (content: { text?: string; url?: string }) => void;
  isLoading: boolean;
}

export const IngestionForm: React.FC<Props> = ({ onGenerate, isLoading }) => {
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [textValue, setTextValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (inputType === 'text') {
      if (!textValue.trim()) {
        setError('Please enter a content idea.');
        return;
      }
      onGenerate({ text: textValue });
    } else {
      if (!urlValue.trim()) {
        setError('Please enter a source URL.');
        return;
      }
      try {
        new URL(urlValue);
      } catch (_) {
        setError('Please enter a valid URL (e.g. https://example.com).');
        return;
      }
      onGenerate({ url: urlValue });
    }
  };

  return (
    <div className="step-container animate-fade-in">
      <div className="step-header">
        <h2>Step 1: Content Ingestion</h2>
        <p>Provide a raw idea or a source URL to generate drafts.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <button 
          type="button" 
          className={inputType === 'text' ? 'primary' : ''} 
          onClick={() => { setInputType('text'); setError(''); }}
          style={{ flex: 1, background: inputType === 'text' ? '' : 'var(--bg-dark)' }}
        >
          Raw Text Idea
        </button>
        <button 
          type="button" 
          className={inputType === 'url' ? 'primary' : ''} 
          onClick={() => { setInputType('url'); setError(''); }}
          style={{ flex: 1, background: inputType === 'url' ? '' : 'var(--bg-dark)' }}
        >
          Source URL
        </button>
      </div>

      {isLoading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Sending request to n8n webhook... Generating drafts.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {inputType === 'text' ? (
            <textarea 
              rows={5} 
              placeholder="e.g. Write a post about the future of AI in marketing."
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
          ) : (
            <input 
              type="url" 
              placeholder="https://example.com/article"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
            />
          )}

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" className="primary">Generate Drafts</button>
          </div>
        </form>
      )}
    </div>
  );
};
