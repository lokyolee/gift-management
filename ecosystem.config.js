// PM2 生態系統配置 - ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'gift-management',
      script: '/var/www/gift-management/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BASE_PATH: '/gift',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        BASE_PATH: '',
        JWT_SECRET: 'dev-secret-key'
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: '/var/log/pm2/gift-management-error.log',
      out_file: '/var/log/pm2/gift-management-out.log',
      log_file: '/var/log/pm2/gift-management-combined.log',
      time: true
    }
  ]
};