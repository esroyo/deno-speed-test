#!/usr/bin/env -S deno run --allow-net --allow-read
import { route, serveDir } from '@std/http';
import { parseArgs } from '@std/cli/parse-args';
import { config } from './global.ts';
import { fromFileUrl } from '@std/path';

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

const staticRoot = new URL('../static/', import.meta.url).toString();
const serveDirOptions = {
    fsRoot: staticRoot.startsWith('file:')
        ? fromFileUrl(staticRoot)
        : staticRoot,
    showIndex: true,
    quiet: true,
};

// Main request handler
const serverHandler: { fetch: (req: Request) => Promise<Response> | Response } =
    {
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
    };

// CLI functionality
function startServer(
    options: { port?: number; hostname?: string } = {},
): Deno.HttpServer {
    const { port = 8000, hostname = '0.0.0.0' } = options;

    console.log(`Press Ctrl+C to stop the server`);

    return Deno.serve({
        port,
        hostname,
        onListen: ({ port, hostname }) => {
            console.log(
                `Server successfully started on http://${hostname}:${port}`,
            );
        },
    }, serverHandler.fetch);
}

// Parse command line arguments for CLI usage
function parseCliArgs() {
    const args = parseArgs(Deno.args, {
        string: ['port', 'hostname', 'host'],
        boolean: ['help'],
        alias: {
            'h': 'help',
            'p': 'port',
        },
        default: {
            port: '8000',
            hostname: '0.0.0.0',
        },
    });

    return {
        help: args.help,
        port: parseInt(args.port as string, 10),
        hostname: args.hostname || args.host || '0.0.0.0',
    };
}

function showHelp() {
    console.log(`🦕 Deno Speed Test

USAGE:
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -p, --port <PORT>       Server port (default: 8000)
    --hostname <HOST>       Server hostname (default: 0.0.0.0)

EXAMPLES:
    # Start server on default port 8000
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test

    # Start server on port 3000
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test --port 3000

    # Start server on specific hostname
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test --hostname 127.0.0.1

DESCRIPTION:
    A standalone speed test server that works on networks without internet connectivity.
    Once started, visit http://localhost:<port>/ to access the web interface.
`);
}

// Run as CLI when this module is the main module
if (import.meta.main) {
    const args = parseCliArgs();

    if (args.help) {
        showHelp();
        Deno.exit(0);
    }

    // Validate port number
    if (isNaN(args.port) || args.port < 1 || args.port > 65535) {
        console.error('❌ Invalid port number. Must be between 1 and 65535.');
        Deno.exit(1);
    }

    try {
        startServer({
            port: args.port,
            hostname: args.hostname,
        });
    } catch (error) {
        console.error('❌ Failed to start server:', (error as Error).message);
        Deno.exit(1);
    }
}

// Export for use as a library
export { handleDown, handleUp, serverHandler, startServer };
