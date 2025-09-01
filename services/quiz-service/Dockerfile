FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* ./

RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

RUN yarn build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership of the app directory
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3002

# Start the application
CMD ["node", "dist/index.js"]
