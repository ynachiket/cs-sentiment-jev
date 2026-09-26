import {
  SentimentAnalysis,
  ISentimentAnalyzer,
  ConversationContext,
  SentimentType,
  EmotionType,
  UrgencyLevel,
  RoutingAction
} from '../types';

interface LLMResponse {
  sentiment: SentimentType;
  confidence: number;
  emotions: EmotionType[];
  intensity: number;
  urgency: UrgencyLevel;
  requiresEscalation: boolean;
  routingAction: RoutingAction;
  reasoning: string;
}

export class LLMSentimentAnalyzer implements ISentimentAnalyzer {
  private apiKey: string;
  private model: string;
  private provider: 'openai' | 'anthropic';

  constructor(apiKey: string, provider: 'openai' | 'anthropic' = 'openai', model?: string) {
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = model || (provider === 'openai' ? 'gpt-4-turbo-preview' : 'claude-3-opus-20240229');
  }

  getName(): string {
    return `LLM (${this.provider} - ${this.model})`;
  }

  async analyze(message: string, context: ConversationContext): Promise<SentimentAnalysis> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(message, context);

    try {
      const response = await this.callLLM(prompt);
      const parsed = this.parseResponse(response);

      return {
        sentiment: parsed.sentiment,
        confidence: parsed.confidence,
        emotions: parsed.emotions,
        intensity: parsed.intensity,
        urgency: parsed.urgency,
        requiresEscalation: parsed.requiresEscalation,
        routingAction: parsed.routingAction,
        reasoning: parsed.reasoning
      };

    } catch (error) {
      console.error('LLM API error:', error);
      throw new Error(`LLM sentiment analysis failed: ${error}`);
    }
  }

  private buildPrompt(message: string, context: ConversationContext): string {
    const conversationHistory = context.messages.slice(-5)
      .map((m: { sender: string; content: string }) => `${m.sender}: ${m.content}`)
      .join('\n');

    const previousSentiments = context.sentimentHistory.slice(-3)
      .map((s: SentimentAnalysis) => `Sentiment: ${s.sentiment}, Intensity: ${s.intensity}, Confidence: ${s.confidence}`)
      .join('\n');

    return `You are a customer support sentiment analysis system. Analyze the following customer message and provide a detailed sentiment analysis.

CONVERSATION HISTORY:
${conversationHistory || 'No previous messages'}

PREVIOUS SENTIMENT ANALYSIS:
${previousSentiments || 'No previous analysis'}

CURRENT MESSAGE:
${message}

Analyze the message and provide your response in the following JSON format:
{
  "sentiment": "positive|negative|neutral|frustrated|angry",
  "confidence": 0.0-1.0,
  "emotions": ["emotion1", "emotion2"],
  "intensity": 0.0-1.0,
  "urgency": "low|medium|high|critical",
  "requiresEscalation": true|false,
  "routingAction": "continue_bot|escalate_human|priority_queue|supervisor_review",
  "reasoning": "Brief explanation of the analysis and any trends"
}

Available emotions: joy, sadness, anger, fear, surprise, frustration, confusion, satisfaction, disappointment

Consider:
1. The sentiment trend across the conversation (is it improving or degrading?)
2. Whether the customer needs immediate human assistance
3. The emotional intensity and urgency of their concerns
4. Any signs of escalating frustration

Respond ONLY with valid JSON, no additional text.`;
  }

  private async callLLM(prompt: string): Promise<string> {
    // NOTE: This is a mock implementation showing expected behavior
    // In production, this would make actual API calls to OpenAI or Anthropic
    
    /*
    // Actual OpenAI implementation:
    if (this.provider === 'openai') {
      const openai = new OpenAI({ apiKey: this.apiKey });
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });
      return completion.choices[0].message.content || '';
    }
    
    // Actual Anthropic implementation:
    if (this.provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: this.apiKey });
      const message = await anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content[0].text;
    }
    */

    // Mock implementation for demonstration
    return this.mockLLMResponse(prompt);
  }

  private mockLLMResponse(prompt: string): string {
    // Simulate LLM response time (3-10 seconds for realistic frontier model latency)
    // The actual delay is simulated in the test
    
    const message = prompt.split('CURRENT MESSAGE:')[1]?.trim().toLowerCase() || '';

    let sentiment: SentimentType = 'neutral';
    let emotions: EmotionType[] = ['satisfaction'];
    let intensity = 0.5;
    let urgency: UrgencyLevel = 'low';
    let requiresEscalation = false;
    let routingAction: RoutingAction = 'continue_bot';
    let reasoning = 'Customer message appears neutral with standard inquiry tone.';

    if (message.includes('angry') || message.includes('furious') || message.includes('unacceptable')) {
      sentiment = 'angry';
      emotions = ['anger', 'frustration'];
      intensity = 0.9;
      urgency = 'high';
      requiresEscalation = true;
      routingAction = 'escalate_human';
      reasoning = 'Customer is expressing strong anger and frustration. Immediate escalation recommended.';
    } else if (message.includes('frustrated') || message.includes('annoyed') || message.includes('ridiculous')) {
      sentiment = 'frustrated';
      emotions = ['frustration', 'disappointment'];
      intensity = 0.7;
      urgency = 'medium';
      routingAction = 'priority_queue';
      reasoning = 'Customer showing signs of frustration. Priority handling suggested.';
    } else if (message.includes('great') || message.includes('thank') || message.includes('perfect') || message.includes('excellent')) {
      sentiment = 'positive';
      emotions = ['joy', 'satisfaction'];
      intensity = 0.8;
      urgency = 'low';
      routingAction = 'continue_bot';
      reasoning = 'Customer expressing satisfaction and positive sentiment.';
    } else if (message.includes('terrible') || message.includes('worst') || message.includes('horrible')) {
      sentiment = 'negative';
      emotions = ['disappointment', 'sadness'];
      intensity = 0.8;
      urgency = 'high';
      routingAction = 'escalate_human';
      reasoning = 'Strong negative sentiment detected. Human intervention needed.';
    } else if (message.includes('confused') || message.includes("don't understand") || message.includes('unclear')) {
      sentiment = 'neutral';
      emotions = ['confusion'];
      intensity = 0.6;
      urgency = 'medium';
      routingAction = 'continue_bot';
      reasoning = 'Customer needs clarification but not showing negative sentiment.';
    }

    const response: LLMResponse = {
      sentiment,
      confidence: 0.80 + (Math.random() * 0.15),
      emotions,
      intensity,
      urgency,
      requiresEscalation,
      routingAction,
      reasoning
    };

    return JSON.stringify(response, null, 2);
  }

  private parseResponse(response: string): LLMResponse {
    try {
      // Extract JSON from response (LLMs sometimes add markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.sentiment || !parsed.routingAction) {
        throw new Error('Missing required fields in LLM response');
      }

      return parsed as LLMResponse;

    } catch (error) {
      console.error('Failed to parse LLM response:', response);
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
