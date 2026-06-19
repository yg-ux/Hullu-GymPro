import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * /p/:code — Short-link redirect page.
 * Resolves a 7-char short code to the full portal UUID token
 * and immediately redirects to /portal/:token.
 * Members never see this page for more than a fraction of a second.
 */
export default function PortalRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) { setError('Invalid link'); return; }

    api.get(`/portal/resolve/${code}`)
      .then(({ token }) => {
        // Replace so the back button doesn't land back on /p/:code
        navigate(`/portal/${token}`, { replace: true });
      })
      .catch(() => setError('This link is invalid or has expired.'));
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">{error}</p>
          <p className="text-gray-500 text-sm">Please ask your gym for a new link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gym-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading your portal...</p>
      </div>
    </div>
  );
}
