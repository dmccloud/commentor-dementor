<div align="center">
  <img src="images/commentor-dementor-icon-friendly-256.png" width="128" alt="Commentor Dementor icon">

  # Commentor Dementor

  **Keep long comments out of the way without removing their context.**

  A lightweight comment-folding extension for Visual Studio Code and Cursor.
</div>

## Overview

Commentor Dementor condenses long comments into readable previews so you can
focus on the code around them. Comments remain available on hover and expand
automatically when you move the cursor onto their line, making them easy to
read or edit without changing the source file.

## Features

- **Long comment previews** — displays the first 80 characters by default and
  replaces the remainder with `...`.
- **Reveal on demand** — hover to read the complete comment, or place the cursor
  on its line to temporarily reveal and edit it.
- **Block comment folding** — compacts multi-line `/* ... */` and JSDoc comments
  while keeping the first line visible.
- **Comment group folding** — collapses runs of standalone line comments into a
  single summary when they reach the configured threshold.
- **Configurable behavior** — customize both preview length and group size from
  your editor settings.
- **Non-destructive** — changes only how comments are displayed; your files are
  never rewritten.

## Installation

### From the Extensions view

1. Open the Extensions view in Visual Studio Code or Cursor.
2. Search for **Commentor Dementor**.
3. Install the extension published by **dmccloud**.

You can also open the
[Visual Studio Marketplace listing](https://marketplace.visualstudio.com/items?itemName=dmccloud.commentor-dementor)
directly.

### From the command line

For Visual Studio Code:

```sh
code --install-extension dmccloud.commentor-dementor
```

For Cursor:

```sh
cursor --install-extension dmccloud.commentor-dementor
```

## Usage

Comment folding starts automatically in supported files.

- Hover over a shortened comment to view its complete contents.
- Move the cursor onto a shortened comment to reveal it for editing.
- Select the first line of a collapsed block or comment group to expand it.
- Use the editor gutter's folding control to collapse an expanded group again.
- Run **Commentor Dementor: Refresh Folded Comments** from the Command Palette
  if you want to refresh the current editor manually.

## Configuration

Configure the extension under **Settings → Extensions → Commentor Dementor**,
or add either setting to your `settings.json`:

- `commentorDementor.previewLength` — number of comment characters shown before
  the remainder is folded. Default: `80`; minimum: `1`.
- `commentorDementor.consecutiveLineCommentThreshold` — number of consecutive
  standalone line comments required to create a collapsible group. Default:
  `5`; minimum: `2`.

Example:

```json
{
  "commentorDementor.previewLength": 100,
  "commentorDementor.consecutiveLineCommentThreshold": 4
}
```

## Supported languages

Commentor Dementor recognizes common line-comment syntax across:

- C, C++, C#, CSS, Dart, F#, Go, Java, JavaScript, JSX, Kotlin, PHP, Rust,
  Swift, TypeScript, and TSX (`//`)
- Python, Ruby, shell scripts, YAML, TOML, and Makefiles (`#`)
- Haskell, Lua, and SQL (`--`)
- INI and properties files (`;`)

Multi-line block comment folding is available for the supported C-style
languages.

## Requirements

- Visual Studio Code `1.74.0` or later, or a compatible version of Cursor

## Feedback and issues

Found a bug or have a feature request?
[Open an issue on GitHub](https://github.com/dmccloud/commentor-dementor/issues).

## License

Released under the [MIT License](LICENSE).
