# Farm Management System

This is a Node.js Express application for managing dairy, poultry, and farm operations.

## Requirements
- Node.js (16+ recommended)
- MongoDB

## Environment
Create a `.env` file from `.env.example` and set production values.

Important variables:
- `PORT` — server port
- `MONGO_URI` — MongoDB connection string
- `SESSION_SECRET` — secure random value
- `FRONTEND_URL` — allowed origin for Socket.IO
- `NODE_ENV` — set to `production` in production
- `MORGAN_FORMAT` — logging format

Example production deployment values:
```bash
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority
SESSION_SECRET=<long-random-string>
FRONTEND_URL=https://your-domain.com
```

## Run (development)
Install dependencies and start in development mode:

```bash
npm install
npm run dev
```

## Run (production with PM2)
PM2 provides process management and automatic restarts.

```bash
# install pm2 locally as dev dependency (optional)
npm install --omit=dev
# start using npm script
npm run start:prod

# View logs
npm run pm2:logs

# Stop
npm run pm2:stop
```

## Deployment notes
- Use a reverse proxy (NGINX or similar) to handle TLS and serve static assets.
- Ensure `NODE_ENV=production`, `SESSION_SECRET`, `MONGO_URI`, and `FRONTEND_URL` are set.
- Use a managed MongoDB or run MongoDB with proper backups and monitoring.
- The app exposes a health check at `/health` for load balancer and uptime monitoring.
- Keep `SESSION_SECRET` in a secure secret store and never hardcode it in source control.
- Run the service behind PM2 or another process manager with automatic restart enabled.

## Production checklist
- [ ] Production `.env` file configured
- [ ] HTTPS enabled by a reverse proxy
- [ ] MongoDB reachable from the deployment host
- [ ] PM2 or equivalent process manager running
- [ ] Health endpoint verified at `/health`
- [ ] Logs monitored and retained

## Reverse proxy example
A sample NGINX configuration is provided in `nginx.conf.example`.

Use it with a TLS certificate from Let’s Encrypt and point traffic to the Express server on port `3000`.

## Production start command
```bash
npm install --omit=dev
NODE_ENV=production PORT=3000 pm2 start ecosystem.config.js --env production
```

## Files added
- `ecosystem.config.js` – PM2 ecosystem file
- `.env.example` – provided earlier

