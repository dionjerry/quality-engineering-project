# Ubulu Africa QA Engineer Assessment

## Walkthrough Video

To be added before submission.

## Chosen Electives

To be confirmed.

## Setup and Run Instructions

Part 2 API automation targets only the local Restful Booker service. Docker Desktop, Node.js 22 or later, and npm are required.

The supplied Restful Booker image is pinned for repeatability and runs as `linux/amd64`. Docker Desktop automatically uses emulation when the host is an Apple Silicon Mac.

```bash
cd api-tests
npm ci
npm run test:local
```

`test:local` starts the service, waits for its `/ping` health check, and runs the complete API suite. The service remains running so reports can be inspected and the tests can be rerun quickly.

```bash
npm test                 # Run the complete suite against the running local service
npm run test:smoke       # Run the service-availability check only
npm run test:auth        # Run authentication scenarios
npm run test:authorization # Run protected-endpoint authorization scenarios
npm run test:phase2      # Run authentication and authorization together
npm run lint             # Run static lint checks
npm run typecheck        # Run strict TypeScript checks
npm run check            # Run lint, type-check, and the smoke test
npm run test:report      # Open the latest HTML report
npm run service:down     # Stop and remove the local service
```

Reports are generated locally in `api-tests/playwright-report/` and `api-tests/test-results/`. These generated directories are intentionally excluded from version control.

Known product defects remain executable with Playwright's expected-failure marker. These tests assert the correct expected behavior while allowing the pipeline to remain green as long as the documented defect reproduces. If the product is fixed and an expected-failure test unexpectedly passes, Playwright fails the run so the marker and defect record can be reviewed.

## Known Gaps

- The assessment is in progress.
- Part 1 documents are currently available in [`docs/Part-1`](docs/Part-1/).
- The AI usage log is maintained in [`docs/AI-Usage.pdf`](docs/AI-Usage.pdf) and will be updated throughout the assessment.
- Part 2 currently covers local service availability, authentication, and authorization for PUT, PATCH, and DELETE. Full CRUD, negative/boundary, and filtering coverage are not yet included.
- Restful Booker does not expose a token expiry duration, revocation endpoint, or deterministic method for producing a naturally expired token. Stale/invalid-token rejection is covered without claiming time-based expiry.
- The API test configuration rejects non-local targets to prevent accidental testing of the public Restful Booker service.
- Elective selection, CI/CD integration, and the walkthrough video are not yet included.
