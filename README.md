# Photography Booking System – Frontend

**A Web-based Centralized Photography Booking System for Photographers of Bulan, Sorsogon with Dynamic Package Customization and Rating System**

> **Live demo status:** Only the frontend is deployed (Vercel). The Laravel backend API has not been deployed yet, so pages that need data, such as login, packages, and bookings, won't work on the live site yet. Automated test results are below.

![E2E tests](https://img.shields.io/badge/e2e%20tests-60%20passed-brightgreen)
![Backend tests](https://img.shields.io/badge/backend%20tests-508%20passed-brightgreen)

React + TypeScript client for the photography booking platform. The Laravel API lives in the companion repo **`casptone-backend`**.

## Key Features

- Client, photographer and admin roles with email verification, password reset, suspension and appeals
- Photographer applications (freelance and studio) with admin review, revision requests and reapplication
- Fixed packages, **dynamic custom packages** (fixed, hourly, per-day and per-person pricing), add-ons and multi-session bookings
- Availability windows, blocked dates, slot conflicts, waitlist and slot offers
- Booking lifecycle: request, accept or decline, expiry, budget negotiation, reschedule, modify, cancel, no-show reports with admin review
- GCash payment submission and verification, onsite balance recording and refund recording
- Service tracker, reviews and ratings, notifications, reports, dashboards and activity logs

## Project Snapshot

### Automated test results (latest recorded run)

| Layer | Repo | Framework | Environment | Tests | Passed | Failed | Duration |
|---|---|---|---|---:|---:|---:|---:|
| Backend (API) | `casptone-backend` | Laravel `php artisan test` (Unit + Feature) | Local, test database | 508 | 508 | 0 | 140.72 s |
| Frontend (E2E) | `capstone-frontend` | Playwright | Chromium, real Laravel API + seeded data | 60 | 60 | 0 | 20.9 min |
| **Total** | | | | **568** | **568** | **0** | |

The backend run reports 1,968 assertions.

### Documentation snapshot

| Document | Scope | Result |
|---|---|---|
| Manual test cases | 130 designed cases in 13 modules | 106 passed manually · 24 not yet run manually (all 24 now have automated coverage, see [reconciliation](#manual-cases-not-yet-run-vs-automated-coverage)) · 0 failed |
| Bug report | 18 bugs across 3 prototypes | 13 fixed · 2 for enhancement · 2 open · 1 status not recorded |

## Getting Started

```bash
npm install
npm run dev
```

The app expects the Laravel API from `casptone-backend` to be running (`php artisan serve`).

## Automated Testing

Backend and end-to-end suites both pass in full. This repo owns the Playwright e2e suite; the backend suite lives in `casptone-backend`.

### Frontend E2E – Playwright (60 tests, all passing)

These tests drive the **real React forms against the real Laravel API** on Chromium. Most specs create real records and then reopen the form to prove the data persisted. The `REAL-00x` smoke tests are read-only against seeded data.

```bash
npx playwright install chromium
npx playwright test --project=chromium
```
| Test # | Spec group | Test IDs | Tests | What is verified |
|---|---|---|---:|---|
| 1–14 | Authentication (real API) | LOG-02, LOG-03, LOG-08, SES-01, SES-02/03, REG-04, REG-05, REG-06, REG-07, PW-04, PW-07 | 14 | Wrong password and unregistered email show the same error (no account hint); logged-in client and photographer opening `/login` are sent to My Bookings or the studio dashboard; user stays logged in after a refresh; logout returns to login and the old session cannot be reused; a duplicate email (client or photographer) cannot register; invalid email, mismatched passwords and the Terms checkbox block the next step; the registration API ignores an administrator account type; reset links with a wrong token, or with no token or email, show the invalid-link message |
| 15–17 | Photographer accepts a booking | BST-01a – BST-01c | 3 | A client cannot accept a request and it stays pending; cancelling the accept confirmation leaves the request pending; accepting confirms the booking and the client can go to pay |
| 18–19 | Admin no-show review | BST-12, BST-10 | 2 | Admin confirms a no-show and the booking becomes Not Completed with the decision shown to the client; admin changes the status of a disputed report and adds a note |
| 20 | Booking completion after the session | BST-15 | 1 | Photographer completes a finished session and the client can review it |
| 21–23 | Booking flows | BST-02, BKG-20, BST-13 | 3 | Photographer must give a reason to decline and the client sees it; a client cancelling an unpaid booking is cancelled right away; another client cannot open the booking |
| 24 | Booking lifecycle: accept, pay, verify | LIFE-01 | 1 | A request goes from Pending to a verified payment |
| 25–29 | No-show reports and too-soon accept | BST-09, BST-11, BST-14 | 5 | Client reports a photographer no-show; no-show cannot be reported before the start time; photographer reports a client no-show and the client can dispute; a request that starts too soon cannot be accepted |
| 30–31 | Booking form: extra sessions | BKG-11, BKG-15 | 2 | The same day and time cannot be picked twice in one booking; a same-event extra day needs only a date and start time |
| 32–40 | Custom package charge methods | CPK-02a – CPK-05b | 9 | Fixed price, by the hour, by the day and by the person: valid values save and persist after reopening; missing or invalid values show an error and nothing is saved |
| 41–43 | Package: outdoor / on-location price | PKG-10a – PKG-10c | 3 | An outdoor price of 0 is rejected; a positive price saves; a blank price is allowed (same price everywhere) |
| 44–48 | Regular package: maximum sessions | PKG-09a – PKG-09e | 5 | 15 saves and persists; 16 is rejected; other values above the maximum are blocked; values below 2 are raised to 2; a decimal such as 2.5 is rejected by the server |
| 49–52 | Custom package: maximum sessions | PKG-09f – PKG-09i | 4 | 15 saves and persists; typing 16 stops at 15; values below 2 show an error; a decimal such as 2.5 is rejected by the server |
| 53–60 | Real seeded Laravel read-only smoke | REAL-001 – REAL-008 | 8 | Seeded client login, bookings, favorites, payment records, notification feed, profile, public photographers and photographer data, all without mutating records |
| | **Total** | | **60** | **60 passed** (Chromium, real API, 1 worker, 20.9 min) |

> The e2e suite uses its own test IDs (for example `BKG-11`, `BST-09`, `PKG-09`). They are **not** the same as the manual document's TC IDs, so do not match the two by ID.

### Backend – Laravel (508 tests, all passing)

Summary of the companion suite that these e2e tests run against. Full detail is in the `casptone-backend` README.

| Area | Test classes | Tests | Result |
|---|---:|---:|---|
| Accounts, auth and sessions | 9 | 57 | all passed |
| Photographer applications and profiles | 6 | 46 | all passed |
| Packages, custom packages and add-ons | 4 | 59 | all passed |
| Availability and public discovery | 7 | 53 | all passed |
| Booking creation and multi-session | 3 | 24 | all passed |
| Booking lifecycle, expiry and service tracker | 3 | 36 | all passed |
| Change requests, cancellation and no-show | 4 | 73 | all passed |
| Budget negotiation | 1 | 28 | all passed |
| Waitlist and slot offers | 2 | 60 | all passed |
| Payments and refunds | 5 | 45 | all passed |
| Notifications | 4 | 17 | all passed |
| Unit tests and smoke | 6 | 10 | all passed |
| **Total** | **54** | **508** | **508 passed (1,968 assertions)** |

## Manual Test Case Documentation

The manual document (`docs/test-case.docx`) holds 130 designed test cases with *What to test*, *Expected result*, *Actual result* and *Status* for each. It is a **snapshot of the last manual pass**, written after most of the system was built, so it is **not** the source of truth for what currently works. Use the automated results above for that.

| Module | Designed | Passed (manual) | Not tested (manual) |
|---|---:|---:|---:|
| Authentication and Account Status | 30 | 30 | 0 |
| Profile, Settings, Portfolio and Application | 12 | 12 | 0 |
| Packages, Custom Packages and Add-ons | 14 | 8 | 6 |
| Availability and Waitlist | 12 | 4 | 8 |
| Explore and Favorites | 4 | 3 | 1 |
| Booking | 18 | 13 | 5 |
| Booking Management | 10 | 9 | 1 |
| Payments | 10 | 7 | 3 |
| Service Process | 2 | 2 | 0 |
| Reviews and Ratings | 3 | 3 | 0 |
| Notifications | 4 | 4 | 0 |
| Reports | 2 | 2 | 0 |
| Dashboards, Analytics, Logs and Settings | 9 | 9 | 0 |
| **Total** | **130** | **106** | **24** |

## Bug Report

Full details are in `docs/bug-report.docx`. Bugs were reported by panelists and testers across three prototype rounds.

| Metric | Count |
|---|---:|
| Bugs logged | **18** |
| Fixed | 13 |
| For Enhancement | 2 |
| Open | 2 |
| Status not recorded | 1 |
| Severity – High / Medium / Low | 10 / 6 / 2 |


## Proponents

Cruzet, Jhazel G. · Muring, Erica G. · Demetrial, Chariza Mae · Palacio, Patrick B.

*A Web-based Centralized Photography Booking System for Photographers of Bulan, Sorsogon with Dynamic Package Customization and Rating System*
