# Commentor Dementor

Commentor Dementor keeps long comments readable by displaying their first 40
characters followed by `...`.

Hover the folded portion to see the complete comment in a tooltip. Move the
cursor into that portion to temporarily reveal the original text so it can be
read or edited normally; moving away folds it again.

Multi-line `/* ... */` and JSDoc comments use VS Code's compact fold display:
the first line remains with a `...` summary while the interior is collapsed.
Hover the visible first line to see the full block, or select that line to
expand it. Use the editor-gutter folding control to collapse it again.

## Settings

`commentorDementor.previewLength` controls how many characters are shown before
folding. It defaults to `40`.

The extension recognizes `//` comments in C-style languages, plus `#`, `--`,
and `;` in common languages that use those markers.
