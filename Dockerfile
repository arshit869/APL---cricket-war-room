FROM node:20-slim
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Force a clean install to fix the "ERR_MODULE_NOT_FOUND" error
RUN rm -rf node_modules package-lock.json && npm install

# Copy the rest of the code
COPY . .

# Ensure the container knows about port 3001
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
