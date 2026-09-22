#!/bin/sh
set -e

if [ "$NGINX_DEV" = "1" ]; then
  echo "Using HTTP-only (dev) nginx config..."
  rm -f /etc/nginx/conf.d/default.conf
  mv /etc/nginx/conf.d/dev.conf /etc/nginx/conf.d/default.conf
else
  rm -f /etc/nginx/conf.d/dev.conf
  # Generate self-signed SSL certificate
  if [ ! -f /etc/nginx/ssl/cert.pem ] || [ ! -f /etc/nginx/ssl/key.pem ]; then
    echo "Generating self-signed SSL certificate..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/key.pem \
      -out /etc/nginx/ssl/cert.pem \
      -subj "/C=FR/ST=Paris/L=Paris/O=QA Recipe/OU=Dev/CN=localhost" 2>/dev/null
    echo "SSL certificate generated."
  fi
fi

exec nginx -g "daemon off;"
