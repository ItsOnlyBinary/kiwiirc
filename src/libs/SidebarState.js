import { computed, nextTick, ref } from 'vue';

import getState from '@/libs/state';
import GlobalApi from '@/libs/GlobalApi';

export default function useSidebarState() {
    const sidebarOpen = ref(false);
    const sidebarSection = ref('');
    const sidebarUser = ref(null);
    const activeComponent = ref(null);
    const activeComponentProps = ref(null);

    function resetSidebarState() {
        sidebarOpen.value = false;
        sidebarSection.value = '';
        sidebarUser.value = null;
        activeComponent.value = null;
        activeComponentProps.value = null;
    }

    const api = GlobalApi.singleton();
    api.on('sidebar.component', (component, props) => {
        resetSidebarState();
        const open = !!component;
        const state = getState();
        if (state.ui.is_touch) {
            const leave = () => {
                sidebarOpen.value = false;
                activeComponent.value = null;
                activeComponentProps.value = {};
                sidebarSection.value = '';
            };
            if (open) {
                state.history.push({
                    enter: () => {
                        sidebarOpen.value = true;
                        activeComponent.value = component;
                        activeComponentProps.value = props;
                        sidebarSection.value = 'component';
                    },
                    leave,
                    query: {
                        sidebar: 'open',
                    },
                });
            } else {
                state.history.go(-1);
            }
        } else {
            sidebarOpen.value = open;
            activeComponent.value = component;
            activeComponentProps.value = props || {};
            sidebarSection.value = sidebarOpen.value ? 'component' : '';
        }
    });

    // Allow forcing the sidebar open at startup
    nextTick(() => {
        const state = getState();
        const sidebarDefault = state.setting('sidebarDefault');
        if (sidebarDefault && state.ui.app_width > 769) {
            sidebarOpen.value = true;
            sidebarSection.value = sidebarDefault;
        }
    });

    function section() {
        if (!sidebarOpen.value) {
            return '';
        }

        let currentSection = sidebarSection.value;
        if (currentSection === 'component') {
            return section;
        }

        const state = getState();
        const buffer = state.getActiveBuffer();
        if (buffer.isQuery()) {
            // This is a query with only one possible sidebar dont change the current state
            // instead attempt to show the user, this allows channels to show their nicklist
            let user = state.getUser(buffer.getNetwork().id, buffer.name);
            if (user) {
                sidebarUser.value = user;
                return 'user';
            }
            return '';
        }

        // The following code is for channels only
        if (!buffer.isChannel()) {
            return '';
        }

        if (currentSection === 'user' && sidebarUser.value) {
            if (buffer.hasNick(sidebarUser.value.nick)) {
                return 'user';
            }
            // This was going to show a user that is not even present in the current channel
            // permantly switch back to nicklist so it does not jump back to user
            // when they switch to a channel with that user
            sidebarSection.value = 'nicklist';
            return sidebarSection.value;
        } else if (currentSection === 'nicklist') {
            return 'nicklist';
        } else if (currentSection === 'settings') {
            return 'settings';
        } else if (currentSection === 'about') {
            return 'about';
        }

        return '';
    }

    function close() {
        resetSidebarState();
    }

    function showUser(user) {
        resetSidebarState();
        sidebarOpen.value = true;
        sidebarUser.value = user;
        sidebarSection.value = 'user';
    }

    function showNicklist() {
        resetSidebarState();
        sidebarOpen.value = true;
        sidebarSection.value = 'nicklist';
    }

    function showBufferSettings() {
        resetSidebarState();
        sidebarOpen.value = true;
        sidebarSection.value = 'settings';
    }

    function showAbout() {
        resetSidebarState();
        sidebarOpen.value = true;
        sidebarSection.value = 'about';
    }

    function toggleUser(user) {
        section() === 'user' ?
            close() :
            showUser(user);
    }

    function toggleNicklist() {
        section() === 'nicklist' ?
            close() :
            showNicklist();
    }

    function toggleBufferSettings() {
        section() === 'settings' ?
            close() :
            showBufferSettings();
    }

    function toggleAbout() {
        section() === 'about' ?
            close() :
            showAbout();
    }

    const isOpen = computed(() => {
        const state = getState();
        return sidebarOpen.value && section() && state.ui.app_width > 769;
    });

    const isDrawn = computed(() => {
        const state = getState();
        return sidebarOpen.value && section() && state.ui.app_width <= 769;
    });

    return {
        sidebarOpen,
        sidebarSection,
        sidebarUser,
        activeComponent,
        activeComponentProps,
        section,
        close,
        showUser,
        showNicklist,
        showBufferSettings,
        showAbout,
        toggleUser,
        toggleNicklist,
        toggleBufferSettings,
        toggleAbout,
        isOpen,
        isDrawn,
    };
}
