#!/bin/bash
# ============================================================
# Deployment Script for Fish Farm IoT System
# ============================================================

echo "=========================================="
echo " Fish Farm IoT - Deployment Script"
echo "=========================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI not found. Please install it:"
    echo "  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
    echo "  echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null"
    echo "  sudo apt update && sudo apt install gh"
    echo ""
    echo "Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Not authenticated with GitHub. Running: gh auth login"
    gh auth login
fi

# Create GitHub repository
echo ""
echo "Creating GitHub repository..."
gh repo create fish-farm-iot --public --description "IoT-Based Automated Water Regulation for Fish Farming" --source=. --remote=origin --push

echo ""
echo "Repository created and pushed to GitHub!"

# Deploy frontend to Vercel
echo ""
echo "Deploying frontend to Vercel..."
cd frontend

if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "Running Vercel deployment..."
vercel --yes

echo ""
echo "=========================================="
echo " Deployment Complete!"
echo "=========================================="
echo ""
echo "GitHub Repository: https://github.com/YOUR_USERNAME/fish-farm-iot"
echo "Frontend Dashboard: https://fish-farm-iot.vercel.app"
echo "Backend API: Deploy to Railway/Render"
echo ""
echo "Next steps:"
echo "1. Set up MongoDB Atlas (free tier)"
echo "2. Set up InfluxDB Cloud (free tier)"
echo "3. Deploy backend to Railway or Render"
echo "4. Configure environment variables"
echo "5. Flash ESP32 firmware with your WiFi credentials"
