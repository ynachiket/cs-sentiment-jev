# Quick Setup Guide

## For Users Without OpenRouter API Key (Mock Mode)

**Works out of the box - no API key needed!**

```bash
# 1. Install dependencies
npm install

# 2. Run tests (uses mock API automatically)
npm run test:latency

# That's it! All tests will pass with simulated responses.
```

## For Users With OpenRouter API Key (Real API)

### Step 1: Get OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai) and sign up
2. Navigate to [Settings > Keys](https://openrouter.ai/settings/keys)
3. Create a new API key (starts with `sk-or-v1-...`)

**Tutorial**: [OpenRouter Jev Tutorial](https://openrouter.ai/docs/guides/community/jev-tutorial)

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API key
# Change this line:
#   OPENROUTER_API_KEY=your_openrouter_api_key_here
# To:
#   OPENROUTER_API_KEY=sk-or-v1-YOUR-ACTUAL-KEY
```

Or use command line:

```bash
echo "OPENROUTER_API_KEY=sk-or-v1-YOUR-ACTUAL-KEY" > .env
```

### Step 3: Install & Test

```bash
# Install dependencies
npm install

# Test with REAL Jev API
npm run test:real-api
```

### Expected Output (Real API)

```
╔════════════════════════════════════════════════════════════════════╗
║           REAL JEV API TEST via OpenRouter                        ║
╚════════════════════════════════════════════════════════════════════╝

Testing with REAL Jev API through OpenRouter...

✅ Successfully tested 4/4 messages

Latency Statistics:
  Average: 186ms
  Min: 131ms
  Max: 295ms
  Target: 70-500ms ✅ WITHIN SPEC!

🎉 Real Jev API integration working successfully!
```

## Available Commands

### Testing
```bash
npm test                 # All tests (mock mode)
npm run test:latency     # Latency comparison (mock mode)
npm run test:real-api    # Test with real Jev API (requires API key)
```

### Development
```bash
npm run build           # Build TypeScript
npm run dev             # Run interactive demo (mock mode)
```

## Troubleshooting

### "OPENROUTER_API_KEY not found"

**Problem**: You're trying to run `npm run test:real-api` without an API key.

**Solution**: 
- Either get an API key and add it to `.env` (see Step 1-2 above)
- Or use mock mode: `npm run test:latency` (no API key needed)

### "API error 401: Unauthorized"

**Problem**: Invalid API key in `.env`

**Solution**:
- Check that your API key starts with `sk-or-v1-`
- Make sure there are no extra spaces or quotes around the key
- Regenerate key at [OpenRouter Settings](https://openrouter.ai/settings/keys)

### "API error 429: Too Many Requests"

**Problem**: Rate limiting from OpenRouter

**Solution**:
- Wait a few seconds and try again
- Check your [OpenRouter usage](https://openrouter.ai/usage)
- Use mock mode for testing: `npm run test:latency`

### Tests fail with TypeScript errors

**Problem**: Dependencies not installed or build needed

**Solution**:
```bash
npm install
npm run build
npm test
```

## What Gets Tested

### Mock Mode Tests (`npm run test:latency`)
- 6 comprehensive test scenarios
- Multi-turn conversations
- Latency measurements (simulated)
- Routing decision accuracy
- All deterministic and repeatable

### Real API Test (`npm run test:real-api`)
- 4 real API calls to Jev via OpenRouter
- Actual latency measurements
- Real sentiment detection
- True routing decisions
- Shows real-world performance

## Security Notes

✅ **Safe**: The `.env` file is in `.gitignore` - your API key will NOT be committed to git

✅ **Safe**: Only `.env.example` (without actual keys) is committed

⚠️ **Warning**: Never commit your `.env` file or share your API key publicly

## Cost Information

**Jev via OpenRouter**:
- Input tokens: ~$0.042 per million tokens
- Output tokens: FREE
- These tests use ~500 tokens total
- Cost per test run: ~$0.00002 (essentially free)

**For reference**:
- 10,000 messages/day ≈ $0.13/day
- Compare to LLMs: $150-450/day for same volume

## Next Steps

After setup, check out:
- **[README.md](README.md)** - Full documentation
- **[TEST_RESULTS.md](TEST_RESULTS.md)** - Performance analysis
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Technical details
- **[SUMMARY.md](SUMMARY.md)** - Executive summary

## Support

- **Jev/TypeSafe**: [TypeSafe AI](https://typesafe.ai)
- **OpenRouter**: [OpenRouter Docs](https://openrouter.ai/docs)
- **Jev Tutorial**: [Tutorial](https://openrouter.ai/docs/guides/community/jev-tutorial)
