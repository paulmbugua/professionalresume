import React, { useEffect } from 'react';
import RobotTeacher from '../components/RobotTeacher.web';

const DEFAULT_SSML = `<speak>
  <p>Hello! I am your robot tutor.</p>
  <p>Today we will learn fractions. <break time="400ms"/></p>
  <p>Repeat after me: one half. one third. one quarter.</p>
</speak>`;

export default function RobotTutorPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="min-h-screen app-body py-16 sm:py-20 lg:py-24">
      {/* Theme-aware wrapper; spacing keeps clear of Navbar/Footer */}
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
        <RobotTeacher initialSsml={DEFAULT_SSML} voiceName="en-US-JennyNeural" />
      </div>
    </div>
  );
}
