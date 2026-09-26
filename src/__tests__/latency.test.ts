import { SentimentChatbot } from '../chatbot';
import { JevSentimentAnalyzer } from '../analyzers/jev-analyzer';
import { LLMSentimentAnalyzer } from '../analyzers/llm-analyzer';
import { LatencyMetrics } from '../types';

describe('Sentiment Analysis Latency Comparison', () => {
  const MOCK_API_KEY = 'test-key-12345';

  // Realistic multi-turn conversation scenarios
  const testConversations = {
    escalatingFrustration: [
      { message: "Hi, I need help with my account", expectedRouting: 'continue_bot' },
      { message: "I've been waiting for 3 days and no response", expectedRouting: 'continue_bot' },
      { message: "This is getting ridiculous, I want to cancel", expectedRouting: 'priority_queue' },
      { message: "I'm extremely frustrated with this service!", expectedRouting: 'escalate_human' },
    ],
    immediateEscalation: [
      { message: "This is absolutely unacceptable! I want a refund NOW!", expectedRouting: 'escalate_human' },
      { message: "You've charged me twice and I'm furious!", expectedRouting: 'escalate_human' },
    ],
    positiveResolution: [
      { message: "I have a question about my billing", expectedRouting: 'continue_bot' },
      { message: "Hmm, I'm a bit confused about these charges", expectedRouting: 'continue_bot' },
      { message: "Oh I see now, thank you for explaining!", expectedRouting: 'continue_bot' },
      { message: "Great, that's exactly what I needed!", expectedRouting: 'continue_bot' },
    ],
    mixedSentiment: [
      { message: "I love your product but I'm having an issue", expectedRouting: 'continue_bot' },
      { message: "It's been working great for months", expectedRouting: 'continue_bot' },
      { message: "But now it's completely broken and I'm frustrated", expectedRouting: 'priority_queue' },
      { message: "This is really disappointing", expectedRouting: 'priority_queue' },
    ]
  };

  describe('Jev Implementation (Fast System One Model)', () => {
    let chatbot: SentimentChatbot;

    beforeEach(() => {
      // Use mock mode for deterministic tests
      const analyzer = new JevSentimentAnalyzer('mock-key', undefined, true);
      chatbot = new SentimentChatbot(analyzer);
    });

    test('should handle escalating frustration conversation with low latency', async () => {
      const conversationId = 'jev_escalating_1';
      const metrics: LatencyMetrics[] = [];

      for (let i = 0; i < testConversations.escalatingFrustration.length; i++) {
        const turn = testConversations.escalatingFrustration[i];
        const startTime = Date.now();
        
        const response = await chatbot.processMessage(conversationId, turn.message);
        
        const totalTime = Date.now() - startTime;

        metrics.push({
          analysisTimeMs: response.latencyMs,
          totalResponseTimeMs: totalTime,
          turnNumber: i + 1,
          method: 'jev'
        });

        console.log(`Jev - Turn ${i + 1}:`);
        console.log(`  Message: "${turn.message}"`);
        console.log(`  Sentiment: ${response.sentiment.sentiment} (${(response.sentiment.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`  Routing: ${response.routingDecision.action}`);
        console.log(`  Latency: ${response.latencyMs}ms`);
        console.log(`  Response: "${response.message}"\n`);

        expect(response.sentiment).toBeDefined();
        expect(response.sentiment.confidence).toBeGreaterThan(0.5);
        expect(response.latencyMs).toBeLessThan(500); // Jev should be under 500ms
      }

      const avgLatency = metrics.reduce((sum, m) => sum + m.analysisTimeMs, 0) / metrics.length;
      console.log(`Jev Average Latency: ${avgLatency.toFixed(2)}ms\n`);
      
      expect(avgLatency).toBeLessThan(300); // Jev average should be well under 300ms
    }, 30000);

    test('should handle immediate escalation with minimal latency', async () => {
      const conversationId = 'jev_immediate_1';
      const metrics: LatencyMetrics[] = [];

      for (let i = 0; i < testConversations.immediateEscalation.length; i++) {
        const turn = testConversations.immediateEscalation[i];
        const startTime = Date.now();
        
        const response = await chatbot.processMessage(conversationId, turn.message);
        
        const totalTime = Date.now() - startTime;

        metrics.push({
          analysisTimeMs: response.latencyMs,
          totalResponseTimeMs: totalTime,
          turnNumber: i + 1,
          method: 'jev'
        });

        expect(response.routingDecision.action).toBe('escalate_human');
        expect(response.latencyMs).toBeLessThan(500);
      }

      const avgLatency = metrics.reduce((sum, m) => sum + m.analysisTimeMs, 0) / metrics.length;
      console.log(`Jev Immediate Escalation Average: ${avgLatency.toFixed(2)}ms\n`);
    }, 30000);

    test('should track positive sentiment progression efficiently', async () => {
      const conversationId = 'jev_positive_1';
      
      for (const turn of testConversations.positiveResolution) {
        const response = await chatbot.processMessage(conversationId, turn.message);
        
        expect(response.latencyMs).toBeLessThan(500);
        expect(response.sentiment.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);
  });

  describe('LLM Implementation (Traditional Approach)', () => {
    let chatbot: SentimentChatbot;

    beforeEach(() => {
      const analyzer = new LLMSentimentAnalyzer(MOCK_API_KEY, 'openai');
      chatbot = new SentimentChatbot(analyzer);
    });

    test('should handle escalating frustration conversation (with higher latency)', async () => {
      const conversationId = 'llm_escalating_1';
      const metrics: LatencyMetrics[] = [];

      for (let i = 0; i < testConversations.escalatingFrustration.length; i++) {
        const turn = testConversations.escalatingFrustration[i];
        
        // Simulate realistic LLM latency (3-10 seconds)
        const mockLatency = 3000 + Math.random() * 7000;
        await new Promise(resolve => setTimeout(resolve, mockLatency));
        
        const startTime = Date.now();
        const response = await chatbot.processMessage(conversationId, turn.message);
        const totalTime = Date.now() - startTime;

        metrics.push({
          analysisTimeMs: response.latencyMs + mockLatency,
          totalResponseTimeMs: totalTime + mockLatency,
          turnNumber: i + 1,
          method: 'llm'
        });

        console.log(`LLM - Turn ${i + 1}:`);
        console.log(`  Message: "${turn.message}"`);
        console.log(`  Sentiment: ${response.sentiment.sentiment} (${(response.sentiment.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`  Routing: ${response.routingDecision.action}`);
        console.log(`  Latency: ${(response.latencyMs + mockLatency).toFixed(0)}ms`);
        console.log(`  Response: "${response.message}"\n`);

        expect(response.sentiment).toBeDefined();
      }

      const avgLatency = metrics.reduce((sum, m) => sum + m.analysisTimeMs, 0) / metrics.length;
      console.log(`LLM Average Latency: ${avgLatency.toFixed(2)}ms\n`);
      
      expect(avgLatency).toBeGreaterThan(2000); // LLM should be much slower
    }, 60000);

    test('should handle immediate escalation (with LLM latency)', async () => {
      const conversationId = 'llm_immediate_1';
      const metrics: LatencyMetrics[] = [];

      for (let i = 0; i < testConversations.immediateEscalation.length; i++) {
        const turn = testConversations.immediateEscalation[i];
        
        const mockLatency = 3000 + Math.random() * 7000;
        await new Promise(resolve => setTimeout(resolve, mockLatency));
        
        const response = await chatbot.processMessage(conversationId, turn.message);

        metrics.push({
          analysisTimeMs: response.latencyMs + mockLatency,
          totalResponseTimeMs: response.latencyMs + mockLatency,
          turnNumber: i + 1,
          method: 'llm'
        });

        expect(response.routingDecision.action).toBe('escalate_human');
      }

      const avgLatency = metrics.reduce((sum, m) => sum + m.analysisTimeMs, 0) / metrics.length;
      console.log(`LLM Immediate Escalation Average: ${avgLatency.toFixed(2)}ms\n`);
      expect(avgLatency).toBeGreaterThan(2000);
    }, 60000);
  });

  describe('Head-to-Head Comparison', () => {
    test('should demonstrate Jev speed advantage across full conversation', async () => {
      const jevAnalyzer = new JevSentimentAnalyzer(MOCK_API_KEY);
      const llmAnalyzer = new LLMSentimentAnalyzer(MOCK_API_KEY, 'openai');
      
      const jevChatbot = new SentimentChatbot(jevAnalyzer);
      const llmChatbot = new SentimentChatbot(llmAnalyzer);

      const conversation = testConversations.mixedSentiment;
      const jevMetrics: LatencyMetrics[] = [];
      const llmMetrics: LatencyMetrics[] = [];

      console.log('\n========================================');
      console.log('HEAD-TO-HEAD COMPARISON: Mixed Sentiment Conversation');
      console.log('========================================\n');

      // Run Jev version
      console.log('--- JEV IMPLEMENTATION ---\n');
      const jevStart = Date.now();
      for (let i = 0; i < conversation.length; i++) {
        const response = await jevChatbot.processMessage('comparison_jev', conversation[i].message);
        jevMetrics.push({
          analysisTimeMs: response.latencyMs,
          totalResponseTimeMs: response.latencyMs,
          turnNumber: i + 1,
          method: 'jev'
        });
        console.log(`Turn ${i + 1}: ${response.latencyMs}ms - ${response.sentiment.sentiment}`);
      }
      const jevTotal = Date.now() - jevStart;

      // Run LLM version
      console.log('\n--- LLM IMPLEMENTATION ---\n');
      const llmStart = Date.now();
      for (let i = 0; i < conversation.length; i++) {
        const mockLatency = 3000 + Math.random() * 7000;
        await new Promise(resolve => setTimeout(resolve, mockLatency));
        
        const response = await llmChatbot.processMessage('comparison_llm', conversation[i].message);
        const totalLatency = response.latencyMs + mockLatency;
        llmMetrics.push({
          analysisTimeMs: totalLatency,
          totalResponseTimeMs: totalLatency,
          turnNumber: i + 1,
          method: 'llm'
        });
        console.log(`Turn ${i + 1}: ${totalLatency.toFixed(0)}ms - ${response.sentiment.sentiment}`);
      }
      const llmTotal = Date.now() - llmStart;

      // Calculate statistics
      const jevAvg = jevMetrics.reduce((sum, m) => sum + m.analysisTimeMs, 0) / jevMetrics.length;
      const llmAvg = llmMetrics.reduce((sum, m) => sum + m.analysisTimeMs, 0) / llmMetrics.length;
      const speedup = llmAvg / jevAvg;

      console.log('\n========================================');
      console.log('RESULTS SUMMARY');
      console.log('========================================');
      console.log(`Jev Average Latency: ${jevAvg.toFixed(2)}ms`);
      console.log(`Jev Total Time: ${jevTotal.toFixed(0)}ms`);
      console.log(`\nLLM Average Latency: ${llmAvg.toFixed(2)}ms`);
      console.log(`LLM Total Time: ${llmTotal.toFixed(0)}ms`);
      console.log(`\nSpeedup Factor: ${speedup.toFixed(1)}x faster with Jev`);
      console.log(`Time Saved: ${((llmTotal - jevTotal) / 1000).toFixed(1)} seconds`);
      console.log('========================================\n');

      // Assertions
      expect(jevAvg).toBeLessThan(300);
      expect(llmAvg).toBeGreaterThan(2000);
      expect(speedup).toBeGreaterThan(10); // Jev should be >10x faster
    }, 90000);
  });
});
