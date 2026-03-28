import React, { useEffect, useState } from 'react';
import { Target, Layers, LayoutList, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase, useAuth } from '../context/AuthContext';
import { Toaster, toast } from 'sonner';

export const DashboardOverview: React.FC = () => {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState({ total: 0, queue: 0, published: 0, failed: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const [
        { count: totalCount },
        { count: queueCount },
        { count: pubCount },
        { count: failCount }
      ] = await Promise.all([
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', session!.user.id),
        supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('publish_status', 'Scheduled'),
        supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('publish_status', 'Published'),
        supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('publish_status', 'Failed')
      ]);

      setMetrics({
        total: totalCount || 0,
        queue: queueCount || 0,
        published: pubCount || 0,
        failed: failCount || 0
      });

      const { data } = await supabase
        .from('campaigns')
        .select('id, base_idea, status, created_at')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setRecentCampaigns(data);
    } catch (error) {
       toast.error('Failed to sync dashboard metrics from Supabase.');
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto animate-fade-in p-8">
      <Toaster position="top-right" richColors />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Dashboard Overview</h2>
          <p className="text-textMuted mt-1">Monitor your workspace activity and campaign health.</p>
        </div>
        {loading && <Loader2 size={24} className="animate-spin text-slate-400" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2 text-textMuted font-medium text-sm"><Target size={18} /> Total Campaigns</div>
          <p className="text-3xl font-bold text-textMain">{metrics.total}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2 text-amber-500 font-medium text-sm"><Layers size={18} /> Posts in Queue</div>
          <p className="text-3xl font-bold text-textMain">{metrics.queue}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2 text-emerald-500 font-medium text-sm"><CheckCircle2 size={18} /> Published</div>
          <p className="text-3xl font-bold text-textMain">{metrics.published}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2 text-red-500 font-medium text-sm"><AlertCircle size={18} /> Failed Posts</div>
          <p className="text-3xl font-bold text-textMain">{metrics.failed}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-textMain tracking-tight mb-4 flex items-center gap-2"><LayoutList size={18} /> Recent Activity</h3>
        <div className="glass-card overflow-hidden border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface border-b border-border text-textMuted text-xs uppercase tracking-wider font-semibold">
                <th className="px-5 py-4 w-1/2">Campaign Context</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentCampaigns.length === 0 && !loading && (
                 <tr>
                   <td colSpan={3} className="px-5 py-8 text-center text-textMuted text-sm">No campaigns generated yet.</td>
                 </tr>
              )}
              {recentCampaigns.map((row) => (
                <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-textMain text-sm truncate max-w-sm">{row.base_idea || `Campaign ${row.id.substring(0,8)}`}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${row.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : row.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                      {row.status || 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-textMuted text-right">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
