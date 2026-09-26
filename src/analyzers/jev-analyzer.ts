import {
  SentimentAnalysis,
  ISentimentAnalyzer,
  ConversationContext,
  SentimentType,
  EmotionType,
  UrgencyLevel,
  RoutingAction
} from '../types';

interface JevQuery {
  model: string;
  state: Record<string, any>;
  questions: Record<string, JevQuestion>;
}

interface JevQuestion {
  type: 'choice' | 'score' | 'noul';
  instructions: string;
  criteria: Record<string, string> | string[];
}

interface JevAnswer {
  type: string;
  choice?: string;
  score?: number;
  noul?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
}

interface JevResponse {
  id: string;
  model: string;
  provider: string;
  answers: Record<string, JevAnswer>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
}

export class JevSentimentAnalyzer implements ISentimentAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private useMock: boolean;

  constructor(apiKey: string, baseUrl: string = 'https://openrouter.ai/api/alpha/decisions', useMock: boolean = false) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = 'typesafe/jev-1.13';
    this.useMock = useMock;
  }

  getName(): string {
    return 'Jev (System One Model)';
  }

  async analyze(message: string, context: ConversationContext): Promise<SentimentAnalysis> {
    const startTime = Date.now();

    // Build the state object with conversation context
    const state = this.buildState(message, context);

    // Define all questions in parallel - Jev processes these simultaneously
    const query: JevQuery = {
      model: this.model,
      state,
      questions: {
        sentiment: {
          type: 'choice',
          instructions: 'What is the overall sentiment of the customer message?',
          criteria: {
            positive: 'Customer expresses satisfaction, gratitude, or positive feelings',
            negative: 'Customer expresses dissatisfaction or disappointment without strong emotion',
            neutral: 'Customer is asking questions or providing information without emotion',
            frustrated: 'Customer shows moderate frustration or annoyance',
            angry: 'Customer expresses strong anger, fury, or demands immediate action'
          }
        },
        primaryEmotion: {
          type: 'choice',
          instructions: 'What is the primary emotion detected in the message?',
          criteria: {
            joy: 'Happiness, satisfaction, or positive excitement',
            sadness: 'Disappointment or unhappiness',
            anger: 'Strong negative emotion, fury, or outrage',
            fear: 'Worry or concern about outcomes',
            surprise: 'Unexpected reaction',
            frustration: 'Moderate annoyance or impatience',
            confusion: 'Uncertainty or lack of understanding',
            satisfaction: 'Content or pleased with service',
            disappointment: 'Let down or dissatisfied'
          }
        },
        intensity: {
          type: 'score',
          instructions: 'How intense is the emotional content of the message?',
          criteria: [
            'Very low emotional intensity - neutral or calm',
            'Low intensity - mild emotion',
            'Moderate intensity - noticeable emotion',
            'High intensity - strong emotion',
            'Very high intensity - extreme emotion'
          ]
        },
        urgency: {
          type: 'choice',
          instructions: 'How urgent is the customer issue?',
          criteria: {
            low: 'Can be handled in normal queue, no time pressure',
            medium: 'Should be addressed soon but not critical',
            high: 'Needs prompt attention, customer is waiting',
            critical: 'Requires immediate action, business-critical or very upset customer'
          }
        },
        requiresEscalation: {
          type: 'noul',
          instructions: 'Should this conversation be escalated to a human agent?',
          criteria: {
            true: 'Customer is very frustrated, angry, has critical issue, or bot cannot help',
            false: 'Bot can continue to assist, sentiment is manageable'
          }
        },
        routingAction: {
          type: 'choice',
          instructions: 'What routing action should be taken?',
          criteria: {
            continue_bot: 'Bot can handle this, sentiment is positive or neutral',
            escalate_human: 'Immediate escalation needed due to anger or critical issue',
            priority_queue: 'Moderate frustration, priority handling but bot can try',
            supervisor_review: 'Complex issue requiring management attention'
          }
        }
      }
    };

    try {
      // Make API call to Jev
      const response = await this.callJevApi(query);

      // Extract structured results
      const sentiment = response.answers.sentiment.choice as SentimentType;
      const primaryEmotion = response.answers.primaryEmotion.choice as EmotionType;
      const emotions: EmotionType[] = [primaryEmotion];

      // Convert intensity score (0-4 scale) to 0-1 scale
      const intensityScore = response.answers.intensity.score || 0;
      const intensity = intensityScore / 4;

      const analysis: SentimentAnalysis = {
        sentiment,
        confidence: response.answers.sentiment.confidence || 0.85,
        emotions,
        intensity,
        urgency: response.answers.urgency.choice as UrgencyLevel,
        requiresEscalation: (response.answers.requiresEscalation.noul || 0) > 0.5,
        routingAction: response.answers.routingAction.choice as RoutingAction,
        reasoning: `Jev analysis (${(Date.now() - startTime)}ms): ${sentiment} sentiment, ${(response.answers.sentiment.confidence || 0).toFixed(2)} confidence`
      };

      return analysis;

    } catch (error) {
      console.error('Jev API error:', error);
      throw new Error(`Jev sentiment analysis failed: ${error}`);
    }
  }

  private buildState(message: string, context: ConversationContext): Record<string, any> {
    return {
      current_message: message,
      conversation_history: context.messages.slice(-5).map((m: { sender: string; content: string }) => ({
        sender: m.sender,
        content: m.content
      })),
      previous_sentiments: context.sentimentHistory.slice(-3).map((s: SentimentAnalysis) => ({
        sentiment: s.sentiment,
        intensity: s.intensity,
        confidence: s.confidence
      })),
      turn_count: context.messages.length,
      already_escalated: context.escalated
    };
  }

  private async callJevApi(query: JevQuery): Promise<JevResponse> {
    // Use mock for tests, real API for production
    if (this.useMock) {
      return this.mockJevResponse(query);
    }

    // Real API call to OpenRouter
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jev API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result as JevResponse;

    } catch (error) {
      console.error('Failed to call Jev API:', error);
      throw error;
    }
  }

  private mockJevResponse(query: JevQuery): JevResponse {
    // Simulate Jev's fast response (70-500ms range, let's use 150ms average)
    const message = query.state.current_message?.toLowerCase() || '';

    // Determine sentiment based on message content
    let sentiment: SentimentType = 'neutral';
    let primaryEmotion: EmotionType = 'satisfaction';
    let intensityScore = 2; // 0-4 scale
    let urgency: UrgencyLevel = 'low';
    let requiresEscalation = 0.1; // noul probability
    let routingAction: RoutingAction = 'continue_bot';

    // Analyze message content
    if (message.includes('angry') || message.includes('furious') || message.includes('unacceptable')) {
      sentiment = 'angry';
      primaryEmotion = 'anger';
      intensityScore = 4;
      urgency = 'high';
      requiresEscalation = 0.95;
      routingAction = 'escalate_human';
    } else if (message.includes('frustrated') || message.includes('annoyed') || message.includes('ridiculous')) {
      sentiment = 'frustrated';
      primaryEmotion = 'frustration';
      intensityScore = 3;
      urgency = 'medium';
      requiresEscalation = 0.3;
      routingAction = 'priority_queue';
    } else if (message.includes('great') || message.includes('thank') || message.includes('perfect') || message.includes('excellent')) {
      sentiment = 'positive';
      primaryEmotion = 'joy';
      intensityScore = 3;
      urgency = 'low';
      requiresEscalation = 0.05;
      routingAction = 'continue_bot';
    } else if (message.includes('terrible') || message.includes('worst') || message.includes('horrible')) {
      sentiment = 'negative';
      primaryEmotion = 'disappointment';
      intensityScore = 3;
      urgency = 'high';
      requiresEscalation = 0.8;
      routingAction = 'escalate_human';
    } else if (message.includes('confused') || message.includes("don't understand") || message.includes('unclear')) {
      sentiment = 'neutral';
      primaryEmotion = 'confusion';
      intensityScore = 2;
      urgency = 'medium';
      requiresEscalation = 0.15;
      routingAction = 'continue_bot';
    }

    // Simulate Jev's calibrated confidence scores
    const confidence = 0.85 + (Math.random() * 0.1);

    return {
      id: `gen-dec-${Date.now()}-mock`,
      model: 'typesafe/jev-1.13-mock',
      provider: 'Mock',
      answers: {
        sentiment: {
          type: 'choice',
          choice: sentiment,
          confidence,
          probabilities: { [sentiment]: confidence }
        },
        primaryEmotion: {
          type: 'choice',
          choice: primaryEmotion,
          confidence,
          probabilities: { [primaryEmotion]: confidence }
        },
        intensity: {
          type: 'score',
          score: intensityScore,
          confidence,
          probabilities: { [intensityScore]: confidence }
        },
        urgency: {
          type: 'choice',
          choice: urgency,
          confidence,
          probabilities: { [urgency]: confidence }
        },
        requiresEscalation: {
          type: 'noul',
          noul: requiresEscalation,
          confidence
        },
        routingAction: {
          type: 'choice',
          choice: routingAction,
          confidence,
          probabilities: { [routingAction]: confidence }
        }
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cost: 0.0000042
      }
    };
  }
}
