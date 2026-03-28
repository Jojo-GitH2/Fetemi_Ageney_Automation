import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase, useAuth } from './AuthContext';

interface ContentState {
  campaigns: any[];
  pendingPosts: any[];
  calendarPosts: any[];
  refreshData: () => Promise<void>;
  isLoadingGlobal: boolean;
}

const ContentContext = createContext<ContentState | undefined>(undefined);

const getCampaignName = (camp: any) => {
  if (camp.title && camp.title !== 'Untitled Campaign') return camp.title;
  if (camp.article_drafts && camp.article_drafts.length > 0) {
    const content = camp.article_drafts[0].content || '';
    const match = content.match(/^#+\s+(.*)$/m);
    if (match && match[1].trim() !== '') return match[1].trim();

    const lines = content.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    if (lines.length > 0) {
      let firstLine = lines[0].replace(/^#+\s*/, '').replace(/[*_~`]/g, ''); 
      if (firstLine.length > 50) firstLine = firstLine.substring(0, 48) + '...';
      return firstLine;
    }
  }
  return `Campaign ${String(camp.id).substring(0, 8)}`;
};

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [calendarPosts, setCalendarPosts] = useState<any[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);

  const refreshData = async () => {
    if (!session?.user?.id) return;
    setIsLoadingGlobal(true);
    try {
      // 1. Fetch Campaigns limit 30
      const { data: campData } = await supabase
        .from('campaigns')
        .select('*, article_drafts(content)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30);
        
      if (campData) {
        setCampaigns(campData.map(c => ({ ...c, displayTitle: getCampaignName(c) })));
      }

      // 2. Fetch Sandbox Posts
      const { data: pendingData } = await supabase
        .from('social_posts')
        .select('*')
        .in('publish_status', ['Draft', 'Pending'])
        .order('created_at', { ascending: false });
        
      if (pendingData) setPendingPosts(pendingData);

      // 3. Fetch Scheduled/Published Posts
      const { data: calData } = await supabase
        .from('social_posts')
        .select('*')
        .in('publish_status', ['Scheduled', 'Published', 'Failed'])
        .order('scheduled_for', { ascending: false });
        
      if (calData) setCalendarPosts(calData);

    } catch (error) {
      console.error('Context Sync Error:', error);
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [session]);

  return (
    <ContentContext.Provider value={{ campaigns, pendingPosts, calendarPosts, refreshData, isLoadingGlobal }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};
