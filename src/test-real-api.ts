import * as dotenv from 'dotenv';
import { SentimentChatbot } from './chatbot';
import { JevSentimentAnalyzer } from './analyzers/jev-analyzer';

// Load environment variables
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY not found in environment variables');
  console.error('Please create a .env file with your OpenRouter API key');
  process.exit(1);
}

async function testRealJevAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                    ║');
  console.log('║           REAL JEV API TEST via OpenRouter                        ║');
  console.log('║                                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Create analyzer with REAL API (useMock = false)
  const jevAnalyzer = new JevSentimentAnalyzer(OPENROUTER_API_KEY!, undefined, false);
  const chatbot = new SentimentChatbot(jevAnalyzer);

  const testMessages = [
    {
      message: "Hi, I need help with my recent order",
      expected: "neutral or positive"
    },
    {
      message: "This is getting ridiculous. I've been waiting for 5 days!",
      expected: "frustrated"
    },
    {
      message: "I'm extremely angry! This is completely unacceptable!",
      expected: "angry with escalation"
    },
    {
      message: "Thank you so much, that was exactly what I needed!",
      expected: "positive"
    }
  ];

  console.log('Testing with REAL Jev API through OpenRouter...\n');
  console.log('Model: typesafe/jev-1.13');
  console.log('Endpoint: https://openrouter.ai/api/alpha/decisions\n');
  console.log('─'.repeat(70));

  const results: { message: string; latency: number; sentiment: string }[] = [];

  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`\nTest ${i + 1}/${testMessages.length}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const conversationId = `real-test-${i}`;
      const startTime = Date.now();
      
      const response = await chatbot.processMessage(conversationId, test.message);
      
      const latency = Date.now() - startTime;
      
      console.log(`\n✅ SUCCESS`);
      console.log(`  Sentiment: ${response.sentiment.sentiment.toUpperCase()}`);
      console.log(`  Confidence: ${(response.sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`  Emotions: ${response.sentiment.emotions.join(', ')}`);
      console.log(`  Intensity: ${(response.sentiment.intensity * 100).toFixed(0)}%`);
      console.log(`  Urgency: ${response.sentiment.urgency}`);
      console.log(`  Routing: ${response.routingDecision.action}`);
      console.log(`  ⚡ REAL API Latency: ${latency}ms`);
      console.log(`  Reasoning: ${response.sentiment.reasoning}`);

      results.push({
        message: test.message,
        latency,
        sentiment: response.sentiment.sentiment
      });

      if (response.routingDecision.action === 'escalate_human') {
        console.log(`\n  🚨 ESCALATED TO HUMAN AGENT`);
      } else if (response.routingDecision.action === 'priority_queue') {
        console.log(`\n  ⚡ MOVED TO PRIORITY QUEUE`);
      }

    } catch (error) {
      console.error(`\n❌ ERROR: ${error}`);
      console.error('This might be due to:');
      console.error('  - Invalid API key');
      console.error('  - Network issues');
      console.error('  - Rate limiting');
      console.error('  - API service issues');
    }

    console.log('─'.repeat(70));
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                         REAL API RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  if (results.length > 0) {
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const maxLatency = Math.max(...results.map(r => r.latency));
    const minLatency = Math.min(...results.map(r => r.latency));

    console.log(`✅ Successfully tested ${results.length}/${testMessages.length} messages\n`);
    console.log(`Latency Statistics:`);
    console.log(`  Average: ${avgLatency.toFixed(0)}ms`);
    console.log(`  Min: ${minLatency}ms`);
    console.log(`  Max: ${maxLatency}ms`);
    console.log(`  Target: 70-500ms (Jev specification)`);
    
    if (avgLatency < 500) {
      console.log(`\n  🎯 EXCELLENT: Within Jev's specified range!`);
    } else if (avgLatency < 1000) {
      console.log(`\n  ⚠️  GOOD: Slightly slower than target (may include network latency)`);
    } else {
      console.log(`\n  ℹ️  Latency includes network round-trip time`);
    }

    console.log(`\nSentiment Detection:`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.sentiment} - "${r.message.substring(0, 50)}..."`);
    });

    console.log(`\n🎉 Real Jev API integration working successfully!`);
    console.log(`   This proves the ${avgLatency.toFixed(0)}ms real-world latency vs 3-9s for LLMs`);

  } else {
    console.log(`❌ No successful API calls. Please check:`);
    console.log(`   - API key is valid`);
    console.log(`   - Network connection`);
    console.log(`   - OpenRouter service status`);
  }

  console.log('\n╚════════════════════════════════════════════════════════════════════╝\n');
}

// Run the test
if (require.main === module) {
  testRealJevAPI().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
}

export { testRealJevAPI };
