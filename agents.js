import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "dummy",
});

const betTemplates = [
  { q: (o) => `Will over ${o} produce 10+ runs?`, risk: 'HIGH', stake: 50, reward: 150, type: 'runs', threshold: 10 },
  { q: (o) => `Will over ${o} produce a wicket?`, risk: 'HIGH', stake: 75, reward: 200, type: 'wicket', threshold: 1 },
  { q: (o) => `At least 4 singles in over ${o}?`, risk: 'LOW', stake: 20, reward: 40, type: 'singles', threshold: 4 },
  { q: (o) => `Will over ${o} have a boundary (4 or 6)?`, risk: 'MEDIUM', stake: 40, reward: 100, type: 'boundary', threshold: 1 },
  { q: (o) => `Will over ${o} be a maiden (0 runs)?`, risk: 'HIGH', stake: 100, reward: 500, type: 'maiden', threshold: 0 },
];

// Agent 2: Bet Generator
export function generateBets(overNumber) {
  const over = overNumber || 1;
  // Pick 3 random bet templates for this over
  const shuffled = [...betTemplates].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((t, i) => ({
    id: `bet_${over}_${i}_${Date.now()}`,
    question: t.q(over),
    riskLevel: t.risk,
    safe: t.risk === 'LOW',
    stake: t.stake,
    reward: t.reward,
    type: t.type,
    threshold: t.threshold,
    over
  }));
}

// Agent 4: Roast Agent
export async function generateRoast(event, matchContext) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'dummy') {
    const mockRoasts = [
      `${event.player} just reminded everyone why cricket is 90% disappointment!`,
      `Over ${matchContext.over} and we're already running out of adjectives for 'terrible'!`,
      `That ${event.type} had the crowd on the edge of their seats... then falling off them!`,
      `Someone tell ${event.player} the stumps are behind them, not in front!`,
      `${matchContext.score}/${matchContext.wickets} — at this rate they'll need extra time just to reach mediocrity!`,
    ];
    return mockRoasts[Math.floor(Math.random() * mockRoasts.length)];
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 120,
      system: "You are a witty, toxic but PG-13 cricket fan commentator at a hackathon event. Give a single punchy, hilarious one-liner roast about the cricket event. Be creative and funny. No hashtags.",
      messages: [
        { role: "user", content: `Event: ${event.type} by ${event.player}. Score: ${matchContext.score}/${matchContext.wickets} in over ${matchContext.over}. Generate a spicy roast!` }
      ]
    });
    return response.content[0].text;
  } catch (error) {
    console.error("Roast Agent Error:", error.message);
    return `Wow, ${event.player}! Even my grandma would've played that better! 🏏`;
  }
}
