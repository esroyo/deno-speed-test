import { route } from '@std/http';
import { config } from './global.ts';

// Generate content stream for download endpoint
function generateContentStream(numBytes = 0): ReadableStream<Uint8Array> {
    const totalBytes = Math.max(0, numBytes);
    const chunkSize = 64 * 1024; // 64KB chunks
    let bytesWritten = 0;

    return new ReadableStream({
        pull(controller) {
            if (bytesWritten >= totalBytes) {
                controller.close();
                return;
            }

            const remainingBytes = totalBytes - bytesWritten;
            const currentChunkSize = Math.min(chunkSize, remainingBytes);

            // Create chunk filled with '0' characters
            const chunk = new Uint8Array(currentChunkSize).fill(48); // ASCII '0'
            controller.enqueue(chunk);

            bytesWritten += currentChunkSize;
        },
    });
}

// Download endpoint handler
async function handleDown(req: Request): Promise<Response> {
    const reqTime = new Date();
    const qs = new URL(req.url).searchParams;

    const numBytes = qs.get('bytes')
        ? Math.min(config.MAX_BYTES, Math.abs(Number(qs.get('bytes'))))
        : config.DEFAULT_NUM_BYTES;

    const response = new Response(generateContentStream(numBytes));

    // Set CORS and caching headers
    response.headers.set('access-control-allow-origin', '*');
    response.headers.set('timing-allow-origin', '*');
    response.headers.set('cache-control', 'no-store, no-transform');
    response.headers.set('content-type', 'application/octet-stream');
    response.headers.set('cf-meta-request-time', reqTime.getTime().toString());
    response.headers.set(
        'access-control-expose-headers',
        'cf-meta-request-time',
    );

    // Add Server-Timing header (duration in milliseconds)
    const processingTime = Date.now() - reqTime.getTime();
    response.headers.set(
        'server-timing',
        `cfRequestDuration;dur=${processingTime}`,
    );

    return response;
}

// Upload endpoint handler
async function handleUp(req: Request): Promise<Response> {
    const reqTime = new Date();

    // Consume the request body (for upload testing)
    await req.arrayBuffer();

    const response = new Response('ok');

    // Set CORS headers
    response.headers.set('access-control-allow-origin', '*');
    response.headers.set('timing-allow-origin', '*');
    response.headers.set('cf-meta-request-time', reqTime.getTime().toString());
    response.headers.set(
        'access-control-expose-headers',
        'cf-meta-request-time',
    );

    // Add Server-Timing header (duration in milliseconds)
    const processingTime = Date.now() - reqTime.getTime();
    response.headers.set(
        'server-timing',
        `cfRequestDuration;dur=${processingTime}`,
    );

    return response;
}

// Main request handler
export default {
    fetch: route([
        {
            pattern: new URLPattern({ pathname: '*/__down' }),
            method: 'GET',
            handler: handleDown,
        },
        {
            pattern: new URLPattern({ pathname: '*/__up' }),
            method: 'POST',
            handler: handleUp,
        },
    ], () => new Response('Not Found', { status: 404 })),
} satisfies Deno.ServeDefaultExport;
