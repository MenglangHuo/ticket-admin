import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DateRangePicker from '@/components/common/DateRangePicker.vue';

describe('DateRangePicker.vue', () => {
  it('mounts with default preset this_month and displays label', () => {
    const wrapper = mount(DateRangePicker);
    expect(wrapper.text()).toContain('This Month');
  });

  it('calculates proper date_from and date_to when preset changes', async () => {
    const wrapper = mount(DateRangePicker);
    const button = wrapper.find('button');
    await button.trigger('click');

    // Click "Last 7 Days" button in dropdown
    const presetButtons = wrapper.findAll('button');
    const sevenDaysBtn = presetButtons.find((b) => b.text().includes('Last 7 Days'));
    expect(sevenDaysBtn).toBeDefined();

    await sevenDaysBtn!.trigger('click');

    const emitted = wrapper.emitted('change');
    expect(emitted).toBeDefined();
    const firstCall = emitted?.[0];
    expect(firstCall).toBeDefined();

    const result = firstCall?.[0] as any;
    expect(result.preset).toBe('7_days');
    expect(result.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.date_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.fromDate).toBe(result.date_from);
    expect(result.toDate).toBe(result.date_to);
  });
});
