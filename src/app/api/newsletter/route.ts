import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sanitizeInput, isValidEmail, detectMaliciousInput, checkRateLimit } from '@/lib/security';

const OWNER_EMAIL = 'koechbrian245@gmail.com';

// POST /api/newsletter - Subscribe to newsletter
export async function POST(request: Request) {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { email, name } = body as { email: string; name?: string };

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    const cleanName = name ? sanitizeInput(name, 100) : '';

    // Check for malicious input
    const emailCheck = detectMaliciousInput(cleanEmail);
    const nameCheck = detectMaliciousInput(cleanName);
    if (!emailCheck.safe || !nameCheck.safe) {
      // Log the attempt
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO SecurityLog (id, ip, action, reason, createdAt) VALUES ('sec_${Date.now()}', '${ip}', 'newsletter_signup', '${!emailCheck.safe ? emailCheck.reason : nameCheck.reason}', datetime('now'))`
        );
      } catch {}
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 });
    }

    // Insert subscriber (with conflict handling)
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO NewsletterSubscriber (id, email, name, active, source, createdAt) VALUES ('${id}', '${cleanEmail}', '${cleanName}', 1, 'blog', datetime('now'))`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE') || msg.includes('duplicate')) {
        return NextResponse.json({ message: 'Already subscribed! Welcome back.' });
      }
      throw e;
    }

    // Log the new subscriber notification
    console.log(`📧 ====== NEW SUBSCRIBER NOTIFICATION ======`);
    console.log(`📧 Email: ${cleanEmail}`);
    console.log(`📧 Name: ${cleanName || 'Not provided'}`);
    console.log(`📧 Notify owner at: ${OWNER_EMAIL}`);
    console.log(`📧 Total subscribers should be updated`);
    console.log(`📧 ==========================================`);

    // Store notification record so the owner can see it
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO SecurityLog (id, ip, action, path, reason, createdAt) VALUES ('ntf_${Date.now()}', '${ip}', 'new_subscriber', '${cleanEmail}', 'Notify: ${OWNER_EMAIL}', datetime('now'))`
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Welcome to AI Toolkit Hub by Daktari Brian! You\'ll receive the latest AI tool insights every week.',
    });
  } catch (e) {
    console.error('Newsletter error:', e);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}

// GET /api/newsletter - Get subscriber stats
export async function GET() {
  try {
    const result = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM NewsletterSubscriber WHERE active = 1`
    ) as Array<{ count: number }>;
    return NextResponse.json({ subscribers: result[0]?.count || 0 });
  } catch {
    return NextResponse.json({ subscribers: 0 });
  }
}
