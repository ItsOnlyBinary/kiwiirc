<template>
    <div ref="typingUsers" v-resizeobserver="typingResize" class="kiwi-typinguserslist" >
        <span
            v-for="(user, idx) in filteredTypingUsers.list"
            :key="user.key"
            :style="{ color: userColour(user) }"
            class="kiwi-typinguserslist-user"
        >{{ idx > 0 ? ',' : '' }} {{ user.nick }}</span>
        <span
            v-if="filteredTypingUsers.list.length > 0"
            :class="[filteredTypingUsers.hasMore ? 'kiwi-typing-more' : 'kiwi-typing']"
        />
    </div>
</template>

<script>
'kiwi public';

export default {
    props: ['buffer'],
    data() {
        return {
            isMounted: false,
            maxWidth: 0,
        };
    },
    computed: {
        users() {
            if (this.buffer.isQuery()) {
                // if this is a query return the target as users
                let network = this.$state.getActiveNetwork();
                let user = this.$state.getUser(network.id, this.buffer.name);
                return user ? { [user.nick]: user } : {};
            }
            return this.buffer.users;
        },
        typingUsers() {
            const start = performance.now();
            let myNick = this.$state.getActiveNetwork().nick;
            const filtered = Object.values(this.users).filter((u) => u.nick !== myNick
                && u.typingStatus(this.buffer.name).status);
            console.log('filtered', performance.now() - start);
            return filtered;
        },
        filteredTypingUsers() {
            const start = performance.now();
            const result = {
                list: [],
                hasMore: false,
            };

            if (!this.isMounted || !this.maxWidth) {
                console.log('filteredTypingUsers', 'not mounted');
                return result;
            }
            const typingElement = this.$refs.typingUsers;
            let accumulatedWidth = 0;

            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.whiteSpace = 'nowrap';
            tempSpan.style.display = 'inline-block';
            typingElement.appendChild(tempSpan);

            for (let i = 0; i < this.typingUsers.length; i++) {
                tempSpan.innerText = `, ${this.typingUsers[i].nick}`;
                const width = tempSpan.offsetWidth;

                if (accumulatedWidth + width > this.maxWidth) {
                    result.hasMore = true;
                    typingElement.removeChild(tempSpan);
                    console.log('typing', performance.now() - start);
                    return result;
                }
                accumulatedWidth += width;
                result.list.push(this.typingUsers[i]);
            }

            typingElement.removeChild(tempSpan);
            console.log('typing', performance.now() - start);
            return result;
        },
    },
    mounted() {
        this.isMounted = true;
    },
    methods: {
        userColour(user) {
            return user && this.buffer.setting('colour_nicknames_in_messages') ? user.getColour() : '';
        },
        typingResize(event) {
            this.maxWidth = this.$refs.typingUsers.offsetWidth - 54;
            console.log('typingResize', this.maxWidth, event);
        },
    },
};
</script>
<style lang="less">

.kiwi-typinguserslist {
    background: var(--brand-default-bg);
    font-size: 0.9em;
    overflow: hidden;
    margin: 0 10px;

    .kiwi-typing,
    .kiwi-typing-more {
        margin-left: 4px;
        min-width: 20px;
    }

    .kiwi-typing::after,
    .kiwi-typing-more::after {
        left: -20px;
    }
}

// .kiwi-typinguserslist-users {
//     flex-shrink: 1;
//     display: flex;
//     flex-wrap: wrap;
//     align-content: flex-start;
// }

.kiwi-typinguserslist-user {
    white-space: nowrap;
    display: inline-block;
}

.kiwi-typing-more::after {
    display: inline-block;
    animation: plussy steps(1, end) 1s infinite;
    font-weight: 900;
    font-size: 1.1em;
    content: '';
}

@keyframes plussy {
    0% { content: ''; }
    25% { content: '+'; }
    50% { content: '++'; }
    75% { content: '+++'; }
    100% { content: ''; }
}

</style>
