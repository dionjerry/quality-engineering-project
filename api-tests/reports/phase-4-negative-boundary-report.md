# Phase 4 Negative and Boundary Test Report

## Status and Environment

Temporary Part 2 working report. It will be reviewed and consolidated into `/docs/Part-2/Bug-Report.pdf` only after all Part 2 documentation work begins.

| Field | Value |
| --- | --- |
| Execution date | 1 August 2026 |
| Target | Local Restful Booker only |
| Base URL | `http://127.0.0.1:3001` |
| Docker image | `mwinteringham/restfulbooker@sha256:e4a04233731ceca2e6d99bca16689e0d4bc44631047ab351b6f11b5fa08fb418` |
| Framework | Playwright APIRequestContext, TypeScript, and Zod |
| Execution | Serial, one worker |

## Coverage and Results

| Area | Scenario | Actual behavior | Result |
| --- | --- | --- | --- |
| Types | Numeric firstname | POST/PUT `500`; PATCH persists a number | Expected failure - BUG-API-011 |
| Types | Boolean lastname | Accepted and persisted | Expected failure - BUG-API-011 |
| Types | String bookingdates | `500 Internal Server Error` | Expected failure - BUG-API-011 |
| Types | Numeric nested fields/additional needs | Accepted or inconsistently rejected | Expected failure - BUG-API-011 |
| Price | Decimal `99.95` | Stored as `99` | Expected failure - BUG-API-012 |
| Price | Numeric/non-numeric strings | Coerced to a number or `null` | Expected failure - BUG-API-012 |
| Dates | Impossible calendar dates | Normalized and persisted | Expected failure - BUG-API-013 |
| Body | Zero-byte or array POST | `500 Internal Server Error` | Expected failure - BUG-API-014 |
| Names | Whitespace-only values | Stored as empty strings | Expected failure - BUG-API-006 expansion |
| Deposit | String `"false"` | Stored as Boolean `true` | Expected failure - BUG-API-008 expansion |
| Dates | Checkout equals check-in | Accepted | Expected failure - BUG-API-009 expansion |
| Boundaries | Zero and maximum-safe-integer price | Preserved | Pass; product limits unspecified |
| Length | 5,000-character firstname | Preserved | Characterization pass; maximum unspecified |
| Bodies | JSON null and malformed POST | `400 Bad Request` | Pass |
| PUT | Empty, null, array, malformed body | `400`; booking unchanged | Pass |
| PATCH | Zero-byte and array body | `200`; no mutation | Characterization pass |
| Unknown fields | Extra field | Ignored and not persisted | Pass |
| Injection-style data | SQL, HTML, path, and control strings | Stored as JSON data; no cross-record impact | Pass |

Every accepted invalid POST is registered for teardown before the intended-contract assertion. Every PUT/PATCH rejection test retrieves the target and checks that correct rejection would preserve its original state.

## Confirmed Defects

### BUG-API-011: Booking field types are inconsistently validated

- Severity: High
- Endpoints: POST, PUT, and PATCH `/booking`
- Reproducibility: 100%
- Expected: wrong field types return `400` with field-specific validation and do not mutate data.
- Actual: wrong types are variously persisted, coerced, or reported as `500` depending on field and method.
- Impact: invalid response schemas reach clients and client errors are misclassified as server failures.
- Automation: [`tests/negative-boundary.spec.ts`](../tests/negative-boundary.spec.ts)

### BUG-API-012: Price coercion causes silent data corruption

- Severity: High
- Endpoints: POST, PUT, and PATCH `/booking`
- Reproducibility: 100%
- Expected: decimal precision is preserved and string prices return `400`.
- Actual: `99.95` becomes `99`, `"111"` becomes `111`, and `"eleven"` becomes `null`.
- Impact: billing and reconciliation can use values the client did not submit.
- Automation: [`tests/negative-boundary.spec.ts`](../tests/negative-boundary.spec.ts)

### BUG-API-013: Impossible calendar dates are silently normalized

- Severity: High
- Endpoints: POST, PUT, PATCH, and booking filters
- Reproducibility: 100%
- Expected: dates such as `2031-02-30` return `400`.
- Actual: the dates are shifted into March and accepted.
- Impact: the system creates or returns bookings for dates the customer did not request.
- Automation: [`tests/negative-boundary.spec.ts`](../tests/negative-boundary.spec.ts) and [`tests/filtering.spec.ts`](../tests/filtering.spec.ts)

### BUG-API-014: Empty and array POST bodies cause internal server errors

- Severity: High
- Endpoint: `POST /booking`
- Reproducibility: 100%
- Expected: `400 Bad Request` explaining that a booking object is required.
- Actual: zero-byte and JSON array bodies return `500 Internal Server Error`.
- Impact: malformed client input appears as service failure and pollutes monitoring.
- Automation: [`tests/negative-boundary.spec.ts`](../tests/negative-boundary.spec.ts)

## Existing Defect Expansions

- BUG-API-006 also affects whitespace-only names after server trimming.
- BUG-API-008 also converts the string `"false"` into Boolean `true`.
- BUG-API-009 also permits checkout equal to check-in, creating a zero-night stay.

## Risks and Confirmed Non-Defects

- Price maximums, free bookings, and name length limits require product rules.
- PATCH empty/array bodies behave as no-ops; whether they should be rejected is unspecified.
- Injection-style strings produced no injection, data exposure, or service damage. Stored HTML remains a downstream rendering risk, not proven XSS in this API.
- JSON null, malformed JSON, invalid PUT bodies, unknown fields, and special characters are handled without residual data.

## Repeatability and Cleanup

| Suite | Tests | Normal passes | Expected failures | Unexpected failures |
| --- | ---: | ---: | ---: | ---: |
| Negative/boundary | 40 | 15 | 25 | 0 |

The complete local suite passed three consecutive times with 101 tests per run. The collection count was 25 before execution and 25 afterward. Fixture teardown authenticated every deletion and verified each tracked ID returned `404`.
