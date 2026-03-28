import React, { useState } from 'react';
import { useAuth, supabase } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { mockN8nService } from '../services/mockN8nService';
import { Send, Calendar, Users, MessageSquare, Mail, AlertCircle, Loader2 } from 'lucide-react';

export const SocialReviewView: React.FC = () => {
  const { session } = useAuth();
  const { pendingPosts, refreshData, isLoadingGlobal: isLoading } = useContent();
  const { showToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const getPlatformIcon = (name: string) => {
    switch (name) {
      case 'LinkedIn': return <Users size={20} className="text-[#0077b5]" />;
      case 'X': return <MessageSquare size={20} className="text-slate-100" />;
      case 'Newsletter': return <Mail size={20} className="text-amber-500" />;
      default: return null;
    }
  };

  const handleApprove = async (id: string, platform: string, newContent: string, isScheduled: boolean, scheduleTime: string) => {
    setLoadingId(id);
    try {
      const payload = {
        posts: [
          {
            post_id: id,
            edited_content: newContent,
            publish_status: isScheduled ? 'Scheduled' : 'Pending',
            scheduled_for: isScheduled ? new Date(scheduleTime).toISOString() : null,
            platform: platform
          }
        ]
      };

      // 1. Send the payload to the Distribution Webhook logic natively
      await mockN8nService.confirmSocialPosts(payload, session?.access_token || '');

      // 2. Synchronize active state tracking DB natively to reflect on the Calendar! 
      const { error } = await supabase
        .from('social_posts')
        .update({
          content: newContent,
          publish_status: isScheduled ? 'Scheduled' : 'Pending',
          scheduled_for: isScheduled ? new Date(scheduleTime).toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      
      setRemovedIds(prev => new Set(prev).add(id));
      showToast('Post Confirmed & Queued!', 'success');
      refreshData();
    } catch (err) {
      console.error(err);
      showToast('Failed to execute posting.', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const visiblePosts = pendingPosts.filter(p => !removedIds.has(p.id));

  if (isLoading) {
     return <div className="flex p-12 text-primary items-center justify-center"><Loader2 size={32} className="animate-spin" /></div>;
  }

  if (visiblePosts.length === 0) {
    return (
      <div className="animate-fade-in w-full max-w-5xl">
        <h2 className="text-3xl font-bold text-white mb-6">Social Review Sandbox</h2>
        <div className="glass-card p-12 text-center border-dashed border-white/20 flex flex-col items-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="text-accent" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">You're All Caught Up!</h3>
          <p className="text-slate-500 max-w-sm">There are no social posts awaiting your review. Go generate some new drafts to fill your queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full max-w-5xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          Social Review Sandbox
          <span className="bg-accent/20 text-accent text-sm font-semibold px-3 py-1 rounded-full">{visiblePosts.length} Action Needed</span>
        </h2>
        <p className="text-slate-400">Refine the AI-generated social copy, tweak emojis/hashtags, and queue them for distribution.</p>
      </div>

      <div className="space-y-8">
        {visiblePosts.map(post => (
          <ReviewCard key={post.id} post={post} icon={getPlatformIcon(post.platform)} onApprove={handleApprove} isLoading={loadingId === post.id} />
        ))}
      </div>
    </div>
  );
};

const ReviewCard = ({ post, icon, onApprove, isLoading }: any) => {
  const isNewsletter = post.platform === 'Newsletter';
  const isX = post.platform === 'X';

  const [content, setContent] = useState(() => 
    isNewsletter ? post.content.replace(/<br\s*\/?>/gi, '\n') : post.content
  );
  const [publishType, setPublishType] = useState<'now' | 'schedule'>('now');
  const [scheduleTime, setScheduleTime] = useState('');
  const [error, setError] = useState('');

  const isOverLimit = isX && content.length > 280;

  const submit = () => {
    if (!content.trim()) { setError('Post content cannot be empty.'); return; }
    if (publishType === 'schedule' && !scheduleTime) { setError('Please select a date and time.'); return; }
    if (isOverLimit) { setError('Twitter (X) posts cannot exceed 280 characters.'); return; }
    
    setError('');
    const finalContent = isNewsletter ? content.replace(/\n/g, '<br>') : content;
    onApprove(post.id, post.platform, finalContent, publishType === 'schedule', scheduleTime);
  };

  return (
    <div className="glass-card p-0 border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-xl">
      <div className="bg-surface/80 p-6 md:w-64 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between">
        <div>
           <div className="flex items-center gap-3 mb-4">
             {icon} <span className="font-semibold text-white">{post.platform}</span>
           </div>
           <p className="text-xs text-slate-500 font-mono">ID: {String(post.id).substring(0,8)}</p>
        </div>
        <div className="mt-6">
           <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
             <AlertCircle size={14} /> Pending Review
           </span>
        </div>
      </div>

      <div className="p-6 md:p-8 flex-1 flex flex-col">
        <div className="relative mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full bg-slate-900 border rounded-xl p-4 text-white focus:outline-none focus:ring-2 shadow-inner min-h-[140px] resize-y ${isOverLimit ? 'border-red-500/50 focus:ring-red-500 text-red-100' : 'border-white/10 focus:ring-primary'}`}
          />
          {isX && (
            <div className={`absolute bottom-3 right-4 text-xs font-semibold ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}>
              {content.length} / 280
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center mt-auto">
          <div className="flex bg-background/50 p-1 rounded-xl w-fit border border-white/5 shadow-inner shrink-0">
            <button
              onClick={() => setPublishType('now')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${publishType === 'now' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Publish Now
            </button>
            <button
              onClick={() => setPublishType('schedule')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${publishType === 'schedule' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Calendar size={16} /> Schedule
            </button>
          </div>

          {publishType === 'schedule' && (
            <input 
              type="datetime-local" 
              value={scheduleTime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:outline-none shadow-inner text-sm w-full xl:w-auto"
            />
          )}

          <button
            onClick={submit}
            disabled={isLoading || isOverLimit}
            className="w-full xl:w-auto shrink-0 bg-accent hover:bg-teal-400 text-slate-900 font-bold px-8 py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all ml-auto"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
            Confirm & Queue
          </button>
        </div>
      </div>
    </div>
  );
};

// SVG icon for empty states
const CheckCircle = ({className, size}: any) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
