<template>
    <div class="u-tabbed-view">
        <div class="u-tabbed-view-tabs">
            <a
                v-for="tab in filteredTabs"
                :key="'tab' + tab.name.value"
                class="u-tabbed-view-tab"
                :class="{ 'u-tabbed-view-tab--active': tab.isActive.value }"
                @click="setActive(tab.name, $event)"
            >{{ tab.header.value }}</a>
        </div>
        <slot />
    </div>
</template>

<script>
import { computed, onMounted, provide, shallowReactive, shallowRef } from 'vue';
import Logger from '@/libs/Logger';

import TabbedTab from './TabbedTab.vue';

const log = Logger.namespace('TabbedView');

export default {
    Tab: TabbedTab,
};
</script>

<script setup>
const emit = defineEmits(['changed']);

const activeTab = shallowRef(null);
const tabs = shallowReactive(new Map());
const filteredTabs = computed(() => [...tabs.values()].filter((tab) => !tab.hidden.value));

const setActive = (tabName) => {
    log.debug('activeTab changed:', tabName);
    const ucTabName = tabName.toUpperCase();
    const newTab = tabs.get(ucTabName);
    if (!newTab) {
        log.error('could not find tab named:', ucTabName);
        return;
    }
    activeTab.value = newTab;
    emit('changed', activeTab.value.name);
};
provide('set-active', setActive);

const registerTab = (tab) => {
    const ucTabName = tab.name.toUpperCase();

    tab.isActive = computed(() => activeTab.value === tab);
    tabs.set(ucTabName, tab);

    if (tab.startActive.value) {
        setActive(tab.name);
    }

    return {
        isActive: tab.isActive,
    };
};
provide('register-tab', registerTab);

const setHidden = (tabName, newValue) => {
    log('setHidden', tabName);
    // TODO this needs work
    const ucTabName = tabName.toUpperCase();
    const tab = tabs.get(ucTabName);
    tab.hidden.value = newValue;
};
provide('setHidden', setHidden);

onMounted(() => {
    if (activeTab.value) {
        return;
    }

    const firstTab = tabs.values().next().value;
    if (firstTab) {
        activeTab.value = firstTab;
    }
});

defineExpose({ setActiveByName: setActive });
</script>

<style>
.u-tabbed-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.u-tabbed-view-tabs {
    padding-top: 15px;
}

.u-tabbed-view-tab {
    display: inline-block;
    cursor: pointer;
    border-width: 0;
    border-style: solid;
    background: #fff;
    font-weight: 600;
    opacity: 1;
    z-index: 1;
    margin-bottom: -3px;
    position: relative;
    width: auto;
    text-align: left;
    box-sizing: border-box;
    padding: 0.5em 1em;
    border-bottom: 3px solid rgba(0, 0, 0, 0.1);
    transition: border 0.3s;
}

.u-tabbed-view-tab:hover,
.u-tabbed-view-tab--active {
    border-bottom-width: 3px;
}

.u-tabbed-view-tab:last-of-type {
    z-index: 1;
    border-radius: 0 4px 0 0;
}

.u-tabbed-content {
    overflow: auto;
    height: 100%;
}

@media screen and (max-width: 769px) {
    .u-tabbed-view-tabs {
        padding-top: 0;
    }

    .u-tabbed-view-tab {
        padding: 10px 20px;
        width: auto;
    }
}
</style>
