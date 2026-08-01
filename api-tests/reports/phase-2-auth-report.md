# Phase 2 Authentication and Authorization Report

## Status

Temporary working report for Part 2. This Markdown file will be reviewed and consolidated into `/docs/Part-2/Bug-Report.pdf` after all Part 2 phases are complete.

## Environment

| Field | Value |
| --- | --- |
| Execution date | 1 August 2026 |
| Target | Local Restful Booker only |
| Base URL | `http://127.0.0.1:3001` |
| Docker image | `mwinteringham/restfulbooker@sha256:e4a04233731ceca2e6d99bca16689e0d4bc44631047ab351b6f11b5fa08fb418` |
| Framework | Playwright APIRequestContext with TypeScript |
| Execution mode | Serial, one worker |

## Scope

- Successful and unsuccessful token creation.
- Required-field and malformed-body validation.
- Valid, missing, invalid, and stale-token behavior.
- Authorization for PUT, PATCH, and DELETE.
- Verification that rejected requests do not change or delete bookings.
- Per-test booking creation and automatic cleanup.

## Scenario Results

| Area | Scenario | Actual behavior | Automation result |
| --- | --- | --- | --- |
| Authentication | Valid credentials | `200`; unique 15-character hexadecimal token | Pass |
| Authentication | Invalid username | `200`; `Bad credentials`; no token | Expected failure - BUG-API-001 |
| Authentication | Invalid password | `200`; `Bad credentials`; no token | Expected failure - BUG-API-001 |
| Validation | Missing username | `200`; generic `Bad credentials`; no token | Expected failure - BUG-API-004 |
| Validation | Missing password | `200`; generic `Bad credentials`; no token | Expected failure - BUG-API-004 |
| Validation | Empty username | `200`; generic `Bad credentials`; no token | Expected failure - BUG-API-004 |
| Validation | Empty password | `200`; generic `Bad credentials`; no token | Expected failure - BUG-API-004 |
| Validation | Empty JSON object | `200`; generic `Bad credentials`; no token | Expected failure - BUG-API-004 |
| Validation | Zero-byte body | `200`; generic `Bad credentials`; no token | Expected failure - BUG-API-004 |
| Validation | Malformed JSON | `400 Bad Request`; no token | Pass |
| Authorization | Valid token on PUT | `200`; replacement persisted | Pass |
| Authorization | Missing token on PUT | `403`; booking unchanged | Pass |
| Authorization | Invalid token on PUT | `403`; booking unchanged | Pass |
| Authorization | Valid token on PATCH | `200`; requested field changed and other fields preserved | Pass |
| Authorization | Missing token on PATCH | `403`; booking unchanged | Pass |
| Authorization | Invalid token on PATCH | `403`; booking unchanged | Pass |
| Authorization | Valid token on DELETE | `201`; booking no longer available | Pass |
| Authorization | Missing token on DELETE | `403`; booking remains available | Pass |
| Authorization | Invalid token on DELETE | `403`; booking remains available | Pass |
| Token lifecycle | Fabricated stale token | `403`; booking unchanged | Pass |
| Health | GET `/ping` | `201 Created` with body `Created` | Expected failure - BUG-API-003 |

## Repeatability and Cleanup Evidence

The full local suite was executed three consecutive times without resetting or manually preparing test data.

| Run | Total tests | Normal passes | Expected failures | Unexpected failures | Process result |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 21 | 12 | 9 | 0 | Passed |
| 2 | 21 | 12 | 9 | 0 | Passed |
| 3 | 21 | 12 | 9 | 0 | Passed |

Every protected-endpoint test created a separate run-scoped booking. The fixture deleted tracked bookings with a valid token during teardown and verified that each deleted ID returned `404`. Unauthorized requests were followed by a GET assertion proving that the original booking remained unchanged.

## Defects and Limitations

### BUG-API-001: Invalid credentials return HTTP 200

- Endpoint: `POST /auth`
- Severity: Medium
- Reproducibility: 100%
- Expected: `401 Unauthorized`, a structured authentication error, and no token.
- Actual: `200 OK`, `{ "reason": "Bad credentials" }`, and no token.
- Impact: Clients, monitoring, and security telemetry may treat failed authentication as successful HTTP traffic.
- Automated coverage: [`tests/authentication.spec.ts`](../tests/authentication.spec.ts)

### BUG-API-002: Tokens have no expiration or revocation mechanism

- Endpoints: `POST /auth` and protected booking operations
- Severity: Medium in this disposable environment; potentially High in production
- Expected: A documented token lifetime, deterministic expiry behavior, and revocation support.
- Actual: Tokens are stored in process memory without timestamps, TTL, logout, revocation, scheduled cleanup, or deletion logic.
- Evidence: A token remains usable while the process runs; a token created before a container restart returns `403` afterward because in-memory state is lost.
- Limitation: A naturally expired token cannot be generated. Container restart proves stale-token rejection, not time-based expiration.
- Automated coverage: deterministic invalid/stale-token rejection in [`tests/authorization.spec.ts`](../tests/authorization.spec.ts). No arbitrary timed expected-failure test is included.

### BUG-API-003: GET /ping returns HTTP 201 Created

- Endpoint: `GET /ping`
- Severity: Low
- Reproducibility: 100%
- Expected: `200 OK` for a successful health read.
- Actual: `201 Created` with body `Created` even though the GET request creates no resource.
- Impact: Health checks and monitoring receive semantically incorrect status information.
- Automated coverage: [`tests/health.spec.ts`](../tests/health.spec.ts)

### BUG-API-004: Required credentials receive generic authentication errors

- Endpoint: `POST /auth`
- Severity: Low/Medium
- Reproducibility: 100%
- Expected: `400 Bad Request` with field-specific validation identifying the missing or empty username/password.
- Actual: `200 OK` with the generic response `{ "reason": "Bad credentials" }`.
- Impact: API consumers cannot distinguish invalid credentials from structurally incomplete requests and cannot provide precise corrective feedback.
- Automated coverage: [`tests/authentication.spec.ts`](../tests/authentication.spec.ts)

## Expected-Failure Policy

Confirmed deterministic defects remain executable using Playwright's `test.fail` marker. Each test asserts the correct expected behavior rather than accepting the defective response.

- A defect that fails as documented is reported as an expected failure and does not keep CI permanently red.
- A defect that unexpectedly passes makes Playwright fail the run, prompting removal of the marker and defect retesting.
- New failures that are not explicitly marked continue to fail the suite normally.
- Assertions proving that failed authentication issues no token run before the known-bug status assertion.

## Deferred Observations

- GET `/booking` without authentication is documented behavior and is not classified as an authentication defect.
- Pagination is an enhancement/risk candidate for the filtering phase.
- Case-sensitive name filtering must be reproduced against controlled local data during the filtering phase before it can be classified.
- Identical-date booking behavior is characterized as an open inventory question in [`phase-3-crud-report.md`](phase-3-crud-report.md), not a confirmed defect without a resource-capacity rule.
