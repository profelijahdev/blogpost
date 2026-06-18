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
  
  const prompt = `You are Daktari Brian, an expert AI tools reviewer and affiliate marketer. You write for "AI Toolkit Hub" — the go-to blog for AI tools, software reviews, and SaaS comparisons.

Write a COMPREHENSIVE, VIRAL-WORTHY blog post about: "${topic}"

Category: ${category}
Target keywords: ${keywords.join(', ')}

CRITICAL REQUIREMENTS — follow ALL of these:

## SEO & Viral Optimization
1. Title must be IRRESISTIBLE — use power words, numbers, or controversy (e.g., "7 AI Tools That Will Replace Your Entire Team in 2026")
2. Include a hook in the first 2 sentences that creates curiosity or urgency
3. Use the target keyword in the first 100 words naturally
4. Include LSI keywords throughout (related terms people also search for)
5. Every H2 should be a question or bold claim that makes people want to read more
6. Add "Key Takeaways" or "TL;DR" section near the top for skimmers
7. Include at least one surprising statistic or counterintuitive insight
8. End with a controversial or thought-provoking question to spark comments

## Content Structure (Best Blogging Practices)
1. Compelling excerpt (2-3 sentences that create FOMO)
2. Table of Contents (as a bulleted list at the top after intro)
3. Introduction with a hook (story, stat, or bold claim)
4. Main content with H2 and H3 subheadings every 200-300 words
5. Include bullet lists and numbered lists for scannability
6. Add "Pro Tip" sections with expert advice
7. Include a "Who Should Use This" section for each tool mentioned
8. Comparison table (as HTML table) when comparing tools
9. FAQ section at the bottom (3-5 common questions)
10. Author bio at the end: "Written by Daktari Brian — AI tools enthusiast and affiliate marketing strategist"

## Image Placeholders
Include these image placeholders in the content using this format:
<img-placeholder type="hero" alt="descriptive alt text for SEO" />
<img-placeholder type="screenshot" alt="tool name screenshot" />
<img-placeholder type="comparison" alt="side by side comparison" />
<img-placeholder type="infographic" alt="data visualization" />

Place images strategically:
- 1 hero image after the introduction
- 1 screenshot for each tool reviewed (inside the tool section)
- 1 comparison image before any comparison table
- 1 infographic or chart in the data/stats section

## Affiliate Integration
- Mention 3-5 specific AI tools naturally within the content
- For each tool: describe what it does, who it's for, pricing range, and a genuine pros/cons
- Include "Try [Tool] Free" CTAs naturally in the flow
- The affiliateTools array should list the exact tool names

## Shareability & Engagement
- Include at least one quotable insight (something a reader would share on Twitter)
- Add a "Share this post if you agree" prompt
- Include a controversial take that encourages debate
- Ask readers a direct question at the end

Respond in this EXACT JSON format:
{
  "title": "the viral-worthy blog title with power words",
  "slug": "url-friendly-slug-with-keywords",
  "excerpt": "2-3 sentence hook that creates FOMO and curiosity",
  "seoTitle": "SEO title under 60 chars with primary keyword",
  "seoDesc": "Meta description under 160 chars that creates click urgency",
  "content": "Full HTML content with h2, h3, p, ul, ol, li, table, blockquote, img-placeholder tags. Make it 1200-2000 words.",
  "tags": ["5-8 relevant tags including long-tail keywords"],
  "affiliateTools": ["Tool Name 1", "Tool Name 2", "Tool Name 3"],
  "readTime": 7,
  "viralHook": "The one-line controversial/surprising insight from the post"
}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are Daktari Brian, an expert SEO content writer specializing in AI tools reviews. You write viral, shareable content that ranks on Google. Always respond with valid JSON only. Your tone is conversational, authoritative, and occasionally provocative to spark engagement.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  });

  const content = completion.choices[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Add author name
      parsed.authorName = 'Daktari Brian';
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  return null;
}

// Generate cover images for blog posts using AI image generation
export async function generateCoverImage(topic: string): Promise<string | null> {
  try {
    const zai = await getZAI();
    const result = await zai.images.generate({
      prompt: `Professional blog cover image for article about "${topic}". Modern, clean design with abstract tech elements, AI neural network patterns, gradient colors (emerald and teal), no text, high quality, 16:9 aspect ratio`,
      size: '1792x1024',
    });
    
    if (result && result.data && result.data.length > 0) {
      return result.data[0].url || null;
    }
  } catch (e) {
    console.error('Image generation failed:', e);
  }
  return null;
}
