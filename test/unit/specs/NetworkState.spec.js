import 'es6-set/implement';
import Vue from 'vue';
import state from '@/libs/state';
import BufferState from '@/libs/state/BufferState';
import NetworkState from '@/libs/state/NetworkState';
import * as IrcClient from '@/libs/IrcClient';

describe('NetworkState.js', function() {
    let network = state.addNetwork('TestNetwork', 'TestNick', {});

    it('should return a NetworkState instance', function() {
        expect(network).to.be.a.instanceOf(NetworkState);
    });

    it('should return a IrcClient instance', function() {
        expect(network.ircClient).to.be.a('object');
        expect(network.ircClient.connect).to.be.a('function');
    });

    it('should return a valid buffer list', function() {
        expect(network.buffers).to.be.a('array');
        expect(network.buffers).to.have.length.above(0);
    });

    it('should return a buffer by name', function() {
        let buffer = network.bufferByName('*');
        expect(buffer).to.be.a.instanceOf(BufferState);
        expect(buffer.name).to.equal('*');
    });

    it('should return a server buffer', function() {
        let buffer = network.serverBuffer();
        expect(buffer).to.be.a.instanceOf(BufferState);
        expect(buffer.name).to.equal('*');
    });

    it('should get/set settings', function() {
        network.setting('show-raw', true);
        expect(network.setting('show-raw')).to.equal(true);
    });

    it('should test valid channel names', function() {
        let tests = [
            ['#channel', true],
            ['&channel', true],
            ['@channel', false],
            ['$channel', false],
        ];

        tests.forEach((c) => {
            expect(network.isChannelName(c[0])).to.be.equal(c[1]);
        });
    });
});
