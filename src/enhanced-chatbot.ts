import {
  CustomerSupportContext,
  CustomerSupportMessage,
  ChatbotResponse,
  ChatbotConfig,
  SentimentAnalysis
} from './support-types';
import { JevSentimentAnalyzer } from './analyzers/jev-analyzer';
import { ConversationContext } from './types';

/**
 * Enhanced Customer Support Chatbot - LLM + Jev
 * 
 * Behavior:
 * - Uses LLM (e.g., Claude Sonnet) for conversation
 * - Uses Jev for real-time sentiment analysis (186ms)
 * - Automatically escalates frustrated customers
 * - Proactive support - catches issues before customer asks
 */
export class EnhancedSupportChatbot {
  private config: ChatbotConfig;
  private conversations: Map<string, CustomerSupportContext>;
  private sentimentAnalyzer: JevSentimentAnalyzer;

  constructor(
    sentimentAnalyzer: JevSentimentAnalyzer,
    config?: Partial<ChatbotConfig>
  ) {
    this.sentimentAnalyzer = sentimentAnalyzer;
    this.config = {
      useSentimentAnalysis: true,
      llmModel: 'claude-sonnet-3.5',
      autoEscalateOnFrustration: true,
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

    // REAL-TIME SENTIMENT ANALYSIS with Jev (fast!)
    const sentimentStartTime = Date.now();
    const sentiment = await this.analyzeSentiment(customerMessage, context);
    const sentimentAnalysisTime = Date.now() - sentimentStartTime;

    // Store sentiment
    context.sentimentHistory.push(sentiment);
    message.sentiment = sentiment;

    // Check for explicit escalation requests
    const explicitEscalation = this.checkExplicitEscalation(customerMessage);

    // PROACTIVE ESCALATION based on sentiment
    const shouldAutoEscalate = this.shouldAutoEscalate(sentiment, context);

    if ((explicitEscalation || shouldAutoEscalate) && !context.escalated) {
      context.escalated = true;
      context.escalationType = explicitEscalation ? 'explicit' : 'automatic';
      
      if (shouldAutoEscalate) {
        context.escalationReason = `Automatic escalation: ${sentiment.sentiment} sentiment detected (${(sentiment.intensity * 100).toFixed(0)}% intensity, ${(sentiment.confidence * 100).toFixed(0)}% confidence)`;
      } else {
        context.escalationReason = 'Customer requested to speak with human agent';
      }

      const escalationMessage = this.generateEscalationMessage(sentiment, explicitEscalation);

      return {
        message: escalationMessage,
        shouldEscalate: true,
        escalationReason: context.escalationReason,
        sentiment,
        responseTimeMs: Date.now() - startTime,
        sentimentAnalysisTimeMs: sentimentAnalysisTime
      };
    }

    // If already escalated, inform customer
    if (context.escalated) {
      return {
        message: "A human agent will be with you shortly. I've flagged your conversation as priority.",
        shouldEscalate: false,
        sentiment,
        responseTimeMs: Date.now() - startTime,
        sentimentAnalysisTimeMs: sentimentAnalysisTime
      };
    }

    // Generate LLM response with sentiment-aware tone
    const llmResponse = await this.generateLLMResponse(customerMessage, context, sentiment);

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
      sentiment,
      responseTimeMs: Date.now() - startTime,
      sentimentAnalysisTimeMs: sentimentAnalysisTime
    };
  }

  private async analyzeSentiment(
    message: string,
    context: CustomerSupportContext
  ): Promise<SentimentAnalysis> {
    // Convert to format expected by sentiment analyzer
    const convContext: ConversationContext = {
      conversationId: context.conversationId,
      messages: context.messages.map(m => ({
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        sender: m.sender === 'customer' ? 'user' : 'bot'
      })),
      sentimentHistory: context.sentimentHistory,
      escalated: context.escalated,
      escalationReason: context.escalationReason
    };

    return await this.sentimentAnalyzer.analyze(message, convContext);
  }

  private shouldAutoEscalate(
    sentiment: SentimentAnalysis,
    context: CustomerSupportContext
  ): boolean {
    // Don't auto-escalate if already escalated
    if (context.escalated) {
      return false;
    }

    // Escalate if Jev recommends it
    if (sentiment.requiresEscalation) {
      return true;
    }

    // Escalate on angry sentiment
    if (sentiment.sentiment === 'angry') {
      return true;
    }

    // Escalate on high-intensity frustration
    if (sentiment.sentiment === 'frustrated' && sentiment.intensity >= this.config.frustrationThreshold) {
      return true;
    }

    // Escalate on critical urgency
    if (sentiment.urgency === 'critical') {
      return true;
    }

    // Check for sustained frustration across multiple turns
    if (context.sentimentHistory.length >= 3) {
      const recentSentiments = context.sentimentHistory.slice(-3);
      const frustratedCount = recentSentiments.filter(
        s => s.sentiment === 'frustrated' || s.sentiment === 'angry'
      ).length;
      
      if (frustratedCount >= 2) {
        return true;
      }
    }

    return false;
  }

  private generateEscalationMessage(
    sentiment: SentimentAnalysis,
    wasExplicit: boolean
  ): string {
    if (wasExplicit) {
      return "Of course! I'm connecting you with a human agent right now. They'll be able to help you better with this. One moment please...";
    }

    // Sentiment-aware escalation messages
    if (sentiment.sentiment === 'angry') {
      return "I sincerely apologize for this experience. I can see this is urgent and important. I'm connecting you with a senior agent immediately who can give this the attention it deserves.";
    }

    if (sentiment.sentiment === 'frustrated') {
      return "I understand your frustration, and I want to make sure you get the best help possible. Let me connect you with a human agent who can address this more effectively. They'll be with you right away.";
    }

    if (sentiment.urgency === 'critical') {
      return "I can see this is urgent. I'm escalating this to our priority support team immediately. A specialist will be with you in just a moment.";
    }

    return "I want to make sure you get the best possible help. Let me connect you with one of our agents who can assist you further.";
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
      'human agent',
      'real person',
      'speak with human',
      'talk with human',
      'connect me to',
      'transfer me to',
      'speak to manager',
      'talk to manager',
      'escalate'
    ];

    return escalationPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  private async generateLLMResponse(
    message: string,
    context: CustomerSupportContext,
    sentiment: SentimentAnalysis
  ): Promise<string> {
    // Simulate LLM call with sentiment-aware context
    // In production, this would include sentiment in the LLM prompt
    
    const lowerMessage = message.toLowerCase();

    // Simulate 3-5 second LLM response time (realistic for Claude/GPT)
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Adjust tone based on sentiment
    const empathyPrefix = this.getEmpathyPrefix(sentiment);

    if (lowerMessage.includes('order') || lowerMessage.includes('shipping')) {
      return `${empathyPrefix}I'd be happy to help you with your order! Could you please provide your order number so I can look up the details?`;
    }

    if (lowerMessage.includes('refund') || lowerMessage.includes('money back')) {
      return `${empathyPrefix}I understand you'd like a refund. Let me check our refund policy for your purchase. Could you tell me more about the issue you're experiencing?`;
    }

    if (lowerMessage.includes('not working') || lowerMessage.includes('broken') || lowerMessage.includes('issue')) {
      return `${empathyPrefix}I'm sorry you're experiencing an issue. Let me help you troubleshoot this right away. Can you describe what's happening in more detail?`;
    }

    if (lowerMessage.includes('waiting') || lowerMessage.includes('days') || lowerMessage.includes('weeks')) {
      return `${empathyPrefix}I sincerely apologize for the delay you've experienced. This isn't the service we aim to provide. Let me look into this for you immediately. Could you provide some more details?`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('question')) {
      return "I'm here to help! What can I assist you with today?";
    }

    return `${empathyPrefix}Thank you for reaching out. I'm here to assist you. Could you please provide more details about your concern?`;
  }

  private getEmpathyPrefix(sentiment: SentimentAnalysis): string {
    if (sentiment.sentiment === 'frustrated') {
      return "I understand your frustration. ";
    }
    if (sentiment.sentiment === 'angry') {
      return "I sincerely apologize for this experience. ";
    }
    if (sentiment.sentiment === 'negative') {
      return "I'm sorry to hear you're having this experience. ";
    }
    if (sentiment.emotions.includes('confusion')) {
      return "I can see this might be confusing. ";
    }
    return "";
  }

  getConversationContext(conversationId: string): CustomerSupportContext | undefined {
    return this.conversations.get(conversationId);
  }

  getName(): string {
    return 'Enhanced Chatbot (LLM + Jev - Proactive Escalation)';
  }
}
