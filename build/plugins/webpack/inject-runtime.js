/* eslint-disable */
"use strict";

var $interceptModuleExecution$ = undefined;
var $moduleCache$ = undefined;

module.exports = function () {
    // var installedModules = $moduleCache$;

    // console.log('installedModules', JSON.stringify(installedModules));
    // console.dir(installedModules, { depth: null, showHidden: true });

    $interceptModuleExecution$.push(function (options) {
		var module = options.module;
        if (module?.id?.startsWith('./src/')) {
            console.log('module', module);
        }
    });
};
