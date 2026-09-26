import { BaselineSupportChatbot } from '../baseline-chatbot';
import { EnhancedSupportChatbot } from '../enhanced-chatbot';
import { JevSentimentAnalyzer } from '../analyzers/jev-analyzer';

describe('Customer Support: Baseline vs Enhanced (Real Use Case)', () => {
  const MOCK_API_KEY = 'mock-key';

  // Realistic customer support scenarios
  const scenarios = {
    frustratedCustomer: [
      { message: "Hi, I need help with my order", expectEscalation: false },
      { message: "I ordered this 5 days ago and still no update", expectEscalation: false },
      { message: "This is ridiculous! I paid for express shipping!", expectEscalation: true }, // Enhanced escalates here
      { message: "I want to speak to a manager NOW!", expectEscalation: true } // Baseline escalates here
    ],
    angryCustomer: [
      { message: "This is absolutely unacceptable!", expectEscalation: true }, // Both should escalate
      { message: "I've been charged twice for the same order!", expectEscalation: true }
    ],
    patientCustomer: [
      { message: "Hello, I have a question about my account", expectEscalation: false },
      { message: "I'm trying to update my payment method", expectEscalation: false },
      { message: "Can you help me with this?", expectEscalation: false }
    ],
    explicitRequest: [
      { message: "Hi there", expectEscalation: false },
      { message: "Can I speak to a human agent please?", expectEscalation: true } // Both escalate
    ]
  };

  describe('Baseline Chatbot (LLM Only - Reactive)', () => {
    let chatbot: BaselineSupportChatbot;

    beforeEach(() => {
      chatbot = new BaselineSupportChatbot();
    });

    test('should NOT escalate frustrated customer until they explicitly ask', async () => {
      const conversationId = 'baseline_frustrated_1';
      console.log('\n========================================');
      console.log('BASELINE: Frustrated Customer Scenario');
      console.log('========================================\n');

      for (let i = 0; i < scenarios.frustratedCustomer.length; i++) {
        const turn = scenarios.frustratedCustomer[i];
        console.log(`Turn ${i + 1}: "${turn.message}"`);

        const response = await chatbot.processMessage(conversationId, turn.message);

        console.log(`  Escalated: ${response.shouldEscalate ? '🚨 YES' : '❌ NO'}`);
        console.log(`  Response: "${response.message}"`);
        console.log(`  Time: ${response.responseTimeMs}ms\n`);

        if (i < 3) {
          // First 3 messages should NOT escalate (even though customer is frustrated)
          expect(response.shouldEscalate).toBe(false);
        } else {
          // Only 4th message with explicit request escalates
          expect(response.shouldEscalate).toBe(true);
          expect(response.escalationReason).toContain('requested');
        }
      }

      console.log('❌ PROBLEM: Customer was frustrated for 2 turns before asking for help');
      console.log('   Poor experience - reactive support only\n');
    }, 30000);

    test('should escalate angry customer only on explicit request', async () => {
      const conversationId = 'baseline_angry_1';
      console.log('\n========================================');
      console.log('BASELINE: Angry Customer Scenario');
      console.log('========================================\n');

      const response1 = await chatbot.processMessage(conversationId, scenarios.angryCustomer[0].message);
      console.log(`Turn 1: "${scenarios.angryCustomer[0].message}"`);
      console.log(`  Escalated: ${response1.shouldEscalate ? '🚨 YES' : '❌ NO'}`);
      console.log(`  Response: "${response1.message}"\n`);

      // Baseline doesn't detect anger, keeps trying to help
      expect(response1.shouldEscalate).toBe(false);

      console.log('❌ PROBLEM: Angry customer not escalated automatically');
      console.log('   Customer must explicitly ask or stay angry\n');
    }, 30000);

    test('should handle explicit escalation request', async () => {
      const conversationId = 'baseline_explicit_1';
      console.log('\n========================================');
      console.log('BASELINE: Explicit Request Scenario');
      console.log('========================================\n');

      for (const turn of scenarios.explicitRequest) {
        const response = await chatbot.processMessage(conversationId, turn.message);
        console.log(`Message: "${turn.message}"`);
        console.log(`  Escalated: ${response.shouldEscalate ? '🚨 YES' : '❌ NO'}\n`);

        if (turn.expectEscalation) {
          expect(response.shouldEscalate).toBe(true);
        }
      }

      console.log('✅ This works fine - explicit requests handled\n');
    }, 30000);
  });

  describe('Enhanced Chatbot (LLM + Jev - Proactive)', () => {
    let chatbot: EnhancedSupportChatbot;

    beforeEach(() => {
      const analyzer = new JevSentimentAnalyzer(MOCK_API_KEY, undefined, true);
      chatbot = new EnhancedSupportChatbot(analyzer);
    });

    test('should AUTOMATICALLY escalate frustrated customer (proactive)', async () => {
      const conversationId = 'enhanced_frustrated_1';
      console.log('\n========================================');
      console.log('ENHANCED: Frustrated Customer Scenario');
      console.log('========================================\n');

      for (let i = 0; i < scenarios.frustratedCustomer.length; i++) {
        const turn = scenarios.frustratedCustomer[i];
        console.log(`Turn ${i + 1}: "${turn.message}"`);

        const response = await chatbot.processMessage(conversationId, turn.message);

        console.log(`  Sentiment: ${response.sentiment?.sentiment} (${(response.sentiment!.confidence * 100).toFixed(0)}% confidence)`);
        console.log(`  Intensity: ${(response.sentiment!.intensity * 100).toFixed(0)}%`);
        console.log(`  Escalated: ${response.shouldEscalate ? '🚨 YES' : '❌ NO'}`);
        if (response.escalationReason) {
          console.log(`  Reason: ${response.escalationReason}`);
        }
        console.log(`  Sentiment Analysis: ${response.sentimentAnalysisTimeMs}ms`);
        console.log(`  Total Time: ${response.responseTimeMs}ms`);
        console.log(`  Response: "${response.message}"\n`);

        if (i === 2) {
          // 3rd message should trigger automatic escalation (frustrated + high intensity)
          expect(response.shouldEscalate).toBe(true);
          expect(response.escalationReason).toContain('Automatic');
          console.log('✅ PROACTIVE: Customer escalated at turn 3 (before they asked!)');
        }
      }

      console.log('✅ ADVANTAGE: Caught frustration 1 turn earlier than baseline');
      console.log('   Better customer experience - proactive support\n');
    }, 30000);

    test('should IMMEDIATELY escalate angry customer (automatic)', async () => {
      const conversationId = 'enhanced_angry_1';
      console.log('\n========================================');
      console.log('ENHANCED: Angry Customer Scenario');
      console.log('========================================\n');

      const response1 = await chatbot.processMessage(conversationId, scenarios.angryCustomer[0].message);
      console.log(`Turn 1: "${scenarios.angryCustomer[0].message}"`);
      console.log(`  Sentiment: ${response1.sentiment?.sentiment} (${(response1.sentiment!.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`  Escalated: ${response1.shouldEscalate ? '🚨 YES' : '❌ NO'}`);
      console.log(`  Reason: ${response1.escalationReason}`);
      console.log(`  Response: "${response1.message}"\n`);

      // Enhanced should immediately escalate angry customer
      expect(response1.shouldEscalate).toBe(true);
      expect(response1.escalationReason).toContain('Automatic');

      console.log('✅ ADVANTAGE: Angry customer escalated immediately');
      console.log('   No wasted time - instant priority handling\n');
    }, 30000);

    test('should NOT over-escalate patient customers', async () => {
      const conversationId = 'enhanced_patient_1';
      console.log('\n========================================');
      console.log('ENHANCED: Patient Customer Scenario');
      console.log('========================================\n');

      for (const turn of scenarios.patientCustomer) {
        const response = await chatbot.processMessage(conversationId, turn.message);
        console.log(`Message: "${turn.message}"`);
        console.log(`  Sentiment: ${response.sentiment?.sentiment}`);
        console.log(`  Escalated: ${response.shouldEscalate ? '🚨 YES' : '✅ NO'}\n`);

        expect(response.shouldEscalate).toBe(false);
      }

      console.log('✅ SMART: Normal conversations not over-escalated');
      console.log('   Jev only escalates when needed\n');
    }, 30000);
  });

  describe('Head-to-Head Comparison: Baseline vs Enhanced', () => {
    test('should demonstrate value of proactive escalation', async () => {
      const baselineChatbot = new BaselineSupportChatbot();
      const analyzer = new JevSentimentAnalyzer(MOCK_API_KEY, undefined, true);
      const enhancedChatbot = new EnhancedSupportChatbot(analyzer);

      console.log('\n╔════════════════════════════════════════════════════════════════════╗');
      console.log('║              BASELINE vs ENHANCED: Side-by-Side                   ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');

      console.log('Scenario: Frustrated customer escalation\n');

      let baselineEscalatedAt = -1;
      let enhancedEscalatedAt = -1;

      for (let i = 0; i < scenarios.frustratedCustomer.length; i++) {
        const turn = scenarios.frustratedCustomer[i];
        console.log(`\n--- Turn ${i + 1}: "${turn.message}" ---\n`);

        // Baseline
        const baselineResponse = await baselineChatbot.processMessage('comparison_baseline', turn.message);
        console.log(`BASELINE:`);
        console.log(`  Escalated: ${baselineResponse.shouldEscalate ? '🚨 YES' : '❌ NO'}`);
        
        if (baselineResponse.shouldEscalate && baselineEscalatedAt === -1) {
          baselineEscalatedAt = i + 1;
        }

        // Enhanced
        const enhancedResponse = await enhancedChatbot.processMessage('comparison_enhanced', turn.message);
        console.log(`\nENHANCED:`);
        console.log(`  Sentiment: ${enhancedResponse.sentiment?.sentiment} (intensity: ${(enhancedResponse.sentiment!.intensity * 100).toFixed(0)}%)`);
        console.log(`  Escalated: ${enhancedResponse.shouldEscalate ? '🚨 YES' : '❌ NO'}`);
        
        if (enhancedResponse.shouldEscalate && enhancedEscalatedAt === -1) {
          enhancedEscalatedAt = i + 1;
          console.log(`  ⚡ AUTOMATIC ESCALATION - Caught frustration early!`);
        }
      }

      console.log('\n╔════════════════════════════════════════════════════════════════════╗');
      console.log('║                          RESULTS                                   ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');

      console.log(`Baseline escalated at: Turn ${baselineEscalatedAt} (explicit request)`);
      console.log(`Enhanced escalated at: Turn ${enhancedEscalatedAt} (automatic detection)`);
      console.log(`\n🎯 IMPROVEMENT: ${baselineEscalatedAt - enhancedEscalatedAt} turn(s) faster`);
      console.log(`\n✅ VALUE: Customer didn't have to ask - we detected and acted`);
      console.log(`✅ RESULT: Better customer experience, reduced frustration\n`);

      // Enhanced should escalate earlier
      expect(enhancedEscalatedAt).toBeLessThan(baselineEscalatedAt);
      expect(enhancedEscalatedAt).toBe(3); // Should catch at turn 3
      expect(baselineEscalatedAt).toBe(4); // Only catches at turn 4 (explicit)
    }, 60000);
  });
});
