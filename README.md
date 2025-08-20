# Deno speed test

[![JSR](https://jsr.io/badges/@esroyo/deno-speed-test)](https://jsr.io/@esroyo/deno-speed-test)
[![JSR Score](https://jsr.io/badges/@esroyo/deno-speed-test/score)](https://jsr.io/@esroyo/deno-speed-test)
[![ci](https://github.com/esroyo/deno-speed-test/actions/workflows/ci.yml/badge.svg)](https://github.com/esroyo/deno-speed-test/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/esroyo/deno-speed-test/graph/badge.svg?token=C01UTG74LH)](https://codecov.io/gh/esroyo/deno-speed-test)

## Motivation

This is a **standalone clone** of Cloudflare's speed test infrastructure,
designed to work on networks without internet connectivity.

Cloudflare's speed test consists of a
[server template](https://github.com/cloudflare/worker-speedtest-template),
[client library](https://github.com/cloudflare/speedtest), and
[web UI](https://speed.cloudflare.com/) (not open-sourced). This project bundles
all components together using Deno and the standard library.

**Main objective**: Enable speed testing on isolated networks such as local
networks, community networks like [Guifi.net](http://guifi.net/), or any
environment without internet access.

**Live demo**: [https://speed-test.deno.dev/](https://speed-test.deno.dev/)

## Usage

### Quick Start

Run directly from JSR:

```bash
# Start server on default port 8000
deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test

# Start server on custom port
deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test --port 3000

# Show help
deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test --help
```

### Install Globally

```bash
# Install globally
deno install --allow-net --allow-read --global jsr:@esroyo/deno-speed-test

# Then run from anywhere
deno-speed-test
deno-speed-test --port 3000
deno-speed-test --help
```

### CLI Options

```
USAGE:
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test [OPTIONS]

OPTIONS:
    -h, --help              Show help message
    -p, --port <PORT>       Server port (default: 8000)
    --hostname <HOST>       Server hostname (default: 0.0.0.0)

EXAMPLES:
    # Start server on default port 8000
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test

    # Start server on port 3000
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test --port 3000

    # Start server on specific hostname
    deno run --allow-net --allow-read jsr:@esroyo/deno-speed-test --hostname 127.0.0.1
```

## Web Interface

Once the server is running, visit `http://localhost:8000/` to access the web
interface and run speed tests.

## API Reference

This server exposes two endpoints designed to support the measuring of bandwidth
and latency from the client side.

### Download

**GET** `/__down` Request binary content of a certain size

| Param | Description                            | Required | Default |
| ----- | -------------------------------------- | :------: | :-----: |
| bytes | The size of the response body in bytes |    no    |    0    |

Example: `/__down?bytes=10000`

### Upload

**POST** `/__up` Receive content posted to the server

The content is discarded by the endpoint. A response is sent once all the
content has been received from the client.

No query string parameters.

## Configuration

You can configure the server using environment variables:

- `DEFAULT_NUM_BYTES`: Default number of bytes for download endpoint
  (default: 0)
- `MAX_BYTES`: Maximum number of bytes allowed (default: 100,000,000)

Create a `.env` file in your project root:

```env
DEFAULT_NUM_BYTES=1000
MAX_BYTES=50000000
```

## Permissions

The following Deno permissions are required:

- `--allow-net`: For HTTP server functionality
- `--allow-read`: For serving static files and reading configuration
- `--allow-sys`: For environment variable access

### Local Development

```bash
# Clone the repository
git clone https://github.com/esroyo/deno-speed-test.git
cd deno-speed-test

# Start development server
deno task dev

# Run tests
deno task test

# Format code
deno task fmt
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
