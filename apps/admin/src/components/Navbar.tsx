// apps/admin/src/components/Navbar.tsx
import React from 'react';
import ThemeToggle from './ThemeToggle';
import { LogOut } from 'lucide-react';

type Props = { onLogout: () => void };

const Navbar: React.FC<Props> = ({ onLogout }) => {
  return (
    <div className="flex items-center justify-between py-3 px-[4%] bg-white/80 backdrop-blur panel dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0052CC] text-xs font-extrabold text-white">PR</div>
        <div className="leading-tight">
          <p className="font-semibold app-heading m-0">ProfessionalResume.co.ke</p>
          <p className="text-xs text-mutedGray dark:text-darkTextSecondary -mt-0.5">Career Platform Admin</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button onClick={onLogout} className="btn gap-2" title="Logout">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Navbar;
