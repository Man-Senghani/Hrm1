---
name: build-dist
description: Automatically rebuild all frontend production dist static bundles and synchronize all zip distribution packages whenever any frontend changes are made.
---

# Production Build & Dist Synchronization Skill

Whenever any modifications, features, bug fixes, or UI changes are made to frontend files (`frontend/...`), the agent must automatically perform this complete build and synchronization workflow without needing to be asked:

## 1. Full Production Dist Compilation
Run from the workspace root (`e:\Hrm`):
```bash
npm run build
```
This compiles fresh production bundles for all 5 portals:
- `frontend/admin/dist`
- `frontend/hr/dist`
- `frontend/employee/dist`
- `frontend/manager/dist`
- `frontend/login/dist`

## 2. Package Zip Archives
Generate the Linux/Hostinger compatible zip archive:
```bash
node create_hostinger_zip.js
```

## 3. Synchronize All Production Distribution Zips
Synchronize the new bundle across all distribution target archives:
```powershell
powershell -Command "Copy-Item hostinger_public_html.zip -Destination dist_bundle.zip -Force; Copy-Item hostinger_public_html.zip -Destination hrm-production.zip -Force; Copy-Item hostinger_public_html.zip -Destination hrm-master-production.zip -Force"
```

## 4. Strict Constraints
- **Do not commit to Git:** Do not run `git commit` unless explicitly commanded by the user.
- **Always Keep in Sync:** The `dist/` folders and zip packages must always match the exact source code changes so deployment files never lag behind.
