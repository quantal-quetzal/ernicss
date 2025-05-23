// File: src/commands/classNameCompletion.ts
import * as vscode from "vscode";
import customData from "../data/tailwind.json";
import { findUtilityCss } from "../finder";
import { getConfiguredUtilityPath } from "../config";
import { log } from "../logger";

/**
 * Parses CSS content into a map of className -> CSS rule text.
 */
export function parseCssClasses(css: string): Map<string, string> {
  const map = new Map<string, string>();
  const regex = /\.([\w-]+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(css))) {
    const name = match[1];
    const body = match[2].trim();
    map.set(name, body);
  }
  return map;
}

// 1) Static Tailwind map
const staticTailwindMap = new Map<string, string>(
  Object.entries(customData) as [string, string][]
);

// 2) Cache for your workspace’s utility.css classes
let customClassMap: Map<string, string> | null = null;

export function clearClassMap() {
  customClassMap = null;
  log("🔄 utility.css cache cleared");
}

async function loadCustomMap(): Promise<Map<string, string>> {
  if (customClassMap) {
    return customClassMap;
  }
  customClassMap = new Map<string, string>();
  const configured = getConfiguredUtilityPath();
  const uri = await findUtilityCss(configured);
  if (!uri) {
    log("⚠️ loadCustomMap: utility.css not found");
    return customClassMap;
  }
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const css = Buffer.from(bytes).toString("utf8");
    const regex = /\.([\w-]+)\s*\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(css))) {
      customClassMap.set(m[1], m[2].trim());
    }
    log(`🛠 Loaded ${customClassMap.size} classes from utility.css`);
  } catch (e) {
    log(`❌ loadCustomMap error: ${e}`);
  }
  return customClassMap;
}

export function registerClassNameCompletion(context: vscode.ExtensionContext) {
  const appendCmd = vscode.commands.registerCommand(
    "ernicss.appendUtilityClass",
    async (className: string) => {
      // 1) Ensure we have the latest custom map
      const customMap = await loadCustomMap();
      // 2) If it’s already defined, bail out
      if (customMap.has(className)) {
        log(`ℹ️ .${className} already exists in utility.css — skipping append`);
        return;
      }

      // 3) Otherwise, append as before
      const cssBody = staticTailwindMap.get(className);
      if (!cssBody) {
        return;
      }
      const rule = `\n.${className} { ${cssBody} }\n`;
      const configured = getConfiguredUtilityPath();
      const uri = await findUtilityCss(configured);
      if (!uri) {
        log(`⚠️ can't append .${className} – utility.css not found`);
        return;
      }
      // Prefer in‐editor buffer when open
      const doc =
        vscode.workspace.textDocuments.find(
          (d) => d.uri.fsPath === uri.fsPath
        ) ?? (await vscode.workspace.openTextDocument(uri));
      const edit = new vscode.WorkspaceEdit();
      edit.insert(uri, new vscode.Position(doc.lineCount, 0), rule);
      await vscode.workspace.applyEdit(edit);
      log(`➕ Appended .${className} to ${uri.fsPath}`);
      clearClassMap();

      // immediately save the in-editor buffer (if open) so on-disk matches
      const openDoc = vscode.workspace.textDocuments.find(
        (d) => d.uri.fsPath === uri.fsPath
      );
      if (openDoc) {
        await openDoc.save();
      }

      // 4) Refresh diagnostics so the warning disappears
      await vscode.commands.executeCommand("ernicss.refreshDiagnostics");
    }
  );
  context.subscriptions.push(appendCmd);

  const provider: vscode.CompletionItemProvider = {
    async provideCompletionItems(document, position) {
      const line = document.lineAt(position.line).text;
      if (!/classNames?=/.test(line)) {
        return null;
      }

      const customMap = await loadCustomMap();
      const allEntries: [string, string][] = [
        ...Array.from(customMap.entries()),
        ...Array.from(staticTailwindMap.entries()).filter(
          ([name]) => !customMap.has(name)
        ),
      ];

      const wr = document.getWordRangeAtPosition(position, /[\w-]+/);
      const prefix = wr ? document.getText(wr) : "";

      return allEntries
        .filter(([name]) => name.startsWith(prefix))
        .map(([name, body]) => {
          const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Variable
          );
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

  const selector: vscode.DocumentSelector = [
    { language: "javascriptreact", scheme: "file" },
    { language: "typescriptreact", scheme: "file" },
  ];
  const triggers = '"abcdefghijklmnopqrstuvwxyz-'.split("");

  const disp = vscode.languages.registerCompletionItemProvider(
    selector,
    provider,
    ...triggers
  );
  context.subscriptions.push(disp);
  log("✅ ClassName completion provider registered");
}
