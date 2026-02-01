# Deployment Guide – Collaborative Canvas

This guide covers deploying the collaborative-canvas application in production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Production Deployment](#local-production-deployment)
3. [Cloud Deployments](#cloud-deployments)
   - [Heroku](#heroku)
   - [Railway](#railway)
   - [AWS EC2](#aws-ec2)
   - [DigitalOcean](#digitalocean)
4. [Docker Deployment](#docker-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** v16+ and npm
- **MongoDB** (local or Atlas cloud instance)
- **Git** (for cloning/pushing)
- **Docker** (optional, for containerized deployment)

---

## Local Production Deployment

### Step 1: Build the Application

Compile TypeScript to JavaScript:

```bash
cd collaborative-canvas
npm install
npm run build
```

This generates compiled `.js` files in the `server/` directory.

### Step 2: Set Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URL=mongodb://localhost:27017/collaborative-canvas
NODE_ENV=production
```

For MongoDB Atlas (cloud):

```env
PORT=3000
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/collaborative-canvas?retryWrites=true&w=majority
NODE_ENV=production
```

### Step 3: Start the Server

Using Node directly (runs compiled JavaScript):

```bash
node server/server.js
```

Or use a process manager like **PM2** (recommended for production):

```bash
npm install -g pm2

# Start the app
pm2 start server/server.js --name "canvas-app"

# Auto-restart on boot
pm2 startup
pm2 save

# Check status
pm2 status
```

### Step 4: Verify Deployment

- Navigate to `http://localhost:3000`
- Test drawing, undo/redo, and multi-user synchronization
- Check server logs: `pm2 logs canvas-app`

---

## Cloud Deployments

### Heroku

**Requirements:** Heroku CLI, Git, GitHub/Heroku account

#### Step 1: Prepare the App

Add a `Procfile` in the project root:

```
web: npm run build && node server/server.js
```

#### Step 2: Create and Deploy

```bash
cd collaborative-canvas
heroku login
heroku create your-app-name
heroku config:set MONGO_URL=mongodb+srv://...
git push heroku main
```

#### Step 3: View Logs

```bash
heroku logs --tail
```

**Live URL:** `https://your-app-name.herokuapp.com`

---

### Railway

**Requirements:** Railway account, Git

#### Step 1: Connect Repository

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Select the `collaborative-canvas` directory

#### Step 2: Configure Environment

In Railway dashboard:
- Add variable: `MONGO_URL=mongodb+srv://...`
- Add variable: `NODE_ENV=production`
- Add variable: `PORT=3000`

#### Step 3: Deploy

Railway auto-deploys on push to `main`. Check deployment status in the dashboard.

**Live URL:** Provided by Railway (e.g., `https://your-app-xyz.railway.app`)

---

### AWS EC2

**Requirements:** AWS account, SSH key pair, EC2 security group

#### Step 1: Launch Instance

1. Go to AWS EC2 Dashboard
2. Launch a new Ubuntu 22.04 LTS instance (t2.micro eligible for free tier)
3. Download and save the `.pem` key file

#### Step 2: Connect and Setup

```bash
# SSH into the instance
ssh -i /path/to/key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (or use MongoDB Atlas instead)
sudo apt install -y mongodb-server
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Clone your repository
git clone https://github.com/your-repo/collaborative-canvas.git
cd collaborative-canvas
npm install
npm run build
```

#### Step 3: Run the Application

Using PM2:

```bash
sudo npm install -g pm2
pm2 start server/server.js --name "canvas"
pm2 startup
pm2 save
```

#### Step 4: Configure Security Group

In AWS Console, update inbound rules:
- **HTTP** (port 80)
- **HTTPS** (port 443)
- **Custom TCP** (port 3000) – optional for direct access

#### Step 5: Setup Reverse Proxy (Nginx)

```bash
sudo apt install -y nginx

# Edit nginx config
sudo nano /etc/nginx/sites-available/default
```

Replace the `location /` block:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

---

### DigitalOcean

**Requirements:** DigitalOcean account, SSH key

#### Step 1: Create Droplet

1. Go to DigitalOcean Console
2. Create a new Droplet (Ubuntu 22.04 LTS, Basic plan)
3. Select your SSH key for authentication

#### Step 2: Initial Setup (same as AWS EC2)

```bash
ssh root@your-droplet-ip

apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# For Mongo Atlas (recommended):
# Set MONGO_URL environment variable in .env file

# Clone and setup
git clone https://github.com/your-repo/collaborative-canvas.git
cd collaborative-canvas
npm install
npm run build
npm install -g pm2
pm2 start server/server.js
pm2 startup && pm2 save
```

#### Step 3: Setup Firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

#### Step 4: Use App Platform (Optional, Managed)

1. Push your code to GitHub
2. Go to DigitalOcean App Platform
3. Connect your GitHub account and select the repository
4. Set build command: `npm run build`
5. Set run command: `node server/server.js`
6. Add environment variables (MONGO_URL, etc.)
7. Deploy

---

## Docker Deployment

Create a `Dockerfile` in the project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/server ./server
COPY client ./client
EXPOSE 3000
CMD ["node", "server/server.js"]
```

Build and run:

```bash
# Build the image
docker build -t collaborative-canvas:latest .

# Run the container
docker run -e MONGO_URL=mongodb+srv://... -p 3000:3000 collaborative-canvas:latest
```

**For Docker Compose**, create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      MONGO_URL: mongodb+srv://username:password@cluster.mongodb.net/collaborative-canvas
      NODE_ENV: production
    restart: always

  # Optional: MongoDB service (if not using Atlas)
  # mongo:
  #   image: mongo:5
  #   ports:
  #     - "27017:27017"
  #   volumes:
  #     - mongo-data:/data/db
  # volumes:
  #   mongo-data:
```

Run with Compose:

```bash
docker-compose up -d
```

---

## Environment Configuration

### Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `MONGO_URL` | `mongodb://localhost:27017/collaborative-canvas` | MongoDB connection string |
| `NODE_ENV` | `development` | Set to `production` for production |

### Optional Variables

```env
# Logging
DEBUG=canvas:*

# Security
CORS_ORIGIN=https://your-domain.com

# Performance
MAX_ROOMS=100
MAX_USERS_PER_ROOM=50
```

---

## Database Setup

### Option 1: Local MongoDB

```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo apt install -y mongodb-server
sudo systemctl start mongodb

# Test connection
mongosh mongodb://localhost:27017/collaborative-canvas
```

### Option 2: MongoDB Atlas (Cloud, Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user (username/password)
4. Get your connection string: `mongodb+srv://user:pass@cluster.mongodb.net/collaborative-canvas`
5. Set in `.env`:

```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/collaborative-canvas?retryWrites=true&w=majority
```

---

## Troubleshooting

### Issue: "Connection refused" / Cannot connect to MongoDB

**Solution:** Verify MongoDB is running:

```bash
# Check local MongoDB
sudo systemctl status mongodb

# For Atlas, verify connection string and IP whitelist in Atlas console
```

### Issue: Port 3000 already in use

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (macOS/Linux)
kill -9 <PID>

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: WebSocket connection fails in production

**Solution:** Ensure Nginx/reverse proxy is configured for WebSocket:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Issue: Files show as "Not found" after deployment

**Solution:** Ensure the `client/` directory is copied to the server:

```bash
npm run build
# Verify client files are present in production
ls -la client/
```

---

## Performance Tips

1. **Enable GZIP compression** in Nginx/server
2. **Use MongoDB Atlas** (auto-scaling, backups)
3. **Set up CDN** for static assets (CSS, images)
4. **Enable caching** with Redis (optional)
5. **Monitor with PM2 Plus** or similar service
6. **Use horizontal scaling** with multiple instances + load balancer

---

## Summary

| Platform | Ease | Cost | Maintenance |
|----------|------|------|-------------|
| Local (PM2) | ⭐⭐ | Free | High |
| Heroku | ⭐⭐⭐⭐ | $7-14/month | Low |
| Railway | ⭐⭐⭐⭐ | $5-50/month | Low |
| AWS EC2 | ⭐⭐⭐ | $5-20/month | Medium |
| DigitalOcean | ⭐⭐⭐ | $4-12/month | Medium |
| Docker | ⭐⭐⭐ | Varies | Medium |

For quick deployment, use **Heroku** or **Railway**. For cost optimization, use **AWS** or **DigitalOcean**.
