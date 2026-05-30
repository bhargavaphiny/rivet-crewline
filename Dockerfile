FROM node:22-slim
WORKDIR /app
COPY . .
ENV PORT=8080
ENV RIVET_DATA_DIR=/data
EXPOSE 8080
CMD ["node", "--experimental-sqlite", "server.js"]
