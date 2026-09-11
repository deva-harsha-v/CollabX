import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loadingUser } = useApp();

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#221226] text-[#F8F4E9] flex items-center justify-center font-mono text-sm text-[#F6DBC0]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F6DBC0] animate-ping" />
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
