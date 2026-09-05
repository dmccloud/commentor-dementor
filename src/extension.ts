// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

const DEFAULT_PREVIEW_LENGTH = 80;
const DEFAULT_CONSECUTIVE_LINE_COMMENT_THRESHOLD = 5;
const FOLDING_RETRY_DELAYS_MS = [100, 500];
const BLOCK_COMMENT_LANGUAGE_IDS = [
  "c",
  "cpp",
  "csharp",
  "css",
  "dart",
  "fsharp",
  "go",
  "java",
  "javascript",
  "javascriptreact",
  "kotlin",
  "php",
  "rust",
  "sql",
  "swift",
  "typescript",
  "typescriptreact",
];
const COMMENT_LANGUAGE_IDS = [
  ...BLOCK_COMMENT_LANGUAGE_IDS,
  "haskell",
  "ini",
  "lua",
  "makefile",
  "properties",
  "python",
  "ruby",
  "shellscript",
  "toml",
  "yaml",
];

interface CommentMatch {
  startCharacter: number;
  endCharacter: number;
}

interface BlockComment {
  start: vscode.Position;
  end: vscode.Position;
  text: string;
}

/** Finds a supported single-line comment while ignoring quoted strings. */
function findComment(
  line: string,
  languageId: string,
): CommentMatch | undefined {
  const marker = lineCommentMarker(languageId);
  if (!marker) {
    return undefined;
  }
  let quote: string | undefined;
  let escaped = false;

  for (
    let character = 0;
    character <= line.length - marker.length;
    character++
  ) {
    const current = line[character];
    if (quote) {
      if (current === quote && !escaped) {
        quote = undefined;
      }
      escaped = current === "\\" && !escaped;
      if (current !== "\\") {
        escaped = false;
      }
      continue;
    }
    if (current === '"' || current === "'" || current === "`") {
      quote = current;
      continue;
    }
    if (line.startsWith(marker, character)) {
      return { startCharacter: character, endCharacter: line.length };
    }
  }
  return undefined;
}

function lineCommentMarker(languageId: string): string | undefined {
  if (
    ["python", "ruby", "shellscript", "yaml", "toml", "makefile"].includes(
      languageId,
    )
  ) {
    return "#";
  }
  if (["sql", "lua", "haskell"].includes(languageId)) {
    return "--";
  }
  if (["ini", "properties"].includes(languageId)) {
    return ";";
  }
  if (
    [
      "c",
      "cpp",
      "csharp",
      "css",
      "dart",
      "fsharp",
      "go",
      "java",
      "javascript",
      "javascriptreact",
      "kotlin",
      "php",
      "rust",
      "swift",
      "typescript",
      "typescriptreact",
    ].includes(languageId)
  ) {
    return "//";
  }
  return undefined;
}

function supportsBlockComments(languageId: string): boolean {
  return BLOCK_COMMENT_LANGUAGE_IDS.includes(languageId);
}

function findBlockComments(document: vscode.TextDocument): BlockComment[] {
  if (!supportsBlockComments(document.languageId)) {
    return [];
  }

  const comments: BlockComment[] = [];
  let start: vscode.Position | undefined;

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
    const line = document.lineAt(lineNumber).text;
    let character = 0;

    while (character < line.length) {
      if (!start) {
        const lineComment = findComment(line, document.languageId);
        const blockStart = line.indexOf("/*", character);
        if (
          blockStart === -1 ||
          (lineComment && lineComment.startCharacter < blockStart)
        ) {
          break;
        }
        start = new vscode.Position(lineNumber, blockStart);
        character = blockStart + 2;
      }

      const blockEnd = line.indexOf("*/", character);
      if (blockEnd === -1) {
        break;
      }

      const end = new vscode.Position(lineNumber, blockEnd + 2);
      comments.push({
        start,
        end,
        text: document.getText(new vscode.Range(start, end)),
      });
      start = undefined;
      character = blockEnd + 2;
    }
  }

  return comments;
}

function findConsecutiveLineCommentGroups(
  document: vscode.TextDocument,
  minimumLines: number,
): BlockComment[] {
  const blockCommentLines = new Set<number>();
  for (const comment of findBlockComments(document)) {
    for (let line = comment.start.line; line <= comment.end.line; line++) {
      blockCommentLines.add(line);
    }
  }

  const groups: BlockComment[] = [];
  let start: vscode.Position | undefined;
  let end: vscode.Position | undefined;
  let lineCount = 0;
  const finishGroup = (): void => {
    if (!start || !end || lineCount < minimumLines) {
      start = undefined;
      end = undefined;
      lineCount = 0;
      return;
    }
    groups.push({
      start,
      end,
      text: document.getText(new vscode.Range(start, end)),
    });
    start = undefined;
    end = undefined;
    lineCount = 0;
  };

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
    const line = document.lineAt(lineNumber).text;
    const comment = blockCommentLines.has(lineNumber)
      ? undefined
      : findComment(line, document.languageId);
    const isStandaloneComment =
      comment !== undefined &&
      line.slice(0, comment.startCharacter).trim().length === 0;

    if (!comment || !isStandaloneComment) {
      finishGroup();
      continue;
    }

    if (!start) {
      start = new vscode.Position(lineNumber, comment.startCharacter);
    }
    end = new vscode.Position(lineNumber, comment.endCharacter);
    lineCount++;
  }
  finishGroup();

  return groups;
}

function findFoldableCommentGroups(
  document: vscode.TextDocument,
  minimumConsecutiveLines: number,
): BlockComment[] {
  return [
    ...findBlockComments(document).filter(
      (comment) => comment.start.line < comment.end.line,
    ),
    ...findConsecutiveLineCommentGroups(document, minimumConsecutiveLines),
  ];
}

function foldedCommentOptions(
  editor: vscode.TextEditor,
  previewLength: number,
): vscode.DecorationOptions[] {
  const cursorPositions = editor.selections.map(
    (selection) => selection.active,
  );
  const decorations: vscode.DecorationOptions[] = [];
  const inlineBlockCommentsByLine = new Map<number, CommentMatch[]>();

  for (const comment of findBlockComments(editor.document)) {
    if (comment.start.line !== comment.end.line) {
      continue;
    }
    const comments = inlineBlockCommentsByLine.get(comment.start.line) ?? [];
    comments.push({
      startCharacter: comment.start.character,
      endCharacter: comment.end.character,
    });
    inlineBlockCommentsByLine.set(comment.start.line, comments);
  }

  for (
    let lineNumber = 0;
    lineNumber < editor.document.lineCount;
    lineNumber++
  ) {
    const line = editor.document.lineAt(lineNumber).text;
    const comments = [
      findComment(line, editor.document.languageId),
      ...(inlineBlockCommentsByLine.get(lineNumber) ?? []),
    ].filter((comment): comment is CommentMatch => comment !== undefined);

    for (const comment of comments) {
      if (comment.endCharacter - comment.startCharacter <= previewLength) {
        continue;
      }

      const foldedStart = comment.startCharacter + previewLength;
      const isBeingEdited = cursorPositions.some(
        (position) => position.line === lineNumber,
      );
      if (isBeingEdited) {
        continue;
      }

      const fullComment = line
        .slice(comment.startCharacter, comment.endCharacter)
        .replace(/`/g, "\\`");
      decorations.push({
        range: new vscode.Range(
          lineNumber,
          foldedStart,
          lineNumber,
          comment.endCharacter,
        ),
        hoverMessage: new vscode.MarkdownString(
          `**Full comment**\n\n\`${fullComment}\``,
        ),
      });
    }
  }
  return decorations;
}

function foldedCommentHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  previewLength: number,
): vscode.Hover | undefined {
  const line = document.lineAt(position.line).text;
  const comments = [
    findComment(line, document.languageId),
    ...findBlockComments(document)
      .filter(
        (comment) =>
          comment.start.line === position.line &&
          comment.end.line === position.line,
      )
      .map((comment) => ({
        startCharacter: comment.start.character,
        endCharacter: comment.end.character,
      })),
  ].filter((comment): comment is CommentMatch => comment !== undefined);

  for (const comment of comments) {
    const foldedStart = comment.startCharacter + previewLength;
    if (
      comment.endCharacter - comment.startCharacter <= previewLength ||
      position.character < foldedStart - 1 ||
      position.character > comment.endCharacter
    ) {
      continue;
    }

    const message = new vscode.MarkdownString("**Full comment**\n\n");
    message.appendCodeblock(
      line.slice(comment.startCharacter, comment.endCharacter),
      document.languageId,
    );
    return new vscode.Hover(
      message,
      new vscode.Range(
        position.line,
        Math.max(comment.startCharacter, foldedStart - 1),
        position.line,
        comment.endCharacter,
      ),
    );
  }

  return undefined;
}

function blockCommentHoverOptions(
  editor: vscode.TextEditor,
  minimumConsecutiveLines: number,
): vscode.DecorationOptions[] {
  return findFoldableCommentGroups(
    editor.document,
    minimumConsecutiveLines,
  ).map((comment) => {
    const hoverMessage = new vscode.MarkdownString("**Full comment**\n\n");
    hoverMessage.appendCodeblock(comment.text, editor.document.languageId);
    const firstLineEnd = editor.document.lineAt(comment.start.line).range.end;

    return {
      range: new vscode.Range(comment.start, firstLineEnd),
      hoverMessage,
    };
  });
}

function selectedBlockCommentStartLines(
  editor: vscode.TextEditor,
  minimumConsecutiveLines: number,
): number[] {
  const startLines = new Set(
    findFoldableCommentGroups(editor.document, minimumConsecutiveLines).map(
      (comment) => comment.start.line,
    ),
  );
  return editor.selections
    .map((selection) => selection.active.line)
    .filter((line) => startLines.has(line));
}

function blockCommentStartLinesToFold(
  editor: vscode.TextEditor,
  minimumConsecutiveLines: number,
): number[] {
  return findFoldableCommentGroups(editor.document, minimumConsecutiveLines)
    .filter(
      (comment) =>
        comment.start.line < comment.end.line &&
        !editor.selections.some((selection) =>
          new vscode.Range(comment.start, comment.end).contains(
            selection.active,
          ),
        ),
    )
    .map((comment) => comment.start.line);
}

export function activate(context: vscode.ExtensionContext): void {
  console.log(
    'Congratulations, your extension "commentor-dementor" is now active!',
  );
  const foldedCommentDecoration = vscode.window.createTextEditorDecorationType({
    color: "rgba(0, 0, 0, 0)",
    opacity: "0",
    before: {
      contentText: "...",
      color: new vscode.ThemeColor("editorCodeLens.foreground"),
      margin: "0",
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  const blockCommentHoverDecoration =
    vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

  const updateEditor = (editor: vscode.TextEditor | undefined): void => {
    if (!editor) {
      return;
    }
    const previewLength = vscode.workspace
      .getConfiguration("commentorDementor")
      .get<number>("previewLength", DEFAULT_PREVIEW_LENGTH);
    const minimumConsecutiveLines = vscode.workspace
      .getConfiguration("commentorDementor")
      .get<number>(
        "consecutiveLineCommentThreshold",
        DEFAULT_CONSECUTIVE_LINE_COMMENT_THRESHOLD,
      );
    editor.setDecorations(
      foldedCommentDecoration,
      foldedCommentOptions(editor, previewLength),
    );
    editor.setDecorations(
      blockCommentHoverDecoration,
      blockCommentHoverOptions(editor, minimumConsecutiveLines),
    );
  };
  const updateActiveEditor = (): void =>
    updateEditor(vscode.window.activeTextEditor);
  const collapseBlockComments = (
    editor: vscode.TextEditor | undefined,
  ): void => {
    if (!editor) {
      return;
    }
    const minimumConsecutiveLines = vscode.workspace
      .getConfiguration("commentorDementor")
      .get<number>(
        "consecutiveLineCommentThreshold",
        DEFAULT_CONSECUTIVE_LINE_COMMENT_THRESHOLD,
      );
    const selectionLines = blockCommentStartLinesToFold(
      editor,
      minimumConsecutiveLines,
    );
    if (selectionLines.length > 0) {
      void vscode.commands.executeCommand("editor.fold", {
        direction: "down",
        levels: 1,
        selectionLines,
      });
    }
  };
  const updateAndCollapseEditor = (
    editor: vscode.TextEditor | undefined,
  ): void => {
    updateEditor(editor);
    // Folding providers are resolved asynchronously. In particular, Cursor can
    // receive the first fold command before it has asked this provider for its
    // ranges. Retrying shortly afterward makes the compact view dependable
    // without folding a comment that the cursor has entered in the meantime.
    for (const delay of FOLDING_RETRY_DELAYS_MS) {
      setTimeout(() => collapseBlockComments(editor), delay);
    }
  };
  updateAndCollapseEditor(vscode.window.activeTextEditor);

  context.subscriptions.push(
    foldedCommentDecoration,
    blockCommentHoverDecoration,
    vscode.languages.registerFoldingRangeProvider(
      COMMENT_LANGUAGE_IDS.map((language) => ({ language })),
      {
        provideFoldingRanges(document) {
          const minimumConsecutiveLines = vscode.workspace
            .getConfiguration("commentorDementor", document.uri)
            .get<number>(
              "consecutiveLineCommentThreshold",
              DEFAULT_CONSECUTIVE_LINE_COMMENT_THRESHOLD,
            );
          return findFoldableCommentGroups(
            document,
            minimumConsecutiveLines,
          ).map(
            (comment) =>
              new vscode.FoldingRange(
                comment.start.line,
                comment.end.line,
                vscode.FoldingRangeKind.Comment,
              ),
          );
        },
      },
    ),
    vscode.languages.registerHoverProvider(
      COMMENT_LANGUAGE_IDS.map((language) => ({ language })),
      {
        provideHover(document, position) {
          const previewLength = vscode.workspace
            .getConfiguration("commentorDementor")
            .get<number>("previewLength", DEFAULT_PREVIEW_LENGTH);
          return foldedCommentHover(document, position, previewLength);
        },
      },
    ),
    vscode.commands.registerCommand(
      "commentor-dementor.refresh",
      updateActiveEditor,
    ),
    vscode.window.onDidChangeActiveTextEditor(updateAndCollapseEditor),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const minimumConsecutiveLines = vscode.workspace
        .getConfiguration("commentorDementor")
        .get<number>(
          "consecutiveLineCommentThreshold",
          DEFAULT_CONSECUTIVE_LINE_COMMENT_THRESHOLD,
        );
      const selectedBlockStarts = selectedBlockCommentStartLines(
        event.textEditor,
        minimumConsecutiveLines,
      );
      if (selectedBlockStarts.length > 0) {
        void vscode.commands.executeCommand("editor.unfold", {
          direction: "down",
          levels: 1,
          selectionLines: selectedBlockStarts,
        });
      }
      updateAndCollapseEditor(event.textEditor);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        updateAndCollapseEditor(vscode.window.activeTextEditor);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("commentorDementor")) {
        updateAndCollapseEditor(vscode.window.activeTextEditor);
      }
    }),
  );
}

export function deactivate(): void {}
