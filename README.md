# Ubulu Africa QA Engineer Assessment

[![API Tests](https://github.com/dionjerry/quality-engineering-project/actions/workflows/api-tests.yml/badge.svg?branch=main)](https://github.com/dionjerry/quality-engineering-project/actions/workflows/api-tests.yml)

[View the live QA dashboard](https://dionjerry.github.io/quality-engineering-project/) or open the [latest combined Playwright report](https://dionjerry.github.io/quality-engineering-project/latest/).

## Walkthrough Video

To be added before submission.

## Chosen Electives

- Part 2: API Test Automation.
- Part 5: CI/CD.

## Setup and Run Instructions

Part 2 API automation targets only the local Restful Booker service. Docker Desktop, Node.js 22 or later, and npm are required.

The supplied Restful Booker image is pinned for repeatability and runs as `linux/amd64`. Docker Desktop automatically uses emulation when the host is an Apple Silicon Mac.

```bash
cd api-tests
npm ci
cp .env.example .env
# Set API_USERNAME and API_PASSWORD in .env to the local Restful Booker credentials.
npm run test:local
```

`test:local` starts the service, waits for its `/ping` health check, and runs the complete API suite. The service remains running so reports can be inspected and the tests can be rerun quickly.

```bash
npm test                 # Run the complete suite against the running local service
npm run test:ci -- --shard=1/4 # Run one CI-compatible Playwright shard
npm run test:smoke       # Run the service-availability check only
npm run test:auth        # Run authentication scenarios
npm run test:authorization # Run protected-endpoint authorization scenarios
npm run test:crud        # Run deterministic CRUD lifecycle scenarios
npm run test:schema      # Run booking schema and known-defect scenarios
npm run test:negative    # Run negative and boundary scenarios
npm run test:filtering   # Run deterministic booking-filter scenarios
npm run test:phase2      # Run every Part 2 API group
npm run lint             # Run static lint checks
npm run typecheck        # Run strict TypeScript checks
npm run check            # Run lint, type-check, and the smoke test
npm run test:report      # Open the latest HTML report
npm run service:down     # Stop and remove the local service
```

Reports are generated locally in `api-tests/playwright-report/` and `api-tests/test-results/`. These generated directories are intentionally excluded from version control.

The GitHub Actions workflow runs on pushes, pull requests targeting `develop` or `main`, manual dispatches, and nightly at 02:00 UTC (03:00 WAT). It runs lint and strict type-checking before executing the complete API suite across four parallel shards. Each shard provisions an isolated, digest-pinned Restful Booker container and reads `API_USERNAME` and `API_PASSWORD` from GitHub repository secrets.

Shard blob reports are merged into one HTML report and one JUnit report. Combined reports and failure diagnostics are retained as workflow artifacts for 14 days. Only a successful `main` run can publish the latest green report to GitHub Pages; traces, screenshots, request diagnostics, and JUnit XML are not published publicly.

CI-compatible runs retain Playwright traces and error context for unexpected failures. Screenshot capture is also requested on failure, but API-only tests normally have no browser page to capture. Confirmed defects marked with `test.fail()` remain visible in the HTML and JUnit reports rather than producing failure-only traces.

Known product defects remain executable with Playwright's expected-failure marker. These tests assert the correct expected behavior while allowing the pipeline to remain green as long as the documented defect reproduces. If the product is fixed and an expected-failure test unexpectedly passes, Playwright fails the run so the marker and defect record can be reviewed.

## Known Gaps

- The assessment is in progress.
- Part 1 documents are currently available in [`docs/Part-1`](docs/Part-1/).
- The canonical AI usage log is available at [`docs/AI-Usage.pdf`](docs/AI-Usage.pdf) and currently covers Parts 1, 2, and 5.
- Part 2 automation is complete: local service availability, authentication, authorization, deterministic CRUD, runtime schemas, negative/boundary behavior, and filter correctness are covered.
- The final Part 2 defect report is available at [`docs/Part-2/Bug-Report.pdf`](docs/Part-2/Bug-Report.pdf), and the canonical AI usage log includes both Part 1 and Part 2 work.
- Part 5 CI/CD is complete. Its implementation report is available at [`docs/Part-5/CI-CD-Implementation-Report.pdf`](docs/Part-5/CI-CD-Implementation-Report.pdf), and the latest successful `main` report is published on the [live QA dashboard](https://dionjerry.github.io/quality-engineering-project/).
- Identical-date bookings are characterized as an open inventory and overbooking question because the API exposes no room/resource identifier or availability rule. They are not marked as a confirmed defect without a product requirement.
- Restful Booker does not expose a token expiry duration, revocation endpoint, or deterministic method for producing a naturally expired token. Stale/invalid-token rejection is covered without claiming time-based expiry.
- The API test configuration rejects non-local targets to prevent accidental testing of the public Restful Booker service.
- The walkthrough video is not yet included.
