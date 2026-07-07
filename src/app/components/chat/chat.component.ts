import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage, QuickReply } from '../../models/chat';

@Component({
  standalone: true,
  selector: 'app-chat-widget',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() isEmbedded: boolean = false;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef;
  
  messages: ChatMessage[] = [];
  quickReplies: QuickReply[] = [];
  commonQuestions: string[] = [];
  newMessage = '';
  isChatOpen = false;
  unreadCount = 0;
  isTyping = false;
  selectedContact = 'Customer Support';
  showQuickReplies = true;
  userId = '';
  userName = 'User';
  
  private messagesSubscription!: Subscription;
  private chatOpenSubscription!: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.isEmbedded) {
      this.isChatOpen = true;
      this.chatService.openChat(); // Ensure service knows it's open
    }

    // Check auth
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userId = user.id;
      this.userName = user.name;
    }
    
    // Subscribe to messages
    this.messagesSubscription = this.chatService.userMessages$.subscribe(messages => {
      this.messages = [...messages].sort((a, b) => {
        const timeA = new Date((a as any).createdAt || (a as any).timestamp).getTime();
        const timeB = new Date((b as any).createdAt || (b as any).timestamp).getTime();
        return timeA - timeB;
      });
      this.unreadCount = this.calculateUnreadCount();
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToBottom(), 100);
    });
    
    // Subscribe to chat open state
    this.chatOpenSubscription = this.chatService.isChatOpen$.subscribe(isOpen => {
      this.isChatOpen = isOpen;
      this.cdr.detectChanges();
      if (isOpen) {
        if (this.userId) {
          this.chatService.initializeUserChat();
        }
        setTimeout(() => {
          this.chatInput?.nativeElement?.focus();
        }, 300);
      }
    });

    // Get quick replies and common questions
    this.quickReplies = this.chatService.getQuickReplies();
    this.commonQuestions = this.chatService.getCommonQuestions();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (this.chatOpenSubscription) {
      this.chatOpenSubscription.unsubscribe();
    }
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }
  }

  // Get sender label for message
  getSenderLabel(message: ChatMessage): string {
    // Check if it's the current user's message
    if (message.userId === this.userId && message.sender === 'user') {
      return 'You';
    } else if (message.sender === 'admin') {
      return 'Support Agent';
    } else {
      return message.userName || 'User';
    }
  }

  // Calculate unread count
  calculateUnreadCount(): number {
    return this.messages.filter(msg => !msg.isRead && msg.sender === 'admin').length;
  }

  // Toggle chat window
  toggleChat(): void {
    this.chatService.toggleChat();
  }

  // Send message
  sendMessage(): void {
    const message = this.newMessage.trim();
    if (!message) return;

    this.chatService.sendUserMessage(message);
    this.newMessage = '';
    this.showQuickReplies = false;
    
    // Show typing indicator momentarily for UI feel
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
    }, 1000);
    
    setTimeout(() => this.scrollToBottom(), 100);
  }

  // Send quick reply
  sendQuickReply(text: string): void {
    this.chatService.sendQuickReply(text);
    this.showQuickReplies = false;
    
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
    }, 1000);
  }

  // Send common question
  sendCommonQuestion(question: string): void {
    this.chatService.sendUserMessage(question);
    this.showQuickReplies = false;
    
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
    }, 1000);
  }

  // Format time
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Scroll to bottom of messages
  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.messageContainer) {
          this.messageContainer.nativeElement.scrollTop = 
            this.messageContainer.nativeElement.scrollHeight;
        }
      }, 100);
    } catch(err) { }
  }

  // Handle Enter key
  @HostListener('document:keydown.enter')
  onEnterKey(): void {
    if (this.isChatOpen && this.newMessage.trim()) {
      this.sendMessage();
    }
  }

  // Handle Escape key
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isChatOpen) {
      this.chatService.closeChat();
    }
  }

  // Start new conversation
  startNewConversation(): void {
    this.showQuickReplies = true;
  }

  // Get today's date string
  getTodayDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Check if agent is online (simulate)
  isAgentOnline(): boolean {
    const hours = new Date().getHours();
    return hours >= 9 && hours < 21; // 9 AM to 9 PM
  }
}