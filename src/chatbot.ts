import {
  ConversationContext,
  Message,
  ISentimentAnalyzer,
  ChatbotResponse,
  SentimentAnalysis,
  RoutingAction
} from './types';

export class SentimentChatbot {
  private analyzer: ISentimentAnalyzer;
  private conversations: Map<string, ConversationContext>;

  constructor(analyzer: ISentimentAnalyzer) {
    this.analyzer = analyzer;
    this.conversations = new Map();
  }

  async processMessage(
    conversationId: string,
    userMessage: string
  ): Promise<ChatbotResponse> {
    const startTime = Date.now();

    // Get or create conversation context
    let context = this.conversations.get(conversationId);
    if (!context) {
      context = {
        conversationId,
        messages: [],
        sentimentHistory: [],
        escalated: false
      };
      this.conversations.set(conversationId, context);
    }

    // Add user message to context
    const message: Message = {
      id: `msg_${Date.now()}`,
      content: userMessage,
      timestamp: Date.now(),
      sender: 'user'
    };
    context.messages.push(message);

    // Analyze sentiment
    const analysisStartTime = Date.now();
    const sentiment = await this.analyzer.analyze(userMessage, context);
    const analysisTime = Date.now() - analysisStartTime;

    // Update context with sentiment
    context.sentimentHistory.push(sentiment);
    context.currentSentiment = sentiment;

    // Make routing decision
    const routingDecision = this.makeRoutingDecision(sentiment, context);

    // Update escalation status
    if (routingDecision.action === 'escalate_human' || routingDecision.action === 'supervisor_review') {
      context.escalated = true;
      context.escalationReason = routingDecision.reason;
    }

    // Generate bot response based on sentiment and routing
    const botMessage = this.generateResponse(sentiment, routingDecision, context);

    // Add bot message to context
    const botMessageObj: Message = {
      id: `msg_${Date.now()}_bot`,
      content: botMessage,
      timestamp: Date.now(),
      sender: 'bot'
    };
    context.messages.push(botMessageObj);

    const totalTime = Date.now() - startTime;

    return {
      message: botMessage,
      sentiment,
      routingDecision,
      latencyMs: totalTime
    };
  }

  private makeRoutingDecision(
    sentiment: SentimentAnalysis,
    context: ConversationContext
  ): { action: RoutingAction; reason: string } {
    // If already escalated, keep escalated
    if (context.escalated) {
      return {
        action: 'escalate_human',
        reason: 'Conversation already escalated to human agent'
      };
    }

    // Use sentiment analysis to determine routing
    if (sentiment.requiresEscalation) {
      return {
        action: sentiment.routingAction,
        reason: sentiment.reasoning || 'Sentiment analysis indicates escalation needed'
      };
    }

    // Check for sentiment degradation over time
    if (context.sentimentHistory.length >= 3) {
      const recentSentiments = context.sentimentHistory.slice(-3);
      const avgIntensity = recentSentiments.reduce((sum, s) => sum + s.intensity, 0) / 3;
      
      const negativeCount = recentSentiments.filter(
        s => s.sentiment === 'negative' || s.sentiment === 'frustrated' || s.sentiment === 'angry'
      ).length;

      if (negativeCount >= 2 && avgIntensity > 0.6) {
        return {
          action: 'priority_queue',
          reason: 'Sustained negative sentiment detected across multiple turns'
        };
      }
    }

    // Check urgency level
    if (sentiment.urgency === 'critical' || sentiment.urgency === 'high') {
      return {
        action: sentiment.intensity > 0.7 ? 'escalate_human' : 'priority_queue',
        reason: `High urgency (${sentiment.urgency}) with ${(sentiment.intensity * 100).toFixed(0)}% intensity`
      };
    }

    return {
      action: 'continue_bot',
      reason: 'Sentiment within normal parameters, bot can continue'
    };
  }

  private generateResponse(
    sentiment: SentimentAnalysis,
    routing: { action: RoutingAction; reason: string },
    context: ConversationContext
  ): string {
    // Generate empathetic response based on sentiment
    switch (routing.action) {
      case 'escalate_human':
        return this.generateEscalationResponse(sentiment);
      
      case 'priority_queue':
        return this.generatePriorityResponse(sentiment);
      
      case 'supervisor_review':
        return this.generateSupervisorResponse(sentiment);
      
      case 'continue_bot':
      default:
        return this.generateContinueResponse(sentiment);
    }
  }

  private generateEscalationResponse(sentiment: SentimentAnalysis): string {
    const empathy = this.getEmpathyPhrase(sentiment);
    return `${empathy} I can see this situation requires immediate attention. I'm connecting you with a human agent right now who can better assist you. They'll be with you in just a moment.`;
  }

  private generatePriorityResponse(sentiment: SentimentAnalysis): string {
    const empathy = this.getEmpathyPhrase(sentiment);
    return `${empathy} I've flagged your case as priority and our team will address this shortly. In the meantime, let me see what I can help you with.`;
  }

  private generateSupervisorResponse(sentiment: SentimentAnalysis): string {
    return `I understand this is a complex situation. I'm escalating this to a supervisor who specializes in these cases. They will reach out to you within the next hour.`;
  }

  private generateContinueResponse(sentiment: SentimentAnalysis): string {
    if (sentiment.sentiment === 'positive') {
      return `I'm glad I could help! Is there anything else you'd like assistance with?`;
    } else if (sentiment.emotions.includes('confusion')) {
      return `I understand this might be confusing. Let me clarify that for you. Could you tell me specifically which part needs more explanation?`;
    } else {
      return `I'm here to help. Could you provide more details about your situation?`;
    }
  }

  private getEmpathyPhrase(sentiment: SentimentAnalysis): string {
    if (sentiment.sentiment === 'angry') {
      return `I sincerely apologize for your experience.`;
    } else if (sentiment.sentiment === 'frustrated') {
      return `I understand your frustration, and I'm sorry for the inconvenience.`;
    } else if (sentiment.sentiment === 'negative') {
      return `I'm sorry to hear you're having this experience.`;
    } else if (sentiment.emotions.includes('disappointment')) {
      return `I understand this isn't what you expected.`;
    }
    return `Thank you for reaching out.`;
  }

  getConversationContext(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  getAnalyzerName(): string {
    return this.analyzer.getName();
  }
}
