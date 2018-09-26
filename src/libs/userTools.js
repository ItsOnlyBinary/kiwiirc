'kiwi public';

import state from '@/libs/state';

export function isUserAdminOfSharedChannel(networkid, nick) {
    let buffers = state.getBuffersWithUser(networkid, nick);
    // eslint-disable-next-line no-restricted-syntax
    for (let idx in buffers) {
        if (buffers[idx].isUserAnOp(nick)) {
            return true;
        }
    }
    return false;
}
