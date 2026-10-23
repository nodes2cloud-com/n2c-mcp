# For directories that build and inspect MCP servers in a container (Glama,
# Docker's MCP catalog). Without N2C_API_KEY the server runs in preview mode:
# it lists its tools from the public server card and calls nothing.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src ./src
RUN npm run build

# No runtime dependencies, so the final image is Node plus the compiled files.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json LICENSE README.md ./
USER node
ENTRYPOINT ["node", "dist/index.js"]
