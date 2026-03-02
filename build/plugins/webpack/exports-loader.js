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

    // Ensure the namespace object exists so its .default and any child namespaces coexist
    result += `if(!${propertyString}) ${propertyString} = {};\n`;
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
        // Store the module as .default so it coexists with any same-named child namespaces
        appendCode += `${accessorString(resource)}.default = exports.default !== undefined ? exports.default : exports;\n`;

        // Use `this.callback` to maintain source maps
        this.callback(null, source + appendCode, map);
        return;
    }

    // Pass source and map unchanged if no modification is needed
    this.callback(null, source, map);
};
