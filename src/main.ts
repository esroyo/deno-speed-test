import { route, serveDir } from '@std/http';
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
    const reqStart = performance.now();
    const reqTime = new Date();
    const url = new URL(req.url);

    const numBytes = url.searchParams.has('bytes')
        ? Math.min(
            config.MAX_BYTES,
            Math.abs(Number(url.searchParams.get('bytes'))),
        )
        : config.DEFAULT_NUM_BYTES;

    const response = new Response(generateContentStream(numBytes));
    const allowOrigin = req.headers.get('origin') || '*';

    // Set CORS and caching headers
    response.headers.set('access-control-allow-origin', allowOrigin);
    response.headers.set('access-control-allow-credentials', 'true');
    response.headers.set('timing-allow-origin', allowOrigin);
    response.headers.set('cache-control', 'no-store, no-transform');
    response.headers.set('content-type', 'application/octet-stream');
    response.headers.set('cf-meta-request-time', reqTime.getTime().toString());
    response.headers.set(
        'access-control-expose-headers',
        'server-timing,cf-meta-request-time',
    );

    // Add Server-Timing header (duration in milliseconds)
    const processingTime = performance.now() - reqStart;
    response.headers.set(
        'server-timing',
        `cfRequestDuration;dur=${processingTime}`,
    );

    return response;
}

// Upload endpoint handler
async function handleUp(req: Request): Promise<Response> {
    const reqStart = performance.now();
    const reqTime = new Date();

    // Consume the request body (for upload testing)
    await req.arrayBuffer();

    const response = new Response('ok');
    const allowOrigin = req.headers.get('origin') || '*';

    // Set CORS headers
    response.headers.set('access-control-allow-origin', allowOrigin);
    response.headers.set('access-control-allow-credentials', 'true');
    response.headers.set('timing-allow-origin', allowOrigin);
    response.headers.set('cf-meta-request-time', reqTime.getTime().toString());
    response.headers.set(
        'access-control-expose-headers',
        'server-timing,cf-meta-request-time',
    );

    // Add Server-Timing header (duration in milliseconds)
    const processingTime = performance.now() - reqStart;
    response.headers.set(
        'server-timing',
        `cfRequestDuration;dur=${processingTime}`,
    );

    return response;
}

const serveDirOptions = {
    fsRoot: `${import.meta.dirname}/../static/`,
    showIndex: true,
    quiet: true,
};

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
    ], (req) => {
        if (req.method === 'GET') {
            return serveDir(req, serveDirOptions);
        }
        return new Response('Not found', { status: 404 });
    }),
} satisfies Deno.ServeDefaultExport;
