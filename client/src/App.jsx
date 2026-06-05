import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is logged in, show dashboard. Otherwise show landing
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="check-in" element={<CheckIn />} />
        <Route path="check-out" element={<CheckOut />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<AddCustomer />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<AddCustomer />} />
        <Route path="staff" element={<Staff />} />
        <Route path="staff/new" element={<AddStaff />} />
        <Route path="staff/:id/edit" element={<AddStaff />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="revenue" element={<Revenue />} />
      </Route>
    </Routes>
  );
}

export default App;
