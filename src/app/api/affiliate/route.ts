import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/affiliate - Get affiliate programs info
export async function GET() {
  const programs = [
    { name: 'Jasper AI', rate: '25-30% recurring', category: 'AI Writing', url: 'https://jasper.ai', cookie: '30 days', minPayout: '$25' },
    { name: 'GetResponse', rate: '33% recurring', category: 'Email Marketing', url: 'https://getresponse.com', cookie: '120 days', minPayout: '$50' },
    { name: 'Surfer SEO', rate: '10-20% recurring', category: 'SEO Tools', url: 'https://surferseo.com', cookie: '30 days', minPayout: '$50' },
    { name: 'Writesonic', rate: '30% recurring', category: 'AI Writing', url: 'https://writesonic.com', cookie: '30 days', minPayout: '$25' },
    { name: 'CustomGPT', rate: '15-20% recurring', category: 'AI Chatbot', url: 'https://customgpt.ai', cookie: '30 days', minPayout: '$50' },
    { name: 'HubSpot', rate: 'Up to $1,000/referral', category: 'CRM/Marketing', url: 'https://hubspot.com', cookie: '90 days', minPayout: '$50' },
    { name: 'Canva', rate: 'Up to $36/subscription', category: 'Design', url: 'https://canva.com', cookie: '30 days', minPayout: '$50' },
    { name: 'Notion', rate: 'Up to $10/referral', category: 'Productivity', url: 'https://notion.so', cookie: '30 days', minPayout: '$10' },
    { name: 'Copy.ai', rate: '25% recurring', category: 'AI Writing', url: 'https://copy.ai', cookie: '30 days', minPayout: '$25' },
    { name: 'Semrush', rate: '$200/subscription', category: 'SEO Tools', url: 'https://semrush.com', cookie: '120 days', minPayout: '$10' },
    { name: 'Ahrefs', rate: '20% recurring', category: 'SEO Tools', url: 'https://ahrefs.com', cookie: '30 days', minPayout: '$50' },
    { name: 'Reclaim.ai', rate: '10-50% recurring', category: 'Productivity', url: 'https://reclaim.ai', cookie: '30 days', minPayout: '$25' },
  ];
  
  return NextResponse.json({ programs });
}
