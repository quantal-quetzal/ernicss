"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// File: src/extension.ts
const vscode = __importStar(require("vscode"));
const logger_1 = require("./logger");
const config_1 = require("./config");
const finder_1 = require("./finder");
const showUtilityCssPath_1 = require("./commands/showUtilityCssPath");
const classNameCompletion_1 = require("./commands/classNameCompletion");
const classNameHover_1 = require("./commands/classNameHover");
const classNameDiagnostics_1 = require("./commands/classNameDiagnostics");
/**
 * Called when the extension is activated.
 */
function activate(context) {
    logger_1.output.show(true);
    (0, logger_1.log)("✅ ernicss extension activated");
    (0, logger_1.log)("🔧 registerCommands() — about to wire up showUtilityCssPath");
    (0, showUtilityCssPath_1.registerShowUtilityCssPath)(context);
    (0, logger_1.log)("🔧 registerCommands() — about to wire up classNameCompletion");
    (0, classNameCompletion_1.registerClassNameCompletion)(context);
    (0, logger_1.log)("🔧 registerCommands() — about to wire up classNameHover");
    (0, classNameHover_1.registerClassNameHover)(context);
    (0, logger_1.log)("🔧 registerCommands() — about to wire up classNameDiagnostics");
    (0, classNameDiagnostics_1.registerClassNameDiagnostics)(context);
    (0, logger_1.log)("🔧 registerCommands() — done");
    // On activation, parse and log all available utility classes
    (async () => {
        const configured = (0, config_1.getConfiguredUtilityPath)();
        const uri = await (0, finder_1.findUtilityCss)(configured);
        if (uri) {
            try {
                const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
                watcher.onDidChange(() => {
                    (0, logger_1.log)("utility.css changed");
                    (0, classNameCompletion_1.clearClassMap)();
                });
                watcher.onDidCreate(() => {
                    (0, logger_1.log)("utility.css created");
                    (0, classNameCompletion_1.clearClassMap)();
                });
                watcher.onDidDelete(() => {
                    (0, logger_1.log)("utility.css deleted");
                    (0, classNameCompletion_1.clearClassMap)();
                });
                context.subscriptions.push(watcher);
            }
            catch (e) {
                (0, logger_1.log)(`Error reading utility.css on activation: ${e}`);
            }
        }
        else {
            (0, logger_1.log)("⚠️ utility.css not found on activation");
        }
    })();
}
/**
 * Called when the extension is deactivated.
 */
function deactivate() {
    logger_1.output.dispose();
}
//# sourceMappingURL=extension.js.map