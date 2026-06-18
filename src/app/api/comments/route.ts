import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Sanitize input to prevent XSS
function sanitize(str: string, maxLen = 500): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, maxLen);
}

// GET /api/comments?postId=xxx - Get comments for a post
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const comments = await db.$queryRawUnsafe(
      `SELECT id, blogPostId, authorName, content, parentId, liked, createdAt FROM Comment WHERE blogPostId = '${sanitize(postId, 50)}' AND flagged = 0 ORDER BY createdAt DESC LIMIT 50`
    );

    return NextResponse.json({ comments });
  } catch (e) {
    console.error('Comments GET error:', e);
    return NextResponse.json({ comments: [] });
  }
}

// POST /api/comments - Add a comment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, authorName, authorEmail, content, parentId } = body as {
      postId: string;
      authorName: string;
      authorEmail?: string;
      content: string;
      parentId?: string;
    };

    if (!postId || !authorName || !content) {
      return NextResponse.json({ error: 'postId, authorName, and content are required' }, { status: 400 });
    }

    if (content.length < 3 || content.length > 2000) {
      return NextResponse.json({ error: 'Comment must be 3-2000 characters' }, { status: 400 });
    }

    // Spam detection - basic checks
    const spamPatterns = /(?:https?:\/\/[^\s]+|viagra|casino|lottery|winner|congratulations|click here|free money)/i;
    if (spamPatterns.test(content) || spamPatterns.test(authorName)) {
      return NextResponse.json({ error: 'Comment flagged as spam' }, { status: 422 });
    }

    const cleanName = sanitize(authorName, 50);
    const cleanContent = sanitize(content, 2000);
    const cleanEmail = authorEmail ? sanitize(authorEmail, 254) : '';
    const cleanParentId = parentId ? sanitize(parentId, 50) : null;

    const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await db.$executeRawUnsafe(
      `INSERT INTO Comment (id, blogPostId, authorName, authorEmail, content, parentId, liked, flagged, createdAt, updatedAt) VALUES ('${id}', '${sanitize(postId, 50)}', '${cleanName}', '${cleanEmail}', '${cleanContent}', ${cleanParentId ? `'${cleanParentId}'` : 'NULL'}, 0, 0, datetime('now'), datetime('now'))`
    );

    // Increment comment count on the post
    await db.$executeRawUnsafe(
      `UPDATE BlogPost SET commentCount = commentCount + 1 WHERE id = '${sanitize(postId, 50)}'`
    );

    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error('Comment POST error:', e);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
