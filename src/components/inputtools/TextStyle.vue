<!-- eslint-disable max-len -->
<template>
    <div class="kiwi-inputtools-style" @mousedown.prevent @click.prevent @touchstart.prevent>
        <div class="kiwi-inputtools-style-sample" :style="ircinput.currentStyle">
            {{ $t('input_style_sample') }}
        </div>
        <div class="kiwi-inputtools-style-top">
            <div class="kiwi-inputtools-style-grid kiwi-inputtools-style-base">
                <div
                    v-for="code in colourRange.slice(0, 16)"
                    :key="'colour'+code"
                    class="kiwi-inputtools-style-button"
                    :style="{'background-color': `var(--irc-colour-${code})`}"
                    :data-code="code"
                    @click="onColourClick"
                    @touchend="onColourClick"
                />
            </div>
            <div class="kiwi-inputtools-style-grid kiwi-inputtools-style-modifiers">
                <div
                    class="kiwi-inputtools-style-button"
                    :class="{'kiwi-inputtools-style--disabled': bgColourDisabled}"
                    :title="toggleColourTitle"
                    @click="toggleColour"
                    @touchend="toggleColour"
                >
                    <!-- svg icons: fas-rectangle-list, far-rectangle-list -->
                    <svg-icon :icon="[fgColour ? 'fa-regular' : 'fa-solid', 'fa-rectangle-list']" />
                </div>

                <div
                    class="kiwi-inputtools-style-button"
                    :title="$t('input_style_bold')"
                    @click="ircinput.toggleStyle('bold')"
                    @touchend="ircinput.toggleStyle('bold')"
                >
                    <svg-icon icon="fa-solid fa-bold" />
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    :title="$t('input_style_italic')"
                    @click="ircinput.toggleStyle('italic')"
                    @touchend="ircinput.toggleStyle('italic')"
                >
                    <svg-icon icon="fa-solid fa-italic" />
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    :title="$t('input_style_underline')"
                    @click="ircinput.toggleStyle('underline')"
                    @touchend="ircinput.toggleStyle('underline')"
                >
                    <svg-icon icon="fa-solid fa-underline" />
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    :title="$t('input_style_strikethrough')"
                    @click="ircinput.toggleStyle('strikethrough')"
                    @touchend="ircinput.toggleStyle('strikethrough')"
                >
                    <svg-icon icon="fa-solid fa-strikethrough" />
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    :title="$t('input_style_clear')"
                    @click="ircinput.clearStyles()"
                    @touchend="ircinput.clearStyles()"
                >
                    <svg-icon icon="fa-solid fa-eraser" />
                </div>
                <div
                    class="kiwi-inputtools-style-button kiwi-inputtools-style-reset"
                    :title="$t('input_style_remove')"
                    @click="ircinput.resetStyles()"
                    @touchend="ircinput.resetStyles()"
                >
                    <svg-icon icon="fa-solid fa-ban" />
                </div>
                <div
                    class="kiwi-inputtools-style-button kiwi-inputtools-style-expand"
                    :title="$t(extColours ? 'input_style_hide' : 'input_style_show')"
                    @click="toggleExtended()"
                    @touchend="toggleExtended()"
                >
                    <svg-icon icon="fa-solid fa-angles-right" />
                </div>
            </div>
        </div>
        <transition-expand>
            <div
                v-if="extColours"
                class="kiwi-inputtools-style-grid kiwi-inputtools-style-palette"
            >
                <div
                    v-for="code in colourRange.slice(16, 99)"
                    :key="'colour'+code"
                    class="kiwi-inputtools-style-button"
                    :style="{'background-color': `var(--irc-colour-${code})`}"
                    :data-code="code"
                    @click="onColourClick"
                    @touchend="onColourClick"
                />
            </div>
        </transition-expand>
    </div>
</template>

<script>
'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import TransitionExpand from '../utils/TransitionExpand.vue';

export default {
    components: { TransitionExpand },
    props: ['ircinput'],
    data() {
        return {
            fgColour: true,
            extColours: false,
        };
    },
    computed: {
        bgColourDisabled() {
            return !this.ircinput.currentStyle.color;
        },
        toggleColourTitle() {
            if (this.bgColourDisabled) {
                return TextFormatting.t('input_style_first');
            }

            const key = this.fgColour ?
                'input_style_back' :
                'input_style_fore';
            return TextFormatting.t(key);
        },
        colourRange() {
            return Array.from({ length: 99 }, (el, i) => String(i).padStart(2, '0'));
        },
    },
    created() {
        this.extColours = this.$state.setting('showColorPickerExtended');
    },
    methods: {
        toggleColour() {
            if (this.bgColourDisabled) {
                return;
            }
            this.fgColour = !this.fgColour;
        },
        toggleExtended() {
            this.extColours = !this.extColours;
        },
        onColourClick(event) {
            const code = event.target.dataset.code;
            const styleKey = this.fgColour ? 'color' : 'background-color';

            this.ircinput.applyTextStyle({
                [styleKey]: `var(--irc-colour-${code})`,
            });
        },
    },
};
</script>

<style lang="less">

.kiwi-inputtools-style {
    display: flex;
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 8px;
    border: 1px solid;
    border-bottom: 0;
    border-radius: 10px 10px 0 0;
    flex-direction: column;
    gap: 4px;
    background-color: var(--brand-default-bg);
}

.kiwi-inputtools-style-sample {
    width: 100%;
    padding: 2px;
    border: 1px solid;
    box-sizing: border-box;
    text-align: center;
    user-select: none;
}

.kiwi-inputtools-style-top {
    display: flex;
}

.kiwi-inputtools-style-grid {
    display: grid;
    column-gap: 4px;
    row-gap: 4px;
}

.kiwi-inputtools-style-base {
    grid-template-columns: repeat(8, 32px);
    grid-template-rows: repeat(2, 32px);
}

.kiwi-inputtools-style-modifiers {
    grid-template-columns: repeat(4, 32px);
    grid-template-rows: repeat(2, 32px);
    margin-left: 4px;
}

.kiwi-inputtools-style-palette {
    grid-template-columns: repeat(12, 32px);
    grid-template-rows: repeat(7, 32px);
}

.kiwi-inputtools-style-button {
    height: 100%;
    width: 100%;
    cursor: pointer;
    border: 2px solid;
    box-sizing: border-box;
    padding: 2px;

    > svg {
        display: block;
        height: 100%;
        width: 100%;
    }
}

.kiwi-inputtools-style-reset {
    padding: 4px;
}

.kiwi-inputtools-style--disabled {
    cursor: not-allowed;
}

@media screen and (max-width: 769px) {
    .kiwi-inputtools-style {
        padding: 4px;
        max-width: 442px;

        --cell-size: calc(min(100vw - 42px, 446px) / 12);
        --grid-gap: clamp(2px, calc(var(--cell-size) * 0.1213), 4px);
        --button-size: calc(var(--cell-size) - var(--grid-gap));

        .kiwi-inputtools-style-grid {
            column-gap: var(--grid-gap);
            row-gap: var(--grid-gap);
        }

        .kiwi-inputtools-style-base {
            grid-template-columns: repeat(8, var(--button-size));
            grid-template-rows: repeat(2, var(--button-size));
        }
        .kiwi-inputtools-style-modifiers {
            grid-template-columns: repeat(4, var(--button-size));
            grid-template-rows: repeat(2, var(--button-size));
            margin-left: var(--grid-gap);
        }
        .kiwi-inputtools-style-palette {
            grid-template-columns: repeat(12, var(--button-size));
            grid-template-rows: repeat(7, var(--button-size));
        }

        .kiwi-inputtools-style-button {
            padding: clamp(1px, calc(var(--button-size) * 0.0602), 2px);
            border-width: clamp(1px, calc(var(--button-size) * 0.0602), 2px);
        }

        .kiwi-inputtools-style-reset {
            padding: clamp(2px, calc(var(--button-size) * 0.1213), 4px);
        }
    }

    .kiwi-controlinput--selection .kiwi-inputtools-style {
        bottom: 54px;
        border: 1px solid;
    }
}

.kiwi-controlinput--show-tools--inline .kiwi-inputtools-style {
    right: 20px;
}

</style>
