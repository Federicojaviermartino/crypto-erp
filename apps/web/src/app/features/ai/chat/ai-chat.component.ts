import { Component, signal, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasAttachment?: boolean;
  attachmentName?: string;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <header class="chat-header">
        <div class="header-info">
          <span class="ai-avatar">🤖</span>
          <div>
            <h2>AI Accounting Assistant</h2>
            <p class="text-muted">Expert in accounting, tax compliance and Crypto</p>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-sm"
            [class.btn-primary]="language() === 'es'"
            [class.btn-secondary]="language() === 'en'"
            (click)="toggleLanguage()">
            {{ language() === 'es' ? '🇪🇸 ES' : '🇬🇧 EN' }}
          </button>
          <button class="btn btn-sm btn-secondary" (click)="clearChat()">
            Clear Chat
          </button>
        </div>
      </header>

      <div class="chat-messages" #messagesContainer>
        @if (messages().length === 0) {
          <div class="welcome-message">
            <span class="welcome-icon">💬</span>
            <h3>Hello! I'm your accounting assistant</h3>
            <p>I can help you with:</p>
            <div class="suggestions">
              <button class="suggestion" (click)="sendSuggestion('How do I record a purchase invoice?')">
                📄 Record invoices
              </button>
              <button class="suggestion" (click)="sendSuggestion('How does FIFO calculation work for crypto?')">
                💰 Crypto taxation
              </button>
              <button class="suggestion" (click)="sendSuggestion('What is Verifactu and how does it affect my company?')">
                📋 Verifactu
              </button>
              <button class="suggestion" (click)="sendSuggestion('How do I close the fiscal year?')">
                📊 Year-end closing
              </button>
            </div>
          </div>
        }

        @for (message of messages(); track message.timestamp) {
          <div class="message" [class]="message.role">
            <div class="message-avatar">
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="message-content">
              <div class="message-text" [innerHTML]="formatMessage(message.content)"></div>
              <span class="message-time">{{ message.timestamp | date:'HH:mm' }}</span>
            </div>
          </div>
        }

        @if (loading()) {
          <div class="message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Suggested Follow-ups -->
      @if (suggestedFollowUps().length > 0 && !loading()) {
        <div class="suggested-questions">
          <p class="suggested-label">Suggested questions:</p>
          <div class="suggestions-grid">
            @for (suggestion of suggestedFollowUps(); track suggestion) {
              <button class="suggestion-btn" (click)="useSuggestion(suggestion)">
                {{ suggestion }}
              </button>
            }
          </div>
        </div>
      }

      <div class="chat-input">
        <!-- File Attachment Preview -->
        @if (attachedFile()) {
          <div class="attachment-preview">
            <span class="attachment-icon">📎</span>
            <span class="attachment-name">{{ attachedFile()?.name }}</span>
            <button class="remove-attachment-btn" (click)="removeAttachment()">×</button>
          </div>
        }

        <div class="input-container">
          <input
            type="file"
            #fileInput
            (change)="onFileSelected($event)"
            accept="image/*,application/pdf"
            style="display: none;" />

          <button
            class="attach-btn"
            (click)="fileInput.click()"
            [disabled]="loading()"
            title="Attach file">
            📎
          </button>

          <textarea
            #inputField
            [(ngModel)]="userInput"
            (keydown.enter)="onEnterPress($any($event))"
            placeholder="Type your question..."
            rows="1"
            [disabled]="loading()"
          ></textarea>

          <button
            class="send-btn"
            (click)="sendMessage()"
            [disabled]="loading() || (!userInput.trim() && !attachedFile())"
          >
            @if (loading()) {
              <span class="spinner-sm"></span>
            } @else {
              ➤
            }
          </button>
        </div>
        <p class="input-hint">Enter to send, Shift+Enter for new line • Attach images or PDFs</p>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 60px);
      background: var(--gray-50);
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-xl);
      background: var(--white);
      border-bottom: 1px solid var(--gray-200);

      .header-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);

        h2 { margin: 0; font-size: 1.125rem; }
        p { margin: 0; font-size: 0.75rem; }
      }

      .ai-avatar {
        font-size: 2rem;
      }
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-xl);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .welcome-message {
      text-align: center;
      padding: var(--spacing-2xl);

      .welcome-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: var(--spacing-md);
      }

      h3 {
        margin: 0 0 var(--spacing-sm);
      }

      p {
        color: var(--gray-500);
        margin-bottom: var(--spacing-lg);
      }

      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
        justify-content: center;
      }

      .suggestion {
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--white);
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-full);
        cursor: pointer;
        font-size: 0.875rem;
        transition: all var(--transition-fast);

        &:hover {
          border-color: var(--primary);
          background: #eff6ff;
        }
      }
    }

    .message {
      display: flex;
      gap: var(--spacing-md);
      max-width: 80%;

      &.user {
        align-self: flex-end;
        flex-direction: row-reverse;

        .message-content {
          background: var(--primary);
          color: var(--white);

          .message-time {
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }

      &.assistant {
        align-self: flex-start;

        .message-content {
          background: var(--white);
          border: 1px solid var(--gray-200);
        }
      }
    }

    .message-avatar {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      background: var(--gray-100);
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .message-content {
      padding: var(--spacing-md);
      border-radius: var(--radius-lg);

      .message-text {
        white-space: pre-wrap;
        line-height: 1.6;

        :deep(code) {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-family: monospace;
        }

        :deep(ul), :deep(ol) {
          margin: var(--spacing-sm) 0;
          padding-left: var(--spacing-lg);
        }
      }

      .message-time {
        display: block;
        font-size: 0.7rem;
        margin-top: var(--spacing-xs);
        color: var(--gray-400);
      }
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: var(--spacing-sm) 0;

      span {
        width: 8px;
        height: 8px;
        background: var(--gray-400);
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out;

        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }

    .chat-input {
      padding: var(--spacing-md) var(--spacing-xl);
      background: var(--white);
      border-top: 1px solid var(--gray-200);

      .input-container {
        display: flex;
        gap: var(--spacing-sm);
        background: var(--gray-50);
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-sm);

        &:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      }

      textarea {
        flex: 1;
        border: none;
        background: transparent;
        resize: none;
        font-size: 0.875rem;
        padding: var(--spacing-sm);
        max-height: 120px;

        &:focus { outline: none; }
        &::placeholder { color: var(--gray-400); }
      }

      .send-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: var(--primary);
        color: var(--white);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--transition-fast);

        &:hover:not(:disabled) {
          background: var(--primary-dark);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .input-hint {
        font-size: 0.7rem;
        color: var(--gray-400);
        text-align: center;
        margin: var(--spacing-xs) 0 0;
      }
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--white);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Suggested Follow-ups */
    .suggested-questions {
      padding: var(--spacing-md) var(--spacing-xl);
      background: #fffbeb;
      border-top: 1px solid #fbbf24;

      .suggested-label {
        margin: 0 0 var(--spacing-sm);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--gray-700);
      }

      .suggestions-grid {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
      }

      .suggestion-btn {
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--white);
        border: 1px solid #fbbf24;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--gray-700);
        transition: all var(--transition-fast);

        &:hover {
          background: #fef3c7;
          border-color: #f59e0b;
        }
      }
    }

    /* File Attachments */
    .attachment-preview {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      background: #eff6ff;
      border: 1px solid #3b82f6;
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-sm);

      .attachment-icon {
        font-size: 1.25rem;
      }

      .attachment-name {
        flex: 1;
        font-size: 0.875rem;
        color: var(--gray-700);
        font-weight: 500;
      }

      .remove-attachment-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: #ef4444;
        color: var(--white);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 1.125rem;
        line-height: 1;
        transition: background var(--transition-fast);

        &:hover {
          background: #dc2626;
        }
      }
    }

    .attach-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--gray-200);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .header-actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  `],
})
export class AiChatComponent implements AfterViewChecked, OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('inputField') private inputField!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  userInput = '';
  private shouldScroll = false;

  // Enhanced features
  attachedFile = signal<File | null>(null);
  language = signal<'es' | 'en'>('es');
  suggestedFollowUps = signal<string[]>([]);
  private readonly STORAGE_KEY = 'ai_chat_history';

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadChatHistory();
  }

  ngOnDestroy(): void {
    this.saveChatHistory();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onEnterPress(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendSuggestion(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  sendMessage(): void {
    const content = this.userInput.trim();
    const file = this.attachedFile();

    if ((!content && !file) || this.loading()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date(),
      hasAttachment: !!file,
      attachmentName: file?.name,
    };

    this.messages.update(msgs => [...msgs, userMessage]);
    this.userInput = '';
    this.loading.set(true);
    this.shouldScroll = true;

    // Send with file attachment if exists
    if (file) {
      this.sendMessageWithFile(file, content);
      return;
    }

    // Prepare messages for API with context
    const apiMessages = this.messages().map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Build context
    const context = {
      companyId: this.auth.getCompanyId(),
      useRAG: true,
      language: this.language(),
    };

    this.api.post<{ response: string }>('/ai/chat', {
      messages: apiMessages,
      context,
    }).subscribe({
      next: (res) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: res.response,
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, assistantMessage]);
        this.extractSuggestedFollowUps(res.response);
        this.saveChatHistory();
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, an error occurred. Please try again.',
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, errorMessage]);
        this.loading.set(false);
        this.shouldScroll = true;
      },
    });
  }

  private sendMessageWithFile(file: File, message: string): void {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', message);
    formData.append('context', JSON.stringify({
      companyId: this.auth.getCompanyId(),
      language: this.language(),
    }));

    this.api.post<{ response: string }>('/ai/chat-with-file', formData).subscribe({
      next: (res) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: res.response,
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, assistantMessage]);
        this.attachedFile.set(null);
        this.saveChatHistory();
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Error processing attached file.',
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, errorMessage]);
        this.attachedFile.set(null);
        this.loading.set(false);
        this.shouldScroll = true;
      },
    });
  }

  clearChat(): void {
    this.messages.set([]);
    this.suggestedFollowUps.set([]);
    localStorage.removeItem(this.getStorageKey());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.attachedFile.set(input.files[0]);
    }
  }

  removeAttachment(): void {
    this.attachedFile.set(null);
  }

  toggleLanguage(): void {
    this.language.set(this.language() === 'es' ? 'en' : 'es');
  }

  useSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    this.sendMessage();
  }

  formatMessage(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private loadChatHistory(): void {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      try {
        const messages = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        this.messages.set(messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
        this.shouldScroll = true;
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }

  private saveChatHistory(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.messages()));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  private getStorageKey(): string {
    const companyId = this.auth.getCompanyId() || 'default';
    return `${this.STORAGE_KEY}_${companyId}`;
  }

  private extractSuggestedFollowUps(response: string): void {
    // Extract suggestions from AI response (format: [Pregunta sugerida: ...])
    const pattern = /\[Pregunta sugerida: (.*?)\]/g;
    const matches = Array.from(response.matchAll(pattern));
    if (matches.length > 0) {
      const suggestions = matches.map(m => m[1].trim());
      this.suggestedFollowUps.set(suggestions);
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }
}
