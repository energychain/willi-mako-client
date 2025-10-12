# syntax=docker/dockerfile:1.6
FROM node:20-alpine

# Install the Willi-Mako CLI globally so the container can be used as a thin wrapper
# around `willi-mako` or as a base image for custom scripts.
RUN npm install -g @stromhaltig/willi-mako-client@latest ts-node typescript && \
    npm cache clean --force

WORKDIR /workspace

# Provide a friendly default. Override the command to execute your own scripts.
ENTRYPOINT ["willi-mako"]
CMD ["--help"]
