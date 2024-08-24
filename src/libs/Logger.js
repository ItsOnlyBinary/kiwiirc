'kiwi public';

// eslint-disable-next-line
import callsite from 'callsite';

const defaultLogger = makeLogger();
export default defaultLogger;
function makeLogger(label, rootLogger) {
    function logger(...args) {
        logger.info(...args);
    }

    logger.LEVEL_DEBUG = 2;
    logger.LEVEL_INFO = 1;
    logger.LEVEL_ERROR = 0;
    logger.level = logger.LEVEL_ERROR;
    logger.source = false;
    function getSrc() {
        /**
         * @type {import('callsite')}
         */
        const stack = callsite();
        const entry = stack[2];
        const line = entry?.getLineNumber?.();
        const column = entry?.getColumnNumber?.();
        return [entry?.getFileName?.()?.split?.('/').pop?.() || '<anonymous>', line, column].filter(Boolean).join(':');
    }
    function logLevel(compareLevel) {
        let l = rootLogger || logger;
        return l.level >= compareLevel;
    }
    function logSource() {
        const l = rootLogger || logger;
        return l.source;
    }

    logger.debug = function logDebug(...args) {
        if (logLevel(logger.LEVEL_DEBUG)) {
            if (label) {
                args[0] = `[${label}] DEBUG ${args[0]}`;
            }
            if (logSource()) args.unshift(getSrc());
            window.console.log(...args);
        }
    };

    logger.info = function logInfo(...args) {
        if (logLevel(logger.LEVEL_INFO)) {
            if (label) {
                args[0] = `[${label}] INFO ${args[0]}`;
            }
            if (logSource()) args.unshift(getSrc());
            window.console.log(...args);
        }
    };

    logger.error = function logError(...args) {
        if (logLevel(logger.LEVEL_ERROR)) {
            if (label) {
                args[0] = `[${label}] ERROR ${args[0]}`;
            }
            if (logSource()) args.unshift(getSrc());
            window.console.error(...args);
        }
    };

    logger.assert = function assert(condition, ...args) {
        if (condition) {
            return;
        }

        this.error('Assertion failed.', ...args);
    };

    logger.setLevel = function setLevel(newLevel) {
        logger.level = newLevel;
    };
    logger.enableSourceLogging = function enableSourceLogging() {
        logger.source = true;
    };
    logger.disableSourceLogging = function enableSourceLogging() {
        logger.source = false;
    };
    logger.namespace = function namespace(newLabel) {
        let l = newLabel;
        if (label) {
            l = `[${label}][${l}]`;
        }

        return makeLogger(l, logger);
    };

    return logger;
}
