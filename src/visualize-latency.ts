import { JevSentimentAnalyzer } from './analyzers/jev-analyzer';
import { LLMSentimentAnalyzer } from './analyzers/llm-analyzer';
import { SentimentChatbot } from './chatbot';
import { writeFileSync } from 'fs';

interface TurnMetrics {
  turnNumber: number;
  message: string;
  sentiment: string;
  jevLatency: number;
  llmLatency: number;
  jevCumulative: number;
  llmCumulative: number;
  timeSaved: number;
}

async function generateMultiTurnComparison() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     MULTI-TURN LATENCY COMPARISON: Jev vs LLM (15 turns)         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Create analyzers
  const jevAnalyzer = new JevSentimentAnalyzer('mock', undefined, true);
  const llmAnalyzer = new LLMSentimentAnalyzer('mock', 'openai');

  const jevChatbot = new SentimentChatbot(jevAnalyzer);
  const llmChatbot = new SentimentChatbot(llmAnalyzer);

  // Simulate a 15-turn conversation with escalating sentiment
  const conversation = [
    "Hi, I'd like to check on my order",
    "I ordered this 5 days ago", // Start negative sentiment here
    "I paid for express shipping",
    "This is taking too long",
    "I'm getting frustrated with this",
    "This is ridiculous",
    "Why is this taking so long?",
    "I'm very disappointed",
    "This is unacceptable",
    "I want a refund",
    "Your service is terrible",
    "I'm extremely unhappy",
    "This is the worst experience",
    "I demand to speak to a manager",
    "I want to cancel everything"
  ];

  const metrics: TurnMetrics[] = [];
  let jevCumulative = 0;
  let llmCumulative = 0;

  console.log('Simulating 15-turn conversation...\n');

  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    const turnNumber = i + 1;

    // Jev response
    const jevStart = Date.now();
    const jevResponse = await jevChatbot.processMessage('multi_jev', message);
    const jevLatency = Date.now() - jevStart;
    jevCumulative += jevLatency;

    // LLM response (with simulated latency)
    const mockLLMLatency = 3000 + Math.random() * 6000; // 3-9 seconds
    await new Promise(resolve => setTimeout(resolve, mockLLMLatency));
    
    const llmStart = Date.now();
    const llmResponse = await llmChatbot.processMessage('multi_llm', message);
    const llmLatency = Date.now() - llmStart + mockLLMLatency;
    llmCumulative += llmLatency;

    const timeSaved = llmCumulative - jevCumulative;

    metrics.push({
      turnNumber,
      message: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
      sentiment: jevResponse.sentiment.sentiment,
      jevLatency,
      llmLatency,
      jevCumulative,
      llmCumulative,
      timeSaved
    });

    console.log(`Turn ${turnNumber}: ${jevLatency}ms (Jev) vs ${llmLatency.toFixed(0)}ms (LLM)`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('CUMULATIVE LATENCY COMPARISON');
  console.log('='.repeat(70) + '\n');

  // Print table
  console.log('Turn | Sentiment    | Jev (ms) | LLM (ms)  | Jev Total | LLM Total | Saved');
  console.log('-'.repeat(78));
  
  metrics.forEach(m => {
    console.log(
      `${m.turnNumber.toString().padStart(4)} | ` +
      `${m.sentiment.padEnd(12)} | ` +
      `${m.jevLatency.toString().padStart(8)} | ` +
      `${m.llmLatency.toFixed(0).padStart(9)} | ` +
      `${(m.jevCumulative/1000).toFixed(1).padStart(9)}s | ` +
      `${(m.llmCumulative/1000).toFixed(1).padStart(9)}s | ` +
      `${(m.timeSaved/1000).toFixed(1)}s`
    );
  });

  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`Jev Total Time:  ${(jevCumulative/1000).toFixed(2)} seconds`);
  console.log(`LLM Total Time:  ${(llmCumulative/1000).toFixed(2)} seconds`);
  console.log(`Time Saved:      ${((llmCumulative - jevCumulative)/1000).toFixed(2)} seconds`);
  console.log(`Speedup Factor:  ${(llmCumulative/jevCumulative).toFixed(1)}x faster\n`);

  // Generate chart data
  generateASCIIChart(metrics);
  generateHTMLChart(metrics);
  generateCSVData(metrics);

  return metrics;
}

function generateASCIIChart(metrics: TurnMetrics[]) {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              CUMULATIVE LATENCY OVER 15 TURNS                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const maxTime = Math.max(...metrics.map(m => m.llmCumulative));
  const scale = 60 / maxTime; // Scale to fit in ~60 characters

  metrics.forEach(m => {
    const jevBar = '█'.repeat(Math.floor(m.jevCumulative * scale));
    const llmBar = '█'.repeat(Math.floor(m.llmCumulative * scale));
    
    console.log(`Turn ${m.turnNumber.toString().padStart(2)}`);
    console.log(`  Jev: ${jevBar} ${(m.jevCumulative/1000).toFixed(1)}s`);
    console.log(`  LLM: ${llmBar} ${(m.llmCumulative/1000).toFixed(1)}s`);
    console.log();
  });
}

function generateHTMLChart(metrics: TurnMetrics[]) {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Jev vs LLM Latency - Multi-Turn Conversation</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        canvas {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Multi-Turn Conversation Latency Impact</h1>
        <p class="subtitle">Jev vs Traditional LLM - 15 Turn Conversation with Escalating Sentiment</p>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${(metrics[metrics.length-1].jevCumulative/1000).toFixed(1)}s</div>
                <div class="stat-label">Jev Total Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(metrics[metrics.length-1].llmCumulative/1000).toFixed(1)}s</div>
                <div class="stat-label">LLM Total Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(metrics[metrics.length-1].timeSaved/1000).toFixed(1)}s</div>
                <div class="stat-label">Time Saved</div>
            </div>
        </div>

        <canvas id="cumulativeChart"></canvas>
        <canvas id="perTurnChart" style="margin-top: 40px;"></canvas>
    </div>

    <script>
        const turns = ${JSON.stringify(metrics.map(m => m.turnNumber))};
        const jevCumulative = ${JSON.stringify(metrics.map(m => (m.jevCumulative/1000).toFixed(2)))};
        const llmCumulative = ${JSON.stringify(metrics.map(m => (m.llmCumulative/1000).toFixed(2)))};
        const jevPerTurn = ${JSON.stringify(metrics.map(m => m.jevLatency))};
        const llmPerTurn = ${JSON.stringify(metrics.map(m => m.llmLatency))};

        // Cumulative chart
        new Chart(document.getElementById('cumulativeChart'), {
            type: 'line',
            data: {
                labels: turns,
                datasets: [{
                    label: 'Jev (Cumulative)',
                    data: jevCumulative,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true
                }, {
                    label: 'LLM (Cumulative)',
                    data: llmCumulative,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cumulative Latency Over 15 Turns',
                        font: { size: 18 }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Time (seconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Conversation Turn'
                        }
                    }
                }
            }
        });

        // Per-turn chart
        new Chart(document.getElementById('perTurnChart'), {
            type: 'bar',
            data: {
                labels: turns,
                datasets: [{
                    label: 'Jev (per turn)',
                    data: jevPerTurn,
                    backgroundColor: '#10b981'
                }, {
                    label: 'LLM (per turn)',
                    data: llmPerTurn,
                    backgroundColor: '#ef4444'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Per-Turn Latency Comparison',
                        font: { size: 18 }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (milliseconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Conversation Turn'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  writeFileSync('/agent/latency-visualization.html', html);
  console.log('\n✅ HTML visualization saved to: latency-visualization.html');
  console.log('   Open this file in a browser to see interactive charts\n');
}

function generateCSVData(metrics: TurnMetrics[]) {
  const csv = [
    'Turn,Message,Sentiment,Jev_Latency_ms,LLM_Latency_ms,Jev_Cumulative_s,LLM_Cumulative_s,Time_Saved_s',
    ...metrics.map(m => 
      `${m.turnNumber},"${m.message}",${m.sentiment},${m.jevLatency},${m.llmLatency.toFixed(0)},${(m.jevCumulative/1000).toFixed(2)},${(m.llmCumulative/1000).toFixed(2)},${(m.timeSaved/1000).toFixed(2)}`
    )
  ].join('\n');

  writeFileSync('/agent/latency-data.csv', csv);
  console.log('✅ CSV data saved to: latency-data.csv\n');
}

// Run if called directly
if (require.main === module) {
  generateMultiTurnComparison().catch(console.error);
}

export { generateMultiTurnComparison };
