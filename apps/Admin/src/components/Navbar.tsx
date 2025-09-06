import React from 'react';
import ThemeToggle from './ThemeToggle';
import { LogOut } from 'lucide-react';

type Props = { setToken: React.Dispatch<React.SetStateAction<string>> };

const Navbar: React.FC<Props> = ({ setToken }) => {
  return (
    <div className="flex items-center justify-between py-3 px-[4%] bg-white/80 backdrop-blur panel dark:bg-white/5">
      <div className="flex items-center gap-3">
        {/* simple text logo */}
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-softPink to-secondary" />
        <div className="leading-tight">
          <p className="font-semibold app-heading m-0">DayBreak Learner</p>
          <p className="text-xs text-mutedGray dark:text-darkTextSecondary -mt-0.5">Admin Panel</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => setToken('')}
          className="btn gap-2"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Navbar;
