# Playwright Test Inventory

Status values: **PASS** means executed successfully in the fixture-backed Chromium run; **BLOCKED** means the test is intentionally marked `test.fixme` until isolated backend data and business-rule confirmation are available; **NOT RUN** means the test file exists but was not included in the focused execution. The 100 case definitions run across Chromium, Firefox, and WebKit as 300 scheduled browser tests.

| Test ID | Module | Role | Scenario | Expected result | Status |
|---|---|---|---|---|---|
| PUB-001 | Home | Guest | Discovery actions are visible | Home exposes a heading and Explore Studios action | PASS |
| PUB-002 | Explore | Guest | URL-backed service filter | Service query remains in URL and results view renders | PASS |
| PUB-003 | Photographer directory | Guest | Empty API response | Directory remains usable and shows title | PASS |
| PUB-004 | About/Terms | Guest | Informational navigation | Both pages render their primary headings | PASS |
| PUB-005 | Not found | Guest | Unknown route | Not-found content is displayed | PASS |
| AUTH-001 | Login | Guest | Empty required fields | Browser validation prevents submission | PASS |
| AUTH-002 | Login | Guest | Password visibility | Password switches between password/text | PASS |
| AUTH-003 | Password reset | Guest | Empty reset email | Reset form remains open and email remains required | PASS |
| AUTH-004 | Registration | Guest | Account type choices | Client, freelancer, and studio choices render | PASS |
| AUTH-005 | Protected routes | Guest | Visit client route while logged out | Visitor is redirected to login | PASS |
| RBAC-001 | Client bookings | Client | Client login destination | Client reaches bookings | PASS |
| RBAC-002 | Admin route | Client | Cross-role access | Client is redirected away from admin | PASS |
| RBAC-003 | Studio dashboard | Approved studio | Studio login destination | Studio reaches dashboard | PASS |
| RBAC-004 | Application status | Pending studio | Pending application gate | Studio reaches status page | PASS |
| RBAC-005 | Client payments | Studio | Cross-role access | Studio is redirected away from client payments | PASS |
| RBAC-006 | Admin dashboard | Admin | Admin login destination | Admin reaches dashboard | PASS |
| MOD-* | Client/studio/admin routes | All roles | Guarded route rendering and role navigation | Each implemented dashboard module retains its authorized URL | PASS |
| ROUTE-* | Remaining public/client/studio/admin routes | Guest and all roles | Detail, status, payment, receipt, feedback, and review route matrix | Authorized routes preserve their URL; account-status redirects safely without state | PASS |
| CTRL-001 | Public search | Guest | Empty search action | Service chooser opens without navigation | PASS |
| CTRL-002 | Public search | Guest | Unknown service | No-match state is shown | PASS |
| CTRL-003 | Public search | Guest | Free-text location | Location accepts arbitrary text | PASS |
| CTRL-004 | Registration | Guest | Account type required | Continue is disabled until a type is selected | PASS |
| CTRL-005 | Registration | Guest | Client step transition | Account basics step opens | PASS |
| CTRL-006 | Login navigation | Guest | Back to website | Home opens | PASS |
| CTRL-007 | Terms | Guest | Query-state navigation | Terms remains accessible with query parameters | PASS |
| FEAT-001 | Notifications | Client | Empty feed category filter | Empty state remains correct | PASS |
| FEAT-002 | Availability calendar | Studio | Day-off filter | Explanation appears when filter is selected | PASS |
| FEAT-003 | Packages | Studio | Add fixed package form | Modal opens and creation is disabled until valid input | PASS |
| FEAT-004 | Add-ons | Studio | Add-on validation | Creation is disabled without a name | PASS |
| FEAT-005 | Client profile | Client | Profile route under empty fixture data | Authorized profile route remains accessible | PASS |
| FEAT-006 | Admin settings | Admin | Reset control visibility | Settings exposes reset action | PASS |
| DOC-BOOK-001..012 | Booking, availability, payments, reviews, packages | Client/studio | Business rules transcribed from supplied DOCX | Backend validates dates, conflicts, holds, status transitions, reviews, payments, and snapshots | BLOCKED |
| FLOW-001 | Booking creation | Client | Submit booking request | Valid booking is created with expected status | BLOCKED |
| FLOW-002 | Budget negotiation | Client | Submit custom budget | Validation and offer state are correct | BLOCKED |
| FLOW-003 | Budget negotiation | Studio/client | Respond and accept/reject offer | Both roles see the status transition | BLOCKED |
| FLOW-004 | Recorded payment | Client | Submit external payment reference/proof | Reference is recorded, no gateway is called | BLOCKED |
| FLOW-005 | Payment verification | Studio/admin | Verify/reject reference | Authorized status transition is persisted | BLOCKED |
| FLOW-006 | Payment authorization | Client | Attempt verification | Verify controls/API are unavailable to client | BLOCKED |
| FLOW-007 | Packages/custom package | Studio | Create, publish, and customize package | Package/component lifecycle is persisted | BLOCKED |
| FLOW-008 | Availability | Studio | Windows, blocked dates, booking hours | Availability changes affect booking slots | BLOCKED |
| FLOW-009 | Notifications | Client/studio/admin | Read and mark notifications | Read state and unread count update | BLOCKED |
| FLOW-010 | Profile/settings | Client/studio/admin | Update settings with validation | Valid updates persist; invalid input is rejected | BLOCKED |

The `MOD-*` generated tests cover client routes (`favorites`, `reviews`, `profile`, `payments`, `notifications`, `calendar`, reports), studio routes (calendar, bookings, portfolio, earnings, settings, analytics, archive, logs, packages, clients, reviews, notifications), and admin routes (users, bookings, payments, verifications, analytics, settings, logs, archive, reports, notifications, appeals).
