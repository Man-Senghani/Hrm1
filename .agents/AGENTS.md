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

## Production Build & Dist File Synchronization
- **Automatic Dist Bundle Rebuild:** Whenever frontend source code files (`frontend/...`) are edited or modified, always run `npm run build` so that production `dist/` static bundles (`frontend/admin/dist`, `frontend/hr/dist`, `frontend/employee/dist`, `frontend/manager/dist`, `frontend/login/dist`) remain freshly updated and in sync with the source code.
