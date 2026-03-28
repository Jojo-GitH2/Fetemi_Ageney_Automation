import React, { useState, useEffect } from 'react';
import { supabase, useAuth } from '../context/AuthContext';
import { formatScheduledDate } from '../utils/dateUtils';
import { 
  FolderOpen, Filter, CalendarDays, SortDesc, SortAsc, 
  LayoutList, CheckCircle2, Clock, LayoutGrid, Rocket, PlusCircle, PenTool, RefreshCw, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ContentRenderer } from './ContentRenderer';
import { mockN8nService } from '../services/mockN8nService';
import { toast } from 'sonner';

export const CampaignExplorer: React.FC<{ onNavigateWizard: () => void }> = ({ onNavigateWizard }) => {
  const { session } = useAuth();
  
  // Master View States
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest'|'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [failedCampaignIds, setFailedCampaignIds] = useState<Set<string>>(new Set());
  
  // Detail View States
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, sortOrder, currentPage, session?.user?.id]);

  useEffect(() => {
    if (selectedCampaignId) fetchDetails(selectedCampaignId);
  }, [selectedCampaignId]);

  const handleRetry = async (postToRetry: any) => {
    toast.info(`Retrying post for ${postToRetry.platform}...`);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Authentication token not found.");
  
      await mockN8nService.retrySinglePost({
        campaign_id: postToRetry.campaign_id,
        posts: [{
          post_id: postToRetry.id,
          edited_content: postToRetry.content,
          publish_status: 'Scheduled', // Send as scheduled
          scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Reschedule for 5 mins from now
          platform: postToRetry.platform,
        }]
      }, token);
  
      await supabase.from('social_posts').update({ 
        publish_status: 'Scheduled',
        scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }).eq('id', postToRetry.id);

      toast.success("Post has been re-queued successfully! Refreshing...");
      fetchDetails(postToRetry.campaign_id);

    } catch (error) {
      console.error('Retry failed:', error);
      if (error instanceof Error) {
        toast.error(`Failed to retry post: ${error.message}`);
      } else {
        toast.error('Failed to retry post. See console for details.');
      }
    }
  };

  const fetchCampaigns = async () => {
    if (!session?.user?.id) return;
    setLoadingMaster(true);
    let query = supabase.from('campaigns').select('id, base_idea, status, created_at', { count: 'exact' }).eq('user_id', session.user.id);
    
    if (statusFilter !== 'All') {
       query = query.eq('status', statusFilter);
    }
    
    query = query.order('created_at', { ascending: sortOrder === 'oldest' });
    
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    query = query.range(from, to);
    
    const { data: campaignsData, count } = await query;

    if (campaignsData) {
      setCampaigns(campaignsData);
      
      const campaignIds = campaignsData.map(c => c.id);
      if (campaignIds.length > 0) {
        const { data: failedPosts } = await supabase
          .from('social_posts')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
          .eq('publish_status', 'Failed');
          
        if (failedPosts) {
          setFailedCampaignIds(new Set(failedPosts.map(p => p.campaign_id)));
        }
      }
    }
    
    if (count !== null) setTotalCount(count);
    
    if (campaignsData && campaignsData.length > 0 && !selectedCampaignId) {
       setSelectedCampaignId(campaignsData[0].id);
    }
    setLoadingMaster(false);
  };

  const fetchDetails = async (campId: string) => {
    setLoadingDetail(true);
    const [draftsRes, postsRes] = await Promise.all([
       supabase.from('article_drafts').select('*').eq('campaign_id', campId),
       supabase.from('social_posts').select('*').eq('campaign_id', campId)
    ]);
    if (draftsRes.data) setDrafts(draftsRes.data);
    if (postsRes.data) setPosts(postsRes.data);
    setLoadingDetail(false);
  };

  const approvedDraftId = posts.find(p => p.approved_draft_id)?.approved_draft_id;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusColor = (status: string) => {
    const s = status?.trim();
    if (s === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'In Progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'Pending Approval') return 'bg-amber-50 text-amber-700 border-amber-200';
    // Fallbacks for social_posts pills
    if (s === 'Published' || s === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'Failed') return 'bg-red-50 text-red-700 border-red-200';
    if (s === 'Scheduled') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (!loadingMaster && campaigns.length === 0 && statusFilter === 'All') {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full text-center glass-card p-12">
           <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6 outline outline-8 outline-primary-50/50">
             <Rocket size={32} className="text-primary-600" />
           </div>
           <h2 className="text-2xl font-bold text-textMain tracking-tight mb-2">No Campaigns Yet</h2>
           <p className="text-textMuted mb-8 text-sm leading-relaxed">Your workspace is empty. Start a new campaign to scrape URLs, generate SEO content, and fill your social queue.</p>
           <button 
             onClick={onNavigateWizard}
             className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
           >
             <PlusCircle size={18} />
             Create Your First Campaign
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden relative w-full pt-4">
      
      {/* MASTER COL (Left) */}
      <div className="w-[360px] flex flex-col shrink-0 h-full border-r border-border bg-surface shadow-sm z-10">
        <div className="p-5 border-b border-border">
          <h2 className="text-xl font-bold text-textMain tracking-tight mb-4 flex items-center gap-2">
             <LayoutList size={20} className="text-primary-600" />
             Campaigns
          </h2>
          
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <div className="relative flex-1">
                   <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <select 
                     value={statusFilter} 
                     onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                     className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-lg text-textMain focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                   >
                     <option value="All">All Statuses</option>
                     <option value="Pending Approval">Pending Approval</option>
                     <option value="In Progress">In Progress</option>
                     <option value="Completed">Completed</option>
                   </select>
                </div>
                <button 
                  onClick={() => { setSortOrder(s => s === 'newest' ? 'oldest' : 'newest'); setCurrentPage(1); }}
                  className="p-2 border border-border bg-white rounded-lg hover:bg-slate-50 transition-colors"
                  title="Toggle Sort Order"
                >
                  {sortOrder === 'newest' ? <SortDesc size={18} className="text-textMuted" /> : <SortAsc size={18} className="text-textMuted" />}
                </button>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingMaster ? (
             <div className="p-5 space-y-4">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-24 w-full" />
               ))}
             </div>
          ) : campaigns.length === 0 ? (
             <div className="p-8 text-center text-textMuted text-sm">
               No campaigns match your filters.
             </div>
          ) : (
             <div className="divide-y divide-border">
                {campaigns.map(camp => {
                   const hasFailedPosts = failedCampaignIds.has(camp.id);
                   return (
                     <button 
                        key={camp.id}
                        onClick={() => setSelectedCampaignId(camp.id)}
                        className={`w-full text-left p-5 transition-all outline-none ${selectedCampaignId === camp.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                     >
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(camp.status)}`}>
                                 {camp.status || 'Draft'}
                              </span>
                              {hasFailedPosts && (
                                <span title="Contains failed posts" className="ml-2 flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                   <AlertCircle size={10} />
                                </span>
                              )}
                           </div>
                           <span className="text-xs text-textMuted flex items-center gap-1">
                              <CalendarDays size={12} />
                              {new Date(camp.created_at).toLocaleDateString()}
                           </span>
                        </div>
                        <p className="font-semibold text-textMain text-sm line-clamp-2 leading-relaxed">
                           {camp.base_idea || `Campaign ${camp.id.substring(0,8)}`}
                        </p>
                     </button>
                   );
                })}
             </div>
          )}
        </div>

        {totalPages > 1 && (
           <div className="p-4 border-t border-border flex items-center justify-between bg-surface">
              <button 
                 disabled={currentPage === 1 || loadingMaster}
                 onClick={() => setCurrentPage(p => p - 1)}
                 className="px-3 py-1.5 text-sm font-semibold border border-border rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                 Prev
              </button>
              <span className="text-xs font-bold text-textMuted">Page {currentPage} of {totalPages}</span>
              <button 
                 disabled={currentPage === totalPages || loadingMaster}
                 onClick={() => setCurrentPage(p => p + 1)}
                 className="px-3 py-1.5 text-sm font-semibold border border-border rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                 Next
              </button>
           </div>
        )}
      </div>

      {/* DETAIL COL (Right) */}
      <div className="flex-1 h-full overflow-y-auto bg-slate-50 px-8 py-8">
         {!selectedCampaignId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <FolderOpen size={48} className="mb-4 opacity-50" />
               <p className="font-medium">Select a campaign to view genealogy.</p>
            </div>
         ) : loadingDetail ? (
            <div className="animate-pulse space-y-8">
               <div className="h-40 bg-slate-200 rounded-xl w-full" />
               <div className="grid grid-cols-3 gap-6">
                  <div className="h-64 bg-slate-200 rounded-xl" />
                  <div className="h-64 bg-slate-200 rounded-xl" />
                  <div className="h-64 bg-slate-200 rounded-xl" />
               </div>
            </div>
         ) : (
            <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
               
               {/* Detail Header */}
               <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                 <h2 className="text-sm font-bold text-primary-600 uppercase tracking-wider mb-2 flex items-center gap-2"><LayoutGrid size={16} /> Campaign Genealogy</h2>
                 <p className="text-xl font-bold text-textMain leading-relaxed">
                   {campaigns.find(c => c.id === selectedCampaignId)?.base_idea || selectedCampaignId}
                 </p>
               </div>

               {/* Drafts Section */}
               <div className="space-y-4">
                  <h3 className="text-lg font-bold text-textMain flex items-center gap-2">
                    <PenTool size={18} /> Generated Drafts
                  </h3>
                  {drafts.length === 0 ? (
                     <p className="text-sm text-textMuted bg-white p-6 rounded-xl border border-border">No drafts generated for this campaign.</p>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {drafts.map((draft, idx) => {
                           const isApproved = draft.id === approvedDraftId || draft.draft_id === approvedDraftId;
                           return (
                              <div key={draft.id || idx} className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden flex flex-col h-[400px] ${isApproved ? 'border-emerald-500 shadow-emerald-500/10' : 'border-border'}`}>
                                 <div className={`p-4 font-semibold text-sm flex justify-between items-center border-b ${isApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-textMain border-border'}`}>
                                    <span>Draft {idx + 1}</span>
                                    {isApproved && <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Approved</span>}
                                 </div>
                                 <div className="p-6 flex-1 overflow-y-auto text-sm markdown-content">
                                    <ReactMarkdown>{draft.content}</ReactMarkdown>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>

               {/* Social Posts Section */}
               <div className="space-y-4">
                  <h3 className="text-lg font-bold text-textMain flex items-center gap-2">
                    <CheckCircle2 size={18} /> Social Distribution
                  </h3>
                  {posts.length === 0 ? (
                     <p className="text-sm text-textMuted bg-white p-6 rounded-xl border border-border">No social posts queued for this campaign.</p>
                  ) : (
                     <div className="space-y-4">
                        {posts.map(post => (
                           <div key={post.id} className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-6">
                              <div className="w-full md:w-48 shrink-0 flex flex-col gap-3 md:border-r border-border md:pr-6">
                                 <span className="font-bold text-slate-800 text-sm">{post.platform}</span>
                                 <span className={`w-fit inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getStatusColor(post.publish_status)}`}>
                                    {post.publish_status}
                                 </span>
                                 {post.scheduled_for && (
                                    <span className="text-xs text-textMuted flex items-center gap-1 font-medium mt-1">
                                       <Clock size={12} />
                                       {formatScheduledDate(post.scheduled_for)}
                                    </span>
                                 )}
                                 {post.publish_status === 'Failed' && (
                                    <button
                                      onClick={() => handleRetry(post)}
                                      className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md py-1.5 px-2 transition-all"
                                    >
                                      <RefreshCw size={12} />
                                      Retry Post
                                    </button>
                                  )}
                              </div>
                              <div className="flex-1 text-sm bg-white p-6 rounded-lg border border-slate-100 shadow-inner overflow-y-auto max-h-[350px]">
                                 <ContentRenderer platform={post.platform} content={post.content} />
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

            </div>
         )}
      </div>
    </div>
  );
};
