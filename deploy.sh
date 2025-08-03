#!/bin/bash
# 部署腳本 - deploy.sh

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署贈品管理系統..."

# 1. 更新系統套件
echo "📦 更新系統套件..."
sudo apt update

# 2. 建立專案目錄
echo "📁 建立專案目錄..."
sudo mkdir -p /var/www/gift-management
cd /var/www/gift-management

# 3. 設置環境變數
echo "🔧 設置環境變數..."
export BASE_PATH="/gift"
export NODE_ENV="production"
export JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# 4. 安裝專案相依套件
echo "📥 安裝相依套件..."
npm install

# 5. 建立資料目錄並設置權限
echo "📂 建立資料目錄..."
sudo mkdir -p /var/www/gift-management/data
sudo chown -R $USER:$USER /var/www/gift-management
sudo chmod -R 755 /var/www/gift-management

# 6. 建立日誌目錄
echo "📋 建立日誌目錄..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# 7. 停止現有服務 (如果存在)
echo "🛑 停止現有服務..."
pm2 stop gift-management 2>/dev/null || true
pm2 delete gift-management 2>/dev/null || true

# 8. 啟動新服務
echo "▶️  啟動服務..."
pm2 start ecosystem.config.js --env production

# 9. 儲存 PM2 配置
echo "💾 儲存 PM2 配置..."
pm2 save

# 10. 設置 PM2 開機自動啟動
echo "🔄 設置開機自動啟動..."
pm2 startup

# 11. 配置 Nginx (如果尚未配置)
if [ ! -f /etc/nginx/sites-available/gift-management ]; then
    echo "🌐 配置 Nginx..."
    sudo cp nginx.conf /etc/nginx/sites-available/gift-management
    sudo ln -sf /etc/nginx/sites-available/gift-management /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
fi

# 12. 設置防火牆
echo "🔥 設置防火牆..."
sudo ufw allow 3000/tcp
sudo ufw allow 'Nginx Full'

echo "✅ 部署完成！"
echo ""
echo "📍 系統訪問地址："
echo "   HTTP:  http://$(curl -s ifconfig.me)/gift"
echo "   HTTPS: https://$(curl -s ifconfig.me)/gift (需配置SSL)"
echo ""
echo "🎯 測試帳號："
echo "   員工：emp001 / password"
echo "   主管：mgr001 / password"
echo ""
echo "🔧 管理指令："
echo "   查看狀態：pm2 status"
echo "   查看日誌：pm2 logs gift-management"
echo "   重啟服務：pm2 restart gift-management"
echo ""
echo "📖 更多資訊請查看 README.md"