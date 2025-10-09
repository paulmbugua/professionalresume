// apps/web/src/pages/org/OrgHomeRouter.web.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

export default function OrgHomeRouter() {
  const nav = useNavigate();
  const { orgToken } = useShopContext() as any;
  const { role } = useOrg(); // 'owner' | 'admin' | 'instructor' | 'learner' | undefined

  useEffect(() => {
    if (!orgToken) { nav('/org/login', { replace: true }); return; }
    if (role === 'learner') {
      // Learners: straight to classroom (Robot Teacher) if coming from an assignment,
      // otherwise to their learner dashboard
      const saved = sessionStorage.getItem('auth:returnTo');
      if (saved && (/\/org\/join\//.test(saved) || /assignmentId=/.test(saved))) {
        nav(saved, { replace: true });
      } else {
        nav('/org/learn', { replace: true });
      }
    } else if (role === 'instructor') {
      nav('/org/instructor', { replace: true });
    } else {
      // owner/admin
      nav('/org/profile', { replace: true });
    }
  }, [orgToken, role, nav]);

  return null;
}
