<template functional>
    <div
        :data-nick="$options.m.nick(props)"
        class="kiwi-avatar"
    >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle
                v-if="!props.hideBackground"
                v-bind="$options.m.maybeMask(props)"
                :fill="$options.m.colour(props)"
                r="50%"
                cx="50%"
                cy="50%"
                class="kiwi-avatar-circle"
            />
            <circle
                v-if="$options.m.hasStatus(props)"
                transform="rotate(45 50 50)"
                r="12%"
                cx="50%"
                cy="0"
                class="kiwi-avatar-status"
                :class="{
                    'kiwi-avatar-status--toggle': props.allowToggle,
                    'kiwi-avatar-status--away': props.user && props.user.isAway(),
                    'kiwi-avatar-status--offline': $options.m.isOffline(props),
                }"
                @click.stop="$options.m.testClick(props)"
            />
            <image
                v-if="$options.m.getAvatar(props)"
                v-bind="$options.m.getImageProps(props)"
                clip-path="url(#kiwi-avatar-clip)"
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid slice"
                class="kiwi-avatar-image"
                @error="$options.m.failAvatar(props, $event)"
            />
            <text
                v-else
                v-bind="$options.m.maybeMask(props)"
                font-size="60"
                clip-path="url(#kiwi-avatar-clip)"
                x="50%"
                y="50%"
                dy="0.38em"
                text-anchor="middle"
                class="kiwi-avatar-initials"
            >{{ $options.m.nickInitials(props) }}</text>
        </svg>
    </div>
</template>

<script>
'kiwi public';

import getState from '@/libs/state';

const methods = {
    props: {},
    isOffline(props) {
        let localUser = getState().getUser(props.network.id, props.network.nick);
        return !props.user || (props.user === localUser && props.network.state !== 'connected');
    },
    maybeMask(props) {
        let value = {};
        if (this.hasStatus(props)) {
            value.mask = 'url(#kiwi-avatar-mask)';
        }
        return value;
    },
    getImageProps(props) {
        let value = this.maybeMask(props);
        let avatar = this.getAvatar(props);
        if (avatar) {
            value.href = avatar.url;
            value['xlink:href'] = avatar.url;
            value['avatar-size'] = avatar.size;
            // value['@error'] = `failAvatar(props, size)`
        }
        return value;
    },
    nick(props) {
        return (props.message?.nick || props.user?.nick || 'U').toLowerCase();
    },
    nickInitials(props) {
        return this.nick(props).substring(0, 1).toUpperCase();
    },
    getAvatar(props) {
        if (!props.user) {
            return undefined;
        }
        console.log('getAvatar', props.user.nick);
        let avatar = props.user.avatar;
        let ttl = (getState().setting('avatarRetryTTL') || 300) * 1000;
        let retryTime = Date.now() - ttl;

        let tryOrder = props.size === 'large' ? ['large', 'small'] : ['small', 'large'];
        for (let i = 0; i < tryOrder.length; i++) {
            let trySize = tryOrder[i];
            if (avatar[trySize] && avatar[`${trySize}_failed`] < retryTime) {
                return { url: avatar[trySize], size: trySize };
            }
        }
        return undefined;
    },
    failAvatar(props, event) {
        console.log('failAvatar', props);
        let size = event.target.getAttribute('avatar-size');
        if (!props.user || !size) {
            return;
        }
        props.user.avatar[`${size}_failed`] = Date.now();
    },
    testClick(props) {
        if (!props.allowToggle) {
            return;
        }
        console.log('testClick', props);
    },
    colour(props) {
        let user = props.message?.user || props.user;
        if (!user) {
            return 'var(--brand-default-fg)';
        }
        return user.getColour();
    },
    hasStatus(props) {
        let state = getState();
        if (!props.network) {
            return false;
        }

        if (!state.setting('showAwayStatusIndicators')) {
            return false;
        }

        let awayNotifyEnabled = props.network.ircClient.network.cap.isEnabled('away-notify');
        return awayNotifyEnabled || state.setting('buffers.who_loop');
    },
};

export default {
    props: {
        user: Object,
        network: Object,
        message: Object,
        size: {
            type: String,
            default: 'large',
        },
        hideBackground: {
            type: Boolean,
            default: false,
        },
        allowToggle: {
            type: Boolean,
            default: false,
        },
    },
    m: methods,
};

</script>

<style lang="less">

.kiwi-avatar {
    user-select: none;
}

.kiwi-avatar-initials {
    font-family: Arial, sans-serif;
    font-weight: 600;
    fill: var(--brand-default-bg);
}

.kiwi-avatar-status {
    fill: var(--brand-primary);
}

.kiwi-avatar--toggle {
    cursor: pointer;
}

.kiwi-avatar-status--away {
    fill: var(--brand-warning);
}

.kiwi-avatar-status--offline {
    fill: var(--brand-error);
}
</style>
