// File: src/commands/classNameHover.ts
import * as vscode from "vscode";
import customData from "../data/tailwind.json";
import { findUtilityCss } from "../finder";
import { getConfiguredUtilityPath } from "../config";
import { log } from "../logger";
import { parseCssClasses } from "./classNameCompletion";

const staticTailwindMap = new Map<string, string>(
  Object.entries(customData) as [string, string][]
);

let classMap: Map<string, string> | null = null;

/** Load (or reload) the CSS map from utility.css on demand */
async function ensureClassMap() {
  if (classMap) {
    return;
  }
  const configured = getConfiguredUtilityPath();
  const uri = await findUtilityCss(configured);
  if (!uri) {
    log("⚠️ hover: utility.css not found");
    classMap = new Map();
    return;
  }
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const css = Buffer.from(bytes).toString("utf8");
    classMap = parseCssClasses(css);
    log(`🛈 hover: parsed ${classMap.size} utility classes`);
  } catch (e) {
    log(`❌ hover: error reading CSS: ${e}`);
    classMap = new Map();
  }
}

export function registerClassNameHover(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = [
    { language: "javascriptreact", scheme: "file" },
    { language: "typescriptreact", scheme: "file" },
  ];

  const provider: vscode.HoverProvider = {
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
  log(
    "✅ ClassName hover provider registered (raw CSS code block, static+dynamic)"
  );
}
