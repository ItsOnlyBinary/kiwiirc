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
        return new UserNode(node.__network, node.__user, node.__key);
    }

    constructor(network, user, key) {
        super(user.nick, key);
        this.__network = network;
        this.__user = user;
    }

    getNetwork() {
        return this.__network;
    }

    getUser() {
        return this.__user;
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'user-node';
        element.spellcheck = false;

        const user = this.__user;
        if (user instanceof UserState) {
            element.style.color = user.getColour();

            if (this.__network && getState().setting('input.showAwayStatus')) {
                const awayStatus = mountComponent(AwayStatusIndicator, {
                    network: this.__network,
                    user,
                });
                element.prepend(awayStatus.vNode.el);
            }
        }

        return element;
    }

    updateDOM(prevNode, dom, config) {
        const needsRecreate = super.updateDOM(prevNode, dom, config);
        if (needsRecreate) {
            return true;
        }
        const user = this.__user;
        if (user instanceof UserState) {
            dom.style.color = user.getColour();
        }
        return false;
    }

    static importJSON(serialisedNode) {
        const state = getState();
        const network = state.getNetwork(serialisedNode.network?.id);
        const nick = serialisedNode.user?.nick;
        const user = (network && nick)
            ? (network.users?.get(nick) ?? { nick })
            : { nick: nick ?? '' };
        return $createUserNode(network, user);
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'user',
            network: { id: this.__network?.id },
            user: { nick: this.__user?.nick },
        };
    }
}

export function $createUserNode(network, user) {
    return new UserNode(network, user);
}
