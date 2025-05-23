// File: src/config.ts
import * as vscode from "vscode";

/**
 * Reads the configured utility.css path from settings.
 */
export function getConfiguredUtilityPath(): string | undefined {
  const config = vscode.workspace.getConfiguration("erni");
  const utilityConfig = config.get<{ css?: string }>("utility", {});
  return utilityConfig.css?.trim();
}
