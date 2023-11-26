'kiwi public';

// import _ from 'lodash';
import { watch } from 'vue';

import Logger from '@/libs/Logger';

const log = Logger.namespace('StatePersistence');

export default class StatePersistence {
    constructor(state, storage) {
        this.state = state;
        this.storage = storage;

        this.prefix = state.getSetting('settings.persistence.storage_prefix');
        this.listeners = [];
        this.watchers = [];

        this.lastNetwork = this.storageKey('last_network');

        this.registerListeners();
        this.registerWatchers();
    }

    registerListeners() {
        // const serverOptions = (event, network) => {
        //     const client = network.ircClient;
        //     if (client.network.name === 'Network' || network.connection.bncnetid) {
        //         return;
        //     }
        //     console.log('serverOptions', client.network.name);
        //     const lcNetworkName = client.network.name.toLowerCase();

        //     this.storage.set(
        //         this.storageKey('last_network'),
        //         lcNetworkName,
        //     );

        //     const networkInfo = this.storage.get(
        //         this.storageKey('network', lcNetworkName),
        //     );

        //     console.log('networkInfo', networkInfo);
        // };
        // this.state.$on('irc.server options', serverOptions);
        // this.listeners.push(serverOptions);

        const networkNew = (event) => {
            console.log('networkNew', event);
            // const lcNetworkName = client.network.name.toLowerCase();

            this.watchers.push(
                watch(
                    () => event.network.name,
                    () => {
                        console.log('network name', event.network.name);
                    },
                ),
            );
        };
        this.state.$on('network.new', networkNew);
        this.listeners.push(networkNew);

        const bufferNew = (event) => {
            if (!event.buffer.isChannel()) {
                return;
            }
            console.log('bufferNew', event);
            // const lcNetworkName = client.network.name.toLowerCase();

            this.watchers.push(
                watch(
                    event.buffer.settings,
                    () => {
                        console.log('buffer', event.buffer);
                    },
                ),
            );
        };
        this.state.$on('buffer.new', bufferNew);
        this.listeners.push(bufferNew);
    }

    registerWatchers() {
        console.log('registerWatchers', this.state.networks);

        // this.watchers.push(
        //     watch(
        //         this.state.networks,
        //         (event) => {
        //             console.log('networks');
        //         },
        //         {
        //             deep: false,
        //         }
        //     ),
        // );
    }

    save(obj) {

    }

    load() {

    }

    saveNetwork(network) {
        if (!network) {
            log.error('Tried to save undefined network');
            return;
        }

        if (!network.name) {
            log.error('Network does not have a name', `[id=${network.id}]`);
            return;
        }

        const key = this.storageKey('networks', network.name.toLowerCase());
        const json = JSON.stringify({
            lastUpdated: Date.now(),
            settings: network.settings,
            nick: network.nick,
            username: network.username,
            gecos: network.gecos,
        });
        this.storage.set(key, json);
    }

    saveBuffer(buffer) {
        if (!buffer) {
            log.error('Tried to save undefined buffer');
            return;
        }

        const network = buffer.getNetwork();
        if (!network.name) {
            log.error('Network does not have a name', `[id=${network.id}]`);
            return;
        }

        const key = this.storageKey('buffers', network.name.toLowerCase(), buffer.name.toLowerCase());
        const json = JSON.stringify({
            lastUpdated: Date.now(),
            ...buffer.settings,
        });
        this.storage.set(key, json);
    }

    saveSettings() {
        const json = JSON.stringify({
            lastUpdated: Date.now(),
            ...this.state.user_settings,
        });
        const key = this.storageKey('settings');
        this.storage.set(key, json);
    }

    storageKey(...args) {
        return [this.prefix, ...args].join('_');
    }
}
