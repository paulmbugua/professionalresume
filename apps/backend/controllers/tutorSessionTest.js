import axios from 'axios';
import TutorSession from '../models/TutorSession.js';
import ZoomWebhook from '../models/ZoomWebhook.js'; // Zoom attendance logs
import { createZoomMeeting } from '../utils/zoomUtils.js';
import mongoose from 'mongoose';
import { Profile, Conversation } from '../models/Profile.js';
import Transaction from '../models/Transaction.js';
import userModel from '../models/UserModel.js';
import { sendNotification } from '../utils/sendNotification.js';
import {
  sessionValidationSchema,
  reviewValidationSchema,
} from '../validators/sessionValidationSchema.js';
import {
  registerPaystackRecipient,
  sendPaystackTransfer,
} from '../utils/paystack.js';
import Payment from '../models/Payment.js';
import { initiateB2CPayment } from '../services/mpesaService.js';

// Create a New Session
export const createSession = async (req, res) => {
  console.log('Received Payload:', req.body);
  try {
    const { tutorId, subject, date, sessionType } =
      await sessionValidationSchema.validateAsync(req.body);
    const studentUserId = req.user._id; // Use the logged-in user's ID

    // Fetch the student's user document
    const studentUser = await userModel.findById(studentUserId);
    if (!studentUser) {
      console.error('Student user not found:', studentUserId);
      return res.status(404).json({ message: 'Student user not found.' });
    }

    // Fetch the tutor's profile
    console.log('Fetching profiles...');
    const tutorProfile = await Profile.findOne({ user: tutorId });
    if (!tutorProfile) {
      console.error('Tutor profile not found:', tutorId);
      return res.status(404).json({ message: 'Tutor not found.' });
    }

    // Fetch tutor's user document
    const tutorUser = await userModel.findById(tutorProfile.user);
    if (!tutorUser) {
      console.error('Tutor user not found:', tutorProfile.user);
      return res.status(404).json({ message: 'Tutor user not found.' });
    }

    // Validate session pricing
    const pricingData = tutorProfile.rows[0].pricing;
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

    // Check tokens
    if (studentUser.tokens < sessionCost) {
      const tokenDifference = sessionCost - studentUser.tokens;
      console.error('Insufficient tokens:', studentUser.tokens, sessionCost);
      return res.status(400).json({
        message: `Insufficient tokens. You need ${tokenDifference} more tokens to book this session.`,
      });
    }

    // Deduct tokens from the student
    studentUser.tokens -= sessionCost;
    await studentUser.save();

    // Create session
    console.log('Creating session...');
    const newSession = await TutorSession.create({
      tutorId: tutorProfile._id, // Use _id of the Profile
      studentId: req.user.profileId, // Assuming the student's Profile ID is stored in req.user.profileId
      sessionType,
      subject,
      date,
      status: 'upcoming',
      amount: sessionCost,
      type: 'session',
    });

    console.log('Session created successfully:', newSession);

    // Notify the tutor via email
    const tutorNotification = {
      to: tutorUser.email,
      subject: 'New Tutoring Session Scheduled',
      body: `Dear ${
        tutorUser.name
      },\n\nA new session has been scheduled with you by ${
        studentUser.name
      }.\n\nSession Details:\nSubject: ${subject}\nDate: ${new Date(
        date,
      ).toLocaleString()}\nSession Type: ${sessionType}\n\nBest regards,\nTutoring Platform`,
    };

    await sendNotification(tutorNotification);

    // Respond to the student
    res
      .status(201)
      .json({ message: 'Session created successfully.', session: newSession });
  } catch (error) {
    if (error.isJoi) {
      console.error('Validation error:', error.details);
      return res
        .status(400)
        .json({ message: 'Validation error.', details: error.details });
    }
    console.error('Error creating session:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const acceptSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find and update the session status to 'accepted'
    const session = await TutorSession.findByIdAndUpdate(
      sessionId,
      { status: 'accepted' },
      { new: true },
    )
      .populate('studentId', 'user name') // Populate studentId with user and name
      .populate('tutorId', 'user name'); // Populate tutorId with user and name

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Extract student and tutor user IDs
    const studentUserId = session.studentId?.user;
    const tutorUserId = session.tutorId?.user;

    if (!studentUserId || !tutorUserId) {
      return res
        .status(400)
        .json({ message: 'Invalid student or tutor information.' });
    }

    // Fetch email addresses of student and tutor
    const studentUser = await userModel
      .findById(studentUserId)
      .select('email name');
    const tutorUser = await userModel
      .findById(tutorUserId)
      .select('email name');

    if (!studentUser || !tutorUser) {
      return res
        .status(404)
        .json({ message: 'Student or tutor user not found.' });
    }

    // Send an automatic message to the student via Conversation update
    await Conversation.updateOne(
      {
        senderId: tutorUserId,
        recipientId: studentUserId,
      },
      {
        $push: {
          messages: {
            sender: tutorUserId,
            content: `Your session request for "${session.subject}" has been accepted by the tutor.`,
          },
        },
        $setOnInsert: {
          senderId: tutorUserId,
          recipientId: studentUserId,
          unreadCount: 1,
        },
      },
      { upsert: true },
    );

    // Calculate net earning (for example, after a 15% commission is deducted)
    const commissionRate = 0.15; // 15% commission
    const netEarnings = session.amount * (1 - commissionRate);

    // Retrieve the Payment record associated with this session.
    // This example assumes that the Payment model has a field `sessionId` matching the session's _id.
    // Adjust the query if your association is different.
    const paymentRecord = await Payment.findOne({
      user: session.studentId.user,
    });
    if (!paymentRecord) {
      console.error('Payment record not found for session', session.studentId);
      return res
        .status(404)
        .json({ message: 'Payment record not found for this session.' });
    }

    // Create a Transaction for the tutor's expected earnings,
    // extracting the payment method and M-Pesa reference from the Payment record.
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(session.tutorId),
      type: 'Expected Earnings',
      amount: netEarnings,
      description: `Net earning from session "${session.subject}" with student ${session.studentId.name}.`,
      date: new Date(),
      status: 'Pending',
      // Use the payment method from the Payment record.
      // For example, if the payment method is M-Pesa, copy its reference; if Paystack, you might use a different field.
      paystackReference:
        paymentRecord.paymentMethod === 'Paystack'
          ? paymentRecord.transactionId
          : null,
      mpesaReference:
        paymentRecord.paymentMethod === 'M-Pesa'
          ? paymentRecord.mpesaReference
          : null,
      paymentMethod: paymentRecord.paymentMethod || '',
    });

    // Send email notifications
    await Promise.all([
      sendNotification({
        to: studentUser.email,
        subject: 'Your Session Request Has Been Accepted',
        body: `Dear ${studentUser.name},\n\nYour session request for "${session.subject}" has been accepted by the tutor ${tutorUser.name}.\n\nBest regards,\nTutoring Platform`,
      }),
      sendNotification({
        to: tutorUser.email,
        subject: 'You Have Accepted a Session Request',
        body: `Dear ${tutorUser.name},\n\nYou have accepted a session request for "${session.subject}" from ${studentUser.name}.\n\nBest regards,\nTutoring Platform`,
      }),
    ]);

    res.status(200).json({
      message: 'Session accepted, student notified, and transaction recorded.',
      session,
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
    // Fetch session details and populate tutorId and studentId
    const session = await TutorSession.findById(sessionId)
      .populate('studentId', 'user name') // Populate studentId with user and name
      .populate('tutorId', 'user name'); // Populate tutorId with user and name

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (session.status === 'cancelled') {
      return res.status(400).json({ message: 'Session is already cancelled.' });
    }

    // Extract tutor and student user IDs
    const tutorUserId = session.tutorId?.user;
    const studentUserId = session.studentId?.user;

    if (!tutorUserId || !studentUserId) {
      return res
        .status(400)
        .json({ message: 'Invalid tutor or student information.' });
    }

    // Fetch tutor and student details from the Users collection
    const tutorUser = await userModel
      .findById(tutorUserId)
      .select('email name');
    const studentUser = await userModel
      .findById(studentUserId)
      .select('email name');

    if (!tutorUser || !studentUser) {
      return res
        .status(404)
        .json({ message: 'Tutor or student user not found.' });
    }

    // Check if the user is the tutor or the student
    const isTutor = req.user._id.toString() === tutorUserId.toString();
    const isStudent = req.user._id.toString() === studentUserId.toString();

    if (!isTutor && !isStudent) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to cancel this session.' });
    }

    // Validate status for cancellation based on user role
    if (isTutor && session.status !== 'upcoming') {
      return res.status(400).json({
        message:
          'Tutors can only cancel sessions that are in "upcoming" status.',
      });
    }

    if (isStudent && session.status !== 'accepted') {
      return res.status(400).json({
        message:
          'Students can only cancel sessions that are in "accepted" status.',
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        message: 'A reason must be provided for cancelling the session.',
      });
    }

    // Update session status to 'cancelled' and set the description
    session.status = 'cancelled';
    session.description = reason;
    await session.save();

    // Prepare notification message
    const notificationMessage = isTutor
      ? `Your session for "${session.subject}" has been cancelled by the tutor. Reason: ${reason}`
      : `Your session for "${session.subject}" has been cancelled by the student. Reason: ${reason}`;

    // Send a notification to the conversation
    await Conversation.updateOne(
      {
        senderId: isTutor ? tutorUserId : studentUserId,
        recipientId: isTutor ? studentUserId : tutorUserId,
      },
      {
        $push: {
          messages: {
            sender: req.user._id,
            content: notificationMessage,
          },
        },
        $setOnInsert: {
          senderId: isTutor ? tutorUserId : studentUserId,
          recipientId: isTutor ? studentUserId : tutorUserId,
          unreadCount: 1,
        },
      },
      { upsert: true },
    );

    // Send email notifications to both parties
    await Promise.all([
      sendNotification({
        to: tutorUser.email,
        subject: 'Session Cancellation Notification',
        body: isTutor
          ? `Dear ${tutorUser.name},\n\nThe session "${session.subject}" has been successfully cancelled.\n\nReason: ${reason}\n\nBest regards,\nTutoring Platform`
          : `Dear ${tutorUser.name},\n\nThe session "${session.subject}" has been cancelled by the student.\n\nReason: ${reason}\n\nBest regards,\nTutoring Platform`,
      }),
      sendNotification({
        to: studentUser.email,
        subject: 'Session Cancellation Notification',
        body: isStudent
          ? `Dear ${studentUser.name},\n\nThe session "${session.subject}" has been successfully cancelled.\n\nReason: ${reason}\n\nBest regards,\nTutoring Platform`
          : `Dear ${studentUser.name},\n\nThe session "${session.subject}" has been cancelled by the tutor.\n\nReason: ${reason}\n\nBest regards,\nTutoring Platform`,
      }),
    ]);

    res.status(200).json({
      message:
        'Session cancelled successfully. Notifications sent to both tutor and student.',
      session,
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
    const tutorProfileId = req.user.profileId; // Tutor's profile ID

    console.log('Complete-Pending Request initiated');
    console.log('Session ID:', sessionId);
    console.log('Tutor Profile ID:', tutorProfileId);

    // Fetch the session and ensure it belongs to the tutor
    const session = await TutorSession.findOne({
      _id: sessionId,
      tutorId: tutorProfileId,
      status: 'accepted',
    })
      .populate('studentId', 'user name')
      .populate({
        path: 'studentId',
        populate: { path: 'user', select: 'email' },
      });

    if (!session) {
      console.error('Session not found or already processed:', sessionId);
      return res
        .status(404)
        .json({ message: 'Session not found or already processed.' });
    }

    console.log('Session found:', session);

    // Check if meetingIds exist
    const meetingIds = session.zoomMeetingIds;
    if (!meetingIds || meetingIds.length === 0) {
      console.error('No Zoom meeting IDs found for session:', sessionId);
      return res
        .status(400)
        .json({ message: 'No Zoom meeting IDs found for this session.' });
    }

    console.log('Zoom Meeting IDs from session:', meetingIds);

    // Fetch attendance records for all meeting IDs
    const rawAttendance = await ZoomWebhook.find({
      meetingIds: { $in: meetingIds },
    });

    console.log('Raw Attendance Records:', rawAttendance);

    if (rawAttendance.length === 0) {
      console.error('No attendance records found.');
      return res
        .status(400)
        .json({ message: 'No attendance records found for these meetings.' });
    }

    // Determine session duration and required attendance
    const sessionDurationMap = {
      privateSession: 60,
      groupSession: 90,
      lecture: 120,
      workshop: 180,
    };
    const sessionDuration = sessionDurationMap[session.sessionType] || 60; // Default to 60 minutes
    const requiredAttendance = sessionDuration / 2; // 50% of session duration

    console.log(
      `Session Duration: ${sessionDuration} mins, Required Attendance: ${requiredAttendance} mins`,
    );

    // Find the earliest join time and latest meeting end time
    let firstJoinTime = null;
    let meetingEndTime = null;

    rawAttendance.forEach((record) => {
      if (record.event === 'meeting.participant_joined') {
        const joinTime = new Date(record.timestamp);
        if (!firstJoinTime || joinTime < firstJoinTime) {
          firstJoinTime = joinTime;
        }
      }
      if (record.event === 'meeting.ended') {
        const endTime = new Date(record.timestamp);
        if (!meetingEndTime || endTime > meetingEndTime) {
          meetingEndTime = endTime;
        }
      }
    });

    if (!firstJoinTime || !meetingEndTime) {
      console.error('Meeting join or end time missing.');
      return res
        .status(400)
        .json({ message: 'Meeting join or end time missing from records.' });
    }

    // Calculate total meeting duration
    const totalMeetingDuration = Math.round(
      (meetingEndTime - firstJoinTime) / (1000 * 60),
    ); // Rounded to nearest minute

    console.log(`Total Meeting Duration: ${totalMeetingDuration} mins`);

    // Check if the session met the 50% attendance threshold
    if (totalMeetingDuration < requiredAttendance) {
      console.error(
        `Session duration insufficient: ${totalMeetingDuration} minutes, required: ${requiredAttendance} minutes.`,
      );
      return res.status(400).json({
        message: `Completion failed. Total meeting duration of ${totalMeetingDuration} minutes is less than the required ${requiredAttendance} minutes.`,
      });
    }

    // Mark session as 'completed_pending'
    session.status = 'completed_pending';
    session.completionRequestTime = new Date();
    session.completionDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await session.save();

    console.log('Session marked as completed_pending.');
    // Notify the student
    const studentEmail = session.studentId?.user?.email;
    console.log('Student Email:', studentEmail);

    if (studentEmail) {
      await sendNotification({
        to: studentEmail,
        subject: 'Session Completion Pending Confirmation',
        body: `Dear Student,\n\nThe session "${session.subject}" has been marked as complete by your tutor. Please confirm it within 24 hours to complete the process.\n\nBest regards,\nTutoring Platform`,
      });
      console.log('Notification sent to student:', studentEmail);
    } else {
      console.error('Student email not found for session:', sessionId);
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
    const studentId = req.user.profileId;

    // Retrieve session details
    const session = await TutorSession.findOne({
      _id: sessionId,
      studentId,
      status: 'completed_pending',
    })
      .populate({
        path: 'tutorId',
        select: 'name mpesaPhoneNumber',
        populate: { path: 'user', select: 'email' },
      })
      .populate({
        path: 'studentId',
        populate: { path: 'user', select: 'email' }, // Adjust based on your schema structure
      });

    if (!session) {
      return res
        .status(404)
        .json({ message: 'Session not found or already processed.' });
    }

    // Convert tokens to KES (assuming 1 token = 10 KES)
    const amountToPay = session.amount * 10;

    // Initiate B2C Payment
    const paymentResponse = await initiateB2CPayment(
      session.tutorId.mpesaPhoneNumber,
      amountToPay,
      session.tutorId._id,
    );

    // Update session status
    session.status = 'completed';
    await session.save();

    // Send notifications
    await Promise.all([
      sendNotification({
        to: session.studentId.user.email,
        subject: 'Session Completed',
        body: `Dear Student, the session "${session.subject}" has been successfully marked as completed.`,
      }),
      sendNotification({
        to: session.tutorId.user.email,
        subject: 'Session Completed & Payment Sent',
        body: `Dear Tutor, the session "${session.subject}" has been completed, and your payment of KES ${amountToPay} has been sent to your M-Pesa account.`,
      }),
    ]);

    return res.status(200).json({
      message: 'Payment initiated successfully!',
      data: paymentResponse,
    });
  } catch (error) {
    console.error('Error confirming session completion:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Fetch Sessions, Earnings, and Reviews
export const fetchDataByType = async (req, res) => {
  try {
    const { type } = req.params;

    // Get the Profile of the logged-in user
    const userProfile = await Profile.findOne({ user: req.user._id });
    if (!userProfile) {
      return res
        .status(404)
        .json({ message: 'Profile not found for the user.' });
    }

    const profileId = userProfile._id;

    // Query TutorSession using the Profile._id
    const data = await TutorSession.find({
      type,
      $or: [{ tutorId: profileId }, { studentId: profileId }],
    })
      .populate('tutorId', 'name role user') // Populate tutor details
      .populate('studentId', 'name role user') // Populate student details
      .lean();

    res.status(200).json({ success: true, data });
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

    // ✅ Fetch completed earnings
    const earnings = await TutorSession.aggregate([
      {
        $match: {
          status: 'Completed', // Only count completed sessions
          tutorId: req.user._id,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amountEarned' }, // Sum of paid amounts
          sessionsCount: { $count: {} },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Earnings summary fetched successfully.',
      data: earnings.length
        ? {
            totalEarnings: earnings[0].totalEarnings,
            sessionsCount: earnings[0].sessionsCount,
            startDate: start,
            endDate: end,
          }
        : { totalEarnings: 0, sessionsCount: 0 },
    });
  } catch (error) {
    console.error('Error fetching earnings summary:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const createZoomLink = async (req, res) => {
  try {
    const { sessionId, topic, startTime, duration, tutorName } = req.body;

    console.log('Received Payload:', {
      sessionId,
      topic,
      startTime,
      duration,
      tutorName,
    });

    if (!sessionId || !topic || !startTime || !duration || !tutorName) {
      return res.status(400).json({
        message:
          'Missing required parameters: sessionId, topic, startTime, duration, or tutorName.',
      });
    }

    // Fetch session details
    const session = await TutorSession.findById(sessionId)
      .populate({
        path: 'tutorId',
        select: 'name role user',
        populate: { path: 'user', model: 'User', select: 'email name' },
      })
      .populate({
        path: 'studentId',
        select: 'name role user',
        populate: { path: 'user', model: 'User', select: 'email name' },
      });

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (session.zoomLinks && session.zoomLinks.length > 0) {
      return res
        .status(400)
        .json({ message: 'Zoom links already exist for this session.' });
    }

    const tutorUser = session.tutorId?.user;
    const studentUser = session.studentId?.user;

    if (!tutorUser || !studentUser) {
      return res
        .status(404)
        .json({ message: 'Tutor or student user not found.' });
    }

    console.log(`Tutor Email: ${tutorUser.email}`);
    console.log(`Student Email: ${studentUser.email}`);

    // Zoom Free Plan Limit
    const maxDuration = 40; // Maximum duration for Zoom's free plan in minutes
    const meetingCount = Math.ceil(duration / maxDuration); // Number of meetings needed
    const meetings = []; // Array to store meeting details

    for (let i = 0; i < meetingCount; i++) {
      const meetingStartTime = new Date(startTime);
      meetingStartTime.setMinutes(
        meetingStartTime.getMinutes() + i * maxDuration,
      );

      // Create each Zoom meeting
      const zoomMeeting = await createZoomMeeting(
        `${topic} (Part ${i + 1})`,
        meetingStartTime.toISOString(),
        Math.min(maxDuration, duration - i * maxDuration),
        tutorName,
      );

      if (!zoomMeeting || !zoomMeeting.join_url || !zoomMeeting.id) {
        throw new Error('Failed to create Zoom meeting.');
      }

      meetings.push(zoomMeeting);
    }

    // Save Zoom details in the session
    session.zoomLinks = meetings.map((m) => m.join_url); // Assuming `zoomLinks` is an array in the schema
    session.zoomMeetingIds = meetings.map((m) => m.id);
    session.participants = [
      { email: tutorUser.email, role: 'tutor' },
      { email: studentUser.email, role: 'student' },
    ];
    await session.save();

    console.log('Zoom meetings saved to session:', session);

    // Generate email content with all meeting links
    const meetingLinksMessage = meetings
      .map((m, index) => `Part ${index + 1}: ${m.join_url}`)
      .join('\n');

    // Send email notifications to both tutor and student
    await Promise.all([
      sendNotification({
        to: tutorUser.email,
        subject: 'Zoom Links for Your Tutoring Session',
        body: `Dear ${tutorUser.name},\n\nYour tutoring session has been scheduled in multiple parts to accommodate the duration of ${duration} minutes.\n\nJoin the meetings using the links below:\n${meetingLinksMessage}\n\nBest regards,\nTutoring Platform`,
      }),
      sendNotification({
        to: studentUser.email,
        subject: 'Zoom Links for Your Tutoring Session',
        body: `Dear ${studentUser.name},\n\nYour tutoring session has been scheduled in multiple parts to accommodate the duration of ${duration} minutes.\n\nJoin the meetings using the links below:\n${meetingLinksMessage}\n\nBest regards,\nTutoring Platform`,
      }),
    ]);

    res.status(200).json({
      message:
        'Zoom links created successfully. Notifications sent to both tutor and student.',
      zoomLinks: meetings.map((m) => m.join_url),
    });
  } catch (error) {
    console.error('Error creating Zoom links:', error.message || error);
    res.status(500).json({ message: 'Failed to create Zoom links.' });
  }
};
