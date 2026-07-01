# Phase 4 and 5 Productization Notes

This document tracks what is implemented locally and what still requires external infrastructure.

## Implemented Locally

- Permission center model.
- Source catalog with “collects” and “does not collect” declarations.
- Global pause setting.
- Per-source enable/disable state.
- Local ingestion token setting.
- JSON share package export.
- Bug report share package export.
- Sensitive event redaction before export.
- Product settings for language and encrypted sync intent.

## Privacy Boundaries

External sources remain limited:

- Browser extension: active tab title and URL only.
- VS Code extension: current file path and explicit selection only.
- Shell hook: command text only.

Share packages never include sensitive event content when `sensitiveFlag` is true.

## Not Yet Implemented

These v1.0 items need real infrastructure or OS-level setup:

- End-to-end encrypted cloud sync.
- Automatic update service.
- Windows code signing.
- macOS notarization.
- Linux package release pipeline.

The UI includes local settings for these future capabilities, but cloud sync remains off by default and has no network implementation yet.
