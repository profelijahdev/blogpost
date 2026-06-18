import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/blog/[id] - Get single blog post
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await db.blogPost.findUnique({
      where: { id },
      include: { affiliateLinks: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Increment view count
    await db.blogPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Blog GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PUT /api/blog/[id] - Update a blog post
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['title', 'slug', 'excerpt', 'content', 'coverImage', 'category', 'tags', 'seoTitle', 'seoDesc', 'featured', 'trending', 'published', 'sourceUrl'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.published === true && !body.publishedAt) {
      updateData.publishedAt = new Date();
    }

    if (updateData.tags) {
      updateData.tags = JSON.stringify(body.tags);
    }

    const post = await db.blogPost.update({
      where: { id },
      data: updateData,
      include: { affiliateLinks: true },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Blog PUT error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/blog/[id] - Delete a blog post
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.affiliateLink.deleteMany({ where: { blogPostId: id } });
    await db.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Blog DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
