import { NextResponse } from "next/server";

/**
 * Serves IndexNow key verification file at `/{INDEXNOW_KEY}.txt` when INDEXNOW_KEY is set.
 * @see https://www.indexnow.org/
 * Does not intercept /robots.txt or /llms.txt.
 */
export function middleware(request) {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/robots.txt" || pathname === "/llms.txt") {
    return NextResponse.next();
  }

  if (pathname === `/${key}.txt`) {
    return new NextResponse(key, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on all paths except Next internals and static assets;
     * handler exits fast unless path matches IndexNow key file.
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon/).*)",
  ],
};
