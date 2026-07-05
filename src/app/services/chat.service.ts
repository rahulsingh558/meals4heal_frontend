import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatMessage, ChatContact, QuickReply, ChatSession, AdminUser } from '../models/chat';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private sessionsSubject: BehaviorSubject<ChatSession[]>;
  private adminUsersSubject: BehaviorSubject<AdminUser[]>;
  private isChatOpenSubject: BehaviorSubject<boolean>;
  private isBrowser = false;

  private sessionsStorageKey = 'chatSessions';
  private adminKey = 'adminUsers';
  private userMessagesKey = 'userMessages_';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Initialize with sample data
    let initialSessions: ChatSession[] = [];
    let initialAdmins: AdminUser[] = [];

    if (this.isBrowser) {
      const savedSessions = localStorage.getItem(this.sessionsStorageKey);
      const savedAdmins = localStorage.getItem(this.adminKey);

      initialSessions = savedSessions ? JSON.parse(savedSessions) : this.getSampleSessions();
      initialAdmins = savedAdmins ? JSON.parse(savedAdmins) : this.getSampleAdmins();
    } else {
      initialSessions = this.getSampleSessions();
      initialAdmins = this.getSampleAdmins();
    }

    this.sessionsSubject = new BehaviorSubject<ChatSession[]>(initialSessions);
    this.adminUsersSubject = new BehaviorSubject<AdminUser[]>(initialAdmins);
    this.isChatOpenSubject = new BehaviorSubject<boolean>(false);
  }

  // Observables
  get sessions$(): Observable<ChatSession[]> {
    return this.sessionsSubject.asObservable();
  }

  get adminUsers$(): Observable<AdminUser[]> {
    return this.adminUsersSubject.asObservable();
  }

  get isChatOpen$(): Observable<boolean> {
    return this.isChatOpenSubject.asObservable();
  }

  // Get current values
  getSessions(): ChatSession[] {
    return this.sessionsSubject.getValue();
  }

  // Get messages for current user
  getUserMessages(userId: string): ChatMessage[] {
    if (!this.isBrowser) return [];

    const key = this.userMessagesKey + userId;
    const savedMessages = localStorage.getItem(key);
    return savedMessages ? JSON.parse(savedMessages) : [];
  }

  // Add this method to chat.service.ts
  syncUserMessages(userId: string): void {
    if (!this.isBrowser) return;

    const key = this.userMessagesKey + userId;
    const savedMessages = localStorage.getItem(key);

    if (savedMessages) {
      const messages: ChatMessage[] = JSON.parse(savedMessages);

      // Make sure each message has the correct sender
      const updatedMessages = messages.map(msg => {
        // If message has userId and sender is not set, set it to 'user'
        if (msg.userId && !msg.sender) {
          return { ...msg, sender: 'user' as const };
        }
        return msg;
      });

      // Save back
      localStorage.setItem(key, JSON.stringify(updatedMessages));
    }
  }

  // Send message from user
  sendUserMessage(content: string, userName?: string): void {
    const userId = this.getOrCreateUserId();
    const sessionId = 'session_' + userId;
    const userMessages = this.getUserMessages(userId);

    const newMessage: ChatMessage = {
      id: Date.now(),
      sessionId: sessionId,
      sender: 'user',
      content,
      timestamp: new Date(),
      isRead: false,
      userId: userId,
      userName: userName || 'User'
    };

    // Save to user's local storage
    const updatedUserMessages = [...userMessages, newMessage];
    this.saveUserMessages(userId, updatedUserMessages);

    // Update or create session for admin view
    this.updateUserSession(userId, userName || 'User', newMessage, sessionId);
  }

  // In chat.service.ts, update the sendAdminMessage method:

  // Send message from admin to specific session
  sendAdminMessage(content: string, sessionId: string): void {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sessionId: sessionId,
      sender: 'admin', // Make sure this is 'admin' not 'user'
      content,
      timestamp: new Date(),
      isRead: true,
      userId: session.userId, // Add userId to link to user
      userName: session.userName // Add userName
    };

    // Update session
    const updatedSession: ChatSession = {
      ...session,
      messages: [...session.messages, newMessage],
      lastActive: new Date()
    };

    const updatedSessions = sessions.map(s =>
      s.id === sessionId ? updatedSession : s
    );

    this.updateSessions(updatedSessions);

    // Also save to user's messages - THIS IS CRITICAL
    const userId = session.userId;
    const userMessages = this.getUserMessages(userId);

    // Make sure the message has sender: 'admin'
    const userAdminMessage: ChatMessage = {
      ...newMessage,
      sender: 'admin' // Explicitly set to admin
    };

    const updatedUserMessages = [...userMessages, userAdminMessage];
    this.saveUserMessages(userId, updatedUserMessages);
  }

  // Send quick reply from user
  sendQuickReply(text: string): void {
    this.sendUserMessage(text);
  }

  // Toggle chat window
  toggleChat(): void {
    const currentState = this.isChatOpenSubject.getValue();
    this.isChatOpenSubject.next(!currentState);
  }

  // Open chat
  openChat(): void {
    this.isChatOpenSubject.next(true);
  }

  // Close chat
  closeChat(): void {
    this.isChatOpenSubject.next(false);
  }

  // Mark session as resolved
  markSessionResolved(sessionId: string): void {
    const sessions = this.getSessions();
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          status: 'resolved' as const
        };
      }
      return session;
    });

    this.updateSessions(updatedSessions);
  }

  // Assign session to admin
  assignSessionToAdmin(sessionId: string, adminName: string): void {
    const sessions = this.getSessions();
    const updatedSessions = sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          assignedTo: adminName,
          status: 'active' as const
        };
      }
      return session;
    });

    this.updateSessions(updatedSessions);
  }

  // Get active sessions
  getActiveSessions(): ChatSession[] {
    return this.getSessions().filter(session => session.status === 'active');
  }

  // Get pending sessions
  getPendingSessions(): ChatSession[] {
    return this.getSessions().filter(session => session.status === 'pending');
  }

  // Get resolved sessions
  getResolvedSessions(): ChatSession[] {
    return this.getSessions().filter(session => session.status === 'resolved');
  }

  // Get quick replies
  getQuickReplies(): QuickReply[] {
    return [
      { id: 1, text: 'Track my order', icon: '🚚' },
      { id: 2, text: 'Cancel my order', icon: '❌' },
      { id: 3, text: 'Change delivery address', icon: '📍' },
      { id: 4, text: 'Payment issue', icon: '💳' },
      { id: 5, text: 'Refund status', icon: '💰' },
      { id: 6, text: 'Speak with an agent', icon: '👨‍💼' },
    ];
  }

  // Get common questions
  getCommonQuestions(): string[] {
    return [
      'How long will my delivery take?',
      'Can I modify my order?',
      'What are your delivery hours?',
      'Do you offer contactless delivery?',
      'How can I apply a coupon?',
    ];
  }

  // Get canned responses for admin
  getCannedResponses(): string[] {
    return [
      'Thanks for reaching out! How can I help you today?',
      'Your order is being prepared and will be delivered in 25-30 minutes.',
      'I apologize for the inconvenience. Let me check and get back to you.',
      'Could you please share your order ID for faster assistance?',
      'Our delivery partner is on the way to your location.',
      'I understand your concern. Let me escalate this to our team.',
      'We appreciate your patience. Your issue is being looked into.',
      'Is there anything else I can help you with?',
    ];
  }

  // Update admin status
  updateAdminStatus(adminId: string, isOnline: boolean): void {
    const admins = this.adminUsersSubject.getValue();
    const updatedAdmins = admins.map(admin => {
      if (admin.id === adminId) {
        return { ...admin, isOnline };
      }
      return admin;
    });

    this.adminUsersSubject.next(updatedAdmins);
    this.saveToLocalStorage(this.adminKey, updatedAdmins);
  }

  // Get unread count for a specific user
  getUserUnreadCount(userId: string): number {
    const userMessages = this.getUserMessages(userId);
    return userMessages.filter(msg => !msg.isRead && msg.sender === 'admin').length;
  }

  // Mark user messages as read
  markUserMessagesAsRead(userId: string): void {
    const userMessages = this.getUserMessages(userId);
    const updatedMessages = userMessages.map(msg => ({
      ...msg,
      isRead: true
    }));
    this.saveUserMessages(userId, updatedMessages);
  }

  // Private methods
  private getOrCreateUserId(): string {
    if (!this.isBrowser) return 'anonymous_user_' + Date.now();

    let userId = localStorage.getItem('chatUserId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('chatUserId', userId);
    }
    return userId;
  }

  private updateUserSession(userId: string, userName: string, message: ChatMessage, sessionId: string): void {
    const sessions = this.getSessions();

    // Find existing session for user
    let session = sessions.find(s => s.userId === userId);

    if (!session) {
      // Create new session
      const newSession: ChatSession = {
        id: sessionId,
        userId: userId,
        userName: userName,
        messages: [message],
        lastActive: new Date(),
        status: 'pending' as const,
        createdAt: new Date()
      };

      const updatedSessions = [...sessions, newSession];
      this.updateSessions(updatedSessions);
    } else {
      // Update existing session
      const updatedMessages = [...session.messages, message];
      const updatedSession: ChatSession = {
        ...session,
        messages: updatedMessages,
        lastActive: new Date(),
        status: session.status === 'resolved' ? 'pending' as const : session.status
      };

      const updatedSessions = sessions.map(s =>
        s.id === session!.id ? updatedSession : s
      );

      this.updateSessions(updatedSessions);
    }
  }

  private updateSessions(sessions: ChatSession[]): void {
    this.sessionsSubject.next(sessions);
    this.saveToLocalStorage(this.sessionsStorageKey, sessions);
  }

  private saveUserMessages(userId: string, messages: ChatMessage[]): void {
    if (this.isBrowser) {
      const key = this.userMessagesKey + userId;
      localStorage.setItem(key, JSON.stringify(messages));
    }
  }

  private saveToLocalStorage(key: string, data: any): void {
    if (this.isBrowser) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // Sample data
  private getSampleSessions(): ChatSession[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60000);
    const twoHoursAgo = new Date(now.getTime() - 120 * 60000);

    return [
      {
        id: 'session_user_123',
        userId: 'user_123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userPhone: '8151070458',
        messages: [
          {
            id: 1,
            sessionId: 'session_user_123',
            sender: 'user' as const,
            content: 'Hi, I need help with my order',
            timestamp: twoHoursAgo,
            isRead: true
          },
          {
            id: 2,
            sessionId: 'session_user_123',
            sender: 'admin' as const,
            content: 'Sure, how can I help?',
            timestamp: oneHourAgo,
            isRead: true
          }
        ],
        lastActive: oneHourAgo,
        status: 'active' as const,
        assignedTo: 'Admin User',
        createdAt: twoHoursAgo
      },
      {
        id: 'session_user_456',
        userId: 'user_456',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        messages: [
          {
            id: 3,
            sessionId: 'session_user_456',
            sender: 'user' as const,
            content: 'My food was delivered cold',
            timestamp: new Date(now.getTime() - 30 * 60000),
            isRead: false
          }
        ],
        lastActive: new Date(now.getTime() - 30 * 60000),
        status: 'pending' as const,
        createdAt: new Date(now.getTime() - 30 * 60000)
      },
      {
        id: 'session_user_789',
        userId: 'user_789',
        userName: 'Robert Johnson',
        userPhone: '9876543211',
        messages: [
          {
            id: 4,
            sessionId: 'session_user_789',
            sender: 'user' as const,
            content: 'Thanks for the help!',
            timestamp: new Date(now.getTime() - 180 * 60000),
            isRead: true
          },
          {
            id: 5,
            sessionId: 'session_user_789',
            sender: 'admin' as const,
            content: 'You\'re welcome!',
            timestamp: new Date(now.getTime() - 179 * 60000),
            isRead: true
          }
        ],
        lastActive: new Date(now.getTime() - 179 * 60000),
        status: 'resolved' as const,
        assignedTo: 'Admin User',
        createdAt: new Date(now.getTime() - 180 * 60000)
      }
    ];
  }

  private getSampleAdmins(): AdminUser[] {
    return [
      {
        id: 'admin_1',
        name: 'Admin User',
        avatar: '👨‍💼',
        role: 'admin',
        isOnline: true,
        activeChats: 2
      },
      {
        id: 'admin_2',
        name: 'Support Agent',
        avatar: '👩‍💼',
        role: 'support_agent',
        isOnline: false,
        activeChats: 0
      }
    ];
  }
}