

/**
 * Fetch with retry logic for Durable Objects.
 * Handles temporary failures and recreates the stub on error as strictly recommended by Cloudflare.
 * 
 * @param getStub Factory function to get a fresh stub (e.g. () => env.MY_DO.get(id))
 * @param request Request to send
 * @param maxRetries Maximum number of retries (default 3)
 */
export async function fetchWithRetry(
    getStub: () => DurableObjectStub,
    request: Request,
    maxRetries: number = 3
): Promise<Response> {
    let attempt = 0;

    // Clone the request body if it exists, as it might be consumed
    const bodyBuffer = request.body ? await request.clone().arrayBuffer() : null;

    while (true) {
        try {
            // Always get a fresh stub on each attempt
            const stub = getStub();

            // Reconstruct request with body if needed (bodies are one-time use)
            const reqToSend = bodyBuffer
                ? new Request(request.url, {
                    method: request.method,
                    headers: request.headers,
                    body: bodyBuffer,
                    // copying other potentially important request properties
                    redirect: request.redirect,
                    signal: request.signal,
                })
                : new Request(request.url, {
                    method: request.method,
                    headers: request.headers,
                    redirect: request.redirect,
                    signal: request.signal,
                });

            return await stub.fetch(reqToSend);
        } catch (err: any) {
            attempt++;

            // Check if we should retry
            // Cloudflare recommends retrying on network errors or specific internal errors
            // A simple heuristic is to retry on all errors for id-bound DOs as stubs can break
            if (attempt > maxRetries) {
                throw err;
            }

            // Exponential backoff with jitter
            // Math.min(20000, 100 * 2^attempt) + jitter
            const backoffMs = Math.min(20000, 100 * Math.pow(2, attempt)) + (Math.random() * 100);

            console.warn(`[fetchWithRetry] Attempt ${attempt} failed, retrying in ${Math.round(backoffMs)}ms. Error:`, err);

            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
}
