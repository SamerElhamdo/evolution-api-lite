# Dokploy Deployment Guide

This guide explains how to deploy Evolution API Lite on Dokploy using the provided docker-compose file.

## Prerequisites

1. Dokploy installed and running
2. Docker and Docker Compose installed on your server
3. Cloudflare R2 account (optional, for session storage)

## Quick Start

### 1. Import the Docker Compose File

1. **Open Dokploy Dashboard**
   - Navigate to your Dokploy instance
   - Go to "Applications" or "Services"

2. **Create New Application**
   - Click "New Application" or "Import"
   - Select "Docker Compose"
   - Upload or paste the contents of `docker-compose.dokploy.yaml`

3. **Build Configuration**
   - By default, the compose file builds from local code (your updated code)
   - The image will be built using the `Dockerfile` in the project root
   - If you want to use a pre-built image instead, see "Using Pre-built Image" section below

4. **Configure Environment Variables**
   - Dokploy will show all environment variables from the compose file
   - Set the required values (see Configuration section below)

### Using Pre-built Image (Optional)

If you prefer to use the pre-built image from Docker Hub instead of building locally:

1. Edit `docker-compose.dokploy.yaml`
2. Comment out the `build` section:
   ```yaml
   # build:
   #   context: .
   #   dockerfile: Dockerfile
   ```
3. Uncomment the image line:
   ```yaml
   image: atendai/evolution-api-lite:latest
   ```

**Note**: Using the local build is recommended if you've made custom changes to the code.

### 2. Required Environment Variables

#### Minimal Configuration

```env
# Server
SERVER_PORT=8080
SERVER_URL=https://your-domain.com

# Authentication (IMPORTANT: Change this!)
AUTHENTICATION_API_KEY=your-secure-api-key-here

# Database
DATABASE_CONNECTION_URI=postgresql://user:pass@postgres:5432/evolution
POSTGRES_USER=user
POSTGRES_PASSWORD=strong-password-here
POSTGRES_DB=evolution

# Redis (uses internal service)
CACHE_REDIS_URI=redis://redis:6379
CACHE_REDIS_ENABLED=true
```

#### With R2 Session Storage (Recommended)

```env
# ... all above variables ...

# R2 Configuration
R2_SESSION_STORAGE_ENABLED=true
S3_ENABLED=true
S3_ACCESS_KEY=your_r2_access_key_id
S3_SECRET_KEY=your_r2_secret_access_key
S3_ENDPOINT=your_account_id.r2.cloudflarestorage.com
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_USE_SSL=true
```

#### With External Database (Optional)

If you want to use an external PostgreSQL database instead of the containerized one:

```env
# External Database
DATABASE_CONNECTION_URI=postgresql://user:password@external-db-host:5432/evolution
```

Then remove or disable the `postgres` service from the compose file.

#### With External Redis (Optional)

If you want to use an external Redis:

```env
# External Redis
CACHE_REDIS_URI=redis://external-redis-host:6379
CACHE_REDIS_ENABLED=true
```

Then remove or disable the `redis` service from the compose file.

### 3. Deploy

1. **Review Configuration**
   - Check all environment variables are set correctly
   - Verify resource limits match your server capacity

2. **Deploy Application**
   - Click "Deploy" or "Start"
   - Monitor the deployment logs

3. **Verify Health**
   - Check health status in Dokploy dashboard
   - Health check endpoint: `http://your-server:8080/instance/fetchInstances`

## Configuration Details

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `8080` | Port the API listens on |
| `SERVER_URL` | `http://localhost:8080` | Public URL of your API |
| `SERVER_DISABLE_DOCS` | `false` | Disable API documentation |
| `SERVER_DISABLE_MANAGER` | `false` | Disable management UI |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTHENTICATION_API_KEY` | `BQYHJGJHJ` | **CHANGE THIS** - API key for authentication |
| `AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES` | `false` | Expose instances in fetch endpoint |

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PROVIDER` | `postgresql` | Database provider (postgresql/mysql) |
| `DATABASE_CONNECTION_URI` | `postgresql://user:pass@postgres:5432/evolution` | Database connection string |
| `DATABASE_SAVE_DATA_INSTANCE` | `true` | Save instance data to database |
| `DATABASE_SAVE_DATA_NEW_MESSAGE` | `true` | Save new messages to database |

### Redis Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_REDIS_ENABLED` | `true` | Enable Redis caching |
| `CACHE_REDIS_URI` | `redis://redis:6379` | Redis connection URI |
| `CACHE_REDIS_SAVE_INSTANCES` | `false` | Save instances to Redis |

### R2 Session Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `R2_SESSION_STORAGE_ENABLED` | `false` | Enable R2 session storage |
| `S3_ENABLED` | `false` | Enable S3-compatible storage (required for R2) |
| `S3_ACCESS_KEY` | - | R2 Access Key ID |
| `S3_SECRET_KEY` | - | R2 Secret Access Key |
| `S3_ENDPOINT` | - | R2 endpoint (account_id.r2.cloudflarestorage.com) |
| `S3_BUCKET` | - | R2 bucket name |
| `S3_REGION` | `auto` | Region (always `auto` for R2) |
| `S3_USE_SSL` | `true` | Use HTTPS for R2 |

## Features

### Health Checks

All services include health checks for automatic monitoring:

- **Evolution API**: HTTP check on `/instance/fetchInstances`
- **PostgreSQL**: `pg_isready` check
- **Redis**: `redis-cli ping` check

### Resource Limits

Default resource limits (adjustable in Dokploy):

- **Evolution API**: 2 CPU cores, 2GB RAM
- **PostgreSQL**: 1 CPU core, 1GB RAM
- **Redis**: 0.5 CPU cores, 512MB RAM

### Automatic Restart

All services are configured with `restart: unless-stopped` for automatic recovery.

## Updating

### Update Application (Local Build)

Since the compose file uses local build, updating requires rebuilding:

1. **Push Your Code Changes**
   - Ensure your updated code is available in the build context
   - If using Git, pull the latest changes

2. **Rebuild in Dokploy**
   - In Dokploy, go to your application
   - Click "Rebuild" or "Build Image"
   - Dokploy will rebuild the image from your local code

3. **Restart Services**
   - Services will automatically restart with the newly built image

### Manual Update (Local Build)

```bash
# Rebuild and restart
docker-compose -f docker-compose.dokploy.yaml build --no-cache evolution-api
docker-compose -f docker-compose.dokploy.yaml up -d
```

### Using Pre-built Image Updates

If you switch to using the pre-built image, updates work differently:

```bash
# Pull latest image and restart
docker-compose -f docker-compose.dokploy.yaml pull
docker-compose -f docker-compose.dokploy.yaml up -d
```

## Monitoring

### Logs

View logs in Dokploy dashboard:
- Application logs show API activity
- Database logs show PostgreSQL activity
- Redis logs show cache activity

### Metrics

Monitor resource usage:
- CPU usage
- Memory usage
- Network traffic
- Disk I/O

## Troubleshooting

### Service Won't Start

1. **Check Logs**
   - View service logs in Dokploy
   - Look for error messages

2. **Verify Environment Variables**
   - Ensure all required variables are set
   - Check for typos in connection strings

3. **Check Resource Limits**
   - Verify your server has enough resources
   - Adjust limits if needed

### Database Connection Issues

1. **Check Connection String**
   - Verify `DATABASE_CONNECTION_URI` is correct
   - Ensure credentials match PostgreSQL settings

2. **Check Network**
   - Verify services are on the same network
   - Check if PostgreSQL is healthy

### Redis Connection Issues

1. **Check Connection URI**
   - Verify `CACHE_REDIS_URI` is correct
   - Ensure Redis is healthy

2. **Fallback to Local Cache**
   - Set `CACHE_LOCAL_ENABLED=true`
   - Set `CACHE_REDIS_ENABLED=false`

### R2 Session Storage Issues

1. **Verify Credentials**
   - Check R2 Access Key and Secret Key
   - Verify endpoint format: `account_id.r2.cloudflarestorage.com`

2. **Check Bucket**
   - Ensure bucket exists
   - Verify bucket name matches `S3_BUCKET`

3. **Fallback to Database**
   - Set `R2_SESSION_STORAGE_ENABLED=false`
   - Set `DATABASE_SAVE_DATA_INSTANCE=true`

## Backup

### Database Backup

```bash
# Backup PostgreSQL data
docker exec evolution-postgres pg_dump -U user evolution > backup.sql

# Restore
docker exec -i evolution-postgres psql -U user evolution < backup.sql
```

### R2 Backup

If using R2, sessions are automatically backed up. To manually backup:

1. Use Cloudflare R2 dashboard
2. Export bucket contents
3. Or use R2 API

## Security Best Practices

1. **Change Default API Key**
   - Always change `AUTHENTICATION_API_KEY` from default
   - Use a strong, randomly generated key

2. **Use Strong Database Passwords**
   - Generate strong passwords for PostgreSQL
   - Don't use default credentials in production

3. **Enable SSL/TLS**
   - Use HTTPS for `SERVER_URL`
   - Enable SSL for R2 (`S3_USE_SSL=true`)

4. **Restrict Network Access**
   - Don't expose PostgreSQL/Redis ports publicly
   - Use firewall rules to restrict access

5. **Regular Updates**
   - Keep images updated to latest versions
   - Monitor for security patches

## Support

For issues or questions:
- Check [Evolution API Documentation](https://doc.evolution-api.com)
- Join [Discord Community](https://evolution-api.com/discord)
- Review [R2 Setup Guide](./R2_SETUP.md) for session storage

