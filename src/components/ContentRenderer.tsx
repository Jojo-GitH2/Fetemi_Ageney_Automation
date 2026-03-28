import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ContentRendererProps {
  platform: string;
  content: string;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ platform, content }) => {
  if (platform === 'Newsletter') {
    return (
      <div 
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // LinkedIn, X, or other Markdown platforms
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || ''}
      </ReactMarkdown>
    </div>
  );
};
