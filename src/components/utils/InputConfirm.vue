<template>
    <div class="kc-input-confirm">
        <div v-if="showPre" @click="showPre = false"><slot /></div>
        <template v-else>
            <span v-if="label" class="kc-input-confirm-label" v-text="label" />
            <div class="kc-input-confirm-buttons">
                <a
                    v-for="button in buttons"
                    :key="button.id"
                    class="kc-button kc-input-confirm-button"
                    :class="`kc-button--${button.type}`"
                    :data-id="button.id"
                    @click="emit('submit', button.id, $event)"
                    v-text="button.text[0] === '_' ? $t(button.text.substr(1)) : button.text"
                />
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, useSlots } from 'vue';

const { label, buttons } = defineProps({
    label: {
        type: String,
    },
    buttons: {
        type: Array,
        default: () => [
            {
                id: 'yes',
                text: '_yes',
                type: 'positive',
            },
            {
                id: 'no',
                text: '_no',
                type: 'negative',
            },
        ],
    },
});

const emit = defineEmits(['submit']);

const slots = useSlots();
const showPre = ref(!!slots.default);
</script>

<style lang="scss">
.kc-input-confirm {
    padding: 10px;
    text-align: center;

    > span {
        display: block;
        padding-bottom: 10px;
    }

    &-buttons {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
    }
}
</style>
