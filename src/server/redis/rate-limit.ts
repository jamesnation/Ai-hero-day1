import { setTimeout } from "node:timers/promises";
import { redis } from "./redis";

// TypeScript interface for configuring the rate limit
export interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Optional prefix for the Redis key
  keyPrefix?: string;
  // Optional: Maximum number of retries before failing
  maxRetries?: number;
}

// The result returned by checkRateLimit
export interface RateLimitResult {
  allowed: boolean; // Is the request allowed?
  remaining: number; // How many requests left in this window?
  resetTime: number; // When does the window reset? (Unix timestamp)
  totalHits: number; // How many requests have been made in this window?
  retry: () => Promise<boolean>; // Function to wait and retry
}

/**
 * Records a new request in the rate limit window (increments the counter)
 */
export async function recordRateLimit({
  windowMs,
  keyPrefix = "rate_limit",
}: Pick<RateLimitConfig, "windowMs" | "keyPrefix">): Promise<void> {
  const now = Date.now();
  // Calculate the start of the current window
  const windowStart = Math.floor(now / windowMs) * windowMs;
  // Create a unique key for this window
  const key = `${keyPrefix}:${windowStart}`;

  try {
    // Use a Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(key); // Increment the counter
    pipeline.expire(key, Math.ceil(windowMs / 1000)); // Set expiration
    const results = await pipeline.exec();
    if (!results) {
      throw new Error("Redis pipeline execution failed");
    }
  } catch (error) {
    console.error("Rate limit recording failed:", error);
    throw error;
  }
}

/**
 * Checks if a request is allowed under the current rate limit (does NOT increment the counter)
 */
export async function checkRateLimit({
  maxRequests,
  windowMs,
  keyPrefix = "rate_limit",
  maxRetries = 3,
}: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    // Get the current count from Redis
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;
    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = windowStart + windowMs;
    let retryCount = 0;

    // Retry function waits for the window to reset, then checks again
    const retry = async (): Promise<boolean> => {
      if (!allowed) {
        const waitTime = resetTime - Date.now();
        if (waitTime > 0) {
          await setTimeout(waitTime);
        }
        // Check again after waiting
        const retryResult = await checkRateLimit({
          maxRequests,
          windowMs,
          keyPrefix,
          maxRetries,
        });
        if (!retryResult.allowed) {
          if (retryCount >= maxRetries) {
            return false;
          }
          retryCount++;
          return await retryResult.retry();
        }
        return true;
      }
      return true;
    };

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: count,
      retry,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open: allow the request if Redis fails
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowStart + windowMs,
      totalHits: 0,
      retry: async () => true,
    };
  }
} 