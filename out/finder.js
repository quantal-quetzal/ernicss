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
exports.findUtilityCss = findUtilityCss;
// File: src/finder.ts
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
/**
 * Searches for the utility.css file in a predefined order.
 */
async function findUtilityCss(configuredPath) {
    const pathsToTry = [];
    if (configuredPath) {
        let p = configuredPath;
        if (p.startsWith("./")) {
            p = p.substring(2);
        }
        pathsToTry.push(p);
    }
    pathsToTry.push("src/styles/utility.css", "src/utility.css", "utility.css");
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
        (0, logger_1.log)("⚠️ No workspace folder found");
        return undefined;
    }
    const root = folders[0].uri;
    for (let relPath of pathsToTry) {
        if (relPath.includes("${workspaceFolder}")) {
            relPath = relPath.replace(/\$\{workspaceFolder\}/g, root.fsPath);
        }
        const uri = path.isAbsolute(relPath)
            ? vscode.Uri.file(relPath)
            : vscode.Uri.joinPath(root, relPath);
        (0, logger_1.log)(`🔍 Checking path: ${uri.fsPath}`);
        try {
            await vscode.workspace.fs.stat(uri);
            (0, logger_1.log)(`✅ Found file at: ${uri.fsPath}`);
            return uri;
        }
        catch {
            (0, logger_1.log)(`❌ Not found: ${uri.fsPath}`);
        }
    }
    return undefined;
}
//# sourceMappingURL=finder.js.map