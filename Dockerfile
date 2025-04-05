FROM node:20-slim

WORKDIR /app

# Install curl for network testing
RUN apt-get update && apt-get install -y curl

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source files maintaining the workspace structure
COPY examples/magic8ballbot/index.ts ./examples/magic8ballbot/
COPY helpers/index.ts ./helpers/

# Install dependencies
RUN npm init -y && \
    npm install @xmtp/node-sdk@1.0.5 dotenv@^16.4.5 uint8arrays@3.1.0 viem@^2.22.17 tsx@^4.19.2

# Debug environment and network, then start the application
CMD echo "Environment variables present:" && \
    env | grep -E "WALLET_KEY|ENCRYPTION_KEY|XMTP_ENV" | cut -d= -f1 && \
    echo "\nTesting network connectivity..." && \
    curl -v https://dev.xmtp.network && \
    echo "\nStarting application..." && \
    npx tsx examples/magic8ballbot/index.ts 