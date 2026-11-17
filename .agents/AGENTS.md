# Project Rules for FluidHR Workspace

## Image and Document Storage Standards
- **No Base64 Database Storage:** Never store uploaded images, screenshots, or document files (Adhar, PAN, Bank details) as raw Base64 data URIs inside MongoDB collections. Always write incoming Base64 streams as physical files to the local file system (under `uploads/`) and save only the relative path (e.g., `/uploads/profile/...`) in the database.
- **JWT Payload Optimization:** Under no circumstances should raw images or large Base64-encoded strings be signed into a JWT token payload. The JWT payload must remain extremely small (containing only identifiers like `id`, `role`, `name`, `email`) to prevent header overflow errors (`400/431 Request Header Or Cookie Too Large`) from reverse proxies (like Cloudflare or Render's load balancers).
- **Environment-agnostic Assets:** Ensure any asset path retrieval helper (`getImageUrl`) dynamically handles base path formatting, supporting both local execution and production URL prepends when connecting local dev servers to cloud databases.
- **Cloudinary Directory Organization:** When uploading files to Cloudinary, organize files under the `hrm/` namespace using these path structures:
  - Screenshots: `hrm/screenshots/{role}/{employee_name}/`
  - Profile Pictures: `hrm/profile/{role}/{employee_name}/`
  - Employee Documents: `hrm/documents/{role}/{employee_name}/`
  - Task Attachments: `hrm/tasks/{task_title}/`
  - *Standardization:* Sanitize folder names by replacing spaces with underscores (e.g. `(name).replace(/\s+/g, '_')`) and lowercasing role variables to keep URLs clean and normalized.

## Modal & Popup UX Standards
- **Backdrop Click-Outside Dismissal:** Whenever creating popups, confirmation drawers, or modal dialogs across any module (`frontend/...`), always bind an `onClick` handler to the outer backdrop overlay container (`fixed inset-0 ...`) to dismiss/close the modal when a user clicks outside the modal card. Always call `e.stopPropagation()` on the inner modal card container (`onClick={(e) => e.stopPropagation()}`) to prevent clicks inside the modal from unintentionally closing it.

## Production Build & Dist File Synchronization
- **Automatic Dist Bundle Rebuild:** Whenever frontend source code files (`frontend/...`) are edited or modified, always run `npm run build` so that production `dist/` static bundles (`frontend/admin/dist`, `frontend/hr/dist`, `frontend/employee/dist`, `frontend/manager/dist`, `frontend/login/dist`) remain freshly updated and in sync with the source code.
- **Automatic Zip Package Regeneration:** Immediately after rebuilding dist bundles, always run `node create_hostinger_zip.js` and copy `hostinger_public_html.zip` to `dist_bundle.zip`, `hrm-production.zip`, and `hrm-master-production.zip` so all deployment archives contain the exact same latest changes.
- **Strict No-Commit Rule:** Under no circumstances should `git commit` be executed unless explicitly instructed by the user ("do not commit the code").


## Shared Server & HRMS Staging Isolation Rules (66.116.252.114)
FluidHR and HRMS staging run on the **SAME server** (`66.116.252.114`).
FluidHR's nginx (container `fluidhr-web`, config `/var/www/hrm/nginx/default.conf`) also serves HRMS staging:
- `hrms-staging.aupanishad.tech` and `admin-staging.aupanishad.tech`
- The HRMS part is the block between `"BEGIN HRMS-STAGING"` and `"END HRMS-STAGING"`.
- HRMS certificates: `/etc/letsencrypt/live/hrms-staging.aupanishad.tech/` (inside `fluidhr-web`).

### Critical Operating Constraints:
1. **NEVER** remove, edit, or overwrite the `HRMS-STAGING` block, the HRMS certificate files, `/opt/hrms-staging`, or the HRMS containers (`hrms-staging-api`, `hrms-staging-web`, `hrms-staging-admin`).
2. **NEVER** restart or upgrade the server itself.
3. **Before every FluidHR deploy:** Back up `/var/www/hrm/nginx/default.conf` (outside the mounted folder).
4. **After every FluidHR deploy, run and verify:**
   a. `grep -c "HRMS-STAGING" /var/www/hrm/nginx/default.conf` → 2 (until permanent fix is done)
   b. `docker exec fluidhr-web nginx -t` → OK
   c. `for h in hrms-staging.aupanishad.tech admin-staging.aupanishad.tech; do echo | openssl s_client -connect $h:443 -servername $h 2>/dev/null | openssl x509 -noout -subject; done` → CN = hrms-staging.aupanishad.tech (NOT hrm.aupanishad.tech)
   d. `curl -s https://hrms-staging.aupanishad.tech/health` → {"status":"ok"}
   *If any check fails:* STOP, restore the HRMS block from backup, run `nginx -t`, reload (never restart), and notify the user immediately.
