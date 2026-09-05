# Commentor Dementor

Commentor Dementor keeps long comments readable by displaying their first 80
characters followed by `...`.

## Install

After release, search for **Commentor Dementor** in the Extensions view in VS
Code or Cursor. The extension is published as `dmccloud.commentor-dementor`.

Hover the folded portion to see the complete comment in a tooltip. Move the
cursor into that portion to temporarily reveal the original text so it can be
read or edited normally; moving away folds it again.

Multi-line `/* ... */` and JSDoc comments use VS Code's compact fold display:
the first line remains with a `...` summary while the interior is collapsed.
Hover the visible first line to see the full block, or select that line to
expand it. Use the editor-gutter folding control to collapse it again.

Runs of five or more standalone line comments, such as consecutive `//` or
`#` comments, behave the same way: the first comment stays visible and the
remaining lines collapse into a compact summary.

## Settings

`commentorDementor.previewLength` controls how many characters are shown before
folding. It defaults to `80`.

`commentorDementor.consecutiveLineCommentThreshold` controls the number of
consecutive standalone line comments required to form a collapsed group. It
defaults to `5`.

The extension recognizes `//` comments in C-style languages, plus `#`, `--`,
and `;` in common languages that use those markers.

## License

[MIT](LICENSE)
