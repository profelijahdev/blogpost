import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    if (action === 'like') {
      // Check if already liked
      const existing = await db.postLike.findUnique({
        where: {
          blogPostId_sessionId: {
            blogPostId: postId,
            sessionId: sessionId,
          },
        },
      });

      if (existing) {
        // Unlike
        await db.postLike.delete({
          where: { id: existing.id },
        });
        await db.blogPost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });
        return NextResponse.json({ liked: false });
      } else {
        // Like
        await db.postLike.create({
          data: {
            blogPostId: postId,
            sessionId: sessionId,
          },
        });
        await db.blogPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });
        return NextResponse.json({ liked: true });
      }
    }

    if (action === 'share') {
      await db.blogPost.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
      });
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

    const existing = await db.postLike.findUnique({
      where: {
        blogPostId_sessionId: { blogPostId: postId, sessionId },
      },
    });

    return NextResponse.json({ liked: !!existing });
  } catch {
    return NextResponse.json({ liked: false });
  }
}
