// import 'es6-set/implement';
import state from '@/libs/state';
import BufferState from '@/libs/state/BufferState';
import NetworkState from '@/libs/state/NetworkState';

describe('BufferState.js', function() {
    // Create a test network to hold our buffers
    let network = state.addNetwork('TestNetwork', 'TestNick', {});

    // Get the server buffer for initial tests
    let buffer = network.serverBuffer();

    it('should return a BufferState instance', function() {
        expect(buffer).to.be.a.instanceOf(BufferState);
    });

    it('should return a NetworkState instance', function() {
        expect(buffer.getNetwork()).to.be.a.instanceOf(NetworkState);
    });

    it('should return a messages array', function() {
        let messages = buffer.getMessages();
        expect(messages).to.be.a('array');
        expect(messages.length).to.equal(0);
    });

    it('should return true for server buffer', function() {
        expect(buffer.isServer()).to.equal(true);
    });

    it('should return false for channel buffer', function() {
        expect(buffer.isChannel()).to.equal(false);
    });

    it('should return false for query buffer', function() {
        expect(buffer.isQuery()).to.equal(false);
    });

    it('should return false for special buffer', function() {
        expect(buffer.isSpecial()).to.equal(false);
    });

    // Add a channel & three users
    let channelBuffer = state.addBuffer(network.id, '#test');
    let user1 = state.addUser(network.id, { nick: 'Test1', username: 'test1' });
    let user2 = state.addUser(network.id, { nick: 'Test2', username: 'test2' });
    let user3 = state.addUser(network.id, { nick: 'Test3', username: 'test3' });
    state.addUserToBuffer(channelBuffer, user1, ['o']);
    state.addUserToBuffer(channelBuffer, user2, ['h']);
    state.addUserToBuffer(channelBuffer, user3, ['v']);

    it('should check if user is op', function() {
        expect(channelBuffer.isUserAnOp('test1')).to.equal(true);
        expect(channelBuffer.isUserAnOp('test2')).to.equal(true);
        expect(channelBuffer.isUserAnOp('test3')).to.equal(false);
    });

    it('should get/set buffer settings', function() {
        expect(channelBuffer.setting('show_topics')).to.equal(true);
        expect(channelBuffer.setting('mute_sound')).to.equal(false);
    });

    it('should rename buffers', function() {
        channelBuffer.rename('#tested');
        expect(channelBuffer.name).to.equal('#tested');
    });

    it('should get/set buffer flags', function() {
        channelBuffer.flag('highlight', true);
        expect(channelBuffer.flag('highlight')).to.equal(true);
    });

    it('should mark a buffer as read', function() {
        channelBuffer.markAsRead();
        expect(channelBuffer.flag('highlight')).to.equal(false);
    });

    it('should incrament flags', function() {
        channelBuffer.incrementFlag('unread');
        expect(channelBuffer.flag('unread')).to.equal(1);
    });
});
