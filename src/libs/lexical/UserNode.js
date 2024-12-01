/* eslint-disable no-underscore-dangle */

import { TextNode } from 'lexical';
import getState from '@/libs/state';
import UserState from '@/libs/state/UserState';
import { mountComponent } from '@/helpers/Misc';
import AwayStatusIndicator from '@/components/AwayStatusIndicator.vue';

export class UserNode extends TextNode {
    static getType() {
        return 'user';
    }

    static clone(node) {
        return new UserNode(node.network, node.user, node.__key);
    }

    constructor(network, user, key) {
        super(user.nick, key);
        this.network = network;
        this.user = user;
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'user-node';
        element.spellcheck = false;
        element.contentEditable = false;
        if (this.user instanceof UserState) {
            element.style.color = this.user.getColour();
        }

        if (getState().setting('input.showAwayStatus')) {
            const awayStatus = mountComponent(
                AwayStatusIndicator,
                {
                    network: this.network,
                    user: this.user,
                },
            );
            element.prepend(awayStatus.vNode.el);
        }

        return element;
    }

    // canInsertTextBefore() {
    //     return false;
    // }

    // canInsertTextAfter() {
    //     return false;
    // }

    // isUnmergeable() {
    //     return true;
    // }

    static importJSON(serializedNode) {
        const user = getState().getUserById(serializedNode.user.id) ?? {
            nick: serializedNode.user.nick,
        };
        return $createUserNode(user);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'user',
            network: {
                id: this.network.id,
            },
            user: {
                id: this.user.id,
                nick: this.user.nick,
            },
        };
    }
}

export function $createUserNode(network, user) {
    return new UserNode(network, user).setMode('token');
}
