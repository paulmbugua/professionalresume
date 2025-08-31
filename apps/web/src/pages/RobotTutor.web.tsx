import React from 'react';
import RobotTeacher from '../components/RobotTeacher.web';

const DEFAULT_SSML = `<speak>
  <p>Hello! I am your robot tutor.</p>
  <p>Today we will learn fractions. <break time="400ms"/></p>
  <p>Repeat after me: one half. one third. one quarter.</p>
</speak>`;

export default function RobotTutorPage() {
  // Full-viewport, no scroll (RobotTeacher also locks body overflow)
  return (
    <div className="fixed inset-0 overflow-y-scroll overflow-x-hidden bg-[#0b1220]">
  <RobotTeacher ssml={DEFAULT_SSML} voiceName="en-US-JennyNeural" />
</div>

  );
}
