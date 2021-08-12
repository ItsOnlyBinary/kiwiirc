<template>
    <div
        :class="{
            'kiwi-nicklist--filtering': filter_visible,
            'kiwi-nicklist--avatars': shouldShowAvatars,
        }"
        class="kiwi-nicklist"
    >
        <div class="kiwi-nicklist-usercount" @click="toggleUserFilter">
            <span>
                {{
                    filter_visible ?
                        filteredUsers.length :
                        $t('person', {count: filteredUsers.length})
                }}
            </span>

            <input
                ref="user_filter"
                v-model="user_filter"
                :placeholder="$t('filter_users')"
                @blur="onFilterBlur"
            >
            <i class="fa fa-search" />
        </div>

        <DynamicScroller
            :items="filteredUsers"
            :min-item-size="34"
            :key-field="'nick'"
            class="kiwi-nicklist-users"
        >
            <template v-slot="{ item, index, active }">
                <DynamicScrollerItem
                    :item="item"
                    :active="active"
                    :size-dependencies="[]"
                    :data-index="index"
                >
                    <nicklist-user
                        :key="item.nick"
                        :user="item"
                        :nicklist="self"
                        :network="network"
                    />
                </DynamicScrollerItem>
            </template>
        </DynamicScroller>
    </div>
</template>

<script>

'kiwi public';

import NicklistUser from './NicklistUser';

export default {
    components: {
        NicklistUser,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data: function data() {
        return {
            userbox_user: null,
            user_filter: '',
            filter_visible: false,
            self: this,
        };
    },
    computed: {
        shouldShowAvatars() {
            return this.buffer.setting('nicklist_avatars');
        },
        filteredUsers() {
            if (!this.user_filter) {
                return this.buffer.sortedUsers.array;
            }

            return this.buffer.sortedUsers.array.filter(
                (user) => user.nick.includes(this.user_filter)
            );
        },
        useColouredNicks() {
            return this.buffer.setting('coloured_nicklist');
        },
    },
    methods: {
        userModePrefix(user) {
            return this.buffer.userModePrefix(user);
        },
        userMode(user) {
            return this.buffer.userMode(user);
        },
        openQuery(user) {
            let buffer = this.$state.addBuffer(this.buffer.networkid, user.nick);
            this.$state.setActiveBuffer(buffer.networkid, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.sidebarState.close();
            }
        },
        openUserbox(user) {
            this.$state.$emit('userbox.show', user, {
                buffer: this.buffer,
            });
        },
        toggleUserFilter() {
            this.filter_visible = !this.filter_visible;
            if (this.filter_visible) {
                this.$nextTick(() => this.$refs.user_filter.focus());
            } else {
                this.user_filter = '';
            }
        },
        onFilterBlur() {
            if (!this.user_filter) {
                this.filter_visible = false;
            }
        },
    },
};
</script>

<style lang="less">

/* Adjust the sidebars width when this nicklist is in view */
.kiwi-container .kiwi-sidebar.kiwi-sidebar-section-nicklist {
    max-width: 250px;
    width: 250px;
}

.kiwi-nicklist {
    overflow: hidden;
    box-sizing: border-box;
    min-height: 100px;
    margin: auto;
    width: 100%;
    //Padding bottom is needed, otherwise the scrollbar will show on the right side.
    padding-bottom: 1px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.kiwi-nicklist-usercount {
    display: flex;
    justify-content: space-between;
    cursor: default;
    box-sizing: border-box;
    height: 43px;
    line-height: 40px;
    width: 100%;
    border-bottom: 1px solid;
}

.kiwi-nicklist-usercount span {
    margin-left: 15px;
    font-weight: 600;
}

.kiwi-nicklist-usercount .fa-search {
    opacity: 0.3;
    cursor: pointer;
    font-size: 1.2em;
    line-height: 40px;
    align-self: flex-start;
    margin-right: 15px;
}

.kiwi-nicklist-usercount .fa-search:hover,
.kiwi-nicklist--filtering .kiwi-nicklist-usercount .fa-search {
    opacity: 1;
}

.kiwi-nicklist-usercount input {
    width: 0%;
    border: none;
    font-weight: normal;
    background: none;
    outline: 0;
    padding: 0 15px 0 10px;
    opacity: 0;
    box-sizing: border-box;
    flex-grow: 1;
    transition: all 0.2s;
}

.kiwi-nicklist--filtering .kiwi-nicklist-usercount input {
    opacity: 1;
}

.kiwi-nicklist-users {
    width: 100%;
    padding: 0;
    margin: 0;
    overflow-y: scroll;
    overflow-x: hidden;
    box-sizing: border-box;
    max-height: 100%;
    flex: 1 auto;
    line-height: 1.2em;
    margin-top: 6px;
}

@media screen and (max-width: 759px) {
    .kiwi-container .kiwi-sidebar.kiwi-sidebar-section-nicklist {
        width: 100%;
        max-width: 380px;
    }
}

</style>
