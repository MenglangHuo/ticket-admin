import { describe, it, expect } from 'vitest';
import { formatHtmlPreview } from '@/utils/html';

describe('formatHtmlPreview', () => {
  it('returns empty string for null, undefined, or empty values', () => {
    expect(formatHtmlPreview(null)).toBe('');
    expect(formatHtmlPreview(undefined)).toBe('');
    expect(formatHtmlPreview('')).toBe('');
    expect(formatHtmlPreview('   ')).toBe('');
  });

  it('preserves plain text without HTML', () => {
    expect(formatHtmlPreview('Server error 500 occurred.')).toBe('Server error 500 occurred.');
  });

  it('strips HTML tags and preserves spacing between block elements', () => {
    const html = '<p><strong>Check and Fix on Order Issue #ORD-20240001</strong></p><ol><li><p>Order process but not Payment</p></li><li><p>Not alert to telegram</p></li></ol>';
    const result = formatHtmlPreview(html);

    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
    expect(result).not.toContain('<ol>');
    expect(result).not.toContain('<li>');
    expect(result).toContain('Check and Fix on Order Issue #ORD-20240001');
    expect(result).toContain('Order process but not Payment');
    expect(result).toContain('Not alert to telegram');
  });

  it('decodes HTML entities properly', () => {
    const html = '<p>User &amp; Admin &lt;Support&gt; &quot;Urgent&quot;&#39;s issue</p>';
    const result = formatHtmlPreview(html);
    expect(result).toBe('User & Admin <Support> "Urgent"\'s issue');
  });

  it('truncates content when exceeding maxLength with ellipsis', () => {
    const longHtml = '<p>' + 'A'.repeat(200) + '</p>';
    const result = formatHtmlPreview(longHtml, 50);

    expect(result.length).toBe(53); // 50 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });
});
