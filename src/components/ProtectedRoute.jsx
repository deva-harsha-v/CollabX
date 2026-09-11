import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loadingUser } = useApp();

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#060911] text-slate-100 flex items-center justify-center font-mono text-sm text-cyan-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Authenticating Session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;
