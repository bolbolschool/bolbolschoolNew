import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
import { HomePage } from './components/Home/HomePage';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import StudentDashboard from './components/Student/Dashboard';
import { AdminDashboard } from './components/Admin/Dashboard';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showHomePage, setShowHomePage] = useState(true);

  if (!user) {
    if (showHomePage) {
      return <HomePage onNavigateToLogin={() => setShowHomePage(false)} />;
    }
    return isLoginMode ? (
      <Login 
        onSwitchToRegister={() => setIsLoginMode(false)}
        onBackToHome={() => setShowHomePage(true)}
      />
    ) : (
      <Register 
        onSwitchToLogin={() => setIsLoginMode(true)}
        onBackToHome={() => setShowHomePage(true)}
      />
    );
  }

  return user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;