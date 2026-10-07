import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import router from '../router';
import App from '../App.vue';

describe('App', () => {
  it('mounts App with Pinia and Vue Router successfully', async () => {
    router.push('/login');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toContain('Ticket Admin');
  });
});
