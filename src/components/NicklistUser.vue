<template functional>
    <div
        :class="{
            'kiwi-nicklist-user--away': props.user.isAway() || props.user.isOffline(),
            'kiwi-nicklist-user--ignore': props.user.ignore,
            [data.staticClass]: !!data.staticClass,
        }"
        v-bind="$options.dataAttributes(props)"
        class="kiwi-nicklist-user"
        @click.stop="props.nicklist.openUserbox(props.user)"
    >
        <div v-if="props.nicklist.shouldShowAvatars" class="kiwi-nicklist-avatar">
            <component :is="$options.components.Avatar" :user="props.user" size="small" />
            <component
                :is="$options.components.AwayStatusIndicator"
                :network="props.network"
                :user="props.user"
                :toggle="false"
            />
        </div>
        <component
            :is="$options.components.AwayStatusIndicator"
            v-else
            :network="props.network"
            :user="props.user"
            :toggle="false"
            class="kiwi-nicklist-awaystatus"
        />
        <span class="kiwi-nicklist-user-prefix">{{ $options.userModePrefix(props) }}</span>
        <span
            class="kiwi-nicklist-user-nick"
            :style="{ color: $options.userColour(props) }"
        >{{ props.user.nick }} </span>
        <div class="kiwi-nicklist-user-buttons">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="kiwi-nicklist-user-typing"
                :class="{
                    'kiwi-nicklist-user-typing--active':
                        $options.userTypingState(props) === 'active',
                    'kiwi-nicklist-user-typing--paused':
                        $options.userTypingState(props) === 'paused',
                }"
            >
                <circle cx="4" cy="12" r="3" />
                <circle cx="12" cy="12" r="3" />
                <circle cx="20" cy="12" r="3" />
            </svg>

            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 36 36"
                class="kiwi-nicklist-user-message"
                @click.stop="props.nicklist.openQuery(props.user)"
            >
                <path
                    d="M18 1C8.059 1 0 7.268 0 15c0 4.368 2.574 8.268 6.604 10.835C6.08 28.144
                        4.859 31.569 2 35c5.758-.96 9.439-3.761 11.716-6.416c1.376.262 2.805.416
                        4.284.416c9.941 0 18-6.268 18-14S27.941 1 18 1z"
                />
            </svg>
        </div>
    </div>
</template>

<script>
'kiwi public';

import AwayStatusIndicator from './AwayStatusIndicator';
import TypingStatusIndicator from './TypingStatusIndicator';
import Avatar from './Avatar';

export default {
    components: {
        AwayStatusIndicator,
        TypingStatusIndicator,
        Avatar,
    },
    props: ['network', 'user', 'nicklist'],
    dataAttributes(props) {
        const attrs = Object.create(null);
        attrs['data-nick'] = props.user.nick.toLowerCase();

        if (props.user.account) {
            attrs['data-account'] = props.user.account.toLowerCase();
        }

        const userMode = props.nicklist.buffer.userMode(props.user);
        if (userMode) {
            attrs['data-mode'] = userMode;
        }

        return attrs;
    },
    userColour(props) {
        if (props.nicklist.useColouredNicks) {
            return props.user.getColour();
        }
        return '';
    },
    userModePrefix(props) {
        return props.nicklist.buffer.userModePrefix(props.user);
    },
    userTypingState(props) {
        const status = props.user.typingStatus(props.nicklist.buffer.name).status;
        return status;
    },
};
</script>

<style lang="less">
.kiwi-nicklist-user {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 26px;
    max-height: 26px;
    padding: 0 10px;
    line-height: initial;
    white-space: nowrap;
    cursor: pointer;
    border-left: 4px solid transparent;
    transition: all 0.1s;

    .kiwi-nicklist--avatars & {
        height: 38px;
        max-height: 38px;
        padding: 4px 10px;
    }
}

.kiwi-nicklist-avatar {
    position: relative;
    margin-right: 10px;

    .kiwi-avatar {
        width: 30px;
        height: 30px;
    }

    .kiwi-awaystatusindicator {
        position: absolute;
        top: 0;
        right: 0;
        margin: 0;
    }
}

.kiwi-nicklist-awaystatus {
    width: 9px;
    height: 9px;
    margin-right: 6px;
    border: none;
}

.kiwi-nicklist-user-nick {
    display: block;
    flex: 1;
    margin-right: 10px;
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
}

.kiwi-nicklist-user-buttons {
    position: relative;
    display: flex;
    align-items: center;
}

.kiwi-nicklist-user-typing {
    width: 18px;
    height: 18px;
    visibility: hidden;
    opacity: 1;

    &--active,
    &--paused {
        visibility: visible;
    }

    > circle {
        opacity: 0.2;
        animation: 1.2s blink infinite;
        animation-play-state: paused;

        &:nth-child(2) {
            animation-delay: 0.3s;
        }

        &:nth-child(3) {
            animation-delay: 0.6s;
        }
    }

    &--active > circle {
        animation-play-state: running;
    }

    .kiwi-nicklist-user:hover & {
        opacity: 0;
        transition: opacity 0.3s;
    }

    @keyframes blink {
        33% {
            opacity: 0.9;
        }
    }
}

.kiwi-nicklist-user-message {
    position: absolute;
    right: -36px;
    width: 18px;
    height: 18px;
    opacity: 0;
    transition: right 0.3s, opacity 0.3s, fill 0.1s;

    .kiwi-nicklist-user:hover & {
        right: 0;
        opacity: 1;
    }
}
</style>
