# Submission Service Dockerfile - Yarn workspaces, multi-stage build
FROM node:20-alpine AS builder

WORKDIR /workspace

# Root manifests
COPY package.json yarn.lock ./

# Workspace manifests for caching
COPY services/auth-service/package.json services/auth-service/tsconfig.json ./services/auth-service/
COPY services/quiz-service/package.json services/quiz-service/tsconfig.json ./services/quiz-service/
COPY services/ai-service/package.json services/ai-service/tsconfig.json ./services/ai-service/
COPY services/submission-service/package.json services/submission-service/tsconfig.json ./services/submission-service/
COPY services/analytics-service/package.json services/analytics-service/tsconfig.json ./services/analytics-service/

# Install deps using yarn workspaces
RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && yarn --version \
  && yarn install --frozen-lockfile

# Copy source for this service and build
COPY services/submission-service/src ./services/submission-service/src
RUN yarn workspace submission-service build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy runtime manifest and lockfile
COPY services/submission-service/package.json ./package.json
COPY yarn.lock ./yarn.lock

RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && (yarn install --production --frozen-lockfile || yarn install --production) \
  && yarn cache clean

COPY --from=builder /workspace/services/submission-service/dist ./dist

# Expose the port
EXPOSE 3004

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3004

CMD ["yarn", "start"]
