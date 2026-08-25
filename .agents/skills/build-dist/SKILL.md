---
name: build-dist
description: Automatically rebuild all frontend production dist bundles whenever frontend changes are made.
---

# Build Dist Bundles Skill

Whenever frontend code changes are made to any portal (`admin`, `hr`, `employee`, `manager`, `login`), run `npm run build` from the workspace root to ensure all static production `dist/` folders are compiled and kept in sync with the source code.
