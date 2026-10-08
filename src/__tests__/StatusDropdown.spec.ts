import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import StatusDropdown from '@/components/tickets/StatusDropdown.vue';

describe('StatusDropdown Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders current status label correctly', () => {
    const wrapper = mount(StatusDropdown, {
      props: {
        modelValue: 'open',
      },
    });

    expect(wrapper.text()).toContain('Open');
  });

  it('toggles dropdown menu open and teleports to body with high z-index', async () => {
    const wrapper = mount(StatusDropdown, {
      props: {
        modelValue: 'open',
      },
    });

    // Initially menu is closed
    expect(document.body.querySelector('.z-\\[9999\\]')).toBeNull();

    // Click trigger button
    await wrapper.find('button').trigger('click');

    // Menu is opened in body
    const menu = document.body.querySelector('.z-\\[9999\\]');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('Change Status');
    expect(menu?.textContent).toContain('In Progress');
  });

  it('emits update:modelValue and change when an allowed status is selected', async () => {
    const wrapper = mount(StatusDropdown, {
      props: {
        modelValue: 'open',
        showTransitionCheck: false,
      },
      attachTo: document.body,
    });

    await wrapper.find('button').trigger('click');

    const menu = document.body.querySelector('.z-\\[9999\\]');
    expect(menu).not.toBeNull();

    const options = Array.from(menu?.querySelectorAll('div') || []).filter(
      (el) => el.textContent?.trim().startsWith('In Progress')
    );
    expect(options.length).toBeGreaterThan(0);

    (options[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['in_progress']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['in_progress']);

    wrapper.unmount();
  });

  it('closes dropdown when Escape key is pressed', async () => {
    const wrapper = mount(StatusDropdown, {
      props: {
        modelValue: 'open',
      },
      attachTo: document.body,
    });

    await wrapper.find('button').trigger('click');
    expect(document.body.querySelector('.z-\\[9999\\]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();

    expect(document.body.querySelector('.z-\\[9999\\]')).toBeNull();
    wrapper.unmount();
  });

  it('respects disabled prop', async () => {
    const wrapper = mount(StatusDropdown, {
      props: {
        modelValue: 'open',
        disabled: true,
      },
    });

    await wrapper.find('button').trigger('click');
    expect(document.body.querySelector('.z-\\[9999\\]')).toBeNull();
  });

  it('allows open -> resolved and resolved -> in_progress transitions', async () => {
    // 1. open -> resolved
    const wrapperOpen = mount(StatusDropdown, {
      props: {
        modelValue: 'open',
        showTransitionCheck: true,
      },
      attachTo: document.body,
    });

    await wrapperOpen.find('button').trigger('click');
    const menuOpen = document.body.querySelector('.z-\\[9999\\]');
    const resolvedOption = Array.from(menuOpen?.querySelectorAll('div') || []).find(
      (el) => el.textContent?.trim().startsWith('Resolved')
    );
    expect(resolvedOption?.classList.contains('cursor-not-allowed')).toBe(false);
    (resolvedOption as HTMLElement).click();
    await wrapperOpen.vm.$nextTick();

    expect(wrapperOpen.emitted('update:modelValue')?.[0]).toEqual(['resolved']);
    wrapperOpen.unmount();

    // 2. resolved -> in_progress
    const wrapperResolved = mount(StatusDropdown, {
      props: {
        modelValue: 'resolved',
        showTransitionCheck: true,
      },
      attachTo: document.body,
    });

    await wrapperResolved.find('button').trigger('click');
    const menuResolved = document.body.querySelector('.z-\\[9999\\]');
    const inProgressOption = Array.from(menuResolved?.querySelectorAll('div') || []).find(
      (el) => el.textContent?.trim().startsWith('In Progress')
    );
    expect(inProgressOption?.classList.contains('cursor-not-allowed')).toBe(false);
    (inProgressOption as HTMLElement).click();
    await wrapperResolved.vm.$nextTick();

    expect(wrapperResolved.emitted('update:modelValue')?.[0]).toEqual(['in_progress']);
    wrapperResolved.unmount();
  });

  it('disallows closed -> in_progress and closed -> resolved transitions', async () => {
    const wrapper = mount(StatusDropdown, {
      props: {
        modelValue: 'closed',
        showTransitionCheck: true,
      },
      attachTo: document.body,
    });

    await wrapper.find('button').trigger('click');
    const menu = document.body.querySelector('.z-\\[9999\\]');

    const inProgressOption = Array.from(menu?.querySelectorAll('div') || []).find(
      (el) => el.textContent?.trim().startsWith('In Progress')
    );
    expect(inProgressOption?.classList.contains('cursor-not-allowed')).toBe(true);
    (inProgressOption as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();

    const resolvedOption = Array.from(menu?.querySelectorAll('div') || []).find(
      (el) => el.textContent?.trim().startsWith('Resolved')
    );
    expect(resolvedOption?.classList.contains('cursor-not-allowed')).toBe(true);
    (resolvedOption as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();

    wrapper.unmount();
  });
});
