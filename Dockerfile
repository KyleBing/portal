FROM node:18-alpine

# Install Python and build tools for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Set environment variables for Docker
ENV NODE_ENV=docker
ENV DOCKER_ENV=true

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the TypeScript application
RUN yarn build

# Create a startup script to rebuild bcrypt at runtime (use printf for LF)
RUN printf '#!/bin/sh\nnpm rebuild bcrypt --build-from-source\nexec node ./dist/bin/portal.js\n' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Start the application
CMD ["/app/start.sh"]
