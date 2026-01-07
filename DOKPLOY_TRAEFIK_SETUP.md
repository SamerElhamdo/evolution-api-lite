# Dokploy Traefik Configuration Guide

This guide explains how to configure Evolution API Lite with Traefik reverse proxy in Dokploy.

## Problem Solved

1. ✅ **Port Conflict**: Removed direct port mapping to avoid port 8080 conflicts
2. ✅ **Domain Configuration**: Added Traefik labels for automatic domain routing

## Configuration Steps

### 1. Update Domain in Traefik Labels

In Dokploy, when you import `docker-compose.dokploy.yaml`, you need to:

1. **Find the Traefik labels** in the compose file
2. **Replace the domain** in these lines:
   ```yaml
   - "traefik.http.routers.evolution-api-secure.rule=Host(`evolution-api.localhost`)"
   - "traefik.http.routers.evolution-api.rule=Host(`evolution-api.localhost`)"
   ```

   Replace `evolution-api.localhost` with your actual domain, for example:
   ```yaml
   - "traefik.http.routers.evolution-api-secure.rule=Host(`api.example.com`)"
   - "traefik.http.routers.evolution-api.rule=Host(`api.example.com`)"
   ```

### 2. Configure Environment Variables

Set these in Dokploy:

```env
# Your domain
DOMAIN=api.yourdomain.com

# Server URL (should match your domain)
SERVER_URL=https://api.yourdomain.com

# No need for SERVER_PORT when using Traefik
```

### 3. Network Configuration (if needed)

If Traefik is on a different network, you may need to:

1. **Find Traefik's network name** in Dokploy
2. **Update the compose file** to include Traefik network:

```yaml
networks:
  evolution-net:
    driver: bridge
  traefik-public:
    external: true  # If Traefik uses external network

# In evolution-api service:
networks:
  - evolution-net
  - traefik-public  # Uncomment this line
```

### 4. Deploy

1. **Save** the compose file in Dokploy
2. **Set environment variables** (especially `DOMAIN` and `SERVER_URL`)
3. **Deploy** the application

## Traefik Labels Explanation

### Current Configuration

```yaml
labels:
  # Enable Traefik
  - "traefik.enable=true"
  
  # HTTP Router (redirects to HTTPS)
  - "traefik.http.routers.evolution-api.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.evolution-api.entrypoints=web"
  
  # HTTPS Router (main router)
  - "traefik.http.routers.evolution-api-secure.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.evolution-api-secure.entrypoints=websecure"
  - "traefik.http.routers.evolution-api-secure.tls=true"
  - "traefik.http.routers.evolution-api-secure.tls.certresolver=letsencrypt"
  
  # Service (points to container port 8080)
  - "traefik.http.services.evolution-api.loadbalancer.server.port=8080"
```

### Customization Options

#### Add Authentication Middleware

```yaml
- "traefik.http.routers.evolution-api-secure.middlewares=auth@file"
```

#### Custom Entry Points

If Dokploy uses different entry point names:

```yaml
- "traefik.http.routers.evolution-api-secure.entrypoints=websecure,http"  # Custom entry points
```

#### Add Redirect to HTTPS

```yaml
- "traefik.http.middlewares.https-redirect.redirectscheme.scheme=https"
- "traefik.http.routers.evolution-api.middlewares=https-redirect"
```

## Testing

### 1. Check Container Status

```bash
docker ps | grep evolution-api
```

### 2. Check Traefik Logs

```bash
docker logs traefik  # Or your Traefik container name
```

### 3. Test Access

```bash
# Should work through Traefik
curl https://api.yourdomain.com/instance/fetchInstances

# Direct container access (if ports are exposed)
curl http://localhost:8080/instance/fetchInstances
```

## Troubleshooting

### Domain Not Working

1. **Check DNS**: Ensure your domain points to Dokploy server
2. **Check Traefik Labels**: Verify domain in labels matches your DNS
3. **Check Network**: Ensure container is on Traefik's network
4. **Check Traefik Logs**: Look for routing errors

### Port 8080 Already Allocated

This is why we removed direct port mapping. If you still see this error:

1. **Stop conflicting service**:
   ```bash
   docker ps | grep 8080
   docker stop <container-id>
   ```

2. **Or use different port** in compose file (if needed for direct access):
   ```yaml
   ports:
     - "9080:8080"  # Use 9080 externally
   ```

### SSL Certificate Issues

1. **Check Let's Encrypt resolver** name in Traefik
2. **Verify domain** is accessible publicly
3. **Check Traefik logs** for certificate errors

### Container Not Accessible via Domain

1. **Verify Traefik network**:
   ```bash
   docker network inspect traefik-public
   docker network inspect evolution-net
   ```

2. **Check if containers are connected**:
   ```bash
   docker inspect evolution-api | grep NetworkMode
   ```

3. **Add Traefik network** to compose file if needed

## Alternative: Use Dokploy's Domain Management

Instead of manually configuring Traefik labels, Dokploy may have a UI for domain management:

1. Go to your application in Dokploy
2. Look for "Domain" or "Networking" section
3. Add your domain there
4. Dokploy will automatically configure Traefik

## Quick Reference

| Setting | Value | Description |
|---------|-------|-------------|
| Container Port | 8080 | Internal container port |
| Domain | `api.yourdomain.com` | Your public domain |
| Traefik Entry Point | `websecure` | HTTPS entry point |
| Certificate Resolver | `letsencrypt` | SSL certificate provider |

## Support

- Check [Dokploy Documentation](https://dokploy.com/docs)
- Check [Traefik Documentation](https://doc.traefik.io/traefik/)
- Review application logs in Dokploy dashboard

