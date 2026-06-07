import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import AddCustomer from './pages/AddCustomer';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import SubscriptionPage from './pages/SubscriptionPage';
import CheckIn from './pages/CheckIn';
import CheckOut from './pages/CheckOut';
import Reports from './pages/Reports';
import Revenue from './pages/Revenue';
import Staff from './pages/Staff';
import AddStaff from './pages/AddStaff';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';

// Pages each role can access (must match Layout.jsx nav roles)
const ROLE_PAGES = {
  owner:        ['/dashboard', '/check-in', '/check-out', '/customers', '/staff', '/reports', '/revenue', '/settings', '/subscription'],
  admin:        ['/dashboard', '/check-in', '/check-out', '/customers', '/staff', '/reports', '/revenue', '/settings'],
  manager:      ['/dashboard', '/check-in', '/check-out', '/customers', '/staff', '/reports', '/revenue'],
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
    <Routes>
      {/* Public routes */}
      <Route path="/" element={user ? <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      
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
        <Route path="staff"               element={<RoleRoute path="/staff">       <Staff />          </RoleRoute>} />
        <Route path="staff/new"           element={<RoleRoute path="/staff">       <AddStaff />       </RoleRoute>} />
        <Route path="staff/:id/edit"      element={<RoleRoute path="/staff">       <AddStaff />       </RoleRoute>} />
        <Route path="subscription"        element={<RoleRoute path="/subscription"><SubscriptionPage /></RoleRoute>} />
        <Route path="reports"             element={<RoleRoute path="/reports">     <Reports />        </RoleRoute>} />
        <Route path="revenue"             element={<RoleRoute path="/revenue">     <Revenue />        </RoleRoute>} />
        <Route path="settings"            element={<RoleRoute path="/settings">    <Settings />       </RoleRoute>} />
      </Route>
    </Routes>
    </ToastProvider>
  );
}

export default App;
