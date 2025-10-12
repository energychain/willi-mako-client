# Docker Quickstart for Willi-Mako Client

This folder contains a minimal Docker setup that wraps the `willi-mako-client` CLI. It is designed for developers who prefer to run the tooling in an isolated container and for CI/CD pipelines.

## Build the image

```bash
docker build -t willi-mako-cli .
```

## Run the CLI inside the container

Provide your Willi-Mako token as an environment variable when starting the container. The container defaults to executing the CLI, so you can run any command by appending it after the image name.

```bash
docker run --rm \
  -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" \
  willi-mako-cli openapi
```

## Execute custom scripts

Mount your project directory and override the entrypoint to run TypeScript or JavaScript files with access to the SDK. The image contains `ts-node` and `typescript` for convenience.

```bash
docker run --rm \
  -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" \
  -v "$(pwd)/scripts:/workspace/scripts:ro" \
  --entrypoint node \
  willi-mako-cli --loader ts-node/esm /workspace/scripts/job.ts
```

> **Hint:** If you need additional npm packages, extend this Dockerfile and install them in a derived image.

## docker-compose example

Add the snippet below to your project to spin up a reusable CLI service. The `command` can be changed to any desired operation (e.g., scheduled artifact exports).

```yaml
services:
  willi-mako:
    image: willi-mako-cli
    build: .
    environment:
      - WILLI_MAKO_TOKEN=${WILLI_MAKO_TOKEN}
    entrypoint: ["willi-mako"]
    command: ["--help"]
```

Start with:

```bash
docker compose run --rm willi-mako openapi
```

Adjust `command` to automate workflows such as `tools run-node-script` or `artifacts create`.
