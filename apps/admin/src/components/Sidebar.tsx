import React from 'react';
import { NavLink } from 'react-router-dom';
import { BadgePercent, Bot, CreditCard, FileText, Layers, Search, Users } from 'lucide-react';

const navItem =
  'flex items-center gap-3 border border-gray-200 dark:border-darkCard border-r-0 px-3 py-2 rounded-l hover:bg-gray-50 dark:hover:bg-white/5 transition';

const active =
  'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-600/30 dark:text-white dark:border-indigo-500';

export default function Sidebar() {
  return (
    <aside className="w-[18%] min-h-screen border-r-2 border-gray-200 dark:border-darkCard">
      <nav className="flex flex-col gap-3 pt-6 pl-[20%] text-[15px]">
        <NavLink to="/packages" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <Layers className="w-5 h-5" />
          <p className="hidden md:block">Templates</p>
        </NavLink>

        <NavLink to="/packages/create" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <Bot className="w-5 h-5" />
          <p className="hidden md:block">AI Prompts</p>
        </NavLink>

        <NavLink to="/oer/openstax-ingest" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <Search className="w-5 h-5" />
          <p className="hidden md:block">SEO & Blog</p>
        </NavLink>

        <NavLink to="/oer/youtube-ingest" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <BadgePercent className="w-5 h-5" />
          <p className="hidden md:block">Pricing & Coupons</p>
        </NavLink>

        <NavLink to="/transactions" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <CreditCard className="w-5 h-5" />
          <p className="hidden md:block">Transactions</p>
        </NavLink>

        <NavLink to="/receipts" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <FileText className="w-5 h-5" />
          <p className="hidden md:block">Receipts</p>
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => [navItem, isActive ? active : ''].join(' ')}>
          <Users className="w-5 h-5" />
          <p className="hidden md:block">Users</p>
        </NavLink>
      </nav>
    </aside>
  );
}
