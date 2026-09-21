# ===================================================
# Stage 1: Build Frontend Multi-SPA Static Bundles
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY frontend/login/package.json ./frontend/login/
COPY frontend/admin/package.json ./frontend/admin/
COPY frontend/hr/package.json ./frontend/hr/
COPY frontend/employee/package.json ./frontend/employee/
COPY frontend/manager/package.json ./frontend/manager/
COPY frontend/shared/package.json ./frontend/shared/
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ ./frontend/

# Build all 5 frontend Single Page Applications
RUN npm run build --prefix frontend/login && \
    npm run build --prefix frontend/admin && \
    npm run build --prefix frontend/hr && \
    npm run build --prefix frontend/employee && \
    npm run build --prefix frontend/manager

# ===================================================
# Stage 2: Production Server Runner
# ===================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root and backend manifests
COPY package.json ./
COPY backend/package.json backend/package-lock.json* ./backend/

# Install production dependencies for backend
RUN npm install --omit=dev --prefix backend

# Copy backend application source
COPY backend/ ./backend/

# Copy compiled frontend dist folders from builder stage
COPY --from=builder /app/frontend/login/dist ./frontend/login/dist
COPY --from=builder /app/frontend/admin/dist ./frontend/admin/dist
COPY --from=builder /app/frontend/hr/dist ./frontend/hr/dist
COPY --from=builder /app/frontend/employee/dist ./frontend/employee/dist
COPY --from=builder /app/frontend/manager/dist ./frontend/manager/dist

# Create upload directory structure
RUN mkdir -p /app/backend/uploads/profile \
             /app/backend/uploads/documents \
             /app/backend/uploads/screenshots \
             /app/backend/uploads/tasks

EXPOSE 5000

CMD ["node", "backend/index.js"]
