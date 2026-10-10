import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const PROMPT = `You see a photo of secondhand items for resale (books, games, movies, CDs, vinyl, cards).
Identify every item whose title you can read. Return ONLY a JSON array, no prose.
Each element: {"title": string, "creator": string|null, "format": string|null, "category": "book"|"game"|"movie"|"music"|"card"|"other"}.
If you cannot read a title, skip the item. Never guess a title you cannot see.`;

const DEMO = [
  { title: 'The 7 Habits of Highly Effective Teens', creator: 'Sean Covey', format: 'Paperback', category: 'book' },
  { title: 'The Measure: A Novel', creator: 'Nikki Erlick', format: 'Paperback', category: 'book' },
  { title: 'Flat Belly Diet!', creator: 'Liz Vaccariello', format: 'Mass Market Paperback', category: 'book' },
];

export const isDemoVision = () => !process.env.ANTHROPIC_API_KEY;

export async function identifyItems(buffer, mimeType) {
  if (isDemoVision()) return DEMO;
  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: buffer.toString('base64') } },
        { type: 'text', text: PROMPT },
      ],
    }],
  });
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Model returned no JSON list');
  const items = JSON.parse(match[0]);
  return items.filter(i => i && typeof i.title === 'string' && i.title.trim());
}
