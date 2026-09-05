# Change Log

All notable changes to the "commentor-dementor" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.3] - 2026-09-05

- Make multi-line comment folding wait for Cursor and VS Code to resolve folding ranges.
- Collapse qualifying multi-line comments even when their total text is shorter than the single-line preview length.

## [0.1.2] - 2026-09-05

- Replace the Marketplace icon with a friendlier design.

## [0.1.1] - 2026-09-05

- Add the Marketplace icon.

## [0.1.0] - 2026-09-05

- Fold long single-line comments to an 80-character preview.
- Reveal folded comments when their line is selected and show their full text on hover.
- Compact `/* ... */`, JSDoc, and groups of five consecutive standalone line comments.
- Add configurable preview and consecutive-comment thresholds.
