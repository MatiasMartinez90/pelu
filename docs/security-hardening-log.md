# NOX Security Audit and Hardening Log

Last updated: 2026-07-12  
Status: in progress  
Application repository: `/root/Pelu`  
Infrastructure repository: `/root/agents-hetzner-k3s`  
Kubernetes namespace: `nox`

This is the living record for the NOX security audit and remediation. Update
this file whenever a task is completed, a verification is run, a risk changes,
or an operational decision is made.

## Delivery state

- No commit has been created for this work.
- No changes have been pushed to either repository.
- No application or GitOps changes have been deployed.
- The Kubernetes cluster was inspected read-only. Production secrets were not
  printed or copied into this document.
- Local changes already existed before the security work. They are preserved
  and must not be reverted or attributed to this audit without review.

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
- [x] Added a legacy-token migration switch, disabled by default.
- [x] Added local protocol documentation to `backend/README.md`.
- [x] Generated a 256-bit `WEBHOOK_SIGNING_SECRET` and added only its
  cluster-bound ciphertext to the NOX SealedSecret.
- [x] Implemented `src.webhook_signer`: a private adapter that validates the
  existing Chatwoot token, signs the exact raw body and forwards it to the API.
- [x] Added two hardened signer replicas and an internal-only Service. Its
  NetworkPolicy accepts ingress only from the `chatwoot` namespace and it has
  no public HTTPRoute.
- [ ] Change Chatwoot's configured URL to the internal signer Service during
  rollout and verify end-to-end delivery.
- [ ] Remove the legacy token path after migration.

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
- [ ] Validate CSP in a running production container, including Auth.js login,
  images, fonts, API requests and service worker behavior.

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

1. Rebuild backend with pinned pip and rerun tests/pip-audit.
2. Validate CSP and read-only container behavior.
3. Complete webhook signer design and sealed secret.
4. Complete coordinated OIDC secret rotation and sealed manifests.
5. Validate Kubernetes manifests using server dry-run.
6. Test egress rules and perform final Trivy/secret scans.
7. Review diffs and update this log with final evidence.
8. Present commit/push/deploy boundaries for approval or execute them if the
   user explicitly directs that step.

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
