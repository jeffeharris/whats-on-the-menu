import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-parent-bg)] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-parent-primary)] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-gray-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using What's On The Menu ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. Use License</h2>
            <p>
              We grant you a limited, non-exclusive, non-transferable license to use the Service for
              personal, non-commercial family meal planning purposes. You may not copy, modify,
              distribute, or reverse engineer any part of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and
              for all activities that occur under your account. You agree to notify us immediately of
              any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Service Availability</h2>
            <p>
              We strive to keep the Service available at all times, but we do not guarantee
              uninterrupted access. We may modify, suspend, or discontinue the Service at any time
              without prior notice.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. In no event shall
              What's On The Menu be liable for any indirect, incidental, special, or consequential
              damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Modifications</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective
              immediately upon posting. Your continued use of the Service after changes constitutes
              acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">7. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{' '}
              <a
                href="mailto:support@whatsonthemenu.app"
                className="text-[var(--color-parent-primary)] hover:underline"
              >
                support@whatsonthemenu.app
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
