<template>
    <div v-if="isActive" class="u-tabbed-content"><slot /></div>
</template>

<script setup>
import { inject, toRef } from 'vue';

const props = defineProps({
    name: { type: String, required: true },
    header: { type: String, default: '' },
    hidden: { type: Boolean, default: false },
    startActive: { type: Boolean, default: false },
});

const registerTab = inject('register-tab');
const { isActive } = registerTab({
    name: props.name,
    header: toRef(props, 'header'),
    hidden: toRef(props, 'hidden'),
    startActive: toRef(props, 'startActive'),
});
</script>
