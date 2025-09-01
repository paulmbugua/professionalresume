// apps/web/src/pages/RobotTutor.web.tsx
import React, { useEffect } from 'react';
import RobotTeacher from '../components/RobotTeacher.web';

const DEFAULT_SSML = `<speak>
  <p>Hello! I am your robot tutor.</p>
  <p>Today we will learn fractions. <break time="400ms"/></p>
  <p>Repeat after me: one half. one third. one quarter.</p>
</speak>`;

export default function RobotTutorPage() {
  // Scroll to top when page mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1220] py-16 sm:py-20 lg:py-24">
      {/* Top/bottom padding ensures content doesn’t overlap Navbar or Footer */}
      <RobotTeacher initialSsml={DEFAULT_SSML} voiceName="en-US-JennyNeural" />
    </div>
  );
}
