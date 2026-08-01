# Phase 5 Filtering Test Report

## Status and Environment

Temporary Part 2 working report. Final PDF consolidation is deliberately deferred.

| Field | Value |
| --- | --- |
| Execution date | 1 August 2026 |
| Target | Local Restful Booker only |
| Base URL | `http://127.0.0.1:3001` |
| Docker image | `mwinteringham/restfulbooker@sha256:e4a04233731ceca2e6d99bca16689e0d4bc44631047ab351b6f11b5fa08fb418` |
| Framework | Playwright APIRequestContext, TypeScript, and Zod |

## Coverage and Results

Every successful filter response is parsed as a booking-ID list. Returned IDs are retrieved individually and their booking data is checked against the predicate rather than accepting a `200` alone.

| Scenario | Actual behavior | Result |
| --- | --- | --- |
| Exact firstname | Only exact-case controlled records returned | Pass |
| Exact lastname | Only matching controlled records returned | Pass |
| Firstname and lastname | Only combined match returned | Pass |
| No match | `200` with `[]` | Pass |
| Apostrophe and ampersand | Correctly encoded and matched | Pass |
| Name case variants | Separate case-sensitive result sets | Characterization pass |
| Check-in equals lower boundary | Exact-boundary booking excluded | Expected failure - BUG-API-015 |
| Checkout upper boundary | Equal and earlier checkout included | Pass |
| Combined date range | Exact check-in booking excluded | Expected failure - BUG-API-015 |
| Inverted range | `200` with `[]` | Pass |
| Invalid textual date | `500 Internal Server Error` | Expected failure - BUG-API-016 |
| Impossible calendar date | Normalized and queried | Expected failure - BUG-API-013 |
| Unknown parameter | Ignored | Pass |
| `limit=1` and `offset=1` | Full collection returned | Characterization pass |

## Confirmed Defects

### BUG-API-015: Check-in filtering excludes the documented lower boundary

- Severity: Medium
- Endpoint: `GET /booking?checkin={date}`
- Reproducibility: 100%
- Steps: create one booking on `2032-04-10` and another on `2032-04-11`, then filter from `2032-04-10`.
- Expected: both IDs are returned because the embedded API documentation specifies greater-than-or-equal behavior.
- Actual: only the later booking is returned.
- Impact: valid bookings disappear from exact-boundary and combined date-range searches.
- Automation: [`tests/filtering.spec.ts`](../tests/filtering.spec.ts)

### BUG-API-016: Invalid filtering dates produce HTTP 500

- Severity: Medium
- Endpoint: `GET /booking?checkin={date}`
- Reproducibility: 100%
- Steps: request `GET /booking?checkin=not-a-date`.
- Expected: `400 Bad Request` with a date-validation error.
- Actual: `500 Internal Server Error`.
- Impact: consumer input errors appear as service outages.
- Automation: [`tests/filtering.spec.ts`](../tests/filtering.spec.ts)

### BUG-API-013 extension: Impossible filter dates are normalized

Filtering with an impossible calendar date is accepted and normalized instead of returning `400`. This is recorded under BUG-API-013 to avoid creating a duplicate defect for the same date-parsing cause.

## Product Questions and Limitations

- Name filtering is case-sensitive. Case-insensitive customer search is reasonable but not stated in the contract, so this remains a usability question rather than an expected failure.
- Pagination is unsupported: `limit` and `offset` are ignored. This is a scalability limitation because pagination is not promised by the published contract.
- The embedded checkout documentation says greater-than-or-equal while observed behavior acts as an inclusive upper bound. The intended contract requires clarification.
- Duplicate-date bookings remain an inventory question because no room, property, capacity, or resource identifier exists.
- Unauthenticated GET access is documented and is not classified as a security defect.

## Confirmed Non-Defects

- Exact and combined name filtering return correct data.
- No-match filters return an empty array.
- Special characters are URL-encoded correctly.
- Checkout upper-bound behavior is internally consistent.
- Inverted ranges return no matches.
- Unknown query parameters are ignored.

## Repeatability and Cleanup

| Suite | Tests | Normal passes | Expected failures | Unexpected failures |
| --- | ---: | ---: | ---: | ---: |
| Filtering | 12 | 8 | 4 | 0 |

The combined Part 2 command passed 100 tests. Three complete local runs passed 101 tests each: 43 normal passes, 58 expected known-defect failures, and zero unexpected failures. The collection returned from 25 records to 25 after each run, and every tracked ID was verified as `404` during teardown.
