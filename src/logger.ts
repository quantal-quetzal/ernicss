// File: src/logger.ts
import * as vscode from "vscode";

/**
 * Shared output channel for logging.
 */
export const output = vscode.window.createOutputChannel("erni");

/**
 * Log a message to the output channel.
 */
export function log(message: string) {
  output.appendLine(message);
}
