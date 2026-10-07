/**
 * Enterprise Frontend Security Utilities
 * Implements Google & OWASP Web Security Standards:
 * - DOM-based HTML sanitization with strict element & attribute allowlisting
 * - Protocol verification (preventing javascript: and data: pseudo-protocols)
 * - Safe HTML entity escaping
 * - Safe URL validation
 */

const ALLOWED_TAGS = new Set([
  // Typography & structural
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Formatting & inline
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'small', 'sub', 'sup', 'mark', 'span',
  // Lists
  'ul', 'ol', 'li',
  // Blocks & code
  'blockquote', 'pre', 'code',
  // Links
  'a',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
]);

const FORBIDDEN_TAGS = new Set([
  'script', 'style', 'iframe', 'frame', 'object', 'embed', 'applet',
  'meta', 'link', 'base', 'form', 'input', 'button', 'select', 'textarea',
  'svg', 'math', 'template', 'noscript', 'canvas', 'video', 'audio',
]);

const ALLOWED_ATTRIBUTES_BY_TAG: Record<string, Set<string>> = {
  '*': new Set(['class', 'title', 'id']),
  'a': new Set(['href', 'target', 'rel', 'title', 'class']),
  'th': new Set(['colspan', 'rowspan', 'scope', 'class']),
  'td': new Set(['colspan', 'rowspan', 'class']),
  'ol': new Set(['start', 'type', 'class']),
  'li': new Set(['value', 'class']),
  'code': new Set(['class']),
  'pre': new Set(['class']),
};

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Validates whether a URL is safe to navigate to or bind to an href attribute.
 * Blocks dangerous protocols like javascript:, vbscript:, and unauthorized data: URLs.
 */
export function isSafeUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Relative URLs, anchor hashes, and protocol-relative paths
  if (
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('#')
  ) {
    return true;
  }

  // Blob URLs (used for local client-side file previews)
  if (trimmed.startsWith('blob:')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location?.origin : 'http://localhost');
    return SAFE_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    // If URL parsing fails, check against scheme regex
    const schemeMatch = trimmed.match(/^([a-zA-Z0-9+.-]+):/);
    const scheme = schemeMatch?.[1];
    if (!scheme) return false;
    const protocol = scheme.toLowerCase() + ':';
    return SAFE_URL_PROTOCOLS.has(protocol);
  }
}

/**
 * Normalizes and sanitizes a URL string. Returns fallback if the URL is unsafe.
 */
export function safeUrl(url?: string | null, fallback = '#'): string {
  return isSafeUrl(url) ? (url as string).trim() : fallback;
}

/**
 * Escapes HTML characters (&, <, >, ", ') to prevent DOM XSS and formatting breakage.
 * Mandatory when interpolating user data into HTML templates or Telegram bot messages.
 */
export function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes an untrusted HTML string using browser-native DOMParser.
 * Enforces strict tag allowlists, removes dangerous attributes, and protects links against tabnabbing.
 */
export function sanitizeHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  const trimmed = dirtyHtml.trim();
  if (!trimmed) return '';

  // In non-browser environments (e.g. server-side rendering or bare tests without window)
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(trimmed);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const body = doc.body;

    function sanitizeNode(node: Node) {
      const children = Array.from(node.childNodes);

      for (const child of children) {
        if (child.nodeType === Node.COMMENT_NODE) {
          // Strip HTML comments to prevent comment-based evasion
          node.removeChild(child);
          continue;
        }

        if (child.nodeType === Node.TEXT_NODE) {
          continue;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          // 1. Immediately drop explicitly forbidden tags and all their descendants
          if (FORBIDDEN_TAGS.has(tagName) || !ALLOWED_TAGS.has(tagName)) {
            // If it's a forbidden dangerous tag, discard it entirely
            if (FORBIDDEN_TAGS.has(tagName)) {
              node.removeChild(el);
              continue;
            }
            // If it's merely an unapproved non-dangerous tag, unwrap its text/children
            while (el.firstChild) {
              node.insertBefore(el.firstChild, el);
            }
            node.removeChild(el);
            continue;
          }

          // 2. Sanitize attributes
          const allowedAttrs = new Set([
            ...(ALLOWED_ATTRIBUTES_BY_TAG['*'] || []),
            ...(ALLOWED_ATTRIBUTES_BY_TAG[tagName] || []),
          ]);

          const attrNames = Array.from(el.attributes).map((attr) => attr.name);
          for (const attrName of attrNames) {
            const lowerName = attrName.toLowerCase();

            // Strip any inline event handlers (onclick, onload, onerror, etc.)
            if (lowerName.startsWith('on') || !allowedAttrs.has(lowerName)) {
              el.removeAttribute(attrName);
              continue;
            }

            // Strip action/srcdoc or other injection points
            if (lowerName === 'srcdoc' || lowerName === 'action' || lowerName === 'formaction') {
              el.removeAttribute(attrName);
              continue;
            }

            // Validate href on anchor tags
            if (tagName === 'a' && lowerName === 'href') {
              const hrefValue = el.getAttribute(attrName);
              if (!isSafeUrl(hrefValue)) {
                el.removeAttribute(attrName);
              }
            }
          }

          // 3. For anchor tags, enforce security attributes
          if (tagName === 'a') {
            el.setAttribute('rel', 'noopener noreferrer');
            if (!el.getAttribute('target')) {
              el.setAttribute('target', '_blank');
            }
          }

          // 4. Recursively sanitize child elements
          sanitizeNode(el);
        }
      }
    }

    sanitizeNode(body);
    return body.innerHTML;
  } catch (err) {
    console.error('HTML Sanitization error, falling back to escaped string:', err);
    return escapeHtml(trimmed);
  }
}
