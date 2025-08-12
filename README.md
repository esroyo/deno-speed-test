# Deno speed test

Similar to https://github.com/cloudflare/worker-speedtest-template

Isolate for measuring download / upload connection speed from the client side, using the [Performance Timing API](https://w3c.github.io/perf-timing-primer/).

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
