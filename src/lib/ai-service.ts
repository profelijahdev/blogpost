// AI Service using OpenRouter API with auto model selection
// OpenRouter automatically routes to the best available model

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY environment variable is required. Get one at https://openrouter.ai/keys');
  }
  return key;
}

// Auto-select model via OpenRouter — uses :auto routing which picks the best model for the task
function getModel(): string {
  // OpenRouter's auto-routing picks the best model for the prompt
  // User can override with OPENROUTER_MODEL env var if they want a specific model
  return process.env.OPENROUTER_MODEL || 'openrouter/auto';
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<OpenRouterResponse> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-toolkit-hub.vercel.app',
      'X-Title': 'AI Toolkit Hub Blog',
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Web search via SerpAPI or fallback to OpenRouter-generated research
export async function searchTrendingTopics(query: string, num = 10) {
  // If SERPAPI_KEY is provided, use real web search
  const serpApiKey = process.env.SERPAPI_KEY;
  
  if (serpApiKey) {
    try {
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${num}&api_key=${serpApiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        return (data.organic_results || []).map((r: { title?: string; link?: string; snippet?: string; position?: number }) => ({
          name: r.title || query,
          url: r.link || '',
          snippet: r.snippet || '',
          rank: r.position || 0,
          host_name: r.link ? new URL(r.link).hostname : 'web_search',
        }));
      }
    } catch (e) {
      console.error('SerpAPI search failed, falling back to AI research:', e);
    }
  }

  // Fallback: Use OpenRouter to generate trending topic research
  try {
    const completion = await callOpenRouter([
      {
        role: 'system',
        content: 'You are an SEO and market research expert. Respond with valid JSON only. No markdown, no code blocks, just raw JSON.',
      },
      {
        role: 'user',
        content: `Research trending topics for: "${query}"
        
Return a JSON array of ${num} trending topics/keywords related to this query. Each item should have:
- name: the trending keyword or topic title
- searchVolume: estimated monthly search volume (e.g., "12K/mo")
- difficulty: SEO difficulty level (Low/Medium/High)
- trendDirection: "rising" or "stable" or "declining"
- relatedKeywords: array of 3-5 related long-tail keywords

Return ONLY the JSON array, no other text.`,
      },
    ], { temperature: 0.6, maxTokens: 2048 });

    const content = completion.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: { name?: string; searchVolume?: string; difficulty?: string; trendDirection?: string; relatedKeywords?: string[] }, i: number) => ({
        name: item.name || query,
        url: '',
        snippet: `${item.searchVolume || ''} - ${item.difficulty || ''} - ${item.trendDirection || ''}`,
        rank: i + 1,
        host_name: 'ai_research',
        searchVolume: item.searchVolume,
        difficulty: item.difficulty,
        relatedKeywords: item.relatedKeywords || [],
      }));
    }
  } catch (e) {
    console.error('AI research fallback also failed:', e);
  }

  // Final fallback: return generic results
  return [
    { name: query, url: '', snippet: '', rank: 1, host_name: 'fallback' },
  ];
}

export async function generateBlogPost(topic: string, keywords: string[], category: string) {
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

  const completion = await callOpenRouter([
    { role: 'system', content: 'You are Daktari Brian, an expert SEO content writer specializing in AI tools reviews. You write viral, shareable content that ranks on Google. Always respond with valid JSON only. Your tone is conversational, authoritative, and occasionally provocative to spark engagement.' },
    { role: 'user', content: prompt },
  ], { maxTokens: 4096, temperature: 0.8 });

  const content = completion.choices[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.authorName = 'Daktari Brian';
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  return null;
}

// Generate cover image description (OpenRouter doesn't do images, so we generate a prompt)
// The actual image can be generated via a separate image API or placeholder services
export async function generateCoverImage(topic: string): Promise<string | null> {
  // If an image generation API key is provided, use it
  const imageApiKey = process.env.IMAGE_API_KEY;
  const imageApiUrl = process.env.IMAGE_API_URL;
  
  if (imageApiKey && imageApiUrl) {
    try {
      const response = await fetch(imageApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${imageApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Professional blog cover image for article about "${topic}". Modern, clean design with abstract tech elements, AI neural network patterns, gradient colors (emerald and teal), no text, high quality, 16:9 aspect ratio`,
          size: '1792x1024',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data?.[0]?.url) {
          return data.data[0].url;
        }
      }
    } catch (e) {
      console.error('Image generation failed:', e);
    }
  }
  
  // Fallback: return a placeholder URL using the topic as seed
  const encodedTopic = encodeURIComponent(topic.slice(0, 50));
  return `https://picsum.photos/seed/${encodedTopic}/1200/630`;
}

// Send email notification using OpenRouter (generate email content)
// For actual email sending, use a service like Resend, SendGrid, or Nodemailer
export async function sendNotificationEmail(type: 'subscriber' | 'comment', data: { email?: string; name?: string; content?: string; postTitle?: string }) {
  const ownerEmail = process.env.OWNER_EMAIL || 'koechbrian245@gmail.com';
  
  // If RESEND_API_KEY is available, send actual email
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const emailContent = type === 'subscriber' 
        ? { subject: 'New Subscriber!', text: `New subscriber: ${data.email} (Name: ${data.name || 'Not provided'})` }
        : { subject: `New Comment on: ${data.postTitle}`, text: `${data.name} commented: ${data.content}` };

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AI Toolkit Hub <noreply@ai-toolkit-hub.com>',
          to: [ownerEmail],
          subject: emailContent.subject,
          text: emailContent.text,
        }),
      });
    } catch (e) {
      console.error('Failed to send notification email:', e);
    }
  } else {
    // Log notification for serverless environments
    console.log(`📧 NOTIFICATION [${type.toUpperCase()}]:`, JSON.stringify(data));
  }
}
