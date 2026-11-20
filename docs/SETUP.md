# Chhapai (چھپائی) — Production Deployment & Setup Guide

Yeh document ek fresh Ubuntu VPS par **Chhapai** system ko Docker Compose aur Caddy ke sath deploy karne aur shop PC par Windows Desktop app chalane ka mukammal tareeqa faraham karta hai.

---

## 1. System Requirements & Hardware

### Server (VPS)

- **OS:** Ubuntu 22.04 LTS ya Ubuntu 24.04 LTS
- **Compute:** Minimum 2 vCPU, 2 GB RAM (Recommended 4 GB RAM)
- **Disk:** Minimum 25 GB SSD / NVMe
- **Network:** Static Public IPv4, Ports `80` (HTTP) aur `443` (HTTPS) open.
- **DNS Records:**
  - `yourshop.pk` ➔ VPS Public IP (Customer Web App)
  - `api.yourshop.pk` ➔ VPS Public IP (NestJS REST API & WebSocket)

### Shop Windows PC (Counter)

- **OS:** Windows 10 ya Windows 11 (64-bit)
- **Printers:** Koi bhi standard USB ya Network printer (e.g., HP LaserJet, Canon LBP, Epson)
- **Network:** Outbound internet connection (Port 443 HTTPS / WSS). Koi inbound port forwarding zaroori nahi hai.

---

## 2. Server Par Docker & Tools Install Karein

Ubuntu VPS par SSH karein aur zaroori packages install karein:

```bash
# System packages update karein
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw ca-certificates gnupg

# Docker Engine & Docker Compose install karein
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Firewall (UFW) configure karein
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 3. Repository Clone & Environment Setup

```bash
# Repo clone karein
sudo git clone https://github.com/abdulhayykhan/Chhapai.git /opt/chhapai
cd /opt/chhapai

# Production environment file banayein
sudo cp .env.example .env
sudo nano .env
```

### Production `.env` File Example:

```ini
# Domains
DOMAIN=yourshop.pk
API_DOMAIN=api.yourshop.pk
ACME_EMAIL=owner@yourshop.pk

# Database (PostgreSQL 16)
POSTGRES_USER=chhapai
POSTGRES_PASSWORD=AikBohatMazbootPassword987!
POSTGRES_DB=chhapai_production

# JWT Secrets (Kam az kam 32 characters lambe random strings)
JWT_ACCESS_SECRET=c8f8b89d8e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1
JWT_REFRESH_SECRET=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2

# Web & API URLs
PUBLIC_WEB_URL=https://yourshop.pk
NEXT_PUBLIC_API_URL=https://api.yourshop.pk/api/v1
CORS_ORIGINS=https://yourshop.pk,https://www.yourshop.pk

# Storage & Timezone
STORAGE_PATH=/data/files
TZ=Asia/Karachi

# Initial Shop & Owner Seed
SEED_SHOP_SLUG=default
SEED_SHOP_NAME=Chhapai Print Shop
SEED_ADMIN_EMAIL=admin@yourshop.pk
SEED_ADMIN_PASSWORD=PehlaAdminPassword123!
```

---

## 4. Docker Compose Services Start Karein

```bash
cd /opt/chhapai

# Services build aur start karein
docker compose -f docker/docker-compose.yml up -d --build

# Container status check karein
docker compose -f docker/docker-compose.yml ps
```

### Database Migrations & Initial Seed Run Karein:

```bash
# Prisma migration deploy karein
docker compose -f docker/docker-compose.yml exec api pnpm --filter @chhapai/api prisma:deploy

# Initial shop aur admin user seed karein
docker compose -f docker/docker-compose.yml exec api pnpm --filter @chhapai/api prisma:seed
```

### Healthcheck Verify Karein:

```bash
curl -f https://api.yourshop.pk/api/v1/health
# Jawab: {"status":"ok","info":{"database":{"status":"up"}}}
```

---

## 5. Automated Nightly Database Backups

Chhapai PRD Section 13 ke mutabiq rozana raat database ka backup lena aur 7 din tak mehfooz rakhna zaroori hai:

```bash
# Backup script ko executable banayein
sudo chmod +x /opt/chhapai/docker/backup.sh

# Cron job add karein (Rozana raat 3:00 baje Asia/Karachi time)
(sudo crontab -l 2>/dev/null; echo "0 3 * * * /opt/chhapai/docker/backup.sh >> /var/log/chhapai-backup.log 2>&1") | sudo crontab -

# Test backup run karein
sudo /opt/chhapai/docker/backup.sh
ls -lh /var/backups/chhapai/
```

---

## 6. Shop Windows Counter App Setup

Shop ke Windows PC par operator counter application chalane ke steps:

1. **Installer Download / Build:**
   Monorepo se Windows installer build karein:
   ```powershell
   pnpm --filter @chhapai/desktop build
   # Installer output: apps/desktop/release/Chhapai-Setup-1.0.0.exe
   ```
2. **Installation:**
   `Chhapai-Setup-1.0.0.exe` run karein. Yeh desktop aur start menu shortcut khud bana dega.
3. **Login:**
   - App khol kar **Email** (`admin@yourshop.pk`) aur **Password** darj karein.
   - Advanced options me agar custom API server URL ho to `https://api.yourshop.pk` set karein.
4. **Printer Selection (Settings):**
   - Top right se **Settings** button dabayein.
   - Siyah/Safaid (B/W) aur Rangeen (Color) printers dropdown se muntakhib karein.
   - **Auto-Print ON** karein aur **"Windows ke sath start karein"** check karein.
5. **QR Code Counter Poster:**
   - Header me **QR Poster** button dabayein.
   - **Poster Print Karein** daba kar A4 poster print karein aur dukan ke counter pe lagayein.

---

## 7. Troubleshooting & Useful Commands

| Command                                                     | Maqsad                      |
| :---------------------------------------------------------- | :-------------------------- |
| `docker compose -f docker/docker-compose.yml logs -f api`   | API live logs dekhna        |
| `docker compose -f docker/docker-compose.yml logs -f caddy` | Caddy HTTPS logs dekhna     |
| `docker compose -f docker/docker-compose.yml restart api`   | API container restart karna |
| `docker compose -f docker/docker-compose.yml down`          | Tamaam services band karna  |
| `tail -f /var/log/chhapai-backup.log`                       | Database backup log dekhna  |
