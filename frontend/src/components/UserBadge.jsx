import React from 'react';
import { Building2, UserCheck } from 'lucide-react';
import { getUserAccountType, getOrgInfo } from '../lib/storage';

export const UserBadge = ({ user, accountType, email, size = 'sm' }) => {
  const type = accountType || getUserAccountType(user || { email });
  const userEmail = email || user?.email;
  const orgInfo = userEmail ? getOrgInfo(userEmail) : null;

  const sizeClasses = size === 'xs' 
    ? 'px-1.5 py-0.5 text-[9px]' 
    : size === 'lg' 
    ? 'px-3 py-1 text-xs' 
    : 'px-2 py-0.5 text-[10px]';

  const iconClasses = size === 'xs' 
    ? 'w-2.5 h-2.5' 
    : size === 'lg' 
    ? 'w-3.5 h-3.5' 
    : 'w-3 h-3';

  if (type === 'organisation') {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-bold rounded-md bg-[#06142e] border border-[#0ea5e9]/60 text-[#38bdf8] shadow-sm ${sizeClasses}`}>
        <Building2 className={iconClasses} />
        <span>{orgInfo?.name ? `${orgInfo.name} (Org)` : '🏢 Organisation Account'}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold rounded-md bg-[#06142e] border border-cyan-500/40 text-cyan-300 shadow-sm ${sizeClasses}`}>
      <UserCheck className={iconClasses} />
      <span>👤 Public Account</span>
    </span>
  );
};

export default UserBadge;
