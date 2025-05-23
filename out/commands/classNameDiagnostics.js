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
exports.registerClassNameDiagnostics = registerClassNameDiagnostics;
// File: src/commands/classNameDiagnostics.ts
const vscode = __importStar(require("vscode"));
const tailwind_json_1 = __importDefault(require("../data/tailwind.json"));
const finder_1 = require("../finder");
const config_1 = require("../config");
const logger_1 = require("../logger");
const classNameCompletion_1 = require("./classNameCompletion");
const staticTailwindMap = new Map(Object.entries(tailwind_json_1.default));
let customClassMap = null;
async function loadCustomMap() {
    if (customClassMap) {
        return customClassMap;
    }
    customClassMap = new Map();
    const configured = (0, config_1.getConfiguredUtilityPath)();
    const uri = await (0, finder_1.findUtilityCss)(configured);
    if (!uri) {
        return customClassMap;
    }
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        customClassMap = (0, classNameCompletion_1.parseCssClasses)(Buffer.from(bytes).toString("utf8"));
        (0, logger_1.log)(`🛠 Diagnostics loaded ${customClassMap.size} classes`);
    }
    catch (e) {
        (0, logger_1.log)(`❌ Diagnostics load error: ${e}`);
    }
    return customClassMap;
}
function* matchAll(re, text) {
    let m;
    while ((m = re.exec(text))) {
        yield m;
    }
}
function registerClassNameDiagnostics(context) {
    const collection = vscode.languages.createDiagnosticCollection("ernicss");
    context.subscriptions.push(collection);
    async function updateDiagnostics(doc) {
        if (!["javascriptreact", "typescriptreact"].includes(doc.languageId)) {
            collection.delete(doc.uri);
            return;
        }
        const text = doc.getText();
        const diagnostics = [];
        const customMap = await loadCustomMap();
        for (const m of matchAll(/classNames?=\s*"([^"]*)"/g, text)) {
            const classes = m[1];
            const startOff = m.index + m[0].indexOf(classes);
            for (const c of matchAll(/\b[\w-]+\b/g, classes)) {
                const name = c[0];
                if (staticTailwindMap.has(name) && !customMap.has(name)) {
                    const abs = startOff + c.index;
                    const pos = doc.positionAt(abs);
                    const range = new vscode.Range(pos, pos.translate(0, name.length));
                    const diag = new vscode.Diagnostic(range, `Utility class "${name}" exists in Tailwind but is not in utility.css`, vscode.DiagnosticSeverity.Warning);
                    diag.code = name;
                    diagnostics.push(diag);
                }
            }
        }
        collection.set(doc.uri, diagnostics);
    }
    // events
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(updateDiagnostics), vscode.workspace.onDidChangeTextDocument((e) => updateDiagnostics(e.document)), vscode.workspace.onDidSaveTextDocument(async (doc) => {
        const utilityUri = await (0, finder_1.findUtilityCss)((0, config_1.getConfiguredUtilityPath)());
        // if they just saved utility.css, clear + refresh EVERY open React doc
        if (utilityUri && doc.uri.fsPath === utilityUri.fsPath) {
            (0, classNameCompletion_1.clearClassMap)();
            for (const open of vscode.workspace.textDocuments) {
                setTimeout(() => updateDiagnostics(open), 0);
            }
        }
        // otherwise, if this is a React file, just refresh that one
        else if (["javascriptreact", "typescriptreact"].includes(doc.languageId)) {
            setTimeout(() => updateDiagnostics(doc), 0);
        }
    }));
    // quick-fix code action
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider([
        { language: "javascriptreact", scheme: "file" },
        { language: "typescriptreact", scheme: "file" },
    ], {
        provideCodeActions(document, _range, context) {
            return context.diagnostics
                .map((d) => {
                const name = d.code;
                if (!staticTailwindMap.has(name)) {
                    return null;
                }
                const title = `Add .${name} to utility.css`;
                const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
                action.diagnostics = [d];
                action.isPreferred = true;
                action.command = {
                    command: "ernicss.appendUtilityClass",
                    title,
                    arguments: [name],
                };
                return action;
            })
                .filter((a) => !!a);
        },
    }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
    // refresh command
    const refresh = vscode.commands.registerCommand("ernicss.refreshDiagnostics", async () => {
        for (const doc of vscode.workspace.textDocuments) {
            await updateDiagnostics(doc);
        }
    });
    context.subscriptions.push(refresh);
    // watch utility.css
    (async () => {
        const configured = (0, config_1.getConfiguredUtilityPath)();
        const uri = await (0, finder_1.findUtilityCss)(configured);
        if (!uri) {
            return;
        }
        const ws = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        const trig = () => {
            (0, classNameCompletion_1.clearClassMap)();
            for (const doc of vscode.workspace.textDocuments) {
                setTimeout(() => updateDiagnostics(doc), 0);
            }
        };
        ws.onDidChange(trig);
        ws.onDidCreate(trig);
        ws.onDidDelete(trig);
        context.subscriptions.push(ws);
    })();
    // initial pass
    for (const doc of vscode.workspace.textDocuments) {
        setTimeout(() => updateDiagnostics(doc), 0);
    }
}
//# sourceMappingURL=classNameDiagnostics.js.map