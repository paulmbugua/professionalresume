// packages/shared/context/ChatContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react'
import { io, Socket } from 'socket.io-client'
import debounce from 'lodash/debounce'
import { useShopContext } from './ShopContext'
import useAppQuery from '../hooks/useAppQuery'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type {
  RawConversation,
  Conversation,
  ChatMessage,
  ChatContextValue,
} from '@mytutorapp/shared/types/ShopContextTypes'

export const ChatContext = createContext<ChatContextValue | undefined>(
  undefined
)

export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { backendUrl, token, profile } = useShopContext()
  const qc = useQueryClient()

  const [chats, setChats] = useState<Conversation[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isSocketReady, setSocketReady] = useState<boolean>(false)

  // Normalize a raw message payload into ChatMessage
  const normalizeMsg = useCallback((m: any): ChatMessage => ({
    id: String(m.id),
    sender: String(m.sender_id),
    sender_name: m.sender_name || '',
    content: m.content,
    unread: Boolean(m.unread),
    timestamp: m.timestamp || new Date().toISOString(),
  }), [])

  // 1) Map RawConversation → Conversation
  const mapRaw = useCallback(
    (r: RawConversation): Conversation => {
      const me = String(profile?.id)
      const sender = String(r.sender_id)
      const recipient = String(r.recipient_id)
      const amSender = sender === me
      const peerId = amSender ? recipient : sender
      const peerName = amSender ? r.recipient_name : r.sender_name
      const peerAvatar = amSender ? r.recipient_avatar : r.sender_avatar

      return {
        conversationId: String(r.id),
        recipientId: peerId,
        name: peerName,
        avatar: peerAvatar ?? '',
        lastMessage: r.last_message,
        unreadCount: Number(r.unread_count),
        messages: r.messages.map(normalizeMsg),
      }
    },
    [normalizeMsg, profile?.id]
  )

  // 2) Fetch all conversations
  const {
    data: rawConversations = [],
    refetch: rawRefetchConversations,
  } = useAppQuery<RawConversation[], Error>(
    ['conversations', token],
    async () => {
      const res = await axios.get(
        `${backendUrl}/api/profileActions/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return res.data.conversations as RawConversation[]
    },
    { enabled: Boolean(token) }
  )

  // 3) Sync conversations list into state
  const lastChatsRef = useRef<Conversation[]>([])
  const lastUnreadRef = useRef<number>(0)

  useEffect(() => {
    const formatted = rawConversations
      .filter((r) => r.sender_id !== r.recipient_id)
      .map(mapRaw)

    const total = formatted.reduce((sum, c) => sum + c.unreadCount, 0)

    const same =
      formatted.length === lastChatsRef.current.length &&
      formatted.every((c, i) =>
        c.conversationId === lastChatsRef.current[i].conversationId &&
        c.unreadCount === lastChatsRef.current[i].unreadCount
      )

    if (!same) {
      lastChatsRef.current = formatted
      setChats(formatted)
    }
    if (total !== lastUnreadRef.current) {
      lastUnreadRef.current = total
      setUnreadCount(total)
    }
  }, [rawConversations, mapRaw])

  // 4) Manual refetch (returns Promise<void>)
  const fetchConversations = useCallback(async (): Promise<void> => {
    await rawRefetchConversations()
  }, [rawRefetchConversations])

  // 5) Fetch messages (replace at offset=0, append otherwise)
  const fetchMessages = useCallback(
    async (recipientId: string, limit = 20, offset = 0) => {
      const res = await axios.get(
        `${backendUrl}/api/profileActions/conversations/${recipientId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit, offset },
        }
      )
      const newMsgs = (res.data.messages as any[]).map(normalizeMsg)

      setChats((prev) =>
        prev.map((c) =>
          c.recipientId !== recipientId
            ? c
            : {
                ...c,
                messages:
                  offset === 0 ? newMsgs : [...c.messages, ...newMsgs],
              }
        )
      )
    },
    [backendUrl, token, normalizeMsg]
  )

  // 6) Socket.io setup
  const socket: Socket | null = useMemo(() => {
    if (!token) return null
    return io(backendUrl, {
      query: { token },
      transports: ['websocket'],
      autoConnect: false,
    })
  }, [backendUrl, token])

  useEffect(() => {
    if (!socket || profile?.id == null) return

    socket.connect()
    socket.on('connect', () => setSocketReady(true))
    socket.on('disconnect', () => setSocketReady(false))
    socket.on('messageReceived', (raw: RawConversation) => {
      const inc = mapRaw(raw)
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.conversationId === inc.conversationId)
        if (idx > -1) {
          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            lastMessage: inc.lastMessage,
            unreadCount: updated[idx].unreadCount + inc.unreadCount,
            messages: [...updated[idx].messages, ...inc.messages],
          }
          return updated
        }
        return [inc, ...prev]
      })
      setUnreadCount((u) => u + inc.unreadCount)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('messageReceived')
      socket.disconnect()
    }
  }, [socket, profile?.id, mapRaw])

  // 7) Send message with optimistic append
  const sendMessage = useCallback(
    (recipientId: string, content: string) => {
      if (!(socket && isSocketReady && profile?.id != null)) return

      const temp: ChatMessage = {
        id: `temp-${Date.now()}`,
        sender: String(profile.id),
        sender_name: profile.name || '',
        content,
        unread: false,
        timestamp: new Date().toISOString(),
      }
      setChats((prev) =>
        prev.map((c) =>
          c.recipientId === recipientId
            ? {
                ...c,
                lastMessage: content,
                messages: [...c.messages, temp],
              }
            : c
        )
      )

      socket.emit('sendMessage', {
        recipientId,
        content,
        senderId: profile.id,
        unread: true,
      })
    },
    [socket, isSocketReady, profile]
  )

  // 8) Mark as read (debounced)
  const markAsRead = useMemo(
    () =>
      debounce(async (recipientId: string) => {
        await axios.post(
          `${backendUrl}/api/profileActions/conversations/${recipientId}/markAsRead`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        await fetchConversations()
      }, 300),
    [backendUrl, token, fetchConversations]
  )

  // 9) Initial load
  useEffect(() => {
    if (token) fetchConversations()
  }, [token, fetchConversations])

  // 10) Context value
  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      unreadCount,
      isSocketReady,
      fetchConversations,
      fetchMessages,
      sendMessage,
      markAsRead,
    }),
    [chats, unreadCount, isSocketReady, fetchConversations, fetchMessages, sendMessage, markAsRead]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChatContext = (): ChatContextValue => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
