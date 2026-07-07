import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ChatMessage, ChatSession, AdminUser, QuickReply } from '../models/chat';
import { environment } from '../../environments/environment';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private API_URL = `${environment.apiUrl}/chat`;
  
  private sessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  private isChatOpenSubject = new BehaviorSubject<boolean>(false);
  private userMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private adminUsersSubject = new BehaviorSubject<AdminUser[]>([]);
  
  private isBrowser = false;
  private currentSessionId: string | null = null;
  private socketSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private webSocket: WebSocketService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Set dummy admin user so admin component doesn't break
    this.adminUsersSubject.next([
      { id: 'admin_1', name: 'Admin', avatar: '👨‍💼', role: 'admin', isOnline: true, activeChats: 0 }
    ]);
  }

  // Observables
  get sessions$(): Observable<ChatSession[]> {
    return this.sessionsSubject.asObservable();
  }

  get adminUsers$(): Observable<AdminUser[]> {
    return this.adminUsersSubject.asObservable();
  }

  get userMessages$(): Observable<ChatMessage[]> {
    return this.userMessagesSubject.asObservable();
  }

  get isChatOpen$(): Observable<boolean> {
    return this.isChatOpenSubject.asObservable();
  }

  // Fetch admin sessions from backend
  fetchAdminSessions(): void {
    if (!this.isBrowser) return;
    this.http.get<{success: boolean, sessions: any[]}>(`${this.API_URL}/sessions`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            const mapped = res.sessions.map(s => ({...s, id: s.sessionId || s.id}));
            this.sessionsSubject.next(mapped);
          }
        },
        error: (err) => console.error('Failed to fetch admin sessions', err)
      });
  }

  // Join admin socket room
  joinAdminRoom(): void {
    if (!this.isBrowser) return;
    this.webSocket.emit('join-admin', {});
    
    this.webSocket.listen('session-updated').subscribe((message: ChatMessage) => {
      this.fetchAdminSessions();
    });
    this.webSocket.listen('new-message').subscribe((message: ChatMessage) => {
      this.fetchAdminSessions();
    });
  }

  toggleChat(): void {
    const currentState = this.isChatOpenSubject.getValue();
    this.isChatOpenSubject.next(!currentState);
  }

  openChat(): void {
    this.isChatOpenSubject.next(true);
  }

  closeChat(): void {
    this.isChatOpenSubject.next(false);
  }

  // Initialize chat for the user
  initializeUserChat(): void {
    if (!this.isBrowser) return;
    const user = this.authService.getCurrentUser();
    if (!user) return; // User must be authenticated

    this.currentSessionId = `session_${user.id}`;
    
    // Fetch initial messages
    this.http.get<{success: boolean, messages: ChatMessage[]}>(`${this.API_URL}/messages/${this.currentSessionId}`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.userMessagesSubject.next(res.messages);
          }
        },
        error: (err) => console.error('Failed to fetch user messages', err)
      });

    // Join room
    this.webSocket.emit('join-chat', this.currentSessionId);
    
    // Listen to new messages
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    this.socketSubscription = this.webSocket.listen('new-message').subscribe((message: ChatMessage) => {
      if (message.sessionId === this.currentSessionId) {
        const currentMessages = this.userMessagesSubject.getValue();
        if (!currentMessages.find(m => (m as any)._id === (message as any)._id)) {
          this.userMessagesSubject.next([...currentMessages, message]);
        }
      }
    });
  }

  sendUserMessage(content: string): void {
    const user = this.authService.getCurrentUser();
    if (!user || !this.currentSessionId) return;

    const payload = {
      sessionId: this.currentSessionId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      sender: 'user',
      content: content
    };

    this.http.post<{success: boolean, message: ChatMessage}>(`${this.API_URL}/send`, payload)
      .subscribe({
        next: (res) => {
          if (res.success) {
            const currentMessages = this.userMessagesSubject.getValue();
            this.userMessagesSubject.next([...currentMessages, res.message]);
          }
        },
        error: (err) => console.error('Failed to send user message', err)
      });
  }

  sendAdminMessage(content: string, sessionId: string): void {
    const admin = this.authService.getCurrentUser();
    if (!admin) return;

    // Find session to get user details
    const session = this.sessionsSubject.getValue().find(s => s.id === sessionId || (s as any).sessionId === sessionId);
    if (!session) return;

    const payload = {
      sessionId: sessionId,
      userId: session.userId,
      userName: session.userName,
      sender: 'admin',
      content: content,
      assignedTo: admin.name
    };

    this.http.post<{success: boolean, message: ChatMessage}>(`${this.API_URL}/send`, payload)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.fetchAdminSessions();
          }
        },
        error: (err) => console.error('Failed to send admin message', err)
      });
  }

  markSessionResolved(sessionId: string): void {
    this.http.put(`${this.API_URL}/session/${sessionId}/status`, { status: 'resolved' })
      .subscribe(() => this.fetchAdminSessions());
  }

  assignSessionToAdmin(sessionId: string, adminName: string): void {
    this.http.put(`${this.API_URL}/session/${sessionId}/status`, { status: 'active', assignedTo: adminName })
      .subscribe(() => this.fetchAdminSessions());
  }

  sendQuickReply(text: string): void {
    this.sendUserMessage(text);
  }

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

  getCommonQuestions(): string[] {
    return [
      'How long will my delivery take?',
      'Can I modify my order?',
      'What are your delivery hours?',
      'Do you offer contactless delivery?',
      'How can I apply a coupon?',
    ];
  }

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
}