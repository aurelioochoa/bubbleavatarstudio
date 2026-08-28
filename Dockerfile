# syntax=docker/dockerfile:1

# Bubble Avatar Studio is a static SPA — React + Vite, no backend, persistence
# in localStorage. So this file does exactly two things: build dist/ with the
# pinned toolchain, and serve it as files.

# --- base --------------------------------------------------------------------
# Node 22 matches .github/workflows/check.yml. No pnpm version is named here:
# the packageManager field in package.json decides, and corepack errors when
# the two disagree.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# --- deps --------------------------------------------------------------------
# Manifests only, so editing a source file does not reinstall. pnpm-workspace
# .yaml carries `allowBuilds: esbuild: true`; without it esbuild's postinstall
# is skipped and the build has no binary to run.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- dev ---------------------------------------------------------------------
# The compose `dev` service bind-mounts the repo over /app; node_modules is
# kept by an anonymous volume there. --host is required: without it Vite binds
# loopback inside the container and the published port answers nothing.
FROM deps AS dev
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# --- build -------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm build

# --- runtime -----------------------------------------------------------------
# Last stage, so it is what `docker build` produces by default.
FROM nginx:alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
