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

    // Invoice management
    this.currentProducts = [];
    this.currentInvoiceData = null;
    this.currentShippingCost = 0;
    this.lastInvoiceNumber = 0;
    this.invoices = [];

    // AI Configuration
    this.API_URL = "https://mucuans-ai-proxy.qalam.workers.dev";
    this.MODEL = "google/gemini-2.0-flash-001";

    // Invoice state
    this.currentLogoUrl = null;

    // TAMBAHKAN STATE UNTUK DREAMS - INI YANG PERLU DITAMBAH
    this.dreamsData = [];
    this.dreamsUnsubscribe = null;

    this.init();
}

    // ✅ AI Analysis Function - DI DALAM CLASS
  // Update AI Analysis function untuk handle date dengan benar
async getAIAnalysis() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return null;

        // Ambil data pemasukan 3 bulan terakhir
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const incomeSnapshot = await this.db.collection('incomes')
            .where('userId', '==', currentUser.uid)
            .where('date', '>=', threeMonthsAgo.toISOString().split('T')[0])
            .orderBy('date', 'desc')
            .get();

        if (incomeSnapshot.empty) {
            return {
                pemasukan: "Rp 0",
                growth: "0%",
                analisa: "Data kosong",
                solusi: "Tambah pemasukan"
            };
        }

        const incomes = incomeSnapshot.docs.map(doc => {
            const data = doc.data();
            let dateObj;
            
            if (data.date && typeof data.date.toDate === 'function') {
                dateObj = data.date.toDate();
            } else if (data.date) {
                dateObj = new Date(data.date);
            } else {
                dateObj = new Date();
            }
            
            return {
                id: doc.id,
                ...data,
                date: dateObj
            };
        });

        // Hitung statistik
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthIncomes = incomes.filter(income => 
            income.date.getMonth() === currentMonth && 
            income.date.getFullYear() === currentYear
        );

        const lastMonthIncomes = incomes.filter(income => 
            income.date.getMonth() === lastMonth && 
            income.date.getFullYear() === lastYear
        );

        const totalCurrent = currentMonthIncomes.reduce((sum, income) => sum + income.amount, 0);
        const totalLast = lastMonthIncomes.reduce((sum, income) => sum + income.amount, 0);
        
        const growth = totalLast > 0 ? ((totalCurrent - totalLast) / totalLast * 100).toFixed(1) : totalCurrent > 0 ? 100 : 0;

        // Format data untuk AI
        const analysisData = {
            total_pemasukan: incomes.reduce((sum, income) => sum + income.amount, 0),
            pemasukan_bulan_ini: totalCurrent,
            growth: growth,
            jumlah_transaksi: incomes.length,
            trend_kategori: incomes.reduce((acc, income) => {
                acc[income.category] = (acc[income.category] || 0) + income.amount;
                return acc;
            }, {})
        };

        console.log('Data untuk AI analysis:', analysisData);

        // Panggil AI API dengan prompt singkat
        const response = await fetch(this.API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Berikan analisis singkat 2-5 kata. Hanya JSON.`
                    },
                    {
                        role: "user",
                        content: `Data: Total Rp ${analysisData.total_pemasukan.toLocaleString('id-ID')}, Growth ${analysisData.growth}%, Kategori: ${JSON.stringify(analysisData.trend_kategori)}

JSON: {
    "pemasukan": "Rp X",
    "growth": "X%", 
    "analisa": "2-5 kata",
    "solusi": "2-5 kata"
}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            })
        });

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('AI Response raw:', result);
        
        if (result.choices && result.choices[0].message.content) {
            const aiContent = result.choices[0].message.content;
            console.log('AI Content:', aiContent);
            
            try {
                // Clean the response
                let cleanedContent = aiContent.trim();
                cleanedContent = cleanedContent.replace(/```json\s*/g, '');
                cleanedContent = cleanedContent.replace(/```\s*/g, '');
                cleanedContent = cleanedContent.trim();
                
                console.log('Cleaned content:', cleanedContent);
                
                const aiResponse = JSON.parse(cleanedContent);
                
                // Validasi response
                if (!aiResponse.pemasukan || !aiResponse.growth || !aiResponse.analisa || !aiResponse.solusi) {
                    throw new Error('AI response incomplete');
                }
                
                return aiResponse;
                
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                return this.generateShortFallback(analysisData);
            }
        }

        throw new Error('Invalid AI response format');

    } catch (error) {
        console.error('AI Analysis Error:', error);
        return this.generateShortFallback({});
    }
}

// Fallback analysis singkat
generateShortFallback(analysisData) {
    const total = analysisData.total_pemasukan || 0;
    const growth = analysisData.growth || 0;
    
    let analisa = "";
    let solusi = "";
    
    if (total === 0) {
        analisa = "Data kosong";
        solusi = "Tambah pemasukan";
    } else if (growth > 20) {
        analisa = "Pertumbuhan cepat";
        solusi = "Pertahankan momentum";
    } else if (growth > 0) {
        analisa = "Stabil positif";
        solusi = "Tingkatkan lagi";
    } else {
        analisa = "Perlu perbaikan";
        solusi = "Cari sumber baru";
    }
    
    return {
        pemasukan: `Rp ${total.toLocaleString('id-ID')}`,
        growth: `${growth}%`,
        analisa: analisa,
        solusi: solusi
    };
}

// Update AI Analysis di UI
async updateAIAnalysis() {
    try {
        const analysis = await this.getAIAnalysis();
        const analysisElement = document.getElementById('aiAnalysisContent');
        
        if (analysis && analysisElement) {
            analysisElement.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-blue-100">Pemasukan:</span>
                        <span class="font-bold text-white">${analysis.pemasukan}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-blue-100">Growth:</span>
                        <span class="font-bold ${analysis.growth.includes('-') ? 'text-red-300' : 'text-green-300'}">
                            ${analysis.growth}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2">
                        <div class="text-center">
                            <p class="text-xs text-blue-200 mb-1">Analisa</p>
                            <p class="text-sm font-semibold text-white">${analysis.analisa}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-blue-200 mb-1">Solusi</p>
                            <p class="text-sm font-semibold text-white">${analysis.solusi}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating AI analysis UI:', error);
        const analysisElement = document.getElementById('aiAnalysisContent');
        if (analysisElement) {
            analysisElement.innerHTML = `
                <div class="text-center text-white">
                    <p class="text-sm">Error load AI</p>
                </div>
            `;
        }
    }
}


// Update UI pemasukan dengan format currency yang benar
updatePemasukanUI() {
    const tableBody = document.getElementById('pemasukanTableBody');
    if (!tableBody) return;

    if (this.pemasukanData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-wallet text-3xl mb-3 text-gray-300"></i>
                    <p>Belum ada data pemasukan</p>
                    <p class="text-sm mt-2">Klik "Tambah" untuk menambah pemasukan pertama</p>
                </td>
            </tr>
        `;
        
        // Update stats
        this.updatePemasukanStats(0, 0, 0);
        return;
    }

    // Hitung stats
    const totalPemasukan = this.pemasukanData.reduce((sum, item) => sum + item.amount, 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const pemasukanBulanIni = this.pemasukanData
        .filter(item => {
            const itemDate = item.date;
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
        })
        .reduce((sum, item) => sum + item.amount, 0);

    // Update stats
    this.updatePemasukanStats(totalPemasukan, pemasukanBulanIni, this.pemasukanData.length);

    // Update table
    tableBody.innerHTML = this.pemasukanData.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm text-gray-900">
                ${item.date.toLocaleDateString('id-ID')}
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 capitalize">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ${item.category}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                ${item.description}
            </td>
            <td class="px-4 py-3 text-sm font-semibold text-green-600">
                Rp ${item.amount.toLocaleString('id-ID')}
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

    // ✅ Refresh AI Analysis - DI DALAM CLASS
    refreshAIAnalysis() {
        const analysisElement = document.getElementById('aiAnalysisContent');
        if (analysisElement) {
            analysisElement.innerHTML = `
                <div class="animate-pulse">
                    <div class="h-4 bg-blue-400 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-blue-400 rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-blue-400 rounded w-2/3"></div>
                </div>
            `;
            
            setTimeout(() => this.updateAIAnalysis(), 1000);
        }
    }

    // Load pemasukan data dengan AI analysis
    async loadPemasukanData() {
        if (!this.isLoggedIn || !this.userData) return;

        try {
            // Load data dari Firebase
            const incomeSnapshot = await this.db.collection('incomes')
                .where('userId', '==', this.userData.uid)
                .orderBy('date', 'desc')
                .get();

            this.pemasukanData = incomeSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date.toDate()
            }));

            this.updatePemasukanUI();
            
            // Update AI Analysis setelah data dimuat
            setTimeout(() => this.updateAIAnalysis(), 500);
            
        } catch (error) {
            console.error('Error loading pemasukan data:', error);
            this.showError('Gagal memuat data pemasukan');
        }
    }

    // Update UI pemasukan dengan data real
    updatePemasukanUI() {
        const tableBody = document.getElementById('pemasukanTableBody');
        if (!tableBody) return;

        if (this.pemasukanData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-wallet text-3xl mb-3 text-gray-300"></i>
                        <p>Belum ada data pemasukan</p>
                    </td>
                </tr>
            `;
            
            // Update stats
            document.getElementById('totalPemasukan').textContent = 'Rp 0';
            document.getElementById('pemasukanBulanIni').textContent = 'Rp 0';
            document.getElementById('jumlahTransaksi').textContent = '0';
            document.getElementById('growthIndicator').innerHTML = '<i class="fas fa-minus mr-1"></i><span>0%</span>';
            return;
        }

        // Hitung stats
        const totalPemasukan = this.pemasukanData.reduce((sum, item) => sum + item.amount, 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const pemasukanBulanIni = this.pemasukanData
            .filter(item => item.date.getMonth() === currentMonth && item.date.getFullYear() === currentYear)
            .reduce((sum, item) => sum + item.amount, 0);

        // Update stats
        document.getElementById('totalPemasukan').textContent = `Rp ${totalPemasukan.toLocaleString('id-ID')}`;
        document.getElementById('pemasukanBulanIni').textContent = `Rp ${pemasukanBulanIni.toLocaleString('id-ID')}`;
        document.getElementById('jumlahTransaksi').textContent = this.pemasukanData.length;

        // Update table
        tableBody.innerHTML = this.pemasukanData.map(item => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${item.date.toLocaleDateString('id-ID')}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 capitalize">
                    ${item.category}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${item.description}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    Rp ${item.amount.toLocaleString('id-ID')}
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

// ==================== TOAST NOTIFICATION SYSTEM ====================
showToast(message, type = 'info', duration = 4000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.vl-toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const colors = {
        success: 'bg-green-500 border-green-600',
        error: 'bg-red-500 border-red-600',
        warning: 'bg-yellow-500 border-yellow-600',
        info: 'bg-blue-500 border-blue-600'
    };

    toast.className = `vl-toast fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-xl shadow-lg border transform transition-all duration-300 z-50 max-w-sm`;
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="${icons[type]} text-lg"></i>
            <div class="flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white/80 hover:text-white">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('translate-x-0', 'opacity-100');
    }, 10);

    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('translate-x-0', 'opacity-100');
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return toast;
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
                
                // Show greeting toast dengan displayName
                const displayName = this.userData?.displayName || 'User';
                const greeting = this.getTimeBasedGreeting();
                this.showToast(`Halo, ${displayName}! ${greeting}`, 'success', 3000);
            }
        } else {
            console.log('User logged out');
            this.setAuthState(false);
        }
    });
}

// Helper untuk greeting berdasarkan waktu
getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat pagi! 🌅';
    if (hour < 15) return 'Selamat siang! ☀️';
    if (hour < 18) return 'Selamat sore! 🌇';
    return 'Selamat malam! 🌙';
}

    async loadUserData(uid) {
    try {
        const userDoc = await this.db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            this.userData = { 
                ...userData,
                status: userData.status || false
            };
            
            // Cek jika status false, arahkan ke pending-active
            if (!this.userData.status) {
                // Redirect ke halaman pending-active atau trigger event
                this.redirectToPendingActive();
                return; // Stop execution, jangan lanjut ke loadDashboard
            }
            
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
            
            // Untuk user baru yang statusnya false, arahkan ke pending-active
            if (!this.userData.status) {
                this.redirectToPendingActive();
                return; // Stop execution, jangan lanjut ke loadDashboard
            }
        }
        
        // Jika status true, lanjutkan ke loadDashboard
        this.loadDashboard();
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Method untuk redirect ke halaman pending-active
redirectToPendingActive() {
    // Sesuaikan dengan framework atau routing yang Anda gunakan
    // Contoh dengan vanilla JS:
    // window.location.href = '/pending-active';
    
    // Contoh dengan Vue Router:
    // this.$router.push('/pending-active');
    
    // Contoh dengan React Router:
    // this.props.history.push('/pending-active');
    
    // Contoh dengan Angular:
    // this.router.navigate(['/pending-active']);
    
    console.log('Redirect to pending-active page');
    // Implementasi redirect sesuai dengan framework Anda
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
            case 'invoice':
                this.renderSimpleInvoicePage();
                break;
            case 'dreams':
                // Setup real-time listener untuk dreams page
                this.setupDreamsRealtimeListener();
                break;
            case 'goals':
                // Setup untuk goals page jika ada
                if (typeof this.loadGoalsData === 'function') {
                    this.loadGoalsData();
                }
                break;
            case 'emergency':
                // Setup untuk emergency fund page jika ada
                if (typeof this.loadEmergencyFundData === 'function') {
                    this.loadEmergencyFundData();
                }
                break;
        }
    }, 100);
}

renderSimpleInvoicePage() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="p-4">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-xl font-bold text-gray-800">Invoice Generator</h1>
                <button onclick="app.showInvoiceGeneratorModal()" 
                        class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-plus"></i>
                    Buat Invoice
                </button>
            </div>

            <div class="bg-white rounded-lg border p-6 text-center">
                <i class="fas fa-receipt text-4xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-600 mb-2">Buat Invoice Simple</h3>
                <p class="text-gray-500 mb-4">Generate invoice cepat untuk VLCrave Express</p>
                <button onclick="app.showInvoiceGeneratorModal()" 
                        class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg">
                    Buat Invoice Sekarang
                </button>
            </div>
        </div>
    `;
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

    // Hide Scan Receipt Modal
hideScanReceiptModal() {
    const modal = document.getElementById('scanReceiptModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Update saveScannedItems dengan error handling yang better
async saveScannedItems() {
    try {
        if (!this.currentScanResults || !this.currentScanResults.items) {
            throw new Error('Tidak ada data scan yang valid');
        }

        const saveButton = document.getElementById('scanSaveButton');
        if (!saveButton) {
            throw new Error('Tombol simpan tidak ditemukan');
        }

        const originalText = saveButton.innerHTML;
        
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
        saveButton.disabled = true;

        const storeName = this.currentScanResults.storeName;
        const transactionDate = this.currentScanResults.date;
        
        let savedCount = 0;
        let totalAmount = 0;

        // Save each item
        for (const item of this.currentScanResults.items) {
            const expenseData = {
                amount: item.price,
                description: `${item.name} - ${storeName}`,
                category: item.category,
                date: transactionDate,
                paymentMethod: 'tunai',
                storeName: storeName,
                itemName: item.name,
                type: 'pengeluaran',
                source: 'scan_receipt',
                userId: this.userData.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('pengeluaran').add(expenseData);
            savedCount++;
            totalAmount += item.price;
        }

        if (savedCount === 0) {
            throw new Error('Tidak ada item yang berhasil disimpan');
        }

        this.showToast(
            `✅ ${savedCount} item berhasil disimpan! Total: ${this.formatRupiah(totalAmount)}`,
            'success'
        );

        // Tutup modal setelah berhasil simpan
        this.hideScanReceiptModal();
        
        // Refresh data
        setTimeout(() => {
            this.loadPengeluaranData();
            this.refreshDashboardData();
        }, 500);

    } catch (error) {
        console.error('Error saving scanned items:', error);
        this.showToast('Gagal menyimpan: ' + error.message, 'error');
        
        // Reset button state on error
        const saveButton = document.getElementById('scanSaveButton');
        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Simpan ke Pengeluaran';
            saveButton.disabled = false;
        }
    }
}

// Tambahkan juga fungsi formatRupiah jika belum ada
formatRupiah(amount) {
    const numberValue = Number(amount);
    if (isNaN(numberValue)) return 'Rp 0';
    
    return `Rp ${this.formatNumber(numberValue)}`;
}

// Format number helper untuk Rupiah Indonesia
formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

// Helper function untuk show toast notification
showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.getElementById('financial-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'financial-toast';
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white border-green-600' :
        type === 'error' ? 'bg-red-500 text-white border-red-600' :
        'bg-blue-500 text-white border-blue-600'
    }`;
    
    toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            }"></i>
            <span class="text-sm font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
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
    if (!this.isLoggedIn || !this.userData) {
        console.log('User not logged in, skipping pemasukan data load');
        this.pemasukanData = [];
        this.updatePemasukanUI();
        return;
    }

    try {
        console.log('Loading pemasukan data from Firebase for user:', this.userData.uid);
        
        // Load data real dari Firebase collection 'incomes'
        const incomeSnapshot = await this.db.collection('incomes')
            .where('userId', '==', this.userData.uid)
            .orderBy('date', 'desc')
            .get();

        if (incomeSnapshot.empty) {
            console.log('No income data found in Firebase');
            this.pemasukanData = [];
            this.updatePemasukanUI();
            return;
        }

        // Process data real dari Firebase
        this.pemasukanData = incomeSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Handle date conversion dari data Firebase
            let dateObj;
            if (data.date) {
                dateObj = new Date(data.date);
                if (isNaN(dateObj.getTime())) {
                    console.warn('Invalid date from Firebase, using current date');
                    dateObj = new Date();
                }
            } else {
                dateObj = new Date();
            }

            return {
                id: doc.id,
                amount: data.amount || 0,
                description: data.description || '',
                category: data.category || 'lainnya',
                date: dateObj,
                userId: data.userId,
                createdAt: data.createdAt
            };
        });

        console.log('Real pemasukan data loaded from Firebase:', this.pemasukanData.length, 'records');
        this.updatePemasukanUI();
        
        // Update AI Analysis dengan data real
        setTimeout(() => this.updateAIAnalysis(), 1000);
        
    } catch (error) {
        console.error('Error loading real pemasukan data from Firebase:', error);
        this.showError('Gagal memuat data pemasukan dari server');
        
        // Set empty data untuk menghindari error
        this.pemasukanData = [];
        this.updatePemasukanUI();
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
        case 'dream-planner':
            return this.renderDreamPlannerPage();
        case 'dana-darurat':
            return this.renderDanaDaruratPage();
        case 'goals':
            return this.renderGoalsPage();
        case 'features':
            return this.renderFeaturesPage();
        case 'pricing':
            return this.renderPricingPage();
        case 'invoice':
            return this.renderInvoicePage();
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
    // Panggil loadDashboardData setelah render
    setTimeout(() => {
        this.loadDashboardData();
    }, 100);
    
    return `
        <div class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100/80 pb-20">
            <!-- App Bar -->
            <div class="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <i class="fas fa-wallet text-white text-sm"></i>
                            </div>
                            <div>
                                <h1 class="text-lg font-bold text-gray-900">VLFinance</h1>
                                <p class="text-xs text-gray-500">Financial Dashboard</p>
                            </div>
                        </div>
                        <div class="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                            <i class="fas fa-bell text-gray-600 text-xs"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Welcome Card -->
            <div class="px-4 pt-6">
                <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-xl">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <p class="text-blue-100 text-sm font-medium mb-1">Selamat datang kembali</p>
                            <h2 class="text-white text-xl font-bold mb-2">${this.userData?.displayName || 'User'}! 👋</h2>
                            <p class="text-blue-100/80 text-xs">Kelola keuangan dengan lebih smart</p>
                        </div>
                        <div class="bg-white/20 p-2 rounded-xl">
                            <i class="fas fa-chart-line text-white text-sm"></i>
                        </div>
                    </div>
                    
                    <!-- Balance Card -->
                    <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-4 border border-white/20">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-100/80 text-xs font-medium">Total Balance</p>
                                <p class="text-white text-lg font-bold mt-1" id="saldoSaatIni">Rp 0</p>
                            </div>
                            <div class="text-right">
                                <p class="text-blue-100/80 text-xs">This Month</p>
                                <p class="text-green-300 text-sm font-semibold mt-1" id="monthGrowth">+0%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Quick Stats Grid -->
            <div class="px-4 mt-6">
                <div class="grid grid-cols-2 gap-3">
                    <!-- Pemasukan Card -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 active:scale-95" 
                         onclick="app.loadContent('pemasukan')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                                <i class="fas fa-arrow-down text-white text-xs"></i>
                            </div>
                            <div class="bg-emerald-50 px-2 py-1 rounded-full">
                                <i class="fas fa-trending-up text-emerald-500 text-xs"></i>
                            </div>
                        </div>
                        <p class="text-gray-500 text-xs font-medium mb-1">Pemasukan</p>
                        <p class="text-gray-900 text-lg font-bold" id="totalPemasukanDashboard">Rp 0</p>
                        <div class="flex items-center mt-2">
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-emerald-500 h-1.5 rounded-full" id="pemasukanProgress" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    <!-- Pengeluaran Card -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 active:scale-95" 
                         onclick="app.loadContent('pengeluaran')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                                <i class="fas fa-arrow-up text-white text-xs"></i>
                            </div>
                            <div class="bg-rose-50 px-2 py-1 rounded-full">
                                <i class="fas fa-trending-down text-rose-500 text-xs"></i>
                            </div>
                        </div>
                        <p class="text-gray-500 text-xs font-medium mb-1">Pengeluaran</p>
                        <p class="text-gray-900 text-lg font-bold" id="totalPengeluaranDashboard">Rp 0</p>
                        <div class="flex items-center mt-2">
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-rose-500 h-1.5 rounded-full" id="pengeluaranProgress" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

	                       <!-- Financial Goals Section -->
            <div class="px-4 mt-6">
                <h3 class="text-gray-900 text-sm font-bold mb-3">Financial Goals</h3>
                <div class="grid grid-cols-2 gap-3">
                    <!-- Dream Planner -->
                    <div class="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg text-white hover:shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer" 
                         onclick="app.loadContent('dream-planner')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-star text-white text-sm"></i>
                            </div>
                            <div class="bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors">
                                <i class="fas fa-chart-line text-white text-xs"></i>
                            </div>
                        </div>
                        <p class="text-white/90 text-xs font-medium mb-1">Dream Planner</p>
                        <p class="text-white text-lg font-bold" id="dreamPlannerProgress">Rp 0</p>
                        <div class="flex items-center mt-2">
                            <div class="w-full bg-white/30 rounded-full h-1.5">
                                <div class="bg-white h-1.5 rounded-full" id="dreamPlannerBar" style="width: 0%"></div>
                            </div>
                        </div>
                        <p class="text-white/70 text-xs mt-1" id="dreamPlannerTarget">Target: Rp 0</p>
                    </div>

                    <!-- Dana Darurat -->
                    <div class="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 shadow-lg text-white hover:shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer" 
                         onclick="app.loadContent('dana-darurat')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-shield-alt text-white text-sm"></i>
                            </div>
                            <div class="bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors">
                                <i class="fas fa-chart-line text-white text-xs"></i>
                            </div>
                        </div>
                        <p class="text-white/90 text-xs font-medium mb-1">Dana Darurat</p>
                        <p class="text-white text-lg font-bold" id="danaDaruratProgress">Rp 0</p>
                        <div class="flex items-center mt-2">
                            <div class="w-full bg-white/30 rounded-full h-1.5">
                                <div class="bg-white h-1.5 rounded-full" id="danaDaruratBar" style="width: 0%"></div>
                            </div>
                        </div>
                        <p class="text-white/70 text-xs mt-1" id="danaDaruratTarget">Target: 6x pengeluaran</p>
                    </div>
                </div>
            </div>

            <!-- Tabungan Section -->
            <div class="px-4 mt-4">
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg text-white hover:shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer" 
                     onclick="app.loadContent('tabungan')">
                    <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <i class="fas fa-piggy-bank text-white text-sm"></i>
                        </div>
                        <div class="bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors">
                            <i class="fas fa-chart-line text-white text-xs"></i>
                        </div>
                    </div>
                    <p class="text-white/90 text-xs font-medium mb-1">Tabungan</p>
                    <p class="text-white text-lg font-bold" id="tabunganProgress">Rp 0</p>
                    <div class="flex items-center mt-2">
                        <div class="w-full bg-white/30 rounded-full h-1.5">
                            <div class="bg-white h-1.5 rounded-full" id="tabunganBar" style="width: 0%"></div>
                        </div>
                    </div>
                    <p class="text-white/70 text-xs mt-1" id="tabunganTarget">Auto-save from income</p>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="px-4 mt-6">
                <h3 class="text-gray-900 text-sm font-bold mb-3">Quick Actions</h3>
                <div class="grid grid-cols-4 gap-2">
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.loadContent('pemasukan')">
                        <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-plus text-blue-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Income</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.loadContent('pengeluaran')">
                        <div class="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-minus text-rose-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Expense</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showGoalPlannerModal()">
                        <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-bullseye text-purple-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Goals</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showScanReceiptModal()">
                        <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-camera text-green-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Scan</span>
                    </button>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="px-4 mt-6 mb-6">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-gray-900 text-sm font-bold">Recent Activity</h3>
                            <span class="text-blue-500 text-xs font-medium">View All</span>
                        </div>
                    </div>
                    <div id="recentActivityList" class="divide-y divide-gray-100">
                        <div class="px-4 py-3">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-arrow-down text-emerald-500 text-xs"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-gray-900 text-sm font-medium truncate">Loading transactions...</p>
                                    <p class="text-gray-500 text-xs mt-1">Fetching data</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-emerald-500 text-sm font-semibold">-</p>
                                    <p class="text-gray-400 text-xs mt-1">-</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Navigation -->
            <div class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/60 z-50">
                <div class="grid grid-cols-4 gap-1 px-4 py-2">
                    <button class="flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${this.currentPage === 'dashboard' ? 'text-blue-500 bg-blue-50' : 'text-gray-500'}"
                            onclick="app.loadContent('dashboard')">
                        <i class="fas fa-home text-sm mb-1"></i>
                        <span class="text-xs font-medium">Home</span>
                    </button>
                    <button class="flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${this.currentPage === 'pemasukan' ? 'text-emerald-500 bg-emerald-50' : 'text-gray-500'}"
                            onclick="app.loadContent('pemasukan')">
                        <i class="fas fa-arrow-down text-sm mb-1"></i>
                        <span class="text-xs font-medium">Income</span>
                    </button>
                    <button class="flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${this.currentPage === 'pengeluaran' ? 'text-rose-500 bg-rose-50' : 'text-gray-500'}"
                            onclick="app.loadContent('pengeluaran')">
                        <i class="fas fa-arrow-up text-sm mb-1"></i>
                        <span class="text-xs font-medium">Expense</span>
                    </button>
                    <button class="flex flex-col items-center p-2 rounded-xl transition-all duration-200 ${this.currentPage === 'goals' ? 'text-purple-500 bg-purple-50' : 'text-gray-500'}"
                            onclick="app.showGoalPlannerModal()">
                        <i class="fas fa-bullseye text-sm mb-1"></i>
                        <span class="text-xs font-medium">Goals</span>
                    </button>
                </div>
            </div>

            <!-- Goal Planner Modal -->
            <div id="goalPlannerModal" class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 hidden px-2 sm:px-0">
                <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    <div class="px-4 py-4 border-b border-gray-100 bg-white sticky top-0">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-bold text-gray-900">Financial Goals</h3>
                            <button onclick="app.hideGoalPlannerModal()" 
                                    class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <i class="fas fa-times text-gray-500 text-lg"></i>
                            </button>
                        </div>
                    </div>

                    <div class="p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                        <!-- Dream Planner -->
                        <div class="bg-white rounded-xl p-4 border border-gray-200">
                            <h4 class="text-sm font-bold text-gray-900 mb-3">🎯 Dream Planner</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Dream Goal</label>
                                    <input type="text" id="dreamGoal" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                           placeholder="Contoh: Beli mobil, Nikah, dll">
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Target Amount</label>
                                    <input type="number" id="dreamTarget" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                           placeholder="50000000">
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Current Savings</label>
                                    <input type="number" id="dreamCurrent" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                           placeholder="0">
                                </div>
                            </div>
                        </div>

                        <!-- Dana Darurat -->
                        <div class="bg-white rounded-xl p-4 border border-gray-200">
                            <h4 class="text-sm font-bold text-gray-900 mb-3">🛡️ Dana Darurat</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Monthly Expenses</label>
                                    <input type="number" id="monthlyExpenses" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm"
                                           placeholder="Auto-calculated" readonly>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Emergency Fund Target</label>
                                    <input type="number" id="emergencyTarget" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm"
                                           placeholder="Auto-calculated" readonly>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Current Emergency Fund</label>
                                    <input type="number" id="emergencyCurrent" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm"
                                           placeholder="0">
                                </div>
                            </div>
                        </div>

                        <!-- Tabungan -->
                        <div class="bg-white rounded-xl p-4 border border-gray-200">
                            <h4 class="text-sm font-bold text-gray-900 mb-3">💰 Tabungan</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Auto-save Percentage</label>
                                    <input type="number" id="savingsPercentage" min="0" max="100" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
                                           placeholder="20" value="20">
                                    <p class="text-xs text-gray-500 mt-1">Percentage of income to auto-save</p>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-2">Current Savings</label>
                                    <input type="number" id="savingsCurrent" 
                                           class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
                                           placeholder="0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="px-4 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                        <button onclick="app.saveFinancialGoals()"
                                class="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold text-sm shadow-lg">
                            Save Goals
                        </button>
                    </div>
                </div>
            </div>

            <!-- Invoice Generator Modal -->
            <!-- ... (keep existing invoice modal) ... -->
        </div>
    `;
}

// Load Dashboard Data
async loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            console.log('User not authenticated');
            return;
        }

        // 1. Load basic financial stats
        await this.loadFinancialStats();
        
        // 2. Load financial goals
        await this.loadFinancialGoals();
        
        // 3. Load recent activity
        await this.loadRecentActivity();
        
        console.log('Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load Financial Stats
async loadFinancialStats() {
    const currentUser = this.auth.currentUser;
    
    try {
        // Get pemasukan data
        const pemasukanSnapshot = await this.db.collection('pemasukan')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const totalPemasukan = pemasukanSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        document.getElementById('totalPemasukanDashboard').textContent = this.formatRupiah(totalPemasukan);
        
        // Get pengeluaran data
        const pengeluaranSnapshot = await this.db.collection('pengeluaran')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const totalPengeluaran = pengeluaranSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        document.getElementById('totalPengeluaranDashboard').textContent = this.formatRupiah(totalPengeluaran);
        
        // Calculate balance and growth
        const saldo = totalPemasukan - totalPengeluaran;
        document.getElementById('saldoSaatIni').textContent = this.formatRupiah(saldo);
        
        // Simple growth calculation (you can make this more sophisticated)
        const growth = totalPemasukan > 0 ? ((totalPemasukan - totalPengeluaran) / totalPemasukan * 100).toFixed(1) : 0;
        document.getElementById('monthGrowth').textContent = `${growth}%`;
        
        // Update progress bars
        const maxAmount = Math.max(totalPemasukan, totalPengeluaran, 1);
        const pemasukanProgress = (totalPemasukan / maxAmount) * 100;
        const pengeluaranProgress = (totalPengeluaran / maxAmount) * 100;
        
        document.getElementById('pemasukanProgress').style.width = `${pemasukanProgress}%`;
        document.getElementById('pengeluaranProgress').style.width = `${pengeluaranProgress}%`;
        
    } catch (error) {
        console.error('Error loading financial stats:', error);
    }
}

// Load Financial Goals
async loadFinancialGoals() {
    const currentUser = this.auth.currentUser;
    
    try {
        const goalsDoc = await this.db.collection('financial_goals')
            .doc(currentUser.uid)
            .get();
        
        if (goalsDoc.exists) {
            const goals = goalsDoc.data();
            
            // Dream Planner
            const dreamProgress = goals.dreamCurrent || 0;
            const dreamTarget = goals.dreamTarget || 1;
            const dreamPercentage = (dreamProgress / dreamTarget) * 100;
            
            document.getElementById('dreamPlannerProgress').textContent = this.formatRupiah(dreamProgress);
            document.getElementById('dreamPlannerBar').style.width = `${Math.min(dreamPercentage, 100)}%`;
            document.getElementById('dreamPlannerTarget').textContent = `Target: ${this.formatRupiah(dreamTarget)}`;
            
            // Dana Darurat
            const emergencyProgress = goals.emergencyCurrent || 0;
            const monthlyExpenses = goals.monthlyExpenses || 0;
            const emergencyTarget = monthlyExpenses * 6; // 6x monthly expenses
            const emergencyPercentage = emergencyTarget > 0 ? (emergencyProgress / emergencyTarget) * 100 : 0;
            
            document.getElementById('danaDaruratProgress').textContent = this.formatRupiah(emergencyProgress);
            document.getElementById('danaDaruratBar').style.width = `${Math.min(emergencyPercentage, 100)}%`;
            document.getElementById('danaDaruratTarget').textContent = `Target: ${this.formatRupiah(emergencyTarget)}`;
            
            // Tabungan
            const savingsProgress = goals.savingsCurrent || 0;
            const savingsPercentage = goals.savingsPercentage || 20;
            const savingsTarget = (await this.getMonthlyIncome()) * (savingsPercentage / 100) * 12; // Yearly target
            
            document.getElementById('tabunganProgress').textContent = this.formatRupiah(savingsProgress);
            document.getElementById('tabunganBar').style.width = `${savingsTarget > 0 ? Math.min((savingsProgress / savingsTarget) * 100, 100) : 0}%`;
            document.getElementById('tabunganTarget').textContent = `Auto-save ${savingsPercentage}% from income`;
            
        } else {
            // Set default values if no goals exist
            this.setDefaultGoalValues();
        }
        
    } catch (error) {
        console.error('Error loading financial goals:', error);
        this.setDefaultGoalValues();
    }
}

// Helper function to get monthly income
async getMonthlyIncome() {
    const currentUser = this.auth.currentUser;
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const pemasukanSnapshot = await this.db.collection('pemasukan')
        .where('userId', '==', currentUser.uid)
        .where('date', '>=', firstDay.toISOString().split('T')[0])
        .where('date', '<=', lastDay.toISOString().split('T')[0])
        .get();
    
    return pemasukanSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
}

// Set default goal values
setDefaultGoalValues() {
    document.getElementById('dreamPlannerProgress').textContent = 'Rp 0';
    document.getElementById('dreamPlannerBar').style.width = '0%';
    document.getElementById('dreamPlannerTarget').textContent = 'Target: Rp 0';
    
    document.getElementById('danaDaruratProgress').textContent = 'Rp 0';
    document.getElementById('danaDaruratBar').style.width = '0%';
    document.getElementById('danaDaruratTarget').textContent = 'Target: 6x pengeluaran';
    
    document.getElementById('tabunganProgress').textContent = 'Rp 0';
    document.getElementById('tabunganBar').style.width = '0%';
    document.getElementById('tabunganTarget').textContent = 'Auto-save from income';
}

// Show Goal Planner Modal
showGoalPlannerModal() {
    const modal = document.getElementById('goalPlannerModal');
    if (modal) {
        modal.classList.remove('hidden');
        this.loadGoalPlannerData();
    }
}

// Hide Goal Planner Modal
hideGoalPlannerModal() {
    const modal = document.getElementById('goalPlannerModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Load data into goal planner modal
async loadGoalPlannerData() {
    const currentUser = this.auth.currentUser;
    
    try {
        const goalsDoc = await this.db.collection('financial_goals')
            .doc(currentUser.uid)
            .get();
        
        if (goalsDoc.exists) {
            const goals = goalsDoc.data();
            
            // Dream Planner
            document.getElementById('dreamGoal').value = goals.dreamGoal || '';
            document.getElementById('dreamTarget').value = goals.dreamTarget || '';
            document.getElementById('dreamCurrent').value = goals.dreamCurrent || '';
            
            // Dana Darurat
            const monthlyExpenses = goals.monthlyExpenses || await this.calculateMonthlyExpenses();
            document.getElementById('monthlyExpenses').value = monthlyExpenses;
            document.getElementById('emergencyTarget').value = monthlyExpenses * 6;
            document.getElementById('emergencyCurrent').value = goals.emergencyCurrent || '';
            
            // Tabungan
            document.getElementById('savingsPercentage').value = goals.savingsPercentage || 20;
            document.getElementById('savingsCurrent').value = goals.savingsCurrent || '';
            
        }
        
    } catch (error) {
        console.error('Error loading goal planner data:', error);
    }
}

// Calculate monthly expenses
async calculateMonthlyExpenses() {
    const currentUser = this.auth.currentUser;
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const pengeluaranSnapshot = await this.db.collection('pengeluaran')
        .where('userId', '==', currentUser.uid)
        .where('date', '>=', firstDay.toISOString().split('T')[0])
        .where('date', '<=', lastDay.toISOString().split('T')[0])
        .get();
    
    return pengeluaranSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
}

// Save Financial Goals
async saveFinancialGoals() {
    try {
        const currentUser = this.auth.currentUser;
        
        const goalsData = {
            dreamGoal: document.getElementById('dreamGoal').value,
            dreamTarget: parseFloat(document.getElementById('dreamTarget').value) || 0,
            dreamCurrent: parseFloat(document.getElementById('dreamCurrent').value) || 0,
            monthlyExpenses: parseFloat(document.getElementById('monthlyExpenses').value) || 0,
            emergencyCurrent: parseFloat(document.getElementById('emergencyCurrent').value) || 0,
            savingsPercentage: parseFloat(document.getElementById('savingsPercentage').value) || 20,
            savingsCurrent: parseFloat(document.getElementById('savingsCurrent').value) || 0,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await this.db.collection('financial_goals')
            .doc(currentUser.uid)
            .set(goalsData, { merge: true });
        
        this.showToast('Financial goals saved successfully!', 'success');
        this.hideGoalPlannerModal();
        
        // Refresh dashboard
        this.loadFinancialGoals();
        
    } catch (error) {
        console.error('Error saving financial goals:', error);
        this.showToast('Failed to save goals', 'error');
    }
}

// Load Recent Activity
async loadRecentActivity() {
    const currentUser = this.auth.currentUser;
    
    try {
        // Get recent pemasukan
        const pemasukanSnapshot = await this.db.collection('pemasukan')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        // Get recent pengeluaran
        const pengeluaranSnapshot = await this.db.collection('pengeluaran')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        // Combine and sort by date
        const activities = [
            ...pemasukanSnapshot.docs.map(doc => ({
                type: 'income',
                data: doc.data(),
                id: doc.id
            })),
            ...pengeluaranSnapshot.docs.map(doc => ({
                type: 'expense',
                data: doc.data(),
                id: doc.id
            }))
        ].sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
         .slice(0, 5);
        
        const activityList = document.getElementById('recentActivityList');
        
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="px-4 py-8 text-center">
                    <i class="fas fa-receipt text-3xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 text-sm">No recent activity</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        activities.forEach(activity => {
            const isIncome = activity.type === 'income';
            const icon = isIncome ? 'arrow-down' : 'arrow-up';
            const color = isIncome ? 'emerald' : 'rose';
            const sign = isIncome ? '+' : '-';
            
            html += `
                <div class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-${color}-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-${icon} text-${color}-500 text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-gray-900 text-sm font-medium truncate">${activity.data.description}</p>
                            <p class="text-gray-500 text-xs mt-1">${this.formatCategoryName(activity.data.category)} • ${this.formatDateDisplay(activity.data.date)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-${color}-500 text-sm font-semibold">${sign}${this.formatRupiah(activity.data.amount)}</p>
                            <p class="text-gray-400 text-xs mt-1">${isIncome ? 'Income' : 'Expense'}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        activityList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async loadDashboardData() {
  const db = firebase.firestore();
  const userId = firebase.auth().currentUser?.uid;
  if (!userId) return;

  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  const recentActivityList = document.getElementById("recentActivityList");

  try {
    // === 1️⃣ Ambil data dari koleksi incomes ===
    const incomesSnapshot = await db.collection("incomes")
      .where("userId", "==", userId)
      .get();

    const incomeActivities = [];
    incomesSnapshot.forEach(doc => {
      const d = doc.data();
      totalPemasukan += parseFloat(d.amount || 0);
      incomeActivities.push({
        tipe: "pemasukan",
        keterangan: d.description || "Income",
        jumlah: d.amount || 0,
        tanggal: d.createdAt?.toDate() || new Date(),
        kategori: d.category || "-",
      });
    });

    // === 2️⃣ Ambil data dari koleksi pengeluaran ===
    const pengeluaranSnapshot = await db.collection("pengeluaran")
      .where("userId", "==", userId)
      .get();

    const expenseActivities = [];
    pengeluaranSnapshot.forEach(doc => {
      const d = doc.data();
      totalPengeluaran += parseFloat(d.amount || 0);
      expenseActivities.push({
        tipe: "pengeluaran",
        keterangan: d.description || "Expense",
        jumlah: d.amount || 0,
        tanggal: d.createdAt?.toDate() || new Date(),
        kategori: d.category || "-",
        tempat: d.storeName || "",
      });
    });

    // === 3️⃣ Update total ke dashboard ===
    const saldo = totalPemasukan - totalPengeluaran;
    document.getElementById("totalPemasukanDashboard").innerText =
      "Rp " + totalPemasukan.toLocaleString("id-ID");
    document.getElementById("totalPengeluaranDashboard").innerText =
      "Rp " + totalPengeluaran.toLocaleString("id-ID");
    document.getElementById("saldoSaatIni").innerText =
      "Rp " + saldo.toLocaleString("id-ID");

    // Hitung progress bar
    const total = totalPemasukan + totalPengeluaran;
    document.getElementById("pemasukanProgress").style.width =
      total ? `${(totalPemasukan / total) * 100}%` : "0%";
    document.getElementById("pengeluaranProgress").style.width =
      total ? `${(totalPengeluaran / total) * 100}%` : "0%";

    // === 4️⃣ Gabungkan aktivitas dari kedua koleksi ===
    const allActivities = [...incomeActivities, ...expenseActivities]
      .sort((a, b) => b.tanggal - a.tanggal)
      .slice(0, 5);

    // === 5️⃣ Render recent activity ===
    recentActivityList.innerHTML = "";

    if (allActivities.length === 0) {
      recentActivityList.innerHTML = `
        <div class="px-4 py-3 text-gray-500 text-sm text-center">Belum ada aktivitas.</div>
      `;
    } else {
      allActivities.forEach(data => {
        const icon =
          data.tipe === "pemasukan"
            ? "fa-arrow-down text-emerald-500"
            : "fa-arrow-up text-rose-500";
        const bg =
          data.tipe === "pemasukan"
            ? "bg-emerald-100"
            : "bg-rose-100";
        const nominalColor =
          data.tipe === "pemasukan"
            ? "text-emerald-500"
            : "text-rose-500";

        const tempat = data.tempat ? `<p class="text-gray-400 text-xs">${data.tempat}</p>` : "";

        recentActivityList.innerHTML += `
          <div class="px-4 py-3 hover:bg-gray-50 transition">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 ${bg} rounded-lg flex items-center justify-center">
                <i class="fas ${icon} text-xs"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-gray-900 text-sm font-medium truncate">${data.keterangan}</p>
                <p class="text-gray-500 text-xs mt-1">${data.tanggal.toLocaleDateString("id-ID")}</p>
                ${tempat}
              </div>
              <div class="text-right">
                <p class="${nominalColor} text-sm font-semibold">
                  Rp ${data.jumlah.toLocaleString("id-ID")}
                </p>
                <p class="text-gray-400 text-xs mt-1 capitalize">${data.kategori}</p>
              </div>
            </div>
          </div>`;
      });
    }

  } catch (err) {
    console.error("Error loading dashboard:", err);
    recentActivityList.innerHTML = `
      <div class="px-4 py-3 text-gray-500 text-sm text-center">Gagal memuat data.</div>
    `;
  }
}


// === INVOICE METHODS === //

showInvoiceGeneratorModal() {
    const modal = document.createElement('div');
    
    // Inject CSS untuk scrollable modal (hanya sekali)
    if (!document.getElementById('invoice-modal-style')) {
        const style = document.createElement('style');
        style.id = 'invoice-modal-style';
        style.textContent = `
            .invoice-gen-modal {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 50;
                padding: 1rem;
            }
            
            .invoice-gen-content {
                background: white;
                border-radius: 1rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                width: 100%;
                max-width: 28rem;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .invoice-gen-scroll {
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1;
                padding: 1.5rem;
                -webkit-overflow-scrolling: touch;
            }
            
            .invoice-gen-footer {
                display: flex;
                gap: 0.5rem;
                padding: 1rem;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
            }
            
            /* Scrollbar styling */
            .invoice-gen-scroll::-webkit-scrollbar {
                width: 6px;
            }
            
            .invoice-gen-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }
            
            .invoice-gen-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }
            
            .invoice-gen-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            /* Mobile optimizations */
            @media (max-width: 640px) {
                .invoice-gen-modal {
                    padding: 0.5rem;
                }
                
                .invoice-gen-content {
                    max-height: 95vh;
                    max-width: 100%;
                }
                
                .invoice-gen-scroll {
                    padding: 1rem;
                }
                
                .invoice-gen-footer {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);
    }

    modal.className = 'invoice-gen-modal';
    modal.innerHTML = `
        <div class="invoice-gen-content">
            <!-- Header -->
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-robot text-2xl"></i>
                        <div>
                            <h2 class="text-lg font-bold">AI Invoice Generator</h2>
                            <p class="text-indigo-200 text-xs">Ongkir otomatis dari detail pesanan</p>
                        </div>
                    </div>
                    <button onclick="this.closest('.invoice-gen-modal').remove()" 
                            class="text-white hover:text-indigo-200 transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            
            <!-- Scrollable Content -->
            <div class="invoice-gen-scroll">
                <!-- AI Input Section -->
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-800 mb-3">
                        <i class="fas fa-edit text-indigo-500 mr-2"></i>
                        Detail Pesanan:
                    </label>
                    <textarea id="aiOrderInput" 
                              rows="6"
                              placeholder="Contoh:&#10;2x Spotify Premium 3 bulan @25.000&#10;1x Netflix 1 bulan 15.000&#10;Ongkir 5.000&#10;3x YouTube Premium 2 bulan @30.000"
                              class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                              ></textarea>
                    <p class="text-xs text-gray-500 mt-2">
                        💡 AI akan otomatis ekstrak: produk, harga, quantity, dan ongkir
                    </p>
                </div>

                <!-- Analysis Result -->
                <div id="analysisResult" class="hidden mb-6">
                    <!-- Result will be shown here -->
                </div>

                <!-- Payment Method Only -->
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-800 mb-3">
                        <i class="fas fa-credit-card text-indigo-500 mr-2"></i>
                        Metode Pembayaran:
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="relative">
                            <input type="radio" name="paymentMethod" value="tunai" class="hidden peer" checked>
                            <div class="p-4 border-2 border-gray-300 rounded-xl text-center cursor-pointer transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 hover:border-indigo-300">
                                <i class="fas fa-money-bill-wave text-lg mb-2"></i>
                                <div class="font-medium">Tunai</div>
                            </div>
                        </label>
                        <label class="relative">
                            <input type="radio" name="paymentMethod" value="transfer" class="hidden peer">
                            <div class="p-4 border-2 border-gray-300 rounded-xl text-center cursor-pointer transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 hover:border-indigo-300">
                                <i class="fas fa-mobile-alt text-lg mb-2"></i>
                                <div class="font-medium">Transfer</div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Summary -->
                <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                    <h3 class="font-semibold text-indigo-800 mb-3 text-sm uppercase tracking-wide">Ringkasan</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-indigo-700">Subtotal Produk:</span>
                            <span id="subtotalAmount" class="font-semibold text-indigo-900">Rp 0</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-indigo-700">Ongkos Kirim:</span>
                            <span id="shippingAmount" class="font-semibold text-indigo-900">Rp 0</span>
                        </div>
                        <div class="border-t border-indigo-200 pt-2 mt-2">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-indigo-900">Total:</span>
                                <span id="totalAmount" class="font-bold text-lg text-indigo-600">Rp 0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="invoice-gen-footer">
                <button onclick="this.closest('.invoice-gen-modal').remove()" 
                        class="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                    <i class="fas fa-times mr-2"></i>Batal
                </button>
                <button onclick="app.analyzeOrderWithAI()" 
                        class="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium">
                    <i class="fas fa-robot"></i>
                    Analisis AI
                </button>
                <button onclick="app.generateSimpleInvoice()" 
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium">
                    <i class="fas fa-receipt"></i>
                    Buat Invoice
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Method untuk generate nomor invoice auto-increment dari Firestore
    async generateInvoiceNumber() {
        try {
            if (!this.user) {
                // Fallback untuk user belum login
                return `VLC-${Date.now().toString().slice(-4)}`;
            }

            // Query untuk mendapatkan invoice terakhir dari user ini
            const q = query(
                collection(this.db, "invoices"),
                where("userId", "==", this.user.uid),
                orderBy("createdAt", "desc"),
                limit(1)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Ada invoice sebelumnya, ambil nomor terakhir
                const lastInvoice = querySnapshot.docs[0].data();
                const lastNumber = lastInvoice.invoiceNumber;
                
                // Extract number dari format "VLC-0001"
                const match = lastNumber.match(/VLC-(\d+)/);
                if (match) {
                    this.lastInvoiceNumber = parseInt(match[1]);
                } else {
                    // Jika format tidak sesuai, gunakan fallback
                    this.lastInvoiceNumber = 0;
                }
            } else {
                // Tidak ada invoice sebelumnya, mulai dari 0
                this.lastInvoiceNumber = 0;
            }
            
            // Increment number
            this.lastInvoiceNumber++;
            
            // Format: VLC-0001, VLC-0002, dst
            const nextNumber = this.lastInvoiceNumber.toString().padStart(4, '0');
            return `VLC-${nextNumber}`;
            
        } catch (error) {
            console.error('Error generating invoice number from Firestore:', error);
            // Fallback ke timestamp
            return `VLC-${Date.now().toString().slice(-4)}`;
        }
    }

    // Method generateSimpleInvoice yang sudah diperbaiki
    async generateSimpleInvoice() {
        try {
            if (!this.currentProducts || this.currentProducts.length === 0) {
                alert('Silakan analisis pesanan terlebih dahulu dengan AI!');
                return;
            }

            // Get payment method
            const paymentMethodRadio = document.querySelector('input[name="paymentMethod"]:checked');
            const paymentMethod = paymentMethodRadio ? paymentMethodRadio.value : 'tunai';

            // Generate invoice number dari Firestore
            const invoiceNumber = await this.generateInvoiceNumber();

            // Generate invoice data
            const invoiceData = {
                products: this.currentProducts,
                subtotal: this.currentProducts.reduce((sum, product) => sum + product.total, 0),
                shippingCost: this.currentShippingCost,
                total: this.currentProducts.reduce((sum, product) => sum + product.total, 0) + this.currentShippingCost,
                paymentMethod: paymentMethod,
                invoiceNumber: invoiceNumber,
                date: new Date().toLocaleDateString('id-ID'),
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            };

            this.showSimpleInvoice(invoiceData);

        } catch (error) {
            console.error('Error generating invoice:', error);
            alert('Error membuat invoice: ' + error.message);
        }
    }

    // Method untuk save ke Firestore
    async saveToFirestoreAndClose() {
        try {
            if (!this.user) {
                alert('Silakan login terlebih dahulu untuk menyimpan invoice');
                return;
            }

            if (!this.currentInvoiceData) {
                alert('Tidak ada data invoice untuk disimpan');
                return;
            }

            // Siapkan data untuk Firestore
            const firestoreData = {
                ...this.currentInvoiceData,
                userId: this.user.uid,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'completed',
                type: 'delivery'
            };

            // Simpan ke Firestore
            await addDoc(collection(this.db, "invoices"), firestoreData);
            
            alert(`✅ Invoice ${this.currentInvoiceData.invoiceNumber} berhasil disimpan!`);
            this.closeInvoiceModal();
            
        } catch (error) {
            console.error("Error saving invoice to Firestore: ", error);
            alert('❌ Error menyimpan invoice: ' + error.message);
        }
    }

    // Method untuk load invoices dari Firestore
    async loadInvoicesFromFirestore() {
        try {
            if (!this.user) {
                console.log('User not authenticated');
                return;
            }

            const q = query(
                collection(this.db, "invoices"),
                where("userId", "==", this.user.uid),
                orderBy("createdAt", "desc")
            );
            
            const querySnapshot = await getDocs(q);
            this.invoices = [];
            
            querySnapshot.forEach((doc) => {
                this.invoices.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderInvoiceList();
            
        } catch (error) {
            console.error("Error loading invoices from Firestore: ", error);
        }
    }

generateSimpleInvoice() {
    const invoiceData = this.collectSimpleInvoiceData();
    if (!invoiceData) return;

    this.showSimpleInvoice(invoiceData);
}

collectSimpleInvoiceData() {
    // Collect products
    const products = [];
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.product-name').value;
        const quantity = parseInt(row.querySelector('.product-quantity').value) || 0;
        const price = parseInt(row.querySelector('.product-price').value) || 0;
        
        if (name && quantity > 0 && price > 0) {
            products.push({
                name: name,
                quantity: quantity,
                price: price,
                total: quantity * price
            });
        }
    });

    if (products.length === 0) {
        alert('Minimal satu produk harus ditambahkan!');
        return null;
    }

    const subtotal = products.reduce((sum, product) => sum + product.total, 0);
    const shippingCost = parseInt(document.getElementById('shippingCost').value) || 0;
    const total = subtotal + shippingCost;
    const paymentMethod = document.getElementById('paymentMethod').value;

    return {
        products: products,
        subtotal: subtotal,
        shippingCost: shippingCost,
        total: total,
        paymentMethod: paymentMethod,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('id-ID')
    };
}

showSimpleInvoice(invoiceData) {
    const modal = document.createElement('div');
    
    // Inject CSS untuk mobile responsive, scrollable, dan tema oranye-kuning
    if (!document.getElementById('invoice-modal-css')) {
        const style = document.createElement('style');
        style.id = 'invoice-modal-css';
        style.textContent = `
            .invoice-modal-container {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 50;
                padding: 1rem;
            }
            
            .invoice-modal-content {
                background: white;
                border-radius: 1rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                width: 100%;
                max-width: 28rem;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #e5e7eb;
            }
            
            .invoice-modal-scroll {
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1;
                padding: 1.5rem;
                -webkit-overflow-scrolling: touch;
            }
            
            .invoice-modal-actions {
                display: flex;
                gap: 0.5rem;
                padding: 1rem;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
            }

            /* HEADER DENGAN GRADIENT ORANYE-KUNING */
            .invoice-header-orange {
                background: linear-gradient(135deg, #f97316 0%, #eab308 100%) !important;
                padding: 1.5rem;
                color: white;
            }

            .invoice-header-orange .logo-container {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 4rem;
                height: 4rem;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 1rem;
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                margin-bottom: 1rem;
            }

            .invoice-header-orange .logo-container img {
                width: 2rem;
                height: 2rem;
                /* Biarkan logo dengan warna default (tidak di-filter) */
            }

            .invoice-header-orange h1 {
                font-size: 1.5rem;
                font-weight: bold;
                margin-bottom: 0.25rem;
            }

            .invoice-header-orange .subtitle {
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.875rem;
                font-weight: 300;
            }

            /* TOMBOL DENGAN THEME ORANYE */
            .btn-orange-gradient {
                background: linear-gradient(135deg, #f97316 0%, #eab308 100%) !important;
                color: white;
                border: none;
                border-radius: 0.75rem;
                padding: 0.75rem 1rem;
                font-weight: 500;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
            }

            .btn-orange-gradient:hover {
                background: linear-gradient(135deg, #ea580c 0%, #ca8a04 100%) !important;
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
            }

            /* ACCENT COLOR ORANYE PADA ELEMEN LAIN */
            .accent-orange {
                color: #f97316;
            }

            .border-orange {
                border-color: #f97316;
            }

            .bg-orange-50 {
                background-color: #fff7ed;
            }

            .text-orange-800 {
                color: #9a3412;
            }

            .text-orange-600 {
                color: #ea580c;
            }
            
            /* Custom scrollbar styling */
            .invoice-modal-scroll::-webkit-scrollbar {
                width: 6px;
            }
            
            .invoice-modal-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }
            
            .invoice-modal-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }
            
            .invoice-modal-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            /* Mobile optimizations */
            @media (max-width: 640px) {
                .invoice-modal-container {
                    padding: 0.5rem;
                }
                
                .invoice-modal-content {
                    max-height: 95vh;
                    max-width: 100%;
                    border-radius: 0.75rem;
                }
                
                .invoice-modal-scroll {
                    padding: 1rem;
                }
                
                .invoice-modal-actions {
                    flex-direction: column;
                    padding: 0.75rem;
                }
                
                .invoice-modal-actions button {
                    flex: 1;
                    min-height: 44px;
                }
                
                .invoice-header-orange {
                    padding: 1.25rem;
                }

                .invoice-header-orange .logo-container {
                    width: 3.5rem;
                    height: 3.5rem;
                    margin-bottom: 0.75rem;
                }

                .invoice-header-orange h1 {
                    font-size: 1.25rem;
                }
                
                button {
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                }
            }
            
            /* Very small screens */
            @media (max-width: 375px) {
                .invoice-modal-scroll {
                    padding: 0.75rem;
                }
                
                .invoice-modal-actions {
                    gap: 0.25rem;
                    padding: 0.5rem;
                }

                .invoice-header-orange {
                    padding: 1rem;
                }
            }
            
            /* Prevent body scroll when modal is open */
            body.modal-open {
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    }

    // Prevent body scroll
    document.body.classList.add('modal-open');

    modal.className = 'invoice-modal-container';
    modal.innerHTML = `
        <div class="invoice-modal-content">
            <!-- Header dengan Gradient Oranye-Kuning -->
            <div class="invoice-header-orange">
                <div class="text-center">
                    <div class="logo-container">
                        <img src="https://vlcrave.github.io/project/img/icon.png" 
                             alt="VLCrave Express" class="w-8 h-8">
                    </div>
                    <h1>VLCrave Express</h1>
                    <p class="subtitle">Layanan Pengiriman Premium</p>
                </div>
            </div>
            
            <!-- Scrollable Content Area -->
            <div class="invoice-modal-scroll">
                <!-- Invoice Info Card -->
                <div class="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Invoice</div>
                            <div class="font-mono font-bold text-slate-800 text-lg tracking-wide">${invoiceData.invoiceNumber}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</div>
                            <div class="font-semibold text-slate-700">${invoiceData.date}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Products Section -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-4 px-2">
                        <h3 class="font-semibold text-slate-800 text-sm uppercase tracking-wide">Detail Pesanan</h3>
                        <div class="flex gap-8 text-xs text-slate-500 font-medium">
                            <span class="w-8 text-center">Qty</span>
                            <span class="w-20 text-right">Harga</span>
                        </div>
                    </div>
                    <div class="space-y-3">
                        ${invoiceData.products.map(product => `
                            <div class="flex justify-between items-center bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-slate-200 transition-colors">
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium text-slate-800 text-sm leading-tight truncate">${product.name}</div>
                                </div>
                                <div class="flex gap-8 items-center shrink-0">
                                    <span class="w-8 text-center font-semibold text-slate-700 text-sm">${product.quantity}</span>
                                    <span class="w-20 text-right font-semibold text-slate-800 text-sm">${this.formatCurrency(product.price)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Summary Card -->
                <div class="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 mb-6 border border-orange-200">
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-orange-800 font-medium">Subtotal</span>
                            <span class="font-semibold text-orange-800">${this.formatCurrency(invoiceData.subtotal)}</span>
                        </div>
                        ${invoiceData.shippingCost > 0 ? `
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-orange-800 font-medium">Biaya Pengiriman</span>
                            <span class="font-semibold text-orange-800">${this.formatCurrency(invoiceData.shippingCost)}</span>
                        </div>
                        ` : ''}
                        <div class="border-t border-orange-300 pt-3 mt-2">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-orange-900 text-lg">Total Pembayaran</span>
                                <span class="font-bold text-xl text-orange-900">${this.formatCurrency(invoiceData.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Method -->
                <div class="mb-6">
                    ${invoiceData.paymentMethod === 'tunai' ? 
                        `<div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                    <i class="fas fa-money-bill-wave text-white text-sm"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-semibold text-orange-800 text-sm">Pembayaran Tunai</div>
                                    <div class="text-xs text-orange-600">Mohon siapkan uang pas</div>
                                </div>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-orange-100 mt-2">
                                <div class="text-center">
                                    <div class="text-xs text-orange-600 mb-1">Jumlah yang harus disiapkan</div>
                                    <div class="font-bold text-lg text-orange-700">${this.formatCurrency(invoiceData.total)}</div>
                                </div>
                            </div>
                        </div>` :
                        `<div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                    <i class="fas fa-mobile-alt text-white text-sm"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-semibold text-orange-800 text-sm">Transfer</div>
                                    <div class="text-xs text-orange-600">Anda tidak perlu membayar tagihan ini.</div>
                                </div>
                            </div>
                            <div class="bg-white rounded-lg p-3 border border-orange-100 mt-2">
                                <div class="text-center">
                                    <div class="text-xs text-orange-600 mb-1">Tagihan akan diproses</div>
                                    <div class="font-bold text-lg text-orange-700">${this.formatCurrency(invoiceData.total)}</div>
                                </div>
                            </div>
                        </div>`
                    }
                </div>

                <!-- Footer Message -->
                <div class="text-center pt-4 border-t border-slate-200">
                    <div class="text-xs text-slate-500 font-light">
                        Terima kasih telah memilih<br>
                        <span class="font-semibold text-orange-600">VLCrave Express Delivery Service</span>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="invoice-modal-actions">
                <button onclick="app.closeInvoiceModal()" 
                        class="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-white transition-all duration-200 font-medium text-sm shadow-sm">
                    <i class="fas fa-times mr-2"></i>Tutup
                </button>
                <button onclick="app.printSimpleInvoice()" 
                        class="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-200 font-medium text-sm shadow-lg">
                    <i class="fas fa-print"></i>
                    Print
                </button>
                <button onclick="app.downloadAsPNG()" 
                        class="btn-orange-gradient flex-1 px-4 py-3 flex items-center justify-center gap-2">
                    <i class="fas fa-download"></i>
                    Download PNG
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    this.currentInvoiceData = invoiceData;

    // Handle click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            this.closeInvoiceModal();
        }
    });

    // Handle escape key to close
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            this.closeInvoiceModal();
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Store event listener for cleanup
    this.modalEscapeListener = handleEscape;
}

// Method downloadAsPNG dengan perbaikan logo dan payment method
// Method downloadAsPNG yang sudah diperbaiki
async downloadAsPNG() {
    try {
        if (!this.currentInvoiceData) {
            this.showNotification('❌ Tidak ada data invoice untuk didownload', 'error');
            return;
        }

        const data = this.currentInvoiceData;

        // Buat container struk dengan styling lengkap
        const receiptContainer = document.createElement('div');
        receiptContainer.id = 'invoice-receipt-container';
        receiptContainer.style.cssText = `
            width: 380px;
            min-height: 600px;
            background: white;
            padding: 25px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            color: #000000;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            position: fixed;
            top: -10000px;
            left: -10000px;
            z-index: 10000;
            opacity: 1;
            box-sizing: border-box;
            overflow: hidden;
        `;

        // HTML content untuk receipt - menggunakan emoji sebagai fallback
        receiptContainer.innerHTML = this.generateReceiptHTML(data);

        // Tambahkan ke DOM
        document.body.appendChild(receiptContainer);

        // Tunggu untuk memastikan DOM terrender
        await new Promise(resolve => setTimeout(resolve, 300));

        // Konfigurasi html2canvas yang lebih robust
        const canvas = await html2canvas(receiptContainer, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: receiptContainer.offsetWidth,
            height: receiptContainer.scrollHeight, // Gunakan scrollHeight untuk menangkap semua konten
            scrollX: 0,
            scrollY: 0,
            allowTaint: false,
            removeContainer: true,
            foreignObjectRendering: false,
            imageTimeout: 10000,
            onclone: (clonedDoc, element) => {
                // Pastikan semua styling konsisten
                const allElements = element.querySelectorAll('*');
                allElements.forEach(el => {
                    el.style.boxSizing = 'border-box';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    
                    // Force background color untuk elemen tertentu
                    if (window.getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') {
                        el.style.backgroundColor = 'transparent';
                    }
                });

                // Handle gambar external - gunakan fallback emoji
                const images = element.querySelectorAll('img');
                images.forEach(img => {
                    img.crossOrigin = 'Anonymous';
                    // Jika gambar gagal load, ganti dengan emoji
                    img.onerror = function() {
                        const parent = this.parentElement;
                        if (parent) {
                            const emojiFallback = document.createElement('div');
                            emojiFallback.style.cssText = `
                                width: 60px;
                                height: 60px;
                                background: linear-gradient(135deg, #f97316 0%, #eab308 100%);
                                border-radius: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin: 0 auto 12px auto;
                                color: white;
                                font-weight: bold;
                                font-size: 20px;
                            `;
                            emojiFallback.textContent = '🚚';
                            parent.replaceChild(emojiFallback, this);
                        }
                    };
                });
            }
        });

        // Validasi canvas
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas tidak berhasil dibuat');
        }

        // Convert to PNG dan download
        const pngData = canvas.toDataURL('image/png', 1.0);
        
        // Validasi data URL
        if (!pngData || pngData === 'data:,') {
            throw new Error('Data URL tidak valid');
        }

        const link = document.createElement('a');
        link.download = `invoice-${data.invoiceNumber}-${new Date().getTime()}.png`;
        link.href = pngData;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        this.cleanupReceiptContainer();
        
        this.showNotification(`✅ Invoice ${data.invoiceNumber} berhasil didownload!`, 'success');
        
    } catch (error) {
        console.error('Error in downloadAsPNG:', error);
        this.showNotification('❌ Gagal download invoice: ' + error.message, 'error');
        
        // Cleanup jika error
        this.cleanupReceiptContainer();
    }
}

// Helper function untuk cleanup
cleanupReceiptContainer() {
    const container = document.getElementById('invoice-receipt-container');
    if (container) {
        container.remove();
    }
}

// Helper function untuk generate HTML receipt yang lebih reliable
generateReceiptHTML(data) {
    return `
        <!-- Header dengan Logo Asli -->
        <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9; box-sizing: border-box;">
            <div style="font-weight: 800; font-size: 18px; color: #1e293b; letter-spacing: -0.5px; margin-bottom: 4px;">
                VLCrave Express
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                Delivery Service
            </div>
        </div>

        <!-- Invoice Info Card -->
        <div style="background: linear-gradient(135deg, #fef7ed 0%, #fefce8 100%); border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
                <div style="box-sizing: border-box;">
                    <div style="font-size: 10px; color: #ea580c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; box-sizing: border-box;">
                        Invoice No
                    </div>
                    <div style="font-family: 'Courier New', monospace; font-weight: 800; font-size: 14px; color: #1e293b; box-sizing: border-box;">
                        ${data.invoiceNumber}
                    </div>
                </div>
                <div style="text-align: right; box-sizing: border-box;">
                    <div style="font-size: 10px; color: #ea580c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; box-sizing: border-box;">
                        Tanggal
                    </div>
                    <div style="font-weight: 600; font-size: 12px; color: #475569; box-sizing: border-box;">
                        ${data.date}
                    </div>
                </div>
            </div>
        </div>

        <!-- Products Section -->
        <div style="margin-bottom: 20px; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; box-sizing: border-box;">
                <div style="font-weight: 700; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box;">
                    Detail Pesanan
                </div>
                <div style="display: flex; gap: 25px; font-weight: 700; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box;">
                    <span style="width: 30px; text-align: center; box-sizing: border-box;">Qty</span>
                    <span style="width: 70px; text-align: right; box-sizing: border-box;">Harga</span>
                </div>
            </div>

            <div style="box-sizing: border-box;">
                ${data.products.map(product => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 6px; box-sizing: border-box;">
                        <div style="flex: 1; min-width: 0; box-sizing: border-box;">
                            <div style="font-weight: 600; font-size: 12px; color: #1e293b; margin-bottom: 2px; line-height: 1.3; box-sizing: border-box;">
                                ${product.name}
                            </div>
                        </div>
                        <div style="display: flex; gap: 25px; align-items: center; flex-shrink: 0; box-sizing: border-box;">
                            <span style="width: 30px; text-align: center; font-weight: 700; color: #475569; font-size: 11px; box-sizing: border-box;">
                                ${product.quantity}
                            </span>
                            <span style="width: 70px; text-align: right; font-weight: 700; color: #1e293b; font-size: 11px; box-sizing: border-box;">
                                ${this.formatCurrencyNoSymbol(product.price)}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Payment Method -->
        ${this.generatePaymentMethodHTML(data)}

        <!-- Summary Card -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; color: white; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; box-sizing: border-box;">
                <span style="font-size: 11px; color: #cbd5e1; font-weight: 600; box-sizing: border-box;">Subtotal</span>
                <span style="font-weight: 600; font-size: 12px; box-sizing: border-box;">${this.formatCurrencyNoSymbol(data.subtotal)}</span>
            </div>
            ${data.shippingCost > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; box-sizing: border-box;">
                <span style="font-size: 11px; color: #cbd5e1; font-weight: 600; box-sizing: border-box;">Biaya Pengiriman</span>
                <span style="font-weight: 600; font-size: 12px; box-sizing: border-box;">${this.formatCurrencyNoSymbol(data.shippingCost)}</span>
            </div>
            ` : ''}
            <div style="border-top: 1px solid #475569; padding-top: 12px; margin-top: 8px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
                    <span style="font-weight: 800; font-size: 14px; color: white; box-sizing: border-box;">Total Pembayaran</span>
                    <span style="font-weight: 800; font-size: 16px; color: white; box-sizing: border-box;">${this.formatCurrencyNoSymbol(data.total)}</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 16px; border-top: 2px dashed #e2e8f0; box-sizing: border-box;">
            <div style="font-size: 10px; color: #64748b; line-height: 1.4; margin-bottom: 8px; box-sizing: border-box;">
                Terima kasih telah mempercayai VLCrave Express sebagai layanan pengiriman anda
            </div>
            <div style="font-weight: 800; font-size: 12px; color: #f97316; letter-spacing: -0.5px; box-sizing: border-box;">
                VLCrave Express
            </div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; box-sizing: border-box;">
                WA : 0857-0945-8101
            </div>
        </div>
    `;
}

generatePaymentMethodHTML(data) {
    if (data.paymentMethod === 'tunai') {
        return `
            <div style="margin-bottom: 20px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; box-sizing: border-box;">
                    <i class="fas fa-money-bill-wave" style="color: #ea580c; font-size: 24px;"></i>
                    <div style="box-sizing: border-box;">
                        <div style="font-weight: 700; font-size: 14px; color: #9a3412; box-sizing: border-box;">
                            Pembayaran Tunai
                        </div>
                        <div style="font-size: 11px; color: #ea580c; font-weight: 500; box-sizing: border-box;">
                            Mohon siapkan uang tunai
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;
    } else {
        return `
            <div style="margin-bottom: 20px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; box-sizing: border-box;">
                    <i class="fas fa-mobile-alt" style="color: #16a34a; font-size: 24px;"></i>
                    <div style="box-sizing: border-box;">
                        <div style="font-weight: 700; font-size: 14px; color: #166534; box-sizing: border-box;">
                            Transfer 
                        </div>
                        <div style="font-size: 11px; color: #16a34a; font-weight: 500; box-sizing: border-box;">
                            Anda tidak perlu membayar uang tunai kepada kurir
                        </div>
                    </div>
                </div>
                <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center; box-sizing: border-box;">
                    <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-bottom: 6px; box-sizing: border-box;">
                        Tagihan akan diproses
                    </div>
                    <div style="font-weight: 800; font-size: 18px; color: #16a34a; box-sizing: border-box;">
                        ${this.formatCurrency(data.total)}
                    </div>
                </div>
            </div>
        `;
    }
}

// Tambahkan method formatCurrencyNoSymbol jika belum ada
formatCurrencyNoSymbol(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// Method formatCurrency dengan symbol
formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Method untuk show notification
showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove setelah 3 detik
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

printSimpleInvoice() {
    const invoiceContent = document.getElementById('invoiceContent');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice VLCrave Express</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    margin: 0;
                    padding: 10px;
                    background: white;
                    color: black;
                    width: 280px;
                }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .border-b { border-bottom: 1px dashed #000; }
                .border-t { border-top: 1px dashed #000; }
                .border-dashed { border-style: dashed; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .flex-1 { flex: 1; }
                .w-8 { width: 32px; }
                .w-12 { width: 48px; }
                .w-20 { width: 80px; }
                .h-12 { height: 48px; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-3 { margin-bottom: 12px; }
                .mb-4 { margin-bottom: 16px; }
                .mt-4 { margin-top: 16px; }
                .pb-2 { padding-bottom: 8px; }
                .pt-2 { padding-top: 8px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .text-right { text-align: right; }
                .text-xs { font-size: 10px; }
            </style>
        </head>
        <body>
            ${invoiceContent.innerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

async saveSimpleInvoice() {
    try {
        if (!this.user) {
            alert('Silakan login terlebih dahulu untuk menyimpan invoice');
            return;
        }

        const invoiceData = {
            ...this.currentInvoiceData,
            userId: this.user.uid,
            createdAt: new Date(),
            status: 'completed'
        };

        await addDoc(collection(db, "invoices"), invoiceData);
        alert('Invoice berhasil disimpan!');
        
        // Close modal
        document.querySelector('.fixed').remove();
        
    } catch (error) {
        console.error("Error saving invoice: ", error);
        alert('Error menyimpan invoice: ' + error.message);
    }
}

formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// HAPUS SEMUA FUNGSI DOUBLE DI BAWAH INI
// Jangan ada fungsi yang duplicate dengan nama sama

// Method untuk AI Analysis
async analyzeOrderWithAI() {
    try {
        const aiOrderInput = document.getElementById('aiOrderInput');
        if (!aiOrderInput) {
            alert('Error: Form tidak ditemukan. Silakan refresh halaman.');
            return;
        }

        const orderText = aiOrderInput.value.trim();
        if (!orderText) {
            alert('Masukkan detail pesanan terlebih dahulu!');
            return;
        }

        const analysisResult = document.getElementById('analysisResult');
        if (!analysisResult) return;

        // Show loading
        analysisResult.classList.remove('hidden');
        analysisResult.innerHTML = `
            <div class="flex items-center justify-center gap-3 py-4">
                <i class="fas fa-spinner fa-spin text-indigo-500 text-lg"></i>
                <span class="text-indigo-700 font-medium">AI sedang menganalisis pesanan...</span>
            </div>
        `;

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
                        content: `Kamu adalah assistant yang ahli dalam menganalisis detail pesanan dan mengkonversinya menjadi format JSON yang terstruktur. 
                        
                        Tugas kamu:
                        1. Analisis teks pesanan yang diberikan
                        2. Identifikasi setiap item produk, quantity, dan harga
                        3. Identifikasi ongkos kirim (jika ada) dari kata: ongkir, ongkos, biaya kirim, shipping, delivery
                        4. Kembalikan dalam format JSON yang terstruktur
                        
                        Format response yang diharapkan:
                        {
                            "products": [
                                {
                                    "name": "Nama Produk",
                                    "quantity": 1,
                                    "price": 25000,
                                    "total": 25000
                                }
                            ],
                            "shipping_cost": 0
                        }
                        
                        Aturan:
                        - Quantity default 1 jika tidak disebutkan
                        - Harga dalam angka tanpa titik/koma (25000 bukan 25.000)
                        - Total = quantity * price
                        - Jika ada ongkir, ekstrak angka setelah kata ongkir/ongkos/biaya kirim
                        - Ongkir default 0 jika tidak disebutkan
                        - Hanya kembalikan JSON, tanpa penjelasan tambahan
                        `
                    },
                    {
                        role: "user", 
                        content: `Analisis detail pesanan berikut dan kembalikan dalam format JSON:\n\n${orderText}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (!data.choices?.[0]?.message) {
            throw new Error('Invalid response format from AI');
        }

        const aiResponse = data.choices[0].message.content;
        
        // Parse JSON dari response AI
        let parsedData;
        try {
            const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
            parsedData = JSON.parse(cleanResponse);
        } catch (parseError) {
            console.error('Parse error:', parseError);
            parsedData = this.fallbackParsing(orderText);
        }

        this.displayAnalysisResult(parsedData);
        this.calculateTotal();

    } catch (error) {
        console.error('AI Analysis Error:', error);
        this.showAnalysisError('Gagal menganalisis pesanan: ' + error.message);
    }
}

// Method showAnalysisError
showAnalysisError(message) {
    const analysisResult = document.getElementById('analysisResult');
    if (!analysisResult) return;
    
    analysisResult.className = 'bg-red-50 border border-red-200 rounded-xl p-4 mb-6';
    analysisResult.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-exclamation-triangle text-red-500"></i>
            <span class="text-red-700 font-medium">${message}</span>
        </div>
    `;
}

// Method calculateTotal YANG BENAR (tanpa shippingCost input)
calculateTotal() {
    // Gunakan data dari AI analysis
    const subtotal = this.currentProducts ? 
        this.currentProducts.reduce((sum, product) => sum + product.total, 0) : 0;
    
    const shippingCost = this.currentShippingCost || 0;
    const total = subtotal + shippingCost;

    // Update display dengan null check
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = this.formatCurrency(value);
    };

    updateElement('subtotalAmount', subtotal);
    updateElement('shippingAmount', shippingCost);
    updateElement('totalAmount', total);
}

// Method displayAnalysisResult
displayAnalysisResult(parsedData) {
    const analysisResult = document.getElementById('analysisResult');
    if (!analysisResult) return;

    if (!parsedData.products || parsedData.products.length === 0) {
        this.showAnalysisError('Tidak dapat menemukan produk dalam pesanan. Pastikan format sesuai contoh.');
        return;
    }

    const subtotal = parsedData.products.reduce((sum, product) => sum + product.total, 0);
    
    // Store data untuk calculateTotal
    this.currentProducts = parsedData.products;
    this.currentShippingCost = parsedData.shipping_cost || 0;
    
    analysisResult.className = 'bg-green-50 border border-green-200 rounded-xl p-4 mb-6';
    
    const productsHTML = parsedData.products.map(product => `
        <div class="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
            <div class="flex-1">
                <div class="font-medium text-green-800 text-sm">${product.quantity}x ${product.name}</div>
            </div>
            <div class="font-semibold text-green-700 text-sm">${this.formatCurrency(product.total)}</div>
        </div>
    `).join('');
    
    const shippingHTML = this.currentShippingCost > 0 ? `
        <div class="flex justify-between items-center py-2 border-b border-green-100">
            <div class="flex-1">
                <div class="font-medium text-green-800 text-sm">📦 Ongkos Kirim</div>
            </div>
            <div class="font-semibold text-green-700 text-sm">${this.formatCurrency(this.currentShippingCost)}</div>
        </div>
    ` : '';
    
    analysisResult.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
            <i class="fas fa-check-circle text-green-500 text-lg"></i>
            <span class="font-semibold text-green-800">Analisis Berhasil</span>
        </div>
        <div class="text-sm">
            ${productsHTML}
            ${shippingHTML}
            <div class="flex justify-between items-center pt-2 mt-2 border-t border-green-200">
                <span class="font-bold text-green-800">Subtotal:</span>
                <span class="font-bold text-green-700">${this.formatCurrency(subtotal)}</span>
            </div>
        </div>
    `;
}

// Method generateSimpleInvoice
async generateSimpleInvoice() {
    try {
        if (!this.currentProducts || this.currentProducts.length === 0) {
            alert('Silakan analisis pesanan terlebih dahulu dengan AI!');
            return;
        }

        // Get payment method
        const paymentMethodRadio = document.querySelector('input[name="paymentMethod"]:checked');
        const paymentMethod = paymentMethodRadio ? paymentMethodRadio.value : 'tunai';

        // Generate invoice number
        const invoiceNumber = await this.generateInvoiceNumber();

        // Generate invoice data
        const invoiceData = {
            products: this.currentProducts,
            subtotal: this.currentProducts.reduce((sum, product) => sum + product.total, 0),
            shippingCost: this.currentShippingCost,
            total: this.currentProducts.reduce((sum, product) => sum + product.total, 0) + this.currentShippingCost,
            paymentMethod: paymentMethod,
            invoiceNumber: invoiceNumber,
            date: new Date().toLocaleDateString('id-ID'),
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };

        this.showSimpleInvoice(invoiceData);

    } catch (error) {
        console.error('Error generating invoice:', error);
        alert('Error membuat invoice: ' + error.message);
    }
}

// HAPUS FUNGSI-FUNGSI DOUBLE BERIKUT:
// - Jangan ada calculateTotal() yang lain
// - Jangan ada generateSimpleInvoice() yang lain  
// - Jangan ada showInvoiceGeneratorModal() yang lain
// - Jangan ada formatCurrency() yang double


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
    const userName = this.userData?.name || 'Customer';
    const userPhone = this.userData?.phone || '08123456789';
    
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
                            
                            <!-- Payment Method Selection -->
                            <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran:</label>
                                <select id="paymentMethod" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                    <option value="qris">QRIS (Semua E-Wallet & Mobile Banking)</option>
                                    <option value="va">Virtual Account (Transfer Bank)</option>
                                    <option value="cstore">Alfamart / Indomaret</option>
                                </select>
                            </div>
                            
                            <button class="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all shadow font-bold text-lg mb-3 transform hover:scale-105 duration-200" onclick="app.processIPaymuPayment()">
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

                <!-- Payment Processing Modal -->
                <div id="paymentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                    <div class="bg-white rounded-2xl p-6 max-w-sm mx-4">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-spinner fa-spin text-purple-600 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-bold text-gray-800 mb-2">Memproses Pembayaran</h3>
                            <p class="text-gray-600 text-sm mb-4">Sedang menghubungkan ke iPaymu...</p>
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p class="text-yellow-800 text-xs">Jangan tutup halaman ini selama proses pembayaran</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== IPAYMU PAYMENT INTEGRATION ====================

async processIPaymuPayment() {
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'qris';
    const amount = 49000; // Harga premium
    const userEmail = this.userData?.email || 'user@example.com';
    const userName = this.userData?.name || 'Customer';
    const userPhone = this.userData?.phone || '08123456789';

    // Show loading modal
    this.showPaymentModal();

    try {
        const paymentData = {
            amount: amount,
            paymentMethod: paymentMethod,
            product: 'VLFinance Premium Membership',
            name: userName,
            email: userEmail,
            phone: userPhone
        };

        const result = await this.createIPaymuPayment(paymentData);

        if (result.success) {
            // Redirect to iPaymu payment page
            window.location.href = result.redirectUrl;
        } else {
            this.hidePaymentModal();
            this.showNotification(result.error || 'Gagal memproses pembayaran', 'error');
        }

    } catch (error) {
        console.error('Payment error:', error);
        this.hidePaymentModal();
        this.showNotification('Terjadi kesalahan saat memproses pembayaran', 'error');
    }
}

async createIPaymuPayment(paymentData) {
    try {
        const response = await fetch('/ipaymu_create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                product: paymentData.product,
                name: paymentData.name,
                email: paymentData.email,
                phone: paymentData.phone,
                userId: this.userData?.uid || 'unknown' // Kirim userId ke backend
            })
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Create payment error:', error);
        return {
            success: false,
            error: 'Gagal terhubung ke server pembayaran'
        };
    }
}

showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

hidePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}


showNotification(message, type = 'info') {
    // Your existing notification implementation
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transform transition-transform duration-300 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Save pemasukan ke Firebase - PERBAIKAN
// Save pemasukan dengan format date yang konsisten
async savePemasukan() {
    try {
        // Validasi form elements
        const jumlahInput = document.getElementById('jumlah');
        const deskripsiInput = document.getElementById('deskripsi');
        const kategoriInput = document.getElementById('kategori');
        const tanggalInput = document.getElementById('tanggal');

        // Check if elements exist
        if (!jumlahInput || !deskripsiInput || !kategoriInput || !tanggalInput) {
            throw new Error('Form elements tidak ditemukan');
        }

        const formData = {
            amount: parseFloat(jumlahInput.value) || 0,
            description: deskripsiInput.value.trim(),
            category: kategoriInput.value,
            date: tanggalInput.value, // Simpan sebagai string YYYY-MM-DD
            userId: this.userData.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validasi data
        if (formData.amount <= 0) {
            throw new Error('Jumlah pemasukan harus lebih dari 0');
        }
        if (!formData.description) {
            throw new Error('Deskripsi tidak boleh kosong');
        }
        if (!formData.category) {
            throw new Error('Kategori harus dipilih');
        }
        if (!formData.date) {
            throw new Error('Tanggal harus diisi');
        }

        console.log('Menyimpan pemasukan:', formData);

        // Simpan ke Firebase
        await this.db.collection('incomes').add(formData);
        
        this.showNotification('Pemasukan berhasil disimpan!', 'success');
        this.hidePemasukanModal();
        
        // Reload data untuk update UI dan AI analysis
        setTimeout(() => this.loadPemasukanData(), 500);
        
    } catch (error) {
        console.error('Error savePemasukan:', error);
        this.showError('Gagal menyimpan pemasukan: ' + error.message);
    }
}

// Update function hide modal dengan animation
hidePemasukanModal() {
    const modal = document.getElementById('pemasukanModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-slide-up');
        if (modalContent) {
            modalContent.classList.remove('modal-slide-up');
            modalContent.classList.add('modal-slide-down');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                modalContent.classList.remove('modal-slide-down');
                modalContent.classList.add('modal-slide-up');
                
                // Reset form
                const form = document.getElementById('pemasukanForm');
                if (form) form.reset();
            }, 250);
        } else {
            modal.classList.add('hidden');
        }
    }
}

// Update function show modal
showTambahPemasukanModal() {
    const modal = document.getElementById('pemasukanModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Set default values
        const tanggalInput = document.getElementById('tanggal');
        if (tanggalInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            tanggalInput.value = formattedDate;
        }
        
        // Auto focus
        setTimeout(() => {
            const deskripsiInput = document.getElementById('deskripsi');
            if (deskripsiInput) {
                deskripsiInput.focus();
                // Scroll ke atas untuk memastikan input visible di mobile
                deskripsiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 350);
    }
}

renderInvoicePage() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-gray-800">Invoice Generator</h1>
                <button onclick="app.showInvoiceGeneratorModal()" 
                        class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <i class="fas fa-plus"></i>
                    Buat Invoice Baru
                </button>
            </div>

            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow-sm border">
                    <div class="flex justify-between items-center">
                        <h3 class="text-gray-600">Total Invoice</h3>
                        <i class="fas fa-receipt text-purple-500"></i>
                    </div>
                    <p class="text-2xl font-bold mt-2" id="totalInvoices">0</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm border">
                    <div class="flex justify-between items-center">
                        <h3 class="text-gray-600">Pending</h3>
                        <i class="fas fa-clock text-orange-500"></i>
                    </div>
                    <p class="text-2xl font-bold mt-2" id="pendingInvoices">0</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm border">
                    <div class="flex justify-between items-center">
                        <h3 class="text-gray-600">Paid</h3>
                        <i class="fas fa-check-circle text-green-500"></i>
                    </div>
                    <p class="text-2xl font-bold mt-2" id="paidInvoices">0</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm border">
                    <div class="flex justify-between items-center">
                        <h3 class="text-gray-600">Total Revenue</h3>
                        <i class="fas fa-money-bill-wave text-blue-500"></i>
                    </div>
                    <p class="text-2xl font-bold mt-2" id="totalRevenue">Rp 0</p>
                </div>
            </div>

            <!-- Invoice List -->
            <div class="bg-white rounded-lg shadow-sm border">
                <div class="p-4 border-b flex justify-between items-center">
                    <h2 class="text-lg font-semibold text-gray-800">Daftar Invoice</h2>
                    <div class="flex gap-2">
                        <select id="filterStatus" onchange="app.filterInvoices()" 
                                class="border rounded-lg px-3 py-2 text-sm">
                            <option value="all">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <input type="text" id="searchInvoice" placeholder="Cari invoice..." 
                               onkeyup="app.searchInvoices()"
                               class="border rounded-lg px-3 py-2 text-sm w-64">
                    </div>
                </div>
                <div id="invoiceListContainer" class="p-4">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>Memuat data invoice...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    this.loadInvoicesFromFirestore();
}

renderGoalsPage() {
    return `
        <div class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100/80">
            <!-- Header -->
            <div class="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                                    onclick="app.loadContent('dashboard')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-lg font-bold text-gray-900">Financial Goals</h1>
                                <p class="text-xs text-gray-500">Kelola target keuangan Anda</p>
                            </div>
                        </div>
                        <button onclick="app.showAddGoalModal()" 
                                class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Goals Overview -->
            <div class="px-4 pt-6">
                <div class="grid grid-cols-3 gap-3">
                    <!-- Total Goals -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-bullseye text-blue-500 text-lg"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">Total Goals</p>
                            <p class="text-gray-900 text-lg font-bold" id="totalGoalsCount">0</p>
                        </div>
                    </div>

                    <!-- Completed Goals -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-check text-green-500 text-lg"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">Completed</p>
                            <p class="text-gray-900 text-lg font-bold" id="completedGoalsCount">0</p>
                        </div>
                    </div>

                    <!-- In Progress -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-spinner text-orange-500 text-lg"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">In Progress</p>
                            <p class="text-gray-900 text-lg font-bold" id="progressGoalsCount">0</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Access Cards -->
            <div class="px-4 mt-6">
                <h3 class="text-gray-900 text-sm font-bold mb-3">Quick Access</h3>
                <div class="grid grid-cols-2 gap-3">
                    <!-- Dream Planner -->
                    <div class="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg text-white hover:shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer" 
                         onclick="app.loadContent('dream-planner')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-star text-white text-sm"></i>
                            </div>
                            <div class="bg-white/20 px-2 py-1 rounded-full">
                                <i class="fas fa-arrow-right text-white text-xs"></i>
                            </div>
                        </div>
                        <p class="text-white/90 text-xs font-medium mb-1">Dream Planner</p>
                        <p class="text-white text-lg font-bold" id="dreamPlannerSummary">Rp 0</p>
                        <div class="flex items-center mt-2">
                            <div class="w-full bg-white/30 rounded-full h-1.5">
                                <div class="bg-white h-1.5 rounded-full" id="dreamPlannerSummaryBar" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Dana Darurat -->
                    <div class="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 shadow-lg text-white hover:shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer" 
                         onclick="app.loadContent('dana-darurat')">
                        <div class="flex items-center justify-between mb-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-shield-alt text-white text-sm"></i>
                            </div>
                            <div class="bg-white/20 px-2 py-1 rounded-full">
                                <i class="fas fa-arrow-right text-white text-xs"></i>
                            </div>
                        </div>
                        <p class="text-white/90 text-xs font-medium mb-1">Dana Darurat</p>
                        <p class="text-white text-lg font-bold" id="danaDaruratSummary">Rp 0</p>
                        <div class="flex items-center mt-2">
                            <div class="w-full bg-white/30 rounded-full h-1.5">
                                <div class="bg-white h-1.5 rounded-full" id="danaDaruratSummaryBar" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabungan Section -->
            <div class="px-4 mt-4">
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg text-white hover:shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer" 
                     onclick="app.loadContent('tabungan')">
                    <div class="flex items-center justify-between mb-3">
                        <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <i class="fas fa-piggy-bank text-white text-sm"></i>
                        </div>
                        <div class="bg-white/20 px-2 py-1 rounded-full">
                            <i class="fas fa-arrow-right text-white text-xs"></i>
                        </div>
                    </div>
                    <p class="text-white/90 text-xs font-medium mb-1">Tabungan</p>
                    <p class="text-white text-lg font-bold" id="tabunganSummary">Rp 0</p>
                    <div class="flex items-center mt-2">
                        <div class="w-full bg-white/30 rounded-full h-1.5">
                            <div class="bg-white h-1.5 rounded-full" id="tabunganSummaryBar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Goals List -->
            <div class="px-4 mt-6 mb-6">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-gray-900 text-sm font-bold">Active Goals</h3>
                            <span class="text-blue-500 text-xs font-medium" id="activeGoalsCount">0 goals</span>
                        </div>
                    </div>
                    <div id="activeGoalsList" class="divide-y divide-gray-100">
                        <div class="px-4 py-4 text-center">
                            <i class="fas fa-bullseye text-3xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 text-sm">Belum ada goals aktif</p>
                            <button onclick="app.showAddGoalModal()" 
                                    class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                                Tambah Goal Pertama
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Goal Modal -->
            <div id="addGoalModal" class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 hidden px-2 sm:px-0">
                <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    <div class="px-4 py-4 border-b border-gray-100 bg-white sticky top-0">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-bold text-gray-900">Tambah Goal Baru</h3>
                            <button onclick="app.hideAddGoalModal()" 
                                    class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <i class="fas fa-times text-gray-500 text-lg"></i>
                            </button>
                        </div>
                    </div>

                    <div class="p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                        <!-- Goal Type -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Tipe Goal</label>
                            <select id="goalType" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm">
                                <option value="dream">🎯 Dream Planner</option>
                                <option value="emergency">🛡️ Dana Darurat</option>
                                <option value="savings">💰 Tabungan</option>
                                <option value="custom">📝 Custom Goal</option>
                            </select>
                        </div>

                        <!-- Goal Name -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Nama Goal</label>
                            <input type="text" id="goalName" 
                                   class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                   placeholder="Contoh: Beli mobil, Dana pendidikan, dll">
                        </div>

                        <!-- Target Amount -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Target Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                <input type="number" id="goalTargetAmount" 
                                       class="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                       placeholder="0">
                            </div>
                        </div>

                        <!-- Current Amount -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Current Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                <input type="number" id="goalCurrentAmount" 
                                       class="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                       placeholder="0" value="0">
                            </div>
                        </div>

                        <!-- Target Date -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Target Date (Opsional)</label>
                            <input type="date" id="goalTargetDate" 
                                   class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm">
                        </div>

                        <!-- Priority -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Priority</label>
                            <select id="goalPriority" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm">
                                <option value="low">🟢 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🔴 High</option>
                            </select>
                        </div>

                        <!-- Notes -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Catatan (Opsional)</label>
                            <textarea id="goalNotes" rows="3"
                                      class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                      placeholder="Tambahkan catatan tentang goal ini..."></textarea>
                        </div>
                    </div>

                    <div class="px-4 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                        <button onclick="app.saveGoal()"
                                class="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold text-sm shadow-lg">
                            Save Goal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Function untuk load goals data
async loadGoalsData() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        // Load goals summary
        await this.loadGoalsSummary();
        
        // Load active goals list
        await this.loadActiveGoals();
        
        // Load quick access data
        await this.loadQuickAccessData();
        
    } catch (error) {
        console.error('Error loading goals data:', error);
    }
}

// Load goals summary
async loadGoalsSummary() {
    const currentUser = this.auth.currentUser;
    
    try {
        const goalsSnapshot = await this.db.collection('goals')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const totalGoals = goalsSnapshot.size;
        const completedGoals = goalsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.currentAmount >= data.targetAmount;
        }).length;
        
        const progressGoals = totalGoals - completedGoals;
        
        document.getElementById('totalGoalsCount').textContent = totalGoals;
        document.getElementById('completedGoalsCount').textContent = completedGoals;
        document.getElementById('progressGoalsCount').textContent = progressGoals;
        
    } catch (error) {
        console.error('Error loading goals summary:', error);
    }
}

// Load active goals
async loadActiveGoals() {
    const currentUser = this.auth.currentUser;
    
    try {
        const goalsSnapshot = await this.db.collection('goals')
            .where('userId', '==', currentUser.uid)
            .where('currentAmount', '<', this.db.collection('goals').doc('targetAmount'))
            .orderBy('priority', 'desc')
            .orderBy('createdAt', 'desc')
            .get();
        
        const activeGoalsList = document.getElementById('activeGoalsList');
        document.getElementById('activeGoalsCount').textContent = `${goalsSnapshot.size} goals`;
        
        if (goalsSnapshot.empty) {
            activeGoalsList.innerHTML = `
                <div class="px-4 py-4 text-center">
                    <i class="fas fa-bullseye text-3xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 text-sm">Belum ada goals aktif</p>
                    <button onclick="app.showAddGoalModal()" 
                            class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                        Tambah Goal Pertama
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        goalsSnapshot.forEach(doc => {
            const goal = doc.data();
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const progressColor = progress >= 75 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-blue-500';
            const priorityColor = goal.priority === 'high' ? 'text-red-500' : goal.priority === 'medium' ? 'text-yellow-500' : 'text-green-500';
            const priorityIcon = goal.priority === 'high' ? '🔴' : goal.priority === 'medium' ? '🟡' : '🟢';
            
            html += `
                <div class="px-4 py-4 hover:bg-gray-50 cursor-pointer" onclick="app.showGoalDetail('${doc.id}')">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm">${priorityIcon}</span>
                            <h4 class="text-sm font-semibold text-gray-900">${goal.name}</h4>
                        </div>
                        <span class="text-xs font-medium ${priorityColor}">${goal.priority}</span>
                    </div>
                    
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs text-gray-600">${this.formatRupiah(goal.currentAmount)}</span>
                        <span class="text-xs text-gray-500">${progress.toFixed(1)}%</span>
                        <span class="text-xs text-gray-600">${this.formatRupiah(goal.targetAmount)}</span>
                    </div>
                    
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div class="h-2 rounded-full ${progressColor} transition-all duration-500" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-500">${goal.type}</span>
                        ${goal.targetDate ? `<span class="text-xs text-gray-500">${this.formatDateDisplay(goal.targetDate)}</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        activeGoalsList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading active goals:', error);
    }
}

// Load quick access data
async loadQuickAccessData() {
    // Load data untuk quick access cards
    // Implementasi sesuai dengan data yang sudah ada di dashboard
}

// Show add goal modal
showAddGoalModal() {
    const modal = document.getElementById('addGoalModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Hide add goal modal
hideAddGoalModal() {
    const modal = document.getElementById('addGoalModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Save goal
async saveGoal() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const goalData = {
            userId: currentUser.uid,
            type: document.getElementById('goalType').value,
            name: document.getElementById('goalName').value,
            targetAmount: parseFloat(document.getElementById('goalTargetAmount').value) || 0,
            currentAmount: parseFloat(document.getElementById('goalCurrentAmount').value) || 0,
            targetDate: document.getElementById('goalTargetDate').value || null,
            priority: document.getElementById('goalPriority').value,
            notes: document.getElementById('goalNotes').value || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('goals').add(goalData);
        
        this.showToast('Goal berhasil disimpan!', 'success');
        this.hideAddGoalModal();
        
        // Refresh goals data
        this.loadGoalsData();
        
    } catch (error) {
        console.error('Error saving goal:', error);
        this.showToast('Gagal menyimpan goal', 'error');
    }
}


  // RENDER DREAM PLANNER PAGE - FINAL VERSION
renderDreamPlannerPage() {
    return `
        <div class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
            <!-- Header dengan Tombol Refresh -->
            <div class="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                                    onclick="app.loadContent('goals')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-lg font-bold text-gray-900">Dream Planner</h1>
                                <p class="text-xs text-gray-500">Wujudkan impian Anda</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <!-- Tombol Refresh -->
                            <button onclick="app.manualRefreshDreams()" 
                                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                    title="Refresh data">
                                <i class="fas fa-sync-alt text-sm"></i>
                            </button>
                            <button onclick="app.showAddDreamModal()" 
                                    class="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Overview -->
            <div class="px-4 pt-6">
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 shadow-xl text-white">
                    <div class="text-center">
                        <p class="text-white/90 text-sm font-medium mb-2">Total Dream Progress</p>
                        <p class="text-white text-2xl font-bold mb-3" id="dreamTotalProgress">Rp 0</p>
                        <div class="w-full bg-white/30 rounded-full h-3 mb-2">
                            <div class="bg-white h-3 rounded-full transition-all duration-500" id="dreamOverallProgressBar" style="width: 0%"></div>
                        </div>
                        <p class="text-white/70 text-xs" id="dreamOverallTarget">Target: Rp 0</p>
                    </div>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="px-4 mt-6">
                <div class="grid grid-cols-3 gap-3">
                    <!-- Total Dreams -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-star text-purple-500 text-sm"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">Total Dreams</p>
                            <p class="text-gray-900 text-lg font-bold" id="totalDreamsCount">0</p>
                        </div>
                    </div>

                    <!-- Achieved -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-check text-green-500 text-sm"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">Achieved</p>
                            <p class="text-gray-900 text-lg font-bold" id="achievedDreamsCount">0</p>
                        </div>
                    </div>

                    <!-- In Progress -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-spinner text-orange-500 text-sm"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">In Progress</p>
                            <p class="text-gray-900 text-lg font-bold" id="progressDreamsCount">0</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Status Indicator -->
            <div class="px-4 mt-4">
                <div class="flex items-center justify-center space-x-2 text-xs text-gray-500" id="dreamsStatus">
                    <i class="fas fa-circle text-green-500 text-xs"></i>
                    <span>Real-time updates active</span>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="px-4 mt-4">
                <h3 class="text-gray-900 text-sm font-bold mb-3">Quick Actions</h3>
                <div class="grid grid-cols-4 gap-2">
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showAddDreamModal()">
                        <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-plus text-purple-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Add Dream</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showDreamInsights()">
                        <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-chart-pie text-green-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Insights</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.exportDreams()">
                        <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-download text-blue-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Export</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.manualRefreshDreams()">
                        <div class="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-sync-alt text-orange-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Refresh</span>
                    </button>
                </div>
            </div>

            <!-- Dreams List -->
            <div class="px-4 mt-4 mb-6">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-gray-900 text-sm font-bold">My Dreams</h3>
                            <span class="text-purple-500 text-xs font-medium" id="dreamsListCount">0 dreams</span>
                        </div>
                    </div>
                    <div id="dreamsList" class="divide-y divide-gray-100">
                        <div class="px-4 py-8 text-center">
                            <i class="fas fa-star text-3xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 text-sm">Loading dreams...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Dream Modal -->
            <div id="addDreamModal" class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 hidden px-2 sm:px-0">
                <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                    <div class="px-4 py-4 border-b border-gray-100 bg-white sticky top-0">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-bold text-gray-900">Tambah Dream Goal</h3>
                            <button onclick="app.hideAddDreamModal()" 
                                    class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <i class="fas fa-times text-gray-500 text-lg"></i>
                            </button>
                        </div>
                    </div>

                    <div class="p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                        <!-- Dream Icon -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Dream Icon</label>
                            <div class="grid grid-cols-6 gap-2">
                                <button type="button" class="p-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors" onclick="app.selectDreamIcon('🏠')">
                                    🏠
                                </button>
                                <button type="button" class="p-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors" onclick="app.selectDreamIcon('🚗')">
                                    🚗
                                </button>
                                <button type="button" class="p-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors" onclick="app.selectDreamIcon('✈️')">
                                    ✈️
                                </button>
                                <button type="button" class="p-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors" onclick="app.selectDreamIcon('🎓')">
                                    🎓
                                </button>
                                <button type="button" class="p-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors" onclick="app.selectDreamIcon('💍')">
                                    💍
                                </button>
                                <button type="button" class="p-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors" onclick="app.selectDreamIcon('📱')">
                                    📱
                                </button>
                            </div>
                            <input type="hidden" id="dreamIcon" value="🎯">
                        </div>

                        <!-- Dream Name -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Nama Dream</label>
                            <input type="text" id="dreamName" 
                                   class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                   placeholder="Contoh: Beli mobil, Nikah, DP Rumah">
                        </div>

                        <!-- Category -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Kategori</label>
                            <select id="dreamCategory" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm">
                                <option value="property">🏠 Property</option>
                                <option value="vehicle">🚗 Kendaraan</option>
                                <option value="education">🎓 Pendidikan</option>
                                <option value="wedding">💍 Pernikahan</option>
                                <option value="travel">✈️ Travel</option>
                                <option value="gadget">📱 Gadget</option>
                                <option value="business">💼 Bisnis</option>
                                <option value="other">📝 Lainnya</option>
                            </select>
                        </div>

                        <!-- Target Amount -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Target Amount</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                <input type="number" id="dreamTargetAmount" 
                                       class="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                       placeholder="50000000">
                            </div>
                        </div>

                        <!-- Current Amount -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Current Savings</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                <input type="number" id="dreamCurrentAmount" 
                                       class="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                       placeholder="0" value="0">
                            </div>
                        </div>

                        <!-- Target Date -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Target Date</label>
                            <input type="date" id="dreamTargetDate" 
                                   class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm">
                        </div>

                        <!-- Priority -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Priority</label>
                            <select id="dreamPriority" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm">
                                <option value="low">🟢 Low - Bisa ditunda</option>
                                <option value="medium">🟡 Medium - Penting</option>
                                <option value="high">🔴 High - Sangat penting</option>
                            </select>
                        </div>

                        <!-- Description -->
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-2">Deskripsi (Opsional)</label>
                            <textarea id="dreamDescription" rows="3"
                                      class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                      placeholder="Ceritakan lebih detail tentang impian Anda..."></textarea>
                        </div>
                    </div>

                    <div class="px-4 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                        <button onclick="app.saveDreamGoal()"
                                class="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold text-sm shadow-lg">
                            Save Dream Goal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== DREAMS REAL-TIME MANAGEMENT ====================

// Setup real-time listener untuk dreams
setupDreamsRealtimeListener() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
        console.log('User not authenticated for dreams real-time');
        return;
    }

    // Hapus listener sebelumnya jika ada
    if (this.dreamsUnsubscribe) {
        this.dreamsUnsubscribe();
    }

    try {
        this.dreamsUnsubscribe = this.db.collection('dreams')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    console.log('Dreams real-time update received');
                    this.handleDreamsSnapshot(snapshot);
                },
                (error) => {
                    console.error('Dreams real-time error:', error);
                    this.showNotification('Error real-time dreams update', 'error');
                }
            );

        console.log('Dreams real-time listener setup successfully');
        
    } catch (error) {
        console.error('Error setting up dreams real-time listener:', error);
    }
}

// Handle snapshot data
handleDreamsSnapshot(snapshot) {
    this.dreamsData = [];
    
    if (snapshot.empty) {
        this.renderEmptyDreamsState();
        this.updateDreamsOverview();
        return;
    }

    snapshot.forEach(doc => {
        const dreamData = {
            id: doc.id,
            ...doc.data()
        };
        
        // Convert Firestore timestamps
        if (dreamData.createdAt && dreamData.createdAt.toDate) {
            dreamData.createdAt = dreamData.createdAt.toDate();
        }
        if (dreamData.targetDate && dreamData.targetDate.toDate) {
            dreamData.targetDate = dreamData.targetDate.toDate();
        }
        if (dreamData.updatedAt && dreamData.updatedAt.toDate) {
            dreamData.updatedAt = dreamData.updatedAt.toDate();
        }
        
        this.dreamsData.push(dreamData);
    });

    console.log('Dreams updated in real-time:', this.dreamsData.length, 'dreams');
    
    // Update UI
    this.updateDreamsOverview();
    this.renderDreamsList();
}

// Update dreams overview
updateDreamsOverview() {
    if (!this.dreamsData || this.dreamsData.length === 0) {
        this.setDefaultDreamsOverview();
        return;
    }

    let totalCurrent = 0;
    let totalTarget = 0;
    let totalDreams = 0;
    let achievedDreams = 0;
    let progressDreams = 0;

    this.dreamsData.forEach(dream => {
        totalCurrent += dream.currentAmount || 0;
        totalTarget += dream.targetAmount || 0;
        totalDreams++;
        
        if ((dream.currentAmount || 0) >= (dream.targetAmount || 0)) {
            achievedDreams++;
        } else {
            progressDreams++;
        }
    });

    // Update overview elements
    const totalProgressElement = document.getElementById('dreamTotalProgress');
    const overallTargetElement = document.getElementById('dreamOverallTarget');
    const progressBarElement = document.getElementById('dreamOverallProgressBar');
    const totalDreamsElement = document.getElementById('totalDreamsCount');
    const achievedElement = document.getElementById('achievedDreamsCount');
    const progressElement = document.getElementById('progressDreamsCount');

    if (totalProgressElement) {
        totalProgressElement.textContent = this.formatRupiah(totalCurrent);
    }
    if (overallTargetElement) {
        overallTargetElement.textContent = `Target: ${this.formatRupiah(totalTarget)}`;
    }
    if (progressBarElement) {
        const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
        progressBarElement.style.width = `${Math.min(overallProgress, 100)}%`;
    }
    if (totalDreamsElement) {
        totalDreamsElement.textContent = totalDreams;
    }
    if (achievedElement) {
        achievedElement.textContent = achievedDreams;
    }
    if (progressElement) {
        progressElement.textContent = progressDreams;
    }
}

// Render dreams list
renderDreamsList() {
    const dreamsList = document.getElementById('dreamsList');
    const dreamsListCount = document.getElementById('dreamsListCount');
    
    if (!dreamsList) return;

    if (!this.dreamsData || this.dreamsData.length === 0) {
        dreamsList.innerHTML = this.renderEmptyDreamsState();
        if (dreamsListCount) {
            dreamsListCount.textContent = '0 dreams';
        }
        return;
    }

    if (dreamsListCount) {
        dreamsListCount.textContent = `${this.dreamsData.length} dreams`;
    }

    let html = '';
    this.dreamsData.forEach(dream => {
        const progress = dream.targetAmount > 0 ? ((dream.currentAmount || 0) / dream.targetAmount) * 100 : 0;
        const isCompleted = progress >= 100;
        const progressColor = isCompleted ? 'bg-green-500' : progress >= 75 ? 'bg-purple-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-blue-500';
        const statusText = isCompleted ? 'Completed' : 'In Progress';
        const statusColor = isCompleted ? 'text-green-500' : 'text-purple-500';
        const daysLeft = dream.targetDate ? this.calculateDaysLeft(dream.targetDate) : null;
        
        html += `
            <div class="px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onclick="app.showDreamDetail('${dream.id}')">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <span class="text-lg">${dream.icon || '🎯'}</span>
                        </div>
                        <div>
                            <h4 class="text-sm font-semibold text-gray-900">${dream.name}</h4>
                            <p class="text-xs text-gray-500 mt-1">${this.formatCategoryName(dream.category)}</p>
                        </div>
                    </div>
                    <span class="text-xs font-medium ${statusColor}">${statusText}</span>
                </div>
                
                <!-- Progress -->
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs text-gray-600">${this.formatRupiah(dream.currentAmount || 0)}</span>
                    <span class="text-xs text-gray-500">${progress.toFixed(1)}%</span>
                    <span class="text-xs text-gray-600">${this.formatRupiah(dream.targetAmount)}</span>
                </div>
                
                <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div class="h-2 rounded-full ${progressColor} transition-all duration-500" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <span class="text-xs text-gray-500">${this.getPriorityBadge(dream.priority)}</span>
                        ${daysLeft !== null ? `
                            <span class="text-xs ${daysLeft < 30 ? 'text-red-500' : 'text-gray-500'}">
                                ${daysLeft} days left
                            </span>
                        ` : ''}
                    </div>
                    <button onclick="event.stopPropagation(); app.addToDream('${dream.id}')" 
                            class="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded transition-colors">
                        + Add
                    </button>
                </div>
            </div>
        `;
    });
    
    dreamsList.innerHTML = html;
}

// ==================== DREAMS ACTIONS ====================

// Manual refresh dreams
async manualRefreshDreams() {
    const refreshBtn = document.querySelector('button[onclick="app.manualRefreshDreams()"]');
    
    // Add loading animation
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-sm"></i>';
        refreshBtn.disabled = true;
    }

    try {
        // Force reload data
        await this.forceReloadDreams();
        this.showNotification('Dreams data refreshed', 'success');
        
    } catch (error) {
        console.error('Error manual refresh:', error);
        this.showNotification('Refresh failed', 'error');
    } finally {
        // Restore button
        if (refreshBtn) {
            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt text-sm"></i>';
                refreshBtn.disabled = false;
            }, 1000);
        }
    }
}

// Force reload dreams data
async forceReloadDreams() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    try {
        const dreamsSnapshot = await this.db.collection('dreams')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        this.handleDreamsSnapshot(dreamsSnapshot);
        
    } catch (error) {
        console.error('Error force reloading dreams:', error);
        throw error;
    }
}

// Add to dream savings
async addToDream(dreamId) {
    this.showAddToDreamModal(dreamId);
}

// Process adding to dream savings
async processAddToDream(dreamId) {
    const amountInput = document.getElementById('dreamAddAmount');
    const dateInput = document.getElementById('dreamAddDate');
    const sourceInput = document.getElementById('dreamAddSource');

    const amount = parseFloat(amountInput?.value);
    const date = dateInput?.value;
    const source = sourceInput?.value;

    // Validation
    if (!amount || amount <= 0) {
        this.showNotification('Masukkan jumlah yang valid', 'error');
        return;
    }

    if (!date) {
        this.showNotification('Pilih tanggal transaksi', 'error');
        return;
    }

    try {
        const currentUser = this.auth.currentUser;
        const dreamRef = this.db.collection('dreams').doc(dreamId);

        // Get current dream data
        const dreamDoc = await dreamRef.get();
        if (!dreamDoc.exists) {
            this.showNotification('Data impian tidak ditemukan', 'error');
            return;
        }

        const dream = dreamDoc.data();
        const currentAmount = dream.currentAmount || 0;
        const newAmount = currentAmount + amount;
        const targetAmount = dream.targetAmount || 0;

        // Update dream savings
        await dreamRef.update({
            currentAmount: newAmount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add transaction record
        const transactionRef = this.db.collection('dream_transactions').doc();
        await transactionRef.set({
            dreamId: dreamId,
            userId: currentUser.uid,
            type: 'deposit',
            amount: amount,
            date: new Date(date),
            source: source,
            balanceAfter: newAmount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.showNotification(`Berhasil menambahkan Rp ${this.formatNumber(amount)} ke tabungan impian!`, 'success');
        this.hideAddToDreamModal();
        
        // Data akan auto update via real-time listener, tidak perlu refresh manual
        
    } catch (error) {
        console.error('Error adding to dream:', error);
        this.showNotification('Gagal menambahkan ke tabungan impian', 'error');
    }
}

// Save dream goal
async saveDreamGoal() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const dreamData = {
            userId: currentUser.uid,
            icon: document.getElementById('dreamIcon').value,
            name: document.getElementById('dreamName').value,
            category: document.getElementById('dreamCategory').value,
            targetAmount: parseFloat(document.getElementById('dreamTargetAmount').value) || 0,
            currentAmount: parseFloat(document.getElementById('dreamCurrentAmount').value) || 0,
            targetDate: document.getElementById('dreamTargetDate').value || null,
            priority: document.getElementById('dreamPriority').value,
            description: document.getElementById('dreamDescription').value || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validation
        if (!dreamData.name) {
            this.showNotification('Nama dream harus diisi', 'error');
            return;
        }

        if (dreamData.targetAmount <= 0) {
            this.showNotification('Target amount harus lebih dari 0', 'error');
            return;
        }

        await this.db.collection('dreams').add(dreamData);
        
        this.showNotification('Dream goal berhasil disimpan! ✨', 'success');
        this.hideAddDreamModal();
        
        // Data akan auto update via real-time listener
        
    } catch (error) {
        console.error('Error saving dream goal:', error);
        this.showNotification('Gagal menyimpan dream goal', 'error');
    }
}

// ==================== HELPER METHODS ====================

// Set default dreams overview
setDefaultDreamsOverview() {
    const elements = {
        'dreamTotalProgress': 'Rp 0',
        'dreamOverallTarget': 'Target: Rp 0',
        'totalDreamsCount': '0',
        'achievedDreamsCount': '0',
        'progressDreamsCount': '0'
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });

    const progressBar = document.getElementById('dreamOverallProgressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

// Render empty state
renderEmptyDreamsState() {
    return `
        <div class="px-4 py-8 text-center">
            <i class="fas fa-star text-3xl text-gray-300 mb-3"></i>
            <p class="text-gray-500 text-sm">Belum ada dream goals</p>
            <p class="text-gray-400 text-xs mt-1">Mulai wujudkan impian Anda</p>
            <button onclick="app.showAddDreamModal()" 
                    class="mt-3 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">
                Tambah Dream Pertama
            </button>
        </div>
    `;
}

// Helper functions
formatCategoryName(category) {
    const categories = {
        'property': 'Property',
        'vehicle': 'Kendaraan',
        'education': 'Pendidikan',
        'wedding': 'Pernikahan',
        'travel': 'Travel',
        'gadget': 'Gadget',
        'business': 'Bisnis',
        'other': 'Lainnya'
    };
    return categories[category] || 'Lainnya';
}

getPriorityBadge(priority) {
    const badges = {
        'low': '🟢 Low',
        'medium': '🟡 Medium',
        'high': '🔴 High'
    };
    return badges[priority] || '🟢 Low';
}

calculateDaysLeft(targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

formatRupiah(amount) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
}

formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

// ==================== MODAL MANAGEMENT ====================

showAddDreamModal() {
    const modal = document.getElementById('addDreamModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Reset form
        document.getElementById('dreamIcon').value = '🎯';
        document.getElementById('dreamName').value = '';
        document.getElementById('dreamCategory').value = 'other';
        document.getElementById('dreamTargetAmount').value = '';
        document.getElementById('dreamCurrentAmount').value = '0';
        document.getElementById('dreamTargetDate').value = '';
        document.getElementById('dreamPriority').value = 'medium';
        document.getElementById('dreamDescription').value = '';
    }
}

hideAddDreamModal() {
    const modal = document.getElementById('addDreamModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

selectDreamIcon(icon) {
    document.getElementById('dreamIcon').value = icon;
}

// Tambahkan method yang hilang untuk modal add to dream
showAddToDreamModal(dreamId) {
    // Implementasi modal untuk menambah tabungan dream
    this.showNotification(`Modal tambah tabungan untuk dream ${dreamId} akan ditampilkan`, 'info');
}

hideAddToDreamModal() {
    // Implementasi sembunyikan modal tambah tabungan
    console.log('Hide add to dream modal');
}

showNotification(message, type = 'info') {
    // Your existing notification implementation
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transform transition-transform duration-300 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Placeholder methods untuk fungsi yang belum diimplementasi
showDreamDetail(dreamId) {
    this.showNotification(`Detail dream ${dreamId} akan ditampilkan`, 'info');
}

showDreamInsights() {
    this.showNotification('Dream insights akan ditampilkan', 'info');
}

exportDreams() {
    this.showNotification('Fitur export dreams akan datang', 'info');
}

filterDreams(filter) {
    this.showNotification(`Filter dreams: ${filter}`, 'info');
}

renderDanaDaruratPage() {
    return `
        <div class="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
            <!-- Header -->
            <div class="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                                    onclick="app.loadContent('goals')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-lg font-bold text-gray-900">Dana Darurat</h1>
                                <p class="text-xs text-gray-500">Siap untuk keadaan tak terduga</p>
                            </div>
                        </div>
                        <button onclick="app.showEmergencyFundModal()" 
                                class="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="pb-20">
                <!-- Emergency Fund Overview -->
                <div class="px-4 pt-6">
                    <div class="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
                        
                        <div class="relative z-10 text-center">
                            <p class="text-white/90 text-sm font-medium mb-2">Dana Darurat Tersedia</p>
                            <p class="text-white text-3xl font-bold mb-4" id="emergencyFundAmount">Rp 0</p>
                            <div class="w-full bg-white/30 rounded-full h-3 mb-3">
                                <div class="bg-white h-3 rounded-full transition-all duration-500" id="emergencyProgressBar" style="width: 0%"></div>
                            </div>
                            <p class="text-white/70 text-xs" id="emergencyTargetInfo">Target: 6x pengeluaran bulanan</p>
                        </div>
                    </div>
                </div>

                <!-- Emergency Fund Stats -->
                <div class="px-4 mt-6">
                    <div class="grid grid-cols-3 gap-3">
                        <!-- Monthly Expenses -->
                        <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div class="text-center">
                                <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                    <i class="fas fa-money-bill-wave text-blue-500 text-sm"></i>
                                </div>
                                <p class="text-gray-500 text-xs font-medium mb-1">Pengeluaran Bulanan</p>
                                <p class="text-gray-900 text-lg font-bold" id="monthlyExpensesAmount">Rp 0</p>
                            </div>
                        </div>

                        <!-- Target Fund -->
                        <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div class="text-center">
                                <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                    <i class="fas fa-bullseye text-orange-500 text-sm"></i>
                                </div>
                                <p class="text-gray-500 text-xs font-medium mb-1">Target Dana</p>
                                <p class="text-gray-900 text-lg font-bold" id="targetEmergencyFund">Rp 0</p>
                            </div>
                        </div>

                        <!-- Months Covered -->
                        <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div class="text-center">
                                <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                    <i class="fas fa-calendar-alt text-green-500 text-sm"></i>
                                </div>
                                <p class="text-gray-500 text-xs font-medium mb-1">Bulan Tercover</p>
                                <p class="text-gray-900 text-lg font-bold" id="monthsCovered">0</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Emergency Fund Recommendation -->
                <div class="px-4 mt-6">
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-lightbulb text-yellow-500 text-sm"></i>
                            </div>
                            <div class="flex-1">
                                <h4 class="text-sm font-bold text-gray-900 mb-1">Rekomendasi Dana Darurat</h4>
                                <p class="text-xs text-gray-600 leading-relaxed" id="emergencyRecommendation">
                                    Dana darurat ideal adalah 6x pengeluaran bulanan. Mulai bangun dana darurat Anda.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="px-4 mt-6">
                    <h3 class="text-gray-900 text-sm font-bold mb-3">Aksi Cepat</h3>
                    <div class="grid grid-cols-4 gap-2">
                        <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center group"
                                onclick="app.showEmergencyFundModal()">
                            <div class="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center mb-1 group-hover:bg-orange-100 transition-colors">
                                <i class="fas fa-plus text-orange-500 text-xs"></i>
                            </div>
                            <span class="text-gray-600 text-xs font-medium group-hover:text-orange-600 transition-colors">Tambah</span>
                        </button>
                        
                        <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center group"
                                onclick="app.showEmergencyWithdrawModal()">
                            <div class="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center mb-1 group-hover:bg-red-100 transition-colors">
                                <i class="fas fa-download text-red-500 text-xs"></i>
                            </div>
                            <span class="text-gray-600 text-xs font-medium group-hover:text-red-600 transition-colors">Tarik</span>
                        </button>
                        
                        <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center group"
                                onclick="app.showEmergencySettings()">
                            <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-1 group-hover:bg-blue-100 transition-colors">
                                <i class="fas fa-cog text-blue-500 text-xs"></i>
                            </div>
                            <span class="text-gray-600 text-xs font-medium group-hover:text-blue-600 transition-colors">Pengaturan</span>
                        </button>
                        
                        <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center group"
                                onclick="app.showEmergencyGuide()">
                            <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-1 group-hover:bg-purple-100 transition-colors">
                                <i class="fas fa-book text-purple-500 text-xs"></i>
                            </div>
                            <span class="text-gray-600 text-xs font-medium group-hover:text-purple-600 transition-colors">Panduan</span>
                        </button>
                    </div>
                </div>

                <!-- Emergency Scenarios -->
                <div class="px-4 mt-6">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                        <div class="px-4 py-3 border-b border-gray-100">
                            <div class="flex items-center justify-between">
                                <h3 class="text-gray-900 text-sm font-bold">Skenario Darurat</h3>
                                <span class="text-orange-500 text-xs font-medium">Coverage</span>
                            </div>
                        </div>
                        <div class="divide-y divide-gray-100">
                            <!-- Medical Emergency -->
                            <div class="px-4 py-3 hover:bg-orange-50 transition-colors">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-plus-square text-red-500 text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Darurat Medis</p>
                                            <p class="text-xs text-gray-500">Rumah sakit & pengobatan</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm font-semibold text-green-500" id="medicalCoverage">100%</p>
                                        <p class="text-xs text-gray-500">Tercover</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Job Loss -->
                            <div class="px-4 py-3 hover:bg-orange-50 transition-colors">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-briefcase text-yellow-500 text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Kehilangan Pekerjaan</p>
                                            <p class="text-xs text-gray-500">6 bulan pengeluaran</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm font-semibold text-green-500" id="jobLossCoverage">100%</p>
                                        <p class="text-xs text-gray-500">Tercover</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Home Repair -->
                            <div class="px-4 py-3 hover:bg-orange-50 transition-colors">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-home text-blue-500 text-sm"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-900">Perbaikan Rumah</p>
                                            <p class="text-xs text-gray-500">Perbaikan mendadak</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm font-semibold text-green-500" id="homeRepairCoverage">100%</p>
                                        <p class="text-xs text-gray-500">Tercover</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Emergency Transactions -->
                <div class="px-4 mt-4 mb-6">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                        <div class="px-4 py-3 border-b border-gray-100">
                            <div class="flex items-center justify-between">
                                <h3 class="text-gray-900 text-sm font-bold">Transaksi Terbaru</h3>
                                <button class="text-orange-500 text-xs font-medium hover:text-orange-600 transition-colors" 
                                        onclick="app.showAllEmergencyTransactions()">
                                    Lihat Semua
                                </button>
                            </div>
                        </div>
                        <div id="emergencyTransactionsList" class="divide-y divide-gray-100">
                            <div class="px-4 py-8 text-center">
                                <i class="fas fa-shield-alt text-4xl text-gray-300 mb-3"></i>
                                <p class="text-gray-500 text-sm">Belum ada transaksi dana darurat</p>
                                <button onclick="app.showEmergencyFundModal()" 
                                        class="mt-3 bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-lg transition-colors">
                                    Tambah Dana Pertama
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Emergency Fund Modal -->
        <div id="emergencyFundModal" class="fixed inset-0 z-50 hidden">
            <div class="modal-overlay-emergency" onclick="app.hideEmergencyFundModal()"></div>
            <div class="modal-container-emergency">
                <div class="modal-content-emergency">
                    <!-- Header -->
                    <div class="modal-header-emergency">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="modal-title-emergency">Tambah Dana Darurat</h3>
                                <p class="modal-subtitle-emergency">Tambah dana untuk keadaan darurat</p>
                            </div>
                            <button onclick="app.hideEmergencyFundModal()" class="modal-close-btn-emergency">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Form -->
                    <div class="modal-body-emergency">
                        <div class="space-y-4">
                            <!-- Amount -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Jumlah Dana</label>
                                <div class="relative">
                                    <span class="currency-symbol-emergency">Rp</span>
                                    <input type="number" id="emergencyAmount" 
                                           class="form-input-emergency with-currency"
                                           placeholder="0"
                                           min="0"
                                           step="1000">
                                </div>
                            </div>

                            <!-- Date -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Tanggal</label>
                                <input type="date" id="emergencyDate" 
                                       class="form-input-emergency">
                            </div>

                            <!-- Source -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Sumber Dana</label>
                                <select id="emergencySource" class="form-select-emergency">
                                    <option value="salary">💰 Gaji</option>
                                    <option value="bonus">🎁 Bonus</option>
                                    <option value="investment">📈 Investasi</option>
                                    <option value="savings">🏦 Tabungan</option>
                                    <option value="other">📝 Lainnya</option>
                                </select>
                            </div>

                            <!-- Description -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Keterangan (Opsional)</label>
                                <textarea id="emergencyDescription" rows="3"
                                          class="form-textarea-emergency"
                                          placeholder="Tambahkan keterangan..."></textarea>
                            </div>

                            <!-- Quick Amounts -->
                            <div class="quick-amounts-section-emergency">
                                <label class="form-label-emergency">Jumlah Cepat</label>
                                <div class="quick-amounts-grid-emergency">
                                    <button type="button" class="quick-amount-btn-emergency" onclick="app.setEmergencyQuickAmount(500000)">500K</button>
                                    <button type="button" class="quick-amount-btn-emergency" onclick="app.setEmergencyQuickAmount(1000000)">1JT</button>
                                    <button type="button" class="quick-amount-btn-emergency" onclick="app.setEmergencyQuickAmount(2000000)">2JT</button>
                                    <button type="button" class="quick-amount-btn-emergency" onclick="app.setEmergencyQuickAmount(5000000)">5JT</button>
                                </div>
                            </div>

                            <!-- Progress Update -->
                            <div class="progress-update-section">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-sm font-medium text-gray-700">Progress Update</span>
                                    <span class="text-sm font-bold text-orange-600" id="progressPercentage">0%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-orange-500 h-2 rounded-full transition-all duration-500" id="progressBar" style="width: 0%"></div>
                                </div>
                                <p class="text-xs text-gray-500 mt-1" id="progressText">Menuju target dana darurat</p>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="modal-actions-emergency">
                        <button type="button" onclick="app.hideEmergencyFundModal()" class="btn-secondary-emergency">
                            <i class="fas fa-times mr-2"></i>
                            Batal
                        </button>
                        <button type="button" onclick="app.saveEmergencyFund()" class="btn-primary-emergency">
                            <i class="fas fa-shield-alt mr-2"></i>
                            Simpan Dana Darurat
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Withdraw Emergency Fund Modal -->
        <div id="emergencyWithdrawModal" class="fixed inset-0 z-50 hidden">
            <div class="modal-overlay-emergency" onclick="app.hideEmergencyWithdrawModal()"></div>
            <div class="modal-container-emergency">
                <div class="modal-content-emergency">
                    <div class="modal-header-emergency">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="modal-title-emergency">Tarik Dana Darurat</h3>
                                <p class="modal-subtitle-emergency">Hanya untuk keadaan darurat</p>
                            </div>
                            <button onclick="app.hideEmergencyWithdrawModal()" class="modal-close-btn-emergency">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="modal-body-emergency">
                        <div class="space-y-4">
                            <!-- Warning -->
                            <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div class="flex items-center space-x-2 mb-2">
                                    <i class="fas fa-exclamation-triangle text-red-500"></i>
                                    <p class="text-red-800 text-sm font-medium">Peringatan</p>
                                </div>
                                <p class="text-red-700 text-xs">Dana darurat hanya untuk keadaan darurat yang tidak terduga. Pastikan ini benar-benar kebutuhan mendesak.</p>
                            </div>

                            <!-- Available Balance -->
                            <div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-shield-alt text-orange-500"></i>
                                    <p class="text-orange-800 text-sm font-medium">Saldo Tersedia</p>
                                </div>
                                <p class="text-orange-700 text-lg font-bold mt-2" id="availableEmergencyBalance">Rp 0</p>
                            </div>

                            <!-- Amount -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Jumlah Penarikan</label>
                                <div class="relative">
                                    <span class="currency-symbol-emergency">Rp</span>
                                    <input type="number" id="emergencyWithdrawAmount" 
                                           class="form-input-emergency with-currency"
                                           placeholder="0"
                                           min="0"
                                           step="1000">
                                </div>
                            </div>

                            <!-- Emergency Type -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Jenis Keadaan Darurat</label>
                                <select id="emergencyType" class="form-select-emergency">
                                    <option value="medical">🏥 Kesehatan & Medis</option>
                                    <option value="job_loss">💼 Kehilangan Pekerjaan</option>
                                    <option value="home_repair">🏠 Perbaikan Rumah</option>
                                    <option value="vehicle">🚗 Kendaraan</option>
                                    <option value="family">👨‍👩‍👧‍👦 Keluarga</option>
                                    <option value="other">📝 Lainnya</option>
                                </select>
                            </div>

                            <!-- Emergency Description -->
                            <div class="form-group-emergency">
                                <label class="form-label-emergency">Deskripsi Keadaan Darurat</label>
                                <textarea id="emergencyWithdrawDescription" rows="3"
                                          class="form-textarea-emergency"
                                          placeholder="Jelaskan keadaan darurat yang terjadi..."
                                          required></textarea>
                            </div>

                            <!-- Confirmation -->
                            <div class="flex items-start space-x-2">
                                <input type="checkbox" id="emergencyConfirmation" class="mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500">
                                <label for="emergencyConfirmation" class="text-xs text-gray-600">
                                    Saya menyatakan bahwa ini adalah keadaan darurat yang sesungguhnya dan membutuhkan dana darurat.
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions-emergency">
                        <button type="button" onclick="app.hideEmergencyWithdrawModal()" class="btn-secondary-emergency">
                            <i class="fas fa-times mr-2"></i>
                            Batal
                        </button>
                        <button type="button" onclick="app.processEmergencyWithdrawal()" class="btn-warning-emergency">
                            <i class="fas fa-download mr-2"></i>
                            Tarik Dana Darurat
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- All Transactions Modal -->
        <div id="allEmergencyTransactionsModal" class="fixed inset-0 z-50 hidden">
            <div class="modal-overlay-emergency" onclick="app.hideAllEmergencyTransactions()"></div>
            <div class="modal-container-emergency">
                <div class="modal-content-emergency">
                    <div class="modal-header-emergency">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="modal-title-emergency">Semua Transaksi Dana Darurat</h3>
                                <p class="modal-subtitle-emergency">Riwayat lengkap transaksi</p>
                            </div>
                            <button onclick="app.hideAllEmergencyTransactions()" class="modal-close-btn-emergency">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="modal-body-emergency">
                        <div id="allEmergencyTransactionsList" class="space-y-3">
                            <!-- Transactions will be loaded here -->
                        </div>
                    </div>

                    <div class="modal-actions-emergency">
                        <button type="button" onclick="app.hideAllEmergencyTransactions()" class="btn-secondary-emergency">
                            <i class="fas fa-times mr-2"></i>
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// CSS Injection untuk Dana Darurat Modal
injectEmergencyModalCSS() {
    if (!document.getElementById('emergency-modal-css')) {
        const style = document.createElement('style');
        style.id = 'emergency-modal-css';
        style.textContent = `
            /* Emergency Modal Base Styles */
            .modal-overlay-emergency {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                animation: emergencyFadeIn 0.3s ease-out;
                z-index: 50;
            }
            
            .modal-container-emergency {
                position: fixed;
                inset: 0;
                z-index: 50;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding: 0;
                margin: 0;
            }
            
            @media (min-width: 640px) {
                .modal-container-emergency {
                    align-items: center;
                    padding: 1rem;
                }
            }
            
            .modal-content-emergency {
                background: white;
                border-radius: 24px 24px 0 0;
                box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.15);
                border: 1px solid #e5e7eb;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                width: 100%;
                margin: 0;
                transform: translateY(0);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            @media (min-width: 640px) {
                .modal-content-emergency {
                    border-radius: 24px;
                    max-width: 480px;
                    max-height: 85vh;
                    margin: auto;
                }
            }
            
            /* Header */
            .modal-header-emergency {
                background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
                color: white;
                padding: 1.5rem;
                border-radius: 24px 24px 0 0;
                flex-shrink: 0;
            }
            
            .modal-title-emergency {
                font-size: 1.25rem;
                font-weight: 700;
                line-height: 1.2;
            }
            
            .modal-subtitle-emergency {
                font-size: 0.875rem;
                opacity: 0.9;
                margin-top: 0.25rem;
            }
            
            .modal-close-btn-emergency {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
            }
            
            .modal-close-btn-emergency:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }
            
            /* Body */
            .modal-body-emergency {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem;
                background: #f8fafc;
            }
            
            /* Form Styles */
            .form-group-emergency {
                margin-bottom: 1.25rem;
            }
            
            .form-label-emergency {
                display: block;
                font-size: 0.875rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.5rem;
            }
            
            .form-input-emergency {
                width: 100%;
                padding: 0.875rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 1rem;
                background: white;
                transition: all 0.3s ease;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .form-input-emergency:focus {
                outline: none;
                border-color: #f97316;
                box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                transform: translateY(-1px);
            }
            
            .form-input-emergency.with-currency {
                padding-left: 2.5rem;
            }
            
            .currency-symbol-emergency {
                position: absolute;
                left: 1rem;
                top: 50%;
                transform: translateY(-50%);
                color: #6b7280;
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .form-select-emergency {
                appearance: none;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                background-position: right 1rem center;
                background-repeat: no-repeat;
                background-size: 1rem;
                cursor: pointer;
            }
            
            .form-textarea-emergency {
                width: 100%;
                padding: 0.875rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 0.875rem;
                background: white;
                transition: all 0.3s ease;
                resize: vertical;
                min-height: 80px;
            }
            
            .form-textarea-emergency:focus {
                outline: none;
                border-color: #f97316;
                box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
            }
            
            /* Quick Amounts */
            .quick-amounts-section-emergency {
                margin-top: 1.5rem;
            }
            
            .quick-amounts-grid-emergency {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }
            
            @media (min-width: 640px) {
                .quick-amounts-grid-emergency {
                    grid-template-columns: repeat(4, 1fr);
                }
            }
            
            .quick-amount-btn-emergency {
                padding: 0.75rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                background: white;
                color: #374151;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .quick-amount-btn-emergency:hover {
                border-color: #f97316;
                color: #f97316;
                transform: translateY(-1px);
            }
            
            .quick-amount-btn-emergency:active {
                transform: translateY(0);
            }
            
            /* Progress Section */
            .progress-update-section {
                background: white;
                border: 2px solid #fef3c7;
                border-radius: 16px;
                padding: 1rem;
                margin-top: 1rem;
            }
            
            /* Actions */
            .modal-actions-emergency {
                background: white;
                padding: 1.25rem 1.5rem;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.75rem;
                flex-shrink: 0;
            }
            
            .btn-primary-emergency {
                flex: 1;
                background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
                color: white;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
            }
            
            .btn-primary-emergency:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
            }
            
            .btn-primary-emergency:active {
                transform: translateY(0);
            }
            
            .btn-secondary-emergency {
                flex: 1;
                background: white;
                color: #374151;
                border: 2px solid #e5e7eb;
                padding: 1rem 1.5rem;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .btn-secondary-emergency:hover {
                border-color: #f97316;
                color: #f97316;
                transform: translateY(-1px);
            }
            
            .btn-warning-emergency {
                flex: 1;
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: white;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
            }
            
            .btn-warning-emergency:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
            }
            
            /* Animations */
            @keyframes emergencyFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes emergencySlideUp {
                from { 
                    transform: translateY(100%);
                    opacity: 0;
                }
                to { 
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .modal-content-emergency {
                animation: emergencySlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Mobile Optimizations */
            @media (max-width: 640px) {
                .modal-body-emergency {
                    padding: 1.25rem;
                }
                
                .modal-actions-emergency {
                    padding: 1rem 1.25rem;
                }
                
                .form-input-emergency,
                .form-select-emergency,
                .form-textarea-emergency {
                    font-size: 16px;
                }
                
                .quick-amounts-grid-emergency {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            /* Scrollbar Styling */
            .modal-body-emergency::-webkit-scrollbar {
                width: 4px;
            }
            
            .modal-body-emergency::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 2px;
            }
            
            .modal-body-emergency::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 2px;
            }
            
            .modal-body-emergency::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            /* Touch Improvements */
            @media (hover: none) {
                .btn-primary-emergency:hover,
                .btn-secondary-emergency:hover,
                .btn-warning-emergency:hover,
                .quick-amount-btn-emergency:hover {
                    transform: none;
                }
                
                .modal-close-btn-emergency:hover {
                    transform: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== EMERGENCY FUND METHODS ====================

// Show emergency fund modal
showEmergencyFundModal() {
    const modal = document.getElementById('emergencyFundModal');
    if (modal) {
        modal.classList.remove('hidden');
        this.injectEmergencyModalCSS();
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('emergencyDate').value = today;
    }
}

// Hide emergency fund modal
hideEmergencyFundModal() {
    const modal = document.getElementById('emergencyFundModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Show emergency withdraw modal
showEmergencyWithdrawModal() {
    const modal = document.getElementById('emergencyWithdrawModal');
    if (modal) {
        modal.classList.remove('hidden');
        this.injectEmergencyModalCSS();
        // Set available balance
        const availableBalance = document.getElementById('availableEmergencyBalance');
        if (availableBalance) {
            const currentAmount = document.getElementById('emergencyFundAmount').textContent;
            availableBalance.textContent = currentAmount;
        }
    }
}

// Hide emergency withdraw modal
hideEmergencyWithdrawModal() {
    const modal = document.getElementById('emergencyWithdrawModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Show all emergency transactions
showAllEmergencyTransactions() {
    const modal = document.getElementById('allEmergencyTransactionsModal');
    if (modal) {
        modal.classList.remove('hidden');
        this.injectEmergencyModalCSS();
        this.loadAllEmergencyTransactions();
    }
}

// Hide all emergency transactions
hideAllEmergencyTransactions() {
    const modal = document.getElementById('allEmergencyTransactionsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Set emergency quick amount
setEmergencyQuickAmount(amount) {
    const amountInput = document.getElementById('emergencyAmount');
    if (amountInput) {
        amountInput.value = amount;
        // Trigger progress update
        this.updateEmergencyProgress();
    }
}

// Update emergency progress
updateEmergencyProgress() {
    const amountInput = document.getElementById('emergencyAmount');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressText = document.getElementById('progressText');
    
    if (amountInput && progressBar && progressPercentage && progressText) {
        const amount = parseFloat(amountInput.value) || 0;
        // This would typically compare with target amount
        const targetAmount = 10000000; // Example target
        const progress = Math.min((amount / targetAmount) * 100, 100);
        
        progressBar.style.width = `${progress}%`;
        progressPercentage.textContent = `${progress.toFixed(1)}%`;
        
        if (progress >= 100) {
            progressText.textContent = 'Target tercapai!';
        } else {
            progressText.textContent = 'Menuju target dana darurat';
        }
    }
}

// Save emergency fund
async saveEmergencyFund() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const amount = parseFloat(document.getElementById('emergencyAmount').value);
        const date = document.getElementById('emergencyDate').value;
        const source = document.getElementById('emergencySource').value;
        const description = document.getElementById('emergencyDescription').value;

        // Validation
        if (!amount || amount <= 0) {
            this.showNotification('Masukkan jumlah yang valid', 'error');
            return;
        }

        if (!date) {
            this.showNotification('Pilih tanggal transaksi', 'error');
            return;
        }

        const emergencyData = {
            userId: currentUser.uid,
            type: 'deposit',
            amount: amount,
            date: new Date(date),
            source: source,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('emergency_funds').add(emergencyData);
        
        this.showNotification('Dana darurat berhasil ditambahkan! 🛡️', 'success');
        this.hideEmergencyFundModal();
        
        // Refresh data
        this.loadEmergencyFundData();
        
    } catch (error) {
        console.error('Error saving emergency fund:', error);
        this.showNotification('Gagal menambah dana darurat', 'error');
    }
}

// Process emergency withdrawal
async processEmergencyWithdrawal() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const amount = parseFloat(document.getElementById('emergencyWithdrawAmount').value);
        const emergencyType = document.getElementById('emergencyType').value;
        const description = document.getElementById('emergencyWithdrawDescription').value;
        const confirmation = document.getElementById('emergencyConfirmation').checked;

        // Validation
        if (!amount || amount <= 0) {
            this.showNotification('Masukkan jumlah yang valid', 'error');
            return;
        }

        if (!description) {
            this.showNotification('Deskripsi keadaan darurat harus diisi', 'error');
            return;
        }

        if (!confirmation) {
            this.showNotification('Konfirmasi keadaan darurat diperlukan', 'error');
            return;
        }

        const withdrawalData = {
            userId: currentUser.uid,
            type: 'withdrawal',
            amount: amount,
            emergencyType: emergencyType,
            description: description,
            date: new Date(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('emergency_funds').add(withdrawalData);
        
        this.showNotification('Penarikan dana darurat berhasil diproses', 'success');
        this.hideEmergencyWithdrawModal();
        
        // Refresh data
        this.loadEmergencyFundData();
        
    } catch (error) {
        console.error('Error processing emergency withdrawal:', error);
        this.showNotification('Gagal memproses penarikan dana darurat', 'error');
    }
}

// Load emergency fund data
async loadEmergencyFundData() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    try {
        // Load emergency fund transactions
        const snapshot = await this.db.collection('emergency_funds')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .limit(10)
            .get();

        this.updateEmergencyFundUI(snapshot);
        
    } catch (error) {
        console.error('Error loading emergency fund data:', error);
    }
}

// Update emergency fund UI
updateEmergencyFundUI(snapshot) {
    let totalBalance = 0;
    const transactions = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'deposit') {
            totalBalance += data.amount;
        } else if (data.type === 'withdrawal') {
            totalBalance -= data.amount;
        }
        transactions.push({
            id: doc.id,
            ...data
        });
    });

    // Update UI elements
    this.updateEmergencyFundElements(totalBalance, transactions);
}

// Update emergency fund elements
updateEmergencyFundElements(totalBalance, transactions) {
    // Update main balance
    const balanceElement = document.getElementById('emergencyFundAmount');
    if (balanceElement) {
        balanceElement.textContent = this.formatRupiah(totalBalance);
    }

    // Update progress bar (example calculation)
    const monthlyExpenses = 5000000; // This should come from user settings
    const targetAmount = monthlyExpenses * 6;
    const progress = Math.min((totalBalance / targetAmount) * 100, 100);
    
    const progressBar = document.getElementById('emergencyProgressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }

    // Update stats
    const monthlyExpensesElement = document.getElementById('monthlyExpensesAmount');
    const targetFundElement = document.getElementById('targetEmergencyFund');
    const monthsCoveredElement = document.getElementById('monthsCovered');

    if (monthlyExpensesElement) {
        monthlyExpensesElement.textContent = this.formatRupiah(monthlyExpenses);
    }
    if (targetFundElement) {
        targetFundElement.textContent = this.formatRupiah(targetAmount);
    }
    if (monthsCoveredElement) {
        const monthsCovered = Math.floor(totalBalance / monthlyExpenses);
        monthsCoveredElement.textContent = monthsCovered;
    }

    // Update recommendation
    this.updateEmergencyRecommendation(totalBalance, targetAmount);

    // Update transactions list
    this.renderEmergencyTransactions(transactions);
}

// Update emergency recommendation
updateEmergencyRecommendation(currentBalance, targetAmount) {
    const recommendationElement = document.getElementById('emergencyRecommendation');
    if (!recommendationElement) return;

    const progress = (currentBalance / targetAmount) * 100;
    
    if (progress >= 100) {
        recommendationElement.textContent = 'Dana darurat Anda sudah ideal! Pertahankan untuk keamanan finansial.';
    } else if (progress >= 75) {
        recommendationElement.textContent = 'Dana darurat hampir mencapai target ideal. Tingkatkan sedikit lagi!';
    } else if (progress >= 50) {
        recommendationElement.textContent = 'Dana darurat sudah setengah jalan. Lanjutkan konsisten menabung!';
    } else if (progress >= 25) {
        recommendationElement.textContent = 'Dana darurat sudah mulai terbentuk. Tetap semangat menabung!';
    } else {
        recommendationElement.textContent = 'Mulai bangun dana darurat Anda. Target ideal adalah 6x pengeluaran bulanan.';
    }
}

// Render emergency transactions
renderEmergencyTransactions(transactions) {
    const transactionsList = document.getElementById('emergencyTransactionsList');
    if (!transactionsList) return;

    if (transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="px-4 py-8 text-center">
                <i class="fas fa-shield-alt text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500 text-sm">Belum ada transaksi dana darurat</p>
                <button onclick="app.showEmergencyFundModal()" 
                        class="mt-3 bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-lg transition-colors">
                    Tambah Dana Pertama
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    transactions.slice(0, 5).forEach(transaction => {
        const isDeposit = transaction.type === 'deposit';
        const amountClass = isDeposit ? 'text-green-500' : 'text-red-500';
        const amountPrefix = isDeposit ? '+' : '-';
        const icon = isDeposit ? 'fa-plus-circle' : 'fa-download';
        const iconColor = isDeposit ? 'text-green-500' : 'text-red-500';
        
        html += `
            <div class="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <i class="fas ${icon} ${iconColor} text-sm"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">
                                ${isDeposit ? 'Setoran Dana' : 'Penarikan Darurat'}
                            </p>
                            <p class="text-xs text-gray-500">
                                ${this.formatDate(transaction.date)}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-semibold ${amountClass}">
                            ${amountPrefix} ${this.formatRupiah(transaction.amount)}
                        </p>
                        <p class="text-xs text-gray-500">
                            ${transaction.source || transaction.emergencyType || ''}
                        </p>
                    </div>
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
}

// Load all emergency transactions
async loadAllEmergencyTransactions() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    try {
        const snapshot = await this.db.collection('emergency_funds')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();

        this.renderAllEmergencyTransactions(snapshot);
        
    } catch (error) {
        console.error('Error loading all emergency transactions:', error);
    }
}

// Render all emergency transactions
renderAllEmergencyTransactions(snapshot) {
    const transactionsList = document.getElementById('allEmergencyTransactionsList');
    if (!transactionsList) return;

    if (snapshot.empty) {
        transactionsList.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-shield-alt text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500 text-sm">Belum ada transaksi dana darurat</p>
            </div>
        `;
        return;
    }

    let html = '';
    snapshot.forEach(doc => {
        const transaction = doc.data();
        const isDeposit = transaction.type === 'deposit';
        const amountClass = isDeposit ? 'text-green-500' : 'text-red-500';
        const amountPrefix = isDeposit ? '+' : '-';
        const icon = isDeposit ? 'fa-plus-circle' : 'fa-download';
        const iconColor = isDeposit ? 'text-green-500' : 'text-red-500';
        const typeText = isDeposit ? 'Setoran' : 'Penarikan Darurat';
        const description = transaction.description || transaction.source || transaction.emergencyType || '';
        
        html += `
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <i class="fas ${icon} ${iconColor}"></i>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-900">${typeText}</p>
                            <p class="text-xs text-gray-500">${description}</p>
                            <p class="text-xs text-gray-400 mt-1">${this.formatDate(transaction.date)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold ${amountClass}">
                            ${amountPrefix} ${this.formatRupiah(transaction.amount)}
                        </p>
                    </div>
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
}

// Format date helper
formatDate(date) {
    if (!date) return '';
    
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Placeholder methods for unimplemented features
showEmergencySettings() {
    this.showNotification('Pengaturan dana darurat akan datang', 'info');
}

showEmergencyGuide() {
    this.showNotification('Panduan dana darurat akan datang', 'info');
}

renderPemasukanPage() {
    return `
        <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            <div class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                                    onclick="app.loadContent('dashboard')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-lg font-semibold text-gray-900">Pemasukan</h1>
                                <p class="text-xs text-gray-500">Kelola keuangan Anda</p>
                            </div>
                        </div>
                        <button onclick="app.showTambahPemasukanModal()" 
                                class="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- AI Insights Banner -->
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 mx-4 mt-4 rounded-xl shadow-sm">
                <div class="p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <div class="bg-white/20 p-1 rounded">
                                    <i class="fas fa-robot text-white text-sm"></i>
                                </div>
                                <span class="text-white text-sm font-medium">AI Insights</span>
                            </div>
                            <div id="aiAnalysisContent">
                                <div class="animate-pulse space-y-2">
                                    <div class="h-3 bg-blue-400 rounded w-4/5"></div>
                                    <div class="h-3 bg-blue-400 rounded w-3/5"></div>
                                    <div class="h-3 bg-blue-400 rounded w-2/3"></div>
                                </div>
                            </div>
                        </div>
                        <button onclick="app.refreshAIAnalysis()" 
                                class="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                            <i class="fas fa-sync-alt text-white text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-3 px-4 mt-4">
                <!-- Total Pemasukan -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 font-medium">Total</p>
                            <h3 class="text-lg font-bold text-gray-900 mt-1" id="totalPemasukan">Rp 0</h3>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg">
                            <i class="fas fa-wallet text-green-500 text-sm"></i>
                        </div>
                    </div>
                </div>

                <!-- Bulan Ini -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 font-medium">Bulan Ini</p>
                            <h3 class="text-lg font-bold text-gray-900 mt-1" id="pemasukanBulanIni">Rp 0</h3>
                            <p class="text-xs text-gray-400 mt-1" id="growthIndicator">-</p>
                        </div>
                        <div class="bg-blue-50 p-2 rounded-lg">
                            <i class="fas fa-calendar text-blue-500 text-sm"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="px-4 mt-4">
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex space-x-3">
                        <button onclick="app.showTambahPemasukanModal()" 
                                class="flex-1 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 transition-colors">
                            <div class="flex flex-col items-center space-y-2">
                                <div class="bg-green-500 p-2 rounded-lg">
                                    <i class="fas fa-plus text-white text-sm"></i>
                                </div>
                                <span class="text-xs font-medium text-gray-700">Tambah</span>
                            </div>
                        </button>
                        <button onclick="app.exportToExcel()" 
                                class="flex-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 transition-colors">
                            <div class="flex flex-col items-center space-y-2">
                                <div class="bg-blue-500 p-2 rounded-lg">
                                    <i class="fas fa-download text-white text-sm"></i>
                                </div>
                                <span class="text-xs font-medium text-gray-700">Export</span>
                            </div>
                        </button>
                        <button onclick="app.refreshAIAnalysis()" 
                                class="flex-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-3 transition-colors">
                            <div class="flex flex-col items-center space-y-2">
                                <div class="bg-purple-500 p-2 rounded-lg">
                                    <i class="fas fa-sync-alt text-white text-sm"></i>
                                </div>
                                <span class="text-xs font-medium text-gray-700">Refresh</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Transaction List -->
            <div class="px-4 mt-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <!-- Header -->
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-gray-900">Transaksi Terbaru</h3>
                            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full" id="jumlahTransaksi">0</span>
                        </div>
                    </div>

                    <!-- List -->
                    <div id="pemasukanTableBody">
                        <!-- Data akan diisi oleh JavaScript -->
                        <div class="py-8 text-center">
                            <i class="fas fa-wallet text-3xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 text-sm">Memuat data...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

            <!-- Modal Pemasukan dengan CSS inline -->
            <div id="pemasukanModal" class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 hidden px-2 sm:px-0">
                <style>
                    .modal-slide-up {
                        animation: modalSlideUp 0.3s ease-out;
                    }
                    
                    @keyframes modalSlideUp {
                        from { 
                            transform: translateY(100%); 
                            opacity: 0;
                        }
                        to { 
                            transform: translateY(0); 
                            opacity: 1;
                        }
                    }
                    
                    .modal-slide-down {
                        animation: modalSlideDown 0.3s ease-in;
                    }
                    
                    @keyframes modalSlideDown {
                        from { 
                            transform: translateY(0); 
                            opacity: 1;
                        }
                        to { 
                            transform: translateY(100%); 
                            opacity: 0;
                        }
                    }
                    
                    .select-custom {
                        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                        background-position: right 0.75rem center;
                        background-repeat: no-repeat;
                        background-size: 1.5em 1.5em;
                        padding-right: 2.5rem;
                    }
                    
                    input[type='number']::-webkit-outer-spin-button,
                    input[type='number']::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    
                    input[type='number'] {
                        -moz-appearance: textfield;
                    }
                    
                    @media (max-width: 640px) {
                        .mobile-input {
                            font-size: 16px;
                        }
                    }
                </style>
                
                <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden modal-slide-up">
                    <!-- Header -->
                    <div class="px-4 py-4 border-b border-gray-100 bg-white sticky top-0">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-900">Tambah Pemasukan</h3>
                            <button onclick="app.hidePemasukanModal()" 
                                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200 touch-manipulation">
                                <i class="fas fa-times text-gray-500 text-lg"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Form -->
                    <div class="p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                        <!-- Tanggal -->
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                            <input type="date" id="tanggal" required
                                   class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 placeholder-gray-400 text-gray-900 touch-manipulation">
                        </div>

                        <!-- Kategori -->
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select id="kategori" required
                                    class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 select-custom cursor-pointer touch-manipulation">
                                <option value="">Pilih Kategori</option>
                                <option value="gaji">💰 Gaji</option>
                                <option value="freelance">💻 Freelance</option>
                                <option value="investasi">📈 Investasi</option>
                                <option value="bonus">🎁 Bonus</option>
                                <option value="lainnya">📋 Lainnya</option>
                            </select>
                        </div>

                        <!-- Deskripsi -->
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                            <input type="text" id="deskripsi" required
                                   class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 placeholder-gray-400 touch-manipulation"
                                   placeholder="Contoh: Gaji bulan Januari">
                        </div>

                        <!-- Jumlah -->
                        <div class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">Rp</span>
                                <input type="number" id="jumlah" required min="0" step="1000"
                                       class="w-full pl-12 pr-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 placeholder-gray-400 text-gray-900 touch-manipulation"
                                       placeholder="0">
                            </div>
                            <p class="text-xs text-gray-500 mt-1">Gunakan angka tanpa titik/koma</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="px-4 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                        <div class="flex space-x-3">
                            <button type="button" onclick="app.hidePemasukanModal()"
                                    class="flex-1 px-4 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 font-semibold text-sm touch-manipulation active:scale-95">
                                Batal
                            </button>
                            <button type="button" onclick="app.savePemasukan()"
                                    class="flex-1 px-4 py-3.5 bg-green-500 text-white rounded-xl hover:bg-green-600 active:bg-green-700 transition-all duration-200 font-semibold text-sm shadow-sm touch-manipulation active:scale-95">
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// Update function untuk mobile view
updatePemasukanUI() {
    const tableBody = document.getElementById('pemasukanTableBody');
    if (!tableBody) return;

    // Loading state
    if (this.pemasukanData === null) {
        tableBody.innerHTML = `
            <div class="py-8 text-center">
                <i class="fas fa-spinner fa-spin text-2xl text-gray-300 mb-3"></i>
                <p class="text-gray-500 text-sm">Memuat data...</p>
            </div>
        `;
        return;
    }

    // Empty state
    if (this.pemasukanData.length === 0) {
        tableBody.innerHTML = `
            <div class="py-12 text-center">
                <i class="fas fa-wallet text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-sm mb-2">Belum ada data pemasukan</p>
                <p class="text-gray-400 text-xs">Klik tombol + untuk menambah</p>
            </div>
        `;
        this.updatePemasukanStats(0, 0, 0);
        return;
    }

    // Hitung stats
    const totalPemasukan = this.pemasukanData.reduce((sum, item) => sum + (item.amount || 0), 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const pemasukanBulanIni = this.pemasukanData
        .filter(item => {
            const itemDate = item.date;
            return itemDate.getMonth() === currentMonth && 
                   itemDate.getFullYear() === currentYear;
        })
        .reduce((sum, item) => sum + (item.amount || 0), 0);

    // Update stats
    this.updatePemasukanStats(totalPemasukan, pemasukanBulanIni, this.pemasukanData.length);

    // Render list items untuk mobile
    tableBody.innerHTML = this.pemasukanData.map(item => {
        const dateDisplay = item.date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const amountDisplay = new Intl.NumberFormat('id-ID').format(item.amount || 0);

        const categoryIcons = {
            'gaji': 'fas fa-briefcase',
            'freelance': 'fas fa-laptop',
            'investasi': 'fas fa-chart-line',
            'bonus': 'fas fa-gift',
            'lainnya': 'fas fa-star'
        };

        const categoryColors = {
            'gaji': 'bg-blue-100 text-blue-600',
            'freelance': 'bg-green-100 text-green-600',
            'investasi': 'bg-purple-100 text-purple-600',
            'bonus': 'bg-yellow-100 text-yellow-600',
            'lainnya': 'bg-gray-100 text-gray-600'
        };

        const iconClass = categoryIcons[item.category] || categoryIcons['lainnya'];
        const colorClass = categoryColors[item.category] || categoryColors['lainnya'];

        return `
            <div class="border-b border-gray-100 last:border-b-0">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3 flex-1 min-w-0">
                            <div class="${colorClass} p-2 rounded-lg">
                                <i class="${iconClass} text-sm"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 truncate">${item.description}</p>
                                <div class="flex items-center space-x-2 mt-1">
                                    <span class="text-xs text-gray-500 capitalize">${item.category}</span>
                                    <span class="text-gray-300">•</span>
                                    <span class="text-xs text-gray-500">${dateDisplay}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right ml-3">
                            <p class="text-sm font-semibold text-green-600">Rp ${amountDisplay}</p>
                            <div class="flex space-x-1 mt-1">
                                <button class="text-blue-500 hover:text-blue-700 p-1 transition-colors"
                                        onclick="app.editPemasukan('${item.id}')">
                                    <i class="fas fa-edit text-xs"></i>
                                </button>
                                <button class="text-red-500 hover:text-red-700 p-1 transition-colors"
                                        onclick="app.deletePemasukan('${item.id}')">
                                    <i class="fas fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update stats function
updatePemasukanStats(total, bulanIni, jumlah) {
    const totalElement = document.getElementById('totalPemasukan');
    const bulanIniElement = document.getElementById('pemasukanBulanIni');
    const jumlahElement = document.getElementById('jumlahTransaksi');
    const growthElement = document.getElementById('growthIndicator');

    if (totalElement) totalElement.textContent = `Rp ${this.formatCompactNumber(total)}`;
    if (bulanIniElement) bulanIniElement.textContent = `Rp ${this.formatCompactNumber(bulanIni)}`;
    if (jumlahElement) jumlahElement.textContent = jumlah.toString();
    
    // Simple growth indicator
    if (growthElement) {
        growthElement.textContent = `${jumlah} transaksi`;
    }
}

// Helper untuk format number compact
formatCompactNumber(number) {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'Jt';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(0) + 'Rb';
    }
    return number.toLocaleString('id-ID');
}

// Update AI Analysis untuk mobile
async updateAIAnalysis() {
    try {
        const analysis = await this.getAIAnalysis();
        const analysisElement = document.getElementById('aiAnalysisContent');
        
        if (analysis && analysisElement) {
            analysisElement.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between items-center text-white text-sm">
                        <span>Total</span>
                        <span class="font-semibold">${analysis.pemasukan}</span>
                    </div>
                    <div class="flex justify-between items-center text-white text-sm">
                        <span>Growth</span>
                        <span class="font-semibold ${analysis.growth.includes('-') ? 'text-red-300' : 'text-green-300'}">
                            ${analysis.growth}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-blue-400">
                        <div class="text-center">
                            <p class="text-white text-xs opacity-90 mb-1">Analisa</p>
                            <p class="text-white text-sm font-semibold">${analysis.analisa}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-white text-xs opacity-90 mb-1">Solusi</p>
                            <p class="text-white text-sm font-semibold">${analysis.solusi}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating AI analysis:', error);
        const analysisElement = document.getElementById('aiAnalysisContent');
        if (analysisElement) {
            analysisElement.innerHTML = `
                <div class="text-center text-white text-sm">
                    <p>Gagal memuat analisa</p>
                </div>
            `;
        }
    }
}

 renderPengeluaranPage() {
    return `
        <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            <div class="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                                    onclick="app.loadContent('dashboard')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-lg font-semibold text-gray-900">Pengeluaran</h1>
                                <p class="text-xs text-gray-500">Kelola pengeluaran Anda</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="app.showScanReceiptModal()" 
                                    class="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-camera"></i>
                            </button>
                            <button onclick="app.showTambahPengeluaranModal()" 
                                    class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- AI Insights Banner -->
            <div class="bg-gradient-to-r from-red-500 to-orange-500 mx-4 mt-4 rounded-xl shadow-sm">
                <div class="p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <div class="bg-white/20 p-1 rounded">
                                    <i class="fas fa-robot text-white text-sm"></i>
                                </div>
                                <span class="text-white text-sm font-medium">AI Spending Insights</span>
                            </div>
                            <div id="pengeluaranAIAnalysisContent">
                                <div class="animate-pulse space-y-2">
                                    <div class="h-3 bg-red-400 rounded w-4/5"></div>
                                    <div class="h-3 bg-red-400 rounded w-3/5"></div>
                                    <div class="h-3 bg-red-400 rounded w-2/3"></div>
                                </div>
                            </div>
                        </div>
                        <button onclick="app.refreshPengeluaranAIAnalysis()" 
                                class="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
                            <i class="fas fa-sync-alt text-white text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-3 px-4 mt-4">
                <!-- Total Pengeluaran -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 font-medium">Total</p>
                            <h3 class="text-lg font-bold text-gray-900 mt-1" id="totalPengeluaran">Rp 0</h3>
                        </div>
                        <div class="bg-red-50 p-2 rounded-lg">
                            <i class="fas fa-money-bill-wave text-red-500 text-sm"></i>
                        </div>
                    </div>
                </div>

                <!-- Bulan Ini -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 font-medium">Bulan Ini</p>
                            <h3 class="text-lg font-bold text-gray-900 mt-1" id="pengeluaranBulanIni">Rp 0</h3>
                            <p class="text-xs text-gray-400 mt-1" id="pengeluaranGrowthIndicator">-</p>
                        </div>
                        <div class="bg-orange-50 p-2 rounded-lg">
                            <i class="fas fa-calendar text-orange-500 text-sm"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Additional Stats -->
            <div class="grid grid-cols-2 gap-3 px-4 mt-3">
                <!-- Jumlah Transaksi -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 font-medium">Transaksi</p>
                            <h3 class="text-lg font-bold text-gray-900 mt-1" id="jumlahTransaksiPengeluaran">0</h3>
                        </div>
                        <div class="bg-purple-50 p-2 rounded-lg">
                            <i class="fas fa-receipt text-purple-500 text-sm"></i>
                        </div>
                    </div>
                </div>

                <!-- Rata-rata -->
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 font-medium">Rata-rata</p>
                            <h3 class="text-lg font-bold text-gray-900 mt-1" id="rataRataPengeluaran">Rp 0</h3>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg">
                            <i class="fas fa-chart-line text-green-500 text-sm"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="px-4 mt-4">
                <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div class="flex space-x-3">
                        <button onclick="app.showTambahPengeluaranModal()" 
                                class="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-3 transition-colors">
                            <div class="flex flex-col items-center space-y-2">
                                <div class="bg-red-500 p-2 rounded-lg">
                                    <i class="fas fa-plus text-white text-sm"></i>
                                </div>
                                <span class="text-xs font-medium text-gray-700">Tambah</span>
                            </div>
                        </button>
                        <button onclick="app.showScanReceiptModal()" 
                                class="flex-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-3 transition-colors">
                            <div class="flex flex-col items-center space-y-2">
                                <div class="bg-purple-500 p-2 rounded-lg">
                                    <i class="fas fa-camera text-white text-sm"></i>
                                </div>
                                <span class="text-xs font-medium text-gray-700">Scan Struk</span>
                            </div>
                        </button>
                        <button onclick="app.refreshPengeluaranAIAnalysis()" 
                                class="flex-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg p-3 transition-colors">
                            <div class="flex flex-col items-center space-y-2">
                                <div class="bg-orange-500 p-2 rounded-lg">
                                    <i class="fas fa-sync-alt text-white text-sm"></i>
                                </div>
                                <span class="text-xs font-medium text-gray-700">Refresh AI</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Transaction List -->
            <div class="px-4 mt-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <!-- Header -->
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-gray-900">Transaksi Terbaru</h3>
                            <span class="text-xs text-gray-500">Total: <span id="totalTransaksiDisplay">0</span></span>
                        </div>
                    </div>

                    <!-- List -->
                    <div id="pengeluaranTableBody">
                        <div class="py-8 text-center">
                            <i class="fas fa-receipt text-3xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 text-sm">Memuat data...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Pengeluaran Manual -->
        <div id="pengeluaranModal" class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 hidden px-2 sm:px-0">
            <style>
                .pengeluaran-modal-slide-up {
                    animation: pengeluaranModalSlideUp 0.3s ease-out;
                }
                
                @keyframes pengeluaranModalSlideUp {
                    from { 
                        transform: translateY(100%); 
                        opacity: 0;
                    }
                    to { 
                        transform: translateY(0); 
                        opacity: 1;
                    }
                }
            </style>
            
            <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden pengeluaran-modal-slide-up">
                <!-- Header -->
                <div class="px-4 py-4 border-b border-gray-100 bg-white sticky top-0">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900" id="modalTitlePengeluaran">Tambah Pengeluaran</h3>
                        <button onclick="app.hidePengeluaranModal()" 
                                class="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200 touch-manipulation">
                            <i class="fas fa-times text-gray-500 text-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- Form -->
                <div class="p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                    <!-- Tanggal -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                        <input type="date" id="tanggalPengeluaran" required
                               class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400 text-gray-900 touch-manipulation">
                    </div>

                    <!-- Kategori -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                        <select id="kategoriPengeluaran" required
                                class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 select-custom cursor-pointer touch-manipulation">
                            <option value="">Pilih Kategori</option>
                            <option value="makanan-minuman">🍔 Makanan & Minuman</option>
                            <option value="transportasi">🚗 Transportasi</option>
                            <option value="hiburan">🎬 Hiburan</option>
                            <option value="belanja">🛍️ Belanja</option>
                            <option value="tagihan">📄 Tagihan</option>
                            <option value="kesehatan">🏥 Kesehatan</option>
                            <option value="pendidikan">📚 Pendidikan</option>
                            <option value="lainnya">📋 Lainnya</option>
                        </select>
                    </div>

                    <!-- Deskripsi -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                        <input type="text" id="deskripsiPengeluaran" required
                               class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400 touch-manipulation"
                               placeholder="Contoh: Makan siang di restoran">
                    </div>

                    <!-- Jumlah -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                        <div class="relative">
                            <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">Rp</span>
                            <input type="number" id="jumlahPengeluaran" required min="0" step="1000"
                                   class="w-full pl-12 pr-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400 text-gray-900 touch-manipulation"
                                   placeholder="0">
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Gunakan angka tanpa titik/koma</p>
                    </div>

                    <!-- Metode Pembayaran -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                        <select id="metodePembayaran"
                                class="w-full px-4 py-3 mobile-input bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 select-custom cursor-pointer touch-manipulation">
                            <option value="tunai">💵 Tunai</option>
                            <option value="debit">💳 Kartu Debit</option>
                            <option value="kredit">💳 Kartu Kredit</option>
                            <option value="e-wallet">📱 E-Wallet</option>
                            <option value="transfer">🏦 Transfer Bank</option>
                        </select>
                    </div>
                </div>

                <!-- Actions -->
                <div class="px-4 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                    <div class="flex space-x-3">
                        <button type="button" onclick="app.hidePengeluaranModal()"
                                class="flex-1 px-4 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 font-semibold text-sm touch-manipulation active:scale-95">
                            Batal
                        </button>
                        <button type="button" onclick="app.savePengeluaran()"
                                class="flex-1 px-4 py-3.5 bg-red-500 text-white rounded-xl hover:bg-red-600 active:bg-red-700 transition-all duration-200 font-semibold text-sm shadow-sm touch-manipulation active:scale-95">
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Scan Struk (Sesuaikan juga dengan style yang sama) -->
        <div id="scanReceiptModal" class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 hidden px-2 sm:px-0">
            <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden pengeluaran-modal-slide-up">
                <!-- Header -->
                <div class="px-4 py-4 border-b border-gray-100 bg-white sticky top-0">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900">Scan Struk Belanja</h3>
                        <button onclick="app.hideScanReceiptModal()" 
                                class="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200 touch-manipulation">
                            <i class="fas fa-times text-gray-500 text-lg"></i>
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">Unggah foto struk untuk ekstrak otomatis</p>
                </div>

                <!-- Content -->
                <div class="p-4 space-y-4 overflow-y-auto bg-gray-50/50">
                    <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                        <i class="fas fa-receipt text-3xl text-gray-400 mb-3"></i>
                        <p class="text-gray-600 mb-2">Unggah foto struk belanja Anda</p>
                        <p class="text-sm text-gray-500 mb-4">Format: JPG, PNG (Maks. 10MB)</p>
                        <input type="file" id="receiptImage" accept="image/*" class="hidden" onchange="app.handleImageUpload(event)">
                        <button onclick="document.getElementById('receiptImage').click()" 
                                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-medium transition-colors active:scale-95">
                            Pilih File
                        </button>
                    </div>

                    <div id="scanProgress" class="hidden">
                        <div class="flex items-center justify-center space-x-2 p-4 bg-blue-50 rounded-xl">
                            <i class="fas fa-spinner fa-spin text-blue-500"></i>
                            <span class="text-blue-700 font-medium">Memproses struk...</span>
                        </div>
                    </div>

                    <div id="scanError" class="hidden bg-red-50 border border-red-200 rounded-xl p-4">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-exclamation-triangle text-red-500"></i>
                            <span class="text-red-700 font-medium" id="scanErrorMessage">Error message</span>
                        </div>
                    </div>

                    <div id="scanResults" class="hidden space-y-4">
                        <h4 class="font-semibold text-gray-800">Hasil Scan:</h4>
                        <div class="bg-white border border-gray-200 rounded-xl p-4">
                            <div class="flex justify-between items-center mb-3">
                                <span class="font-medium text-gray-900" id="scanStoreName">Toko</span>
                                <span class="text-sm text-gray-600" id="scanDate">Tanggal</span>
                            </div>
                            <div id="scanItemsList" class="space-y-3">
                                <!-- Items akan diisi dinamis -->
                            </div>
                        </div>
                        <button onclick="app.saveScannedItems()" 
                                class="w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-medium transition-colors active:scale-95">
                            Simpan Semua Item
                        </button>
                    </div>
                </div>

                <!-- Actions -->
                <div class="px-4 py-4 border-t border-gray-100 bg-white sticky bottom-0">
                    <button type="button" onclick="app.hideScanReceiptModal()"
                            class="w-full px-4 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 font-semibold text-sm touch-manipulation active:scale-95">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    `;
}

// AI Analysis untuk Pengeluaran
async getPengeluaranAIAnalysis() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return null;

        // Ambil data pengeluaran 3 bulan terakhir
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const expenseSnapshot = await this.db.collection('pengeluaran')
            .where('userId', '==', currentUser.uid)
            .where('date', '>=', threeMonthsAgo.toISOString().split('T')[0])
            .orderBy('date', 'desc')
            .get();

        if (expenseSnapshot.empty) {
            return {
                pengeluaran: "Rp 0",
                growth: "0%",
                analisa: "Data kosong",
                solusi: "Catat pengeluaran"
            };
        }

        const expenses = expenseSnapshot.docs.map(doc => {
            const data = doc.data();
            let dateObj;
            
            if (data.date && typeof data.date.toDate === 'function') {
                dateObj = data.date.toDate();
            } else if (data.date) {
                dateObj = new Date(data.date);
            } else {
                dateObj = new Date();
            }
            
            return {
                id: doc.id,
                ...data,
                date: dateObj
            };
        });

        // Hitung statistik
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthExpenses = expenses.filter(expense => 
            expense.date.getMonth() === currentMonth && 
            expense.date.getFullYear() === currentYear
        );

        const lastMonthExpenses = expenses.filter(expense => 
            expense.date.getMonth() === lastMonth && 
            expense.date.getFullYear() === lastYear
        );

        const totalCurrent = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalLast = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        const growth = totalLast > 0 ? ((totalCurrent - totalLast) / totalLast * 100).toFixed(1) : totalCurrent > 0 ? 100 : 0;

        // Analisis kategori
        const categoryAnalysis = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        const dominantCategory = Object.keys(categoryAnalysis).reduce((a, b) => 
            categoryAnalysis[a] > categoryAnalysis[b] ? a : b, ''
        );

        // Format data untuk AI
        const analysisData = {
            total_pengeluaran: expenses.reduce((sum, expense) => sum + expense.amount, 0),
            pengeluaran_bulan_ini: totalCurrent,
            growth: growth,
            jumlah_transaksi: expenses.length,
            kategori_dominan: dominantCategory,
            distribusi_kategori: categoryAnalysis
        };

        // Panggil AI API
        const response = await fetch(this.API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Berikan analisis pengeluaran singkat 2-5 kata. Hanya JSON.`
                    },
                    {
                        role: "user",
                        content: `Data: Total Rp ${analysisData.total_pengeluaran.toLocaleString('id-ID')}, Growth ${analysisData.growth}%, Kategori: ${analysisData.kategori_dominan}

JSON: {
    "pengeluaran": "Rp X",
    "growth": "X%", 
    "analisa": "2-5 kata",
    "solusi": "2-5 kata"
}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            })
        });

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.choices && result.choices[0].message.content) {
            const aiContent = result.choices[0].message.content;
            
            try {
                let cleanedContent = aiContent.trim();
                cleanedContent = cleanedContent.replace(/```json\s*/g, '');
                cleanedContent = cleanedContent.replace(/```\s*/g, '');
                cleanedContent = cleanedContent.trim();
                
                const aiResponse = JSON.parse(cleanedContent);
                
                if (!aiResponse.pengeluaran || !aiResponse.growth || !aiResponse.analisa || !aiResponse.solusi) {
                    throw new Error('AI response incomplete');
                }
                
                return aiResponse;
                
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                return this.generatePengeluaranFallback(analysisData);
            }
        }

        throw new Error('Invalid AI response format');

    } catch (error) {
        console.error('Pengeluaran AI Analysis Error:', error);
        return this.generatePengeluaranFallback({});
    }
}

// Fallback untuk pengeluaran
generatePengeluaranFallback(analysisData) {
    const total = analysisData.total_pengeluaran || 0;
    const growth = analysisData.growth || 0;
    const dominantCategory = analysisData.kategori_dominan || 'tidak ada';
    
    let analisa = "";
    let solusi = "";
    
    if (total === 0) {
        analisa = "Data kosong";
        solusi = "Catat pengeluaran";
    } else if (growth > 20) {
        analisa = "Pengeluaran naik";
        solusi = "Kontrol budget";
    } else if (growth > 0) {
        analisa = "Stabil perlu awas";
        solusi = "Monitor terus";
    } else {
        analisa = "Pengeluaran turun";
        solusi = "Pertahankan";
    }
    
    return {
        pengeluaran: `Rp ${this.formatCompactNumber(total)}`,
        growth: `${growth}%`,
        analisa: analisa,
        solusi: solusi
    };
}

// Update AI Analysis UI untuk pengeluaran
async updatePengeluaranAIAnalysis() {
    try {
        const analysis = await this.getPengeluaranAIAnalysis();
        const analysisElement = document.getElementById('pengeluaranAIAnalysisContent');
        
        if (analysis && analysisElement) {
            analysisElement.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between items-center text-white text-sm">
                        <span>Total</span>
                        <span class="font-semibold">${analysis.pengeluaran}</span>
                    </div>
                    <div class="flex justify-between items-center text-white text-sm">
                        <span>Growth</span>
                        <span class="font-semibold ${analysis.growth.includes('-') ? 'text-green-300' : 'text-red-300'}">
                            ${analysis.growth}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-3 pt-2 border-t border-red-400">
                        <div class="text-center">
                            <p class="text-white text-xs opacity-90 mb-1">Analisa</p>
                            <p class="text-white text-sm font-semibold">${analysis.analisa}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-white text-xs opacity-90 mb-1">Solusi</p>
                            <p class="text-white text-sm font-semibold">${analysis.solusi}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating pengeluaran AI analysis:', error);
        const analysisElement = document.getElementById('pengeluaranAIAnalysisContent');
        if (analysisElement) {
            analysisElement.innerHTML = `
                <div class="text-center text-white text-sm">
                    <p>Gagal memuat analisa</p>
                </div>
            `;
        }
    }
}

// Refresh AI Analysis
refreshPengeluaranAIAnalysis() {
    const analysisElement = document.getElementById('pengeluaranAIAnalysisContent');
    if (analysisElement) {
        analysisElement.innerHTML = `
            <div class="animate-pulse space-y-2">
                <div class="h-3 bg-red-400 rounded w-4/5"></div>
                <div class="h-3 bg-red-400 rounded w-3/5"></div>
                <div class="h-3 bg-red-400 rounded w-2/3"></div>
            </div>
        `;
        
        setTimeout(() => this.updatePengeluaranAIAnalysis(), 1000);
    }
}

async loadPengeluaranData() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        // 1. Load stats
        await this.loadPengeluaranStats();
        
        // 2. Load transaction list
        await this.loadPengeluaranTransactions();
        
        // 3. Load AI analysis
        await this.updatePengeluaranAIAnalysis();
        
    } catch (error) {
        console.error('Error loading pengeluaran data:', error);
    }
}

async loadPengeluaranStats() {
    const currentUser = this.auth.currentUser;
    
    // Total semua pengeluaran
    const totalSnapshot = await this.db.collection('pengeluaran')
        .where('userId', '==', currentUser.uid)
        .get();
    
    const totalAmount = totalSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    document.getElementById('totalPengeluaran').textContent = this.formatRupiah(totalAmount);
    
    // Pengeluaran bulan ini
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const monthSnapshot = await this.db.collection('pengeluaran')
        .where('userId', '==', currentUser.uid)
        .where('date', '>=', firstDay.toISOString().split('T')[0])
        .where('date', '<=', lastDay.toISOString().split('T')[0])
        .get();
    
    const monthAmount = monthSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    document.getElementById('pengeluaranBulanIni').textContent = this.formatRupiah(monthAmount);
    
    // Jumlah transaksi
    document.getElementById('jumlahTransaksiPengeluaran').textContent = totalSnapshot.size;
    
    // Rata-rata
    const average = totalSnapshot.size > 0 ? totalAmount / totalSnapshot.size : 0;
    document.getElementById('rataRataPengeluaran').textContent = this.formatRupiah(average);
}

async loadPengeluaranTransactions() {
    const currentUser = this.auth.currentUser;
    
    const transactionsSnapshot = await this.db.collection('pengeluaran')
        .where('userId', '==', currentUser.uid)
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    
    const tableBody = document.getElementById('pengeluaranTableBody');
    
    if (transactionsSnapshot.empty) {
        tableBody.innerHTML = `
            <div class="py-8 text-center">
                <i class="fas fa-receipt text-3xl text-gray-300 mb-3"></i>
                <p class="text-gray-500 text-sm">Belum ada transaksi</p>
                <button onclick="app.showTambahPengeluaranModal()" 
                        class="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
                    Tambah Pengeluaran Pertama
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        html += `
            <div class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                <i class="fas fa-${this.getCategoryIcon(data.category)} text-red-500 text-sm"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">${data.description}</p>
                                <p class="text-xs text-gray-500">${this.formatCategoryName(data.category)} • ${this.formatDateDisplay(data.date)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-semibold text-red-600">-${this.formatRupiah(data.amount)}</p>
                        <p class="text-xs text-gray-500">${data.paymentMethod}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    tableBody.innerHTML = html;
    document.getElementById('totalTransaksiDisplay').textContent = transactionsSnapshot.size;
}
// Show Modal Tambah Pengeluaran
showTambahPengeluaranModal() {
    const modal = document.getElementById('pengeluaranModal');
    if (modal) {
        // Inject CSS langsung ke modal
        if (!document.getElementById('modal-financial-css')) {
            const style = document.createElement('style');
            style.id = 'modal-financial-css';
            style.textContent = `
                .modal-overlay-financial {
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    animation: fadeIn 0.3s ease-out;
                }
                
                .modal-container-financial {
                    background: white;
                    border-radius: 24px 24px 0 0;
                    box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.15);
                    border: 1px solid #f0f0f0;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    transform: translateY(0);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                @media (min-width: 640px) {
                    .modal-container-financial {
                        border-radius: 24px;
                        max-width: 480px;
                        max-height: 85vh;
                        margin: auto;
                    }
                }
                
                .modal-slide-down {
                    transform: translateY(100%);
                }
                
                .modal-header-financial {
                    background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
                    color: white;
                    padding: 20px 24px;
                    border-radius: 24px 24px 0 0;
                    position: relative;
                    flex-shrink: 0;
                }
                
                .modal-header-financial::after {
                    content: '';
                    position: absolute;
                    bottom: -8px;
                    left: 24px;
                    right: 24px;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 2px;
                }
                
                .modal-content-financial {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                    background: #fafafa;
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }
                
                .modal-content-financial::-webkit-scrollbar {
                    width: 6px;
                }
                
                .modal-content-financial::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                }
                
                .modal-content-financial::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                
                .modal-content-financial::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                
                .modal-actions-financial {
                    background: white;
                    padding: 20px 24px;
                    border-top: 1px solid #e5e5e5;
                    display: flex;
                    gap: 12px;
                    flex-shrink: 0;
                }
                
                .form-group-financial {
                    margin-bottom: 20px;
                }
                
                .form-label-financial {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }
                
                .form-input-financial {
                    width: 100%;
                    padding: 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 16px;
                    font-size: 16px;
                    background: white;
                    transition: all 0.3s ease;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }
                
                .form-input-financial:focus {
                    outline: none;
                    border-color: #dc2626;
                    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
                    transform: translateY(-1px);
                }
                
                .form-select-financial {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                    background-position: right 16px center;
                    background-repeat: no-repeat;
                    background-size: 16px;
                    cursor: pointer;
                }
                
                .btn-primary-financial {
                    background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
                    color: white;
                    border: none;
                    padding: 16px 24px;
                    border-radius: 16px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    flex: 1;
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
                }
                
                .btn-primary-financial:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
                }
                
                .btn-primary-financial:active {
                    transform: translateY(0);
                }
                
                .btn-secondary-financial {
                    background: white;
                    color: #374151;
                    border: 2px solid #e5e7eb;
                    padding: 16px 24px;
                    border-radius: 16px;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    flex: 1;
                }
                
                .btn-secondary-financial:hover {
                    border-color: #dc2626;
                    color: #dc2626;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { 
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to { 
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Apply classes ke modal
        modal.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 sm:px-0 modal-overlay-financial';
        
        const modalContent = modal.querySelector('div');
        if (modalContent) {
            modalContent.className = 'modal-container-financial w-full max-w-md';
            
            // Apply styling ke bagian-bagian modal
            const header = modalContent.querySelector('.px-4.py-4.border-b');
            if (header) header.className = 'modal-header-financial';
            
            const content = modalContent.querySelector('.p-4.space-y-4');
            if (content) {
                content.className = 'modal-content-financial';
                
                // Style form groups
                const formGroups = content.querySelectorAll('div.space-y-2');
                formGroups.forEach(group => {
                    group.className = 'form-group-financial';
                    
                    const label = group.querySelector('label');
                    if (label) label.className = 'form-label-financial';
                    
                    const input = group.querySelector('input, select');
                    if (input) {
                        const baseClass = 'form-input-financial';
                        const isSelect = input.tagName.toLowerCase() === 'select';
                        input.className = `${baseClass} ${isSelect ? 'form-select-financial' : ''}`;
                    }
                });
            }
            
            const actions = modalContent.querySelector('.px-4.py-4.border-t');
            if (actions) {
                actions.className = 'modal-actions-financial';
                
                const buttons = actions.querySelectorAll('button');
                buttons.forEach((button, index) => {
                    if (index === 0) {
                        button.className = 'btn-secondary-financial';
                    } else {
                        button.className = 'btn-primary-financial';
                    }
                });
            }
        }

        modal.classList.remove('hidden');
        
        // Set default values
        const tanggalInput = document.getElementById('tanggalPengeluaran');
        if (tanggalInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            tanggalInput.value = formattedDate;
        }
        
        // Reset form lainnya
        const kategoriInput = document.getElementById('kategoriPengeluaran');
        const deskripsiInput = document.getElementById('deskripsiPengeluaran');
        const jumlahInput = document.getElementById('jumlahPengeluaran');
        const metodeInput = document.getElementById('metodePembayaran');
        
        if (kategoriInput) kategoriInput.value = '';
        if (deskripsiInput) deskripsiInput.value = '';
        if (jumlahInput) jumlahInput.value = '';
        if (metodeInput) metodeInput.value = 'tunai';
        
        // Auto focus ke deskripsi
        setTimeout(() => {
            if (deskripsiInput) {
                deskripsiInput.focus();
                // Scroll ke input yang difokuskan
                deskripsiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 350);
        
        // Reset edit state
        this.currentEditId = null;
        const title = document.getElementById('modalTitlePengeluaran');
        if (title) title.textContent = 'Tambah Pengeluaran';
    }
}

// Hide Modal Pengeluaran
hidePengeluaranModal() {
    const modal = document.getElementById('pengeluaranModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-container-financial');
        if (modalContent) {
            modalContent.classList.add('modal-slide-down');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                modalContent.classList.remove('modal-slide-down');
                
                // Reset form
                const form = modal.querySelector('form');
                if (form) form.reset();
                
                // Reset edit state
                this.currentEditId = null;
            }, 250);
        } else {
            modal.classList.add('hidden');
        }
    }
}




// Show Scan Receipt Modal - Minimalis & Modern
showScanReceiptModal() {
    const modal = document.getElementById('scanReceiptModal');
    if (modal) {
        // Inject CSS minimalis
        if (!document.getElementById('scan-modal-css')) {
            const style = document.createElement('style');
            style.id = 'scan-modal-css';
            style.textContent = `
                /* VLFinance Scan Modal - Minimalis */
                .scan-modal-overlay {
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    animation: scanFadeIn 0.2s ease-out;
                }
                
                .scan-modal-container {
                    background: #ffffff;
                    border-radius: 20px 20px 0 0;
                    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                }
                
                @media (min-width: 640px) {
                    .scan-modal-container {
                        border-radius: 20px;
                        max-width: 420px;
                    }
                }
                
                .scan-modal-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 20px 20px 0 0;
                    flex-shrink: 0;
                }
                
                .scan-modal-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f8fafc;
                }
                
                .scan-modal-actions {
                    background: white;
                    padding: 16px 20px;
                    border-top: 1px solid #e5e7eb;
                    flex-shrink: 0;
                }
                
                /* Upload Area - Minimalis */
                .scan-upload-area {
                    border: 2px dashed #d1d5db;
                    border-radius: 16px;
                    padding: 40px 20px;
                    text-align: center;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-bottom: 16px;
                }
                
                .scan-upload-area:active {
                    transform: scale(0.98);
                }
                
                .scan-upload-area:hover {
                    border-color: #667eea;
                    background: #f0f4ff;
                }
                
                /* Progress & Results - Minimalis */
                .scan-progress {
                    background: #667eea;
                    color: white;
                    border-radius: 16px;
                    padding: 20px;
                    text-align: center;
                    margin-bottom: 16px;
                }
                
                .scan-results {
                    background: white;
                    border-radius: 16px;
                    padding: 0;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }
                
                .scan-store-header {
                    background: #f8fafc;
                    padding: 16px;
                    border-radius: 16px 16px 0 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .scan-items-list {
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 0 16px;
                }
                
                .scan-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                
                .scan-item:last-child {
                    border-bottom: none;
                }
                
                .scan-item-info {
                    flex: 1;
                }
                
                .scan-item-name {
                    font-weight: 500;
                    color: #374151;
                    font-size: 14px;
                    margin-bottom: 2px;
                }
                
                .scan-item-category {
                    font-size: 11px;
                    color: #6b7280;
                }
                
                .scan-item-price {
                    font-weight: 600;
                    color: #374151;
                    font-size: 14px;
                }
                
                .scan-total {
                    background: #fef2f2;
                    margin: 16px;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid #fecaca;
                }
                
                /* Buttons - Minimalis */
                .btn-scan-save {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 14px 20px;
                    border-radius: 14px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                
                .btn-scan-save:active {
                    transform: scale(0.98);
                }
                
                .btn-scan-close {
                    background: white;
                    color: #374151;
                    border: 1.5px solid #e5e7eb;
                    padding: 14px 20px;
                    border-radius: 14px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                
                .btn-scan-close:active {
                    background: #f9fafb;
                }
                
                /* Animations */
                @keyframes scanFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                
                .scan-modal-container {
                    animation: slideUp 0.25s ease-out;
                }
                
                /* Mobile Optimizations */
                @media (max-width: 640px) {
                    .scan-modal-content {
                        padding: 16px;
                    background: #ffffff;
                    border-radius: 20px 20px 0 0;
                        max-height: 85vh;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .scan-modal-container {
                        border-radius: 20px 20px 0 0;
                        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
                        max-height: 85vh;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    @media (min-width: 640px) {
                        .scan-modal-container {
                            border-radius: 20px;
                            max-width: 420px;
                        }
                    }
                    
                    .scan-modal-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 20px 20px 0 0;
                        flex-shrink: 0;
                    }
                    
                    .scan-modal-content {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                        background: #f8fafc;
                    }
                    
                    .scan-modal-actions {
                        background: white;
                        padding: 16px 20px;
                        border-top: 1px solid #e5e7eb;
                        flex-shrink: 0;
                    }
                    
                    /* Upload Area - Minimalis */
                    .scan-upload-area {
                        border: 2px dashed #d1d5db;
                        border-radius: 16px;
                        padding: 40px 20px;
                        text-align: center;
                        background: #f8fafc;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-bottom: 16px;
                    }
                    
                    .scan-upload-area:active {
                        transform: scale(0.98);
                    }
                    
                    .scan-upload-area:hover {
                        border-color: #667eea;
                        background: #f0f4ff;
                    }
                    
                    /* Progress & Results - Minimalis */
                    .scan-progress {
                        background: #667eea;
                        color: white;
                        border-radius: 16px;
                        padding: 20px;
                        text-align: center;
                        margin-bottom: 16px;
                    }
                    
                    .scan-results {
                        background: white;
                        border-radius: 16px;
                        padding: 0;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    }
                    
                    .scan-store-header {
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 16px 16px 0 0;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    
                    .scan-items-list {
                        max-height: 300px;
                        overflow-y: auto;
                        padding: 0 16px;
                    }
                    
                    .scan-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 0;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    
                    .scan-item:last-child {
                        border-bottom: none;
                    }
                    
                    .scan-item-info {
                        flex: 1;
                    }
                    
                    .scan-item-name {
                        font-weight: 500;
                        color: #374151;
                        font-size: 14px;
                        margin-bottom: 2px;
                    }
                    
                    .scan-item-category {
                        font-size: 11px;
                        color: #6b7280;
                    }
                    
                    .scan-item-price {
                        font-weight: 600;
                        color: #374151;
                        font-size: 14px;
                    }
                    
                    .scan-total {
                        background: #fef2f2;
                        margin: 16px;
                        padding: 16px;
                        border-radius: 12px;
                        border: 1px solid #fecaca;
                    }
                    
                    /* Buttons - Minimalis */
                    .btn-scan-save {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        border: none;
                        padding: 14px 20px;
                        border-radius: 14px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    }
                    
                    .btn-scan-save:active {
                        transform: scale(0.98);
                    }
                    
                    .btn-scan-close {
                        background: white;
                        color: #374151;
                        border: 1.5px solid #e5e7eb;
                        padding: 14px 20px;
                        border-radius: 14px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    }
                    
                    .btn-scan-close:active {
                        background: #f9fafb;
                    }
                    
                    /* Animations */
                    @keyframes scanFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                    
                    .scan-modal-container {
                        animation: slideUp 0.25s ease-out;
                    }
                    
                    /* Mobile Optimizations */
                    @media (max-width: 640px) {
                        .scan-modal-content {
                            padding: 16px;
                        }
                        
                        .scan-upload-area {
                            padding: 30px 16px;
                        }
                        
                        .scan-items-list {
                            max-height: 250px;
                        }
                        
                        .scan-item {
                            padding: 10px 0;
                        }
                    }
                `;
            document.head.appendChild(style);
        }

        modal.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 sm:px-0 scan-modal-overlay';
        
        const modalContent = modal.querySelector('div');
        if (modalContent) {
            modalContent.className = 'scan-modal-container w-full max-w-md';
            
            // Update modal structure
            this.initializeMinimalScanModal(modalContent);
        }

        modal.classList.remove('hidden');
        this.resetScanModal();
    }
}

// Initialize minimal scan modal dengan 1 opsi unggah file
initializeMinimalScanModal(modalContent) {
    modalContent.innerHTML = `
        <!-- Header -->
        <div class="scan-modal-header">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold">Scan Struk</h3>
                    <p class="text-blue-100 text-sm mt-1">Unggah foto struk untuk analisa otomatis</p>
                </div>
                <button onclick="app.hideScanReceiptModal()" class="p-2 text-white/80 hover:text-white">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="scan-modal-content">
            <!-- Upload Area -->
            <div id="uploadSection">
                <div class="scan-upload-area" onclick="document.getElementById('receiptImage').click()">
                    <i class="fas fa-receipt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600 font-medium text-sm mb-1">Unggah Foto Struk</p>
                    <p class="text-gray-500 text-xs mb-3">Format: JPG, PNG (Maks. 5MB)</p>
                    <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Pilih File
                    </button>
                </div>
            </div>

            <!-- Hidden File Input -->
            <input type="file" id="receiptImage" accept="image/*" class="hidden" onchange="app.handleImageUpload(event)">
            
            <!-- Progress -->
            <div id="scanProgress" class="scan-progress hidden">
                <div class="flex items-center justify-center gap-3">
                    <i class="fas fa-spinner fa-spin text-xl"></i>
                    <div>
                        <div class="font-semibold text-sm">Memproses Struk</div>
                        <div class="text-xs opacity-90">AI sedang menganalisis...</div>
                    </div>
                </div>
            </div>

            <!-- Error -->
            <div id="scanError" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <div class="flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle text-red-500 text-sm"></i>
                    <div class="text-red-800 text-sm" id="scanErrorMessage"></div>
                </div>
            </div>

            <!-- Results -->
            <div id="scanResults" class="hidden">
                <div class="scan-results">
                    <div class="scan-store-header">
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="font-semibold text-gray-900 text-sm" id="scanStoreName">Toko</div>
                                <div class="text-gray-600 text-xs mt-1" id="scanDate">Tanggal</div>
                            </div>
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                <i class="fas fa-check mr-1"></i>Berhasil
                            </span>
                        </div>
                    </div>
                    
                    <div class="scan-items-list">
                        <div class="text-xs font-medium text-gray-500 py-3">ITEM YANG TERDETEKSI</div>
                        <div id="scanItemsList">
                            <!-- Items will be populated here -->
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="scan-modal-actions">
            <button id="scanSaveButton" onclick="app.saveScannedItems()" class="btn-scan-save hidden">
                <i class="fas fa-save"></i>
                Simpan ke Pengeluaran
            </button>
            <button onclick="app.hideScanReceiptModal()" class="btn-scan-close">
                <i class="fas fa-times"></i>
                Tutup
            </button>
        </div>
    `;
}

// Update handleImageUpload untuk hide upload section
async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validasi file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
        this.showScanError('Format file tidak didukung. Gunakan JPG atau PNG.');
        return;
    }

    if (file.size > maxSize) {
        this.showScanError('File terlalu besar. Maksimal 5MB.');
        return;
    }

    // Hide upload section, show progress
    document.getElementById('uploadSection').classList.add('hidden');
    this.showScanProgress(file);
    
    try {
        await this.processReceiptWithAI(file);
        // Show save button when results are ready
        document.getElementById('scanSaveButton').classList.remove('hidden');
    } catch (error) {
        console.error('Scan failed:', error);
        this.showScanError(error.message);
        // Show upload section again on error
        document.getElementById('uploadSection').classList.remove('hidden');
    }
}

// Show scan progress
showScanProgress(file) {
    document.getElementById('scanProgress').classList.remove('hidden');
    document.getElementById('scanError').classList.add('hidden');
    document.getElementById('scanResults').classList.add('hidden');
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const uploadArea = document.querySelector('.scan-upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="mb-3">
                    <img src="${e.target.result}" alt="Preview" class="max-h-32 mx-auto rounded-lg">
                </div>
                <p class="text-gray-600 text-sm mb-2">${file.name}</p>
                <div class="flex items-center justify-center gap-2">
                    <i class="fas fa-spinner fa-spin text-blue-500 text-sm"></i>
                    <span class="text-blue-600 text-sm font-medium">Memproses...</span>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// Reset Scan Modal
resetScanModal() {
    document.getElementById('scanProgress').classList.add('hidden');
    document.getElementById('scanError').classList.add('hidden');
    document.getElementById('scanResults').classList.add('hidden');
    document.getElementById('scanSaveButton').classList.add('hidden');
    document.getElementById('receiptImage').value = '';
    
    // Show upload section
    document.getElementById('uploadSection').classList.remove('hidden');
    
    // Reset upload area
    const uploadArea = document.querySelector('.scan-upload-area');
    if (uploadArea) {
        uploadArea.innerHTML = `
            <i class="fas fa-receipt text-3xl text-gray-400 mb-3"></i>
            <p class="text-gray-600 font-medium text-sm mb-1">Unggah Foto Struk</p>
            <p class="text-gray-500 text-xs mb-3">Format: JPG, PNG (Maks. 5MB)</p>
            <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Pilih File
            </button>
        `;
    }
}


// Handle Image Upload
async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
        this.showScanError('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.');
        return;
    }

    if (file.size > maxSize) {
        this.showScanError('File terlalu besar. Maksimal 10MB.');
        return;
    }

    // Show preview and progress
    this.showScanProgress(file);
    
    try {
        // Process receipt with AI
        await this.processReceiptWithAI(file);
    } catch (error) {
        console.error('Scan error:', error);
        this.showScanError('Gagal memproses struk: ' + error.message);
    }
}

// Show Scan Progress
showScanProgress(file) {
    document.getElementById('scanProgress').classList.remove('hidden');
    document.getElementById('scanError').classList.add('hidden');
    document.getElementById('scanResults').classList.add('hidden');
    
    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const uploadArea = document.querySelector('.scan-upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="mb-4">
                    <img src="${e.target.result}" alt="Preview" class="max-h-32 mx-auto rounded-lg shadow-md">
                </div>
                <p class="text-sm text-gray-600 mb-2">${file.name}</p>
                <div class="flex items-center justify-center space-x-2">
                    <i class="fas fa-spinner fa-spin text-blue-500"></i>
                    <span class="text-blue-600 font-medium">Memproses struk...</span>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// Process Receipt with AI - Using the correct format
async processReceiptWithAI(file) {
    try {
        // Convert image to base64 menggunakan fungsi yang sama
        const base64Image = await this.fileToBase64(file);
        
        const API_URL = "https://mucuans-ai-proxy.qalam.workers.dev";
        const MODEL = "google/gemini-2.0-flash-001";
        
        console.log('Sending AI request with correct format...');

        const requestPayload = {
            model: MODEL,
            messages: [{
                role: "user",
                content: [{
                    type: "text",
                    text: `Analyze this receipt image and extract EACH ITEM as separate transactions in JSON format:
{
  "storeName": "<merchant/store name>",
  "date": "<transaction date in YYYY-MM-DD format>",
  "items": [
    {
      "description": "<item name>",
      "amount": <item price as number, without currency symbol>,
      "category": "<best matching category: makanan-minuman, transportasi, hiburan, belanja, tagihan, kesehatan, pendidikan, lainnya, or kopi>"
    }
  ]
}

Rules:
- Extract EACH individual item from the receipt as a separate transaction
- Do NOT include subtotals, tax (pajak/PPN), service charges, or discounts as items
- Only extract actual purchased products/services
- Amount should be the unit price (not quantity x price, just the final price per line item)
- Category mapping:
  * Coffee/drinks → "kopi"
  * Food → "makanan-minuman"
  * Transport → "transportasi"
  * Entertainment → "hiburan"
  * Shopping/retail → "belanja"
  * Bills/utilities → "tagihan"
  * Health/medical → "kesehatan"
  * Education → "pendidikan"
  * Unknown/other → "lainnya"
- Date format must be YYYY-MM-DD (extract from receipt, or use today's date if not visible)
- Return ONLY valid JSON, no additional text

Extract all items from this Indonesian receipt:`
                }, {
                    type: "image_url",
                    image_url: {
                        url: base64Image
                    }
                }]
            }],
            temperature: 0.1,
            max_tokens: 1000
        };

        console.log('Request payload prepared');

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestPayload)
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('AI API Error:', errorData);
            throw new Error(errorData.error?.message || "Failed to scan receipt");
        }

        const data = await response.json();
        console.log('AI Response received:', data);

        // Extract content from response
        const content = data.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response content from AI");
        }

        console.log('AI Response content:', content);

        // Extract JSON from response
        let jsonResponse;
        try {
            // Clean the response - remove markdown code blocks
            const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            jsonResponse = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            // Try to extract JSON from text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonResponse = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Could not parse AI response as JSON");
            }
        }

        // Process the validated results
        const validatedResults = this.validateScanResults(jsonResponse);
        this.displayScanResults(validatedResults);

    } catch (error) {
        console.error('AI Processing Error:', error);
        throw new Error('Gagal memproses struk: ' + error.message);
    }
}

// Helper function to convert file to base64 (sama seperti cAe)
fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Update validateScanResults untuk format baru
validateScanResults(results) {
    const validated = {
        storeName: 'Toko',
        date: new Date().toISOString().split('T')[0], // Selalu gunakan hari ini
        items: [],
        total: 0
    };

    // Validate store name
    if (results.storeName && typeof results.storeName === 'string' && results.storeName.trim().length > 0) {
        validated.storeName = results.storeName.trim();
    }

    // Selalu gunakan tanggal hari ini, abaikan tanggal dari AI
    // Tidak perlu validasi date karena selalu pakai hari ini

    // Validate items - handle both number and string formats
    if (results.items && Array.isArray(results.items)) {
        validated.items = results.items
            .filter(item => item && item.description && item.amount) // Remove typeof check
            .map(item => {
                // Parse amount correctly for both number and string formats
                let priceValue;
                
                if (typeof item.amount === 'number') {
                    // If already a number, use directly
                    priceValue = item.amount;
                } else if (typeof item.amount === 'string') {
                    // Handle string format like "13.000" -> 13000
                    const cleanAmount = item.amount
                        .replace(/\./g, '') // Remove dots (thousands separator in Indonesia)
                        .replace(',', '.'); // Replace comma with dot for decimal (if any)
                    priceValue = parseFloat(cleanAmount);
                } else {
                    priceValue = 0;
                }
                
                return {
                    name: String(item.description).trim(),
                    price: Math.abs(priceValue),
                    quantity: 1,
                    category: item.category || 'belanja'
                };
            })
            .filter(item => item.price > 0); // Filter valid prices after parsing
    }

    // Calculate total
    validated.total = validated.items.reduce((sum, item) => sum + item.price, 0);

    // If no valid items found, throw error
    if (validated.items.length === 0) {
        throw new Error('Tidak ditemukan item yang valid pada struk');
    }

    console.log('Validated scan results:', validated);
    return validated;
}


// Update displayScanResults untuk format Rupiah yang benar
displayScanResults(results) {
    document.getElementById('scanProgress').classList.add('hidden');
    
    // Store results for saving
    this.currentScanResults = results;
    
    // Update store name and date
    document.getElementById('scanStoreName').textContent = results.storeName;
    document.getElementById('scanDate').textContent = results.date;
    
    // Update items list
    const itemsList = document.getElementById('scanItemsList');
    itemsList.innerHTML = '';
    
    let totalAmount = 0;
    
    results.items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'scan-item';
        itemElement.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-gray-900">${item.name}</div>
                <div class="text-sm text-gray-500">
                    ${this.getCategoryIcon(item.category)} ${this.formatCategoryName(item.category)}
                </div>
            </div>
            <div class="text-right">
                <div class="font-semibold text-gray-900">${this.formatRupiah(itemTotal)}</div>
            </div>
        `;
        itemsList.appendChild(itemElement);
    });
    
    // Add total section
    const totalElement = document.createElement('div');
    totalElement.className = 'scan-total';
    totalElement.innerHTML = `
        <div class="flex justify-between items-center">
            <div class="font-bold text-gray-900">Total Belanja</div>
            <div class="font-bold text-lg text-red-600">${this.formatRupiah(totalAmount)}</div>
        </div>
    `;
    itemsList.appendChild(totalElement);
    
    document.getElementById('scanResults').classList.remove('hidden');
}

// Tambahkan juga fungsi formatRupiah jika belum ada
formatRupiah(amount) {
    const numberValue = Number(amount);
    if (isNaN(numberValue)) return 'Rp 0';
    
    return `Rp ${this.formatNumber(numberValue)}`;
}

// Format number helper untuk Rupiah Indonesia
formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

// Helper function untuk icon kategori
getCategoryIcon(category) {
    const icons = {
        'makanan-minuman': '🍔',
        'transportasi': '🚗',
        'hiburan': '🎬',
        'belanja': '🛍️',
        'tagihan': '📄',
        'kesehatan': '🏥',
        'pendidikan': '📚',
        'kopi': '☕',
        'lainnya': '📋'
    };
    return icons[category] || '📋';
}

// Helper function untuk format nama kategori
formatCategoryName(category) {
    const names = {
        'makanan-minuman': 'Makanan & Minuman',
        'transportasi': 'Transportasi',
        'hiburan': 'Hiburan',
        'belanja': 'Belanja',
        'tagihan': 'Tagihan',
        'kesehatan': 'Kesehatan',
        'pendidikan': 'Pendidikan',
        'kopi': 'Kopi & Minuman',
        'lainnya': 'Lainnya'
    };
    return names[category] || 'Lainnya';
}

// Update saveScannedItems untuk menggunakan category dari AI
async saveScannedItems() {
    try {
        if (!this.currentScanResults || !this.currentScanResults.items) {
            throw new Error('Tidak ada data scan yang valid');
        }

        const saveButton = document.querySelector('#scanReceiptModal .btn-scan-primary');
        const originalText = saveButton?.textContent;
        
        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
            saveButton.disabled = true;
        }

        const storeName = this.currentScanResults.storeName;
        const transactionDate = this.currentScanResults.date;
        
        let savedCount = 0;
        let totalAmount = 0;

        // Save each item as individual expense
        for (const item of this.currentScanResults.items) {
            const expenseData = {
                amount: item.price,
                description: `${item.name} - ${storeName}`,
                category: item.category,
                date: transactionDate,
                paymentMethod: 'tunai',
                storeName: storeName,
                itemName: item.name,
                type: 'pengeluaran',
                source: 'scan_receipt',
                userId: this.userData.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('pengeluaran').add(expenseData);
            savedCount++;
            totalAmount += item.price;
        }

        if (savedCount === 0) {
            throw new Error('Tidak ada item yang berhasil disimpan');
        }

        this.showToast(
            `✅ ${savedCount} item berhasil disimpan! Total: Rp ${this.formatNumber(totalAmount)}`,
            'success'
        );

        this.hideScanReceiptModal();
        
        // Refresh data
        setTimeout(() => {
            this.loadPengeluaranData();
            this.refreshDashboardData();
        }, 800);

    } catch (error) {
        console.error('Error saving scanned items:', error);
        this.showToast('Gagal menyimpan item: ' + error.message, 'error');
    } finally {
        const saveButton = document.querySelector('#scanReceiptModal .btn-scan-primary');
        if (saveButton) {
            saveButton.innerHTML = 'Simpan Semua Item';
            saveButton.disabled = false;
        }
    }
}

  renderTabunganPage() {
    return `
        <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            <!-- Header -->
            <div class="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40">
                <div class="px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                                    onclick="app.loadContent('goals')">
                                <i class="fas fa-arrow-left text-gray-600"></i>
                            </button>
                            <div>
                                <h1 class="text-lg font-bold text-gray-900">Tabungan</h1>
                                <p class="text-xs text-gray-500">Bangun masa depan finansial</p>
                            </div>
                        </div>
                        <button onclick="app.showAddSavingsModal()" 
                                class="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Savings Overview -->
            <div class="px-4 pt-6">
                <div class="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 shadow-xl text-white">
                    <div class="text-center">
                        <p class="text-white/90 text-sm font-medium mb-2">Total Tabungan</p>
                        <p class="text-white text-2xl font-bold mb-3" id="totalSavingsAmount">Rp 0</p>
                        <div class="w-full bg-white/30 rounded-full h-3 mb-2">
                            <div class="bg-white h-3 rounded-full transition-all duration-500" id="savingsProgressBar" style="width: 0%"></div>
                        </div>
                        <p class="text-white/70 text-xs" id="savingsTargetInfo">Auto-save: 20% dari pemasukan</p>
                    </div>
                </div>
            </div>

            <!-- Savings Stats -->
            <div class="px-4 mt-6">
                <div class="grid grid-cols-3 gap-3">
                    <!-- Monthly Target -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-bullseye text-green-500 text-sm"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">Monthly Target</p>
                            <p class="text-gray-900 text-lg font-bold" id="monthlySavingsTarget">Rp 0</p>
                        </div>
                    </div>

                    <!-- This Month -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-calendar text-blue-500 text-sm"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">This Month</p>
                            <p class="text-gray-900 text-lg font-bold" id="thisMonthSavings">Rp 0</p>
                        </div>
                    </div>

                    <!-- Growth -->
                    <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                        <div class="text-center">
                            <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <i class="fas fa-chart-line text-orange-500 text-sm"></i>
                            </div>
                            <p class="text-gray-500 text-xs font-medium mb-1">Growth</p>
                            <p class="text-gray-900 text-lg font-bold" id="savingsGrowth">0%</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="px-4 mt-6">
                <h3 class="text-gray-900 text-sm font-bold mb-3">Quick Actions</h3>
                <div class="grid grid-cols-4 gap-2">
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showAddSavingsModal()">
                        <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-plus text-green-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Add</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showWithdrawModal()">
                        <div class="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-minus text-yellow-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Withdraw</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showAutoSaveSettings()">
                        <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-cog text-blue-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Auto-save</span>
                    </button>
                    
                    <button class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 active:scale-95 flex flex-col items-center"
                            onclick="app.showSavingsReport()">
                        <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mb-1">
                            <i class="fas fa-chart-bar text-purple-500 text-xs"></i>
                        </div>
                        <span class="text-gray-600 text-xs font-medium">Report</span>
                    </button>
                </div>
            </div>

            <!-- Savings Goals -->
            <div class="px-4 mt-6">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-gray-900 text-sm font-bold">Savings Goals</h3>
                            <span class="text-green-500 text-xs font-medium" id="savingsGoalsCount">0 goals</span>
                        </div>
                    </div>
                    <div id="savingsGoalsList" class="divide-y divide-gray-100">
                        <div class="px-4 py-4 text-center">
                            <i class="fas fa-piggy-bank text-3xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 text-sm">Belum ada savings goals</p>
                            <button onclick="app.showAddSavingsGoalModal()" 
                                    class="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
                                Tambah Goal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="px-4 mt-4 mb-6">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div class="px-4 py-3 border-b border-gray-100">
                        <div class="flex items-center justify-between">
                            <h3 class="text-gray-900 text-sm font-bold">Recent Transactions</h3>
                            <span class="text-blue-500 text-xs font-medium">View All</span>
                        </div>
                    </div>
                    <div id="savingsTransactionsList" class="divide-y divide-gray-100">
                        <div class="px-4 py-4 text-center">
                            <i class="fas fa-exchange-alt text-3xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 text-sm">Belum ada transaksi</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Savings Modal -->
        <div id="addSavingsModal" class="fixed inset-0 z-50 hidden">
            <div class="modal-overlay-savings" onclick="app.hideAddSavingsModal()"></div>
            <div class="modal-container-savings">
                <div class="modal-content-savings">
                    <!-- Header -->
                    <div class="modal-header-savings">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="modal-title-savings">Tambah Tabungan</h3>
                                <p class="modal-subtitle-savings">Tambah dana ke tabungan Anda</p>
                            </div>
                            <button onclick="app.hideAddSavingsModal()" class="modal-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Form -->
                    <div class="modal-body-savings">
                        <div class="space-y-4">
                            <!-- Amount -->
                            <div class="form-group-savings">
                                <label class="form-label-savings">Jumlah</label>
                                <div class="relative">
                                    <span class="currency-symbol">Rp</span>
                                    <input type="number" id="savingsAmount" 
                                           class="form-input-savings with-currency"
                                           placeholder="0"
                                           min="0">
                                </div>
                            </div>

                            <!-- Date -->
                            <div class="form-group-savings">
                                <label class="form-label-savings">Tanggal</label>
                                <input type="date" id="savingsDate" 
                                       class="form-input-savings">
                            </div>

                            <!-- Category -->
                            <div class="form-group-savings">
                                <label class="form-label-savings">Kategori</label>
                                <select id="savingsCategory" class="form-select-savings">
                                    <option value="regular">💵 Tabungan Reguler</option>
                                    <option value="emergency">🛡️ Dana Darurat</option>
                                    <option value="investment">📈 Investasi</option>
                                    <option value="goal">🎯 Goal Specific</option>
                                    <option value="other">📝 Lainnya</option>
                                </select>
                            </div>

                            <!-- Description -->
                            <div class="form-group-savings">
                                <label class="form-label-savings">Deskripsi (Opsional)</label>
                                <textarea id="savingsDescription" rows="3"
                                          class="form-textarea-savings"
                                          placeholder="Tambahkan catatan..."></textarea>
                            </div>

                            <!-- Quick Amounts -->
                            <div class="quick-amounts-section">
                                <label class="form-label-savings">Quick Amount</label>
                                <div class="quick-amounts-grid">
                                    <button type="button" class="quick-amount-btn" onclick="app.setQuickAmount(50000)">50K</button>
                                    <button type="button" class="quick-amount-btn" onclick="app.setQuickAmount(100000)">100K</button>
                                    <button type="button" class="quick-amount-btn" onclick="app.setQuickAmount(500000)">500K</button>
                                    <button type="button" class="quick-amount-btn" onclick="app.setQuickAmount(1000000)">1JT</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="modal-actions-savings">
                        <button type="button" onclick="app.hideAddSavingsModal()" class="btn-secondary-savings">
                            <i class="fas fa-times mr-2"></i>
                            Batal
                        </button>
                        <button type="button" onclick="app.saveSavings()" class="btn-primary-savings">
                            <i class="fas fa-save mr-2"></i>
                            Simpan Tabungan
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Withdraw Modal -->
        <div id="withdrawModal" class="fixed inset-0 z-50 hidden">
            <div class="modal-overlay-savings" onclick="app.hideWithdrawModal()"></div>
            <div class="modal-container-savings">
                <div class="modal-content-savings">
                    <div class="modal-header-savings">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="modal-title-savings">Tarik Tabungan</h3>
                                <p class="modal-subtitle-savings">Tarik dana dari tabungan</p>
                            </div>
                            <button onclick="app.hideWithdrawModal()" class="modal-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div class="modal-body-savings">
                        <div class="space-y-4">
                            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                <div class="flex items-center space-x-2">
                                    <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                                    <p class="text-yellow-800 text-sm font-medium">Saldo Tersedia</p>
                                </div>
                                <p class="text-yellow-700 text-lg font-bold mt-2" id="availableBalance">Rp 0</p>
                            </div>

                            <div class="form-group-savings">
                                <label class="form-label-savings">Jumlah Penarikan</label>
                                <div class="relative">
                                    <span class="currency-symbol">Rp</span>
                                    <input type="number" id="withdrawAmount" 
                                           class="form-input-savings with-currency"
                                           placeholder="0"
                                           min="0">
                                </div>
                            </div>

                            <div class="form-group-savings">
                                <label class="form-label-savings">Alasan Penarikan</label>
                                <select id="withdrawReason" class="form-select-savings">
                                    <option value="emergency">🚨 Kebutuhan Darurat</option>
                                    <option value="investment">📈 Investasi</option>
                                    <option value="purchase">🛒 Pembelian</option>
                                    <option value="transfer">🏦 Transfer</option>
                                    <option value="other">📝 Lainnya</option>
                                </select>
                            </div>

                            <div class="form-group-savings">
                                <label class="form-label-savings">Keterangan (Opsional)</label>
                                <textarea id="withdrawNotes" rows="2"
                                          class="form-textarea-savings"
                                          placeholder="Tambahkan keterangan penarikan..."></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions-savings">
                        <button type="button" onclick="app.hideWithdrawModal()" class="btn-secondary-savings">
                            Batal
                        </button>
                        <button type="button" onclick="app.processWithdrawal()" class="btn-warning-savings">
                            <i class="fas fa-download mr-2"></i>
                            Tarik Dana
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// CSS Modal Injection untuk Tabungan
injectSavingsModalCSS() {
    if (!document.getElementById('savings-modal-css')) {
        const style = document.createElement('style');
        style.id = 'savings-modal-css';
        style.textContent = `
            /* Savings Modal Base Styles */
            .modal-overlay-savings {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                animation: savingsFadeIn 0.3s ease-out;
                z-index: 50;
            }
            
            .modal-container-savings {
                position: fixed;
                inset: 0;
                z-index: 50;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding: 0;
                margin: 0;
            }
            
            @media (min-width: 640px) {
                .modal-container-savings {
                    align-items: center;
                    padding: 1rem;
                }
            }
            
            .modal-content-savings {
                background: white;
                border-radius: 24px 24px 0 0;
                box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.15);
                border: 1px solid #e5e7eb;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                width: 100%;
                margin: 0;
                transform: translateY(0);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            @media (min-width: 640px) {
                .modal-content-savings {
                    border-radius: 24px;
                    max-width: 480px;
                    max-height: 85vh;
                    margin: auto;
                }
            }
            
            /* Header */
            .modal-header-savings {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 1.5rem;
                border-radius: 24px 24px 0 0;
                flex-shrink: 0;
            }
            
            .modal-title-savings {
                font-size: 1.25rem;
                font-weight: 700;
                line-height: 1.2;
            }
            
            .modal-subtitle-savings {
                font-size: 0.875rem;
                opacity: 0.9;
                margin-top: 0.25rem;
            }
            
            .modal-close-btn {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                transition: all 0.2s ease;
                border: none;
                cursor: pointer;
            }
            
            .modal-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }
            
            /* Body */
            .modal-body-savings {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem;
                background: #f8fafc;
            }
            
            /* Form Styles */
            .form-group-savings {
                margin-bottom: 1.25rem;
            }
            
            .form-label-savings {
                display: block;
                font-size: 0.875rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.5rem;
            }
            
            .form-input-savings {
                width: 100%;
                padding: 0.875rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 1rem;
                background: white;
                transition: all 0.3s ease;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .form-input-savings:focus {
                outline: none;
                border-color: #10b981;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                transform: translateY(-1px);
            }
            
            .form-input-savings.with-currency {
                padding-left: 2.5rem;
            }
            
            .currency-symbol {
                position: absolute;
                left: 1rem;
                top: 50%;
                transform: translateY(-50%);
                color: #6b7280;
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .form-select-savings {
                appearance: none;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
                background-position: right 1rem center;
                background-repeat: no-repeat;
                background-size: 1rem;
                cursor: pointer;
            }
            
            .form-textarea-savings {
                width: 100%;
                padding: 0.875rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                font-size: 0.875rem;
                background: white;
                transition: all 0.3s ease;
                resize: vertical;
                min-height: 80px;
            }
            
            .form-textarea-savings:focus {
                outline: none;
                border-color: #10b981;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            }
            
            /* Quick Amounts */
            .quick-amounts-section {
                margin-top: 1.5rem;
            }
            
            .quick-amounts-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }
            
            @media (min-width: 640px) {
                .quick-amounts-grid {
                    grid-template-columns: repeat(4, 1fr);
                }
            }
            
            .quick-amount-btn {
                padding: 0.75rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                background: white;
                color: #374151;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .quick-amount-btn:hover {
                border-color: #10b981;
                color: #10b981;
                transform: translateY(-1px);
            }
            
            .quick-amount-btn:active {
                transform: translateY(0);
            }
            
            /* Actions */
            .modal-actions-savings {
                background: white;
                padding: 1.25rem 1.5rem;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.75rem;
                flex-shrink: 0;
            }
            
            .btn-primary-savings {
                flex: 1;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            
            .btn-primary-savings:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }
            
            .btn-primary-savings:active {
                transform: translateY(0);
            }
            
            .btn-secondary-savings {
                flex: 1;
                background: white;
                color: #374151;
                border: 2px solid #e5e7eb;
                padding: 1rem 1.5rem;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .btn-secondary-savings:hover {
                border-color: #10b981;
                color: #10b981;
                transform: translateY(-1px);
            }
            
            .btn-warning-savings {
                flex: 1;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 16px;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }
            
            .btn-warning-savings:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
            }
            
            /* Animations */
            @keyframes savingsFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes savingsSlideUp {
                from { 
                    transform: translateY(100%);
                    opacity: 0;
                }
                to { 
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .modal-content-savings {
                animation: savingsSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Mobile Optimizations */
            @media (max-width: 640px) {
                .modal-body-savings {
                    padding: 1.25rem;
                }
                
                .modal-actions-savings {
                    padding: 1rem 1.25rem;
                }
                
                .form-input-savings,
                .form-select-savings,
                .form-textarea-savings {
                    font-size: 16px; /* Prevent zoom on iOS */
                }
                
                .quick-amounts-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            /* Scrollbar Styling */
            .modal-body-savings::-webkit-scrollbar {
                width: 4px;
            }
            
            .modal-body-savings::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 2px;
            }
            
            .modal-body-savings::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 2px;
            }
            
            .modal-body-savings::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            /* Touch Improvements */
            @media (hover: none) {
                .btn-primary-savings:hover,
                .btn-secondary-savings:hover,
                .btn-warning-savings:hover,
                .quick-amount-btn:hover {
                    transform: none;
                }
                
                .modal-close-btn:hover {
                    transform: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Modal Functions untuk Tabungan
showAddSavingsModal() {
    this.injectSavingsModalCSS();
    const modal = document.getElementById('addSavingsModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('savingsDate').value = today;
    }
}

hideAddSavingsModal() {
    const modal = document.getElementById('addSavingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

showWithdrawModal() {
    this.injectSavingsModalCSS();
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Load available balance
        this.loadAvailableBalance();
    }
}

hideWithdrawModal() {
    const modal = document.getElementById('withdrawModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Helper Functions
setQuickAmount(amount) {
    document.getElementById('savingsAmount').value = amount;
}

async loadAvailableBalance() {
    // Implementasi load balance dari Firebase
    const currentUser = this.auth.currentUser;
    try {
        const savingsDoc = await this.db.collection('savings')
            .doc(currentUser.uid)
            .get();
        
        if (savingsDoc.exists) {
            const savings = savingsDoc.data();
            document.getElementById('availableBalance').textContent = this.formatRupiah(savings.currentAmount || 0);
        }
    } catch (error) {
        console.error('Error loading available balance:', error);
    }
}

async saveSavings() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const savingsData = {
            userId: currentUser.uid,
            amount: parseFloat(document.getElementById('savingsAmount').value) || 0,
            date: document.getElementById('savingsDate').value,
            category: document.getElementById('savingsCategory').value,
            description: document.getElementById('savingsDescription').value || '',
            type: 'deposit',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Validation
        if (savingsData.amount <= 0) {
            this.showToast('Jumlah harus lebih dari 0', 'error');
            return;
        }

        await this.db.collection('savings_transactions').add(savingsData);
        
        // Update total savings
        await this.updateTotalSavings(savingsData.amount, 'add');
        
        this.showToast('Tabungan berhasil ditambahkan! 💰', 'success');
        this.hideAddSavingsModal();
        
        // Refresh data
        this.loadTabunganData();
        
    } catch (error) {
        console.error('Error saving savings:', error);
        this.showToast('Gagal menambah tabungan', 'error');
    }
}

async processWithdrawal() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        const withdrawData = {
            userId: currentUser.uid,
            amount: parseFloat(document.getElementById('withdrawAmount').value) || 0,
            reason: document.getElementById('withdrawReason').value,
            notes: document.getElementById('withdrawNotes').value || '',
            type: 'withdrawal',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Check available balance
        const savingsDoc = await this.db.collection('savings')
            .doc(currentUser.uid)
            .get();
        
        const currentBalance = savingsDoc.exists ? savingsDoc.data().currentAmount || 0 : 0;
        
        if (withdrawData.amount > currentBalance) {
            this.showToast('Saldo tidak mencukupi', 'error');
            return;
        }

        if (withdrawData.amount <= 0) {
            this.showToast('Jumlah harus lebih dari 0', 'error');
            return;
        }

        await this.db.collection('savings_transactions').add(withdrawData);
        
        // Update total savings
        await this.updateTotalSavings(withdrawData.amount, 'subtract');
        
        this.showToast('Penarikan berhasil diproses!', 'success');
        this.hideWithdrawModal();
        
        // Refresh data
        this.loadTabunganData();
        
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        this.showToast('Gagal memproses penarikan', 'error');
    }
}

async updateTotalSavings(amount, operation) {
    const currentUser = this.auth.currentUser;
    const savingsRef = this.db.collection('savings').doc(currentUser.uid);
    
    try {
        const savingsDoc = await savingsRef.get();
        
        if (savingsDoc.exists) {
            const currentData = savingsDoc.data();
            const newAmount = operation === 'add' 
                ? (currentData.currentAmount || 0) + amount
                : (currentData.currentAmount || 0) - amount;
                
            await savingsRef.update({
                currentAmount: newAmount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Create new savings document
            await savingsRef.set({
                userId: currentUser.uid,
                currentAmount: operation === 'add' ? amount : -amount,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error updating total savings:', error);
    }
}

// Load tabungan data
async loadTabunganData() {
    try {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;

        await this.loadSavingsOverview();
        await this.loadSavingsGoals();
        await this.loadSavingsTransactions();
        
    } catch (error) {
        console.error('Error loading tabungan data:', error);
    }
}

async loadSavingsOverview() {
    // Implementasi load savings overview dari Firebase
    // ...
}

async loadSavingsGoals() {
    // Implementasi load savings goals dari Firebase
    // ...
}

async loadSavingsTransactions() {
    // Implementasi load savings transactions dari Firebase
    // ...
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
                    <p class="text-gray-400 text-sm">&copy; 2025 VLFinance. All rights reserved.</p>
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
