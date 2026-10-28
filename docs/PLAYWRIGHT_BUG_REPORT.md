# Playwright Bug Report

## Confirmed application bugs

None confirmed by the executed 10-test fixture-backed run.

## Test-harness issue found and fixed

The first fixture implementation intercepted `**/api/**`. That glob also matched Vite module URLs such as `/src/api/...`, causing JavaScript modules to receive JSON and producing a blank page. The fixture now intercepts only `**://127.0.0.1:8000/api/**`.

## Blocked investigation items

These are not classified as application bugs because they require isolated backend records and business-rule confirmation:

- Booking creation and booking status transitions.
- Budget offer validation, response, acceptance, and rejection.
- Manual payment-reference submission, duplicate handling, verification, rejection, and authorization.
- Package publication/custom-package component lifecycle.
- Availability-window, blocked-date, and booking-hour effects on slots.
- Notification read-state propagation.
- Profile/settings persistence and validation.

The Laravel backend is present locally, but no dedicated Playwright database reset/seed contract or non-production account environment variables were available during this run.
