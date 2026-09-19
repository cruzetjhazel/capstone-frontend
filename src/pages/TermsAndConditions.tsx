import { ArrowLeft, Camera } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Plain-language Terms & Conditions. Linked from Register.tsx's required
 * checkbox — backend enforces acceptance via RegisterClientRequest /
 * RegisterPhotographerRequest's `terms_accepted` rule, recorded as
 * users.terms_accepted_at. Keep this in sync if the actual booking/payment/
 * refund/no-show rules described here change on the backend.
 */
export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to sign up
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="w-4.5 h-4.5 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold">Terms &amp; Conditions</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="font-heading font-semibold text-base mb-2">1. What Bulan is</h2>
            <p>
              Bulan is a booking platform that connects clients with independent photographers and studios.
              We are not a party to the photography services themselves — the contract for the shoot is between
              you and the photographer or studio you book. We help you find each other, request bookings, track
              payments, and resolve problems if something goes wrong.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">2. Accounts</h2>
            <p>
              You must provide accurate information when registering. Photographers and studios go through an
              admin verification review (government ID, and for studios a business permit) before their profile
              becomes bookable. Accounts may be suspended or deactivated for fraud, harassment, repeated no-shows,
              or other abuse of the platform.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">3. Bookings and availability</h2>
            <p>
              Submitting a booking request does not guarantee the photographer will accept it. Multiple clients
              may request the same date and time — a slot is only guaranteed once your payment for that booking
              has been confirmed. If another client's payment is confirmed first for an overlapping slot, your
              still-pending or unpaid request will be automatically declined and you will be notified.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">4. Payments</h2>
            <p>
              Bulan does not process payments through a payment gateway. Clients pay photographers directly via
              GCash (or on-site, where allowed), and the platform records and verifies that a payment reference
              matches a booking. Every booking includes a flat ₱30 platform fee on top of the package price —
              this fee funds the platform's dispute-handling and no-show support process described below. It is
              <strong> not an insurance product</strong> and does not guarantee a refund by itself.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">5. Cancellations, no-shows, and refunds</h2>
            <p className="mb-2">
              Clients may request a cancellation or reschedule, which the photographer or an admin must approve.
              If a photographer fails to show up for a confirmed and paid booking, you may file a report from your
              booking (including photos or other evidence) so an admin can investigate.
            </p>
            <p>
              Refunds are recorded and decided by an admin on a case-by-case basis — Bulan does not automatically
              process refund payments through the platform; approved refunds are recorded and arranged manually
              (e.g. a GCash send back to you). Filing a false or fraudulent no-show report is a violation of these
              terms and may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">6. Reviews</h2>
            <p>
              Only clients with a completed booking may leave a review for that booking, and only once per
              booking. Photographers may reply publicly but cannot delete or edit a client's review; abusive or
              fraudulent reviews can be reported for admin removal.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">7. Conduct</h2>
            <p>
              You agree not to use the platform to harass other users, submit fraudulent payment references,
              upload harmful or infringing content, or attempt to access another user's account or data.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-base mb-2">8. Changes</h2>
            <p>
              We may update these terms as the platform evolves. Continued use of Bulan after an update means you
              accept the revised terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
