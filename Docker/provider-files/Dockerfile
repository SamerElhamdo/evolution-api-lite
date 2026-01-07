FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install --production

# Copy server file
COPY server.js .

# Create storage directory
RUN mkdir -p /app/storage

# Set permissions
RUN chmod -R 755 /app/storage

VOLUME ["/app/storage"]

EXPOSE 5656

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5656/ping', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]

