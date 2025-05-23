// File: src/extension.ts
import * as vscode from "vscode";
import { log, output } from "./logger";
import { getConfiguredUtilityPath } from "./config";
import { findUtilityCss } from "./finder";
import { registerShowUtilityCssPath } from "./commands/showUtilityCssPath";
import {
  clearClassMap,
  registerClassNameCompletion,
} from "./commands/classNameCompletion";
import { registerClassNameHover } from "./commands/classNameHover";
import { registerClassNameDiagnostics } from "./commands/classNameDiagnostics";

/**
 * Called when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  output.show(true);
  log("✅ ernicss extension activated");
  log("🔧 registerCommands() — about to wire up showUtilityCssPath");
  registerShowUtilityCssPath(context);
  log("🔧 registerCommands() — about to wire up classNameCompletion");
  registerClassNameCompletion(context);
  log("🔧 registerCommands() — about to wire up classNameHover");
  registerClassNameHover(context);
  log("🔧 registerCommands() — about to wire up classNameDiagnostics");
  registerClassNameDiagnostics(context);
  log("🔧 registerCommands() — done");

  // On activation, parse and log all available utility classes
  (async () => {
    const configured = getConfiguredUtilityPath();
    const uri = await findUtilityCss(configured);
    if (uri) {
      try {
        const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        watcher.onDidChange(() => {
          log("utility.css changed");
          clearClassMap();
        });
        watcher.onDidCreate(() => {
          log("utility.css created");
          clearClassMap();
        });
        watcher.onDidDelete(() => {
          log("utility.css deleted");
          clearClassMap();
        });
        context.subscriptions.push(watcher);
      } catch (e) {
        log(`Error reading utility.css on activation: ${e}`);
      }
    } else {
      log("⚠️ utility.css not found on activation");
    }
  })();
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
  output.dispose();
}
