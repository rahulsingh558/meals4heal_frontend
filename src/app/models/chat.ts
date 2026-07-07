export interface ChatMessage {
  id: number;
  sessionId?: string; // Link message to specific session
  sender: 'user' | 'admin';
  content: string;
  timestamp: Date;
  createdAt?: Date;
  isRead: boolean;
  userId?: string; // Optional: to identify user
  userName?: string; // Optional: user's name
}

export interface ChatContact {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  isOnline: boolean;
  role: 'customer_support' | 'delivery_support' | 'billing_support';
  userId?: string; // For linking to user account
  email?: string; // User email
  phone?: string; // User phone
}

export interface QuickReply {
  id: number;
  text: string;
  icon?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  userName: string; // Make sure this is required (not optional)
  userEmail?: string;
  userPhone?: string;
  messages: ChatMessage[];
  lastActive: Date;
  status: 'active' | 'resolved' | 'pending';
  assignedTo?: string;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'support_agent';
  isOnline: boolean;
  activeChats: number;
}