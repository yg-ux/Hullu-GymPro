import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Dumbbell } from 'lucide-react';

export default function Privacy() {
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
          <span className="text-gray-400 text-sm">Privacy Policy</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
            <p className="text-gray-500 text-sm">Last updated: June 2025</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <p className="text-lg text-gray-300">
              Hullu Gyms ("we", "us", or "our") is a gym management platform built for Ethiopian gym owners.
              This Privacy Policy explains what data we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What Data We Collect</h2>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
                <p className="font-medium text-white mb-1">Gym Owner Account Data</p>
                <p className="text-sm text-gray-400">Name, email address, phone number, gym name, and a logo image (optional). This is required to create and manage your gym account.</p>
              </div>
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
                <p className="font-medium text-white mb-1">Member Data (entered by gym owners)</p>
                <p className="text-sm text-gray-400">Member names, phone numbers, membership dates, payment records, check-in history, and optional notes. This data belongs to your gym and is entered by you or your staff.</p>
              </div>
              <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
                <p className="font-medium text-white mb-1">Usage Data</p>
                <p className="text-sm text-gray-400">Basic server logs (timestamps, error messages) used to maintain and debug the platform. We do not track browsing behavior or use analytics cookies.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
            <ul className="space-y-2 text-sm">
              {[
                'To operate and provide the Hullu Gyms platform',
                'To send SMS notifications to members (expiry reminders, welcome messages) — only when SMS is enabled on your plan',
                'To process subscription payments and manage your account',
                'To respond to support requests you initiate',
                'To improve the platform based on usage patterns (no personally identifiable data)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Data Isolation & Security</h2>
            <p className="text-sm">
              Each gym's data is completely isolated. Your members, payments, and settings are never visible to other gyms on the platform.
              All data is stored in encrypted databases. Passwords are hashed and never stored in plain text.
              Access tokens expire automatically to prevent unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. SMS Notifications</h2>
            <p className="text-sm">
              When SMS is enabled on your plan, Hullu Gyms sends automated SMS messages to your members (e.g. membership expiry reminders, welcome messages).
              These SMS messages are sent using <strong className="text-white">GeezSMS</strong>, an Ethiopian SMS gateway.
              Member phone numbers are only used to deliver messages you have configured — they are never sold or shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing</h2>
            <p className="text-sm">
              We do not sell, rent, or share your data with third parties except:
            </p>
            <ul className="space-y-2 text-sm mt-2">
              {[
                'GeezSMS — to deliver SMS messages (phone numbers only, no other data)',
                'Our hosting provider — to store and serve the platform (data is encrypted at rest)',
                'When required by Ethiopian law or court order',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p className="text-sm">
              Your data is retained as long as your account is active. If you cancel your account, your data is retained for 30 days to allow recovery,
              then permanently deleted. Demo accounts (created without registration) are automatically deleted after 3 hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="text-sm">
              As a gym owner, you can request a full export of your data, correction of any inaccurate data, or deletion of your account at any time.
              Contact us via WhatsApp to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
            <p className="text-sm">
              For privacy-related questions, contact us:
            </p>
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
          <Link to="/terms" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
