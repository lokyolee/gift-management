// Gift Management System - Client Application
class GiftManagementApp {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'login';
        this.currentView = 'inventory';
        this.data = this.initializeEmptyData();
        this.init();
    }

    // Initialize empty data structure (will be populated from backend)
    initializeEmptyData() {
        return {
            users: [],
            stores: [],
            gifts: [],
            giftInventory: [],
            pendingRequests: [],
            requestHistory: [],
            transactionHistory: []
        };
    }

    // Load initial data from backend (called after successful login)
    async loadInitialData() {
        try {
            console.log('Loading initial data from backend...');
            console.log('Current data state before loading:', {
                users: this.data.users.length,
                inventory: this.data.giftInventory.length,
                requests: this.data.pendingRequests.length,
                gifts: this.data.gifts.length,
                stores: this.data.stores.length
            });
            
            // Load all data from backend
            await Promise.all([
                this.refreshUserData(),
                this.refreshInventoryData(),
                this.refreshRequestData()
            ]);
            
            // Load additional data that might not be in the main refresh methods
            await this.loadGiftsData();
            await this.loadStoresData();
            
            console.log('Initial data loaded successfully');
            console.log('Final data state after loading:', {
                users: this.data.users.length,
                inventory: this.data.giftInventory.length,
                requests: this.data.pendingRequests.length,
                gifts: this.data.gifts.length,
                stores: this.data.stores.length
            });
            
            // Save snapshot for debugging
            this.saveDataSnapshot();
            
            return true;
        } catch (error) {
            console.error('Failed to load initial data:', error);
            return false;
        }
    }

    // Load gifts data
    async loadGiftsData() {
        try {
            const response = await this.apiCall('/api/gifts');
            if (response && Array.isArray(response)) {
                this.data.gifts = response;
            }
        } catch (error) {
            console.error('Failed to load gifts data:', error);
        }
    }

    // Load stores data
    async loadStoresData() {
        try {
            const response = await this.apiCall('/api/stores');
            if (response && Array.isArray(response)) {
                this.data.stores = response;
            }
        } catch (error) {
            console.error('Failed to load stores data:', error);
        }
    }

    // Initialize application
    async init() {
        this.bindEvents();
        
        // Check if user is already logged in (e.g., after page refresh)
        const token = localStorage.getItem('token');
        if (token) {
            try {
                console.log('Found existing token, attempting to restore session...');
                console.log('Token:', token.substring(0, 20) + '...');
                
                // Verify token and restore session
                const response = await this.apiCall('/api/auth/verify');
                console.log('Token verification response:', response);
                
                if (response && response.success && response.user) {
                    this.currentUser = response.user;
                    console.log('Session restored for user:', this.currentUser.fullName);
                    console.log('User role:', this.currentUser.role);
                    
                    // Show appropriate screen based on role
                    const screenName = this.currentUser.role === 'manager' ? 'manager' : 'employee';
                    console.log('Showing screen:', screenName);
                    this.showScreen(screenName);
                    
                    // Initialize user screen
                    await this.initializeUserScreen();
                    this.showSuccess(`歡迎回來，${this.currentUser.fullName}！`);
                } else {
                    console.log('Invalid token response, clearing session');
                    console.log('Response details:', response);
                    // Invalid token, clear and show login
                    localStorage.removeItem('token');
                    this.showScreen('login');
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                localStorage.removeItem('token');
                this.showScreen('login');
            }
        } else {
            console.log('No token found, showing login screen');
            this.showScreen('login');
        }
    }

    // Data synchronization methods
    async refreshUserData() {
        try {
            console.log('Refreshing user data...');
            const response = await this.apiCall('/api/users');
            console.log('User data response:', response);
            
            if (response && response.users) {
                this.data.users = response.users;
                console.log(`Loaded ${response.users.length} users from response.users`);
            } else if (Array.isArray(response)) {
                this.data.users = response;
                console.log(`Loaded ${response.length} users from direct response`);
            } else {
                console.warn('Unexpected user data format:', response);
            }
            
            console.log('User data refreshed successfully. Current users:', this.data.users.length);
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            // Fallback to local data if API fails
        }
    }

    async refreshInventoryData() {
        try {
            console.log('Refreshing inventory data...');
            
            let response;
            if (this.currentUser && this.currentUser.role === 'manager') {
                // Managers can see all inventory
                response = await this.apiCall('/api/inventory/all');
                console.log('Manager inventory response:', response);
                
                if (response && Array.isArray(response)) {
                    this.data.giftInventory = response.map(inv => ({
                        userId: inv.userId,
                        giftId: inv.giftId,
                        quantity: inv.quantity,
                        lastUpdated: inv.lastUpdated
                    }));
                    console.log(`Loaded ${this.data.giftInventory.length} inventory records for manager`);
                }
            } else {
                // Employees can only see their own inventory
                response = await this.apiCall('/api/inventory/my');
                console.log('Employee inventory response:', response);
                
                if (response && Array.isArray(response)) {
                    // For employees, we need to merge with existing inventory data
                    // to avoid losing other users' data that might be cached
                    const userInventory = response.map(inv => ({
                        userId: inv.userId,
                        giftId: inv.giftId,
                        quantity: inv.quantity,
                        lastUpdated: inv.lastUpdated
                    }));
                    
                    // Update only the current user's inventory in the global data
                    this.data.giftInventory = this.data.giftInventory.filter(inv => 
                        inv.userId !== this.currentUser.id
                    );
                    this.data.giftInventory.push(...userInventory);
                    
                    console.log(`Updated inventory for user ${this.currentUser.id}, total records: ${this.data.giftInventory.length}`);
                }
            }
            
            if (!response || !Array.isArray(response)) {
                console.warn('Unexpected inventory data format:', response);
            }
            
            console.log('Inventory data refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh inventory data:', error);
            // Don't clear existing inventory data on error
        }
    }

    async refreshRequestData() {
        try {
            const response = await this.apiCall('/api/requests/pending');
            if (response && Array.isArray(response)) {
                this.data.pendingRequests = response.map(req => ({
                    id: req.id,
                    requesterId: req.requesterId,
                    giftId: req.giftId,
                    requestType: req.requestType,
                    requestedQuantity: req.requestedQuantity,
                    targetUserId: req.targetUserId,
                    purpose: req.purpose,
                    status: req.status,
                    createdAt: req.createdAt
                }));
            }
            console.log('Request data refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh request data:', error);
        }
    }

    // Validate user exists before operations
    validateUserExists(userId) {
        return this.data.users.some(u => u.id === userId && u.status === 'active');
    }

    // Clean up invalid references
    cleanupInvalidReferences() {
        // Clean up inventory with invalid users
        this.data.giftInventory = this.data.giftInventory.filter(inv => 
            this.validateUserExists(inv.userId)
        );

        // Clean up requests with invalid users
        this.data.pendingRequests = this.data.pendingRequests.filter(req => 
            this.validateUserExists(req.requesterId) &&
            (!req.targetUserId || this.validateUserExists(req.targetUserId))
        );

        // Clean up transaction history with invalid users
        this.data.transactionHistory = this.data.transactionHistory.filter(trans => 
            this.validateUserExists(trans.userId)
        );
    }

    // Comprehensive data refresh method
    async refreshAllData() {
        try {
            console.log('Starting comprehensive data refresh...');
            
            // Store current user info before refresh
            const currentUserBackup = this.currentUser ? { ...this.currentUser } : null;
            
            // Refresh all data sources
            await Promise.all([
                this.refreshUserData(),
                this.refreshInventoryData(),
                this.refreshRequestData(),
                this.loadGiftsData(), // Add gifts data refresh
                this.loadStoresData() // Add stores data refresh
            ]);
            
            // Clean up any invalid references
            this.cleanupInvalidReferences();
            
            // Restore current user if it was lost
            if (currentUserBackup && (!this.currentUser || !this.currentUser.fullName)) {
                console.log('Restoring current user after data refresh');
                this.currentUser = currentUserBackup;
            }
            
            // Save current data state for debugging
            this.saveDataSnapshot();
            
            console.log('Comprehensive data refresh completed');
            return true;
        } catch (error) {
            console.error('Comprehensive data refresh failed:', error);
            return false;
        }
    }

    // Save data snapshot for debugging
    saveDataSnapshot() {
        try {
            const snapshot = {
                timestamp: new Date().toISOString(),
                userCount: this.data.users.length,
                inventoryCount: this.data.giftInventory.length,
                requestCount: this.data.pendingRequests.length,
                giftCount: this.data.gifts.length,
                storeCount: this.data.stores.length
            };
            
            localStorage.setItem('dataSnapshot', JSON.stringify(snapshot));
            console.log('Data snapshot saved:', snapshot);
        } catch (error) {
            console.error('Failed to save data snapshot:', error);
        }
    }

    // Load data snapshot for debugging
    loadDataSnapshot() {
        try {
            const snapshot = localStorage.getItem('dataSnapshot');
            if (snapshot) {
                const data = JSON.parse(snapshot);
                console.log('Data snapshot loaded:', data);
                return data;
            }
        } catch (error) {
            console.error('Failed to load data snapshot:', error);
        }
        return null;
    }

    // Debug method to test data persistence
    async testDataPersistence() {
        console.log('=== Testing Data Persistence ===');
        
        const initialState = {
            users: this.data.users.length,
            inventory: this.data.giftInventory.length,
            requests: this.data.pendingRequests.length,
            gifts: this.data.gifts.length,
            stores: this.data.stores.length
        };
        
        console.log('Current data state:', initialState);
        
        // Show current state in UI
        this.showDataState('Initial State', initialState);
        
        // Try to load data from backend
        try {
            await this.loadInitialData();
            console.log('Data loaded from backend successfully');
        } catch (error) {
            console.error('Failed to load data from backend:', error);
        }
        
        // Check final state
        const finalState = {
            users: this.data.users.length,
            inventory: this.data.giftInventory.length,
            requests: this.data.pendingRequests.length,
            gifts: this.data.gifts.length,
            stores: this.data.stores.length
        };
        
        console.log('Final data state:', finalState);
        
        // Show final state in UI
        this.showDataState('Final State', finalState);
        
        // Show sample data if available
        if (this.data.users.length > 0) {
            console.log('Sample user:', this.data.users[0]);
        }
        if (this.data.giftInventory.length > 0) {
            console.log('Sample inventory:', this.data.giftInventory[0]);
        }
        
        console.log('=== End Test ===');
    }

    // Show data state in UI for debugging
    showDataState(title, state) {
        const message = `${title}:
Users: ${state.users}
Inventory: ${state.inventory}
Requests: ${state.requests}
Gifts: ${state.gifts}
Stores: ${state.stores}`;
        
        this.showSuccess(message);
    }

    // Utility method for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Force refresh all data from backend
    async forceRefreshData() {
        try {
            this.showLoading(true);
            console.log('Force refreshing all data...');
            
            // Clear current data
            this.data = this.initializeEmptyData();
            
            // Load fresh data from backend
            await this.loadInitialData();
            
            // Refresh current view
            if (this.currentUser.role === 'manager') {
                await this.loadDashboard();
                await this.loadApprovals();
                await this.loadEmployeeManagement();
                await this.loadManagerOptions();
            } else {
                await this.loadInventory();
                this.loadGiftOptions();
                await this.loadEmployeeOptions();
            }
            
            this.showSuccess('資料已強制重新整理');
            console.log('Force refresh completed');
        } catch (error) {
            console.error('Force refresh failed:', error);
            this.showError('強制重新整理失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Check API connectivity and status
    async checkAPIStatus() {
        try {
            console.log('Checking API status...');
            
            // Try to make a simple API call
            const response = await this.apiCall('/api/auth/verify');
            console.log('API status check response:', response);
            
            if (response && response.success) {
                console.log('API is working correctly');
                return true;
            } else {
                console.log('API returned unexpected response');
                return false;
            }
        } catch (error) {
            console.error('API status check failed:', error);
            return false;
        }
    }

    // Debug session restoration
    async debugSessionRestoration() {
        console.log('=== Debug Session Restoration ===');
        
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);
        if (token) {
            console.log('Token preview:', token.substring(0, 50) + '...');
        }
        
        console.log('Current pathname:', window.location.pathname);
        console.log('Current user:', this.currentUser);
        
        // Check API status
        const apiWorking = await this.checkAPIStatus();
        console.log('API working:', apiWorking);
        
        console.log('=== End Debug ===');
        
        // Show debug info in UI
        const debugInfo = {
            hasToken: !!token,
            currentUser: this.currentUser,
            apiWorking: apiWorking,
            pathname: window.location.pathname
        };
        
        this.showDataState('Debug Info', {
            users: debugInfo.hasToken ? 'Yes' : 'No',
            inventory: debugInfo.currentUser ? debugInfo.currentUser.fullName || 'undefined' : 'null',
            requests: debugInfo.apiWorking ? 'Working' : 'Failed',
            gifts: debugInfo.pathname,
            stores: debugInfo.currentUser ? debugInfo.currentUser.role || 'unknown' : 'null'
        });
        
        return debugInfo;
    }

    // Manual session restoration
    async manualSessionRestoration() {
        try {
            console.log('Attempting manual session restoration...');
            
            const token = localStorage.getItem('token');
            if (!token) {
                this.showError('沒有找到登入令牌');
                return false;
            }
            
            // Try to verify token again
            const response = await this.apiCall('/api/auth/verify');
            if (response && response.success && response.user) {
                this.currentUser = response.user;
                console.log('Manual session restoration successful for:', this.currentUser.fullName);
                
                // Show appropriate screen
                const screenName = this.currentUser.role === 'manager' ? 'manager' : 'employee';
                this.showScreen(screenName);
                
                // Initialize user screen
                await this.initializeUserScreen();
                this.showSuccess(`會話已手動恢復，歡迎回來 ${this.currentUser.fullName}！`);
                return true;
            } else {
                this.showError('令牌驗證失敗，請重新登入');
                localStorage.removeItem('token');
                this.showScreen('login');
                return false;
            }
        } catch (error) {
            console.error('Manual session restoration failed:', error);
            this.showError('手動會話恢復失敗：' + error.message);
            return false;
        }
    }

    // Check and fix current user state
    checkCurrentUserState() {
        console.log('Checking current user state...');
        
        if (!this.currentUser) {
            console.log('No current user, checking for token...');
            const token = localStorage.getItem('token');
            if (token) {
                console.log('Token found but no user, attempting restoration...');
                this.manualSessionRestoration();
            } else {
                console.log('No token found, redirecting to login...');
                this.showScreen('login');
            }
            return false;
        }
        
        if (!this.currentUser.fullName || this.currentUser.fullName === 'undefined') {
            console.log('Current user has invalid name, attempting restoration...');
            this.manualSessionRestoration();
            return false;
        }
        
        console.log('Current user state is valid:', this.currentUser.fullName);
        return true;
    }

    // Validate and restore user session if needed
    async validateUserSession() {
        console.log('Validating user session...');
        
        // Check if current user is valid
        if (!this.checkCurrentUserState()) {
            return false;
        }
        
        // Check if we have the necessary data
        if (!this.data.users || this.data.users.length === 0) {
            console.log('User data missing, refreshing...');
            await this.refreshUserData();
        }
        
        if (!this.data.giftInventory || this.data.giftInventory.length === 0) {
            console.log('Inventory data missing, refreshing...');
            await this.refreshInventoryData();
        }
        
        if (!this.data.gifts || this.data.gifts.length === 0) {
            console.log('Gift data missing, refreshing...');
            await this.loadGiftsData();
        }
        
        console.log('User session validation completed');
        return true;
    }

    // Load current user's personal inventory
    async loadUserInventory() {
        try {
            console.log('Loading personal inventory for user:', this.currentUser.id);
            
            if (!this.currentUser || !this.currentUser.id) {
                console.warn('No current user available for inventory loading');
                return false;
            }
            
            const response = await this.apiCall('/api/inventory/my');
            console.log('Personal inventory response:', response);
            
            if (response && Array.isArray(response)) {
                // Update the current user's inventory in the global data
                const userInventory = response.map(inv => ({
                    userId: inv.userId,
                    giftId: inv.giftId,
                    quantity: inv.quantity,
                    lastUpdated: inv.lastUpdated
                }));
                
                // Remove existing inventory for this user and add new data
                this.data.giftInventory = this.data.giftInventory.filter(inv => 
                    inv.userId !== this.currentUser.id
                );
                this.data.giftInventory.push(...userInventory);
                
                console.log(`Loaded ${userInventory.length} inventory items for user ${this.currentUser.id}`);
                return true;
            } else {
                console.warn('Unexpected personal inventory response format:', response);
                return false;
            }
        } catch (error) {
            console.error('Failed to load personal inventory:', error);
            return false;
        }
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
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.switchView(btn.dataset.view);
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
            'approvalForm': (e) => this.handleApproval(e),
            'addEmployeeForm': (e) => this.handleAddEmployee(e),
            'editEmployeeForm': (e) => this.handleEditEmployee(e)
        };

        Object.keys(forms).forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', forms[formId]);
            }
        });

        // Refresh buttons
        const refreshButtons = {
            'refreshInventory': async () => await this.loadInventory(),
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
            exportBtn.addEventListener('click', () => this.openExportExcelModal());
        }

        // Import functionality
        const importBtn = document.getElementById('importExcel');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.openImportExcelModal());
        }

        const editStoresBtn = document.getElementById('editStores');
        if (editStoresBtn) {
            editStoresBtn.addEventListener('click', () => this.openEditStoresModal());
        }

        const editGiftsBtn = document.getElementById('editGifts');
        if (editGiftsBtn) {
            editGiftsBtn.addEventListener('click', () => this.openEditGiftsModal());
        }

        // Test data persistence functionality
        const testDataBtn = document.getElementById('testDataPersistence');
        if (testDataBtn) {
            testDataBtn.addEventListener('click', () => this.testDataPersistence());
        }

        // Force refresh data functionality
        const forceRefreshBtn = document.getElementById('forceRefreshData');
        if (forceRefreshBtn) {
            forceRefreshBtn.addEventListener('click', () => this.forceRefreshData());
        }

        // Debug session functionality
        const debugSessionBtn = document.getElementById('debugSession');
        if (debugSessionBtn) {
            debugSessionBtn.addEventListener('click', () => this.debugSessionRestoration());
        }

        // Restore session functionality
        const restoreSessionBtn = document.getElementById('restoreSession');
        if (restoreSessionBtn) {
            restoreSessionBtn.addEventListener('click', () => this.manualSessionRestoration());
        }

        // Check user state functionality
        const checkUserStateBtn = document.getElementById('checkUserState');
        if (checkUserStateBtn) {
            checkUserStateBtn.addEventListener('click', () => this.checkCurrentUserState());
        }

        // Validate session functionality
        const validateSessionBtn = document.getElementById('validateSession');
        if (validateSessionBtn) {
            validateSessionBtn.addEventListener('click', () => this.validateUserSession());
        }

        // Refresh personal inventory functionality
        const refreshPersonalInventoryBtn = document.getElementById('refreshPersonalInventory');
        if (refreshPersonalInventoryBtn) {
            refreshPersonalInventoryBtn.addEventListener('click', async () => {
                await this.loadUserInventory();
                await this.loadInventory();
                this.showSuccess('個人庫存已重新整理');
            });
        }

        // Test gift API functionality
        const testGiftAPIBtn = document.getElementById('testGiftAPI');
        if (testGiftAPIBtn) {
            testGiftAPIBtn.addEventListener('click', () => this.testGiftAPI());
        }

        // Test API routing functionality
        const testAPIRoutingBtn = document.getElementById('testAPIRouting');
        if (testAPIRoutingBtn) {
            testAPIRoutingBtn.addEventListener('click', () => this.testAPIRouting());
        }

        // Test colleagues API functionality
        const testColleaguesAPIBtn = document.getElementById('testColleaguesAPI');
        if (testColleaguesAPIBtn) {
            testColleaguesAPIBtn.addEventListener('click', () => this.testColleaguesAPI());
        }

        // Debug transfer form functionality
        const debugTransferFormBtn = document.getElementById('debugTransferForm');
        if (debugTransferFormBtn) {
            debugTransferFormBtn.addEventListener('click', () => this.debugTransferForm());
        }

        // Refresh employee options functionality
        const refreshEmployeeOptionsBtn = document.getElementById('refreshEmployeeOptions');
        if (refreshEmployeeOptionsBtn) {
            refreshEmployeeOptionsBtn.addEventListener('click', () => this.refreshEmployeeOptions());
        }

        // Tab click events for refreshing data
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tabName = e.target.dataset.tab;
                console.log('Tab clicked:', tabName);
                
                if (tabName === 'transfer') {
                    console.log('Transfer tab clicked, refreshing employee options...');
                    console.log('Current user state:', {
                        id: this.currentUser?.id,
                        fullName: this.currentUser?.fullName,
                        role: this.currentUser?.role
                    });
                    
                    // Ensure we have the latest data before loading options
                    try {
                        await this.refreshUserData();
                        await this.loadEmployeeOptions();
                        console.log('Employee options refreshed successfully');
                    } catch (error) {
                        console.error('Failed to refresh employee options:', error);
                    }
                }
            });
        });

        // Employee management functionality
        const addEmployeeBtn = document.getElementById('addEmployee');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => this.openAddEmployeeModal());
        }

        // Modal events
        const modalClose = document.querySelectorAll('.modal-close');
        const rejectBtn = document.getElementById('rejectBtn');
        const approvalModal = document.getElementById('approvalModal');

        modalClose.forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                            if (modal.id === 'importExcelModal') {
            this.closeImportExcelModal();
        } else if (modal.id === 'exportExcelModal') {
            this.closeExportExcelModal();
        } else if (modal.id === 'editStoresModal') {
            this.closeEditStoresModal();
        } else if (modal.id === 'editGiftsModal') {
            this.closeEditGiftsModal();
        } else if (modal.id === 'storeFormModal') {
            this.closeStoreFormModal();
        } else if (modal.id === 'giftFormModal') {
            this.closeGiftFormModal();
        } else {
                        this.closeModal();
                    }
                }
            });
        });

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
            const response = await this.apiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            const data = response;

            if (data.success) {
                // Save token and user info
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                
                const screenName = data.user.role === 'manager' ? 'manager' : 'employee';
                this.showScreen(screenName);
                this.initializeUserScreen();
                this.showSuccess(`歡迎，${data.user.fullName}！`);
            } else {
                this.showError(data.message || '帳號或密碼錯誤');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('登入失敗，請稍後再試');
        } finally {
            this.showLoading(false);
        }
    }

        // Initialize user screen after login
    async initializeUserScreen() {
        if (!this.currentUser) return;

        try {
            console.log('Initializing user screen for:', this.currentUser.fullName);
            
            // Load all initial data from backend
            const dataLoaded = await this.loadInitialData();
            
            if (!dataLoaded) {
                console.warn('Failed to load initial data, retrying...');
                // Retry once
                await this.delay(1000);
                await this.loadInitialData();
            }
            
            // Clean up any invalid references
            this.cleanupInvalidReferences();

            if (this.currentUser.role === 'employee') {
                const welcomeEl = document.getElementById('userWelcome');
                if (welcomeEl) {
                    welcomeEl.textContent = `歡迎，${this.currentUser.fullName}`;
                }
                
                // Load personal inventory first
                await this.loadUserInventory();
                
                await this.loadInventory();
                this.loadGiftOptions();
                // Load employee options after data is loaded
                await this.loadEmployeeOptions();
                this.switchView('inventory');
                
                // Debug: Check transfer form state after initialization
                console.log('=== Post-initialization Transfer Form Check ===');
                setTimeout(() => {
                    this.debugTransferForm();
                }, 1000);
            } else {
                const welcomeEl = document.getElementById('managerWelcome');
                if (welcomeEl) {
                    welcomeEl.textContent = `歡迎，${this.currentUser.fullName}`;
                }
                this.loadDashboard();
                this.loadApprovals();
                await this.loadEmployeeManagement();
                await this.loadManagerOptions();
                this.switchView('dashboard');
            }

            // Set up periodic data refresh for managers (every 5 minutes)
            if (this.currentUser.role === 'manager') {
                this.startPeriodicDataRefresh();
            }
            
            console.log('User screen initialized successfully');
        } catch (error) {
            console.error('Failed to initialize user screen:', error);
            this.showError('初始化失敗，請重新登入');
            
            // Force logout on critical error
            this.logout();
        }
    }

    // Start periodic data refresh for managers
    startPeriodicDataRefresh() {
        // Clear any existing interval
        if (this.dataRefreshInterval) {
            clearInterval(this.dataRefreshInterval);
        }
        
        // Set up new interval (5 minutes)
        this.dataRefreshInterval = setInterval(async () => {
            console.log('Performing periodic data refresh...');
            await this.refreshAllData();
            
            // Refresh current view if it's a data-heavy view
            if (this.currentView === 'dashboard') {
                await this.loadDashboard();
            } else if (this.currentView === 'approval') {
                await this.loadApprovals();
            } else if (this.currentView === 'employeeManagement') {
                await this.loadEmployeeManagement();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Stop periodic data refresh
    stopPeriodicDataRefresh() {
        if (this.dataRefreshInterval) {
            clearInterval(this.dataRefreshInterval);
            this.dataRefreshInterval = null;
        }
    }

    // Load employee inventory
    async loadInventory() {
        const container = document.getElementById('inventoryList');
        if (!container) {
            console.warn('Inventory container not found');
            return;
        }
        
        // Validate user session before loading inventory
        if (!this.currentUser || !this.currentUser.id) {
            console.warn('Current user not available for inventory loading, attempting validation...');
            const sessionValid = await this.validateUserSession();
            if (!sessionValid) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">用戶狀態異常</div>
                        <div class="empty-state-subtext">請重新登入或聯繫管理員</div>
                    </div>
                `;
                return;
            }
        }

        // Ensure we have inventory data for the current user
        if (!this.data.giftInventory || this.data.giftInventory.length === 0) {
            console.log('No inventory data available, refreshing...');
            await this.refreshInventoryData();
        }

        console.log('Loading inventory for user:', this.currentUser.fullName, 'ID:', this.currentUser.id);
        console.log('Available inventory data:', this.data.giftInventory.length, 'records');
        
        const userInventory = this.data.giftInventory.filter(inv => inv.userId === this.currentUser.id);
        console.log('User inventory found:', userInventory.length, 'records');
        
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
            if (!gift) {
                console.warn('Gift not found for inventory item:', inv);
                return '';
            }
            
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
    async loadEmployeeOptions() {
        // Wait a bit to ensure DOM is ready
        await this.delay(100);
        
        const select = document.getElementById('transferTarget');
        console.log('Loading employee options - select element:', select);
        console.log('Current user:', this.currentUser);
        
        if (!select) {
            console.error('Transfer target select element not found');
            console.log('Available elements with similar names:');
            document.querySelectorAll('select').forEach(s => {
                if (s.id && s.id.includes('transfer')) {
                    console.log('Found similar select:', s.id, s);
                }
            });
            return;
        }
        
        if (!this.currentUser) {
            console.error('Current user not available');
            return;
        }
        
        console.log('Loading employee options for user:', this.currentUser.fullName, 'Role:', this.currentUser.role);
        console.log('Select element before loading:', {
            id: select.id,
            innerHTML: select.innerHTML.substring(0, 100) + '...',
            optionsCount: select.options.length
        });
        
        try {
            // Use the new colleagues endpoint instead of relying on cached user data
            const response = await this.apiCall('/api/colleagues');
            console.log('Colleagues API response:', response);
            
            if (response && Array.isArray(response)) {
                const colleagues = response;
                console.log('Available colleagues:', colleagues.length);
                console.log('Colleagues:', colleagues.map(u => `${u.fullName} (${u.role})`));
                
                if (colleagues.length === 0) {
                    select.innerHTML = '<option value="">暫無可選擇的同事</option>';
                    console.warn('No colleagues available for transfer');
                } else {
                    const optionsHTML = '<option value="">請選擇同事</option>' +
                        colleagues.map(user => 
                            `<option value="${user.id}">${user.fullName} (${user.employeeId}) - ${user.role === 'manager' ? '主管' : '員工'}</option>`
                        ).join('');
                    
                    select.innerHTML = optionsHTML;
                    console.log('Employee options loaded successfully');
                    console.log('Options HTML length:', optionsHTML.length);
                    console.log('Select element after loading:', {
                        innerHTML: select.innerHTML.substring(0, 100) + '...',
                        optionsCount: select.options.length
                    });
                }
            } else {
                console.warn('Unexpected colleagues response format:', response);
                select.innerHTML = '<option value="">載入同事資料失敗</option>';
                
                // Fallback: try to use cached user data if available
                if (this.data.users && this.data.users.length > 0) {
                    console.log('Attempting fallback to cached user data...');
                    this.loadEmployeeOptionsFromCache();
                }
            }
        } catch (error) {
            console.error('Failed to load colleagues:', error);
            select.innerHTML = '<option value="">載入同事資料失敗</option>';
            
            // Fallback: try to use cached user data if available
            if (this.data.users && this.data.users.length > 0) {
                console.log('Attempting fallback to cached user data...');
                this.loadEmployeeOptionsFromCache();
            }
        }
    }

    // Fallback method to load employee options from cached data
    loadEmployeeOptionsFromCache() {
        const select = document.getElementById('transferTarget');
        if (!select || !this.currentUser) return;
        
        console.log('Loading employee options from cached data...');
        console.log('Available cached users:', this.data.users.length);
        console.log('Cached users:', this.data.users.map(u => ({ id: u.id, fullName: u.fullName, role: u.role, status: u.status })));
        
        let colleagues;
        
        if (this.currentUser.role === 'employee') {
            // Employees can transfer to other employees and managers
            colleagues = this.data.users.filter(u => 
                u.id !== this.currentUser.id && 
                u.status === 'active'
            );
        } else if (this.currentUser.role === 'manager') {
            // Managers can transfer to employees
            colleagues = this.data.users.filter(u => 
                u.id !== this.currentUser.id && 
                u.role === 'employee' && 
                u.status === 'active'
            );
        } else {
            colleagues = [];
        }
        
        console.log('Filtered colleagues from cache:', colleagues.length);
        console.log('Filtered colleagues:', colleagues.map(u => ({ id: u.id, fullName: u.fullName, role: u.role, status: u.status })));
        
        if (colleagues.length > 0) {
            const optionsHTML = '<option value="">請選擇同事</option>' +
                colleagues.map(user => 
                    `<option value="${user.id}">${user.fullName} (${user.employeeId}) - ${user.role === 'manager' ? '主管' : '員工'}</option>`
                ).join('');
            
            select.innerHTML = optionsHTML;
            console.log('Employee options loaded from cache successfully');
            console.log('Options HTML length:', optionsHTML.length);
            console.log('Select element after cache loading:', {
                innerHTML: select.innerHTML.substring(0, 100) + '...',
                optionsCount: select.options.length
            });
        } else {
            select.innerHTML = '<option value="">暫無可選擇的同事</option>';
            console.warn('No colleagues available from cache');
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
        
        try {
            // Send request to backend
            const response = await this.apiCall('/api/requests', {
                method: 'POST',
                body: JSON.stringify({
                    giftId: giftId,
                    requestType: 'increase',
                    requestedQuantity: quantity,
                    purpose: purpose
                })
            });
            
            if (response.success) {
                // Update local data after successful backend update
                await this.refreshAllData();
                
                this.showSuccess('增發申請已提交，等待主管審批');
                this.resetForm('increaseForm');
            } else {
                this.showError(response.message || '申請提交失敗');
            }
        } catch (error) {
            console.error('Request submission failed:', error);
            this.showError('申請提交失敗：' + (error.message || '未知錯誤'));
        } finally {
            this.showLoading(false);
        }
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
        
        try {
            // Send request to backend
            const response = await this.apiCall('/api/requests', {
                method: 'POST',
                body: JSON.stringify({
                    giftId: giftId,
                    requestType: 'transfer',
                    requestedQuantity: quantity,
                    targetUserId: targetUserId,
                    purpose: purpose
                })
            });
            
            if (response.success) {
                // Update local data after successful backend update
                await this.refreshAllData();
                
                this.showSuccess('轉移申請已提交，等待主管審批');
                this.resetForm('transferForm');
            } else {
                this.showError(response.message || '申請提交失敗');
            }
        } catch (error) {
            console.error('Request submission failed:', error);
            this.showError('申請提交失敗：' + (error.message || '未知錯誤'));
        } finally {
            this.showLoading(false);
        }
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
        
        try {
            // Store current user info before API call
            const currentUserBackup = { ...this.currentUser };
            
            // Send distribution to backend
            const response = await this.apiCall('/api/inventory/send', {
                method: 'POST',
                body: JSON.stringify({
                    giftId: giftId,
                    quantity: quantity,
                    reason: note
                })
            });
            
            if (response.success) {
                // Update local inventory immediately to show the change
                const userInventory = this.data.giftInventory.find(inv => 
                    inv.userId === this.currentUser.id && inv.giftId === giftId
                );
                
                if (userInventory) {
                    userInventory.quantity -= quantity;
                    userInventory.lastUpdated = new Date().toISOString();
                    console.log(`Updated local inventory: ${giftId} quantity reduced by ${quantity}`);
                }
                
                // Also refresh from backend to ensure consistency
                await this.refreshInventoryData();
                
                // Ensure current user is preserved
                this.currentUser = currentUserBackup;
                
                this.showSuccess(`已登記送出 ${quantity} 個贈品`);
                this.resetForm('distributionForm');
                await this.loadInventory();
            } else {
                this.showError(response.message || '送出登記失敗');
            }
        } catch (error) {
            console.error('Distribution failed:', error);
            this.showError('送出登記失敗：' + (error.message || '未知錯誤'));
        } finally {
            this.showLoading(false);
        }
    }

    // Load manager dashboard
    async loadDashboard() {
        const container = document.getElementById('dashboardContent');
        if (!container) return;

        try {
            // Ensure we have fresh data
            if (!this.data.users || this.data.users.length === 0) {
                await this.refreshUserData();
            }
            if (!this.data.giftInventory || this.data.giftInventory.length === 0) {
                await this.refreshInventoryData();
            }

            const employees = this.data.users.filter(u => u.role === 'employee' && u.status === 'active');
            
            if (employees.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-text">暫無員工資料</div>
                        <div class="empty-state-subtext">請新增員工或檢查系統狀態</div>
                    </div>
                `;
                return;
            }
            
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
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">載入儀表板失敗</div>
                    <div class="empty-state-subtext">${error.message}</div>
                </div>
            `;
        }
    }

    // Load approvals
    async loadApprovals() {
        const container = document.getElementById('approvalList');
        if (!container) return;

        try {
            // Ensure we have fresh data
            if (!this.data.users || this.data.users.length === 0) {
                await this.refreshUserData();
            }
            if (!this.data.pendingRequests || this.data.pendingRequests.length === 0) {
                await this.refreshRequestData();
            }

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
        } catch (error) {
            console.error('Failed to load approvals:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">載入審批資料失敗</div>
                    <div class="empty-state-subtext">${error.message}</div>
                </div>
            `;
        }
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
        
        try {
            // Send approval to backend
            const response = await this.apiCall(`/api/requests/${requestId}/approve`, {
                method: 'PUT',
                body: JSON.stringify({
                    approvedQuantity: approvedQuantity,
                    reason: comment
                })
            });
            
            if (response.success) {
                // Update local data after successful backend update
                await this.refreshAllData();
                
                this.closeModal();
                await this.loadApprovals();
                await this.loadDashboard();
                this.showSuccess('申請已核准');
            } else {
                this.showError(response.message || '核准失敗');
            }
        } catch (error) {
            console.error('Approval failed:', error);
            this.showError('核准失敗：' + (error.message || '未知錯誤'));
        } finally {
            this.showLoading(false);
        }
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
        
        try {
            // Send rejection to backend
            const response = await this.apiCall(`/api/requests/${requestId}/reject`, {
                method: 'PUT',
                body: JSON.stringify({
                    reason: comment
                })
            });
            
            if (response.success) {
                // Update local data after successful backend update
                await this.refreshAllData();
                
                this.closeModal();
                await this.loadApprovals();
                this.showSuccess('申請已駁回');
            } else {
                this.showError(response.message || '駁回失敗');
            }
        } catch (error) {
            console.error('Rejection failed:', error);
            this.showError('駁回失敗：' + (error.message || '未知錯誤'));
        } finally {
            this.showLoading(false);
        }
    }

            // Load manager options
        async loadManagerOptions() {
            try {
                // Ensure we have fresh user data
                if (!this.data.users || this.data.users.length === 0) {
                    await this.refreshUserData();
                }

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

                // Load store options for employee management
                this.loadStoreOptions();
            } catch (error) {
                console.error('Failed to load manager options:', error);
            }
        }

        // Load store options
        loadStoreOptions() {
            const storeSelects = ['newStoreId', 'editStoreId'];
            storeSelects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    select.innerHTML = '<option value="">請選擇門店</option>' +
                        this.data.stores.map(store => 
                            `<option value="${store.id}">${store.storeName}</option>`
                        ).join('');
                }
            });
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
        
        try {
            // Send adjustment to backend
            const response = await this.apiCall(`/api/inventory/${userId}/${giftId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    quantity: quantity,
                    reason: reason
                })
            });
            
            if (response.success) {
                // Update local data after successful backend update
                await this.refreshAllData();
                
                this.resetForm('adjustmentForm');
                await this.loadDashboard();
                this.showSuccess('庫存調整完成');
            } else {
                this.showError(response.message || '調整失敗');
            }
        } catch (error) {
            console.error('Adjustment failed:', error);
            this.showError('調整失敗：' + (error.message || '未知錯誤'));
        } finally {
            this.showLoading(false);
        }
    }

    // Load employee management
    async loadEmployeeManagement() {
        const container = document.getElementById('employeeList');
        if (!container) return;

        try {
            const response = await this.apiCall('/api/users');
            const employees = response.users || response;
            
            container.innerHTML = employees.map(employee => {
                const store = this.data.stores.find(s => s.id === employee.storeId);
                const statusClass = employee.status === 'active' ? 'status-active' : 'status-inactive';
                const statusText = employee.status === 'active' ? '啟用' : '停用';
                
                return `
                    <div class="employee-card ${employee.status === 'inactive' ? 'inactive' : ''}">
                        <div class="employee-card-header">
                            <div class="employee-name">${employee.fullName}</div>
                            <div class="employee-status">
                                <span class="account-role ${employee.role}">${employee.role === 'manager' ? '主管' : '員工'}</span>
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                        </div>
                        <div class="employee-details">
                            <div><strong>員工編號:</strong> ${employee.employeeId}</div>
                            <div><strong>所屬門店:</strong> ${store ? store.storeName : '未知門店'}</div>
                            <div><strong>帳號:</strong> ${employee.username}</div>
                            <div><strong>狀態:</strong> ${statusText}</div>
                        </div>
                        <div class="employee-actions">
                            <button class="btn btn--outline btn--sm" onclick="app.editEmployee(${employee.id})">編輯</button>
                            ${employee.id !== this.currentUser.id ? 
                                `<button class="btn btn--outline btn--sm" onclick="app.toggleEmployeeStatus(${employee.id})">${employee.status === 'active' ? '停用' : '啟用'}</button>` : ''}
                            ${employee.id !== this.currentUser.id ? 
                                `<button class="btn btn--danger btn--sm" onclick="app.deleteEmployee(${employee.id})">刪除</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Load employee management error:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <div class="empty-state-text">載入員工資料失敗</div>
                    <div class="empty-state-subtext">${error.message}</div>
                </div>
            `;
        }
    }

    // Open Export Excel Modal
    openExportExcelModal() {
        const modal = document.getElementById('exportExcelModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.setupExportModal();
        }
    }

    // Close Export Excel Modal
    closeExportExcelModal() {
        const modal = document.getElementById('exportExcelModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Setup Export Modal
    setupExportModal() {
        const startExportBtn = document.getElementById('startExportBtn');
        
        if (startExportBtn) {
            startExportBtn.addEventListener('click', () => {
                this.startExport();
            });
        }
    }

    // Start Export Process
    async startExport() {
        const exportType = document.querySelector('input[name="exportType"]:checked').value;
        const includeInactive = document.getElementById('includeInactive').checked;
        const includeTimestamps = document.getElementById('includeTimestamps').checked;
        const exportFormat = document.querySelector('input[name="exportFormat"]:checked').value;

        this.showLoading(true);

        try {
            let exportData = [];
            let fileName = '';
            let headers = [];

            switch (exportType) {
                case 'inventory':
                    const result = await this.exportInventory(includeInactive, includeTimestamps);
                    exportData = result.data;
                    headers = result.headers;
                    fileName = `贈品庫存報表_${new Date().toISOString().split('T')[0]}`;
                    break;
                case 'employees':
                    const employeeResult = await this.exportEmployees(includeInactive, includeTimestamps);
                    exportData = employeeResult.data;
                    headers = employeeResult.headers;
                    fileName = `員工資料報表_${new Date().toISOString().split('T')[0]}`;
                    break;
                case 'gifts':
                    const giftResult = await this.exportGifts(includeInactive, includeTimestamps);
                    exportData = giftResult.data;
                    headers = giftResult.headers;
                    fileName = `贈品資料報表_${new Date().toISOString().split('T')[0]}`;
                    break;
                case 'stores':
                    const storeResult = await this.exportStores(includeInactive, includeTimestamps);
                    exportData = storeResult.data;
                    headers = storeResult.headers;
                    fileName = `門店資料報表_${new Date().toISOString().split('T')[0]}`;
                    break;
                default:
                    throw new Error('不支援的匯出類型');
            }

            if (exportData.length === 0) {
                this.showError('暫無資料可匯出');
                return;
            }

            // Create and download file
            if (exportFormat === 'csv') {
                this.downloadCSV(exportData, headers, fileName);
            } else {
                // Excel format (future implementation)
                this.showError('Excel 格式匯出功能開發中，請使用 CSV 格式');
            }

            this.showSuccess('報表匯出完成');
            this.closeExportExcelModal();

        } catch (error) {
            console.error('Export failed:', error);
            this.showError('匯出失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Export Inventory Data
    async exportInventory(includeInactive, includeTimestamps) {
        let users = this.data.users;
        if (!includeInactive) {
            users = users.filter(u => u.status === 'active');
        }

        const exportData = [];
        const headers = ['員工姓名', '員工編號', '贈品編號', '贈品名稱', '數量'];
        
        if (includeTimestamps) {
            headers.push('最後更新時間');
        }

        users.forEach(employee => {
            if (employee.role === 'employee') {
                const inventory = this.data.giftInventory.filter(inv => inv.userId === employee.id);
                
                if (inventory.length === 0) {
                    // Include employees with no inventory
                    const row = {
                        員工姓名: employee.fullName,
                        員工編號: employee.employeeId,
                        贈品編號: '',
                        贈品名稱: '',
                        數量: 0
                    };
                    
                    if (includeTimestamps) {
                        row['最後更新時間'] = '';
                    }
                    
                    exportData.push(row);
                } else {
                    inventory.forEach(inv => {
                        const gift = this.data.gifts.find(g => g.id === inv.giftId);
                        if (gift) {
                            const row = {
                                員工姓名: employee.fullName,
                                員工編號: employee.employeeId,
                                贈品編號: gift.giftCode,
                                贈品名稱: gift.giftName,
                                數量: inv.quantity
                            };
                            
                            if (includeTimestamps) {
                                row['最後更新時間'] = inv.lastUpdated ? new Date(inv.lastUpdated).toLocaleString('zh-TW') : '';
                            }
                            
                            exportData.push(row);
                        }
                    });
                }
            }
        });

        return { data: exportData, headers };
    }

    // Export Employees Data
    async exportEmployees(includeInactive, includeTimestamps) {
        let users = this.data.users;
        if (!includeInactive) {
            users = users.filter(u => u.status === 'active');
        }

        const exportData = [];
        const headers = ['帳號', '姓名', '員工編號', '門市ID', '角色', '狀態'];
        
        if (includeTimestamps) {
            headers.push('建立時間', '最後更新時間');
        }

        users.forEach(user => {
            const row = {
                帳號: user.username,
                姓名: user.fullName,
                員工編號: user.employeeId,
                門市ID: user.storeId,
                角色: user.role === 'manager' ? '主管' : '員工',
                狀態: user.status === 'active' ? '啟用' : '停用'
            };
            
            if (includeTimestamps) {
                row['建立時間'] = user.createdAt ? new Date(user.createdAt).toLocaleString('zh-TW') : '';
                row['最後更新時間'] = user.updatedAt ? new Date(user.updatedAt).toLocaleString('zh-TW') : '';
            }
            
            exportData.push(row);
        });

        return { data: exportData, headers };
    }

    // Export Gifts Data
    async exportGifts(includeInactive, includeTimestamps) {
        let gifts = this.data.gifts;
        if (!includeInactive) {
            gifts = gifts.filter(g => g.status !== 'inactive');
        }

        const exportData = [];
        const headers = ['贈品編號', '贈品名稱', '類別', '狀態'];
        
        if (includeTimestamps) {
            headers.push('建立時間', '最後更新時間');
        }

        gifts.forEach(gift => {
            const row = {
                贈品編號: gift.giftCode,
                贈品名稱: gift.giftName,
                類別: gift.category,
                狀態: gift.status === 'inactive' ? '停用' : '啟用'
            };
            
            if (includeTimestamps) {
                row['建立時間'] = gift.createdAt ? new Date(gift.createdAt).toLocaleString('zh-TW') : '';
                row['最後更新時間'] = gift.updatedAt ? new Date(gift.updatedAt).toLocaleString('zh-TW') : '';
            }
            
            exportData.push(row);
        });

        return { data: exportData, headers };
    }

    // Export Stores Data
    async exportStores(includeInactive, includeTimestamps) {
        let stores = this.data.stores;
        if (!includeInactive) {
            stores = stores.filter(s => s.status === 'active');
        }

        const exportData = [];
        const headers = ['門店編號', '門店名稱', '地址', '狀態'];
        
        if (includeTimestamps) {
            headers.push('建立時間', '最後更新時間');
        }

        stores.forEach(store => {
            const row = {
                門店編號: store.storeCode,
                門店名稱: store.storeName,
                地址: store.address || '',
                狀態: store.status === 'active' ? '啟用' : '停用'
            };
            
            if (includeTimestamps) {
                row['建立時間'] = store.createdAt ? new Date(store.createdAt).toLocaleString('zh-TW') : '';
                row['最後更新時間'] = store.updatedAt ? new Date(store.updatedAt).toLocaleString('zh-TW') : '';
            }
            
            exportData.push(row);
        });

        return { data: exportData, headers };
    }

    // Download CSV File
    downloadCSV(data, headers, fileName) {
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header] || '';
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');
        
        // Create and download file
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Legacy export method (kept for backward compatibility)
    exportToExcel() {
        // Redirect to new export modal
        this.openExportExcelModal();
    }

    // Open Import Excel Modal
    openImportExcelModal() {
        const modal = document.getElementById('importExcelModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.setupImportModal();
        }
    }

    // Close Import Excel Modal
    closeImportExcelModal() {
        const modal = document.getElementById('importExcelModal');
        if (modal) {
            modal.classList.add('hidden');
            this.resetImportModal();
        }
    }

    // Setup Import Modal
    setupImportModal() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const importFileInput = document.getElementById('importFileInput');
        const startImportBtn = document.getElementById('startImportBtn');

        if (fileUploadArea && importFileInput) {
            // Click to select file
            fileUploadArea.addEventListener('click', () => {
                importFileInput.click();
            });

            // File selection change
            importFileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files[0]);
            });

            // Drag and drop functionality
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });

            fileUploadArea.addEventListener('dragleave', () => {
                fileUploadArea.classList.remove('dragover');
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelection(files[0]);
                }
            });

            // Start import button
            if (startImportBtn) {
                startImportBtn.addEventListener('click', () => {
                    this.startImport();
                });
            }
        }
    }

    // Handle file selection
    async handleFileSelection(file) {
        if (!file) return;

        // Show file info
        this.showFileInfo(file);

        try {
            // Parse the file based on type
            const data = await this.parseExcelFile(file);
            
            // Show preview
            this.showImportPreview(data);
            
            // Enable start import button
            const startImportBtn = document.getElementById('startImportBtn');
            if (startImportBtn) {
                startImportBtn.disabled = false;
            }
        } catch (error) {
            console.error('File parsing error:', error);
            this.showError('檔案解析失敗：' + error.message);
        }
    }

    // Parse Excel file
    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    
                    if (file.name.endsWith('.csv')) {
                        // Parse CSV
                        const csvData = this.parseCSV(data);
                        resolve(csvData);
                    } else {
                        // For now, we'll handle CSV only
                        // In a full implementation, you'd use a library like SheetJS for Excel files
                        reject(new Error('目前僅支援 CSV 格式，Excel 檔案功能開發中'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file, 'UTF-8');
            } else {
                reject(new Error('不支援的檔案格式'));
            }
        });
    }

    // Parse CSV data
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            throw new Error('CSV 檔案為空');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return { headers, data };
    }

    // Show file info
    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (fileInfo && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            fileInfo.style.display = 'block';
        }
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Show import preview
    showImportPreview(parsedData) {
        const previewSection = document.getElementById('importPreview');
        const previewHeaders = document.getElementById('previewHeaders');
        const previewBody = document.getElementById('previewBody');

        if (previewSection && previewHeaders && previewBody) {
            // Show headers
            previewHeaders.innerHTML = parsedData.headers.map(header => 
                `<th>${header}</th>`
            ).join('');

            // Show first 5 rows as preview
            const previewRows = parsedData.data.slice(0, 5);
            previewBody.innerHTML = previewRows.map(row => 
                `<tr>${parsedData.headers.map(header => 
                    `<td>${row[header] || ''}</td>`
                ).join('')}</tr>`
            ).join('');

            previewSection.style.display = 'block';
        }
    }

    // Start import process
    async startImport() {
        const importType = document.querySelector('input[name="importType"]:checked').value;
        const overwriteExisting = document.getElementById('overwriteExisting').checked;
        const createMissing = document.getElementById('createMissing').checked;

        this.showLoading(true);

        try {
            // Get the parsed data
            const importFileInput = document.getElementById('importFileInput');
            const file = importFileInput.files[0];
            
            if (!file) {
                throw new Error('請選擇要匯入的檔案');
            }

            const parsedData = await this.parseExcelFile(file);
            
            // Process import based on type
            let result;
            switch (importType) {
                case 'inventory':
                    result = await this.importInventory(parsedData.data, overwriteExisting, createMissing);
                    break;
                case 'employees':
                    result = await this.importEmployees(parsedData.data, overwriteExisting, createMissing);
                    break;
                case 'gifts':
                    result = await this.importGifts(parsedData.data, overwriteExisting, createMissing);
                    break;
                case 'stores':
                    result = await this.importStores(parsedData.data, overwriteExisting, createMissing);
                    break;
                default:
                    throw new Error('不支援的匯入類型');
            }

            // Show detailed results
            if (result.errors && result.errors.length > 0) {
                this.showError(`匯入完成，但有 ${result.errors.length} 個錯誤。成功處理 ${result.successCount} 筆資料。`);
                console.warn('Import errors:', result.errors);
                
                // Show errors in a more user-friendly way
                const errorMessage = result.errors.slice(0, 5).join('\n') + 
                    (result.errors.length > 5 ? `\n... 還有 ${result.errors.length - 5} 個錯誤` : '');
                this.showToast(errorMessage, 'warning');
            } else {
                this.showSuccess(`匯入完成！成功處理 ${result.successCount} 筆資料`);
            }
            
            // Refresh data
            await this.refreshAllData();
            
            // Close modal
            this.closeImportExcelModal();
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showError('匯入失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Import inventory data
    async importInventory(data, overwriteExisting, createMissing) {
        let successCount = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Validate required fields
                if (!row['員工編號'] || !row['贈品編號'] || row['數量'] === undefined) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 缺少必要欄位`);
                    continue;
                }

                // Find employee by employee ID
                const employee = this.data.users.find(u => 
                    u.employeeId === row['員工編號'] && u.status === 'active'
                );

                if (!employee && !createMissing) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 找不到員工 ${row['員工編號']}`);
                    continue;
                }

                // Find gift by gift code
                const gift = this.data.gifts.find(g => g.giftCode === row['贈品編號']);

                if (!gift && !createMissing) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 找不到贈品 ${row['贈品編號']}`);
                    continue;
                }

                // Update or create inventory
                const quantity = parseInt(row['數量']);
                if (isNaN(quantity)) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 數量格式錯誤`);
                    continue;
                }

                // Call backend API to update inventory
                try {
                    const response = await this.apiCall(`/api/inventory/${employee.id}/${gift.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            quantity: quantity,
                            reason: `匯入更新 - ${new Date().toLocaleString('zh-TW')}`
                        })
                    });

                    if (response.success) {
                        successCount++;
                        console.log(`Successfully updated inventory for ${employee.fullName} - ${gift.giftName}: ${quantity}`);
                    } else {
                        errors.push(`行 ${data.indexOf(row) + 2}: 更新庫存失敗 - ${response.message}`);
                    }
                } catch (apiError) {
                    errors.push(`行 ${data.indexOf(row) + 2}: API 錯誤 - ${apiError.message}`);
                }
                
            } catch (error) {
                errors.push(`行 ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('Import errors:', errors);
        }

        return { successCount, errors };
    }

    // Import employees data
    async importEmployees(data, overwriteExisting, createMissing) {
        let successCount = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Validate required fields
                if (!row['帳號'] || !row['姓名'] || !row['員工編號']) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 缺少必要欄位`);
                    continue;
                }

                // Check if employee exists
                const existingEmployee = this.data.users.find(u => 
                    u.employeeId === row['員工編號'] || u.username === row['帳號']
                );

                if (existingEmployee && !overwriteExisting) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 員工已存在 ${row['員工編號']}`);
                    continue;
                }

                // Call backend API to create/update employee
                try {
                    let response;
                    
                    if (existingEmployee && overwriteExisting) {
                        // Update existing employee
                        response = await this.apiCall(`/api/users/${existingEmployee.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                username: row['帳號'],
                                fullName: row['姓名'],
                                employeeId: row['員工編號'],
                                storeId: parseInt(row['門市ID']) || 1,
                                role: row['角色'] === '主管' ? 'manager' : 'employee'
                            })
                        });
                    } else {
                        // Create new employee
                        response = await this.apiCall('/api/users', {
                            method: 'POST',
                            body: JSON.stringify({
                                username: row['帳號'],
                                password: '123456', // Default password
                                fullName: row['姓名'],
                                employeeId: row['員工編號'],
                                storeId: parseInt(row['門市ID']) || 1,
                                role: row['角色'] === '主管' ? 'manager' : 'employee'
                            })
                        });
                    }

                    if (response.success) {
                        successCount++;
                        console.log(`Successfully ${existingEmployee && overwriteExisting ? 'updated' : 'created'} employee: ${row['姓名']}`);
                    } else {
                        errors.push(`行 ${data.indexOf(row) + 2}: ${existingEmployee && overwriteExisting ? '更新' : '新增'}員工失敗 - ${response.message}`);
                    }
                } catch (apiError) {
                    errors.push(`行 ${data.indexOf(row) + 2}: API 錯誤 - ${apiError.message}`);
                }
                
            } catch (error) {
                errors.push(`行 ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('Import errors:', errors);
        }

        return { successCount, errors };
    }

    // Import gifts data
    async importGifts(data, overwriteExisting, createMissing) {
        let successCount = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Validate required fields
                if (!row['贈品編號'] || !row['贈品名稱']) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 缺少必要欄位`);
                    continue;
                }

                // Check if gift exists
                const existingGift = this.data.gifts.find(g => g.giftCode === row['贈品編號']);

                if (existingGift && !overwriteExisting) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 贈品已存在 ${row['贈品編號']}`);
                    continue;
                }

                // Call backend API to create/update gift
                try {
                    let response;
                    
                    console.log('Processing gift row:', row);
                    console.log('Existing gift:', existingGift);
                    console.log('Overwrite existing:', overwriteExisting);
                    
                    if (existingGift && overwriteExisting) {
                        // Update existing gift
                        console.log('Updating existing gift:', existingGift.id);
                        response = await this.apiCall(`/api/gifts/${existingGift.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                giftCode: row['贈品編號'],
                                giftName: row['贈品名稱'],
                                category: row['類別'] || '未分類',
                                status: row['狀態'] === '停用' ? 'inactive' : 'active'
                            })
                        });
                    } else {
                        // Create new gift
                        console.log('Creating new gift with data:', {
                            giftCode: row['贈品編號'],
                            giftName: row['贈品名稱'],
                            category: row['類別'] || '未分類',
                            status: row['狀態'] === '停用' ? 'inactive' : 'active'
                        });
                        
                        response = await this.apiCall('/api/gifts', {
                            method: 'POST',
                            body: JSON.stringify({
                                giftCode: row['贈品編號'],
                                giftName: row['贈品名稱'],
                                category: row['類別'] || '未分類',
                                status: row['狀態'] === '停用' ? 'inactive' : 'active'
                            })
                        });
                    }
                    
                    console.log('API response:', response);

                    if (response.success) {
                        successCount++;
                        console.log(`Successfully ${existingGift && overwriteExisting ? 'updated' : 'created'} gift: ${row['贈品名稱']}`);
                    } else {
                        errors.push(`行 ${data.indexOf(row) + 2}: ${existingGift && overwriteExisting ? '更新' : '新增'}贈品失敗 - ${response.message}`);
                    }
                } catch (apiError) {
                    errors.push(`行 ${data.indexOf(row) + 2}: API 錯誤 - ${apiError.message}`);
                }
                
            } catch (error) {
                errors.push(`行 ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('Import errors:', errors);
        }

        return { successCount, errors };
    }

    // Import stores data
    async importStores(data, overwriteExisting, createMissing) {
        let successCount = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Validate required fields
                if (!row['門店編號'] || !row['門店名稱']) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 缺少必要欄位`);
                    continue;
                }

                // Check if store exists
                const existingStore = this.data.stores.find(s => s.storeCode === row['門店編號']);

                if (existingStore && !overwriteExisting) {
                    errors.push(`行 ${data.indexOf(row) + 2}: 門店已存在 ${row['門店編號']}`);
                    continue;
                }

                // Call backend API to create/update store
                try {
                    let response;
                    
                    console.log('Processing store row:', row);
                    console.log('Existing store:', existingStore);
                    console.log('Overwrite existing:', overwriteExisting);
                    
                    if (existingStore && overwriteExisting) {
                        // Update existing store
                        console.log('Updating existing store:', existingStore.id);
                        response = await this.apiCall(`/api/stores/${existingStore.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                storeCode: row['門店編號'],
                                storeName: row['門店名稱'],
                                address: row['地址'] || '',
                                status: row['狀態'] === '停用' ? 'inactive' : 'active'
                            })
                        });
                    } else {
                        // Create new store
                        console.log('Creating new store with data:', {
                            storeCode: row['門店編號'],
                            storeName: row['門店名稱'],
                            address: row['地址'] || '',
                            status: row['狀態'] === '停用' ? 'inactive' : 'active'
                        });
                        
                        response = await this.apiCall('/api/stores', {
                            method: 'POST',
                            body: JSON.stringify({
                                storeCode: row['門店編號'],
                                storeName: row['門店名稱'],
                                address: row['地址'] || '',
                                status: row['狀態'] === '停用' ? 'inactive' : 'active'
                            })
                        });
                    }
                    
                    console.log('API response:', response);

                    if (response.success) {
                        successCount++;
                        console.log(`Successfully ${existingStore && overwriteExisting ? 'updated' : 'created'} store: ${row['門店名稱']}`);
                    } else {
                        errors.push(`行 ${data.indexOf(row) + 2}: ${existingStore && overwriteExisting ? '更新' : '新增'}門店失敗 - ${response.message}`);
                    }
                } catch (apiError) {
                    errors.push(`行 ${data.indexOf(row) + 2}: API 錯誤 - ${apiError.message}`);
                }
                
            } catch (error) {
                errors.push(`行 ${data.indexOf(row) + 2}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.warn('Import errors:', errors);
        }

        return { successCount, errors };
    }

    // =============================================================================
    // Store Management Functions
    // =============================================================================

    // Open Edit Stores Modal
    openEditStoresModal() {
        const modal = document.getElementById('editStoresModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.loadStoresList();
            this.setupStoreModalEvents();
        }
    }

    // Close Edit Stores Modal
    closeEditStoresModal() {
        const modal = document.getElementById('editStoresModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Load stores list
    loadStoresList() {
        const storesList = document.getElementById('storesList');
        if (!storesList) return;

        storesList.innerHTML = this.data.stores.map(store => `
            <div class="store-item" data-store-id="${store.id}">
                <div class="store-info">
                    <div class="store-code">${store.storeCode}</div>
                    <div class="store-name">${store.storeName}</div>
                    <div class="store-address">${store.address || '無地址'}</div>
                    <div class="store-status ${store.status}">${store.status === 'active' ? '啟用' : '停用'}</div>
                </div>
                <div class="store-actions">
                    <button class="btn btn--secondary btn--xs" onclick="app.editStore(${store.id})">編輯</button>
                    <button class="btn btn--danger btn--xs" onclick="app.deleteStore(${store.id})">刪除</button>
                </div>
            </div>
        `).join('');
    }

    // Setup store modal events
    setupStoreModalEvents() {
        const addStoreBtn = document.getElementById('addStoreBtn');
        if (addStoreBtn) {
            addStoreBtn.addEventListener('click', () => this.openStoreFormModal());
        }
    }

    // Open Store Form Modal
    openStoreFormModal(storeId = null) {
        const modal = document.getElementById('storeFormModal');
        const title = document.getElementById('storeFormTitle');
        const form = document.getElementById('storeForm');
        
        if (storeId) {
            // Edit mode
            const store = this.data.stores.find(s => s.id === storeId);
            if (store) {
                title.textContent = '編輯門店';
                document.getElementById('storeId').value = store.id;
                document.getElementById('storeCode').value = store.storeCode;
                document.getElementById('storeName').value = store.storeName;
                document.getElementById('storeAddress').value = store.address || '';
                document.getElementById('storeStatus').value = store.status;
            }
        } else {
            // Add mode
            title.textContent = '新增門店';
            form.reset();
            document.getElementById('storeId').value = '';
        }
        
        modal.classList.remove('hidden');
        this.setupStoreFormEvents();
    }

    // Close Store Form Modal
    closeStoreFormModal() {
        const modal = document.getElementById('storeFormModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Setup store form events
    setupStoreFormEvents() {
        const form = document.getElementById('storeForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveStore();
            };
        }
    }

    // Save store
    async saveStore() {
        const storeId = document.getElementById('storeId').value;
        const storeCode = document.getElementById('storeCode').value;
        const storeName = document.getElementById('storeName').value;
        const storeAddress = document.getElementById('storeAddress').value;
        const storeStatus = document.getElementById('storeStatus').value;

        if (!storeCode || !storeName) {
            this.showError('門店編號和名稱為必填欄位');
            return;
        }

        try {
            let response;
            if (storeId) {
                // Update existing store
                response = await this.apiCall(`/api/stores/${storeId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        storeCode,
                        storeName,
                        address: storeAddress,
                        status: storeStatus
                    })
                });
            } else {
                // Create new store
                response = await this.apiCall('/api/stores', {
                    method: 'POST',
                    body: JSON.stringify({
                        storeCode,
                        storeName,
                        address: storeAddress,
                        status: storeStatus
                    })
                });
            }

            if (response.success) {
                this.showSuccess(storeId ? '門店更新成功' : '門店新增成功');
                await this.loadStoresData();
                this.loadStoresList();
                this.closeStoreFormModal();
            } else {
                this.showError(response.message || '操作失敗');
            }
        } catch (error) {
            console.error('Save store error:', error);
            this.showError('儲存失敗：' + error.message);
        }
    }

    // Edit store
    editStore(storeId) {
        this.openStoreFormModal(storeId);
    }

    // Delete store
    async deleteStore(storeId) {
        const store = this.data.stores.find(s => s.id === storeId);
        if (!store) return;

        if (confirm(`確定要刪除門店 "${store.storeName}" 嗎？此操作無法復原。`)) {
            try {
                // Check if store is being used by employees
                const employeesUsingStore = this.data.users.filter(u => u.storeId === storeId);
                if (employeesUsingStore.length > 0) {
                    this.showError(`無法刪除門店，因為有 ${employeesUsingStore.length} 名員工正在使用此門店`);
                    return;
                }

                // For now, we'll just deactivate the store instead of deleting
                const response = await this.apiCall(`/api/stores/${storeId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        storeCode: store.storeCode,
                        storeName: store.storeName,
                        address: store.address,
                        status: 'inactive'
                    })
                });

                if (response.success) {
                    this.showSuccess('門店已停用');
                    await this.loadStoresData();
                    this.loadStoresList();
                } else {
                    this.showError(response.message || '停用失敗');
                }
            } catch (error) {
                console.error('Delete store error:', error);
                this.showError('停用失敗：' + error.message);
            }
        }
    }

    // =============================================================================
    // Gift Management Functions
    // =============================================================================

    // Open Edit Gifts Modal
    openEditGiftsModal() {
        const modal = document.getElementById('editGiftsModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.loadGiftsList();
            this.setupGiftModalEvents();
        }
    }

    // Close Edit Gifts Modal
    closeEditGiftsModal() {
        const modal = document.getElementById('editGiftsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Load gifts list
    loadGiftsList() {
        const giftsList = document.getElementById('giftsList');
        if (!giftsList) return;

        giftsList.innerHTML = this.data.gifts.map(gift => `
            <div class="gift-item" data-gift-id="${gift.id}">
                <div class="gift-info">
                    <div class="gift-code">${gift.giftCode}</div>
                    <div class="gift-name">${gift.giftName}</div>
                    <div class="gift-category">${gift.category}</div>
                    <div class="gift-description">${gift.description || '無描述'}</div>
                    <div class="gift-status ${gift.status}">${gift.status === 'active' ? '啟用' : '停用'}</div>
                </div>
                <div class="gift-actions">
                    <button class="btn btn--secondary btn--xs" onclick="app.editGift(${gift.id})">編輯</button>
                    <button class="btn btn--danger btn--xs" onclick="app.deleteGift(${gift.id})">刪除</button>
                </div>
            </div>
        `).join('');
    }

    // Setup gift modal events
    setupGiftModalEvents() {
        const addGiftBtn = document.getElementById('addGiftBtn');
        if (addGiftBtn) {
            addGiftBtn.addEventListener('click', () => this.openGiftFormModal());
        }
    }

    // Open Gift Form Modal
    openGiftFormModal(giftId = null) {
        const modal = document.getElementById('giftFormModal');
        const title = document.getElementById('giftFormTitle');
        const form = document.getElementById('giftForm');
        
        if (giftId) {
            // Edit mode
            const gift = this.data.gifts.find(g => g.id === giftId);
            if (gift) {
                title.textContent = '編輯贈品';
                document.getElementById('giftFormId').value = gift.id;
                document.getElementById('giftFormCode').value = gift.giftCode;
                document.getElementById('giftFormName').value = gift.giftName;
                document.getElementById('giftFormCategory').value = gift.category;
                document.getElementById('giftFormDescription').value = gift.description || '';
                document.getElementById('giftFormStatus').value = gift.status;
            }
        } else {
            // Add mode
            title.textContent = '新增贈品';
            form.reset();
            document.getElementById('giftFormId').value = '';
        }
        
        modal.classList.remove('hidden');
        this.setupGiftFormEvents();
    }

    // Close Gift Form Modal
    closeGiftFormModal() {
        const modal = document.getElementById('giftFormModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Setup gift form events
    setupGiftFormEvents() {
        const form = document.getElementById('giftForm');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.saveGift();
            };
        }
    }

    // Save gift
    async saveGift() {
        const giftId = document.getElementById('giftFormId').value;
        const giftCode = document.getElementById('giftFormCode').value;
        const giftName = document.getElementById('giftFormName').value;
        const giftCategory = document.getElementById('giftFormCategory').value;
        const giftDescription = document.getElementById('giftFormDescription').value;
        const giftStatus = document.getElementById('giftFormStatus').value;

        if (!giftCode || !giftName || !giftCategory) {
            this.showError('贈品編號、名稱和類別為必填欄位');
            return;
        }

        try {
            let response;
            if (giftId) {
                // Update existing gift
                response = await this.apiCall(`/api/gifts/${giftId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        giftCode,
                        giftName,
                        category: giftCategory,
                        description: giftDescription,
                        status: giftStatus
                    })
                });
            } else {
                // Create new gift
                response = await this.apiCall('/api/gifts', {
                    method: 'POST',
                    body: JSON.stringify({
                        giftCode,
                        giftName,
                        category: giftCategory,
                        description: giftDescription,
                        status: giftStatus
                    })
                });
            }

            if (response.success) {
                this.showSuccess(giftId ? '贈品更新成功' : '贈品新增成功');
                await this.loadGiftsData();
                this.loadGiftsList();
                this.closeGiftFormModal();
            } else {
                this.showError(response.message || '操作失敗');
            }
        } catch (error) {
            console.error('Save gift error:', error);
            this.showError('儲存失敗：' + error.message);
        }
    }

    // Edit gift
    editGift(giftId) {
        this.openGiftFormModal(giftId);
    }

    // Delete gift
    async deleteGift(giftId) {
        const gift = this.data.gifts.find(g => g.id === giftId);
        if (!gift) return;

        if (confirm(`確定要刪除贈品 "${gift.giftName}" 嗎？此操作將同時刪除所有員工的相關庫存記錄，無法復原。`)) {
            try {
                // Check if gift is being used in inventory
                const inventoryUsingGift = this.data.giftInventory.filter(inv => inv.giftId === giftId);
                
                if (inventoryUsingGift.length > 0) {
                    // Show warning about inventory records that will be deleted
                    const confirmDelete = confirm(
                        `此贈品在 ${inventoryUsingGift.length} 名員工的庫存中有記錄。\n\n` +
                        `刪除贈品將同時刪除所有相關的庫存記錄。\n\n` +
                        `確定要繼續嗎？`
                    );
                    
                    if (!confirmDelete) {
                        return;
                    }
                }

                // Note: The server will automatically delete all inventory records when deleting a gift
                console.log(`Gift ${gift.giftName} has ${inventoryUsingGift.length} inventory records that will be automatically deleted`);

                // Now delete the gift itself
                console.log('Sending DELETE request to /api/gifts/' + giftId);
                const response = await this.apiCall(`/api/gifts/${giftId}`, {
                    method: 'DELETE'
                });
                console.log('Delete gift response:', response);

                if (response.success) {
                    // The server response includes the counts of removed records
                    const removedInventoryCount = response.removedInventoryCount || 0;
                    const removedRequestsCount = response.removedRequestsCount || 0;
                    
                    this.showSuccess(`贈品 "${gift.giftName}" 已刪除，同時清理了 ${removedInventoryCount} 筆庫存記錄和 ${removedRequestsCount} 筆申請記錄`);
                    
                    // Refresh all data to reflect the changes
                    await Promise.all([
                        this.loadGiftsData(),
                        this.loadInventoryData()
                    ]);
                    
                    // Update the gifts list display
                    this.loadGiftsList();
                    
                    // If we're on the dashboard view, refresh it too
                    if (this.currentView === 'dashboard') {
                        this.refreshDashboard();
                    }
                } else {
                    this.showError(response.message || '刪除贈品失敗');
                }
            } catch (error) {
                console.error('Delete gift error:', error);
                this.showError('刪除失敗：' + error.message);
            }
        }
    }

    // Reset import modal
    resetImportModal() {
        const fileInfo = document.getElementById('fileInfo');
        const importPreview = document.getElementById('importPreview');
        const startImportBtn = document.getElementById('startImportBtn');
        const importFileInput = document.getElementById('importFileInput');

        if (fileInfo) fileInfo.style.display = 'none';
        if (importPreview) importPreview.style.display = 'none';
        if (startImportBtn) startImportBtn.disabled = true;
        if (importFileInput) importFileInput.value = '';
    }

    // Test gift API
    async testGiftAPI() {
        try {
            this.showLoading(true);
            console.log('Testing gift API...');
            
            // Try to create a test gift
            const response = await this.apiCall('/api/gifts', {
                method: 'POST',
                body: JSON.stringify({
                    giftCode: 'TEST001',
                    giftName: '測試贈品',
                    category: '測試類別',
                    status: 'active'
                })
            });
            
            console.log('Test gift API response:', response);
            
            if (response.success) {
                this.showSuccess('贈品API測試成功！');
                
                // Refresh gifts data
                await this.loadGiftsData();
                
                // Show updated gift count
                this.showDataState('Gift API Test', {
                    users: this.data.users.length,
                    inventory: this.data.giftInventory.length,
                    requests: this.data.pendingRequests.length,
                    gifts: this.data.gifts.length,
                    stores: this.data.stores.length
                });
            } else {
                this.showError('贈品API測試失敗：' + response.message);
            }
            
        } catch (error) {
            console.error('Test gift API failed:', error);
            this.showError('贈品API測試失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Test API routing
    async testAPIRouting() {
        try {
            this.showLoading(true);
            console.log('Testing API routing...');
            
            // Test the simple test endpoint
            const response = await this.apiCall('/api/test');
            
            console.log('API routing test response:', response);
            
            if (response.success) {
                this.showSuccess(`API路由測試成功！\nBase Path: ${response.basePath}\n時間: ${response.timestamp}`);
            } else {
                this.showError('API路由測試失敗：' + response.message);
            }
            
        } catch (error) {
            console.error('API routing test failed:', error);
            this.showError('API路由測試失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Test colleagues API
    async testColleaguesAPI() {
        try {
            this.showLoading(true);
            console.log('Testing colleagues API...');
            
            const response = await this.apiCall('/api/colleagues');
            console.log('Colleagues API response:', response);
            
            if (response && Array.isArray(response)) {
                this.showSuccess(`同事API測試成功！\n找到 ${response.length} 位同事\n${response.map(u => `${u.fullName} (${u.role})`).join('\n')}`);
            } else {
                this.showError('同事API測試失敗：回應格式錯誤');
            }
            
        } catch (error) {
            console.error('Test colleagues API failed:', error);
            this.showError('同事API測試失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Debug transfer form state
    debugTransferForm() {
        console.log('=== Debug Transfer Form ===');
        
        const select = document.getElementById('transferTarget');
        if (select) {
            console.log('Transfer target select element:', select);
            console.log('Select innerHTML length:', select.innerHTML.length);
            console.log('Select options count:', select.options.length);
            console.log('Select value:', select.value);
            
            // Show all options
            for (let i = 0; i < select.options.length; i++) {
                const option = select.options[i];
                console.log(`Option ${i}:`, {
                    value: option.value,
                    text: option.text,
                    selected: option.selected
                });
            }
        } else {
            console.log('Transfer target select element not found');
            
            // Check if we're on the right screen
            const currentScreen = document.querySelector('.screen.active');
            console.log('Current active screen:', currentScreen?.id);
            
            // Check if we're on the right view
            const currentView = document.querySelector('.view.active');
            console.log('Current active view:', currentView?.id);
            
            // Check if the transfer tab is visible
            const transferTab = document.getElementById('transferTab');
            console.log('Transfer tab element:', transferTab);
            
            // Check all select elements
            console.log('All select elements:');
            document.querySelectorAll('select').forEach(s => {
                console.log('Select:', s.id, s);
            });
        }
        
        console.log('Current user:', this.currentUser);
        console.log('Available users in data:', this.data.users.length);
        console.log('Available gifts in data:', this.data.gifts.length);
        
        // Check if we can access the colleagues API
        console.log('Testing colleagues API access...');
        this.testColleaguesAPI().then(() => {
            console.log('Colleagues API test completed');
        }).catch(error => {
            console.error('Colleagues API test failed:', error);
        });
        
        console.log('=== End Debug ===');
    }

    // Refresh employee options
    async refreshEmployeeOptions() {
        try {
            this.showLoading(true);
            console.log('Refreshing employee options...');
            
            // First refresh user data to ensure we have the latest
            await this.refreshUserData();
            
            // Then load employee options
            await this.loadEmployeeOptions();
            
            this.showSuccess('同事選項已重新整理');
            
            // Show current data state
            this.showDataState('Employee Options Refresh', {
                users: this.data.users.length,
                inventory: this.data.giftInventory.length,
                requests: this.data.pendingRequests.length,
                gifts: this.data.gifts.length,
                stores: this.data.stores.length
            });
            
        } catch (error) {
            console.error('Failed to refresh employee options:', error);
            this.showError('重新整理同事選項失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
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
        console.log('Switching to screen:', screenName);
        
        // Safety check for undefined user
        if (screenName !== 'login' && (!this.currentUser || !this.currentUser.fullName)) {
            console.warn('Attempting to show screen without valid user, redirecting to login');
            this.showScreen('login');
            return;
        }
        
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(`${screenName}Screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            console.log('Successfully switched to screen:', screenName);
        } else {
            console.error('Target screen not found:', screenName);
            // Fallback to login if screen not found
            this.showScreen('login');
        }
    }

    // Switch view within screen
    async switchView(viewName) {
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
            await this.loadInventory();
        } else if (viewName === 'history') {
            this.loadHistory();
        } else if (viewName === 'dashboard') {
            await this.loadDashboard();
        } else if (viewName === 'approval') {
            await this.loadApprovals();
        } else if (viewName === 'employeeManagement') {
            await this.loadEmployeeManagement();
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
        // Stop periodic data refresh
        this.stopPeriodicDataRefresh();
        
        this.currentUser = null;
        localStorage.removeItem('token');
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

    // Employee management functions
    openAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.resetForm('addEmployeeForm');
        }
    }

    // API helper functions
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        // Get the current path to determine if we're in a sub-path
        const currentPath = window.location.pathname;
        let basePath = '';
        
        // Check if we're in a sub-path (e.g., /gift)
        if (currentPath.includes('/gift')) {
            basePath = '/gift';
        }
        
        // Construct the full endpoint URL
        const fullEndpoint = basePath + endpoint;
        
        console.log(`API call: ${endpoint} -> ${fullEndpoint}`);
        console.log('API call options:', options);
        console.log('Token exists:', !!token);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        try {
            const response = await fetch(fullEndpoint, { ...defaultOptions, ...options });
            console.log('API response status:', response.status);
            console.log('API response headers:', response.headers);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API error response:', errorData);
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API success response:', data);
            return data;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    closeAddEmployeeModal() {
        const modal = document.getElementById('addEmployeeModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async handleAddEmployee(e) {
        e.preventDefault();
        
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const fullName = document.getElementById('newFullName').value.trim();
        const employeeId = document.getElementById('newEmployeeId').value.trim();
        const storeId = parseInt(document.getElementById('newStoreId').value);
        const role = document.getElementById('newRole').value;

        if (!username || !password || !fullName || !employeeId || !storeId || !role) {
            this.showError('請填寫所有必填欄位');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiCall('/api/users', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password,
                    fullName,
                    employeeId,
                    storeId,
                    role
                })
            });

            this.closeAddEmployeeModal();
            
            // Refresh all data to ensure consistency
            await this.refreshUserData();
            await this.refreshInventoryData();
            await this.refreshRequestData();
            
            // Clean up any invalid references
            this.cleanupInvalidReferences();
            
            // Refresh displays
            this.loadEmployeeManagement();
            await this.loadManagerOptions();
            this.loadDashboard(); // Refresh dashboard with new data
            
            this.showSuccess(response.message || '員工新增成功');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    editEmployee(employeeId) {
        const employee = this.data.users.find(u => u.id === employeeId);
        if (!employee) {
            this.showError('找不到員工資料');
            return;
        }

        const modal = document.getElementById('editEmployeeModal');
        const userIdInput = document.getElementById('editUserId');
        const usernameInput = document.getElementById('editUsername');
        const passwordInput = document.getElementById('editPassword');
        const fullNameInput = document.getElementById('editFullName');
        const employeeIdInput = document.getElementById('editEmployeeId');
        const storeIdInput = document.getElementById('editStoreId');
        const roleInput = document.getElementById('editRole');
        const statusInput = document.getElementById('editStatus');

        if (!modal || !userIdInput || !usernameInput || !passwordInput || !fullNameInput || 
            !employeeIdInput || !storeIdInput || !roleInput || !statusInput) {
            this.showError('表單元素錯誤');
            return;
        }

        // Fill form with employee data
        userIdInput.value = employee.id;
        usernameInput.value = employee.username;
        passwordInput.value = ''; // Clear password field
        fullNameInput.value = employee.fullName;
        employeeIdInput.value = employee.employeeId;
        storeIdInput.value = employee.storeId;
        roleInput.value = employee.role;
        statusInput.value = employee.status;

        modal.classList.remove('hidden');
    }

    closeEditEmployeeModal() {
        const modal = document.getElementById('editEmployeeModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async handleEditEmployee(e) {
        e.preventDefault();
        
        const userId = parseInt(document.getElementById('editUserId').value);
        const username = document.getElementById('editUsername').value.trim();
        const password = document.getElementById('editPassword').value;
        const fullName = document.getElementById('editFullName').value.trim();
        const employeeId = document.getElementById('editEmployeeId').value.trim();
        const storeId = parseInt(document.getElementById('editStoreId').value);
        const role = document.getElementById('editRole').value;
        const status = document.getElementById('editStatus').value;

        if (!userId || !username || !fullName || !employeeId || !storeId || !role || !status) {
            this.showError('請填寫所有必填欄位');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiCall(`/api/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    username,
                    password,
                    fullName,
                    employeeId,
                    storeId,
                    role,
                    status
                })
            });

            this.closeEditEmployeeModal();
            
            // Refresh all data to ensure consistency
            await this.refreshUserData();
            await this.refreshInventoryData();
            await this.refreshRequestData();
            
            // Clean up any invalid references
            this.cleanupInvalidReferences();
            
            // Refresh displays
            this.loadEmployeeManagement();
            await this.loadManagerOptions();
            this.loadDashboard(); // Refresh dashboard with updated data
            
            this.showSuccess(response.message || '員工資料更新成功');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async toggleEmployeeStatus(employeeId) {
        const employee = this.data.users.find(u => u.id === employeeId);
        if (!employee) {
            this.showError('找不到員工資料');
            return;
        }

        if (employee.id === this.currentUser.id) {
            this.showError('無法停用自己的帳號');
            return;
        }

        this.showLoading(true);

        try {
            const newStatus = employee.status === 'active' ? 'inactive' : 'active';
            const response = await this.apiCall(`/api/users/${employeeId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });

            // Refresh all data to ensure consistency
            await this.refreshUserData();
            await this.refreshInventoryData();
            await this.refreshRequestData();
            
            // Clean up any invalid references
            this.cleanupInvalidReferences();
            
            // Refresh displays
            this.loadEmployeeManagement();
            await this.loadManagerOptions();
            this.loadDashboard(); // Refresh dashboard with updated data
            
            this.showSuccess(response.message || `員工已${newStatus === 'active' ? '啟用' : '停用'}`);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    deleteEmployee(employeeId) {
        const employee = this.data.users.find(u => u.id === employeeId);
        if (!employee) {
            this.showError('找不到員工資料');
            return;
        }

        if (employee.id === this.currentUser.id) {
            this.showError('無法刪除自己的帳號');
            return;
        }

        const modal = document.getElementById('deleteConfirmModal');
        const nameElement = document.getElementById('deleteEmployeeName');
        
        if (modal && nameElement) {
            nameElement.textContent = employee.fullName;
            modal.dataset.employeeId = employeeId;
            modal.classList.remove('hidden');
        }
    }

    closeDeleteConfirmModal() {
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async confirmDeleteEmployee() {
        const modal = document.getElementById('deleteConfirmModal');
        const employeeId = parseInt(modal.dataset.employeeId);
        
        if (!employeeId) {
            this.showError('找不到員工資料');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiCall(`/api/users/${employeeId}`, {
                method: 'DELETE'
            });

            this.closeDeleteConfirmModal();
            
            // Refresh all data to ensure consistency
            await this.refreshUserData();
            await this.refreshInventoryData();
            await this.refreshRequestData();
            
            // Clean up any invalid references
            this.cleanupInvalidReferences();
            
            // Refresh displays
            this.loadEmployeeManagement();
            await this.loadManagerOptions();
            this.loadDashboard(); // Refresh dashboard with updated data
            
            this.showSuccess(response.message || '員工已刪除');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GiftManagementApp();
});
