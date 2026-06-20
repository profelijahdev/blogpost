import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/migrate - Run database migrations using Prisma
// On Vercel with PostgreSQL, Prisma handles migrations via `prisma migrate deploy`
// This endpoint seeds initial data if needed
export async function GET() {
  const results: string[] = [];

  try {
    // Check if we have any blog posts; if not, seed initial data
    const postCount = await db.blogPost.count();

    if (postCount === 0) {
      results.push('No posts found — seeding initial data...');

      // Create default autopost config
      await db.autoPostConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
          id: 'default',
          postsPerDay: 2,
          autoPublish: false,
          isActive: true,
          categories: 'AI Tools,SaaS,Productivity,Marketing,Developer',
        },
      });
      results.push('OK: Created default autopost config');
    } else {
      results.push(`OK: Database has ${postCount} posts, no seeding needed`);
    }

    // Ensure autopost config exists
    await db.autoPostConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        postsPerDay: 2,
        autoPublish: false,
        isActive: true,
        categories: 'AI Tools,SaaS,Productivity,Marketing,Developer',
      },
    });

    results.push('OK: Migration/seed check complete');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push(`ERR: ${msg.slice(0, 200)}`);
  }

  return NextResponse.json({ results });
}
