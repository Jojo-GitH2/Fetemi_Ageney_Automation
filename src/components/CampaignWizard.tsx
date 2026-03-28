import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { ContentRenderer } from './ContentRenderer';
import { getLocalMinTime, getUserTimezone } from '../utils/dateUtils';

export const CampaignWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [baseIdea, setBaseIdea] = useState('');
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  
  const [campaignId, setCampaignId] = useState('');
  const [generatedDrafts, setGeneratedDrafts] = useState<{draft_id: string, content: string}[]>([]);
  const [socialPosts, setSocialPosts] = useState<{ id: string, platform: string, content: string }[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn', 'X', 'Newsletter']);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const [previews, setPreviews] = useState<Record<string, boolean>>({});

  // Step 3 specific states
  const [draftEdits, setDraftEdits] = useState<Record<string, { post_id: string, content: string, status: 'now'|'schedule', time: string }>>({});

  const slideVariants = {
    enter: { x: 30, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 }
  };

  const cycleLoadingText = (texts: string[], durationMs: number) => {
    let index = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, durationMs);
    return interval;
  };

  const handleGenerateStrategy = async () => {
    const cleanInput = baseIdea.trim();
    if (!cleanInput) { toast.error('Please enter a topic or URL.'); return; }

    const isUrl = () => {
      try {
        const url = new URL(cleanInput);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (inputType === 'text' && cleanInput.length < 30) {
      toast.error('Please enter at least 30 characters for your text idea.');
      return;
    }

    if (inputType === 'text' && isUrl()) {
      toast.error('Please use the "Source URL" tab for web links.');
      return;
    }
    
    if (inputType === 'url' && !isUrl()) {
      toast.error('Please enter a valid HTTP/HTTPS URL.');
      return;
    }

    setIsLoading(true);
    const interval = cycleLoadingText(['Scraping SEO data...', 'Synthesizing knowledge...', 'Writing drafts...'], 1000);

    try {
      const payload = {
        idea: inputType === 'text' ? cleanInput : undefined,
        url: inputType === 'url' ? cleanInput : undefined
      };
      
      const res = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL || '', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
         body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API generated an error: ${res.status}`);
      const data = await res.json();
      
      if (!data.campaign_id || !data.drafts) throw new Error('Invalid JSON response format');
      
      setCampaignId(data.campaign_id);
      setGeneratedDrafts(data.drafts);
      setActiveDraftIndex(0);
      setCurrentStep(2);
    } catch (e: any) {
      toast.error('Failed to generate drafts: ' + e.message);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleSelectDraft = async (draftId: string) => {
    if (selectedPlatforms.length === 0) {
       toast.error('Please select at least one platform.');
       return;
    }
    setIsLoading(true);
    const interval = cycleLoadingText(['Restructuring into hooks...', 'Optimizing for platforms...', 'Pre-computing limits...'], 700);

    try {
      const res = await fetch(import.meta.env.VITE_N8N_APPROVAL_WEBHOOK_URL || '', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
         body: JSON.stringify({
            campaign_id: campaignId,
            approved_draft_id: draftId,
            selected_platforms: selectedPlatforms
         })
      });
      if (!res.ok) throw new Error(`API generated an error: ${res.status}`);
      
      let posts: any[] = [];
      let attempts = 0;
      setLoadingText('Waiting for n8n to sync scaffolds...');
      while (posts.length === 0 && attempts < 15) {
         await new Promise(r => setTimeout(r, 2000));
         const { data } = await supabase.from('social_posts')
            .select('id, platform, content')
            .eq('approved_draft_id', draftId)
            .eq('publish_status', 'Draft');
            
         if (data && data.length > 0) {
            posts = data;
         }
         attempts++;
      }
      
      if (posts.length === 0) throw new Error('Timeout waiting for posts to generate in Supabase.');

      setSocialPosts(posts);
      const initialEdits = posts.reduce((acc, p) => ({...acc, [p.platform]: { post_id: p.id, content: p.content, status: 'now', time: '' }}), {});
      setDraftEdits(initialEdits);
      setCurrentStep(3);
    } catch (e: any) {
      toast.error('Failed to generate social contexts: ' + e.message);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleConfirmAndQueue = async () => {
    const xEdit = draftEdits['X'];
    if (xEdit && xEdit.content.length > 280) {
      toast.error('Twitter (X) post exceeds 280 characters.');
      return;
    }
    for (const [plat, data] of Object.entries(draftEdits)) {
       if (!data.content.trim()) {
          toast.error(`${plat} content cannot be empty.`);
          return;
       }
       if (data.status === 'schedule' && !data.time) {
          toast.error(`Please select a schedule time for ${plat}.`);
          return;
       }
       if (data.status === 'schedule' && new Date(data.time) < new Date()) {
          toast.error('Cannot schedule posts in the past. Please update your times.');
          return;
       }
    }

    const payload = {
      campaign_id: campaignId,
      posts: Object.entries(draftEdits).map(([plat, data]) => ({
        post_id: data.post_id,
        edited_content: plat === 'Newsletter' ? data.content.replace(/\n/g, '<br>') : data.content,
        publish_status: data.status === 'schedule' ? 'Scheduled' : 'Pending',
        scheduled_for: data.status === 'schedule' ? new Date(data.time).toISOString() : null,
        platform: plat
      }))
    };

    try {
      const res = await fetch(import.meta.env.VITE_N8N_SOCIAL_WEBHOOK_URL || '', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
         body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      toast.success('Posts successfully queued!');
      setTimeout(() => {
        setBaseIdea(''); setGeneratedDrafts([]); setSocialPosts([]); setDraftEdits({}); setCurrentStep(1);
        onComplete();
      }, 1500);
    } catch (e: any) {
      toast.error('Failed to finalize posts: ' + e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full pt-10 px-8 relative h-full flex flex-col pb-20">
       <Toaster position="top-right" richColors />
       <div className="mb-10 text-center">
         <h2 className="text-3xl font-extrabold text-textMain tracking-tight">Campaign Builder</h2>
         <p className="text-textMuted mt-2">Generate and distribute top-tier context from simple ideas.</p>
       </div>

       {/* Stepper Logic */}
       <div className="flex items-center justify-center gap-4 mb-10 w-full">
          {[1,2,3].map(step => (
             <div key={step} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center transition-all ${currentStep === step ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30' : currentStep > step ? 'bg-emerald-500 text-white' : 'bg-surface text-textMuted border border-border'}`}>
                   {currentStep > step ? <CheckCircle2 size={16} /> : step}
                </div>
                {step < 3 && <div className={`w-12 h-0.5 rounded ${currentStep > step ? 'bg-emerald-500' : 'bg-border'}`} />}
             </div>
          ))}
       </div>

       <div className="flex-1 relative min-h-[400px]">
          <AnimatePresence mode="wait">
             {currentStep === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="glass-card p-10 flex flex-col items-center">
                   <h3 className="text-xl font-bold mb-4 w-full text-left">Content Ingestion</h3>
                   
                   <div className="flex bg-surface p-1 rounded-xl mb-6 border border-border self-start">
                     <button
                       onClick={() => setInputType('text')}
                       className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${inputType === 'text' ? 'bg-white text-textMain shadow-sm border border-border' : 'text-textMuted hover:text-textMain'}`}
                     >
                       Raw Idea Text
                     </button>
                     <button
                       onClick={() => setInputType('url')}
                       className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${inputType === 'url' ? 'bg-white text-textMain shadow-sm border border-border' : 'text-textMuted hover:text-textMain'}`}
                     >
                       Source URL
                     </button>
                   </div>

                   {inputType === 'text' ? (
                     <div className="w-full relative">
                       <textarea
                         value={baseIdea}
                         onChange={e => setBaseIdea(e.target.value)}
                         className={`w-full min-h-[160px] p-5 pb-8 rounded-xl border bg-surface text-textMain focus:ring-2 focus:outline-none resize-y shadow-inner ${baseIdea.trim().length > 0 && baseIdea.trim().length < 30 ? 'border-red-400 focus:ring-red-500 text-red-900 bg-red-50' : 'border-border focus:ring-primary-500'}`}
                         placeholder="Enter your rough thoughts, notes, or bullet points..."
                         disabled={isLoading}
                       />
                       <span className={`absolute bottom-4 right-5 text-xs font-bold ${baseIdea.trim().length < 30 ? 'text-red-500 tracking-wider' : 'text-emerald-500'}`}>
                         {baseIdea.trim().length} / 30 min
                       </span>
                     </div>
                   ) : (
                     <input
                       type="url"
                       value={baseIdea}
                       onChange={e => setBaseIdea(e.target.value)}
                       className="w-full p-5 rounded-xl border border-border bg-surface text-textMain focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-inner"
                       placeholder="https://example.com/article-to-repurpose"
                       disabled={isLoading}
                     />
                   )}

                   <div className="w-full flex justify-end mt-6 pt-6 border-t border-border">
                     <button
                       onClick={handleGenerateStrategy}
                       disabled={isLoading || !baseIdea.trim() || (inputType === 'text' && baseIdea.trim().length < 30)}
                       className="bg-textMain hover:bg-slate-800 text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center min-w-[200px] transition-all disabled:opacity-50 shadow-md"
                     >
                        {isLoading ? (
                           <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> {loadingText}</span>
                        ) : "Generate Strategy"}
                     </button>
                   </div>
                </motion.div>
             )}

             {currentStep === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                   <div className="mb-6 bg-surface border border-border rounded-xl p-5 flex items-center justify-between">
                      <h4 className="font-semibold text-textMain text-sm">Select Target Platforms</h4>
                      <div className="flex gap-3">
                         {['LinkedIn', 'X', 'Newsletter'].map(plat => (
                            <button
                               key={plat}
                               onClick={() => setSelectedPlatforms(prev => prev.includes(plat) ? prev.filter(p => p !== plat) : [...prev, plat])}
                               className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${selectedPlatforms.includes(plat) ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm' : 'bg-white text-textMuted border-border hover:border-slate-300'}`}
                            >
                               {plat}
                            </button>
                         ))}
                      </div>
                   </div>
                   <div className="flex items-center gap-4 md:gap-6 mt-4">
                      <button 
                         onClick={() => setActiveDraftIndex(prev => prev > 0 ? prev - 1 : generatedDrafts.length - 1)}
                         className="p-3 bg-white border border-border rounded-full hover:bg-surface transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
                         disabled={isLoading || generatedDrafts.length <= 1}
                      >
                         <ChevronLeft size={24} className="text-textMain" />
                      </button>
                      
                      <div className="flex-1 w-full min-w-0">
                         {generatedDrafts.length > 0 && (
                           <div className="glass-card flex flex-col h-full relative border-border shadow-lg">
                              {isLoading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center text-primary-600 font-semibold"><Loader2 size={36} className="animate-spin mb-3" />{loadingText}</div>}
                              <div className="p-4 border-b border-border bg-surface font-semibold text-textMain text-sm flex justify-between items-center">
                                 <span>Draft Option {activeDraftIndex + 1} of {generatedDrafts.length}</span>
                                 <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-md border border-primary-200">Pending Review</span>
                              </div>
                              <div className="p-8 flex-1 text-sm overflow-y-auto min-h-[400px] max-h-[550px] markdown-content bg-white">
                                 <ReactMarkdown>
                                    {generatedDrafts[activeDraftIndex]?.content || ''}
                                 </ReactMarkdown>
                              </div>
                              <div className="p-5 border-t border-border mt-auto bg-surface">
                                 <button onClick={() => handleSelectDraft(generatedDrafts[activeDraftIndex].draft_id)} disabled={isLoading} className="w-full py-4 bg-primary-600 text-white hover:bg-primary-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-500/25 active:scale-[0.98] disabled:opacity-50">
                                    Approve & Generate Socials
                                 </button>
                              </div>
                           </div>
                         )}
                      </div>

                      <button 
                         onClick={() => setActiveDraftIndex(prev => prev < generatedDrafts.length - 1 ? prev + 1 : 0)}
                         className="p-3 bg-white border border-border rounded-full hover:bg-surface transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
                         disabled={isLoading || generatedDrafts.length <= 1}
                      >
                         <ChevronRight size={24} className="text-textMain" />
                      </button>
                   </div>
                </motion.div>
             )}

             {currentStep === 3 && (
                <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="space-y-6">
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="text-xl font-bold">Social Review</h3>
                     <p className="text-textMuted text-sm">Review safety guardrails and queue items.</p>
                   </div>
                   
                   {socialPosts.map((post) => {
                      const editState = draftEdits[post.platform];
                      if (!editState) return null;
                      const isX = post.platform === 'X';
                      const isOverLimit = isX && editState.content.length > 280;
                      
                      return (
                         <div key={post.platform} className="glass-card p-6 flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-48 shrink-0 flex items-center justify-between border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 md:flex-col md:items-start gap-3">
                               <span className="font-bold text-textMain">{post.platform}</span>
                               <button 
                                 onClick={() => setPreviews(prev => ({...prev, [post.platform]: !prev[post.platform]}))}
                                 className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${previews[post.platform] ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm' : 'bg-white text-textMuted border-border hover:bg-slate-50'}`}
                               >
                                 {previews[post.platform] ? 'Edit Text' : 'Preview Format'}
                               </button>
                            </div>
                            <div className="flex-1 flex flex-col gap-4">
                               <div className="relative">
                                  {previews[post.platform] ? (
                                    <div className={`w-full min-h-[120px] p-5 rounded-xl border bg-white text-sm overflow-y-auto max-h-[400px] shadow-inner ${isOverLimit ? 'border-red-400 bg-red-50' : 'border-border'}`}>
                                      <ContentRenderer platform={post.platform} content={editState.content} />
                                    </div>
                                  ) : (
                                    <>
                                      <textarea
                                        value={editState.content}
                                        onChange={e => setDraftEdits(prev => ({...prev, [post.platform]: {...prev[post.platform], content: e.target.value}}))}
                                        className={`w-full min-h-[120px] p-4 pb-8 rounded-xl border bg-surface text-textMain focus:ring-2 resize-y shadow-inner text-sm ${isOverLimit ? 'border-red-400 focus:ring-red-500 text-red-900 bg-red-50' : 'border-border focus:ring-primary-500'}`}
                                      />
                                      {isX && (
                                         <span className={`absolute bottom-3 right-4 text-xs font-bold ${isOverLimit ? 'text-red-500 tracking-wider' : 'text-textMuted'}`}>{editState.content.length} / 280</span>
                                      )}
                                    </>
                                  )}
                               </div>
                               <div className="flex items-center gap-4 border border-border w-fit p-1 bg-surface rounded-lg">
                                  <button onClick={() => setDraftEdits(prev => ({...prev, [post.platform]: {...prev[post.platform], status: 'now'}}))} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${editState.status === 'now' ? 'bg-white shadow-sm text-textMain border border-border' : 'text-textMuted hover:text-textMain'}`}>Publish Now</button>
                                  <button onClick={() => setDraftEdits(prev => ({...prev, [post.platform]: {...prev[post.platform], status: 'schedule'}}))} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${editState.status === 'schedule' ? 'bg-white shadow-sm text-textMain border border-border' : 'text-textMuted hover:text-textMain'}`}>Schedule Later</button>
                               </div>
                               {editState.status === 'schedule' && (
                                   <div className="flex flex-col gap-1.5">
                                     <div className="bg-surface p-1 rounded-lg w-fit border border-border">
                                       <input
                                         type="datetime-local"
                                         min={getLocalMinTime()}
                                         value={editState.time}
                                         onChange={e => setDraftEdits(prev => ({...prev, [post.platform]: {...prev[post.platform], time: e.target.value}}))}
                                         className="p-2 border border-border rounded-md bg-white focus:ring-2 focus:ring-primary-500 text-sm max-w-[250px] outline-none"
                                       />
                                     </div>
                                     <span className="text-[11px] text-textMuted font-medium pl-1">Scheduling in: {getUserTimezone()}</span>
                                   </div>
                                )}
                            </div>
                         </div>
                      );
                   })}

                   <div className="sticky bottom-6 bg-white/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-2xl flex justify-end z-50 mt-10">
                     <button
                        onClick={handleConfirmAndQueue}
                        disabled={Object.values(draftEdits).some(d => draftEdits['X'] === d && d.content.length > 280)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-8 rounded-lg flex items-center justify-center min-w-[200px] transition-all disabled:opacity-50 shadow-lg shadow-primary-500/20 active:scale-95"
                     >
                        Confirm & Queue
                     </button>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};
