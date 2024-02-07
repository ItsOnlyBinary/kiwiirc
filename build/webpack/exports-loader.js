const path = require('path');

const entry = 'window._kiwi_exports';

function accesorString(value) {
    const childProperties = value.split('.');
    let propertyString = entry;
    let result = '';

    for (let i = 0; i <= childProperties.length; i++) {
        if (i > 0) result += `if(!${propertyString}) ${propertyString} = {};\n`;
        if (i === childProperties.length) {
            propertyString += '["##root"]';
        } else {
            propertyString += `[${JSON.stringify(childProperties[i])}]`;
        }
    }

    result += `${propertyString}`;
    return result;
}

module.exports = function(source) {
    if (source.indexOf('\'kiwi public\'') > -1) {
        let resource = this.resourcePath;
        let pos = resource.lastIndexOf(path.sep + 'src' + path.sep);
        resource = resource.substr(pos + 5);
        resource = resource.split(path.sep).join('.');
        resource = resource.replace(/\.(vue|js)$/, '');

        let a = '\r\n';
        a += `${entry} = ${entry} || {};\r\n`;
        a += accesorString(resource);
        a += ' = exports.default ? exports.default : exports;\r\n';
        source += a;
    }

    return source;
};
