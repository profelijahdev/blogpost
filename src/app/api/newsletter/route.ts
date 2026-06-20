import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sanitizeInput, isValidEmail, detectMaliciousInput, checkRateLimit } from '@/lib/security';
import { sendNotificationEmail } from '@/lib/ai-service';

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
        await db.securityLog.create({
          data: {
            ip,
            action: 'newsletter_signup_blocked',
            reason: !emailCheck.safe ? emailCheck.reason : nameCheck.reason,
          },
        });
      } catch {}
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 });
    }

    // Check if already subscribed
    const existing = await db.newsletterSubscriber.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed! Welcome back.' });
    }

    // Create subscriber
    await db.newsletterSubscriber.create({
      data: {
        email: cleanEmail,
        name: cleanName || null,
        source: 'blog',
        active: true,
      },
    });

    // Send notification email to owner
    await sendNotificationEmail('subscriber', {
      email: cleanEmail,
      name: cleanName,
    });

    return NextResponse.json({
      success: true,
      message: "Welcome to AI Toolkit Hub by Daktari Brian! You'll receive the latest AI tool insights every week.",
    });
  } catch (e) {
    console.error('Newsletter error:', e);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}

// GET /api/newsletter - Get subscriber stats
export async function GET() {
  try {
    const count = await db.newsletterSubscriber.count({
      where: { active: true },
    });
    return NextResponse.json({ subscribers: count });
  } catch {
    return NextResponse.json({ subscribers: 0 });
  }
}
