# Cloudflare R2 Session Storage Setup

This guide explains how to configure Evolution API Lite to store WhatsApp sessions in Cloudflare R2.

## Overview

Cloudflare R2 is an S3-compatible object storage service that allows you to store WhatsApp authentication sessions remotely. This enables:

- ✅ Automatic session backup to cloud storage
- ✅ Easy session transfer between servers
- ✅ Persistent session storage
- ✅ No egress fees (unlike other S3 services)

## Prerequisites

1. A Cloudflare account with R2 enabled
2. An R2 bucket created
3. R2 API tokens (Access Key ID and Secret Access Key)

## Getting R2 Credentials

1. **Log in to Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)

2. **Navigate to R2**
   - Click on "R2" in the left sidebar
   - Create a new bucket or select an existing one

3. **Create API Token**
   - Go to "Manage R2 API Tokens"
   - Click "Create API Token"
   - Set permissions: Object Read & Write, Bucket List
   - Copy the **Access Key ID** and **Secret Access Key**

4. **Get Account ID**
   - Your R2 endpoint will be: `{account_id}.r2.cloudflarestorage.com`
   - You can find your Account ID in the Cloudflare dashboard URL or R2 settings

## Configuration

Add the following environment variables to your `.env` file:

```env
# Enable R2 Session Storage
R2_SESSION_STORAGE_ENABLED=true

# R2 Configuration (uses existing S3 config)
S3_ENABLED=true
S3_ACCESS_KEY=your_r2_access_key_id
S3_SECRET_KEY=your_r2_secret_access_key
S3_ENDPOINT=your_account_id.r2.cloudflarestorage.com
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_USE_SSL=true
```

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `R2_SESSION_STORAGE_ENABLED` | Enable R2 session storage | `true` |
| `S3_ENABLED` | Enable S3-compatible storage | `true` |
| `S3_ACCESS_KEY` | R2 Access Key ID | `abc123...` |
| `S3_SECRET_KEY` | R2 Secret Access Key | `xyz789...` |
| `S3_ENDPOINT` | R2 endpoint URL | `abc123def456.r2.cloudflarestorage.com` |
| `S3_BUCKET` | Your R2 bucket name | `whatsapp-sessions` |
| `S3_REGION` | Always use `auto` for R2 | `auto` |
| `S3_USE_SSL` | Use HTTPS (recommended) | `true` |

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy your `.env` file and add the R2 configuration above

3. **Restart the Application**
   ```bash
   npm run start
   ```

## How It Works

### Session Storage Priority

The system uses the following priority order:

1. **R2 Storage** (if `R2_SESSION_STORAGE_ENABLED=true`)
2. Provider Files (if enabled)
3. Redis (if enabled with `SAVE_INSTANCES=true`)
4. Database (Prisma)

### Session File Structure

Sessions are stored in R2 with the following structure:

```
sessions/
  ├── {instance-id-1}/
  │   ├── creds.json
  │   ├── app-state-sync-key-{id}.json
  │   ├── app-state-sync-version-{id}.json
  │   └── ...
  ├── {instance-id-2}/
  │   └── ...
```

### Automatic Operations

- **Save**: Sessions are automatically saved to R2 when created or updated
- **Load**: Sessions are automatically loaded from R2 when the instance starts
- **Delete**: Sessions are automatically deleted from R2 when an instance is removed

## Testing

1. **Create a new instance**
   ```bash
   curl -X POST http://localhost:8080/instance/create \
     -H "apikey: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "instanceName": "test-instance",
       "integration": "WHATSAPP-BAILEYS"
     }'
   ```

2. **Check R2 Bucket**
   - Go to your R2 bucket in Cloudflare Dashboard
   - You should see a folder `sessions/test-instance/` with session files

3. **Restart the server**
   - Stop the server
   - Start it again
   - The session should be automatically loaded from R2

## Troubleshooting

### Session Not Saving

1. Check that `R2_SESSION_STORAGE_ENABLED=true`
2. Verify S3 credentials are correct
3. Ensure the bucket exists and is accessible
4. Check application logs for R2 errors

### Session Not Loading

1. Verify session files exist in R2 bucket
2. Check bucket permissions allow read access
3. Verify endpoint URL is correct (should be `{account_id}.r2.cloudflarestorage.com`)

### Connection Errors

- **Error: "R2 client not configured"**
  - Ensure `S3_ENABLED=true` and all S3 credentials are set

- **Error: "Access Denied"**
  - Verify your API token has correct permissions
  - Check that the bucket name is correct

- **Error: "NoSuchBucket"**
  - Ensure the bucket exists in your Cloudflare account
  - Verify the bucket name matches `S3_BUCKET`

## Features

✅ **Automatic Backup**: All session data is automatically saved to R2  
✅ **Persistent Storage**: Sessions survive server restarts  
✅ **Transferable**: Easy to move sessions between servers  
✅ **No Egress Fees**: R2 doesn't charge for data transfer  
✅ **S3 Compatible**: Uses standard AWS S3 SDK  

## Security Notes

- ⚠️ Keep your R2 credentials secure - never commit them to version control
- ⚠️ Use environment variables or secrets management
- ⚠️ Consider encrypting sensitive session data before storage
- ⚠️ Regularly rotate your R2 API tokens

## Support

For issues or questions:
- Check the [official documentation](https://doc.evolution-api.com)
- Join the [Discord community](https://evolution-api.com/discord)
- Open an issue on GitHub

