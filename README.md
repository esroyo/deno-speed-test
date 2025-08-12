# Deno speed test

[![codecov](https://codecov.io/gh/esroyo/deno-speed-test/graph/badge.svg?token=C01UTG74LH)](https://codecov.io/gh/esroyo/deno-speed-test)

## Motivation

This is a **standalone clone** of Cloudflare's speed test infrastructure, designed to work on networks without internet connectivity.

Cloudflare's speed test consists of a [server template](https://github.com/cloudflare/worker-speedtest-template), [client library](https://github.com/cloudflare/speedtest), and [web UI](https://speed.cloudflare.com/) (not open-sourced). This project bundles all components together using Deno and the standard library.

**Main objective**: Enable speed testing on isolated networks such as local networks, community networks like [Guifi.net](http://guifi.net/), or any environment without internet access.

**Usage**: Run `deno task dev` to start the server with a simple web interface at `http://localhost:8000`.

**Live demo**: [https://speed-test.deno.dev/](https://speed-test.deno.dev/)

### API Reference

This server exposes two endpoints designed to support the measuring of bandwidth and latency from the client side.

#### Download

**GET** `/__down` Request binary content of a certain size

| Param | Description                            | Required | Default |
| ----- | -------------------------------------- | :------: | :-----: |
| bytes | The size of the response body in bytes |    no    |    0    |

Example: `/__down?bytes=10000`

#### Upload

**POST** `/__up` Receive content posted to the server

The content is discarded by the endpoint. A response is sent once all the content has been received from the client.

No query string parameters.
