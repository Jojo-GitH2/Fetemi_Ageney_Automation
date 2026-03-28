import React, { useState } from 'react';
import { useAuth, supabase } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { mockN8nService } from '../services/mockN8nService';
import { Loader2, Plus, Sparkles, Network, CheckCircle2, ChevronRight, MessageSquare, Mail, Users, Calendar, Send, Activity, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const getPlatformIcon = (name: string) => {
  switch (name) {
    case 'LinkedIn': return <Users size={16} className="text-[#0077b5]" />;
    case 'X': return <MessageSquare size={16} className="text-slate-100" />;
    case 'Newsletter': return <Mail size={16} className="text-amber-500" />;
    default: return <Network size={16} />;
  }
};

export const CampaignsView: React.FC = () => {
  const { session } = useAuth();
  const { campaigns, pendingPosts, calendarPosts, refreshData, isLoadingGlobal: isLoadingCampaigns } = useContent();
  
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [inputValue, setInputValue] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const { showToast } = useToast();

  const [loadingText, setLoadingText] = useState('Generate AI Drafts');

  React.useEffect(() => {
    if (!isGenerating) {
      setLoadingText('Generate AI Drafts');
      return;
    }
    const msgs = ['Analyzing idea...', 'Drafting content...', 'Polishing hooks...'];
    let i = 0;
    setLoadingText(msgs[0]);
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      setLoadingText(msgs[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputValue.trim();

    const isUrl = () => {
      try {
        const url = new URL(cleanInput);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (inputType === 'text' && cleanInput.length < 30) {
      showToast('Please enter at least 30 characters for your text idea.', 'error');
      return;
    }

    if (inputType === 'text' && isUrl()) {
      showToast('Please use the "Source URL" tab for web links.', 'error');
      return;
    }
    if (inputType === 'url' && !isUrl()) {
      showToast('Please enter a valid HTTP/HTTPS URL.', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const data = inputType === 'text' ? { content: cleanInput } : { url: cleanInput };
      await mockN8nService.generateDrafts(data, session?.access_token || '');
      
      setInputValue('');
      setTimeout(() => { refreshData(); }, 3000);
    } catch (err) {
      console.error(err);
      showToast('Failed to generate drafts. Check your n8n workflows.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in w-full max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Campaigns & Ideation</h2>
          <p className="text-slate-400">Generate fresh content streams and recursively manage their end-to-end lifecycles.</p>
        </div>
        {isLoadingCampaigns && <Loader2 size={24} className="animate-spin text-primary" />}
      </div>

      <div className="glass-card p-6 md:p-8 mb-10 border border-t-4 border-t-primary relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="text-primary" /> Start New Campaign
        </h3>
        
        <form onSubmit={handleGenerate}>
          <div className="flex bg-surface/50 p-1 rounded-xl mb-4 w-fit border border-white/5">
            <button
              type="button"
              onClick={() => setInputType('text')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${inputType === 'text' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Raw Idea Text
            </button>
            <button
              type="button"
              onClick={() => setInputType('url')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${inputType === 'url' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Source URL
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full relative">
              {inputType === 'text' ? (
                 <div className="relative h-full">
                   <textarea
                     value={inputValue}
                     onChange={e => setInputValue(e.target.value)}
                     className={`w-full bg-slate-900 border rounded-xl p-4 pb-8 text-white focus:outline-none focus:ring-2 shadow-inner min-h-[140px] resize-y block ${inputValue.trim().length > 0 && inputValue.trim().length < 30 ? 'border-red-500/50 focus:ring-red-500' : 'border-white/10 focus:ring-primary'}`}
                     placeholder="Enter your rough thoughts, notes, or bullet points..."
                     required
                   />
                   <div className={`absolute bottom-3 right-4 text-xs font-semibold ${inputValue.trim().length < 30 ? 'text-red-400' : 'text-emerald-500'}`}>
                     {inputValue.trim().length} / 30 min
                   </div>
                 </div>
              ) : (
                 <input
                   type="url"
                   value={inputValue}
                   onChange={e => setInputValue(e.target.value)}
                   className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                   placeholder="https://example.com/article-to-repurpose"
                   required
                 />
              )}
            </div>
            <button
              type="submit"
              disabled={isGenerating || !inputValue.trim() || (inputType === 'text' && inputValue.trim().length < 30)}
              className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 min-w-[200px] justify-center h-[56px] shrink-0"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {loadingText}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-200 mb-6">Archive & Action Queue</h3>
        <div className="space-y-4">
          {campaigns.length === 0 && !isLoadingCampaigns && (
             <div className="text-center p-8 bg-surface/30 rounded-xl border border-white/5 text-slate-500">
               No campaigns found in database. Create one above!
             </div>
          )}
          {campaigns.map(camp => (
            <div key={camp.id} className="glass-card border border-white/5 overflow-hidden break-inside-avoid">
              <div 
                className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedCampaignId === camp.id ? 'bg-surface border-b border-white/5' : 'hover:bg-white/5'}`}
                onClick={() => setExpandedCampaignId(expandedCampaignId === camp.id ? null : camp.id)}
              >
                <div className="flex items-center gap-4">
                  {camp.status === 'approved' ? (
                    <CheckCircle2 className="text-accent" size={24} />
                  ) : (
                    <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)] ml-1.5 mr-1.5" />
                  )}
                  <div>
                    <h4 className="font-semibold text-white">{camp.displayTitle}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                       <Calendar size={12} /> {new Date(camp.created_at).toLocaleDateString()}
                       <span className="px-2 py-0.5 rounded-full bg-background text-slate-300 ml-2 border border-white/5">
                         {camp.status === 'approved' ? 'Draft Selected' : 'Pending Selection'}
                       </span>
                    </p>
                  </div>
                </div>
                <ChevronRight className={`text-slate-400 transition-transform ${expandedCampaignId === camp.id ? 'rotate-90' : ''}`} />
              </div>

              {expandedCampaignId === camp.id && (
                 <CampaignDrilldown 
                   camp={camp} 
                   pendingPosts={pendingPosts.filter(p => p.campaign_id === camp.id)}
                   calendarPosts={calendarPosts.filter(p => p.campaign_id === camp.id)}
                 />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CampaignDrilldown = ({ camp, pendingPosts, calendarPosts }: any) => {
  const { session } = useAuth();
  const { refreshData } = useContent();
  const { showToast } = useToast();

  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [draftsForExpanded, setDraftsForExpanded] = useState<any[]>([]);

  // Draft Phase Mode States
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn']);
  const [isApproving, setIsApproving] = useState(false);

  // Social Phase Mode State map for tracking active inputs recursively per-post
  const [edits, setEdits] = useState<Record<string, { content: string, status: 'now'|'schedule', time: string }>>({});
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Retry mechanism state
  const [retryingPostId, setRetryingPostId] = useState<string | null>(null);
  const [retryTime, setRetryTime] = useState('');
  const [submittingRetryId, setSubmittingRetryId] = useState<string | null>(null);
  const [localCalendarPosts, setLocalCalendarPosts] = useState<any[]>(calendarPosts);

  // Sync calendarPosts prop into local state when it changes
  React.useEffect(() => { setLocalCalendarPosts(calendarPosts); }, [calendarPosts]);

  React.useEffect(() => {
    if (camp.status !== 'approved') fetchDraftsLocally();
  }, [camp.id, camp.status]);

  // Pull drafts recursively exactly when Drilldown boots if not yet approved
  const fetchDraftsLocally = async () => {
    setIsLoadingDrafts(true);
    try {
      const { data, error } = await supabase.from('article_drafts').select('*').eq('campaign_id', camp.id);
      if (error) throw error;
      setDraftsForExpanded(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleApproveArticle = async () => {
    if (!selectedDraftId || selectedPlatforms.length === 0) return;
    setIsApproving(true);
    try {
      const payload = {
        campaign_id: camp.id,
        approved_draft_id: selectedDraftId,
        selected_platforms: selectedPlatforms,
        schedule_time: null 
      };
      await mockN8nService.distributeDraft(payload, session?.access_token || '');
      showToast('Article approved and socials generated!', 'success');
      window.dispatchEvent(new CustomEvent('navigateTab', { detail: 'review' }));
      setTimeout(() => { refreshData(); }, 2000); // Prompts global state refresh moving phase internally
    } catch (error) {
      console.error(error);
      showToast('Failed to approve drafts.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleBatchConfirmSocial = async () => {
    setIsBatchSaving(true);
    try {
      // Reconstruct strictly to payload requirements matching N edited posts from Sandbox schema
      const mappedPosts = pendingPosts.map((p: any) => {
        const edit = edits[p.id] || { content: p.content, status: 'now', time: '' };
        return {
           post_id: p.id,
           edited_content: edit.content,
           publish_status: edit.status === 'schedule' ? 'Scheduled' : 'Pending',
           scheduled_for: edit.status === 'schedule' && edit.time ? new Date(edit.time).toISOString() : null,
           platform: p.platform
        };
      });

      await mockN8nService.confirmSocialPosts({ posts: mappedPosts }, session?.access_token || '');

      // Execute synchronous isolated batch DB mutation tracking 
      for (const mapped of mappedPosts) {
         await supabase.from('social_posts').update({
             content: mapped.edited_content,
             publish_status: mapped.publish_status,
             scheduled_for: mapped.scheduled_for
         }).eq('id', mapped.post_id);
      }

      refreshData();
      showToast('Batch execution confirmed and queued!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed executing batch sequence via Webhook', 'error');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const mapPostEdit = (id: string, payload: any) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...payload } }));
  };

  // Compute min datetime for retry picker (current local time, rounded to minutes)
  const getMinDatetime = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  };

  const handleRetryPost = async (post: any) => {
    if (!retryTime) {
      showToast('Please select a future date and time.', 'error');
      return;
    }
    setSubmittingRetryId(post.id);
    try {
      const utcTimestamp = new Date(retryTime).toISOString();
      await mockN8nService.retrySinglePost({
        campaign_id: camp.id,
        posts: [{
          post_id: post.id,
          edited_content: post.content,
          publish_status: 'Scheduled',
          scheduled_for: utcTimestamp,
          platform: post.platform
        }]
      }, session?.access_token || '');

      // Optimistic UI: update local state immediately
      setLocalCalendarPosts(prev =>
        prev.map(p => p.id === post.id ? { ...p, publish_status: 'Pending' } : p)
      );
      setRetryingPostId(null);
      setRetryTime('');
      showToast('Retry sent!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Retry failed. Please try again.', 'error');
    } finally {
      setSubmittingRetryId(null);
    }
  };

  if (camp.status !== 'approved') {
    return (
      <div className="p-6 bg-slate-900/50 border-t border-white/5 animate-fade-in">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><Sparkles className="text-amber-400" size={18} /> Select an Initial AI Draft</span>
          {isLoadingDrafts && <Loader2 size={16} className="animate-spin text-primary" />}
        </h4>
        
        {!isLoadingDrafts && draftsForExpanded.length === 0 && (
           <p className="text-slate-500 italic mb-6">No drafts generated yet for this campaign.</p>
        )}

        {!isLoadingDrafts && draftsForExpanded.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {draftsForExpanded.map((d, index) => (
              <div 
                key={d.id} 
                onClick={() => setSelectedDraftId(d.id)}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedDraftId === d.id ? 'border-primary bg-primary/10 shadow-lg' : 'border-white/10 bg-surface/50 hover:bg-surface'}`}
              >
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <span className={`font-semibold ${selectedDraftId === d.id ? 'text-primary' : 'text-slate-400'}`}>Draft {index + 1}</span>
                   <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedDraftId === d.id ? 'border-primary' : 'border-slate-500'}`}>
                      {selectedDraftId === d.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                   </div>
                 </div>
                 <div className="markdown-content text-sm max-h-[300px] overflow-y-auto text-slate-300">
                   <ReactMarkdown>{d.content}</ReactMarkdown>
                 </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 items-end justify-between bg-surface/40 p-6 rounded-xl border border-white/5">
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Generate Social Contexts For</h4>
            <div className="flex gap-4">
              {['LinkedIn', 'X', 'Newsletter'].map((plat) => (
                <label key={plat} className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-all ${selectedPlatforms.includes(plat) ? 'bg-primary/20 border-primary text-white' : 'bg-background border-white/10 text-slate-400 hover:text-slate-200'}`}>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={selectedPlatforms.includes(plat)}
                    onChange={(e) => {
                      setSelectedPlatforms(prev => 
                        e.target.checked ? [...prev, plat] : prev.filter(p => p !== plat)
                      );
                    }}
                  />
                  {getPlatformIcon(plat)}
                  <span className="text-sm font-medium">{plat}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleApproveArticle}
            disabled={isApproving || !selectedDraftId || selectedPlatforms.length === 0}
            className="bg-accent hover:bg-teal-400 text-slate-900 font-bold px-8 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            {isApproving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Approve Article & Scaffold Social Posts
          </button>
        </div>
      </div>
    );
  }

  // RENDER UNIFIED SOCIAL SANDBOX & CALENDAR INLINE
  return (
    <div className="p-6 md:p-8 bg-slate-900/50 border-t border-white/5 animate-fade-in flex flex-col gap-10">
      
      {/* Pending Action Grid */}
      {pendingPosts.length > 0 && (
        <div>
          <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
             <Activity className="text-amber-400" size={20} /> Action Required: Review Generated Socials
          </h4>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             {pendingPosts.map((post: any) => {
                const currentEdit = edits[post.id] || { content: post.content, status: 'now', time: '' };
                
                return (
                  <div key={post.id} className="glass-card flex flex-col p-6 border-white/10 shadow-lg relative group">
                    <div className="flex justify-between items-center mb-4">
                       <span className="font-bold flex items-center gap-2 text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                         {getPlatformIcon(post.platform)} {post.platform}
                       </span>
                    </div>
                    
                    <textarea 
                      value={currentEdit.content}
                      onChange={e => mapPostEdit(post.id, { content: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl p-4 text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner min-h-[160px] resize-y mb-4" 
                    />

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-auto justify-between border-t border-white/5 pt-4">
                       <div className="flex bg-background/50 p-1 rounded-xl w-fit border border-white/5">
                         <button
                           onClick={() => mapPostEdit(post.id, { status: 'now' })}
                           className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${currentEdit.status === 'now' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                         >
                           Publish Instantly
                         </button>
                         <button
                           onClick={() => mapPostEdit(post.id, { status: 'schedule' })}
                           className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${currentEdit.status === 'schedule' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                         >
                           <Calendar size={14} /> Schedule
                         </button>
                       </div>

                       {currentEdit.status === 'schedule' && (
                         <input 
                           type="datetime-local" 
                           value={currentEdit.time}
                           onChange={e => mapPostEdit(post.id, { time: e.target.value })}
                           className="bg-background border border-white/10 rounded-xl px-4 py-2 text-slate-300 focus:ring-1 focus:ring-primary shadow-inner text-sm w-full sm:w-auto"
                         />
                       )}
                    </div>
                  </div>
                );
             })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
               onClick={handleBatchConfirmSocial}
               disabled={isBatchSaving}
               className="bg-accent hover:bg-teal-400 text-slate-900 font-bold px-10 py-4 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent/20 text-lg transition-transform hover:scale-[1.02]"
            >
               {isBatchSaving ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />} 
               Batch Confirm & Target {pendingPosts.length} Queues
            </button>
          </div>
        </div>
      )}

      {/* Embedded Live Calendar Tracking Statuses */}
      {localCalendarPosts.length > 0 && (
         <div>
            <h4 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
               <Clock className="text-emerald-400" size={20} /> Scaffolds Tracked
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {localCalendarPosts.map((cp: any) => {
                 const isFailed = cp.publish_status === 'Failed';
                 const isRetrying = retryingPostId === cp.id;
                 const isSubmitting = submittingRetryId === cp.id;

                 return (
                   <div
                     key={cp.id}
                     className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                       isFailed
                         ? 'border-red-500/30 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.07)]'
                         : 'border-white/5 bg-background'
                     }`}
                   >
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-300 flex items-center gap-1.5 font-medium">{getPlatformIcon(cp.platform)} {cp.platform}</span>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          cp.publish_status === 'Failed' ? 'bg-red-500/10 text-red-400' :
                          cp.publish_status === 'Scheduled' ? 'bg-blue-500/10 text-blue-400' :
                          cp.publish_status === 'Pending' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                           {cp.publish_status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed w-full">"{cp.content}"</p>

                      {/* Failed post: error message */}
                      {isFailed && cp.error_log && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-1">
                          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-300 leading-relaxed">Error: {cp.error_log}</p>
                        </div>
                      )}

                      {/* Failed post: retry controls */}
                      {isFailed && (
                        <div className="flex flex-col gap-3 mt-1">
                          {isRetrying && (
                            <input
                              type="datetime-local"
                              value={retryTime}
                              min={getMinDatetime()}
                              onChange={e => setRetryTime(e.target.value)}
                              className="bg-background border border-white/10 rounded-xl px-4 py-2 text-slate-300 focus:ring-1 focus:ring-primary shadow-inner text-sm w-full"
                            />
                          )}
                          <button
                            onClick={() => {
                              if (!isRetrying) {
                                setRetryingPostId(cp.id);
                                setRetryTime('');
                              } else {
                                handleRetryPost(cp);
                              }
                            }}
                            disabled={isSubmitting}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                              isRetrying
                                ? 'bg-primary hover:bg-primary-hover text-white'
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20'
                            } disabled:opacity-50`}
                          >
                            {isSubmitting ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : isRetrying ? (
                              <Send size={14} />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            {isSubmitting ? 'Submitting...' : isRetrying ? 'Submit Retry' : 'Fix & Retry'}
                          </button>
                        </div>
                      )}
                   </div>
                 );
              })}
            </div>
         </div>
      )}
    </div>
  );
};
