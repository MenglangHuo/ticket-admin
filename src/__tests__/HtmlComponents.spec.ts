import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import HtmlDescriptionViewer from '@/components/common/HtmlDescriptionViewer.vue';
import HtmlDescriptionEditor from '@/components/common/HtmlDescriptionEditor.vue';

// Polyfill Range client rects for jsdom environment needed by CodeMirror / ProseMirror
if (typeof window !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as any;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as any;
  }
}

describe('HtmlDescriptionViewer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders empty message when no content is provided', () => {
    const wrapper = mount(HtmlDescriptionViewer, {
      props: {
        content: '',
        emptyText: 'No ticket description available.',
      },
    });

    expect(wrapper.text()).toContain('No ticket description available.');
  });

  it('renders html formatted content in rendered mode', () => {
    const htmlString = '<h3>Database Timeout</h3><p>Connection dropped after <strong>30 seconds</strong>.</p>';
    const wrapper = mount(HtmlDescriptionViewer, {
      props: {
        content: htmlString,
      },
    });

    expect(wrapper.html()).toContain('<h3>Database Timeout</h3>');
    expect(wrapper.html()).toContain('<strong>30 seconds</strong>');
    expect(wrapper.text()).toContain('HTML formatted');
  });

  it('allows switching to CodeMirror source view', async () => {
    const htmlString = '<p>Test source toggle</p>';
    const wrapper = mount(HtmlDescriptionViewer, {
      props: {
        content: htmlString,
      },
    });

    // Find the CodeMirror tab button and click it
    const buttons = wrapper.findAll('button');
    const sourceBtn = buttons.find((b) => b.text().includes('CodeMirror'));
    expect(sourceBtn).toBeDefined();

    await sourceBtn?.trigger('click');
    expect(wrapper.find('.cm-readonly-viewer').exists()).toBe(true);
  });

  it('sanitizes malicious script and onerror tags to prevent XSS', () => {
    const maliciousHtml = '<p>Normal text</p><script>alert("xss")</script><img src="x" onerror="stealCookie()">';
    const wrapper = mount(HtmlDescriptionViewer, {
      props: {
        content: maliciousHtml,
      },
    });

    expect(wrapper.html()).not.toContain('<script>');
    expect(wrapper.html()).not.toContain('alert("xss")');
    expect(wrapper.html()).not.toContain('onerror');
    expect(wrapper.html()).not.toContain('stealCookie()');
    expect(wrapper.html()).toContain('Normal text');
  });
});

describe('HtmlDescriptionEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders with visual WYSIWYG editor mode by default', () => {
    const wrapper = mount(HtmlDescriptionEditor, {
      props: {
        modelValue: '<p>Initial issue description</p>',
      },
    });

    expect(wrapper.find('.rich-tiptap-wrapper').exists()).toBe(true);
    expect(wrapper.text()).toContain('Visual');
    expect(wrapper.text()).toContain('HTML');
    expect(wrapper.text()).toContain('Rich Text Editor (formats selected text)');
  });

  it('switches between visual and HTML code modes', async () => {
    const wrapper = mount(HtmlDescriptionEditor, {
      props: {
        modelValue: '<h3>Error 500</h3><p>Server crashed.</p>',
      },
    });

    const buttons = wrapper.findAll('button');
    const htmlCodeBtn = buttons.find((b) => b.text().includes('HTML'));
    expect(htmlCodeBtn).toBeDefined();

    await htmlCodeBtn?.trigger('click');
    expect(wrapper.text()).toContain('HTML Source Code');
    expect(wrapper.find('.cm-editor-container').exists()).toBe(true);

    const visualBtn = wrapper.findAll('button').find((b) => b.text().includes('Visual'));
    expect(visualBtn).toBeDefined();
    await visualBtn?.trigger('click');
    expect(wrapper.find('.rich-tiptap-wrapper').exists()).toBe(true);
  });

  it('has formatting toolbar buttons in visual mode', () => {
    const wrapper = mount(HtmlDescriptionEditor, {
      props: {
        modelValue: '<p>Sample text</p>',
      },
    });

    const boldBtn = wrapper.findAll('button').find((b) => b.attributes('title')?.includes('Bold'));
    const italicBtn = wrapper.findAll('button').find((b) => b.attributes('title')?.includes('Italic'));
    const heading1Btn = wrapper.findAll('button').find((b) => b.attributes('title')?.includes('Heading (H1)'));

    expect(boldBtn).toBeDefined();
    expect(italicBtn).toBeDefined();
    expect(heading1Btn).toBeDefined();
  });
});
