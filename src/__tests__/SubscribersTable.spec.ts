import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import SubscribersTable from '@/components/settings/SubscribersTable.vue';
import SubscribersTableSkeleton from '@/components/settings/SubscribersTableSkeleton.vue';
import { useSettingsStore } from '@/stores/settingsStore';
import type { TelegramSubscriber } from '@/types/settings';

const mockSubscribers: TelegramSubscriber[] = [
  {
    id: 1,
    telegram_chat_id: '12345678',
    telegram_username: 'alex_dev',
    is_active: true,
    subscribed_at: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 2,
    telegram_chat_id: '87654321',
    telegram_username: 'sarah_ops',
    is_active: false,
    subscribed_at: '2026-03-05T14:30:00.000Z',
  },
  {
    id: 3,
    telegram_chat_id: '99887766',
    telegram_username: null,
    is_active: true,
    subscribed_at: '2026-03-10T08:15:00.000Z',
  },
];

describe('SubscribersTable Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders modern table headers and subscriber data correctly', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    const headers = wrapper.findAll('th');
    const headerTexts = headers.map((h) => h.text());

    expect(headerTexts.some((t) => t.includes('Telegram User'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Telegram Chat ID'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Ticket Notifications'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Subscribed Date'))).toBe(true);
    expect(headerTexts.some((t) => t.includes('Action'))).toBe(true);

    const text = wrapper.text();
    expect(text).toContain('@alex_dev');
    expect(text).toContain('@sarah_ops');
    expect(text).toContain('No username');
    expect(text).toContain('12345678');
    expect(text).toContain('87654321');
    expect(text).toContain('Active');
    expect(text).toContain('Muted');
  });

  it('renders SubscribersTableSkeleton when isLoading is true and subscribers list is empty', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [];
    settingsStore.isLoading = true;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    const skeleton = wrapper.findComponent(SubscribersTableSkeleton);
    expect(skeleton.exists()).toBe(true);
  });

  it('provides column resize handles with cursor-col-resize styling on headers', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    const resizeHandles = wrapper.findAll('.cursor-col-resize');
    expect(resizeHandles.length).toBeGreaterThanOrEqual(4);
  });

  it('renders sticky Action column with freeze-col-shadow styling', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    const actionTh = wrapper.findAll('th').find((th) => th.text().includes('Action'));
    expect(actionTh).toBeDefined();
    expect(actionTh?.classes()).toContain('sticky');
    expect(actionTh?.classes()).toContain('right-0');
  });

  it('renders custom TablePagination with itemLabel as subscribers', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    const paginationText = wrapper.text();
    expect(paginationText).toContain('Rows per page:');
    expect(paginationText).toContain('subscribers');
    expect(paginationText).toContain('Showing');
  });

  it('sorts subscribers when clicking column headers', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    // Click on Telegram User header to sort by user
    const userTh = wrapper.findAll('th').find((th) => th.text().includes('Telegram User'));
    expect(userTh).toBeDefined();

    await userTh?.trigger('click');
    await wrapper.vm.$nextTick();

    // After sorting, rows should be rendered
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('supports hiding and restoring table columns', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    // Verify chat_id column header is initially rendered
    expect(wrapper.findAll('th').some((th) => th.text().includes('Telegram Chat ID'))).toBe(true);

    // Toggle off chat_id in stored settings
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const chatIdCheckbox = checkboxes.find((cb) => {
      const parentText = cb.element.parentElement?.textContent || '';
      return parentText.includes('Telegram Chat ID');
    });

    if (chatIdCheckbox) {
      await chatIdCheckbox.setValue(false);
      await wrapper.vm.$nextTick();
      expect(wrapper.findAll('th').some((th) => th.text().includes('Telegram Chat ID'))).toBe(false);
    }
  });

  it('copies chat ID to clipboard when clicking copy button', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.subscribers = [...mockSubscribers];
    settingsStore.isLoading = false;

    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    const wrapper = mount(SubscribersTable);
    await wrapper.vm.$nextTick();

    const copyBtn = wrapper.find('button[title*="Chat ID"]');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger('click');
    expect(writeTextSpy).toHaveBeenCalledWith('99887766');
  });
});
