FROM node:22-slim

# Install CA certificates for TLS/gRPC connections
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable Corepack for Yarn 4
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package files and install dependencies
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
RUN yarn install --immutable

# Copy source
COPY src ./src
COPY tsconfig.json ./

# The agent is a long-running process, not a web server
CMD ["yarn", "start"]
