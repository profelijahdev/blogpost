import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sanitizeInput, detectMaliciousInput } from '@/lib/security';

// GET /api/comments?postId=xxx - Get comments for a post
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const comments = await db.comment.findMany({
      where: {
        blogPostId: postId,
        flagged: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        blogPostId: true,
        authorName: true,
        content: true,
        parentId: true,
        liked: true,
        createdAt: true,
      },
    });

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

    // Spam detection
    const spamPatterns = /(?:https?:\/\/[^\s]+|viagra|casino|lottery|winner|congratulations|click here|free money)/i;
    if (spamPatterns.test(content) || spamPatterns.test(authorName)) {
      return NextResponse.json({ error: 'Comment flagged as spam' }, { status: 422 });
    }

    const cleanName = sanitizeInput(authorName, 50);
    const cleanContent = sanitizeInput(content, 2000);
    const cleanEmail = authorEmail ? sanitizeInput(authorEmail, 254) : null;

    // Check for malicious input
    const nameCheck = detectMaliciousInput(cleanName);
    const contentCheck = detectMaliciousInput(cleanContent);
    if (!nameCheck.safe || !contentCheck.safe) {
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 });
    }

    // Verify the blog post exists
    const post = await db.blogPost.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        blogPostId: postId,
        authorName: cleanName,
        authorEmail: cleanEmail,
        content: cleanContent,
        parentId: parentId || null,
      },
    });

    // Increment comment count on the post
    await db.blogPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, id: comment.id });
  } catch (e) {
    console.error('Comment POST error:', e);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
