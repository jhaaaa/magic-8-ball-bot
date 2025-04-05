FROM node:20-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl

# Set working directory
WORKDIR /app

# Enable Corepack and install the correct Yarn version
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package files
COPY package.json yarn.lock ./

# Copy source files maintaining the workspace structure
COPY src/index.ts ./src/
COPY helpers/index.ts ./helpers/
COPY tsconfig.json ./

# Install dependencies
RUN yarn install

# Build the project
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["yarn", "start"] 