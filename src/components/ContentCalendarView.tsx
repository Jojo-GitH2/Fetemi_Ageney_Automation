import React, { useState } from 'react';
import { useAuth, supabase } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { mockN8nService } from '../services/mockN8nService';
import { CheckCircle2, CalendarClock, AlertTriangle, Users, MessageSquare, Mail, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

export const ContentCalendarView: React.FC = () => {
  const { session } = useAuth();
  const { calendarPosts: posts, refreshData, isLoadingGlobal: isLoading } = useContent();
  const { showToast } = useToast();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (post: any) => {
    setRetryingId(post.id);
    try {
      const payload = {
        posts: [{
           post_id: post.id,
           edited_content: post.content,
           publish_status: 'Pending',
           scheduled_for: post.scheduled_for,
           platform: post.platform
        }]
      };
      await mockN8nService.confirmSocialPosts(payload, session?.access_token || '');
      await supabase.from('social_posts').update({ publish_status: 'Pending' }).eq('id', post.id);
      showToast('Post returned to Pending state for retry!', 'success');
      refreshData();
    } catch(err) {
      console.error(err);
      showToast('Failed to retry posting.', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const getPlatformIcon = (name: string) => {
    switch (name) {
      case 'LinkedIn': return <Users size={16} className="text-[#0077b5]" />;
      case 'X': return <MessageSquare size={16} className="text-slate-100" />;
      case 'Newsletter': return <Mail size={16} className="text-amber-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (post: any) => {
    const { publish_status: status, scheduled_for: date, post_url } = post;
    const isRetrying = retryingId === post.id;
    
    if (status === 'Published') {
       return (
         <div className="flex items-center gap-3">
           <span className="inline-flex gap-1.5 items-center px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
             <CheckCircle2 size={14}/> Published
           </span>
           {post_url && (
             <a href={post_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-400 transition-colors" title="View live post">
               <ExternalLink size={16} />
             </a>
           )}
         </div>
       );
    }
    if (status === 'Failed') {
       return (
         <div className="flex items-center gap-3">
           <span className="inline-flex gap-1.5 items-center px-2.5 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
             <AlertTriangle size={14}/> Failed
           </span>
           <button 
             onClick={() => handleRetry(post)}
             disabled={isRetrying}
             className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-surface hover:bg-white/5 border border-white/10 px-2 py-1.5 rounded-md transition-all disabled:opacity-50"
             title="Retry Post"
           >
             <RefreshCw size={12} className={isRetrying ? "animate-spin" : ""} />
             Retry
           </button>
         </div>
       );
    }
    if (status === 'Scheduled') {
       return <span className="inline-flex gap-1.5 items-center px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold"><CalendarClock size={14}/> {date ? new Date(date).toLocaleString() : 'Scheduled'}</span>;
    }
    return <span className="inline-flex gap-1.5 items-center px-2.5 py-1.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold">{status}</span>;
  };

  return (
    <div className="animate-fade-in w-full max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Content Calendar</h2>
          <p className="text-slate-400">Track and monitor your approved social posts across all integrations.</p>
        </div>
        {isLoading && <Loader2 size={24} className="animate-spin text-primary" />}
      </div>

      <div className="glass-card overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-surface/50 border-b border-white/5 text-slate-400 text-sm font-semibold uppercase tracking-wider">
                 <th className="px-6 py-4">Status & Time</th>
                 <th className="px-6 py-4">Target Platform</th>
                 <th className="px-6 py-4 w-1/2">Content Snippet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-background/30">
              {posts.length > 0 && !isLoading ? posts.map(post => (
                 <tr key={post.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5 align-top whitespace-nowrap">
                      {getStatusBadge(post)}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-2 text-slate-200 font-medium">
                        {getPlatformIcon(post.platform)} {post.platform}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <p className="text-slate-300 text-sm line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </td>
                 </tr>
              )) : null}
              
              {posts.length === 0 && !isLoading ? (
                 <tr>
                    <td colSpan={3} className="px-6 py-16 text-center text-slate-500">
                       No scheduled or published posts found in the archive. 
                    </td>
                 </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
