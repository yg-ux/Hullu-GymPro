import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

// Lazy-load all pages so Vite splits them into separate chunks.
// Only Layout and LoadingScreen are kept eager since they're used immediately.
const Landing            = lazy(() => import('./pages/Landing'));
const Login              = lazy(() => import('./pages/Login'));
const ForgotPassword     = lazy(() => import('./pages/ForgotPassword'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const Customers          = lazy(() => import('./pages/Customers'));
const CustomerDetail     = lazy(() => import('./pages/CustomerDetail'));
const AddCustomer        = lazy(() => import('./pages/AddCustomer'));
const SubscriptionPage   = lazy(() => import('./pages/SubscriptionPage'));
const CheckIn            = lazy(() => import('./pages/CheckIn'));
const CheckOut           = lazy(() => import('./pages/CheckOut'));
const Reports            = lazy(() => import('./pages/Reports'));
const Revenue            = lazy(() => import('./pages/Revenue'));
const Staff              = lazy(() => import('./pages/Staff'));
const AddStaff           = lazy(() => import('./pages/AddStaff'));
const AdminLogin         = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const Settings           = lazy(() => import('./pages/Settings'));
const Receipt            = lazy(() => import('./pages/Receipt'));
const Kiosk              = lazy(() => import('./pages/Kiosk'));
const ImportCustomers    = lazy(() => import('./pages/ImportCustomers'));
const AttendanceAnalytics = lazy(() => import('./pages/AttendanceAnalytics'));
const MemberPortal       = lazy(() => import('./pages/MemberPortal'));
const PortalRedirect     = lazy(() => import('./pages/PortalRedirect'));
const Retention          = lazy(() => import('./pages/Retention'));
const Expenses           = lazy(() => import('./pages/Expenses'));
const Equipment          = lazy(() => import('./pages/Equipment'));
const Privacy            = lazy(() => import('./pages/Privacy'));
const Terms              = lazy(() => import('./pages/Terms'));
const Onboarding         = lazy(() => import('./pages/Onboarding'));

// Pages each role can access (must match Layout.jsx nav roles)
const ROLE_PAGES = {
  owner:        ['/dashboard', '/check-in', '/check-out', '/customers', '/staff', '/reports', '/revenue', '/settings', '/subscription', '/attendance-analytics', '/retention', '/expenses', '/equipment'],
  admin:        ['/dashboard', '/check-in', '/check-out', '/customers', '/staff', '/reports', '/revenue', '/settings', '/attendance-analytics', '/retention', '/expenses', '/equipment'],
  manager:      ['/dashboard', '/check-in', '/check-out', '/customers', '/staff', '/reports', '/revenue', '/attendance-analytics', '/retention', '/expenses', '/equipment'],
  trainer:      ['/dashboard', '/check-in', '/check-out', '/customers'],
  receptionist: ['/dashboard', '/check-in', '/check-out', '/customers'],
};

// Default landing page per role
const ROLE_HOME = {
  owner:        '/dashboard',
  admin:        '/dashboard',
  manager:      '/dashboard',
  trainer:      '/dashboard',
  receptionist: '/check-in',
};

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

const PLAN_ORDER = ['free', 'starter', 'pro', 'enterprise'];
const PLAN_REQUIRED = {
  '/staff':     'starter',
  '/reports':   'pro',
  '/revenue':   'pro',
  '/retention': 'pro',
  '/expenses':  'pro',
  '/equipment': 'pro',
};

function PlanRoute({ path, children }) {
  const { gym, subscription } = useAuth();
  const required = PLAN_REQUIRED[path];
  if (!required) return children;
  // Trial users get full access to all features
  if (subscription?.status === 'trial') return children;
  const current = gym?.subscription_plan || 'free';
  if (PLAN_ORDER.indexOf(current) < PLAN_ORDER.indexOf(required)) {
    return <Navigate to="/subscription" replace />;
  }
  return children;
}

function RoleRoute({ path, children }) {
  const { user } = useAuth();
  const role = user?.role || 'owner';
  const allowed = ROLE_PAGES[role] || ROLE_PAGES.owner;
  const home = ROLE_HOME[role] || '/dashboard';

  // Check if current path starts with any allowed path
  const hasAccess = allowed.some(p => path.startsWith(p));
  if (!hasAccess) return <Navigate to={home} replace />;
  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is logged in, show dashboard. Otherwise show landing
  return (
    <ToastProvider>
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={user ? <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/portal/:token" element={<MemberPortal />} />
      <Route path="/p/:code" element={<PortalRedirect />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Full-screen protected routes (no sidebar layout) */}
      <Route path="/receipt/:id" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
      <Route path="/kiosk" element={<ProtectedRoute><Kiosk /></ProtectedRoute>} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard"           element={<RoleRoute path="/dashboard">   <Dashboard />      </RoleRoute>} />
        <Route path="check-in"            element={<RoleRoute path="/check-in">    <CheckIn />        </RoleRoute>} />
        <Route path="check-out"           element={<RoleRoute path="/check-out">   <CheckOut />       </RoleRoute>} />
        <Route path="customers"           element={<RoleRoute path="/customers">   <Customers />      </RoleRoute>} />
        <Route path="customers/new"       element={<RoleRoute path="/customers">   <AddCustomer />    </RoleRoute>} />
        <Route path="customers/:id"       element={<RoleRoute path="/customers">   <CustomerDetail /> </RoleRoute>} />
        <Route path="customers/:id/edit"  element={<RoleRoute path="/customers">   <AddCustomer />    </RoleRoute>} />
        <Route path="staff"               element={<RoleRoute path="/staff">       <PlanRoute path="/staff">   <Staff />    </PlanRoute></RoleRoute>} />
        <Route path="staff/new"           element={<RoleRoute path="/staff">       <PlanRoute path="/staff">   <AddStaff /> </PlanRoute></RoleRoute>} />
        <Route path="staff/:id/edit"      element={<RoleRoute path="/staff">       <PlanRoute path="/staff">   <AddStaff /> </PlanRoute></RoleRoute>} />
        <Route path="subscription"        element={<RoleRoute path="/subscription"><SubscriptionPage /></RoleRoute>} />
        <Route path="reports"             element={<RoleRoute path="/reports">     <PlanRoute path="/reports"> <Reports />  </PlanRoute></RoleRoute>} />
        <Route path="revenue"             element={<RoleRoute path="/revenue">     <PlanRoute path="/revenue"> <Revenue />  </PlanRoute></RoleRoute>} />
        <Route path="settings"                element={<RoleRoute path="/settings">             <Settings />             </RoleRoute>} />
        <Route path="customers/import"        element={<RoleRoute path="/customers">            <ImportCustomers />       </RoleRoute>} />
        <Route path="attendance-analytics"    element={<RoleRoute path="/attendance-analytics"> <AttendanceAnalytics />   </RoleRoute>} />
        <Route path="retention"  element={<RoleRoute path="/retention"> <PlanRoute path="/retention"> <Retention />  </PlanRoute></RoleRoute>} />
        <Route path="expenses"   element={<RoleRoute path="/expenses">  <PlanRoute path="/expenses">  <Expenses />   </PlanRoute></RoleRoute>} />
        <Route path="equipment"  element={<RoleRoute path="/equipment"> <PlanRoute path="/equipment"> <Equipment />  </PlanRoute></RoleRoute>} />
      </Route>
    </Routes>
    </Suspense>
    </ToastProvider>
  );
}

export default App;
