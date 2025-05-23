// File: src/commands/classNameDiagnostics.ts
import * as vscode from "vscode";
import customData from "../data/tailwind.json";
import { findUtilityCss } from "../finder";
import { getConfiguredUtilityPath } from "../config";
import { log } from "../logger";
import { parseCssClasses, clearClassMap } from "./classNameCompletion";

const staticTailwindMap = new Map<string, string>(
  Object.entries(customData) as [string, string][]
);

let customClassMap: Map<string, string> | null = null;
async function loadCustomMap(): Promise<Map<string, string>> {
  if (customClassMap) {
    return customClassMap;
  }
  customClassMap = new Map<string, string>();
  const configured = getConfiguredUtilityPath();
  const uri = await findUtilityCss(configured);
  if (!uri) {
    return customClassMap;
  }
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    customClassMap = parseCssClasses(Buffer.from(bytes).toString("utf8"));
    log(`🛠 Diagnostics loaded ${customClassMap.size} classes`);
  } catch (e) {
    log(`❌ Diagnostics load error: ${e}`);
  }
  return customClassMap;
}

function* matchAll(re: RegExp, text: string) {
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    yield m;
  }
}

export function registerClassNameDiagnostics(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("ernicss");
  context.subscriptions.push(collection);

  async function updateDiagnostics(doc: vscode.TextDocument) {
    if (!["javascriptreact", "typescriptreact"].includes(doc.languageId)) {
      collection.delete(doc.uri);
      return;
    }
    const text = doc.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    const customMap = await loadCustomMap();

    for (const m of matchAll(/classNames?=\s*"([^"]*)"/g, text)) {
      const classes = m[1];
      const startOff = m.index + m[0].indexOf(classes);
      for (const c of matchAll(/\b[\w-]+\b/g, classes)) {
        const name = c[0];
        if (staticTailwindMap.has(name) && !customMap.has(name)) {
          const abs = startOff + c.index!;
          const pos = doc.positionAt(abs);
          const range = new vscode.Range(pos, pos.translate(0, name.length));
          const diag = new vscode.Diagnostic(
            range,
            `Utility class "${name}" exists in Tailwind but is not in utility.css`,
            vscode.DiagnosticSeverity.Warning
          );
          diag.code = name;
          diagnostics.push(diag);
        }
      }
    }
    collection.set(doc.uri, diagnostics);
  }

  // events
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateDiagnostics),
    vscode.workspace.onDidChangeTextDocument((e) =>
      updateDiagnostics(e.document)
    ),
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const utilityUri = await findUtilityCss(getConfiguredUtilityPath());
      // if they just saved utility.css, clear + refresh EVERY open React doc
      if (utilityUri && doc.uri.fsPath === utilityUri.fsPath) {
        clearClassMap();
        for (const open of vscode.workspace.textDocuments) {
          setTimeout(() => updateDiagnostics(open), 0);
        }
      }
      // otherwise, if this is a React file, just refresh that one
      else if (
        ["javascriptreact", "typescriptreact"].includes(doc.languageId)
      ) {
        setTimeout(() => updateDiagnostics(doc), 0);
      }
    })
  );

  // quick-fix code action
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { language: "javascriptreact", scheme: "file" },
        { language: "typescriptreact", scheme: "file" },
      ],
      {
        provideCodeActions(document, _range, context) {
          return context.diagnostics
            .map((d) => {
              const name = d.code as string;
              if (!staticTailwindMap.has(name)) {
                return null;
              }
              const title = `Add .${name} to utility.css`;
              const action = new vscode.CodeAction(
                title,
                vscode.CodeActionKind.QuickFix
              );
              action.diagnostics = [d];
              action.isPreferred = true;
              action.command = {
                command: "ernicss.appendUtilityClass",
                title,
                arguments: [name],
              };
              return action;
            })
            .filter((a): a is vscode.CodeAction => !!a);
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // refresh command
  const refresh = vscode.commands.registerCommand(
    "ernicss.refreshDiagnostics",
    async () => {
      for (const doc of vscode.workspace.textDocuments) {
        await updateDiagnostics(doc);
      }
    }
  );
  context.subscriptions.push(refresh);

  // watch utility.css
  (async () => {
    const configured = getConfiguredUtilityPath();
    const uri = await findUtilityCss(configured);
    if (!uri) {
      return;
    }
    const ws = vscode.workspace.createFileSystemWatcher(uri.fsPath);
    const trig = () => {
      clearClassMap();
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
