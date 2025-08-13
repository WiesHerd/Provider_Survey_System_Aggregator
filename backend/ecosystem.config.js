module.exports = {
  apps: [{
    name: 'survey-aggregator-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Restart on crash
    max_restarts: 10,
    min_uptime: '10s',
    // Wait 5 seconds before restarting
    restart_delay: 5000
  }]
};
