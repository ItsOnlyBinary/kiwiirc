/**
 *   Adds AGL to user
 *   @param      {String}    realname
 *   @returns    {Object}    agl
 */
import Logger from 'src/libs/Logger';
import state from 'src/libs/state';
export function addAglToUser(realname) {
    let age = '';
    let gender = 'U';
    let location = '';

    // Test male
    let tempGecos = realname.split(/^m | m$|^m$| m |^h | h$|^h$| h |\/h\/|M002/gi);
    if (tempGecos.length > 1) {
        gender = 'M';
    } else {
        // Test female
        tempGecos = realname.split(/^f | f$|^f$| f |\/f\/|F001/gi);
        if (tempGecos.length > 1) {
            gender = 'F';
        } else {
            // Split information if explicitly undefined
            tempGecos = realname.split(/\/u\/|U003|^u | u$| u /gi);
        }
    }

    if (tempGecos.length > 1) {
        location = tempGecos[1];
    }

    if (tempGecos[0] !== undefined && tempGecos[0].match(/[0-9]/)) {
        age = tempGecos[0];
    }

    return {
        age: age,
        gender: gender,
        location: location,
    };
}

/**
 * Colorize the nickname according to gender
 */
let nickColourCache = Object.create(null);
export function createNickColour(user) {
    let nickColour = '#000000';
    let nickLower = user.nick.toLowerCase();

    if (nickColourCache[nickLower]) {
        return nickColourCache[nickLower];
    }

    if (user.gender === undefined) {
        return nickColour;
    }

    if (user.gender === 'M') {
        nickColour = '#0066FF';
    } else if (user.gender === 'F') {
        nickColour = '#FF00FF';
    }

    nickColourCache[nickLower] = nickColour;

    return nickColour;
}
