import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchTrendingTopics, generateBlogPost } from '@/lib/ai-service';

// GET /api/trending - Get trending topics
export async function GET() {
  try {
    const topics = await db.trendingTopic.findMany({
      orderBy: { trendScore: 'desc' },
      take: 30,
    });
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Trending GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending topics' }, { status: 500 });
  }
}

// POST /api/trending - Research trending topics
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category } = body as { category?: string };

    const queries = [
      `best AI tools 2026 ${category || ''} trending`,
      `new AI software launch 2026 ${category || ''}`,
      `AI tools review comparison 2026 ${category || ''}`,
      `top SaaS tools beginners 2026 ${category || ''}`,
      `AI productivity tools what people searching 2026`,
    ];

    const allResults: Array<{
      keyword: string;
      trendScore: number;
      source: string;
      category: string;
      rawData: string;
      searchVol: string;
      difficulty: string;
    }> = [];

    for (const query of queries) {
      try {
        const results = await searchTrendingTopics(query, 8);
        for (const r of results) {
          const score = (10 - (r.rank || 5)) * 10 + Math.random() * 20;
          allResults.push({
            keyword: r.name || query,
            trendScore: Math.round(score),
            source: r.host_name || 'web_search',
            category: category || 'AI Tools',
            rawData: JSON.stringify(r),
            searchVol: 'High',
            difficulty: 'Medium',
          });
        }
      } catch (e) {
        console.error('Search failed for query:', query, e);
      }
    }

    // Deduplicate and save
    let saved = 0;
    for (const item of allResults) {
      try {
        const existing = await db.trendingTopic.findFirst({
          where: { keyword: item.keyword },
        });
        if (!existing) {
          await db.trendingTopic.create({ data: item });
          saved++;
        }
      } catch {}
    }

    const topics = await db.trendingTopic.findMany({
      orderBy: { trendScore: 'desc' },
      take: 30,
    });

    return NextResponse.json({ topics, newTopicsFound: saved });
  } catch (error) {
    console.error('Trending POST error:', error);
    return NextResponse.json({ error: 'Failed to research topics' }, { status: 500 });
  }
}
