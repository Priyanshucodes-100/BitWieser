FROM node:20-bookworm-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN cd backend && npm ci && cd ../frontend && npm ci

COPY backend ./backend
COPY frontend ./frontend

# Same-origin API when the server also serves the built UI.
ENV VITE_API_URL=
RUN cd frontend && npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV FRONTEND_DIST=/app/frontend/dist
WORKDIR /app/backend

EXPOSE 3001
CMD ["npm", "start"]
