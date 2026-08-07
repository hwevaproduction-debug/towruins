FROM node:20-slim

# Install OpenSSL required by Prisma for Debian-slim base images
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy dependency manifests AND the prisma schema folder
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies (prisma generate will now succeed during postinstall)
RUN npm ci --only=production

# Copy remaining backend source files
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
