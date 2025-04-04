import pool from '../config/db.js';

// Add to Favorites
export const addToFavorites = async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user.id; // using user_id for favorites here

    // Check if profile exists (profileId is already a profile id)
    const profile = await pool.query('SELECT * FROM profiles WHERE id = $1', [
      profileId,
    ]);
    if (profile.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Insert into favorites (assumes a separate favorites table with appropriate constraints)
    await pool.query(
      'INSERT INTO favorites (user_id, profile_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, profileId],
    );

    res.status(200).json({ message: 'Profile added to favorites' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ message: 'Failed to add to favorites', error });
  }
};

// Send Message with real-time Socket.io
export const sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const authSenderId = req.user.id; // authenticated user's user_id

    if (!authSenderId || !recipientId || !content) {
      return res
        .status(400)
        .json({ message: 'Sender ID, recipient ID, and content are required' });
    }

    // Convert sender's user_id to sender's profile id
    const senderProfileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [authSenderId],
    );
    if (senderProfileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sender profile not found.' });
    }
    const senderProfileId = senderProfileResult.rows[0].id;
    // For recipient, we assume recipientId is already a profile id
    const recipientProfileId = recipientId;

    // Check if a conversation already exists between these profiles
    let conversation = await pool.query(
      `SELECT id FROM conversations 
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)`,
      [senderProfileId, recipientProfileId],
    );

    let conversationId;
    if (conversation.rows.length === 0) {
      // Create new conversation with an initial unread_count of 1
      const newConversation = await pool.query(
        `INSERT INTO conversations (sender_id, recipient_id, unread_count) 
         VALUES ($1, $2, 1) RETURNING id`,
        [senderProfileId, recipientProfileId],
      );
      conversationId = newConversation.rows[0].id;
    } else {
      conversationId = conversation.rows[0].id;
      // Increment unread_count for the recipient
      await pool.query(
        `UPDATE conversations 
         SET unread_count = unread_count + 1, updated_at = NOW() 
         WHERE id = $1 AND recipient_id = $2`,
        [conversationId, recipientProfileId],
      );
    }

    // Insert the new message into the messages table
    const messageResult = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content) 
       VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, senderProfileId, content],
    );

    // Update conversation's updated_at field
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId],
    );

    // Emit real-time message events.
    // Depending on your room naming convention, you might emit to rooms using profile ids.
    // Here, we assume the recipient's room is named with their profile id.
    req.io.to(String(recipientProfileId)).emit('messageReceived', {
      userId: authSenderId, // original user_id for display purposes if needed
      content,
      senderId: authSenderId,
      senderName: req.user.name,
      unread: true, // Recipient sees message as unread
    });

    // For the sender, mark the message as read.
    req.io.to(String(authSenderId)).emit('messageReceived', {
      recipientId,
      content,
      senderId: authSenderId,
      senderName: 'You',
      unread: false,
    });

    res
      .status(201)
      .json({
        message: 'Message sent successfully',
        data: messageResult.rows[0],
      });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ message: 'Failed to send message', error });
  }
};

// Get Conversations with Pagination
export const getConversations = async (req, res) => {
  const authUserId = req.user.id;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    // Convert authenticated user_id to profile id
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [authUserId],
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' });
    }
    const profileId = profileResult.rows[0].id;

    // Fetch conversations for this profile id
    const conversations = await pool.query(
      `SELECT 
          c.id, 
          c.sender_id,
          c.recipient_id,
          p1.name AS sender_name,
          p1.gallery[1] AS sender_avatar,
          p2.name AS recipient_name,
          p2.gallery[1] AS recipient_avatar,
          COALESCE(
            (SELECT json_agg(m ORDER BY m.created_at ASC) 
             FROM messages m 
             WHERE m.conversation_id = c.id), 
            '[]'::json
          ) AS messages,
          (SELECT content FROM messages WHERE conversation_id = c.id 
           ORDER BY created_at DESC LIMIT 1) AS last_message,
          (SELECT COUNT(*) FROM messages 
           WHERE conversation_id = c.id 
             AND unread = TRUE 
             AND sender_id != $1) AS unread_count
       FROM conversations c
       JOIN profiles p1 ON c.sender_id = p1.id
       JOIN profiles p2 ON c.recipient_id = p2.id
       WHERE c.sender_id = $1 OR c.recipient_id = $1
       ORDER BY c.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset],
    );

    console.log('Fetched conversations:', conversations.rows);
    res.status(200).json({ conversations: conversations.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to load conversations.' });
  }
};

// Get Messages within a Conversation
export const getMessages = async (req, res) => {
  const { recipientId } = req.params; // recipient's profile id is provided now
  const authUserId = req.user.id; // sender's user_id
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    // Convert sender's user_id to sender's profile id
    const senderProfileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [authUserId],
    );
    if (senderProfileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sender profile not found.' });
    }
    const senderProfileId = senderProfileResult.rows[0].id;
    // recipientId is already a profile id
    const recipientProfileId = recipientId;

    const messages = await pool.query(
      `SELECT * FROM messages 
       WHERE conversation_id IN (
         SELECT id FROM conversations 
         WHERE (sender_id = $1 AND recipient_id = $2) 
            OR (sender_id = $2 AND recipient_id = $1)
       ) 
       ORDER BY created_at ASC
       LIMIT $3 OFFSET $4`,
      [senderProfileId, recipientProfileId, limit, offset],
    );

    console.log(
      'Fetched messages for conversation with recipientProfileId ' +
        recipientProfileId +
        ':',
      messages.rows,
    );
    res.status(200).json({ messages: messages.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to retrieve messages.' });
  }
};

// Mark Messages as Read
export const markAsRead = async (req, res) => {
  const { recipientId } = req.params; // recipient's profile id
  const authUserId = req.user.id; // sender's user_id (authenticated user)

  try {
    // Convert sender's user_id to sender's profile id
    const senderProfileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [authUserId],
    );
    if (senderProfileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sender profile not found.' });
    }
    const senderProfileId = senderProfileResult.rows[0].id;
    // recipientId is already a profile id
    const recipientProfileId = recipientId;

    // Update messages: mark all messages in this conversation sent by the recipient as read.
    // Using IN to handle the possibility of multiple conversation IDs.
    await pool.query(
      `UPDATE messages 
       SET unread = FALSE 
       WHERE conversation_id IN (
         SELECT id FROM conversations 
         WHERE (sender_id = $1 AND recipient_id = $2) 
            OR (sender_id = $2 AND recipient_id = $1)
       )
       AND sender_id = $2 AND unread = TRUE`,
      [senderProfileId, recipientProfileId],
    );

    res.status(200).json({ message: 'Messages marked as read.' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read.' });
  }
};

// Delete a Specific Message
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params; // messageId is provided
  const authUserId = req.user.id;

  try {
    const senderProfileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [authUserId],
    );
    if (senderProfileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' });
    }
    const senderProfileId = senderProfileResult.rows[0].id;
    // Delete the message if the sender matches
    const result = await pool.query(
      `DELETE FROM messages 
       WHERE id = $1 AND sender_id = $2 RETURNING *`,
      [messageId, senderProfileId],
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .json({ message: 'You can only delete your own messages.' });
    }

    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message.' });
  }
};

// Delete an Entire Conversation
export const deleteConversation = async (req, res) => {
  const { conversationId } = req.params;
  const authUserId = req.user.id;

  try {
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [authUserId],
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' });
    }
    const profileId = profileResult.rows[0].id;
    const conversation = await pool.query(
      `SELECT * FROM conversations 
       WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)`,
      [conversationId, profileId],
    );

    if (conversation.rows.length === 0) {
      return res
        .status(403)
        .json({
          message: 'You can only delete conversations you are part of.',
        });
    }

    await pool.query('DELETE FROM conversations WHERE id = $1', [
      conversationId,
    ]);

    res.status(200).json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Failed to delete conversation.' });
  }
};
