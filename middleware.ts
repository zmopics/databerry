// reference https://github.com/vercel/platforms/blob/main/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
  ],
};

const appDomains = [
  'localhost:3000',
  'databerry.ai',
  'chaindesk.ai',
  'app.chaindesk.ai',
  'chatbotgpt.ai',
];

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  const hostname = req.headers.get('host')!;

  // Get the pathname of the request (e.g. /, /about, /blog/first-post)
  const path = url.pathname;

  if (!appDomains.includes(hostname) && path === '/') {
    // rewrite everything else to `/[domain]/[path] dynamic route
    return NextResponse.rewrite(new URL(`/agents/${hostname}/page`, req.url));
  }
}
