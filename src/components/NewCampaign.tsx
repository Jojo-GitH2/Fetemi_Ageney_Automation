import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { mockN8nService } from '../services/mockN8nService';
import type { Draft } from '../services/mockN8nService';
import { Loader2, Zap, Send, CheckCircle2, Users, MessageSquare, Mail, Calendar, Sparkles } from 'lucide-react';

export const NewCampaign: React.FC = () => {
  const { session } = useAuth();
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  // Input State
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  
  // API State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Response State
  const [campaignId, setCampaignId] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Approval State
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn']);
  const [publishType, setPublishType] = useState<'now' | 'schedule'>('now');
  const [scheduleTime, setScheduleTime] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const data = inputType === 'text' ? { content } : { url };
      const response = await mockN8nService.generateDrafts(data, session?.access_token || '');
      setCampaignId(response.campaign_id);
      setDrafts(response.drafts);
      setSelectedDraftId(response.drafts[0]?.draft_id || '');
      setStep('review');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating drafts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleApprove = async () => {
    if (!selectedDraftId) {
      setErrorMsg('Please select a draft to approve.');
      return;
    }
    if (publishType === 'schedule' && !scheduleTime) {
      setErrorMsg('Please select a schedule time.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        campaign_id: campaignId,
        approved_draft_id: selectedDraftId,
        selected_platforms: selectedPlatforms,
        schedule_time: publishType === 'schedule' ? new Date(scheduleTime).toISOString() : null
      };

      const response = await mockN8nService.distributeDraft(payload, session?.access_token || '');
      setSuccessMsg(response.message || 'Campaign distributed successfully!');
      
      setTimeout(() => {
        setStep('input');
        setContent('');
        setUrl('');
        setSuccessMsg('');
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error approving draft.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-5xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-text-main mb-2">New Campaign</h2>
        <p className="text-text-muted">Transform your raw ideas into polished content distributed across multiple platforms.</p>
      </div>

      {errorMsg && (
         <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-lg">
           <Zap size={20} />
           <p className="font-medium">{errorMsg}</p>
         </div>
      )}

      {successMsg && (
         <div className="bg-accent/10 border border-accent/50 text-accent px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-lg">
           <CheckCircle2 size={20} />
           <p className="font-medium">{successMsg}</p>
         </div>
      )}

      {step === 'input' && (
        <form onSubmit={handleGenerate} className="glass-card p-6 md:p-8">
          <div className="flex bg-surface/50 p-1 rounded-xl mb-8 w-fit border border-glass-border mx-auto md:mx-0">
            <button
              type="button"
              onClick={() => setInputType('text')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${inputType === 'text' ? 'bg-primary text-text-main shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text-main'}`}
            >
              Raw Idea Base
            </button>
            <button
              type="button"
              onClick={() => setInputType('url')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${inputType === 'url' ? 'bg-primary text-text-main shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text-main'}`}
            >
              Source Link URL
            </button>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-text-main mb-3">
              {inputType === 'text' ? 'Paste your rough ideas or notes here:' : 'Enter the article or media URL:'}
            </label>
            {inputType === 'text' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={7}
                className="w-full bg-surface/50 border border-glass-border rounded-xl p-5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-text-muted resize-none shadow-inner"
                placeholder="e.g. AI is changing how we learn STEM by implementing immediate analytical feedback loops..."
              />
            ) : (
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full bg-surface/50 border border-glass-border rounded-xl p-5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-text-muted shadow-inner"
                placeholder="https://example.com/target-article-to-repurpose"
              />
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-glass-border">
            <button
              type="submit"
              disabled={isLoading || (inputType === 'text' ? !content : !url)}
              className="bg-primary hover:bg-primary-hover text-text-main px-8 py-3.5 rounded-xl font-medium transition-all flex items-center gap-3 shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Generate Drafts
            </button>
          </div>
        </form>
      )}

      {step === 'review' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-text-main flex items-center gap-2">
              <Sparkles className="text-accent" size={20} /> Select Best Match
            </h3>
            <button
              onClick={() => setStep('input')}
              className="text-sm text-text-muted hover:text-text-main transition-colors"
            >
              ← Back to Ingestion
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {drafts.map((draft, idx) => (
              <div 
                key={draft.draft_id}
                onClick={() => setSelectedDraftId(draft.draft_id)}
                className={`glass-card p-6 cursor-pointer border-2 transition-all group ${selectedDraftId === draft.draft_id ? 'border-primary shadow-xl shadow-primary/10 bg-primary/5' : 'border-glass-border glass-hover'}`}
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-glass-border">
                  <span className={`font-semibold ${selectedDraftId === draft.draft_id ? 'text-primary' : 'text-text-muted group-hover:text-text-main'}`}>
                    Draft Option {idx + 1}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDraftId === draft.draft_id ? 'border-primary bg-primary' : 'border-glass-border'}`}>
                    {selectedDraftId === draft.draft_id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
                <div className="markdown-content max-h-[450px] overflow-y-auto pr-2 pb-4">
                  <ReactMarkdown>{draft.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 md:p-8 mt-8 border border-glass-border relative overflow-hidden">
            {/* Background design artifact */}
            <div className="absolute -right-32 -top-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="grid md:grid-cols-2 gap-10 relative z-10">
              {/* Platforms */}
              <div>
                <h3 className="text-lg font-semibold text-text-main mb-6">Distribution Platforms</h3>
                <div className="space-y-4">
                  {[
                    { id: 'LinkedIn', icon: Users },
                    { id: 'X', icon: MessageSquare },
                    { id: 'Newsletter', icon: Mail }
                  ].map(platform => (
                    <label key={platform.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedPlatforms.includes(platform.id) ? 'border-primary/50 bg-primary/10 text-text-main' : 'border-glass-border bg-surface/50 text-text-muted hover:bg-surface'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => handlePlatformToggle(platform.id)}
                        className="w-5 h-5 rounded border-glass-border text-primary focus:ring-primary focus:ring-offset-background bg-surface"
                      />
                      <platform.icon size={20} className={selectedPlatforms.includes(platform.id) ? 'text-primary' : ''} />
                      <span className="font-medium text-inherit">{platform.id}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scheduling */}
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-text-main mb-6">Publishing Schedule</h3>
                <div className="flex bg-surface/50 p-1 rounded-xl mb-6 w-fit border border-glass-border">
                  <button
                    type="button"
                    onClick={() => setPublishType('now')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${publishType === 'now' ? 'bg-muted text-text-main shadow-md' : 'text-text-muted hover:text-text-main'}`}
                  >
                    Publish Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishType('schedule')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${publishType === 'schedule' ? 'bg-muted text-text-main shadow-md' : 'text-text-muted hover:text-text-main'}`}
                  >
                    <Calendar size={16} /> Schedule Later
                  </button>
                </div>
                
                {publishType === 'schedule' && (
                  <div className="animate-fade-in mb-6">
                    <input 
                      type="datetime-local" 
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-surface/80 border border-glass-border rounded-xl p-4 text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                    />
                  </div>
                )}

                <div className="mt-auto pt-6 border-t border-glass-border">
                  <button
                    onClick={handleApprove}
                    disabled={isLoading || selectedPlatforms.length === 0}
                    className="w-full bg-accent hover:bg-teal-400 text-text-muted px-6 py-4 rounded-xl font-bold text-[1.05rem] transition-all flex items-center justify-center gap-3 shadow-lg shadow-accent/20 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={22} />}
                    Approve & Generate Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
