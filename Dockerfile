FROM node:20-slim
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Force a fresh install and ignore any stale lockfile issues
RUN rm -f package-lock.json && npm install

# Copy the rest of the code
COPY . .

# Set the port for Cloud Run
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
