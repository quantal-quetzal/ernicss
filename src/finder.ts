// File: src/finder.ts
import * as vscode from "vscode";
import * as path from "path";
import { log } from "./logger";

/**
 * Searches for the utility.css file in a predefined order.
 */
export async function findUtilityCss(
  configuredPath?: string
): Promise<vscode.Uri | undefined> {
  const pathsToTry: string[] = [];

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
    log("⚠️ No workspace folder found");
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

    log(`🔍 Checking path: ${uri.fsPath}`);
    try {
      await vscode.workspace.fs.stat(uri);
      log(`✅ Found file at: ${uri.fsPath}`);
      return uri;
    } catch {
      log(`❌ Not found: ${uri.fsPath}`);
    }
  }

  return undefined;
}
