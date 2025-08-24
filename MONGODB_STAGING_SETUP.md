# MongoDB Staging Database Setup Guide

You have a few options for setting up a staging MongoDB database:

## Option 1: Separate Database in Same Cluster (Easiest)

Use your existing MongoDB cluster but with a different database name:

**Production MongoDB URI:**
```
mongodb+srv://jaiminpate03042005:Huiv2qfGO5zT89Ku@cluster0.nlftetv.mongodb.net/quizzer-prod?retryWrites=true&w=majority&appName=Cluster0
```

**Staging MongoDB URI:**
```
mongodb+srv://jaiminpate03042005:Huiv2qfGO5zT89Ku@cluster0.nlftetv.mongodb.net/quizzer-staging?retryWrites=true&w=majority&appName=Cluster0
```

Just add `/quizzer-staging` before the `?` in your connection string.

## Option 2: Completely Separate Cluster (Recommended for Production)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign in with your account
3. Create a new cluster:
   - Click "Build a Database"
   - Choose "M0 Sandbox" (free tier)
   - Name it "quizzer-staging"
   - Choose same region as your production cluster
4. Create a database user (or use same credentials)
5. Get the new connection string

## Option 3: Use Same Database (Quick Setup)

For quick testing, you can use the same MongoDB URI for both production and staging:

```bash
MONGODB_URI_STAGING="mongodb+srv://jaiminpate03042005:Huiv2qfGO5zT89Ku@cluster0.nlftetv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
```

**⚠️ Warning:** This means staging and production will share the same data!

## Recommended: Option 1

For your setup, I recommend **Option 1** - using the same cluster but different database names:

- **Production**: `quizzer-prod` database
- **Staging**: `quizzer-staging` database

This way you get data separation without needing to manage multiple clusters.

## Redis Staging Setup

For Redis, you can either:

1. **Use same Redis instance** (simpler):
   ```bash
   REDIS_URL_STAGING="redis://:BlreHUI6h8PwQBAv7POfAtY8R6A7lVJn@redis-11634.c330.asia-south1-1.gce.redns.redis-cloud.com:11634"
   ```

2. **Create separate Redis database** (use different database number):
   ```bash
   REDIS_URL_STAGING="redis://:BlreHUI6h8PwQBAv7POfAtY8R6A7lVJn@redis-11634.c330.asia-south1-1.gce.redns.redis-cloud.com:11634/1"
   ```
   (Note the `/1` at the end - this uses Redis database 1 instead of 0)

## Final GitHub Secrets for Databases

```bash
# Production (existing)
MONGODB_URI="mongodb+srv://jaiminpate03042005:Huiv2qfGO5zT89Ku@cluster0.nlftetv.mongodb.net/quizzer-prod?retryWrites=true&w=majority&appName=Cluster0"
REDIS_URL="redis://:BlreHUI6h8PwQBAv7POfAtY8R6A7lVJn@redis-11634.c330.asia-south1-1.gce.redns.redis-cloud.com:11634"

# Staging (new)
MONGODB_URI_STAGING="mongodb+srv://jaiminpate03042005:Huiv2qfGO5zT89Ku@cluster0.nlftetv.mongodb.net/quizzer-staging?retryWrites=true&w=majority&appName=Cluster0"
REDIS_URL_STAGING="redis://:BlreHUI6h8PwQBAv7POfAtY8R6A7lVJn@redis-11634.c330.asia-south1-1.gce.redns.redis-cloud.com:11634/1"
```
