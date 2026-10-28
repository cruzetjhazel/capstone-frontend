# Playwright Setup

## Local fixture run

The suite uses the existing Vite server on port 8080 and Playwright's installed browsers.

```powershell
npm install
npx playwright install chromium
npm run test:e2e:chromium
```

The default tests intercept requests only to `http://127.0.0.1:8000/api/**`. They use deterministic fixture identities for client, approved studio, pending studio, and admin roles. Frontend modules under `/src/api/` are never intercepted.

## Real Laravel run

The Laravel project was found at `c:\xampp\htdocs\casptone-backend`. Its API route map includes authentication, photographer applications, packages, availability, bookings, budget requests, recorded payments, notifications, reports, reviews, and admin endpoints.

Before enabling real-backend coverage, provide an isolated test database and seed non-production accounts. Do not point tests at production or the existing development database. The frontend's API URL can be supplied to Vite with `VITE_API_URL`.

Real runs are intentionally not claimed by this suite yet because no safe seeded account contract or reset command was supplied. The payment model is external/manual: tests must submit and verify references only, never call a payment gateway.

## Useful commands

```powershell
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npx playwright show-report
```

Use `--grep FLOW-` after the isolated backend contract is ready. The workflow tests are currently `test.fixme` and will not mutate data.
