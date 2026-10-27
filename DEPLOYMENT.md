# Deployment Documentation

This guide describes how to deploy ShikhoTuition BD to production on free-tier cloud platforms (Render, Fly.io, Railway, or VPS).

---

## 1. Zero Cost & Free Operation Philosophy

ShikhoTuition BD is deliberately engineered to require **zero paid APIs or subscriptions**:
- **WhatsApp Messaging**: Uses standard free WhatsApp click-to-chat links (`wa.me/8801...`). No paid WhatsApp Business Cloud API or Twilio credentials needed.
- **bKash Payments**: Operates via manual parent TrxID submission and teacher/admin verification against their own bKash merchant/personal statement. No merchant gateway fees or paid aggregator accounts required.
- **Database & Storage**: Stores persistent relational state in local disk file (`./data/database.json`) and uploads in `./uploads/`.

---

## 2. Deploying on Render (Free Web Service)

1. Connect your Git repository to [Render.com](https://render.com).
2. Choose **Web Service** with Node environment.
3. Set the following build and start commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `APP_URL`: `https://your-service-name.onrender.com`
5. Optional: Add a Persistent Disk on Render mounted at `/app/data` to retain student records across container restarts.

---

## 3. Deploying on Fly.io / Docker

Create a standard `Dockerfile`:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Run:
```bash
fly launch
fly volumes create tuition_data --size 1
fly deploy
```

---

## 4. Production Security Recommendations

1. **HTTPS**: Ensure your domain enforces TLS/HTTPS (automatic on Cloud Run, Render, and Fly).
2. **Backups**: Download regular database backups directly from Admin Panel > "Download Database JSON" or schedule a cron export of `./data/database.json`.
3. **Session Secrets**: Set a custom `SESSION_SECRET` in `.env` before serving production traffic.
