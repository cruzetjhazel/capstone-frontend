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
import { Link } from "react-router-dom";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign up
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
                Last updated: September 2026
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

          {/* 5 - IMPORTANT LIABILITY SECTION */}
          <section className="rounded-2xl border-2 border-destructive/20 bg-destructive/[0.035] overflow-hidden">
            {/* Section Header */}
            <div className="px-5 sm:px-7 py-5 border-b border-destructive/10 bg-destructive/[0.04]">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-destructive">
                      05
                    </span>

                    <span className="text-xs font-semibold uppercase tracking-wider text-destructive/80">
                      Important
                    </span>
                  </div>

                  <h2 className="font-heading font-semibold text-lg">
                    System Responsibility and User Transactions
                  </h2>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-5 sm:p-7 text-sm leading-relaxed">
              <p className="font-medium text-foreground">
                The system only provides the platform that connects clients
                with photographers and studios. The system does not directly
                provide, perform, control, or guarantee the photography
                services offered by its users.
              </p>

              {/* Main liability statement */}
              <div className="my-5 rounded-xl border border-destructive/20 bg-background p-5">
                <p className="font-semibold text-foreground leading-relaxed">
                  If a photographer, studio, or client scams another user,
                  engages in fraudulent activity, fails to appear for a
                  confirmed booking, fails to provide the agreed service,
                  provides false or misleading information, or otherwise fails
                  to fulfill their obligations, the system is not responsible
                  or financially liable for the resulting payment, loss,
                  refund, damages, or other financial transaction between the
                  users.
                </p>
              </div>

              <p className="mt-4">
                Payments made directly between clients and photographers or
                studios are transactions between those parties. The system
                does not guarantee that a user will receive the service they
                paid for, that a photographer or studio will attend a booking,
                or that a payment will be returned if a dispute, scam,
                cancellation, or no-show occurs.
              </p>

              <p className="mt-4">
                The system is also not responsible for losses resulting from
                false information, unauthorized transactions, fraudulent
                payment references, failure to communicate, failure to attend
                a booking, or other actions performed by users outside the
                system's direct control.
              </p>

              <p className="mt-4">
                Users are responsible for checking the identity and service
                details of the other party, reviewing the booking information,
                confirming payment instructions, and keeping appropriate proof
                of payments and communications.
              </p>

              <div className="mt-5 rounded-xl bg-muted/60 p-4">
                <p className="text-xs font-medium text-foreground mb-1">
                  What the system can do
                </p>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  When a problem is reported, the system may provide reporting
                  tools, review submitted information, record incidents,
                  contact involved users, or restrict/suspend accounts when
                  appropriate. These platform actions do not make the system
                  financially responsible for the underlying transaction or
                  any loss suffered by a user.
                </p>
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
              paid booking, the client may submit a report through the booking
              and provide supporting evidence.
            </p>

            <p className="mt-4">
              If a client fails to attend a confirmed booking or otherwise
              violates the agreed booking conditions, the photographer or
              studio may also submit a report through the system.
            </p>

            <p className="mt-4">
              An administrator may review submitted reports and determine
              appropriate platform-level action. This may include recording
              the incident, contacting involved users, restricting an account,
              or suspending an account when appropriate.
            </p>

            <p className="mt-4">
              Refund requests may be reviewed by an administrator on a
              case-by-case basis. The system does not automatically process
              refund payments through the platform. If a refund is approved,
              the appropriate parties may arrange the refund directly, such as
              through a GCash transfer.
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
            to="/register"
            className="inline-flex items-center gap-2 mt-5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to sign up
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