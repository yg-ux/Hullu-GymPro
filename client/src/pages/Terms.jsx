import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Dumbbell } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Hullu Gyms
            </span>
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400 text-sm">Terms of Service</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
            <p className="text-gray-500 text-sm">Last updated: June 2025</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <p className="text-lg text-gray-300">
              By creating an account or using Hullu Gyms, you agree to these Terms of Service.
              Please read them carefully. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Service Description</h2>
            <p className="text-sm">
              Hullu Gyms is a cloud-based gym management platform for Ethiopian gym owners. It provides tools for member management,
              payment tracking, check-in/check-out, SMS notifications, staff accounts, and analytics.
              The platform is provided as-is, and features may change over time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Account Registration</h2>
            <ul className="space-y-2 text-sm">
              {[
                'You must provide accurate information when creating your account.',
                'You are responsible for maintaining the confidentiality of your password.',
                'You are responsible for all activity that occurs under your account.',
                'One account per gym. Sub-accounts (staff) are managed by the gym owner.',
                'You must be 18 or older to create an account.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Subscription Plans & Payments</h2>
            <div className="space-y-3">
              <p className="text-sm">
                Hullu Gyms offers Free, Starter (ETB 1,499/mo), and Pro (ETB 3,499/mo) plans.
                Prices may change with 30 days notice to existing subscribers.
              </p>
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-sm space-y-1">
                <p><span className="text-white font-medium">Free plan:</span> Permanent, no payment required. Limited to 10 members.</p>
                <p><span className="text-white font-medium">Paid plans:</span> Monthly subscription. Access to paid features continues until the end of the billing period.</p>
                <p><span className="text-white font-medium">Cancellation:</span> You may cancel at any time. Your plan downgrades to Free at the end of the current period. Data is not deleted.</p>
              </div>
              <p className="text-sm">
                Early-bird pricing is locked for the first 10 subscribers per plan tier and cannot be retroactively changed for those subscribers.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p className="text-sm mb-3">You agree not to:</p>
            <ul className="space-y-2 text-sm">
              {[
                'Use Hullu Gyms for any illegal purpose or in violation of Ethiopian law.',
                'Enter false or misleading information about your gym or members.',
                'Attempt to access other gyms\' data or bypass security controls.',
                'Use automated scripts or bots to access the platform.',
                'Resell or sublicense access to Hullu Gyms to third parties.',
                'Use the SMS feature to send spam or unsolicited messages.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Your Data</h2>
            <p className="text-sm">
              You own the data you enter into Hullu Gyms — member records, payment history, and gym settings.
              We do not claim ownership of your data. You can export your data at any time on the Starter or Pro plan.
              See our <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link> for details on how we handle data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Service Availability</h2>
            <p className="text-sm">
              We aim for high availability but do not guarantee 100% uptime. The platform may be temporarily unavailable for maintenance,
              updates, or events outside our control (power outages, internet disruptions). We are not liable for losses caused by downtime.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p className="text-sm">
              Hullu Gyms is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from your use
              of the platform, including lost revenue, lost data, or business disruption. Our total liability to you shall not exceed
              the amount you paid in the 3 months prior to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Termination</h2>
            <p className="text-sm">
              We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity,
              or pose a security risk to the platform. You may delete your account at any time from Settings.
              Upon termination, your data will be retained for 30 days then permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h2>
            <p className="text-sm">
              We may update these terms from time to time. We will notify active subscribers via email or in-app notification
              at least 14 days before significant changes take effect. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p className="text-sm">For questions about these terms, contact us:</p>
            <a
              href="https://wa.me/251970782859"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm hover:bg-green-500/20 transition-colors"
            >
              WhatsApp: +251 970 782 859
            </a>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Link to="/privacy" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
