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
exports.registerShowUtilityCssPath = registerShowUtilityCssPath;
// File: src/commands/showUtilityCssPath.ts
const vscode = __importStar(require("vscode"));
const finder_1 = require("../finder");
const config_1 = require("../config");
const logger_1 = require("../logger");
/**
 * Command: showUtilityCssPath
 * Displays the resolved path of utility.css to the user.
 */
function registerShowUtilityCssPath(context) {
    const disposable = vscode.commands.registerCommand("ernicss.showUtilityCssPath", async () => {
        const configuredPath = (0, config_1.getConfiguredUtilityPath)();
        (0, logger_1.log)(`Configured utility.css path: "${configuredPath ?? ""}"`);
        const found = await (0, finder_1.findUtilityCss)(configuredPath);
        if (found) {
            vscode.window.showInformationMessage(`Utility CSS found at: ${found.fsPath}`);
            (0, logger_1.log)(`ℹ️ Reported utility.css at ${found.fsPath}`);
        }
        else {
            vscode.window.showErrorMessage("utility.css not found");
            (0, logger_1.log)("⚠️ utility.css not found");
        }
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=showUtilityCssPath.js.map