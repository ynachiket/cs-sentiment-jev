export interface CustomerSupportMessage {
  id: string;
  content: string;
  timestamp: number;
  sender: 'customer' | 'agent' | 'system';
  sentiment?: SentimentAnalysis;
}

export interface CustomerSupportContext {
  conversationId: string;
  customerName?: string;
  issue?: string;
  messages: CustomerSupportMessage[];
  escalated: boolean;
  escalationReason?: string;
  escalationType?: 'explicit' | 'automatic' | 'manual';
  sentimentHistory: SentimentAnalysis[];
}

export interface ChatbotConfig {
  useSentimentAnalysis: boolean;
  llmModel: string;
  autoEscalateOnFrustration: boolean;
  frustrationThreshold: number; // 0-1 scale
}

export interface ChatbotResponse {
  message: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  sentiment?: SentimentAnalysis;
  responseTimeMs: number;
  sentimentAnalysisTimeMs?: number;
}

// Existing types
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
