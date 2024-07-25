/* eslint-disable no-cond-assign */

const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve('src/');
const outputFile = path.resolve('src/libs/iconLibrary.js');

const fileRegex = /\.(vue|js)$/;

const htmlRegex = /<(?:SvgIcon|svg-icon).*?\sicon=["']([^"']+)["']/gsi;
const commentRegex = /(?:\/\/|<!--|\/*)\s*svg[\s-]icons?: (.+?)\s*(?:;|-->|\*\/|$)/gmi;

module.exports = class ImportIconsPlugin {
    apply(compiler) {
        const pluginName = this.constructor.name;
        let errors = [];

        compiler.hooks.beforeRun.tapAsync(pluginName, (compilation, callback) => {
            // run in build mode
            errors = [];
            parseIcons(errors, callback);
        });

        compiler.hooks.watchRun.tapAsync(pluginName, (compilation, callback) => {
            // run in dev mode
            errors = [];
            parseIcons(errors, callback);
        });

        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            compilation.errors.push(...errors);
        });
    }
};

const types = {
    'fa': 'solid',
    'fas': 'solid',
    'fa-solid': 'solid',
    'far': 'regular',
    'fa-regular': 'regular',
};

const typesReverse = {
    solid: 'fas',
    regular: 'far',
};

async function parseIcons(errors, callback) {
    const files = getFiles(sourceDir);
    const allIcons = Object.create(null);
    const awaitPromises = new Set();

    files.forEach((filePath) => {
        const promise = new Promise((resolve) => {
            const data = fs.readFileSync(filePath);

            let result;

            // Find icons in html
            while ((result = htmlRegex.exec(data)) !== null) {
                const icon = (result[1] || '').trim();
                if (icon) {
                    allIcons[icon] = true;
                }
            }

            // Find icons comments
            while ((result = commentRegex.exec(data)) !== null) {
                const icons = (result[1] || '').split(/,\s*/);
                icons.forEach((_icon) => {
                    const icon = _icon.trim();
                    if (icon) {
                        allIcons[icon] = true;
                    }
                });
            }

            resolve();
        });

        awaitPromises.add(promise);
    });

    await Promise.all(awaitPromises);

    const allTypes = Object.create(null);
    Object.keys(allIcons).forEach((icon) => {
        const iconParts = icon.split(/\s+/);
        let iconObj;
        iconParts.forEach((iconPart) => {
            if (types.hasOwnProperty(iconPart)) {
                iconObj = {
                    type: types[iconPart],
                };
                return;
            }

            const strParts = iconPart.split('-');
            const iconType = strParts.shift();
            if (!iconObj?.type && types.hasOwnProperty(iconType)) {
                iconObj = {
                    type: types[iconType],
                };
            }

            if (!iconObj) {
                errors.push(new Error(`Error: failed to parse icon "${iconParts.join(' ')}"`));
                return;
            }

            const iconName = titleCase(strParts.join('-'));
            const iconFile = path.resolve(`node_modules/@fortawesome/free-${iconObj.type}-svg-icons/fa${iconName}.js`);
            if (!fs.existsSync(iconFile)) {
                errors.push(new Error(`Error: iconFile does not exist "@fortawesome/free-${iconObj.type}-svg-icons/fa${iconName}.js"`));
                return;
            }

            iconObj.icon = iconName;
        });

        if (iconObj && iconObj.icon) {
            if (!allTypes[iconObj.type]) {
                allTypes[iconObj.type] = {};
            }
            allTypes[iconObj.type][iconObj.icon] = true;
        }
    });

    writeFile(allTypes);

    callback();
}

function writeFile(allTypes) {
    let outContent = '/*\n    --== DO NOT EDIT ==--\n\n    This file is auto generated\n*/\n\n';

    Object.keys(allTypes).forEach((type) => {
        Object.keys(allTypes[type]).sort().forEach((iconName) => {
            outContent += `import { fa${iconName} as ${typesReverse[type]}${iconName} } from '@fortawesome/free-${type}-svg-icons/fa${iconName}';\n`;
        });
        outContent += '\n';
    });

    outContent += 'import { library } from \'@fortawesome/fontawesome-svg-core\';\n\n';
    outContent += 'library.add(\n';

    Object.keys(allTypes).forEach((type) => {
        Object.keys(allTypes[type]).sort().forEach((iconName) => {
            outContent += `    ${typesReverse[type]}${iconName},\n`;
        });
    });

    outContent += ');\n';

    writeIfChanged(outputFile, outContent);
}

function writeIfChanged(file, _data) {
    const data = Buffer.from(_data);
    if (fs.existsSync(file) && data.equals(fs.readFileSync(file))) {
        return;
    }

    fs.writeFileSync(file, data);
}

function getFiles(sourceDir) {
    const files = [];

    const readDir = (dirPath) => fs.readdirSync(dirPath).forEach((name) => {
        const entry = path.join(dirPath, name);
        fs.lstatSync(entry).isDirectory() ? readDir(entry) : files.push(entry);
    });

    readDir(sourceDir);

    return files.filter(
        (file) => (fileRegex.test(file) && file !== outputFile)
    );
}

function titleCase(str) {
    return str.replace(/(?:\b|-)(\w)/g, (match, p1) => p1.toUpperCase());
}
