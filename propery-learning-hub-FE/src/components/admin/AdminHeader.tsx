'use client';

import React from 'react';
import { Notifications, Settings, Home } from '@mui/icons-material';

interface User {
  name: string;
  role: string;
  email: string;
}

interface AdminHeaderProps {
  title: string;
  onHomeClick: () => void;
  user: User; // Add user prop
  onLogout: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title, onHomeClick }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm">
      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
    </header>
  );
};

export default AdminHeader;