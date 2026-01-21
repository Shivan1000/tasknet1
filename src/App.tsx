import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import TaskTracking from './pages/TaskTracking';
import WithdrawEarnings from './pages/WithdrawEarnings';
import Account from './pages/Account';
import Login from './pages/Login';
import RedditLogin from './pages/RedditLogin';
import AdminPanel from './pages/AdminPanel';
import TaskDetails from './pages/TaskDetails';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('user_email');
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
        <Route path="/adminpanel_1" element={<AdminPanel />} />
        
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
