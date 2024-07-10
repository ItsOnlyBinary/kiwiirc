'kiwi public';

import _ from 'lodash';
import JSON5 from 'json5';
import Logger from './Logger';

let log = Logger.namespace('ConfigLoader');

export default class ConfigLoader {
    constructor() {
        this.config = Object.create(null);
        this.valReplacements = Object.create(null);
    }

    addValueReplacement(key, value) {
        this.valReplacements[key] = value;
        return this;
    }

    async loadFromUrl(configUrl) {
        const response = await fetch(configUrl);
        if (!response.ok) {
            throw new Error(`Failed to load ${configUrl}: ${response.statusText}`);
        }
        const text = await response.text();

        try {
            const configObj = JSON5.parse(text);
            this.setConfig(configObj);
            return this.config;
        } catch (error) {
            log.error('Config ' + error.message);
            let errMsg = 'Config file error: ' + error.message.replace('JSON5: ', '');
            errMsg = errMsg.replace(/at (\d+):(\d+)/g, (m, m1, m2) => `line ${m1}, position ${m2}`);
            throw new Error(errMsg);
        }
    }

    async loadFromObj(configObj) {
        this.setConfig(configObj);
        return this.config;
    }

    setConfig(confObj) {
        const walkObject = (obj, target) => {
            _.each(obj, (_val, key) => {
                let val = _val;
                if (typeof val === 'string') {
                    val = this.insertReplacements(val);
                    target[key] = val;
                } else if (typeof val === 'object') {
                    target[key] = _.isArray(val) ? [] : {};
                    walkObject(val, target[key]);
                } else {
                    target[key] = val;
                }
            });
        };

        this.config = Object.create(null);
        walkObject(confObj, this.config);
    }

    insertReplacements(input) {
        let out = input;
        const keys = Object.keys(this.valReplacements);
        for (let k of keys) {
            if (input === `{{${k}}}`) {
                return this.valReplacements[k];
            }
            out = out.replace(`{{${k}}}`, this.valReplacements[k]);
        }
        return out;
    }
}
