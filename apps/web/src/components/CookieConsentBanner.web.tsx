// src/components/CookieConsentBanner.jsx
import React from 'react';
import CookieConsent from 'react-cookie-consent';
import { Link } from 'react-router-dom';

const CookieConsentBanner = () => {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      cookieName="funzaSasaCookieConsent"
      style={{ background: '#2A1E5C' }}
      buttonStyle={{ color: '#fff', background: '#A259FF', fontSize: '14px' }}
      declineButtonStyle={{ color: '#fff', background: '#8B30FF', fontSize: '14px' }}
      expires={150}
    >
      We use cookies to enhance your experience.{' '}
      <Link to="/cookie-policy" style={{ textDecoration: 'underline', color: '#FF70A6' }}>
        Learn more
      </Link>
    </CookieConsent>
  );
};

export default CookieConsentBanner;
