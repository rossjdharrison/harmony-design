# Harmony Design System - Development Environment
# Multi-stage build for efficient development container

# Stage 1: Base system with common dependencies
FROM ubuntu:22.04 AS base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Rust toolchain
FROM base AS rust-builder

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install wasm-pack for WASM compilation
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install wasm32-unknown-unknown target
RUN rustup target add wasm32-unknown-unknown

# Stage 3: Node.js toolchain (dev tools only)
FROM rust-builder AS node-builder

# Install Node.js 20.x (LTS) for build tools
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Stage 4: Python toolchain (dev tools only)
FROM node-builder AS python-builder

# Install Python 3.11 for test servers and build scripts
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment for dev tools
RUN python3.11 -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

# Install Python dev dependencies (pytest for test servers)
RUN pip install --no-cache-dir \
    pytest==7.4.3 \
    pytest-asyncio==0.21.1 \
    aiohttp==3.9.1

# Stage 5: Development environment
FROM python-builder AS development

# Set working directory
WORKDIR /workspace

# Install Chrome for UI component testing (required by policy #10)
RUN curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install additional development tools
RUN apt-get update && apt-get install -y \
    vim \
    nano \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Copy project files (use .dockerignore to exclude unnecessary files)
COPY . /workspace

# Set up git config for container
RUN git config --global --add safe.directory /workspace

# Expose ports for development servers
# 8080: Main dev server
# 8081: Storybook
# 8082: Test server
EXPOSE 8080 8081 8082

# Environment variables for development
ENV RUST_BACKTRACE=1
ENV WASM_BINDGEN_TEST_TIMEOUT=120
ENV NODE_ENV=development

# Create volume mount points
VOLUME ["/workspace"]

# Default command: interactive shell
CMD ["/bin/bash"]