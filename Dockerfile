# Build the nested React frontend.
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY ["Network Scanner/frontend/package.json", "./package.json"]
COPY ["Network Scanner/frontend/package-lock.json", "./package-lock.json"]
RUN npm ci
COPY ["Network Scanner/frontend/", "./"]
RUN npm run build

# Run the Express/Nmap service and serve the built frontend.
FROM node:20-alpine
RUN apk add --no-cache nmap nmap-scripts
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY --from=frontend-builder /build/frontend/dist ./frontend-dist
EXPOSE 5000
CMD ["npm", "start"]
