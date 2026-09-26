import {
  CustomerSupportContext,
  CustomerSupportMessage,
  ChatbotResponse,
  ChatbotConfig
} from './support-types';

/**
 * Baseline Customer Support Chatbot - LLM Only
 * 
 * Behavior:
 * - Uses LLM (e.g., Claude Sonnet) for conversation
 * - NO sentiment analysis
 * - Only escalates when customer explicitly asks for human
 * - Reactive support
 */
export class BaselineSupportChatbot {
  private config: ChatbotConfig;
  private conversations: Map<string, CustomerSupportContext>;

  constructor(config?: Partial<ChatbotConfig>) {
    this.config = {
      useSentimentAnalysis: false,
      llmModel: 'claude-sonnet-3.5',
      autoEscalateOnFrustration: false,
      frustrationThreshold: 0.7,
      ...config
    };
    this.conversations = new Map();
  }

  async processMessage(
    conversationId: string,
    customerMessage: string
  ): Promise<ChatbotResponse> {
    const startTime = Date.now();

    // Get or create conversation
    let context = this.conversations.get(conversationId);
    if (!context) {
      context = {
        conversationId,
        messages: [],
        escalated: false,
        sentimentHistory: []
      };
      this.conversations.set(conversationId, context);
    }

    // Add customer message
    const message: CustomerSupportMessage = {
      id: `msg_${Date.now()}`,
      content: customerMessage,
      timestamp: Date.now(),
      sender: 'customer'
    };
    context.messages.push(message);

    // Check for explicit escalation requests
    const shouldEscalate = this.checkExplicitEscalation(customerMessage);

    if (shouldEscalate && !context.escalated) {
      context.escalated = true;
      context.escalationType = 'explicit';
      context.escalationReason = 'Customer requested to speak with human agent';

      return {
        message: "Of course! Let me connect you with a human agent right away. One moment please...",
        shouldEscalate: true,
        escalationReason: context.escalationReason,
        responseTimeMs: Date.now() - startTime
      };
    }

    // If already escalated, inform customer
    if (context.escalated) {
      return {
        message: "You're currently in queue to speak with a human agent. They'll be with you shortly.",
        shouldEscalate: false,
        responseTimeMs: Date.now() - startTime
      };
    }

    // Generate LLM response (simulated for now, would call real LLM)
    const llmResponse = await this.generateLLMResponse(customerMessage, context);

    // Add bot message
    const botMessage: CustomerSupportMessage = {
      id: `msg_${Date.now()}_bot`,
      content: llmResponse,
      timestamp: Date.now(),
      sender: 'agent'
    };
    context.messages.push(botMessage);

    return {
      message: llmResponse,
      shouldEscalate: false,
      responseTimeMs: Date.now() - startTime
    };
  }

  private checkExplicitEscalation(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const escalationPhrases = [
      'speak to a human',
      'talk to a human',
      'speak to agent',
      'talk to agent',
      'speak to someone',
      'talk to someone',
      'speak to a manager',
      'talk to a manager',
      'speak to the manager',
      'talk to the manager',
      'speak with a manager',
      'speak with manager',
      'human agent',
      'real person',
      'speak with human',
      'talk with human',
      'connect me to',
      'transfer me to',
      'escalate',
      'manager now',
      'speak to manager',
      'talk to manager'
    ];

    return escalationPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  private async generateLLMResponse(
    message: string,
    context: CustomerSupportContext
  ): Promise<string> {
    // Simulate LLM call (in production, this would call Claude/GPT)
    // For now, we'll use template responses based on keywords
    
    const lowerMessage = message.toLowerCase();

    // Simulate 3-5 second LLM response time (realistic for Claude/GPT)
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    if (lowerMessage.includes('order') || lowerMessage.includes('shipping')) {
      return "I'd be happy to help you with your order! Could you please provide your order number so I can look up the details?";
    }

    if (lowerMessage.includes('refund') || lowerMessage.includes('money back')) {
      return "I understand you'd like a refund. Let me check our refund policy for your purchase. Could you tell me more about the issue you're experiencing?";
    }

    if (lowerMessage.includes('not working') || lowerMessage.includes('broken') || lowerMessage.includes('issue')) {
      return "I'm sorry to hear you're experiencing an issue. Let me help you troubleshoot this. Can you describe what's happening in more detail?";
    }

    if (lowerMessage.includes('waiting') || lowerMessage.includes('days') || lowerMessage.includes('weeks')) {
      return "I apologize for the delay you've experienced. Let me look into this for you right away. Could you provide some more details?";
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('question')) {
      return "I'm here to help! What can I assist you with today?";
    }

    return "Thank you for reaching out. I'm here to assist you. Could you please provide more details about your concern?";
  }

  getConversationContext(conversationId: string): CustomerSupportContext | undefined {
    return this.conversations.get(conversationId);
  }

  getName(): string {
    return 'Baseline Chatbot (LLM Only - Reactive Escalation)';
  }
}
