# Deployment Guide

This guide explains how to deploy the React + Django application with session-based authentication using Docker.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Production Configuration](#production-configuration)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

This application is designed for **single-server deployment** using Docker Compose. The session data is stored in the Django database (SQLite by default, PostgreSQL recommended for production).

### Key Points

- **Single Server**: Frontend, backend, and database on one machine
- **Session Storage**: Django database (no Redis/Memcached needed for single server)
- **HTTPS Required**: Production must use HTTPS for secure cookies
- **Database**: SQLite for development, PostgreSQL for production

## Architecture

```
┌─────────────────────────────────────────────┐
│           Docker Compose Host               │
│                                             │
│  ┌────────────────┐    ┌─────────────────┐ │
│  │   Nginx/Caddy  │    │   PostgreSQL    │ │
│  │   (Reverse     │    │   (Database)    │ │
│  │    Proxy)      │    │                 │ │
│  └────────┬───────┘    └────────┬────────┘ │
│           │                      │          │
│  ┌────────▼───────┐    ┌────────▼────────┐ │
│  │   React App    │    │  Django API     │ │
│  │  (Static)      │    │  (Backend)      │ │
│  │  Port 3000     │    │  Port 8000      │ │
│  └────────────────┘    └─────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

## Environment Variables

### Backend (.env)

Create a `.env` file in the `server/` directory:

```bash
# =============================================================================
# Django Configuration
# =============================================================================

# Secret key for cryptographic signing (REQUIRED - CHANGE THIS!)
SECRET_KEY=your-very-long-random-secret-key-here

# Debug mode (MUST be False in production)
DEBUG=False

# Allowed hosts (comma-separated)
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# =============================================================================
# Database Configuration (PostgreSQL recommended for production)
# =============================================================================

# For SQLite (development only):
# DATABASE_URL=sqlite:///db.sqlite3

# For PostgreSQL (production):
DATABASE_URL=postgresql://user:password@db:5432/dbname

# =============================================================================
# CORS Configuration
# =============================================================================

# Frontend origin(s) - must match your frontend URL
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# =============================================================================
# CSRF Configuration
# =============================================================================

# Trusted origins for CSRF protection - must match frontend domain
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Frontend (.env)

Create a `.env` file in the root directory:

```bash
# Backend API URL
VITE_API_URL=https://yourdomain.com/api
```

## Docker Deployment

### Option 1: Docker Compose (Recommended)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

  # Django Backend
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=False
      - DATABASE_URL=postgresql://myapp_user:${DB_PASSWORD}@db:5432/myapp
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
      - CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}
      - CSRF_TRUSTED_ORIGINS=${CSRF_TRUSTED_ORIGINS}
    depends_on:
      - db
    volumes:
      - static_files:/app/static
    networks:
      - app-network
    restart: unless-stopped
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8000"

  # React Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - VITE_API_URL=${VITE_API_URL}
    networks:
      - app-network
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - static_files:/static:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  static_files:

networks:
  app-network:
    driver: bridge
```

### Backend Dockerfile

Create `server/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .

# Copy application code
COPY . .

# Collect static files will be done in docker-compose command
EXPOSE 8000

# Use gunicorn for production
RUN pip install gunicorn
```

### Frontend Dockerfile

Create `Dockerfile.frontend` in project root:

```dockerfile
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Django API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Important for session cookies
            proxy_set_header Cookie $http_cookie;
        }

        # Django Admin
        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Django Static Files
        location /static/ {
            alias /static/;
        }

        # React Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Deploy

1. **Set up environment variables**:
```bash
# Create .env in project root
cat > .env << EOF
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
DB_PASSWORD=your-secure-password
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
VITE_API_URL=https://yourdomain.com
EOF
```

2. **Get SSL certificates** (using Certbot):
```bash
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email
```

3. **Build and start services**:
```bash
docker-compose up -d --build
```

4. **Create superuser**:
```bash
docker-compose exec backend python manage.py createsuperuser
```

5. **Check logs**:
```bash
docker-compose logs -f
```

## Production Configuration

### Django Production Settings

Update `server/config/settings.py` for production:

```python
# Must read from environment
DEBUG = os.getenv("DEBUG", "False") == "True"  # Default False

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HTTPS settings (if behind reverse proxy)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session security
SESSION_COOKIE_SECURE = not DEBUG  # True in production
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF security
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # JS needs to read for CSRF token

# Database - Use PostgreSQL in production
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600
    )
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/app.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Add Required Packages

```bash
# In server directory
pip install gunicorn psycopg2-binary dj-database-url
```

Update `pyproject.toml`:

```toml
dependencies = [
    # ... existing dependencies
    "gunicorn>=21.2.0",
    "psycopg2-binary>=2.9.9",
    "dj-database-url>=2.1.0",
]
```

## Security Checklist

Before deploying to production, verify:

### Django Settings

- [ ] `DEBUG = False`
- [ ] `SECRET_KEY` is unique and not in git
- [ ] `ALLOWED_HOSTS` set to your domain(s)
- [ ] `SESSION_COOKIE_SECURE = True`
- [ ] `CSRF_COOKIE_SECURE = True`
- [ ] `CORS_ALLOWED_ORIGINS` set to frontend domain(s)
- [ ] `CSRF_TRUSTED_ORIGINS` set to frontend domain(s)
- [ ] Using PostgreSQL (not SQLite)
- [ ] Static files configured correctly

### Infrastructure

- [ ] HTTPS enabled (SSL certificates installed)
- [ ] Firewall configured (only 80/443 open)
- [ ] Database not exposed to internet
- [ ] Environment variables not in git
- [ ] Regular database backups configured
- [ ] Logging enabled and monitored
- [ ] Rate limiting on login endpoint
- [ ] `docker-compose.yml` not in git (contains secrets)

### Application

- [ ] Strong password requirements enabled
- [ ] Password reset functionality works
- [ ] Session expiration appropriate (7 days default)
- [ ] CSRF protection enabled (default in Django)
- [ ] XSS protection headers set
- [ ] Content Security Policy configured
- [ ] Regular security updates scheduled

### Monitoring

- [ ] Health check endpoint implemented
- [ ] Application logs monitored
- [ ] Failed login attempts logged
- [ ] Database performance monitored
- [ ] Disk space monitored
- [ ] Uptime monitoring configured

## Troubleshooting

### Issue: Cookies not working in production

**Symptoms**: Login succeeds but user appears logged out on next request

**Solutions**:
1. Verify HTTPS is enabled (`SESSION_COOKIE_SECURE = True` requires HTTPS)
2. Check `CORS_ALLOWED_ORIGINS` includes frontend domain
3. Verify `CSRF_TRUSTED_ORIGINS` includes frontend domain
4. Check nginx proxy settings include `Cookie` header

### Issue: CSRF verification failed

**Solutions**:
1. Add frontend domain to `CSRF_TRUSTED_ORIGINS`
2. Verify nginx passes `X-Forwarded-Proto` header
3. Check `SECURE_PROXY_SSL_HEADER` setting if behind reverse proxy

### Issue: Database connection errors

**Solutions**:
1. Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`
2. Check database container is running: `docker-compose ps`
3. Verify database credentials match in `.env` and docker-compose
4. Check network connectivity between containers

### Issue: Static files not loading

**Solutions**:
1. Run `python manage.py collectstatic`
2. Verify nginx volume mount for static files
3. Check `STATIC_ROOT` and `STATIC_URL` settings

### Issue: SSL certificate errors

**Solutions**:
1. Verify certificates exist in correct path
2. Renew certificates: `certbot renew`
3. Check domain DNS points to server
4. Verify nginx certificate paths match Certbot output

### Check Application Logs

```bash
# Django logs
docker-compose logs -f backend

# Nginx logs
docker-compose logs -f nginx

# Database logs
docker-compose logs -f db

# All logs
docker-compose logs -f
```

### Interactive Shell for Debugging

```bash
# Django shell
docker-compose exec backend python manage.py shell

# Database shell
docker-compose exec db psql -U myapp_user myapp

# Container shell
docker-compose exec backend sh
```

## Maintenance

### Clean up expired sessions

Run periodically (e.g., daily cron):

```bash
docker-compose exec backend python manage.py clearsessions
```

### Database backups

```bash
# Backup
docker-compose exec db pg_dump -U myapp_user myapp > backup.sql

# Restore
docker-compose exec -T db psql -U myapp_user myapp < backup.sql
```

### Update application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate
```

### Monitor resource usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Alternative: Simple Single-Container Deployment

For very simple deployments, you can use a single container:

```dockerfile
FROM python:3.11-slim

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# Install Python deps
COPY server/pyproject.toml ./server/
RUN pip install -e ./server

# Install Node deps and build frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Copy Django code
COPY server ./server

# Collect static files
RUN cd server && python manage.py collectstatic --noinput

# Start both Django and serve frontend
CMD cd server && gunicorn config.wsgi:application --bind 0.0.0.0:8000 & \
    cd /app && npx serve -s dist -p 3000
```

**Note**: This is not recommended for production but works for simple deployments.

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt / Certbot](https://certbot.eff.org/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
