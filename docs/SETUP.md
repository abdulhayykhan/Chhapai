# Chhapai (چھپائی) — Production Deployment & Setup Guide

Yeh document **Chhapai** system ke do mukhtalif deployment models ki tafseelat faraham karta hai:
1. **Mode 1 (100% Free Zero-Cost Model - Recommended):** Customer portal Vercel par, database Supabase free cloud par, aur shop counter par standalone All-in-One Windows installer (`Chhapai Setup 1.0.0.exe`) jisme backend API khud embedded hai (bila kisi monthly server kharche ke).
2. **Mode 2 (Self-Hosted Linux VPS Model):** Agar dukan ka apna dedicated Ubuntu VPS server ho to Docker Compose aur Caddy ke zariye complete self-hosted setup.

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

## 6. Shop Windows Counter App Setup (All-in-One Standalone Installer)

Chhapai v1.0.0+ me shop counter PC ke liye **Standalone All-in-One Installer** (`Chhapai Setup 1.0.0.exe`) faraham kia gaya hai. Is installer ke andar Electron UI ke sath sath **NestJS Backend API, Prisma Engine, aur SumatraPDF** pehle se embedded hain. Dukan ke computer par alag se Node.js, terminal, ya koi server command chalane ki bilkul zaroorat nahi hai.

1. **Installer Download Karein:**
   - GitHub Releases page se `Chhapai Setup 1.0.0.exe` download karein:
     `https://github.com/abdulhayykhan/Chhapai/releases/tag/v1.0.0`
   - *(Agar khud compile karna ho to root directory se `pnpm --filter @chhapai/desktop package` run karein)*.

2. **Installation & Automatic Background Server:**
   - `Chhapai Setup 1.0.0.exe` par double-click karein. Yeh desktop aur Start Menu shortcut bana dega.
   - Jaise hi aap app open karenge, Electron ka internal server manager check karega ke port 3001 active hai ya nahi. Agar active nahi hoga to embedded NestJS backend API background me khamoshi se start hojayegi aur Supabase cloud PostgreSQL database se connect hojayegi.

3. **Login Karein:**
   - Default Administrator Credentials:
     - **Email:** `admin@chhapai.com`
     - **Password:** `SuperSecurePassword123!`
     - **Server URL:** `http://localhost:3001` (Yeh pehle se set hota hai, kisi change ki zaroorat nahi).
   - "Login Karein" button dabayein.

4. **Printers Configure Karein (Settings):**
   - Counter dashboard par top-right se **Settings** icon dabayein.
   - **Black & White Printer** aur **Color Printer** dropdown se apne physical printers select karein.
   - **Auto-Print Mode** on karein taake customer ke approve hone wale orders foran print ho saken.

5. **Counter QR Code Poster Print Karein:**
   - Top bar se **QR Poster** button dabayein.
   - **Poster Print Karein** daba kar A4 counter poster print karein aur dukan ke counter par chipka dein. Walk-in customers is QR code ko scan karke direct apne mobile se files upload kar sakenge.

6. **Process Lifecycle Management:**
   - Jab aap application ko minimize karte hain, yeh Windows System Tray me chali jati hai aur background me orders process karti rehti hai.
   - Jab aap app ko quit karte hain, to embedded backend API processes bhi cleanly terminate hojate hain.

---

## 7. Troubleshooting & Useful Commands

| Command                                                     | Maqsad                      |
| :---------------------------------------------------------- | :-------------------------- |
| `docker compose -f docker/docker-compose.yml logs -f api`   | API live logs dekhna        |
| `docker compose -f docker/docker-compose.yml logs -f caddy` | Caddy HTTPS logs dekhna     |
| `docker compose -f docker/docker-compose.yml restart api`   | API container restart karna |
| `docker compose -f docker/docker-compose.yml down`          | Tamaam services band karna  |
| `tail -f /var/log/chhapai-backup.log`                       | Database backup log dekhna  |
