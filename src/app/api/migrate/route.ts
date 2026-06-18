import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/migrate - Run database migrations
export async function GET() {
  const results: string[] = [];

  // Add new columns to BlogPost
  const alterStatements = [
    "ALTER TABLE BlogPost ADD COLUMN likeCount INTEGER DEFAULT 0",
    "ALTER TABLE BlogPost ADD COLUMN shareCount INTEGER DEFAULT 0",
    "ALTER TABLE BlogPost ADD COLUMN commentCount INTEGER DEFAULT 0",
    "ALTER TABLE BlogPost ADD COLUMN authorName TEXT DEFAULT 'Daktari Brian'",
    "ALTER TABLE BlogPost ADD COLUMN readTime INTEGER DEFAULT 5",
  ];

  for (const sql of alterStatements) {
    try {
      await db.$executeRawUnsafe(sql);
      results.push(`OK: ${sql.slice(0, 60)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('duplicate') || msg.includes('already exists')) {
        results.push(`SKIP (exists): ${sql.slice(0, 60)}...`);
      } else {
        results.push(`ERR: ${sql.slice(0, 60)}... - ${msg.slice(0, 80)}`);
      }
    }
  }

  // Create new tables
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS NewsletterSubscriber (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      active INTEGER DEFAULT 1,
      source TEXT DEFAULT 'blog',
      createdAt TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS Comment (
      id TEXT PRIMARY KEY,
      blogPostId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      authorEmail TEXT,
      content TEXT NOT NULL,
      parentId TEXT,
      liked INTEGER DEFAULT 0,
      flagged INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (blogPostId) REFERENCES BlogPost(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS PostLike (
      id TEXT PRIMARY KEY,
      blogPostId TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (blogPostId) REFERENCES BlogPost(id) ON DELETE CASCADE,
      UNIQUE(blogPostId, sessionId)
    )`,
    `CREATE TABLE IF NOT EXISTS SecurityLog (
      id TEXT PRIMARY KEY,
      ip TEXT,
      action TEXT NOT NULL,
      path TEXT,
      userAgent TEXT,
      blocked INTEGER DEFAULT 0,
      reason TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of createStatements) {
    try {
      await db.$executeRawUnsafe(sql);
      results.push(`OK: Created table`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists')) {
        results.push(`SKIP: Table already exists`);
      } else {
        results.push(`ERR: ${msg.slice(0, 100)}`);
      }
    }
  }

  return NextResponse.json({ results });
}
