import { assert, assertEquals, assertExists } from 'jsr:@std/assert';
import { config } from './global.ts';
import { serverHandler } from './main.ts';

const { fetch: handler } = serverHandler;

// Test helper to read stream content
async function readStreamContent(
    stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

Deno.test('Download endpoint - default bytes (0)', async () => {
    const req = new Request('http://localhost:8000/__down');
    const response = await handler(req);

    assertEquals(response.status, 200);
    assertEquals(
        response.headers.get('content-type'),
        'application/octet-stream',
    );
    assertEquals(response.headers.get('access-control-allow-origin'), '*');
    assertEquals(
        response.headers.get('cache-control'),
        'no-store, no-transform',
    );
    assertExists(response.headers.get('server-timing'));
    assertExists(response.headers.get('cf-meta-request-time'));

    const content = await readStreamContent(response.body!);
    assertEquals(content.length, 0);
});

Deno.test('Download endpoint - with specific bytes', async () => {
    const req = new Request('http://localhost:8000/__down?bytes=1000');
    const response = await handler(req);

    assertEquals(response.status, 200);

    const content = await readStreamContent(response.body!);
    assertEquals(content.length, 1000);

    // Check that all bytes are '0' (ASCII 48)
    for (let i = 0; i < content.length; i++) {
        assertEquals(content[i], 48);
    }
});

Deno.test('Download endpoint - with measId parameter', async () => {
    const req = new Request(
        'http://localhost:8000/__down?measId=123456&bytes=500',
    );
    const response = await handler(req);

    assertEquals(response.status, 200);

    const content = await readStreamContent(response.body!);
    assertEquals(content.length, 500);
});

Deno.test('Download endpoint - maximum bytes limit', async () => {
    const req = new Request('http://localhost:8000/__down?bytes=999999999999');
    const response = await handler(req);

    assertEquals(response.status, 200);

    // Should be limited to MAX_BYTES (1e8)
    const content = await readStreamContent(response.body!);
    assertEquals(content.length, config.MAX_BYTES);
});

Deno.test('Download endpoint - negative bytes', async () => {
    const req = new Request('http://localhost:8000/__down?bytes=-500');
    const response = await handler(req);

    assertEquals(response.status, 200);

    // Math.abs should convert -500 to 500
    const content = await readStreamContent(response.body!);
    assertEquals(content.length, 500);
});

Deno.test('Upload endpoint - basic functionality', async () => {
    const testData = '0'.repeat(1000);
    const req = new Request('http://localhost:8000/__up', {
        method: 'POST',
        body: testData,
        headers: { 'Content-Type': 'text/plain' },
    });

    const response = await handler(req);

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('access-control-allow-origin'), '*');
    assertExists(response.headers.get('server-timing'));
    assertExists(response.headers.get('cf-meta-request-time'));

    const responseText = await response.text();
    assertEquals(responseText, 'ok');
});

Deno.test('Upload endpoint - with measId parameter', async () => {
    const testData = 'test upload data';
    const req = new Request('http://localhost:8000/__up?measId=987654', {
        method: 'POST',
        body: testData,
    });

    const response = await handler(req);

    assertEquals(response.status, 200);
    const responseText = await response.text();
    assertEquals(responseText, 'ok');
});

Deno.test('Upload endpoint - large payload', async () => {
    const largeData = '0'.repeat(10000);
    const req = new Request('http://localhost:8000/__up', {
        method: 'POST',
        body: largeData,
    });

    const response = await handler(req);

    assertEquals(response.status, 200);
    const responseText = await response.text();
    assertEquals(responseText, 'ok');
});

Deno.test('404 for unknown endpoints', async () => {
    const req = new Request('http://localhost:8000/unknown');
    const response = await handler(req);

    assertEquals(response.status, 404);
});

Deno.test('404 for wrong HTTP method on download', async () => {
    const req = new Request('http://localhost:8000/__down', { method: 'POST' });
    const response = await handler(req);

    assertEquals(response.status, 404);
});

Deno.test('404 for wrong HTTP method on upload', async () => {
    const req = new Request('http://localhost:8000/__up', { method: 'GET' });
    const response = await handler(req);

    assertEquals(response.status, 404);
});

Deno.test('CORS headers are present', async () => {
    const downReq = new Request('http://localhost:8000/__down?bytes=100');
    const downResponse = await handler(downReq);

    assertEquals(downResponse.headers.get('access-control-allow-origin'), '*');
    assertEquals(downResponse.headers.get('timing-allow-origin'), '*');
    assertExists(downResponse.headers.get('access-control-expose-headers'));

    const upReq = new Request('http://localhost:8000/__up', {
        method: 'POST',
        body: 'test',
    });
    const upResponse = await handler(upReq);

    assertEquals(upResponse.headers.get('access-control-allow-origin'), '*');
    assertEquals(upResponse.headers.get('timing-allow-origin'), '*');
});

Deno.test('Server-Timing header format', async () => {
    const req = new Request('http://localhost:8000/__down?bytes=100');
    const response = await handler(req);

    const serverTiming = response.headers.get('server-timing');
    assertExists(serverTiming);
    assert(serverTiming.includes('cfRequestDuration;dur='));

    // Extract the duration value
    const match = serverTiming.match(/cfRequestDuration;dur=(\d+(?:\.\d+)?)/);
    assertExists(match);
    const duration = parseFloat(match[1]);
    assert(duration >= 0);
});

Deno.test('Content stream works correctly for large files', async () => {
    const req = new Request('http://localhost:8000/__down?bytes=1000000'); // 1MB
    const response = await handler(req);

    assertEquals(response.status, 200);

    const content = await readStreamContent(response.body!);
    assertEquals(content.length, 1000000);

    // Verify first and last bytes are '0'
    assertEquals(content[0], 48);
    assertEquals(content[content.length - 1], 48);
});

Deno.test('cf-meta-request-time is valid timestamp', async () => {
    const req = new Request('http://localhost:8000/__down');
    const response = await handler(req);

    const timestamp = response.headers.get('cf-meta-request-time');
    assertExists(timestamp);

    const time = parseInt(timestamp, 10);
    assert(!isNaN(time));
    assert(time > 0);

    // Should be close to current time (within 1 second)
    const now = Date.now();
    assert(Math.abs(now - time) < 1000);
});
