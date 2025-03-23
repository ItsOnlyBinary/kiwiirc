/* eslint-disable */

const InjectRuntimeModule = require('./inject-runtime-module.js');
const webpack = require('webpack');
const { RuntimeModule, RuntimeGlobals } = webpack;

const PLUGIN_NAME = 'InjectModulesPlugin';

module.exports = class InjectModulesPlugin {
    apply(compiler) {
        compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
                compilation.hooks.additionalTreeRuntimeRequirements.tap(
					PLUGIN_NAME,
					(chunk, runtimeRequirements) => {

						runtimeRequirements.add(RuntimeGlobals.interceptModuleExecution);
						runtimeRequirements.add(RuntimeGlobals.moduleCache);
                        compilation.addRuntimeModule(
							chunk,
							new InjectRuntimeModule()
						);
                    }
				);
            }
        );
    }
}
