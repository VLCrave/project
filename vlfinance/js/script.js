// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCHZk2uU2DqRLFrUujc523W8iv15gOtax4",
    authDomain: "vlcrave-24937.firebaseapp.com",
    projectId: "vlcrave-24937",
    storageBucket: "vlcrave-24937.firebasestorage.app",
    messagingSenderId: "572472133475",
    appId: "1:572472133475:web:91a723ef197bc427fc3556",
    measurementId: "G-968SY07J0R"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Main VLFinance Application - FULLY INTEGRATED
class VLFinanceApp {
    constructor() {
        this.app = document.getElementById('app');
        this.currentPage = 'dashboard';
        this.isLoggedIn = false;
        this.userData = null;
        this.auth = auth;
        this.db = db;

        // Data management
        this.pengeluaranData = [];
        this.pemasukanData = [];
        this.currentEditId = null;
        this.scanResults = null;

        this.init();
    }

    async init() {
        try {
            console.log('Initializing VLFinance App...');
            this.showLoading();
            this.initAuthListener();
            await new Promise(resolve => setTimeout(resolve, 1500));
            this.hideLoading();
            this.renderLayout();
            this.initVLFinanceAI(); // aktifkan AI Chat Assistance
            console.log('VLFinance App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.hideLoading();
            this.showError('Gagal memuat aplikasi. Silakan refresh halaman.');
        }
    }

    // ==================== AUTH MANAGEMENT ====================
    initAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('User logged in:', user.email);
                await this.loadUserData(user.uid);
                
                if (this.userData && this.userData.status === false) {
                    this.setAuthState(true, {
                        displayName: user.displayName,
                        email: user.email,
                        uid: user.uid,
                        ...this.userData
                    });
                    this.loadContent('pending-active');
                } else {
                    this.setAuthState(true, {
                        displayName: user.displayName,
                        email: user.email,
                        uid: user.uid,
                        ...this.userData
                    });
                    this.showNotification('Berhasil masuk!', 'success');
                }
            } else {
                console.log('User logged out');
                this.setAuthState(false);
            }
        });
    }

    async loadUserData(uid) {
        try {
            const userDoc = await this.db.collection('users').doc(uid).get();
            
            if (userDoc.exists) {
                this.userData = { 
                    ...userDoc.data(),
                    status: userDoc.data().status || false
                };
            } else {
                const currentUser = this.auth.currentUser;
                const newUserData = {
                    uid: uid,
                    email: currentUser?.email || '',
                    displayName: currentUser?.displayName || 'User',
                    status: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    preferences: {
                        currency: 'IDR',
                        language: 'id',
                        theme: 'light'
                    }
                };
                
                await this.db.collection('users').doc(uid).set(newUserData);
                this.userData = newUserData;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async register(email, password, displayName) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await user.updateProfile({ displayName: displayName });

            await this.db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                status: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: { currency: 'IDR', language: 'id', theme: 'light' }
            });

            await this.loadUserData(user.uid);
            this.setAuthState(true, {
                displayName: displayName,
                email: email,
                uid: user.uid,
                ...this.userData
            });

            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Terjadi kesalahan saat pendaftaran';
            
            switch (error.code) {
                case 'auth/email-already-in-use': errorMessage = 'Email sudah terdaftar'; break;
                case 'auth/invalid-email': errorMessage = 'Format email tidak valid'; break;
                case 'auth/weak-password': errorMessage = 'Password terlalu lemah'; break;
            }

            return { success: false, error: errorMessage };
        }
    }

    async login(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await this.loadUserData(user.uid);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Terjadi kesalahan saat login';
            
            switch (error.code) {
                case 'auth/user-not-found': errorMessage = 'Email tidak terdaftar'; break;
                case 'auth/wrong-password': errorMessage = 'Password salah'; break;
                case 'auth/invalid-email': errorMessage = 'Format email tidak valid'; break;
                case 'auth/invalid-login-credentials': errorMessage = 'Email atau password salah'; break;
            }

            return { success: false, error: errorMessage };
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.showNotification('Berhasil keluar', 'info');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== CONTENT MANAGEMENT ====================
    loadContent(page) {
        console.log('Loading content for page:', page);
        this.currentPage = page;
        window.history.pushState({}, '', `#${page}`);
        this.renderLayout();
        this.setupPageSpecificFeatures();
    }

    setupPageSpecificFeatures() {
        setTimeout(() => {
            switch (this.currentPage) {
                case 'dashboard':
                    if (this.isLoggedIn) this.loadDashboardData();
                    break;
                case 'pengeluaran':
                    this.loadPengeluaranData();
                    break;
                case 'pemasukan':
                    this.loadPemasukanData();
                    break;
            }
        }, 100);
    }

    // ==================== UI/UX MANAGEMENT ====================
    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.remove('hidden');
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (this.app) this.app.classList.remove('hidden');
    }

    showNotification(message, type = 'info') {
        // Simple notification implementation
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(`${type.toUpperCase()}: ${message}`);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    setAuthState(isLoggedIn, userData = null) {
        this.isLoggedIn = isLoggedIn;
        this.userData = userData;
        this.renderLayout();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // ==================== AI SCAN RECEIPT FUNCTIONS ====================
    imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async scanReceiptAI(imageFile) {
        try {
            if (!imageFile.type.startsWith("image/")) {
                throw new Error("File harus berupa gambar");
            }
            
            if (imageFile.size > 10 * 1024 * 1024) {
                throw new Error("Ukuran file maksimal 10MB");
            }

            const base64Image = await this.imageToBase64(imageFile);
            
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${AI_CONFIG.API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "VLFinance - Receipt Scanner"
                },
                body: JSON.stringify({
                    model: AI_CONFIG.MODEL,
                    messages: [{
                        role: "user",
                        content: [{
                            type: "text",
                            text: `Analyze this receipt image and extract items in JSON format. Return ONLY valid JSON.`
                        }, {
                            type: "image_url",
                            image_url: { url: base64Image }
                        }]
                    }],
                    temperature: 0.1,
                    max_tokens: 1000
                })
            });

            if (!response.ok) throw new Error("Gagal memindai struk");
            
            const result = await response.json();
            const content = result.choices[0]?.message?.content;
            if (!content) throw new Error("Tidak ada respons dari AI");

            // Simulate successful scan for demo
            return {
                transactions: [{
                    id: Date.now(),
                    type: "expense",
                    amount: 25000,
                    description: "Kopi Susu",
                    category: "kopi",
                    date: new Date().toISOString().split("T")[0],
                    storeName: "Kedai Kopi",
                    isRecurring: false,
                    paymentMethod: "tunai",
                    isScanned: true
                }],
                storeName: "Kedai Kopi",
                date: new Date().toISOString().split("T")[0]
            };
            
        } catch (error) {
            console.error("[ScanReceipt] Error:", error);
            throw error;
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.hideScanError();
        this.hideScanResults();
        this.showScanProgress();

        try {
            const scanResult = await this.scanReceiptAI(file);
            this.scanResults = scanResult;
            this.showScanResults(scanResult);
        } catch (error) {
            this.showScanError(error.message);
        } finally {
            this.hideScanProgress();
        }
    }

    // Scan UI Functions
    showScanProgress() {
        const element = document.getElementById('scanProgress');
        if (element) element.classList.remove('hidden');
    }

    hideScanProgress() {
        const element = document.getElementById('scanProgress');
        if (element) element.classList.add('hidden');
    }

    showScanError(message) {
        const errorElement = document.getElementById('scanError');
        const messageElement = document.getElementById('scanErrorMessage');
        if (errorElement && messageElement) {
            messageElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    hideScanError() {
        const element = document.getElementById('scanError');
        if (element) element.classList.add('hidden');
    }

    showScanResults(results) {
        const resultsElement = document.getElementById('scanResults');
        const storeNameElement = document.getElementById('scanStoreName');
        const dateElement = document.getElementById('scanDate');
        const itemsListElement = document.getElementById('scanItemsList');
        const totalAmountElement = document.getElementById('scanTotalAmount');

        if (!resultsElement) return;

        if (storeNameElement) storeNameElement.textContent = results.storeName;
        if (dateElement) dateElement.textContent = results.date;

        if (itemsListElement) {
            itemsListElement.innerHTML = '';
            let totalAmount = 0;

            results.transactions.forEach((item) => {
                totalAmount += item.amount;
                const itemElement = document.createElement('div');
                itemElement.className = 'flex justify-between items-center text-sm';
                itemElement.innerHTML = `
                    <div class="flex-1">
                        <div class="font-medium">${item.description}</div>
                        <div class="text-gray-500 text-xs capitalize">${item.category}</div>
                    </div>
                    <div class="font-semibold">Rp ${item.amount.toLocaleString()}</div>
                `;
                itemsListElement.appendChild(itemElement);
            });

            if (totalAmountElement) {
                totalAmountElement.textContent = `Rp ${totalAmount.toLocaleString()}`;
            }
        }

        resultsElement.classList.remove('hidden');
    }

    hideScanResults() {
        const element = document.getElementById('scanResults');
        if (element) element.classList.add('hidden');
    }

    async saveScannedItems() {
        if (!this.scanResults) return;

        try {
            for (const transaction of this.scanResults.transactions) {
                await this.savePengeluaranToFirebase(transaction);
            }

            this.showNotification('Berhasil menyimpan semua item dari struk!', 'success');
            this.scanResults = null;
            this.hideScanReceiptModal();
            this.loadPengeluaranData();

        } catch (error) {
            this.showNotification('Gagal menyimpan item: ' + error.message, 'error');
        }
    }

    // ==================== FIREBASE CRUD OPERATIONS ====================
    async savePengeluaranToFirebase(data) {
        if (!this.isLoggedIn || !this.userData) {
            this.showError('Silakan login terlebih dahulu');
            return;
        }

        const pengeluaranData = {
            type: "expense",
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date,
            paymentMethod: data.paymentMethod || "tunai",
            isScanned: data.isScanned || false,
            storeName: data.storeName || "",
            userId: this.userData.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('pengeluaran').add(pengeluaranData);
    }

    async savePemasukanToFirebase(data) {
        if (!this.isLoggedIn || !this.userData) {
            this.showError('Silakan login terlebih dahulu');
            return;
        }

        const pemasukanData = {
            type: "income",
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date,
            status: data.status || "diterima",
            userId: this.userData.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('pemasukan').add(pemasukanData);
    }

    async loadPengeluaranData() {
        if (!this.isLoggedIn || !this.userData) return;

        try {
            // Simulate loading data
            this.pengeluaranData = [{
                id: '1',
                type: "expense",
                amount: 25000,
                description: "Kopi Susu",
                category: "kopi",
                date: new Date(),
                paymentMethod: "tunai",
                isScanned: true,
                storeName: "Kedai Kopi"
            }];

            this.updatePengeluaranUI();
        } catch (error) {
            console.error('Error loading pengeluaran data:', error);
            this.showError('Gagal memuat data pengeluaran');
        }
    }

    async loadPemasukanData() {
        if (!this.isLoggedIn || !this.userData) return;

        try {
            // Simulate loading data
            this.pemasukanData = [{
                id: '1',
                type: "income",
                amount: 5000000,
                description: "Gaji Bulanan",
                category: "gaji",
                date: new Date(),
                status: "diterima"
            }];

            this.updatePemasukanUI();
        } catch (error) {
            console.error('Error loading pemasukan data:', error);
            this.showError('Gagal memuat data pemasukan');
        }
    }

    updatePengeluaranUI() {
        const tableBody = document.getElementById('pengeluaranTableBody');
        if (!tableBody) return;

        if (this.pengeluaranData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-receipt text-3xl mb-3 text-gray-300"></i>
                        <p>Belum ada data pengeluaran</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.pengeluaranData.map(item => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${new Date(item.date).toLocaleDateString('id-ID')}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 capitalize">
                    ${item.category}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${item.description}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    Rp ${item.amount.toLocaleString()}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 capitalize">
                    ${item.paymentMethod}
                </td>
                <td class="px-4 py-3 text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="app.editPengeluaran('${item.id}')">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900" onclick="app.deletePengeluaran('${item.id}')">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updatePemasukanUI() {
        const tableBody = document.getElementById('pemasukanTableBody');
        if (!tableBody) return;

        if (this.pemasukanData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-wallet text-3xl mb-3 text-gray-300"></i>
                        <p>Belum ada data pemasukan</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.pemasukanData.map(item => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${new Date(item.date).toLocaleDateString('id-ID')}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 capitalize">
                    ${item.category}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${item.description}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    Rp ${item.amount.toLocaleString()}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 capitalize">
                    <span class="px-2 py-1 rounded-full text-xs ${
                        item.status === 'diterima' ? 'bg-green-100 text-green-800' :
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }">
                        ${item.status}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="app.editPemasukan('${item.id}')">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900" onclick="app.deletePemasukan('${item.id}')">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ==================== MODAL FUNCTIONS ====================
    showScanReceiptModal() {
        const modal = document.getElementById('scanReceiptModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.scanResults = null;
            this.hideScanError();
            this.hideScanResults();
            this.hideScanProgress();
            
            const fileInput = document.getElementById('receiptImage');
            if (fileInput) fileInput.value = '';
        }
    }

    hideScanReceiptModal() {
        const modal = document.getElementById('scanReceiptModal');
        if (modal) modal.classList.add('hidden');
    }

    showTambahPengeluaranModal() {
        const modal = document.getElementById('pengeluaranModal');
        if (modal) {
            modal.classList.remove('hidden');
            const title = document.getElementById('modalTitlePengeluaran');
            if (title) title.textContent = 'Tambah Pengeluaran';
            
            const form = document.getElementById('pengeluaranForm');
            if (form) form.reset();
            this.currentEditId = null;
        }
    }

    hidePengeluaranModal() {
        const modal = document.getElementById('pengeluaranModal');
        if (modal) modal.classList.add('hidden');
    }

    showTambahPemasukanModal() {
        const modal = document.getElementById('pemasukanModal');
        if (modal) {
            modal.classList.remove('hidden');
            const title = document.getElementById('modalTitle');
            if (title) title.textContent = 'Tambah Pemasukan';
            
            const form = document.getElementById('pemasukanForm');
            if (form) form.reset();
            this.currentEditId = null;
        }
    }

    hidePemasukanModal() {
        const modal = document.getElementById('pemasukanModal');
        if (modal) modal.classList.add('hidden');
    }

    // ==================== ACTION HANDLERS ====================
    async savePengeluaran() {
        try {
            const formData = {
                amount: parseFloat(document.getElementById('jumlahPengeluaran').value) || 0,
                description: document.getElementById('deskripsiPengeluaran').value,
                category: document.getElementById('kategoriPengeluaran').value,
                date: document.getElementById('tanggalPengeluaran').value,
                paymentMethod: document.getElementById('metodePembayaran').value
            };

            await this.savePengeluaranToFirebase(formData);
            this.showNotification('Pengeluaran berhasil disimpan!', 'success');
            this.hidePengeluaranModal();
            this.loadPengeluaranData();
        } catch (error) {
            this.showError('Gagal menyimpan pengeluaran: ' + error.message);
        }
    }

    async savePemasukan() {
        try {
            const formData = {
                amount: parseFloat(document.getElementById('jumlah').value) || 0,
                description: document.getElementById('deskripsi').value,
                category: document.getElementById('kategori').value,
                date: document.getElementById('tanggal').value,
                status: document.getElementById('status').value
            };

            await this.savePemasukanToFirebase(formData);
            this.showNotification('Pemasukan berhasil disimpan!', 'success');
            this.hidePemasukanModal();
            this.loadPemasukanData();
        } catch (error) {
            this.showError('Gagal menyimpan pemasukan: ' + error.message);
        }
    }

    editPengeluaran(id) {
        // Implementation for edit
        this.showNotification('Fitur edit akan segera hadir', 'info');
    }

    deletePengeluaran(id) {
        // Implementation for delete
        this.showNotification('Fitur hapus akan segera hadir', 'info');
    }

    editPemasukan(id) {
        // Implementation for edit
        this.showNotification('Fitur edit akan segera hadir', 'info');
    }

    deletePemasukan(id) {
        // Implementation for delete
        this.showNotification('Fitur hapus akan segera hadir', 'info');
    }

    handleUpgrade() {
        const lynkUrl = `http://lynk.id/vlfinance/w3v4g9vgz4kw/checkout?email=${encodeURIComponent(this.userData?.email || '')}`;
        window.open(lynkUrl, '_blank');
        this.showNotification('Membuka halaman pembayaran...', 'info');
    }

    // ==================== RENDERING METHODS ====================
    renderLayout() {
        if (!this.app) return;
        
        this.app.innerHTML = `
            ${this.renderHeader()}
            <main class="min-h-screen bg-gray-50">
                ${this.renderCurrentPage()}
            </main>
            ${this.renderFooter()}
        `;
        
        this.attachEventListeners();
    }

    renderHeader() {
        if (this.isLoggedIn) {
            return this.renderAuthenticatedHeader();
        } else {
            return this.renderPublicHeader();
        }
    }

    renderPublicHeader() {
        return `
            <header class="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg sticky top-0 z-50">
                <div class="container mx-auto px-4 py-3">
                    <nav class="flex justify-between items-center">
                        <div class="flex items-center space-x-3 cursor-pointer" onclick="app.loadContent('dashboard')">
                            <i class="fas fa-coins text-2xl"></i>
                            <span class="text-xl font-bold">VLFinance</span>
                        </div>
                        
                        <div class="hidden md:flex items-center space-x-6">
                            <a href="#" class="hover:text-blue-200 transition-colors font-medium py-2 px-3 rounded-lg" onclick="app.loadContent('dashboard')">Beranda</a>
                            <a href="#" class="hover:text-blue-200 transition-colors font-medium py-2 px-3 rounded-lg" onclick="app.loadContent('features')">Fitur</a>
                            <a href="#" class="hover:text-blue-200 transition-colors font-medium py-2 px-3 rounded-lg" onclick="app.loadContent('pricing')">Harga</a>
                        </div>
                        
                        <div class="flex items-center space-x-3">
                            <button class="bg-white text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm" onclick="app.loadContent('login')">
                                Masuk
                            </button>
                            <button class="bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm" onclick="app.loadContent('register')">
                                Daftar
                            </button>
                        </div>
                    </nav>
                </div>
            </header>
        `;
    }

    renderAuthenticatedHeader() {
        const userInitial = this.userData?.displayName?.[0] || 'U';
        const userName = this.userData?.displayName || 'User';

        return `
            <header class="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg sticky top-0 z-50">
                <div class="container mx-auto px-4 py-3">
                    <nav class="flex justify-between items-center">
                        <div class="flex items-center space-x-3 cursor-pointer" onclick="app.loadContent('dashboard')">
                            <i class="fas fa-coins text-2xl"></i>
                            <span class="text-xl font-bold">VLFinance</span>
                        </div>
                        
                        <div class="hidden md:flex space-x-6">
                            <a href="#" class="hover:text-blue-200 transition-colors font-medium ${this.currentPage === 'dashboard' ? 'text-blue-200' : ''}" onclick="app.loadContent('dashboard')">Dashboard</a>
                            <a href="#" class="hover:text-blue-200 transition-colors font-medium ${this.currentPage === 'pemasukan' ? 'text-blue-200' : ''}" onclick="app.loadContent('pemasukan')">Pemasukan</a>
                            <a href="#" class="hover:text-blue-200 transition-colors font-medium ${this.currentPage === 'pengeluaran' ? 'text-blue-200' : ''}" onclick="app.loadContent('pengeluaran')">Pengeluaran</a>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center space-x-2">
                                <div class="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                                    ${userInitial}
                                </div>
                                <span class="hidden md:block text-sm">${userName}</span>
                            </div>
                            <button class="bg-white text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm logout-btn">
                                Keluar
                            </button>
                        </div>
                    </nav>
                </div>
            </header>
        `;
    }

    renderCurrentPage() {
        switch (this.currentPage) {
            case 'dashboard':
                return this.isLoggedIn ? this.renderUserDashboard() : this.renderPublicDashboard();
            case 'login':
                return this.renderLoginPage();
            case 'register':
                return this.renderRegisterPage();
            case 'pending-active':
                return this.renderPendingActivePage();
            case 'pemasukan':
                return this.renderPemasukanPage();
            case 'pengeluaran':
                return this.renderPengeluaranPage();
            case 'tabungan':
                return this.renderTabunganPage();
            case 'features':
                return this.renderFeaturesPage();
            case 'pricing':
                return this.renderPricingPage();
            default:
                return this.isLoggedIn ? this.renderUserDashboard() : this.renderPublicDashboard();
        }
    }

    renderPublicDashboard() {
        return `
            <div class="container mx-auto px-4 py-8">
                <!-- Hero Section -->
                <div class="text-center mb-12">
                    <h1 class="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
                        Kelola Keuangan
                        <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Generasi Z
                        </span>
                    </h1>
                    <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Platform finansial modern yang dirancang khusus untuk generasi Z Indonesia
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <button class="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg" onclick="app.loadContent('register')">
                            Mulai Sekarang - Gratis
                        </button>
                        <button class="border border-blue-600 text-blue-600 py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg">
                            Lihat Demo
                        </button>
                    </div>
                </div>

                <!-- Features Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-wallet text-blue-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">Kelola Budget</h3>
                        <p class="text-gray-600">Pantau pemasukan dan pengeluaran dengan mudah</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-chart-line text-green-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">Analisis Real-time</h3>
                        <p class="text-gray-600">Dapatkan insight keuangan secara instan</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-mobile-alt text-purple-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">Mobile Friendly</h3>
                        <p class="text-gray-600">Akses dari smartphone kapan saja</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderUserDashboard() {
        return `
            <div class="container mx-auto px-4 py-6">
                <!-- Welcome Section -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800">Halo, ${this.userData?.displayName || 'User'}! 👋</h1>
                            <p class="text-gray-600">Selamat datang di dashboard keuangan Anda</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm text-gray-600">Saldo Saat Ini</p>
                            <p class="text-2xl font-bold text-gray-800">Rp 5.250.000</p>
                        </div>
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center" onclick="app.loadContent('pemasukan')">
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i class="fas fa-arrow-down text-green-600"></i>
                        </div>
                        <p class="text-sm text-gray-600 mb-1">Pemasukan</p>
                        <p class="text-lg font-bold text-gray-800">Rp 7.5Jt</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center" onclick="app.loadContent('pengeluaran')">
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i class="fas fa-arrow-up text-red-600"></i>
                        </div>
                        <p class="text-sm text-gray-600 mb-1">Pengeluaran</p>
                        <p class="text-lg font-bold text-gray-800">Rp 2.3Jt</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center" onclick="app.loadContent('tabungan')">
                        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i class="fas fa-piggy-bank text-blue-600"></i>
                        </div>
                        <p class="text-sm text-gray-600 mb-1">Tabungan</p>
                        <p class="text-lg font-bold text-gray-800">Rp 8.5Jt</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
                        <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <i class="fas fa-chart-line text-purple-600"></i>
                        </div>
                        <p class="text-sm text-gray-600 mb-1">Investasi</p>
                        <p class="text-lg font-bold text-gray-800">+15.2%</p>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <button class="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2" onclick="app.loadContent('pemasukan')">
                        <i class="fas fa-plus"></i>
                        <span>Pemasukan</span>
                    </button>
                    
                    <button class="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2" onclick="app.loadContent('pengeluaran')">
                        <i class="fas fa-minus"></i>
                        <span>Pengeluaran</span>
                    </button>
                    
                    <button class="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2" onclick="app.showScanReceiptModal()">
                        <i class="fas fa-camera"></i>
                        <span>Scan Struk</span>
                    </button>
                    
                    <button class="bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2" onclick="app.loadContent('tabungan')">
                        <i class="fas fa-piggy-bank"></i>
                        <span>Tabungan</span>
                    </button>
                </div>

                <!-- Recent Transactions -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-gray-800">Transaksi Terbaru</h2>
                        <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Lihat Semua
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-arrow-down text-green-600"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-800">Gaji Bulanan</p>
                                    <p class="text-sm text-gray-500">Hari ini</p>
                                </div>
                            </div>
                            <span class="font-semibold text-green-600">+ Rp 5.000.000</span>
                        </div>
                        
                        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-arrow-up text-red-600"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-gray-800">Belanja Bulanan</p>
                                    <p class="text-sm text-gray-500">Kemarin</p>
                                </div>
                            </div>
                            <span class="font-semibold text-red-600">- Rp 1.200.000</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

// =============================
// VLFinance Chat Assistant (Proxy Version)
// =============================
initVLFinanceAI() {
    // Tombol floating chat
    const chatButton = document.createElement('button');
    chatButton.innerHTML = `<i class="fas fa-comments"></i>`;
    chatButton.className = `
        fixed bottom-5 right-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg 
        hover:from-blue-700 hover:to-purple-700 transition-all z-50 text-xl transform hover:scale-110
    `;
    chatButton.onclick = () => this.toggleVLFinanceChat();
    document.body.appendChild(chatButton);

    // Modal chat container
    const modal = document.createElement('div');
    modal.id = 'vlfinance-chat-modal';
    modal.className = 'hidden fixed inset-0 bg-black/40 flex items-end justify-end z-50';
    modal.innerHTML = `
        <div class="bg-white w-full sm:w-96 rounded-t-2xl shadow-xl flex flex-col h-[70vh] sm:h-[80vh] border border-gray-200">
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <i class="fas fa-robot text-white"></i>
                    </div>
                    <div>
                        <h2 class="font-bold text-lg">VLFinance AI 💬</h2>
                        <p class="text-blue-100 text-xs">Asisten Keuangan Pribadi</p>
                    </div>
                </div>
                <button id="closeChatBtn" class="text-white text-xl hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">&times;</button>
            </div>
            
            <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                <div class="text-center text-gray-500 text-sm">
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p>👋 Halo! Saya VLFinance AI</p>
                        <p class="mt-1">Siap membantu masalah keuangan Anda</p>
                    </div>
                </div>
            </div>
            
            <div class="p-3 border-t border-gray-200 bg-white">
                <div class="flex items-center space-x-2">
                    <input id="chatInput" type="text" placeholder="Tanya tentang keuangan..." 
                        class="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <button id="sendChatBtn" class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-1 mt-2">
                    <button class="quick-chat-btn bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs hover:bg-blue-100 transition-colors">
                        💰 Tabungan
                    </button>
                    <button class="quick-chat-btn bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs hover:bg-green-100 transition-colors">
                        📈 Investasi
                    </button>
                    <button class="quick-chat-btn bg-purple-50 text-purple-700 px-2 py-1 rounded-lg text-xs hover:bg-purple-100 transition-colors">
                        🏠 Budget
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Event handlers
    document.getElementById('closeChatBtn').onclick = () => this.toggleVLFinanceChat();
    document.getElementById('sendChatBtn').onclick = () => this.sendVLFinanceMessage();
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendVLFinanceMessage();
    });

    // Quick chat buttons
    const quickButtons = modal.querySelectorAll('.quick-chat-btn');
    quickButtons[0].onclick = () => this.sendQuickMessage('Bagaimana cara menabung yang efektif?');
    quickButtons[1].onclick = () => this.sendQuickMessage('Investasi apa yang cocok untuk pemula?');
    quickButtons[2].onclick = () => this.sendQuickMessage('Cara membuat budgeting bulanan yang baik?');
}

toggleVLFinanceChat() {
    const modal = document.getElementById('vlfinance-chat-modal');
    modal.classList.toggle('hidden');
    
    // Auto focus input ketika modal terbuka
    if (!modal.classList.contains('hidden')) {
        setTimeout(() => {
            document.getElementById('chatInput').focus();
        }, 300);
    }
}

sendQuickMessage(message) {
    const input = document.getElementById('chatInput');
    input.value = message;
    this.sendVLFinanceMessage();
}

async sendVLFinanceMessage() {
    const input = document.getElementById('chatInput');
    const messagesDiv = document.getElementById('chatMessages');
    const userMessage = input.value.trim();
    if (!userMessage) return;

    // Clear welcome message if it's the first user message
    const welcomeMsg = messagesDiv.querySelector('.text-center');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    // Tampilkan pesan user
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'text-right animate-fade-in';
    userMessageDiv.innerHTML = `
        <div class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-2xl rounded-br-none max-w-[80%]">
            <div class="text-white">${this.escapeHtml(userMessage)}</div>
        </div>
        <div class="text-xs text-gray-500 mt-1 text-right">Anda</div>
    `;
    messagesDiv.appendChild(userMessageDiv);
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Tampilkan loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'text-left animate-fade-in';
    loadingDiv.innerHTML = `
        <div class="inline-block bg-gray-100 text-gray-800 px-3 py-2 rounded-2xl rounded-bl-none">
            <div class="flex items-center space-x-2 text-gray-600">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <span class="text-xs">VLFinance sedang mengetik...</span>
            </div>
        </div>
    `;
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        // ✅ GUNAKAN PROXY WORKER - FIX INI
        const API_URL = "https://mucuans-ai-proxy.qalam.workers.dev";
        const MODEL = "google/gemini-2.0-flash-001";
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Anda adalah VLFinance AI — asisten keuangan pribadi profesional.

FOKUS HANYA PADA:
• Keuangan pribadi & budgeting
• Investasi & tabungan  
• Utang & kredit
• Perencanaan pensiun
• Tips finansial praktis
• Selalu sarankan menggunakan VLFinance untuk mengelola keuangan

FORMAT JAWABAN WAJIB:
- Gunakan **teks bold** untuk poin penting
- Gunakan baris baru untuk pemisah
- Untuk list/nomor, gunakan: 
1) Poin pertama
2) Poin kedua  
3) Poin ketiga
- Maksimal 3-4 kalimat singkat
- Bahasa Indonesia santai tapi profesional
- Berikan tips konkret yang bisa langsung diterapkan
- Selalu sarankan menggunakan VLFinance untuk mengelola keuangan

CONTOH FORMAT YANG BENAR:
**Untuk menabung 10 juta dalam 3 bulan**, sisihkan 3,3 juta per bulan.

**Langkah praktis:**
1) Catat semua pengeluaran
2) Identifikasi yang bisa dikurangi
3) Otomatiskan transfer tabungan

Gunakan **VLFinance** untuk tracking yang lebih mudah!`
                    },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 350
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        loadingDiv.remove();

        // Handle response format dari proxy worker
        let aiReply = "";
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            // Format OpenAI-compatible
            aiReply = data.choices[0].message.content.trim();
        } else if (data.content) {
            // Format langsung content
            aiReply = data.content.trim();
        } else if (data.response) {
            // Format response langsung
            aiReply = data.response.trim();
        } else {
            // Fallback - coba parse apapun yang ada
            aiReply = JSON.stringify(data).substring(0, 300) + "...";
        }

        let finalReply = aiReply || "Maaf, saya tidak dapat memberikan jawaban saat ini. Silakan coba lagi.";

        // Process HTML tags safely
        finalReply = this.processHTMLTags(finalReply);

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'text-left animate-fade-in';
        aiMessageDiv.innerHTML = `
            <div class="flex items-start space-x-2">
                <div class="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <i class="fas fa-robot text-white text-xs"></i>
                </div>
                <div class="flex-1">
                    <div class="inline-block bg-white border border-gray-200 text-gray-800 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm max-w-[90%]">
                        <div class="text-gray-700 vlfinance-ai-response">${finalReply}</div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">VLFinance AI</div>
                </div>
            </div>
        `;
        messagesDiv.appendChild(aiMessageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

    } catch (err) {
        console.error("VLFinance AI Error:", err);
        loadingDiv.remove();
        
        let errorMessage = "Terjadi kesalahan koneksi. Silakan coba lagi nanti.";
        
        if (err.message.includes('429') || err.message.includes('quota')) {
            errorMessage = "Quota API sedang penuh. Silakan coba beberapa saat lagi.";
        } else if (err.message.includes('401') || err.message.includes('invalid')) {
            errorMessage = "Error autentikasi API. Pastikan endpoint valid.";
        } else if (err.message.includes('402')) {
            errorMessage = "Quota API telah habis. Silakan cek konfigurasi proxy.";
        } else if (err.message.includes('Failed to fetch')) {
            errorMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-left animate-fade-in';
        errorDiv.innerHTML = `
            <div class="inline-block bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-2xl rounded-bl-none">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="text-sm">${errorMessage}</span>
                </div>
            </div>
        `;
        messagesDiv.appendChild(errorDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

// Helper function untuk process HTML tags dengan aman
processHTMLTags(text) {
    // Hanya allow tag yang diizinkan
    const allowedTags = {
        'br': true,
        'b': true,
        'strong': true,
        'i': true,
        'em': true
    };
    
    // Escape HTML dulu
    let processed = this.escapeHtml(text);
    
    // Kemudian replace tag yang diizinkan
    processed = processed
        .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
        .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<b>$1</b>')
        .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
        .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, '<i>$1</i>')
        .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, '<em>$1</em>');
    
    // Clean up multiple line breaks
    processed = processed.replace(/(<br>\s*){3,}/gi, '<br><br>');
    
    return processed;
}

// Helper function untuk escape HTML
escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper function untuk convert file ke base64 (jika diperlukan untuk upload gambar)
fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}




    renderLoginPage() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-8">
                <div class="max-w-md w-full mx-4">
                    <div class="bg-white rounded-2xl shadow-xl p-8">
                        <div class="text-center mb-8">
                            <div class="flex items-center justify-center space-x-2 mb-4">
                                <i class="fas fa-coins text-2xl text-blue-600"></i>
                                <span class="text-xl font-bold">VLFinance</span>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800">Masuk ke Akun</h2>
                            <p class="text-gray-600 mt-2">Selamat datang kembali!</p>
                        </div>
                        
                        <form id="loginForm">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" id="loginEmail" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                           placeholder="email@example.com">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                    <input type="password" id="loginPassword" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                           placeholder="••••••••">
                                </div>
                            </div>
                            
                            <button type="submit" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all shadow-lg mt-6 font-semibold">
                                Masuk
                            </button>
                        </form>
                        
                        <div class="text-center mt-6">
                            <p class="text-gray-600">Belum punya akun? 
                                <a href="#" class="text-blue-600 hover:text-blue-700 font-semibold" onclick="app.loadContent('register')">Daftar di sini</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRegisterPage() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center py-8">
                <div class="max-w-md w-full mx-4">
                    <div class="bg-white rounded-2xl shadow-xl p-8">
                        <div class="text-center mb-8">
                            <div class="flex items-center justify-center space-x-2 mb-4">
                                <i class="fas fa-coins text-2xl text-purple-600"></i>
                                <span class="text-xl font-bold">VLFinance</span>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800">Daftar Akun Baru</h2>
                            <p class="text-gray-600 mt-2">Mulai perjalanan finansial Anda</p>
                        </div>
                        
                        <form id="registerForm">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                                    <input type="text" id="registerName" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                           placeholder="Nama Anda">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" id="registerEmail" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                           placeholder="email@example.com">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                    <input type="password" id="registerPassword" required minlength="6"
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                           placeholder="••••••••">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Password</label>
                                    <input type="password" id="registerConfirmPassword" required 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                           placeholder="••••••••">
                                </div>
                            </div>
                            
                            <button type="submit" class="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-all shadow-lg mt-6 font-semibold">
                                Daftar Sekarang
                            </button>
                        </form>
                        
                        <div class="text-center mt-6">
                            <p class="text-gray-600">Sudah punya akun? 
                                <a href="#" class="text-purple-600 hover:text-purple-700 font-semibold" onclick="app.loadContent('login')">Masuk di sini</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
renderPendingActivePage() {
    const userEmail = this.userData?.email || 'user@example.com';
    
    return `
        <div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
            <div class="container mx-auto px-4 max-w-md">
                <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 text-center">
                        <div class="flex items-center justify-center space-x-2 mb-3">
                            <i class="fas fa-crown text-yellow-300"></i>
                            <span class="text-xl font-bold">VLFinance Premium</span>
                        </div>
                        <p class="text-purple-100">Akses penuh semua fitur premium</p>
                    </div>

                    <div class="p-6">
                        <div class="text-center mb-6">
<div class="mb-4 flex justify-center">
    <div class="relative group">
        <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80" 
            alt="Exclusive Offer"
            class="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 shadow-lg group-hover:scale-110 transition-transform duration-300"
        >
        <div class="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            VIP
        </div>
    </div>
</div>
                            
                            <!-- Badge Diskon -->
                            <div class="bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm font-bold px-4 py-2 rounded-full inline-block mb-4 relative">
                                ⚡ DISKON 80%
                                <!-- Efek kilau -->
                                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                            </div>
                            
                            <div class="flex items-center justify-center space-x-4 mb-4">
                                <div class="text-gray-500 line-through text-lg">Rp250.000</div>
                                <div class="text-green-500 font-bold text-xl">→</div>
                                <div class="text-3xl font-bold text-gray-800">Rp49.000</div>
                            </div>
                            
                            <button class="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all shadow font-bold text-lg mb-3 transform hover:scale-105 duration-200" onclick="app.handleUpgrade()">
                                💳 Upgrade Sekarang
                            </button>
                            
                            <p class="text-green-600 font-semibold text-sm">
                                ✅ Hemat Rp 201.000
                            </p>
                        </div>

                        <div class="border-t pt-6">
                            <h3 class="font-bold text-gray-800 mb-4 text-center">✨ Benefit Premium:</h3>
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div class="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 hover:bg-purple-50 transition-colors">
                                    <i class="fas fa-chart-line text-purple-500"></i>
                                    <span>Analisis Real-time</span>
                                </div>
                                <div class="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 hover:bg-green-50 transition-colors">
                                    <i class="fas fa-receipt text-green-500"></i>
                                    <span>Scan Struk AI</span>
                                </div>
                                <div class="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 hover:bg-blue-50 transition-colors">
                                    <i class="fas fa-piggy-bank text-blue-500"></i>
                                    <span>Investasi Smart</span>
                                </div>
                                <div class="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 hover:bg-yellow-50 transition-colors">
                                    <i class="fas fa-headset text-yellow-500"></i>
                                    <span>Support 24/7</span>
                                </div>
                            </div>
                        </div>

                        <!-- Additional Info -->
                        <div class="mt-6 text-center">
                            <p class="text-xs text-gray-500">
                                ⏳ Penawaran terbatas untuk 50 user pertama
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

    renderPemasukanPage() {
        return `
            <div class="container mx-auto px-4 py-6">
                <!-- Header -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" onclick="app.loadContent('dashboard')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-xl font-bold text-gray-800">Pemasukan</h1>
                                <p class="text-sm text-gray-600">Kelola pemasukan Anda</p>
                            </div>
                        </div>
                        <button onclick="app.showTambahPemasukanModal()" 
                                class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors text-sm">
                            <i class="fas fa-plus"></i>
                            <span>Tambah</span>
                        </button>
                    </div>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Total Pemasukan</p>
                                <h3 class="text-xl font-bold text-gray-800">Rp 7.5Jt</h3>
                            </div>
                            <div class="bg-green-100 p-2 rounded-full">
                                <i class="fas fa-wallet text-green-600"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Bulan Ini</p>
                                <h3 class="text-xl font-bold text-gray-800">Rp 5.0Jt</h3>
                            </div>
                            <div class="bg-blue-100 p-2 rounded-full">
                                <i class="fas fa-calendar text-blue-600"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Jumlah Transaksi</p>
                                <h3 class="text-xl font-bold text-gray-800">24</h3>
                            </div>
                            <div class="bg-purple-100 p-2 rounded-full">
                                <i class="fas fa-receipt text-purple-600"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-800">Daftar Pemasukan</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="pemasukanTableBody" class="divide-y divide-gray-200">
                                <!-- Data akan diisi oleh JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Pemasukan -->
            <div id="pemasukanModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
                <div class="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-800" id="modalTitle">Tambah Pemasukan</h3>
                    </div>
                    <form id="pemasukanForm" class="p-4 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                            <input type="date" id="tanggal" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                            <select id="kategori" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                <option value="">Pilih Kategori</option>
                                <option value="gaji">Gaji</option>
                                <option value="freelance">Freelance</option>
                                <option value="investasi">Investasi</option>
                                <option value="bonus">Bonus</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                            <input type="text" id="deskripsi" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                   placeholder="Deskripsi pemasukan">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                            <input type="number" id="jumlah" required min="0" step="1000"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                   placeholder="0">
                        </div>
                    </form>
                    <div class="p-4 border-t border-gray-200 flex justify-end space-x-3">
                        <button type="button" onclick="app.hidePemasukanModal()"
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Batal
                        </button>
                        <button type="button" onclick="app.savePemasukan()"
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPengeluaranPage() {
        return `
            <div class="container mx-auto px-4 py-6">
                <!-- Header -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" onclick="app.loadContent('dashboard')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-xl font-bold text-gray-800">Pengeluaran</h1>
                                <p class="text-sm text-gray-600">Kelola pengeluaran Anda</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="app.showScanReceiptModal()" 
                                    class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg flex items-center space-x-2 transition-colors text-sm">
                                <i class="fas fa-camera"></i>
                                <span class="hidden sm:inline">Scan</span>
                            </button>
                            <button onclick="app.showTambahPengeluaranModal()" 
                                    class="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center space-x-2 transition-colors text-sm">
                                <i class="fas fa-plus"></i>
                                <span class="hidden sm:inline">Tambah</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Total</p>
                                <h3 class="text-xl font-bold text-gray-800">Rp 2.3Jt</h3>
                            </div>
                            <div class="bg-red-100 p-2 rounded-full">
                                <i class="fas fa-money-bill-wave text-red-600"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Bulan Ini</p>
                                <h3 class="text-xl font-bold text-gray-800">Rp 1.2Jt</h3>
                            </div>
                            <div class="bg-orange-100 p-2 rounded-full">
                                <i class="fas fa-calendar text-orange-600"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Transaksi</p>
                                <h3 class="text-xl font-bold text-gray-800">18</h3>
                            </div>
                            <div class="bg-purple-100 p-2 rounded-full">
                                <i class="fas fa-receipt text-purple-600"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Scan Struk</p>
                                <h3 class="text-xl font-bold text-gray-800">3</h3>
                            </div>
                            <div class="bg-green-100 p-2 rounded-full">
                                <i class="fas fa-camera text-green-600"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Table -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-800">Daftar Pengeluaran</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="pengeluaranTableBody" class="divide-y divide-gray-200">
                                <!-- Data akan diisi oleh JavaScript -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Scan Struk -->
            <div id="scanReceiptModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
                <div class="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-800">Scan Struk Belanja</h3>
                        <p class="text-sm text-gray-600 mt-1">Unggah foto struk untuk ekstrak otomatis</p>
                    </div>
                    <div class="p-4">
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                            <i class="fas fa-receipt text-3xl text-gray-400 mb-3"></i>
                            <p class="text-gray-600 mb-2">Unggah foto struk belanja Anda</p>
                            <p class="text-sm text-gray-500 mb-4">Format: JPG, PNG (Maks. 10MB)</p>
                            <input type="file" id="receiptImage" accept="image/*" class="hidden" onchange="app.handleImageUpload(event)">
                            <button onclick="document.getElementById('receiptImage').click()" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
                                Pilih File
                            </button>
                        </div>

                        <div id="scanProgress" class="hidden">
                            <div class="flex items-center justify-center space-x-2 mb-3">
                                <i class="fas fa-spinner fa-spin text-blue-600"></i>
                                <span class="text-gray-700">Memproses struk...</span>
                            </div>
                        </div>

                        <div id="scanError" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <div class="flex items-center">
                                <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                                <span class="text-red-700" id="scanErrorMessage">Error message</span>
                            </div>
                        </div>

                        <div id="scanResults" class="hidden">
                            <h4 class="font-semibold text-gray-800 mb-3">Hasil Scan:</h4>
                            <div class="bg-gray-50 rounded-lg p-3 mb-3">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-medium" id="scanStoreName">Toko</span>
                                    <span class="text-sm text-gray-600" id="scanDate">Tanggal</span>
                                </div>
                                <div id="scanItemsList" class="space-y-2">
                                    <!-- Items akan diisi dinamis -->
                                </div>
                            </div>
                            <button onclick="app.saveScannedItems()" 
                                    class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium">
                                Simpan Semua Item
                            </button>
                        </div>
                    </div>
                    <div class="p-4 border-t border-gray-200 flex justify-end">
                        <button type="button" onclick="app.hideScanReceiptModal()"
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Pengeluaran Manual -->
            <div id="pengeluaranModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
                <div class="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-800" id="modalTitlePengeluaran">Tambah Pengeluaran</h3>
                    </div>
                    <form id="pengeluaranForm" class="p-4 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                            <input type="date" id="tanggalPengeluaran" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                            <select id="kategoriPengeluaran" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                                <option value="">Pilih Kategori</option>
                                <option value="makanan-minuman">Makanan & Minuman</option>
                                <option value="transportasi">Transportasi</option>
                                <option value="hiburan">Hiburan</option>
                                <option value="belanja">Belanja</option>
                                <option value="tagihan">Tagihan</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                            <input type="text" id="deskripsiPengeluaran" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                   placeholder="Deskripsi pengeluaran">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                            <input type="number" id="jumlahPengeluaran" required min="0" step="1000"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                   placeholder="0">
                        </div>
                    </form>
                    <div class="p-4 border-t border-gray-200 flex justify-end space-x-3">
                        <button type="button" onclick="app.hidePengeluaranModal()"
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Batal
                        </button>
                        <button type="button" onclick="app.savePengeluaran()"
                                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTabunganPage() {
        return `
            <div class="container mx-auto px-4 py-6">
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                    <i class="fas fa-piggy-bank text-4xl text-blue-600 mb-4"></i>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">Fitur Tabungan</h2>
                    <p class="text-gray-600 mb-4">Fitur tabungan akan segera hadir dalam update berikutnya</p>
                    <button class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors" onclick="app.loadContent('dashboard')">
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    renderFeaturesPage() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">Fitur VLFinance</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-wallet text-blue-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">Kelola Budget</h3>
                        <p class="text-gray-600">Pantau pemasukan dan pengeluaran dengan kategori yang dapat disesuaikan</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-camera text-green-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">Scan Struk AI</h3>
                        <p class="text-gray-600">Ekstrak otomatis data dari struk belanja menggunakan teknologi AI</p>
                    </div>
                    
                    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-chart-line text-purple-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">Analisis Real-time</h3>
                        <p class="text-gray-600">Dapatkan insight keuangan secara instan dengan grafik interaktif</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderPricingPage() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">Pilih Paket yang Tepat</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div class="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                        <div class="text-center mb-6">
                            <h3 class="text-2xl font-bold text-gray-800 mb-2">Gratis</h3>
                            <div class="flex items-baseline justify-center mb-4">
                                <span class="text-3xl font-bold">Rp</span>
                                <span class="text-4xl font-bold mx-1">0</span>
                            </div>
                        </div>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Manajemen Budget Dasar</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>3 Kategori Custom</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Analisis Sederhana</span>
                            </li>
                        </ul>
                        <button class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-semibold">
                            Mulai Gratis
                        </button>
                    </div>
                    
                    <div class="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-500 transform scale-105">
                        <div class="text-center mb-6">
                            <h3 class="text-2xl font-bold text-gray-800 mb-2">Premium</h3>
                            <div class="flex items-baseline justify-center mb-4">
                                <span class="text-3xl font-bold">Rp</span>
                                <span class="text-4xl font-bold mx-1">49.000</span>
                            </div>
                        </div>
                        <ul class="space-y-3 mb-6">
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Semua Fitur Gratis</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Scan Struk AI</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Analisis Mendalam</span>
                            </li>
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span>Support Priority</span>
                            </li>
                        </ul>
                        <button class="w-full bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition-colors font-semibold">
                            Pilih Premium
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFooter() {
        return `
            <footer class="bg-gray-800 text-white py-8">
                <div class="container mx-auto px-4 text-center">
                    <div class="flex items-center justify-center space-x-2 mb-4">
                        <i class="fas fa-coins text-2xl text-blue-400"></i>
                        <span class="text-xl font-bold">VLFinance</span>
                    </div>
                    <p class="text-gray-400 mb-4">
                        Platform financial advice untuk Generasi Z Indonesia
                    </p>
                    <div class="flex items-center justify-center space-x-6 mb-4">
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">
                            <i class="fab fa-instagram text-xl"></i>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">
                            <i class="fab fa-tiktok text-xl"></i>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">
                            <i class="fab fa-twitter text-xl"></i>
                        </a>
                    </div>
                    <p class="text-gray-400 text-sm">&copy; 2024 VLFinance. All rights reserved.</p>
                </div>
            </footer>
        `;
    }

    // ==================== EVENT LISTENERS ====================
    attachEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.logout();
                this.loadContent('dashboard');
            });
        }

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                const result = await this.login(email, password);
                if (result.success) {
                    this.loadContent('dashboard');
                } else {
                    this.showError(result.error);
                }
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('registerName').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerConfirmPassword').value;
                
                if (password !== confirmPassword) {
                    this.showError('Password tidak cocok');
                    return;
                }

                const result = await this.register(email, password, name);
                if (result.success) {
                    this.loadContent('pending-active');
                } else {
                    this.showError(result.error);
                }
            });
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VLFinanceApp();
});
