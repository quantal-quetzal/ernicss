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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCssClasses = parseCssClasses;
exports.clearClassMap = clearClassMap;
exports.registerClassNameCompletion = registerClassNameCompletion;
// File: src/commands/classNameCompletion.ts
const vscode = __importStar(require("vscode"));
const tailwind_json_1 = __importDefault(require("../data/tailwind.json"));
const finder_1 = require("../finder");
const config_1 = require("../config");
const logger_1 = require("../logger");
/**
 * Parses CSS content into a map of className -> CSS rule text.
 */
function parseCssClasses(css) {
    const map = new Map();
    const regex = /\.([\w-]+)\s*\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(css))) {
        const name = match[1];
        const body = match[2].trim();
        map.set(name, body);
    }
    return map;
}
// 1) Static Tailwind map
const staticTailwindMap = new Map(Object.entries(tailwind_json_1.default));
// 2) Cache for your workspace’s utility.css classes
let customClassMap = null;
function clearClassMap() {
    customClassMap = null;
    (0, logger_1.log)("🔄 utility.css cache cleared");
}
async function loadCustomMap() {
    if (customClassMap) {
        return customClassMap;
    }
    customClassMap = new Map();
    const configured = (0, config_1.getConfiguredUtilityPath)();
    const uri = await (0, finder_1.findUtilityCss)(configured);
    if (!uri) {
        (0, logger_1.log)("⚠️ loadCustomMap: utility.css not found");
        return customClassMap;
    }
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const css = Buffer.from(bytes).toString("utf8");
        const regex = /\.([\w-]+)\s*\{([^}]+)\}/g;
        let m;
        while ((m = regex.exec(css))) {
            customClassMap.set(m[1], m[2].trim());
        }
        (0, logger_1.log)(`🛠 Loaded ${customClassMap.size} classes from utility.css`);
    }
    catch (e) {
        (0, logger_1.log)(`❌ loadCustomMap error: ${e}`);
    }
    return customClassMap;
}
function registerClassNameCompletion(context) {
    const appendCmd = vscode.commands.registerCommand("ernicss.appendUtilityClass", async (className) => {
        // 1) Ensure we have the latest custom map
        const customMap = await loadCustomMap();
        // 2) If it’s already defined, bail out
        if (customMap.has(className)) {
            (0, logger_1.log)(`ℹ️ .${className} already exists in utility.css — skipping append`);
            return;
        }
        // 3) Otherwise, append as before
        const cssBody = staticTailwindMap.get(className);
        if (!cssBody) {
            return;
        }
        const rule = `\n.${className} { ${cssBody} }\n`;
        const configured = (0, config_1.getConfiguredUtilityPath)();
        const uri = await (0, finder_1.findUtilityCss)(configured);
        if (!uri) {
            (0, logger_1.log)(`⚠️ can't append .${className} – utility.css not found`);
            return;
        }
        // Prefer in‐editor buffer when open
        const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath) ?? (await vscode.workspace.openTextDocument(uri));
        const edit = new vscode.WorkspaceEdit();
        edit.insert(uri, new vscode.Position(doc.lineCount, 0), rule);
        await vscode.workspace.applyEdit(edit);
        (0, logger_1.log)(`➕ Appended .${className} to ${uri.fsPath}`);
        clearClassMap();
        // immediately save the in-editor buffer (if open) so on-disk matches
        const openDoc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
        if (openDoc) {
            await openDoc.save();
        }
        // 4) Refresh diagnostics so the warning disappears
        await vscode.commands.executeCommand("ernicss.refreshDiagnostics");
    });
    context.subscriptions.push(appendCmd);
    const provider = {
        async provideCompletionItems(document, position) {
            const line = document.lineAt(position.line).text;
            if (!/classNames?=/.test(line)) {
                return null;
            }
            const customMap = await loadCustomMap();
            const allEntries = [
                ...Array.from(customMap.entries()),
                ...Array.from(staticTailwindMap.entries()).filter(([name]) => !customMap.has(name)),
            ];
            const wr = document.getWordRangeAtPosition(position, /[\w-]+/);
            const prefix = wr ? document.getText(wr) : "";
            return allEntries
                .filter(([name]) => name.startsWith(prefix))
                .map(([name, body]) => {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
                item.detail = body;
                item.insertText = name;
                item.command = {
                    command: "ernicss.appendUtilityClass",
                    title: "Append to utility.css",
                    arguments: [name],
                };
                return item;
            });
        },
    };
    const selector = [
        { language: "javascriptreact", scheme: "file" },
        { language: "typescriptreact", scheme: "file" },
    ];
    const triggers = '"abcdefghijklmnopqrstuvwxyz-'.split("");
    const disp = vscode.languages.registerCompletionItemProvider(selector, provider, ...triggers);
    context.subscriptions.push(disp);
    (0, logger_1.log)("✅ ClassName completion provider registered");
}
//# sourceMappingURL=classNameCompletion.js.map