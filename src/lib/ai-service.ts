import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function searchTrendingTopics(query: string, num = 10) {
  const zai = await getZAI();
  const results = await zai.functions.invoke('web_search', {
    query,
    num,
    recency_days: 7,
  });
  return results;
}

export async function generateBlogPost(topic: string, keywords: string[], category: string) {
  const zai = await getZAI();
  
  const prompt = `You are an expert SEO blog writer for an AI tools and software review site called "AI Toolkit Hub". 
Write a comprehensive, engaging blog post about: "${topic}"

Category: ${category}
Target keywords: ${keywords.join(', ')}

Requirements:
1. Write an eye-catching, click-worthy title
2. Include a compelling excerpt (2-3 sentences)
3. Write 800-1200 words of high-quality content
4. Use proper heading structure (H2, H3)
5. Include practical tips and actionable advice
6. Mention specific AI tools/products where relevant (these will have affiliate links)
7. End with a clear call-to-action
8. Optimize for SEO with natural keyword placement
9. Write in a conversational, helpful tone
10. Include a meta description (under 160 chars)

Respond in this exact JSON format:
{
  "title": "the blog title",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence excerpt",
  "seoTitle": "SEO optimized title under 60 chars",
  "seoDesc": "Meta description under 160 chars",
  "content": "Full HTML content with h2, h3, p, ul, li tags",
  "tags": ["tag1", "tag2", "tag3"],
  "affiliateTools": ["Tool Name 1", "Tool Name 2"]
}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an expert SEO content writer specializing in AI tools and software reviews. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  });

  const content = completion.choices[0]?.message?.content || '';
  
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  return null;
}

export async function generateSEOTitle(topic: string) {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an SEO expert. Generate 5 SEO-optimized blog title ideas. Respond with a JSON array of strings only.' },
      { role: 'user', content: `Generate 5 catchy, SEO-optimized blog post titles about: "${topic}"` },
    ],
    thinking: { type: 'disabled' },
  });
  
  try {
    const content = completion.choices[0]?.message?.content || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return [];
}
