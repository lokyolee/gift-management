# 贈品管理系統 v2.0

完整的企業級贈品管理系統，支援員工庫存管理、申請審批流程、Excel匯出等功能。

## 🎯 系統特色

### 👥 角色權限
- **員工 (Employee)**：查看個人庫存、提交申請、登記送出
- **主管 (Manager)**：總覽管理、審批申請、手動調整、匯出報表、員工管理

### 📱 手機優化
- **大按鈕設計**：適合年長使用者的 60px+ 觸控目標
- **高對比度**：清晰易讀的視覺設計
- **簡潔導航**：底部大圖標導航
- **單手操作**：優化的觸控體驗

### 🔧 技術架構
- **前端**：Vanilla JavaScript + CSS3
- **後端**：Node.js + Express.js
- **認證**：JWT Token
- **儲存**：JSON 檔案系統
- **部署**：DigitalOcean Droplet + Nginx + PM2

## 📦 安裝部署

### 1. 準備環境
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Node.js (使用 NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts

# 安裝全域套件
npm install -g pm2
```

### 2. 上傳專案檔案
```bash
# 建立專案目錄
sudo mkdir -p /var/www/gift-management
cd /var/www/gift-management

# 上傳所有檔案到此目錄
# 確保檔案結構如下：
# ├── server.js
# ├── package.json
# ├── ecosystem.config.js
# ├── nginx.conf
# ├── deploy.sh
# └── public/
#     ├── index.html
#     ├── style.css
#     └── app.js
```

### 3. 安裝依賴套件
```bash
npm install
```

### 4. 配置環境變數
```bash
# 編輯 ecosystem.config.js 修改以下設定：
# - BASE_PATH: '/gift'
# - JWT_SECRET: '您的密鑰'
# - server_name: '您的域名'
```

### 5. 啟動服務
```bash
# 使用 PM2 啟動
pm2 start ecosystem.config.js --env production

# 查看狀態
pm2 status

# 設定開機啟動
pm2 startup
pm2 save
```

### 6. 配置 Nginx 子路徑
```bash
# 複製 Nginx 配置
sudo cp nginx.conf /etc/nginx/sites-available/gift-management

# 編輯配置檔案，替換 xxxx.com 為您的實際域名
sudo nano /etc/nginx/sites-available/gift-management

# 啟用站點
sudo ln -s /etc/nginx/sites-available/gift-management /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重載 Nginx
sudo systemctl reload nginx
```

### 7. 設定 SSL (可選)
```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申請 SSL 憑證
sudo certbot --nginx -d yourdomain.com

# 自動續約測試
sudo certbot renew --dry-run
```

## 🌐 訪問系統

- **主要網址**：`https://yourdomain.com/gift`
- **API 文檔**：`https://yourdomain.com/gift/api`

### 🔑 測試帳號

| 角色 | 帳號 | 密碼 | 姓名 | 工號 |
|------|------|------|------|------|
| 員工 | emp001 | password | 王小明 | E001 |
| 員工 | emp002 | password | 李小華 | E002 |
| 主管 | mgr001 | password | 張主管 | M001 |

## 🛠️ 維護指令

### PM2 服務管理
```bash
# 查看服務狀態
pm2 status

# 查看即時日誌
pm2 logs gift-management

# 重啟服務
pm2 restart gift-management

# 停止服務
pm2 stop gift-management

# 監控資源使用
pm2 monit
```

### 資料管理
```bash
# 備份資料
cp /var/www/gift-management/data/giftSystemData.json ~/backup-$(date +%Y%m%d).json

# 查看資料檔案
cat /var/www/gift-management/data/giftSystemData.json | jq '.'

# 重置資料 (謹慎使用)
rm /var/www/gift-management/data/giftSystemData.json
pm2 restart gift-management
```

### Nginx 管理
```bash
# 測試配置
sudo nginx -t

# 重載配置
sudo systemctl reload nginx

# 查看錯誤日誌
sudo tail -f /var/log/nginx/error.log

# 查看訪問日誌
sudo tail -f /var/log/nginx/access.log
```

## 📊 功能說明

### 員工功能
- ✅ **庫存查詢**：查看個人持有的所有贈品數量
- ✅ **送出登記**：登記當日送出的贈品，自動扣減庫存
- ✅ **增發申請**：申請增加特定贈品數量
- ✅ **轉移申請**：申請將贈品轉移給其他員工
- ✅ **交易紀錄**：查看完整的出入庫流水記錄

### 主管功能
- ✅ **總覽儀表板**：查看所有員工的贈品持有情況
- ✅ **申請審批**：審批員工的增發和轉移申請
- ✅ **庫存調整**：手動調整任意員工的贈品數量
- ✅ **Excel 匯出**：一鍵匯出完整的庫存報表
- ✅ **員工管理**：管理員工基本資料和角色權限
- ✅ **搜尋篩選**：按姓名、工號、贈品等條件篩選

## 🔄 API 介面

### 認證相關
- `POST /api/auth/login` - 使用者登入
- `GET /api/auth/verify` - 驗證 token

### 庫存管理
- `GET /api/inventory/my` - 取得個人庫存
- `GET /api/inventory/all` - 取得所有庫存 (主管)
- `POST /api/inventory/send` - 送出贈品
- `PUT /api/inventory/:userId/:giftId` - 調整庫存 (主管)

### 申請管理
- `POST /api/requests` - 提交申請
- `GET /api/requests/my` - 個人申請記錄
- `GET /api/requests/pending` - 待審批申請 (主管)
- `PUT /api/requests/:id/approve` - 批准申請 (主管)
- `PUT /api/requests/:id/reject` - 拒絕申請 (主管)

### 資料匯出
- `GET /api/export/excel` - 匯出 Excel 報表 (主管)

### 使用者管理
- `GET /api/users` - 取得所有使用者 (主管)
- `POST /api/users` - 新增使用者 (主管)
- `PUT /api/users/:id` - 更新使用者 (主管)

## 🚨 故障排除

### 常見問題

**1. 無法訪問系統**
```bash
# 檢查服務狀態
pm2 status
sudo systemctl status nginx

# 檢查防火牆
sudo ufw status
```

**2. API 返回 401 錯誤**
- 檢查 JWT_SECRET 是否設置正確
- 確認 token 未過期

**3. 檔案權限錯誤**
```bash
# 設置正確權限
sudo chown -R $USER:$USER /var/www/gift-management
sudo chmod -R 755 /var/www/gift-management
```

**4. Nginx 502 錯誤**
```bash
# 檢查 Node.js 服務是否正常
pm2 logs gift-management
```

## 📈 效能優化

### 建議設定
- **資料備份**：設置定期自動備份
- **日誌輪轉**：配置日誌檔案輪轉
- **監控告警**：設置服務監控和告警
- **安全更新**：定期更新系統套件

### 擴展性
- 支援水平擴展到多台伺服器
- 可整合外部資料庫 (MySQL, PostgreSQL)
- 支援 Redis 快取層
- 可加入訊息佇列系統

## 📞 技術支援

如有問題請檢查：
1. PM2 服務狀態：`pm2 status`
2. Nginx 配置：`sudo nginx -t`
3. 系統日誌：`pm2 logs gift-management`
4. 資料檔案權限：`ls -la /var/www/gift-management/data/`

---

**版本**：v2.0  
**更新日期**：2025-01-XX  
**支援**：Node.js 18+, Ubuntu 20.04+