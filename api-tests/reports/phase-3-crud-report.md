# Phase 3 CRUD and Schema Validation Report

## Status

Temporary working report for Part 2. This Markdown file will be reviewed and consolidated into `/docs/Part-2/Bug-Report.pdf` after all Part 2 phases are complete.

## Environment

| Field | Value |
| --- | --- |
| Execution date | 1 August 2026 |
| Target | Local Restful Booker only |
| Base URL | `http://127.0.0.1:3001` |
| Docker image | `mwinteringham/restfulbooker@sha256:e4a04233731ceca2e6d99bca16689e0d4bc44631047ab351b6f11b5fa08fb418` |
| Framework | Playwright APIRequestContext, TypeScript, and Zod |
| Execution mode | Serial, one worker |

## Scope and Approach

- Deterministic create, read, full update, partial update, and delete operations.
- Structural validation of every successful booking response.
- Intended-contract validation for names, price, Boolean deposit status, ISO dates, and date ordering.
- Persistence checks after PUT and PATCH and absence checks after DELETE.
- Correct-behavior assertions for confirmed defects using Playwright `test.fail`.
- Per-test unique data with automatic authenticated teardown and GET `404` verification.

`additionalneeds` is optional in the schema because the local API accepts its omission and omits the field from the response. All other booking fields are treated as mandatory.

## Scenario Results

### CRUD

| Scenario | Actual behavior | Automation result |
| --- | --- | --- |
| Create a unique valid booking | `200`; positive ID and complete booking returned | Pass |
| Read a run-created booking | `200`; response matches the created payload | Pass |
| Full authenticated update | `200`; every replacement field persisted | Pass |
| Partial authenticated update | `200`; selected fields changed and omitted fields were preserved | Pass |
| Authenticated delete | `201`; subsequent GET returns `404` | Pass |
| Complete CRUD lifecycle | Create, read, PUT, PATCH, and delete succeed with state validation | Pass |
| Two customers with identical dates | Both accepted with distinct IDs | Characterization pass; open product question |

### Schema and Error Handling

| Scenario | Actual behavior | Automation result |
| --- | --- | --- |
| Negative `totalprice` through POST/PUT/PATCH | Accepted and persisted | Expected failure - BUG-API-005 |
| Blank names through POST/PUT/PATCH | Accepted and persisted | Expected failure - BUG-API-006 |
| Missing mandatory POST field | `500 Internal Server Error` | Expected failure - BUG-API-007 |
| String `depositpaid` through POST/PUT/PATCH | Accepted and coerced to `true` | Expected failure - BUG-API-008 |
| Checkout before check-in through POST/PUT/PATCH | Accepted and persisted | Expected failure - BUG-API-009 |
| PUT/PATCH/DELETE of a deleted ID | `405 Method Not Allowed` | Expected failure - BUG-API-010 |
| Malformed JSON containing unquoted `ddd` | `400 Bad Request`; no booking created | Pass |

For every invalid PUT and PATCH, the test retrieves the booking after the attempted mutation and asserts that correct rejection would preserve the original state. Unexpectedly created invalid POST records are tracked before the correct-behavior assertion and are deleted during teardown.

## Repeatability and Cleanup Evidence

The complete local suite was executed three consecutive times without resetting or manually preparing test data.

| Run | Total tests | Normal passes | Expected failures | Unexpected failures | Process result |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 49 | 20 | 29 | 0 | Passed |
| 2 | 49 | 20 | 29 | 0 | Passed |
| 3 | 49 | 20 | 29 | 0 | Passed |

The 29 expected failures comprise nine previously documented Phase 2 failures and twenty Phase 3 schema/error-contract failures. The booking tracker deleted every run-created booking with a valid token and verified every tracked ID returned `404`. The exploratory bookings used to confirm the defects were also deleted and independently verified as unavailable.

## Confirmed Defects

### BUG-API-005: Booking mutations accept negative total prices

- Endpoints: `POST /booking`, `PUT /booking/{id}`, `PATCH /booking/{id}`
- Severity: High
- Reproducibility: 100% across three runs
- Steps: submit an otherwise valid booking or update with `"totalprice": -1`; retrieve the booking.
- Expected: `400 Bad Request` with validation explaining that the price must be non-negative; an existing booking must remain unchanged.
- Actual: `200 OK`; the negative price is returned and persisted.
- Impact: invalid financial data can affect billing, reconciliation, and reporting.
- Automated coverage: [`tests/schema-validation.spec.ts`](../tests/schema-validation.spec.ts)

### BUG-API-006: Booking mutations accept blank customer names

- Endpoints: `POST /booking`, `PUT /booking/{id}`, `PATCH /booking/{id}`
- Severity: Medium
- Reproducibility: 100% across three runs
- Steps: submit `"firstname": ""` and `"lastname": ""` in an otherwise valid booking or update.
- Expected: `400 Bad Request` with field-specific errors; an existing booking must remain unchanged.
- Actual: `200 OK`; both blank names are persisted.
- Impact: bookings can exist without usable customer identity information.
- Automated coverage: [`tests/schema-validation.spec.ts`](../tests/schema-validation.spec.ts)

### BUG-API-007: Missing mandatory booking fields produce HTTP 500

- Endpoint: `POST /booking`
- Severity: High
- Reproducibility: 100% for `firstname`, `lastname`, `totalprice`, `depositpaid`, and `bookingdates`
- Steps: omit one mandatory field from an otherwise valid POST body.
- Expected: `400 Bad Request` with a structured message naming the missing field.
- Actual: `500 Internal Server Error` with a generic text body.
- Impact: client mistakes are misreported as server failures, obscuring remediation and polluting monitoring.
- Automated coverage: [`tests/schema-validation.spec.ts`](../tests/schema-validation.spec.ts)

### BUG-API-008: Non-boolean deposit status is accepted and coerced

- Endpoints: `POST /booking`, `PUT /booking/{id}`, `PATCH /booking/{id}`
- Severity: High
- Reproducibility: 100% across three runs
- Steps: submit valid JSON containing `"depositpaid": "ddd"`; retrieve the booking.
- Expected: `400 Bad Request` because the field accepts only JSON `true` or `false`; an existing booking must remain unchanged.
- Actual: `200 OK`; the string is silently stored as Boolean `true`.
- Impact: invalid input can incorrectly mark a deposit as paid, creating financial and data-integrity risk.
- Automated coverage: [`tests/schema-validation.spec.ts`](../tests/schema-validation.spec.ts)

### BUG-API-009: Checkout before check-in is accepted

- Endpoints: `POST /booking`, `PUT /booking/{id}`, `PATCH /booking/{id}`
- Severity: High
- Reproducibility: 100% across three runs
- Steps: submit check-in `2026-11-20` and checkout `2026-11-10`; retrieve the booking.
- Expected: `400 Bad Request` explaining that checkout must be later than check-in; an existing booking must remain unchanged.
- Actual: `200 OK`; the reversed date range is persisted.
- Impact: impossible stays can corrupt availability, duration, price, and reporting logic.
- Automated coverage: [`tests/schema-validation.spec.ts`](../tests/schema-validation.spec.ts)

### BUG-API-010: Operations on nonexistent bookings return HTTP 405

- Endpoints: `PUT /booking/{id}`, `PATCH /booking/{id}`, `DELETE /booking/{id}`
- Severity: Medium
- Reproducibility: 100% across three runs
- Steps: create and delete a booking, verify GET returns `404`, then perform authenticated PUT, PATCH, or DELETE on that ID.
- Expected: `404 Not Found` because the resource does not exist.
- Actual: `405 Method Not Allowed`, although each HTTP method is supported for existing bookings.
- Impact: clients receive an incorrect failure category and may apply the wrong recovery behavior.
- Automated coverage: [`tests/schema-validation.spec.ts`](../tests/schema-validation.spec.ts)

## Open Product Question: Duplicate Dates and Overbooking Risk

Two different run-created customers with the same check-in and checkout dates both received successful responses and distinct booking IDs.

This behavior is not yet classified as a confirmed defect because the API has no room, property, capacity, or inventory identifier. Multiple customers may validly share dates if separate rooms exist. Conversely, if the service represents one exclusive room or resource, accepting the second booking is an overbooking defect.

Product clarification required:

1. What resource or inventory unit does a booking reserve?
2. How is capacity represented when the payload has no room or property identifier?
3. Should any overlapping date range be rejected, or only overlaps for the same resource?
4. What status and error contract should an availability conflict return?

Automated characterization: [`tests/crud.spec.ts`](../tests/crud.spec.ts). The test proves the current behavior without encoding an unsupported business expectation. If the product team confirms exclusivity or supplies an overlap rule, this observation should receive a defect ID and a correct-behavior expected-failure test.

## Expected-Failure Policy

- Confirmed defects assert the intended contract and use Playwright `test.fail` with a stable bug ID.
- Reproduction of a known defect is reported as expected and does not keep CI permanently red.
- An unexpected pass fails the run, signalling that the behavior may have been fixed and the marker must be reviewed.
- Unexpected regressions remain ordinary failures.
- Characterization tests and unresolved product questions are never marked as expected failures.

## Confirmed Non-Defects and Observations

- Unquoted `ddd` is malformed JSON. Returning `400 Bad Request` is correct.
- A generic `403 Forbidden` response correctly communicates rejected authorization; a structured body would be an API usability improvement.
- Authenticated PUT and PATCH operate correctly when the target ID exists.
- Missing mandatory fields on PUT return `400`; field-specific details would improve usability, but the status category is correct.
- POST returns `200` and successful DELETE returns `201`. These are questionable REST semantics but match the documented Restful Booker contract and are not treated as functional failures in this suite.
