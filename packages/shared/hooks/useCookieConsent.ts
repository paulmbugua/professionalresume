// /packages/shared/hooks/useCookieConsent.ts
import { useState, useEffect } from 'react';
import { getCookieConsent, setCookieConsent } from '../api/cookieConsentApi';

export const useCertificationSettings = () => {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const storedConsent = await getCookieConsent();
      setConsent(storedConsent);
    })();
  }, []);

  const acceptCookies = async () => {
    await setCookieConsent(true);
    setConsent(true);
  };

  const declineCookies = async () => {
    await setCookieConsent(false);
    setConsent(false);
  };

  return { consent, acceptCookies, declineCookies };
};
