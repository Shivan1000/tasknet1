import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { getCookie } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import TaskTracking from './pages/TaskTracking';
import WithdrawEarnings from './pages/WithdrawEarnings';
import Account from './pages/Account';
import Login from './pages/Login';
import RedditLogin from './pages/RedditLogin';
import AdminPanel from './pages/AdminPanel';
import AdminPanel_2 from './pages/AdminPanel_2';
import TaskDetails from './pages/TaskDetails';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('user_email') || getCookie('user_email');
  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reddit-login" element={<RedditLogin />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/adminpanel_1" element={<AdminPanel />} />
        <Route path="/adminpanel_2" element={<AdminPanel_2 />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TaskTracking /></ProtectedRoute>} />
        <Route path="/task/:id" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
        <Route path="/withdraw" element={<ProtectedRoute><WithdrawEarnings /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
