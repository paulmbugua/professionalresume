import pool from '../config/db.js';
import { createZoomMeeting } from '../utils/zoomUtils.js';
import { sendNotification } from '../utils/sendNotification.js';
import {
  sessionValidationSchema,
  reviewValidationSchema,
} from '../validators/sessionValidationSchema.js';
import {
  registerPaystackRecipient,
  sendPaystackTransfer,
} from '../utils/paystack.js';
import { initiateB2CPayment } from '../services/mpesaService.js';

// Create a New Session
export const createSession = async (req, res) => {
  console.log('Received Payload:', req.body);
  try {
    // ← include tutorName here
    const { tutorId, tutorName, subject, date, sessionType } =
      await sessionValidationSchema.validateAsync(req.body);
    const studentUserId = req.user.id; // Authenticated user's ID

    // Fetch student details
    const studentUser = await pool.query('SELECT * FROM users WHERE id = $1', [
      studentUserId,
    ]);
    if (studentUser.rows.length === 0)
      return res.status(404).json({ message: 'Student user not found.' });

    // Fetch tutor's profile by matching profiles.user_id = tutorId
    const tutorProfileRes = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [tutorId]
    );
    if (tutorProfileRes.rows.length === 0)
      return res.status(404).json({ message: 'Tutor not found.' });
    const tutorProfile = tutorProfileRes.rows[0];

    // Validate session pricing
    const pricingData = tutorProfile.pricing;
    const pricing =
      typeof pricingData === 'string'
        ? JSON.parse(pricingData)
        : pricingData || {};
    const sessionCost = pricing[sessionType];
    if (!sessionCost) {
      return res
        .status(400)
        .json({ message: 'Invalid session type or pricing not available.' });
    }

    // Check student token balance
    if (studentUser.rows[0].tokens < sessionCost) {
      const tokenDifference = sessionCost - studentUser.rows[0].tokens;
      return res.status(400).json({
        message: `Insufficient tokens. You need ${tokenDifference} more tokens to book this session.`,
      });
    }

    // Deduct tokens from the student
    await pool.query('UPDATE users SET tokens = tokens - $1 WHERE id = $2', [
      sessionCost,
      studentUserId,
    ]);

    // ← include tutor_name in the INSERT
    const newSession = await pool.query(
      `INSERT INTO tutor_sessions
         (tutor_id, tutor_name, student_id, session_type, subject, date, status, amount, type, created_at) 
       VALUES ($1,      $2,         $3,         $4,           $5,      $6,   'upcoming', $7,     'session', NOW()) 
       RETURNING *`,
      [
        tutorId,        // users.id
        tutorName,      // newly captured tutor name
        studentUserId,  // users.id
        sessionType,
        subject,
        date,
        sessionCost,
      ]
    );

    // Send email notifications
    const tutorUser = await pool.query('SELECT * FROM users WHERE id = $1', [
      tutorId,
    ]);
    if (tutorUser.rows.length === 0)
      return res.status(404).json({ message: 'Tutor user not found.' });

    await sendNotification({
      to: tutorUser.rows[0].email,
      subject: 'New Tutoring Session Scheduled',
      body: `Dear ${tutorUser.rows[0].name},\n\nA new session has been scheduled with you by ${studentUser.rows[0].name}.\n\nSession Details:\nSubject: ${subject}\nDate: ${new Date(
        date
      ).toLocaleString()}\nSession Type: ${sessionType}\n\nBest regards,\nTutoring Platform`,
    });

    res.status(201).json({
      message: 'Session created successfully.',
      session: newSession.rows[0],
    });
  } catch (error) {
    console.error('Error creating session:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};


export const acceptSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Update session status
    const session = await pool.query(
      `UPDATE tutor_sessions 
       SET status = 'accepted' 
       WHERE id = $1 
       RETURNING *`,
      [sessionId]
    );

    if (session.rows.length === 0)
      return res.status(404).json({ message: 'Session not found.' });

    const sessionData = session.rows[0];

    // Fetch student and tutor details directly from users table
    const studentUser = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [sessionData.student_id]
    );
    const tutorUser = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [sessionData.tutor_id]
    );

    if (studentUser.rows.length === 0 || tutorUser.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Student or tutor user not found.' });
    }

    // Ensure a conversation exists: fetch profile IDs first
    const studentProfileRes = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [sessionData.student_id]
    );
    const tutorProfileRes = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [sessionData.tutor_id]
    );
    if (
      studentProfileRes.rows.length === 0 ||
      tutorProfileRes.rows.length === 0
    ) {
      return res
        .status(404)
        .json({ message: 'Student or tutor profile not found.' });
    }
    const studentProfileId = studentProfileRes.rows[0].id;
    const tutorProfileId = tutorProfileRes.rows[0].id;

    // Insert (or update) conversation
    await pool.query(
      `INSERT INTO conversations (sender_id, recipient_id, unread_count) 
       VALUES ($1, $2, 1) 
       ON CONFLICT (sender_id, recipient_id) 
       DO UPDATE SET unread_count = conversations.unread_count + 1`,
      [tutorProfileId, studentProfileId]
    );

    // Insert message into the messages table using the conversation ID
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, created_at) 
       VALUES (
         (SELECT id FROM conversations WHERE sender_id = $1 AND recipient_id = $2 LIMIT 1), 
         $1, 
         $3, 
         NOW()
       )`,
      [
        tutorProfileId,
        studentProfileId,
        `Your session request for "${sessionData.subject}" has been accepted by the tutor.`,
      ]
    );

    // Calculate net earnings after commission (15%)
    const commissionRate = 0.15;
    const netEarnings = sessionData.amount * (1 - commissionRate);

    // Fetch Payment record for the student
    const paymentRecord = await pool.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [sessionData.student_id]
    );

    if (paymentRecord.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Payment record not found for this session.' });
    }

    // Create transaction for tutor's expected earnings
    await pool.query(
      `INSERT INTO transactions 
         (user_id, type, amount, description, date, status, paystack_reference, mpesa_reference, payment_method) 
       VALUES ($1, 'Expected Earnings', $2, $3, NOW(), 'Pending', $4, $5, $6)`,
      [
        sessionData.tutor_id,
        netEarnings,
        `Net earning from session "${sessionData.subject}" with student ${studentUser.rows[0].name}.`,
        paymentRecord.rows[0].payment_method === 'Paystack'
          ? paymentRecord.rows[0].transaction_id
          : null,
        paymentRecord.rows[0].payment_method === 'M-Pesa'
          ? paymentRecord.rows[0].mpesa_reference
          : null,
        paymentRecord.rows[0].payment_method || '',
      ]
    );

    // Send email notifications
    await Promise.all([
      sendNotification({
        to: studentUser.rows[0].email,
        subject: 'Your Session Request Has Been Accepted',
        body: `Dear ${studentUser.rows[0].name},\n\nYour session request for "${sessionData.subject}" has been accepted by the tutor ${tutorUser.rows[0].name}.\n\nBest regards,\nTutoring Platform`,
      }),
      sendNotification({
        to: tutorUser.rows[0].email,
        subject: 'You Have Accepted a Session Request',
        body: `Dear ${tutorUser.rows[0].name},\n\nYou have accepted a session request for "${sessionData.subject}" from ${studentUser.rows[0].name}.\n\nBest regards,\nTutoring Platform`,
      }),
    ]);

    res.status(200).json({
      message: 'Session accepted, student notified, and transaction recorded.',
      session: sessionData,
    });
  } catch (error) {
    console.error('Error accepting session:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const cancelSession = async (req, res) => {
  const { sessionId } = req.params;
  const { reason } = req.body;

  try {
    // Fetch session details, joining on profiles.user_id instead of profiles.id
    const session = await pool.query(
      `SELECT ts.*, p1.user_id AS student_user_id, p2.user_id AS tutor_user_id
       FROM tutor_sessions ts
       JOIN profiles p1 ON ts.student_id = p1.user_id
       JOIN profiles p2 ON ts.tutor_id = p2.user_id
       WHERE ts.id = $1`,
      [sessionId]
    );

    if (session.rows.length === 0)
      return res.status(404).json({ message: 'Session not found.' });

    const sessionData = session.rows[0];

    if (sessionData.status === 'cancelled') {
      return res.status(400).json({ message: 'Session is already cancelled.' });
    }

    // Identify whether the requester is the tutor or student
    const isTutor = req.user.id === sessionData.tutor_user_id;
    const isStudent = req.user.id === sessionData.student_user_id;

    if (!isTutor && !isStudent) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to cancel this session.' });
    }

    // Validate status for cancellation based on user role
    if (isTutor && sessionData.status !== 'upcoming') {
      return res
        .status(400)
        .json({ message: 'Tutors can only cancel "upcoming" sessions.' });
    }

    if (isStudent && sessionData.status !== 'accepted') {
      return res
        .status(400)
        .json({ message: 'Students can only cancel "accepted" sessions.' });
    }

    if (!reason || reason.trim() === '') {
      return res
        .status(400)
        .json({ message: 'A reason must be provided for cancellation.' });
    }

    // Update session status in PostgreSQL
    await pool.query(
      `UPDATE tutor_sessions 
       SET status = 'cancelled', description = $1 
       WHERE id = $2`,
      [reason, sessionId]
    );

    // Send email notifications
    const studentUser = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [sessionData.student_user_id]
    );
    const tutorUser = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [sessionData.tutor_user_id]
    );

    await Promise.all([
      sendNotification({
        to: tutorUser.rows[0].email,
        subject: 'Session Cancellation Notification',
        body: `Dear ${tutorUser.rows[0].name},\n\nThe session "${sessionData.subject}" has been cancelled.\n\nReason: ${reason}\n\nBest regards,\nTutoring Platform`,
      }),
      sendNotification({
        to: studentUser.rows[0].email,
        subject: 'Session Cancellation Notification',
        body: `Dear ${studentUser.rows[0].name},\n\nThe session "${sessionData.subject}" has been cancelled.\n\nReason: ${reason}\n\nBest regards,\nTutoring Platform`,
      }),
    ]);

    res.status(200).json({
      message:
        'Session cancelled successfully. Notifications sent to both tutor and student.',
    });
  } catch (error) {
    console.error('Error cancelling session:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Mark Session as Completed and Record Earnings
export const completeSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    // Use the authenticated user's ID from the auth middleware
    const tutorUserId = req.user.id;

    console.log('Complete-Pending Request initiated', {
      sessionId,
      tutorUserId,
      user: req.user,
      profile: req.profile,
    });

    if (!tutorUserId) {
      return res
        .status(403)
        .json({ message: 'Unauthorized: Tutor not found.' });
    }

    // Fetch the session with only the needed fields.
    // Now tutor_id and student_id are users.id, so we compare directly:
    const sessionResult = await pool.query(
      `SELECT id, tutor_id, student_id, session_type, zoom_meeting_ids
       FROM tutor_sessions
       WHERE id = $1 AND tutor_id = $2 AND status = 'accepted'`,
      [sessionId, tutorUserId]
    );

    console.log('Session query rowCount:', sessionResult.rowCount);
    if (sessionResult.rowCount === 0) {
      return res
        .status(404)
        .json({ message: 'Session not found or already processed.' });
    }

    const session = sessionResult.rows[0];
    console.log('Session found:', session);

    // Check that the session has Zoom meeting IDs
    const meetingIds = session.zoom_meeting_ids;
    if (!meetingIds || meetingIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'No Zoom meeting IDs found for this session.' });
    }
    console.log('Meeting IDs:', meetingIds);

    // Fetch attendance records from zoomwebhooks.
    const attendanceResult = await pool.query(
      `SELECT event, timestamp
       FROM zoomwebhooks
       WHERE meeting_ids && $1::text[]`,
      [meetingIds]
    );

    if (attendanceResult.rowCount === 0) {
      return res
        .status(400)
        .json({ message: 'No attendance records found for these meetings.' });
    }

    // Determine expected duration based on session_type and set the threshold at 75%
    const sessionDurationMap = {
      privateSession: 60,
      groupSession: 90,
      lecture: 120,
      workshop: 180,
    };
    const expectedDuration = sessionDurationMap[session.session_type] || 60;
    const requiredAttendance = expectedDuration * 0.75;
    console.log(
      `Expected Duration: ${expectedDuration} mins, Required Attendance (75%): ${requiredAttendance} mins`
    );

    // Calculate total meeting duration:
    let firstJoinTime = null;
    let lastLeaveTime = null;

    attendanceResult.rows.forEach((record) => {
      if (record.event === 'meeting.participant_joined') {
        const joinTime = new Date(record.timestamp);
        if (!firstJoinTime || joinTime < firstJoinTime) {
          firstJoinTime = joinTime;
        }
      }
      if (record.event === 'meeting.participant_left') {
        const leaveTime = new Date(record.timestamp);
        if (!lastLeaveTime || leaveTime > lastLeaveTime) {
          lastLeaveTime = leaveTime;
        }
      }
    });

    if (!firstJoinTime || !lastLeaveTime) {
      return res
        .status(400)
        .json({ message: 'Meeting join or leave time missing from records.' });
    }
    if (lastLeaveTime <= firstJoinTime) {
      return res.status(400).json({
        message: 'Invalid meeting times: leave time is not after join time.',
      });
    }

    const totalMeetingDuration = Math.round(
      (lastLeaveTime - firstJoinTime) / (1000 * 60)
    );
    console.log(`Total Meeting Duration: ${totalMeetingDuration} mins`);

    // Check if the actual meeting duration meets the 75% threshold
    if (totalMeetingDuration < requiredAttendance) {
      return res.status(400).json({
        message: `Completion failed. Total meeting duration of ${totalMeetingDuration} minutes is less than the required ${requiredAttendance} minutes.`,
      });
    }

    // Mark session as 'completed_pending' and update duration and end_time
    await pool.query(
      `UPDATE tutor_sessions 
       SET status = 'completed_pending', 
           duration = $1,
           end_time = $2,
           completion_request_time = NOW(), 
           completion_deadline = NOW() + INTERVAL '24 hours'
       WHERE id = $3`,
      [totalMeetingDuration, lastLeaveTime, sessionId]
    );
    console.log('Session marked as complete-pending.');

    // Notify the student: Fetch student's email using student_id (which is users.id)
    const studentEmailResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [session.student_id]
    );
    if (studentEmailResult.rowCount > 0) {
      await sendNotification({
        to: studentEmailResult.rows[0].email,
        subject: 'Session Completion Pending Confirmation',
        body: `Dear Student,\n\nYour session has been marked as complete-pending by your tutor. Please confirm it within 24 hours to complete the process.\n\nBest regards,\nTutoring Platform`,
      });
      console.log(
        'Notification sent to student:',
        studentEmailResult.rows[0].email
      );
    }

    res.status(200).json({
      message: 'Session marked as complete, pending student confirmation.',
    });
  } catch (error) {
    console.error('Error completing session:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const confirmCompletion = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const studentId = req.user.id;

    // 1️⃣ Fetch the “completed_pending” session
    const { rows: sessions } = await pool.query(
      `
      SELECT ts.*,
             p.user_id            AS tutor_user_id,
             u.email              AS tutor_email,
             p.mpesa_phone_number
      FROM tutor_sessions ts
      JOIN profiles p ON ts.tutor_id = p.user_id
      JOIN users    u ON p.user_id = u.id
      WHERE ts.id = $1
        AND ts.student_id = $2
        AND ts.status = 'completed_pending'
      `,
      [sessionId, studentId]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ message: 'Session not found or already processed.' });
    }
    const session = sessions[0];

    // 2️⃣ Compute net payout (gross minus 15% commission)
    const grossAmount      = session.amount * 10;
    const commissionRate   = 0.15;
    const tutorAmount      = +(grossAmount * (1 - commissionRate)).toFixed(2);

    // 3️⃣ Trigger the B2C payout of tutorAmount
    const paymentResponse = await initiateB2CPayment(
      session.mpesa_phone_number,
      tutorAmount,
      session.tutor_user_id
    );
    console.log('M-Pesa B2C Payment Response:', paymentResponse);

    // 4️⃣ Record only the tutor’s Completed Earnings
    const txStatus = paymentResponse.ResponseCode === '0' ? 'Completed' : 'Pending';
    await pool.query(
      `INSERT INTO transactions
         (user_id, type, amount, description, date, status, mpesa_reference, payment_method)
       VALUES
         ($1, 'Completed Earnings', $2, $3, NOW(), $4, $5, 'M-Pesa')`,
      [
        session.tutor_user_id,
        tutorAmount,
        `Earnings for session "${session.subject}" (gross ${grossAmount}, platform fee ${(
          grossAmount - tutorAmount
        ).toFixed(2)})`,
        txStatus,
        paymentResponse.ConversationID || null,
      ]
    );

    // 5️⃣ Mark the session as fully completed
    const { rows: updatedRows } = await pool.query(
      `UPDATE tutor_sessions
         SET status = 'completed'
       WHERE id = $1
       RETURNING *`,
      [sessionId]
    );
    const updatedSession = updatedRows[0];

    // 6️⃣ Send notifications
    const [{ email: studentEmail } = {}] = await pool
      .query('SELECT email FROM users WHERE id = $1', [session.student_id])
      .then(r => r.rows);

    const notifications = [];
    if (studentEmail) {
      notifications.push(
        sendNotification({
          to: studentEmail,
          subject: 'Your session is complete',
          body: `Your session "${session.subject}" has been marked complete.`,
        })
      );
    }
    if (session.tutor_email) {
      notifications.push(
        sendNotification({
          to: session.tutor_email,
          subject: 'You’ve been paid for your session',
          body: `Payment of ${tutorAmount} (after 15% commission) has been sent to you.`,
        })
      );
    }
    await Promise.all(notifications);

    // 7️⃣ Final response
    return res.status(200).json({
      message: 'Session completed and payout recorded.',
      session: updatedSession,
      payout: {
        gross: grossAmount,
        tutorPaid: tutorAmount,
        paymentResponse,
      },
    });
  } catch (error) {
    console.error('Error confirming session completion:', error);
    return res.status(500).json({
      message: 'Internal server error.',
      error: error.message,
    });
  }
};

// Fetch Sessions, Earnings, and Reviews
export const fetchDataByType = async (req, res) => {
  const { type } = req.params; // Get the type from URL parameters
  try {
    console.log(`Fetching data for type: ${type}`);

    // Instead of fetching profileId, use the logged-in user’s ID directly
    const userId = req.user.id;

    // Query sessions/reviews based on userId (which is users.id)
    const dataResult = await pool.query(
      `SELECT 
         ts.*,
         ts.session_type AS "sessionType",
         ts.subject            AS "subject",
         p1.name AS "tutorName",
         
         p1.role AS "tutorRole",
         p1.user_id AS "tutorUser",
         p2.name AS "studentName",
         p2.role AS "studentRole",
         p2.user_id AS "studentUser"
       FROM tutor_sessions ts
       JOIN profiles p1 ON ts.tutor_id = p1.user_id
       JOIN profiles p2 ON ts.student_id = p2.user_id
       WHERE ts.type = $1 AND (ts.tutor_id = $2 OR ts.student_id = $2)`,
      [type, userId]
    );

    console.log(`Fetched ${type} data:`, dataResult.rows);

    res.status(200).json({ success: true, data: dataResult.rows });
  } catch (error) {
    console.error(`Error fetching ${type} data:`, error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Fetch Earnings Summary
export const fetchEarningsSummary = async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    if (start > end) {
      return res.status(400).json({ message: 'Invalid date range.' });
    }

    // Use req.user.id (users.id) instead of profileId
    const earningsQuery = `
      SELECT SUM(amount) AS total_earnings, COUNT(*) AS sessions_count
      FROM tutor_sessions
      WHERE status = 'completed' AND tutor_id = $1 AND created_at BETWEEN $2 AND $3
    `;
    const earningsResult = await pool.query(earningsQuery, [
      req.user.id,
      start,
      end,
    ]);

    res.status(200).json({
      success: true,
      message: 'Earnings summary fetched successfully.',
      data: earningsResult.rows[0] || { total_earnings: 0, sessions_count: 0 },
    });
  } catch (error) {
    console.error('Error fetching earnings summary:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const createZoomLink = async (req, res) => {
  try {
    const { sessionId, topic, startTime, duration, tutorName } = req.body;

    if (!sessionId || !topic || !startTime || !duration || !tutorName) {
      return res.status(400).json({ message: 'Missing required parameters.' });
    }

    console.log('🔹 Received Payload:', {
      sessionId,
      topic,
      startTime,
      duration,
      tutorName,
    });

    // Fetch session details, joining on profiles.user_id
    const sessionResult = await pool.query(
      `SELECT ts.*, u.email AS tutor_email, u2.email AS student_email
       FROM tutor_sessions ts
       JOIN profiles p  ON ts.tutor_id = p.user_id
       JOIN users    u  ON p.user_id = u.id
       JOIN profiles p2 ON ts.student_id = p2.user_id
       JOIN users    u2 ON p2.user_id = u2.id
       WHERE ts.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const session = sessionResult.rows[0];

    console.log(
      `✅ Session found for tutor ${session.tutor_id} and student ${session.student_id}`
    );

    // Calculate required Zoom meetings
    const maxDuration = 40;
    const meetingCount = Math.ceil(duration / maxDuration);
    const meetings = [];

    for (let i = 0; i < meetingCount; i++) {
      const meetingStartTime = new Date(startTime);
      meetingStartTime.setMinutes(
        meetingStartTime.getMinutes() + i * maxDuration
      );

      const zoomMeeting = await createZoomMeeting(
        `${topic} (Part ${i + 1})`,
        meetingStartTime.toISOString(),
        Math.min(maxDuration, duration - i * maxDuration),
        tutorName
      );

      if (!zoomMeeting || !zoomMeeting.join_url || !zoomMeeting.id) {
        throw new Error('❌ Failed to create Zoom meeting.');
      }

      console.log(`✅ Zoom Meeting Created: ${zoomMeeting.join_url}`);
      meetings.push(zoomMeeting);
    }

    // Update database with Zoom arrays
    await pool.query(
      `UPDATE tutor_sessions 
       SET zoom_links = $1, zoom_meeting_ids = $2 
       WHERE id = $3`,
      [meetings.map((m) => m.join_url), meetings.map((m) => m.id), sessionId]
    );

    console.log('✅ Zoom Links and Meeting IDs saved to the database.');

    // Send Email Notifications
    await Promise.all([
      sendNotification({
        to: session.tutor_email,
        subject: 'Zoom Links for Your Tutoring Session',
        body: `Dear Tutor,\n\nYour tutoring session has been scheduled.\n\nJoin using these links:\n${meetings
          .map((m, i) => `Part ${i + 1}: ${m.join_url}`)
          .join('\n')}\n\nBest regards,\nTutoring Platform`,
      }),
      sendNotification({
        to: session.student_email,
        subject: 'Zoom Links for Your Tutoring Session',
        body: `Dear Student,\n\nYour tutoring session has been scheduled.\n\nJoin using these links:\n${meetings
          .map((m, i) => `Part ${i + 1}: ${m.join_url}`)
          .join('\n')}\n\nBest regards,\nTutoring Platform`,
      }),
    ]);

    console.log('✅ Email notifications sent.');

    // Return Success Response
    res.status(200).json({
      message: 'Zoom links created successfully.',
      zoomLinks: meetings.map((m) => m.join_url),
    });
  } catch (error) {
    console.error('❌ Error creating Zoom links:', error.message || error);
    res.status(500).json({ message: 'Failed to create Zoom links.' });
  }
};
