#!/bin/bash

# Client Dashboard - Quick Start Script
# Installs dependencies and starts the development server

set -e

echo "🚀 Client Dashboard - Quick Start"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
  exit 1
fi

echo "✓ Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed."
  exit 1
fi

echo "✓ npm $(npm --version) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Start development server
echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Starting development server..."
echo "   Open http://localhost:5173 in your browser"
echo ""
echo "💡 Available commands:"
echo "   npm run dev      - Start development server"
echo "   npm run build    - Create production build"
echo "   npm run preview  - Preview production build"
echo "   npm run test     - Run tests with Vitest"
echo ""

npm run dev
