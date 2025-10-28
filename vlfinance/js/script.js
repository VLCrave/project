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

// Main VLFinance Application
class VLFinanceApp {
    constructor() {
        this.app = document.getElementById('app');
        this.currentPage = 'dashboard';
        this.isLoggedIn = false;
        this.userData = null;
        this.auth = auth;
        this.db = db;
        this.previousPage = null;
        this.isAnimating = false;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing VLFinance App...');
            
            // Show loading screen
            this.showLoading();

            // Initialize Firebase Auth Listener
            this.initAuthListener();

            // Simulate loading for better UX
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Hide loading and render app
            this.hideLoading();
            this.renderLayout();
            
            console.log('VLFinance App initialized successfully');

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.hideLoading();
            this.showError('Gagal memuat aplikasi. Silakan refresh halaman.');
        }
    }

    // Auth Management
    initAuthListener() {
    this.auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User logged in:', user.email);
            
            // Load user data - akan otomatis buat document jika belum ada
            await this.loadUserData(user.uid);
            
            // Cek status user dari Firestore
            if (this.userData && this.userData.status === false) {
                console.log('User status is false, redirecting to pending-active');
                // User sudah login tapi status false -> tampilkan pending-active
                this.setAuthState(true, {
                    displayName: user.displayName,
                    email: user.email,
                    uid: user.uid,
                    ...this.userData
                });
                this.navigateTo('pending-active');
                this.showNotification('Silakan upgrade ke premium untuk mengakses semua fitur', 'info');
            } else {
                console.log('User status is true, granting full access');
                // User premium atau status true -> akses penuh
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
        console.log('Loading user data for UID:', uid);
        const userDoc = await this.db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            console.log('User data found:', userDoc.data());
            this.userData = { 
                ...userDoc.data(),
                status: userDoc.data().status || false
            };
        } else {
            console.log('User document does not exist in Firestore, creating new one...');
            
            // Get current user from auth
            const currentUser = this.auth.currentUser;
            
            // Create user document dengan status default false
            const newUserData = {
                uid: uid,
                email: currentUser?.email || '',
                displayName: currentUser?.displayName || 'User',
                status: false, // Default status false
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
            
            console.log('New user document created with status false');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

    async register(email, password, displayName) {
    try {
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update profile
        await user.updateProfile({
            displayName: displayName
        });

        // Create user document dengan status: false
        await this.db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            status: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: {
                currency: 'IDR',
                language: 'id',
                theme: 'light'
            }
        });

        // Auto login setelah register berhasil
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
            case 'auth/email-already-in-use':
                errorMessage = 'Email sudah terdaftar';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password terlalu lemah';
                break;
        }

        return { success: false, error: errorMessage };
    }
}

renderPendingActivePage() {
    const userEmail = this.userData?.email || 'user@example.com';
    const userName = this.userData?.displayName || 'User';
    
    // URL gambar yang bisa disesuaikan - ganti dengan URL Anda
    const heroImageUrl = "https://mucuans.com/Mucuw-Expression/Banyak-duid.png";
    
    return `
        <section class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-4 px-3">
            <div class="max-w-md mx-auto">
                <!-- Compact Box -->
                <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-300">
                    
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 text-center">
                        <div class="flex items-center justify-center space-x-2 mb-3">
                            <i class="fas fa-crown text-lg text-yellow-300"></i>
                            <span class="text-lg font-bold">VLFinance Premium</span>
                        </div>
                        <div class="flex items-center justify-center space-x-3 bg-white/10 rounded-lg p-2">
                            <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                ${userName[0]?.toUpperCase() || 'U'}
                            </div>
                            <div class="text-left">
                                <h2 class="text-sm font-bold">${userName}</h2>
                                <p class="text-purple-200 text-xs truncate max-w-[140px]">${userEmail}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Hero Image Section -->
                    <div class="bg-gradient-to-br from-purple-100 to-blue-100 p-4 text-center border-b">
                        <div class="w-32 h-32 mx-auto mb-2 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <img 
                                src="${heroImageUrl}" 
                                alt="VLFinance Premium"
                                class="w-full h-full object-cover"
                                onerror="this.src='https://placehold.co/128x128/8b5cf6/ffffff?text=Premium'"
                            >
                        </div>
                        <p class="text-gray-600 text-xs font-medium">Akses Seumur Hidup - Upgrade Sekarang!</p>
                    </div>

                    <!-- Main Content -->
                    <div class="p-4">
                        <!-- Pricing - Super Compact -->
                        <div class="text-center mb-4">
                            <!-- Discount Badge -->
                            <div class="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block shadow-md">
                                ⚡ DISKON 80%
                            </div>
                            
                            <!-- Price Comparison Compact - Sesuai Gambar -->
                            <div class="flex items-center justify-center mb-3 space-x-3">
                                <div class="text-center">
                                    <div class="text-gray-500 line-through text-sm">Rp250.000</div>
                                </div>
                                <div class="text-green-500 font-bold text-lg">→</div>
                                <div class="text-center">
                                    <div class="flex items-baseline justify-center">
                                        <span class="text-3xl font-bold text-gray-800">Rp49.000</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button class="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all shadow font-bold text-sm transform hover:scale-105 duration-200" onclick="app.handleUpgrade()">
                                💳 Upgrade Sekarang
                            </button>
                            
                            <p class="text-green-600 text-xs font-semibold mt-2">
                                ✅ Hemat Rp 201.000
                            </p>
                        </div>

                        <!-- Features Grid Compact -->
                        <div class="mb-4">
                            <h4 class="font-semibold mb-3 text-gray-800 text-center text-sm">✨ Benefit Premium:</h4>
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div class="flex items-center space-x-1 bg-gray-50 rounded p-2">
                                    <i class="fas fa-chart-line text-purple-500 text-xs"></i>
                                    <span class="text-gray-700 font-medium">Analisis Real-time</span>
                                </div>
                                <div class="flex items-center space-x-1 bg-gray-50 rounded p-2">
                                    <i class="fas fa-receipt text-green-500 text-xs"></i>
                                    <span class="text-gray-700 font-medium">Scan Struk AI</span>
                                </div>
                                <div class="flex items-center space-x-1 bg-gray-50 rounded p-2">
                                    <i class="fas fa-piggy-bank text-blue-500 text-xs"></i>
                                    <span class="text-gray-700 font-medium">Investasi Smart</span>
                                </div>
                                <div class="flex items-center space-x-1 bg-gray-50 rounded p-2">
                                    <i class="fas fa-file-pdf text-red-500 text-xs"></i>
                                    <span class="text-gray-700 font-medium">Laporan PDF</span>
                                </div>
                                <div class="flex items-center space-x-1 bg-gray-50 rounded p-2">
                                    <i class="fas fa-cloud text-indigo-500 text-xs"></i>
                                    <span class="text-gray-700 font-medium">Backup Cloud</span>
                                </div>
                                <div class="flex items-center space-x-1 bg-gray-50 rounded p-2">
                                    <i class="fas fa-headset text-yellow-500 text-xs"></i>
                                    <span class="text-gray-700 font-medium">Support 24/7</span>
                                </div>
                            </div>
                        </div>

                        <!-- Cara Bayar Compact -->
                        <div class="border-t pt-4">
                            <div class="flex items-center mb-3">
                                <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                                    <i class="fas fa-credit-card text-white text-xs"></i>
                                </div>
                                <h3 class="text-sm font-bold text-gray-800">📝 Cara Bayar</h3>
                            </div>
                            
                            <div class="space-y-3 text-xs">
                                <!-- Step 1 -->
                                <div class="flex items-start space-x-2">
                                    <div class="flex-shrink-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] mt-0.5">
                                        1
                                    </div>
                                    <div>
                                        <p class="text-gray-800 font-semibold">Klik Upgrade</p>
                                        <p class="text-gray-600">Ke halaman Lynk.id</p>
                                    </div>
                                </div>
                                
                                <!-- Step 2 -->
                                <div class="flex items-start space-x-2">
                                    <div class="flex-shrink-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] mt-0.5">
                                        2
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-gray-800 font-semibold">Input email:</p>
                                        <div class="bg-yellow-50 border border-yellow-200 rounded p-2 mt-1">
                                            <code class="text-purple-600 font-bold text-xs break-all">${userEmail}</code>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Step 3 -->
                                <div class="flex items-start space-x-2">
                                    <div class="flex-shrink-0 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] mt-0.5">
                                        3
                                    </div>
                                    <div>
                                        <p class="text-gray-800 font-semibold">Bayar & Aktif!</p>
                                        <p class="text-gray-600">Akses langsung dalam 2 menit</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Payment Methods Compact -->
                            <div class="grid grid-cols-4 gap-1 mt-3">
                                <div class="bg-gray-50 rounded p-1 text-center border text-[10px]">
                                    <i class="fas fa-university text-blue-500 mb-1 block text-xs"></i>
                                    <span>Bank</span>
                                </div>
                                <div class="bg-gray-50 rounded p-1 text-center border text-[10px]">
                                    <i class="fab fa-gopay text-green-500 mb-1 block text-xs"></i>
                                    <span>Gopay</span>
                                </div>
                                <div class="bg-gray-50 rounded p-1 text-center border text-[10px]">
                                    <i class="fas fa-credit-card text-blue-400 mb-1 block text-xs"></i>
                                    <span>Kartu</span>
                                </div>
                                <div class="bg-gray-50 rounded p-1 text-center border text-[10px]">
                                    <i class="fas fa-qrcode text-purple-500 mb-1 block text-xs"></i>
                                    <span>QRIS</span>
                                </div>
                            </div>
                            
                            <!-- Important Notes Compact -->
                            <div class="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
                                <div class="flex items-start">
                                    <i class="fas fa-info-circle text-blue-500 mt-0.5 mr-1 text-xs"></i>
                                    <div>
                                        <p class="text-blue-800 font-semibold text-xs">Pastikan:</p>
                                        <ul class="text-blue-700 text-[10px] mt-0.5 list-disc list-inside space-y-0.5">
                                            <li>Email sama dengan akun VLFinance</li>
                                            <li>Screenshot bukti jika ada kendala</li>
                                            <li>Akses seumur hidup setelah bayar</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

// Tambahkan method ini di class VLFinanceApp
handleUpgrade() {
    // Ganti URL dengan link Lynk.id yang sebenarnya
    const lynkUrl = `http://lynk.id/vlfinance/w3v4g9vgz4kw/checkout?email=${encodeURIComponent(this.userData?.email || '')}`;
    
    // Buka tab baru untuk pembayaran
    window.open(lynkUrl, '_blank');
    
    // Show notification
    this.showNotification('Membuka halaman pembayaran... Pastikan email sama dengan akun VLFinance!', 'info');
    
    // Optional: Log event untuk analytics
    console.log('User clicked upgrade:', {
        email: this.userData?.email,
        timestamp: new Date().toISOString()
    });
}

// Tambahkan di login method untuk debugging
async login(email, password) {
    try {
        console.log('Attempting login with:', email);
        
        const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Login successful, user UID:', user.uid);
        
        // Pastikan user data juga di-load setelah login berhasil
        await this.loadUserData(user.uid);
        
        console.log('User data loaded:', this.userData);
        
        return { success: true };
    } catch (error) {
        console.error('Login error details:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Email attempted:', email);
        
        let errorMessage = 'Terjadi kesalahan saat login';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Email tidak terdaftar. Silakan daftar terlebih dahulu.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Password salah';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid';
                break;
            case 'auth/invalid-login-credentials':
                errorMessage = 'Email atau password salah. Pastikan Anda sudah mendaftar.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Terlalu banyak percobaan login. Coba lagi nanti';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Akun ini telah dinonaktifkan';
                break;
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

    // UI Management
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
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 
                       type === 'error' ? 'bg-red-500' : 
                       type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
        
        notification.className = `fixed top-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    setAuthState(isLoggedIn, userData = null) {
        this.isLoggedIn = isLoggedIn;
        this.userData = userData;
        this.renderLayout();
    }

    async navigateTo(page) {
        // Prevent multiple rapid navigations
        if (this.isAnimating || this.currentPage === page) return;
        
        this.isAnimating = true;
        this.previousPage = this.currentPage;
        
        // Show loading bar
        this.showLoadingBar();
        
        // Determine animation direction based on page flow
        const animationType = this.getAnimationType(page);
        
        // Add exit animation to current page
        await this.animatePageOut(animationType);
        
        // Change page
        this.currentPage = page;
        this.renderLayout();
        
        // Add enter animation to new page
        await this.animatePageIn(animationType);
        
        // Hide loading bar
        this.hideLoadingBar();
        
        this.isAnimating = false;
        
        // Scroll to top on page change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Rendering Methods
    renderLayout() {
        if (!this.app) return;
        
        this.app.innerHTML = `
            ${this.renderHeader()}
            <main class="min-h-screen">
                ${this.renderCurrentPage()}
            </main>
            ${this.renderFooter()}
        `;
        
        this.attachEventListeners();
        this.animatePageContent();
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
            <header class="gradient-bg text-white shadow-xl sticky top-0 z-50">
                <div class="container mx-auto px-4 py-3">
                    <nav class="flex justify-between items-center">
                        <!-- Logo -->
                        <div class="flex items-center space-x-3 cursor-pointer" onclick="app.navigateTo('dashboard')">
                            <i class="fas fa-coins text-2xl"></i>
                            <span class="text-xl font-bold">VLFinance</span>
                        </div>
                        
                        <!-- Desktop Navigation + Auth Buttons -->
                        <div class="hidden md:flex items-center space-x-8">
                            <!-- Navigation Links -->
                            <div class="flex items-center space-x-8">
                                <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium py-2 px-3 rounded-lg hover:bg-white/10" data-page="dashboard">Beranda</a>
                                <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium py-2 px-3 rounded-lg hover:bg-white/10" data-page="features">Fitur</a>
                                <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium py-2 px-3 rounded-lg hover:bg-white/10" data-page="pricing">Harga</a>
                                <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium py-2 px-3 rounded-lg hover:bg-white/10" data-page="about">Tentang</a>
                            </div>
                            
                            <!-- Separator -->
                            <div class="h-6 w-px bg-white/30"></div>
                            
                            <!-- Auth Buttons -->
                            <div class="flex items-center space-x-4">
                                <button class="bg-transparent border border-white/50 text-white py-2 px-5 rounded-lg hover:bg-white/10 hover:border-white transition-all font-medium btn-animate" data-page="login">
                                    <i class="fas fa-sign-in-alt mr-2"></i>Masuk
                                </button>
                                <button class="bg-cyan-500 text-white py-2 px-5 rounded-lg hover:bg-cyan-600 transition-all shadow-lg font-medium btn-animate pulse-glow" data-page="register">
                                    <i class="fas fa-user-plus mr-2"></i>Daftar Gratis
                                </button>
                            </div>
                        </div>
                        
                        <!-- Mobile Menu Button -->
                        <div class="flex items-center space-x-4 md:hidden">
                            <!-- Auth Buttons Mobile -->
                            <div class="flex items-center space-x-2">
                                <button class="bg-transparent border border-white/50 text-white py-2 px-3 rounded-lg hover:bg-white/10 transition-all text-sm" data-page="login">
                                    <i class="fas fa-sign-in-alt"></i>
                                </button>
                                <button class="bg-cyan-500 text-white py-2 px-3 rounded-lg hover:bg-cyan-600 transition-all shadow-lg text-sm pulse-glow" data-page="register">
                                    <i class="fas fa-user-plus"></i>
                                </button>
                            </div>
                            
                            <button class="text-white text-xl mobile-menu-btn p-2 hover:bg-white/10 rounded-lg transition-all">
                                <i class="fas fa-bars"></i>
                            </button>
                        </div>
                    </nav>
                    
                    <!-- Mobile Menu -->
                    <div class="md:hidden mt-4 hidden mobile-menu">
                        <div class="flex flex-col space-y-2 py-4">
                            <a href="#" class="nav-link flex items-center space-x-3 py-3 px-4 hover:bg-white/10 rounded-lg transition-all" data-page="dashboard">
                                <i class="fas fa-home w-5"></i>
                                <span>Beranda</span>
                            </a>
                            <a href="#" class="nav-link flex items-center space-x-3 py-3 px-4 hover:bg-white/10 rounded-lg transition-all" data-page="features">
                                <i class="fas fa-star w-5"></i>
                                <span>Fitur</span>
                            </a>
                            <a href="#" class="nav-link flex items-center space-x-3 py-3 px-4 hover:bg-white/10 rounded-lg transition-all" data-page="pricing">
                                <i class="fas fa-tag w-5"></i>
                                <span>Harga</span>
                            </a>
                            <a href="#" class="nav-link flex items-center space-x-3 py-3 px-4 hover:bg-white/10 rounded-lg transition-all" data-page="about">
                                <i class="fas fa-info-circle w-5"></i>
                                <span>Tentang</span>
                            </a>
                            
                            <!-- Mobile Auth Buttons -->
                            <div class="border-t border-white/20 pt-4 mt-2">
                                <div class="grid grid-cols-2 gap-3">
                                    <button class="bg-transparent border border-white/50 text-white py-3 px-4 rounded-lg hover:bg-white/10 transition-all font-medium text-center" data-page="login">
                                        <i class="fas fa-sign-in-alt mr-2"></i>Masuk
                                    </button>
                                    <button class="bg-cyan-500 text-white py-3 px-4 rounded-lg hover:bg-cyan-600 transition-all shadow-lg font-medium text-center pulse-glow" data-page="register">
                                        <i class="fas fa-user-plus mr-2"></i>Daftar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    renderAuthenticatedHeader() {
        const userInitial = this.userData?.displayName?.[0] || 'U';
        const userName = this.userData?.displayName || 'User';

        return `
            <header class="gradient-bg text-white shadow-xl sticky top-0 z-50">
                <div class="container mx-auto px-4 py-4">
                    <nav class="flex justify-between items-center">
                        <div class="flex items-center space-x-3 cursor-pointer" onclick="app.navigateTo('dashboard')">
                            <i class="fas fa-coins text-2xl"></i>
                            <span class="text-xl font-bold">VLFinance</span>
                        </div>
                        
                        <div class="hidden md:flex space-x-8">
                            <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium ${this.currentPage === 'dashboard' ? 'text-cyan-200' : ''}" data-page="dashboard">Dashboard</a>
                            <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium ${this.currentPage === 'finance' ? 'text-cyan-200' : ''}" data-page="finance">Keuangan</a>
                            <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium ${this.currentPage === 'features' ? 'text-cyan-200' : ''}" data-page="features">Fitur</a>
                            <a href="#" class="nav-link hover:text-cyan-200 transition-all font-medium ${this.currentPage === 'reports' ? 'text-cyan-200' : ''}" data-page="reports">Laporan</a>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
                                    <span class="font-semibold">${userInitial}</span>
                                </div>
                                <span class="hidden md:block">${userName}</span>
                            </div>
                            <button class="bg-transparent border border-white text-white py-2 px-4 rounded-lg hover:bg-white/10 transition-all font-medium logout-btn">
                                Keluar
                            </button>
                        </div>
                        
                        <button class="md:hidden text-white text-xl mobile-menu-btn">
                            <i class="fas fa-bars"></i>
                        </button>
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
        case 'finance':
            return this.renderFinancePage();
        case 'features':
            return this.renderFeaturesPage();
        case 'pricing':
            return this.renderPricingPage();
        case 'about':
            return this.renderAboutPage();
        case 'pending-verification':
            return this.renderPendingVerificationPage();
        case 'pending-active':  // ← PASTIKAN INI ADA
            return this.renderPendingActivePage();
        default:
            return this.renderPublicDashboard();
    }
}




// Tambahkan method ini di class VLFinanceApp
startCountdown() {
    // Set target date: 25 Mei 2026, 23:59 WIB
    const targetDate = new Date('2026-05-25T23:59:00+07:00').getTime();
    
    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
            // Countdown finished
            document.getElementById('countdown-days').textContent = '00';
            document.getElementById('countdown-hours').textContent = '00';
            document.getElementById('countdown-minutes').textContent = '00';
            document.getElementById('countdown-seconds').textContent = '00';
            return;
        }
        
        // Calculate days, hours, minutes, seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Update display
        document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
        document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');
    };
    
    // Update immediately
    updateCountdown();
    
    // Update every second
    setInterval(updateCountdown, 1000);
}

// Panggil startCountdown setelah render
// Tambahkan di method renderLayout() atau setelah renderCurrentPage()

    renderPublicDashboard() {
        return `
            <div class="relative overflow-hidden">
                <!-- Hero Section -->
                <section class="gradient-bg text-white py-20">
                    <div class="container mx-auto px-4">
                        <div class="flex flex-col lg:flex-row items-center justify-between">
                            <div class="lg:w-1/2 mb-12 lg:mb-0">
                                <h1 class="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                    Kelola Keuangan 
                                    <span class="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                                        Generasi Z
                                    </span>
                                </h1>
                                <p class="text-xl mb-8 text-cyan-100 leading-relaxed">
                                    Platform finansial modern yang dirancang khusus untuk generasi Z. 
                                    Kelola uang dengan cara yang menyenangkan dan mudah dipahami.
                                </p>
                                <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                                    <button class="bg-cyan-500 text-white py-4 px-8 rounded-lg hover:bg-cyan-600 transition-all shadow-lg text-lg font-semibold pulse-glow" data-page="register">
                                        Mulai Sekarang - Gratis
                                    </button>
                                    <button class="bg-transparent border border-white text-white py-4 px-8 rounded-lg hover:bg-white/10 transition-all text-lg font-semibold">
                                        <i class="fas fa-play mr-2"></i>Lihat Demo
                                    </button>
                                </div>
                                <div class="mt-8 flex items-center space-x-6 text-cyan-100">
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-shield-alt"></i>
                                        <span>Aman & Terpercaya</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-bolt"></i>
                                        <span>Real-time Sync</span>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <i class="fas fa-mobile-alt"></i>
                                        <span>Mobile Friendly</span>
                                    </div>
                                </div>
                            </div>
                            <div class="lg:w-1/2">
                                <div class="relative floating">
                                    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                                        <div class="grid grid-cols-2 gap-6">
                                            <div class="bg-white/10 rounded-xl p-6 text-center">
                                                <i class="fas fa-wallet text-3xl mb-4 text-cyan-300"></i>
                                                <h3 class="font-semibold mb-2">Pemasukan</h3>
                                                <p class="text-2xl font-bold">Rp 5.2Jt</p>
                                            </div>
                                            <div class="bg-white/10 rounded-xl p-6 text-center">
                                                <i class="fas fa-shopping-cart text-3xl mb-4 text-purple-300"></i>
                                                <h3 class="font-semibold mb-2">Pengeluaran</h3>
                                                <p class="text-2xl font-bold">Rp 2.8Jt</p>
                                            </div>
                                            <div class="bg-white/10 rounded-xl p-6 text-center">
                                                <i class="fas fa-piggy-bank text-3xl mb-4 text-green-300"></i>
                                                <h3 class="font-semibold mb-2">Tabungan</h3>
                                                <p class="text-2xl font-bold">Rp 8.5Jt</p>
                                            </div>
                                            <div class="bg-white/10 rounded-xl p-6 text-center">
                                                <i class="fas fa-chart-line text-3xl mb-4 text-yellow-300"></i>
                                                <h3 class="font-semibold mb-2">Investasi</h3>
                                                <p class="text-2xl font-bold">+15.2%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Features Section -->
                <section class="py-20 bg-white">
                    <div class="container mx-auto px-4">
                        <div class="text-center mb-16">
                            <h2 class="text-4xl font-bold mb-4">Mengapa Memilih VLFinance?</h2>
                            <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                                Platform lengkap untuk semua kebutuhan finansial generasi Z
                            </p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            ${this.renderFeatureCard('fas fa-chart-pie', 'Analisis Keuangan Mendalam', 'Dapatkan insight lengkap tentang kondisi keuangan Anda dengan analisis real-time dan rekomendasi personalized.')}
                            ${this.renderFeatureCard('fas fa-mobile-alt', 'Mobile-First Design', 'Akses aplikasi dari mana saja dengan desain yang dioptimalkan untuk smartphone dan tablet.')}
                            ${this.renderFeatureCard('fas fa-shield-alt', 'Keamanan Terjamin', 'Data Anda dilindungi dengan enkripsi tingkat tinggi dan sistem keamanan berlapis.')}
                        </div>
                    </div>
                </section>

                <!-- Stats Section -->
                <section class="py-20 gradient-bg-secondary text-white">
                    <div class="container mx-auto px-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <div>
                                <div class="text-4xl font-bold mb-2">50K+</div>
                                <div class="text-cyan-100">Pengguna Aktif</div>
                            </div>
                            <div>
                                <div class="text-4xl font-bold mb-2">Rp 200M+</div>
                                <div class="text-cyan-100">Aset Dikelola</div>
                            </div>
                            <div>
                                <div class="text-4xl font-bold mb-2">98%</div>
                                <div class="text-cyan-100">Kepuasan Pengguna</div>
                            </div>
                            <div>
                                <div class="text-4xl font-bold mb-2">24/7</div>
                                <div class="text-cyan-100">Support Online</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- CTA Section -->
                <section class="py-20 bg-gray-900 text-white">
                    <div class="container mx-auto px-4 text-center">
                        <h2 class="text-4xl font-bold mb-4">Siap Mengubah Cara Anda Mengelola Keuangan?</h2>
                        <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Bergabung dengan ribuan generasi Z yang sudah merasakan kemudahan mengelola keuangan dengan VLFinance
                        </p>
                        <button class="bg-cyan-500 text-white py-4 px-12 rounded-lg hover:bg-cyan-600 transition-all shadow-lg text-lg font-semibold pulse-glow" data-page="register">
                            Daftar Sekarang - Gratis Selamanya
                        </button>
                    </div>
                </section>
            </div>
        `;
    }

    renderFeatureCard(icon, title, description) {
        return `
            <div class="bg-white rounded-2xl p-8 shadow-lg hover-lift card-hover">
                <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center mb-6">
                    <i class="${icon} text-2xl"></i>
                </div>
                <h3 class="text-xl font-bold mb-4">${title}</h3>
                <p class="text-gray-600 leading-relaxed">${description}</p>
            </div>
        `;
    }

    renderLoginPage() {
        return `
            <section class="min-h-screen bg-gradient-to-br from-purple-50 to-cyan-50 py-12">
                <div class="container mx-auto px-4">
                    <div class="max-w-md mx-auto">
                        <div class="bg-white rounded-2xl shadow-xl p-8">
                            <div class="text-center mb-8">
                                <div class="flex items-center justify-center space-x-2 mb-4">
                                    <i class="fas fa-coins text-2xl text-purple-500"></i>
                                    <span class="text-xl font-bold">VLFinance</span>
                                </div>
                                <h2 class="text-2xl font-bold text-gray-800">Masuk ke Akun Anda</h2>
                                <p class="text-gray-600 mt-2">Selamat datang kembali!</p>
                            </div>
                            
                            <form id="loginForm">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input type="email" id="loginEmail" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                        <input type="password" id="loginPassword" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                    </div>
                                </div>
                                
                                <button type="submit" class="w-full bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition-all shadow-lg mt-6 font-semibold">
                                    Masuk
                                </button>
                            </form>
                            
                            <div class="text-center mt-6">
                                <p class="text-gray-600">Belum punya akun? 
                                    <a href="#" class="text-purple-500 hover:text-purple-600 font-semibold" data-page="register">Daftar di sini</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderRegisterPage() {
        return `
            <section class="min-h-screen bg-gradient-to-br from-cyan-50 to-purple-50 py-12">
                <div class="container mx-auto px-4">
                    <div class="max-w-md mx-auto">
                        <div class="bg-white rounded-2xl shadow-xl p-8">
                            <div class="text-center mb-8">
                                <div class="flex items-center justify-center space-x-2 mb-4">
                                    <i class="fas fa-coins text-2xl text-cyan-500"></i>
                                    <span class="text-xl font-bold">VLFinance</span>
                                </div>
                                <h2 class="text-2xl font-bold text-gray-800">Daftar Akun Baru</h2>
                                <p class="text-gray-600 mt-2">Mulai perjalanan finansial Anda</p>
                            </div>
                            
                            <form id="registerForm">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                                        <input type="text" id="registerName" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input type="email" id="registerEmail" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                        <input type="password" id="registerPassword" required minlength="6" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Password</label>
                                        <input type="password" id="registerConfirmPassword" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all">
                                    </div>
                                </div>
                                
                                <button type="submit" class="w-full bg-cyan-500 text-white py-3 px-4 rounded-lg hover:bg-cyan-600 transition-all shadow-lg mt-6 font-semibold">
                                    Daftar Sekarang
                                </button>
                            </form>
                            
                            <div class="text-center mt-6">
                                <p class="text-gray-600">Sudah punya akun? 
                                    <a href="#" class="text-cyan-500 hover:text-cyan-600 font-semibold" data-page="login">Masuk di sini</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderPendingVerificationPage() {
        return `
            <section class="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 py-12">
                <div class="container mx-auto px-4">
                    <div class="max-w-md mx-auto">
                        <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
                            <div class="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-envelope text-white text-2xl"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-4">Verifikasi Email Anda</h2>
                            <p class="text-gray-600 mb-6">
                                Kami telah mengirimkan email verifikasi ke alamat email Anda. 
                                Silakan klik tautan verifikasi untuk mengaktifkan akun Anda.
                            </p>
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <p class="text-yellow-800 text-sm">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    Periksa folder spam jika Anda tidak menemukan email verifikasi
                                </p>
                            </div>
                            <button class="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 transition-all shadow-lg font-semibold" onclick="app.auth.sendEmailVerification()">
                                Kirim Ulang Email Verifikasi
                            </button>
                            <button class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-all mt-3 font-semibold" data-page="login">
                                Kembali ke Login
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

 renderUserDashboard() {
    return `
        <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <!-- Header -->
            <header class="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
                <div class="container mx-auto px-4 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <i class="fas fa-wallet text-white text-lg"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-gray-800">FinTrack</h1>
                                <p class="text-sm text-gray-600">Hello, ${this.userData?.displayName || 'User'}! 👋</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <i class="fas fa-bell text-gray-600"></i>
                            </button>
                            <div class="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                ${this.userData?.displayName?.charAt(0) || 'U'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div class="container mx-auto px-4 py-6">
                <!-- Quick Stats -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    ${this.renderStatCard('pemasukan', 'Total Income', 'fa-wallet', 'green', 'income')}
                    ${this.renderStatCard('pengeluaran', 'Total Expense', 'fa-shopping-cart', 'red', 'expense')}
                    ${this.renderStatCard('tabungan', 'Savings', 'fa-piggy-bank', 'blue', 'savings')}
                    ${this.renderStatCard('saldo', 'Balance', 'fa-chart-line', 'purple', 'balance')}
                </div>

                <!-- Financial Planning Section -->
                <div class="mb-8">
                    <h2 class="text-xl font-bold text-gray-800 mb-4">Financial Planning</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${this.renderPlanningCard('tabungan', 'Savings Plan', 'fa-piggy-bank', 'Manage your savings goals', 'blue')}
                        ${this.renderPlanningCard('dana-darurat', 'Emergency Fund', 'fa-shield-alt', 'Calculate emergency needs', 'green')}
                        ${this.renderPlanningCard('liburan', 'Vacation Plan', 'fa-umbrella-beach', 'Plan your dream vacation', 'yellow')}
                        ${this.renderPlanningCard('kpr', 'Mortgage Sim', 'fa-home', 'Simulate your KPR', 'purple')}
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                    <!-- Left Column -->
                    <div class="xl:col-span-2 space-y-6">
                        <!-- Recent Transactions -->
                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-lg font-semibold text-gray-800">Recent Transactions</h2>
                                <button class="text-blue-600 hover:text-blue-700 text-sm font-medium view-all-transactions">
                                    View All
                                </button>
                            </div>
                            <div id="recent-transactions" class="space-y-3">
                                <div class="text-center py-8 text-gray-400">
                                    <i class="fas fa-receipt text-3xl mb-2"></i>
                                    <p>Loading transactions...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="space-y-6">
                        <!-- Financial Health -->
                        <div class="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
                            <div class="text-center mb-4">
                                <div class="w-20 h-20 mx-auto mb-3 relative">
                                    <svg class="w-full h-full" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
                                        <path id="health-progress" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="0, 100"/>
                                        <text x="18" y="20.5" class="text-sm font-bold" text-anchor="middle" fill="#ffffff">
                                            <tspan id="health-score">0</tspan>
                                            <tspan dx="-2" dy="-2" class="text-xs">%</tspan>
                                        </text>
                                    </svg>
                                </div>
                                <h3 class="font-semibold mb-1">Financial Health</h3>
                                <p class="text-blue-100 text-sm" id="health-status">Calculating...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

renderPlanningCard(type, title, icon, description, color) {
    const colorClasses = {
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-green-500 to-emerald-500',
        yellow: 'from-yellow-500 to-orange-500',
        purple: 'from-purple-500 to-pink-500'
    };

    return `
        <div class="planning-card bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all duration-300 group" data-page="${type}">
            <div class="flex items-start justify-between mb-3">
                <div class="w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <i class="fas ${icon} text-white text-lg"></i>
                </div>
            </div>
            <h3 class="font-semibold text-gray-800 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm mb-3">${description}</p>
            <div class="flex items-center text-blue-600 text-sm font-medium">
                <span>Manage</span>
                <i class="fas fa-chevron-right ml-2 text-xs group-hover:translate-x-1 transition-transform duration-200"></i>
            </div>
        </div>
    `;
}

// Fungsi utama untuk render halaman berdasarkan route
renderPage(route) {
    switch (route) {
        case '/':
        case '/dashboard':
            return this.renderUserDashboard();
        case '/income':
            return this.renderIncomeManagement();
        case '/expense':
            return this.renderExpenseManagement();
        case '/savings':
            return this.renderSavingsManagement();
        case '/transactions':
            return this.renderAllTransactions();
        case '/financial-planning':
            return this.renderFinancialPlanning();
        case '/emergency-fund':
            return this.renderEmergencyFund();
        case '/vacation-plan':
            return this.renderVacationPlan();
        case '/mortgage-sim':
            return this.renderMortgageSim();
        case '/profile':
            return this.renderProfilePage();
        case '/login':
            return this.renderLoginPage();
        case '/register':
            return this.renderRegisterPage();
        default:
            return this.renderUserDashboard();
    }
}

// Fungsi untuk menampilkan halaman
showPage(route) {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = this.renderPage(route);
        this.attachEventListeners(route);
        
        // Load data khusus untuk halaman tertentu
        this.loadPageSpecificData(route);
    }
}

// Fungsi untuk load data berdasarkan halaman
loadPageSpecificData(route) {
    switch (route) {
        case '/':
        case '/dashboard':
            this.loadDashboardData();
            break;
        case '/income':
            this.loadIncomeData();
            break;
        case '/expense':
            this.loadExpenseData();
            break;
        case '/savings':
            this.loadSavingsData();
            break;
        case '/transactions':
            this.loadAllTransactions();
            break;
    }
}

// Event listeners untuk dashboard
attachDashboardEventListeners() {
    // Event listeners untuk planning cards
    const planningCards = document.querySelectorAll('.planning-card');
    planningCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            this.navigateToPlanningPage(page);
        });
    });

    // View all transactions button
    const viewAllTransactionsBtn = document.querySelector('.view-all-transactions');
    if (viewAllTransactionsBtn) {
        viewAllTransactionsBtn.addEventListener('click', () => {
            this.showPage('/transactions');
        });
    }

    // Stat cards click events
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const type = e.currentTarget.getAttribute('data-type');
            this.navigateToStatPage(type);
        });
    });
}

// Navigasi ke halaman planning
navigateToPlanningPage(pageType) {
    const pageMap = {
        'tabungan': '/savings',
        'dana-darurat': '/emergency-fund',
        'liburan': '/vacation-plan',
        'kpr': '/mortgage-sim'
    };
    
    const route = pageMap[pageType] || '/dashboard';
    this.showPage(route);
}

// Navigasi berdasarkan stat card
navigateToStatPage(statType) {
    const pageMap = {
        'income': '/income',
        'expense': '/expense',
        'savings': '/savings',
        'balance': '/transactions'
    };
    
    const route = pageMap[statType] || '/dashboard';
    this.showPage(route);
}

// Fungsi render stat card (perbaikan)
renderStatCard(type, title, icon, color, dataType) {
    const colorClasses = {
        green: 'from-green-500 to-emerald-500',
        red: 'from-red-500 to-orange-500',
        blue: 'from-blue-500 to-cyan-500',
        purple: 'from-purple-500 to-pink-500'
    };

    return `
        <div class="stat-card bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all duration-300 group" data-type="${dataType}">
            <div class="flex items-center justify-between mb-3">
                <div class="w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <i class="fas ${icon} text-white text-lg"></i>
                </div>
                <i class="fas fa-chevron-right text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200"></i>
            </div>
            <h3 class="text-gray-600 text-sm mb-1">${title}</h3>
            <p class="text-2xl font-bold text-gray-800" id="${type}-amount">Rp 0</p>
            <div class="mt-2 text-xs text-gray-500" id="${type}-trend">Loading...</div>
        </div>
    `;
}

// Fungsi render planning card (perbaikan)
renderPlanningCard(type, title, icon, description, color) {
    const colorClasses = {
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-green-500 to-emerald-500',
        yellow: 'from-yellow-500 to-orange-500',
        purple: 'from-purple-500 to-pink-500'
    };

    return `
        <div class="planning-card bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all duration-300 group" data-page="${type}">
            <div class="flex items-start justify-between mb-3">
                <div class="w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <i class="fas ${icon} text-white text-lg"></i>
                </div>
            </div>
            <h3 class="font-semibold text-gray-800 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm mb-3">${description}</p>
            <div class="flex items-center text-blue-600 text-sm font-medium">
                <span>Manage</span>
                <i class="fas fa-chevron-right ml-2 text-xs group-hover:translate-x-1 transition-transform duration-200"></i>
            </div>
        </div>
    `;
}

// Contoh implementasi router sederhana
initRouter() {
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
        this.showPage(window.location.pathname);
    });

    // Initial page load
    const initialRoute = window.location.pathname || '/';
    this.showPage(initialRoute);
}

// Fungsi untuk navigasi programmatic
navigateTo(route) {
    window.history.pushState({}, '', route);
    this.showPage(route);
}

// Load data dashboard
loadDashboardData() {
    // Simulasi loading data
    setTimeout(() => {
        // Update stat cards
        const stats = {
            'pemasukan': 'Rp 8.500.000',
            'pengeluaran': 'Rp 5.200.000',
            'tabungan': 'Rp 3.300.000',
            'saldo': 'Rp 12.700.000'
        };

        Object.keys(stats).forEach(key => {
            const element = document.getElementById(`${key}-amount`);
            if (element) {
                element.textContent = stats[key];
            }
        });

        // Load recent transactions
        this.loadRecentTransactions();
        
        // Calculate financial health
        this.calculateFinancialHealth();
    }, 1000);
}

// Load recent transactions untuk dashboard
loadRecentTransactions() {
    const transactionsContainer = document.getElementById('recent-transactions');
    if (!transactionsContainer) return;

    // Contoh data transaksi
    const transactions = [
        { type: 'income', description: 'Gaji Bulanan', amount: 'Rp 8.500.000', date: 'Today', category: 'Salary' },
        { type: 'expense', description: 'Belanja Bulanan', amount: 'Rp 1.200.000', date: 'Today', category: 'Shopping' },
        { type: 'expense', description: 'Bayar Listrik', amount: 'Rp 450.000', date: 'Yesterday', category: 'Utilities' }
    ];

    if (transactions.length === 0) {
        transactionsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-receipt text-3xl mb-2"></i>
                <p>No transactions yet</p>
                <button class="text-blue-600 hover:text-blue-700 font-medium mt-2 add-first-transaction">
                    Add your first transaction
                </button>
            </div>
        `;
    } else {
        transactionsContainer.innerHTML = transactions.map(transaction => `
            <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }">
                        <i class="fas ${
                            transaction.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'
                        }"></i>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${transaction.description}</p>
                        <p class="text-sm text-gray-500">${transaction.category} • ${transaction.date}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }">${transaction.amount}</p>
                </div>
            </div>
        `).join('');
    }
}

// Calculate financial health score
calculateFinancialHealth() {
    // Simulasi perhitungan health score
    const healthScore = 75; // Contoh score
    const healthElement = document.getElementById('health-score');
    const healthProgress = document.getElementById('health-progress');
    const healthStatus = document.getElementById('health-status');

    if (healthElement) healthElement.textContent = healthScore;
    if (healthProgress) {
        const circumference = 2 * Math.PI * 15.9155;
        const dashArray = `${(healthScore / 100) * circumference}, ${circumference}`;
        healthProgress.setAttribute('stroke-dasharray', dashArray);
    }
    if (healthStatus) {
        let status = 'Good';
        if (healthScore >= 80) status = 'Excellent';
        else if (healthScore >= 60) status = 'Good';
        else if (healthScore >= 40) status = 'Fair';
        else status = 'Needs Improvement';
        healthStatus.textContent = status;
    }
}

// Inisialisasi aplikasi
initApp() {
    this.initRouter();
    
    // Cek status authentication
    this.checkAuthState();
    
    // Attach global event listeners
    this.attachGlobalEventListeners();
}

// Attach global event listeners
attachGlobalEventListeners() {
    // Logout handler, dll
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('global-logout')) {
            this.handleLogout();
        }
    });
}

// Komponen Stat Card yang Modern
renderStatCard(type, title, icon, color, category) {
    const colorClasses = {
        green: 'from-green-500 to-emerald-500',
        red: 'from-red-500 to-orange-500',
        blue: 'from-blue-500 to-cyan-500',
        purple: 'from-purple-500 to-pink-500'
    };

    return `
        <div class="dashboard-stat-card bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all duration-300" data-page="${type}">
            <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-gradient-to-r ${colorClasses[color]} rounded-lg flex items-center justify-center">
                    <i class="fas ${icon} text-white text-sm"></i>
                </div>
                <span class="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">${category}</span>
            </div>
            <div>
                <p class="text-sm text-gray-600 mb-1">${title}</p>
                <p class="text-lg font-bold text-gray-800" id="total-${type}">Loading...</p>
            </div>
        </div>
    `;
}

renderTransactionItem(transaction) {
    const isIncome = transaction.type === 'income';
    const icon = isIncome ? 'fa-arrow-down' : 'fa-arrow-up';
    const bgColor = isIncome ? 'bg-green-50' : 'bg-red-50';
    const iconColor = isIncome ? 'text-green-600' : 'text-red-600';
    const amountColor = isIncome ? 'text-green-600' : 'text-red-600';
    
    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    };

    return `
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors duration-200 group">
            <div class="flex items-center space-x-3 flex-1">
                <div class="w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <i class="fas ${icon} ${iconColor} text-sm"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <p class="font-medium text-gray-800 truncate">${transaction.name}</p>
                        <span class="${amountColor} font-semibold text-sm ml-2">
                            ${isIncome ? '+' : '-'}${formatRupiah(transaction.amount)}
                        </span>
                    </div>
                    <div class="flex items-center space-x-2 mt-1">
                        <p class="text-gray-500 text-xs">${new Date(transaction.date).toLocaleDateString('id-ID')}</p>
                        ${transaction.category ? `
                            <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                ${transaction.category}
                            </span>
                        ` : ''}
                    </div>
                    ${transaction.description ? `
                        <p class="text-gray-400 text-xs mt-1 truncate">${transaction.description}</p>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

renderFinancialGoal(goal) {
    const progress = Math.min(Math.round((goal.current / goal.target) * 100), 100);
    const progressColor = progress >= 100 ? 'from-green-500 to-emerald-500' : 
                         progress >= 75 ? 'from-blue-500 to-cyan-500' :
                         progress >= 50 ? 'from-yellow-500 to-orange-500' : 'from-red-500 to-pink-500';

    return `
        <div class="goal-card p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r ${progressColor} rounded-lg flex items-center justify-center">
                        <i class="fas ${goal.icon} text-white text-xs"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 text-sm">${goal.name}</h4>
                        <p class="text-xs text-gray-500">Target: ${this.formatCurrency(goal.target)}</p>
                    </div>
                </div>
                <span class="text-xs font-semibold ${progress >= 100 ? 'text-green-600' : 'text-blue-600'}">
                    ${progress}%
                </span>
            </div>
            
            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full bg-gradient-to-r ${progressColor} transition-all duration-1000 ease-out" 
                     style="width: ${progress}%"></div>
            </div>
            
            <div class="flex justify-between text-xs text-gray-600">
                <span>Terkumpul: ${this.formatCurrency(goal.current)}</span>
                <span>Sisa: ${this.formatCurrency(goal.target - goal.current)}</span>
            </div>
        </div>
    `;
}

setupDashboardEvents() {
    // Smooth card interactions
    document.querySelectorAll('.dashboard-stat-card, .goal-card').forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', (e) => {
            e.currentTarget.style.transform = 'translateY(0)';
        });
    });

    // Quick actions dengan feedback
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            this.handleQuickAction(action);
            
            // Add click feedback
            e.currentTarget.style.transform = 'scale(0.95)';
            setTimeout(() => {
                e.currentTarget.style.transform = 'scale(1)';
            }, 150);
        });
    });

    // Navigation dengan smooth transition
    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            this.navigateWithTransition(page);
        });
    });
}

// Navigasi dengan animasi
async navigateWithTransition(page) {
    const mainContent = document.querySelector('.container');
    if (mainContent) {
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(10px)';
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        this.navigateToPage(page);
        
        // Restore animation untuk konten baru
        setTimeout(() => {
            const newContent = document.querySelector('.container');
            if (newContent) {
                newContent.style.opacity = '1';
                newContent.style.transform = 'translateY(0)';
            }
        }, 50);
    } else {
        this.navigateToPage(page);
    }
}

// Format currency dengan style modern
formatCurrency(amount) {
    if (amount >= 1000000) {
        return `Rp ${(amount / 1000000).toFixed(1)}Jt`;
    } else if (amount >= 1000) {
        return `Rp ${(amount / 1000).toFixed(0)}Rb`;
    }
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Show notification toast
showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border-l-4 transform translate-x-full transition-transform duration-300 ${
        type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
        type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
        'bg-blue-50 border-blue-500 text-blue-700'
    }`;
    
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
            }"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(full)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

    renderFinancePage() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-8">Manajemen Keuangan</h1>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-xl p-6 shadow-lg mb-6">
                            <h3 class="text-xl font-bold mb-4">Ringkasan Keuangan</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="text-center p-4 bg-green-50 rounded-lg">
                                    <p class="text-green-600 font-semibold">Pemasukan</p>
                                    <p class="text-2xl font-bold">Rp 5.2Jt</p>
                                </div>
                                <div class="text-center p-4 bg-red-50 rounded-lg">
                                    <p class="text-red-600 font-semibold">Pengeluaran</p>
                                    <p class="text-2xl font-bold">Rp 2.8Jt</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl p-6 shadow-lg">
                        <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
                        <div class="space-y-3">
                            <button class="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-all">
                                <i class="fas fa-plus mr-2"></i>Tambah Pemasukan
                            </button>
                            <button class="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-all">
                                <i class="fas fa-minus mr-2"></i>Tambah Pengeluaran
                            </button>
                            <button class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-all">
                                <i class="fas fa-chart-pie mr-2"></i>Lihat Laporan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFeaturesPage() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-8">Fitur VLFinance</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${this.renderFeatureCard('fas fa-wallet', 'Manajemen Budget', 'Kelola pemasukan dan pengeluaran dengan kategori yang dapat disesuaikan')}
                    ${this.renderFeatureCard('fas fa-chart-line', 'Analisis Investasi', 'Pantau portofolio investasi dan perkembangan aset Anda')}
                    ${this.renderFeatureCard('fas fa-piggy-bank', 'Dana Darurat', 'Siapkan dana darurat dengan perencanaan yang tepat')}
                    ${this.renderFeatureCard('fas fa-umbrella-beach', 'Tabungan Liburan', 'Rencanakan liburan impian dengan simulasi tabungan')}
                    ${this.renderFeatureCard('fas fa-home', 'Simulasi KPR', 'Hitung cicilan KPR dan rencana pembelian rumah')}
                    ${this.renderFeatureCard('fas fa-heartbeat', 'Cek Kesehatan Keuangan', 'Analisis kesehatan keuangan dan dapatkan rekomendasi')}
                </div>
            </div>
        `;
    }

    renderPricingPage() {
        return `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">Pilih Paket yang Tepat untuk Anda</h1>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    ${this.renderPricingCard('Gratis', '0', ['Manajemen Budget Dasar', '3 Kategori Custom', 'Analisis Sederhana', 'Support Email'])}
                    ${this.renderPricingCard('Premium', '50.000', ['Semua Fitur Gratis', 'Kategori Unlimited', 'Analisis Mendalam', 'Investasi Tracking', 'Support Priority'], true)}
                    ${this.renderPricingCard('Enterprise', '150.000', ['Semua Fitur Premium', 'Laporan Advanced', 'API Access', 'Dedicated Support', 'Custom Features'])}
                </div>
            </div>
        `;
    }

    renderPricingCard(plan, price, features, highlighted = false) {
        const borderClass = highlighted ? 'border-2 border-purple-500' : 'border border-gray-200';
        const buttonClass = highlighted ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-500 hover:bg-gray-600';
        
        return `
            <div class="bg-white rounded-2xl p-8 shadow-lg ${borderClass} ${highlighted ? 'transform scale-105' : ''}">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${plan}</h3>
                    <div class="flex items-baseline justify-center mb-4">
                        <span class="text-3xl font-bold">Rp</span>
                        <span class="text-4xl font-bold mx-1">${price}</span>
                        <span class="text-gray-600">/bulan</span>
                    </div>
                </div>
                <ul class="space-y-3 mb-6">
                    ${features.map(feature => `
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>${feature}</span>
                        </li>
                    `).join('')}
                </ul>
                <button class="w-full ${buttonClass} text-white py-3 px-4 rounded-lg transition-all shadow-lg font-semibold">
                    Pilih Paket
                </button>
            </div>
        `;
    }

    renderAboutPage() {
        return `
            <div class="container mx-auto px-4 py-8">
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center">Tentang VLFinance</h1>
                    <div class="bg-white rounded-2xl p-8 shadow-lg">
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            VLFinance adalah platform financial advice yang dirancang khusus untuk generasi Z Indonesia. 
                            Kami memahami bahwa generasi Z memiliki kebutuhan dan preferensi yang unik dalam mengelola keuangan.
                        </p>
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Misi Kami</h2>
                        <p class="text-gray-600 mb-6 leading-relaxed">
                            Membantu generasi Z mencapai kebebasan finansial melalui edukasi, alat, dan panduan 
                            yang mudah dipahami dan diterapkan dalam kehidupan sehari-hari.
                        </p>
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">Tim Kami</h2>
                        <p class="text-gray-600 leading-relaxed">
                            VLFinance dikembangkan oleh tim yang terdiri dari ahli keuangan, pengembang perangkat lunak, 
                            dan desainer yang memahami kebutuhan generasi Z. Kami berkomitmen untuk memberikan 
                            pengalaman terbaik dalam mengelola keuangan.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    renderFooter() {
        return `
            <footer class="bg-gray-900 text-white py-8">
                <div class="container mx-auto px-4">
                    <div class="flex flex-col md:flex-row items-center justify-between">
                        <!-- Logo & Description -->
                        <div class="text-center md:text-left mb-6 md:mb-0">
                            <div class="flex items-center justify-center md:justify-start space-x-2 mb-3">
                                <i class="fas fa-coins text-2xl text-cyan-400"></i>
                                <span class="text-xl font-bold">VLFinance</span>
                            </div>
                            <p class="text-gray-400 text-sm">
                                Platform financial advice untuk Generasi Z Indonesia
                            </p>
                        </div>
                        
                        <!-- Social Media -->
                        <div class="flex items-center space-x-6">
                            <a href="#" class="text-gray-400 hover:text-cyan-400 transition-all transform hover:scale-110" 
                               title="Instagram">
                                <i class="fab fa-instagram text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-cyan-400 transition-all transform hover:scale-110"
                               title="TikTok">
                                <i class="fab fa-tiktok text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-cyan-400 transition-all transform hover:scale-110"
                               title="Twitter">
                                <i class="fab fa-twitter text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-400 hover:text-cyan-400 transition-all transform hover:scale-110"
                               title="YouTube">
                                <i class="fab fa-youtube text-xl"></i>
                            </a>
                        </div>
                    </div>
                    
                    <!-- Copyright -->
                    <div class="border-t border-gray-800 mt-6 pt-6 text-center text-gray-400 text-sm">
                        <p>&copy; 2024 VLFinance. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        `;
    }

    // Determine animation type based on page flow
    getAnimationType(nextPage) {
        const pageOrder = ['dashboard', 'features', 'pricing', 'about', 'login', 'register', 'finance', 'reports'];
        const currentIndex = pageOrder.indexOf(this.currentPage);
        const nextIndex = pageOrder.indexOf(nextPage);
        
        if (nextIndex > currentIndex) {
            return 'slide-left';
        } else if (nextIndex < currentIndex) {
            return 'slide-right';
        } else {
            return 'fade';
        }
    }

    // Animate page out
    async animatePageOut(animationType) {
        const mainElement = document.querySelector('main');
        if (!mainElement) return;
        
        mainElement.classList.add(`page-transition-exit`, `${animationType}-exit`);
        
        await new Promise(resolve => {
            setTimeout(resolve, 300);
        });
    }

    // Animate page in
    async animatePageIn(animationType) {
        const mainElement = document.querySelector('main');
        if (!mainElement) return;
        
        mainElement.classList.add(`page-transition-enter`, `${animationType}-enter`);
        
        // Trigger reflow
        mainElement.offsetHeight;
        
        mainElement.classList.add(`page-transition-enter-active`, `${animationType}-enter-active`);
        
        await new Promise(resolve => {
            setTimeout(resolve, 400);
        });
        
        // Remove animation classes
        mainElement.classList.remove(
            'page-transition-enter', 'page-transition-enter-active',
            'page-transition-exit', 'page-transition-exit-active',
            'slide-left-enter', 'slide-left-enter-active',
            'slide-right-enter', 'slide-right-enter-active',
            'fade-enter', 'fade-enter-active'
        );
    }

    // Loading bar methods
    showLoadingBar() {
        let loadingBar = document.getElementById('pageLoadingBar');
        if (!loadingBar) {
            loadingBar = document.createElement('div');
            loadingBar.id = 'pageLoadingBar';
            loadingBar.className = 'page-loading-bar';
            document.body.appendChild(loadingBar);
        }
        loadingBar.classList.add('active');
    }

    hideLoadingBar() {
        const loadingBar = document.getElementById('pageLoadingBar');
        if (loadingBar) {
            loadingBar.classList.remove('active');
            setTimeout(() => {
                if (loadingBar.parentNode) {
                    loadingBar.parentNode.removeChild(loadingBar);
                }
            }, 300);
        }
    }

    // Animate page content after render
    animatePageContent() {
        // Animate cards with stagger effect
        const cards = document.querySelectorAll('.card-hover, .bg-white');
        cards.forEach((card, index) => {
            card.classList.add('stagger-item');
            setTimeout(() => {
                card.classList.add('animate');
            }, index * 100);
        });

        // Animate buttons
        const buttons = document.querySelectorAll('button:not(.mobile-menu-btn)');
        buttons.forEach((button, index) => {
            button.classList.add('scale-enter');
            setTimeout(() => {
                button.classList.add('scale-enter-active');
            }, index * 50 + 200);
        });

        // Animate feature cards with bounce effect
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.classList.add('bounce-in');
        });
    }

    // Event Listeners
    attachEventListeners() {
        // Navigation links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // Mobile menu
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const result = await this.logout();
                if (result.success) {
                    this.navigateTo('dashboard');
                }
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
                    this.navigateTo('dashboard');
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
                    this.navigateTo('pending-verification');
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
