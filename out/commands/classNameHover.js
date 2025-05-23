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
exports.registerClassNameHover = registerClassNameHover;
// File: src/commands/classNameHover.ts
const vscode = __importStar(require("vscode"));
const tailwind_json_1 = __importDefault(require("../data/tailwind.json"));
const finder_1 = require("../finder");
const config_1 = require("../config");
const logger_1 = require("../logger");
const classNameCompletion_1 = require("./classNameCompletion");
const staticTailwindMap = new Map(Object.entries(tailwind_json_1.default));
let classMap = null;
/** Load (or reload) the CSS map from utility.css on demand */
async function ensureClassMap() {
    if (classMap) {
        return;
    }
    const configured = (0, config_1.getConfiguredUtilityPath)();
    const uri = await (0, finder_1.findUtilityCss)(configured);
    if (!uri) {
        (0, logger_1.log)("⚠️ hover: utility.css not found");
        classMap = new Map();
        return;
    }
    try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const css = Buffer.from(bytes).toString("utf8");
        classMap = (0, classNameCompletion_1.parseCssClasses)(css);
        (0, logger_1.log)(`🛈 hover: parsed ${classMap.size} utility classes`);
    }
    catch (e) {
        (0, logger_1.log)(`❌ hover: error reading CSS: ${e}`);
        classMap = new Map();
    }
}
function registerClassNameHover(context) {
    const selector = [
        { language: "javascriptreact", scheme: "file" },
        { language: "typescriptreact", scheme: "file" },
    ];
    const provider = {
        async provideHover(document, position) {
            const line = document.lineAt(position.line).text;
            if (!/classNames?=/.test(line)) {
                return null;
            }
            const wordRange = document.getWordRangeAtPosition(position, /[\w-]+/);
            if (!wordRange) {
                return null;
            }
            const word = document.getText(wordRange);
            await ensureClassMap();
            // First try workspace utility.css
            let body = classMap?.get(word);
            // If not found there, fallback to staticTailwindMap
            if (!body) {
                body = staticTailwindMap.get(word);
            }
            if (!body) {
                return null;
            }
            const md = new vscode.MarkdownString(undefined, true);
            md.appendMarkdown(`**.${word}**\n\n`);
            md.appendCodeblock(`.${word} { ${body} }`, "css");
            md.isTrusted = true;
            return new vscode.Hover(md, wordRange);
        },
    };
    const disp = vscode.languages.registerHoverProvider(selector, provider);
    context.subscriptions.push(disp);
    (0, logger_1.log)("✅ ClassName hover provider registered (raw CSS code block, static+dynamic)");
}
//# sourceMappingURL=classNameHover.js.map