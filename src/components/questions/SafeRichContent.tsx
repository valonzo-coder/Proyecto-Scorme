import React, { useEffect, useRef } from 'react';
import { MediaService } from '../../services/mediaService';
import { MathService } from '../../services/mathService';
import { sanitizeMoodleHtml } from '../../services/moodleXmlService';

interface SafeRichContentProps {
  html?: string;
  fallbackText?: string;
  className?: string;
}

export const SafeRichContent: React.FC<SafeRichContentProps> = ({
  html,
  fallbackText = '',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const safeHtml = html
    ? MediaService.hydrateRichHtmlForDisplay(sanitizeMoodleHtml(html))
    : '';

  useEffect(() => {
    if (containerRef.current && safeHtml) {
      MathService.renderMathInElement(containerRef.current);
    }
  }, [safeHtml]);

  if (!safeHtml) {
    return <span className={className}>{fallbackText}</span>;
  }

  return (
    <div
      ref={containerRef}
      className={`rich-content-prose [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 [&_th]:bg-slate-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};
