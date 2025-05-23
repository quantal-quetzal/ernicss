"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const showUtilityCssPath_1 = require("./showUtilityCssPath");
const classNameCompletion_1 = require("./classNameCompletion");
const logger_1 = require("../logger");
/**
 * Registers all commands for the extension.
 */
function registerCommands(context) {
    (0, logger_1.log)("🔧 registerCommands() — about to wire up showUtilityCssPath");
    (0, showUtilityCssPath_1.registerShowUtilityCssPath)(context);
    (0, logger_1.log)("🔧 registerCommands() — about to wire up classNameCompletion");
    (0, classNameCompletion_1.registerClassNameCompletion)(context);
    (0, logger_1.log)("🔧 registerCommands() — done");
}
//# sourceMappingURL=index.js.map