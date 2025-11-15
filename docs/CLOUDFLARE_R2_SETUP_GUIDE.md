# Cloudflare R2 Setup Guide

This guide walks you through setting up Cloudflare R2 for the Study Buddy AI system's file-based RAG (Retrieval-Augmented Generation) capabilities.

## Overview

Cloudflare R2 is used to store markdown knowledge files that the AI can retrieve and use to enhance responses. The system uses semantic search to find relevant files based on user queries.

## Prerequisites

- A Cloudflare account (free tier available)
- Access to Cloudflare Dashboard
- Basic understanding of object storage concepts

## Step 1: Create R2 Bucket

### 1.1 Access R2 Dashboard

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** from the left sidebar
3. If this is your first time, click **Purchase R2** (free tier includes 10GB storage)

### 1.2 Create Bucket

1. Click **Create bucket**
2. Enter bucket name: `study-buddy-knowledge` (or your preferred name)
3. Select location hint: Choose closest to your users (e.g., `WNAM` for Western North America)
4. Leave default settings:
   - Storage class: Standard
   - Object lifecycle: None (configure later if needed)
5. Click **Create bucket**

### 1.3 Verify Bucket Creation

You should see your new bucket listed in the R2 dashboard with:
- Bucket name
- Creation date
- Object count (0 initially)
- Storage used (0 B initially)

## Step 2: Generate API Tokens

### 2.1 Create API Token

1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure token settings:
   - **Token name**: `study-buddy-api-token`
   - **Permissions**: Select **Object Read & Write**
   - **Specify bucket(s)**: Select **Apply to specific buckets only**
   - Choose your `study-buddy-knowledge` bucket
   - **TTL**: Leave as default (no expiration) or set custom expiration
4. Click **Create API Token**

### 2.2 Save Credentials

After creation, you'll see three important values. **Save these immediately** (they won't be shown again):

```
Access Key ID: <your-access-key-id>
Secret Access Key: <your-secret-access-key>
Account ID: <your-account-id>
```

### 2.3 Get S3 Endpoint URL

The endpoint URL format is:
```
https://<account-id>.r2.cloudflarestorage.com
```

You'll need this for SDK configuration.

## Step 3: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-access-key-id-here
R2_SECRET_ACCESS_KEY=your-secret-access-key-here
R2_BUCKET_NAME=study-buddy-knowledge
```

**Security Note**: Never commit `.env` to version control. Ensure `.env` is in your `.gitignore`.

## Step 4: File Organization Structure

### 4.1 Recommended Folder Structure

Organize your markdown files in a logical hierarchy:

```
study-buddy-knowledge/
├── subjects/
│   ├── mathematics/
│   │   ├── algebra-basics.md
│   │   ├── calculus-intro.md
│   │   └── geometry-formulas.md
│   ├── science/
│   │   ├── physics-laws.md
│   │   ├── chemistry-periodic-table.md
│   │   └── biology-cell-structure.md
│   └── history/
│       ├── world-war-2.md
│       └── ancient-civilizations.md
├── study-guides/
│   ├── exam-prep-tips.md
│   ├── note-taking-strategies.md
│   └── time-management.md
└── reference/
    ├── citation-formats.md
    └── research-methods.md
```

### 4.2 File Naming Conventions

- Use lowercase with hyphens: `algebra-basics.md`
- Be descriptive: `calculus-derivatives-intro.md` not `calc1.md`
- Include topic keywords for better semantic search
- Use `.md` extension for all markdown files

### 4.3 Metadata in Files

Include frontmatter in your markdown files for better organization:

```markdown
---
title: "Algebra Basics"
subject: "Mathematics"
difficulty: "beginner"
topics: ["equations", "variables", "solving"]
last_updated: "2025-11-15"
---

# Algebra Basics

Your content here...
```

## Step 5: Upload Files to R2

### 5.1 Using Cloudflare Dashboard

1. Navigate to your bucket in R2 dashboard
2. Click **Upload**
3. Drag and drop files or click to browse
4. Files will be uploaded to the root directory
5. To create folders, use the **Create folder** button first

### 5.2 Using AWS CLI (Recommended for Bulk Uploads)

R2 is S3-compatible, so you can use AWS CLI:

```bash
# Configure AWS CLI with R2 credentials
aws configure --profile r2
# Enter your R2 Access Key ID
# Enter your R2 Secret Access Key
# Region: auto
# Output format: json

# Upload a single file
aws s3 cp local-file.md s3://study-buddy-knowledge/subjects/math/file.md \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --profile r2

# Upload entire directory
aws s3 sync ./local-knowledge-base s3://study-buddy-knowledge \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
  --profile r2
```

### 5.3 Using Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Upload files
wrangler r2 object put study-buddy-knowledge/subjects/math/algebra.md \
  --file ./algebra.md
```

## Step 6: Testing the Integration

### 6.1 Verify API Connection

Run the test script to verify R2 connectivity:

```bash
node test-r2-files-endpoint.js
```

Expected output:
```json
{
  "success": true,
  "files": [...],
  "message": "R2 connection successful"
}
```

### 6.2 Test File Retrieval

Make a request to the files endpoint:

```bash
curl -X POST http://localhost:3000/api/ai/files \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "list",
    "userId": "your-user-id"
  }'
```

### 6.3 Test Semantic Search

```bash
curl -X POST http://localhost:3000/api/ai/files \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "query": "algebra equations",
    "userId": "your-user-id"
  }'
```

## Example Markdown Files

See the `examples/r2-knowledge-files/` directory for sample markdown files you can upload to test the system.

## Troubleshooting

### Connection Errors

**Error**: `Access Denied` or `InvalidAccessKeyId`
- **Solution**: Verify your R2 credentials in `.env`
- Check that the API token has correct permissions
- Ensure the bucket name matches exactly

**Error**: `NoSuchBucket`
- **Solution**: Verify bucket name in `.env` matches the actual bucket name
- Check that the bucket exists in your R2 dashboard

### File Not Found

**Error**: Files not appearing in search results
- **Solution**: Verify files are uploaded to the correct bucket
- Check file extensions are `.md`
- Ensure files contain actual content (not empty)

### Performance Issues

**Issue**: Slow file retrieval
- **Solution**: Consider implementing caching layer
- Use CDN for frequently accessed files
- Optimize file sizes (keep under 1MB per file)

## Best Practices

1. **Content Organization**: Group related files in folders
2. **File Size**: Keep individual files under 1MB for optimal performance
3. **Naming**: Use descriptive, searchable filenames
4. **Updates**: Regularly update content and remove outdated files
5. **Backup**: Maintain local copies of all uploaded files
6. **Security**: Rotate API tokens periodically
7. **Monitoring**: Check R2 usage in Cloudflare dashboard regularly

## Cost Considerations

Cloudflare R2 pricing (as of 2025):
- **Storage**: $0.015/GB/month (first 10GB free)
- **Class A Operations** (writes): $4.50/million requests
- **Class B Operations** (reads): $0.36/million requests
- **Egress**: Free (no bandwidth charges)

For typical Study Buddy usage (< 1GB storage, < 100K requests/month), costs should remain within free tier.

## Next Steps

1. Upload your initial knowledge base files
2. Test the `/api/ai/files` endpoint
3. Integrate RAG into chat requests with `rag.enabled: true`
4. Monitor usage and optimize file organization
5. Expand knowledge base based on user needs

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Study Buddy RAG Implementation](./STUDY_BUDDY_FEATURE_GUIDE.md)
