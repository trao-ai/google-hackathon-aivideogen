#!/bin/bash
# ─── DigitalOcean Droplet Initial Setup ───────────────────────────────────────
# Run this ONCE on a fresh droplet: ssh root@YOUR_IP 'bash -s' < scripts/setup-droplet.sh
set -euo pipefail

DEPLOY_PATH="/opt/atlas"
REPO_URL="https://github.com/trao-ai/google-hackathon-aivideogen.git"

echo "════════════════════════════════════════════"
echo "  Atlas - DigitalOcean Droplet Setup"
echo "════════════════════════════════════════════"

# ── 1. System updates ─────────────────────────────────────────────────────────
echo ""
echo "📦 Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install Docker ─────────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed: $(docker --version)"
else
    echo "✅ Docker already installed: $(docker --version)"
fi

# ── 3. Install Docker Compose plugin ──────────────────────────────────────────
if ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed: $(docker compose version)"
else
    echo "✅ Docker Compose already installed: $(docker compose version)"
fi

# ── 4. Install Git ────────────────────────────────────────────────────────────
if ! command -v git &> /dev/null; then
    echo "📌 Installing Git..."
    apt-get install -y git
fi
echo "✅ Git: $(git --version)"

# ── 5. Clone repository ──────────────────────────────────────────────────────
if [ ! -d "$DEPLOY_PATH" ]; then
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_PATH"
else
    echo "✅ Repository already exists at $DEPLOY_PATH"
    cd "$DEPLOY_PATH"
    git fetch origin main
    git reset --hard origin/main
fi

cd "$DEPLOY_PATH"

# ── 6. Create .env file from template ─────────────────────────────────────────
if [ ! -f "$DEPLOY_PATH/.env" ]; then
    echo "📝 Creating .env from template..."
    cp .env.production .env
    echo ""
    echo "⚠️  IMPORTANT: Edit $DEPLOY_PATH/.env with your actual values!"
    echo "   nano $DEPLOY_PATH/.env"
    echo ""
else
    echo "✅ .env file already exists"
fi

# ── 7. Configure firewall ────────────────────────────────────────────────────
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ Firewall configured (SSH, HTTP, HTTPS)"

# ── 8. Set up swap (for small droplets) ──────────────────────────────────────
if [ ! -f /swapfile ]; then
    echo "💾 Setting up 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap enabled"
else
    echo "✅ Swap already configured"
fi

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Setup complete!"
echo "════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Edit the .env file:  nano $DEPLOY_PATH/.env"
echo "  2. First deploy:        cd $DEPLOY_PATH && docker compose -f infra/docker/docker-compose.prod.yml --env-file .env up -d --build"
echo ""
echo "Or just push to 'main' branch and GitHub Actions will deploy automatically."
echo ""
