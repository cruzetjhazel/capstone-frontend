import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CreditCard,
  FileText,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useRole, getPostLoginPath } from "@/contexts/RoleContext";

export default function TermsAndConditions() {
const { user, isLoading } = useRole();
  const [searchParams] = useSearchParams();

  // Only in-app paths ("/something") are accepted — never "//evil.com" or full URLs.
  const rawReturn = searchParams.get("returnTo");
  const returnTo = rawReturn && rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : null;

  const signedOut = !isLoading && !user;
  const homePath = user ? getPostLoginPath(user) : "/";
  const backTo = returnTo ?? (signedOut ? "/register" : homePath);
  const backLabel = returnTo?.endsWith("/pay") ? "Back to payment" : signedOut ? "Back to sign up" : "Back";
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="max-w-3xl mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                System Policies
              </p>

              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight">
                Terms &amp; Conditions
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                Please read these terms carefully before creating an account
                or using the system.
              </p>

              <div className="mt-4 inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                Last updated: November 2026
              </div>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="rounded-2xl border bg-muted/40 p-5 sm:p-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>

            <div>
              <h2 className="font-heading font-semibold text-base">
                Before you use the system
              </h2>

              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                The system connects clients with independent photographers and
                studios. Users are responsible for their own bookings,
                payments, communications, and agreements with other users.
              </p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-6">
          {/* 1 */}
          <TermsCard
            number="01"
            icon={<Camera className="w-5 h-5" />}
            title="About the system"
          >
            <p>
              The system is a booking platform that connects clients with
              independent photographers and studios. It provides tools for
              discovering photographers, viewing services and packages,
              requesting bookings, recording payment information, tracking
              booking progress, and reporting problems.
            </p>

            <p className="mt-4">
              The system does not directly provide or perform photography
              services. The agreement for the actual photography service is
              between the client and the photographer or studio.
            </p>
          </TermsCard>

          {/* 2 */}
          <TermsCard
            number="02"
            icon={<UserRound className="w-5 h-5" />}
            title="Accounts and user information"
          >
            <p>
              You must provide accurate and truthful information when creating
              an account. You are responsible for keeping your account
              information accurate and for maintaining the security of your
              account.
            </p>

            <p className="mt-4">
              Photographers and studios undergo an admin verification review
              before their profiles become bookable. Verification may include
              government identification and, for studios, business permit
              verification.
            </p>

            <p className="mt-4">
              Accounts may be suspended or deactivated for fraudulent
              activity, harassment, repeated no-shows, false information, or
              other misuse of the system.
            </p>
          </TermsCard>

          {/* 3 */}
          <TermsCard
            number="03"
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="Bookings and availability"
          >
            <p>
              Submitting a booking request does not guarantee that the
              photographer will accept the request. A booking becomes
              confirmed only when the required booking conditions, including
              photographer acceptance and required payment confirmation, have
              been completed.
            </p>

            <p className="mt-4">
              Availability may change while a booking request is pending. If
              another booking is confirmed for an overlapping schedule before
              a pending request is confirmed, the pending request may be
              declined and the client will be notified.
            </p>

            <p className="mt-4">
              Users are responsible for reviewing the selected date, starting
              time, service, package, add-ons, schedule, and other booking
              details before submitting a booking request.
            </p>
          </TermsCard>

          {/* 4 */}
          <TermsCard
            number="04"
            icon={<CreditCard className="w-5 h-5" />}
            title="Payments"
          >
            <p>
              The system does not process or hold payments through a payment
              gateway. Clients pay photographers or studios directly through
              GCash or through on-site payment where allowed by the
              photographer or studio.
            </p>

            <p className="mt-4">
              The system records payment information and may verify submitted
              payment references against the corresponding booking. Users are
              responsible for providing accurate payment information and
              following the payment instructions provided for their booking.
            </p>

            <p className="mt-4">
              Users must not submit false, altered, or fraudulent payment
              references.
            </p>
          </TermsCard>

                    {/* 5 - SNAPBULAN'S ROLE AND RESPONSIBILITIES */}
          <section className="rounded-2xl border-2 border-primary/20 bg-primary/[0.035] overflow-hidden">
            <div className="px-5 sm:px-7 py-5 border-b border-primary/10 bg-primary/[0.04]">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary">05</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                      Important
                    </span>
                  </div>

                  <h2 className="font-heading font-semibold text-lg">
                    SnapBulan's Role and Responsibilities
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 text-sm leading-relaxed space-y-5">
              <p className="font-medium text-foreground">
                SnapBulan is a platform that connects clients with independent
                photographers and photography studios. We provide the tools to
                find photographers, book, pay, track progress, and report
                problems. We do not perform the photography services ourselves.
              </p>

              <div className="rounded-xl border border-primary/20 bg-background p-5 space-y-4">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">
                    Photographers and studios are responsible for
                  </h3>
                  <p className="mt-1.5 text-muted-foreground">
                    Their own photography services: attending confirmed
                    bookings, keeping to the agreed schedule, the quality of
                    their work, and delivering the photos and other
                    deliverables they agreed to provide.
                  </p>
                </div>

                <div>
                  <h3 className="font-heading font-semibold text-sm text-foreground">
                    SnapBulan is responsible for
                  </h3>
                  <p className="mt-1.5 text-muted-foreground">
                    Running the platform properly: keeping the system working,
                    handling your account and personal data with care,
                    recording bookings, payments, and reports accurately, and
                    meeting its legal obligations. Nothing in these Terms
                    limits the responsibilities SnapBulan has under the law.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  If something goes wrong
                </h3>
                <p className="mt-1.5">
                  If a photographer does not show up, does not deliver the
                  agreed service, or you have a disagreement with them, you
                  can submit a report. SnapBulan's administrators can help by
                  providing the photographer's available contact information
                  and the relevant booking details, and by facilitating
                  communication between you and the photographer where
                  appropriate.
                </p>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  What we can't promise
                </h3>
                <p className="mt-1.5">
                  SnapBulan cannot guarantee that a photographer will fulfill
                  their commitments, or that every report will result in a
                  refund, compensation, or any particular outcome. Submitting
                  a report does not automatically mean the dispute will be
                  decided in the client's favor. Our administrators review the
                  information available from everyone involved before
                  deciding on any platform action.
                </p>
                <p className="mt-3">
                  The photography agreement is between the client and the
                  photographer or studio. SnapBulan is not a party to it and
                  does not itself pay refunds or compensation for a user's
                  failure to perform it. This does not affect SnapBulan's
                  accountability for its own system operations, data
                  handling, and legal obligations.
                </p>
              </div>

              <div className="rounded-xl bg-muted/60 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">
                    What SnapBulan can do when a problem is reported
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review the information submitted, record the incident,
                    contact the people involved, share available contact
                    details, help the parties communicate, and restrict or
                    suspend accounts when appropriate.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-foreground mb-1">
                    Before you book
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Please review the photographer's details, the booking
                    information, and the payment instructions, and keep proof
                    of your payments and conversations. These help us help
                    you if a problem comes up.
                  </p>
                </div>
              </div>
            </div>
          </section>

                    {/* 6 */}
          <TermsCard
            number="06"
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Cancellations, no-shows, reports, and refunds"
          >
            <p>
              Clients may request a cancellation or reschedule, subject to
              the applicable booking rules and approval requirements.
            </p>

            <p className="mt-4">
              If a photographer or studio fails to appear for a confirmed and
              paid booking, the client may submit a report through the
              booking or the Report a Problem page. If a client fails to
              attend a confirmed booking or otherwise violates the agreed
              booking conditions, the photographer or studio may also submit
              a report.
            </p>

            <p className="mt-4">
              When you submit a report, you choose what you are reporting
              and select the related photographer, booking, or payment from
              your own records when one applies. You are encouraged to
              include evidence, such as screenshots of conversations,
              payment receipts, and booking confirmations. Attachments are
              optional: up to 3 files per report (PNG, JPG, JPEG, or PDF,
              2 MB each).
            </p>

            <p className="mt-4">
              An administrator reviews each report and may record the
              incident, contact the people involved, share available contact
              information, help the parties communicate, restrict an
              account, or suspend an account when appropriate. Submitting a
              report does not guarantee that the dispute will be resolved in
              your favor, or that a refund or compensation will be given.
            </p>

            <p className="mt-4">
              Refund requests are reviewed by an administrator on a
              case-by-case basis. The system does not automatically process
              refund payments. If a refund is approved, the appropriate
              parties may arrange it directly, such as through a GCash
              transfer.
            </p>

            <p className="mt-4">
              Submitting a false, fraudulent, or intentionally misleading
              report may result in account suspension or other appropriate
              platform-level action.
            </p>
          </TermsCard>

          {/* 7 */}
          <TermsCard
            number="07"
            icon={<UserRound className="w-5 h-5" />}
            title="Reviews"
          >
            <p>
              Only clients with a completed booking may leave a review for
              that booking, and only one review may be submitted per booking.
              Photographers may reply publicly to reviews.
            </p>

            <p className="mt-4">
              Reviews that are abusive, fraudulent, misleading, or otherwise
              violate the platform rules may be reported for administrator
              review.
            </p>
          </TermsCard>

          {/* 8 */}
          <TermsCard
            number="08"
            icon={<ShieldAlert className="w-5 h-5" />}
            title="Acceptable use"
          >
            <p>You agree not to use the system to:</p>

            <ul className="mt-4 space-y-3">
              <Bullet>
                harass, threaten, or abuse other users;
              </Bullet>

              <Bullet>
                submit fraudulent payment references or false booking
                information;
              </Bullet>

              <Bullet>
                engage in scams, fraudulent transactions, or deceptive
                activity;
              </Bullet>

              <Bullet>
                upload harmful, unlawful, or infringing content;
              </Bullet>

              <Bullet>
                impersonate another person or intentionally provide false
                information; or
              </Bullet>

              <Bullet>
                access another user's account or data without authorization.
              </Bullet>
            </ul>
          </TermsCard>

          {/* 9 */}
          <TermsCard
            number="09"
            icon={<FileText className="w-5 h-5" />}
            title="Changes to these terms"
          >
            <p>
              These Terms &amp; Conditions may be updated as the system
              evolves. The updated version will indicate the date it was last
              revised. Continued use of the system after an update means that
              you agree to the revised terms.
            </p>
          </TermsCard>
        </div>

        {/* Final acknowledgement */}
        <div className="mt-10 rounded-2xl border bg-muted/30 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />

            <div>
              <h2 className="font-heading font-semibold text-sm">
                Agreement to these terms
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                By creating an account, you acknowledge that you have read,
                understood, and agreed to these Terms &amp; Conditions,
                including the provisions regarding payments, user
                transactions, scams, no-shows, refunds, and system
                responsibility.
              </p>
            </div>
          </div>

          <Link
            to={backTo}
            className="inline-flex items-center gap-2 mt-5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {signedOut ? "Return to sign up" : backLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

function TermsCard({
  number,
  icon,
  title,
  children,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-5 sm:px-7 py-5 border-b bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-muted-foreground">
              {number}
            </span>

            <h2 className="font-heading font-semibold text-base sm:text-lg">
              {title}
            </h2>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-7 py-6 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed">
      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
      <span>{children}</span>
    </li>
  );
}