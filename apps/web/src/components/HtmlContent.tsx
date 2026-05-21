import DOMPurifyPkg from 'dompurify';

const DOMPurify = (DOMPurifyPkg as any).default || DOMPurifyPkg;

interface HtmlContentProps {
  html: string;
  className?: string;
}

export function HtmlContent({ html, className = '' }: HtmlContentProps) {
  const safeHtml = typeof html === 'string' ? html : '';
  const isPlain = !/<[a-z][\s\S]*>/i.test(safeHtml);

  if (isPlain) {
    return (
      <div className={`whitespace-pre-wrap text-coc-parchment leading-relaxed ${className}`}>
        {safeHtml}
      </div>
    );
  }

  let clean = safeHtml;
  try {
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      clean = DOMPurify.sanitize(safeHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 's', 'del', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
          'blockquote', 'pre', 'code', 'a', 'hr', 'img', 'div', 'span',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
      });
    }
  } catch (e) {
    console.error('DOMPurify sanitize failed:', e);
  }

  return (
    <div
      className={`
        prose prose-invert max-w-none
        prose-p:text-coc-parchment prose-p:leading-relaxed
        prose-headings:text-coc-parchment prose-headings:font-ritual prose-headings:mt-4 prose-headings:mb-2
        prose-a:text-coc-accent-gold hover:prose-a:text-coc-gold.glow prose-a:no-underline hover:prose-a:underline
        prose-strong:text-coc-parchment
        prose-code:text-coc-parchment prose-code:bg-coc-bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-coc-bg-secondary prose-pre:border prose-pre:border-coc-border prose-pre:rounded-lg
        prose-blockquote:border-l-4 prose-blockquote:border-coc-accent-gold prose-blockquote:bg-coc-bg-secondary/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r
        prose-ul:list-disc prose-ol:list-decimal
        prose-hr:border-coc-border
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
