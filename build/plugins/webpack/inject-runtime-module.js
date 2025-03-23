
/* eslint-disable */
const webpack = require('webpack');
const { RuntimeModule, RuntimeGlobals, Template } = webpack;

class InjectRuntimeModule extends RuntimeModule {
    constructor() {
        super('inject runtime module', RuntimeModule.STAGE_BASIC);
    }

    /**
     * @returns {string | null} runtime code
     */
    generate() {
        return Template.getFunctionContent(
			require("./inject-runtime.js")
		)
			.replace(
				/\$interceptModuleExecution\$/g,
				RuntimeGlobals.interceptModuleExecution
			)
			.replace(/\$moduleCache\$/g, RuntimeGlobals.moduleCache);
    }
}

module.exports = InjectRuntimeModule;
