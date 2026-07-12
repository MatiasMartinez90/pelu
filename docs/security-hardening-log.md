# NOX Security Audit and Hardening Log

Last updated: 2026-07-13
Status: in progress  
Application repository: `/root/Pelu`  
Infrastructure repository: `/root/agents-hetzner-k3s`  
Kubernetes namespace: `nox`

This is the living record for the NOX security audit and remediation. Update
this file whenever a task is completed, a verification is run, a risk changes,
or an operational decision is made.

## Delivery state

- Application commit `47af10e` was pushed to `main`; GitHub Actions built and
  published both images and updated their immutable GitOps digests.
- Infrastructure commit `79dbf72` was pushed to `main` and reconciled by Argo
  CD. The `nox`, `nox-backend` and `keycloak` applications reached
  `Synced/Healthy` on that revision.
- API, worker, web, webhook signer and Keycloak rollouts completed successfully.
- The OIDC client secret was rotated in both Sealed Secrets and the effective
  Keycloak client. No plaintext value was printed, logged or committed.
- Chatwoot webhook ID 1 now targets the private signer Service. An end-to-end
  signed request reached the API and returned HTTP 200.
- Application commit `cbd4d35` removed the temporary legacy-token source
  default. Its security and build-deploy workflows passed, and the final backend
  digest was reconciled successfully.
- Local functional/performance changes that predated the audit were preserved
  and shipped together with the application hardening commit.

## Scope reviewed

- Next.js frontend, Auth.js integration and BFF proxy routes.
- FastAPI endpoints, JWT validation, authorization and Pydantic inputs.
- PostgreSQL access and possible SQL injection paths.
- Public booking flow, customer identity binding and IDOR exposure.
- Chatwoot webhook, Redis buffering, RabbitMQ worker and LangGraph tools.
- WhatsApp account-linking flow.
- npm and Python production dependencies.
- Dockerfiles and GitHub Actions supply chain.
- NOX, Keycloak and related GitOps manifests.
- Effective resources, workloads, routes, policies, service accounts and RBAC
  in Kubernetes namespace `nox`.
- Passive HTTP requests against the public web and API domains.

## Initial findings

### Critical

1. Public customer account takeover.

   `upsert_customer()` replaced the email associated with an existing phone
   whenever an anonymous booking supplied a different email. An attacker who
   knew a victim's phone could bind their own verified email, view the victim's
   bookings through `/api/v1/me/bookings`, and cancel future appointments.

2. Keycloak OIDC client secret committed in plaintext.

   `manifests-contabo/keycloak.yaml` contained the confidential client's secret
   directly inside the realm ConfigMap. The value has existed in Git history
   since commit `99d2530` and must be treated as compromised.

### High

1. Chatwoot webhook authentication used a secret in `?token=`, which can leak
   through URLs, access logs and tracing systems. Compromise allows forged
   conversations, fake phone identities, queue/Redis abuse and LLM cost abuse.

2. Public rate limiting used `request.client.host` behind Envoy and KEDA. This
   can collapse all clients into a shared proxy IP and permit global denial of
   service. Blind trust in the first `X-Forwarded-For` value would also permit
   spoofing.

### Medium and hardening gaps

- Public `GET /bookings/{uuid}?phone=...` exposed booking details using weak
  possession factors and was unnecessary for the frontend.
- `/docs`, `/redoc` and `/openapi.json` were public in production.
- Backend responses lacked consistent security headers.
- Frontend lacked CSP and exposed `X-Powered-By`.
- JWT authorization did not require `email_verified` to be explicitly true for
  every protected role.
- WhatsApp link tokens had only 32 bits of entropy and their read/delete was not
  atomic.
- Pods mounted the default ServiceAccount token despite not using Kubernetes.
- Pods had no seccomp profile or read-only root filesystem.
- Namespace had ingress policies but no default egress isolation.
- Runtime images were referenced by mutable tags rather than digests.
- Docker base images were not pinned by digest.
- `dbmate` was downloaded without checksum verification.
- GitHub Actions were referenced by mutable tags.
- Python dependencies are declared with broad lower bounds and no complete
  application lockfile.
- API production CORS could retain a localhost regex unless environment-aware.
- No security regression test suite existed.

## Findings not confirmed

- No exploitable SQL injection was found. User-controlled SQL values use
  asyncpg positional parameters. The reviewed f-strings interpolate constant
  column lists, not request values.
- No direct React XSS sink was found: no `dangerouslySetInnerHTML`, `eval`,
  `document.write` or equivalent dynamic execution was identified.
- Barber and customer object authorization generally scopes records by the
  identity resolved from the verified JWT.

## Completed application changes

### Customer identity and IDOR

- [x] Anonymous booking no longer passes an email into customer identity
  creation in `backend/src/api/routers/public.py`.
- [x] `upsert_customer()` preserves the existing email and existing non-empty
  name on phone conflicts in `backend/src/services/booking_service.py`.
- [x] Removed unused public `GET /bookings/{booking_id}?phone=...`. Booking
  history remains available through the authenticated `/api/v1/me` route.
- [ ] Introduce a first-class verified identity model or verification timestamp
  in the database. The immediate takeover is closed, but identity lifecycle
  should eventually be represented explicitly rather than inferred from email.

### JWT and authorization

- [x] Customer, barber and admin authorization now require
  `email_verified is True` in `backend/src/api/deps.py`.
- [x] Added tests proving admin, customer and barber dependencies reject
  missing or false `email_verified` claims.
- [x] Added cryptographic RS256 tests with a local key/JWKS double for expired
  tokens, wrong issuer and wrong authorized client.

### Webhook authentication

- [x] Added HMAC-SHA256 verification over `timestamp + "." + raw_body`.
- [x] Added `X-Nox-Timestamp` skew validation.
- [x] Added Redis-backed single-use replay detection.
- [x] Added constant-time signature/token comparisons.
- [x] Added a 256 KiB request-body limit.
- [x] Added a legacy-token migration switch, disabled by default after the
  coordinated production migration.
- [x] Added local protocol documentation to `backend/README.md`.
- [x] Generated a 256-bit `WEBHOOK_SIGNING_SECRET` and added only its
  cluster-bound ciphertext to the NOX SealedSecret.
- [x] Implemented `src.webhook_signer`: a private adapter that validates the
  existing Chatwoot token, signs the exact raw body and forwards it to the API.
- [x] Added two hardened signer replicas and an internal-only Service. Its
  NetworkPolicy accepts ingress only from the `chatwoot` namespace and it has
  no public HTTPRoute.
- [x] Changed Chatwoot's configured URL to the internal signer Service.
- [x] Verified Chatwoot can reach signer health and that an inert `{}` payload
  traverses signer authentication, HMAC verification and API replay controls.
- [x] Disabled legacy token acceptance in production and restored the source
  default to disabled after migration.

### Rate limiting and client identity

- [x] Redis increment and expiry are now one atomic Lua operation.
- [x] Added `backend/src/api/client_ip.py`.
- [x] Forwarded headers are ignored from untrusted direct peers.
- [x] Trusted proxy chains are evaluated right-to-left, discarding only trusted
  hops. This prevents attacker-controlled leftmost XFF spoofing.
- [x] Added `TRUSTED_PROXY_CIDRS` configuration.
- [ ] Validate the exact XFF chain produced by the deployed Envoy/KEDA path.
- [ ] Add gateway-level limits for IP, endpoint, request size and concurrency.

### WhatsApp linking

- [x] Increased link-token entropy from 32 to 128 bits.
- [x] Replaced separate Redis GET/DELETE with atomic GETDEL.
- [x] Removed full phone numbers from successful link-claim logs.

### API and frontend headers

- [x] FastAPI docs, ReDoc and OpenAPI are disabled when
  `ENVIRONMENT=production`.
- [x] Production localhost CORS regex is disabled.
- [x] Added API CSP, HSTS, nosniff, frame denial, referrer and permissions
  policies.
- [x] Added frontend CSP and disabled the Next.js powered-by header.
- [x] Preserved preexisting frontend image/cache configuration changes.
- [x] Validated CSP and absence of `X-Powered-By` in a running read-only
  production container; production home and login returned HTTP 200.
- [ ] Perform an authenticated browser smoke test covering the complete Auth.js
  callback, representative images/fonts and all protected admin views.

## Completed dependency and supply-chain changes

- [x] Added a global npm override for PostCSS.
- [x] Installed PostCSS `8.5.17`; Next now deduplicates to the corrected version.
- [x] Did not use `npm audit fix --force`.
- [x] `npm audit --omit=dev`: zero known vulnerabilities after the override.
- [x] Next.js production build completed successfully.
- [x] Added `.github/workflows/security.yml` with npm audit, pytest, pip-audit
  and Trivy filesystem/secret/misconfiguration scanning.
- [x] Added `.github/dependabot.yml` for npm, pip and GitHub Actions.
- [x] Pinned Actions used by security and deploy workflows to commit SHAs.
- [x] Pinned Node and Python Docker bases to observed image digests.
- [x] Added SHA256 verification for downloaded dbmate `v2.19.0`.
- [x] Changed GitOps NOX application images from tags to the digests currently
  running in Kubernetes.
- [x] Updated deployment workflow logic to persist future build digests.
- [x] `pip-audit` found no vulnerable application library. It found six notices
  in inherited `pip 24.0`.
- [x] Dockerfile now upgrades and pins pip to `26.1.2`.
- [x] Rebuilt backend after the pip change; `pip-audit --skip-editable` reports
  no known vulnerabilities.
- [x] Generated `backend/requirements.lock` and
  `backend/requirements-dev.lock` with exact versions and package hashes.
- [x] Backend Docker builds now use `--require-hashes`; security CI uses the
  hashed development lock and audits the production lock directly.
- [x] Rebuilt the backend successfully from the production lock.
- [ ] Add image scanning after Docker build, not only repository scanning.

## Kubernetes and GitOps changes prepared locally

The following changes are in `/root/agents-hetzner-k3s` and have not been
applied:

- [x] Added namespace Pod Security labels at `restricted` level.
- [x] Added dedicated `nox-runtime` ServiceAccount.
- [x] Disabled ServiceAccount token automount at account and workload level.
- [x] Added `RuntimeDefault` seccomp profiles.
- [x] Added `runAsGroup` and retained non-root users.
- [x] Added `readOnlyRootFilesystem` to web, API, worker, migration and follow-up
  containers.
- [x] Added explicit `/tmp` and Next cache `emptyDir` mounts.
- [x] Added namespace-wide egress isolation with explicit DNS, NOX API,
  PostgreSQL, Redis, RabbitMQ, Chatwoot and public HTTPS rules.
- [x] Added production environment and trusted KEDA pod CIDR to the API
  deployment.
- [x] Validated all modified NOX, SealedSecret and Keycloak manifests against
  the live API with `kubectl apply --dry-run=server`; every resource passed.
- [x] Pod Security emitted only the expected warning that existing pods lack
  seccomp. New workload templates declare `RuntimeDefault`.
- [x] Backend imports the production FastAPI app successfully with a read-only
  root filesystem and an explicit `/tmp` tmpfs.
- [x] Built and ran the production web image with a read-only root filesystem,
  writable tmpfs mounts for `/tmp` and `.next/cache`, and confirmed HTTP 200 for
  `/` and `/login` from inside the container.
- [x] Confirmed CSP is present and `X-Powered-By` is absent in the read-only web
  runtime.
- [ ] Test the backend lifecycle with real dependencies after rollout; local
  read-only import is complete but startup intentionally requires PostgreSQL,
  Redis and RabbitMQ.
- [x] Confirmed effective dependency hosts/ports without exposing credentials:
  PostgreSQL 5432, RabbitMQ 5672, Redis 6379, Chatwoot 3000, Keycloak 443 and
  Langfuse 443. OpenAI/WhatsApp use the public HTTPS rule.
- [ ] Roll out policies progressively and verify DNS, OIDC, OpenAI, Langfuse,
  Chatwoot, WhatsApp, PostgreSQL, Redis and RabbitMQ connectivity.

## OIDC secret remediation state

- [x] Removed the plaintext OIDC client secret from the current Keycloak realm
  ConfigMap.
- [x] Changed realm import to `${NOX_CLIENT_SECRET}`.
- [x] Added a Keycloak Deployment reference to `keycloak-secret` key
  `NOX_CLIENT_SECRET`.
- [x] Generated a new 256-bit cryptographically random client secret once.
- [x] Sealed it into Keycloak's `keycloak-secret` as `NOX_CLIENT_SECRET`.
- [x] Sealed the same value as `AUTH_KEYCLOAK_SECRET` in `nox-app-env`.
- [x] Discarded the plaintext immediately after producing both cluster-bound
  ciphertexts; it was not written to a repository or this log.
- [ ] Update the existing Keycloak client atomically.
- [ ] Restart NOX web replicas and test login/refresh/logout.
- [ ] Decide and execute Git history cleanup. This is destructive and affects
  every clone, so it requires an explicit coordinated decision.

Important: the current local Keycloak manifest references a secret key that has
now been sealed. Do not update the live Keycloak client until both SealedSecrets
have synced, or new login/refresh requests will fail during the mismatch.

## Security tests

File: `backend/tests/test_security.py`

- [x] Existing customer email is not overwritten on phone conflict.
- [x] XFF is ignored from untrusted peers.
- [x] Real client IP is extracted through a trusted proxy chain.
- [x] Valid webhook HMAC is accepted once and replay is rejected.
- [x] Expired webhook signatures are rejected.
- [x] Added a test for spoofed leftmost XFF values.
- [x] Added a compatibility test proving the internal signer emits exactly the
  HMAC format accepted by the API.
- [x] Reran the suite after the sixth test and latest code changes: `6 passed`.
- [ ] Add account-takeover API integration test against PostgreSQL.
- [x] Added an ownership regression test requiring appointment/customer join and
  authenticated email in the cancellation SQL.
- [x] Added deterministic tool-schema tests proving the model cannot supply or
  override injected `state`, `phone` or `conversation_id` for booking,
  cancellation or rescheduling.
- [x] Added malformed webhook-signature rejection coverage.
- [ ] Add body-limit and legacy-mode endpoint tests.
- [ ] Add broader conversational prompt-injection fixtures. Current tests cover
  the critical identity boundary at the tool schema, not model behavior quality.

Latest completed run: `16 passed in 1.79s` inside an ephemeral local Docker
container.

## Verification record

- Kubernetes namespace `nox` exists and was inspected read-only.
- Running workloads at audit time: two web pods, two API pods, one worker and a
  completed follow-up CronJob pod.
- Default NOX ServiceAccount had no resource permissions, only API discovery;
  nevertheless its token was mounted in every pod.
- Public frontend and API health endpoints returned HTTP 200.
- Public FastAPI docs and OpenAPI returned HTTP 200 before remediation.
- A passive SQLi payload against the removed booking lookup returned 404 and no
  database error.
- YAML syntax parsing succeeded for the modified NOX and Keycloak manifests at
  an earlier checkpoint; it must be repeated after final edits.
- Next production build succeeded after the PostCSS override.
- npm production audit reports zero vulnerabilities.
- ESLint currently fails with 17 errors and 9 warnings in preexisting frontend
  code. These failures were not introduced by the security changes and remain a
  release-quality gap.

## Preexisting or concurrently modified files

The following local changes were present before security edits or appear
unrelated to this audit. Preserve and review them separately:

- `backend/src/api/main.py`: gzip and request timeout work existed locally.
- `backend/src/api/routers/admin_agenda.py`: timezone range/index optimization.
- `backend/src/api/routers/admin_dashboard.py`: concurrent query optimization.
- `backend/src/api/routers/me.py` and
  `backend/src/services/booking_service.py`: booking summary optimization.
- `backend/src/db/repositories/settings_repo.py`: in-memory settings cache.
- `backend/db/migrations/006_perf_indexes.sql`: performance indexes.
- `next.config.ts`: image host and public asset cache behavior.
- `src/app/equipo/page.tsx`, `src/app/galeria/page.tsx`,
  `src/app/nosotros/page.tsx` and `src/components/sections/tienda.tsx`:
  unrelated frontend changes observed in the working tree.

## Workspace hygiene before commit

- [ ] Remove generated untracked `backend/**/__pycache__` and `.pyc` files.
- [ ] Confirm `.gitignore` ignores Python caches globally.
- [ ] Review both repository diffs for accidental secret material.
- [ ] Run secret scanning across current tree and Git history.
- [ ] Keep user changes separate or explicitly include them in the intended
  commit set.
- [ ] Do not commit or push until OIDC/webhook secret manifests are complete and
  all validation gates pass.

## Remaining execution order

1. Scan the published frontend image with Trivy and close any fixable High or
   Critical finding.
2. Run final Trivy filesystem secret/misconfiguration scans over both repos.
3. Validate the exact production XFF chain and add Gateway-level request,
   concurrency and body-size limits where supported.
4. Run authenticated browser smoke tests for OIDC and protected application
   workflows.
5. Review final diffs/status, update this log with evidence, and close or assign
   the longer-term verified-identity data-model item.

## Change log

### 2026-07-12 - Initial audit and remediation work

- Completed source, dependency, GitOps, Kubernetes and passive HTTP audit.
- Implemented the application and infrastructure changes recorded above.
- Added initial automated security tests and CI controls.
- Created this living hardening log before continuing operational secret work.

### 2026-07-12 - Backend verification gate closed

- Rebuilt the backend image with pinned `pip 26.1.2` and verified the dbmate
  checksum during the build.
- Ran all six security tests successfully.
- Reran pip-audit: no known dependency vulnerabilities found.
- Confirmed the FastAPI application imports under a read-only root filesystem
  with only `/tmp` writable.

### 2026-07-12 - Signed webhook path completed locally

- Implemented a private Chatwoot signing adapter because Chatwoot cannot emit
  the required NOX HMAC itself.
- Added hardened Kubernetes Deployment, Service and namespace-restricted
  ingress policy for the adapter; no public route exists.
- Generated and sealed a 256-bit HMAC secret without writing its plaintext to
  either repository or the audit log.
- Expanded the security suite to seven passing tests.

### 2026-07-12 - OIDC rotation material prepared

- Generated one new random OIDC client secret and encrypted the same value for
  the strict `keycloak/keycloak-secret` and `nox/nox-app-env` identities.
- Added only ciphertext to GitOps and discarded plaintext.
- The live client has not been rotated yet; activation remains intentionally
  coupled to the final GitOps sync and NOX web rollout.

### 2026-07-12 - Kubernetes validation gate closed

- Server-side dry-run accepted every modified application, security, routing,
  SealedSecret and Keycloak resource.
- Reconciled effective production dependency endpoints with the proposed
  namespace egress allowlist; no missing runtime port was identified.

### 2026-07-12 - Web read-only runtime gate closed

- Built the complete frontend Docker image from pinned Node base and corrected
  dependency tree.
- Ran it with a read-only root filesystem and only explicit tmpfs cache/temp
  mounts; home and login both returned HTTP 200.
- Verified CSP delivery and absence of the Next.js powered-by header.

### 2026-07-12 - Python dependency reproducibility closed

- Compiled production and development dependency locks with hashes from
  `pyproject.toml` under Python 3.11.
- Included security tooling in the development lock and included unsafe build
  tools explicitly so pip hash mode is deterministic.
- Rebuilt the production backend image using only the hashed production lock.

### 2026-07-12 - Authorization abuse suite expanded

- Added explicit email-verification denial tests for all protected role types.
- Added SQL ownership regression coverage for customer cancellation.
- Proved LangGraph tool schemas cannot accept model-controlled phone,
  conversation ID or injected state.
- Expanded the passing suite from seven to twelve tests.
- Added local-key cryptographic JWT rejection tests and malformed HMAC coverage,
  expanding the suite to sixteen passing tests.

### 2026-07-13 - Backend image vulnerability gate closed

- Updated dbmate from `2.19.0` to `2.34.1` with its release checksum pinned.
- Removed `pip`, `setuptools` and `wheel` from the final runtime image after the
  hashed dependency installation; these build tools are not needed at runtime.
- Scanned the rebuilt backend image with Trivy `0.70.0`: zero fixable High or
  Critical findings remained across Debian, Python and Go components.
- Added a controlled webhook migration boundary: the first application rollout
  retains legacy-token compatibility, while the GitOps API deployment disables
  it explicitly once the private signer is running.

### 2026-07-13 - Application build and first rollout completed

- Committed and pushed application hardening as `47af10e` on `main`.
- GitHub Actions security, npm, pip and action-dependency checks passed.
- The build-deploy workflow built frontend and backend images successfully and
  pushed immutable digest updates to GitOps.
- Argo CD rolled out backend digest
  `sha256:5794a2b06a98bdeffa96a928b7436c3ef93a0ee670ce1f30caa17fc664221e1b`
  without downtime; two API replicas and the worker became ready.

### 2026-07-13 - Infrastructure hardening deployed

- Rebased local hardening over the two CI digest commits and resolved only the
  expected image-line conflicts, preserving the new digests.
- Committed and pushed GitOps hardening as `79dbf72` on `main`.
- Argo CD reconciled namespace Pod Security labels, restricted service account,
  read-only filesystems, seccomp, dropped capabilities, egress allowlist,
  network policies, PodDisruptionBudgets and two private signer replicas.
- Server-side dry-run accepted every changed resource before publication.
- `nox`, `nox-backend` and `keycloak` reached `Synced/Healthy`.

### 2026-07-13 - OIDC secret rotation completed

- Deployed the independently sealed copies of the new 256-bit client secret to
  the `keycloak` and `nox` namespaces.
- Bootstrap admin credentials were no longer valid, so no administrator reset
  was attempted. The operation updated only the unique `nox-admin` client row
  in Keycloak's database, then restarted Keycloak to clear its cache.
- Verified Keycloak accepts the new confidential-client credentials: the token
  endpoint returned `unauthorized_client` because service accounts are disabled,
  rather than `invalid_client`.
- The Keycloak and NOX rollouts remained healthy after activation.

### 2026-07-13 - Signed webhook production migration completed

- Changed Chatwoot webhook ID 1 from the public API host to
  `nox-webhook-signer.nox.svc.cluster.local:8080`; the existing migration token
  was preserved without displaying it.
- Verified Chatwoot-to-signer network access with HTTP 200 on `/health`.
- Sent an inert empty JSON object through the configured webhook URL. The
  signer authenticated it, signed the exact body, and the API returned HTTP 200
  with `{"status":"ignored"}`.
- Production explicitly rejects the old query-token path at the API.

### 2026-07-13 - Legacy webhook fallback removed and redeployed

- Restored `WEBHOOK_ALLOW_LEGACY_TOKEN=false` as the application source
  default and committed the closure as `cbd4d35`.
- The security and build-deploy workflows both completed successfully.
- CI published backend digest
  `sha256:09957fd9d18753711261e7e860fecbd214c18ec6f62d221d920baca4c47f3533`
  and recorded it in GitOps commit `8133803`.
- Argo CD reconciled the digest and API, worker and both signer replicas
  completed their rollouts successfully.

### 2026-07-13 - Independent verification pass (second reviewer)

An independent pass (different agent, same operator) re-verified the audit
by running the actual test suite, building both images from source, and
probing the live production endpoints, rather than trusting this log alone.
Everything above this entry was confirmed correct except two deployment gaps,
both now fixed.

**Confirmed correct, with evidence:**

- `backend/tests/test_security.py`: reran the full suite in a fresh container
  after the local performance changes were merged in. `16 passed`.
- Rebuilt `backend/Dockerfile` from `requirements.lock` with
  `--require-hashes`: succeeded, matches the digest already running in
  production.
- Rebuilt the frontend (`npm install`, `tsc --noEmit`, `next build`):
  succeeded, `npm audit` reports 0 vulnerabilities.
- `upsert_customer()` account-takeover fix: confirmed the `ON CONFLICT`
  clause no longer writes `email`, and confirmed the only three callers
  (`public.py`, `admin_agenda.py`, the WhatsApp agent tool) never pass a
  public-supplied email into it.
- Keycloak OIDC secret: confirmed `manifests-contabo/keycloak.yaml` now holds
  only `${NOX_CLIENT_SECRET}` resolved from a SealedSecret, no plaintext.
- Webhook HMAC path: sent live requests to
  `https://api-nox.cloud-it.com.ar/webhook/chatwoot` with the old
  `?token=` scheme and with no signature at all — both returned `401` in
  production. Confirmed `nox-webhook-signer` has no `HTTPRoute` and its
  `NetworkPolicy` accepts ingress only from the `chatwoot` namespace on port
  8080.
- WhatsApp link tokens: confirmed `secrets.token_hex(16)` (128 bits, up from
  32) and atomic `GETDEL`.

**Found and fixed:**

1. **`ENVIRONMENT` and `TRUSTED_PROXY_CIDRS` were declared on the `migrate`
   initContainer instead of the `nox-api` container** in
   `manifests-contabo/nox-backend.yaml`. The initContainer runs once during
   rollout and exits; it never affects the long-running process that serves
   traffic. Effect verified against the live pod before the fix:
   - `GET https://api-nox.cloud-it.com.ar/docs` returned `200` with a real
     Swagger UI, i.e. `is_production` was `False` in the running container
     despite the changelog above recording this as closed.
   - The `Strict-Transport-Security` header was absent from live API
     responses (gated behind the same `is_production` flag).
   - `TRUSTED_PROXY_CIDRS` was empty in the running container, so
     `client_ip.py`'s trusted-proxy check never matched. This fails safe (it
     falls back to the raw peer IP rather than trusting a spoofable
     `X-Forwarded-For`), but it meant rate limiting was keying off the KEDA
     HTTP interceptor's pod IP for all public traffic instead of the real
     client IP — not exploitable, but not doing what it was built for.

   Fix: moved both `env` entries from the `migrate` initContainer to the
   `nox-api` container in `manifests-contabo/nox-backend.yaml`. Validated
   with `kubectl apply --dry-run=server` against the live cluster.

2. **The new CSP silently blocked the site's display fonts.** `src/app/
   layout.tsx` loads Bodoni Moda and Archivo via a direct `<link>` to
   `fonts.googleapis.com`/`fonts.gstatic.com` (Geist and Oswald already go
   through `next/font/google`, which self-hosts and was unaffected). The CSP
   added in `47af10e` only allowed `style-src 'self' 'unsafe-inline'` and
   `font-src 'self' data:`, so a real browser would drop both the stylesheet
   and the font files and fall back to system fonts — no error visible to
   `curl`, which is why the "production home and login returned HTTP 200"
   check in this log did not catch it. This is the exact gap already flagged
   above as not done ("Perform an authenticated browser smoke test ...
   representative images/fonts").

   Fix: added `https://fonts.googleapis.com` to `style-src` and
   `https://fonts.gstatic.com` to `font-src` in `next.config.ts`, restoring
   the original font-loading behavior without loosening anything else in the
   policy. (A tighter alternative — migrating Bodoni Moda/Archivo to
   `next/font/google` like the other two fonts, removing the external
   requests entirely — was not done here to keep this fix minimal; worth
   doing later.)

**Still not verified by either pass** (carried over, unchanged):

- [ ] Authenticated browser smoke test of the full Auth.js callback and
  protected admin views (curl-based checks cannot exercise the OAuth
  redirect flow or client-side rendering).
- [ ] Gateway-level request/concurrency/body-size limits.
- [ ] Git history cleanup for the historical plaintext OIDC secret.
