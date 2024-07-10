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

// The name property should be static and none changing,
// if the text needs to change then the header should
// eslint-disable-next-line vue/no-setup-props-destructure
const { isActive } = registerTab({
    name: props.name,
    header: toRef(props, 'header'),
    hidden: toRef(props, 'hidden'),
    startActive: toRef(props, 'startActive'),
});
</script>
