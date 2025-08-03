// 完整贈品管理系統後端伺服器
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 資料檔案路徑
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'giftSystemData.json');

// 中間件設定
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 靜態檔案服務 - 支援子路徑
if (BASE_PATH) {
    app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
}

// 確保資料目錄存在
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// 初始化資料
function getInitialData() {
    const now = new Date().toISOString();
    return {
        users: [
            {
                id: 1,
                username: "emp001",
                password: bcrypt.hashSync("password", 10),
                fullName: "王小明",
                employeeId: "E001",
                storeId: 1,
                role: "employee",
                status: "active",
                createdAt: now,
                updatedAt: now
            },
            {
                id: 2,
                username: "emp002", 
                password: bcrypt.hashSync("password", 10),
                fullName: "李小華",
                employeeId: "E002",
                storeId: 1,
                role: "employee",
                status: "active",
                createdAt: now,
                updatedAt: now
            },
            {
                id: 3,
                username: "mgr001",
                password: bcrypt.hashSync("password", 10),
                fullName: "張主管",
                employeeId: "M001",
                storeId: 1,
                role: "manager",
                status: "active",
                createdAt: now,
                updatedAt: now
            }
        ],
        stores: [
            {
                id: 1,
                storeName: "台北旗艦店",
                storeCode: "TPE001",
                address: "台北市信義區信義路五段7號",
                status: "active",
                createdAt: now
            }
        ],
        gifts: [
            {
                id: 1,
                giftCode: "G001",
                giftName: "精美手錶",
                category: "配件",
                description: "高質感商務手錶",
                status: "active",
                createdAt: now
            },
            {
                id: 2,
                giftCode: "G002", 
                giftName: "咖啡禮盒",
                category: "食品",
                description: "精選咖啡豆禮盒",
                status: "active",
                createdAt: now
            },
            {
                id: 3,
                giftCode: "G003",
                giftName: "保溫杯",
                category: "生活用品", 
                description: "316不鏽鋼保溫杯",
                status: "active",
                createdAt: now
            },
            {
                id: 4,
                giftCode: "G004",
                giftName: "藍牙耳機",
                category: "電子產品",
                description: "無線藍牙立體聲耳機",
                status: "active",
                createdAt: now
            },
            {
                id: 5,
                giftCode: "G005",
                giftName: "香水組合",
                category: "美妝",
                description: "精選香水三件組",
                status: "active",
                createdAt: now
            }
        ],
        giftInventory: [
            { id: 1, userId: 1, giftId: 1, quantity: 5, lastUpdated: now },
            { id: 2, userId: 1, giftId: 2, quantity: 10, lastUpdated: now },
            { id: 3, userId: 1, giftId: 3, quantity: 8, lastUpdated: now },
            { id: 4, userId: 2, giftId: 1, quantity: 3, lastUpdated: now },
            { id: 5, userId: 2, giftId: 4, quantity: 6, lastUpdated: now },
            { id: 6, userId: 2, giftId: 5, quantity: 4, lastUpdated: now }
        ],
        giftRequests: [
            {
                id: 1,
                requesterId: 1,
                giftId: 2,
                requestType: "increase",
                requestedQuantity: 5,
                approvedQuantity: null,
                targetUserId: null,
                purpose: "客戶活動需求",
                status: "pending",
                approverId: null,
                rejectionReason: null,
                createdAt: now,
                approvedAt: null
            },
            {
                id: 2,
                requesterId: 2,
                giftId: 1,
                requestType: "transfer",
                requestedQuantity: 2,
                approvedQuantity: null,
                targetUserId: 1,
                purpose: "門店調配需求",
                status: "pending",
                approverId: null,
                rejectionReason: null,
                createdAt: now,
                approvedAt: null
            }
        ],
        giftTransactions: [],
        nextIds: {
            users: 4,
            stores: 2,
            gifts: 6,
            giftInventory: 7,
            giftRequests: 3,
            giftTransactions: 1
        }
    };
}

// 讀取資料
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('初次啟動，建立初始資料...');
        const initialData = getInitialData();
        await writeData(initialData);
        return initialData;
    }
}

// 寫入資料
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// JWT 中間件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: '需要登入權限' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: '無效的登入權限' });
        }
        req.user = user;
        next();
    });
}

// 角色檢查中間件
function requireRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: '權限不足' });
        }
        next();
    };
}

// =============================================================================
// 認證 API
// =============================================================================

// 使用者登入
app.post(`${BASE_PATH}/api/auth/login`, async (req, res) => {
    try {
        const { username, password } = req.body;
        const data = await readData();
        
        const user = data.users.find(u => 
            u.username === username && u.status === 'active'
        );
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ 
                success: false, 
                message: '帳號或密碼錯誤' 
            });
        }
        
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                storeId: user.storeId
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        const userInfo = { ...user };
        delete userInfo.password;
        
        res.json({ 
            success: true, 
            token,
            user: userInfo
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: '伺服器錯誤' 
        });
    }
});

// 驗證 token
app.get(`${BASE_PATH}/api/auth/verify`, authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// =============================================================================
// 庫存管理 API
// =============================================================================

// 取得個人庫存
app.get(`${BASE_PATH}/api/inventory/my`, authenticateToken, async (req, res) => {
    try {
        const data = await readData();
        const inventory = data.giftInventory
            .filter(inv => inv.userId === req.user.id)
            .map(inv => {
                const gift = data.gifts.find(g => g.id === inv.giftId);
                return { ...inv, gift };
            })
            .filter(inv => inv.gift && inv.gift.status === 'active');
            
        res.json(inventory);
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 取得所有庫存 (主管)
app.get(`${BASE_PATH}/api/inventory/all`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const data = await readData();
        const { search, storeId } = req.query;
        
        let inventory = data.giftInventory.map(inv => {
            const user = data.users.find(u => u.id === inv.userId);
            const gift = data.gifts.find(g => g.id === inv.giftId);
            const store = data.stores.find(s => s.id === user?.storeId);
            return { 
                ...inv, 
                user: user ? { ...user, password: undefined } : null, 
                gift, 
                store 
            };
        }).filter(inv => 
            inv.user && 
            inv.gift && 
            inv.user.status === 'active' && 
            inv.gift.status === 'active'
        );
        
        // 搜尋過濾
        if (search) {
            const searchLower = search.toLowerCase();
            inventory = inventory.filter(inv => 
                inv.user.fullName.toLowerCase().includes(searchLower) ||
                inv.user.employeeId.toLowerCase().includes(searchLower) ||
                inv.gift.giftName.toLowerCase().includes(searchLower) ||
                inv.gift.giftCode.toLowerCase().includes(searchLower)
            );
        }
        
        // 門店過濾
        if (storeId) {
            inventory = inventory.filter(inv => inv.user.storeId == storeId);
        }
        
        res.json(inventory);
    } catch (error) {
        console.error('Get all inventory error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 送出贈品
app.post(`${BASE_PATH}/api/inventory/send`, authenticateToken, async (req, res) => {
    try {
        const { giftId, quantity, reason } = req.body;
        const data = await readData();
        
        // 檢查庫存
        const invIndex = data.giftInventory.findIndex(inv => 
            inv.userId === req.user.id && inv.giftId === giftId
        );
        
        if (invIndex === -1 || data.giftInventory[invIndex].quantity < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: '庫存不足' 
            });
        }
        
        // 更新庫存
        data.giftInventory[invIndex].quantity -= quantity;
        data.giftInventory[invIndex].lastUpdated = new Date().toISOString();
        
        // 記錄交易
        data.giftTransactions.push({
            id: data.nextIds.giftTransactions++,
            userId: req.user.id,
            giftId: giftId,
            transactionType: 'send',
            quantity: -quantity,
            referenceUserId: null,
            reason: reason || '當日送出',
            status: 'completed',
            createdBy: req.user.id,
            createdAt: new Date().toISOString()
        });
        
        await writeData(data);
        res.json({ success: true, message: '贈品送出成功' });
        
    } catch (error) {
        console.error('Send gift error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 手動調整庫存 (主管)
app.put(`${BASE_PATH}/api/inventory/:userId/:giftId`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const giftId = parseInt(req.params.giftId);
        const { quantity, reason } = req.body;
        const data = await readData();
        
        // 尋找或建立庫存記錄
        let invIndex = data.giftInventory.findIndex(inv => 
            inv.userId === userId && inv.giftId === giftId
        );
        
        const oldQuantity = invIndex !== -1 ? data.giftInventory[invIndex].quantity : 0;
        const now = new Date().toISOString();
        
        if (invIndex !== -1) {
            data.giftInventory[invIndex].quantity = quantity;
            data.giftInventory[invIndex].lastUpdated = now;
        } else {
            data.giftInventory.push({
                id: data.nextIds.giftInventory++,
                userId: userId,
                giftId: giftId,
                quantity: quantity,
                lastUpdated: now
            });
        }
        
        // 記錄交易
        data.giftTransactions.push({
            id: data.nextIds.giftTransactions++,
            userId: userId,
            giftId: giftId,
            transactionType: 'adjust',
            quantity: quantity - oldQuantity,
            referenceUserId: null,
            reason: reason,
            status: 'completed',
            createdBy: req.user.id,
            createdAt: now
        });
        
        await writeData(data);
        res.json({ success: true, message: '庫存調整成功' });
        
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// =============================================================================
// 申請管理 API
// =============================================================================

// 提交申請
app.post(`${BASE_PATH}/api/requests`, authenticateToken, async (req, res) => {
    try {
        const { giftId, requestType, requestedQuantity, targetUserId, purpose } = req.body;
        const data = await readData();
        
        // 驗證目標使用者 (轉移申請)
        if (requestType === 'transfer' && targetUserId) {
            const targetUser = data.users.find(u => u.id === targetUserId && u.status === 'active');
            if (!targetUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: '目標使用者不存在' 
                });
            }
            
            // 檢查是否有足夠庫存
            const inventory = data.giftInventory.find(inv => 
                inv.userId === req.user.id && inv.giftId === giftId
            );
            if (!inventory || inventory.quantity < requestedQuantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: '庫存不足，無法轉移' 
                });
            }
        }
        
        const newRequest = {
            id: data.nextIds.giftRequests++,
            requesterId: req.user.id,
            giftId: giftId,
            requestType: requestType,
            requestedQuantity: requestedQuantity,
            approvedQuantity: null,
            targetUserId: targetUserId || null,
            purpose: purpose,
            status: 'pending',
            approverId: null,
            rejectionReason: null,
            createdAt: new Date().toISOString(),
            approvedAt: null
        };
        
        data.giftRequests.push(newRequest);
        await writeData(data);
        
        res.json({ success: true, request: newRequest, message: '申請已提交' });
        
    } catch (error) {
        console.error('Submit request error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 取得個人申請記錄
app.get(`${BASE_PATH}/api/requests/my`, authenticateToken, async (req, res) => {
    try {
        const data = await readData();
        const requests = data.giftRequests
            .filter(req => req.requesterId === req.user.id)
            .map(req => {
                const gift = data.gifts.find(g => g.id === req.giftId);
                const targetUser = req.targetUserId ? 
                    data.users.find(u => u.id === req.targetUserId) : null;
                const approver = req.approverId ? 
                    data.users.find(u => u.id === req.approverId) : null;
                
                return {
                    ...req,
                    gift,
                    targetUser: targetUser ? { ...targetUser, password: undefined } : null,
                    approver: approver ? { ...approver, password: undefined } : null
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
        res.json(requests);
    } catch (error) {
        console.error('Get my requests error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 取得待審批申請 (主管)
app.get(`${BASE_PATH}/api/requests/pending`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const data = await readData();
        const requests = data.giftRequests
            .filter(req => req.status === 'pending')
            .map(req => {
                const requester = data.users.find(u => u.id === req.requesterId);
                const gift = data.gifts.find(g => g.id === req.giftId);
                const targetUser = req.targetUserId ? 
                    data.users.find(u => u.id === req.targetUserId) : null;
                
                return {
                    ...req,
                    requester: requester ? { ...requester, password: undefined } : null,
                    gift,
                    targetUser: targetUser ? { ...targetUser, password: undefined } : null
                };
            })
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
        res.json(requests);
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 審批申請 (主管)
app.put(`${BASE_PATH}/api/requests/:id/approve`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { approvedQuantity } = req.body;
        const data = await readData();
        
        const request = data.giftRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ 
                success: false, 
                message: '申請不存在或已處理' 
            });
        }
        
        const finalQuantity = approvedQuantity || request.requestedQuantity;
        const now = new Date().toISOString();
        
        // 更新申請狀態
        request.status = 'approved';
        request.approverId = req.user.id;
        request.approvedQuantity = finalQuantity;
        request.approvedAt = now;
        
        // 處理庫存變更
        if (request.requestType === 'increase') {
            // 增發申請
            const invIndex = data.giftInventory.findIndex(inv => 
                inv.userId === request.requesterId && inv.giftId === request.giftId
            );
            
            if (invIndex !== -1) {
                data.giftInventory[invIndex].quantity += finalQuantity;
                data.giftInventory[invIndex].lastUpdated = now;
            } else {
                data.giftInventory.push({
                    id: data.nextIds.giftInventory++,
                    userId: request.requesterId,
                    giftId: request.giftId,
                    quantity: finalQuantity,
                    lastUpdated: now
                });
            }
            
            // 記錄交易
            data.giftTransactions.push({
                id: data.nextIds.giftTransactions++,
                userId: request.requesterId,
                giftId: request.giftId,
                transactionType: 'receive',
                quantity: finalQuantity,
                referenceUserId: null,
                reason: `增發申請批准: ${request.purpose}`,
                status: 'completed',
                createdBy: req.user.id,
                createdAt: now
            });
            
        } else if (request.requestType === 'transfer') {
            // 轉移申請
            // 從申請者扣除
            const fromInvIndex = data.giftInventory.findIndex(inv => 
                inv.userId === request.requesterId && inv.giftId === request.giftId
            );
            
            if (fromInvIndex !== -1) {
                data.giftInventory[fromInvIndex].quantity -= finalQuantity;
                data.giftInventory[fromInvIndex].lastUpdated = now;
            }
            
            // 給目標使用者增加
            const toInvIndex = data.giftInventory.findIndex(inv => 
                inv.userId === request.targetUserId && inv.giftId === request.giftId
            );
            
            if (toInvIndex !== -1) {
                data.giftInventory[toInvIndex].quantity += finalQuantity;
                data.giftInventory[toInvIndex].lastUpdated = now;
            } else {
                data.giftInventory.push({
                    id: data.nextIds.giftInventory++,
                    userId: request.targetUserId,
                    giftId: request.giftId,
                    quantity: finalQuantity,
                    lastUpdated: now
                });
            }
            
            // 記錄轉出交易
            data.giftTransactions.push({
                id: data.nextIds.giftTransactions++,
                userId: request.requesterId,
                giftId: request.giftId,
                transactionType: 'transfer',
                quantity: -finalQuantity,
                referenceUserId: request.targetUserId,
                reason: `轉移申請批准: ${request.purpose}`,
                status: 'completed',
                createdBy: req.user.id,
                createdAt: now
            });
            
            // 記錄轉入交易
            data.giftTransactions.push({
                id: data.nextIds.giftTransactions++,
                userId: request.targetUserId,
                giftId: request.giftId,
                transactionType: 'receive',
                quantity: finalQuantity,
                referenceUserId: request.requesterId,
                reason: `接收轉移: ${request.purpose}`,
                status: 'completed',
                createdBy: req.user.id,
                createdAt: now
            });
        }
        
        await writeData(data);
        res.json({ success: true, request, message: '申請已批准' });
        
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 拒絕申請 (主管)
app.put(`${BASE_PATH}/api/requests/:id/reject`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { reason } = req.body;
        const data = await readData();
        
        const request = data.giftRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ 
                success: false, 
                message: '申請不存在或已處理' 
            });
        }
        
        request.status = 'rejected';
        request.approverId = req.user.id;
        request.rejectionReason = reason;
        request.approvedAt = new Date().toISOString();
        
        await writeData(data);
        res.json({ success: true, request, message: '申請已拒絕' });
        
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// =============================================================================
// 交易記錄 API
// =============================================================================

// 取得個人交易記錄
app.get(`${BASE_PATH}/api/transactions/my`, authenticateToken, async (req, res) => {
    try {
        const data = await readData();
        const transactions = data.giftTransactions
            .filter(trans => trans.userId === req.user.id)
            .map(trans => {
                const gift = data.gifts.find(g => g.id === trans.giftId);
                const referenceUser = trans.referenceUserId ? 
                    data.users.find(u => u.id === trans.referenceUserId) : null;
                const createdBy = data.users.find(u => u.id === trans.createdBy);
                
                return {
                    ...trans,
                    gift,
                    referenceUser: referenceUser ? { ...referenceUser, password: undefined } : null,
                    createdBy: createdBy ? { ...createdBy, password: undefined } : null
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
        res.json(transactions);
    } catch (error) {
        console.error('Get my transactions error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// =============================================================================
// 資料匯出 API
// =============================================================================

// 匯出 Excel 報表 (主管)
app.get(`${BASE_PATH}/api/export/excel`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const data = await readData();
        
        // 準備匯出資料
        const exportData = data.giftInventory.map(inv => {
            const user = data.users.find(u => u.id === inv.userId);
            const gift = data.gifts.find(g => g.id === inv.giftId);
            const store = data.stores.find(s => s.id === user?.storeId);
            
            return {
                '員工姓名': user?.fullName || '',
                '工號': user?.employeeId || '',
                '所屬門店': store?.storeName || '',
                '贈品編號': gift?.giftCode || '',
                '贈品名稱': gift?.giftName || '',
                '類別': gift?.category || '',
                '持有數量': inv.quantity,
                '最後更新': new Date(inv.lastUpdated).toLocaleString('zh-TW')
            };
        }).filter(item => item['員工姓名'] && item['贈品名稱']);
        
        // 建立工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // 設定欄寬
        const colWidths = [
            { wch: 12 }, // 員工姓名
            { wch: 10 }, // 工號
            { wch: 15 }, // 所屬門店
            { wch: 12 }, // 贈品編號
            { wch: 20 }, // 贈品名稱
            { wch: 10 }, // 類別
            { wch: 10 }, // 持有數量
            { wch: 18 }  // 最後更新
        ];
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, '贈品庫存報表');
        
        // 生成 Excel 檔案
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        // 設定回應標頭
        const filename = `贈品庫存報表_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        
        res.send(excelBuffer);
        
    } catch (error) {
        console.error('Export excel error:', error);
        res.status(500).json({ success: false, message: '匯出失敗' });
    }
});

// =============================================================================
// 使用者管理 API (主管)
// =============================================================================

// 取得所有使用者
app.get(`${BASE_PATH}/api/users`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const data = await readData();
        const users = data.users.map(user => {
            const store = data.stores.find(s => s.id === user.storeId);
            return {
                ...user,
                password: undefined,
                store
            };
        });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 新增使用者
app.post(`${BASE_PATH}/api/users`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const { username, password, fullName, employeeId, storeId, role } = req.body;
        const data = await readData();
        
        // 檢查使用者名稱是否已存在
        const existingUser = data.users.find(u => u.username === username);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: '使用者名稱已存在' 
            });
        }
        
        // 檢查工號是否已存在
        const existingEmployee = data.users.find(u => u.employeeId === employeeId);
        if (existingEmployee) {
            return res.status(400).json({ 
                success: false, 
                message: '工號已存在' 
            });
        }
        
        const now = new Date().toISOString();
        const newUser = {
            id: data.nextIds.users++,
            username,
            password: bcrypt.hashSync(password, 10),
            fullName,
            employeeId,
            storeId: parseInt(storeId),
            role,
            status: 'active',
            createdAt: now,
            updatedAt: now
        };
        
        data.users.push(newUser);
        await writeData(data);
        
        const responseUser = { ...newUser };
        delete responseUser.password;
        
        res.json({ success: true, user: responseUser, message: '使用者新增成功' });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 更新使用者
app.put(`${BASE_PATH}/api/users/:id`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { username, password, fullName, employeeId, storeId, role, status } = req.body;
        const data = await readData();
        
        const userIndex = data.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: '使用者不存在' 
            });
        }
        
        // 檢查使用者名稱是否與其他使用者重複
        if (username) {
            const existingUser = data.users.find(u => 
                u.username === username && u.id !== userId
            );
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: '使用者名稱已存在' 
                });
            }
        }
        
        // 檢查工號是否與其他使用者重複
        if (employeeId) {
            const existingEmployee = data.users.find(u => 
                u.employeeId === employeeId && u.id !== userId
            );
            if (existingEmployee) {
                return res.status(400).json({ 
                    success: false, 
                    message: '工號已存在' 
                });
            }
        }
        
        // 更新使用者資料
        const updatedUser = {
            ...data.users[userIndex],
            username: username || data.users[userIndex].username,
            fullName: fullName || data.users[userIndex].fullName,
            employeeId: employeeId || data.users[userIndex].employeeId,
            storeId: storeId ? parseInt(storeId) : data.users[userIndex].storeId,
            role: role || data.users[userIndex].role,
            status: status || data.users[userIndex].status,
            updatedAt: new Date().toISOString()
        };
        
        // 如果提供了新密碼，則更新密碼
        if (password && password.trim() !== '') {
            updatedUser.password = bcrypt.hashSync(password, 10);
        }
        
        data.users[userIndex] = updatedUser;
        await writeData(data);
        
        const responseUser = { ...updatedUser };
        delete responseUser.password;
        
        res.json({ success: true, user: responseUser, message: '使用者更新成功' });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 刪除使用者
app.delete(`${BASE_PATH}/api/users/:id`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const data = await readData();
        
        // 檢查是否為當前使用者
        if (userId === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: '無法刪除自己的帳號' 
            });
        }
        
        const userIndex = data.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: '使用者不存在' 
            });
        }
        
        // 刪除使用者
        data.users.splice(userIndex, 1);
        
        // 刪除相關的庫存記錄
        data.giftInventory = data.giftInventory.filter(inv => inv.userId !== userId);
        
        // 刪除相關的申請記錄
        data.giftRequests = data.giftRequests.filter(req => req.requesterId !== userId);
        
        // 刪除相關的交易記錄
        data.giftTransactions = data.giftTransactions.filter(trans => trans.userId !== userId);
        
        await writeData(data);
        
        res.json({ success: true, message: '使用者刪除成功' });
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 切換使用者狀態
app.patch(`${BASE_PATH}/api/users/:id/status`, authenticateToken, requireRole(['manager']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { status } = req.body;
        const data = await readData();
        
        // 檢查是否為當前使用者
        if (userId === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: '無法修改自己的帳號狀態' 
            });
        }
        
        const userIndex = data.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: '使用者不存在' 
            });
        }
        
        // 更新使用者狀態
        data.users[userIndex].status = status;
        data.users[userIndex].updatedAt = new Date().toISOString();
        
        await writeData(data);
        
        const responseUser = { ...data.users[userIndex] };
        delete responseUser.password;
        
        res.json({ 
            success: true, 
            user: responseUser, 
            message: `使用者已${status === 'active' ? '啟用' : '停用'}` 
        });
        
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// =============================================================================
// 基礎資料 API
// =============================================================================

// 取得所有贈品
app.get(`${BASE_PATH}/api/gifts`, authenticateToken, async (req, res) => {
    try {
        const data = await readData();
        const gifts = data.gifts.filter(g => g.status === 'active');
        res.json(gifts);
    } catch (error) {
        console.error('Get gifts error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 取得所有門店
app.get(`${BASE_PATH}/api/stores`, authenticateToken, async (req, res) => {
    try {
        const data = await readData();
        const stores = data.stores.filter(s => s.status === 'active');
        res.json(stores);
    } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// =============================================================================
// 路由處理
// =============================================================================

// SPA 路由處理
app.get(`${BASE_PATH}/*`, (req, res) => {
    // API 路徑返回 404
    if (req.path.includes('/api/')) {
        return res.status(404).json({ 
            success: false, 
            message: 'API 路徑不存在' 
        });
    }
    
    // 其他路徑返回 index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        message: '伺服器內部錯誤' 
    });
});

// 啟動伺服器
async function startServer() {
    try {
        await ensureDataDirectory();
        
        app.listen(PORT, () => {
            console.log('=====================================');
            console.log('🎁 贈品管理系統伺服器已啟動');
            console.log(`📍 網址: http://localhost:${PORT}${BASE_PATH}`);
            console.log(`📁 資料檔案: ${DATA_FILE}`);
            console.log(`🔧 環境: ${process.env.NODE_ENV || 'development'}`);
            console.log('=====================================');
        });
    } catch (error) {
        console.error('❌ 啟動伺服器失敗:', error);
        process.exit(1);
    }
}

// 優雅關閉
process.on('SIGINT', () => {
    console.log('\n🛑 正在關閉伺服器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在關閉伺服器...');
    process.exit(0);
});

startServer();
