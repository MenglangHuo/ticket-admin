import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeHtml, isSafeUrl, safeUrl } from '@/utils/security';

describe('Frontend Security Suite', () => {
  describe('sanitizeHtml', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml('   ')).toBe('');
    });

    it('strips <script> tags and malicious inline scripts', () => {
      const malicious = '<p>Normal text</p><script>alert("xss")</script>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("xss")');
      expect(sanitized).toContain('<p>Normal text</p>');
    });

    it('strips dangerous event handlers (onerror, onload, onclick, onmouseover)', () => {
      const malicious = '<img src="invalid.png" onerror="alert(document.cookie)"><b onmouseover="steal()">Bold</b>';
      const sanitized = sanitizeHtml(malicious);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onmouseover');
      expect(sanitized).not.toContain('document.cookie');
      expect(sanitized).not.toContain('steal()');
      expect(sanitized).toContain('Bold');
    });

    it('strips <iframe>, <object>, <embed>, <frame>, and <form> tags', () => {
      const payload = '<div><iframe src="https://evil.com"></iframe><embed src="malware.swf"><form action="/steal"><input></form></div>';
      const sanitized = sanitizeHtml(payload);
      expect(sanitized).not.toContain('iframe');
      expect(sanitized).not.toContain('evil.com');
      expect(sanitized).not.toContain('embed');
      expect(sanitized).not.toContain('form');
      expect(sanitized).not.toContain('input');
    });

    it('removes javascript: and data: pseudo-protocols from links', () => {
      const payload = '<a href="javascript:alert(1)">Click me</a> and <a href="data:text/html,<script>alert(2)</script>">Data</a>';
      const sanitized = sanitizeHtml(payload);
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:text/html');
      expect(sanitized).toContain('Click me');
    });

    it('enforces rel="noopener noreferrer" and target="_blank" on links', () => {
      const link = '<a href="https://example.com/ticket">External Portal</a>';
      const sanitized = sanitizeHtml(link);
      expect(sanitized).toContain('rel="noopener noreferrer"');
      expect(sanitized).toContain('target="_blank"');
      expect(sanitized).toContain('href="https://example.com/ticket"');
    });

    it('preserves approved rich-text formatting tags and tables', () => {
      const richContent = '<h1>Title</h1><p>Description with <strong>bold</strong>, <em>italic</em>, and <code>code snippet</code>.</p><ul><li>Item 1</li></ul><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
      const sanitized = sanitizeHtml(richContent);
      expect(sanitized).toContain('<h1>Title</h1>');
      expect(sanitized).toContain('<strong>bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
      expect(sanitized).toContain('<code>code snippet</code>');
      expect(sanitized).toContain('<ul><li>Item 1</li></ul>');
      expect(sanitized).toContain('<table>');
      expect(sanitized).toContain('<th>Header</th>');
      expect(sanitized).toContain('<td>Data</td>');
    });
  });

  describe('escapeHtml', () => {
    it('escapes special characters properly', () => {
      const raw = '<script>alert("admin & user\'s data")</script>';
      const escaped = escapeHtml(raw);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;admin &amp; user&#39;s data&quot;)&lt;/script&gt;');
    });

    it('returns empty string for null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('isSafeUrl & safeUrl', () => {
    it('validates safe web URLs, mailto, and tel', () => {
      expect(isSafeUrl('https://example.com/api')).toBe(true);
      expect(isSafeUrl('http://localhost:8000/tickets')).toBe(true);
      expect(isSafeUrl('mailto:support@bronx.internal')).toBe(true);
      expect(isSafeUrl('tel:+1234567890')).toBe(true);
      expect(isSafeUrl('/client-ticket')).toBe(true);
      expect(isSafeUrl('./relative/path')).toBe(true);
      expect(isSafeUrl('#section')).toBe(true);
      expect(isSafeUrl('blob:http://localhost:5173/uuid-123')).toBe(true);
    });

    it('identifies and blocks dangerous URL protocols', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('javascript:void(0)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
    });

    it('safeUrl returns valid URL or fallback', () => {
      expect(safeUrl('https://valid.com', '#')).toBe('https://valid.com');
      expect(safeUrl('javascript:alert(1)', '#')).toBe('#');
      expect(safeUrl(null, '#')).toBe('#');
    });
  });
});
