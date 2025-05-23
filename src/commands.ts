// File: src/commands.ts
import * as vscode from "vscode";
import { findUtilityCss } from "./finder";
import { getConfiguredUtilityPath } from "./config";
import { log } from "./logger";

/**
 * Registers all extension commands.
 */
export function registerCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "ernicss.showUtilityCssPath",
    async () => {
      const configuredPath = getConfiguredUtilityPath();
      log(`Configured utility.css path: "${configuredPath ?? ""}"`);

      const found = await findUtilityCss(configuredPath);
      if (found) {
        vscode.window.showInformationMessage(`Utility CSS found at: ${found}`);
        log(`ℹ️ Reported utility.css at ${found}`);
      } else {
        vscode.window.showErrorMessage("utility.css not found");
        log("⚠️ utility.css not found");
      }
    }
  );

  context.subscriptions.push(disposable);
}
