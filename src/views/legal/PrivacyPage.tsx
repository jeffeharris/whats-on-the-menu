import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide when creating an account, including your email
              address and household name. We also collect data about the meals, food preferences, and
              profiles you create within the Service.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information to provide and improve the Service, including managing your
              account, delivering meal planning features, and communicating with you about your
              account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information.
              However, no method of transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share
              information only as required by law or to protect our rights.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and authenticate your account. These
              cookies are necessary for the Service to function and cannot be disabled.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may request deletion of
              your account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">7. Children's Privacy</h2>
            <p>
              The Service is designed for family use. Children's profiles are managed by the parent
              account holder. We do not knowingly collect personal information directly from children
              under 13 without parental consent.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page with a new effective date.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">9. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a
                href="mailto:privacy@whatsonthemenu.app"
                className="text-[var(--color-parent-primary)] hover:underline"
              >
                privacy@whatsonthemenu.app
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
