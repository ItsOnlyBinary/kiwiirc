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
        return new UserNode(node.network, node.user, node.getKey());
    }

    constructor(network, user, key) {
        super(user.nick, key);
        this.network = network;
        this.user = user;
    }

    getNetwork() {
        return this.network;
    }

    getUser() {
        return this.user;
    }

    createDOM(config) {
        const element = super.createDOM(config);
        element.className = 'user-node';
        element.spellcheck = false;

        const { user } = this;
        if (user instanceof UserState) {
            element.style.color = user.getColour();

            if (this.network && getState().setting('input.showAwayStatus')) {
                const awayStatus = mountComponent(AwayStatusIndicator, {
                    network: this.network,
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
        const { user } = this;
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
            network: { id: this.network?.id },
            user: { nick: this.user?.nick },
        };
    }
}

export function $createUserNode(network, user) {
    return new UserNode(network, user);
}
