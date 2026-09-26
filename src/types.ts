export type SentimentType = 'positive' | 'negative' | 'neutral' | 'frustrated' | 'angry';

export type EmotionType = 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' 
  | 'frustration' | 'confusion' | 'satisfaction' | 'disappointment';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type RoutingAction = 
  | 'continue_bot' 
  | 'escalate_human' 
  | 'priority_queue' 
  | 'supervisor_review';

export interface SentimentAnalysis {
  sentiment: SentimentType;
  confidence: number;
  emotions: EmotionType[];
  intensity: number;
  urgency: UrgencyLevel;
  requiresEscalation: boolean;
  routingAction: RoutingAction;
  reasoning?: string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: number;
  sender: 'user' | 'bot';
}

export interface ConversationContext {
  conversationId: string;
  messages: Message[];
  sentimentHistory: SentimentAnalysis[];
  currentSentiment?: SentimentAnalysis;
  escalated: boolean;
  escalationReason?: string;
}

export interface LatencyMetrics {
  analysisTimeMs: number;
  totalResponseTimeMs: number;
  turnNumber: number;
  method: 'jev' | 'llm';
}

export interface ISentimentAnalyzer {
  analyze(message: string, context: ConversationContext): Promise<SentimentAnalysis>;
  getName(): string;
}

export interface ChatbotResponse {
  message: string;
  sentiment: SentimentAnalysis;
  routingDecision: {
    action: RoutingAction;
    reason: string;
  };
  latencyMs: number;
}
