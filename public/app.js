// Gift Management System - Client Application
class GiftManagementApp {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'login';
        this.currentView = 'inventory';
        this.data = this.initializeData();
        this.init();
    }

    // Initialize sample data
    initializeData() {
        return {
            users: [
                {id: 1, username: "emp001", fullName: "王小明", employeeId: "E001", storeId: 1, role: "employee", status: "active"},
                {id: 2, username: "emp002", fullName: "李小華", employeeId: "E002", storeId: 1, role: "employee", status: "active"},
                {id: 3, username: "emp003", fullName: "陳大成", employeeId: "E003", storeId: 2, role: "employee", status: "active"},
                {id: 4, username: "mgr001", fullName: "張主管", employeeId: "M001", storeId: 1, role: "manager", status: "active"},
                {id: 5, username: "mgr002", fullName: "林經理", employeeId: "M002", storeId: 2, role: "manager", status: "active"}
            ],
            stores: [
                {id: 1, storeName: "台北旗艦店", storeCode: "TPE001", address: "台北市信義區信義路五段7號"},
                {id: 2, storeName: "台中分店", storeCode: "TXG001", address: "台中市西屯區台灣大道三段99號"}
            ],
            gifts: [
                {id: 1, giftCode: "G001", giftName: "精美手錶", category: "配件", status: "active"},
                {id: 2, giftCode: "G002", giftName: "咖啡禮盒", category: "食品", status: "active"},
                {id: 3, giftCode: "G003", giftName: "保溫杯", category: "生活用品", status: "active"},
                {id: 4, giftCode: "G004", giftName: "藍牙耳機", category: "電子產品", status: "active"},
                {id: 5, giftCode: "G005", giftName: "香水組合", category: "美妝", status: "active"},
                {id: 6, giftCode: "G006", giftName: "運動毛巾", category: "運動用品", status: "active"}
            ],
            giftInventory: [
                {userId: 1, giftId: 1, quantity: 5},
                {userId: 1, giftId: 2, quantity: 12},
                {userId: 1, giftId: 3, quantity: 8},
                {userId: 2, giftId: 1, quantity: 3},
                {userId: 2, giftId: 4, quantity: 7},
                {userId: 2, giftId: 5, quantity: 4},
                {userId: 3, giftId: 2, quantity: 6},
                {userId: 3, giftId: 6, quantity: 10}
            ],
            pendingRequests: [
                {id: 1, requesterId: 1, giftId: 2, requestType: "increase", requestedQuantity: 5, purpose: "客戶活動需求", status: "pending", createdAt: new Date().toISOString()},
                {id: 2, requesterId: 2, giftId: 1, requestType: "transfer", requestedQuantity: 2, targetUserId: 1, purpose: "門店調配需求", status: "pending", createdAt: new Date().toISOString()},
                {id: 3, requesterId: 3, giftId: 6, requestType: "increase", requestedQuantity: 15, purpose: "促銷活動準備", status: "pending", createdAt: new Date().toISOString()}
            ],
            requestHistory: [],
            transactionHistory: []
        };
    }

    // Initialize application
    init() {
        this.bindEvents();
        this.showScreen('login');
    }

    // Bind all event listeners
    bindEvents() {
        // Login events - make sure elements exist before binding
        const accountCards = document.querySelectorAll('.account-card');
        accountCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTestAccount(card);
            });
        });

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Navigation events
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(btn.dataset.view);
            });
        });

        // Logout events
        const logoutBtn = document.getElementById('logoutBtn');
        const managerLogoutBtn = document.getElementById('managerLogoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        if (managerLogoutBtn) managerLogoutBtn.addEventListener('click', () => this.logout());

        // Tab switching for requests
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(btn.dataset.tab);
            });
        });

        // Form submissions
        const forms = {
            'increaseForm': (e) => this.handleIncreaseRequest(e),
            'transferForm': (e) => this.handleTransferRequest(e),
            'distributionForm': (e) => this.handleDistribution(e),
            'adjustmentForm': (e) => this.handleAdjustment(e),
            'approvalForm': (e) => this.handleApproval(e)
        };

        Object.keys(forms).forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', forms[formId]);
            }
        });

        // Refresh buttons
        const refreshButtons = {
            'refreshInventory': () => this.loadInventory(),
            'refreshHistory': () => this.loadHistory(),
            'refreshDashboard': () => this.loadDashboard(),
            'refreshApprovals': () => this.loadApprovals()
        };

        Object.keys(refreshButtons).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', refreshButtons[btnId]);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Export functionality
        const exportBtn = document.getElementById('exportExcel');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }

        // Modal events
        const modalClose = document.querySelector('.modal-close');
        const rejectBtn = document.getElementById('rejectBtn');
        const approvalModal = document.getElementById('approvalModal');

        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => this.rejectRequest());
        }
        if (approvalModal) {
            approvalModal.addEventListener('click', (e) => {
                if (e.target.id === 'approvalModal') {
                    this.closeModal();
                }
            });
        }
    }

    // Select test account
    selectTestAccount(card) {
        // Remove previous selection
        document.querySelectorAll('.account-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Fill in the form
        const username = card.dataset.username;
        const password = card.dataset.password;
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput && passwordInput) {
            usernameInput.value = username;
            passwordInput.value = password;
        }
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (!usernameInput || !passwordInput) {
            this.showError('登入表單錯誤');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            this.showError('請輸入帳號和密碼');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API call
            await this.delay(1000);

            const user = this.data.users.find(u => u.username === username && u.status === 'active');
            if (user && password === '123456') {
                this.currentUser = user;
                const screenName = user.role === 'manager' ? 'manager' : 'employee';
                this.showScreen(screenName);
                this.initializeUserScreen();
                this.showSuccess(`歡迎，${user.fullName}！`);
            } else {
                this.showError('帳號或密碼錯誤，請檢查輸入');
            }
        } catch (error) {
            this.showError('登入失敗，請稍後再試');
        } finally {
            this.showLoading(false);
        }
    }

    // Initialize user screen after login
    initializeUserScreen() {
        if (!this.currentUser) return;

        if (this.currentUser.role === 'employee') {
            const welcomeEl = document.getElementById('userWelcome');
            if (welcomeEl) {
                welcomeEl.textContent = `歡迎，${this.currentUser.fullName}`;
            }
            this.loadInventory();
            this.loadGiftOptions();
            this.loadEmployeeOptions();
            this.switchView('inventory');
        } else {
            const welcomeEl = document.getElementById('managerWelcome');
            if (welcomeEl) {
                welcomeEl.textContent = `歡迎，${this.currentUser.fullName}`;
            }
            this.loadDashboard();
            this.loadApprovals();
            this.loadEmployeeManagement();
            this.loadManagerOptions();
            this.switchView('dashboard');
        }
    }

    // Load employee inventory
    loadInventory() {
        const container = document.getElementById('inventoryList');
        if (!container || !this.currentUser) return;

        const userInventory = this.data.giftInventory.filter(inv => inv.userId === this.currentUser.id);
        
        if (userInventory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-text">尚無贈品庫存</div>
                    <div class="empty-state-subtext">請向主管申請增發贈品</div>
                </div>
            `;
            return;
        }

        container.innerHTML = userInventory.map(inv => {
            const gift = this.data.gifts.find(g => g.id === inv.giftId);
            if (!gift) return '';
            
            return `
                <div class="inventory-item">
                    <div class="inventory-header">
                        <div class="gift-name">${gift.giftName}</div>
                        <div class="gift-quantity">${inv.quantity}</div>
                    </div>
                    <div class="gift-details">
                        <span>編號: ${gift.giftCode}</span>
                        <span>類別: ${gift.category}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Load gift options for forms
    loadGiftOptions() {
        const selects = ['increaseGift', 'transferGift', 'distributionGift'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">請選擇贈品</option>' +
                    this.data.gifts.map(gift => 
                        `<option value="${gift.id}">${gift.giftCode} - ${gift.giftName}</option>`
                    ).join('');
            }
        });
    }

    // Load employee options for transfers
    loadEmployeeOptions() {
        const select = document.getElementById('transferTarget');
        if (select && this.currentUser) {
            const colleagues = this.data.users.filter(u => 
                u.id !== this.currentUser.id && 
                u.role === 'employee' && 
                u.status === 'active'
            );
            select.innerHTML = '<option value="">請選擇同事</option>' +
                colleagues.map(user => 
                    `<option value="${user.id}">${user.fullName} (${user.employeeId})</option>`
                ).join('');
        }
    }

    // Handle increase request
    async handleIncreaseRequest(e) {
        e.preventDefault();
        
        const giftSelect = document.getElementById('increaseGift');
        const quantityInput = document.getElementById('increaseQuantity');
        const purposeInput = document.getElementById('increasePurpose');
        
        if (!giftSelect || !quantityInput || !purposeInput) {
            this.showError('表單元素錯誤');
            return;
        }

        const giftId = parseInt(giftSelect.value);
        const quantity = parseInt(quantityInput.value);
        const purpose = purposeInput.value.trim();

        if (!giftId || !quantity || quantity < 1 || !purpose) {
            this.showError('請填寫完整資訊');
            return;
        }

        this.showLoading(true);
        await this.delay(500);

        const newRequest = {
            id: Date.now(),
            requesterId: this.currentUser.id,
            giftId: giftId,
            requestType: 'increase',
            requestedQuantity: quantity,
            purpose: purpose,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.data.pendingRequests.push(newRequest);
        this.showSuccess('增發申請已提交，等待主管審批');
        this.resetForm('increaseForm');
        this.showLoading(false);
    }

    // Handle transfer request
    async handleTransferRequest(e) {
        e.preventDefault();
        
        const targetSelect = document.getElementById('transferTarget');
        const giftSelect = document.getElementById('transferGift');
        const quantityInput = document.getElementById('transferQuantity');
        const purposeInput = document.getElementById('transferPurpose');

        if (!targetSelect || !giftSelect || !quantityInput || !purposeInput) {
            this.showError('表單元素錯誤');
            return;
        }

        const targetUserId = parseInt(targetSelect.value);
        const giftId = parseInt(giftSelect.value);
        const quantity = parseInt(quantityInput.value);
        const purpose = purposeInput.value.trim();

        if (!targetUserId || !giftId || !quantity || quantity < 1 || !purpose) {
            this.showError('請填寫完整資訊');
            return;
        }

        // Check if user has enough quantity
        const userInventory = this.data.giftInventory.find(inv => 
            inv.userId === this.currentUser.id && inv.giftId === giftId
        );

        if (!userInventory || userInventory.quantity < quantity) {
            this.showError('庫存數量不足');
            return;
        }

        this.showLoading(true);
        await this.delay(500);

        const newRequest = {
            id: Date.now(),
            requesterId: this.currentUser.id,
            giftId: giftId,
            requestType: 'transfer',
            requestedQuantity: quantity,
            targetUserId: targetUserId,
            purpose: purpose,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.data.pendingRequests.push(newRequest);
        this.showSuccess('轉移申請已提交，等待主管審批');
        this.resetForm('transferForm');
        this.showLoading(false);
    }

    // Handle distribution
    async handleDistribution(e) {
        e.preventDefault();
        
        const giftSelect = document.getElementById('distributionGift');
        const quantityInput = document.getElementById('distributionQuantity');
        const noteInput = document.getElementById('distributionNote');

        if (!giftSelect || !quantityInput || !noteInput) {
            this.showError('表單元素錯誤');
            return;
        }

        const giftId = parseInt(giftSelect.value);
        const quantity = parseInt(quantityInput.value);
        const note = noteInput.value.trim();

        if (!giftId || !quantity || quantity < 1) {
            this.showError('請選擇贈品並輸入正確數量');
            return;
        }

        // Check inventory
        const userInventory = this.data.giftInventory.find(inv => 
            inv.userId === this.currentUser.id && inv.giftId === giftId
        );

        if (!userInventory || userInventory.quantity < quantity) {
            this.showError('庫存數量不足');
            return;
        }

        this.showLoading(true);
        await this.delay(500);

        // Update inventory
        userInventory.quantity -= quantity;

        // Add to transaction history
        const transaction = {
            id: Date.now(),
            userId: this.currentUser.id,
            giftId: giftId,
            type: 'distribution',
            quantity: -quantity,
            note: note,
            createdAt: new Date().toISOString()
        };
        this.data.transactionHistory.push(transaction);

        this.showSuccess(`已登記送出 ${quantity} 個贈品`);
        this.resetForm('distributionForm');
        this.loadInventory();
        this.showLoading(false);
    }

    // Load manager dashboard
    loadDashboard() {
        const container = document.getElementById('dashboardContent');
        if (!container) return;

        const employees = this.data.users.filter(u => u.role === 'employee' && u.status === 'active');
        
        container.innerHTML = employees.map(employee => {
            const store = this.data.stores.find(s => s.id === employee.storeId);
            const inventory = this.data.giftInventory.filter(inv => inv.userId === employee.id);
            
            return `
                <div class="employee-section">
                    <div class="employee-header">
                        <div>
                            <div class="employee-name">${employee.fullName}</div>
                            <div class="employee-info">${employee.employeeId} - ${store ? store.storeName : '未知門店'}</div>
                        </div>
                    </div>
                    <div class="employee-gifts">
                        ${inventory.length > 0 ? inventory.map(inv => {
                            const gift = this.data.gifts.find(g => g.id === inv.giftId);
                            if (!gift) return '';
                            return `
                                <div class="gift-row">
                                    <div class="gift-info">
                                        <div class="gift-code">${gift.giftCode}</div>
                                        <div class="gift-name-small">${gift.giftName}</div>
                                    </div>
                                    <div class="gift-quantity-small">${inv.quantity}</div>
                                </div>
                            `;
                        }).join('') : '<div class="empty-state-text">暫無庫存</div>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Load approvals
    loadApprovals() {
        const container = document.getElementById('approvalList');
        if (!container) return;

        const pendingRequests = this.data.pendingRequests.filter(req => req.status === 'pending');
        
        if (pendingRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <div class="empty-state-text">暫無待審批申請</div>
                </div>
            `;
            return;
        }

        container.innerHTML = pendingRequests.map(request => {
            const requester = this.data.users.find(u => u.id === request.requesterId);
            const gift = this.data.gifts.find(g => g.id === request.giftId);
            const targetUser = request.targetUserId ? 
                this.data.users.find(u => u.id === request.targetUserId) : null;
            
            if (!requester || !gift) return '';
            
            return `
                <div class="approval-item">
                    <div class="item-header">
                        <div class="item-type ${request.requestType}">${request.requestType === 'increase' ? '增發' : '轉移'}</div>
                        <div class="item-status pending">待審批</div>
                    </div>
                    <div class="item-details">
                        <div><strong>申請人:</strong> ${requester.fullName} (${requester.employeeId})</div>
                        <div><strong>贈品:</strong> ${gift.giftCode} - ${gift.giftName}</div>
                        <div><strong>數量:</strong> ${request.requestedQuantity}</div>
                        ${targetUser ? `<div><strong>接收人:</strong> ${targetUser.fullName} (${targetUser.employeeId})</div>` : ''}
                        <div><strong>說明:</strong> ${request.purpose}</div>
                        <div><strong>申請時間:</strong> ${new Date(request.createdAt).toLocaleString('zh-TW')}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn--primary btn--sm" onclick="app.openApprovalModal(${request.id})">處理申請</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Open approval modal
    openApprovalModal(requestId) {
        const request = this.data.pendingRequests.find(r => r.id === requestId);
        if (!request) return;

        const requester = this.data.users.find(u => u.id === request.requesterId);
        const gift = this.data.gifts.find(g => g.id === request.giftId);
        
        const modal = document.getElementById('approvalModal');
        const title = document.getElementById('approvalModalTitle');
        const details = document.getElementById('approvalDetails');
        const quantityInput = document.getElementById('approvedQuantity');
        
        if (!modal || !title || !details || !quantityInput || !requester || !gift) return;
        
        title.textContent = `審批${request.requestType === 'increase' ? '增發' : '轉移'}申請`;
        quantityInput.value = request.requestedQuantity;
        
        details.innerHTML = `
            <div class="item-details">
                <div><strong>申請人:</strong> ${requester.fullName} (${requester.employeeId})</div>
                <div><strong>贈品:</strong> ${gift.giftCode} - ${gift.giftName}</div>
                <div><strong>申請數量:</strong> ${request.requestedQuantity}</div>
                <div><strong>說明:</strong> ${request.purpose}</div>
            </div>
        `;
        
        // Store current request ID for handling
        modal.dataset.requestId = requestId;
        modal.classList.remove('hidden');
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('approvalModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Handle approval
    async handleApproval(e) {
        e.preventDefault();
        
        const modal = document.getElementById('approvalModal');
        const quantityInput = document.getElementById('approvedQuantity');
        const commentInput = document.getElementById('approvalComment');
        
        if (!modal || !quantityInput || !commentInput) return;

        const requestId = parseInt(modal.dataset.requestId);
        const approvedQuantity = parseInt(quantityInput.value);
        const comment = commentInput.value.trim();
        
        if (!requestId || !approvedQuantity || approvedQuantity < 1) {
            this.showError('請輸入正確的核准數量');
            return;
        }
        
        this.showLoading(true);
        await this.delay(500);
        
        const request = this.data.pendingRequests.find(r => r.id === requestId);
        if (!request) {
            this.showError('找不到申請記錄');
            this.showLoading(false);
            return;
        }

        request.status = 'approved';
        request.approvedQuantity = approvedQuantity;
        request.approvalComment = comment;
        request.approvedAt = new Date().toISOString();
        
        // Update inventory based on request type
        if (request.requestType === 'increase') {
            let inventory = this.data.giftInventory.find(inv => 
                inv.userId === request.requesterId && inv.giftId === request.giftId
            );
            if (inventory) {
                inventory.quantity += approvedQuantity;
            } else {
                this.data.giftInventory.push({
                    userId: request.requesterId,
                    giftId: request.giftId,
                    quantity: approvedQuantity
                });
            }
        } else if (request.requestType === 'transfer') {
            // Deduct from requester
            const fromInventory = this.data.giftInventory.find(inv => 
                inv.userId === request.requesterId && inv.giftId === request.giftId
            );
            if (fromInventory) {
                fromInventory.quantity -= approvedQuantity;
            }
            
            // Add to target user
            let toInventory = this.data.giftInventory.find(inv => 
                inv.userId === request.targetUserId && inv.giftId === request.giftId
            );
            if (toInventory) {
                toInventory.quantity += approvedQuantity;
            } else {
                this.data.giftInventory.push({
                    userId: request.targetUserId,
                    giftId: request.giftId,
                    quantity: approvedQuantity
                });
            }
        }
        
        this.closeModal();
        this.loadApprovals();
        this.loadDashboard();
        this.showSuccess('申請已核准');
        this.showLoading(false);
    }

    // Reject request
    async rejectRequest() {
        const modal = document.getElementById('approvalModal');
        const commentInput = document.getElementById('approvalComment');
        
        if (!modal || !commentInput) return;

        const requestId = parseInt(modal.dataset.requestId);
        const comment = commentInput.value.trim();
        
        if (!requestId) {
            this.showError('找不到申請記錄');
            return;
        }
        
        this.showLoading(true);
        await this.delay(500);
        
        const request = this.data.pendingRequests.find(r => r.id === requestId);
        if (request) {
            request.status = 'rejected';
            request.rejectionComment = comment;
            request.rejectedAt = new Date().toISOString();
        }
        
        this.closeModal();
        this.loadApprovals();
        this.showSuccess('申請已駁回');
        this.showLoading(false);
    }

    // Load manager options
    loadManagerOptions() {
        // Load employee options for adjustment
        const select = document.getElementById('adjustmentEmployee');
        if (select) {
            const employees = this.data.users.filter(u => u.role === 'employee' && u.status === 'active');
            select.innerHTML = '<option value="">請選擇員工</option>' +
                employees.map(user => 
                    `<option value="${user.id}">${user.fullName} (${user.employeeId})</option>`
                ).join('');
        }

        // Load gift options for adjustment
        const giftSelect = document.getElementById('adjustmentGift');
        if (giftSelect) {
            giftSelect.innerHTML = '<option value="">請選擇贈品</option>' +
                this.data.gifts.map(gift => 
                    `<option value="${gift.id}">${gift.giftCode} - ${gift.giftName}</option>`
                ).join('');
        }
    }

    // Handle adjustment
    async handleAdjustment(e) {
        e.preventDefault();
        
        const employeeSelect = document.getElementById('adjustmentEmployee');
        const giftSelect = document.getElementById('adjustmentGift');
        const quantityInput = document.getElementById('adjustmentQuantity');
        const reasonInput = document.getElementById('adjustmentReason');

        if (!employeeSelect || !giftSelect || !quantityInput || !reasonInput) {
            this.showError('表單元素錯誤');
            return;
        }

        const userId = parseInt(employeeSelect.value);
        const giftId = parseInt(giftSelect.value);
        const quantity = parseInt(quantityInput.value);
        const reason = reasonInput.value.trim();

        if (!userId || !giftId || isNaN(quantity) || !reason) {
            this.showError('請填寫完整資訊');
            return;
        }

        this.showLoading(true);
        await this.delay(500);

        // Find or create inventory record
        let inventory = this.data.giftInventory.find(inv => 
            inv.userId === userId && inv.giftId === giftId
        );

        if (inventory) {
            inventory.quantity += quantity;
            if (inventory.quantity < 0) inventory.quantity = 0;
        } else if (quantity > 0) {
            this.data.giftInventory.push({
                userId: userId,
                giftId: giftId,
                quantity: quantity
            });
        }

        // Add to transaction history
        const transaction = {
            id: Date.now(),
            userId: userId,
            giftId: giftId,
            type: 'adjustment',
            quantity: quantity,
            reason: reason,
            adjustedBy: this.currentUser.id,
            createdAt: new Date().toISOString()
        };
        this.data.transactionHistory.push(transaction);

        this.resetForm('adjustmentForm');
        this.loadDashboard();
        this.showSuccess('庫存調整完成');
        this.showLoading(false);
    }

    // Load employee management
    loadEmployeeManagement() {
        const container = document.getElementById('employeeList');
        if (!container) return;

        const employees = this.data.users.filter(u => u.status === 'active');
        
        container.innerHTML = employees.map(employee => {
            const store = this.data.stores.find(s => s.id === employee.storeId);
            return `
                <div class="employee-card">
                    <div class="employee-card-header">
                        <div class="employee-name">${employee.fullName}</div>
                        <div class="account-role ${employee.role}">${employee.role === 'manager' ? '主管' : '員工'}</div>
                    </div>
                    <div class="employee-details">
                        <div><strong>員工編號:</strong> ${employee.employeeId}</div>
                        <div><strong>所屬門店:</strong> ${store ? store.storeName : '未知門店'}</div>
                        <div><strong>帳號:</strong> ${employee.username}</div>
                    </div>
                    <div class="employee-actions">
                        <button class="btn btn--outline btn--sm" onclick="app.editEmployee(${employee.id})">編輯</button>
                        ${employee.id !== this.currentUser.id ? 
                            `<button class="btn btn--outline btn--sm" onclick="app.toggleEmployeeStatus(${employee.id})">停用</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Export to Excel (simulated)
    exportToExcel() {
        this.showLoading(true);
        
        // Simulate export process
        setTimeout(() => {
            const employees = this.data.users.filter(u => u.role === 'employee' && u.status === 'active');
            let exportData = [];
            
            employees.forEach(employee => {
                const inventory = this.data.giftInventory.filter(inv => inv.userId === employee.id);
                inventory.forEach(inv => {
                    const gift = this.data.gifts.find(g => g.id === inv.giftId);
                    if (gift) {
                        exportData.push({
                            員工姓名: employee.fullName,
                            員工編號: employee.employeeId,
                            贈品編號: gift.giftCode,
                            贈品名稱: gift.giftName,
                            數量: inv.quantity
                        });
                    }
                });
            });
            
            if (exportData.length === 0) {
                this.showError('暫無資料可匯出');
                this.showLoading(false);
                return;
            }
            
            // Create CSV content
            const headers = Object.keys(exportData[0]);
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => headers.map(header => row[header]).join(','))
            ].join('\n');
            
            // Create and download file
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `贈品庫存報表_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            
            this.showLoading(false);
            this.showSuccess('報表匯出完成');
        }, 1000);
    }

    // Handle search
    handleSearch(query) {
        if (!query.trim()) {
            this.loadDashboard();
            return;
        }
        
        const container = document.getElementById('dashboardContent');
        if (!container) return;

        const employees = this.data.users.filter(u => 
            u.role === 'employee' && 
            u.status === 'active' &&
            (u.fullName.includes(query) || u.employeeId.includes(query))
        );
        
        // Also search by gift name
        const matchingGifts = this.data.gifts.filter(g => 
            g.giftName.includes(query) || g.giftCode.includes(query)
        );
        
        if (matchingGifts.length > 0) {
            const employeesWithMatchingGifts = this.data.giftInventory
                .filter(inv => matchingGifts.some(g => g.id === inv.giftId))
                .map(inv => this.data.users.find(u => u.id === inv.userId))
                .filter(u => u && u.role === 'employee' && u.status === 'active');
            
            employees.push(...employeesWithMatchingGifts);
        }
        
        // Remove duplicates
        const uniqueEmployees = employees.filter((emp, index, self) => 
            index === self.findIndex(e => e.id === emp.id)
        );
        
        if (uniqueEmployees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">查無結果</div>
                    <div class="empty-state-subtext">請嘗試其他關鍵字</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = uniqueEmployees.map(employee => {
            const store = this.data.stores.find(s => s.id === employee.storeId);
            const inventory = this.data.giftInventory.filter(inv => inv.userId === employee.id);
            
            return `
                <div class="employee-section">
                    <div class="employee-header">
                        <div>
                            <div class="employee-name">${employee.fullName}</div>
                            <div class="employee-info">${employee.employeeId} - ${store ? store.storeName : '未知門店'}</div>
                        </div>
                    </div>
                    <div class="employee-gifts">
                        ${inventory.length > 0 ? inventory.map(inv => {
                            const gift = this.data.gifts.find(g => g.id === inv.giftId);
                            if (!gift) return '';
                            return `
                                <div class="gift-row">
                                    <div class="gift-info">
                                        <div class="gift-code">${gift.giftCode}</div>
                                        <div class="gift-name-small">${gift.giftName}</div>
                                    </div>
                                    <div class="gift-quantity-small">${inv.quantity}</div>
                                </div>
                            `;
                        }).join('') : '<div class="empty-state-text">暫無庫存</div>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Load history
    loadHistory() {
        const container = document.getElementById('historyList');
        if (!container || !this.currentUser) return;

        const userRequests = this.data.pendingRequests.filter(req => req.requesterId === this.currentUser.id);
        
        if (userRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">暫無申請紀錄</div>
                </div>
            `;
            return;
        }

        container.innerHTML = userRequests.map(request => {
            const gift = this.data.gifts.find(g => g.id === request.giftId);
            const targetUser = request.targetUserId ? 
                this.data.users.find(u => u.id === request.targetUserId) : null;
            
            if (!gift) return '';
            
            return `
                <div class="history-item">
                    <div class="item-header">
                        <div class="item-type ${request.requestType}">${request.requestType === 'increase' ? '增發' : '轉移'}</div>
                        <div class="item-status ${request.status}">${this.getStatusText(request.status)}</div>
                    </div>
                    <div class="item-details">
                        <div><strong>贈品:</strong> ${gift.giftCode} - ${gift.giftName}</div>
                        <div><strong>申請數量:</strong> ${request.requestedQuantity}</div>
                        ${request.approvedQuantity ? `<div><strong>核准數量:</strong> ${request.approvedQuantity}</div>` : ''}
                        ${targetUser ? `<div><strong>接收人:</strong> ${targetUser.fullName}</div>` : ''}
                        <div><strong>說明:</strong> ${request.purpose}</div>
                        <div><strong>申請時間:</strong> ${new Date(request.createdAt).toLocaleString('zh-TW')}</div>
                        ${request.approvalComment || request.rejectionComment ? 
                            `<div><strong>審批意見:</strong> ${request.approvalComment || request.rejectionComment}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get status text
    getStatusText(status) {
        const statusMap = {
            'pending': '待審批',
            'approved': '已核准',
            'rejected': '已駁回'
        };
        return statusMap[status] || status;
    }

    // Switch screen
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    // Switch view within screen
    switchView(viewName) {
        if (!viewName) return;

        // Update navigation for current screen
        const currentScreenElement = document.querySelector('.screen.active');
        if (currentScreenElement) {
            // Update navigation
            const navBtns = currentScreenElement.querySelectorAll('.nav-btn');
            navBtns.forEach(btn => {
                btn.classList.remove('active');
            });
            
            const activeNavBtn = currentScreenElement.querySelector(`[data-view="${viewName}"]`);
            if (activeNavBtn) {
                activeNavBtn.classList.add('active');
            }
            
            // Update views
            const views = currentScreenElement.querySelectorAll('.view');
            views.forEach(view => {
                view.classList.remove('active');
            });
            
            const targetView = currentScreenElement.querySelector(`#${viewName}View`);
            if (targetView) {
                targetView.classList.add('active');
            }
        }
        
        this.currentView = viewName;
        
        // Load data for the view
        if (viewName === 'inventory') {
            this.loadInventory();
        } else if (viewName === 'history') {
            this.loadHistory();
        } else if (viewName === 'dashboard') {
            this.loadDashboard();
        } else if (viewName === 'approval') {
            this.loadApprovals();
        } else if (viewName === 'employeeManagement') {
            this.loadEmployeeManagement();
        }
    }

    // Switch tab
    switchTab(tabName) {
        if (!tabName) return;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    // Logout
    logout() {
        this.currentUser = null;
        this.showScreen('login');
        this.resetAllForms();
        this.showSuccess('已安全登出');
    }

    // Reset form
    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Reset all forms
    resetAllForms() {
        document.querySelectorAll('form').forEach(form => form.reset());
        document.querySelectorAll('.account-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    // Show loading
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        }
    }

    // Show success message
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showToast(message, 'error');
    }

    // Show toast notification
    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-error)'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            z-index: 3000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 90%;
            text-align: center;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(-20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0); 
                }
            }
        `;
        if (!document.head.querySelector('style[data-toast]')) {
            style.setAttribute('data-toast', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Placeholder functions for employee management
    editEmployee(employeeId) {
        this.showToast('編輯功能開發中', 'info');
    }

    toggleEmployeeStatus(employeeId) {
        this.showToast('狀態切換功能開發中', 'info');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GiftManagementApp();
});