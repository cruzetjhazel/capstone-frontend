# System Feature Traceability

Source reviewed: `src/test/fontend content.docx`.

Status meanings:

- **PASS**: covered by an executable fixture-backed Playwright case and actually run.
- **BLOCKED**: a Playwright case exists, but execution requires seeded backend records and a resettable test database.
- **NOT IMPLEMENTED**: the DOCX describes behavior that is not present in the current frontend/API surface; no passing test is claimed.
- **PARTIAL**: the UI exists, but the full backend mutation/status contract is not executable with current fixtures.

## Traceability

| DOCX requirement | Frontend/API evidence | Test coverage | Status |
|---|---|---|---|
| 2.1-2.2 Authentication and account structure | Login, registration, `RoleContext`, `/auth/login`, `/auth/me` | `AUTH-*`, `RBAC-*` | PASS |
| 2.3 Client registration | `/register`, client account flow | `AUTH-004`, `CTRL-004`, `CTRL-005` | PASS for UI; backend creation BLOCKED |
| 2.4 Professional registration | Multi-step freelancer/studio registration UI and application routes | Route/UI coverage exists; document business cases pending | PARTIAL |
| 2.5 Application states | `/photographer/status`, approved/pending fixture identities | `RBAC-003`, `RBAC-004`, `ROUTE-STUDIO-application-status` | PASS for routing |
| 2.6 Account status | Protected route checks active status; account-status requires state | `ROUTE-PUBLIC-account-status` | PASS for guard; suspended/deactivated backend cases BLOCKED |
| 2.7 Login | Login form and protected redirect | `AUTH-001`, `AUTH-002`, `AUTH-005`, `AUTH-006` | PASS |
| 2.8 Password management | Forgot-password UI and reset route | `AUTH-003`, `AUTH-007`, reset route matrix | PASS for UI; email/token reset BLOCKED |
| 2.9 Administrator accounts | Admin role fixture and protected admin routes | `RBAC-006`, `MOD-ADMIN-*` | PASS for access |
| 2.10 Application review | Admin verification/review routes exist | `ROUTE-ADMIN-review-application`, module route | PARTIAL; approve/reject mutation BLOCKED |
| 2.11 Dashboard access | Role-specific route guards | `RBAC-*`, `MOD-*` | PASS for access |
| 2.12 Login history | Admin activity-log UI/API exists; no separate user login-history route identified | Admin logs route only | PARTIAL |
| 3.1-3.6 Roles and permissions | `ProtectedRoute`, client/studio/admin route map | `RBAC-*`, `MOD-*` | PASS for route permissions; record-level authorization BLOCKED |
| 4.1-4.2 Client profile | `/profile`, `/client/profile`, profile UI | `FEAT-005`, client route matrix | PARTIAL; successful persistence BLOCKED |
| 4.3 Client password change | Profile UI and `/client/change-password` route | Workflow placeholder | BLOCKED |
| 4.4 Account deactivation | Profile UI and `/client/deactivate` route | Workflow placeholder | BLOCKED |
| 4.5 Favorites | Favorites page and favorite API routes | Client module route | PARTIAL; add/remove persistence BLOCKED |
| 4.6 Reports | Report page and report API routes | Client module route | PARTIAL; submit/status workflow BLOCKED |
| 5.1-5.3 Photographer types and registration | Freelancer/studio registration choices | `AUTH-004`, registration UI | PASS for choices; submission BLOCKED |
| 5.4 Verification documents | Registration upload UI and application document routes | Registration route coverage | PARTIAL; upload/download/review BLOCKED |
| 5.5 Portfolio upload | Studio portfolio page and portfolio routes | Studio module route | PARTIAL; upload/archive/restore BLOCKED |
| 5.6 Public profile builder | Registration/profile UI and profile routes | Public profile route | PARTIAL; persistence BLOCKED |
| 5.7 Bookability | Booking page and public profile/package/availability APIs | `FLOW-001`, `DOC-BOOK-*` | BLOCKED pending valid seeded profile/package/portfolio |
| 5.8-5.9 Application review/dashboard | Admin review and studio status/dashboard routes | RBAC and route matrix | PARTIAL; state mutations BLOCKED |
| 6.1 Public professional profile | `/photographers/:id` | Public route matrix | PASS for route; populated data assertions BLOCKED |
| 6.2 Portfolio management | Studio portfolio route/API | Module route | PARTIAL |
| 6.3 Fixed packages | Studio packages UI/API | `FEAT-003`, module route | PASS for empty-form validation; CRUD BLOCKED |
| 6.4-6.5 Custom package requests/calculator | Custom-package UI/API and booking flow | `FLOW-002`, `FLOW-007` | BLOCKED |
| 6.6 Add-ons | Add-on UI/API | `FEAT-004`, module route | PASS for empty-form validation; CRUD/booking use BLOCKED |
| 6.7 Archive/restore | Package/add-on/archive UI/API | Module route | PARTIAL; state transitions BLOCKED |
| 6.8 Availability | Studio calendar, windows, blocked dates, hours APIs | `FEAT-002`, `FLOW-008` | PASS for filter UI; persistence/conflict rules BLOCKED |
| 6.9 Duration/buffer | Booking/calendar logic and backend validation | `DOC-BOOK-003`, `DOC-BOOK-005` | BLOCKED |
| 7.1-7.3 Explore/search/filters | Explore URL filters and search controls | `PUB-002`, `CTRL-001..003`, `CTRL-008` | PASS for UI/URL behavior; populated filtering BLOCKED |
| 7.4 Profile actions | Profile route, book/favorite/report controls | Public profile route | PARTIAL |
| 7.5 Favorites | Favorites APIs and client page | Client route | PARTIAL |
| 7.6 Bookability rules | Booking UI plus backend validation contract | `DOC-BOOK-001..005` | BLOCKED |
| 7.7 Fixed/custom package selection | Booking UI and package APIs | `FLOW-001`, `FLOW-007` | BLOCKED |
| 7.8-7.9 Date/time selection | Booking/calendar UI and availability APIs | `DOC-BOOK-001..003` | BLOCKED |
| 7.10-7.12 Event information/type/location | Booking form fields and submission | `FLOW-001`, document cases | BLOCKED |
| 7.13 Backend booking validation | Backend must validate auth, ownership, active records, dates, slots | `DOC-BOOK-001..003` | BLOCKED |
| 7.14 Duplicate requests | Backend booking route/business rule | `DOC-BOOK-004` | BLOCKED |
| 7.15 Temporary hold | Backend booking lifecycle | `DOC-BOOK-005` | BLOCKED |
| 7.16-7.18 Request status/accept/reject | Client/studio booking routes and status UI | `DOC-BOOK-005..006`, `FLOW-003` | BLOCKED |
| 7.19 Cancellation | Client/studio cancellation routes/UI | `DOC-BOOK-007` | BLOCKED |
| 7.20-7.22 Modification/rescheduling/timing | Booking detail UI/API routes | `DOC-BOOK-008` | BLOCKED |
| 7.23-7.24 Completion/review eligibility | Completion and review routes/UI | `DOC-BOOK-009` | BLOCKED |
| 8.1-8.2 Payment records/plans | Half/full payment UI and payment APIs | `FLOW-004`, `DOC-BOOK-011` | PARTIAL; seeded payment records needed |
| 8.3 Payment flow | Current flow records external reference; no gateway | `FLOW-004..006`, `DOC-BOOK-010..011` | PARTIAL |
| 8.4 Xendit | No Xendit frontend SDK, route, or integration found | None by design | NOT IMPLEMENTED |
| 8.5 Automatic gateway reference matching | No gateway callback/matching route found | None by design | NOT IMPLEMENTED |
| 8.6-8.7 Payment status/records | Client payment, photographer verification/rejection, admin payments routes exist | `FLOW-004..006`, `DOC-BOOK-011` | BLOCKED |
| 8.8 Remaining balance | Payment plan/payment info UI and service routes | `DOC-BOOK-011` | BLOCKED |
| 8.9 Onsite payment recording | Photographer onsite-payment route exists | Workflow placeholder | BLOCKED |
| 8.10 Booking/payment status relationship | Backend status transition contract | `DOC-BOOK-010..011` | BLOCKED |
| 8.11 Service tracker | Studio booking detail service-tracker/complete routes exist | Workflow placeholder | BLOCKED |
| 8.12 Booking snapshots | Package/add-on snapshots are backend behavior | `DOC-BOOK-012` | BLOCKED |
| 8.13-8.15 Payment history/notifications/final lifecycle | Payment pages, notifications, booking routes exist | Module/notification cases | PARTIAL/BLOCKED |
| Standalone messaging | Notification type exists, but no message page/API route found | None | NOT IMPLEMENTED |

## Current execution truth

The last complete Chromium run before the final five control additions was **73 passed, 10 skipped, 0 failed**. The added controls were run separately and passed. The cross-browser inventory contains **300 scheduled tests** across 100 case definitions, but scheduled is not the same as executed or passed.

The blocked cases require an isolated Laravel test database, seeded records, and reset support. They must not be converted to passing claims until those conditions exist.
