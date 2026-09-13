import { tool } from "ai";
import { z } from "zod";
import { getGameSandbox } from "@/lib/daytona/utils";

const GAME_DIR = "/home/daytona/game";

/**
 * Resolves and strictly confines a user-supplied path to `/home/daytona/game`.
 * Strips any directory traversal and ensures paths cannot escape the game sandbox root.
 */
export function resolveSafeGamePath(inputPath: string, allowDirectory = false): string {
  if (!inputPath || typeof inputPath !== "string") {
    if (allowDirectory) {
      return GAME_DIR;
    }
    throw new Error("File path is required.");
  }

  // Normalize slashes
  let clean = inputPath.trim().replace(/\\/g, "/");

  // Strip leading GAME_DIR if already present in input
  if (clean === GAME_DIR || clean === `${GAME_DIR}/`) {
    if (allowDirectory) return GAME_DIR;
    throw new Error("A specific file path within the game directory must be provided.");
  }

  if (clean.startsWith(GAME_DIR + "/")) {
    clean = clean.slice(GAME_DIR.length + 1);
  }

  // Strip leading/trailing slashes
  clean = clean.replace(/^\/+/, "").replace(/\/+$/, "");

  // Resolve directory traversal
  const segments = clean.split("/").filter(Boolean);
  const safeSegments: string[] = [];

  for (const seg of segments) {
    if (seg === ".") continue;
    if (seg === "..") {
      safeSegments.pop();
    } else {
      safeSegments.push(seg);
    }
  }

  const resolved = `${GAME_DIR}/${safeSegments.join("/")}`.replace(/\/+$/, "");

  // Guarantee strict prefix match
  if (!resolved.startsWith(GAME_DIR)) {
    throw new Error(`Security violation: Access denied. Path '${inputPath}' escapes the game directory.`);
  }

  if (!allowDirectory && resolved === GAME_DIR) {
    throw new Error("A specific file path within the game directory must be provided.");
  }

  return resolved;
}

/**
 * Creates the set of game development tools wired to a specific game's Daytona sandbox.
 */
export function createGameTools(gameId: string) {
  return {
    write_file: tool({
      description:
        "Create a new file or completely overwrite an existing file in the game directory (/home/daytona/game). Use this to write HTML, CSS, JavaScript, or game assets.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "File path relative to the game directory (e.g. 'index.html', 'style.css', 'js/game.js')"
          ),
        content: z
          .string()
          .describe("The full text content to write into the file"),
      }),
      execute: async ({ path, content }) => {
        try {
          const fullPath = resolveSafeGamePath(path, false);
          const { sandbox } = await getGameSandbox(gameId);

          const b64 = Buffer.from(content, "utf-8").toString("base64");
          const writeCmd = `mkdir -p "$(dirname "${fullPath}")" && echo "${b64}" | base64 -d > "${fullPath}"`;
          const res = await sandbox.process.executeCommand(writeCmd);

          if (res.exitCode !== 0) {
            return {
              success: false,
              error: res.result || "Failed to write file",
            };
          }

          const relativePath = fullPath.slice(GAME_DIR.length + 1);
          return {
            success: true,
            path: relativePath,
            bytesWritten: Buffer.byteLength(content, "utf-8"),
            message: `Successfully wrote ${relativePath}`,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || "Unknown error writing file",
          };
        }
      },
    }),

    replace_text: tool({
      description:
        "Replace a specific block of text in an existing file. Only the exact matching target_content will be replaced with replacement_content.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path relative to the game directory (e.g. 'index.html', 'game.js')"),
        target_content: z
          .string()
          .describe(
            "The exact text snippet in the file to replace. Must match the existing code character-for-character, including indentation."
          ),
        replacement_content: z
          .string()
          .describe("The new text snippet to insert in place of target_content"),
        allow_multiple: z
          .boolean()
          .optional()
          .describe(
            "Set to true to replace all instances. If omitted or false, target_content must appear exactly once in the file."
          ),
      }),
      execute: async ({ path, target_content, replacement_content, allow_multiple }) => {
        try {
          const fullPath = resolveSafeGamePath(path, false);
          const { sandbox } = await getGameSandbox(gameId);

          const readCmd = `[ -f "${fullPath}" ] && base64 -w 0 "${fullPath}" || echo "__NOT_FOUND__"`;
          const readRes = await sandbox.process.executeCommand(readCmd);
          const output = readRes.result?.trim() ?? "";

          if (output === "__NOT_FOUND__" || readRes.exitCode !== 0) {
            return {
              success: false,
              error: `File not found: ${path}`,
            };
          }

          const currentContent = Buffer.from(output, "base64").toString("utf-8");

          if (!currentContent.includes(target_content)) {
            return {
              success: false,
              error: `Target content not found in ${path}. Ensure whitespace, line endings, and characters match exactly.`,
            };
          }

          const occurrences = currentContent.split(target_content).length - 1;
          if (occurrences > 1 && !allow_multiple) {
            return {
              success: false,
              error: `Target content appears ${occurrences} times in ${path}. Provide more surrounding context to target a unique occurrence, or set allow_multiple: true.`,
            };
          }

          const newContent = allow_multiple
            ? currentContent.replaceAll(target_content, replacement_content)
            : currentContent.replace(target_content, replacement_content);

          const b64 = Buffer.from(newContent, "utf-8").toString("base64");
          const writeCmd = `echo "${b64}" | base64 -d > "${fullPath}"`;
          const writeRes = await sandbox.process.executeCommand(writeCmd);

          if (writeRes.exitCode !== 0) {
            return {
              success: false,
              error: writeRes.result || "Failed to update file",
            };
          }

          const relativePath = fullPath.slice(GAME_DIR.length + 1);
          return {
            success: true,
            path: relativePath,
            occurrencesReplaced: occurrences,
            message: `Successfully replaced ${occurrences} occurrence(s) in ${relativePath}`,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || "Unknown error replacing text",
          };
        }
      },
    }),

    read_file: tool({
      description:
        "Read the text content of a file in the game directory (/home/daytona/game). Use this to inspect existing HTML, CSS, JavaScript, or configuration files.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path relative to the game directory (e.g. 'index.html', 'game.js')"),
      }),
      execute: async ({ path }) => {
        try {
          const fullPath = resolveSafeGamePath(path, false);
          const { sandbox } = await getGameSandbox(gameId);

          const readCmd = `[ -f "${fullPath}" ] && base64 -w 0 "${fullPath}" || echo "__NOT_FOUND__"`;
          const res = await sandbox.process.executeCommand(readCmd);
          const output = res.result?.trim() ?? "";

          if (output === "__NOT_FOUND__" || res.exitCode !== 0) {
            return {
              success: false,
              error: `File not found: ${path}`,
            };
          }

          const content = Buffer.from(output, "base64").toString("utf-8");
          const relativePath = fullPath.slice(GAME_DIR.length + 1);

          return {
            success: true,
            path: relativePath,
            content,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || "Unknown error reading file",
          };
        }
      },
    }),

    list_files: tool({
      description:
        "List files and directories in the game directory (/home/daytona/game) or in a specific subdirectory.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Subdirectory relative to the game directory to inspect (defaults to root game directory)"
          ),
        recursive: z
          .boolean()
          .optional()
          .describe("Whether to list files recursively in subdirectories (defaults to true)"),
      }),
      execute: async ({ path, recursive = true }) => {
        try {
          const fullDir = resolveSafeGamePath(path || "", true);
          const { sandbox } = await getGameSandbox(gameId);

          const pythonScript = `
import os, sys, json

base = sys.argv[1]
recursive = sys.argv[2] == 'true'

if not os.path.exists(base):
    print(json.dumps({"error": f"Directory not found: {base}"}))
    sys.exit(0)

entries = []
if recursive:
    for root, dirs, files in os.walk(base):
        for d in sorted(dirs):
            full = os.path.join(root, d)
            rel = os.path.relpath(full, base)
            entries.append({"name": d, "path": rel, "type": "directory"})
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, base)
            try:
                size = os.path.getsize(full)
            except:
                size = 0
            entries.append({"name": f, "path": rel, "type": "file", "size": size})
else:
    for item in sorted(os.listdir(base)):
        full = os.path.join(base, item)
        is_dir = os.path.isdir(full)
        size = 0 if is_dir else os.path.getsize(full)
        entries.append({
            "name": item,
            "path": item,
            "type": "directory" if is_dir else "file",
            "size": size
        })

print(json.dumps({"entries": entries}))
`;
          const b64Script = Buffer.from(pythonScript, "utf-8").toString("base64");
          const cmd = `python3 -c "$(echo "${b64Script}" | base64 -d)" "${fullDir}" "${recursive ? "true" : "false"}"`;
          const res = await sandbox.process.executeCommand(cmd);

          const parsed = JSON.parse(res.result?.trim() || "{}");
          if (parsed.error) {
            return {
              success: false,
              error: parsed.error,
            };
          }

          const relativeDir = fullDir === GAME_DIR ? "" : fullDir.slice(GAME_DIR.length + 1);
          return {
            success: true,
            directory: relativeDir || ".",
            files: parsed.entries || [],
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || "Unknown error listing files",
          };
        }
      },
    }),

    delete_file: tool({
      description:
        "Delete a file or subdirectory in the game directory (/home/daytona/game).",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "Path to the file or directory relative to /home/daytona/game to delete"
          ),
      }),
      execute: async ({ path }) => {
        try {
          const fullPath = resolveSafeGamePath(path, false);
          if (fullPath === GAME_DIR || fullPath === `${GAME_DIR}/`) {
            return {
              success: false,
              error: "Cannot delete the root game directory.",
            };
          }

          const { sandbox } = await getGameSandbox(gameId);
          const deleteCmd = `if [ -e "${fullPath}" ]; then rm -rf "${fullPath}" && echo "deleted"; else echo "not_found"; fi`;
          const res = await sandbox.process.executeCommand(deleteCmd);
          const output = res.result?.trim();

          if (output === "not_found") {
            return {
              success: false,
              error: `File or directory not found: ${path}`,
            };
          }

          const relativePath = fullPath.slice(GAME_DIR.length + 1);
          return {
            success: true,
            path: relativePath,
            message: `Successfully deleted ${relativePath}`,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || "Unknown error deleting file",
          };
        }
      },
    }),
  };
}

export type GameTools = ReturnType<typeof createGameTools>;
