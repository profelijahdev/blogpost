import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

function sanitize(str: string, maxLen = 100): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
}

// POST /api/interact - Like or share a post
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, action, sessionId } = body as {
      postId: string;
      action: 'like' | 'share';
      sessionId: string;
    };

    if (!postId || !action || !sessionId) {
      return NextResponse.json({ error: 'postId, action, and sessionId are required' }, { status: 400 });
    }

    const cleanPostId = sanitize(postId, 50);
    const cleanSessionId = sanitize(sessionId, 100);

    if (action === 'like') {
      // Check if already liked
      const existing = await db.$queryRawUnsafe(
        `SELECT id FROM PostLike WHERE blogPostId = '${cleanPostId}' AND sessionId = '${cleanSessionId}' LIMIT 1`
      ) as Array<{ id: string }>;

      if (existing && existing.length > 0) {
        // Unlike
        await db.$executeRawUnsafe(
          `DELETE FROM PostLike WHERE blogPostId = '${cleanPostId}' AND sessionId = '${cleanSessionId}'`
        );
        await db.$executeRawUnsafe(
          `UPDATE BlogPost SET likeCount = MAX(0, likeCount - 1) WHERE id = '${cleanPostId}'`
        );
        return NextResponse.json({ liked: false });
      } else {
        // Like
        const id = `like_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.$executeRawUnsafe(
          `INSERT INTO PostLike (id, blogPostId, sessionId, createdAt) VALUES ('${id}', '${cleanPostId}', '${cleanSessionId}', datetime('now'))`
        );
        await db.$executeRawUnsafe(
          `UPDATE BlogPost SET likeCount = likeCount + 1 WHERE id = '${cleanPostId}'`
        );
        return NextResponse.json({ liked: true });
      }
    }

    if (action === 'share') {
      await db.$executeRawUnsafe(
        `UPDATE BlogPost SET shareCount = shareCount + 1 WHERE id = '${cleanPostId}'`
      );
      return NextResponse.json({ shared: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('Interact error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET /api/interact?postId=xxx&sessionId=xxx - Check if user liked a post
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const sessionId = searchParams.get('sessionId');

    if (!postId || !sessionId) {
      return NextResponse.json({ liked: false });
    }

    const existing = await db.$queryRawUnsafe(
      `SELECT id FROM PostLike WHERE blogPostId = '${sanitize(postId, 50)}' AND sessionId = '${sanitize(sessionId, 100)}' LIMIT 1`
    ) as Array<{ id: string }>;

    return NextResponse.json({ liked: existing && existing.length > 0 });
  } catch {
    return NextResponse.json({ liked: false });
  }
}
