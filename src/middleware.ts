import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: "https://your-upstash-url.upstash.io", // Replace with your actual Redis URL
  token: "0a2f7e11-83fa-4844-9e1a-0a98204e001a", // Your hardcoded token
});

export async function middleware(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const key = `rate-limit:${ip}`;
    console.log("Incoming request from IP:", ip);

    const start = Date.now();
    const requests = await redis.incr(key);
    const end = Date.now();
    console.log(`Redis operation took ${end - start}ms`);

    if (requests === 1) {
      const expireResult = await redis.expire(key, 60);
      console.log("Expiration set:", expireResult);
    }

    if (requests > 5) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests.",
          message: "You’ve reached the limit of 5 requests per minute. Try again later.",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Rate limiting error:", error);
    return NextResponse.next(); // Fail-safe to allow the request
  }
}

export const config = {
  matcher: ["/api/:path*"], // Apply middleware only to API routes
};
