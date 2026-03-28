export interface Draft {
  draft_id: string;
  content: string;
}

export interface GenerateDraftsResponse {
  campaign_id: string;
  drafts: Draft[];
}

export interface N8nWebhookResponse {
  status: 'success' | 'error';
  message?: string;
}

export const mockN8nService = {
  /**
   * Sends the raw content or URL to n8n for draft generation securely.
   */
  async generateDrafts(data: { content?: string; url?: string }, token: string): Promise<GenerateDraftsResponse> {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

    if (!webhookUrl || webhookUrl.includes('YOUR_N8N_WEBHOOK_URL')) {
      console.warn('⚠️ VITE_N8N_WEBHOOK_URL is missing or using placeholder. Running mock draft generation.');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            campaign_id: "mock-campaign-uuid-1234",
            drafts: [
              { draft_id: "mock-draft-1", content: `# Draft 1\n\nContent for ${data.url || data.content}` },
              { draft_id: "mock-draft-2", content: `# Draft 2\n\nAlternative angle for ${data.url || data.content}` },
              { draft_id: "mock-draft-3", content: `# Draft 3\n\nShort version for ${data.url || data.content}` }
            ]
          });
        }, 2000);
      });
    }

    const response = await fetch(`${webhookUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Unauthorized or failed request');
    }
    
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (!json.campaign_id || !Array.isArray(json.drafts)) {
        throw new Error('The webhook returned JSON, but it is missing the expected "campaign_id" or "drafts" array structure.');
      }
      return json;
    } catch (e: any) {
      if (e.message.includes('missing the expected')) throw e;
      throw new Error(`n8n webhook returned an invalid JSON Response. Make sure your workflow isn't crashing or returning empty strings. Raw response: "${text}"`);
    }
  },

  /**
   * Publishes or schedules the selected draft via n8n securely.
   */
  async distributeDraft(data: { 
    campaign_id: string; 
    approved_draft_id: string; 
    selected_platforms: string[]; 
    schedule_time: string | null;
  }, token: string): Promise<N8nWebhookResponse> {
    const approvalUrl = import.meta.env.VITE_N8N_APPROVAL_WEBHOOK_URL || '';

    if (!approvalUrl || approvalUrl.includes('YOUR_N8N')) {
      console.warn('⚠️ VITE_N8N_APPROVAL_WEBHOOK_URL is missing or using placeholder. Running mock distribution.');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 'success',
            message: data.schedule_time 
              ? `Mock Scheduled for ${new Date(data.schedule_time).toLocaleString()}`
              : 'Mock Published immediately!'
          });
        }, 1500);
      });
    }

    const response = await fetch(`${approvalUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Unauthorized or failed request');
    }
    
    try {
      return await response.json();
    } catch {
      return { status: 'success', message: 'Workflow completed successfully.' };
    }
  },

  /**
   * Finalizes human-edited social posts securely back to n8n.
   */
  async confirmSocialPosts(data: { posts: any[] }, token: string): Promise<N8nWebhookResponse> {
    const socialUrl = import.meta.env.VITE_N8N_SOCIAL_WEBHOOK_URL || '';

    if (!socialUrl) {
      console.warn('⚠️ VITE_N8N_SOCIAL_WEBHOOK_URL is missing. Add it to .env.local to execute live webhooks.');
      return new Promise((resolve) => {
        setTimeout(() => resolve({ status: 'success' }), 1000);
      });
    }

    const response = await fetch(`${socialUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Unauthorized or failed social confirmation request');
    }

    try {
       const text = await response.text();
       if (!text) return { status: 'success' };
       return JSON.parse(text);
    } catch {
       return { status: 'success' };
    }
  },

  /**
   * Retries a single failed social post with a new scheduled time via the same Phase 3B webhook.
   */
  async retrySinglePost(data: {
    campaign_id: string;
    posts: [{
      post_id: string;
      edited_content: string;
      publish_status: string;
      scheduled_for: string;
      platform: string;
    }]
  }, token: string): Promise<N8nWebhookResponse> {
    const socialUrl = import.meta.env.VITE_N8N_SOCIAL_WEBHOOK_URL || '';

    if (!socialUrl) {
      console.warn('⚠️ VITE_N8N_SOCIAL_WEBHOOK_URL is missing. Simulating retry.');
      return new Promise((resolve) => {
        setTimeout(() => resolve({ status: 'success', message: 'Mock retry accepted.' }), 800);
      });
    }

    const response = await fetch(`${socialUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Retry request failed or unauthorized');
    }

    try {
      const text = await response.text();
      if (!text) return { status: 'success' };
      return JSON.parse(text);
    } catch {
      return { status: 'success' };
    }
  }
};
