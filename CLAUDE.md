# FluidHR Permanent Architecture & Shared Server Rules

## Shared Server Architecture (66.116.252.114)
FluidHR and HRMS staging run on the **SAME server** (`66.116.252.114`).
FluidHR's nginx (container `fluidhr-web`, config `/var/www/hrm/nginx/default.conf`) also serves HRMS staging:
- `hrms-staging.aupanishad.tech` and `admin-staging.aupanishad.tech`
- The HRMS part is the block between `"BEGIN HRMS-STAGING"` and `"END HRMS-STAGING"`.
- HRMS certificates: `/etc/letsencrypt/live/hrms-staging.aupanishad.tech/` (inside `fluidhr-web`).

### Incident Context (17 Nov 2026, ~15:00 IST):
A FluidHR deploy recreated `fluidhr-web`/`fluidhr-staging`/`fluidhr-production` and rewrote `default.conf`. The `HRMS-STAGING` block was removed, so HRMS staging showed FluidHR's certificate (`NET::ERR_CERT_COMMON_NAME_INVALID`). The owner restored it by hand at 10:02 UTC.

## Mandatory Rules:
1. **NEVER** remove, edit, or overwrite the `HRMS-STAGING` block, the HRMS certificate files, `/opt/hrms-staging`, or the HRMS containers (`hrms-staging-api`, `hrms-staging-web`, `hrms-staging-admin`).
2. **NEVER** restart or upgrade the server itself.
3. **Before every FluidHR deploy:** Back up `/var/www/hrm/nginx/default.conf` (outside the mounted folder).
4. **After every FluidHR deploy, run and verify:**
   a. `grep -c "HRMS-STAGING" /var/www/hrm/nginx/default.conf` → must return 2 (until the permanent fix is done)
   b. `docker exec fluidhr-web nginx -t` → must return OK
   c. `for h in hrms-staging.aupanishad.tech admin-staging.aupanishad.tech; do echo | openssl s_client -connect $h:443 -servername $h 2>/dev/null | openssl x509 -noout -subject; done` → must show `CN = hrms-staging.aupanishad.tech` (NOT `hrm.aupanishad.tech`)
   d. `curl -s https://hrms-staging.aupanishad.tech/health` → must return `{"status":"ok"}`
   
   **Failure Procedure:** If any check fails: **STOP IMMEDIATELY**, restore the HRMS block from backup, run `nginx -t`, reload (never restart server), and alert the user right away.

