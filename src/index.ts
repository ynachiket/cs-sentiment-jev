import { runScenario, scenarios } from './demo';

console.log('Starting Sentiment Analysis Chatbot Demo...\n');
console.log('This will run comparison scenarios between Jev and traditional LLM.\n');

// The demo module exports the main function
import('./demo').then(module => {
  // Demo runs when imported
}).catch(error => {
  console.error('Error running demo:', error);
  process.exit(1);
});
