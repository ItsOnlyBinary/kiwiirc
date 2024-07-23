const path = require('path');

const entry = 'window._kiwi_exports';

function accessorString(value) {
    const childProperties = value.split('.');
    let propertyString = entry;
    let result = '';

    for (let i = 0; i < childProperties.length; i++) {
        if (i > 0) result += `if(!${propertyString}) ${propertyString} = {};\n`;
        propertyString += `[${JSON.stringify(childProperties[i])}]`;
    }

    result += `${propertyString}`;
    return result;
}

module.exports = function processSource(source, map) {
    if (source.includes("'kiwi public'")) {
        let resource = this.resourcePath;
        const pos = resource.lastIndexOf(path.sep + 'src' + path.sep);
        if (pos !== -1) {
            resource = resource.substring(pos + 5);
        }
        resource = resource.split(path.sep).join('.');
        resource = resource.replace(/\.(vue|js)$/, '');

        let appendCode = `\n${entry} = ${entry} || {};\n`;
        appendCode += `${accessorString(resource)};\n`;
        appendCode += `${entry}.${resource} = exports.default ? exports.default : exports;\n`;

        // Use `this.callback` to maintain source maps
        this.callback(null, source + appendCode, map);
        return;
    }

    // Pass source and map unchanged if no modification is needed
    this.callback(null, source, map);
};
