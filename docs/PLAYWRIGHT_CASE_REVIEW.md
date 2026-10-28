# Supplied Test-Case Review

Reviewed source: `src/test/fontend content.docx`.

## Matches the current system

These requirements map well to the current frontend and Laravel API contract and are represented in the Playwright suite as executable or explicitly blocked cases:

- Public photographer discovery, search, filters, profile, favorites, and bookability.
- Fixed packages, custom package calculator, add-ons, archive/restore lifecycle.
- Availability windows, blocked dates, booking hours, duration, buffer/conflict validation.
- Booking request lifecycle: pending, accepted, rejected, confirmed, cancelled, completed.
- Cancellation, modification, rescheduling, non-completion, and review eligibility workflows.
- Half/full payment plan selection, manual payment-reference submission, payment status, and authorized verification.
- Role permissions for client, studio/photographer, pending photographer, and admin.

## Requires correction before implementation

| Document requirement | Actual implementation | Test decision |
|---|---|---|
| Xendit checkout and gateway verification | No Xendit route, SDK, or frontend gateway flow exists. The current UI records an external payment reference and the photographer verifies/rejects it. | Do not create Xendit tests. Test manual reference/proof submission and verification instead. |
| Automatic Xendit reference matching | No automatic gateway callback or matching endpoint exists in the inspected API routes. | Mark unsupported until backend implementation exists. |
| “Online payment” changes booking to confirmed | Current frontend comments and payment UI require backend payment verification; client submission is not proof of confirmation. | Test accepted -> payment submitted -> authorized verification -> status transition. |
| Messages | Notifications support a `message` notification type, but there is no standalone message route/service in the frontend route map or Laravel API route map inspected. | Test notification rendering only; do not invent a messaging workflow. |
| Professional terminology | The frontend role is `studio` for both freelancer and studio photographer, while the document uses `Professional`. | Keep business-language assertions role-neutral and test both photographer account types where seeded. |

## Current execution state

- Fixture-backed Chromium suite: 83 total, 73 passed, 10 skipped, 0 failed.
- The 12 `DOC-*` cases are intentionally blocked with `test.fixme` because they require seeded bookings, packages, availability windows, payment records, dates, and backend mutation/reset support.
- Unsupported Xendit and standalone-message requirements are not counted as skipped tests; they are documented as absent functionality.

## Required backend seed matrix

To execute the blocked document cases against the real API, the dedicated test database needs at least:

- Active client account.
- Approved active freelancer account with complete profile, portfolio, package, add-ons, coverage, availability, blocked date, and booking hours.
- Approved active studio account with the same data.
- Pending/rejected photographer application.
- Admin account.
- Bookings in pending, accepted, confirmed, rejected, cancelled, and completed states.
- Payment records in pending, partially paid, fully paid, failed, and cancelled states, using manual references only.
- Overlapping and non-overlapping availability scenarios, including a booking within and outside the seven-day modification window.

Until that seed/reset contract exists, claiming those cases passed would be misleading.
