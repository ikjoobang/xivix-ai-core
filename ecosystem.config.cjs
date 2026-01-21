// PM2 Configuration for XIVIX AI Core V1.0
// Development environment with Cloudflare D1 local

module.exports = {
  apps: [
    {
      name: 'xivix-ai-core',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=xivix-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000
    }
  ]
};
