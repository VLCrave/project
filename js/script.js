document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const db = firebase.firestore();
    const popup = document.getElementById("popup-greeting");
    const overlay = document.getElementById("popup-overlay");
    const closeBtn = document.getElementById("close-popup");
    const popupImg = document.getElementById("popup-img");
    const popupText = document.getElementById("popup-text");
    const checkoutBtn = document.querySelector(".checkout-btn-final");

    if (!popup || !overlay || !popupImg || !popupText || !closeBtn) return;

    let popupShown = false;

    try {
      // 🔄 Ambil jam layanan
      const jamDoc = await db.collection("pengaturan").doc("jam_layanan").get();
      const jamData = jamDoc.exists ? jamDoc.data() : { aktif: true, buka: "08:00", tutup: "22:00", mode: "otomatis" };

      const now = new Date();
      const hour = now.getHours();
      const bukaHour = parseInt((jamData.buka || "08:00").split(":")[0]);
      const tutupHour = parseInt((jamData.tutup || "22:00").split(":")[0]);
      const isOpen = jamData.aktif && (jamData.mode === "otomatis" ? hour >= bukaHour && hour < tutupHour : true);

      // ⬇️ Jika jam layanan aktif, tampilkan
      if (jamData.aktif && !popupShown) {
        popup.style.display = "block";
        overlay.style.display = "block";
        document.body.classList.add("popup-active");

        popupImg.src = isOpen ? "./img/open.png" : "./img/close.png";
        popupText.innerHTML = isOpen
          ? `<strong>✅ Layanan Aktif</strong><br>Selamat berbelanja!`
          : `<strong>⛔ Layanan Tutup</strong><br>Buka setiap ${jamData.buka} - ${jamData.tutup}`;

        if (!isOpen && checkoutBtn) {
          checkoutBtn.disabled = true;
          checkoutBtn.textContent = "Layanan Tutup";
          checkoutBtn.style.opacity = "0.6";
          checkoutBtn.style.cursor = "not-allowed";
        }

        popupShown = true;
      }

      // 🔄 Ambil overlay popup
      const overlayDoc = await db.collection("pengaturan").doc("popup_overlay").get();
      const overlayData = overlayDoc.exists ? overlayDoc.data() : null;

      if (overlayData && overlayData.aktif && !popupShown) {
        const user = firebase.auth().currentUser;
        let roleUser = "";

        if (user) {
          const uDoc = await db.collection("users").doc(user.uid).get();
          roleUser = uDoc.exists ? (uDoc.data().role || "").toLowerCase() : "";
        }

        const allowedRoles = Array.isArray(overlayData.role) ? overlayData.role.map(r => r.toLowerCase()) : ["all"];
        const bolehTampil = allowedRoles.includes("all") || allowedRoles.includes(roleUser);

        if (bolehTampil) {
          popup.style.display = "block";
          overlay.style.display = "block";
          document.body.classList.add("popup-active");

          popupImg.src = overlayData.gambar || "./img/default.png";
          popupText.innerHTML = `
            <strong>${overlayData.judul || "Informasi"}</strong><br>
            ${overlayData.deskripsi || ""}
          `;

          popupShown = true;
        }
      }

      // ✅ Fungsi Tutup Popup
      closeBtn.onclick = async () => {
        popup.style.display = "none";
        overlay.style.display = "none";
        document.body.classList.remove("popup-active");

        const user = firebase.auth().currentUser;
        let role = "";
        if (user) {
          const uDoc = await db.collection("users").doc(user.uid).get();
          role = uDoc.exists ? (uDoc.data().role || "").toLowerCase() : "";
        }

        if (typeof loadContent === "function") {
          if (role === "seller") loadContent("seller-dashboard");
          else if (role === "driver") loadContent("driver-dashboard");
          else loadContent("productlist");
        }

        if (!isOpen && jamData.aktif) {
          alert(`⚠️ Layanan tutup.\nJam buka: ${jamData.buka} - ${jamData.tutup}`);
        }
      };
    } catch (err) {
      console.error("❌ Error tampilkan popup:", err);
    }
  })();
});

// === Fungsi Utama ===
async function loadContent(page) {
  window.currentPage = page;

  const main = document.getElementById("page-container");
  const bannerDiv = document.getElementById("home-banner-wrapper");
  let content = '';

  bannerDiv.innerHTML = "";
  bannerDiv.style.display = "none";

if (page === 'productlist') {
  const homeBanner = `
<!-- Mobile First Banner -->
<section id="home-banner" class="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
  <div class="container mx-auto px-4 py-6">
    <!-- Mobile Layout -->
    <div class="block md:hidden">
      <!-- Header Mobile -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <i class="fa-solid fa-utensils text-white"></i>
          </div>
          <span class="font-bold text-lg">VLCrave</span>
        </div>
        <div class="flex items-center space-x-3">
          <button class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <i class="fa-solid fa-bell text-white text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Hero Content Mobile -->
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold mb-2 leading-tight">
          Makan enak?
          <span class="block text-white/90 text-xl font-semibold mt-1">
            VLCrave Express-in aja
          </span>
        </h1>
        <p class="text-white/90 text-sm mb-4 leading-relaxed">
          Pesan makanan favoritmu dengan mudah dan cepat
        </p>
      </div>

      <!-- Location Selector Mobile -->
      <div class="lokasi-wrapper mb-4">
        <div class="relative">
          <div class="lokasi-custom-select bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-3 cursor-pointer flex items-center justify-between" id="lokasiSelectBox">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <i class="fa-solid fa-location-dot text-orange-300 text-sm"></i>
              <span id="lokasiSelectText" class="text-white font-medium text-sm truncate">Pilih lokasi pengiriman</span>
            </div>
            <i class="fa-solid fa-chevron-down text-white/60 text-sm ml-2"></i>
          </div>
          
          <div id="lokasiDropdown" class="lokasi-dropdown absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 hidden">
            <div id="lokasiTerkiniBtn" class="flex items-center space-x-3 px-3 py-3 hover:bg-orange-50 cursor-pointer transition-colors duration-200 border-b border-gray-100">
              <i class="fa-solid fa-location-crosshairs text-orange-500 text-sm"></i>
              <span class="text-gray-800 font-medium text-sm">Gunakan Lokasi Terkini</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Button Mobile -->
      <button class="eksplor-btn w-full bg-white text-orange-600 font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center space-x-2" id="eksplorBtn">
        <span class="text-sm">Eksplor Restoran</span>
        <i class="fa-solid fa-arrow-right text-xs"></i>
      </button>
    </div>

    <!-- Desktop Layout -->
    <div class="hidden md:flex flex-col lg:flex-row items-center justify-between gap-6">
      <!-- Left Content -->
      <div class="flex-1 text-center lg:text-left">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
          <i class="fa-solid fa-utensils text-2xl text-white"></i>
        </div>
        <h1 class="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
          Makan enak?
          <span class="block text-white/90 text-2xl lg:text-3xl font-semibold mt-1">
            VLCrave Express-in aja
          </span>
        </h1>
        <p class="text-white/90 text-lg mb-6 leading-relaxed max-w-2xl">
          Pesan makanan favoritmu dengan mudah dan cepat. 
          Banyak pilihan restoran terbaik dalam genggamanmu.
        </p>

        <!-- Location Selector -->
        <div class="lokasi-wrapper max-w-md">
          <label class="block text-white/80 text-sm font-medium mb-2">Lokasi Pengiriman</label>
          <div class="relative">
            <div class="lokasi-custom-select bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/15 transition-all duration-200 flex items-center justify-between group" id="lokasiSelectBoxDesktop">
              <div class="flex items-center space-x-3">
                <i class="fa-solid fa-location-dot text-orange-300"></i>
                <span id="lokasiSelectTextDesktop" class="text-white font-medium">Pilih lokasi pengiriman</span>
              </div>
              <i class="fa-solid fa-chevron-down text-white/60 group-hover:text-white transition-all duration-200"></i>
            </div>
            
            <div id="lokasiDropdownDesktop" class="lokasi-dropdown absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 hidden overflow-hidden">
              <div id="lokasiTerkiniBtnDesktop" class="flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors duration-200 border-b border-gray-100">
                <i class="fa-solid fa-location-crosshairs text-orange-500"></i>
                <span class="text-gray-800 font-medium">Gunakan Lokasi Terkini</span>
              </div>
            </div>
          </div>
        </div>

        <button class="eksplor-btn mt-6 bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-8 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2" id="eksplorBtnDesktop">
          <span>Eksplor Restoran</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>

      <!-- Right Image/Illustration -->
      <div class="flex-1 flex justify-center lg:justify-end">
        <div class="relative">
          <div class="w-64 h-64 lg:w-80 lg:h-80 bg-white/10 rounded-full flex items-center justify-center">
            <div class="w-48 h-48 lg:w-60 lg:h-60 bg-white/20 rounded-full flex items-center justify-center">
              <i class="fa-solid fa-burger text-white text-6xl lg:text-7xl"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Promo Banner Section -->
<section class="bg-white border-b">
  <div class="container mx-auto px-4 py-3">
    <div class="flex overflow-x-auto space-x-3 pb-2 scrollbar-hide -mx-2 px-2">
      ${Array.from({length: 8}, (_, i) => `
        <div class="flex-shrink-0 w-32 sm:w-40 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 text-white shadow-sm">
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-tag text-xs"></i>
            <span class="font-semibold text-sm">Diskon ${20 + i*5}%</span>
          </div>
          <p class="text-xs mt-1 opacity-90">Min. Rp 50rb</p>
        </div>
      `).join('')}
    </div>
  </div>
</section>

<!-- Category Filter -->
<section class="bg-white border-b sticky top-0 z-30 safe-area-top">
  <div class="container mx-auto px-4 py-3">
    <div class="flex overflow-x-auto space-x-3 scrollbar-hide -mx-2 px-2">
      ${['Semua', '🏃 Cepat Saji', '🇮🇩 Indonesia', '🥡 Chinese', '🍣 Japanese', '🍰 Dessert', '🥤 Minuman', '🦐 Seafood', '🍕 Western', '🌶️ Pedas'].map((cat, index) => `
        <button class="category-btn flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 whitespace-nowrap ${
          index === 0 
            ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
            : 'border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600'
        }">
          ${cat}
        </button>
      `).join('')}
    </div>
  </div>
</section>
  `;
  
  bannerDiv.innerHTML = homeBanner;
  bannerDiv.style.display = "block";

  // === Konten Produk ===
  content = `
    <div class="productlist-wrapper bg-gray-50 min-h-screen safe-area-bottom">
      <section class="py-4 sm:py-6">
        <div class="container mx-auto px-4">
          <!-- Header Section -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div class="w-full sm:w-auto">
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Restoran Terdekat</h2>
              <p class="text-gray-600 mt-1 text-sm sm:text-base">Temukan makanan terbaik di sekitarmu</p>
            </div>
            <div class="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-between sm:justify-start">
              <div class="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-300 flex-1 sm:flex-none justify-center">
                <i class="fa-solid fa-filter text-gray-500 text-sm"></i>
                <span class="text-gray-700 font-medium text-sm">Filter</span>
              </div>
              <div class="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-300 flex-1 sm:flex-none justify-center">
                <i class="fa-solid fa-arrow-down-wide-short text-gray-500 text-sm"></i>
                <span class="text-gray-700 font-medium text-sm">Urutkan</span>
              </div>
            </div>
          </div>

          <!-- Products Grid -->
          <div id="produk-container" class="produk-list-container grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"></div>

          <!-- Loading More -->
          <div class="flex justify-center mt-6 sm:mt-8">
            <div class="loading-more hidden bg-white px-6 py-3 rounded-full border border-gray-300 text-gray-600 font-medium text-sm sm:text-base">
              <i class="fa-solid fa-spinner fa-spin mr-2"></i>
              Memuat lebih banyak...
            </div>
          </div>

          <!-- Empty State -->
          <div id="empty-state" class="hidden text-center py-12">
            <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-utensils text-gray-400 text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-600 mb-2">Tidak ada restoran</h3>
            <p class="text-gray-500 text-sm">Coba ubah filter atau pilih lokasi lain</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Mobile Bottom Safe Area Spacer -->
    <div class="h-20 sm:hidden"></div>
  `;
  
  main.innerHTML = content;

  // === Render produk & dropdown ===
  renderProductList();
  loadDropdownLokasi();

  // === Event listener dinamis dengan optimasi mobile ===
  requestAnimationFrame(() => {
    // Mobile elements
    const lokasiSelectBox = document.getElementById("lokasiSelectBox");
    const lokasiTerkiniBtn = document.getElementById("lokasiTerkiniBtn");
    const eksplorBtn = document.getElementById("eksplorBtn");

    // Desktop elements
    const lokasiSelectBoxDesktop = document.getElementById("lokasiSelectBoxDesktop");
    const lokasiTerkiniBtnDesktop = document.getElementById("lokasiTerkiniBtnDesktop");
    const eksplorBtnDesktop = document.getElementById("eksplorBtnDesktop");

    const categoryBtns = document.querySelectorAll('.category-btn');

    // Mobile location dropdown handler
    if (lokasiSelectBox) {
      lokasiSelectBox.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("lokasiDropdown");
        if (dropdown) {
          const isVisible = dropdown.style.display === "block";
          dropdown.style.display = isVisible ? "none" : "block";
          
          // Adjust position for mobile
          if (!isVisible) {
            const rect = lokasiSelectBox.getBoundingClientRect();
            dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
            dropdown.style.width = `${rect.width}px`;
          }
        }
      });
    }

    // Desktop location dropdown handler
    if (lokasiSelectBoxDesktop) {
      lokasiSelectBoxDesktop.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("lokasiDropdownDesktop");
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
        }
      });
    }

    // Close dropdown when clicking outside (both mobile and desktop)
    document.addEventListener('click', (e) => {
      const mobileDropdown = document.getElementById("lokasiDropdown");
      const mobileSelectBox = document.getElementById("lokasiSelectBox");
      const desktopDropdown = document.getElementById("lokasiDropdownDesktop");
      const desktopSelectBox = document.getElementById("lokasiSelectBoxDesktop");
      
      if (mobileDropdown && mobileSelectBox && !mobileSelectBox.contains(e.target) && !mobileDropdown.contains(e.target)) {
        mobileDropdown.style.display = "none";
      }
      
      if (desktopDropdown && desktopSelectBox && !desktopSelectBox.contains(e.target) && !desktopDropdown.contains(e.target)) {
        desktopDropdown.style.display = "none";
      }
    });

    // Current location handler (Mobile)
    if (lokasiTerkiniBtn) {
      lokasiTerkiniBtn.addEventListener("click", () => {
        handleLocationSelection('mobile');
      });
    }

    // Current location handler (Desktop)
    if (lokasiTerkiniBtnDesktop) {
      lokasiTerkiniBtnDesktop.addEventListener("click", () => {
        handleLocationSelection('desktop');
      });
    }

    // Explore button handlers
    if (eksplorBtn) {
      eksplorBtn.addEventListener("click", eksplorRestoran);
    }
    if (eksplorBtnDesktop) {
      eksplorBtnDesktop.addEventListener("click", eksplorRestoran);
    }

    // Category filter handlers dengan optimasi touch
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        // Remove active class from all buttons
        categoryBtns.forEach(b => {
          b.classList.remove('bg-orange-500', 'text-white', 'border-orange-500', 'shadow-sm');
          b.classList.add('border-gray-300', 'text-gray-600');
        });
        
        // Add active class to clicked button
        this.classList.remove('border-gray-300', 'text-gray-600');
        this.classList.add('bg-orange-500', 'text-white', 'border-orange-500', 'shadow-sm');
        
        // Filter products based on category
        const category = this.textContent.replace(/[^\w\s]/gi, '').trim();
        filterProductsByCategory(category);
      });

      // Touch feedback untuk mobile
      btn.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
      });
      
      btn.addEventListener('touchend', function() {
        this.style.transform = 'scale(1)';
      });
    });

    // Handle window resize untuk responsive behavior
    window.addEventListener('resize', handleResponsiveLayout);
  });

  return;
}

// Helper functions dengan optimasi mobile
function handleLocationSelection(deviceType) {
  const lokasiText = deviceType === 'mobile' 
    ? document.getElementById("lokasiSelectText")
    : document.getElementById("lokasiSelectTextDesktop");
  
  const dropdown = deviceType === 'mobile'
    ? document.getElementById("lokasiDropdown")
    : document.getElementById("lokasiDropdownDesktop");

  if (lokasiText) {
    lokasiText.textContent = "📍 Lokasi Terkini Aktif";
    lokasiText.classList.add('text-green-400');
  }
  
  if (dropdown) {
    dropdown.style.display = "none";
  }
  
  // Show success notification dengan optimasi mobile
  showLocationSuccess(deviceType);
}

function showLocationSuccess(deviceType) {
  const notification = document.createElement('div');
  const isMobile = deviceType === 'mobile' || window.innerWidth < 768;
  
  notification.className = `fixed ${
    isMobile ? 'bottom-4 left-4 right-4' : 'top-4 right-4'
  } bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 transform ${
    isMobile ? 'translate-y-full' : 'translate-x-full'
  } transition-transform duration-300 safe-area-bounce`;
  
  notification.innerHTML = `
    <div class="flex items-center space-x-3">
      <i class="fa-solid fa-check-circle"></i>
      <span class="text-sm">Lokasi berhasil diperbarui!</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.classList.remove(isMobile ? 'translate-y-full' : 'translate-x-full');
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add(isMobile ? 'translate-y-full' : 'translate-x-full');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function filterProductsByCategory(category) {
  console.log(`Filtering by category: ${category}`);
  // Add your filtering logic here
}

function handleResponsiveLayout() {
  // Adjust layout based on screen size
  const isMobile = window.innerWidth < 768;
  
  // Contoh: Adjust grid columns based on screen size
  const productContainer = document.getElementById('produk-container');
  if (productContainer) {
    if (window.innerWidth < 480) {
      productContainer.className = 'produk-list-container grid grid-cols-1 gap-3';
    } else if (window.innerWidth < 768) {
      productContainer.className = 'produk-list-container grid grid-cols-2 gap-4';
    } else if (window.innerWidth < 1024) {
      productContainer.className = 'produk-list-container grid grid-cols-3 gap-4';
    } else {
      productContainer.className = 'produk-list-container grid grid-cols-4 gap-6';
    }
  }
}

// Add custom CSS untuk responsive design
const responsiveStyle = document.createElement('style');
responsiveStyle.textContent = `
  /* Container responsive */
  .container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  @media (min-width: 640px) {
    .container {
      max-width: 640px;
    }
  }
  
  @media (min-width: 768px) {
    .container {
      max-width: 768px;
    }
  }
  
  @media (min-width: 1024px) {
    .container {
      max-width: 1024px;
    }
  }
  
  @media (min-width: 1280px) {
    .container {
      max-width: 1280px;
    }
  }

  /* Safe areas untuk notch devices */
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
  
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .safe-area-bounce {
    animation: safeAreaBounce 0.3s ease-out;
  }
  
  @keyframes safeAreaBounce {
    0% { transform: translateY(100%); }
    60% { transform: translateY(-10px); }
    100% { transform: translateY(0); }
  }

  /* Scrollbar hiding */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Touch improvements */
  @media (max-width: 768px) {
    button, [role="button"] {
      -webkit-tap-highlight-color: transparent;
      min-height: 44px;
      min-width: 44px;
    }
    
    .category-btn {
      padding: 8px 16px;
      font-size: 14px;
    }
  }

  /* Extra small breakpoint */
  @media (min-width: 375px) {
    .xs\\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  /* Performance optimizations */
  .will-change-transform {
    will-change: transform;
  }
`;
document.head.appendChild(responsiveStyle);

// Initialize responsive layout
handleResponsiveLayout();

if (page === 'alamat') {
  content = `
    <div class="alamat-wrapper">
      <section>
        <h2>📍 Alamat Pengiriman</h2>

        <!-- Form Alamat -->
        <div id="form-alamat" class="form-alamat-wrapper">
          <form id="alamat-form" class="form-alamat-card" onsubmit="event.preventDefault(); saveAddress();">

            <h2 class="form-title">Alamat Pengiriman</h2>

            <!-- Dropdown alamat tersimpan -->
            <label for="alamatTersimpan">Pilih Alamat Tersimpan</label>
            <select id="alamatTersimpan" onchange="isiDariAlamatCadangan(this.value)">
              <option value="">-- Pilih Alamat Tersimpan --</option>
            </select>

            <!-- Tombol aksi -->
            <div class="alamat-actions" style="display: flex; gap: 10px; margin: 10px 0;">
              <button type="button" onclick="jadikanUtamaDariCadangan()" class="btn-jadikan-utama">Jadikan Alamat Utama</button>
              <button type="button" onclick="hapusAlamatCadangan()" class="btn-hapus-cadangan">Hapus Alamat Ini</button>
            </div>

            <!-- Input Alamat Baru -->
            <label for="full-name">Nama Lengkap</label>
            <input type="text" id="full-name" placeholder="Nama lengkap penerima" required />

            <label for="phone-number">Nomor WhatsApp</label>
            <input type="tel" id="phone-number" placeholder="08xxxxxxxxxx" required />

            <label for="full-address">Alamat Lengkap</label>
            <textarea id="full-address" rows="3" placeholder="Nama jalan, nomor rumah, RT/RW, dll" required></textarea>

            <label for="courier-note">Catatan</label>
            <textarea id="courier-note" rows="2" placeholder="Contoh: Dekat warung, pagar hitam, dll"></textarea>

            <button type="submit" class="btn-simpan-alamat">Simpan Alamat</button>
          </form>
        </div>

        <div id="map-container" style="height: 300px; margin: 10px 0;"></div>
      </section>
    </div>
  `;

  main.innerHTML = content;
  loadSavedAddress();
  loadAlamatCadangan();
  initMap();
}



if (page === 'checkout') {
  content = `
    <div class="checkout-wrapper checkout-page">
      <h2>🧾 Checkout Pesanan</h2>

      <!-- Alamat Pengiriman -->
      <div class="alamat-box">
        <h3>📍 Alamat Pengiriman</h3>
        <div class="alamat-terpilih" id="alamat-terpilih">
          <p>Memuat alamat...</p>
        </div>
      </div>

      <!-- Daftar Keranjang -->
<div class="keranjang-box">
  <h3>🛒 Daftar Pesanan</h3>
  <ul id="cart-items-list"></ul>
  <div id="total-checkout"></div>

  <!-- Catatan Tambahan -->
  <div class="catatan-tambahan" style="margin-top: 15px;">
    <label for="catatan-pesanan"><strong>📝 Catatan Tambahan</strong></label>
    <textarea id="catatan-pesanan" placeholder="Tulis catatan untuk penjual... (opsional)" rows="3" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-top:5px;"></textarea>
  </div>
</div>

      <!-- Metode Pengiriman -->
      <div class="pengiriman-wrapper">
        <label class="pengiriman-label">🚚 Metode Pengiriman:</label>
        <div class="pengiriman-box">
          <input type="radio" name="pengiriman" id="standard" value="standard" checked>
          <label for="standard" class="pengiriman-card">
            <div class="pengiriman-judul">Standard</div>
            <div class="pengiriman-harga" id="ongkir-standard">Menghitung...</div>
            <div class="pengiriman-jarak" id="jarak-standard">Jarak: -</div>
            <div class="pengiriman-estimasi" id="estimasi-standard">Estimasi: -</div>
          </label>

          <input type="radio" name="pengiriman" id="priority" value="priority">
          <label for="priority" class="pengiriman-card">
            <div class="pengiriman-judul">Priority</div>
            <div class="pengiriman-harga" id="ongkir-priority">Menghitung...</div>
            <div class="pengiriman-jarak" id="jarak-priority">Jarak: -</div>
            <div class="pengiriman-estimasi" id="estimasi-priority">Estimasi: -</div>
          </label>
        </div>
      </div>

      <!-- Voucher -->
      <div class="pengiriman-boxs">
        <h3>🎟️ Voucher</h3>
        <div class="voucher-section-full">
          <input type="text" id="voucher" placeholder="Masukkan kode voucher...">
          <button id="cek-voucher-btn" onclick="cekVoucher()">Cek</button>
        </div>
        <small id="voucher-feedback" class="checkout-note"></small>
      </div>

      <!-- Metode Pembayaran -->
      <div class="pembayaran-box">
        <label class="pembayaran-label"><i class="fas fa-wallet"></i> Metode Pembayaran</label>
        <select id="metode-pembayaran">
          <option value="cod">Bayar di Tempat (COD)</option>
          <option value="saldo">Saldo</option>
        </select>
      </div>

      <!-- Rincian Pembayaran -->
      <div class="rincian-box">
        <h3>🧾 Rincian Pembayaran</h3>
        <div class="rincian-item"><span>Subtotal Pesanan</span><span id="rincian-subtotal">Rp 0</span></div>
        <div class="rincian-item"><span>Subtotal Pengiriman</span><span id="rincian-ongkir">Rp 0</span></div>
        <div class="rincian-item biaya-layanan"><span>Biaya Layanan</span><span>Rp 0</span></div>
        <div class="rincian-item"><span>Total Diskon</span><span id="rincian-diskon">- Rp 0</span></div>
      </div>

      <!-- Sticky Footer -->
      <div class="checkout-footer-sticky">
        <div class="total-info">
          <strong>Total: Rp <span id="footer-total">0</span></strong>
          <small class="hemat-text">Hemat Rp <span id="footer-diskon">0</span></small>
        </div>
        <button class="checkout-btn-final" onclick="handleKlikCheckout()">Buat Pesanan</button>
      </div>
    </div>
  `;

  main.innerHTML = content;

  renderAlamatCheckout();
  renderCheckoutItems();
  cekSaldoUser();

  document.querySelectorAll('input[name="pengiriman"]').forEach(radio => {
    radio.addEventListener('change', renderCheckoutItems);
  });
}

else if (page === "driver-dashboard") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-[200px]">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p class="text-gray-600">Memuat dashboard...</p>
      </div>
    </div>
  `;

  (async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const db = firebase.firestore();
    const driverId = user.uid;

    try {
      const snapshot = await db.collection("driver")
        .where("idDriver", "==", driverId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        container.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-3"></i>
            <h3 class="text-red-800 font-semibold mb-2">Data Driver Tidak Ditemukan</h3>
            <p class="text-red-600">Silakan hubungi administrator untuk verifikasi data driver.</p>
          </div>
        `;
        return;
      }

      const driverDoc = snapshot.docs[0];
      const dataDriver = driverDoc.data();
      const driverRef = db.collection("driver").doc(driverDoc.id);

      mulaiUpdateLokasiDriver(driverId);

      const saldoDriver = dataDriver.saldo || 0;
      const lokasiDriver = dataDriver.lokasi || null;
      const plat = dataDriver.nomorPlat || "-";
      const namaDriver = dataDriver.nama || "-";
      let statusDriver = dataDriver.status || "nonaktif";
      let forceNonaktif = false;
      const pelanggaran = dataDriver.pelanggaran || 0;
      const nonaktifHingga = dataDriver.nonaktifHingga || 0;
      const now = Date.now();

      const dalamPembatasan = statusDriver === "nonaktif" && nonaktifHingga && now <= nonaktifHingga;

      if (statusDriver === "nonaktif" && nonaktifHingga && now > nonaktifHingga) {
        await driverRef.update({ status: "aktif", nonaktifHingga: firebase.firestore.FieldValue.delete() });
        statusDriver = "aktif";
        Swal.fire({
          icon: 'success',
          title: 'Driver Diaktifkan',
          text: 'Driver telah diaktifkan kembali otomatis karena masa nonaktif sudah berakhir.',
          confirmButtonText: 'Mengerti'
        });
      }

      if (dalamPembatasan) {
        const sisaMenit = Math.ceil((nonaktifHingga - now) / 60000);
        Swal.fire({
          icon: 'warning',
          title: 'Akun Dinonaktifkan Sementara',
          html: `Akun Anda sedang dinonaktifkan sementara karena pelanggaran.<br>
                <strong>Sisa waktu:</strong> ${sisaMenit} menit<br>
                <strong>Level pelanggaran:</strong> ${pelanggaran}`,
          confirmButtonText: 'Mengerti'
        });
      }

      if (saldoDriver < 3000) {
        forceNonaktif = true;
        if (statusDriver !== "nonaktif") {
          await driverRef.update({ status: "nonaktif" });
          statusDriver = "nonaktif";
        }
        Swal.fire({
          icon: 'warning',
          title: 'Saldo Tidak Cukup',
          text: `Saldo kamu hanya Rp ${saldoDriver.toLocaleString()}. Sistem menonaktifkan akun sementara.`,
          confirmButtonText: 'Mengerti'
        });
      } else if (saldoDriver >= 6000 && saldoDriver < 10000) {
        Swal.fire({
          icon: 'info',
          title: 'Saldo Menipis',
          text: `Saldo kamu hanya Rp ${saldoDriver.toLocaleString()}. Disarankan isi ulang.`,
          confirmButtonText: 'Mengerti'
        });
      }

      if (!lokasiDriver?.lat || !lokasiDriver?.lng) {
        container.innerHTML = `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <i class="fas fa-map-marker-alt text-yellow-500 text-2xl mb-3"></i>
            <h3 class="text-yellow-800 font-semibold mb-2">Lokasi Tidak Tersedia</h3>
            <p class="text-yellow-600">Pastikan GPS aktif dan izin lokasi diberikan.</p>
          </div>
        `;
        return;
      }

      const awalHari = new Date(); 
      awalHari.setHours(0, 0, 0, 0);
      const riwayatSnap = await db.collection("riwayat_driver")
        .where("idDriver", "==", driverId)
        .where("waktuSelesai", ">=", awalHari)
        .get();
      
      const jumlahHariIni = riwayatSnap.size;
      const totalHariIni = riwayatSnap.docs.reduce((t, d) => t + (d.data().penghasilanBersih || 0), 0);

      // 🔥 DAPATKAN DAFTAR PESANAN - LOGIKA ASLI
      const daftarPesanan = [];
      const toLatLng = geo => geo?.latitude !== undefined ? { lat: geo.latitude, lng: geo.longitude } : geo;
      const hitungJarakKM = (a, b) => {
        a = toLatLng(a); b = toLatLng(b);
        if (!a || !b) return null;
        const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 100) / 100;
      };

      // 🔁 Pesanan pending (broadcast)
      const pendingSnap = await db.collection("pesanan_driver_pending")
        .where("calonDriver", "array-contains", driverId)
        .orderBy("createdAt", "desc")
        .get();

      for (const doc of pendingSnap.docs) {
        const data = doc.data();
        const pesananDoc = await db.collection("pesanan").doc(data.idPesanan).get();
        if (!pesananDoc.exists) continue;
        const pesanan = pesananDoc.data();

        const lokasiCustomer = pesanan.lokasi || null;
        const tokoDoc = await db.collection("toko").doc(data.idToko).get();
        const lokasiToko = tokoDoc.exists ? tokoDoc.data().koordinat : null;
        const namaToko = tokoDoc.exists ? tokoDoc.data().namaToko || "Toko" : "Toko";

        let namaCustomer = "Customer";
        if (pesanan.userId) {
          const userDoc = await db.collection("users").doc(pesanan.userId).get();
          if (userDoc.exists) namaCustomer = userDoc.data().nama || namaCustomer;
        }

        const jarakKeToko = hitungJarakKM(lokasiDriver, lokasiToko);
        const jarakKeCustomer = hitungJarakKM(lokasiToko, lokasiCustomer);

        daftarPesanan.push({
          id: doc.id,
          idPesanan: data.idPesanan,
          idToko: data.idToko,
          idCustomer: pesanan.userId || "-",
          namaCustomer,
          namaToko,
          namaDriver,
          plat,
          statusDriver: "Menunggu Ambil",
          metode: pesanan.metode,
          pengiriman: pesanan.pengiriman,
          total: pesanan.total || 0,
          createdAt: pesanan.createdAt?.toDate?.() || new Date(),
          jarakKeToko,
          jarakKeCustomer,
          stepsLog: pesanan.stepsLog || [],
          produk: pesanan.produk || [],
          isPending: true
        });
      }

      // 🔁 Pesanan aktif
      const pesananSnap = await db.collection("pesanan_driver")
        .where("idDriver", "==", driverId).get();

      for (const doc of pesananSnap.docs) {
        const data = doc.data();
        const pesananDoc = await db.collection("pesanan").doc(data.idPesanan).get();
        if (!pesananDoc.exists) continue;
        const pesanan = pesananDoc.data();

        if ((pesanan.status || "").toLowerCase() === "selesai") continue;

        const lokasiCustomer = pesanan.lokasi || null;
        const idToko = pesanan.produk?.[0]?.idToko || data.idToko || "";
        const tokoDoc = await db.collection("toko").doc(idToko).get();
        const lokasiToko = tokoDoc.exists ? tokoDoc.data().koordinat : null;
        const namaToko = tokoDoc.exists ? tokoDoc.data().namaToko || "Toko" : "Toko";

        let namaCustomer = "Customer";
        if (pesanan.userId) {
          const userDoc = await db.collection("users").doc(pesanan.userId).get();
          if (userDoc.exists) namaCustomer = userDoc.data().nama || namaCustomer;
        }

        const jarakKeToko = hitungJarakKM(lokasiDriver, lokasiToko);
        const jarakKeCustomer = hitungJarakKM(lokasiToko, lokasiCustomer);

        daftarPesanan.push({
          id: doc.id,
          idPesanan: data.idPesanan,
          idToko,
          idCustomer: pesanan.userId || "-",
          namaCustomer,
          namaToko,
          namaDriver,
          plat,
          statusDriver: data.status,
          metode: pesanan.metode,
          pengiriman: pesanan.pengiriman,
          total: pesanan.total || 0,
          createdAt: pesanan.createdAt?.toDate?.() || new Date(),
          jarakKeToko,
          jarakKeCustomer,
          stepsLog: pesanan.stepsLog || [],
          produk: pesanan.produk || [],
          isPending: false
        });
      }

      // 🔽 Urutkan: priority > non-priority, lalu terbaru ke terlama
      daftarPesanan.sort((a, b) => {
        const isPriorityA = (a.pengiriman || "").toLowerCase() === "priority";
        const isPriorityB = (b.pengiriman || "").toLowerCase() === "priority";

        if (isPriorityA && !isPriorityB) return -1;
        if (!isPriorityA && isPriorityB) return 1;

        return b.createdAt - a.createdAt;
      });

      // 🖥️ Tampilan dengan tema oranye-gradiasi kuning
      let html = `
        <!-- Header dengan gradiasi oranye-kuning -->
        <div class="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-b-2xl p-6 mb-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold">🚗 Dashboard Driver</h1>
              <p class="text-orange-100">${namaDriver} • ${plat}</p>
            </div>
            <div class="text-right">
              <div class="text-xl font-bold">Rp ${saldoDriver.toLocaleString()}</div>
              <p class="text-orange-100 text-sm">Saldo</p>
            </div>
          </div>

          <!-- Status Toggle -->
          <div class="bg-white bg-opacity-20 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-orange-100">Status Driver</p>
                <p id="status-label" class="font-semibold">
                  ${statusDriver === "aktif" ? "🟢 Bekerja" : "🔴 Tidak Bekerja"}
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer ${forceNonaktif || dalamPembatasan ? 'opacity-50' : ''}">
                <input 
                  type="checkbox" 
                  id="status-toggle" 
                  ${statusDriver === "aktif" ? "checked" : ""} 
                  ${forceNonaktif || dalamPembatasan ? "disabled" : ""}
                  class="sr-only peer"
                >
                <div class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
            ${(forceNonaktif || dalamPembatasan) ? `
              <p class="text-yellow-200 text-sm mt-2">
                <i class="fas fa-lock mr-1"></i>Status tidak bisa diubah saat ini
              </p>
            ` : ""}
          </div>

          <!-- Statistik -->
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <div class="font-bold">${jumlahHariIni}</div>
              <p class="text-orange-100 text-sm">Pesanan Hari Ini</p>
            </div>
            <div class="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <div class="font-bold">Rp ${totalHariIni.toLocaleString()}</div>
              <p class="text-orange-100 text-sm">Penghasilan Hari Ini</p>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi -->
        <div class="flex justify-center gap-4 mb-6">
          <button onclick="bukaModalPesanDriver()" class="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors inline-flex items-center gap-2">
            <i class="fas fa-envelope"></i>
            Pesan
          </button>
          <button onclick="topupSaldoUser()" class="bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors inline-flex items-center gap-2">
            <i class="fas fa-wallet"></i>
            Topup Saldo
          </button>
          <button onclick="tarikSaldoDriver()" class="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors inline-flex items-center gap-2">
            <i class="fas fa-money-bill-wave"></i>
            Tarik Saldo
          </button>
        </div>

        <!-- Daftar Pesanan -->
        <div class="mb-8">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-list text-orange-500"></i>
            Pesanan Aktif
            <span class="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">${daftarPesanan.length}</span>
          </h3>

          ${daftarPesanan.length === 0 ? `
            <div class="bg-gray-50 rounded-xl p-6 text-center">
              <i class="fas fa-box-open text-gray-400 text-3xl mb-3"></i>
              <p class="text-gray-500">Tidak ada pesanan aktif</p>
            </div>
          ` : `
            <div class="space-y-4">
              ${daftarPesanan.map(p => {
                const metodePengiriman = (p.pengiriman || "standard").toLowerCase();
                let metodeLabel = metodePengiriman === "priority" ? "⚡ Priority" : metodePengiriman.charAt(0).toUpperCase() + metodePengiriman.slice(1);
                const sudahDiambil = p.statusDriver !== "Menunggu Ambil";

                return `
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <h4 class="font-bold text-gray-800">${p.idPesanan}</h4>
                        <p class="text-gray-600">${p.namaCustomer} - ${p.namaToko}</p>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-orange-600">Rp ${p.total.toLocaleString()}</div>
                        <p class="text-gray-500 text-sm">${p.metode?.toUpperCase() || "-"}</p>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      <div class="flex items-center gap-1">
                        <i class="fas fa-clock text-gray-400"></i>
                        <span>${p.createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      ${p.jarakKeToko !== null ? `
                        <div class="flex items-center gap-1">
                          <i class="fas fa-store text-gray-400"></i>
                          <span>${p.jarakKeToko} km ke toko</span>
                        </div>
                      ` : ""}
                      ${p.jarakKeCustomer !== null ? `
                        <div class="flex items-center gap-1">
                          <i class="fas fa-map-marker-alt text-gray-400"></i>
                          <span>${p.jarakKeCustomer} km ke customer</span>
                        </div>
                      ` : ""}
                      <div class="flex items-center gap-1">
                        <i class="fas fa-info-circle text-gray-400"></i>
                        <span class="${p.isPending ? 'text-yellow-600' : 'text-orange-600'} font-medium">${p.statusDriver}</span>
                      </div>
                    </div>

                    <div class="flex gap-2">
                      <button onclick="bukaDetailPesananDriver('${p.idPesanan}')" 
                        class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-search mr-1"></i> Detail
                      </button>
                      <button onclick="renderChatDriver({
                        idPesanan: '${p.idPesanan}',
                        idDriver: '${driverId}',
                        idCustomer: '${p.idCustomer}',
                        namaDriver: '${p.namaDriver}',
                        namaCustomer: '${p.namaCustomer}'
                      })" 
                        class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-comment mr-1"></i> Chat
                      </button>
                      ${!sudahDiambil ? `
                        <button onclick="konfirmasiPesananDriver('${p.idPesanan}', '${p.idToko}', '${driverId}')" 
                          class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors">
                          <i class="fas fa-check mr-1"></i> Ambil
                        </button>
                      ` : ""}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;

      container.innerHTML = html;

      document.getElementById("status-toggle")?.addEventListener("change", async (e) => {
        const aktif = e.target.checked;
        const newStatus = aktif ? "aktif" : "nonaktif";
        const label = document.getElementById("status-label");

        try {
          await driverRef.update({ status: newStatus });
          label.textContent = aktif ? "🟢 Bekerja" : "🔴 Tidak Bekerja";
          Swal.fire({
            icon: 'success',
            title: 'Status Diubah',
            text: `Status diubah menjadi "${aktif ? 'Bekerja' : 'Tidak Bekerja'}"`,
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          e.target.checked = !aktif;
          label.textContent = !aktif ? "🟢 Bekerja" : "🔴 Tidak Bekerja";
          Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Gagal memperbarui status.',
            confirmButtonText: 'Mengerti'
          });
        }
      });

    } catch (error) {
      console.error("Error loading driver dashboard:", error);
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <i class="fas fa-exclamation-circle text-red-500 text-2xl mb-3"></i>
          <h3 class="text-red-800 font-semibold mb-2">Terjadi Kesalahan</h3>
          <p class="text-red-600">Gagal memuat dashboard driver. Silakan refresh halaman.</p>
        </div>
      `;
    }
  })();
}



else if (page === "riwayat-pesanan-driver") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="min-h-screen bg-gray-50 py-6">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header Section -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">📦 Riwayat Pengiriman</h1>
              <p class="text-gray-600 mt-2">Lihat semua pengiriman yang telah Anda selesaikan</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <i class="fas fa-motorcycle text-white text-lg"></i>
            </div>
          </div>

          <!-- Saldo Card -->
          <div class="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg mb-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-emerald-100 text-sm font-medium mb-1">Saldo Sekarang</p>
                <h2 class="text-2xl sm:text-3xl font-bold" id="saldo-driver">Memuat...</h2>
                <p class="text-emerald-100 text-sm mt-2">Penghasilan dari pengiriman selesai</p>
              </div>
              <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <i class="fas fa-wallet text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Search Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-search text-gray-400"></i>
            </div>
            <input 
              type="text" 
              id="filterInputDriver" 
              placeholder="Cari Order ID atau nama customer..." 
              class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            />
          </div>
        </div>

        <!-- Stats Summary -->
        <div id="stats-summary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 hidden">
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <i class="fas fa-shipping-fast text-blue-600"></i>
              </div>
              <div>
                <p class="text-sm text-gray-600">Total Pengiriman</p>
                <p class="text-lg font-semibold text-gray-900" id="total-pengiriman">0</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <i class="fas fa-money-bill-wave text-green-600"></i>
              </div>
              <div>
                <p class="text-sm text-gray-600">Total Penghasilan</p>
                <p class="text-lg font-semibold text-gray-900" id="total-penghasilan">Rp 0</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <i class="fas fa-chart-line text-orange-600"></i>
              </div>
              <div>
                <p class="text-sm text-gray-600">Rata-rata per Order</p>
                <p class="text-lg font-semibold text-gray-900" id="rata-penghasilan">Rp 0</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Memuat data riwayat...</p>
        </div>

        <!-- Empty State -->
        <div id="empty-state" class="hidden text-center py-12">
          <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-box-open text-gray-400 text-2xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Belum ada riwayat pengiriman</h3>
          <p class="text-gray-600">Pengiriman yang telah diselesaikan akan muncul di sini</p>
        </div>

        <!-- Content Container -->
        <div id="riwayat-driver-container" class="hidden">
          <!-- Content will be populated by JavaScript -->
        </div>
      </div>
    </div>

    <style>
      .pesanan-card {
        background: white;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #f0f0f0;
        transition: all 0.3s ease;
      }
      
      .pesanan-card:hover {
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        transform: translateY(-2px);
      }
      
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .status-selesai {
        background: #dcfce7;
        color: #166534;
      }
      
      .income-positive {
        color: #059669;
        font-weight: 700;
      }
      
      .income-negative {
        color: #dc2626;
        font-weight: 700;
      }
      
      .divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
        margin: 16px 0;
      }
      
      .fade-in {
        animation: fadeIn 0.5s ease-in;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;

  (async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const db = firebase.firestore();
    const driverId = user.uid;

    // Show loading state
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('riwayat-driver-container').classList.add('hidden');
    document.getElementById('stats-summary').classList.add('hidden');

    try {
      const driverSnap = await db.collection("driver").where("idDriver", "==", driverId).limit(1).get();
      if (driverSnap.empty) {
        document.getElementById("loading-state").classList.add('hidden');
        document.getElementById("empty-state").classList.remove('hidden');
        document.getElementById("empty-state").innerHTML = `
          <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Data driver tidak ditemukan</h3>
          <p class="text-gray-600">Silakan hubungi administrator</p>
        `;
        return;
      }

      const driverDoc = driverSnap.docs[0];
      const driverData = driverDoc.data();
      const currentSaldo = driverData.saldo || 0;
      document.getElementById("saldo-driver").textContent = `Rp ${currentSaldo.toLocaleString("id-ID")}`;

      const snap = await db.collection("pesanan_driver")
        .where("idDriver", "==", driverId).get();

      const riwayat = [];
      let totalOngkir = 0;
      let totalPotongan = 0;
      let totalPenghasilanBersih = 0;

      for (const doc of snap.docs) {
        const data = doc.data();
        const idPesanan = data.idPesanan;
        if (!idPesanan) continue;

        const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
        if (!pesananDoc.exists) continue;
        const pesanan = pesananDoc.data();
        const status = (pesanan.status || "").toLowerCase();
        if (status !== "selesai") continue;

        const selesaiAt = pesanan.updatedAt?.toDate?.() || new Date();

        let namaCustomer = "Customer";
        if (pesanan.userId) {
          const userDoc = await db.collection("users").doc(pesanan.userId).get();
          if (userDoc.exists) namaCustomer = userDoc.data().nama || namaCustomer;
        }

        const idToko = pesanan.produk?.[0]?.idToko || "-";
        let namaToko = "Toko";
        const tokoDoc = await db.collection("toko").doc(idToko).get();
        if (tokoDoc.exists) namaToko = tokoDoc.data().namaToko || namaToko;

        const ongkir = Number(data.totalOngkir || 0);
        const potongan = Math.round(ongkir * 0.05);
        const bersih = ongkir - potongan;

        totalOngkir += ongkir;
        totalPotongan += potongan;
        totalPenghasilanBersih += bersih;

        riwayat.push({
          idPesanan,
          namaCustomer,
          namaToko,
          total: pesanan.total || 0,
          metode: pesanan.metode || "-",
          selesaiAt,
          ongkir,
          potongan,
          bersih
        });
      }

      // Hide loading state
      document.getElementById('loading-state').classList.add('hidden');

      if (riwayat.length === 0) {
        document.getElementById("empty-state").classList.remove('hidden');
        return;
      }

      riwayat.sort((a, b) => b.selesaiAt - a.selesaiAt);

      // Update stats summary
      document.getElementById('stats-summary').classList.remove('hidden');
      document.getElementById('total-pengiriman').textContent = riwayat.length;
      document.getElementById('total-penghasilan').textContent = `Rp ${totalPenghasilanBersih.toLocaleString('id-ID')}`;
      document.getElementById('rata-penghasilan').textContent = `Rp ${Math.round(totalPenghasilanBersih / riwayat.length).toLocaleString('id-ID')}`;

      const renderRiwayat = (data) => {
        let html = `
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">${data.length} Pengiriman Ditemukan</h3>
            <div class="space-y-4">
        `;

        for (const r of data) {
          const tanggal = r.selesaiAt.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          const waktu = r.selesaiAt.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          });

          html += `
            <div class="pesanan-card fade-in">
              <!-- Header -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div class="flex items-center mb-2 sm:mb-0">
                  <span class="status-badge status-selesai mr-3">
                    <i class="fas fa-check-circle mr-1"></i>
                    Selesai
                  </span>
                  <span class="text-sm text-gray-500">${r.idPesanan}</span>
                </div>
                <div class="text-sm text-gray-500">
                  <i class="far fa-clock mr-1"></i>
                  ${tanggal} • ${waktu}
                </div>
              </div>

              <!-- Customer & Store Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-user text-blue-600 text-sm"></i>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Customer</p>
                    <p class="font-medium text-gray-900">${r.namaCustomer}</p>
                  </div>
                </div>
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-store text-green-600 text-sm"></i>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Toko</p>
                    <p class="font-medium text-gray-900">${r.namaToko}</p>
                  </div>
                </div>
              </div>

              <div class="divider"></div>

              <!-- Financial Breakdown -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <p class="text-gray-600 mb-1">Ongkir</p>
                  <p class="font-semibold text-gray-900">Rp ${r.ongkir.toLocaleString("id-ID")}</p>
                </div>
                <div class="text-center">
                  <p class="text-gray-600 mb-1">Potongan (5%)</p>
                  <p class="font-semibold text-red-500">- Rp ${r.potongan.toLocaleString("id-ID")}</p>
                </div>
                <div class="text-center">
                  <p class="text-gray-600 mb-1">Penghasilan Bersih</p>
                  <p class="font-bold text-green-600 text-lg">Rp ${r.bersih.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <!-- Additional Info -->
              <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex justify-between text-sm text-gray-600">
                  <span>Total Belanja: <strong class="text-gray-800">Rp ${r.total.toLocaleString("id-ID")}</strong></span>
                  <span>Metode: <strong class="text-gray-800">${r.metode.toUpperCase()}</strong></span>
                </div>
              </div>
            </div>
          `;
        }

        html += `
            </div>
          </div>
        `;
        
        document.getElementById("riwayat-driver-container").innerHTML = html;
        document.getElementById("riwayat-driver-container").classList.remove('hidden');
      };

      renderRiwayat(riwayat);

      // Search functionality
      document.getElementById("filterInputDriver").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = riwayat.filter(item =>
          item.idPesanan.toLowerCase().includes(q) || 
          item.namaCustomer.toLowerCase().includes(q) ||
          item.namaToko.toLowerCase().includes(q)
        );
        
        if (filtered.length === 0) {
          document.getElementById("riwayat-driver-container").classList.add('hidden');
          document.getElementById("empty-state").classList.remove('hidden');
          document.getElementById("empty-state").innerHTML = `
            <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-search text-gray-400 text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Tidak ada hasil</h3>
            <p class="text-gray-600">Tidak ada pengiriman yang sesuai dengan pencarian</p>
          `;
        } else {
          document.getElementById("empty-state").classList.add('hidden');
          renderRiwayat(filtered);
        }
      });

    } catch (error) {
      console.error('Error loading driver history:', error);
      document.getElementById('loading-state').classList.add('hidden');
      document.getElementById("empty-state").classList.remove('hidden');
      document.getElementById("empty-state").innerHTML = `
        <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Terjadi kesalahan</h3>
        <p class="text-gray-600">Gagal memuat data riwayat pengiriman</p>
      `;
    }
  })();
}


else if (page === "admin-set-iklan-produk") {
  const main = document.getElementById("page-container");
  main.innerHTML = `
    <div class="pengaturan-iklan-container">
      <h2>🛠️ Pengaturan Iklan Produk</h2>
      <p>Pilih produk yang ingin tampil di slider iklan. Centang dan atur durasi, kategori, serta harga diskon (opsional).</p>
      <input type="text" id="search-id" class="input-cari" placeholder="🔍 Cari ID Produk..." />
      <div id="iklan-produk-wrapper" class="produk-list-admin">⏳ Memuat produk...</div>
    </div>

    <div id="modal-detail" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#00000088; z-index:9999; justify-content:center; align-items:center;">
      <div class="modal-content" style="background:#fff; padding:20px; max-width:500px; width:90%; border-radius:10px; box-shadow:0 4px 20px rgba(0,0,0,0.3); overflow-y:auto; max-height:90%;">
        <div id="modal-isi-detail">Memuat detail...</div>
        <div style="text-align:right; margin-top:20px;">
          <button onclick="document.getElementById('modal-detail').style.display='none'">Tutup</button>
        </div>
      </div>
    </div>
  `;

  const db = firebase.firestore();
  const wrapper = document.getElementById("iklan-produk-wrapper");
  const searchInput = document.getElementById("search-id");

  let semuaProduk = [];

  function renderProdukList(filtered = semuaProduk) {
    if (filtered.length === 0) {
      wrapper.innerHTML = `<p class="kosong-info">❌ Tidak ada produk ditemukan.</p>`;
      return;
    }

    const now = Date.now();
    const html = filtered.map(doc => {
      const data = doc.data();
      const isIklan = data.iklan === true;
      const kadaluarsa = data.iklanKadaluarsa || 0;
      const sisa = kadaluarsa - now;
      const sisaMenit = Math.floor(sisa / 60000);

      return `
        <div class="produk-row -set-iklan">
          <div class="produk-info">
            <p><strong>${data.namaProduk || '(Tanpa Nama)'}</strong></p>
            <p><small style="color:#888;">ID: ${doc.id}</small></p>
            <p>Harga: Rp${Number(data.harga || 0).toLocaleString("id-ID")}</p>
            ${isIklan && sisa > 0 ? `<p style="color:#28a745;"><small>Sisa Iklan: ${sisaMenit} menit</small></p>` : ""}
          </div>
          <div class="produk-switch">
            <label class="switch">
              <input type="checkbox" data-id="${doc.id}" data-harga="${data.harga || 0}" ${isIklan && sisa > 0 ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
          </div>
        </div>
      `;
    }).join("");

    wrapper.innerHTML = html;

    document.querySelectorAll('.produk-row input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', async () => {
        const id = checkbox.dataset.id;
        const isChecked = checkbox.checked;
        const hargaDefault = parseInt(checkbox.dataset.harga);

        if (isChecked) {
          const modal = document.getElementById("modal-detail");
          const isiModal = document.getElementById("modal-isi-detail");
          isiModal.innerHTML = `
            <h3>📢 Atur Iklan Produk</h3>
            <label>Kategori Iklan:</label>
            <select id="iklan-kategori" style="width:100%;margin-bottom:10px;padding:6px;">
              <option value="rekomendasi">Rekomendasi</option>
              <option value="flash_sale">Flash Sale</option>
              <option value="hot_product">Hot Product</option>
            </select>

            <label>Durasi Iklan (menit):</label>
            <input type="number" id="durasi-menit" min="1" placeholder="Contoh: 30" style="width:100%;margin-bottom:10px;padding:6px;" />

            <label>Harga Awal:</label>
            <input type="number" id="harga-awal" value="${hargaDefault}" readonly style="width:100%;margin-bottom:10px;padding:6px;background:#f3f3f3;" />

            <label>Harga Diskon (opsional):</label>
            <input type="number" id="harga-diskon" placeholder="Contoh: 8000" style="width:100%;margin-bottom:10px;padding:6px;" />

            <button id="simpan-iklan" style="margin-top:10px;">💾 Simpan Iklan</button>
          `;
          modal.style.display = "flex";

          document.getElementById("simpan-iklan").onclick = async () => {
            const kategori = document.getElementById("iklan-kategori").value;
            const durasi = parseInt(document.getElementById("durasi-menit").value);
            const hargaDiskonInput = document.getElementById("harga-diskon").value.trim();
            const hargaDiskon = hargaDiskonInput ? parseInt(hargaDiskonInput) : null;

            if (!durasi || durasi <= 0) {
              alert("❌ Durasi harus lebih dari 0 menit.");
              return;
            }

            if (hargaDiskon !== null && (isNaN(hargaDiskon) || hargaDiskon >= hargaDefault)) {
              alert("❌ Harga diskon harus lebih kecil dari harga awal.");
              return;
            }

            const kadaluarsa = Date.now() + durasi * 60000;
            const updateData = {
              iklan: true,
              iklanKadaluarsa: kadaluarsa,
              iklanKategori: kategori,
              hargaAwal: hargaDefault
            };

            if (hargaDiskon !== null) {
              updateData.hargaDiskon = hargaDiskon;
            } else {
              updateData.hargaDiskon = firebase.firestore.FieldValue.delete();
            }

            await db.collection("produk").doc(id).update(updateData);

            modal.style.display = "none";
            loadProdukData();
          };
        } else {
          await db.collection("produk").doc(id).update({
            iklan: false,
            iklanKadaluarsa: firebase.firestore.FieldValue.delete(),
            iklanKategori: firebase.firestore.FieldValue.delete(),
            hargaAwal: firebase.firestore.FieldValue.delete(),
            hargaDiskon: firebase.firestore.FieldValue.delete()
          });
          loadProdukData();
        }
      });
    });
  }

  async function loadProdukData() {
    try {
      const snapshot = await db.collection("produk").get();
      const now = Date.now();
      semuaProduk = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data.iklan === true && (data.iklanKadaluarsa || 0) < now) {
          await db.collection("produk").doc(doc.id).update({
            iklan: false,
            iklanKadaluarsa: firebase.firestore.FieldValue.delete(),
            iklanKategori: firebase.firestore.FieldValue.delete(),
            hargaAwal: firebase.firestore.FieldValue.delete(),
            hargaDiskon: firebase.firestore.FieldValue.delete()
          });
        }

        semuaProduk.push(doc);
      }

      renderProdukList();
    } catch (err) {
      console.error("❌ Gagal ambil data produk:", err);
      wrapper.innerHTML = `<p class="kosong-info">❌ Gagal memuat data produk.</p>`;
    }
  }

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();
    const hasil = semuaProduk.filter(doc => doc.id.toLowerCase().includes(keyword));
    renderProdukList(hasil);
  });

  loadProdukData();
}








else if (page === "driver-riwayat") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<h2>📊 Riwayat Driver</h2><p>Memuat data...</p>`;

  (async () => {
    const user = firebase.auth().currentUser;
    if (!user) return container.innerHTML = `<p>❌ Harap login terlebih dahulu.</p>`;
    const db = firebase.firestore();
    const driverId = user.uid;

    const snap = await db.collection("riwayat_driver_admin")
      .where("idDriver", "==", driverId)
      .orderBy("waktu", "desc")
      .limit(100)
      .get();

    let html = `
      <div class="riwayat-driver-container">
        <button onclick="loadContent('driver-dashboard')" class="btn-kembali">⬅️ Kembali ke Dashboard</button>
    `;

    if (snap.empty) {
      html += `<p>Belum ada riwayat pesanan.</p>`;
    } else {
      html += `<div class="riwayat-card-list">`;
      for (const doc of snap.docs) {
        const d = doc.data();
        const waktu = new Date(d.waktu).toLocaleString("id-ID");
        const idPesanan = d.idPesanan || d.orderId || "-";

        // Ambil data dari pesanan_driver berdasarkan idPesanan
        const driverSnap = await db.collection("pesanan_driver")
          .where("idPesanan", "==", idPesanan)
          .limit(1)
          .get();

        let totalOngkir = 0;
        let subtotal = 0;
        let status = d.status || "-";

        if (!driverSnap.empty) {
          const dataDriver = driverSnap.docs[0].data();
          totalOngkir = dataDriver.totalOngkir || 0;
          subtotal = dataDriver.subtotal || 0;
          status = dataDriver.status || "-";
        }

        const biayaLayanan = Math.round(subtotal * 0.01);
        const biayaOngkir = Math.round(totalOngkir * 0.05);
        const totalFee = biayaLayanan + biayaOngkir;
        const penghasilanBersih = (subtotal + totalOngkir) - totalFee;

        // Ambil rating
        let ratingText = "-";
        try {
          const ratingSnap = await db.collection("rating_driver")
            .where("idPesanan", "==", idPesanan)
            .limit(1)
            .get();

          if (!ratingSnap.empty) {
            const rating = ratingSnap.docs[0].data().rating || 0;
            ratingText = `⭐ ${rating}/5`;
          }
        } catch (err) {
          console.warn(`❌ Gagal ambil rating untuk ${idPesanan}:`, err.message);
        }

        html += `
          <div class="riwayat-card">
            <div><strong>ID Pesanan:</strong> ${idPesanan}</div>
            <div><strong>Waktu:</strong> ${waktu}</div>
            <div><strong>Status:</strong> ${status}</div>
            <div><strong>Ongkir:</strong> Rp ${totalOngkir.toLocaleString("id-ID")}</div>
            <div><strong>Fee:</strong> Rp ${totalFee.toLocaleString("id-ID")}</div>
            <div><strong>Total:</strong> Rp ${penghasilanBersih.toLocaleString("id-ID")}</div>
            <div><strong>Rating:</strong> ${ratingText}</div>
            <button class="btn-riwayat" onclick="lihatLogPesananDriver('${idPesanan}')">📄 Detail</button>
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  })();
}















if (page === "riwayat-driver") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<h2>📋 Riwayat Pengantaran</h2><p>Memuat data...</p>";

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = "<p>❌ Harap login terlebih dahulu.</p>");

  const uid = user.uid;
  const db = firebase.firestore();

  db.collection("riwayat_driver")
    .where("idDriver", "==", uid)
    .orderBy("createdAt", "desc")
    .get()
    .then((snap) => {
      if (snap.empty) {
        container.innerHTML = "<p>🚫 Belum ada riwayat pengantaran.</p>";
        return;
      }

      let html = `
        <h2>📦 Riwayat Pengantaran</h2>
        <ul class="riwayat-driver-list">
      `;

      snap.forEach(doc => {
        const d = doc.data();
        const waktu = d.createdAt?.toDate().toLocaleString("id-ID") || "-";
        html += `
          <li class="riwayat-driver-item">
            🧾 <strong>${d.idPesanan}</strong><br>
            💵 Pendapatan: <strong>Rp ${d.pendapatanBersih?.toLocaleString() || 0}</strong><br>
            📅 ${waktu}
          </li>
        `;
      });

      html += "</ul>";
      container.innerHTML = html;
    })
    .catch(err => {
      console.error("❌ Gagal memuat riwayat driver:", err);
      container.innerHTML = "<p style='color:red;'>❌ Gagal memuat data riwayat.</p>";
    });
}



if (page === "admin-user") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p class="text-gray-600 text-lg">Memuat dashboard admin...</p>
        <p class="text-gray-400 text-sm mt-2">Menyiapkan data dan statistik</p>
      </div>
    </div>
  `;

  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <h3 class="text-red-800 font-bold text-xl mb-2">Sesi Habis</h3>
        <p class="text-red-600">Silakan login ulang untuk mengakses dashboard admin.</p>
      </div>
    `;
    return;
  }

  const db = firebase.firestore();

  try {
    const adminDoc = await db.collection("users").doc(user.uid).get();
    const role = adminDoc.exists ? (adminDoc.data().role || "").toLowerCase() : "";

    if (role !== "admin") {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <i class="fas fa-shield-alt text-red-500 text-4xl mb-4"></i>
          <h3 class="text-red-800 font-bold text-xl mb-2">Akses Ditolak</h3>
          <p class="text-red-600">Hanya pengguna dengan role admin yang dapat mengakses halaman ini.</p>
        </div>
      `;
      return;
    }

    // Loading state untuk data fetching
    container.innerHTML = `
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600 text-lg">Mengambil data sistem...</p>
          <div class="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto">
            <div class="h-1 bg-blue-200 rounded-full animate-pulse"></div>
            <div class="h-1 bg-blue-200 rounded-full animate-pulse delay-75"></div>
            <div class="h-1 bg-blue-200 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    `;

    const [
      usersSnapshot,
      pesananSnapshot,
      depositSnapshot,
      tarikSaldoSnapshot,
      laporanDriverSnapshot,
      laporanSellerSnapshot,
      tokoSnapshot
    ] = await Promise.all([
      db.collection("users").get(),
      db.collection("pesanan").get(),
      db.collection("topup_request").where("status", "==", "Menunggu").get(),
      db.collection("withdraw_request").where("status", "==", "Menunggu").get(),
      db.collection("laporan_driver").get(),
      db.collection("laporan_penjual").get(),
      db.collection("toko").get()
    ]);

    const totalFeeKeseluruhan = await hitungTotalFeePerusahaan(db);

    let totalUser = 0;
    let totalDriver = 0;
    let totalNominal = 0;
    let totalPesananAktif = 0;

    usersSnapshot.forEach(doc => {
      const r = (doc.data().role || "").toLowerCase();
      if (r === "user") totalUser++;
      if (r === "driver") totalDriver++;
    });

    pesananSnapshot.forEach(doc => {
      const d = doc.data();
      const status = (d.status || "").toLowerCase();
      if (status === "selesai") totalNominal += d.total || 0;
      else totalPesananAktif++;
    });

    const totalDepositMenunggu = depositSnapshot.size;
    const totalWithdrawMenunggu = tarikSaldoSnapshot.size;
    const totalLaporanDriver = laporanDriverSnapshot.size;
    const totalLaporanSeller = laporanSellerSnapshot.size;
    const totalToko = tokoSnapshot.size;

    // Color scheme untuk card
    const cardColors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-cyan-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-yellow-500',
      'from-lime-500 to-green-500',
      'from-sky-500 to-blue-500',
      'from-violet-500 to-purple-500',
      'from-fuchsia-500 to-pink-500',
      'from-cyan-500 to-blue-500',
      'from-emerald-500 to-green-500',
      'from-amber-500 to-orange-500',
      'from-red-500 to-rose-500',
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-sky-500'
    ];

    container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                🎛️ Dashboard Admin
              </h1>
              <p class="text-gray-600 mt-2">Kelola seluruh sistem dan monitor aktivitas</p>
            </div>
            <div class="flex items-center space-x-3">
              <div class="bg-white rounded-xl shadow-sm p-3">
                <div class="text-2xl font-bold text-gray-800">${totalUser + totalDriver}</div>
                <p class="text-gray-500 text-sm">Total Pengguna</p>
              </div>
              <div class="bg-white rounded-xl shadow-sm p-3">
                <div class="text-2xl font-bold text-green-600">${totalPesananAktif}</div>
                <p class="text-gray-500 text-sm">Pesanan Aktif</p>
              </div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-blue-100 text-sm">Total Transaksi</p>
                  <p class="text-2xl font-bold mt-1">Rp${totalNominal.toLocaleString("id-ID")}</p>
                </div>
                <div class="bg-white bg-opacity-20 p-3 rounded-xl">
                  <i class="fas fa-chart-line text-xl"></i>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-purple-100 text-sm">Fee Perusahaan</p>
                  <p class="text-2xl font-bold mt-1">Rp${totalFeeKeseluruhan.toLocaleString("id-ID")}</p>
                </div>
                <div class="bg-white bg-opacity-20 p-3 rounded-xl">
                  <i class="fas fa-building text-xl"></i>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-green-100 text-sm">Pending Deposit</p>
                  <p class="text-2xl font-bold mt-1">${totalDepositMenunggu}</p>
                </div>
                <div class="bg-white bg-opacity-20 p-3 rounded-xl">
                  <i class="fas fa-coins text-xl"></i>
                </div>
              </div>
            </div>

            <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-orange-100 text-sm">Pending Withdraw</p>
                  <p class="text-2xl font-bold mt-1">${totalWithdrawMenunggu}</p>
                </div>
                <div class="bg-white bg-opacity-20 p-3 rounded-xl">
                  <i class="fas fa-wallet text-xl"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          ${[
            {
              title: "👤 Users",
              count: totalUser,
              action: "users-management",
              buttonText: "Kelola Users",
              icon: "fas fa-users",
              description: "Kelola pengguna sistem"
            },
            {
              title: "🛵 Driver",
              count: totalDriver,
              action: "admin-driver",
              buttonText: "Kelola Driver",
              icon: "fas fa-motorcycle",
              description: "Manajemen driver"
            },
            {
              title: "💬 Live Chat",
              count: null,
              action: "livechat-admin",
              buttonText: "Buka Chat",
              icon: "fas fa-comments",
              description: "Support live chat"
            },
            {
              title: "🏪 Toko",
              count: totalToko,
              action: "admin-toko",
              buttonText: "Kelola Toko",
              icon: "fas fa-store",
              description: "Manajemen toko"
            },
            {
              title: "📦 Pesanan",
              count: totalPesananAktif,
              action: "pesanan-admin",
              buttonText: "Lihat Pesanan",
              icon: "fas fa-shopping-bag",
              description: "Monitor pesanan"
            },
            {
              title: "💰 Deposit",
              count: totalDepositMenunggu,
              action: "permintaan-deposit",
              buttonText: "Verifikasi",
              icon: "fas fa-plus-circle",
              description: "Permintaan deposit"
            },
            {
              title: "💸 Withdraw",
              count: totalWithdrawMenunggu,
              action: "permintaan-withdraw",
              buttonText: "Verifikasi",
              icon: "fas fa-minus-circle",
              description: "Permintaan penarikan"
            },
            {
              title: "🚨 Laporan Driver",
              count: totalLaporanDriver,
              action: "laporan-driver-admin",
              buttonText: "Tinjau",
              icon: "fas fa-flag",
              description: "Laporan driver"
            },
            {
              title: "🚨 Laporan Seller",
              count: totalLaporanSeller,
              action: "laporan-seller-admin",
              buttonText: "Tinjau",
              icon: "fas fa-exclamation-triangle",
              description: "Laporan seller"
            },
            {
              title: "📣 Produk",
              count: null,
              action: "admin-set-iklan-produk",
              buttonText: "Kelola",
              icon: "fas fa-ad",
              description: "Iklan produk"
            },
            {
              title: "✉️ Pesan",
              count: null,
              action: "admin-kirim-pesan",
              buttonText: "Kelola",
              icon: "fas fa-envelope",
              description: "Kirim pesan"
            },
            {
              title: "🔔 Notifikasi",
              count: null,
              action: "formNotifikasiAdmin",
              buttonText: "Kirim",
              icon: "fas fa-bell",
              description: "Push notification"
            },
            {
              title: "🎫 Voucher",
              count: null,
              action: "admin-voucher",
              buttonText: "Kelola",
              icon: "fas fa-ticket-alt",
              description: "Manajemen voucher"
            },
            {
              title: "🏦 Rekening",
              count: null,
              action: "setting-rekening",
              buttonText: "Kelola",
              icon: "fas fa-university",
              description: "Rekening deposit"
            },
            {
              title: "⏰ Jam Layanan",
              count: null,
              action: "jam-layanan",
              buttonText: "Atur",
              icon: "fas fa-clock",
              description: "Jam operasional"
            },
            {
              title: "🪟 Overlay",
              count: null,
              action: "admin-overlay",
              buttonText: "Kelola",
              icon: "fas fa-layer-group",
              description: "Tampilan overlay"
            },
            {
              title: "⭐ Rating",
              count: null,
              action: "admin-rating",
              buttonText: "Kelola",
              icon: "fas fa-star",
              description: "Manajemen rating"
            },
            {
              title: "📱 FCM",
              count: null,
              action: "admin-kirim-fcm",
              buttonText: "Kelola",
              icon: "fas fa-broadcast-tower",
              description: "Firebase messages"
            }
          ].map((item, index) => `
            <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
              <div class="bg-gradient-to-r ${cardColors[index]} p-6 text-white">
                <div class="flex items-center justify-between mb-4">
                  <div class="bg-white bg-opacity-20 p-3 rounded-xl">
                    <i class="${item.icon} text-xl"></i>
                  </div>
                  ${item.count !== null ? `
                    <span class="bg-white bg-opacity-30 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      ${item.count}
                    </span>
                  ` : ''}
                </div>
                <h3 class="text-xl font-bold mb-2">${item.title}</h3>
                <p class="text-white text-opacity-90 text-sm">${item.description}</p>
              </div>
              
              <div class="p-4">
                <button 
                  onclick="${item.action === 'formNotifikasiAdmin' ? 'formNotifikasiAdmin()' : `loadContent('${item.action}')`}"
                  class="w-full bg-gradient-to-r from-gray-800 to-gray-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-500 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-lg"
                >
                  <span>${item.buttonText}</span>
                  <i class="fas fa-arrow-right text-sm transform group-hover:translate-x-1 transition-transform"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer Stats -->
        <div class="mt-8 bg-white rounded-2xl shadow-sm p-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div class="text-2xl font-bold text-blue-600">${totalUser}</div>
              <p class="text-gray-600 text-sm">Total Users</p>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-600">${totalDriver}</div>
              <p class="text-gray-600 text-sm">Total Driver</p>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-600">${totalToko}</div>
              <p class="text-gray-600 text-sm">Total Toko</p>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-600">${totalLaporanDriver + totalLaporanSeller}</div>
              <p class="text-gray-600 text-sm">Total Laporan</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("❌ Error admin-user:", error);
    container.innerHTML = `
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md">
            <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
            <h3 class="text-red-800 font-bold text-xl mb-2">Terjadi Kesalahan</h3>
            <p class="text-red-600 mb-4">${error.message}</p>
            <button onclick="loadContent('admin-user')" class="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors">
              <i class="fas fa-redo mr-2"></i>
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

else if (page === "admin-kirim-fcm") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat form kirim pesan...</p>`;

  // Render form
  container.innerHTML = `
    <div class="kirim-pesan-form" style="max-width:480px;margin:20px auto;font-family:sans-serif;">
      <h2>📣 Kirim Pesan FCM Manual</h2>

      <label for="fcm-role">Pilih Role Penerima:</label>
      <select id="fcm-role" style="width:100%;padding:8px;margin-bottom:12px;">
        <option value="users">User</option>
        <option value="driver">Driver</option>
        <option value="seller">Seller</option> <!-- ubah dari 'toko' -->
      </select>

      <label for="fcm-title">Judul Pesan:</label>
      <input type="text" id="fcm-title" placeholder="Contoh: Promo Menarik Hari Ini" style="width:100%;padding:8px;margin-bottom:12px;" />

      <label for="fcm-body">Isi Pesan:</label>
      <textarea id="fcm-body" rows="3" placeholder="Tulis pesan Anda di sini..." style="width:100%;padding:8px;margin-bottom:12px;"></textarea>

      <label for="fcm-url">URL Tujuan (opsional):</label>
      <input type="text" id="fcm-url" placeholder="Contoh: /info-maintenance" style="width:100%;padding:8px;margin-bottom:12px;" />

      <button id="btn-kirim" style="padding:12px 0;width:100%;background:#0078d7;color:#fff;border:none;border-radius:5px;cursor:pointer;">🚀 Kirim Pesan</button>

      <div id="fcm-status" style="margin-top:10px;color:green;font-weight:bold;"></div>
    </div>
  `;

  // Pasang event listener tombol kirim
  document.getElementById("btn-kirim").addEventListener("click", kirimPesanFCMManual);

  // Fungsi kirim pesan ke Firestore
  async function kirimPesanFCMManual() {
    const role = document.getElementById("fcm-role").value;
    const title = document.getElementById("fcm-title").value.trim();
    const body = document.getElementById("fcm-body").value.trim();
    const url = document.getElementById("fcm-url").value.trim() || "/"; // fallback ke homepage
    const statusDiv = document.getElementById("fcm-status");
    const btn = document.getElementById("btn-kirim");

    if (!title || !body) {
      statusDiv.style.color = "red";
      statusDiv.textContent = "⚠️ Judul dan isi pesan harus diisi!";
      return;
    }

    statusDiv.style.color = "black";
    statusDiv.textContent = "Mengirim pesan ke Firestore...";
    btn.disabled = true;

    try {
      const db = firebase.firestore();

      await db.collection("pesan-fcm").add({
        title,
        body,
        target: role,
        url,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      statusDiv.style.color = "green";
      statusDiv.textContent = `✅ Pesan berhasil dikirim untuk target: ${role}`;
      // Optional reset form:
      // document.getElementById("fcm-title").value = "";
      // document.getElementById("fcm-body").value = "";
      // document.getElementById("fcm-url").value = "";

    } catch (error) {
      statusDiv.style.color = "red";
      statusDiv.textContent = `❌ Gagal mengirim pesan: ${error.message}`;
    } finally {
      btn.disabled = false;
    }
  }
}





else if (page === "admin-rating") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat rating...</p>`;

  (async () => {
    const db = firebase.firestore();
    try {
      const ratingData = [];

      // Ambil rating dari koleksi produk
      const produkSnapshot = await db.collection("produk").get();
      for (const doc of produkSnapshot.docs) {
        const produk = doc.data();
        const ratingSnap = await db.collection("produk").doc(doc.id).collection("rating").get();
        ratingSnap.forEach(r => {
          const d = r.data();
          ratingData.push({
            idRating: r.id,
            idProduk: doc.id,
            namaProduk: produk.namaProduk || "-",
            rating: d.rating,
            komentar: d.ulasan || d.komentar || "-",
            user: d.namaUser || d.nama || "Anonim",
            waktu: d.waktu?.toDate?.() || new Date(d.waktu),
            idPesanan: d.idPesanan || "-",
          });
        });
      }

      if (ratingData.length === 0) {
        container.innerHTML = `<p style="text-align:center;">Belum ada data rating.</p>`;
        return;
      }

      ratingData.sort((a, b) => b.waktu - a.waktu);

      container.innerHTML = `
        <h2>⭐ Kelola Rating Produk</h2>
        ${ratingData.map(r => `
          <div class="admin-rating-card">
            <div class="admin-rating-header">
              <span class="admin-rating-jenis">Produk: ${r.namaProduk}</span>
              <span class="admin-rating-nama">👤 ${r.user}</span>
            </div>
            <div class="admin-rating-bintang">⭐ ${r.rating}/5</div>
            <div class="admin-rating-komentar">"${r.komentar}"</div>
            <div class="admin-rating-footer">
              🆔 Order: ${r.idPesanan}<br>
              <small>🕒 ${r.waktu.toLocaleString("id-ID")}</small><br>
              <button onclick="editRating('${r.idProduk}', '${r.idRating}', '${r.komentar.replace(/'/g, "\\'")}', ${r.rating})" class="btn-mini">✏️ Edit</button>
              <button onclick="hapusRating('${r.idProduk}', '${r.idRating}')" class="btn-mini" style="color:red;">🗑 Hapus</button>
            </div>
          </div>
        `).join("")}
      `;
    } catch (err) {
      console.error("❌ Gagal load admin-rating:", err);
      container.innerHTML = `<p style="color:red;">Gagal memuat rating.</p>`;
    }
  })(); // Immediately Invoked Async Function Expression
}

if (page === "admin-overlay") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat pengaturan overlay...</p>`;

  const user = firebase.auth().currentUser;
  if (!user) return container.innerHTML = `<p>Silakan login ulang.</p>`;

  const db = firebase.firestore();

  try {
    const adminDoc = await db.collection("users").doc(user.uid).get();
    const role = (adminDoc.data()?.role || "").toLowerCase();
    if (role !== "admin") return container.innerHTML = `<p style="color:red;">❌ Akses ditolak.</p>`;

    const snap = await db.collection("pengaturan").doc("popup_overlay").get();
    const data = snap.exists ? snap.data() : {
      aktif: false,
      judul: "",
      deskripsi: "",
      gambar: "",
      role: ["all"]
    };

    container.innerHTML = `
      <div class="admin-overlay-panel">
        <h2>🪟 Pengaturan Popup Overlay</h2>

        <label>Status Overlay:</label>
        <select id="overlay-aktif">
          <option value="true" ${data.aktif ? "selected" : ""}>Aktif</option>
          <option value="false" ${!data.aktif ? "selected" : ""}>Nonaktif</option>
        </select>

        <label>Judul:</label>
        <input type="text" id="overlay-judul" value="${data.judul || ""}" />

        <label>Deskripsi:</label>
        <textarea id="overlay-deskripsi" rows="3">${data.deskripsi || ""}</textarea>

        <label>Gambar URL:</label>
        <input type="text" id="overlay-gambar" value="${data.gambar || ""}" placeholder="https://..." />

        <label>Upload Gambar:</label>
        <input type="file" id="overlay-upload" accept="image/*" />
        <button id="btn-upload-overlay">📤 Upload Gambar</button>
        <button id="btn-reset-overlay">♻️ Reset Gambar</button>

        <label>Tampilkan ke Role:</label>
        <select id="overlay-role" multiple size="4">
          <option value="all" ${data.role.includes("all") ? "selected" : ""}>Semua Role</option>
          <option value="admin" ${data.role.includes("admin") ? "selected" : ""}>Admin</option>
          <option value="user" ${data.role.includes("user") ? "selected" : ""}>User</option>
          <option value="driver" ${data.role.includes("driver") ? "selected" : ""}>Driver</option>
          <option value="seller" ${data.role.includes("seller") ? "selected" : ""}>Seller</option>
        </select>

        <div class="preview-overlay" style="margin-top: 15px;">
          <strong>Preview:</strong><br>
          <img id="preview-img" src="${data.gambar || ""}" style="max-width:150px;border-radius:8px;" />
          <p id="preview-text">${data.deskripsi || ""}</p>
        </div>

        <button onclick="simpanOverlayAdmin()" class="btn-primary" style="margin-top:10px;">💾 Simpan Pengaturan</button>
        <div id="overlay-status" style="margin-top:10px;"></div>
      </div>
    `;

    // Live Preview
    document.getElementById("overlay-deskripsi").addEventListener("input", e => {
      document.getElementById("preview-text").textContent = e.target.value;
    });
    document.getElementById("overlay-gambar").addEventListener("input", e => {
      document.getElementById("preview-img").src = e.target.value;
    });

    // Upload Gambar
    document.getElementById("btn-upload-overlay").addEventListener("click", async () => {
      const file = document.getElementById("overlay-upload").files[0];
      const statusEl = document.getElementById("overlay-status");
      if (!file) return alert("⚠️ Pilih file gambar dulu.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "VLCrave-Express");
      formData.append("folder", "overlay");

      statusEl.textContent = "⏳ Uploading...";
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/du8gsffhb/image/upload", {
          method: "POST",
          body: formData
        });
        const result = await res.json();
        if (!result.secure_url) throw new Error(result.error?.message || "Upload gagal");

        document.getElementById("overlay-gambar").value = result.secure_url;
        document.getElementById("preview-img").src = result.secure_url;
        statusEl.textContent = "✅ Upload berhasil!";
      } catch (err) {
        console.error("❌ Upload:", err);
        statusEl.style.color = "red";
        statusEl.textContent = "❌ Upload gagal: " + err.message;
      }
    });

    // Reset
    document.getElementById("btn-reset-overlay").addEventListener("click", () => {
      document.getElementById("overlay-gambar").value = "";
      document.getElementById("preview-img").src = "";
      document.getElementById("overlay-status").textContent = "🔄 Gambar direset.";
    });

  } catch (err) {
    console.error("❌ Gagal memuat:", err);
    container.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}









if (page === "users-management") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data pengguna...</p>`;

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = `<p>Silakan login ulang.</p>`);

  const db = firebase.firestore();
  const adminDoc = await db.collection("users").doc(user.uid).get();
  const isAdmin = adminDoc.exists && (adminDoc.data().role || "").toLowerCase() === "admin";

  if (!isAdmin) {
    container.innerHTML = `<p style="color:red;text-align:center;">❌ Akses ditolak. Hanya admin.</p>`;
    return;
  }

  const snapshot = await db.collection("users").get();

  let html = `<h2 class="-admin-user-title">👥 Manajemen Pengguna</h2>
              <div class="-admin-user-wrapper">`;

  snapshot.forEach(doc => {
    const d = doc.data();
    const uid = doc.id;
    const shortUid = uid.slice(0, 5) + "...";

    html += `
      <div class="-admin-user-card">
        <div class="-admin-user-header">
          <span>UID: <code>${shortUid}</code></span>
          <button onclick="copyToClipboard('${uid}')" title="Salin UID" class="-admin-user-copy">📋</button>
        </div>

        <div class="-admin-user-body">
          <p><strong>👤 Nama:</strong> ${d.namaLengkap || "-"}</p>
          <p><strong>📧 Email:</strong> ${d.email || "-"}</p>
          <p><strong>👑 Role:</strong> ${d.role || "-"}</p>
          <p><strong>💰 Saldo:</strong> Rp${(d.saldo || 0).toLocaleString()}</p>
        </div>

        <div class="-admin-user-actions">
          <button onclick="gantiRole('${uid}', '${d.role || ""}')">🔁 Ganti Role</button>
          <button onclick="resetPin('${uid}')">🔐 Reset PIN</button>
          <button onclick="transferSaldo('${uid}')">💰 Transfer Saldo</button>
          <button onclick="gantiPassword('${uid}', '${d.email || ""}')">🔒 Ganti Password</button>
        </div>
      </div>
    `;
  });

  html += `
    </div><br/>
    <button onclick="loadContent('admin-user')" class="btn-mini">⬅️ Kembali</button>

    <!-- Modal Ganti Password -->
    <div id="modal-password" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:999;">
      <div style="background:#fff; padding:2rem; border-radius:12px; width:90%; max-width:400px; text-align:left;">
        <h3>Ganti Password</h3>
        <p id="ganti-pass-email"></p>
        <input id="new-password" type="password" placeholder="Password baru (min 6 karakter)" style="width:100%; padding:10px; margin:10px 0; border:1px solid #ccc; border-radius:8px;" />
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:1rem;">
          <button onclick="submitGantiPassword()" style="padding:10px 16px; background:#1e90ff; color:#fff; border:none; border-radius:6px; cursor:pointer;">Simpan</button>
          <button onclick="tutupModalPassword()" style="padding:10px 16px; background:#ddd; border:none; border-radius:6px; cursor:pointer;">Batal</button>
        </div>
        <p id="ganti-pass-msg" style="margin-top:1rem; font-size:0.9rem;"></p>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Script pendukung ganti password
  let selectedPasswordUid = null;
  let selectedPasswordEmail = null;

  window.gantiPassword = (uid, email) => {
    selectedPasswordUid = uid;
    selectedPasswordEmail = email;
    document.getElementById("modal-password").style.display = "flex";
    document.getElementById("ganti-pass-email").innerText = `Untuk akun: ${email}`;
    document.getElementById("new-password").value = "";
    document.getElementById("ganti-pass-msg").innerText = "";
  };

  window.tutupModalPassword = () => {
    document.getElementById("modal-password").style.display = "none";
  };

  window.submitGantiPassword = async () => {
    const newPass = document.getElementById("new-password").value.trim();
    const msg = document.getElementById("ganti-pass-msg");

    if (newPass.length < 6) {
      msg.innerText = "❌ Password minimal 6 karakter.";
      return;
    }

    try {
      // Mendapatkan custom token dari server kamu (jika menggunakan backend), atau hanya update Firestore
      await firebase.firestore().collection("users").doc(selectedPasswordUid).update({
        passwordBaru: newPass, // bisa disimpan sementara lalu diproses backend untuk ganti asli
        passwordChangeAt: new Date()
      });

      msg.innerText = "✅ Password berhasil diperbarui (silakan arahkan user untuk login ulang).";
    } catch (err) {
      msg.innerText = "❌ Gagal memperbarui password: " + err.message;
    }
  };
}




else if (page === 'pesanan-admin') {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>📦 Memuat semua pesanan...</p>`;

  const db = firebase.firestore();

  try {
    const snap = await db.collection("pesanan").orderBy("createdAt", "desc").get();

    if (snap.empty) {
      container.innerHTML = `<p>⚠️ Belum ada pesanan yang masuk.</p>`;
      return;
    }

    let html = `<div class="card-list -riwayat-pesanan-admin">`;

    for (const doc of snap.docs) {
      const data = doc.data();
      const id = doc.id;
      const waktu = data.createdAt?.toDate().toLocaleString("id-ID") ?? "-";
      const metode = data.metode?.toUpperCase() ?? "-";
      const status = data.status ?? "-";
      const pembeli = data.namaPembeli ?? "Customer";

      html += `
        <div class="card -riwayat-pesanan-admin">
          <div class="card-header">
            <div>
              <strong>ID Pesanan:</strong> ${id}<br>
              <small>🕒 ${waktu}</small>
            </div>
            <div class="badge-status">${status}</div>
          </div>
          <div class="card-body">
            <p><strong>👤 Pembeli:</strong> ${pembeli}</p>
            <p><strong>💳 Metode Pembayaran:</strong> ${metode}</p>
          </div>
          <div class="card-footer">
            <button onclick="bukaModalDetailPesananAdmin('${id}')" class="btn-action -riwayat-pesanan-admin">🔍 Detail</button>
            <button onclick="editStatusPesanan('${id}', '${status}')" class="btn-action -riwayat-pesanan-admin">✏️ Edit</button>
            <button onclick="hapusPesananAdmin('${id}')" class="btn-action -riwayat-pesanan-admin danger">🗑️ Hapus</button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error("❌ Gagal memuat pesanan:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat pesanan.</p>`;
  }
}



if (page === "livechat-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat Live Chat Admin...</p>`;

  const db = firebase.firestore();
  const adminUid = "JtD1wA2wkzVg6SWwWSFTxFZMhxO2";
  let unsubscribeChat = null;

  async function renderLiveChatPanel() {
    try {
      const pengaturan = await db.collection("pengaturan").doc("liveChatStatus").get();
      const status = pengaturan.exists ? pengaturan.data().status || "offline" : "offline";

      const chatSnapshot = await db.collection("chat")
        .orderBy("waktu", "desc")
        .limit(50)
        .get();

      const userMap = new Map();

      chatSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const uidUser = data.dari !== adminUid ? data.dari : data.ke;
        if (uidUser !== adminUid && !userMap.has(uidUser)) {
          userMap.set(uidUser, {
            uid: uidUser,
            waktu: data.waktu?.toDate() || new Date(),
            unread: 0
          });
        }
      });

      const unreadSnap = await db.collection("chat")
        .where("ke", "==", adminUid)
        .where("status_baca", "==", false)
        .get();

      unreadSnap.docs.forEach(doc => {
        const data = doc.data();
        if (userMap.has(data.dari)) {
          userMap.get(data.dari).unread++;
        }
      });

      container.innerHTML = `
        <h2>💬 Live Chat Admin</h2>
        <div style="margin-bottom:12px;">
          Status Live Chat: 
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-live-chat-switch" ${status === "online" ? "checked" : ""} />
            <span class="slider"></span>
          </label>
          <span id="live-chat-status-text" style="font-weight:bold; color:${status === 'online' ? 'green' : 'red'};">
            ${status.toUpperCase()}
          </span>
        </div>
        <hr />
        <div id="live-chat-users-list" style="max-height:300px; overflow-y:auto; margin-top:10px;"></div>
        <div id="live-chat-chatbox" style="margin-top:20px;"></div>
      `;

      const usersList = document.getElementById("live-chat-users-list");
      userMap.forEach((val, uid) => {
        const btn = document.createElement("button");
        btn.textContent = `${uid}`;
        btn.style = `
          display:block; width:100%; text-align:left; padding:8px;
          margin-bottom:4px; background:#eee; border:none; border-radius:6px;
          font-weight:bold; cursor:pointer;
        `;
        if (val.unread > 0) {
          const badge = document.createElement("span");
          badge.textContent = val.unread;
          badge.style = `
            float:right; background:red; color:white; padding:2px 8px;
            border-radius:12px; font-size:12px;
          `;
          btn.appendChild(badge);
        }
        btn.onclick = () => openChatWith(uid);
        usersList.appendChild(btn);
      });

      document.getElementById("toggle-live-chat-switch").onchange = async (e) => {
        const newStatus = e.target.checked ? "online" : "offline";
        await db.collection("pengaturan").doc("liveChatStatus").set({ status: newStatus });
        document.getElementById("live-chat-status-text").textContent = newStatus.toUpperCase();
        document.getElementById("live-chat-status-text").style.color = newStatus === "online" ? "green" : "red";
      };
    } catch (e) {
      container.innerHTML = `<p style="color:red;">❌ ${e.message}</p>`;
    }
  }

  async function openChatWith(userId) {
    if (unsubscribeChat) unsubscribeChat();

    const box = document.getElementById("live-chat-chatbox");
    box.innerHTML = `
      <div id="admin-chat-messages" style="height:300px; overflow-y:auto; padding:10px; border:1px solid #ccc; border-radius:8px; background:#fafafa;"></div>
      <div style="margin-top:8px;">
        <input id="admin-chat-input" style="width:70%; padding:6px;" placeholder="Tulis pesan..." />
        <button id="admin-send-btn" style="padding:6px 10px;">Kirim</button>
        <button id="admin-close-btn" style="padding:6px 10px; background:red; color:white;">Tutup</button>
      </div>
    `;

    const msgBox = document.getElementById("admin-chat-messages");
    const input = document.getElementById("admin-chat-input");
    const sendBtn = document.getElementById("admin-send-btn");
    const closeBtn = document.getElementById("admin-close-btn");
    const chatId = [userId, adminUid].sort().join("_");

    unsubscribeChat = db.collection("chat")
      .where("chatId", "==", chatId)
      .orderBy("waktu", "asc")
      .onSnapshot(snapshot => {
        msgBox.innerHTML = "";
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const bubble = document.createElement("div");
          bubble.textContent = data.isi;
          bubble.style = `
            padding:8px; margin:4px 0;
            background:${data.dari === adminUid ? '#dcf8c6' : '#fff'};
            border-radius:10px; max-width:70%;
            align-self: ${data.dari === adminUid ? 'flex-end' : 'flex-start'};
          `;
          msgBox.appendChild(bubble);

          if (data.ke === adminUid && !data.status_baca) {
            doc.ref.update({ status_baca: true });
          }
        });
        msgBox.scrollTop = msgBox.scrollHeight;
      });

    sendBtn.onclick = async () => {
      const text = input.value.trim();
      if (!text) return;
      await db.collection("chat").add({
        dari: adminUid,
        ke: userId,
        isi: text,
        waktu: new Date(),
        chatId: chatId,
        status_baca: false
      });
      input.value = "";
    };

    closeBtn.onclick = () => {
      if (unsubscribeChat) unsubscribeChat();
      document.getElementById("live-chat-chatbox").innerHTML = "";
    };
  }

  renderLiveChatPanel();
}





else if (page === "riwayat-transaksi-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat riwayat transaksi...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("pesanan")
      .orderBy("waktuPesan", "desc")
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p>📭 Belum ada pesanan yang tercatat.</p>`;
      return;
    }

    const semuaData = [];
    const tokoCache = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const produk = data.produk || [];
      const idToko = produk[0]?.idToko || null;

      let namaToko = "Tidak diketahui";
      if (idToko) {
        if (tokoCache[idToko]) {
          namaToko = tokoCache[idToko];
        } else {
          const tokoDoc = await db.collection("toko").doc(idToko).get();
          if (tokoDoc.exists) {
            namaToko = tokoDoc.data().namaToko || "Tanpa Nama";
            tokoCache[idToko] = namaToko;
          }
        }
      }

      semuaData.push({
        id: doc.id,
        waktu: data.waktuPesan ? new Date(data.waktuPesan).toLocaleString("id-ID") : "-",
        namaToko,
        total: data.total || 0,
        status: data.status || "-"
      });
    }

    // Render awal + filter
    renderTabelRiwayat(semuaData, container, "Semua");

  } catch (err) {
    console.error("❌ Gagal memuat riwayat:", err);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan: ${err.message}</p>`;
  }
}



else if (page === "admin-voucher") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat voucher...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = `<p style="color:red;">❌ Silakan login ulang.</p>`;
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const role = userDoc.exists ? (userDoc.data().role || "").toLowerCase() : "";

  if (role !== "admin") {
    container.innerHTML = `<p style="color:red;">❌ Akses ditolak.</p>`;
    return;
  }

  const snapshot = await db.collection("voucher").orderBy("expired", "desc").get();
  const voucherList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const cards = voucherList.map((v, i) => {
    const expiredDate = v.expired?.toDate?.();
    const expiredStr = expiredDate instanceof Date
      ? expiredDate.toLocaleDateString("id-ID")
      : "-";

    const potonganStr = v.tipe === "persen"
      ? `${v.potongan}%`
      : `Rp${parseInt(v.potongan).toLocaleString("id-ID")}`;

    const potonganUntuk = v.tipePotongan === "ongkir" ? "Ongkir" : "Produk";

    return `
      <div class="voucher-card-voucher-admin">
        <div><strong>📌 Kode:</strong> ${v.kode || "-"}</div>
        <div><strong>💸 Minimal:</strong> Rp${(v.minimal || 0).toLocaleString("id-ID")}</div>
        <div><strong>🎁 Potongan:</strong> ${potonganStr} (${potonganUntuk})</div>
        <div><strong>📦 Kuota:</strong> ${v.kuota || 0}</div>
        <div><strong>⏳ Expired:</strong> ${expiredStr}</div>
        <div><strong>👤 Dipakai:</strong> ${(v.digunakanOleh || []).length} user</div>
        <div class="voucher-card-actions-voucher-admin">
  <button onclick="editVoucher('${v.id}')">✏️ Edit</button>
  <button onclick="hapusVoucher('${v.id}')">🗑️ Hapus</button>
  <button onclick="lihatRiwayatVoucher('${v.id}')">📜 Riwayat</button>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="admin-voucher-page-voucher-admin">
      <h2>🎟️ Kelola Voucher</h2>

      <form onsubmit="return simpanVoucher(event)" id="form-voucher" style="margin-bottom:20px;">
        <input type="hidden" id="voucher-id" />
        <input required type="text" id="voucher-kode" placeholder="Kode Voucher (huruf besar)" />

        <select id="voucher-tipe">
          <option value="nominal">Nominal (Rp)</option>
          <option value="persen">Persen (%)</option>
        </select>

        <input required type="number" id="voucher-potongan" placeholder="Potongan" />
        <input required type="number" id="voucher-minimal" placeholder="Minimal Order" />

        <select id="voucher-tipe-potongan">
          <option value="produk">Potong Produk</option>
          <option value="ongkir">Potong Ongkir</option>
        </select>

        <input required type="number" id="voucher-kuota" placeholder="Kuota" />
        <input required type="date" id="voucher-expired" />
        <button type="submit">💾 Simpan Voucher</button>
      </form>

      <div class="voucher-list-voucher-admin">
        ${cards || `<p style="text-align:center;">Tidak ada voucher.</p>`}
      </div>
    </div>
  `;
}



else if (page === "riwayat-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat transaksi selesai...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("pesanan")
      .orderBy("waktuPesan", "desc")
      .limit(100)
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p>✅ Tidak ada transaksi selesai.</p>`;
      return;
    }

    let cards = "";
    let totalFeeKeseluruhan = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const status = (data.status || "").toLowerCase();
      if (status !== "selesai") continue;

      const id = doc.id;
      const tanggal = data.waktuPesan
        ? new Date(data.waktuPesan).toLocaleString("id-ID")
        : "-";

      const subtotal = data.subtotalProduk || 0;
      const ongkir = data.totalOngkir || 0;
      const totalTransaksi = subtotal + ongkir;

      const biayaLayanan = Math.round(totalTransaksi * 0.01);
      const biayaToko = Math.round(subtotal * 0.05);
      const biayaDriver = Math.round(ongkir * 0.05);
      const totalFee = biayaLayanan + biayaToko + biayaDriver;

      totalFeeKeseluruhan += totalFee;

      cards += `
        <div class="card-fee-admin">
          <p><strong>ID:</strong> ${id}</p>
          <p><strong>Tanggal:</strong> ${tanggal}</p>
          <p><strong>Total Transaksi:</strong> Rp${totalTransaksi.toLocaleString("id-ID")}</p>
          <p><strong>Biaya Layanan (1%):</strong> Rp${biayaLayanan.toLocaleString("id-ID")}</p>
          <p><strong>Biaya Toko (5%):</strong> Rp${biayaToko.toLocaleString("id-ID")}</p>
          <p><strong>Biaya Driver (5%):</strong> Rp${biayaDriver.toLocaleString("id-ID")}</p>
          <p><strong>Total Fee:</strong> <span style="font-weight:bold;">Rp${totalFee.toLocaleString("id-ID")}</span></p>
          <button onclick="lihatDetailTransaksi('${id}')" class="btn-detail">🔍 Detail</button>
        </div>
      `;
    }

    if (!cards) {
      container.innerHTML = `<p>✅ Tidak ada transaksi selesai.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="riwayat-transaksi-selesai">
        <h2>📄 Riwayat Transaksi Selesai</h2>
        <div id="card-list-fee-admin">
          ${cards}
        </div>
        <p style="margin-top:12px;font-weight:bold;">
          💰 Total Semua Fee: Rp ${totalFeeKeseluruhan.toLocaleString("id-ID")}
        </p>
        <button onclick="loadContent('admin-user')" class="btn-kembali">⬅️ Kembali</button>
      </div>
    `;

  } catch (err) {
    console.error("❌ Gagal memuat transaksi selesai:", err);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan: ${err.message}</p>`;
  }
}








if (page === "admin-driver") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<p>Memuat data driver...</p>";

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = "<p>Silakan login ulang.</p>");

  const db = firebase.firestore();

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();
    const role = (userDoc.data()?.role || "").toLowerCase();

    if (role !== "admin") {
      container.innerHTML = `<p style="color:red;text-align:center;">❌ Akses ditolak. Hanya admin.</p>`;
      return;
    }

const responsiveDriverStyle = `
<style>
  .-admin-driver-wrapper {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .-admin-driver-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 0 6px rgba(0,0,0,0.08);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .-admin-driver-header {
    font-size: 16px;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
    padding-bottom: 6px;
  }

  .-admin-driver-body {
    font-size: 14px;
    line-height: 1.5;
  }

  .-admin-driver-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .-admin-driver-actions button {
    flex: 1 1 48%;
    padding: 8px;
    font-size: 13px;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .-admin-driver-actions button:hover {
    background-color: #0056b3;
  }

  .-form-driver {
    margin: 10px auto 30px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 12px;
    box-shadow: 0 0 4px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 600px;
  }

  .-form-driver select,
  .-form-driver input,
  .-form-driver button {
    padding: 12px;
    font-size: 14px;
    border-radius: 6px;
    border: 1px solid #ccc;
    width: 100%;
    box-sizing: border-box;
  }

  .-form-driver button {
    background: #28a745;
    color: white;
    font-weight: bold;
    border: none;
    cursor: pointer;
  }

  .-form-driver button:hover {
    background: #218838;
  }

  @media (max-width: 480px) {
    .-admin-driver-card {
      padding: 14px;
    }

    .-admin-driver-header {
      font-size: 15px;
    }

    .-admin-driver-body {
      font-size: 13px;
    }

    .-admin-driver-actions button {
      font-size: 12px;
    }

    .-form-driver input,
    .-form-driver select,
    .-form-driver button {
      font-size: 13px;
    }
  }
</style>
`;

    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const driversSnapshot = await db.collection("driver").orderBy("createdAt", "desc").get();
    const drivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Dropdown UID
    let dropdownHTML = `
      <select id="input-uid-driver" required>
        <option value="">🔽 Pilih UID Pengguna</option>
    `;
    for (const user of users) {
      const uid = user.id;
      const truncatedUID = uid.length > 10 ? uid.substring(0, 10) + "..." : uid;
      const nama = user.namaLengkap || user.nama || "Tanpa Nama";
      dropdownHTML += `<option value="${uid}">${truncatedUID} - ${nama}</option>`;
    }
    dropdownHTML += `</select>`;

    // Form Tambah Driver
    let html = `
      <h2 class="-admin-driver-title">🛵 Manajemen Driver</h2>
      <form class="-form-driver" onsubmit="event.preventDefault(); tambahDriverForm();">
        ${dropdownHTML}
        <input type="text" id="input-nama-driver" placeholder="Nama Lengkap" required />
        <input type="text" id="input-alamat-driver" placeholder="Alamat Lengkap" required />
        <input type="text" id="input-plat-driver" placeholder="Nomor Plat Kendaraan" required />
        <input type="file" id="input-ktp-driver" accept="image/*" required />
        <span id="status-upload-ktp"></span>
        <button type="submit">➕ Tambah Driver</button>
      </form>
      <div class="-admin-driver-wrapper">
    `;

    // Kartu Driver
    for (const driver of drivers) {
      html += `
        <div class="-admin-driver-card">
          <div class="-admin-driver-header">
            👤 <strong>${driver.nama || 'Tanpa Nama'}</strong>
          </div>
          <div class="-admin-driver-body">
            🏍️ Plat: <strong>${driver.nomorPlat || '-'}</strong><br>
            🏠 Alamat: ${driver.alamat || '-'}<br>
            ⚙️ Status: <span style="color:${driver.status === 'aktif' ? 'green' : 'red'}">${driver.status}</span><br>
            💰 Saldo: <strong>Rp ${(driver.saldo || 0).toLocaleString()}</strong><br>
            📄 KTP: ${driver.urlKTP ? `<a href="${driver.urlKTP}" target="_blank">Lihat</a>` : 'Tidak tersedia'}
          </div>
          <div class="-admin-driver-actions">
            <button onclick="promptTransferSaldo('${driver.id}')">💸 Transfer</button>
            <button onclick="editDriver('${driver.id}')">✏️ Edit</button>
            <button onclick="hapusDriver('${driver.id}')">🗑️ Hapus</button>
            <button onclick="loadContent('riwayat-driver-admin', '${driver.id}')">📜 Riwayat</button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html + responsiveDriverStyle;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:red;">Gagal memuat data driver: ${err.message}</p>`;
  }
}



else if (page === "riwayat-driver-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>📦 Memuat riwayat driver...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("riwayat_driver_admin")
      .orderBy("waktu", "desc")
      .limit(100)
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p>✅ Belum ada riwayat tersedia.</p>`;
      return;
    }

    let html = `<h2>📚 Riwayat Driver (Admin)</h2><div class="-driver-riwayat-admin-list">`;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const waktu = data.waktu
        ? new Date(data.waktu).toLocaleString("id-ID")
        : "-";
      const orderId = data.orderId || "-";
      const idDriver = data.idDriver || "-";
      const stepsLog = Array.isArray(data.stepsLog)
        ? data.stepsLog.map(s => (typeof s === "string" ? s : JSON.stringify(s)))
        : [];

      let metodePengiriman = "-";
      let estimasiMenit = "-";
      let selesaiDalam = "-";

      try {
        const pesananSnap = await db.collection("pesanan").doc(orderId).get();
        if (pesananSnap.exists) {
          const pesananData = pesananSnap.data();
          metodePengiriman = pesananData.metodePengiriman || "-";
          estimasiMenit = pesananData.estimasiMenit
            ? `${pesananData.estimasiMenit} menit`
            : "-";

          const timeExtract = s => {
            const match = s.match(/^(\d{1,2})\.(\d{2})/);
            if (match) {
              const [_, jam, menit] = match;
              const date = new Date();
              date.setHours(+jam, +menit, 0, 0);
              return date;
            }
            return null;
          };

          const timeFirst = stepsLog.length > 0 ? timeExtract(stepsLog[0]) : null;
          const timeLast = stepsLog.length > 0 ? timeExtract(stepsLog[stepsLog.length - 1]) : null;

          if (timeFirst && timeLast) {
            const diffMs = timeLast - timeFirst;
            const diffMenit = Math.round(diffMs / 60000);
            selesaiDalam = `${diffMenit} menit`;
          }
        }
      } catch (e) {
        console.warn(`Gagal ambil data pesanan: ${orderId}`, e);
      }

      const stepHtml = stepsLog.length > 0
        ? `<ul class="step-log">` +
            stepsLog.map(step => {
              const match = step.match(/^(\d{1,2})\.(\d{2})\s+(.*)$/);
              if (match) {
                const jam = `${match[1]}:${match[2]}`;
                const isi = match[3];
                return `<li><strong>${jam}</strong> — ${isi}</li>`;
              }
              return `<li>${step}</li>`;
            }).join("") +
          `</ul>`
        : `<p class="step-empty">(Tidak ada log langkah)</p>`;

      html += `
        <div class="-driver-riwayat-admin-card">
          <div class="card-header">🆔 Order ID: <b>${orderId}</b></div>
          <div class="card-body">
            <p><b>🚗 Driver:</b> ${idDriver}</p>
            <p><b>📦 Pengiriman:</b> ${metodePengiriman}</p>
            <p><b>⏳ Estimasi:</b> ${estimasiMenit}</p>
            <p><b>✅ Selesai Dalam:</b> ${selesaiDalam}</p>
            <p><b>📋 Steps Log:</b></p>
            ${stepHtml}
          </div>
        </div>
      `;
    }

    html += "</div>";
    container.innerHTML = html;

  } catch (error) {
    console.error("Gagal memuat riwayat driver:", error);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan saat memuat data.</p>`;
  }
}








if (page.startsWith("edit-driver")) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data driver...</p>`;

  const params = new URLSearchParams(window.location.search);
  const driverId = params.get("id");

  if (!driverId) {
    container.innerHTML = `<p style="color:red;">❌ ID driver tidak ditemukan.</p>`;
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = `<p>Silakan login ulang.</p>`);

  const db = firebase.firestore();
  const adminDoc = await db.collection("users").doc(user.uid).get();
  const role = adminDoc.exists ? (adminDoc.data().role || "").toLowerCase() : "";

  if (role !== "admin") {
    container.innerHTML = `<p style="color:red;">❌ Akses ditolak. Hanya admin.</p>`;
    return;
  }

  const driverDoc = await db.collection("driver").doc(driverId).get();
  if (!driverDoc.exists) {
    container.innerHTML = `<p style="color:red;">Driver tidak ditemukan.</p>`;
    return;
  }

  const data = driverDoc.data();
  const {
    nama = "",
    nomorPlat = "",
    status = "nonaktif",
    fotoProfil = "",
    urlKTP = ""
  } = data;

  // Ambil saldo dari subkoleksi
  const saldoRef = db.collection("driver").doc(driverId).collection("saldo").doc("data");
  const saldoDoc = await saldoRef.get();
  const saldoDriver = saldoDoc.exists ? saldoDoc.data().jumlah || 0 : 0;

  container.innerHTML = `
    <h2>✏️ Edit Driver</h2>
    <form id="edit-driver-form" onsubmit="submitEditDriver(event, '${driverId}')">
      <label>Nama Lengkap:<br/>
        <input type="text" id="driver-nama" value="${nama}" required>
      </label><br/><br/>

      <label>Nomor Plat:<br/>
        <input type="text" id="driver-plat" value="${nomorPlat}" required>
      </label><br/><br/>

      <label>Status:<br/>
        <select id="driver-status">
          <option value="aktif" ${status === "aktif" ? "selected" : ""}>Aktif</option>
          <option value="nonaktif" ${status === "nonaktif" ? "selected" : ""}>Nonaktif</option>
        </select>
      </label><br/><br/>

      <label>URL Foto Profil:<br/>
        <input type="url" id="driver-foto" value="${fotoProfil}">
      </label><br/><br/>

      <label>URL KTP (opsional):<br/>
        <input type="url" id="driver-ktp" value="${urlKTP}">
      </label><br/><br/>

      <button type="submit">💾 Simpan Perubahan</button>
      <button type="button" onclick="loadContent('admin-driver')">⬅️ Batal</button>
    </form>
  `;
}




else if (page === "admin-toko") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data toko...</p>`;

  const db = firebase.firestore();
  const tokoRef = db.collection("toko");

  try {
    const snapshot = await tokoRef.get();
    const dataToko = [];
    let htmlCards = '';

    for (const doc of snapshot.docs) {
      const toko = doc.data();
      const produkSnap = await db.collection("produk").where("toko", "==", toko.namaToko).get();
      const transaksiSnap = await db.collection("pesanan").where("toko", "==", toko.namaToko).get();

      dataToko.push({
        id: doc.id,
        ...toko,
        totalProduk: produkSnap.size,
        totalTransaksi: transaksiSnap.size
      });

      htmlCards += `
        <div class="toko-card -admin-toko">
          <div class="toko-card-header -admin-toko">
            <h3>${toko.namaToko}</h3>
            <small>UID: ${toko.uid || '-'}</small>
          </div>
          <div class="toko-card-body -admin-toko">
            <p><strong>🧑 Pemilik:</strong> ${toko.namaPemilik || '-'}</p>
            <p><strong>🕒 Jam Operasional:</strong> ${toko.jamBuka}:00 - ${toko.jamTutup}:00</p>
            <p><strong>📍 Alamat:</strong> ${toko.alamatToko || '-'}</p>
            <p><strong>📦 Produk:</strong> ${produkSnap.size}</p>
            <p><strong>🧾 Transaksi:</strong> ${transaksiSnap.size}</p>
            <p><strong>💰 Saldo:</strong> Rp${(toko.saldo || 0).toLocaleString()}</p>
          </div>
          <div class="toko-card-actions -admin-toko">
            <button onclick="lihatRiwayatTransaksi('${doc.id}')">📄 Riwayat</button>
            <button onclick="editToko('${doc.id}')">✏️ Edit</button>
            <button onclick="hapusToko('${doc.id}')">🗑️ Hapus</button>
            <button onclick="tambahSaldoToko('${doc.id}', '${toko.namaToko}')">➕ Top Up</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="admin-toko-page -admin-toko">
        <div class="admin-toko-header -admin-toko">
          <h2>🏪 Manajemen Toko</h2>
          <div class="admin-toko-controls -admin-toko">
            <button onclick="formTambahTokoAdmin()" class="btn-tambah-toko-admin">➕ Tambah Toko Manual</button>
<input type="text" id="input-uid-toko" placeholder="Masukkan UID Seller" />
<button onclick="tambahTokoViaUID()" class="btn-tambah-dari-uid">✅ Tambah dari UID</button>

          </div>
        </div>
        <div class="toko-list -admin-toko">
          ${htmlCards || `<p style="text-align:center;">Tidak ada data toko.</p>`}
        </div>
      </div>
    `;

    const badge = document.getElementById("badge-total-toko");
    if (badge) badge.textContent = dataToko.length;

  } catch (e) {
    container.innerHTML = `<p style="color:red;">Gagal memuat data: ${e.message}</p>`;
  }
}







if (page === "setting-rekening") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data rekening...</p>`;

  const db = firebase.firestore();
  const docRef = db.collection("pengaturan").doc("rekening");

  async function loadRekening() {
    const doc = await docRef.get();
    if (!doc.exists) return [];
    const data = doc.data();
    return Array.isArray(data.list) ? data.list : [];
  }

  function renderRekeningList(items) {
    container.innerHTML = `
      <div class="rekening-container-admin-rekening">
        <h2>⚙️ Kelola Rekening Deposit</h2>
        <button id="btn-tambah" class="btn-tambah-admin-rekening">➕ Tambah Rekening Baru</button>

        <div class="rekening-list-admin-rekening">
          ${
            items.length === 0
              ? `<p style="text-align:center;">Belum ada data rekening.</p>`
              : items
                  .map((item, i) => `
              <div class="rekening-card-admin-rekening" data-index="${i}">
                <p><strong>🏦 Bank:</strong> ${item.bank || "-"}</p>
                <p><strong>👤 Nama:</strong> ${item.nama || "-"}</p>
                <p><strong>🔢 Nomor:</strong> ${item.nomor || "-"}</p>
                <p><strong>Status:</strong> ${item.aktif ? "✅ Aktif" : "❌ Nonaktif"}</p>
                <div class="rekening-card-actions-admin-rekening">
                  <button class="btn-edit-admin-rekening" data-index="${i}">✏️ Edit</button>
                  <button class="btn-hapus-admin-rekening" data-index="${i}">🗑️ Hapus</button>
                </div>
              </div>
            `).join("")
          }
        </div>

        <div id="form-container" style="margin-top: 20px;"></div>
      </div>
    `;

    document.getElementById("btn-tambah").addEventListener("click", () => showForm());

    container.querySelectorAll(".btn-edit-admin-rekening").forEach(btn =>
      btn.addEventListener("click", e => {
        const index = Number(e.target.dataset.index);
        const item = items[index];
        showForm(item, index);
      })
    );

    container.querySelectorAll(".btn-hapus-admin-rekening").forEach(btn =>
      btn.addEventListener("click", async e => {
        const index = Number(e.target.dataset.index);
        if (confirm("Yakin ingin menghapus rekening ini?")) {
          try {
            items.splice(index, 1);
            await docRef.set({ list: items });
            alert("✅ Rekening berhasil dihapus.");
            init();
          } catch (err) {
            alert("❌ Gagal menghapus rekening.");
            console.error(err);
          }
        }
      })
    );
  }

  function showForm(data = null, index = null) {
    const formContainer = document.getElementById("form-container");
    formContainer.innerHTML = `
      <div class="form-rekening-admin-rekening">
        <h3>${data ? "Edit" : "Tambah"} Rekening</h3>
        <form id="rekening-form">
          <label>Nama Bank:</label>
          <input type="text" name="bank" value="${data ? data.bank : ""}" required /><br/>

          <label>Nama Rekening:</label>
          <input type="text" name="nama" value="${data ? data.nama : ""}" required /><br/>

          <label>Nomor Rekening:</label>
          <input type="text" name="nomor" value="${data ? data.nomor : ""}" required /><br/>

          <label>Status Aktif:</label>
          <input type="checkbox" name="aktif" ${data && data.aktif ? "checked" : ""} /><br/><br/>

          <button type="submit" class="btn-simpan-admin-rekening">${data ? "💾 Simpan" : "➕ Tambah"}</button>
          <button type="button" id="btn-batal" class="btn-batal-admin-rekening">Batal</button>
          <div id="form-message" style="margin-top:10px; font-weight:600;"></div>
        </form>
      </div>
    `;

    const form = document.getElementById("rekening-form");
    const messageDiv = document.getElementById("form-message");

    form.addEventListener("submit", async e => {
      e.preventDefault();
      messageDiv.textContent = "";

      const formData = new FormData(form);
      const bank = formData.get("bank").trim();
      const nama = formData.get("nama").trim();
      const nomor = formData.get("nomor").trim();
      const aktif = formData.get("aktif") === "on";

      if (!bank || !nama || !nomor) {
        messageDiv.style.color = "red";
        messageDiv.textContent = "❌ Semua kolom wajib diisi.";
        return;
      }

      try {
        const items = await loadRekening();
        if (data) {
          items[index] = { bank, nama, nomor, aktif };
        } else {
          items.push({ bank, nama, nomor, aktif });
        }

        await docRef.set({ list: items });
        messageDiv.style.color = "green";
        messageDiv.textContent = `✅ Rekening berhasil ${data ? "diperbarui" : "ditambahkan"}.`;

        setTimeout(() => {
          formContainer.innerHTML = "";
          init();
        }, 1000);
      } catch (err) {
        messageDiv.style.color = "red";
        messageDiv.textContent = "❌ Gagal menyimpan rekening.";
        console.error(err);
      }
    });

    document.getElementById("btn-batal").addEventListener("click", () => {
      formContainer.innerHTML = "";
    });
  }

  async function init() {
    try {
      const items = await loadRekening();
      renderRekeningList(items);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Gagal memuat data rekening.</p>`;
      console.error(err);
    }
  }

  init();
}



if (page === "permintaan-deposit") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat permintaan deposit...</p>`;

  const db = firebase.firestore();
  const allDeposits = await db.collection("topup_request").orderBy("timestamp", "desc").get();

  const userList = [];
  const driverList = [];
  const sellerList = [];

  allDeposits.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    if (d.role === "driver") driverList.push({ id, data: d });
    else if (d.role === "seller") sellerList.push({ id, data: d });
    else userList.push({ id, data: d });
  });

  let html = `
    <div class="permintaan-deposit-container">
      <h2>💰 Daftar Permintaan Deposit</h2>
      <div class="deposit-list">
  `;

  function renderDepositList(list, roleLabel, idField) {
    if (list.length === 0) return `<p style="text-align:center;"><em>Tidak ada permintaan dari ${roleLabel}.</em></p>`;

    return `
      <h3>${roleLabel}</h3>
      ${list.map(item => {
        const d = item.data;
        const waktu = d.timestamp?.toDate?.().toLocaleString("id-ID") || "-";
        const isExpired = d.expiredAt && d.expiredAt.toMillis() < Date.now();
        const status = isExpired && d.status === "Menunggu" ? "Dibatalkan (Expired)" : d.status;
        const idTransaksi = `DP-${item.id.substring(0, 4).toUpperCase()}`;

        return `
          <div class="deposit-card deposit-card-deposit-admin">
            <p><strong>ID Transaksi:</strong> ${idTransaksi}</p>
            <p><strong>ID ${roleLabel}:</strong> ${d[idField] || "-"}</p>
            <p><strong>Metode:</strong> ${d.metode || "-"}</p>
            <p><strong>Nominal:</strong> Rp${(d.jumlah || 0).toLocaleString("id-ID")}</p>
            <p><strong>Total:</strong> Rp${(d.total || 0).toLocaleString("id-ID")}</p>
            <p><strong>Catatan:</strong> ${d.catatan || "-"}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><small>🕒 ${waktu}</small></p>
            ${
              d.status === "Menunggu" && !isExpired ? `
                <div class="deposit-action-deposit-admin">
                  <button class="btn-mini" onclick="${
  d.role === 'user'
    ? `konfirmasiTopupUser('${item.id}', '${d.userId}', ${d.total})`
    : d.role === 'driver'
    ? `konfirmasiTopupDriver('${item.id}', '${d.idDriver}', ${d.total})`
    : `konfirmasiTopupToko('${item.id}', '${d.idToko}', ${d.total})`
}">✅ Konfirmasi</button>

                </div>
              ` : (d.status === "Dikonfirmasi" || d.status === "Ditolak") ? `
                <div class="deposit-action-deposit-admin">
                  <button class="btn-mini" onclick="batalkanTopup('${item.id}')">🗑 Batalkan</button>
                  ${d.status !== "Selesai" ? `<button class="btn-mini" onclick="selesaikanTopup('${item.id}')">✔️ Selesai</button>` : ""}
                </div>
              ` : ""
            }
          </div>
        `;
      }).join("")}
    `;
  }

  html += renderDepositList(userList, "User", "userId");
  html += renderDepositList(driverList, "Driver", "idDriver");
  html += renderDepositList(sellerList, "Seller", "idToko");

  if (userList.length === 0 && driverList.length === 0 && sellerList.length === 0) {
    html += `<p style="text-align:center;"><em>Tidak ada permintaan deposit.</em></p>`;
  }

  html += `
      </div>
      <center><button class="btn-mini" onclick="loadContent('admin-user')">⬅️ Kembali</button></center>
    </div>
  `;

  container.innerHTML = html;
}




if (page === "permintaan-withdraw") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat permintaan withdraw...</p>`;

  const db = firebase.firestore();
  const allWithdraw = await db.collection("withdraw_request").orderBy("waktu", "desc").get();

  const driverList = [];
  const sellerList = [];

  allWithdraw.forEach(doc => {
    const data = doc.data();
    if (data.idDriver) driverList.push({ id: doc.id, data });
    else if (data.idToko) sellerList.push({ id: doc.id, data });
  });

  let html = `
    <div class="container-withdrawal">
      <h2 class="title-withdrawal">💸 Daftar Permintaan Withdraw</h2>
      <div class="list-withdrawal">
  `;

  // === DRIVER ===
  if (driverList.length > 0) {
    html += `<h3>🚗 Dari Driver</h3>`;
    driverList.forEach(item => {
      const d = item.data;
      const waktu = d.waktu?.toDate?.().toLocaleString("id-ID") || "-";
      const status = (d.status || "pending").toLowerCase();
      const idTransaksi = `WD-${item.id.substring(0, 4).toUpperCase()}`;

      html += `
        <div class="item-withdrawal">
          <p><strong>ID Transaksi:</strong> ${idTransaksi}</p>
          <p><strong>ID Driver:</strong> ${d.idDriver || "-"}</p>
          <p><strong>Jumlah:</strong> Rp${(d.jumlah || 0).toLocaleString("id-ID")}</p>
          <p><strong>Diterima:</strong> Rp${(d.diterima || 0).toLocaleString("id-ID")}</p>
          <p><strong>Bank:</strong> ${d.bank || "-"}</p>
          <p><strong>Rekening:</strong> ${d.rekening || "-"}</p>
          <p><strong>Biaya Admin:</strong> Rp${(d.biayaAdmin || 0).toLocaleString("id-ID")}</p>
          <p><span class="status-withdrawal ${status}">Status: ${status}</span></p>
          <small>🕒 ${waktu}</small>
          ${
            status === "pending" ? `
              <div class="actions-withdrawal">
                <button class="btn-withdrawal btn-approve-withdrawal" onclick="konfirmasiTarikDriver('${item.id}', '${d.idDriver}', ${d.diterima})">✅ Konfirmasi</button>
                <button class="btn-withdrawal btn-reject-withdrawal" onclick="tolakTarikDriver('${item.id}')">❌ Tolak</button>
              </div>` :
            status === "berhasil" ? `
              <div class="actions-withdrawal"><p><strong>Status:</strong> Berhasil</p></div>` :
            status === "ditolak" ? `
              <div class="actions-withdrawal">
                <button class="btn-withdrawal btn-cancel-withdrawal" onclick="batalkanTarikDriver('${item.id}')">🗑 Batalkan</button>
              </div>` :
            status === "dibatalkan" ? `
              <div class="actions-withdrawal"><p><em>Telah dibatalkan</em></p></div>` : ""
          }
        </div>
      `;
    });
  }

  // === SELLER ===
  if (sellerList.length > 0) {
    html += `<h3>🛒 Dari Seller</h3>`;
    sellerList.forEach(item => {
      const d = item.data;
      const waktu = d.waktu?.toDate?.().toLocaleString("id-ID") || "-";
      const status = (d.status || "pending").toLowerCase();
      const idTransaksi = `WD-${item.id.substring(0, 4).toUpperCase()}`;

      html += `
        <div class="item-withdrawal">
          <p><strong>ID Transaksi:</strong> ${idTransaksi}</p>
          <p><strong>ID Toko:</strong> ${d.idToko || "-"}</p>
          <p><strong>Jumlah:</strong> Rp${(d.jumlah || 0).toLocaleString("id-ID")}</p>
          <p><strong>Diterima:</strong> Rp${(d.jumlahDiterima || 0).toLocaleString("id-ID")}</p>
          <p><strong>Bank:</strong> ${d.bank || "-"}</p>
          <p><strong>Rekening:</strong> ${d.rekening || "-"}</p>
          <p><strong>Potongan:</strong> Rp${(d.potongan || 0).toLocaleString("id-ID")}</p>
          <p><span class="status-withdrawal ${status}">Status: ${status}</span></p>
          <small>🕒 ${waktu}</small>
          ${
            status === "pending" ? `
              <div class="actions-withdrawal">
                <button class="btn-withdrawal btn-approve-withdrawal" onclick="konfirmasiTarikSeller('${item.id}', '${d.idToko}', ${d.jumlahDiterima})">✅ Konfirmasi</button>
                <button class="btn-withdrawal btn-reject-withdrawal" onclick="tolakTarikSeller('${item.id}')">❌ Tolak</button>
              </div>` :
            status === "berhasil" ? `
              <div class="actions-withdrawal"><p><strong>Status:</strong> Berhasil</p></div>` :
            status === "ditolak" ? `
              <div class="actions-withdrawal">
                <button class="btn-withdrawal btn-cancel-withdrawal" onclick="batalkanTarikSeller('${item.id}')">🗑 Batalkan</button>
              </div>` :
            status === "dibatalkan" ? `
              <div class="actions-withdrawal"><p><em>Telah dibatalkan</em></p></div>` : ""
          }
        </div>
      `;
    });
  }

  if (driverList.length === 0 && sellerList.length === 0) {
    html += `<p class="empty-withdrawal">Tidak ada permintaan withdraw.</p>`;
  }

  html += `
      </div>
      <center><button class="btn-withdrawal" onclick="loadContent('admin-user')">⬅️ Kembali</button></center>
    </div>
  `;

  container.innerHTML = html;
}








if (page === "user") {
  const user = firebase.auth().currentUser;
  const container = document.getElementById("page-container");

  if (!user) {
    container.innerHTML = "<p>Memuat data user...</p>";
    return;
  }

  const db = firebase.firestore();
  const docRef = db.collection("users").doc(user.uid);
  const alamatRef = db.collection("alamat").doc(user.uid);

  Promise.all([docRef.get(), alamatRef.get()])
    .then(([userDoc, alamatDoc]) => {
      if (!userDoc.exists) {
        container.innerHTML = "<p>Data user tidak ditemukan.</p>";
        return;
      }

      const data = userDoc.data();
      const alamatData = alamatDoc.exists ? alamatDoc.data() : {};

      const profilePic = data.photoURL || "https://via.placeholder.com/150?text=Foto+Profil";
      const username = data.username || "";
      const namaLengkap = data.namaLengkap || "";
      const email = data.email || user.email || "-";
      const nomorHp = data.nomorHp ? data.nomorHp.toString() : "-";
      const saldoValue = typeof data.saldo === "number" ? data.saldo : 0;
      const saldo = `Rp${saldoValue.toLocaleString("id-ID")}`;
      const role = data.role?.toUpperCase() || "-";
      const createdAt = data.createdAt?.toDate?.().toLocaleString("id-ID", {
        dateStyle: "long", timeStyle: "short"
      }) || "-";
      const alamat = alamatData.alamat || "";

      const content = `
  <div class="panel-user-container">
    <h2 class="panel-user-heading"><i class="fas fa-user-circle"></i> Profil Akun</h2>

    <div class="panel-user-photo-wrapper">
      <img src="${profilePic}" alt="Foto Profil" class="panel-user-photo">
    </div>

    <!-- Tampilan View -->
    <div class="panel-user-info-grid" id="info-view">
      <div class="panel-user-label">Username</div>
      <div class="panel-user-value" id="view-username">${username}</div>

      <div class="panel-user-label">Nama Lengkap</div>
      <div class="panel-user-value" id="view-nama">${namaLengkap}</div>

      <div class="panel-user-label">Alamat</div>
      <div class="panel-user-value" id="view-alamat">${alamat}</div>
    </div>

    <!-- Tampilan Edit -->
    <div class="panel-user-info-grid" id="info-edit" style="display:none;">
      <div class="panel-user-label">Username</div>
      <div class="panel-user-value"><input id="edit-username" value="${username}" /></div>

      <div class="panel-user-label">Nama Lengkap</div>
      <div class="panel-user-value"><input id="edit-nama" value="${namaLengkap}" /></div>

      <div class="panel-user-label">Alamat</div>
      <div class="panel-user-value"><textarea id="edit-alamat" rows="3">${alamat}</textarea></div>
    </div>

    <!-- Informasi Lain -->
    <div class="panel-user-info-grid">
      <div class="panel-user-label">Saldo</div>
      <div class="panel-user-value">
        <i class="fas fa-wallet"></i> ${saldo}
        <button onclick="topupSaldoUser()" class="panel-user-btn-mini">🔼 Top Up</button>
        <button onclick="riwayatSaldoUser()" class="panel-user-btn-mini">📜 Riwayat</button>
      </div>

      <div class="panel-user-label">Email</div>
      <div class="panel-user-value"><i class="fas fa-envelope"></i> ${email}</div>

      <div class="panel-user-label">Nomor HP</div>
      <div class="panel-user-value"><i class="fas fa-phone-alt"></i> ${nomorHp}</div>

      <div class="panel-user-label">PIN</div>
      <div class="panel-user-value">
        <i class="fas fa-key"></i>
        <button onclick="loadContent('ubah-pin')" class="panel-user-btn-mini">Ubah PIN</button>
      </div>

      <div class="panel-user-label">Dibuat</div>
      <div class="panel-user-value"><i class="fas fa-calendar-alt"></i> ${createdAt}</div>
    </div>

    <!-- Tombol Aksi -->
    <button id="btn-edit-profil" class="panel-user-btn panel-user-btn-edit">✏️ Ubah Profil</button>
    <button id="btn-simpan-profil" class="panel-user-btn panel-user-btn-save" style="display: none;">💾 Simpan Perubahan</button>
    <button id="btn-logout" class="panel-user-btn panel-user-btn-logout"><i class="fas fa-sign-out-alt"></i> Logout</button>
  </div>
`;


      container.innerHTML = content;

      document.getElementById("btn-edit-profil").addEventListener("click", () => {
        document.getElementById("info-view").style.display = "none";
        document.getElementById("info-edit").style.display = "grid";
        document.getElementById("btn-edit-profil").style.display = "none";
        document.getElementById("btn-simpan-profil").style.display = "inline-block";
      });

      document.getElementById("btn-simpan-profil").addEventListener("click", async () => {
        const newUsername = document.getElementById("edit-username").value.trim();
        const newNama = document.getElementById("edit-nama").value.trim();
        const newAlamat = document.getElementById("edit-alamat").value.trim();

        try {
          await Promise.all([
            db.collection("users").doc(user.uid).update({
              username: newUsername,
              namaLengkap: newNama
            }),
            db.collection("alamat").doc(user.uid).set({ alamat: newAlamat }, { merge: true })
          ]);

          alert("✅ Profil berhasil diperbarui!");
          loadContent("user");
        } catch (err) {
          alert("❌ Gagal menyimpan perubahan: " + err.message);
        }
      });

      document.getElementById("btn-logout").addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          window.location.href = "login.html";
        });
      });

    })
    .catch(error => {
      container.innerHTML = `<p style="color:red;">Terjadi kesalahan: ${error.message}</p>`;
    });
}

else if (page === "user-seller") {
  const user = firebase.auth().currentUser;
  const container = document.getElementById("page-container");

  if (!user) {
    container.innerHTML = "<p>Memuat data seller...</p>";
    return;
  }

  const db = firebase.firestore();
  const userRef = db.collection("users").doc(user.uid);
  const alamatRef = db.collection("alamat").doc(user.uid);
  const tokoQuery = db.collection("toko").where("userId", "==", user.uid).limit(1);

  Promise.all([
    userRef.get(),
    alamatRef.get(),
    tokoQuery.get()
  ])
    .then(([userDoc, alamatDoc, tokoSnap]) => {
      if (!userDoc.exists || tokoSnap.empty) {
        container.innerHTML = "<p>Data seller tidak ditemukan.</p>";
        return;
      }

      const userData = userDoc.data();
      const alamatData = alamatDoc.exists ? alamatDoc.data() : {};

      const tokoDoc = tokoSnap.docs[0];
      const tokoData = tokoDoc.data();
      const idToko = tokoDoc.id;

      const profilePic = userData.photoURL || "https://via.placeholder.com/150?text=Foto+Profil";
      const username = userData.username || "";
      const namaLengkap = userData.namaLengkap || "";
      const email = userData.email || user.email || "-";
      const nomorHp = userData.nomorHp ? userData.nomorHp.toString() : "-";
      const role = userData.role?.toUpperCase() || "-";
      const createdAt = userData.createdAt?.toDate?.().toLocaleString("id-ID", {
        dateStyle: "long", timeStyle: "short"
      }) || "-";
      const alamat = alamatData.alamat || "-";

      const namaToko = tokoData.namaToko || "-";
      const deskripsiToko = tokoData.deskripsiToko || "-";
      const alamatToko = tokoData.alamatToko || "-";
      const statusToko = tokoData.status || (tokoData.isOpen ? "AKTIF" : "TUTUP");
      const saldoValue = typeof tokoData.saldo === "number" ? tokoData.saldo : 0;
      const saldo = `Rp${saldoValue.toLocaleString("id-ID")}`;

      const content = `
      <div class="panel-user-container">
        <h2 class="panel-user-heading"><i class="fas fa-store"></i> Panel Seller</h2>
        <div class="panel-user-photo-wrapper">
          <img src="${profilePic}" alt="Foto Profil" class="panel-user-photo">
        </div>

        <div class="panel-user-info-grid">
          <div class="panel-user-label">Nama Lengkap</div>
          <div class="panel-user-value">${namaLengkap}</div>

          <div class="panel-user-label">Email</div>
          <div class="panel-user-value">${email}</div>

          <div class="panel-user-label">Nomor HP</div>
          <div class="panel-user-value">${nomorHp}</div>

          <div class="panel-user-label">Tanggal Daftar</div>
          <div class="panel-user-value">${createdAt}</div>
        </div>

        <h3 class="panel-user-subheading">Informasi Toko</h3>
        <div class="panel-user-info-grid">
          <div class="panel-user-label">Nama Toko</div>
          <div class="panel-user-value">${namaToko}</div>

          <div class="panel-user-label">Deskripsi Toko</div>
          <div class="panel-user-value">${deskripsiToko}</div>

          <div class="panel-user-label">Alamat Toko</div>
          <div class="panel-user-value">${alamatToko}</div>

          <div class="panel-user-label">Status Toko</div>
          <div class="panel-user-value">
            <span class="badge-status ${statusToko === "AKTIF" ? "green" : "gray"}">${statusToko}</span>
          </div>

          <div class="panel-user-label">Saldo Toko</div>
          <div class="panel-user-value">
            <i class="fas fa-wallet"></i> ${saldo}
<button onclick="topupSaldoUser()" class="panel-user-btn-mini">🔼 Top Up</button>
<button onclick="formTarikSaldo('${idToko}')" class="panel-user-btn-mini">💸 Tarik Saldo</button>
<button onclick="riwayatSaldoSeller()" class="panel-user-btn-mini">📜 Riwayat</button>

          </div>
        </div>

        <button onclick="editToko('${tokoData.idToko}')" class="panel-user-btn panel-user-btn-edit">
          ✏️ Edit Toko
        </button>

        <button id="btn-logout" class="panel-user-btn panel-user-btn-logout">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>`;

      container.innerHTML = content;

      document.getElementById("btn-logout").addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          window.location.href = "login.html";
        });
      });
    })
    .catch((error) => {
      container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan: ${error.message}</p>`;
    });
}




else if (page === "user-driver") {
  const user = firebase.auth().currentUser;
  const container = document.getElementById("page-container");

  if (!user) {
    container.innerHTML = "<p>Memuat data driver...</p>";
    return;
  }

  const db = firebase.firestore();
  const userRef = db.collection("users").doc(user.uid);
  const alamatRef = db.collection("alamat").doc(user.uid);
  const driverQuery = db.collection("driver").where("idDriver", "==", user.uid).limit(1);

  Promise.all([userRef.get(), alamatRef.get(), driverQuery.get()])
    .then(([userDoc, alamatDoc, driverSnap]) => {
      if (!userDoc.exists || driverSnap.empty) {
        container.innerHTML = "<p>Data driver tidak ditemukan.</p>";
        return;
      }

      const userData = userDoc.data();
      const alamatData = alamatDoc.exists ? alamatDoc.data() : {};

      const driverDoc = driverSnap.docs[0];
      const driverData = driverDoc.data();
      const idDriver = driverData.idDriver || user.uid;

      // Data akun
      const profilePic = userData.photoURL || "https://via.placeholder.com/150?text=Foto+Profil";
      const username = userData.username || "-";
      const namaLengkap = userData.namaLengkap || "-";
      const email = userData.email || user.email || "-";
      const nomorHp = userData.nomorHp || "-";
      const role = userData.role?.toUpperCase() || "-";
      const createdAt = userData.createdAt?.toDate?.().toLocaleString("id-ID", {
        dateStyle: "long", timeStyle: "short"
      }) || "-";
      const alamatUser = alamatData.alamat || "-";

      // Data driver
      const namaDriver = driverData.nama || "-";
      const alamatDriver = driverData.alamat || "-";
      const nomorPlat = driverData.nomorPlat || "-";
      const status = driverData.status || "-";
      const lat = driverData.lokasi?.lat || "-";
      const lng = driverData.lokasi?.lng || "-";
      const saldoValue = typeof driverData.saldo === "number" ? driverData.saldo : 0;
      const saldo = `Rp${saldoValue.toLocaleString("id-ID")}`;
      const updatedAt = driverData.updatedAt?.toDate?.().toLocaleString("id-ID", {
        dateStyle: "long", timeStyle: "short"
      }) || "-";

      const content = `
      <div class="panel-user-container">
        <h2 class="panel-user-heading"><i class="fas fa-motorcycle"></i> Panel Driver</h2>

        <div class="panel-user-photo-wrapper">
          <img src="${profilePic}" alt="Foto Profil" class="panel-user-photo">
        </div>

        <h3 class="panel-user-subheading">Data Akun</h3>
        <div class="panel-user-info-grid">
          <div class="panel-user-label">Nama Lengkap</div>
          <div class="panel-user-value">${namaLengkap}</div>

          <div class="panel-user-label">Email</div>
          <div class="panel-user-value">${email}</div>

          <div class="panel-user-label">Nomor HP</div>
          <div class="panel-user-value">${nomorHp}</div>

          <div class="panel-user-label">Alamat Akun</div>
          <div class="panel-user-value">${alamatUser}</div>

          <div class="panel-user-label">Tanggal Daftar</div>
          <div class="panel-user-value">${createdAt}</div>
        </div>

        <h3 class="panel-user-subheading">Data Driver</h3>
        <div class="panel-user-info-grid">
          <div class="panel-user-label">Nama Driver</div>
          <div class="panel-user-value">${namaDriver}</div>

          <div class="panel-user-label">Alamat Driver</div>
          <div class="panel-user-value">${alamatDriver}</div>

          <div class="panel-user-label">Nomor Plat</div>
          <div class="panel-user-value">${nomorPlat}</div>

          <div class="panel-user-label">Status</div>
          <div class="panel-user-value">
            <span class="badge-status ${status === "aktif" ? "green" : "gray"}">${status.toUpperCase()}</span>
          </div>

          <div class="panel-user-label">Saldo</div>
          <div class="panel-user-value">
            <i class="fas fa-wallet"></i> ${saldo}
            <button onclick="topupSaldoUser()" class="panel-user-btn-mini">🔼 Top Up</button>
            <button onclick="formTarikSaldoDriver('${idDriver}', ${saldoValue})" class="panel-user-btn-mini">💸 Tarik Saldo</button>
            <button onclick="riwayatSaldoDriver()" class="panel-user-btn-mini">📜 Riwayat</button>
          </div>

          <div class="panel-user-label">Update Terakhir</div>
          <div class="panel-user-value">${updatedAt}</div>
        </div>

        <button id="btn-logout" class="panel-user-btn panel-user-btn-logout">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>`;

      container.innerHTML = content;

      document.getElementById("btn-logout").addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          window.location.href = "login.html";
        });
      });
    })
    .catch(error => {
      container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan: ${error.message}</p>`;
    });
}





if (page === "ubah-pin") {
  const container = document.getElementById("page-container");

  container.innerHTML = `
    <div class="ubah-pin-wrapper">
      <h2 style="text-align:center; margin-bottom: 10px;"><i class="fas fa-key"></i> Ubah PIN</h2>
      <p style="text-align:center; margin-bottom: 20px;">Masukkan PIN lama dan PIN baru (6 digit).</p>

      <div class="form-group">
        <label for="pin-lama">🔐 PIN Lama</label>
        <input type="password" id="pin-lama" maxlength="6" placeholder="••••••" />
      </div>

      <div class="form-group">
        <label for="pin-baru">🔐 PIN Baru</label>
        <input type="password" id="pin-baru" maxlength="6" placeholder="••••••" />
      </div>

      <div class="form-group">
        <label for="pin-baru2">🔐 Ulangi PIN Baru</label>
        <input type="password" id="pin-baru2" maxlength="6" placeholder="••••••" />
      </div>

      <button onclick="simpanPINBaru()" style="width: 100%; padding: 10px; margin-top: 10px; background: #007bff; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
        💾 Simpan PIN
      </button>
    </div>
  `;
}



if (page === "jam-layanan") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<p>Memuat pengaturan jam layanan...</p>";

  const db = firebase.firestore();
  const snap = await db.collection("pengaturan").doc("jam_layanan").get();
  const data = snap.exists ? snap.data() : {
    buka: "08:00",
    tutup: "22:00",
    aktif: true,
    mode: "otomatis"
  };

  container.innerHTML = `
    <div class="user-container" style="padding:1rem;">
      <h2>⏰ Pengaturan Jam Layanan</h2>

      <label>Mode Layanan</label>
      <select id="mode-layanan">
        <option value="otomatis" ${data.mode === "otomatis" ? 'selected' : ''}>⏱ Otomatis</option>
        <option value="manual" ${data.mode === "manual" ? 'selected' : ''}>🖐 Manual</option>
      </select>

      <div id="jam-otomatis">
        <label>Jam Buka</label>
        <input type="time" id="jam-buka" value="${data.buka}" />

        <label>Jam Tutup</label>
        <input type="time" id="jam-tutup" value="${data.tutup}" />
      </div>

      <label>Status (Manual)</label>
      <select id="status-layanan" ${data.mode === "manual" ? '' : 'disabled'}>
        <option value="true" ${data.aktif ? "selected" : ""}>✅ Aktif</option>
        <option value="false" ${!data.aktif ? "selected" : ""}>❌ Nonaktif</option>
      </select>

      <br/><br/>
      <button onclick="simpanJamLayanan()" class="btn-mini">💾 Simpan</button>
      <button onclick="loadContent('admin-user')" class="btn-mini">⬅️ Kembali</button>
    </div>
  `;

  // ✅ Tampilkan/sembunyikan jam sesuai mode
  const modeSelect = document.getElementById("mode-layanan");
  const jamDiv = document.getElementById("jam-otomatis");
  const statusLayanan = document.getElementById("status-layanan");

  modeSelect.addEventListener("change", () => {
    const mode = modeSelect.value;
    if (mode === "manual") {
      jamDiv.style.display = "none";
      statusLayanan.disabled = false;
    } else {
      jamDiv.style.display = "block";
      statusLayanan.disabled = true;
    }
  });

  // Inisialisasi tampilan berdasarkan mode awal
  if (data.mode === "manual") {
    jamDiv.style.display = "none";
    statusLayanan.disabled = false;
  } else {
    jamDiv.style.display = "block";
    statusLayanan.disabled = true;
  }
}

async function renderPesananCards(docs) {
  if (docs.length === 0) return `<p>Tidak ada pesanan masuk.</p>`;

  docs.sort((a, b) => {
    const priorityValue = (doc) => {
      const data = doc.data();
      const status = (data.status || "").toLowerCase();
      const pengiriman = (data.pengiriman || "").toLowerCase();
      const belumDikonfirmasi = status === "menunggu pesanan" || status === "pending";
      if (status === "dibatalkan") return 3;
      if (belumDikonfirmasi && pengiriman === "priority") return 0;
      if (belumDikonfirmasi) return 1;
      return 2;
    };
    return priorityValue(a) - priorityValue(b);
  });

  window.countdownList = [];
  let html = "";

  for (const doc of docs) {
    const p = doc.data();
    const idDoc = doc.id;
    const idPesanan = p.idPesanan || "-";
    const idToko = p.idToko || "-";
    const createdAt = p.createdAt?.toDate();
    const jamMenit = createdAt ? createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

    let statusPesanan = "menunggu pesanan";
    let statusDriver = "-";
    let driverName = "-";

    try {
      const pesananSnap = await firebase.firestore().collection("pesanan").doc(idPesanan).get();
      if (pesananSnap.exists) {
        statusPesanan = (pesananSnap.data().status || "").toLowerCase();
      }

      const driverSnap = await firebase.firestore()
        .collection("pesanan_driver")
        .where("idPesanan", "==", idPesanan)
        .limit(1)
        .get();

      if (!driverSnap.empty) {
        const driverData = driverSnap.docs[0].data();
        statusDriver = driverData.status || "-";
        driverName = driverData.namaDriver || "-";
      }
    } catch (e) {
      console.warn("❌ Gagal ambil status pesanan/driver:", e);
    }

    if (["selesai", "dibatalkan", "ditolak"].includes(statusPesanan)) continue;

    const pengiriman = (p.pengiriman || "standard").toLowerCase();
    const isPriority = pengiriman === "priority";
    const pengirimanLabel = isPriority ? "⚡ Priority" : pengiriman.charAt(0).toUpperCase() + pengiriman.slice(1);
    const stylePengiriman = isPriority ? "color: #d9534f; font-weight: bold;" : "color: #333;";

    let estimasiMasak = 0;
    try {
      const penjualDoc = await firebase.firestore().collection("pesanan_penjual").doc(idDoc).get();
      if (penjualDoc.exists) {
        estimasiMasak = parseInt(penjualDoc.data().estimasiMasak || 0);
      }
    } catch (e) {
      console.error("❌ Gagal ambil estimasi masak:", e);
    }

    const mulai = createdAt?.getTime() || 0;
    const akhirMasak = mulai + estimasiMasak * 60 * 1000;
    const countdownId = `countdown-${idDoc}`;
    if (estimasiMasak > 0 && statusPesanan === "menunggu driver") {
      window.countdownList.push({ id: countdownId, akhir: akhirMasak, docId: idDoc });
    }

    const countdownHtml = (estimasiMasak > 0 && statusPesanan === "menunggu driver")
      ? `<p><strong>Masak:</strong> <span id="${countdownId}">...</span></p>`
      : "";

    let tombolAksi = `
      <div class="btn-group-seller-pesanan">
        <button onclick="lihatLogPesananSeller('${idPesanan}', '${idToko}')">📄 Detail</button>
        <button onclick="renderChatPelanggan({
          idPesanan: '${idPesanan}',
          idCustomer: '${p.idPembeli}',
          namaCustomer: '${p.namaPembeli}',
          namaToko: '${p.namaToko || "-"}'
        })">💬 Chat</button>
      </div>`;

    const deadline = p.deadlineKonfirmasi?.toDate?.() || null;
    const now = new Date();
    const disableBtn = (deadline && now < deadline) ? "disabled" : "";
    const sisaDetik = deadline && now < deadline ? Math.ceil((deadline - now) / 1000) : 0;

    if (deadline && now > deadline && statusPesanan === "pending") {
      await firebase.firestore().collection("pesanan_penjual").doc(idDoc).update({
        status: "Ditolak",
        alasanPenolakan: "Auto tolak karena tidak ada respon",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      const pesananRef = firebase.firestore().collection("pesanan").doc(idPesanan);
      const pesananDoc = await pesananRef.get();
      if (pesananDoc.exists) {
        const dataPesanan = pesananDoc.data();

        const stepsLogSnapshot = await firebase.firestore()
          .collection("pesanan_driver")
          .where("idPesanan", "==", idPesanan)
          .limit(1)
          .get();

        let logBaru = {
          status: "Dibatalkan (auto reject)",
          alasan: "Auto tolak karena tidak ada respon toko",
          waktu: now
        };

        await pesananRef.update({
          status: "Dibatalkan",
          alasanPenolakan: "Auto tolak oleh sistem",
          waktuDibatalkan: firebase.firestore.FieldValue.serverTimestamp(),
          stepsLog: firebase.firestore.FieldValue.arrayUnion(logBaru)
        });

        if (dataPesanan.metode === "saldo" && dataPesanan.total > 0) {
          await refundSaldoOtomatis(dataPesanan.userId, dataPesanan.total, idPesanan, "Auto tolak oleh sistem");
        }
      }

      continue;
    }

    if (statusPesanan === "pending") {
      tombolAksi += `
        <div id="btn-group-${idDoc}" class="btn-group-seller-pesanan">
          <button onclick="konfirmasiPesanan('${idDoc}', '${idPesanan}')" ${disableBtn}>✅ Konfirmasi</button>
          <button onclick="bukaModalPenolakan('${idDoc}', '${idPesanan}')" ${disableBtn} style="background:#d9534f;">❌ Tolak</button>
        </div>`;
      if (sisaDetik > 0) {
        tombolAksi += `<p style="color:orange;font-size:13px;">⏳ Menunggu toko lain (${sisaDetik}s)</p>`;
      }
    }

    html += `
      <div class="pesanan-item-seller-pesanan">
        <p><strong>ID Pesanan:</strong> ${idPesanan} <small>${jamMenit}</small></p>
        <p><strong>Pembeli:</strong> ${p.namaPembeli || "-"} - ${p.noHpPembeli || "-"}</p>
        <p style="${stylePengiriman}">
          🚚 Metode Pengiriman: ${pengirimanLabel}
          ${isPriority ? '<span class="badge-priority-reward">+1.500</span>' : ""}
        </p>
        <p><strong>Status Driver:</strong> <span id="status-driver-${idDoc}">${statusDriver}</span></p>
        <p><strong>Driver:</strong> <span id="driver-info-${idDoc}">${driverName}</span></p>
        ${countdownHtml}
        ${tombolAksi}
      </div>`;
  }

  return html;
}















async function updateDriverInfo(docId, idPesanan) {
  const el = document.getElementById(`driver-info-${docId}`);
  if (!el) return;

  try {
    const snap = await firebase.firestore()
      .collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (snap.empty) {
      el.innerText = "-";
      return;
    }

    const driverData = snap.docs[0].data();
    const idDriver = driverData.idDriver;

    if (!idDriver) {
      el.innerText = "-";
      return;
    }

    // Cari driver berdasarkan idDriver
    const driverQuery = await firebase.firestore()
      .collection("driver")
      .where("idDriver", "==", idDriver)
      .limit(1)
      .get();

    if (driverQuery.empty) {
      el.innerText = "-";
      return;
    }

    const driverDoc = driverQuery.docs[0].data();
    const namaDriver = driverDoc.nama || "Driver";
    const platNomor = driverDoc.nomorPlat || "";

    el.innerText = `${namaDriver}${platNomor ? " - " + platNomor : ""}`;
  } catch (err) {
    console.error("❌ Gagal ambil info driver:", err);
    el.innerText = "-";
  }
}









if (page === "riwayat") {
  const content = `
    <div class="riwayat-container">
      <h2>📜 Riwayat Pesanan</h2>
      <div id="riwayat-list"></div>
    </div>
  `;
  document.getElementById("page-container").innerHTML = content;
  renderRiwayat();
}

else if (page === "seller-dashboard") {
  const container = document.getElementById("page-container");
  if (!container) return console.error("❌ Element #page-container tidak ditemukan.");

  container.innerHTML = `
    <div class="min-h-screen bg-gray-50 py-6">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Loading State -->
        <div id="loading-state" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Memuat dashboard seller...</p>
        </div>
      </div>
    </div>
  `;

  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Harap Login Terlebih Dahulu</h2>
          <p class="text-gray-600">Silakan login untuk mengakses dashboard seller</p>
        </div>
      </div>
    `;
    return;
  }

  const db = firebase.firestore();

  try {
    const tokoQuery = await db.collection("toko").where("userId", "==", user.uid).limit(1).get();
    if (tokoQuery.empty) {
      container.innerHTML = `
        <div class="min-h-screen bg-gray-50 py-6">
          <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center py-12">
              <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fas fa-store text-blue-500 text-3xl"></i>
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-4">Seller Dashboard</h1>
              <p class="text-gray-600 mb-8">Anda belum memiliki toko. Mulai dengan membuat toko baru.</p>
              <button onclick="formTambahToko()" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg">
                <i class="fas fa-plus mr-2"></i>
                Buat Toko Baru
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const tokoDoc = tokoQuery.docs[0];
    const toko = tokoDoc.data();
    const idToko = tokoDoc.id;
    const saldo = Number(toko.saldo) || 0;

    // Tutup toko otomatis jika saldo < 5000 dan masih terbuka
    if (saldo < 5000 && toko.isOpen) {
      await db.collection("toko").doc(idToko).update({
        isOpen: false,
        statusManual: false
      });
      toko.isOpen = false;
    }

    const jamBuka = toko.jamBuka ?? 8;
    const jamTutup = toko.jamTutup ?? 21;
    const autoOpenNow = isTokoSedangBuka(jamBuka, jamTutup);

    if (!toko.statusManual) {
      await db.collection("toko").doc(idToko).update({ isOpen: autoOpenNow });
      toko.isOpen = autoOpenNow;
    }

    const produkSnap = await db.collection("produk").where("idToko", "==", idToko).get();
    const totalProduk = produkSnap.size;

    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white shadow-sm border-b">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div class="flex items-center mb-4 lg:mb-0">
                <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                  <i class="fas fa-store text-white text-lg"></i>
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
                  <p class="text-gray-600">Kelola toko dan pantau pesanan</p>
                </div>
              </div>
              <div class="flex items-center space-x-3">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  toko.isOpen && saldo >= 5000 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }">
                  <span class="w-2 h-2 rounded-full ${
                    toko.isOpen && saldo >= 5000 ? 'bg-green-500' : 'bg-red-500'
                  } mr-2"></span>
                  ${saldo < 5000 ? 'Nonaktif' : (toko.isOpen ? 'Buka' : 'Tutup')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Saldo Card -->
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-blue-100 text-sm font-medium mb-1">Saldo Toko</p>
                  <h2 class="text-2xl font-bold">Rp ${saldo.toLocaleString('id-ID')}</h2>
                  <p class="text-blue-100 text-xs mt-2">Saldo tersedia untuk penarikan</p>
                </div>
                <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <i class="fas fa-wallet text-xl"></i>
                </div>
              </div>
            </div>

            <!-- Produk Card -->
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-600 text-sm font-medium mb-1">Total Produk</p>
                  <h2 class="text-2xl font-bold text-gray-900">${totalProduk}</h2>
                  <p class="text-gray-500 text-xs mt-2">Produk aktif di toko</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <i class="fas fa-box text-green-600 text-xl"></i>
                </div>
              </div>
            </div>

            <!-- Status Card -->
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-600 text-sm font-medium mb-1">Status Toko</p>
                  <h2 class="text-xl font-bold text-gray-900">${toko.namaToko}</h2>
                  <p class="text-gray-500 text-xs mt-2">${jamBuka}:00 - ${jamTutup}:00</p>
                </div>
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <i class="fas fa-store text-purple-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Store Control Section -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div class="mb-4 lg:mb-0">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Kontrol Toko</h3>
                <p class="text-gray-600 text-sm">
                  ${toko.statusManual
                    ? `🛠 Mode manual aktif - Jadwal: ${jamBuka}:00 - ${jamTutup}:00`
                    : `⏱ Mode otomatis - Buka/tutup sesuai jadwal`}
                </p>
              </div>
              
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-medium text-gray-700">Status:</span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="toggle-buka-toko" ${toko.isOpen && saldo >= 5000 ? "checked" : ""} ${saldo < 5000 ? "disabled" : ""} class="sr-only peer">
                    <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                  <span id="status-toko" class="text-sm font-medium ${
                    saldo < 5000 ? 'text-red-600' : (toko.isOpen ? 'text-green-600' : 'text-gray-600')
                  }">
                    ${saldo < 5000 ? 'Toko Nonaktif' : (toko.isOpen ? 'Buka' : 'Tutup')}
                  </span>
                </div>
              </div>
            </div>

            <!-- Warning Message -->
            ${saldo < 5000 ? `
              <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div class="flex items-center">
                  <i class="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                  <div>
                    <p class="text-red-800 font-medium">Saldo toko di bawah Rp 5.000</p>
                    <p class="text-red-600 text-sm">Toko akan otomatis ditutup hingga saldo mencukupi</p>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <button onclick="bukaModalPesan('${idToko}')" class="bg-white hover:bg-gray-50 border border-gray-300 rounded-xl p-4 text-center transition-all duration-200 transform hover:scale-105 shadow-sm">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i class="fas fa-envelope text-blue-600 text-xl"></i>
              </div>
              <span class="font-semibold text-gray-900">Pesan</span>
            </button>
            
            <button onclick="kelolaProduk('${idToko}')" class="bg-white hover:bg-gray-50 border border-gray-300 rounded-xl p-4 text-center transition-all duration-200 transform hover:scale-105 shadow-sm">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i class="fas fa-box text-green-600 text-xl"></i>
              </div>
              <span class="font-semibold text-gray-900">Kelola Produk</span>
            </button>
            
            <button onclick="topupSaldoUser()" class="bg-white hover:bg-gray-50 border border-gray-300 rounded-xl p-4 text-center transition-all duration-200 transform hover:scale-105 shadow-sm">
              <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i class="fas fa-coins text-yellow-600 text-xl"></i>
              </div>
              <span class="font-semibold text-gray-900">Top Up Saldo</span>
            </button>
            
            <button onclick="lihatRiwayatPesanan()" class="bg-white hover:bg-gray-50 border border-gray-300 rounded-xl p-4 text-center transition-all duration-200 transform hover:scale-105 shadow-sm">
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i class="fas fa-history text-purple-600 text-xl"></i>
              </div>
              <span class="font-semibold text-gray-900">Riwayat Pesanan</span>
            </button>
          </div>

          <!-- Pesanan Masuk Section -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="border-b border-gray-200 px-6 py-4">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i class="fas fa-inbox mr-2 text-blue-500"></i>
                Pesanan Masuk
              </h3>
            </div>
            <div id="pesanan-penjual-list" class="p-6">
              <div class="text-center py-8">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i class="fas fa-shopping-cart text-gray-400 text-xl"></i>
                </div>
                <p class="text-gray-600">Memuat pesanan...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Saldo Rendah -->
      <div id="modal-saldo-rendah" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl max-w-md w-full mx-4 p-6 transform transition-all duration-300 scale-95">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-900 text-center mb-2">Saldo Toko Terlalu Rendah</h3>
          <p class="text-gray-600 text-center mb-6">
            Saldo toko Anda saat ini di bawah Rp 5.000. Untuk menjaga performa layanan, toko akan otomatis ditutup.
          </p>
          <div class="flex space-x-3">
            <button onclick="document.getElementById('modal-saldo-rendah').classList.add('hidden')" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition duration-200">
              Nanti
            </button>
            <button onclick="topupSaldoUser()" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 transform hover:scale-105">
              Top Up Sekarang
            </button>
          </div>
        </div>
      </div>
    `;

    // Tampilkan modal jika saldo < 5.000 dan toko sudah nonaktif
    if (saldo < 5000 && !toko.isOpen) {
      document.getElementById("modal-saldo-rendah").classList.remove('hidden');
    }

    // Toggle status toko manual
    document.getElementById("toggle-buka-toko").addEventListener("change", async (e) => {
      const isOpen = e.target.checked;
      try {
        await db.collection("toko").doc(idToko).update({
          isOpen,
          statusManual: true
        });
        document.getElementById("status-toko").textContent = isOpen ? "Buka" : "Tutup";
        document.getElementById("status-toko").className = `text-sm font-medium ${isOpen ? 'text-green-600' : 'text-gray-600'}`;
        
        // Update status badge
        const statusBadge = document.querySelector('.inline-flex.items-center');
        if (statusBadge) {
          statusBadge.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`;
          const statusDot = statusBadge.querySelector('span');
          if (statusDot) {
            statusDot.className = `w-2 h-2 rounded-full mr-2 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`;
          }
        }
      } catch (err) {
        console.error("Gagal update status toko:", err);
        // Show error notification
        showNotification('error', 'Gagal mengubah status toko');
        e.target.checked = !isOpen;
      }
    });

    // Listener realtime pesanan
    db.collection("pesanan_penjual")
      .where("idToko", "==", idToko)
      .orderBy("createdAt", "desc")
      .onSnapshot(async (snap) => {
        const containerPesanan = document.getElementById("pesanan-penjual-list");
        if (!containerPesanan) return;

        if (snap.empty) {
          containerPesanan.innerHTML = `
            <div class="text-center py-12">
              <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-inbox text-gray-400 text-2xl"></i>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Tidak ada pesanan</h3>
              <p class="text-gray-600">Belum ada pesanan masuk untuk toko Anda</p>
            </div>
          `;
          return;
        }

        const html = await renderPesananCards(snap.docs);
        containerPesanan.innerHTML = html;

        updateCountdownList();
        snap.docs.forEach(doc => {
          const p = doc.data();
          updateDriverInfo(doc.id, p.idPesanan);
        });
      });

  } catch (e) {
    console.error("❌ Gagal memuat dashboard seller:", e);
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h2>
          <p class="text-gray-600">Gagal memuat dashboard seller</p>
        </div>
      </div>
    `;
  }
}




else if (page === "admin-kirim-pesan") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="panel-kirim-pesan">
      <h2>📨 Kirim Pesan ke Driver / Seller</h2>

      <label for="role">Pilih Role:</label>
      <select id="role" onchange="loadTargetDropdown()">
        <option value="driver">Driver</option>
        <option value="seller">Seller</option>
      </select>

      <label for="targetId">Pilih Tujuan:</label>
      <select id="targetId">
        <option value="">-- Pilih --</option>
      </select>

      <label for="perihal">Perihal:</label>
      <input type="text" id="perihal" placeholder="Contoh: Penarikan Disetujui" />

      <label for="pesan">Keterangan:</label>
      <textarea id="pesan" rows="4" placeholder="Isi pesan..."></textarea>

      <button onclick="kirimPesanKeTarget()">🚀 Kirim Pesan</button>
    </div>

    <div id="riwayat-pesan" style="margin-top:30px;">
      <h3>📜 Riwayat Pesan</h3>
      <div id="pesan-list" class="card-list-view">
        <p>⏳ Memuat riwayat pesan...</p>
      </div>
    </div>
  `;

  loadTargetDropdown();
  loadRiwayatPesanAdmin();
}


else if (page === "daftar-chat-user") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="-admin-chat-wrapper">
      <h2 class="-admin-chat-title">💬 Chat dengan Admin</h2>
      <div class="-admin-chat-container">
  <div class="-admin-chat-box" id="chat-bubble-box">
    <div class="-admin-chat-loading">⏳ Memuat chat...</div>
    
    <div class="-admin-chat-template-bubbles">
      <span onclick="isiTemplate('Bagaimana cara topup saldo?')">Cara topup saldo</span>
      <span onclick="isiTemplate('Saya mengalami kendala saat login')">Kendala login</span>
      <span onclick="isiTemplate('Bagaimana cara menarik saldo?')">Tarik saldo</span>
      <span onclick="isiTemplate('Berapa lama proses verifikasi?')">Lama verifikasi</span>
    </div>
  </div>
</div>


      <div id="chat-timestamp" class="-admin-chat-timestamp"></div>

      <div class="-admin-chat-form">
        <input type="text" id="input-chat" class="-admin-chat-input" placeholder="Tulis pesan...">
        <button onclick="kirimPesanKeAdmin()" class="-admin-chat-button">Kirim</button>
      </div>
    </div>
  `;

  renderChatBox();
}


else if (page === "laporan-seller-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat laporan seller...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("laporan_seller").orderBy("waktu", "desc").get();
    if (snapshot.empty) {
      container.innerHTML = `<p>✅ Tidak ada laporan dari seller saat ini.</p>`;
      return;
    }

    let html = `<h2>📋 Laporan Seller</h2><ul style="list-style:none;padding:0;">`;

    snapshot.forEach(doc => {
      const data = doc.data();
      const waktu = new Date(data.waktu).toLocaleString("id-ID");
      const docId = doc.id;

      html += `
        <li style="border:1px solid #1976d2;background:#f0f8ff;padding:12px;border-radius:8px;margin-bottom:12px;">
          <strong>📄 ID Pesanan:</strong> ${data.idPesanan}<br>
          <strong>🏪 ID Toko:</strong> ${data.idToko}<br>
          <strong>👤 ID Pelapor:</strong> ${data.idPelapor || "-"}<br>
          <strong>🕒 Waktu:</strong> ${waktu}<br>
          <strong>❗ Alasan:</strong> ${data.alasan}<br><br>

          <input type="number" id="durasi-${docId}" placeholder="Durasi nonaktif (menit)" style="width:60%;padding:6px;margin-bottom:6px;"><br>

          <button onclick="nonaktifkanTokoSementara('${data.idToko}', '${docId}', 'durasi-${docId}')" style="background:#1565c0;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
            🚫 Nonaktifkan Toko
          </button>

          <button onclick="hapusLaporanSeller('${docId}')" style="margin-left:10px;background:#999;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
            🗑️ Hapus Laporan
          </button>

          <div style="margin-top:10px;">
            <textarea id="pesan-${docId}" rows="2" placeholder="Kirim pesan peringatan ke toko..." style="width:100%;resize:vertical;"></textarea>
            <button onclick="kirimPeringatanManualSeller('${data.idToko}', 'pesan-${docId}')" style="margin-top:5px;background:#f9a825;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
              📩 Kirim Peringatan
            </button>
          </div>
        </li>`;
    });

    html += `</ul>`;
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = `<p style="color:red;">Gagal memuat laporan: ${e.message}</p>`;
  }
}

else if (page === "riwayat-pesanan-seller") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <h2>📜 Riwayat Pesanan Selesai</h2>
    <div id="info-saldo" class="info-box-modern">💰 Saldo Toko Saat Ini: <strong id="saldo-terakhir">Memuat...</strong></div>
    <div id="filter-riwayat">
      <input type="text" id="filterInput" placeholder="🔍 Cari Order ID / Nama Customer..." />
    </div>
    <div id="riwayat-container"><p>🔄 Memuat data...</p></div>
    <style>
      #info-saldo {
        background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        font-size: 1.1rem;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      #filter-riwayat {
        margin-bottom: 15px;
      }
      #filter-riwayat input {
        padding: 8px 12px;
        width: 100%;
        border: 1px solid #ccc;
        border-radius: 8px;
        font-size: 1rem;
      }
      .pesanan-item {
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 15px;
        background: #fafafa;
      }
      .mutasi {
        background: #fff;
        padding: 10px;
        border-left: 4px solid #2196f3;
        margin-top: 10px;
        font-size: 0.95rem;
      }
    </style>
  `;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    const tokoQuery = await db.collection("toko")
      .where("userId", "==", user.uid)
      .limit(1).get();

    if (tokoQuery.empty) {
      document.getElementById("riwayat-container").innerHTML = `<p style="color:red;">⚠️ Toko tidak ditemukan.</p>`;
      return;
    }

    const tokoDoc = tokoQuery.docs[0];
    const idToko = tokoDoc.id;
    const saldoAkhir = tokoDoc.data().saldo || 0;
    document.getElementById("saldo-terakhir").textContent = `Rp ${saldoAkhir.toLocaleString("id-ID")}`;

    const snap = await db.collection("pesanan_driver")
      .where("idToko", "==", idToko)
      .get();

    let hasil = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const idPesanan = data.idPesanan;
      if (!idPesanan) continue;

      const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
      if (!pesananDoc.exists) continue;

      const pesanan = pesananDoc.data();
      if ((pesanan.status || "").toLowerCase() !== "selesai") continue;

      const subtotal = Number(data.subtotalProduk || 0);
      const metode = (pesanan.metode || "-").toLowerCase();
      const waktu = pesanan.updatedAt?.toDate?.() || new Date();

      let namaCustomer = "Customer";
      if (pesanan.userId) {
        const userDoc = await db.collection("users").doc(pesanan.userId).get();
        if (userDoc.exists) namaCustomer = userDoc.data().nama || namaCustomer;
      }

      const potongan = Math.round(subtotal * 0.05);
      const diterima = metode === "saldo" ? subtotal - potongan : subtotal;

      hasil.push({
        idPesanan,
        namaCustomer,
        subtotal,
        potongan,
        diterima,
        metode,
        waktu
      });
    }

    // Urutkan dari terbaru ke paling lama
    hasil.sort((a, b) => b.waktu - a.waktu);

    // Hitung saldo mundur
    let saldoSimulasi = saldoAkhir;
    for (let i = 0; i < hasil.length; i++) {
      const trx = hasil[i];
      trx.saldoSetelah = saldoSimulasi;
      trx.saldoSebelum = trx.metode === "saldo" 
        ? saldoSimulasi - trx.diterima 
        : saldoSimulasi + trx.potongan;
      saldoSimulasi = trx.saldoSebelum;
    }

    const tampilkan = (data) => {
      const container = document.getElementById("riwayat-container");
      if (!data.length) {
        container.innerHTML = "<p>Belum ada pesanan yang selesai.</p>";
        return;
      }

      let html = "<ul>";
      for (const d of data) {
        html += `
          <li class="pesanan-item">
            <p><strong>ID Pesanan:</strong> ${d.idPesanan}</p>
            <p><strong>Customer:</strong> ${d.namaCustomer}</p>
            <p><strong>Subtotal:</strong> Rp ${d.subtotal.toLocaleString("id-ID")}</p>
            <p><strong>Potongan (5%):</strong> Rp ${d.potongan.toLocaleString("id-ID")} (${d.metode.toUpperCase()})</p>
            <p><strong>Penghasilan Bersih:</strong> Rp ${d.diterima.toLocaleString("id-ID")}</p>
            <p><strong>Metode Pembayaran:</strong> ${d.metode.toUpperCase()}</p>
            <p><strong>Selesai:</strong> ${d.waktu.toLocaleString("id-ID", {
              weekday: "short", day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            })}</p>
            <div class="mutasi">
              🔄 <strong>Saldo Sebelum:</strong> Rp ${d.saldoSebelum.toLocaleString("id-ID")}<br>
              ${d.metode === "saldo" 
                ? `📥 + Rp ${d.diterima.toLocaleString("id-ID")} (Masuk)` 
                : `📤 - Rp ${d.potongan.toLocaleString("id-ID")} (Potongan COD)`}<br>
              💳 <strong>Saldo Setelah:</strong> Rp ${d.saldoSetelah.toLocaleString("id-ID")}
            </div>
          </li>
        `;
      }
      html += "</ul>";
      container.innerHTML = html;
    };

    tampilkan(hasil);

    document.getElementById("filterInput").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = hasil.filter(r =>
        r.idPesanan.toLowerCase().includes(q) ||
        r.namaCustomer.toLowerCase().includes(q)
      );
      tampilkan(filtered);
    });

  } catch (e) {
    document.getElementById("riwayat-container").innerHTML = `<p style="color:red;">❌ ${e.message}</p>`;
  }
}




else if (page === "kategori-ojek") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="kategori-layanan">
      <h2>🛵 Layanan Ojek</h2>
      <p>Gunakan layanan ojek kami untuk antar jemput lebih cepat dan aman.</p>
      <ul class="fitur-layanan">
        <li>📍 Jemput lokasi real-time</li>
        <li>🕒 Cepat tanggap dan responsif</li>
        <li>💸 Harga transparan & terjangkau</li>
      </ul>
      <button class="btn-primary" onclick="alert('Segera tersedia 🚀')">Pesan Ojek</button>
    </div>
  `;
} else if (page === "kategori-jastip") {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="kategori-layanan">
      <h2>🛍️ Jasa Titip (JasTip)</h2>
      <p>Ingin titip beli barang di sekitar kota? Gunakan JasTip!</p>
      <ul class="fitur-layanan">
        <li>🛒 Titip belanja ke minimarket/toko</li>
        <li>📦 Kirim dan antar dengan aman</li>
        <li>💬 Chat langsung dengan driver</li>
      </ul>
      <button class="btn-primary" onclick="alert('Fitur JasTip akan segera hadir!')">Gunakan JasTip</button>
    </div>
  `;
}







else if (page === "laporan-driver-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat laporan driver...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("laporan_driver").orderBy("waktu", "desc").get();
    if (snapshot.empty) {
      container.innerHTML = `<p>✅ Tidak ada laporan saat ini.</p>`;
      return;
    }

    let html = `<h2>🚨 Laporan Driver</h2><ul style="list-style:none;padding:0;">`;

    snapshot.forEach(doc => {
      const data = doc.data();
      const waktu = new Date(data.waktu).toLocaleString("id-ID");
      const docId = doc.id;

      html += `
        <li style="border:1px solid #f44336;background:#fff5f5;padding:12px;border-radius:8px;margin-bottom:12px;">
          <strong>📄 ID Pesanan:</strong> ${data.idPesanan}<br>
          <strong>🛵 ID Driver:</strong> ${data.idDriver}<br>
          <strong>👤 ID Pelapor:</strong> ${data.idPelapor}<br>
          <strong>🕒 Waktu:</strong> ${waktu}<br>
          <strong>❗ Alasan:</strong> ${data.alasan}<br><br>

          <input type="number" id="durasi-${docId}" placeholder="Durasi nonaktif (menit)" style="width:60%;padding:6px;margin-bottom:6px;"><br>

          <button onclick="nonaktifkanDriverSementara('${data.idDriver}', '${docId}', 'durasi-${docId}')" style="background:#e53935;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
            🚫 Nonaktifkan Sementara
          </button>

          <button onclick="hapusLaporanDriver('${docId}')" style="margin-left:10px;background:#999;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
            🗑️ Hapus Laporan
          </button>

          <div style="margin-top:10px;">
            <textarea id="pesan-${docId}" rows="2" placeholder="Kirim pesan peringatan ke driver..." style="width:100%;resize:vertical;"></textarea>
            <button onclick="kirimPeringatanManual('${data.idDriver}', 'pesan-${docId}')" style="margin-top:5px;background:#f57c00;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
              📩 Kirim Peringatan
            </button>
          </div>
        </li>`;
    });

    html += `</ul>`;
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<p style="color:red;">Gagal memuat laporan: ${e.message}</p>`;
  }
}


}


///  BATAS  ////

// Helper function untuk notification
function showNotification(type, message) {
  // Implementation for showing toast notification
  console.log(`[${type.toUpperCase()}] ${message}`);
}

async function konfirmasiTopupUser(id, userId, total) {
  const db = firebase.firestore();
  try {
    await db.collection("topup_request").doc(id).update({ status: "Dikonfirmasi" });
    await db.collection("users").doc(userId).update({
      saldo: firebase.firestore.FieldValue.increment(Number(total))
    });
    alert("✅ Topup user berhasil dikonfirmasi.");
    loadContent("permintaan-deposit");
  } catch (e) {
    console.error(e);
    alert("❌ Gagal konfirmasi topup user.");
  }
}

async function konfirmasiTopupDriver(id, idDriver, total) {
  const db = firebase.firestore();
  try {
    await db.collection("topup_request").doc(id).update({ status: "Dikonfirmasi" });
    const q = await db.collection("driver").where("idDriver", "==", idDriver).limit(1).get();
    if (!q.empty) {
      const driverDocId = q.docs[0].id;
      await db.collection("driver").doc(driverDocId).update({
        saldo: firebase.firestore.FieldValue.increment(Number(total))
      });
    }
    alert("✅ Topup driver berhasil dikonfirmasi.");
    loadContent("permintaan-deposit");
  } catch (e) {
    console.error(e);
    alert("❌ Gagal konfirmasi topup driver.");
  }
}

async function konfirmasiTopupToko(id, idToko, total) {
  const db = firebase.firestore();
  try {
    await db.collection("topup_request").doc(id).update({ status: "Dikonfirmasi" });
    const q = await db.collection("toko").where("idToko", "==", idToko).limit(1).get();
    if (!q.empty) {
      const tokoDocId = q.docs[0].id;
      await db.collection("toko").doc(tokoDocId).update({
        saldo: firebase.firestore.FieldValue.increment(Number(total))
      });
    }
    alert("✅ Topup toko berhasil dikonfirmasi.");
    loadContent("permintaan-deposit");
  } catch (e) {
    console.error(e);
    alert("❌ Gagal konfirmasi topup toko.");
  }
}




async function tolakTopup(id) {
  if (!confirm("Tolak permintaan topup ini?")) return;
  const db = firebase.firestore();
  await db.collection("topup_request").doc(id).update({ status: "Ditolak" });
  loadContent("permintaan-deposit");
}

async function batalkanTopup(id) {
  if (!confirm("Batalkan permintaan deposit ini?")) return;
  const db = firebase.firestore();
  await db.collection("topup_request").doc(id).update({ status: "Dibatalkan" });
  loadContent("permintaan-deposit");
}

async function selesaikanTopup(id) {
  if (!confirm("Tandai permintaan deposit ini sebagai selesai?")) return;
  const db = firebase.firestore();
  await db.collection("topup_request").doc(id).update({ status: "Selesai" });
  loadContent("permintaan-deposit");
}


async function riwayatSaldoUser() {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat riwayat saldo...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `<p>❌ Kamu harus login terlebih dahulu.</p>`;
    return;
  }

  // Ambil data user dan pastikan role adalah user
  const userDoc = await db.collection("users").doc(user.uid).get();
  if (!userDoc.exists) {
    container.innerHTML = `<p>❌ Data user tidak ditemukan.</p>`;
    return;
  }

  const userData = userDoc.data();
  const role = userData.role || "user";
  if (role !== "user") {
    container.innerHTML = `<p>❌ Hanya pengguna biasa (user) yang dapat melihat riwayat ini.</p>`;
    return;
  }

  // Ambil data deposit dari topup_request
  const depositSnap = await db.collection("topup_request")
    .where("userId", "==", user.uid)
    .where("status", "in", ["Dikonfirmasi", "Selesai"])
    .orderBy("timestamp", "desc")
    .get();

  const deposits = depositSnap.docs.map(doc => {
    const d = doc.data();
    return {
      type: "deposit",
      jumlah: d.jumlah,
      metode: d.metode || "-",
      status: d.status,
      waktu: d.timestamp?.toDate() || null,
      saldoSebelum: d.saldoSebelum ?? null,
      saldoSesudah: d.saldoSesudah ?? null,
    };
  });

  // Ambil data pembelian dari pesanan
  const pembelianSnap = await db.collection("pesanan")
    .where("userId", "==", user.uid)
    .orderBy("waktuPesan", "desc")
    .get();

  const pembelian = pembelianSnap.docs.map(doc => {
    const d = doc.data();
    const produk = Array.isArray(d.detailProduk)
      ? d.detailProduk.map(p => `${p.nama} (x${p.qty})`).join(", ")
      : "-";

    return {
      type: "pembelian",
      jumlah: d.totalPembayaran || 0,
      status: d.status || "-",
      waktu: d.waktuPesan?.toDate() || null,
      detail: produk,
      saldoSebelum: d.saldoSebelum ?? null,
      saldoSesudah: d.saldoSesudah ?? null,
    };
  });

  // Gabung dan urutkan semua data
  const allRiwayat = [...deposits, ...pembelian].sort((a, b) => {
    return (b.waktu?.getTime() || 0) - (a.waktu?.getTime() || 0);
  });

  if (allRiwayat.length === 0) {
    container.innerHTML = `<p>ℹ️ Belum ada riwayat transaksi saldo.</p>`;
    return;
  }

  // Tampilkan hasil
  let html = `
    <div class="riwayat-saldo-container">
      <h2>📜 Riwayat Saldo Pengguna</h2>
      <div class="riwayat-list">
  `;

  allRiwayat.forEach(item => {
    const waktuStr = item.waktu ? item.waktu.toLocaleString("id-ID") : "-";
    const saldoBeforeStr = item.saldoSebelum !== null ? `Rp${item.saldoSebelum.toLocaleString("id-ID")}` : "-";
    const saldoAfterStr = item.saldoSesudah !== null ? `Rp${item.saldoSesudah.toLocaleString("id-ID")}` : "-";

    if (item.type === "deposit") {
      html += `
        <div class="riwayat-item riwayat-deposit">
          <p><strong>Deposit</strong> - Rp${item.jumlah.toLocaleString("id-ID")}</p>
          <p>Metode: ${item.metode}</p>
          <p>Status: ${item.status}</p>
          <p><small>🕒 ${waktuStr}</small></p>
          <p>Saldo Sebelum: ${saldoBeforeStr}</p>
          <p>Saldo Sesudah: ${saldoAfterStr}</p>
        </div>
      `;
    } else if (item.type === "pembelian") {
      html += `
        <div class="riwayat-item riwayat-pembelian">
          <p><strong>Pembelian</strong> - Rp${item.jumlah.toLocaleString("id-ID")}</p>
          <p>Detail: ${item.detail}</p>
          <p>Status: ${item.status}</p>
          <p><small>🕒 ${waktuStr}</small></p>
          <p>Saldo Sebelum: ${saldoBeforeStr}</p>
          <p>Saldo Sesudah: ${saldoAfterStr}</p>
        </div>
      `;
    }
  });

  html += `
      </div>
      <center><button class="btn-mini" onclick="loadContent('dashboard')">⬅️ Kembali</button></center>
    </div>
  `;

  container.innerHTML = html;
}

async function riwayatSaldoSeller() {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat mutasi saldo seller...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `<p>❌ Kamu harus login terlebih dahulu.</p>`;
    return;
  }

  const tokoQuery = await db.collection("toko")
    .where("userId", "==", user.uid)
    .limit(1)
    .get();

  if (tokoQuery.empty) {
    container.innerHTML = `<p>⚠️ Toko tidak ditemukan.</p>`;
    return;
  }

  const tokoDoc = tokoQuery.docs[0];
  const idToko = tokoDoc.id;
  const saldoAkhir = tokoDoc.data().saldo || 0;
  const riwayat = [];

  // ✅ Penjualan
  const pesananSnap = await db.collection("pesanan_penjual")
    .where("idToko", "==", idToko)
    .get();

  for (const doc of pesananSnap.docs) {
    const data = doc.data();
    const idPesanan = data.idPesanan;
    if (!idPesanan) continue;

    const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
    if (!pesananDoc.exists) continue;

    const pesanan = pesananDoc.data();
    if ((pesanan.status || "").toLowerCase() !== "selesai") continue;

    const subtotal = Number(data.subtotalProduk || 0);
    const metode = (pesanan.metode || "-").toLowerCase();
    const potongan = Math.round(subtotal * 0.05);
    const diterima = metode === "saldo" ? subtotal - potongan : 0;
    const waktu = pesanan.updatedAt?.toDate?.() || new Date();

    riwayat.push({
      id: `${idPesanan.substring(0, 20).toUpperCase()}`,
      waktu,
      keterangan: `Penjualan (${metode.toUpperCase()})`,
      masuk: diterima,
      keluar: metode !== "saldo" ? potongan : 0,
      status: "Selesai",
      rekening: "-"
    });
  }

  // ✅ Deposit
  const depositSnap = await db.collection("topup_request")
    .where("userId", "==", user.uid)
    .get();

  depositSnap.forEach(doc => {
    const d = doc.data();
    const waktu = d.timestamp?.toDate?.() || new Date();
    const status = (d.status || "-").toLowerCase();

    if (["dikonfirmasi", "selesai"].includes(status)) {
      riwayat.push({
        id: `${doc.id.substring(0, 20).toUpperCase()}`,
        waktu,
        keterangan: `Deposit via ${d.metode || "-"}`,
        masuk: d.jumlah || 0,
        keluar: 0,
        status: d.status || "-",
        rekening: "-"
      });
    }
  });

  // ✅ Withdraw
  const withdrawSnap = await db.collection("withdraw_request")
    .where("uid", "==", user.uid)
    .get();

  withdrawSnap.forEach(doc => {
    const d = doc.data();
    const waktu = d.waktu?.toDate?.() || new Date();
    const status = (d.status || "-").toLowerCase();

    if (["berhasil", "selesai"].includes(status)) {
      riwayat.push({
        id: `${doc.id.substring(0, 20).toUpperCase()}`,
        waktu,
        keterangan: `Withdraw ke ${d.bank || "-"} (${d.rekening || "-"})`,
        masuk: 0,
        keluar: d.jumlah || 0,
        status: d.status || "-",
        rekening: d.rekening || "-"
      });
    }
  });

  // ✅ Urut & simulasikan saldo
  riwayat.sort((a, b) => b.waktu - a.waktu);
  let saldoSimulasi = saldoAkhir;
  for (let i = 0; i < riwayat.length; i++) {
    const trx = riwayat[i];
    trx.saldoSetelah = saldoSimulasi;
    trx.saldoSebelum = saldoSimulasi - trx.masuk + trx.keluar;
    saldoSimulasi = trx.saldoSebelum;
  }

  // ✅ Render HTML
  let html = `
    <div class="riwayat-saldo-container">
      <h2>📋 Mutasi Saldo Seller</h2>
      <div class="mutasi-card-list">
  `;

  riwayat.forEach(item => {
    const waktuStr = item.waktu?.getTime() === 0
      ? "—"
      : item.waktu?.toLocaleString("id-ID", {
          dateStyle: "short",
          timeStyle: "short"
        }) || "-";

    html += `
      <div class="mutasi-card">
        <p><strong>ID Transaksi:</strong> ${item.id}</p>
        <p><strong>Keterangan:</strong> ${item.keterangan}</p>
        <p><strong>Waktu:</strong> ${waktuStr}</p>
        <p><strong>Masuk:</strong> Rp${(item.masuk || 0).toLocaleString("id-ID")}</p>
        <p><strong>Keluar:</strong> Rp${(item.keluar || 0).toLocaleString("id-ID")}</p>
        <p><strong>Saldo Sebelum:</strong> Rp${(item.saldoSebelum || 0).toLocaleString("id-ID")}</p>
        <p><strong>Saldo Setelah:</strong> Rp${(item.saldoSetelah || 0).toLocaleString("id-ID")}</p>
        <p><strong>Status:</strong> ${item.status || "-"}</p>
        <p><strong>Rekening Tujuan:</strong> ${item.rekening || "-"}</p>
      </div>
    `;
  });

  html += `
      </div>
      <center><button class="btn-mini" onclick="loadContent('dashboard')">⬅️ Kembali</button></center>
    </div>
  `;

  container.innerHTML = html;
}




async function riwayatSaldoDriver() {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat mutasi saldo driver...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `<p>❌ Kamu harus login terlebih dahulu.</p>`;
    return;
  }

  const driverSnap = await db.collection("driver")
    .where("userId", "==", user.uid)
    .limit(1)
    .get();

  if (driverSnap.empty) {
    container.innerHTML = `<p>❌ Data driver tidak ditemukan.</p>`;
    return;
  }

  const driverDoc = driverSnap.docs[0];
  const driverData = driverDoc.data();
  const idDriver = driverData.idDriver;
  const currentSaldo = driverData.saldo || 0;

  const riwayat = [];

  // ✅ 1. Pengiriman
  const pengirimanSnap = await db.collection("pesanan_driver")
    .where("idDriver", "==", idDriver)
    .get();

  for (const doc of pengirimanSnap.docs) {
    const data = doc.data();
    const idPesanan = data.idPesanan;
    if (!idPesanan) continue;

    const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
    if (!pesananDoc.exists) continue;

    const pesanan = pesananDoc.data();
    if ((pesanan.status || "").toLowerCase() !== "selesai") continue;

    const ongkir = Number(data.totalOngkir || 0);
    const potongan = Math.round(ongkir * 0.05);
    const bersih = ongkir - potongan;
    const waktu = pesanan.updatedAt?.toDate?.() || new Date();

    riwayat.push({
      id: `${idPesanan.substring(0, 20).toUpperCase()}`,
      waktu,
      keterangan: `Pengiriman - ID Pesanan ${idPesanan}`,
      masuk: bersih,
      keluar: 0,
      status: "Selesai",
      rekening: "-"
    });
  }

  // ✅ 2. Deposit
  const depositSnap = await db.collection("topup_request")
    .where("idDriver", "==", idDriver)
    .get();

  depositSnap.forEach(doc => {
    const d = doc.data();
    const waktu = d.timestamp?.toDate?.() || new Date();
    const status = (d.status || "-").toLowerCase();

    if (["dikonfirmasi", "selesai"].includes(status)) {
      riwayat.push({
        id: `${doc.id.substring(0, 20).toUpperCase()}`,
        waktu,
        keterangan: `Deposit via ${d.metode || "-"}`,
        masuk: d.total || 0,
        keluar: 0,
        status: d.status || "-",
        rekening: "-"
      });
    }
  });

  // ✅ 3. Withdraw
  const withdrawSnap = await db.collection("withdraw_request")
    .where("idDriver", "==", idDriver)
    .get();

  withdrawSnap.forEach(doc => {
    const d = doc.data();
    const waktu = d.waktu?.toDate?.() || new Date();
    const status = (d.status || "-").toLowerCase();

    if (["berhasil", "selesai"].includes(status)) {
      riwayat.push({
        id: `${doc.id.substring(0, 20).toUpperCase()}`,
        waktu,
        keterangan: `Withdraw ke ${d.bank || "-"} (${d.rekening || "-"})`,
        masuk: 0,
        keluar: d.jumlah || 0,
        status: d.status || "-",
        rekening: d.rekening || "-"
      });
    }
  });

  // ✅ Urutkan berdasarkan waktu terbaru
  riwayat.sort((a, b) => (b.waktu?.getTime() || 0) - (a.waktu?.getTime() || 0));

  // ✅ Simulasi saldo mundur
  let saldoSimulasi = currentSaldo;
  for (const item of riwayat) {
    item.saldoSetelah = saldoSimulasi;
    item.saldoSebelum = saldoSimulasi - (item.masuk || 0) + (item.keluar || 0);
    saldoSimulasi = item.saldoSebelum;
  }


  // ✅ Render HTML
  let html = `
    <div class="riwayat-saldo-container">
      <h2>📋 Mutasi Saldo Driver</h2>
      <div class="mutasi-card-list">
  `;

  riwayat.forEach(item => {
    const waktuStr = item.waktu?.getTime() === 0
      ? "—"
      : item.waktu?.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) || "-";

    html += `
      <div class="mutasi-card">
        <p><strong>ID Transaksi:</strong> ${item.id}</p>
        <p><strong>Keterangan:</strong> ${item.keterangan}</p>
        <p><strong>Waktu:</strong> ${waktuStr}</p>
        <p><strong>Masuk:</strong> Rp${(item.masuk || 0).toLocaleString("id-ID")}</p>
        <p><strong>Keluar:</strong> Rp${(item.keluar || 0).toLocaleString("id-ID")}</p>
        <p><strong>Status:</strong> ${item.status}</p>
        <p><strong>Saldo Sebelum:</strong> Rp${(item.saldoSebelum || 0).toLocaleString("id-ID")}</p>
        <p><strong>Saldo Setelah:</strong> Rp${(item.saldoSetelah || 0).toLocaleString("id-ID")}</p>
      </div>
    `;
  });

  html += `
      </div>
      <center><button class="btn-mini" onclick="loadContent('driver-dashboard')">⬅️ Kembali</button></center>
    </div>
  `;

  container.innerHTML = html;
}





async function konfirmasiTopup(id, userId, total, role) {
  const db = firebase.firestore();
  try {
    // 1. Update status di topup_request
    await db.collection("topup_request").doc(id).update({
      status: "Dikonfirmasi"
    });

    // 2. Update saldo berdasarkan role
    if (role === "user" || role === "driver") {
      await db.collection("users").doc(userId).update({
        saldo: firebase.firestore.FieldValue.increment(Number(total))
      });
    } else if (role === "seller") {
      const tokoQuery = await db.collection("toko").where("userId", "==", userId).limit(1).get();
      if (!tokoQuery.empty) {
        const tokoId = tokoQuery.docs[0].id;
        await db.collection("toko").doc(tokoId).update({
          saldo: firebase.firestore.FieldValue.increment(Number(total))
        });
      }
    }

    alert("✅ Topup berhasil dikonfirmasi.");
    loadContent("permintaan-deposit");
  } catch (e) {
    console.error("❌ Gagal konfirmasi:", e);
    alert("❌ Gagal konfirmasi deposit.");
  }
}

async function tolakTopup(id) {
  const ok = confirm("Tolak permintaan topup ini?");
  if (!ok) return;
  const db = firebase.firestore();
  await db.collection("topup_request").doc(id).update({ status: "Ditolak" });
  loadContent("permintaan-deposit");
}

async function batalkanTopup(id) {
  const ok = confirm("Batalkan permintaan deposit ini?");
  if (!ok) return;
  const db = firebase.firestore();
  await db.collection("topup_request").doc(id).update({ status: "Dibatalkan" });
  loadContent("permintaan-deposit");
}

async function selesaikanTopup(id) {
  const ok = confirm("Tandai permintaan deposit ini sebagai selesai?");
  if (!ok) return;
  const db = firebase.firestore();
  await db.collection("topup_request").doc(id).update({ status: "Selesai" });
  loadContent("permintaan-deposit");
}



// Simpan ke Firestore
async function simpanOverlayAdmin() {
  const aktif = document.getElementById("overlay-aktif").value === "true";
  const judul = document.getElementById("overlay-judul").value.trim();
  const deskripsi = document.getElementById("overlay-deskripsi").value.trim();
  const gambar = document.getElementById("overlay-gambar").value.trim();

  const roleSelect = document.getElementById("overlay-role");
  const selectedRoles = Array.from(roleSelect.selectedOptions).map(o => o.value);

  try {
    await firebase.firestore().collection("pengaturan").doc("popup_overlay").set({
      aktif,
      judul,
      deskripsi,
      gambar,
      role: selectedRoles
    });

    alert("✅ Pengaturan disimpan.");
  } catch (err) {
    console.error("❌ Simpan gagal:", err);
    alert("❌ Gagal simpan: " + err.message);
  }
}


function editRating(idProduk, idRating, komentarLama, ratingLama) {
  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");

  popup.innerHTML = `
    <div class="popup-container-detail-produk">
      <div class="popup-header-detail-produk">
        <span class="popup-close-detail-produk" onclick="tutupPopup()">✕</span>
      </div>

      <div class="popup-text-detail-produk">
        <h3>✏️ Edit Rating</h3>

        <label for="edit-rating-nilai">Rating (1–5):</label>
        <input type="number" id="edit-rating-nilai" value="${ratingLama}" min="1" max="5" style="width: 60px;" />

        <label for="edit-rating-komentar" style="margin-top:10px;">Komentar:</label>
        <textarea id="edit-rating-komentar" rows="4" style="width:100%;">${komentarLama}</textarea>

        <button onclick="simpanEditRating('${idProduk}', '${idRating}')" class="btn-mini" style="margin-top:10px;">💾 Simpan Perubahan</button>
      </div>
    </div>
  `;

  popup.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("popup-active");
}

async function simpanEditRating(idProduk, idRating) {
  const db = firebase.firestore();
  const nilai = parseInt(document.getElementById("edit-rating-nilai").value);
  const komentar = document.getElementById("edit-rating-komentar").value.trim();

  if (!nilai || nilai < 1 || nilai > 5) return alert("❌ Rating harus antara 1–5.");
  if (!komentar) return alert("❌ Komentar tidak boleh kosong.");

  try {
    await db.collection("produk")
      .doc(idProduk)
      .collection("rating")
      .doc(idRating)
      .update({
        rating: nilai,
        ulasan: komentar,
        waktu: Date.now()
      });

    alert("✅ Rating berhasil diperbarui.");
    tutupPopup();
    loadContent("admin-rating");

  } catch (err) {
    console.error("❌ Gagal update rating:", err);
    alert("❌ Terjadi kesalahan saat menyimpan perubahan.");
  }
}

async function hapusRating(idProduk, idRating) {
  const konfirmasi = confirm("⚠️ Yakin ingin menghapus rating ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  try {
    await db.collection("produk")
      .doc(idProduk)
      .collection("rating")
      .doc(idRating)
      .delete();

    alert("✅ Rating berhasil dihapus.");
    loadContent("admin-rating");
  } catch (err) {
    console.error("❌ Gagal menghapus rating:", err);
    alert("❌ Terjadi kesalahan saat menghapus.");
  }
}

function editPesan(docPath, isiLama) {
  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");

  popup.innerHTML = `
    <div class="popup-container-detail-produk">
      <div class="popup-header-detail-produk">
        <span class="popup-close-detail-produk" onclick="tutupPopup()">✕</span>
      </div>

      <div class="popup-text-detail-produk">
        <h3>✏️ Edit Pesan</h3>

        <label for="edit-isi-pesan">Pesan:</label>
        <textarea id="edit-isi-pesan" rows="4" style="width:100%;">${isiLama}</textarea>

        <button onclick="simpanEditPesan(\`${docPath}\`)" class="btn-mini" style="margin-top:10px;">💾 Simpan</button>
      </div>
    </div>
  `;

  popup.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("popup-active");
}

async function simpanEditPesan(docPath) {
  const db = firebase.firestore();
  const isiBaru = document.getElementById("edit-isi-pesan").value.trim();
  if (!isiBaru) return alert("❌ Pesan tidak boleh kosong.");

  try {
    await db.doc(docPath).update({
      keterangan: isiBaru,
      waktu: Date.now()
    });

    alert("✅ Pesan berhasil diperbarui.");
    tutupPopup();
    loadRiwayatPesanAdmin();
  } catch (err) {
    console.error("❌ Gagal update pesan:", err);
    alert("❌ Gagal menyimpan perubahan.");
  }
}

async function hapusPesan(docPath) {
  const konfirmasi = confirm("⚠️ Yakin ingin menghapus pesan ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();

  try {
    await db.doc(docPath).delete();
    alert("✅ Pesan berhasil dihapus.");
    loadRiwayatPesanAdmin();
  } catch (err) {
    console.error("❌ Gagal hapus pesan:", err);
    alert("❌ Terjadi kesalahan saat menghapus pesan.");
  }
}


const GEOCODE_API_KEY = "c00bb655a8ab4a33adf7d27d2a904d8f";

// Ambil lokasi dari dropdown alamat (utama atau cadangan)
async function pilihLokasiDariDropdown(data) {
  const lokasiText = document.getElementById("lokasiSelectText");
  if (lokasiText) {
    lokasiText.textContent = data.alamat || "Alamat dipilih";
  }

  customerLocation = {
    lat: data.lokasi.latitude,
    lng: data.lokasi.longitude
  };

  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    await firebase.firestore()
      .collection("alamat")
      .doc(user.uid)
      .set({
        userId: user.uid,
        nama: data.nama,
        noHp: data.noHp,
        alamat: data.alamat,
        catatan: data.catatan || '',
        lokasi: new firebase.firestore.GeoPoint(data.lokasi.latitude, data.lokasi.longitude),
        updatedAt: new Date()
      }, { merge: true });

    console.log("✅ Alamat utama diperbarui dari dropdown.");
    loadSavedAddress?.(); // Opsional: reload jika tersedia
  } catch (err) {
    console.error("❌ Gagal memperbarui alamat utama:", err);
  }

  document.getElementById("lokasiDropdown")?.classList.remove("active");
}

// Gunakan lokasi terkini & simpan ke alamat utama
async function pilihLokasiTerkini() {
  try {
    const posisi = await getCurrentPosition();
    const lat = posisi.coords.latitude;
    const lng = posisi.coords.longitude;

    const alamatLengkap = await getAlamatDariKoordinat(lat, lng);
    const user = firebase.auth().currentUser;
    if (!user) return alert("❌ Silakan login dulu.");

    await firebase.firestore().collection("alamat").doc(user.uid).set({
      lokasi: new firebase.firestore.GeoPoint(lat, lng),
      alamat: alamatLengkap,
      updatedAt: new Date()
    }, { merge: true });

    customerLocation = { lat, lng };
    const lokasiText = document.getElementById("lokasiSelectText");
    if (lokasiText) lokasiText.textContent = alamatLengkap;

    document.getElementById("lokasiDropdown")?.classList.remove("active");
    loadSavedAddress?.();
  } catch (err) {
    console.error("❌ Gagal mengambil lokasi:", err);
    alert("❌ Gagal mengambil lokasi. Pastikan GPS aktif.");
  }
}

// Toggle dropdown lokasi
function toggleLokasiDropdown() {
  const dropdown = document.getElementById('lokasiDropdown');
  dropdown.classList.toggle('active');
}

// Load semua alamat ke dropdown (utama + cadangan)
async function loadDropdownLokasi() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const lokasiDropdown = document.getElementById("lokasiDropdown");
  if (!lokasiDropdown) return;

  // Reset isi dropdown
  lokasiDropdown.innerHTML = `<div onclick="pilihLokasiTerkini()">📍 Gunakan Lokasi Terkini</div>`;

  const db = firebase.firestore();

  // Ambil alamat utama
  try {
    const utamaDoc = await db.collection("alamat").doc(user.uid).get();
    if (utamaDoc.exists) {
      const data = utamaDoc.data();
      const div = document.createElement("div");
      div.textContent = `🏠 [UTAMA] ${data.nama || "Tanpa Nama"} - ${data.alamat?.substring(0, 40) || ''}`;
      div.onclick = () => pilihLokasiDariDropdown(data);
      lokasiDropdown.appendChild(div);
    }
  } catch (e) {
    console.warn("❌ Gagal ambil alamat utama:", e);
  }

  // Ambil dari alamat cadangan
  try {
    const cadangan = await db.collection("alamat").doc(user.uid).collection("daftar").get();
    cadangan.forEach(doc => {
      const data = doc.data();
      if (!data.lokasi || !data.lokasi.latitude || !data.lokasi.longitude) return;

      const div = document.createElement("div");
      div.textContent = `🏠 ${data.nama || "Tanpa Nama"} - ${data.alamat?.substring(0, 40) || ''}`;
      div.onclick = () => pilihLokasiDariDropdown(data);
      lokasiDropdown.appendChild(div);
    });
  } catch (err) {
    console.error("❌ Gagal memuat alamat cadangan:", err);
  }
}

// Ambil posisi GPS pengguna
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  });
}

// Konversi lat,lng → alamat menggunakan OpenCage API
async function getAlamatDariKoordinat(lat, lng) {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${GEOCODE_API_KEY}&language=id`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results[0]?.formatted || `Lat: ${lat}, Lng: ${lng}`;
}



// Fungsi eksplor restoran
async function eksplorRestoran() {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("❌ Silakan login terlebih dahulu.");
    return;
  }

  const db = firebase.firestore();
  try {
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      alert("❌ Lokasi belum diatur. Silakan isi alamat terlebih dahulu.");
      return;
    }

    // Scroll ke atas agar langsung lihat produk
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Filter produk dengan jarak terdekat
    tampilkanProdukFilter("terdekat");

  } catch (err) {
    console.error("❌ Gagal memuat eksplor restoran:", err);
    alert("❌ Terjadi kesalahan saat memuat produk terdekat.");
  }
}



function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}




async function getAlamatDariKoordinat(lat, lng) {
  const GEOCODE_API_KEY = "c00bb655a8ab4a33adf7d27d2a904d8f";
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${GEOCODE_API_KEY}&language=id`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results[0]?.formatted || `Lat: ${lat}, Lng: ${lng}`;
}

function toggleLokasiDropdown() {
  const dropdown = document.getElementById("lokasiDropdown");
  dropdown.classList.toggle("active");
}



function bukaModalPenolakan(docId, idPesanan) {
  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">❌ Tolak Pesanan</h2>
      <button onclick="document.getElementById('modal-detail').style.display='none'" style="font-size:18px;">✖️</button>
    </div>

    <p><strong>ID Pesanan:</strong> ${idPesanan}</p>

    <p>Silakan tuliskan alasan Anda menolak pesanan ini:</p>
    <textarea id="alasanPenolakan" placeholder="Contoh: Bahan habis, tutup lebih awal, dll" style="width:100%;height:80px;padding:8px;border-radius:6px;border:1px solid #ccc;"></textarea>

    <div style="margin-top:12px;text-align:right;">
      <button onclick="tolakPesananDenganAlasan('${docId}', '${idPesanan}')" style="padding:6px 14px;border:none;background:#dc3545;color:#fff;border-radius:6px;cursor:pointer;">Konfirmasi Penolakan</button>
    </div>
  `;

  modal.style.display = "flex";
}


async function tolakPesananDenganAlasan(docId, idPesanan) {
  const alasan = document.getElementById("alasanPenolakan")?.value.trim();
  if (!alasan) return alert("❌ Alasan penolakan wajib diisi.");

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Anda belum login.");

  try {
    const pesananPenjualRef = db.collection("pesanan_penjual").doc(docId);
    const pesananPenjualDoc = await pesananPenjualRef.get();
    if (!pesananPenjualDoc.exists) return alert("❌ Data pesanan penjual tidak ditemukan.");

    const dataPenjual = pesananPenjualDoc.data();
    const waktuSekarang = new Date();

    // ✅ 1. Update pesanan_penjual
    await pesananPenjualRef.update({
      status: "Ditolak",
      alasanPenolakan: alasan,
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: "Ditolak oleh penjual",
        alasan: alasan,
        waktu: waktuSekarang
      })
    });

    // ✅ 2. Update pesanan utama
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) return alert("❌ Data pesanan utama tidak ditemukan.");

    const dataPesanan = pesananDoc.data();

    await pesananRef.update({
      status: "Dibatalkan",
      alasanPenolakan: alasan,
      waktuDibatalkan: firebase.firestore.FieldValue.serverTimestamp(),
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: "Ditolak oleh penjual",
        alasan: alasan,
        waktu: waktuSekarang
      })
    });

    // ✅ 3. Refund jika metode saldo
    if (dataPesanan?.metode === "saldo" && dataPesanan.total > 0) {
      await refundSaldoOtomatis(
        dataPesanan.userId,
        dataPesanan.total,
        idPesanan,
        `Penolakan oleh penjual: ${alasan}`
      );
    }

    alert("✅ Pesanan berhasil ditolak dan saldo dikembalikan.");
    document.getElementById("modal-detail").style.display = "none";
    loadContent("seller-pesanan");

  } catch (err) {
    console.error("❌ Gagal menolak pesanan:", err);
    alert("❌ Gagal menolak pesanan.");
  }
}

async function refundSaldoOtomatis(idUser, jumlahRefund, idPesanan, keterangan = "Refund pesanan dibatalkan") {
  const db = firebase.firestore();
  const userRef = db.collection("users").doc(idUser);

  try {
    await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error("User tidak ditemukan");

      const saldoLama = parseInt(userDoc.data().saldo || 0);
      const saldoBaru = saldoLama + jumlahRefund;

      tx.update(userRef, { saldo: saldoBaru });

      const logRef = db.collection("transaksi_saldo").doc();
      tx.set(logRef, {
        userId: idUser,
        jenis: "refund",
        jumlah: jumlahRefund,
        deskripsi: `${keterangan} - ID: ${idPesanan}`,
        waktu: firebase.firestore.FieldValue.serverTimestamp(),
        saldoSetelah: saldoBaru
      });
    });

    console.log(`✅ Refund Rp${jumlahRefund} berhasil ke user ${idUser}`);
  } catch (err) {
    console.error("❌ Gagal refund saldo:", err.message);
  }
}






function renderRiwayatPesananCards(docs) {
  const container = document.getElementById("riwayat-container");

 docs = docs.filter(doc => {
  const status = (doc.data().status || "").toLowerCase();
  return status !== "selesai" && status !== "dibatalkan" && status !== "ditolak";
});


  if (docs.length === 0) {
    container.innerHTML = `<p>✅ Belum ada riwayat pesanan.</p>`;
    return;
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;

  docs.forEach(doc => {
    const p = doc.data();
    const statusPesanan = p.status || "-";
    const waktu = p.createdAt?.toDate();
    const waktuFormatted = waktu
      ? waktu.toLocaleDateString("id-ID", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        }) + " " + waktu.toLocaleTimeString("id-ID", {
          hour: "2-digit", minute: "2-digit"
        })
      : "-";

    const warnaStatus = statusPesanan.toLowerCase() === "selesai" ? "#4caf50" : "#f44336";

    html += `
      <div class="pesanan-item-seller-pesanan" style="border-left: 4px solid ${warnaStatus}; background: #f9f9f9;">
        <p><strong>ID Pesanan:</strong> ${p.idPesanan || "-"}</p>
        <p><strong>Pembeli:</strong> ${p.namaPembeli || "-"} - ${p.noHpPembeli || "-"}</p>
        <p><strong>Waktu:</strong> ${waktuFormatted}</p>
        <p><strong>Total:</strong> Rp${(p.total || 0).toLocaleString()}</p>
        <p><strong>Status:</strong> <span style="color:${warnaStatus}; font-weight:bold;">${statusPesanan}</span></p>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}




function hitungJarakMeter(lat1, lng1, lat2, lng2) {
  const R = 6371000; // radius Bumi dalam meter
  const rad = deg => deg * (Math.PI / 180);
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


async function konfirmasiTarikSeller(id, jumlahDiterima) {
  if (!confirm("Yakin ingin mengonfirmasi penarikan untuk toko ini?")) return;

  const db = firebase.firestore();
  const ref = db.collection("withdraw_request").doc(id);

  try {
    const doc = await ref.get();
    if (!doc.exists) throw new Error("Data tidak ditemukan.");

    const data = doc.data();
    const jumlah = data.jumlah;
    const diterima = jumlahDiterima;

    // Ambil ID Toko langsung dari ID Toko yang terkait dengan permintaan
    const idToko = data.idToko;

    // Cek apakah data toko ada di koleksi 'toko' menggunakan ID toko
    const tokoRef = db.collection("toko").doc(idToko);  // Menggunakan koleksi 'toko' bukan 'toko-seller'
    const tokoDoc = await tokoRef.get();

    if (!tokoDoc.exists) {
      throw new Error("Toko tidak ditemukan.");
    }

    // Update status penarikan dan saldo toko
    await db.runTransaction(async (tx) => {
      const saldoToko = tokoDoc.data().saldo || 0;
      tx.update(tokoRef, { saldo: saldoToko + diterima });
      tx.update(ref, { status: "Selesai", waktuDiproses: new Date() });
    });

    // ✅ Kirim pesan ke pesan_toko > [idToko] > pesan
    await db.collection("pesan_toko")
      .doc(idToko)  // Menggunakan idToko yang sesuai
      .collection("pesan")
      .add({
        waktu: new Date(),
        perihal: "Withdraw Dikonfirmasi",
        keterangan: `Penarikan sebesar Rp${diterima.toLocaleString("id-ID")} telah berhasil diproses untuk toko ${idToko}.`,
        dari: "Admin"
      });

    alert("✅ Penarikan untuk toko berhasil dikonfirmasi.");
    loadContent("permintaan-withdraw"); // Reload halaman
  } catch (err) {
    alert("❌ Gagal mengonfirmasi penarikan: " + err.message);
  }
}

async function tolakTarikDriver(id) {
  if (!confirm("Yakin ingin menolak penarikan saldo untuk driver ini?")) return;

  const db = firebase.firestore();
  const ref = db.collection("tarik_saldo_driver").doc(id);

  try {
    const doc = await ref.get();
    if (!doc.exists) throw new Error("Data tidak ditemukan.");

    // Mengambil data permintaan tarik saldo
    const data = doc.data();
    const idDriver = data.idDriver;

    // Mengupdate status menjadi 'Ditolak'
    await db.runTransaction(async (tx) => {
      tx.update(ref, { status: "ditolak", waktuDiproses: new Date() });
    });

    // Kirim pesan penolakan ke driver
    await db.collection("pesan_toko")
      .doc(idDriver)  // Menggunakan ID driver untuk pesan
      .collection("pesan")
      .add({
        waktu: new Date(),
        perihal: "Withdraw Ditolak",
        keterangan: `Permintaan penarikan saldo sebesar Rp${data.jumlah.toLocaleString("id-ID")} telah ditolak oleh admin.`,
        dari: "Admin"
      });

    alert("✅ Penarikan untuk driver telah ditolak.");
    loadContent("permintaan-withdraw"); // Reload halaman
  } catch (err) {
    alert("❌ Gagal menolak penarikan: " + err.message);
  }
}


function konfirmasiTarik(event, id, saldo, role) {
  event.preventDefault();

  // Konfirmasi pengguna untuk melanjutkan penarikan
  const konfirmasi = confirm("Yakin ingin mengajukan penarikan saldo ini?");

  // Jika pengguna mengonfirmasi, lanjutkan dengan fungsi yang sesuai
  if (konfirmasi) {
    if (role === "driver") {
      return submitTarikSaldoDriver(event, id, saldo);
    } else if (role === "seller") {
      return submitTarikSaldoToko(event, id, saldo);
    } else {
      alert("Role tidak dikenali.");
      return false;
    }
  } else {
    return false; // Jika tidak, tidak melakukan apapun
  }
}




function formTarikSaldoDriver(idDriver, saldo) {
  const modal = document.getElementById("modal-detail");
  const content = modal.querySelector(".modal-content");

  modal.style.display = "flex";
  content.innerHTML = `<p>⏳ Memuat data driver...</p>`;

  const db = firebase.firestore();

  (async () => {
    try {
      const snap = await db.collection("driver")
        .where("idDriver", "==", idDriver)
        .limit(1)
        .get();

      if (snap.empty) {
        content.innerHTML = `<p style="color:red;">❌ Data driver tidak ditemukan.</p>`;
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data();
      const nama = data.nama || "-";

      content.innerHTML = `
        <h2>💸 Tarik Saldo Driver</h2>
        <p><strong>Saldo:</strong> Rp${saldo.toLocaleString("id-ID")}</p>

        <form onsubmit="return konfirmasiTarik(event, '${idDriver}', ${saldo}, 'driver')">
          <label>Nama Rekening</label>
          <input type="text" value="${nama}" readonly
            style="width:100%; padding:8px; margin-bottom:10px; background:#eee; border:1px solid #ccc; border-radius:6px;">

          <label>Jumlah Tarik (Rp)</label>
          <input type="number" id="jumlah-tarik-driver" required min="10000" max="${saldo}" placeholder="Minimal Rp10.000"
            oninput="hitungJumlahDiterimaDriver()" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px;">

          <label>Nomor Rekening / E-Wallet</label>
          <input type="text" id="rekening-driver" required placeholder="Contoh: 089123456789"
            style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px;">

          <label>Bank / E-Wallet</label>
          <select id="bank-driver" onchange="hitungJumlahDiterimaDriver()" required
            style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px;">
            <option value="">Pilih Bank / E-Wallet</option>
            <option value="BCA" data-biaya="0">BCA</option>
            <option value="BRI" data-biaya="2500">BRI +2.500</option>
            <option value="MANDIRI" data-biaya="2500">MANDIRI +2.500</option>
            <option value="SEABANK" data-biaya="0">SEABANK</option>
            <option value="DANA" data-biaya="0">DANA</option>
          </select>

          <label>Jumlah Diterima</label>
          <input type="text" id="jumlah-diterima-driver" readonly
            style="width:100%; padding:8px; margin-bottom:14px; background:#eee; border:1px solid #ccc; border-radius:6px;">

          <button type="submit"
            style="width:100%; background:#28a745; color:#fff; border:none; border-radius:6px; padding:10px;">
            Ajukan Tarik Saldo
          </button>
        </form>

        <div id="hasilTarikDriver" style="margin-top:16px;"></div>

        <div style="text-align:right; margin-top:12px;">
          <button onclick="document.getElementById('modal-detail').style.display='none'"
            style="background:#aaa; color:#fff; padding:6px 12px; border:none; border-radius:6px;">
            Tutup
          </button>
        </div>
      `;
    } catch (err) {
      console.error(err);
      content.innerHTML = `<p style="color:red;">❌ Gagal memuat form: ${err.message}</p>`;
    }
  })();
}

function hitungJumlahDiterimaDriver() {
  const inputJumlah = document.getElementById("jumlah-tarik-driver");
  const selectBank = document.getElementById("bank-driver");
  const outputDiterima = document.getElementById("jumlah-diterima-driver");

  const jumlahTarik = parseInt(inputJumlah.value) || 0;

  if (!selectBank.value) {
    outputDiterima.value = "Pilih bank/ewallet terlebih dahulu";
    return;
  }

  const selectedOption = selectBank.options[selectBank.selectedIndex];
  const biayaAdmin = parseInt(selectedOption.getAttribute("data-biaya")) || 0;

  if (jumlahTarik < 10000) {
    outputDiterima.value = "Minimal Rp10.000";
    return;
  }

  const jumlahDiterima = jumlahTarik - biayaAdmin;
  outputDiterima.value = jumlahDiterima < 0
    ? "Tidak valid"
    : `Rp${jumlahDiterima.toLocaleString("id-ID")}`;
}

function submitTarikSaldoDriver(event, idDriver, saldo) {
  event.preventDefault();

  const jumlah = parseInt(document.getElementById("jumlah-tarik-driver").value) || 0;
  const rekening = document.getElementById("rekening-driver").value.trim();
  const bank = document.getElementById("bank-driver").value;

  const selectBank = document.getElementById("bank-driver");
  const biayaAdmin = parseInt(selectBank.options[selectBank.selectedIndex].getAttribute("data-biaya")) || 0;
  const diterima = jumlah - biayaAdmin;

  if (!jumlah || !rekening || !bank) {
    alert("❌ Harap lengkapi semua data.");
    return false;
  }

  if (jumlah < 10000 || jumlah > saldo) {
    alert(`❌ Jumlah tidak valid. Minimal Rp10.000 dan maksimal Rp${saldo.toLocaleString("id-ID")}`);
    return false;
  }

  const db = firebase.firestore();

  db.collection("driver").where("idDriver", "==", idDriver).limit(1).get()
    .then(async snapshot => {
      if (snapshot.empty) throw new Error("Data driver tidak ditemukan.");

      const driverDoc = snapshot.docs[0];
      const driverRef = driverDoc.ref;
      const saldoSekarang = parseInt(driverDoc.data().saldo || 0);

      if (saldoSekarang < jumlah) {
        throw new Error("Saldo driver tidak mencukupi.");
      }

      // 1. Kurangi saldo driver
      await driverRef.update({ saldo: saldoSekarang - jumlah });

      // 2. Buat ID dokumen custom WD-xxxxx
      const newDocRef = db.collection("withdraw_request").doc();
      const customId = `WD-${newDocRef.id.substring(0, 6).toUpperCase()}`;
      const finalRef = db.collection("withdraw_request").doc(customId);

      // 3. Simpan data withdraw
      await finalRef.set({
        idWithdraw: customId,
        idDriver,
        jumlah,
        rekening,
        bank,
        biayaAdmin,
        diterima,
        status: "pending",
        waktu: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 4. Sukses
      document.getElementById("hasilTarikDriver").innerHTML = `<p style="color:green;">✅ Permintaan tarik saldo berhasil diajukan.</p>`;
      setTimeout(() => {
        document.getElementById("modal-detail").style.display = "none";
        loadContent("riwayat-saldo-driver");
      }, 1500);
    })
    .catch(err => {
      console.error(err);
      alert(`❌ Gagal memproses penarikan: ${err.message}`);
    });

  return false;
}






async function konfirmasiTarikDriver(docId, idDriver) {
  const db = firebase.firestore();
  const withdrawRef = db.collection("withdraw_request").doc(docId);
  const withdrawSnap = await withdrawRef.get();

  if (!withdrawSnap.exists) return alert("❌ Data permintaan tidak ditemukan.");

  const withdrawData = withdrawSnap.data();
  const status = (withdrawData.status || "").toLowerCase();

  if (!["menunggu", "pending"].includes(status)) {
    return alert(`❌ Permintaan sudah diproses sebelumnya (status: ${status}).`);
  }

  try {
    await withdrawRef.update({
      status: "berhasil",
      approvedBy: firebase.auth().currentUser.uid,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Withdraw driver berhasil dikonfirmasi.");
    loadContent("permintaan-withdraw");
  } catch (err) {
    console.error(err);
    alert("❌ Gagal memproses withdraw driver.");
  }
}

async function tolakTarikDriver(docId) {
  const db = firebase.firestore();
  const withdrawRef = db.collection("withdraw_request").doc(docId);
  const withdrawSnap = await withdrawRef.get();

  if (!withdrawSnap.exists) return alert("❌ Data permintaan tidak ditemukan.");

  const data = withdrawSnap.data();
  const idDriver = data.idDriver;
  const jumlah = data.jumlah;

  try {
    // Cari dokumen driver berdasarkan field idDriver
    const driverSnap = await db.collection("driver")
      .where("idDriver", "==", idDriver)
      .limit(1)
      .get();

    if (driverSnap.empty) {
      return alert("❌ Data driver tidak ditemukan.");
    }

    const driverDoc = driverSnap.docs[0];
    const ref = driverDoc.ref;
    const saldoLama = parseInt(driverDoc.data().saldo || 0);

    // Kembalikan saldo
    await ref.update({
      saldo: saldoLama + jumlah
    });

    // Update status permintaan
    await withdrawRef.update({
      status: "ditolak",
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("❌ Withdraw driver ditolak dan saldo dikembalikan.");
    loadContent("permintaan-withdraw");
  } catch (err) {
    console.error(err);
    alert("❌ Gagal menolak permintaan withdraw.");
  }
}






async function formTarikSaldo(idToko) {
  const modal = document.getElementById("modal-detail");
  const content = modal.querySelector(".modal-content");

  modal.style.display = "flex";
  content.innerHTML = `<p>⏳ Memuat data...</p>`;

  const db = firebase.firestore();

  try {
    const tokoDoc = await db.collection("toko").doc(idToko).get();
    if (!tokoDoc.exists) {
      content.innerHTML = `<p style="color:red;">❌ Data toko tidak ditemukan.</p>`;
      return;
    }

    const dataToko = tokoDoc.data();
    const namaPemilik = dataToko.namaPemilik || "-";

    // Perbaikan: Menggunakan saldo dari dataToko
    content.innerHTML = `
      <h2>💸 Tarik Saldo</h2>
      <p><strong>Saldo Toko:</strong> Rp ${dataToko.saldo.toLocaleString("id-ID")}</p>

      <form onsubmit="return submitTarikSaldo(event, '${idToko}', ${dataToko.saldo})">
        <label>Nama Rekening (sesuai KTP)</label>
        <input type="text" value="${namaPemilik}" readonly
          style="width:100%; padding:8px; margin-bottom:10px; background:#eee; border:1px solid #ccc; border-radius:6px;">

        <label>Jumlah Tarik (Rp)</label>
        <input type="number" id="jumlah" required min="10000" placeholder="Minimal Rp10.000"
          oninput="hitungJumlahDiterima()" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px;">

        <label>Nomor Rekening / E-Wallet</label>
        <input type="text" id="rekening" required placeholder="Contoh: 089123456789"
          style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px;">

        <label>Bank / E-Wallet</label>
        <select id="bank" onchange="hitungJumlahDiterima()" required
          style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px;">
          <option value="">Pilih Bank / E-Wallet</option>
          <option value="BCA">BCA</option>
          <option value="BRI">BRI +2.500</option>
          <option value="MANDIRI">MANDIRI +2.500</option>
          <option value="SEABANK">SEABANK</option>
          <option value="DANA">DANA</option>
        </select>

        <label>Jumlah Diterima</label>
        <input type="text" id="jumlahDiterima" readonly
          style="width:100%; padding:8px; margin-bottom:14px; background:#eee; border:1px solid #ccc; border-radius:6px;">

        <button type="submit"
          style="width:100%; background:#28a745; color:#fff; border:none; border-radius:6px; padding:10px;">
          Ajukan Tarik Saldo
        </button>
      </form>

      <div id="hasilTarikSaldo" style="margin-top:16px;"></div>

      <div style="text-align:right; margin-top:12px;">
        <button onclick="document.getElementById('modal-detail').style.display='none'"
          style="background:#aaa; color:#fff; padding:6px 12px; border:none; border-radius:6px;">
          Tutup
        </button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color:red;">❌ Gagal memuat form: ${err.message}</p>`;
  }
}


function hitungJumlahDiterima() {
  const jumlah = parseInt(document.getElementById("jumlah").value) || 0;
  const bank = document.getElementById("bank").value;
  const jumlahDiterimaInput = document.getElementById("jumlahDiterima");

  let potongan = 0;
  if (bank === "BRI" || bank === "MANDIRI") potongan = 2500;

  const diterima = Math.max(0, jumlah - potongan);
  jumlahDiterimaInput.value = `Rp ${diterima.toLocaleString("id-ID")}`;
}


async function submitTarikSaldo(event, idToko, saldoToko) {
  event.preventDefault();

  const jumlah = parseInt(document.getElementById("jumlah").value);
  const rekening = document.getElementById("rekening").value.trim();
  const bank = document.getElementById("bank").value;
  const hasil = document.getElementById("hasilTarikSaldo");

  if (!bank) {
    hasil.innerHTML = `<p style="color:red;">❌ Silakan pilih bank atau e-wallet.</p>`;
    return false;
  }

  const potongan = (bank === "BRI" || bank === "MANDIRI") ? 2500 : 0;
  const jumlahDiterima = jumlah - potongan;

  if (jumlah < 10000) {
    hasil.innerHTML = `<p style="color:red;">❌ Minimal tarik saldo adalah Rp10.000</p>`;
    return false;
  }

  if (jumlah > saldoToko) {
    hasil.innerHTML = `<p style="color:red;">❌ Saldo tidak mencukupi. Tersedia: Rp ${saldoToko.toLocaleString("id-ID")}</p>`;
    return false;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    hasil.innerHTML = `<p style="color:red;">❌ Silakan login terlebih dahulu.</p>`;
    return false;
  }

  const uid = user.uid;
  const db = firebase.firestore();

  try {
    // 🔍 Cek apakah ada penarikan yang masih pending
    const cekPending = await db.collection("withdraw_request")
      .where("idToko", "==", idToko)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!cekPending.empty) {
      hasil.innerHTML = `<p style="color:red;">❌ Masih ada penarikan saldo yang belum diproses. Silakan tunggu.</p>`;
      return false;
    }

    // ✅ Generate doc ID manual
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const docId = `WD-${random}`;

    // ✅ Simpan permintaan tarik saldo
    await db.collection("withdraw_request").doc(docId).set({
      id: docId,
      idToko,
      uid,
      jumlah,
      rekening,
      bank,
      potongan,
      jumlahDiterima,
      status: "pending",
      waktu: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 🔻 Potong saldo toko
    await db.collection("toko").doc(idToko).update({
      saldo: firebase.firestore.FieldValue.increment(-jumlah)
    });

    hasil.innerHTML = `<p style="color:green;">✅ Permintaan tarik saldo berhasil dikirim.</p>`;
    event.target.reset();
    document.getElementById("jumlahDiterima").value = "";
  } catch (err) {
    console.error("❌ submitTarikSaldo:", err);
    hasil.innerHTML = `<p style="color:red;">❌ Gagal mengirim: ${err.message}</p>`;
  }

  return false;
}


function updateCountdownList() {
  const now = Date.now();

  for (const item of window.countdownList) {
    const el = document.getElementById(item.id);
    const statusEl = document.getElementById(`status-driver-${item.docId}`);

    if (!el || !statusEl) continue;

    const status = (statusEl.innerText || "").toLowerCase();
    const sisa = Math.max(0, item.akhir - now);

    if (status === "pickup pesanan") {
      el.innerText = "✅ Kamu Tepat Waktu";
      continue; // tidak perlu lanjutkan perhitungan
    }

    if (sisa <= 0) {
      el.innerText = "❌ Kamu Terlambat";
    } else {
      const menit = Math.floor(sisa / 60000);
      const detik = Math.floor((sisa % 60000) / 1000);
      el.innerText = `${menit}m ${detik}s`;
    }
  }

  setTimeout(updateCountdownList, 1000);
}





async function konfirmasiPesananDriver(idPesanan, idToko, idDriver) {
  const db = firebase.firestore();
  const docId = `${idPesanan}-${idToko}`;
  const pendingRef = db.collection("pesanan_driver_pending").doc(docId);
  const pesananDriverRef = db.collection("pesanan_driver").doc(docId);
  const pesananRef = db.collection("pesanan").doc(idPesanan);
  const tokoRef = db.collection("toko").doc(idToko);
  const driverQuery = db.collection("driver").where("idDriver", "==", idDriver).limit(1);

  try {
    await db.runTransaction(async (transaction) => {
      const [pendingSnap, driverSnap, tokoSnap] = await Promise.all([
        transaction.get(pendingRef),
        driverQuery.get(),
        transaction.get(tokoRef)
      ]);

      if (!pendingSnap.exists) {
        throw new Error("⏳ Pesanan tidak tersedia atau sudah diambil driver lain.");
      }

      if (driverSnap.empty) {
        throw new Error("❌ Data driver tidak ditemukan.");
      }

      const dataPending = pendingSnap.data();
      const driverData = driverSnap.docs[0].data();
      const namaDriver = driverData.nama || "Driver";
      const namaToko = tokoSnap.exists ? tokoSnap.data().namaToko || "Toko" : "Toko";

      // Cek apakah termasuk calonDriver
      if (!Array.isArray(dataPending.calonDriver) || !dataPending.calonDriver.includes(idDriver)) {
        throw new Error("❌ Anda tidak termasuk daftar calon driver pesanan ini.");
      }

      // Cek apakah pesanan sudah diambil (dalam transaksi)
      const existingDoc = await transaction.get(pesananDriverRef);
      if (existingDoc.exists) {
        throw new Error("❌ Pesanan ini sudah diambil oleh driver lain.");
      }

      // Buang calonDriver dan simpan pesanan baru
      const { calonDriver, ...dataToSave } = dataPending;

      transaction.set(pesananDriverRef, {
        ...dataToSave,
        idDriver,
        status: "Menuju Toko",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),  // boleh, karena bukan di array
        stepsLog: [
          {
            step: `Pesanan dari ${namaToko} diterima oleh ${namaDriver}`,
            waktu: Date.now()  // jangan pakai FieldValue.serverTimestamp() di sini
          }
        ]
      });

      transaction.update(pesananRef, {
        status: "Diambil Driver",
        stepsLog: firebase.firestore.FieldValue.arrayUnion(
          `Pesanan dari ${namaToko} diambil oleh ${namaDriver} - [${new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
          })}]`
        )
      });

      // Hapus dokumen pending di akhir transaksi
      transaction.delete(pendingRef);
    });

    alert("✅ Pesanan berhasil diambil! Silakan menuju lokasi toko.");
    loadContent("driver-dashboard");

  } catch (err) {
    console.error("❌ Gagal mengambil pesanan:", err);
    alert(err.message || "❌ Terjadi kesalahan saat mengambil pesanan.");
  }
}




async function editToko(idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat form edit toko...</p>`;

  const db = firebase.firestore();

  try {
    const doc = await db.collection("toko").doc(idToko).get();
    if (!doc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Toko tidak ditemukan.</p>`;
      return;
    }

    const toko = doc.data();

    const koordinatValue = toko.koordinat && toko.koordinat.latitude !== undefined
      ? `${toko.koordinat.latitude.toFixed(5)},${toko.koordinat.longitude.toFixed(5)}`
      : "";

    container.innerHTML = `
      <div class="form-box">
        <h2>✏️ Edit Toko</h2>
        <form id="editTokoForm" onsubmit="simpanEditToko(event, '${idToko}')">
          <label>Logo Toko</label>
          <input id="inputLogo" type="file" accept="image/*" />
          <p style="margin:0;">Logo saat ini:</p>
          <img id="previewLogo" src="${toko.logo || '/img/toko-pict.png'}" alt="Preview Logo" style="max-width:150px; margin-bottom:1rem; border-radius:8px;" />
          <p id="statusUpload" style="color:green;"></p>

          <label>Nama Pemilik</label>
          <input id="namaPemilik" type="text" value="${toko.namaPemilik || ''}" readonly style="background:#eee; border:1px solid #ccc;" />

          <label>Nama Toko</label>
          <input id="namaToko" type="text" value="${toko.namaToko || ''}" required />

          <label>Deskripsi Toko</label>
          <textarea id="deskripsiToko" placeholder="Deskripsi singkat toko...">${toko.deskripsiToko || ''}</textarea>

          <label>Alamat Toko</label>
          <textarea id="alamatToko" required>${toko.alamatToko || ''}</textarea>

          <label>Jam Buka (0–23)</label>
          <input id="jamBuka" type="number" min="0" max="23" value="${toko.jamBuka ?? 0}" required />

          <label>Jam Tutup (0–23)</label>
          <input id="jamTutup" type="number" min="0" max="23" value="${toko.jamTutup ?? 23}" required />

          <label>Koordinat (lat,lng)</label>
          <input id="koordinat" type="text" value="${koordinatValue}" required />
          <button type="button" id="btnLokasi" style="margin: 0.5rem 0;">📍 Lokasi saat ini</button>

          <div id="map" style="height:300px; border-radius:10px; margin-top:1rem;"></div>

          <button type="submit" class="btn-simpan">💾 Simpan Perubahan</button>
        </form>
      </div>
    `;

    // Load Leaflet JS & CSS
    if (!window.L) {
      const leafletCSS = document.createElement("link");
      leafletCSS.rel = "stylesheet";
      leafletCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(leafletCSS);

      const leafletScript = document.createElement("script");
      leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.body.appendChild(leafletScript);

      leafletScript.onload = () => {
        initMap(toko);
      };
    } else {
      initMap(toko);
    }

    function initMap(toko) {
      const defaultLatLng = toko.koordinat
        ? [toko.koordinat.latitude, toko.koordinat.longitude]
        : [-2.2, 106.1]; // Default koordinat Bangka

      const map = L.map('map').setView(defaultLatLng, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      let marker = L.marker(defaultLatLng, { draggable: true }).addTo(map);

      marker.on("dragend", function (e) {
        const { lat, lng } = e.target.getLatLng();
        document.getElementById("koordinat").value = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      });

      map.on("click", function (e) {
        marker.setLatLng(e.latlng);
        document.getElementById("koordinat").value = `${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}`;
      });

      document.getElementById("btnLokasi").addEventListener("click", () => {
        if (!navigator.geolocation) {
          return alert("Geolocation tidak didukung di browser ini.");
        }

        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const koordinatField = document.getElementById("koordinat");
          koordinatField.value = `${lat.toFixed(5)},${lng.toFixed(5)}`;
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], 16);
        }, () => {
          alert("❌ Gagal mengambil lokasi. Coba izinkan akses GPS.");
        });
      });
    }

    // Preview logo jika diganti
    const inputLogo = document.getElementById("inputLogo");
    const previewLogo = document.getElementById("previewLogo");
    inputLogo.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        previewLogo.src = URL.createObjectURL(file);
      }
    });

  } catch (err) {
    console.error("❌ Gagal memuat toko:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat data toko.</p>`;
  }
}



async function simpanEditToko(event, idToko) {
  event.preventDefault();

  const db = firebase.firestore();
  const tokoRef = db.collection("toko").doc(idToko);

  const namaToko = document.getElementById("namaToko").value.trim();
  const deskripsiToko = document.getElementById("deskripsiToko").value.trim();
  const alamatToko = document.getElementById("alamatToko").value.trim();
  const jamBuka = parseInt(document.getElementById("jamBuka").value);
  const jamTutup = parseInt(document.getElementById("jamTutup").value);
  const koordinatStr = document.getElementById("koordinat").value.trim();

  // Validasi form dasar
  if (!namaToko || !deskripsiToko || !alamatToko || isNaN(jamBuka) || isNaN(jamTutup) || !koordinatStr) {
    return alert("❌ Semua kolom wajib diisi dengan benar.");
  }

  if (jamBuka < 0 || jamBuka > 23 || jamTutup < 0 || jamTutup > 23) {
    return alert("❌ Jam buka/tutup harus antara 0–23.");
  }

  // Parsing koordinat
  const [latStr, lngStr] = koordinatStr.split(",").map(s => s.trim());
  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lngStr);

  if (isNaN(latitude) || isNaN(longitude)) {
    return alert("❌ Format koordinat tidak valid.");
  }

  let logoURL = null;
  const inputLogo = document.getElementById("inputLogo");
  const file = inputLogo.files[0];

  const statusEl = document.getElementById("statusUpload") || (() => {
    const el = document.createElement("p");
    el.id = "statusUpload";
    el.style.color = "green";
    document.querySelector("form").appendChild(el);
    return el;
  })();

  // Jika ada file baru diupload
  if (file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "VLCrave-Express"); // Cloudinary preset
    formData.append("folder", "logo-toko");

    statusEl.innerText = "⏳ Mengupload logo...";

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/du8gsffhb/image/upload", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (!result.secure_url) {
        const msg = result.error?.message || "Gagal mendapatkan URL logo.";
        throw new Error(msg);
      }

      logoURL = result.secure_url;
      statusEl.innerText = "✅ Logo berhasil diupload.";
    } catch (err) {
      console.error("❌ Gagal upload logo:", err);
      statusEl.innerText = "❌ Gagal upload logo.";
      alert("❌ Upload logo gagal: " + err.message);
      return;
    }
  } else {
    // Tidak ada file baru → ambil logo lama dari Firestore
    const doc = await tokoRef.get();
    logoURL = doc.exists ? doc.data().logo || null : null;
  }

  // Update Firestore
  try {
    const updateData = {
      namaToko,
      deskripsiToko,
      alamatToko,
      jamBuka,
      jamTutup,
      koordinat: new firebase.firestore.GeoPoint(latitude, longitude),
    };

    if (logoURL) updateData.logo = logoURL;

    await tokoRef.update(updateData);
    alert("✅ Data toko berhasil diperbarui!");
    loadContent("seller-dashboard"); // Optional: refresh halaman
  } catch (err) {
    console.error("❌ Gagal menyimpan data toko:", err);
    alert("❌ Gagal menyimpan data toko. Silakan coba lagi.");
  }
}







async function tambahTokoViaUID() {
  const uid = document.getElementById("input-uid-toko").value.trim();
  if (!uid) return alert("❌ Masukkan UID seller terlebih dahulu.");

  const db = firebase.firestore();
  const userRef = db.collection("users").doc(uid);

  try {
    const userSnap = await userRef.get();
    if (!userSnap.exists) return alert("❌ UID tidak ditemukan.");

    const userData = userSnap.data();
    if ((userData.role || "").toLowerCase() !== "seller") {
      return alert("❌ Role akun bukan Seller.");
    }

    const namaPemilik = userData.namaLengkap || "Tanpa Nama";
    const defaultNamaToko = `Toko ${namaPemilik}`;
    const defaultDeskripsi = "Belum ada deskripsi.";
    const defaultAlamat = "Belum ada alamat.";
    const defaultJamBuka = 8;
    const defaultJamTutup = 21;
    const defaultKoordinat = new firebase.firestore.GeoPoint(-1.63468, 105.77554);
    const defaultLogo = "/img/toko-pict.png";

    await db.collection("toko").add({
      userId: uid,
      namaPemilik,
      namaToko: defaultNamaToko,
      deskripsiToko: defaultDeskripsi,
      alamatToko: defaultAlamat,
      jamBuka: defaultJamBuka,
      jamTutup: defaultJamTutup,
      koordinat: defaultKoordinat,
      saldo: 0,
      logo: defaultLogo,
      createdAt: new Date()
    });

    alert("✅ Toko berhasil dibuat!");
    loadContent("admin-toko");

  } catch (err) {
    console.error("❌ Gagal tambah toko via UID:", err);
    alert("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
}


async function lihatRiwayatVoucher(voucherId) {
  const modal = document.getElementById("modal-detail");
  const content = modal.querySelector(".modal-content");
  modal.style.display = "flex";
  content.innerHTML = `<p>Memuat riwayat penggunaan voucher...</p>`;

  const db = firebase.firestore();
  try {
    const doc = await db.collection("voucher").doc(voucherId).get();
    if (!doc.exists) {
      content.innerHTML = `<p>❌ Voucher tidak ditemukan.</p>`;
      return;
    }

    const data = doc.data();
    const digunakanOleh = data.digunakanOleh || [];

    if (digunakanOleh.length === 0) {
      content.innerHTML = `
        <h3>📜 Riwayat Voucher</h3>
        <p>Belum ada pengguna voucher ini.</p>
        <div style="text-align:right;"><button onclick="document.getElementById('modal-detail').style.display='none'">Tutup</button></div>
      `;
      return;
    }

    let list = "";
    for (const uid of digunakanOleh) {
      const userDoc = await db.collection("users").doc(uid).get();
      const nama = userDoc.exists ? userDoc.data().namaLengkap || "-" : "-";
      const email = userDoc.exists ? userDoc.data().email || "-" : "-";

      list += `
        <li style="margin-bottom:10px;">
          <strong>${nama}</strong><br/>
          <small style="font-family:monospace;">${uid}</small><br/>
          <small>${email}</small>
        </li>
      `;
    }

    content.innerHTML = `
      <h3>📜 Pengguna Voucher</h3>
      <ul style="padding-left:1rem;">${list}</ul>
      <div style="text-align:right;"><button onclick="document.getElementById('modal-detail').style.display='none'">Tutup</button></div>
    `;
  } catch (err) {
    console.error("❌ Gagal ambil riwayat voucher:", err);
    content.innerHTML = `<p>❌ Gagal memuat riwayat voucher.</p>`;
  }
}


async function formNotifikasiAdmin() {
  const modal = document.getElementById("modal-detail");
  const content = modal.querySelector(".modal-content");
  modal.style.display = "flex";

  const db = firebase.firestore();
  const snap = await db.collection("notifikasi_umum").orderBy("createdAt", "desc").limit(10).get();

  let daftarNotif = "";
  if (!snap.empty) {
    daftarNotif += `<h3>🗂 Daftar Notifikasi Terbaru</h3><ul class="-admin-notif">`;
    snap.forEach(doc => {
      const data = doc.data();
      const waktu = data.createdAt?.toDate?.().toLocaleString("id-ID") || "-";
      daftarNotif += `
        <li style="margin-bottom:8px;">
          <div><strong>${data.judul}</strong> (${data.tujuan})<br><small>${waktu}</small></div>
          <div>${data.pesan}</div>
          <button onclick="hapusNotifikasi('${doc.id}')" style="color:white;background:red;border:none;padding:4px 10px;margin-top:4px;cursor:pointer;">🗑 Hapus</button>
        </li>`;
    });
    daftarNotif += `</ul>`;
  }

  content.innerHTML = `
    <h2>📢 Kirim Notifikasi Floating</h2>
    <form id="form-notif-admin">
      <label>Judul:</label>
      <input type="text" id="judul-notif" required placeholder="Contoh: Promo Hari Ini" style="width:100%; margin-bottom:8px;" />

      <label>Pesan:</label>
      <textarea id="pesan-notif" required placeholder="Contoh: Diskon 50% untuk semua menu!" style="width:100%; margin-bottom:8px;"></textarea>

      <label>Tujuan:</label>
      <select id="tujuan-notif" style="width:100%; margin-bottom:8px;">
        <option value="all">Semua</option>
        <option value="seller">Seller</option>
        <option value="driver">Driver</option>
        <option value="user">User</option>
      </select>

      <button type="submit" style="margin-top:12px;">🚀 Kirim Notifikasi</button>
    </form>

    ${daftarNotif}

    <div style="text-align:right; margin-top:10px;">
      <button onclick="document.getElementById('modal-detail').style.display='none'">Tutup</button>
    </div>
  `;

  document.getElementById("form-notif-admin").onsubmit = async (e) => {
    e.preventDefault();

    const judul = document.getElementById("judul-notif").value.trim();
    const pesan = document.getElementById("pesan-notif").value.trim();
    const tujuan = document.getElementById("tujuan-notif").value;

    try {
      await db.collection("notifikasi_umum").add({
        judul,
        pesan,
        tujuan,
        status: "aktif",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("✅ Notifikasi berhasil dikirim!");
      formNotifikasiAdmin(); // reload modal untuk refresh list
    } catch (err) {
      console.error("❌ Gagal kirim notifikasi:", err);
      alert("❌ Gagal kirim notifikasi.");
    }
  };
}

async function hapusNotifikasi(id) {
  if (!confirm("Yakin ingin menghapus notifikasi ini?")) return;
  try {
    await firebase.firestore().collection("notifikasi_umum").doc(id).delete();
    alert("🗑 Notifikasi berhasil dihapus.");
    formNotifikasiAdmin(); // refresh tampilan
  } catch (err) {
    console.error("❌ Gagal hapus:", err);
    alert("❌ Gagal menghapus notifikasi.");
  }
}


function tampilkanFloatingAlert(judul, pesan, opsi = {}) {
  let box = document.getElementById("floating-alert");

  // Jika belum ada elemen, buat
  if (!box) {
    box = document.createElement("div");
    box.id = "floating-alert";
    box.className = "floating-alert";
    document.body.appendChild(box);
  }

  // Opsi: apakah ini notifikasi admin?
  if (opsi.admin) box.classList.add("-admin-notif");
  else box.classList.remove("-admin-notif");

  // Isi konten
  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${judul}</strong><br>${pesan}
      </div>
      <button onclick="document.getElementById('floating-alert').classList.remove('show')" style="margin-left:10px;background:none;border:none;font-size:18px;cursor:pointer;">✖</button>
    </div>
  `;

  // Tampilkan
  box.classList.add("show");

  // Jika tidak disetel sebagai `persist`, maka auto-close
  if (!opsi.persist) {
    clearTimeout(box._hideTimeout);
    box._hideTimeout = setTimeout(() => {
      box.classList.remove("show");
    }, opsi.timeout || 5000);
  }
}



async function lihatLogPesananDriver(idPesanan) {
  const db = firebase.firestore();
  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `<p>🔄 Memuat log driver...</p>`;
  modal.style.display = "flex";

  try {
    const snap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (snap.empty) {
      container.innerHTML = `<p style="color:red;">❌ Log tidak ditemukan untuk ID: ${idPesanan}</p>`;
      return;
    }

    const data = snap.docs[0].data();
    const driverId = data.idDriver || "(Tidak diketahui)";
    const statusDriver = data.status || "-";
    const logs = Array.isArray(data.stepsLog) ? data.stepsLog : [];

    // 🔍 Ambil rating + ulasan dari log_driver berdasarkan idPesanan
    const ratingSnap = await db.collection("log_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    let ratingHTML = "<p><em>Belum ada rating untuk driver.</em></p>";
    if (!ratingSnap.empty) {
      const ratingData = ratingSnap.docs[0].data();
      ratingHTML = `
        <p><strong>Rating Driver:</strong> ${"⭐".repeat(ratingData.rating || 0)} (${ratingData.rating || 0}/5)</p>
        <p><strong>Ulasan:</strong> ${ratingData.komentar || "-"}</p>
      `;
    }

    const logList = logs.length
      ? logs.map(log => {
          const match = log.match(/^(\d{1,2}\.\d{2})\s+(.*)$/);
          if (match) {
            const jam = match[1].replace(".", ":");
            const keterangan = match[2];
            return `<li>✅ <strong>${keterangan}</strong> - <em>${jam}</em></li>`;
          } else {
            return `<li>✅ ${log}</li>`;
          }
        }).join("")
      : "<li>(Belum ada log aktivitas)</li>";

    container.innerHTML = `
      <button onclick="document.getElementById('modal-detail').style.display='none'" 
        style="float:right; font-size:20px; background:none; border:none;">❌</button>
      <h2>📄 Log Aktivitas Driver</h2>
      <p><strong>ID Pesanan:</strong> ${idPesanan}</p>
      <p><strong>ID Driver:</strong> ${driverId}</p>
      <p><strong>Status Saat Ini:</strong> ${statusDriver}</p>

      <h3 style="margin-top:20px;">📝 Log Perjalanan:</h3>
      <ul>${logList}</ul>

      <h3 style="margin-top:20px;">🌟 Rating & Ulasan:</h3>
      ${ratingHTML}
    `;
  } catch (err) {
    console.error("❌ Gagal ambil log:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal mengambil data log driver.</p>`;
  }
}


async function bukaModalDetailPesananAdmin(id) {
  const db = firebase.firestore();
  const container = document.querySelector("#modal-detail .modal-content");
  const modal = document.getElementById("modal-detail");

  try {
    const doc = await db.collection("pesanan").doc(id).get();
    if (!doc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Pesanan tidak ditemukan.</p>`;
      return;
    }

    const data = doc.data();
    const produkList = Array.isArray(data.produk)
      ? data.produk.map(p => `<li>${p.nama} (${p.jumlah}x) - Rp ${(p.harga * p.jumlah).toLocaleString()}</li>`).join("")
      : "<li>-</li>";

    container.innerHTML = `
      <button onclick="document.getElementById('modal-detail').style.display='none'" 
        style="float:right; font-size:20px; background:none; border:none;">❌</button>
      <h2>📦 Detail Pesanan</h2>
      <p><strong>Nama Pembeli:</strong> ${data.namaPembeli || "-"}</p>
      <p><strong>No HP:</strong> ${data.noHpPembeli || "-"}</p>
      <p><strong>Alamat:</strong> ${data.alamat || "-"}</p>
      <p><strong>Status:</strong> ${data.status || "-"}</p>
      <p><strong>Metode:</strong> ${data.metode || "-"}</p>
      <h3>🛍️ Produk:</h3>
      <ul>${produkList}</ul>
    `;

    modal.style.display = "flex";
  } catch (err) {
    console.error("❌ Gagal ambil detail:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal ambil detail pesanan.</p>`;
  }
}


function editStatusPesanan(id, currentStatus) {
  const statusBaru = prompt("📝 Masukkan status baru pesanan:", currentStatus);
  if (!statusBaru) return alert("❌ Status tidak boleh kosong.");
  if (statusBaru === currentStatus) return alert("⚠️ Status tidak berubah.");

  const db = firebase.firestore();

  db.collection("pesanan").doc(id).update({
    status: statusBaru,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("✅ Status berhasil diperbarui menjadi: " + statusBaru);
    loadContent("pesanan-admin"); // ✅ perbaikan disini
  }).catch(err => {
    console.error("❌ Gagal update status:", err);
    alert("❌ Gagal mengubah status. Cek console untuk detail.");
  });
}


function hapusPesananAdmin(id) {
  if (!confirm("⚠️ Yakin ingin menghapus pesanan ini?")) return;

  firebase.firestore().collection("pesanan").doc(id).delete()
    .then(() => {
      alert("✅ Pesanan berhasil dihapus.");
      renderHalaman("pesanan-admin");
    })
    .catch(err => {
      console.error("❌ Gagal hapus pesanan:", err);
      alert("❌ Gagal menghapus pesanan.");
    });
}



async function renderChatPelanggan({ idPesanan, idCustomer, namaCustomer = "Customer", namaToko = "Seller" }) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Anda tidak memiliki akses.");

  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `
    <div class="chat-header-chat" style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">💬 Chat dengan ${namaCustomer}</h2>
      <button onclick="document.getElementById('modal-detail').style.display='none'" style="font-size:18px;">❌</button>
    </div>

    <div style="margin:5px 0;"><strong>Order ID:</strong> ${idPesanan}</div>
    <div class="chat-info-chat" style="margin-bottom:10px; font-size:14px;">
      <p><strong>Anda:</strong> ${namaToko}</p>
      <p><strong>Customer:</strong> ${namaCustomer}</p>
    </div>

    <div id="chat-box-seller" class="chat-box-chat" style="max-height:300px; overflow-y:auto; padding:10px; border:1px solid #ccc; border-radius:8px; background:#f9f9f9; margin-bottom:10px;"></div>

    <div class="chat-form-chat" style="display:flex; gap:8px; margin-bottom:10px;">
      <input type="text" id="chat-input-seller" placeholder="Ketik pesan..." style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #ccc;" />
      <button onclick="kirimPesanSeller('${idPesanan}', '${user.uid}', '${idCustomer}', '${namaToko}')">Kirim</button>
    </div>

    <div class="chat-templates-chat">
      <p><strong>📋 Template Cepat:</strong></p>
      <div class="template-buttons-chat" style="display:flex; flex-wrap:wrap; gap:6px;">
        <button class="mini-btn-chat" onclick="kirimPesanTemplateSeller('Pesanan Anda sedang diproses.', '${idPesanan}', '${user.uid}', '${idCustomer}', '${namaToko}')">⚙️ Diproses</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplateSeller('Pesanan Anda segera dikirim ya!', '${idPesanan}', '${user.uid}', '${idCustomer}', '${namaToko}')">🚚 Dikirim</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplateSeller('Terima kasih sudah memesan di ${namaToko}.', '${idPesanan}', '${user.uid}', '${idCustomer}', '${namaToko}')">🙏 Terima Kasih</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";

  const chatBox = container.querySelector("#chat-box-seller");

  db.collection("chat_seller")
    .doc(idPesanan)
    .collection("pesan")
    .orderBy("waktu", "asc")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";

      if (snapshot.empty) {
        chatBox.innerHTML = "<p style='text-align:center; color:gray;'>Belum ada pesan.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const isSenderSeller = data.dari === user.uid;
        const posisi = isSenderSeller ? "flex-end" : "flex-start";
        const bgColor = isSenderSeller ? "#d1f1ff" : "#f1f1f1";
        const waktu = data.waktu?.toDate?.() || new Date();

        const bubble = document.createElement("div");
        bubble.style = `
          align-self: ${posisi};
          background: ${bgColor};
          padding: 10px;
          border-radius: 10px;
          margin-bottom: 8px;
          max-width: 70%;
        `;
        bubble.innerHTML = `
          <div style="font-weight:bold; margin-bottom:3px;">${isSenderSeller ? "Anda" : namaCustomer}</div>
          <div>${escapeHTML(data.pesan)}</div>
          <div style="text-align:right; font-size:11px; color:#777;">${waktu.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        chatBox.appendChild(bubble);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

async function kirimPesanSeller(idPesanan, idSeller, idCustomer, namaToko) {
  const input = document.getElementById("chat-input-seller");
  const isiPesan = input.value.trim();
  if (!isiPesan) return;

  const db = firebase.firestore();
  await db.collection("chat_seller").doc(idPesanan).collection("pesan").add({
    dari: idSeller,
    ke: idCustomer,
    nama: namaToko,
    pesan: isiPesan,
    waktu: new Date()
  });

  input.value = "";
}

async function kirimPesanTemplateSeller(teks, idPesanan, idSeller, idCustomer, namaToko) {
  const db = firebase.firestore();
  await db.collection("chat_seller").doc(idPesanan).collection("pesan").add({
    dari: idSeller,
    ke: idCustomer,
    nama: namaToko,
    pesan: teks,
    waktu: new Date()
  });
}

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function chatCustomer(idPesanan, namaPembeli, namaToko) {
  const modal = document.getElementById("modal-detail");
  const content = modal.querySelector(".modal-content");

  content.innerHTML = `
    <div style="position:relative;">
      <button onclick="tutupModalChat()" style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:20px; cursor:pointer;">❌</button>
      <h3>Chat Pesanan: ${idPesanan}</h3>
      <p><strong>Nama Toko:</strong> ${namaToko}<br><strong>Nama Pembeli:</strong> ${namaPembeli}</p>
      <div id="chat-messages" style="height:200px; overflow-y:auto; border:1px solid #ccc; padding:10px; margin:10px 0; background:#f9f9f9;"></div>
      <textarea id="chat-input" placeholder="Tulis pesan..." style="width:100%; padding:10px; border-radius:5px; border:1px solid #ccc;"></textarea>
      <button onclick="kirimPesanChat('${idPesanan}')" style="margin-top:10px; width:100%;">Kirim</button>
    </div>
  `;

  modal.style.display = 'flex';

  const db = firebase.firestore();
  db.collection('chat_pesanan').doc(idPesanan).collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot(snapshot => {
      const box = document.getElementById('chat-messages');
      box.innerHTML = '';
      snapshot.forEach(doc => {
        const d = doc.data();
        const align = d.sender === 'seller' ? 'right' : 'left';
        const bg = d.sender === 'seller' ? '#d1f3ff' : '#f3f3f3';
        box.innerHTML += `
          <div style="text-align:${align}; margin:5px 0;">
            <div style="display:inline-block; background:${bg}; padding:6px 12px; border-radius:10px; max-width:80%;">
              ${d.message}
            </div>
          </div>`;
      });
      box.scrollTop = box.scrollHeight;
    });
}

function tutupModalChat() {
  document.getElementById("modal-detail").style.display = "none";
}


function kirimPesanChat(idPesanan) {
  const input = document.getElementById('chat-input');
  const pesan = input.value.trim();
  if (!pesan) return;

  const db = firebase.firestore();
  db.collection('chat_pesanan').doc(idPesanan).collection('messages').add({
    sender: 'seller',
    message: pesan,
    timestamp: new Date()
  });

  input.value = '';
}

function hitungJarakKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function konfirmasiPesanan(docId, idPesanan) {
  const db = firebase.firestore();

  try {
    const pesananDoc = await db.collection("pesanan_penjual").doc(docId).get();
    if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");
    const pesanan = pesananDoc.data();

    const tokoDoc = await db.collection("toko").doc(pesanan.idToko).get();
    if (!tokoDoc.exists) return alert("❌ Data toko tidak ditemukan.");
    const toko = tokoDoc.data();

    const lokasiToko = {
      lat: toko.koordinat.latitude,
      lng: toko.koordinat.longitude
    };
    const lokasiCustomer = {
      lat: pesanan.lokasiPembeli.latitude,
      lng: pesanan.lokasiPembeli.longitude
    };

    const hitungJarakKm = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const driverSnap = await db.collection("driver").where("status", "==", "aktif").get();
    const calonDriver = [];

    for (const doc of driverSnap.docs) {
      const driver = doc.data();
      const lokasi = driver.lokasi;
      if (!lokasi?.lat || !lokasi?.lng) continue;

      const pesananAktifSnap = await db.collection("pesanan_driver")
        .where("idDriver", "==", driver.idDriver || doc.id).get();

      const punyaPesananAktif = pesananAktifSnap.docs.some(p => {
        const s = p.data().status;
        return s !== "Selesai" && s !== "Pesanan Diterima";
      });

      if (punyaPesananAktif) continue;

      const jarak = hitungJarakKm(lokasi.lat, lokasi.lng, lokasiToko.lat, lokasiToko.lng);
      calonDriver.push({
        idDriver: driver.idDriver || doc.id,
        jarak
      });
    }

    if (calonDriver.length === 0) {
      return alert("❌ Tidak ada driver aktif yang memenuhi syarat.");
    }

    calonDriver.sort((a, b) => a.jarak - b.jarak);

    const now = new Date();
    const jamMenit = `${now.getHours().toString().padStart(2, "0")}.${now.getMinutes().toString().padStart(2, "0")}`;

    const {
      biayaLayanan = 0,
      catatan = "",
      estimasiKirim = 0,
      estimasiMasak = 0,
      estimasiTotal = 0,
      metode = "-",
      noHpPembeli = "-",
      pengiriman = "-",
      subtotalProduk = 0,
      total = 0,
      totalOngkir = 0,
      idToko = "-",
      alamatPengiriman = "-",
      produk = []
    } = pesanan;

    // Ambil nama pembeli dari pesanan utama (jika ada)
    let namaPembeli = pesanan.namaPembeli || "Customer";

    try {
      const pesananUtama = await db.collection("pesanan").doc(idPesanan).get();
      if (pesananUtama.exists) {
        const dataUtama = pesananUtama.data();
        namaPembeli = dataUtama.namaCustomer || dataUtama.namaPembeli || namaPembeli;
      }
    } catch (e) {
      console.warn("❌ Tidak bisa ambil nama dari pesanan utama:", e);
    }

    // ✅ Update status pesanan_penjual
    await db.collection("pesanan_penjual").doc(docId).update({
      status: "Menunggu Driver",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // ✅ Update status dan stepsLog pesanan utama
    await db.collection("pesanan").doc(idPesanan).update({
      status: "Menunggu Driver",
      stepsLog: firebase.firestore.FieldValue.arrayUnion(`${jamMenit} Menunggu Driver`)
    });

    // ✅ Simpan ke pending driver
    await db.collection("pesanan_driver_pending").doc(docId).set({
      idPesanan,
      idToko,
      lokasiToko,
      lokasiCustomer,
      alamatCustomer: alamatPengiriman,
      produk,
      status: "Menunggu",
      calonDriver: calonDriver.map(d => d.idDriver),
      jarakDriver: calonDriver[0].jarak,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      biayaLayanan,
      catatan,
      estimasiKirim,
      estimasiMasak,
      estimasiTotal,
      metode,
      namaPembeli,
      noHpPembeli,
      pengiriman,
      subtotalProduk,
      total,
      totalOngkir
    });

    alert("✅ Pesanan berhasil dikonfirmasi dan dikirim ke driver aktif terdekat.");
    loadContent("seller-pesanan");

  } catch (err) {
    console.error("❌ Gagal konfirmasi pesanan:", err);
    alert("❌ Terjadi kesalahan saat konfirmasi pesanan.");
  }
}



















function tampilkanFloatingBox(pesan) {
  const box = document.createElement("div");
  box.className = "floating-notif";
  box.innerHTML = pesan;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 6000);
}

// ✅ Menampilkan Floating Window Pesanan
function tampilkanFloatingWindowPesanan(data) {
  const idPesanan = data.idPesanan || "-";
  const idDoc = data.idDoc || "-";  // ⬅️ doc.id dari pesanan_driver
  const metode = (data.metode || "-").toUpperCase();
  const jarak = data.jarakTokoKeCustomer != null ? data.jarakTokoKeCustomer : "-";
  const total = (data.total || 0).toLocaleString("id-ID");

  // Hapus jika sudah ada
  const existing = document.getElementById("floating-order-box");
  if (existing) existing.remove();

  // Buat elemen
  const floatBox = document.createElement("div");
  floatBox.id = "floating-order-box";
  floatBox.className = "floating-order-window";
  floatBox.innerHTML = `
    <div class="floating-header">
      <strong>📦 Pesanan Baru</strong>
      <button class="btn-close-window" onclick="document.getElementById('floating-order-box').remove()">✖</button>
    </div>
    <div class="floating-body">
      <p><strong>ID:</strong> ${idPesanan}</p>
      <p><strong>Metode:</strong> ${metode}</p>
      <p><strong>Jarak:</strong> ${jarak} km</p>
      <p><strong>Total:</strong> Rp ${total}</p>
      <button onclick="bukaDetailPesananDriver('${p.id}', '${p.idPesanan}')">🔍 Detail</button>
    </div>
  `;
  document.body.appendChild(floatBox);

  playNotifikasiSuara();
}


// ✅ Notifikasi Mengambang (bawah)
function tampilkanNotifikasiDriver(data) {
  const idPesanan = data.idPesanan || "-";
  const metode = (data.metode || "-").toUpperCase();
  const jarak = data.jarakTokoKeCustomer != null ? data.jarakTokoKeCustomer : "-";

  const box = document.createElement("div");
  box.className = "notif-float-driver";
  box.innerHTML = `
    <strong>📦 Pesanan Baru!</strong><br>
    ID: ${idPesanan}<br>
    Jarak: ${jarak} km<br>
    Metode: ${metode}
  `;
  document.body.appendChild(box);

  setTimeout(() => {
    box.classList.add("hide");
    setTimeout(() => box.remove(), 500);
  }, 5000);

  playNotifikasiSuara();
}

// ✅ Listener Real-Time Pesanan Baru Driver
function listenPesananBaruDriver(driverUid) {
  const db = firebase.firestore();

  db.collection("pesanan_driver")
    .where("idDriver", "==", driverUid)
    .orderBy("createdAt", "desc")
    .limit(5)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data();
          tampilkanFloatingWindowPesanan(data);     // Tampilkan window utama
          tampilkanNotifikasiDriver(data);          // Notif kecil bawah
        }
      });
    });
}

// ✅ Fungsi Pemutar Suara
function playNotifikasiSuara() {
  const audio = new Audio("https://www.myinstants.com/media/sounds/notification-sound.mp3");
  audio.play().catch(() => {
    console.warn("🔇 Gagal memutar notifikasi suara.");
  });
}



async function renderAdminLiveChatPanel() {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat Live Chat...</p>`;

  const db = firebase.firestore();
  const adminUid = "JtD1wA2wkzVg6SWwWSFTxFZMhxO2";

  try {
    // Ambil status live chat dari pengaturan/liveChatStatus
    const settingDoc = await db.collection("pengaturan").doc("liveChatStatus").get();
    const liveChatStatus = settingDoc.exists ? settingDoc.data().status || "offline" : "offline";

    // Ambil chat terbaru (limit 50)
    const chatSnapshot = await db.collection("chat")
      .orderBy("waktu", "desc")
      .limit(50)
      .get();

    const usersMap = new Map();

    chatSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const otherUid = data.dari !== adminUid ? data.dari : data.ke;
      if (!usersMap.has(otherUid)) {
        usersMap.set(otherUid, { lastChat: data.waktu, unreadCount: 0 });
      }
    });

    // Hitung unread pesan per user (pesan dari user ke admin yang belum dibaca)
    const unreadSnapshot = await db.collection("chat")
      .where("ke", "==", adminUid)
      .where("status_baca", "==", false)
      .get();

    unreadSnapshot.forEach(doc => {
      const data = doc.data();
      if (usersMap.has(data.dari)) {
        usersMap.get(data.dari).unreadCount++;
      }
    });

    container.innerHTML = `
      <h2>💬 Live Chat Admin</h2>
      <div>
        Status Live Chat: 
        <span id="live-chat-status" style="font-weight:bold; color:${liveChatStatus === 'online' ? 'green' : 'red'};">
          ${liveChatStatus.toUpperCase()}
        </span>
        <button id="toggle-live-chat-btn" style="margin-left:10px; padding: 6px 12px; border-radius: 6px; cursor: pointer; background: #2196f3; color: white; border: none;">
          Ubah ke ${liveChatStatus === 'online' ? 'OFFLINE' : 'ONLINE'}
        </button>
      </div>
      <hr />
      <div id="live-chat-users-list" style="max-height: 400px; overflow-y:auto; margin-top:10px;">
        ${usersMap.size === 0 ? "<p>Tidak ada chat aktif.</p>" : ""}
      </div>
      <div id="live-chat-chatbox" style="margin-top:20px;">
        <!-- Chat box akan muncul di sini setelah klik user -->
      </div>
    `;

    // Render list user dengan badge unread
    const usersListElem = document.getElementById("live-chat-users-list");
    usersMap.forEach((val, key) => {
      const badge = val.unreadCount > 0
        ? `<span style="background:red; color:white; padding:2px 6px; border-radius:12px; font-size:12px; margin-left:6px;">${val.unreadCount}</span>`
        : "";
      const userBtn = document.createElement("button");
      userBtn.innerHTML = `${key}${badge}`;
      userBtn.style = "display:block; width:100%; text-align:left; padding:8px; cursor:pointer; border:none; background:#f0f0f0; margin-bottom:4px; border-radius:6px;";
      userBtn.onclick = () => openLiveChatWithUser(key);
      usersListElem.appendChild(userBtn);
    });

    // Toggle status live chat
    document.getElementById("toggle-live-chat-btn").onclick = async () => {
      const newStatus = liveChatStatus === "online" ? "offline" : "online";
      await db.collection("pengaturan").doc("liveChatStatus").set({ status: newStatus });
      alert("Status live chat diubah menjadi: " + newStatus.toUpperCase());
      renderAdminLiveChatPanel(); // Reload panel supaya update status dan tombol
    };
  } catch (error) {
    container.innerHTML = `<p style="color:red;">Terjadi kesalahan: ${error.message}</p>`;
  }
}

// Fungsi buka chat dengan user
async function openLiveChatWithUser(userId) {
  const container = document.getElementById("live-chat-chatbox");
  container.innerHTML = `<p>Memuat chat dengan ${userId}...</p>`;

  const db = firebase.firestore();
  const adminUid = "JtD1wA2wkzVg6SWwWSFTxFZMhxO2";

  // Render header + pesan + input
  container.innerHTML = `
    <h3>Chat dengan User: ${userId}</h3>
    <div id="chat-messages" style="height:300px; overflow-y:auto; border:1px solid #ccc; padding:8px; border-radius:8px; background:#fafafa; display:flex; flex-direction: column; gap:6px;"></div>
    <div style="margin-top:8px; display:flex; gap:8px;">
      <input type="text" id="chat-input" placeholder="Ketik pesan..." style="flex-grow: 1; padding:6px; border-radius:6px; border:1px solid #ccc;" />
      <button id="send-chat-btn" style="padding:6px 12px; border-radius:6px; background:#4caf50; color:white; border:none; cursor:pointer;">Kirim</button>
    </div>
  `;

  const messagesElem = document.getElementById("chat-messages");
  const inputElem = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-chat-btn");

  // Load chat realtime dengan unsubscribe jika ada
  if (window.unsubscribeChatLive) window.unsubscribeChatLive();
  window.unsubscribeChatLive = db.collection("chat")
    .where("dari", "in", [userId, adminUid])
    .where("ke", "in", [userId, adminUid])
    .orderBy("waktu", "asc")
    .onSnapshot(snapshot => {
      messagesElem.innerHTML = "";
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const isAdmin = data.dari === adminUid;
        const bubble = document.createElement("div");
        bubble.style.marginBottom = "6px";
        bubble.style.padding = "8px";
        bubble.style.borderRadius = "10px";
        bubble.style.maxWidth = "70%";
        bubble.style.backgroundColor = isAdmin ? "#dcf8c6" : "#fff";
        bubble.style.alignSelf = isAdmin ? "flex-end" : "flex-start";
        bubble.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
        bubble.textContent = data.isi;
        messagesElem.appendChild(bubble);

        // Tandai pesan user ke admin sudah dibaca
        if (!isAdmin && data.status_baca === false) {
          doc.ref.update({ status_baca: true });
        }
      });
      messagesElem.scrollTop = messagesElem.scrollHeight;
    });

  // Kirim pesan admin ke user
  sendBtn.onclick = async () => {
    const text = inputElem.value.trim();
    if (!text) return;

    await db.collection("chat").add({
      dari: adminUid,
      ke: userId,
      isi: text,
      waktu: new Date(),
      status_baca: false
    });

    inputElem.value = "";
  };
}




async function hitungTotalFeePerusahaan(db) {
  const snapshot = await db.collection("pesanan")
    .orderBy("waktuPesan", "desc")
    .limit(100)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  let totalFeeKeseluruhan = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const status = (data.status || "").toLowerCase();
    if (status !== "selesai") continue;

    const subtotal = data.subtotalProduk || 0;
    const ongkir = data.totalOngkir || 0;
    const totalTransaksi = subtotal + ongkir;

    const biayaLayanan = Math.round(totalTransaksi * 0.01);
    const biayaToko = Math.round(subtotal * 0.05);
    const biayaDriver = Math.round(ongkir * 0.05);
    const totalFee = biayaLayanan + biayaToko + biayaDriver;

    totalFeeKeseluruhan += totalFee;
  }

  return totalFeeKeseluruhan;
}

function isiTemplate(pesan) {
  const input = document.getElementById("input-chat");
  if (input) {
    input.value = pesan;
    input.focus();
  }
}


async function kirimPesanKeAdmin() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const uid = user.uid;
  const adminUid = "JtD1wA2wkzVg6SWwWSFTxFZMhxO2";
  const input = document.getElementById("input-chat");
  const isiPesan = input.value.trim();
  if (!isiPesan) return;

  const db = firebase.firestore();
  const waktu = firebase.firestore.Timestamp.now();
  const chatId = [uid, adminUid].sort().join("_");

  // Tambahkan pesan user
  await db.collection("chat").add({
    dari: uid,
    ke: adminUid,
    chatId: chatId,
    isi: isiPesan,
    waktu: waktu
  });

  input.value = "";

  // Balasan otomatis sistem
  const isiLower = isiPesan.toLowerCase();
  let balasan = "";

  if (isiLower.includes("topup")) {
    balasan = "🔁 Untuk topup saldo, silakan gunakan menu Dompet → Top Up.";
  } else if (isiLower.includes("login")) {
    balasan = "🔒 Jika mengalami kendala login, coba logout lalu login kembali.";
  } else if (isiLower.includes("tarik")) {
    balasan = "💸 Penarikan saldo bisa dilakukan di menu Dompet → Tarik Saldo.";
  } else if (isiLower.includes("biaya")) {
    balasan = "💡 Penggunaan normal tidak dikenakan biaya tambahan.";
  } else if (isiLower.includes("verifikasi")) {
    balasan = "🕒 Proses verifikasi akun membutuhkan waktu 1–2 hari kerja.";
  }

  if (balasan) {
    await db.collection("chat").add({
      dari: "SISTEM",
      ke: uid,
      chatId: chatId,
      isi: balasan,
      waktu: firebase.firestore.Timestamp.now()
    });
  }
}




async function renderChatBox() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const uid = user.uid;
  const adminUid = "JtD1wA2wkzVg6SWwWSFTxFZMhxO2";
  const chatBox = document.querySelector(".-admin-chat-box");
  const timestampElem = document.getElementById("chat-timestamp");
  const avatarDefault = "https://w7.pngwing.com/pngs/205/731/png-transparent-default-avatar.png";

  if (!chatBox || !timestampElem) return;

  const db = firebase.firestore();
  const chatId = [uid, adminUid].sort().join("_");

  db.collection("chat")
    .where("chatId", "==", chatId)
    .orderBy("waktu", "asc")
    .onSnapshot(async (snapshot) => {
      chatBox.innerHTML = "";
      let lastTimestamp = "";

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const isSender = data.dari === uid;
        const waktuDate = data.waktu?.toDate();
        const waktuStr = waktuDate?.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit"
        }) || "";

        if (waktuDate) {
          lastTimestamp = waktuDate.toLocaleString("id-ID", {
            dateStyle: "short",
            timeStyle: "short"
          });
        }

        let namaPengirim = "";
        let avatar = avatarDefault;

        if (data.dari === uid) {
          namaPengirim = "Kamu";
        } else if (data.dari === "SISTEM") {
          namaPengirim = "[Sistem]";
        } else {
          const adminDoc = await db.collection("users").doc(adminUid).get();
          namaPengirim = adminDoc.exists ? adminDoc.data().nama || "Admin" : "Admin";
        }

        const pesanElem = document.createElement("div");
        pesanElem.className = "-admin-chat-message " + (isSender ? "right" : "left");
        pesanElem.innerHTML = `
          <img class="-admin-chat-avatar" src="${avatar}" />
          <div class="-admin-chat-bubble">
            <div class="-admin-chat-nama">${namaPengirim}</div>
            <div class="-admin-chat-isi">${data.isi}</div>
            <div class="-admin-chat-waktu">${waktuStr}</div>
          </div>
        `;
        chatBox.appendChild(pesanElem);
      }

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}


function showChatPopupNotification(pesan) {
  const notif = document.createElement("div");
  notif.className = "chat-popup-notif";
  notif.innerHTML = `
    <div class="chat-popup-content">
      <strong>📩 Pesan Baru dari Admin</strong>
      <p>${pesan}</p>
    </div>
  `;

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.classList.add("show");
  }, 100);

  // Sembunyikan otomatis dalam 5 detik
  setTimeout(() => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 300);
  }, 5000);
}



async function hubungkanKeAdmin() {
  const db = firebase.firestore();

  try {
    const statusDoc = await db.collection("pengaturan").doc("liveChatStatus").get();
    const input = document.getElementById("input-chat");

    if (statusDoc.exists && statusDoc.data().status === "online") {
      // ✅ Admin sedang online
      if (input) {
        input.focus();
        input.value = "";
      }
      alert("✅ Admin sedang online! Silakan ketik pesan dan kirim sekarang.");
    } else {
      // ❌ Admin sedang offline
      alert("⚠️ Admin sedang tidak tersedia saat ini. Tinggalkan pesan dan kami akan membalas secepatnya.");
    }
  } catch (error) {
    console.error("❌ Gagal cek status live chat admin:", error);
    alert("❌ Gagal memeriksa status admin. Coba lagi nanti.");
  }
}






async function loadRiwayatPesanAdmin() {
  const db = firebase.firestore();
  const riwayatEl = document.getElementById("riwayat-pesan");
  const listEl = document.createElement("div");
  listEl.className = "card-list-view";
  riwayatEl.innerHTML = `<h3>📜 Riwayat Pesan</h3>`;

  try {
    const snap = await db
      .collectionGroup("pesan")
      .where("dari", "==", "Admin")
      .orderBy("waktu", "desc")
      .limit(20)
      .get();

    if (snap.empty) {
      riwayatEl.innerHTML += `<p><em>Belum ada riwayat pesan terkirim.</em></p>`;
      return;
    }

    snap.forEach(doc => {
      const data = doc.data();
      const refPath = doc.ref.path;
      const waktu = data.waktu?.toDate?.() || new Date();
      const tanggal = waktu.toLocaleDateString("id-ID");
      const jam = waktu.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
      const isDriver = refPath.includes("pesan_driver");
      const tujuanID = doc.ref.parent.parent.id;
      const tujuan = isDriver ? `🛵 Driver (${tujuanID})` : `🏪 Seller (${tujuanID})`;

      const card = document.createElement("div");
      card.className = "pesan-card";
      card.innerHTML = `
        <div class="pesan-info">
          <div class="pesan-header">
            <strong>${tujuan}</strong> - <small>${tanggal} ${jam}</small>
          </div>
          <div><strong>Perihal:</strong> ${data.perihal || "-"}</div>
          <div><strong>Keterangan:</strong> ${data.keterangan || data.pesan || "-"}</div>
          <div><strong>ID Order:</strong> ${data.idPesanan || "-"}</div>
          <div class="action-buttons">
            <button onclick="hapusPesan('${doc.ref.path}')" class="btn-mini btn-red">🗑 Hapus</button>
            <button onclick='editPesan("${doc.ref.path}", "${data.perihal || ""}", "${data.keterangan || data.pesan || ""}")' class="btn-mini">✏️ Edit</button>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });

    riwayatEl.appendChild(listEl);

  } catch (err) {
    console.error("❌ Gagal memuat riwayat:", err);
    riwayatEl.innerHTML += `<p style="color:red;">❌ Gagal memuat: ${err.message}</p>`;
  }
}



async function loadTargetDropdown() {
  const role = document.getElementById("role").value;
  const dropdown = document.getElementById("targetId");
  dropdown.innerHTML = `<option value="">⏳ Memuat...</option>`;

  const db = firebase.firestore();
  let query;

  if (role === "driver") {
    query = await db.collection("driver").get();
  } else {
    query = await db.collection("toko").get();
  }

  let options = `<option value="">-- Pilih --</option>`;
  query.forEach(doc => {
    const data = doc.data();
    const name = data.nama || data.namaToko || "Tanpa Nama";
    options += `<option value="${doc.id}">${name} / ${doc.id}</option>`;
  });

  dropdown.innerHTML = options;
}

async function kirimPesanKeTarget() {
  const role = document.getElementById("role").value;
  const targetId = document.getElementById("targetId").value.trim();
  const perihal = document.getElementById("perihal").value.trim();
  const keterangan = document.getElementById("pesan").value.trim();

  if (!targetId || !perihal || !keterangan) {
    return alert("❌ Semua kolom wajib diisi!");
  }

  const db = firebase.firestore();
  const waktu = new Date();

  const data = {
    waktu,
    perihal,
    keterangan,
    dari: "Admin"
  };

  try {
    if (role === "driver") {
      await db.collection("pesan_driver").doc(targetId).collection("pesan").add(data);
    } else {
      await db.collection("pesan_toko").doc(targetId).collection("pesan").add(data);
    }

    alert("✅ Pesan berhasil dikirim!");
    document.getElementById("perihal").value = "";
    document.getElementById("pesan").value = "";
  } catch (err) {
    alert("❌ Gagal mengirim pesan: " + err.message);
  }
}



async function bukaModalPesanDriver() {
  // Cek apakah modal sudah ada, jika belum buat modal baru
  let modal = document.getElementById("modal-detail");
  
  if (!modal) {
    // Buat modal jika belum ada
    modal = document.createElement('div');
    modal.id = 'modal-detail';
    modal.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 80%;
      overflow-y: auto;
      position: relative;
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Tambahkan event listener untuk close modal ketika klik di luar
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
  
  const content = modal.querySelector(".modal-content");
  modal.style.display = "flex";
  content.innerHTML = `
    <div class="flex items-center justify-center p-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p class="text-gray-600">Memuat pesan...</p>
      </div>
    </div>
  `;

  const user = firebase.auth().currentUser;
  if (!user) {
    content.innerHTML = `
      <div class="p-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <i class="fas fa-exclamation-triangle text-red-500 text-xl mb-2"></i>
          <p class="text-red-800 font-medium">Kamu belum login</p>
        </div>
        <div class="text-right mt-4">
          <button onclick="document.getElementById('modal-detail').style.display='none'" 
            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
            Tutup
          </button>
        </div>
      </div>
    `;
    return;
  }

  const db = firebase.firestore();

  try {
    // Cari dokumen driver dengan idDriver = user.uid
    const driverSnap = await db.collection("driver")
      .where("idDriver", "==", user.uid)
      .limit(1)
      .get();

    if (driverSnap.empty) throw new Error("Data driver tidak ditemukan");

    const driverDocId = driverSnap.docs[0].id;

    const snapshot = await db.collection("pesan_driver")
      .doc(driverDocId)
      .collection("pesan")
      .orderBy("waktu", "desc")
      .limit(20)
      .get();

    if (snapshot.empty) {
      content.innerHTML = `
        <div class="p-4">
          <div class="bg-gray-50 rounded-lg p-6 text-center">
            <i class="fas fa-inbox text-gray-400 text-3xl mb-3"></i>
            <p class="text-gray-600 font-medium">Tidak ada pesan masuk</p>
            <p class="text-gray-500 text-sm mt-1">Pesan dari admin akan muncul di sini</p>
          </div>
          <div class="text-right mt-4">
            <button onclick="document.getElementById('modal-detail').style.display='none'" 
              class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
              Tutup
            </button>
          </div>
        </div>
      `;
      return;
    }

    let pesanList = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-envelope text-blue-600"></i>
            Pesan Masuk Driver
          </h2>
          <span class="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">${snapshot.size} pesan</span>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th class="p-3 border border-gray-200 text-left text-sm font-semibold text-gray-700">No</th>
                <th class="p-3 border border-gray-200 text-left text-sm font-semibold text-gray-700">Waktu</th>
                <th class="p-3 border border-gray-200 text-left text-sm font-semibold text-gray-700">Perihal</th>
                <th class="p-3 border border-gray-200 text-left text-sm font-semibold text-gray-700">Keterangan</th>
                <th class="p-3 border border-gray-200 text-left text-sm font-semibold text-gray-700">Dari</th>
              </tr>
            </thead>
            <tbody>
    `;

    let no = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      const waktu = data.waktu?.toDate?.().toLocaleString("id-ID") || "-";
      const isImportant = (data.perihal || "").toLowerCase().includes("penting");
      
      pesanList += `
        <tr class="${isImportant ? 'bg-yellow-50' : 'hover:bg-gray-50'}">
          <td class="p-3 border border-gray-200 text-sm text-gray-600">${no++}</td>
          <td class="p-3 border border-gray-200 text-sm text-gray-600">${waktu}</td>
          <td class="p-3 border border-gray-200 text-sm font-medium ${isImportant ? 'text-red-600' : 'text-gray-700'}">
            ${data.perihal || "-"}
            ${isImportant ? ' <span class="text-red-500 text-xs">⚡</span>' : ''}
          </td>
          <td class="p-3 border border-gray-200 text-sm text-gray-600">${data.keterangan || "-"}</td>
          <td class="p-3 border border-gray-200 text-sm text-gray-600">${data.dari || "Admin"}</td>
        </tr>
      `;
    });

    pesanList += `</tbody></table></div>`;

    content.innerHTML = `
      ${pesanList}
      <div class="text-right mt-4">
        <button onclick="document.getElementById('modal-detail').style.display='none'" 
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          Tutup
        </button>
      </div>
    `;
  } catch (err) {
    console.error("Error loading messages:", err);
    content.innerHTML = `
      <div class="p-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <i class="fas fa-exclamation-circle text-red-500 text-xl mb-2"></i>
          <p class="text-red-800 font-medium">Gagal memuat pesan</p>
          <p class="text-red-600 text-sm mt-1">${err.message}</p>
        </div>
        <div class="text-right mt-4">
          <button onclick="document.getElementById('modal-detail').style.display='none'" 
            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
            Tutup
          </button>
        </div>
      </div>
    `;
  }
}




async function bukaModalPesan(idTokoDoc) {
  const modal = document.getElementById("modal-detail");
  const content = modal.querySelector(".modal-content");
  modal.style.display = "flex";
  content.innerHTML = `<p>⏳ Memuat pesan...</p>`;

  const db = firebase.firestore();

  try {
    const tokoSnap = await db.collection("toko").doc(idTokoDoc).get();

    if (!tokoSnap.exists) {
      content.innerHTML = `<p style="color:red;">❌ Data toko tidak ditemukan.</p>`;
      return;
    }

    const idToko = tokoSnap.data().idToko;

    const snapshot = await db
      .collection("pesan_toko")
      .doc(idToko)
      .collection("pesan")
      .orderBy("waktu", "desc")
      .limit(20)
      .get();

    if (snapshot.empty) {
      content.innerHTML = `
        <p>📭 Tidak ada pesan masuk.</p>
        <div style="text-align:right; margin-top:12px;">
          <button onclick="modal.style.display='none'" style="background:#aaa;color:#fff;padding:6px 12px;border:none;border-radius:6px;">Tutup</button>
        </div>
      `;
      return;
    }

    let pesanList = `
      <h2 style="margin-bottom:12px;">📩 Pesan Masuk Toko</h2>
      <table style="
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        table-layout: fixed;
        word-wrap: break-word;
      ">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:6px; border:1px solid #ccc; width:5%;">No</th>
            <th style="padding:6px; border:1px solid #ccc; width:20%;">Waktu</th>
            <th style="padding:6px; border:1px solid #ccc; width:20%;">Perihal</th>
            <th style="padding:6px; border:1px solid #ccc; width:40%;">Keterangan</th>
            <th style="padding:6px; border:1px solid #ccc; width:15%;">Dari</th>
          </tr>
        </thead>
        <tbody>
    `;

    let no = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      const waktu = data.waktu?.toDate?.().toLocaleString("id-ID") || "-";
      pesanList += `
        <tr>
          <td style="padding:6px; border:1px solid #ccc;">${no++}</td>
          <td style="padding:6px; border:1px solid #ccc;">${waktu}</td>
          <td style="padding:6px; border:1px solid #ccc;">${data.perihal || "-"}</td>
          <td style="padding:6px; border:1px solid #ccc;">${data.keterangan || "-"}</td>
          <td style="padding:6px; border:1px solid #ccc;">${data.dari || "Admin"}</td>
        </tr>
      `;
    });

    pesanList += `</tbody></table>`;

    content.innerHTML = `
      ${pesanList}
      <div style="text-align:right; margin-top:12px;">
        <button onclick="document.getElementById('modal-detail').style.display='none'"
          style="background:#aaa; color:#fff; padding:6px 12px; border:none; border-radius:6px;">
          Tutup
        </button>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `
      <p style="color:red;">❌ Gagal memuat pesan: ${err.message}</p>
      <div style="text-align:right; margin-top:12px;">
        <button onclick="document.getElementById('modal-detail').style.display='none'"
          style="background:#aaa; color:#fff; padding:6px 12px; border:none; border-radius:6px;">
          Tutup
        </button>
      </div>
    `;
  }
}








async function lihatLogPesananSeller(idPesanan, idToko) {
  const modal = document.getElementById("modal-detail");
  const modalContent = modal?.querySelector(".modal-content");

  if (!modal || !modalContent) {
    console.error("Modal atau modal-content tidak ditemukan.");
    return;
  }

  modal.style.display = "flex";
  modalContent.innerHTML = `<p>⏳ Memuat data pesanan untuk toko ini...</p>`;

  const db = firebase.firestore();

  try {
    // Cari data berdasarkan idPesanan & idToko
    const snap = await db.collection("pesanan_penjual")
      .where("idPesanan", "==", idPesanan)
      .where("idToko", "==", idToko)
      .limit(1)
      .get();

    if (snap.empty) {
      modalContent.innerHTML = `<p style="color:red;">❌ Data tidak ditemukan untuk toko ini.</p>`;
      return;
    }

    const pesanan = snap.docs[0].data();
    const produkList = pesanan.produk || [];
    const catatanPembeli = pesanan.catatan || "-";
    const metodePengiriman = pesanan.pengiriman || "-";

    let daftarProdukHTML = "<p>Tidak ada produk.</p>";
    let subtotalProduk = 0;
    let totalOngkir = 0;

    if (produkList.length > 0) {
      daftarProdukHTML = "<ul style='padding-left:16px;'>";
      produkList.forEach((item, i) => {
        const nama = item.nama || "-";
        const qty = item.qty || 1;
        const harga = item.harga || 0;
        const total = harga * qty;
        subtotalProduk += total;
        totalOngkir += item.ongkir || 0;

        daftarProdukHTML += `
          <li style="margin-bottom: 5px;">
            <b>${i + 1}. ${nama}</b><br>
            <span style="font-size:14px;">x${qty} - Rp${total.toLocaleString("id-ID")}</span>
          </li>`;
      });
      daftarProdukHTML += "</ul>";
    }

    const totalBiaya = subtotalProduk + totalOngkir;

    modalContent.innerHTML = `
      <div style="font-family: 'Arial', sans-serif; padding: 10px; line-height: 1.4;">
        <h2 style="font-size: 20px; margin: 0;">🧾 Detail Pesanan</h2>
        <hr style="border: 1px solid #ddd; margin: 10px 0;">
        
        <p><strong>Order ID:</strong> ${idPesanan}</p>
        <p><strong>ID Toko:</strong> ${idToko}</p>

        <h3 style="margin: 10px 0; font-size: 16px;">📦 Daftar Produk:</h3>
        ${daftarProdukHTML}

        <h3 style="margin: 10px 0; font-size: 16px;">📝 Catatan Pembeli:</h3>
        <p style="font-size:14px;">${catatanPembeli}</p>

        <h3 style="margin: 10px 0; font-size: 16px;">💵 Subtotal Produk:</h3>
        <p style="font-size:14px;">Rp ${subtotalProduk.toLocaleString("id-ID")}</p>

        <h3 style="margin: 10px 0; font-size: 16px;">🚚 Total Ongkir:</h3>
        <p style="font-size:14px;">Rp ${totalOngkir.toLocaleString("id-ID")}</p>

        <h3 style="margin: 10px 0; font-size: 16px;">💳 Total Biaya:</h3>
        <p style="font-size:16px; font-weight: bold;">Rp ${totalBiaya.toLocaleString("id-ID")}</p>

        <h3 style="margin: 10px 0; font-size: 16px;">🚚 Metode Pengiriman:</h3>
        <p style="font-size:14px;">${metodePengiriman}</p>

        <div style="text-align:right; margin-top: 20px;">
          <button onclick="document.getElementById('modal-detail').style.display='none'" 
                  style="padding:6px 12px; background:#888; color:#fff; border:none; border-radius:6px; font-size:14px;">Tutup</button>
          <button onclick="printStruk('${idPesanan}', '${idToko}')" 
                  style="padding:6px 12px; background:#4CAF50; color:#fff; border:none; border-radius:6px; font-size:14px;">🖨️ Print Struk</button>
        </div>
      </div>`;
  } catch (err) {
    console.error("❌ Error:", err);
    modalContent.innerHTML = `<p style="color:red;">❌ Gagal memuat pesanan: ${err.message}</p>`;
  }
}






async function printStruk(idPesanan) {
  const db = firebase.firestore();
  const snapshot = await db.collection("pesanan_penjual")
    .where("idPesanan", "==", idPesanan)
    .limit(1)
    .get();

  if (snapshot.empty) {
    alert("Pesanan tidak ditemukan.");
    return;
  }

  const pesanan = snapshot.docs[0].data();
  const produkList = pesanan.produk || [];
  const catatanPembeli = pesanan.catatan || "-";
  let subtotalProduk = 0;
  let totalOngkir = 0;

  // Menyusun daftar produk dan menghitung subtotal produk serta ongkir
  let daftarProdukHTML = "";
  produkList.forEach((item, i) => {
    const nama = item.nama || "-";
    const qty = item.qty || 1;
    const harga = item.harga || 0;
    const total = harga * qty;
    subtotalProduk += total; // Menambahkan subtotal produk
    totalOngkir += item.ongkir || 0;

    daftarProdukHTML += `
      <div style="margin-bottom: 8px;">
        <b>${i + 1}. ${nama}</b><br>
        <span style="font-size:14px;">x${qty} - Rp${total.toLocaleString("id-ID")}</span>
      </div>`;
  });

  // Menghitung total biaya
  const diskon = pesanan.potongan || 0;
  const biayaLayanan = pesanan.biayaLayanan || 0;
  const totalBayar = subtotalProduk + totalOngkir + biayaLayanan - diskon;

  // Mendapatkan waktu timestamp saat pesanan dibuat
  const timestamp = pesanan.createdAt ? pesanan.createdAt.toDate() : new Date();
  const timestampFormatted = timestamp.toLocaleString("id-ID", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Mendapatkan nama toko dari koleksi 'toko'
  const idTokoUtama = produkList[0]?.idToko;
  const tokoDoc = await db.collection("toko").doc(idTokoUtama).get();
  const namaToko = tokoDoc.exists ? tokoDoc.data().namaToko : "Nama Toko Tidak Ditemukan";

  // Membuat konten struk yang akan dicetak
  const strukHTML = `
    <div style="font-family: 'Arial', sans-serif; width: 100%; padding: 10px; line-height: 1.6; font-size: 14px;">
      <h2 style="font-size: 22px; text-align: center; margin: 0;">VLCrave Express - ${namaToko}</h2>
      <hr style="border: 1px solid #ddd;">
      
      <p style="margin: 5px 0;"><strong>ID Pesanan:</strong> ${idPesanan}</p>
      <p style="margin: 5px 0;"><strong>Tanggal & Waktu:</strong> ${timestampFormatted}</p>
      <hr style="border: 1px solid #ddd;">
      
      <h3 style="margin: 10px 0;">Daftar Pesanan:</h3>
      <div style="padding-left: 20px;">
        ${daftarProdukHTML}
      </div>

      <h3 style="margin: 10px 0;">Catatan:</h3>
      <p>${catatanPembeli}</p>

      <h3 style="margin: 10px 0;">💵 Biaya:</h3>
      <p><strong>Subtotal Produk:</strong> Rp ${subtotalProduk.toLocaleString("id-ID")}</p>
      <p><strong>Biaya Layanan:</strong> Rp ${biayaLayanan.toLocaleString("id-ID")}</p>
      <p><strong>Biaya Ongkir:</strong> Rp ${totalOngkir.toLocaleString("id-ID")}</p>

      <h3 style="margin: 10px 0;">💳 Total Pembayaran:</h3>
      <p><strong>Rp ${totalBayar.toLocaleString("id-ID")}</strong></p>

      <h3 style="margin: 10px 0;">Metode Pembayaran:</h3>
      <p>${pesanan.metodePembayaran}</p>

      <h3 style="margin: 10px 0;">Pengiriman:</h3>
      <p>${pesanan.pengiriman}</p>

      <hr style="border: 1px solid #ddd;">
      <p style="font-size: 12px; color: #777; text-align: center;">- Terima Kasih sudah menggunakan VLCrave Express -</p>
    </div>
  `;

  // Membuka jendela baru dan menampilkan struk
  const printWindow = window.open('', '', 'width=600,height=400');
  printWindow.document.write(strukHTML);
  printWindow.document.close(); // Tutup dokumen agar siap dicetak
  printWindow.print(); // Cetak halaman
}




async function lihatDetailTransaksi(id) {
  const db = firebase.firestore();
  const docRef = db.collection("pesanan").doc(id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    alert("❌ Transaksi tidak ditemukan.");
    return;
  }

  // Buat modal jika belum ada
  let modal = document.getElementById("modal-detail");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-detail";
    modal.innerHTML = `<div class="modal-content"></div>`;
    document.body.appendChild(modal);
  }

  // Tambahkan CSS jika belum ada
  if (!document.getElementById("modal-style")) {
    const style = document.createElement("style");
    style.id = "modal-style";
    style.innerHTML = `
      #modal-detail {
        display: flex;
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        z-index: 9999;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
      }
      #modal-detail .modal-content {
        background: #fff;
        padding: 20px 24px;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        font-family: "Segoe UI", sans-serif;
        animation: scaleIn 0.2s ease;
      }
      #modal-detail button {
        margin-top: 16px;
        padding: 8px 16px;
        background-color: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s ease;
      }
      #modal-detail button:hover {
        background-color: #c0392b;
      }
      #modal-detail ul {
        padding-left: 18px;
        margin-top: 8px;
      }
      #modal-detail ul li {
        margin-bottom: 6px;
        line-height: 1.4;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const content = modal.querySelector(".modal-content");
  if (!content) return alert("❌ Kontainer modal tidak ditemukan.");

  const data = docSnap.data();
  const subtotal = data.subtotalProduk || 0;
  const ongkir = data.totalOngkir || 0;
  const biayaLayanan = Math.round((subtotal + ongkir) * 0.01);

  const produkList = Array.isArray(data.produk) ? data.produk : [];

 const daftarProduk = produkList.length
  ? produkList.map((p, i) => {
      const nama = p.nama || "Produk Tidak Dikenal";
      const harga = p.harga || 0;
      const jumlah = p.jumlah || 1;
      const totalItem = harga * jumlah;
      return `<li>${i + 1}. ${nama} - Rp${harga.toLocaleString("id-ID")} x ${jumlah} = <strong>Rp${totalItem.toLocaleString("id-ID")}</strong></li>`;
    }).join("")
  : "<li>(Tidak ada produk)</li>";


  content.innerHTML = `
    <h3>📦 Detail Transaksi</h3>
    <p><strong>Order ID:</strong> ${id}</p>
    <p><strong>Subtotal Produk:</strong> Rp${subtotal.toLocaleString("id-ID")}</p>
    <p><strong>Total Ongkir:</strong> Rp${ongkir.toLocaleString("id-ID")}</p>
    <p><strong>Biaya Layanan (1%):</strong> Rp${biayaLayanan.toLocaleString("id-ID")}</p>
    <p><strong>Daftar Produk:</strong></p>
    <ul>${daftarProduk}</ul>
    <button onclick="tutupModal()">❌ Tutup</button>
  `;

  modal.style.display = "flex";
}



function tutupModal() {
  document.getElementById("modal-detail").style.display = "none";
}

async function renderTabelRiwayat(data, container, statusFilter = "Semua") {
  const filtered = statusFilter === "Semua"
    ? data
    : data.filter(d => (d.status || "").toLowerCase() === statusFilter.toLowerCase());

  let cards = filtered.map(item => `
    <div class="card-admin-riwayat">
      <p><strong>ID Pesanan:</strong> ${item.id ?? "-"}</p>
      <p><strong>Waktu:</strong> ${item.waktu ?? "-"}</p>
      <p><strong>Nama Toko:</strong> ${item.namaToko ?? "-"}</p>
      <p><strong>Total:</strong> Rp${(item.total ?? 0).toLocaleString("id-ID")}</p>
      <p><strong>Status:</strong> ${item.status ?? "-"}</p>
    </div>
  `).join("");

  if (!cards) {
    cards = `<p style="text-align:center;">Tidak ada data transaksi.</p>`;
  }

  container.innerHTML = `
    <div class="riwayat-transaksi-admin">
      <h2>📄 Riwayat Transaksi Semua Toko</h2>
      <div style="margin-bottom:15px;">
        <label><strong>Filter Status:</strong></label>
        <select id="filter-status">
          <option value="Semua">Semua</option>
          <option value="Pending">Pending</option>
          <option value="Diproses">Diproses</option>
          <option value="Menuju Customer">Menuju Customer</option>
          <option value="Selesai">Selesai</option>
          <option value="Dibatalkan">Dibatalkan</option>
        </select>
      </div>
      <div id="card-list-riwayat">
        ${cards}
      </div>
    </div>
  `;

  document.getElementById("filter-status").value = statusFilter;
  document.getElementById("filter-status").onchange = () => {
    renderTabelRiwayat(data, container, document.getElementById("filter-status").value);
  };
}



async function nonaktifkanPenjualSementara(idToko, idLaporan, inputId) {
  const menitInput = document.getElementById(inputId);
  if (!menitInput) {
    alert("❌ Input durasi tidak ditemukan.");
    return;
  }

  const menit = parseInt(minutInput.value);
  if (isNaN(menit) || menit <= 0) {
    alert("❌ Durasi tidak valid.");
    return;
  }

  const konfirmasi = confirm(`⚠️ Nonaktifkan toko selama ${menit} menit?`);
  if (!konfirmasi) return;

  const db = firebase.firestore();
  const expired = new Date(Date.now() + menit * 60000);

  try {
    await db.collection("toko").doc(idToko).update({
      blokirSementara: firebase.firestore.Timestamp.fromDate(expired)
    });

    alert(`✅ Toko dinonaktifkan hingga ${expired.toLocaleTimeString("id-ID")}`);
    await db.collection("laporan_penjual").doc(idLaporan).delete();
    loadContent("laporan-seller-admin");
  } catch (err) {
    console.error(err);
    alert("❌ Gagal menonaktifkan toko.");
  }
}

async function hapusLaporanPenjual(idLaporan, elementRef) {
  const konfirmasi = confirm("🗑️ Hapus laporan ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  try {
    await db.collection("laporan_penjual").doc(idLaporan).delete();
    alert("✅ Laporan dihapus.");

    // Hapus elemen dari DOM
    const card = elementRef.closest(".laporan-card");
    if (card) card.remove();

  } catch (err) {
    console.error(err);
    alert("❌ Gagal menghapus laporan.");
  }
}




async function simpanVoucher(event) {
  event.preventDefault();
  const db = firebase.firestore();

  const id = document.getElementById("voucher-id").value;
  const kode = document.getElementById("voucher-kode").value.trim().toUpperCase();
  const tipe = document.getElementById("voucher-tipe").value;
  const tipePotongan = document.getElementById("voucher-tipe-potongan").value;
  const potongan = parseInt(document.getElementById("voucher-potongan").value);
  const minimal = parseInt(document.getElementById("voucher-minimal").value);
  const kuota = parseInt(document.getElementById("voucher-kuota").value);
  const expiredInput = document.getElementById("voucher-expired").value;

  if (!expiredInput) {
    alert("❌ Tanggal expired tidak boleh kosong.");
    return;
  }

  const expired = new Date(expiredInput);

  const data = {
    kode,
    tipe,
    tipePotongan,
    potongan,
    minimal,
    kuota,
    expired: firebase.firestore.Timestamp.fromDate(expired)
  };

  try {
    if (id) {
      await db.collection("voucher").doc(id).update(data);
      alert("✅ Voucher diperbarui.");
    } else {
      await db.collection("voucher").add({ ...data, digunakanOleh: [] });
      alert("✅ Voucher ditambahkan.");
    }

    loadContent("admin-voucher");
  } catch (err) {
    console.error("Gagal menyimpan voucher:", err);
    alert("❌ Gagal menyimpan voucher.");
  }
}


async function editVoucher(id) {
  const db = firebase.firestore();
  const doc = await db.collection("voucher").doc(id).get();
  if (!doc.exists) return alert("❌ Voucher tidak ditemukan.");
  const v = doc.data();

  document.getElementById("voucher-id").value = id;
  document.getElementById("voucher-kode").value = v.kode || "";
  document.getElementById("voucher-tipe").value = v.tipe || "nominal";
  document.getElementById("voucher-potongan").value = v.potongan || 0;
  document.getElementById("voucher-minimal").value = v.minimal || 0;
  document.getElementById("voucher-kuota").value = v.kuota || 0;
  document.getElementById("voucher-expired").value = v.expired?.toDate().toISOString().slice(0, 10) || "";

  // Set tipe potongan (produk / ongkir)
  document.getElementById("voucher-tipe-potongan").value = v.tipePotongan || "produk";
}


async function hapusVoucher(id) {
  if (!confirm("❌ Hapus voucher ini?")) return;
  const db = firebase.firestore();
  await db.collection("voucher").doc(id).delete();
  alert("✅ Voucher dihapus.");
  loadContent("admin-voucher");
}

async function renderChatDriver({ idPesanan, idDriver, idCustomer, namaDriver = "Anda", namaCustomer = "Customer" }) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user || user.uid !== idDriver) return alert("❌ Anda tidak memiliki akses.");

  const driverSnap = await db.collection("pesanan_driver")
    .where("idPesanan", "==", idPesanan)
    .where("idDriver", "==", idDriver)
    .limit(1).get();

  if (driverSnap.empty) return alert("❌ Pesanan tidak ditemukan atau bukan milik Anda.");

  const driverData = driverSnap.docs[0].data();
  const statusDriver = driverData.status || "-";

  const statusTemplates = {
    "Menuju Resto": "Saya sedang menuju ke restoran.",
    "Menunggu Pesanan": "Saya sudah tiba di resto dan sedang menunggu pesanan.",
    "Pickup Pesanan": "Pesanan sudah saya ambil dan saya segera berangkat.",
    "Menuju Customer": "Saya sedang dalam perjalanan menuju lokasi Anda.",
    "Pesanan Diterima": "Pesanan berhasil dikirim, terima kasih!"
  };

  const templatePesan = statusTemplates[statusDriver] || "";

  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `
    <div class="chat-header-chat" style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">💬 Chat dengan ${namaCustomer}</h2>
      <button onclick="document.getElementById('modal-detail').style.display='none'" style="font-size:18px;">❌</button>
    </div>

    <div style="margin:5px 0;"><strong>Order ID:</strong> ${idPesanan}</div>
    <div class="chat-info-chat" style="margin-bottom:10px; font-size:14px;">
      <p><strong>Anda:</strong> ${namaDriver}</p>
      <p><strong>Customer:</strong> ${namaCustomer}</p>
      <p><strong>Status Lokasi:</strong> ${statusDriver}</p>
    </div>

    <div id="chat-box" class="chat-box-chat" style="max-height:300px; overflow-y:auto; padding:10px; border:1px solid #ccc; border-radius:8px; background:#f9f9f9; margin-bottom:10px;"></div>

    <div class="chat-form-chat" style="display:flex; gap:8px; margin-bottom:10px;">
      <input type="text" id="chat-input" placeholder="Ketik pesan..." style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #ccc;" />
      <button onclick="kirimPesanDriver('${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">Kirim</button>
    </div>

    <div class="chat-templates-chat">
      <p><strong>📋 Template Cepat:</strong></p>
      <div class="template-buttons-chat" style="display:flex; flex-wrap:wrap; gap:6px;">
        <button class="mini-btn-chat" onclick="kirimPesanTemplate('${templatePesan}', '${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">🧭 Status</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplate('Mohon ditunggu sebentar ya.', '${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">⏳ Tunggu</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplate('Saya sudah tiba di lokasi Anda.', '${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">📍 Sampai</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplate('Lokasi sudah sesuai titik ya?', '${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">📍 Titik</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";

  const chatBox = container.querySelector("#chat-box");

  db.collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .orderBy("waktu", "asc")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";

      if (snapshot.empty) {
        chatBox.innerHTML = "<p style='text-align:center; color:gray;'>Belum ada pesan.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const isSenderDriver = data.dari === idDriver;
        const posisi = isSenderDriver ? "flex-end" : "flex-start";
        const bgColor = isSenderDriver ? "#d4fcd3" : "#e6e6e6";
        const waktu = data.waktu?.toDate?.() || new Date();

        const bubble = document.createElement("div");
        bubble.style = `
          align-self: ${posisi};
          background: ${bgColor};
          padding: 10px;
          border-radius: 10px;
          margin-bottom: 8px;
          max-width: 70%;
        `;
        bubble.innerHTML = `
          <div style="font-weight:bold; margin-bottom:3px;">${isSenderDriver ? "Anda" : namaCustomer}</div>
          <div>${escapeHTML(data.pesan)}</div>
          <div style="text-align:right; font-size:11px; color:#777;">${waktu.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        chatBox.appendChild(bubble);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

async function kirimPesanTemplate(teks, idPesanan, idDriver, idCustomer, namaDriver) {
  if (!teks) return;

  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  try {
    await pesanRef.add({
      dari: idDriver,
      ke: idCustomer,
      nama: namaDriver,
      pesan: teks,
      waktu: new Date()
    });
  } catch (err) {
    console.error("Gagal kirim template:", err);
    alert("❌ Gagal mengirim template. Coba lagi.");
  }
}




// Fungsi bantu untuk isi input chat
function isiPesan(teks) {
  const input = document.getElementById("chat-input");
  if (input) input.value = teks;
}

function isiPesanDanKirim(teks, idPesanan, idDriver, idCustomer, namaDriver) {
  if (!firebase.auth().currentUser) return;

  const db = firebase.firestore();

  db.collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .add({
      dari: idDriver,
      ke: idCustomer,
      pesan: teks,
      waktu: firebase.firestore.FieldValue.serverTimestamp()
    });
}


async function kirimPesanTemplate(teks, idPesanan, idDriver, idCustomer, namaDriver) {
  if (!teks) return;

  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  try {
    await pesanRef.add({
      dari: idDriver,
      ke: idCustomer,
      nama: namaDriver,
      pesan: teks,
      waktu: new Date()
    });
  } catch (err) {
    console.error("Gagal kirim template:", err);
    alert("❌ Gagal mengirim template. Coba lagi.");
  }
}


function escapeHTML(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[match]);
}





function laporkanDriver(idPesanan, idDriver) {
  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `
    <div class="report-driver-header" style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">⚠️ Laporkan Driver</h2>
      <button onclick="document.getElementById('modal-detail').style.display='none'" style="font-size:18px;">❌</button>
    </div>

    <div class="report-driver-info">
      <p><strong>ID Pesanan:</strong> ${idPesanan}</p>
      <p><strong>ID Driver:</strong> ${idDriver}</p>
    </div>

    <textarea id="report-driver-alasan" class="report-driver-textarea" placeholder="Masukkan alasan laporan Anda..."></textarea>

    <div class="report-driver-actions">
      <button class="report-driver-btn" onclick="kirimLaporanDriver('${idPesanan}', '${idDriver}')">Kirim Laporan</button>
    </div>
  `;

  modal.style.display = "flex";
}

async function kirimLaporanDriver(idPesanan, idDriver) {
  const textarea = document.getElementById("report-driver-alasan");
  if (!textarea) return alert("❌ Terjadi kesalahan pada form laporan.");

  const alasan = textarea.value.trim();
  if (!alasan) return alert("⚠️ Alasan wajib diisi.");

  try {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
    if (!user) return alert("❌ Anda belum login.");

    const userId = user.uid;

    // 🔍 Cek apakah user sudah pernah melapor untuk pesanan ini
    const existingReport = await db.collection("laporan_driver")
      .where("idPesanan", "==", idPesanan)
      .where("idPelapor", "==", userId)
      .limit(1)
      .get();

    if (!existingReport.empty) {
      return alert("⚠️ Anda sudah melaporkan driver untuk pesanan ini sebelumnya.");
    }

    // 🚀 Kirim laporan baru
    await db.collection("laporan_driver").add({
      idPesanan,
      idDriver,
      idPelapor: userId,
      alasan,
      waktu: Date.now()
    });

    document.getElementById("modal-detail").style.display = "none";
    alert("✅ Laporan telah dikirim. Terima kasih atas kontribusinya.");
  } catch (err) {
    console.error("Gagal mengirim laporan:", err);
    alert("❌ Gagal mengirim laporan. Silakan coba lagi nanti.");
  }
}


function bukaModalPembatalan(idPesanan) {
  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">❌ Batalkan Pesanan</h2>
      <button onclick="document.getElementById('modal-detail').style.display='none'" style="font-size:18px;">✖️</button>
    </div>

    <p><strong>ID Pesanan:</strong> ${idPesanan}</p>

    <p>Silakan tuliskan alasan Anda membatalkan pesanan ini:</p>
    <textarea id="alasanPembatalan" placeholder="Contoh: Salah alamat, berubah pikiran, dll" style="width:100%;height:80px;padding:8px;border-radius:6px;border:1px solid #ccc;"></textarea>

    <div style="margin-top:12px;text-align:right;">
      <button onclick="batalkanPesananDenganAlasan('${idPesanan}')" style="padding:6px 14px;border:none;background:#dc3545;color:#fff;border-radius:6px;cursor:pointer;">Konfirmasi Pembatalan</button>
    </div>
  `;

  modal.style.display = "flex";
}


async function batalkanPesananDenganAlasan(idPesanan) {
  const alasan = document.getElementById("alasanPembatalan").value.trim();
  if (!alasan) return alert("❌ Alasan pembatalan wajib diisi.");

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Anda belum login.");

  try {
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) throw new Error("❌ Data pesanan tidak ditemukan.");

    const dataPesanan = pesananDoc.data();
    const waktuSekarang = new Date();

    // ✅ 1. Update status dan alasan di koleksi pesanan utama
    await pesananRef.update({
      status: "Dibatalkan",
      alasanPembatalan: alasan,
      waktuDibatalkan: firebase.firestore.FieldValue.serverTimestamp(),
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: "Dibatalkan oleh pengguna",
        alasan: alasan,
        waktu: waktuSekarang
      })
    });

    // ✅ 2. Update juga ke koleksi pesanan_penjual
    const penjualSnapshot = await db.collection("pesanan_penjual")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (!penjualSnapshot.empty) {
      const docPenjual = penjualSnapshot.docs[0];
      const penjualId = docPenjual.id;
      const penjualData = docPenjual.data();
      const idToko = penjualData.idToko;

      await db.collection("pesanan_penjual").doc(penjualId).update({
        status: "Dibatalkan",
        alasanPembatalan: alasan // ✅ Tambahkan alasan ke dokumen penjual
      });

      // Ambil nama toko untuk pesan chat otomatis
      let namaToko = "Seller";
      try {
        const tokoDoc = await db.collection("toko").doc(idToko).get();
        if (tokoDoc.exists) {
          namaToko = tokoDoc.data().namaToko || "Seller";
        }
      } catch (e) {
        console.warn("⚠️ Gagal mengambil data namaToko:", e.message);
      }

      // Kirim chat otomatis ke seller
      await db.collection("chat_seller").doc(idPesanan).collection("pesan").add({
        dari: user.uid,
        ke: idToko,
        nama: "System",
        pesan: `❌ Pesanan dibatalkan oleh pelanggan. Alasan: ${alasan}`,
        waktu: waktuSekarang
      });
    }

    // ✅ Tutup modal dan refresh riwayat
    document.getElementById("modal-detail").style.display = "none";
    alert("✅ Pesanan berhasil dibatalkan.");
    renderRiwayat();

  } catch (err) {
    console.error("Gagal membatalkan pesanan:", err);
    alert("❌ Gagal membatalkan pesanan.");
  }
}




async function kirimPesanChat(idPesanan, idDriver, idCustomer) {
  const input = document.getElementById("chat-input");
  const pesan = input.value.trim();
  if (!pesan) return;

  const db = firebase.firestore();
  const waktu = Date.now();

  const data = {
    sender: "driver",
    pesan,
    waktu
  };

  await db.collection("chat_pesanan").doc(idPesanan).collection("pesan").add(data);
  input.value = "";
  renderChatDriver({ idPesanan, idDriver, idCustomer }); // Refresh chat
}

function kirimPesanCustomer(idPesanan, idCustomer, idDriver, namaCustomer) {
  const input = document.getElementById("chat-input-customer");
  const teks = input.value.trim();
  if (!teks) return;

  firebase.firestore()
    .collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .add({
      dari: idCustomer,
      ke: idDriver,
      nama: namaCustomer,
      pesan: teks,
      waktu: new Date()
    });

  input.value = "";
}

function kirimPesanTemplateCustomer(teks, idPesanan, idCustomer, idDriver, namaCustomer) {
  firebase.firestore()
    .collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .add({
      dari: idCustomer,
      ke: idDriver,
      nama: namaCustomer,
      pesan: teks,
      waktu: new Date()
    });
}


function isiPesan(teks) {
  const input = document.getElementById("chat-input-customer");
  if (input) input.value = teks;
}

// Mode 2: Langsung kirim template pesan ke database
function kirimPesanTemplateCustomer(teks, idPesanan, idCustomer, idDriver, namaCustomer) {
  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  pesanRef.add({
    dari: idCustomer,
    ke: idDriver,
    nama: namaCustomer,
    pesan: teks,
    waktu: new Date()
  });
}

// Pesan dari input manual
async function kirimPesanCustomer(idPesanan, idCustomer, idDriver, namaCustomer) {
  const input = document.getElementById("chat-input-customer");
  const isiPesan = input.value.trim();
  if (!isiPesan) return;

  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  await pesanRef.add({
    dari: idCustomer,
    ke: idDriver,
    nama: namaCustomer,
    pesan: isiPesan,
    waktu: new Date()
  });

  input.value = "";
}

async function formRatingRestoDriver(idPesanan) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");

  const pesananRef = db.collection("pesanan").doc(idPesanan);
  const pesananDoc = await pesananRef.get();
  if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");

  const data = pesananDoc.data();
  if (data.ratingDiberikan) return alert("✅ Kamu sudah memberi rating.");

  const userDoc = await db.collection("users").doc(user.uid).get();
  const namaUser = userDoc.exists ? userDoc.data().nama || "Pengguna" : "Pengguna";

  const produkDibeli = Array.isArray(data.produk) ? data.produk : [];

  let listProdukHTML = "";
  for (const item of produkDibeli) {
    listProdukHTML += `<li>🍽️ ${item.nama || item.namaProduk || "Produk"}</li>`;
  }

  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");

  popup.innerHTML = `
    <div class="popup-container-rating">
      <div class="popup-header-rating">
        <span class="popup-close-rating" onclick="tutupPopup()">✕</span>
        <h3>Beri Rating Pesanan</h3>
      </div>

      <div class="rating-section">
        <p><strong>Rating Driver:</strong></p>
        <div class="star-container" id="rating-driver"></div>
        <textarea id="ulasan-driver" placeholder="Ulasan untuk driver..." rows="2"></textarea>
      </div>

      <div class="rating-section">
        <p><strong>Rating Makanan:</strong></p>
        <div class="star-container" id="rating-resto"></div>
        <textarea id="ulasan-resto" placeholder="Ulasan makanan atau resto..." rows="2"></textarea>
        <ul style="padding-left: 20px; margin-top: 5px; color: #444;">
          ${listProdukHTML}
        </ul>
      </div>

      <button class="btn-submit-rating" onclick="kirimRating('${idPesanan}', '${namaUser}')">Kirim</button>
    </div>
  `;

  popup.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("popup-active");

  renderBintang("rating-driver");
  renderBintang("rating-resto");
}

function renderBintang(divId) {
  const container = document.getElementById(divId);
  if (!container) return;
  container.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const bintang = document.createElement("span");
    bintang.textContent = "☆";
    bintang.classList.add("star");
    bintang.dataset.value = i;

    bintang.addEventListener("click", () => {
      const semua = container.querySelectorAll(".star");
      semua.forEach((el, idx) => {
        el.textContent = idx < i ? "★" : "☆";
      });
      container.dataset.rating = i;
    });

    container.appendChild(bintang);
  }
}

async function kirimRating(idPesanan) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");

  // ✅ Ambil nama user asli dari Firestore
  const userDoc = await db.collection("users").doc(user.uid).get();
  const namaUser = userDoc.exists ? (userDoc.data().nama || "Anonim") : "Anonim";

  const pesananRef = db.collection("pesanan").doc(idPesanan);
  const pesananDoc = await pesananRef.get();
  if (!pesananDoc.exists) return alert("❌ Data pesanan tidak ditemukan.");
  const data = pesananDoc.data();

  if (data.ratingDiberikan) return alert("✅ Kamu sudah memberi rating.");

  const ratingDriver = parseInt(document.getElementById("rating-driver").dataset.rating || 0);
  const ratingResto = parseInt(document.getElementById("rating-resto").dataset.rating || 0);
  const ulasanDriver = document.getElementById("ulasan-driver").value.trim();
  const ulasanResto = document.getElementById("ulasan-resto").value.trim();

  if (!ratingDriver || !ratingResto) return alert("❌ Harap beri rating pada kedua sisi.");

  const waktuSekarang = Date.now();

  // 🔍 Ambil data driver dari pesanan_driver
  const driverSnap = await db.collection("pesanan_driver")
    .where("idPesanan", "==", idPesanan)
    .limit(1)
    .get();

  if (driverSnap.empty) return alert("❌ Data driver tidak ditemukan.");

  const driverDoc = driverSnap.docs[0];
  const driverData = driverDoc.data();
  const idDriverUID = driverData.idDriver || "-";
  const idTokoUID = driverData.idToko || "-";

  // ✅ Fungsi bantu update rating rata-rata
  async function updateAverageRating(ref, ratingBaru) {
    const doc = await ref.get();
    if (!doc.exists) return;
    const data = doc.data();
    const jumlahLama = data.jumlahRating || 0;
    const totalLama = data.totalRating || 0;

    const jumlahBaru = jumlahLama + 1;
    const totalBaru = totalLama + ratingBaru;

    await ref.update({
      jumlahRating: jumlahBaru,
      totalRating: totalBaru
    });
  }

  // ✅ Rating untuk DRIVER
  if (idDriverUID !== "-") {
    const driverQuery = await db.collection("driver")
      .where("idDriver", "==", idDriverUID)
      .limit(1)
      .get();

    if (!driverQuery.empty) {
      const driverDocFire = driverQuery.docs[0];
      const driverRef = db.collection("driver").doc(driverDocFire.id);

      await driverRef.collection("rating").add({
        userId: user.uid,
        namaUser,
        rating: ratingDriver,
        ulasan: ulasanDriver,
        waktu: waktuSekarang
      });

      await updateAverageRating(driverRef, ratingDriver);

      // 💬 Pesan ke driver
      await db.collection("pesan_driver")
        .doc(driverDocFire.id)
        .collection("pesan")
        .add({
          idDriver: idDriverUID,
          idPesanan,
          pesan: `✅ Orderan ID ${idPesanan} selesai.\n⭐ Rating: ${"⭐".repeat(ratingDriver)}\n📝 Ulasan: ${ulasanDriver || "-"}`,
          waktu: waktuSekarang,
          dari: namaUser,
          dibaca: false
        });
    }
  }

  // ✅ Rating untuk TOKO
  let tokoDocId = null;
  if (idTokoUID !== "-") {
    const tokoQuery = await db.collection("toko")
      .where("idToko", "==", idTokoUID)
      .limit(1)
      .get();

    if (!tokoQuery.empty) {
      const tokoDoc = tokoQuery.docs[0];
      tokoDocId = tokoDoc.id;
      const tokoRef = db.collection("toko").doc(tokoDocId);

      await tokoRef.collection("rating").add({
        userId: user.uid,
        namaUser,
        rating: ratingResto,
        ulasan: ulasanResto,
        waktu: waktuSekarang
      });

      await updateAverageRating(tokoRef, ratingResto);
    }
  }

  // ✅ Rating untuk PRODUK & pesan_toko
  for (const item of data.produk || []) {
    const idProduk = item.idProduk;
    const namaProduk = item.nama || "-";
    if (!idProduk || !tokoDocId) continue;

    const produkRef = db.collection("produk").doc(idProduk);

    await produkRef.collection("rating").add({
      userId: user.uid,
      namaUser,
      rating: ratingResto,
      ulasan: ulasanResto,
      waktu: waktuSekarang,
      idPesanan
    });

    await updateAverageRating(produkRef, ratingResto);

    await db.collection("pesan_toko")
      .doc(tokoDocId)
      .collection("pesan")
      .add({
        idToko: idTokoUID,
        idPesanan,
        idProduk,
        namaProduk,
        dariCustomer: namaUser,
        pesan: `📦 Produk: ${namaProduk}\n⭐ Rating: ${ratingResto}\n📝 Ulasan: ${ulasanResto || "-"}`,
        waktu: waktuSekarang,
        dibaca: false
      });
  }

  await pesananRef.update({ ratingDiberikan: true });

  alert("✅ Terima kasih! Rating berhasil dikirim.");
  tutupPopup();
}









async function tolakTarikDriver(docId) {
  const db = firebase.firestore();
  const withdrawRef = db.collection("withdraw_request").doc(docId);
  const snap = await withdrawRef.get();

  if (!snap.exists) {
    alert("❌ Data permintaan tidak ditemukan.");
    return;
  }

  const data = snap.data();
  if (data.status !== "Menunggu") {
    alert("❌ Permintaan sudah diproses sebelumnya.");
    return;
  }

  try {
    await withdrawRef.update({
      status: "Dibatalkan",
      rejectedBy: firebase.auth().currentUser.uid,
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("❌ Permintaan withdraw driver ditolak.");
    loadContent("permintaan-withdraw"); // atau refresh daftar permintaan
  } catch (err) {
    console.error("❌ Gagal menolak:", err);
    alert("❌ Gagal menolak permintaan.");
  }
}




async function renderTabelRiwayat(data, container, statusFilter = "Semua") {
  const filtered = statusFilter === "Semua"
    ? data
    : data.filter(d => (d.status || "").toLowerCase() === statusFilter.toLowerCase());

  let cards = "";
  for (const item of filtered) {
    cards += `
      <div class="riwayat-card-riwayatseller-admin">
        <div><strong>ID:</strong> ${item.id}</div>
        <div><strong>Waktu:</strong> ${item.waktu}</div>
        <div><strong>Nama Toko:</strong> ${item.namaToko}</div>
        <div><strong>Total:</strong> Rp${item.total.toLocaleString("id-ID")}</div>
        <div><strong>Status:</strong> ${item.status}</div>
        <div class="card-actions-riwayatseller-admin">
          <button onclick="lihatLogPesananSeller('${idPesanan}', '${idToko}')">📄 Detail</button>
          <button class="btn-riwayat-riwayatseller-admin btn-delete" onclick="hapusPesananAdmin('${item.id}')">🗑️ Hapus</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="riwayat-container-riwayatseller-admin">
      <h2>📄 Riwayat Transaksi Semua Toko</h2>

      <div style="margin-bottom: 16px;">
        <label for="filter-status"><strong>Filter Status:</strong></label>
        <select id="filter-status" style="margin-left: 8px; padding: 4px 8px; border-radius: 6px;">
          <option value="Semua">Semua</option>
          <option value="Pending">Pending</option>
          <option value="Diproses">Diproses</option>
          <option value="Menuju Customer">Menuju Customer</option>
          <option value="Selesai">Selesai</option>
          <option value="Dibatalkan">Dibatalkan</option>
        </select>
      </div>

      <div class="riwayat-card-list-riwayatseller-admin">
        ${cards || `<p style="text-align:center;">Tidak ada data.</p>`}
      </div>
    </div>
  `;

  document.getElementById("filter-status").value = statusFilter;
  document.getElementById("filter-status").addEventListener("change", (e) => {
    renderTabelRiwayat(data, container, e.target.value);
  });
}


async function hapusPesananAdmin(idPesanan) {
  const konfirmasi = confirm(`Yakin ingin menghapus pesanan dengan ID ${idPesanan}?`);
  if (!konfirmasi) return;

  const db = firebase.firestore();

  try {
    // Hapus dari koleksi utama
    await db.collection("pesanan").doc(idPesanan).delete();

    // Opsional: hapus juga data terkait jika ada (driver, penjual, review)
    await Promise.all([
      db.collection("pesanan_driver")
        .where("idPesanan", "==", idPesanan)
        .get()
        .then(snapshot => snapshot.forEach(doc => doc.ref.delete())),

      db.collection("pesanan_penjual")
        .where("idPesanan", "==", idPesanan)
        .get()
        .then(snapshot => snapshot.forEach(doc => doc.ref.delete())),

      db.collection("review_seller")
        .where("idPesanan", "==", idPesanan)
        .get()
        .then(snapshot => snapshot.forEach(doc => doc.ref.delete())),
    ]);

    alert("✅ Pesanan berhasil dihapus.");

    // Hapus elemen pesanan dari DOM tanpa refresh halaman
    const pesananCard = document.getElementById(`pesanan-card-${idPesanan}`);
    if (pesananCard) {
      pesananCard.remove(); // Menghapus elemen pesanan yang terhapus dari tampilan
    }

  } catch (error) {
    console.error("Gagal menghapus pesanan:", error);
    alert("❌ Gagal menghapus pesanan.");
  }
}





async function laporkanPesananSeller(idPesanan) {
  const alasan = prompt("Jelaskan laporan permasalahanmu:");
  if (!alasan || alasan.length < 5) return alert("⚠️ Alasan terlalu pendek.");

  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  const db = firebase.firestore();

  try {
    const pesananSnap = await db.collection("pesanan_penjual")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (pesananSnap.empty) return alert("❌ Data pesanan tidak ditemukan.");

    const data = pesananSnap.docs[0].data();
    const namaToko = data.namaToko || "-";
    const idToko = data.idToko || "-";
    const waktu = new Date().toLocaleString("id-ID");

    await db.collection("laporan_driver").add({
      idPesanan,
      idToko,
      namaToko,
      alasan,
      dilaporkanOleh: "seller",
      waktu: Date.now(),
      waktuString: waktu,
      status: "Menunggu Tinjauan"
    });

    alert("✅ Laporan berhasil dikirim ke admin.");
    kembaliKeDashboardSeller();
  } catch (err) {
    console.error("Laporan gagal:", err);
    alert("❌ Gagal mengirim laporan.");
  }
}



async function tambahSaldoToko(docId, namaToko) {
  const nominal = prompt(`Masukkan jumlah saldo yang ingin ditambahkan untuk toko "${namaToko}":`);

  if (!nominal || isNaN(nominal)) {
    alert("Input tidak valid.");
    return;
  }

  const db = firebase.firestore();
  const tokoRef = db.collection("toko").doc(docId);

  try {
    const docSnap = await tokoRef.get();
    if (!docSnap.exists) {
      alert("Toko tidak ditemukan.");
      return;
    }

    const currentSaldo = docSnap.data().saldo || 0;
    const newSaldo = currentSaldo + Number(nominal);

    await tokoRef.update({ saldo: newSaldo });
    alert(`✅ Saldo toko berhasil ditambahkan. Saldo sekarang: Rp${newSaldo.toLocaleString()}`);
    loadContent("admin-toko"); // refresh
  } catch (err) {
    console.error(err);
    alert("❌ Gagal menambah saldo.");
  }
}


async function hapusLaporanDriver(idLaporan) {
  if (!confirm("Yakin ingin menghapus laporan ini?")) return;
  try {
    await firebase.firestore().collection("laporan_driver").doc(idLaporan).delete();
    alert("✅ Laporan berhasil dihapus.");
    loadContent("laporan-driver-admin");
  } catch (err) {
    console.error("❌ Gagal menghapus laporan:", err);
    alert("Terjadi kesalahan saat menghapus laporan.");
  }
}

async function kirimPeringatanManual(idDriver, inputId) {
  const db = firebase.firestore();
  const isi = document.getElementById(inputId)?.value.trim();
  if (!isi) return alert("Masukkan isi pesan terlebih dahulu.");

  try {
    await db.collection("peringatan_driver").add({
      idDriver,
      waktu: Date.now(),
      pesan: isi,
      dariAdmin: true
    });
    alert("✅ Peringatan berhasil dikirim.");
    document.getElementById(inputId).value = "";
  } catch (e) {
    console.error("❌ Gagal kirim peringatan:", e);
    alert("Terjadi kesalahan saat mengirim pesan.");
  }
}

async function nonaktifkanDriverSementara(idDriver, idLaporan, inputId) {
  const input = document.getElementById(inputId);
  const menit = parseInt(input.value);

  if (isNaN(menit) || menit <= 0) {
    alert("Masukkan durasi nonaktif dalam menit (minimal 1).");
    return;
  }

  const db = firebase.firestore();
  const admin = firebase.auth().currentUser;
  if (!admin) return alert("Silakan login ulang.");

  try {
    const waktuSekarang = Date.now();
    const waktuAktifLagi = waktuSekarang + menit * 60 * 1000;

    // Ambil data laporan
    const laporanDoc = await db.collection("laporan_driver").doc(idLaporan).get();
    const data = laporanDoc.data() || {};
    const alasan = data.alasan || "Tidak disebutkan";

    // Ambil data driver untuk update level pelanggaran
    const driverRef = db.collection("driver").doc(idDriver);
    const driverDoc = await driverRef.get();
    const pelanggaran = (driverDoc.data()?.pelanggaran || 0) + 1;

    // Update status driver ke nonaktif & tambah level pelanggaran
    await driverRef.update({
      status: "nonaktif",
      nonaktifHingga: waktuAktifLagi,
      pelanggaran: pelanggaran
    });

    // Kirim notifikasi ke driver
    await db.collection("notifikasi_driver").add({
      idDriver,
      pesan: `Akun Anda dinonaktifkan selama ${menit} menit karena: ${alasan}`,
      waktu: waktuSekarang,
      terbaca: false
    });

    // Catat log admin
    await db.collection("riwayat_tindakan_admin").add({
      oleh: admin.uid,
      tindakan: "Nonaktifkan Driver",
      idDriver,
      idLaporan,
      durasi: menit,
      waktu: waktuSekarang,
      keterangan: `Dinonaktifkan karena laporan: ${alasan}`,
      levelPelanggaran: pelanggaran
    });

    // Hapus laporan setelah ditindak
    await db.collection("laporan_driver").doc(idLaporan).delete();

    alert(`Driver dinonaktifkan selama ${menit} menit. (Total pelanggaran: ${pelanggaran})`);
    loadContent("laporan-driver-admin");

  } catch (err) {
    console.error(err);
    alert("❌ Gagal menonaktifkan driver: " + err.message);
  }
}


// Tambahkan di atas: fungsi bantu
function isTokoSedangBuka(jamBuka, jamTutup) {
  const now = new Date();
  const jam = now.getHours();
  if (jamBuka === jamTutup) return false;
  if (jamBuka < jamTutup) return jam >= jamBuka && jam < jamTutup;
  return jam >= jamBuka || jam < jamTutup;
}

function hitungJarakKM(loc1, loc2) {
  if (!loc1 || !loc2) return 999;

  const R = 6371; // Radius bumi (KM)
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const lat1 = toRad(loc1.lat);
  const lat2 = toRad(loc2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2); // KM, dibulatkan 2 angka
}

function toRad(value) {
  return (value * Math.PI) / 180;
}


function hitungJarakKM(pos1 = {}, pos2 = {}) {
  if (!pos1.lat || !pos2.lat) return "-";
  const R = 6371; // Radius bumi dalam KM
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // dibulatkan 1 angka di belakang koma
}

async function tolakPesananDriver(idPesanan, docId) {
  const db = firebase.firestore();
  try {
    await db.collection("pesanan_driver_pending").doc(docId).delete();
    alert("✅ Pesanan ditolak dan dihapus.");
    loadContent("driver-dashboard");
  } catch (err) {
    alert("❌ Gagal tolak pesanan.");
  }
}


async function openCustomerChat(idPesanan) {
  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");
  container.innerHTML = `<p>💬 Memuat chat dengan customer...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = "<p>❌ Harap login.</p>";
    return;
  }

  window.currentChatPesananId = idPesanan;

  const chatBoxId = "chat-messages";

  container.innerHTML = `
    <button onclick="document.getElementById('modal-detail').style.display='none'"
      style="position: absolute; top: 10px; right: 15px; font-size: 20px; background: none; border: none; color: #333; cursor: pointer;">
      ❌
    </button>

    <div class="chat-container">
      <h2 style="margin-top:0;">💬 Chat dengan Customer</h2>

      <div id="${chatBoxId}" class="chat-messages" style="max-height:300px; overflow-y:auto; border:1px solid #ddd; padding:10px; margin-bottom:10px;"></div>

      <div class="chat-input-area" style="display:flex; gap:5px; margin-bottom:10px;">
        <input type="text" id="chat-input" placeholder="Tulis pesan..." style="flex:1; padding:8px;" />
        <button onclick="kirimPesanCustomer()">Kirim</button>
      </div>

      <div class="template-buttons" style="display: flex; flex-wrap: wrap; gap: 5px;">
        <p style="width:100%;"><strong>📋 Pesan Cepat:</strong></p>
        <button onclick="kirimTemplateChat('Saya sudah di titik lokasi, sesuai titik ya!')">📍 Sesuai Titik</button>
        <button onclick="kirimTemplateChat('Mohon ditunggu, saya sedang otw')">🛵 OTW</button>
        <button onclick="kirimTemplateChat('Pesanan kamu akan segera sampai')">📦 Segera Sampai</button>
        <button onclick="kirimTemplateChat('Tolong pastikan nomor rumah terlihat jelas ya!')">🏠 Nomor Rumah</button>
      </div>
    </div>
  `;

  db.collection("chat_driver")
    .where("idPesanan", "==", idPesanan)
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const waktu = data.timestamp?.toDate().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) || "-";
        const isDriver = data.sender === "driver";
        messages.push(`
          <div class="chat-message ${isDriver ? 'chat-driver' : 'chat-user'}" style="margin-bottom:8px; display:flex; ${isDriver ? 'justify-content:flex-end;' : 'justify-content:flex-start;'}">
            <div class="chat-bubble" style="max-width:70%; background:${isDriver ? '#dcf8c6' : '#f1f0f0'}; padding:10px; border-radius:10px;">
              <p style="margin:0;">${data.teks}</p>
              <small style="font-size:10px; color:#888;">${waktu}</small>
            </div>
          </div>
        `);
      });
      const chatBox = document.getElementById(chatBoxId);
      if (chatBox) {
        chatBox.innerHTML = messages.join("");
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    });

  // Tampilkan modal
  modal.style.display = "flex";
}




function escapeHTML(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[match]);
}

function kirimPesanTemplateCustomer(teks, idPesanan, idCustomer, idDriver, namaCustomer) {
  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  pesanRef.add({
    dari: idCustomer,
    ke: idDriver,
    nama: namaCustomer,
    pesan: teks,
    waktu: new Date()
  });
}

async function kirimPesanCustomer(idPesanan, idCustomer, idDriver, namaCustomer) {
  const input = document.getElementById("chat-input-customer");
  const isiPesan = input.value.trim();
  if (!isiPesan) return;

  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  await pesanRef.add({
    dari: idCustomer,
    ke: idDriver,
    nama: namaCustomer,
    pesan: isiPesan,
    waktu: new Date()
  });

  input.value = "";
}



async function promptTransferSaldo(driverId) {
  const nominalStr = prompt("Masukkan nominal saldo yang ingin ditransfer:");
  const nominal = parseInt(nominalStr);

  if (isNaN(nominal) || nominal <= 0) {
    alert("❌ Nominal tidak valid.");
    return;
  }

  const konfirmasi = confirm(`Yakin transfer Rp ${nominal.toLocaleString()} ke driver ini?`);
  if (!konfirmasi) return;

  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("User tidak ditemukan");
    const uid = user.uid;
    const db = firebase.firestore();

    // 🔐 Ambil saldo admin dari users/{uid}.saldo
    const userDoc = await db.collection("users").doc(uid).get();
    const saldoAdmin = userDoc.exists ? userDoc.data().saldo || 0 : 0;

    if (saldoAdmin < nominal) {
      alert(`❌ Saldo admin tidak cukup. Sisa saldo: Rp ${saldoAdmin.toLocaleString()}`);
      return;
    }

    // 🎯 Ambil saldo driver langsung dari driver/{id}.saldo
    const driverRef = db.collection("driver").doc(driverId);
    const driverDoc = await driverRef.get();
    if (!driverDoc.exists) throw new Error("Driver tidak ditemukan.");

    const dataDriver = driverDoc.data();
    const saldoDriver = dataDriver.saldo || 0;

    const newSaldoDriver = saldoDriver + nominal;
    const newSaldoAdmin = saldoAdmin - nominal;

    // 💾 Simpan saldo baru
    await Promise.all([
      driverRef.update({ saldo: newSaldoDriver, updatedAt: new Date() }),
      db.collection("users").doc(uid).update({ saldo: newSaldoAdmin }),
    ]);

    // 🖼️ Update DOM jika tersedia
    const saldoElem = document.getElementById(`saldo-${driverId}`);
    if (saldoElem) saldoElem.innerText = `Rp ${newSaldoDriver.toLocaleString()}`;

    alert(`✅ Transfer berhasil!\nSaldo Admin: Rp ${newSaldoAdmin.toLocaleString()}`);
  } catch (err) {
    console.error(err);
    alert("❌ Transfer gagal: " + err.message);
  }
}

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d; // dalam km
}

async function bukaDetailPesananDriver(docId) {
  const container = document.querySelector("#modal-detail .modal-content");
  const db = firebase.firestore();

  if (!docId || typeof docId !== "string") {
    container.innerHTML = `<p style="color:red;">❌ ID Dokumen tidak valid.</p>`;
    return;
  }

  try {
    const pesananDoc = await db.collection("pesanan").doc(docId).get();
    if (!pesananDoc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Pesanan tidak ditemukan (ID: ${docId}).</p>`;
      return;
    }

    const data = pesananDoc.data();
    const idPesanan = docId;

    const driverSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1).get();

    if (driverSnap.empty) {
      container.innerHTML = `<p style="color:red;">❌ Belum ada driver yang menerima pesanan ini.</p>`;
      return;
    }

    const driverDoc = driverSnap.docs[0];
    const driverData = driverDoc.data();
    const driverDocId = driverDoc.id;

    const statusStepMap = {
      "Menunggu Pesanan": "⏳ Menunggu Pesanan",
      "Pickup Pesanan": "📦 Pickup Pesanan",
      "Menuju Customer": "🛵 Menuju Customer",
      "Pesanan Diterima": "✅ Pesanan Diterima",
      "Selesai": "✅ Selesaikan Pesanan"
    };

    const urutanStatus = Object.keys(statusStepMap);
    const currentIndex = urutanStatus.indexOf(driverData.status);
    const nextStatus = urutanStatus[currentIndex + 1];

    let tombolStatus = "";
    if (nextStatus) {
      tombolStatus = `
        <div class="btn-group">
          <button class="btn-next-status"
            onclick="updateStatusDriver('${driverDocId}', '${nextStatus}', '${idPesanan}')">
            ${statusStepMap[nextStatus]}
          </button>
        </div>`;
    }

    const stepsLog = Array.isArray(driverData.stepsLog)
      ? driverData.stepsLog
      : Array.isArray(data.stepsLog)
        ? data.stepsLog
        : [];

    const formatStepsLog = () => {
      if (!stepsLog.length) return "<li>(Belum ada log)</li>";
      return stepsLog.map(s => {
        if (typeof s === "string") return `<li>✅ ${s}</li>`;
        if (typeof s === "object" && s.step && s.waktu) {
          const jam = new Date(s.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          return `<li>✅ <strong>${s.step}</strong> - <em>${jam}</em></li>`;
        }
        return `<li>✅ ${JSON.stringify(s)}</li>`;
      }).join("");
    };

    const namaPembeli = data.nama || "Customer";
    const produkList = Array.isArray(data.produk)
      ? data.produk.map(p => `<li>${p.nama} (${p.jumlah}x) - Rp ${(p.harga * p.jumlah).toLocaleString("id-ID")}</li>`).join("")
      : "<li>-</li>";

    container.innerHTML = `
      <div class="detail-pesanan-wrapper" style="position: relative;">
        <button onclick="document.getElementById('modal-detail').style.display='none'"
          style="position: absolute; top: 10px; right: 15px; font-size: 20px; background: none; border: none; color: #333; cursor: pointer;">
          ❌
        </button>
        <h2>📦 Detail Pesanan</h2>
        <div class="detail-pesanan-info">
          <p><strong>ID Pesanan:</strong> ${idPesanan}</p>
          <p><strong>Nama Pembeli:</strong> ${namaPembeli}</p>
          <p><strong>Alamat:</strong> ${data.alamat || "-"}</p>
          <p><strong>Pembayaran:</strong> ${data.metode?.toUpperCase() || "-"}</p>
          <p><strong>Status Driver:</strong> ${driverData.status || "-"}</p>
        </div>

        <h3 style="margin-top: 20px;">🛍️ Daftar Produk:</h3>
        <ul style="margin-left: 20px;">${produkList}</ul>

        <h3 style="margin-top: 20px;">📶 Langkah Pengantaran:</h3>
        <ul style="margin-left: 20px;">${formatStepsLog()}</ul>

        <h3 style="margin-top: 20px;">🗺️ Rute:</h3>
        <div id="map-detail" class="map-detail" style="height: 300px;"></div>
        <div style="margin-top: 10px; text-align: center;">
          <a id="gmaps-link" class="btn-next-status" style="text-decoration: none;" target="_blank">
            📍 Lihat Rute
          </a>
        </div>

        ${tombolStatus}
      </div>
    `;

    setTimeout(async () => {
      const geoToLatLng = geo =>
        geo?.latitude ? { lat: geo.latitude, lng: geo.longitude } :
        geo?.lat ? { lat: geo.lat, lng: geo.lng } : null;

      const toko = geoToLatLng(driverData.lokasiToko);
      const cust = geoToLatLng(driverData.lokasiCustomer);

      if (toko && cust) {
        const map = L.map("map-detail").setView([toko.lat, toko.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const icon = (cls, icon) => L.divIcon({
          className: cls,
          html: `<i class="fas ${icon}"></i>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });

        const tokoDoc = await db.collection("toko").doc(data.produk?.[0]?.idToko).get();
        const namaToko = tokoDoc.exists ? tokoDoc.data().namaToko : "Toko";

        L.marker([toko.lat, toko.lng], { icon: icon('toko-marker', 'fa-store') }).addTo(map).bindPopup(`📍 ${namaToko}`);
        L.marker([cust.lat, cust.lng], { icon: icon('customer-marker', 'fa-user') }).addTo(map).bindPopup(`📦 ${namaPembeli}`);

        const gmapsLink = document.getElementById("gmaps-link");
        if (gmapsLink) {
          gmapsLink.href = `https://www.google.com/maps/dir/?api=1&origin=${toko.lat},${toko.lng}&destination=${cust.lat},${cust.lng}&travelmode=driving`;
        }
      } else {
        document.getElementById("map-detail").innerHTML = `<p style="padding:10px;">📍 Lokasi belum lengkap.</p>`;
      }

      // Hitung jarak real-time
      try {
        const driverRealtimeSnap = await db.collection("driver")
          .where("idDriver", "==", driverData.idDriver)
          .limit(1).get();

        if (!driverRealtimeSnap.empty) {
          const lokasiDriver = geoToLatLng(driverRealtimeSnap.docs[0].data().lokasi);
          if (lokasiDriver && cust) {
            const jarak = hitungJarakMeter(
              cust.lat, cust.lng,
              lokasiDriver.lat, lokasiDriver.lng
            );
            const infoElem = document.getElementById("jarak-info");
            if (infoElem) {
              infoElem.innerHTML = `📏 Jarak driver ke customer (real-time): <b>${jarak.toFixed(1)} meter</b>`;
            }
          }
        }
      } catch (err) {
        console.error("❌ Gagal menghitung jarak:", err);
      }

    }, 100);

    document.getElementById("modal-detail").style.display = "flex";

  } catch (err) {
    console.error("❌ Gagal membuka detail pesanan:", err);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan teknis.</p>`;
  }
}






function formatStatus(status) {
  switch (status) {
    case "Menunggu Driver": return "Pesanan dibuat (Pending)";
    case "Driver Menuju Toko": return "Driver menuju toko";
    case "Pesanan Diambil": return "Pesanan diambil";
    case "Menuju Customer": return "Sedang diantar";
    case "Pesanan Tiba": return "Pesanan sampai";
    case "Menunggu Pesanan": return "Menunggu pesanan";
    case "Selesai": return "Pesanan selesai";
    default: return status;
  }
}

async function updateStatusDriver(docId, status, idPesanan) {
  const db = firebase.firestore();
  const now = new Date();
  const waktu = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const pesananDriverRef = db.collection("pesanan_driver").doc(docId);
  const pesananRef = db.collection("pesanan").doc(idPesanan);
  const penjualRef = db.collection("pesanan_penjual").doc(idPesanan);

  try {
    const [pesananDriverDoc, pesananDoc, penjualDoc] = await Promise.all([
      pesananDriverRef.get(),
      pesananRef.get(),
      penjualRef.get().catch(() => null),
    ]);

    if (!pesananDriverDoc.exists) throw new Error("❌ Pesanan driver tidak ditemukan.");
    if (!pesananDoc.exists) throw new Error("❌ Pesanan utama tidak ditemukan.");

    const dataDriver = pesananDriverDoc.data();
    const dataPesanan = pesananDoc.data();
    const dataPP = penjualDoc?.exists ? penjualDoc.data() : {};

    const subtotal = Number(dataDriver.subtotalProduk || 0);
    const ongkir = Number(dataDriver.totalOngkir || 0);
    const idTokoDoc = dataDriver.idToko || dataPP.idToko || "";
    const idDriverVal = dataDriver.idDriver || dataDriver.driverId || "";
    const metode = (dataPesanan.metode || "").toLowerCase();

    if (!idTokoDoc) throw new Error("❌ idToko tidak ditemukan.");
    if (!idDriverVal) throw new Error("❌ idDriver tidak ditemukan.");

    const tokoRef = db.collection("toko").doc(idTokoDoc);
    const tokoDoc = await tokoRef.get();
    if (!tokoDoc.exists) throw new Error("❌ Data toko tidak ditemukan.");

    const driverSnap = await db.collection("driver").where("idDriver", "==", idDriverVal).limit(1).get();
    if (driverSnap.empty) throw new Error("❌ Driver tidak ditemukan.");
    const driverDoc = driverSnap.docs[0];
    const driverRef = driverDoc.ref;

    const updateData = {
      status,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(`${waktu} ${formatStatus(status)}`),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await Promise.all([
      pesananDriverRef.update(updateData),
      pesananRef.update(updateData),
    ]);

    // ✅ POTONG SALDO JIKA COD + STATUS "Menunggu Pesanan"
    if (status === "Menunggu Pesanan" && metode === "cod" && !dataPesanan.sudahDiprosesPotong) {
      if (isNaN(subtotal) || isNaN(ongkir) || subtotal <= 0 || ongkir <= 0) {
        console.warn("⚠️ subtotal/ongkir tidak valid. Lewati potongan.");
        alert(`✅ Status diubah ke: ${status}`);
        return;
      }

      const potonganSeller = Math.round(subtotal * 0.05);
      const potonganDriverOngkir = Math.round(ongkir * 0.05);
      const biayaLayanan = Math.round((subtotal + ongkir) * 0.01);
      const totalPotonganDriver = potonganDriverOngkir + biayaLayanan;

      await db.runTransaction(async (t) => {
        const tokoSnap = await t.get(tokoRef);
        const driverSnap = await t.get(driverRef);

        const saldoTokoAkhir = (tokoSnap.data().saldo || 0) - potonganSeller;
        const saldoDriverAkhir = (driverSnap.data().saldo || 0) - totalPotonganDriver;

        t.update(tokoRef, { saldo: saldoTokoAkhir });
        t.update(driverRef, { saldo: saldoDriverAkhir });
        t.update(pesananRef, { sudahDiprosesPotong: true });

        const waktuPesan = firebase.firestore.FieldValue.serverTimestamp();

        t.set(
          db.collection("pesan_toko").doc(tokoSnap.data().idToko).collection("pesan").doc(),
          {
            idToko: tokoSnap.data().idToko,
            perihal: "Pemotongan Saldo",
            keterangan: `Saldo kamu dipotong Rp${potonganSeller.toLocaleString("id-ID")} untuk pesanan #${idPesanan}.`,
            waktu: waktuPesan,
            dibaca: false,
            dari: "Sistem",
          }
        );

        t.set(
          db.collection("pesan_driver").doc(driverDoc.id).collection("pesan").doc(),
          {
            idDriver: idDriverVal,
            perihal: "Pemotongan Saldo",
            keterangan: `Saldo kamu dipotong Rp${totalPotonganDriver.toLocaleString("id-ID")} untuk pesanan #${idPesanan}.`,
            waktu: waktuPesan,
            dibaca: false,
            dari: "Sistem",
          }
        );
      });

      console.log("✅ Potongan saldo COD berhasil.");
    }

    // ✅ TAMBAH SALDO JIKA METODE SALDO + STATUS "Selesai"
    if (status === "Selesai" && metode === "saldo") {
      const metodePengiriman = (dataPesanan.metodePengiriman || "").toLowerCase();

      let sellerDiterima = Math.round(subtotal * 0.95);
      let driverDiterima = Math.round(ongkir * 0.95);

      if (metodePengiriman === "priority") {
        sellerDiterima += 1500;
        driverDiterima += 1000;
      }

      await db.runTransaction(async (t) => {
        const tokoSnap = await t.get(tokoRef);
        const driverSnap = await t.get(driverRef);

        const saldoTokoAkhir = (tokoSnap.data().saldo || 0) + sellerDiterima;
        const saldoDriverAkhir = (driverSnap.data().saldo || 0) + driverDiterima;

        t.update(tokoRef, { saldo: saldoTokoAkhir });
        t.update(driverRef, { saldo: saldoDriverAkhir });

        const waktuPesan = firebase.firestore.FieldValue.serverTimestamp();

        t.set(
          db.collection("pesan_toko").doc(tokoSnap.data().idToko).collection("pesan").doc(),
          {
            idToko: tokoSnap.data().idToko,
            perihal: "Penambahan Saldo",
            keterangan: `Saldo kamu bertambah Rp${sellerDiterima.toLocaleString("id-ID")} dari pesanan #${idPesanan}.`,
            waktu: waktuPesan,
            dibaca: false,
            dari: "Sistem",
          }
        );

        t.set(
          db.collection("pesan_driver").doc(driverDoc.id).collection("pesan").doc(),
          {
            idDriver: idDriverVal,
            perihal: "Penambahan Saldo",
            keterangan: `Saldo kamu bertambah Rp${driverDiterima.toLocaleString("id-ID")} dari pesanan #${idPesanan}.`,
            waktu: waktuPesan,
            dibaca: false,
            dari: "Sistem",
          }
        );
      });

      console.log("✅ Penambahan saldo berhasil.");
    }

    alert(`✅ Status diubah ke: ${status}`);
    await bukaDetailPesananDriver(idPesanan);

  } catch (err) {
    console.error("❌ Gagal update status:", err);
    alert(err.message || "❌ Terjadi kesalahan.");
  }
}




function tampilkanRute(id) {
  const mapData = window[`map_${id}`];
  if (!mapData) return;

  const { map, pesanan } = mapData;

  if (!pesanan.lokasiDriver || !pesanan.lokasiToko || !pesanan.lokasiCustomer) {
    alert("❌ Lokasi tidak lengkap.");
    return;
  }

  const route = [
    [pesanan.lokasiDriver.lat, pesanan.lokasiDriver.lng],
    [pesanan.lokasiToko.lat, pesanan.lokasiToko.lng],
    [pesanan.lokasiCustomer.lat, pesanan.lokasiCustomer.lng],
  ];

  L.polyline(route, { color: 'blue', weight: 5 }).addTo(map);
  map.fitBounds(route);
}

async function autoAmbilPendingPesanan(driverId, lokasiDriver) {
  const db = firebase.firestore();

  const sedangProses = await cekDriverSedangProses(driverId);
  if (sedangProses) return; // ❌ Driver sudah punya pesanan

  const pendingSnap = await db.collection("pending_driver_queue")
    .orderBy("createdAt")
    .get();

  if (pendingSnap.empty) return;

  let pesananTerdekat = null;
  let jarakTerdekat = Infinity;

  for (const doc of pendingSnap.docs) {
    const data = doc.data();

    const pesananDoc = await db.collection("pesanan").doc(data.idPesanan).get();
    if (!pesananDoc.exists) continue;

    const pesanan = pesananDoc.data();
    const tokoDoc = await db.collection("toko").doc(pesanan.produk[0]?.idToko).get();
    const lokasiTokoGeo = tokoDoc.exists ? tokoDoc.data().koordinat : null;
    const lokasiToko = lokasiTokoGeo ? {
      lat: lokasiTokoGeo.latitude,
      lng: lokasiTokoGeo.longitude
    } : null;

    const jarak = hitungJarakKM(lokasiDriver, lokasiToko);
    if (jarak < jarakTerdekat) {
      jarakTerdekat = jarak;
      pesananTerdekat = {
        idDokQueue: doc.id,
        idPesanan: data.idPesanan
      };
    }
  }

  if (pesananTerdekat) {
    // Update pesanan_driver
    const pesananDriverSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", pesananTerdekat.idPesanan)
      .get();

    if (!pesananDriverSnap.empty) {
      const docId = pesananDriverSnap.docs[0].id;
      await db.collection("pesanan_driver").doc(docId).update({
        idDriver: driverId,
        status: "Menunggu Ambil",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Hapus dari antrean pending
      await db.collection("pending_driver_queue").doc(pesananTerdekat.idDokQueue).delete();
    }
  }
}

async function terimaPesananDriver(idPesananDriver, idPesanan) {
  const user = firebase.auth().currentUser;
  const db = firebase.firestore();

  const sedangProses = await cekDriverSedangProses(user.uid);
  if (sedangProses) {
    alert("❌ Kamu masih punya pesanan yang sedang berjalan.");
    return;
  }

  await db.collection("pesanan_driver").doc(idPesananDriver).update({
    idDriver: user.uid,
    status: "Diterima",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("✅ Pesanan berhasil diambil!");
  loadContent("driver-dashboard");
}


async function cekDriverSedangProses(driverId) {
  const db = firebase.firestore();

  const snap = await db.collection("pesanan_driver")
    .where("idDriver", "==", driverId)
    .where("status", "in", ["Diterima", "Menuju Resto", "Pickup Pesanan", "Menuju Customer"])
    .get();

  return !snap.empty; // Jika ada → sedang proses
}


async function kirimPesananKeDriverAktif(idPesanan) {
  const db = firebase.firestore();

  try {
    // Ambil semua driver dengan status aktif
    const driverSnap = await db.collection("driver")
      .where("status", "==", "aktif")
      .get();

    if (driverSnap.empty) {
      alert("❌ Tidak ada driver aktif saat ini.");
      return;
    }

    // Pilih driver secara acak
    const drivers = driverSnap.docs;
    const driverTerpilih = drivers[Math.floor(Math.random() * drivers.length)];
    const idDriver = driverTerpilih.id;

    // Buat dokumen baru di pesanan_driver
    await db.collection("pesanan_driver").add({
      idDriver: idDriver,
      idPesanan: idPesanan,
      status: "Menunggu Ambil",
      waktuAmbil: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert(`✅ Pesanan berhasil diteruskan ke driver: ${driverTerpilih.data().nama || idDriver}`);
  } catch (error) {
    console.error("❌ Gagal kirim pesanan ke driver aktif:", error);
    alert("❌ Terjadi kesalahan saat mengirim pesanan ke driver.");
  }
}


async function ambilPesananDriverOtomatis(uidDriver) {
  const db = firebase.firestore();

  try {
    const queueSnap = await db.collection("pending_driver_queue")
                              .orderBy("createdAt", "asc")
                              .limit(1)
                              .get();

    if (!queueSnap.empty) {
      const queueDoc = queueSnap.docs[0];
      const { idPesanan } = queueDoc.data();

      // Cek apakah pesanan_driver sudah ada untuk idPesanan ini
      const checkSnap = await db.collection("pesanan_driver")
                                .where("idPesanan", "==", idPesanan)
                                .limit(1)
                                .get();

      if (checkSnap.empty) {
        await db.collection("pesanan_driver").add({
          idDriver: uidDriver,
          idPesanan,
          status: "Menunggu Ambil",
          waktuAmbil: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("pending_driver_queue").doc(queueDoc.id).delete();
        console.log(`✅ Pesanan ${idPesanan} dikirim otomatis ke driver ${uidDriver}`);
      }
    }
  } catch (error) {
    console.error("❌ Gagal ambil pesanan otomatis:", error);
  }
}

async function ubahStatusPesananSeller(idPesanan, statusBaru) {
  const db = firebase.firestore();
  try {
    await db.collection("pesanan").doc(idPesanan).update({
      status: statusBaru,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(
        `${new Date().toLocaleTimeString("id-ID")} Seller mengubah status menjadi ${statusBaru}`
      )
    });

    const driverSnap = await db.collection("pesanan_driver")
                               .where("idPesanan", "==", idPesanan)
                               .limit(1)
                               .get();

    if (!driverSnap.empty) {
      const driverDocId = driverSnap.docs[0].id;
      await db.collection("pesanan_driver").doc(driverDocId).update({
        status: statusBaru
      });
    }

    alert("✅ Status pesanan diperbarui.");
    loadContent("seller-dashboard");
  } catch (e) {
    console.error("❌ Gagal ubah status:", e);
    alert("❌ Gagal mengubah status pesanan.");
  }
}



async function ubahStatusPesananSeller(idPesanan, statusBaru) {
  const db = firebase.firestore();
  try {
    await db.collection("pesanan").doc(idPesanan).update({
      status: statusBaru,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(
        `${new Date().toLocaleTimeString("id-ID")} Seller mengubah status menjadi ${statusBaru}`
      )
    });

    const driverSnap = await db.collection("pesanan_driver").where("idPesanan", "==", idPesanan).limit(1).get();
    if (!driverSnap.empty) {
      const driverDocId = driverSnap.docs[0].id;
      await db.collection("pesanan_driver").doc(driverDocId).update({
        status: statusBaru
      });
    }

    alert("✅ Status pesanan diperbarui.");
    loadContent("seller-dashboard");
  } catch (e) {
    console.error("❌ Gagal ubah status:", e);
    alert("❌ Gagal mengubah status pesanan.");
  }
}



async function tambahDriverForm() {
  const uid = document.getElementById("input-uid-driver").value.trim();
  const nama = document.getElementById("input-nama-driver").value.trim();
  const alamat = document.getElementById("input-alamat-driver").value.trim();
  const plat = document.getElementById("input-plat-driver").value.trim();
  const file = document.getElementById("input-ktp-driver").files[0];
  const statusEl = document.getElementById("status-upload-ktp");

  if (!uid || !nama || !alamat || !plat || !file) return alert("❌ Lengkapi semua kolom!");

  // Upload ke Cloudinary
  let urlGambar = "";
  statusEl.innerText = "⏳ Mengupload gambar...";
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "VLCrave-Express");
    formData.append("folder", "folder");

    const response = await fetch("https://api.cloudinary.com/v1_1/du8gsffhb/image/upload", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (!result.secure_url) throw new Error("Gagal mendapatkan URL gambar.");
    urlGambar = result.secure_url;
    statusEl.innerText = "✅ Gambar berhasil diupload.";
  } catch (err) {
    console.error("❌ Upload gagal:", err);
    statusEl.innerText = "❌ Gagal upload gambar.";
    alert("❌ Upload gambar gagal. Coba lagi.");
    return;
  }

  // Simpan ke Firestore
  const db = firebase.firestore();
  const idDriver = "VLD-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  const dataDriver = {
    idDriver: uid,
    nama,
    alamat,
    nomorPlat: plat,
    urlKTP: urlGambar,
    status: "nonaktif",
    saldo: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("driver").doc(idDriver).set(dataDriver);
    alert("✅ Driver berhasil ditambahkan.");
    loadContent("admin-driver");
  } catch (err) {
    console.error("❌ Gagal simpan driver:", err);
    alert("❌ Gagal menyimpan driver.");
  }
}





async function toggleStatusDriver(driverId, currentStatus) {
  const db = firebase.firestore();
  const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";
  await db.collection("driver").doc(driverId).update({ status: newStatus });
  alert(`✅ Status driver diubah menjadi ${newStatus}`);
  loadContent("admin-driver");
}


async function editDriver(driverId) {
  const db = firebase.firestore();
  try {
    const doc = await db.collection("driver").doc(driverId).get();
    if (!doc.exists) return alert("❌ Data driver tidak ditemukan.");

    const data = doc.data();
    const nama = prompt("Edit Nama:", data.nama || "");
    const plat = prompt("Edit Nomor Plat:", data.nomorPlat || "");
    const urlKTP = prompt("Edit URL Foto KTP:", data.urlKTP || "");
    const status = prompt("Status (aktif / nonaktif):", data.status || "nonaktif");

    if (!nama || !plat || !urlKTP || !["aktif", "nonaktif"].includes(status.toLowerCase()))
      return alert("❌ Data tidak valid.");

    await db.collection("driver").doc(driverId).update({
      nama,
      nomorPlat: plat,
      urlKTP,
      status: status.toLowerCase()
    });

    alert("✅ Data driver berhasil diperbarui.");
    loadContent("admin-driver");
  } catch (err) {
    console.error("Gagal edit driver:", err);
    alert("❌ Terjadi kesalahan saat mengedit driver.");
  }
}

async function hapusDriver(driverId) {
  if (!confirm("Yakin ingin menghapus driver ini?")) return;

  const db = firebase.firestore();
  try {
    await db.collection("driver").doc(driverId).delete();
    alert("✅ Driver berhasil dihapus.");
    loadContent("admin-driver");
  } catch (err) {
    console.error("Gagal hapus driver:", err);
    alert("❌ Terjadi kesalahan saat menghapus driver.");
  }
}

async function riwayatDriver(driverId) {
  const db = firebase.firestore();
  try {
    const snap = await db.collection("pesanan_driver")
      .where("idDriver", "==", driverId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (snap.empty) return alert("🚫 Riwayat kosong untuk driver ini.");

    let pesan = `📜 Riwayat Driver (${driverId}):\n\n`;
    snap.forEach(doc => {
      const d = doc.data();
      pesan += `• ${d.idPesanan} [${d.status}]\n`;
    });

    alert(pesan);
  } catch (err) {
    console.error("Gagal ambil riwayat driver:", err);
    alert("❌ Gagal mengambil riwayat driver.");
  }
}

async function terimaPesananDriver(idPesanan) {
  const konfirmasi = confirm("Apakah kamu yakin ingin menerima pesanan ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Tidak dapat mengambil data driver.");
  const driverId = user.uid;

  try {
    // 🔍 Ambil dokumen pesanan_driver berdasarkan idPesanan
    const snap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (snap.empty) {
      alert("❌ Dokumen pesanan_driver tidak ditemukan.");
      return;
    }

    const docId = snap.docs[0].id;

    // 🔄 Update status pesanan_driver
    await db.collection("pesanan_driver").doc(docId).update({
      status: "Diterima",
      waktuAmbil: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 🔍 Ambil data pesanan utama
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");

    const dataPesanan = pesananDoc.data();
    const metode = dataPesanan.metode;
    const totalOngkir = dataPesanan.totalOngkir || 0;
    const biayaLayanan = dataPesanan.biayaLayanan || 0;
    const totalBayar = dataPesanan.total || 0;

    // 🔍 Ambil saldo driver langsung dari dokumen utama
    const driverRef = db.collection("driver").doc(driverId);
    const driverDoc = await driverRef.get();
    const saldoDriver = driverDoc.exists ? driverDoc.data().saldo || 0 : 0;

    // ⚠️ Jika metode COD, potong saldo driver 5% dari (ongkir + biaya layanan)
    if (metode === "cod") {
      const fee = Math.round((totalOngkir + biayaLayanan) * 0.05);
      if (saldoDriver < fee) {
        alert(`❌ Saldo kamu tidak cukup untuk menerima pesanan. Diperlukan Rp ${fee.toLocaleString()}`);
        return;
      }

      await driverRef.update({
        saldo: firebase.firestore.FieldValue.increment(-fee)
      });
    }

    // 🧠 Tambahkan log waktu
    const logSebelumnya = dataPesanan.stepsLog || [];
    const waktu = new Date().toLocaleTimeString("id-ID", {
      hour: '2-digit',
      minute: '2-digit'
    });
    const logBaru = `${waktu} Pesanan diterima oleh driver`;

    await pesananRef.update({
      status: "Diterima",
      stepsLog: [...logSebelumnya, logBaru]
    });

    alert("✅ Pesanan berhasil diterima.");
    loadContent("driver-dashboard");
  } catch (err) {
    console.error("❌ Gagal menerima pesanan:", err);
    alert("❌ Terjadi kesalahan saat menerima pesanan.");
  }
}







function mulaiUpdateLokasiDriver(userIdLogin) {
  if (!navigator.geolocation) {
    console.warn("❌ Geolocation tidak didukung.");
    return;
  }

  navigator.geolocation.watchPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      const db = firebase.firestore();

      // Cari dokumen driver berdasarkan idDriver (UID login)
      const snapshot = await db.collection("driver")
        .where("idDriver", "==", userIdLogin)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.error("❌ Tidak ditemukan driver dengan UID:", userIdLogin);
        return;
      }

      const docId = snapshot.docs[0].id; // VLD-xxxx

      await db.collection("driver").doc(docId).update({
        lokasi: {
          lat: latitude,
          lng: longitude
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log("📍 Lokasi driver diperbarui:", latitude, longitude);

    } catch (err) {
      console.error("❌ Gagal update lokasi driver:", err);
    }
  }, (err) => {
    console.error("❌ Gagal mendapatkan lokasi driver:", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}



function hentikanUpdateLokasiDriver() {
  if (lokasiWatchID !== null) {
    navigator.geolocation.clearWatch(lokasiWatchID);
    lokasiWatchID = null;
    console.log("⛔️ Update lokasi dihentikan.");
  }
}




// Fungsi salin UID ke clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert("UID berhasil disalin: " + text))
    .catch(() => alert("Gagal menyalin UID."));
}


async function simpanProduk(event, idToko) {
  event.preventDefault();
  const db = firebase.firestore();

  const namaProduk = document.getElementById("namaProduk").value.trim();
  const harga = parseInt(document.getElementById("harga").value);
  const stok = parseInt(document.getElementById("stok").value);
  const estimasi = parseInt(document.getElementById("estimasi").value);
  const deskripsi = document.getElementById("deskripsi").value.trim();
  const fileInput = document.getElementById("fileGambar");
  const statusUpload = document.getElementById("statusUpload");
  const kategori = document.getElementById("kategori").value;

  if (!namaProduk || !harga || !stok || !estimasi || !kategori) {
    alert("❌ Harap lengkapi semua data produk termasuk kategori.");
    return;
  }

  const file = fileInput.files[0];
  if (!file) {
    alert("❌ Harap pilih gambar produk.");
    return;
  }

  let urlGambar = "";
  try {
    // Upload ke Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "VLCrave-Express");
    formData.append("folder", "produk");

    statusUpload.textContent = "📤 Mengupload gambar ke Cloudinary...";
    const res = await fetch("https://api.cloudinary.com/v1_1/du8gsffhb/image/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (data.secure_url) {
      urlGambar = data.secure_url;
      statusUpload.textContent = "✅ Gambar berhasil diupload.";
    } else {
      throw new Error("Upload gagal, tidak ada secure_url.");
    }

    // Ambil Add-On jika ada (opsional, meskipun tidak disimpan ke subkoleksi)
    const addonNodes = document.querySelectorAll(".addon-item");
    const addOn = Array.from(addonNodes).map(node => {
      return {
        nama: node.querySelector('.addon-nama').value.trim(),
        harga: parseInt(node.querySelector('.addon-harga').value)
      };
    }).filter(a => a.nama && a.harga);

    // 🔧 Buat custom ID (misalnya VLC-1234)
    const random4Digit = Math.floor(1000 + Math.random() * 9000);
    const customId = `VLC-${random4Digit}`;

    // Pastikan tidak ada duplikat ID (opsional tapi disarankan)
    const check = await db.collection("produk").doc(customId).get();
    if (check.exists) {
      alert("⚠️ Gagal membuat ID unik. Silakan coba lagi.");
      return;
    }

    // Simpan produk ke Firestore dengan custom ID
    const dataProduk = {
      idProduk: customId,
      idToko,
      namaProduk,
      harga,
      stok,
      estimasi,
      deskripsi,
      kategori,
      urlGambar,
      addOn,
      dibuat: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("produk").doc(customId).set(dataProduk);

    alert("✅ Produk berhasil ditambahkan!");
    kelolaProduk(idToko);
  } catch (err) {
    console.error("❌ Gagal menyimpan produk:", err);
    alert("❌ Gagal menyimpan produk.");
  }
}



async function editProduk(docId, idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="delivery-admin-loading">
      <div class="delivery-admin-spinner"></div>
      <p>Memuat form edit produk...</p>
    </div>
  `;

  const db = firebase.firestore();
  try {
    const doc = await db.collection("produk").doc(docId).get();
    if (!doc.exists) {
      container.innerHTML = `
        <div class="delivery-admin-error">
          <div class="delivery-admin-error-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Produk Tidak Ditemukan</h3>
          <p>Produk yang Anda cari tidak ditemukan dalam sistem.</p>
          <button class="delivery-admin-btn-secondary" onclick="kelolaProduk('${idToko}')">
            Kembali ke Kelola Produk
          </button>
        </div>
      `;
      return;
    }

    const p = doc.data();

    const semuaKategori = [
      { label: "🍕 Martabak", value: "Martabak" },
      { label: "🍜 Bakso", value: "Bakso" },
      { label: "🍞 Roti", value: "Roti" },
      { label: "🍪 Jajanan", value: "Jajanan" },
      { label: "🥤 Minuman", value: "Minuman" },
      { label: "🎂 Kue", value: "Kue" },
      { label: "🔥 Promo", value: "Promo" },
      { label: "⭐ Terfavorit", value: "Terfavorit" },
      { label: "💰 Hemat", value: "Hemat" },
      { label: "📍 Terdekat", value: "Terdekat" },
      { label: "💲 Termurah", value: "Termurah" },
      { label: "🕒 24 Jam", value: "24jam" },
      { label: "🥗 Sehat", value: "Sehat" },
      { label: "🍚 Aneka Nasi", value: "Aneka Nasi" },
      { label: "🍽️ Aneka Makanan", value: "Aneka Makanan" },
      { label: "🥘 Lauk", value: "Lauk" },
      { label: "🌅 Sarapan", value: "Sarapan" },
      { label: "☀️ Makan Siang", value: "Makan Siang" },
      { label: "🌙 Makan Malam", value: "Makan Malam" },
      { label: "🍗 Ayam", value: "Ayam" },
      { label: "🍢 Sate", value: "Sate" }
    ];

    container.innerHTML = `
      <div class="delivery-admin-container">
        <!-- Header Section -->
        <div class="delivery-admin-header">
          <div class="delivery-admin-header-content">
            <div class="delivery-admin-breadcrumb">
              <button class="delivery-admin-breadcrumb-btn" onclick="kelolaProduk('${idToko}')">
                <i class="fas fa-arrow-left"></i>
                Kelola Produk
              </button>
              <span class="delivery-admin-breadcrumb-separator">/</span>
              <span class="delivery-admin-breadcrumb-current">Edit Produk</span>
            </div>
            <h1 class="delivery-admin-title">
              <i class="fas fa-edit delivery-admin-title-icon"></i>
              Edit Produk
            </h1>
            <p class="delivery-admin-subtitle">
              Perbarui informasi produk untuk meningkatkan penjualan
            </p>
          </div>
        </div>

        <!-- Product Preview -->
        <div class="delivery-edit-product-preview">
          <div class="delivery-edit-product-image">
            <img src="${p.urlGambar || './img/toko-pict.png'}" alt="${p.namaProduk}" 
                 onerror="this.src='./img/toko-pict.png'">
          </div>
          <div class="delivery-edit-product-info">
            <h3 class="delivery-edit-product-name">${p.namaProduk}</h3>
            <p class="delivery-edit-product-price">Rp ${Number(p.harga || 0).toLocaleString("id-ID")}</p>
            <p class="delivery-edit-product-stock ${(p.stok || 0) <= 0 ? 'delivery-edit-product-outstock' : ''}">
              Stok: ${p.stok || 0}
            </p>
          </div>
        </div>

        <!-- Edit Form -->
        <div class="delivery-form-container">
          <form class="delivery-form" id="editProdukForm" onsubmit="simpanEditProduk(event, '${docId}', '${idToko}')">
            <!-- Informasi Dasar -->
            <div class="delivery-form-section">
              <div class="delivery-form-section-header">
                <i class="fas fa-info-circle delivery-form-section-icon"></i>
                <h3 class="delivery-form-section-title">Informasi Dasar Produk</h3>
              </div>
              
              <div class="delivery-form-grid">
                <div class="delivery-form-group">
                  <label for="namaProduk" class="delivery-form-label">
                    <i class="fas fa-tag"></i>
                    Nama Produk
                    <span class="delivery-form-required">*</span>
                  </label>
                  <input 
                    id="namaProduk" 
                    type="text" 
                    class="delivery-form-input" 
                    value="${p.namaProduk || ''}" 
                    placeholder="Masukkan nama produk"
                    required
                    maxlength="100"
                  >
                  <div class="delivery-form-helper">
                    Maksimal 100 karakter. Gunakan nama yang menarik dan deskriptif.
                  </div>
                </div>

                <div class="delivery-form-group">
                  <label for="harga" class="delivery-form-label">
                    <i class="fas fa-tag"></i>
                    Harga Produk
                    <span class="delivery-form-required">*</span>
                  </label>
                  <div class="delivery-form-input-group">
                    <span class="delivery-form-input-prefix">Rp</span>
                    <input 
                      id="harga" 
                      type="number" 
                      class="delivery-form-input delivery-form-input-with-prefix" 
                      value="${p.harga || 0}"
                      placeholder="0"
                      min="1000"
                      step="500"
                      required
                    >
                  </div>
                  <div class="delivery-form-helper">
                    Minimum harga Rp 1.000. Harga akan ditampilkan kepada pelanggan.
                  </div>
                </div>
              </div>

              <div class="delivery-form-grid">
                <div class="delivery-form-group">
                  <label for="stok" class="delivery-form-label">
                    <i class="fas fa-boxes"></i>
                    Stok Tersedia
                    <span class="delivery-form-required">*</span>
                  </label>
                  <input 
                    id="stok" 
                    type="number" 
                    class="delivery-form-input" 
                    value="${p.stok || 0}"
                    placeholder="0"
                    min="0"
                    max="9999"
                    required
                  >
                  <div class="delivery-form-helper">
                    Jumlah stok yang tersedia. Isi 0 jika produk sedang tidak tersedia.
                  </div>
                </div>

                <div class="delivery-form-group">
                  <label for="estimasi" class="delivery-form-label">
                    <i class="fas fa-clock"></i>
                    Estimasi Persiapan
                    <span class="delivery-form-required">*</span>
                  </label>
                  <div class="delivery-form-input-group">
                    <input 
                      id="estimasi" 
                      type="number" 
                      class="delivery-form-input delivery-form-input-with-suffix" 
                      value="${p.estimasi || 10}"
                      min="1"
                      max="120"
                      required
                    >
                    <span class="delivery-form-input-suffix">menit</span>
                  </div>
                  <div class="delivery-form-helper">
                    Waktu yang dibutuhkan untuk menyiapkan produk (1-120 menit).
                  </div>
                </div>
              </div>

              <div class="delivery-form-group">
                <label for="deskripsi" class="delivery-form-label">
                  <i class="fas fa-align-left"></i>
                  Deskripsi Produk
                </label>
                <textarea 
                  id="deskripsi" 
                  class="delivery-form-textarea" 
                  placeholder="Deskripsikan produk Anda secara detail. Contoh: Bahan-bahan, ukuran, rasa, dll."
                  rows="4"
                  maxlength="500"
                >${p.deskripsi || ""}</textarea>
                <div class="delivery-form-helper">
                  Maksimal 500 karakter. Deskripsi yang baik dapat meningkatkan penjualan.
                  <span class="delivery-form-char-count">${(p.deskripsi || "").length}/500</span>
                </div>
              </div>
            </div>

            <!-- Gambar Produk -->
            <div class="delivery-form-section">
              <div class="delivery-form-section-header">
                <i class="fas fa-images delivery-form-section-icon"></i>
                <h3 class="delivery-form-section-title">Gambar Produk</h3>
              </div>

              <div class="delivery-form-group">
                <label class="delivery-form-label">
                  <i class="fas fa-camera"></i>
                  Gambar Saat Ini
                </label>
                <div class="delivery-edit-current-image">
                  <img src="${p.urlGambar || './img/toko-pict.png'}" 
                       alt="Gambar Saat Ini" 
                       class="delivery-edit-current-image-preview"
                       onerror="this.src='./img/toko-pict.png'">
                  <div class="delivery-edit-current-image-info">
                    <p>Gambar produk saat ini</p>
                    <small>Klik upload di bawah untuk mengganti gambar</small>
                  </div>
                </div>
              </div>

              <div class="delivery-form-group">
                <label class="delivery-form-label">
                  <i class="fas fa-upload"></i>
                  Upload Gambar Baru
                  <span class="delivery-form-optional">(opsional)</span>
                </label>
                <div class="delivery-form-upload-area" id="uploadArea">
                  <div class="delivery-form-upload-content">
                    <i class="fas fa-cloud-upload-alt delivery-form-upload-icon"></i>
                    <h4 class="delivery-form-upload-title">Upload Gambar Baru</h4>
                    <p class="delivery-form-upload-subtitle">Drag & drop atau klik untuk memilih file</p>
                    <p class="delivery-form-upload-info">Format: JPG, PNG, GIF (Maks. 5MB)</p>
                  </div>
                  <input 
                    id="fileGambar" 
                    type="file" 
                    accept="image/*" 
                    class="delivery-form-file-input"
                  >
                </div>
                <div id="uploadPreview" class="delivery-form-upload-preview"></div>
                <div id="statusUpload" class="delivery-form-upload-status"></div>
              </div>
            </div>

            <!-- Kategori Produk -->
            <div class="delivery-form-section">
              <div class="delivery-form-section-header">
                <i class="fas fa-tags delivery-form-section-icon"></i>
                <h3 class="delivery-form-section-title">Kategori Produk</h3>
              </div>

              <div class="delivery-form-group">
                <label for="kategori" class="delivery-form-label">
                  <i class="fas fa-folder"></i>
                  Pilih Kategori
                  <span class="delivery-form-required">*</span>
                </label>
                <select id="kategori" class="delivery-form-select" required>
                  <option value="">-- Pilih Kategori --</option>
                  ${semuaKategori.map(kat => `
                    <option value="${kat.value}" ${p.kategori === kat.value ? "selected" : ""}>
                      ${kat.label}
                    </option>
                  `).join("")}
                </select>
                <div class="delivery-form-helper">
                  Pilih kategori yang paling sesuai dengan produk Anda.
                </div>
              </div>

              <!-- Quick Category Tags -->
              <div class="delivery-form-group">
                <label class="delivery-form-label">
                  <i class="fas fa-bolt"></i>
                  Pilih Cepat Kategori
                </label>
                <div class="delivery-form-tags">
                  ${semuaKategori.map(kat => `
                    <button 
                      type="button" 
                      class="delivery-form-tag ${p.kategori === kat.value ? 'delivery-form-tag-active' : ''}"
                      onclick="document.getElementById('kategori').value = '${kat.value}'; updateActiveTag(this)"
                    >
                      ${kat.label}
                    </button>
                  `).join("")}
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="delivery-form-actions">
              <button type="button" class="delivery-form-btn-secondary" onclick="kelolaProduk('${idToko}')">
                <i class="fas fa-times"></i>
                Batal
              </button>
              <button type="submit" class="delivery-form-btn-primary">
                <i class="fas fa-save"></i>
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Setup form interactions
    setupEditFormInteractions();

  } catch (err) {
    console.error("❌ Gagal load produk:", err);
    container.innerHTML = `
      <div class="delivery-admin-error">
        <div class="delivery-admin-error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Gagal Memuat Produk</h3>
        <p>Terjadi kesalahan saat memuat data produk. Silakan coba lagi.</p>
        <div class="delivery-admin-error-actions">
          <button class="delivery-admin-btn-primary" onclick="editProduk('${docId}', '${idToko}')">
            <i class="fas fa-redo"></i>
            Coba Lagi
          </button>
          <button class="delivery-admin-btn-secondary" onclick="kelolaProduk('${idToko}')">
            Kembali ke Produk
          </button>
        </div>
      </div>
    `;
  }
}

// Helper function untuk update active tag
function updateActiveTag(clickedButton) {
  // Remove active class from all tags
  document.querySelectorAll('.delivery-form-tag').forEach(tag => {
    tag.classList.remove('delivery-form-tag-active');
  });
  
  // Add active class to clicked button
  clickedButton.classList.add('delivery-form-tag-active');
}

function setupEditFormInteractions() {
  // Character counter for description
  const descTextarea = document.getElementById('deskripsi');
  const charCount = document.querySelector('.delivery-form-char-count');
  
  if (descTextarea && charCount) {
    descTextarea.addEventListener('input', function() {
      const count = this.value.length;
      charCount.textContent = `${count}/500`;
      
      if (count > 450) {
        charCount.style.color = '#e74c3c';
      } else if (count > 400) {
        charCount.style.color = '#f39c12';
      } else {
        charCount.style.color = '#27ae60';
      }
    });
  }

  // Image upload preview
  const fileInput = document.getElementById('fileGambar');
  const uploadArea = document.getElementById('uploadArea');
  const uploadPreview = document.getElementById('uploadPreview');
  const statusUpload = document.getElementById('statusUpload');

  if (fileInput && uploadArea) {
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('delivery-form-upload-dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      this.classList.remove('delivery-form-upload-dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('delivery-form-upload-dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleImageUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', function(e) {
      if (this.files.length > 0) {
        handleImageUpload(this.files[0]);
      }
    });

    function handleImageUpload(file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        statusUpload.innerHTML = '<div class="delivery-form-upload-error">Format file tidak didukung. Gunakan JPG, PNG, atau GIF.</div>';
        return;
      }

      if (file.size > maxSize) {
        statusUpload.innerHTML = '<div class="delivery-form-upload-error">Ukuran file terlalu besar. Maksimal 5MB.</div>';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function(e) {
        uploadPreview.innerHTML = `
          <div class="delivery-form-upload-preview-content">
            <img src="${e.target.result}" alt="Preview" class="delivery-form-upload-preview-image">
            <button type="button" class="delivery-form-upload-preview-remove" onclick="removeImagePreview()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
        statusUpload.innerHTML = '<div class="delivery-form-upload-success">Gambar berhasil diupload! Akan mengganti gambar saat ini ketika disimpan.</div>';
      };
      reader.readAsDataURL(file);
    }
  }

  // Price formatting
  const hargaInput = document.getElementById('harga');
  if (hargaInput) {
    hargaInput.addEventListener('input', function() {
      const value = parseInt(this.value) || 0;
      if (value < 1000 && value > 0) {
        this.setCustomValidity('Harga minimum Rp 1.000');
      } else {
        this.setCustomValidity('');
      }
    });
  }
}

function removeImagePreview() {
  const uploadPreview = document.getElementById('uploadPreview');
  const statusUpload = document.getElementById('statusUpload');
  const fileInput = document.getElementById('fileGambar');
  
  if (uploadPreview) uploadPreview.innerHTML = '';
  if (statusUpload) statusUpload.innerHTML = '';
  if (fileInput) fileInput.value = '';
}

// Add CSS styles for edit product form
const editProductStyles = `
  <style>
    /* Product Preview */
    .delivery-edit-product-preview {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 1.5rem;
      gap: 1rem;
    }

    .delivery-edit-product-image {
      width: 80px;
      height: 80px;
      border-radius: 0.75rem;
      overflow: hidden;
      flex-shrink: 0;
    }

    .delivery-edit-product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .delivery-edit-product-info {
      flex: 1;
    }

    .delivery-edit-product-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .delivery-edit-product-price {
      font-size: 1.125rem;
      font-weight: 600;
      color: #3498db;
      margin: 0 0 0.25rem 0;
    }

    .delivery-edit-product-stock {
      font-size: 0.875rem;
      color: #27ae60;
      margin: 0;
    }

    .delivery-edit-product-outstock {
      color: #e74c3c !important;
    }

    /* Current Image Preview */
    .delivery-edit-current-image {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 0.75rem;
      border: 1px solid #e9ecef;
    }

    .delivery-edit-current-image-preview {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 0.5rem;
      flex-shrink: 0;
    }

    .delivery-edit-current-image-info {
      flex: 1;
    }

    .delivery-edit-current-image-info p {
      margin: 0 0 0.25rem 0;
      font-weight: 500;
      color: #2c3e50;
    }

    .delivery-edit-current-image-info small {
      color: #6c757d;
      font-size: 0.75rem;
    }

    /* Form Tags */
    .delivery-form-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .delivery-form-tag {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #bbdefb;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .delivery-form-tag:hover {
      background: #1976d2;
      color: white;
      transform: translateY(-1px);
    }

    .delivery-form-tag-active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .delivery-edit-product-preview {
        flex-direction: column;
        text-align: center;
        padding: 1rem;
      }

      .delivery-edit-current-image {
        flex-direction: column;
        text-align: center;
      }

      .delivery-form-tags {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .delivery-edit-product-image {
        width: 60px;
        height: 60px;
      }

      .delivery-edit-current-image-preview {
        width: 60px;
        height: 60px;
      }
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-edit-product-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-edit-product-styles';
  styleElement.textContent = editProductStyles;
  document.head.appendChild(styleElement);
}


async function simpanEditProduk(event, docId, idToko) {
  event.preventDefault();
  const db = firebase.firestore();

  const namaProduk = document.getElementById("namaProduk").value.trim();
  const harga = parseInt(document.getElementById("harga").value);
  const stok = parseInt(document.getElementById("stok").value);
  const estimasi = parseInt(document.getElementById("estimasi").value);
  const deskripsi = document.getElementById("deskripsi").value.trim();
  const fileInput = document.getElementById("fileGambar");
  const statusUpload = document.getElementById("statusUpload");
  const kategori = document.getElementById("kategori").value;

  // Validasi input
  if (!namaProduk || !harga || !stok || !estimasi || !kategori) {
    alert("❌ Harap lengkapi semua data termasuk kategori.");
    return;
  }

  try {
    // Ambil data lama (untuk mempertahankan gambar lama jika tidak diganti)
    const doc = await db.collection("produk").doc(docId).get();
    const dataLama = doc.data();
    let urlGambar = dataLama.urlGambar;

    const file = fileInput.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "VLCrave-Express");
      formData.append("folder", "produk");

      statusUpload.textContent = "📤 Upload gambar ke Cloudinary...";
      const res = await fetch("https://api.cloudinary.com/v1_1/du8gsffhb/image/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.secure_url) {
        urlGambar = data.secure_url;
        statusUpload.textContent = "✅ Gambar berhasil diupload.";
      } else {
        throw new Error("Upload gagal, tidak ada secure_url.");
      }
    }

    const updateData = {
      namaProduk,
      harga,
      stok,
      estimasi,
      deskripsi,
      kategori, // ✅ hanya value string
      urlGambar,
      diupdate: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("produk").doc(docId).update(updateData);
    alert("✅ Produk berhasil diperbarui!");
    kelolaProduk(idToko);
  } catch (err) {
    console.error("❌ Gagal update produk:", err);
    alert("❌ Gagal menyimpan perubahan produk.");
  }
}



async function updateProduk(event, idProduk, idToko) {
  event.preventDefault();
  const db = firebase.firestore();

  // Mengambil data dari form
  const data = {
    nama: document.getElementById("namaProduk").value.trim(),
    harga: parseInt(document.getElementById("hargaProduk").value),
    estimasi: parseInt(document.getElementById("estimasiMasak").value),
    kategori: document.getElementById("kategoriProduk").value.trim(),  // Menambahkan kategori
    gambar: document.getElementById("gambarProduk").value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Mengupdate data produk di Firestore
    await db.collection("produk").doc(idProduk).update(data);
    alert("✅ Produk berhasil diupdate");
    kelolaProduk(idToko);  // Kembali ke halaman kelola produk
  } catch (err) {
    alert("❌ Gagal update: " + err.message);
  }
}

async function hapusProduk(docId, idToko) {
  const konfirmasi = confirm("Apakah kamu yakin ingin menghapus produk ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  try {
    // Menghapus produk dari koleksi Firestore
    await db.collection("produk").doc(docId).delete();
    alert("🗑️ Produk berhasil dihapus.");
    kelolaProduk(idToko);  // Kembali ke halaman kelola produk
  } catch (err) {
    console.error("❌ Gagal hapus produk:", err);
    alert("❌ Gagal menghapus produk: " + err.message);
  }
}



async function kelolaProduk(idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="delivery-admin-loading">
      <div class="delivery-admin-spinner"></div>
      <p>Memuat data produk...</p>
    </div>
  `;

  const db = firebase.firestore();

  try {
    const tokoDoc = await db.collection("toko").doc(idToko).get();
    if (!tokoDoc.exists) {
      container.innerHTML = `
        <div class="delivery-admin-error">
          <div class="delivery-admin-error-icon">❌</div>
          <h3>Toko Tidak Ditemukan</h3>
          <p>Toko yang Anda cari tidak ditemukan dalam sistem.</p>
          <button class="delivery-admin-btn-secondary" onclick="loadContent('seller-dashboard')">
            Kembali ke Dashboard
          </button>
        </div>
      `;
      return;
    }

    const toko = tokoDoc.data();
    const produkSnap = await db.collection("produk").where("idToko", "==", idToko).get();

    let html = `
      <div class="delivery-admin-container">
        <!-- Header Section -->
        <div class="delivery-admin-header">
          <div class="delivery-admin-header-content">
            <div class="delivery-admin-breadcrumb">
              <button class="delivery-admin-breadcrumb-btn" onclick="loadContent('seller-dashboard')">
                <i class="fas fa-arrow-left"></i>
                Dashboard
              </button>
              <span class="delivery-admin-breadcrumb-separator">/</span>
              <span class="delivery-admin-breadcrumb-current">Kelola Produk</span>
            </div>
            <h1 class="delivery-admin-title">
              <i class="fas fa-boxes delivery-admin-title-icon"></i>
              Kelola Produk
            </h1>
            <p class="delivery-admin-subtitle">Mengelola produk untuk toko <strong>"${toko.namaToko}"</strong></p>
          </div>
          <button class="delivery-admin-btn-primary" onclick="formTambahProduk('${idToko}')">
            <i class="fas fa-plus"></i>
            Tambah Produk Baru
          </button>
        </div>

        <!-- Stats Overview -->
        <div class="delivery-admin-stats-grid">
          <div class="delivery-admin-stat-card">
            <div class="delivery-admin-stat-icon delivery-admin-stat-primary">
              <i class="fas fa-box"></i>
            </div>
            <div class="delivery-admin-stat-content">
              <h3 class="delivery-admin-stat-value">${produkSnap.size}</h3>
              <p class="delivery-admin-stat-label">Total Produk</p>
            </div>
          </div>
          <div class="delivery-admin-stat-card">
            <div class="delivery-admin-stat-icon delivery-admin-stat-success">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="delivery-admin-stat-content">
              <h3 class="delivery-admin-stat-value">
                ${produkSnap.docs.filter(doc => (doc.data().stok || 0) > 0).length}
              </h3>
              <p class="delivery-admin-stat-label">Produk Tersedia</p>
            </div>
          </div>
          <div class="delivery-admin-stat-card">
            <div class="delivery-admin-stat-icon delivery-admin-stat-warning">
              <i class="fas fa-clock"></i>
            </div>
            <div class="delivery-admin-stat-content">
              <h3 class="delivery-admin-stat-value">
                ${produkSnap.docs.filter(doc => !doc.data().stok || doc.data().stok <= 0).length}
              </h3>
              <p class="delivery-admin-stat-label">Stok Habis</p>
            </div>
          </div>
        </div>

        <!-- Products List -->
        <div class="delivery-admin-content">
          <div class="delivery-admin-section">
            <div class="delivery-admin-section-header">
              <h2 class="delivery-admin-section-title">
                <i class="fas fa-list-ul"></i>
                Daftar Produk
              </h2>
              <div class="delivery-admin-section-actions">
                <button class="delivery-admin-btn-outline" onclick="exportProdukData('${idToko}')">
                  <i class="fas fa-download"></i>
                  Export
                </button>
              </div>
            </div>
    `;

    if (produkSnap.empty) {
      html += `
        <div class="delivery-admin-empty-state">
          <div class="delivery-admin-empty-icon">
            <i class="fas fa-box-open"></i>
          </div>
          <h3 class="delivery-admin-empty-title">Belum Ada Produk</h3>
          <p class="delivery-admin-empty-description">
            Mulai dengan menambahkan produk pertama Anda untuk memulai penjualan.
          </p>
          <button class="delivery-admin-btn-primary" onclick="formTambahProduk('${idToko}')">
            <i class="fas fa-plus"></i>
            Tambah Produk Pertama
          </button>
        </div>
      `;
    } else {
      html += `<div class="delivery-admin-grid">`;
      
      produkSnap.forEach(doc => {
        const p = doc.data();
        const isAvailable = (p.stok || 0) > 0;
        const toggleId = `toggle-${doc.id}`;
        const deskripsi = p.deskripsi?.trim() || "Tidak ada deskripsi";
        const harga = Number(p.harga || 0);
        const stok = p.stok || 0;
        const estimasi = p.estimasi || 10;

        html += `
          <div class="delivery-admin-product-card ${!isAvailable ? 'delivery-admin-product-disabled' : ''}">
            <!-- Product Header -->
            <div class="delivery-admin-product-header">
              <div class="delivery-admin-product-badge-group">
                ${p.kategori ? `
                  <span class="delivery-admin-product-badge delivery-admin-product-badge-category">
                    <i class="fas fa-tag"></i>
                    ${p.kategori}
                  </span>
                ` : ''}
                <span class="delivery-admin-product-badge ${isAvailable ? 'delivery-admin-product-badge-success' : 'delivery-admin-product-badge-danger'}">
                  <i class="fas ${isAvailable ? 'fa-check' : 'fa-times'}"></i>
                  ${isAvailable ? 'Tersedia' : 'Kosong'}
                </span>
              </div>
              <div class="delivery-admin-product-toggle">
                <label class="delivery-admin-switch">
                  <input type="checkbox" id="${toggleId}" ${isAvailable ? "checked" : ""} 
                         onchange="toggleStatusProduk('${doc.id}', this.checked)">
                  <span class="delivery-admin-slider"></span>
                </label>
              </div>
            </div>

            <!-- Product Body -->
            <div class="delivery-admin-product-body">
              <h3 class="delivery-admin-product-title">${p.namaProduk}</h3>
              <p class="delivery-admin-product-description">${deskripsi}</p>
              
              <div class="delivery-admin-product-meta">
                <div class="delivery-admin-product-meta-item">
                  <i class="fas fa-tag delivery-admin-product-meta-icon"></i>
                  <span class="delivery-admin-product-meta-label">ID:</span>
                  <code class="delivery-admin-product-id">${doc.id.substring(0, 8)}...</code>
                </div>
                <div class="delivery-admin-product-meta-item">
                  <i class="fas fa-clock delivery-admin-product-meta-icon"></i>
                  <span class="delivery-admin-product-meta-label">Estimasi:</span>
                  <span>${estimasi} menit</span>
                </div>
              </div>

              <div class="delivery-admin-product-stats">
                <div class="delivery-admin-product-stat">
                  <span class="delivery-admin-product-stat-label">Harga</span>
                  <span class="delivery-admin-product-stat-value">Rp ${harga.toLocaleString("id-ID")}</span>
                </div>
                <div class="delivery-admin-product-stat">
                  <span class="delivery-admin-product-stat-label">Stok</span>
                  <span class="delivery-admin-product-stat-value ${stok === 0 ? 'delivery-admin-product-stat-danger' : ''}">
                    ${stok}
                  </span>
                </div>
              </div>
            </div>

            <!-- Product Actions -->
            <div class="delivery-admin-product-actions">
              <button class="delivery-admin-product-action-btn delivery-admin-product-action-primary" 
                      onclick="kelolaAddonProduk('${doc.id}', '${idToko}')">
                <i class="fas fa-cog"></i>
                Add-On
              </button>
              <button class="delivery-admin-product-action-btn delivery-admin-product-action-secondary"
                      onclick="editProduk('${doc.id}', '${idToko}')">
                <i class="fas fa-edit"></i>
                Edit
              </button>
              <button class="delivery-admin-product-action-btn delivery-admin-product-action-danger"
                      onclick="hapusProduk('${doc.id}', '${idToko}')">
                <i class="fas fa-trash"></i>
                Hapus
              </button>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }

    html += `
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (e) {
    console.error("❌ Gagal memuat produk:", e);
    container.innerHTML = `
      <div class="delivery-admin-error">
        <div class="delivery-admin-error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Gagal Memuat Produk</h3>
        <p>Terjadi kesalahan saat memuat data produk toko. Silakan coba lagi.</p>
        <div class="delivery-admin-error-actions">
          <button class="delivery-admin-btn-primary" onclick="kelolaProduk('${idToko}')">
            <i class="fas fa-redo"></i>
            Coba Lagi
          </button>
          <button class="delivery-admin-btn-secondary" onclick="loadContent('seller-dashboard')">
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

// Tambahkan CSS untuk styling yang baru
const adminStyles = `
  <style>
    /* Admin Container */
    .delivery-admin-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    /* Loading State */
    .delivery-admin-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #666;
    }

    .delivery-admin-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e3e3e3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: delivery-spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes delivery-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Header */
    .delivery-admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e9ecef;
    }

    .delivery-admin-breadcrumb {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: #6c757d;
    }

    .delivery-admin-breadcrumb-btn {
      background: none;
      border: none;
      color: #3498db;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .delivery-admin-breadcrumb-btn:hover {
      background: #f8f9fa;
    }

    .delivery-admin-breadcrumb-separator {
      margin: 0 0.5rem;
    }

    .delivery-admin-breadcrumb-current {
      color: #495057;
      font-weight: 500;
    }

    .delivery-admin-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .delivery-admin-title-icon {
      color: #3498db;
    }

    .delivery-admin-subtitle {
      color: #6c757d;
      margin: 0;
      font-size: 1rem;
    }

    /* Buttons */
    .delivery-admin-btn-primary {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }

    .delivery-admin-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }

    .delivery-admin-btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .delivery-admin-btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-1px);
    }

    .delivery-admin-btn-outline {
      background: transparent;
      color: #3498db;
      border: 2px solid #3498db;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .delivery-admin-btn-outline:hover {
      background: #3498db;
      color: white;
    }

    /* Stats Grid */
    .delivery-admin-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .delivery-admin-stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.3s ease;
    }

    .delivery-admin-stat-card:hover {
      transform: translateY(-2px);
    }

    .delivery-admin-stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .delivery-admin-stat-primary { background: #e3f2fd; color: #1976d2; }
    .delivery-admin-stat-success { background: #e8f5e8; color: #2e7d32; }
    .delivery-admin-stat-warning { background: #fff3e0; color: #f57c00; }

    .delivery-admin-stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
      color: #2c3e50;
    }

    .delivery-admin-stat-label {
      margin: 0;
      color: #6c757d;
      font-size: 0.875rem;
    }

    /* Content Sections */
    .delivery-admin-content {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .delivery-admin-section {
      padding: 1.5rem;
    }

    .delivery-admin-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .delivery-admin-section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Empty State */
    .delivery-admin-empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .delivery-admin-empty-icon {
      font-size: 4rem;
      color: #bdc3c7;
      margin-bottom: 1rem;
    }

    .delivery-admin-empty-title {
      font-size: 1.5rem;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .delivery-admin-empty-description {
      color: #7f8c8d;
      margin-bottom: 2rem;
    }

    /* Product Grid */
    .delivery-admin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    /* Product Card */
    .delivery-admin-product-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 1rem;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .delivery-admin-product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .delivery-admin-product-disabled {
      opacity: 0.7;
      background: #f8f9fa;
    }

    .delivery-admin-product-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.25rem 0;
    }

    .delivery-admin-product-badge-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .delivery-admin-product-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .delivery-admin-product-badge-category {
      background: #e3f2fd;
      color: #1976d2;
    }

    .delivery-admin-product-badge-success {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .delivery-admin-product-badge-danger {
      background: #ffebee;
      color: #c62828;
    }

    /* Toggle Switch */
    .delivery-admin-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .delivery-admin-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .delivery-admin-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 24px;
    }

    .delivery-admin-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .delivery-admin-slider {
      background-color: #27ae60;
    }

    input:checked + .delivery-admin-slider:before {
      transform: translateX(20px);
    }

    /* Product Body */
    .delivery-admin-product-body {
      padding: 1.25rem;
    }

    .delivery-admin-product-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    .delivery-admin-product-description {
      color: #6c757d;
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .delivery-admin-product-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .delivery-admin-product-meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .delivery-admin-product-meta-icon {
      color: #6c757d;
      width: 16px;
    }

    .delivery-admin-product-meta-label {
      color: #6c757d;
      font-weight: 500;
    }

    .delivery-admin-product-id {
      background: #f8f9fa;
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
    }

    .delivery-admin-product-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 0.75rem;
    }

    .delivery-admin-product-stat {
      text-align: center;
    }

    .delivery-admin-product-stat-label {
      display: block;
      font-size: 0.75rem;
      color: #6c757d;
      margin-bottom: 0.25rem;
    }

    .delivery-admin-product-stat-value {
      display: block;
      font-size: 1rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .delivery-admin-product-stat-danger {
      color: #e74c3c !important;
    }

    /* Product Actions */
    .delivery-admin-product-actions {
      display: flex;
      padding: 1rem 1.25rem;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      gap: 0.5rem;
    }

    .delivery-admin-product-action-btn {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      transition: all 0.2s ease;
    }

    .delivery-admin-product-action-primary {
      background: #3498db;
      color: white;
    }

    .delivery-admin-product-action-primary:hover {
      background: #2980b9;
    }

    .delivery-admin-product-action-secondary {
      background: #95a5a6;
      color: white;
    }

    .delivery-admin-product-action-secondary:hover {
      background: #7f8c8d;
    }

    .delivery-admin-product-action-danger {
      background: #e74c3c;
      color: white;
    }

    .delivery-admin-product-action-danger:hover {
      background: #c0392b;
    }

    /* Error State */
    .delivery-admin-error {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 500px;
      margin: 0 auto;
    }

    .delivery-admin-error-icon {
      font-size: 4rem;
      color: #e74c3c;
      margin-bottom: 1rem;
    }

    .delivery-admin-error h3 {
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .delivery-admin-error p {
      color: #7f8c8d;
      margin-bottom: 2rem;
    }

    .delivery-admin-error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .delivery-admin-header {
        flex-direction: column;
        gap: 1rem;
      }

      .delivery-admin-stats-grid {
        grid-template-columns: 1fr;
      }

      .delivery-admin-grid {
        grid-template-columns: 1fr;
      }

      .delivery-admin-section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .delivery-admin-error-actions {
        flex-direction: column;
      }
    }
  </style>
`;

// Inject styles ke dalam document
if (!document.querySelector('#delivery-admin-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-admin-styles';
  styleElement.textContent = adminStyles;
  document.head.appendChild(styleElement);
}

async function toggleStatusProduk(idProduk, isChecked) {
  const db = firebase.firestore();
  try {
    const stokBaru = isChecked ? 10 : 0; // Default stok saat dinyalakan ulang
    await db.collection("produk").doc(idProduk).update({ stok: stokBaru });
    console.log(`Produk ${idProduk} diubah ke ${isChecked ? "Tersedia" : "Stok Habis"}`);
  } catch (error) {
    alert("❌ Gagal mengubah status produk.");
    console.error(error);
  }
}





function formTambahProduk(idToko) {
  const container = document.getElementById("page-container");

  const kategoriList = [
    { label: "🍕 Martabak", value: "Martabak" },
    { label: "🍜 Bakso", value: "Bakso" },
    { label: "🍞 Roti", value: "Roti" },
    { label: "🥤 Minuman", value: "Minuman" },
    { label: "🎂 Kue", value: "Kue" },
    { label: "🍪 Jajanan", value: "Jajanan" },
    { label: "🍢 Sate", value: "Sate" },
    { label: "🍚 Aneka Nasi", value: "Nasi" },
    { label: "🍗 Ayam", value: "Ayam" },
    { label: "🍔 Cepat Saji", value: "Cepat Saji" },
    { label: "🥗 Makanan Sehat", value: "Sehat" },
    { label: "🔥 Makanan Pedas", value: "Pedas" }
  ];

  container.innerHTML = `
    <div class="delivery-admin-container">
      <!-- Header Section -->
      <div class="delivery-admin-header">
        <div class="delivery-admin-header-content">
          <div class="delivery-admin-breadcrumb">
            <button class="delivery-admin-breadcrumb-btn" onclick="kelolaProduk('${idToko}')">
              <i class="fas fa-arrow-left"></i>
              Kelola Produk
            </button>
            <span class="delivery-admin-breadcrumb-separator">/</span>
            <span class="delivery-admin-breadcrumb-current">Tambah Produk</span>
          </div>
          <h1 class="delivery-admin-title">
            <i class="fas fa-plus-circle delivery-admin-title-icon"></i>
            Tambah Produk Baru
          </h1>
          <p class="delivery-admin-subtitle">Lengkapi informasi produk untuk menambah item baru di toko Anda</p>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="delivery-form-progress">
        <div class="delivery-form-progress-step delivery-form-progress-active">
          <div class="delivery-form-progress-number">1</div>
          <span class="delivery-form-progress-label">Informasi Dasar</span>
        </div>
        <div class="delivery-form-progress-step">
          <div class="delivery-form-progress-number">2</div>
          <span class="delivery-form-progress-label">Detail Produk</span>
        </div>
        <div class="delivery-form-progress-step">
          <div class="delivery-form-progress-number">3</div>
          <span class="delivery-form-progress-label">Gambar & Kategori</span>
        </div>
      </div>

      <!-- Main Form -->
      <div class="delivery-form-container">
        <form class="delivery-form" onsubmit="simpanProduk(event, '${idToko}')" id="produkForm">
          <!-- Informasi Dasar Section -->
          <div class="delivery-form-section">
            <div class="delivery-form-section-header">
              <i class="fas fa-info-circle delivery-form-section-icon"></i>
              <h3 class="delivery-form-section-title">Informasi Dasar Produk</h3>
            </div>
            
            <div class="delivery-form-grid">
              <div class="delivery-form-group">
                <label for="namaProduk" class="delivery-form-label">
                  <i class="fas fa-tag"></i>
                  Nama Produk
                  <span class="delivery-form-required">*</span>
                </label>
                <input 
                  id="namaProduk" 
                  type="text" 
                  class="delivery-form-input" 
                  placeholder="Masukkan nama produk"
                  required
                  maxlength="100"
                >
                <div class="delivery-form-helper">
                  Maksimal 100 karakter. Gunakan nama yang menarik dan deskriptif.
                </div>
              </div>

              <div class="delivery-form-group">
                <label for="harga" class="delivery-form-label">
                  <i class="fas fa-tag"></i>
                  Harga Produk
                  <span class="delivery-form-required">*</span>
                </label>
                <div class="delivery-form-input-group">
                  <span class="delivery-form-input-prefix">Rp</span>
                  <input 
                    id="harga" 
                    type="number" 
                    class="delivery-form-input delivery-form-input-with-prefix" 
                    placeholder="0"
                    min="1000"
                    step="500"
                    required
                  >
                </div>
                <div class="delivery-form-helper">
                  Minimum harga Rp 1.000. Harga akan ditampilkan kepada pelanggan.
                </div>
              </div>
            </div>
          </div>

          <!-- Detail Produk Section -->
          <div class="delivery-form-section">
            <div class="delivery-form-section-header">
              <i class="fas fa-clipboard-list delivery-form-section-icon"></i>
              <h3 class="delivery-form-section-title">Detail Produk</h3>
            </div>
            
            <div class="delivery-form-grid">
              <div class="delivery-form-group">
                <label for="stok" class="delivery-form-label">
                  <i class="fas fa-boxes"></i>
                  Stok Tersedia
                  <span class="delivery-form-required">*</span>
                </label>
                <input 
                  id="stok" 
                  type="number" 
                  class="delivery-form-input" 
                  placeholder="0"
                  min="0"
                  max="9999"
                  required
                >
                <div class="delivery-form-helper">
                  Jumlah stok yang tersedia. Isi 0 jika produk sedang tidak tersedia.
                </div>
              </div>

              <div class="delivery-form-group">
                <label for="estimasi" class="delivery-form-label">
                  <i class="fas fa-clock"></i>
                  Estimasi Persiapan
                  <span class="delivery-form-required">*</span>
                </label>
                <div class="delivery-form-input-group">
                  <input 
                    id="estimasi" 
                    type="number" 
                    class="delivery-form-input delivery-form-input-with-suffix" 
                    value="15"
                    min="1"
                    max="120"
                    required
                  >
                  <span class="delivery-form-input-suffix">menit</span>
                </div>
                <div class="delivery-form-helper">
                  Waktu yang dibutuhkan untuk menyiapkan produk (1-120 menit).
                </div>
              </div>
            </div>

            <div class="delivery-form-group">
              <label for="deskripsi" class="delivery-form-label">
                <i class="fas fa-align-left"></i>
                Deskripsi Produk
              </label>
              <textarea 
                id="deskripsi" 
                class="delivery-form-textarea" 
                placeholder="Deskripsikan produk Anda secara detail. Contoh: Bahan-bahan, ukuran, rasa, dll."
                rows="4"
                maxlength="500"
              ></textarea>
              <div class="delivery-form-helper">
                Maksimal 500 karakter. Deskripsi yang baik dapat meningkatkan penjualan.
                <span class="delivery-form-char-count">0/500</span>
              </div>
            </div>
          </div>

          <!-- Gambar & Kategori Section -->
          <div class="delivery-form-section">
            <div class="delivery-form-section-header">
              <i class="fas fa-images delivery-form-section-icon"></i>
              <h3 class="delivery-form-section-title">Gambar & Kategori</h3>
            </div>

            <!-- Image Upload -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-camera"></i>
                Gambar Produk
                <span class="delivery-form-required">*</span>
              </label>
              <div class="delivery-form-upload-area" id="uploadArea">
                <div class="delivery-form-upload-content">
                  <i class="fas fa-cloud-upload-alt delivery-form-upload-icon"></i>
                  <h4 class="delivery-form-upload-title">Upload Gambar Produk</h4>
                  <p class="delivery-form-upload-subtitle">Drag & drop atau klik untuk memilih file</p>
                  <p class="delivery-form-upload-info">Format: JPG, PNG, GIF (Maks. 5MB)</p>
                </div>
                <input 
                  id="fileGambar" 
                  type="file" 
                  accept="image/*" 
                  class="delivery-form-file-input" 
                  required
                >
              </div>
              <div id="uploadPreview" class="delivery-form-upload-preview"></div>
              <div id="statusUpload" class="delivery-form-upload-status"></div>
            </div>

            <!-- Category Selection -->
            <div class="delivery-form-group">
              <label for="kategori" class="delivery-form-label">
                <i class="fas fa-folder"></i>
                Kategori Produk
                <span class="delivery-form-required">*</span>
              </label>
              <select id="kategori" class="delivery-form-select" required>
                <option value="">-- Pilih Kategori --</option>
                ${kategoriList.map(k => `
                  <option value="${k.value}">${k.label}</option>
                `).join("")}
              </select>
              <div class="delivery-form-helper">
                Pilih kategori yang paling sesuai dengan produk Anda.
              </div>
            </div>

            <!-- Quick Category Tags -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-bolt"></i>
                Pilih Cepat Kategori
              </label>
              <div class="delivery-form-tags">
                ${kategoriList.map(k => `
                  <button 
                    type="button" 
                    class="delivery-form-tag" 
                    onclick="document.getElementById('kategori').value = '${k.value}'"
                  >
                    ${k.label}
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="delivery-form-actions">
            <button type="button" class="delivery-form-btn-secondary" onclick="kelolaProduk('${idToko}')">
              <i class="fas fa-times"></i>
              Batal
            </button>
            <button type="submit" class="delivery-form-btn-primary">
              <i class="fas fa-save"></i>
              Simpan Produk
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Add event listeners for enhanced UX
  setupFormInteractions();
}

function setupFormInteractions() {
  // Character counter for description
  const descTextarea = document.getElementById('deskripsi');
  const charCount = document.querySelector('.delivery-form-char-count');
  
  if (descTextarea && charCount) {
    descTextarea.addEventListener('input', function() {
      const count = this.value.length;
      charCount.textContent = `${count}/500`;
      
      if (count > 450) {
        charCount.style.color = '#e74c3c';
      } else if (count > 400) {
        charCount.style.color = '#f39c12';
      } else {
        charCount.style.color = '#27ae60';
      }
    });
  }

  // Image upload preview
  const fileInput = document.getElementById('fileGambar');
  const uploadArea = document.getElementById('uploadArea');
  const uploadPreview = document.getElementById('uploadPreview');
  const statusUpload = document.getElementById('statusUpload');

  if (fileInput && uploadArea) {
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('delivery-form-upload-dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      this.classList.remove('delivery-form-upload-dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('delivery-form-upload-dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleImageUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', function(e) {
      if (this.files.length > 0) {
        handleImageUpload(this.files[0]);
      }
    });

    function handleImageUpload(file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        statusUpload.innerHTML = '<div class="delivery-form-upload-error">Format file tidak didukung. Gunakan JPG, PNG, atau GIF.</div>';
        return;
      }

      if (file.size > maxSize) {
        statusUpload.innerHTML = '<div class="delivery-form-upload-error">Ukuran file terlalu besar. Maksimal 5MB.</div>';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function(e) {
        uploadPreview.innerHTML = `
          <div class="delivery-form-upload-preview-content">
            <img src="${e.target.result}" alt="Preview" class="delivery-form-upload-preview-image">
            <button type="button" class="delivery-form-upload-preview-remove" onclick="removeImagePreview()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
        statusUpload.innerHTML = '<div class="delivery-form-upload-success">Gambar berhasil diupload!</div>';
      };
      reader.readAsDataURL(file);
    }
  }

  // Price formatting
  const hargaInput = document.getElementById('harga');
  if (hargaInput) {
    hargaInput.addEventListener('input', function() {
      const value = parseInt(this.value) || 0;
      if (value < 1000 && value > 0) {
        this.setCustomValidity('Harga minimum Rp 1.000');
      } else {
        this.setCustomValidity('');
      }
    });
  }
}

function removeImagePreview() {
  const uploadPreview = document.getElementById('uploadPreview');
  const statusUpload = document.getElementById('statusUpload');
  const fileInput = document.getElementById('fileGambar');
  
  if (uploadPreview) uploadPreview.innerHTML = '';
  if (statusUpload) statusUpload.innerHTML = '';
  if (fileInput) fileInput.value = '';
}

// Add CSS styles
const formStyles = `
  <style>
    /* Form Progress */
    .delivery-form-progress {
      display: flex;
      justify-content: center;
      margin: 2rem 0 3rem;
      position: relative;
    }

    .delivery-form-progress::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 25%;
      right: 25%;
      height: 2px;
      background: #e9ecef;
      z-index: 1;
    }

    .delivery-form-progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
    }

    .delivery-form-progress-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e9ecef;
      color: #6c757d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 0.5rem;
      border: 3px solid white;
      transition: all 0.3s ease;
    }

    .delivery-form-progress-active .delivery-form-progress-number {
      background: #3498db;
      color: white;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }

    .delivery-form-progress-label {
      font-size: 0.875rem;
      color: #6c757d;
      font-weight: 500;
    }

    .delivery-form-progress-active .delivery-form-progress-label {
      color: #3498db;
      font-weight: 600;
    }

    /* Form Container */
    .delivery-form-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .delivery-form {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 2px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    /* Form Sections */
    .delivery-form-section {
      padding: 2rem;
      border-bottom: 1px solid #e9ecef;
    }

    .delivery-form-section:last-child {
      border-bottom: none;
    }

    .delivery-form-section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .delivery-form-section-icon {
      font-size: 1.25rem;
      color: #3498db;
    }

    .delivery-form-section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
    }

    /* Form Grid */
    .delivery-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 768px) {
      .delivery-form-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Form Groups */
    .delivery-form-group {
      margin-bottom: 1.5rem;
    }

    .delivery-form-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .delivery-form-required {
      color: #e74c3c;
    }

    /* Form Inputs */
    .delivery-form-input,
    .delivery-form-textarea,
    .delivery-form-select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e9ecef;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      transition: all 0.3s ease;
      background: white;
    }

    .delivery-form-input:focus,
    .delivery-form-textarea:focus,
    .delivery-form-select:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .delivery-form-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }

    .delivery-form-input-prefix {
      position: absolute;
      left: 1rem;
      color: #6c757d;
      font-weight: 500;
      z-index: 2;
    }

    .delivery-form-input-with-prefix {
      padding-left: 3rem;
    }

    .delivery-form-input-suffix {
      position: absolute;
      right: 1rem;
      color: #6c757d;
      font-weight: 500;
    }

    .delivery-form-input-with-suffix {
      padding-right: 4rem;
    }

    .delivery-form-textarea {
      resize: vertical;
      min-height: 100px;
    }

    .delivery-form-select {
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236c757d' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1rem center;
      background-size: 16px;
      appearance: none;
    }

    /* Form Helper */
    .delivery-form-helper {
      font-size: 0.75rem;
      color: #6c757d;
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .delivery-form-char-count {
      font-weight: 600;
    }

    /* Upload Area */
    .delivery-form-upload-area {
      border: 2px dashed #dee2e6;
      border-radius: 0.75rem;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .delivery-form-upload-area:hover {
      border-color: #3498db;
      background: #f8f9fa;
    }

    .delivery-form-upload-dragover {
      border-color: #3498db;
      background: #e3f2fd;
    }

    .delivery-form-upload-content {
      pointer-events: none;
    }

    .delivery-form-upload-icon {
      font-size: 3rem;
      color: #6c757d;
      margin-bottom: 1rem;
    }

    .delivery-form-upload-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .delivery-form-upload-subtitle {
      color: #6c757d;
      margin: 0 0 0.5rem 0;
    }

    .delivery-form-upload-info {
      font-size: 0.75rem;
      color: #adb5bd;
      margin: 0;
    }

    .delivery-form-file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    /* Upload Preview */
    .delivery-form-upload-preview {
      margin-top: 1rem;
    }

    .delivery-form-upload-preview-content {
      position: relative;
      display: inline-block;
    }

    .delivery-form-upload-preview-image {
      width: 200px;
      height: 150px;
      object-fit: cover;
      border-radius: 0.5rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .delivery-form-upload-preview-remove {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.75rem;
    }

    /* Upload Status */
    .delivery-form-upload-status {
      margin-top: 0.5rem;
    }

    .delivery-form-upload-success {
      color: #27ae60;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .delivery-form-upload-error {
      color: #e74c3c;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Form Tags */
    .delivery-form-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .delivery-form-tag {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #bbdefb;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .delivery-form-tag:hover {
      background: #1976d2;
      color: white;
      transform: translateY(-1px);
    }

    /* Form Actions */
    .delivery-form-actions {
      padding: 2rem;
      background: #f8f9fa;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .delivery-form-btn-primary,
    .delivery-form-btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .delivery-form-btn-primary {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }

    .delivery-form-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }

    .delivery-form-btn-secondary {
      background: white;
      color: #6c757d;
      border: 2px solid #dee2e6;
    }

    .delivery-form-btn-secondary:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-form-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-form-styles';
  styleElement.textContent = formStyles;
  document.head.appendChild(styleElement);
}

function tambahFieldAddon() {
  const container = document.getElementById("addon-container");

  const index = container.children.length;

  const addonHTML = `
    <div class="delivery-addon-row">
      <div class="delivery-addon-input-group">
        <input type="text" placeholder="Nama Add-On" class="delivery-addon-input" required />
        <i class="fas fa-tag delivery-addon-input-icon"></i>
      </div>
      <div class="delivery-addon-input-group">
        <input type="number" placeholder="Harga (Rp)" class="delivery-addon-input" required />
        <i class="fas fa-tag delivery-addon-input-icon"></i>
      </div>
      <button type="button" class="delivery-addon-remove-btn" onclick="this.parentElement.remove()">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', addonHTML);
}

async function kelolaAddonProduk(docId, idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="delivery-admin-loading">
      <div class="delivery-admin-spinner"></div>
      <p>Memuat add-on produk...</p>
    </div>
  `;

  const db = firebase.firestore();

  try {
    const produkDoc = await db.collection("produk").doc(docId).get();
    if (!produkDoc.exists) {
      container.innerHTML = `
        <div class="delivery-admin-error">
          <div class="delivery-admin-error-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3>Produk Tidak Ditemukan</h3>
          <p>Produk yang Anda cari tidak ditemukan dalam sistem.</p>
          <button class="delivery-admin-btn-secondary" onclick="kelolaProduk('${idToko}')">
            Kembali ke Kelola Produk
          </button>
        </div>
      `;
      return;
    }

    const p = produkDoc.data();
    const addonSnap = await db.collection("produk").doc(docId).collection("addons").get();

    let html = `
      <div class="delivery-admin-container">
        <!-- Header Section -->
        <div class="delivery-admin-header">
          <div class="delivery-admin-header-content">
            <div class="delivery-admin-breadcrumb">
              <button class="delivery-admin-breadcrumb-btn" onclick="kelolaProduk('${idToko}')">
                <i class="fas fa-arrow-left"></i>
                Kelola Produk
              </button>
              <span class="delivery-admin-breadcrumb-separator">/</span>
              <span class="delivery-admin-breadcrumb-current">Kelola Add-On</span>
            </div>
            <h1 class="delivery-admin-title">
              <i class="fas fa-puzzle-piece delivery-admin-title-icon"></i>
              Kelola Add-On Produk
            </h1>
            <p class="delivery-admin-subtitle">
              Tambah dan kelola pilihan add-on untuk produk: <strong>"${p.namaProduk}"</strong>
            </p>
          </div>
        </div>

        <!-- Product Info Card -->
        <div class="delivery-addon-product-card">
          <div class="delivery-addon-product-info">
            <div class="delivery-addon-product-image">
              <img src="${p.urlGambar || './img/toko-pict.png'}" alt="${p.namaProduk}" 
                   onerror="this.src='./img/toko-pict.png'">
            </div>
            <div class="delivery-addon-product-details">
              <h3 class="delivery-addon-product-name">${p.namaProduk}</h3>
              <p class="delivery-addon-product-price">Rp ${Number(p.harga || 0).toLocaleString("id-ID")}</p>
              <p class="delivery-addon-product-category">${p.kategori || 'Tanpa Kategori'}</p>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="delivery-admin-content">
          <!-- Add Add-On Form -->
          <div class="delivery-addon-section">
            <div class="delivery-addon-section-header">
              <i class="fas fa-plus-circle delivery-addon-section-icon"></i>
              <h3 class="delivery-addon-section-title">Tambah Add-On Baru</h3>
            </div>
            
            <form class="delivery-addon-form" onsubmit="tambahAddon(event, '${docId}', '${idToko}')">
              <div class="delivery-addon-form-grid">
                <div class="delivery-form-group">
                  <label for="addonNama" class="delivery-form-label">
                    <i class="fas fa-tag"></i>
                    Nama Add-On
                    <span class="delivery-form-required">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="addonNama" 
                    class="delivery-form-input" 
                    placeholder="Contoh: Extra Keju, Tambah Pedas, dll."
                    required
                    maxlength="50"
                  >
                  <div class="delivery-form-helper">
                    Maksimal 50 karakter. Gunakan nama yang jelas dan deskriptif.
                  </div>
                </div>

                <div class="delivery-form-group">
                  <label for="addonHarga" class="delivery-form-label">
                    <i class="fas fa-tag"></i>
                    Harga Add-On
                    <span class="delivery-form-required">*</span>
                  </label>
                  <div class="delivery-form-input-group">
                    <span class="delivery-form-input-prefix">Rp</span>
                    <input 
                      type="number" 
                      id="addonHarga" 
                      class="delivery-form-input delivery-form-input-with-prefix" 
                      placeholder="0"
                      min="0"
                      max="1000000"
                      step="500"
                      required
                    >
                  </div>
                  <div class="delivery-form-helper">
                    Harga tambahan untuk add-on ini. Isi 0 jika gratis.
                  </div>
                </div>
              </div>

              <div class="delivery-addon-form-actions">
                <button type="submit" class="delivery-addon-btn-primary">
                  <i class="fas fa-plus"></i>
                  Tambah Add-On
                </button>
              </div>
            </form>
          </div>

          <!-- Add-On List -->
          <div class="delivery-addon-section">
            <div class="delivery-addon-section-header">
              <i class="fas fa-list-ul delivery-addon-section-icon"></i>
              <h3 class="delivery-addon-section-title">
                Daftar Add-On
                <span class="delivery-addon-count">${addonSnap.size} item</span>
              </h3>
            </div>
    `;

    if (addonSnap.empty) {
      html += `
        <div class="delivery-addon-empty-state">
          <div class="delivery-addon-empty-icon">
            <i class="fas fa-puzzle-piece"></i>
          </div>
          <h4 class="delivery-addon-empty-title">Belum Ada Add-On</h4>
          <p class="delivery-addon-empty-description">
            Tambahkan add-on pertama untuk memberikan pilihan tambahan kepada pelanggan.
          </p>
        </div>
      `;
    } else {
      html += `<div class="delivery-addon-list">`;
      
      addonSnap.forEach(addon => {
        const a = addon.data();
        const harga = Number(a.harga || 0);
        
        html += `
          <div class="delivery-addon-item">
            <div class="delivery-addon-item-info">
              <div class="delivery-addon-item-name">${a.nama}</div>
              <div class="delivery-addon-item-price ${harga === 0 ? 'delivery-addon-free' : ''}">
                ${harga === 0 ? 'Gratis' : `Rp ${harga.toLocaleString("id-ID")}`}
              </div>
            </div>
            <div class="delivery-addon-item-actions">
              <button 
                class="delivery-addon-item-delete" 
                onclick="hapusAddon('${docId}', '${addon.id}', '${idToko}')"
                title="Hapus Add-On"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }

    html += `
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (err) {
    console.error("❌ Gagal memuat add-on:", err);
    container.innerHTML = `
      <div class="delivery-admin-error">
        <div class="delivery-admin-error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Gagal Memuat Add-On</h3>
        <p>Terjadi kesalahan saat memuat data add-on produk.</p>
        <div class="delivery-admin-error-actions">
          <button class="delivery-admin-btn-primary" onclick="kelolaAddonProduk('${docId}', '${idToko}')">
            <i class="fas fa-redo"></i>
            Coba Lagi
          </button>
          <button class="delivery-admin-btn-secondary" onclick="kelolaProduk('${idToko}')">
            Kembali ke Produk
          </button>
        </div>
      </div>
    `;
  }
}

async function tambahAddon(event, docId, idToko) {
  event.preventDefault();
  
  const namaInput = document.getElementById("addonNama");
  const hargaInput = document.getElementById("addonHarga");
  
  const nama = namaInput.value.trim();
  const harga = parseInt(hargaInput.value);

  // Validation
  if (!nama) {
    showAddonError("Nama add-on wajib diisi.");
    namaInput.focus();
    return;
  }

  if (isNaN(harga) || harga < 0) {
    showAddonError("Harga add-on harus berupa angka positif.");
    hargaInput.focus();
    return;
  }

  if (nama.length > 50) {
    showAddonError("Nama add-on maksimal 50 karakter.");
    namaInput.focus();
    return;
  }

  const db = firebase.firestore();

  try {
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menambahkan...';
    submitBtn.disabled = true;

    await db.collection("produk").doc(docId).collection("addons").add({ 
      nama, 
      harga,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reset form
    namaInput.value = '';
    hargaInput.value = '';
    
    // Show success message
    showAddonSuccess("Add-on berhasil ditambahkan!");
    
    // Refresh the page after a short delay
    setTimeout(() => {
      kelolaAddonProduk(docId, idToko);
    }, 1500);

  } catch (err) {
    console.error("❌ Gagal tambah add-on:", err);
    showAddonError("Gagal menambahkan add-on. Silakan coba lagi.");
    
    // Reset button state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

async function hapusAddon(docId, addonId, idToko) {
  // Show confirmation dialog
  const confirmed = await showAddonConfirmation(
    "Hapus Add-On", 
    "Apakah Anda yakin ingin menghapus add-on ini? Tindakan ini tidak dapat dibatalkan."
  );
  
  if (!confirmed) return;

  const db = firebase.firestore();

  try {
    await db.collection("produk").doc(docId).collection("addons").doc(addonId).delete();
    showAddonSuccess("Add-on berhasil dihapus!");
    
    // Refresh after a short delay
    setTimeout(() => {
      kelolaAddonProduk(docId, idToko);
    }, 1000);

  } catch (err) {
    console.error("❌ Gagal hapus add-on:", err);
    showAddonError("Gagal menghapus add-on. Silakan coba lagi.");
  }
}

// Utility Functions
function showAddonError(message) {
  // Create or update error message
  let errorDiv = document.getElementById('addon-error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'addon-error-message';
    errorDiv.className = 'delivery-addon-message delivery-addon-error';
    document.querySelector('.delivery-addon-form').prepend(errorDiv);
  }
  
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  errorDiv.style.display = 'block';
  
  // Auto hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

function showAddonSuccess(message) {
  // Create success message
  const successDiv = document.createElement('div');
  successDiv.className = 'delivery-addon-message delivery-addon-success';
  successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  
  // Add to page
  document.querySelector('.delivery-admin-container').prepend(successDiv);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

function showAddonConfirmation(title, message) {
  return new Promise((resolve) => {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'delivery-addon-modal';
    modal.innerHTML = `
      <div class="delivery-addon-modal-content">
        <div class="delivery-addon-modal-header">
          <h3>${title}</h3>
        </div>
        <div class="delivery-addon-modal-body">
          <p>${message}</p>
        </div>
        <div class="delivery-addon-modal-actions">
          <button class="delivery-addon-modal-cancel">Batal</button>
          <button class="delivery-addon-modal-confirm">Hapus</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle button clicks
    modal.querySelector('.delivery-addon-modal-cancel').onclick = () => {
      modal.remove();
      resolve(false);
    };
    
    modal.querySelector('.delivery-addon-modal-confirm').onclick = () => {
      modal.remove();
      resolve(true);
    };
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
}

// Add CSS styles for add-on management
const addonStyles = `
  <style>
    /* Product Info Card */
    .delivery-addon-product-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .delivery-addon-product-info {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      gap: 1rem;
    }

    .delivery-addon-product-image {
      width: 80px;
      height: 80px;
      border-radius: 0.75rem;
      overflow: hidden;
      flex-shrink: 0;
    }

    .delivery-addon-product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .delivery-addon-product-details {
      flex: 1;
    }

    .delivery-addon-product-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .delivery-addon-product-price {
      font-size: 1.125rem;
      font-weight: 600;
      color: #3498db;
      margin: 0 0 0.25rem 0;
    }

    .delivery-addon-product-category {
      font-size: 0.875rem;
      color: #6c757d;
      margin: 0;
    }

    /* Add-On Sections */
    .delivery-addon-section {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }

    .delivery-addon-section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem;
      border-bottom: 1px solid #e9ecef;
    }

    .delivery-addon-section-icon {
      font-size: 1.25rem;
      color: #3498db;
    }

    .delivery-addon-section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .delivery-addon-count {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Add-On Form */
    .delivery-addon-form {
      padding: 1.5rem;
    }

    .delivery-addon-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 768px) {
      .delivery-addon-form-grid {
        grid-template-columns: 1fr;
      }
    }

    .delivery-addon-form-actions {
      margin-top: 1.5rem;
      text-align: right;
    }

    .delivery-addon-btn-primary {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
    }

    .delivery-addon-btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }

    .delivery-addon-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    /* Add-On List */
    .delivery-addon-list {
      padding: 0;
    }

    .delivery-addon-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f8f9fa;
      transition: background-color 0.2s ease;
    }

    .delivery-addon-item:hover {
      background: #f8f9fa;
    }

    .delivery-addon-item:last-child {
      border-bottom: none;
    }

    .delivery-addon-item-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .delivery-addon-item-name {
      font-weight: 500;
      color: #2c3e50;
      flex: 1;
    }

    .delivery-addon-item-price {
      font-weight: 600;
      color: #27ae60;
      min-width: 100px;
      text-align: right;
    }

    .delivery-addon-free {
      color: #3498db !important;
    }

    .delivery-addon-item-actions {
      display: flex;
      gap: 0.5rem;
    }

    .delivery-addon-item-delete {
      background: #e74c3c;
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .delivery-addon-item-delete:hover {
      background: #c0392b;
      transform: scale(1.05);
    }

    /* Empty State */
    .delivery-addon-empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .delivery-addon-empty-icon {
      font-size: 4rem;
      color: #bdc3c7;
      margin-bottom: 1rem;
    }

    .delivery-addon-empty-title {
      font-size: 1.25rem;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .delivery-addon-empty-description {
      color: #7f8c8d;
      margin: 0;
    }

    /* Messages */
    .delivery-addon-message {
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      margin: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }

    .delivery-addon-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .delivery-addon-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    /* Modal */
    .delivery-addon-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .delivery-addon-modal-content {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 100%;
      overflow: hidden;
    }

    .delivery-addon-modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e9ecef;
    }

    .delivery-addon-modal-header h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.25rem;
    }

    .delivery-addon-modal-body {
      padding: 1.5rem;
    }

    .delivery-addon-modal-body p {
      margin: 0;
      color: #6c757d;
      line-height: 1.5;
    }

    .delivery-addon-modal-actions {
      padding: 1rem 1.5rem;
      background: #f8f9fa;
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .delivery-addon-modal-cancel,
    .delivery-addon-modal-confirm {
      padding: 0.5rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .delivery-addon-modal-cancel {
      background: #6c757d;
      color: white;
    }

    .delivery-addon-modal-cancel:hover {
      background: #5a6268;
    }

    .delivery-addon-modal-confirm {
      background: #e74c3c;
      color: white;
    }

    .delivery-addon-modal-confirm:hover {
      background: #c0392b;
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-addon-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-addon-styles';
  styleElement.textContent = addonStyles;
  document.head.appendChild(styleElement);
}

async function updateToko(event, id) {
  event.preventDefault();
  const db = firebase.firestore();
  const data = {
    namaPemilik: document.getElementById("namaPemilik").value,
    namaToko: document.getElementById("namaToko").value,
    alamatToko: document.getElementById("alamatToko").value,
    jamBuka: parseInt(document.getElementById("jamBuka").value),
    jamTutup: parseInt(document.getElementById("jamTutup").value),
    koordinat: document.getElementById("koordinat").value
  };

  try {
    await db.collection("toko").doc(id).update(data);
    alert("✅ Toko berhasil diupdate");
    loadContent("admin-toko");
  } catch (e) {
    alert("❌ Gagal update: " + e.message);
  }
}

async function hapusToko(id) {
  if (!confirm("Yakin ingin menghapus toko ini?")) return;
  const db = firebase.firestore();
  try {
    await db.collection("toko").doc(id).delete();
    alert("✅ Toko berhasil dihapus");
    loadContent("admin-toko");
  } catch (e) {
    alert("❌ Gagal hapus: " + e.message);
  }
}


async function simpanToko(event) {
  event.preventDefault();

  const userId = document.getElementById("userIdSeller").value;
  const namaPemilik = document.getElementById("namaPemilik").value.trim();
  const namaToko = document.getElementById("namaToko").value.trim();
  const deskripsiToko = document.getElementById("deskripsiToko").value.trim();
  const alamatToko = document.getElementById("alamatToko").value.trim();
  const jamBuka = parseInt(document.getElementById("jamBuka").value);
  const jamTutup = parseInt(document.getElementById("jamTutup").value);
  const koordinat = document.getElementById("koordinat").value.trim();
  const file = document.getElementById("fileLogo").files[0];
  const statusUpload = document.getElementById("statusUpload");

  if (jamBuka >= jamTutup) {
    return alert("❌ Jam buka harus lebih kecil dari jam tutup.");
  }

  const db = firebase.firestore();
  const storage = firebase.storage();

  // Generate doc ID toko: VLT-<random>
  const randomString = Math.random().toString(36).substring(2, 8);
  const docId = `VLT-${randomString}`;

  let logoUrl = "";

  try {
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `toko/logo/${docId}.${ext}`;
      const uploadTask = await storage.ref(path).put(file);
      logoUrl = await uploadTask.ref.getDownloadURL();
      statusUpload.textContent = "✅ Logo berhasil diunggah.";
    }

    const dataToko = {
      idToko: docId, // Sesuai permintaan: field idToko sama dengan doc ID
      userId,
      namaPemilik,
      namaToko,
      deskripsiToko,
      alamatToko,
      jamBuka,
      jamTutup,
      koordinat,
      logoUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("toko").doc(docId).set(dataToko);

    alert("✅ Toko berhasil ditambahkan!");
    loadContent("kelola-produk", docId); // buka halaman kelola toko
  } catch (error) {
    console.error("❌ Gagal menyimpan toko:", error);
    alert("❌ Gagal menyimpan toko. Silakan coba lagi.");
  }
}





async function formTambahTokoAdmin() {
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="form-box">
      <h2>🏪 Tambah Toko Manual oleh Admin</h2>
      <form id="form-tambah-toko-admin" onsubmit="return simpanTokoAdmin(event)">
        <label>UID Seller</label>
        <input required id="uidSeller" placeholder="Masukkan UID" />

        <label>Nama Pemilik</label>
        <input required id="namaPemilik" placeholder="Nama pemilik toko" />

        <label>Nama Toko</label>
        <input required id="namaToko" placeholder="Nama toko" />

        <label>Deskripsi Toko</label>
        <textarea required id="deskripsiToko" placeholder="Deskripsi singkat tentang toko" rows="3"></textarea>

        <label>Alamat Toko</label>
        <textarea required id="alamatToko" placeholder="Alamat lengkap toko" rows="3"></textarea>

        <label>Jam Buka (0–23)</label>
        <input type="number" min="0" max="23" required id="jamBuka" placeholder="Contoh: 8" />

        <label>Jam Tutup (0–23)</label>
        <input type="number" min="0" max="23" required id="jamTutup" placeholder="Contoh: 21" />

        <label>Koordinat (klik peta untuk isi otomatis)</label>
        <input required id="koordinat" placeholder="Contoh: -6.12345,106.54321" />

        <label>Upload Logo Toko (opsional)</label>
        <input type="file" id="fileLogo" accept="image/*" />
        <p id="statusUpload" style="color: green;"></p>

        <button type="submit" class="btn-simpan">💾 Simpan Toko</button>
      </form>

      <div id="leafletMap" style="height: 300px; margin-top: 20px; border-radius: 8px;"></div>
    </div>
  `;

  // Inisialisasi peta
  const map = L.map('leafletMap').setView([-1.63468, 105.77554], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker;
  map.on('click', function (e) {
    const { lat, lng } = e.latlng;
    document.getElementById("koordinat").value = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map);
  });
}

async function simpanTokoAdmin(event) {
  event.preventDefault();

  const uid = document.getElementById("uidSeller").value.trim();
  const namaPemilik = document.getElementById("namaPemilik").value.trim();
  const namaToko = document.getElementById("namaToko").value.trim();
  const deskripsiToko = document.getElementById("deskripsiToko").value.trim();
  const alamatToko = document.getElementById("alamatToko").value.trim();
  const jamBuka = parseInt(document.getElementById("jamBuka").value);
  const jamTutup = parseInt(document.getElementById("jamTutup").value);
  const koordinatInput = document.getElementById("koordinat").value.trim();
  const file = document.getElementById("fileLogo").files[0];

  if (!uid || !namaPemilik || !namaToko || !deskripsiToko || !alamatToko || isNaN(jamBuka) || isNaN(jamTutup)) {
    return alert("❌ Semua field wajib diisi dengan benar.");
  }

  if (jamBuka < 0 || jamBuka > 23 || jamTutup < 0 || jamTutup > 23) {
    return alert("❌ Jam buka/tutup harus antara 0–23.");
  }

  const [lat, lng] = koordinatInput.split(",");
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) {
    return alert("❌ Format koordinat salah.");
  }

  const db = firebase.firestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return alert("❌ UID tidak ditemukan.");
  if ((userDoc.data().role || "").toLowerCase() !== "seller") return alert("❌ UID bukan seller.");

  // Buat custom doc ID: VLT-{random}
  const randomString = Math.random().toString(36).substring(2, 8);
  const docId = `VLT-${randomString}`;

  // Upload logo ke Cloudinary jika ada
  let logoURL = "/img/toko-pict.png"; // default logo
  if (file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "vlcravepreset");
    formData.append("folder", "toko");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/du8gsffhb/image/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) logoURL = data.secure_url;
    } catch (err) {
      console.error("❌ Gagal upload logo:", err);
    }
  }

  try {
    await db.collection("toko").doc(docId).set({
      idToko: docId, // Sesuai: ID toko disamakan dengan doc ID
      userId: uid,
      namaPemilik,
      namaToko,
      deskripsiToko,
      alamatToko,
      jamBuka,
      jamTutup,
      koordinat: new firebase.firestore.GeoPoint(latitude, longitude),
      saldo: 0,
      logo: logoURL,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Toko berhasil ditambahkan.");
    loadContent("admin-toko");

  } catch (err) {
    console.error("❌ Gagal simpan toko:", err);
    alert("❌ Gagal menyimpan toko. Silakan coba lagi.");
  }
}


async function formTambahToko() {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("❌ Harap login terlebih dahulu.");
    return;
  }

  const container = document.getElementById("page-container");

  // Daftar kategori toko
  const kategoriToko = [
    { label: "🍕 Martabak & Pizza", value: "Martabak", icon: "fas fa-pizza-slice" },
    { label: "🍜 Bakso & Mie", value: "Bakso", icon: "fas fa-utensils" },
    { label: "🍞 Roti & Kue", value: "Roti", icon: "fas fa-bread-slice" },
    { label: "🥤 Minuman", value: "Minuman", icon: "fas fa-mug-hot" },
    { label: "🎂 Kue & Dessert", value: "Kue", icon: "fas fa-cake-candles" },
    { label: "🍪 Jajanan Tradisional", value: "Jajanan", icon: "fas fa-cookie" },
    { label: "🍢 Sate & Grill", value: "Sate", icon: "fas fa-drumstick-bite" },
    { label: "🍚 Aneka Nasi", value: "Nasi", icon: "fas fa-bowl-food" },
    { label: "🍗 Ayam & Bebek", value: "Ayam", icon: "fas fa-drumstick" },
    { label: "🍔 Cepat Saji", value: "Cepat Saji", icon: "fas fa-hamburger" },
    { label: "🥗 Makanan Sehat", value: "Sehat", icon: "fas fa-heart" },
    { label: "🔥 Makanan Pedas", value: "Pedas", icon: "fas fa-pepper-hot" },
    { label: "🥡 Chinese Food", value: "Chinese", icon: "fas fa-utensil-spoon" },
    { label: "🍣 Japanese Food", value: "Japanese", icon: "fas fa-fish" },
    { label: "🍛 Western Food", value: "Western", icon: "fas fa-cheese" },
    { label: "🌱 Vegetarian", value: "Vegetarian", icon: "fas fa-leaf" }
  ];

  container.innerHTML = `
    <div class="delivery-admin-container">
      <!-- Header Section -->
      <div class="delivery-admin-header">
        <div class="delivery-admin-header-content">
          <div class="delivery-admin-breadcrumb">
            <button class="delivery-admin-breadcrumb-btn" onclick="loadContent('toko-saya')">
              <i class="fas fa-arrow-left"></i>
              Toko Saya
            </button>
            <span class="delivery-admin-breadcrumb-separator">/</span>
            <span class="delivery-admin-breadcrumb-current">Tambah Toko Baru</span>
          </div>
          <h1 class="delivery-admin-title">
            <i class="fas fa-store delivery-admin-title-icon"></i>
            Tambah Toko Baru
          </h1>
          <p class="delivery-admin-subtitle">
            Lengkapi informasi toko Anda untuk memulai penjualan
          </p>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="delivery-form-progress">
        <div class="delivery-form-progress-step delivery-form-progress-active">
          <div class="delivery-form-progress-number">1</div>
          <span class="delivery-form-progress-label">Informasi Toko</span>
        </div>
        <div class="delivery-form-progress-step">
          <div class="delivery-form-progress-number">2</div>
          <span class="delivery-form-progress-label">Lokasi & Jam</span>
        </div>
        <div class="delivery-form-progress-step">
          <div class="delivery-form-progress-number">3</div>
          <span class="delivery-form-progress-label">Kategori & Logo</span>
        </div>
      </div>

      <!-- Main Form -->
      <div class="delivery-form-container">
        <form class="delivery-form" id="form-tambah-toko" onsubmit="return simpanToko(event)">
          <!-- Informasi Toko Section -->
          <div class="delivery-form-section">
            <div class="delivery-form-section-header">
              <i class="fas fa-info-circle delivery-form-section-icon"></i>
              <h3 class="delivery-form-section-title">Informasi Toko</h3>
            </div>
            
            <div class="delivery-form-grid">
              <div class="delivery-form-group">
                <label for="namaPemilik" class="delivery-form-label">
                  <i class="fas fa-user"></i>
                  Nama Pemilik
                  <span class="delivery-form-required">*</span>
                </label>
                <input 
                  id="namaPemilik" 
                  type="text" 
                  class="delivery-form-input" 
                  placeholder="Masukkan nama lengkap pemilik toko"
                  required
                  maxlength="100"
                >
                <div class="delivery-form-helper">
                  Nama lengkap pemilik toko yang terdaftar
                </div>
              </div>

              <div class="delivery-form-group">
                <label for="namaToko" class="delivery-form-label">
                  <i class="fas fa-store"></i>
                  Nama Toko
                  <span class="delivery-form-required">*</span>
                </label>
                <input 
                  id="namaToko" 
                  type="text" 
                  class="delivery-form-input" 
                  placeholder="Masukkan nama toko"
                  required
                  maxlength="100"
                >
                <div class="delivery-form-helper">
                  Nama toko yang akan ditampilkan kepada pelanggan
                </div>
              </div>
            </div>

            <div class="delivery-form-group">
              <label for="deskripsiToko" class="delivery-form-label">
                <i class="fas fa-align-left"></i>
                Deskripsi Toko
                <span class="delivery-form-required">*</span>
              </label>
              <textarea 
                id="deskripsiToko" 
                class="delivery-form-textarea" 
                placeholder="Deskripsikan toko Anda secara singkat. Contoh: spesialisasi, keunikan, dll."
                rows="3"
                required
                maxlength="500"
              ></textarea>
              <div class="delivery-form-helper">
                Maksimal 500 karakter. Deskripsi yang menarik dapat meningkatkan kepercayaan pelanggan.
                <span class="delivery-form-char-count">0/500</span>
              </div>
            </div>

            <div class="delivery-form-group">
              <label for="alamatToko" class="delivery-form-label">
                <i class="fas fa-map-marker-alt"></i>
                Alamat Toko
                <span class="delivery-form-required">*</span>
              </label>
              <textarea 
                id="alamatToko" 
                class="delivery-form-textarea" 
                placeholder="Masukkan alamat lengkap toko"
                rows="3"
                required
                maxlength="300"
              ></textarea>
              <div class="delivery-form-helper">
                Alamat lengkap toko untuk pengiriman dan kunjungan pelanggan
              </div>
            </div>
          </div>

          <!-- Lokasi & Jam Operasional Section -->
          <div class="delivery-form-section">
            <div class="delivery-form-section-header">
              <i class="fas fa-map delivery-form-section-icon"></i>
              <h3 class="delivery-form-section-title">Lokasi & Jam Operasional</h3>
            </div>

            <!-- Jam Operasional -->
            <div class="delivery-form-grid">
              <div class="delivery-form-group">
                <label for="jamBuka" class="delivery-form-label">
                  <i class="fas fa-clock"></i>
                  Jam Buka
                  <span class="delivery-form-required">*</span>
                </label>
                <div class="delivery-form-input-group">
                  <input 
                    id="jamBuka" 
                    type="number" 
                    class="delivery-form-input delivery-form-input-with-suffix" 
                    placeholder="8"
                    min="0"
                    max="23"
                    required
                  >
                  <span class="delivery-form-input-suffix">:00</span>
                </div>
                <div class="delivery-form-helper">
                  Jam buka toko (format 24 jam)
                </div>
              </div>

              <div class="delivery-form-group">
                <label for="jamTutup" class="delivery-form-label">
                  <i class="fas fa-clock"></i>
                  Jam Tutup
                  <span class="delivery-form-required">*</span>
                </label>
                <div class="delivery-form-input-group">
                  <input 
                    id="jamTutup" 
                    type="number" 
                    class="delivery-form-input delivery-form-input-with-suffix" 
                    placeholder="21"
                    min="0"
                    max="23"
                    required
                  >
                  <span class="delivery-form-input-suffix">:00</span>
                </div>
                <div class="delivery-form-helper">
                  Jam tutup toko (format 24 jam)
                </div>
              </div>
            </div>

            <!-- Peta dan Koordinat -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-map-pin"></i>
                Lokasi Toko di Peta
                <span class="delivery-form-required">*</span>
              </label>
              <div class="delivery-form-map-container">
                <div id="leafletMap" class="delivery-form-map"></div>
                <div class="delivery-form-map-instruction">
                  <i class="fas fa-mouse-pointer"></i>
                  Klik pada peta untuk menandai lokasi toko secara otomatis
                </div>
              </div>
            </div>

            <div class="delivery-form-group">
              <label for="koordinat" class="delivery-form-label">
                <i class="fas fa-crosshairs"></i>
                Koordinat Toko
                <span class="delivery-form-required">*</span>
              </label>
              <input 
                id="koordinat" 
                type="text" 
                class="delivery-form-input" 
                placeholder="-6.12345,106.54321"
                required
                readonly
              >
              <div class="delivery-form-helper">
                Koordinat akan terisi otomatis ketika Anda klik pada peta
              </div>
            </div>
          </div>

          <!-- Kategori & Logo Section -->
          <div class="delivery-form-section">
            <div class="delivery-form-section-header">
              <i class="fas fa-tags delivery-form-section-icon"></i>
              <h3 class="delivery-form-section-title">Kategori & Logo Toko</h3>
            </div>

            <!-- Kategori Toko -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-folder"></i>
                Kategori Toko
                <span class="delivery-form-required">*</span>
                <span class="delivery-form-selected-count" id="selectedCount">0 dipilih</span>
              </label>
              <div class="delivery-form-category-grid">
                ${kategoriToko.map(kategori => `
                  <label class="delivery-form-category-card">
                    <input 
                      type="checkbox" 
                      name="kategori" 
                      value="${kategori.value}" 
                      class="delivery-form-category-checkbox"
                    >
                    <div class="delivery-form-category-content">
                      <i class="${kategori.icon} delivery-form-category-icon"></i>
                      <span class="delivery-form-category-label">${kategori.label}</span>
                    </div>
                  </label>
                `).join('')}
              </div>
              <div class="delivery-form-helper">
                Pilih minimal satu kategori yang sesuai dengan produk toko Anda
              </div>
            </div>

            <!-- Upload Logo -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-camera"></i>
                Logo Toko
                <span class="delivery-form-optional">(opsional)</span>
              </label>
              <div class="delivery-form-upload-area" id="uploadArea">
                <div class="delivery-form-upload-content">
                  <i class="fas fa-cloud-upload-alt delivery-form-upload-icon"></i>
                  <h4 class="delivery-form-upload-title">Upload Logo Toko</h4>
                  <p class="delivery-form-upload-subtitle">Drag & drop atau klik untuk memilih file</p>
                  <p class="delivery-form-upload-info">Format: JPG, PNG, GIF (Maks. 2MB)</p>
                </div>
                <input 
                  id="fileLogo" 
                  type="file" 
                  accept="image/*" 
                  class="delivery-form-file-input"
                >
              </div>
              <div id="logoPreview" class="delivery-form-upload-preview"></div>
              <div id="statusUpload" class="delivery-form-upload-status"></div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="delivery-form-actions">
            <button type="button" class="delivery-form-btn-secondary" onclick="loadContent('toko-saya')">
              <i class="fas fa-times"></i>
              Batal
            </button>
            <button type="submit" class="delivery-form-btn-primary">
              <i class="fas fa-save"></i>
              Simpan Toko
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Initialize map
  initializeMap();

  // Setup form interactions
  setupTokoFormInteractions();
}

function initializeMap() {
  const map = L.map('leafletMap').setView([-6.2088, 106.8456], 13); // Default to Jakarta
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  let marker = null;

  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    const coordInput = document.getElementById("koordinat");
    coordInput.value = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    
    // Remove existing marker
    if (marker) {
      map.removeLayer(marker);
    }
    
    // Add new marker
    marker = L.marker([lat, lng]).addTo(map)
      .bindPopup('Lokasi Toko Anda')
      .openPopup();

    // Validasi koordinat
    coordInput.setCustomValidity('');
  });

  // Add current location button
  L.control.locate({
    position: 'topright',
    drawCircle: true,
    follow: true,
    setView: true,
    keepCurrentZoomLevel: true,
    markerStyle: {
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.8
    },
    circleStyle: {
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.8
    }
  }).addTo(map);
}

function setupTokoFormInteractions() {
  // Character counter for description
  const descTextarea = document.getElementById('deskripsiToko');
  const charCount = document.querySelector('.delivery-form-char-count');
  
  if (descTextarea && charCount) {
    descTextarea.addEventListener('input', function() {
      const count = this.value.length;
      charCount.textContent = `${count}/500`;
      
      if (count > 450) {
        charCount.style.color = '#e74c3c';
      } else if (count > 400) {
        charCount.style.color = '#f39c12';
      } else {
        charCount.style.color = '#27ae60';
      }
    });
  }

  // Kategori selection counter
  const categoryCheckboxes = document.querySelectorAll('.delivery-form-category-checkbox');
  const selectedCount = document.getElementById('selectedCount');
  
  categoryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedCount);
  });

  function updateSelectedCount() {
    const selected = document.querySelectorAll('.delivery-form-category-checkbox:checked').length;
    selectedCount.textContent = `${selected} dipilih`;
    
    // Visual feedback
    categoryCheckboxes.forEach(checkbox => {
      const card = checkbox.closest('.delivery-form-category-card');
      if (checkbox.checked) {
        card.classList.add('delivery-form-category-selected');
      } else {
        card.classList.remove('delivery-form-category-selected');
      }
    });
  }

  // Logo upload preview
  const fileInput = document.getElementById('fileLogo');
  const uploadArea = document.getElementById('uploadArea');
  const logoPreview = document.getElementById('logoPreview');
  const statusUpload = document.getElementById('statusUpload');

  if (fileInput && uploadArea) {
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('delivery-form-upload-dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      this.classList.remove('delivery-form-upload-dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('delivery-form-upload-dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleLogoUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', function(e) {
      if (this.files.length > 0) {
        handleLogoUpload(this.files[0]);
      }
    });

    function handleLogoUpload(file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!validTypes.includes(file.type)) {
        statusUpload.innerHTML = '<div class="delivery-form-upload-error">Format file tidak didukung. Gunakan JPG, PNG, atau GIF.</div>';
        return;
      }

      if (file.size > maxSize) {
        statusUpload.innerHTML = '<div class="delivery-form-upload-error">Ukuran file terlalu besar. Maksimal 2MB.</div>';
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function(e) {
        logoPreview.innerHTML = `
          <div class="delivery-form-upload-preview-content">
            <img src="${e.target.result}" alt="Preview Logo" class="delivery-form-upload-preview-image">
            <button type="button" class="delivery-form-upload-preview-remove" onclick="removeLogoPreview()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `;
        statusUpload.innerHTML = '<div class="delivery-form-upload-success">Logo berhasil diupload!</div>';
      };
      reader.readAsDataURL(file);
    }
  }

  // Jam operasional validation
  const jamBuka = document.getElementById('jamBuka');
  const jamTutup = document.getElementById('jamTutup');

  if (jamBuka && jamTutup) {
    function validateJamOperasional() {
      const buka = parseInt(jamBuka.value);
      const tutup = parseInt(jamTutup.value);
      
      if (!isNaN(buka) && !isNaN(tutup)) {
        if (tutup <= buka) {
          jamTutup.setCustomValidity('Jam tutup harus lebih besar dari jam buka');
        } else {
          jamTutup.setCustomValidity('');
        }
      }
    }

    jamBuka.addEventListener('change', validateJamOperasional);
    jamTutup.addEventListener('change', validateJamOperasional);
  }
}

function removeLogoPreview() {
  const logoPreview = document.getElementById('logoPreview');
  const statusUpload = document.getElementById('statusUpload');
  const fileInput = document.getElementById('fileLogo');
  
  if (logoPreview) logoPreview.innerHTML = '';
  if (statusUpload) statusUpload.innerHTML = '';
  if (fileInput) fileInput.value = '';
}

// Update simpanToko function to handle kategori
async function simpanToko(event) {
  event.preventDefault();

  const user = firebase.auth().currentUser;
  if (!user) {
    showTokoError("Harap login terlebih dahulu.");
    return false;
  }

  // Validasi kategori
  const kategoriCheckboxes = document.querySelectorAll("input[name='kategori']:checked");
  const kategoriList = Array.from(kategoriCheckboxes).map(cb => cb.value);
  
  if (kategoriList.length === 0) {
    showTokoError("Pilih minimal satu kategori toko.");
    return false;
  }

  // ... rest of your existing simpanToko code with kategoriList integration ...
  // (gunakan kategoriList seperti dalam code Anda sebelumnya)

  return false; // Prevent default for now
}

function showTokoError(message) {
  // Implementation for showing error messages
  alert(message); // Bisa diganti dengan modal yang lebih elegan
}

// Add CSS styles for toko form
const tokoFormStyles = `
  <style>
    /* Category Grid */
    .delivery-form-category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .delivery-form-category-card {
      border: 2px solid #e9ecef;
      border-radius: 0.75rem;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      background: white;
      position: relative;
    }

    .delivery-form-category-card:hover {
      border-color: #3498db;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .delivery-form-category-selected {
      border-color: #3498db;
      background: #e3f2fd;
      box-shadow: 0 4px 15px rgba(52, 152, 219, 0.2);
    }

    .delivery-form-category-checkbox {
      position: absolute;
      opacity: 0;
      cursor: pointer;
    }

    .delivery-form-category-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .delivery-form-category-icon {
      font-size: 1.25rem;
      color: #3498db;
      width: 24px;
      text-align: center;
    }

    .delivery-form-category-label {
      font-weight: 500;
      color: #2c3e50;
      flex: 1;
    }

    .delivery-form-selected-count {
      background: #3498db;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: auto;
    }

    /* Map Styles */
    .delivery-form-map-container {
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .delivery-form-map {
      height: 300px;
      width: 100%;
    }

    .delivery-form-map-instruction {
      background: #f8f9fa;
      padding: 0.75rem 1rem;
      border-top: 1px solid #e9ecef;
      font-size: 0.875rem;
      color: #6c757d;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Optional Label */
    .delivery-form-optional {
      color: #6c757d;
      font-weight: normal;
      font-size: 0.875em;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .delivery-form-category-grid {
        grid-template-columns: 1fr;
      }
      
      .delivery-form-map {
        height: 250px;
      }
    }

    @media (max-width: 480px) {
      .delivery-form-map {
        height: 200px;
      }
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-toko-form-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-toko-form-styles';
  styleElement.textContent = tokoFormStyles;
  document.head.appendChild(styleElement);
}

async function lihatRiwayatTransaksi(idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat riwayat transaksi toko...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("pesanan_penjual")
      .where("idToko", "==", idToko)
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p>📭 Tidak ada riwayat transaksi untuk toko ini.</p>`;
      return;
    }

    let html = `
      <div class="riwayat-toko-wrapper">
        <h2>📄 Riwayat Transaksi Toko</h2>
        <button onclick="loadContent('admin-toko')" class="btn-kembali">⬅️ Kembali</button>
        <div class="card-list">
    `;

    let no = 1;
    for (const doc of snapshot.docs) {
      const p = doc.data();
      const waktu = p.createdAt?.toDate()?.toLocaleString("id-ID") || "-";

      // Ambil status dari pesanan_driver
      let status = "-";
      const driverSnap = await db.collection("pesanan_driver")
        .where("idPesanan", "==", p.idPesanan)
        .limit(1)
        .get();

      if (!driverSnap.empty) {
        status = driverSnap.docs[0].data().status || "-";
      }

      html += `
        <div class="card riwayat-seller-admin">
          <div class="card-header">
            <h3>ID Pesanan: ${p.idPesanan}</h3>
            <span class="status">${status}</span>
          </div>
          <div class="card-body">
            <p><strong>Waktu:</strong> ${waktu}</p>
            <p><strong>Pembeli:</strong> ${p.namaPembeli}<br><small>${p.noHpPembeli}</small></p>
            <p><strong>Metode Pengiriman:</strong> ${p.pengiriman || "-"}</p>
            <p><strong>Ongkir:</strong> Rp${(p.ongkir || 0).toLocaleString()}</p>
          </div>
          <div class="card-footer">
            <button class="btn-edit" onclick="editTransaksi('${doc.id}')">✏️ Edit</button>
            <button class="btn-delete" onclick="hapusTransaksi('${doc.id}')">🗑️ Hapus</button>
          </div>
        </div>
      `;
    }

    html += `</div></div>`;

    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat riwayat transaksi: ${error.message}</p>`;
  }
}

// Fungsi untuk menghapus transaksi
async function hapusTransaksi(id) {
  const confirmDelete = confirm("Apakah Anda yakin ingin menghapus transaksi ini?");
  if (confirmDelete) {
    const db = firebase.firestore();
    try {
      await db.collection("pesanan_penjual").doc(id).delete();
      alert("✅ Transaksi berhasil dihapus.");
      loadContent("admin-toko"); // Reload halaman
    } catch (error) {
      console.error(error);
      alert("❌ Gagal menghapus transaksi.");
    }
  }
}

// Fungsi untuk mengedit transaksi
async function editTransaksi(id) {
  const db = firebase.firestore();
  try {
    const transaksiDoc = await db.collection("pesanan_penjual").doc(id).get();
    if (!transaksiDoc.exists) {
      return alert("❌ Transaksi tidak ditemukan.");
    }

    const transaksiData = transaksiDoc.data();
    // Misalnya, buka modal edit dan isi form dengan data transaksi yang ada
    document.getElementById("edit-idPesanan").value = transaksiData.idPesanan;
    document.getElementById("edit-namaPembeli").value = transaksiData.namaPembeli;
    document.getElementById("edit-metodePengiriman").value = transaksiData.pengiriman || "standard";
    document.getElementById("edit-ongkir").value = transaksiData.ongkir || 0;

    // Tampilkan modal untuk mengedit transaksi
    document.getElementById("modal-edit-transaksi").style.display = "flex";

    // Update data ketika pengguna menyimpan perubahan
    document.getElementById("save-edit-transaksi").onclick = async () => {
      const updatedData = {
        idPesanan: document.getElementById("edit-idPesanan").value,
        namaPembeli: document.getElementById("edit-namaPembeli").value,
        pengiriman: document.getElementById("edit-metodePengiriman").value,
        ongkir: parseInt(document.getElementById("edit-ongkir").value) || 0
      };

      await db.collection("pesanan_penjual").doc(id).update(updatedData);
      alert("✅ Transaksi berhasil diperbarui.");
      loadContent("admin-toko");
    };
  } catch (error) {
    console.error(error);
    alert("❌ Gagal mengambil data transaksi.");
  }
}


async function topupSaldoUser() {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    showNotification("❌ Kamu harus login terlebih dahulu.", "error");
    return;
  }

  // Show loading state
  showLoading("Memuat data top up...");

  try {
    // Ambil role dari koleksi users
    let role = "user";
    try {
      const userSnap = await db.collection("users").doc(user.uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        if (userData.role) role = userData.role.toLowerCase();
      }
    } catch (e) {
      console.warn("⚠️ Gagal mengambil role:", e);
    }

    let idToko = null;
    let idDriver = null;

    // Ambil ID Toko jika role seller
    if (role === "seller") {
      const tokoSnap = await db.collection("toko").where("userId", "==", user.uid).limit(1).get();
      if (!tokoSnap.empty) {
        idToko = tokoSnap.docs[0].data().idToko || tokoSnap.docs[0].id;
      }
    }

    // Ambil ID Driver jika role driver
    if (role === "driver") {
      const driverSnap = await db.collection("driver").where("userId", "==", user.uid).limit(1).get();
      if (!driverSnap.empty) {
        idDriver = driverSnap.docs[0].data().idDriver || driverSnap.docs[0].id;
      }
    }

    // Ambil rekening aktif
    const doc = await db.collection("pengaturan").doc("rekening").get();
    const data = doc.exists ? doc.data() : {};
    const rekeningAktif = Array.isArray(data.list) ? data.list.filter(r => r.aktif) : [];

    if (rekeningAktif.length === 0) {
      hideLoading();
      showNotification("❌ Tidak ada rekening aktif untuk top up.", "error");
      return;
    }

    hideLoading();
    showTopupModal({ userId: user.uid, role, idToko, idDriver, rekeningAktif });

  } catch (error) {
    hideLoading();
    console.error("❌ Gagal memuat data top up:", error);
    showNotification("❌ Gagal memuat data top up. Silakan coba lagi.", "error");
  }
}

function showTopupModal({ userId, role, idToko, idDriver, rekeningAktif }) {
  const kodeUnik = Math.floor(Math.random() * 900) + 100;

  const modal = document.createElement("div");
  modal.className = "delivery-modal-overlay";
  modal.innerHTML = `
    <div class="delivery-modal-container">
      <div class="delivery-modal-content">
        <div class="delivery-modal-header">
          <div class="delivery-modal-icon">
            <i class="fas fa-wallet"></i>
          </div>
          <div class="delivery-modal-title">
            <h3>Top Up Saldo</h3>
            <p>Isi saldo untuk bertransaksi dengan mudah</p>
          </div>
          <button class="delivery-modal-close" onclick="closeTopupModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="delivery-modal-body">
          <!-- Informasi Role -->
          <div class="delivery-topup-role-info">
            <div class="delivery-topup-role-badge delivery-topup-role-${role}">
              <i class="fas fa-${getRoleIcon(role)}"></i>
              ${getRoleLabel(role)}
            </div>
          </div>

          <!-- Form Top Up -->
          <form class="delivery-topup-form" id="topupForm">
            <!-- Nominal Input -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-money-bill-wave"></i>
                Nominal Top Up
                <span class="delivery-form-required">*</span>
              </label>
              <div class="delivery-form-input-group">
                <span class="delivery-form-input-prefix">Rp</span>
                <input 
                  id="topup-nominal" 
                  type="number" 
                  class="delivery-form-input delivery-form-input-with-prefix" 
                  placeholder="Minimal 10.000"
                  min="10000"
                  step="1000"
                  required
                >
              </div>
              <div class="delivery-form-helper">
                Minimal top up Rp 10.000
              </div>
            </div>

            <!-- Metode Pembayaran -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-university"></i>
                Metode Pembayaran
                <span class="delivery-form-required">*</span>
              </label>
              <select id="topup-metode" class="delivery-form-select" required onchange="tampilRekeningTujuan(this.value)">
                <option value="">-- Pilih Bank --</option>
                ${rekeningAktif.map((r, i) => `
                  <option value="${i}">
                    ${getBankIcon(r.bank)} ${r.bank}
                  </option>
                `).join("")}
              </select>
              <div class="delivery-form-helper">
                Pilih bank tujuan transfer
              </div>
            </div>

            <!-- Rekening Tujuan -->
            <div id="rekening-tujuan" class="delivery-topup-rekening" style="display: none;">
              <div class="delivery-topup-rekening-header">
                <i class="fas fa-credit-card"></i>
                <h4>Rekening Tujuan</h4>
              </div>
              <div class="delivery-topup-rekening-info">
                <div class="delivery-topup-rekening-item">
                  <span class="delivery-topup-rekening-label">Bank</span>
                  <span class="delivery-topup-rekening-value" id="rekening-bank">-</span>
                </div>
                <div class="delivery-topup-rekening-item">
                  <span class="delivery-topup-rekening-label">Nomor Rekening</span>
                  <span class="delivery-topup-rekening-value copyable" id="rekening-nomor" onclick="copyToClipboard(this)">-</span>
                </div>
                <div class="delivery-topup-rekening-item">
                  <span class="delivery-topup-rekening-label">Nama Pemilik</span>
                  <span class="delivery-topup-rekening-value" id="rekening-nama">-</span>
                </div>
              </div>
            </div>

            <!-- Detail Pembayaran -->
            <div id="payment-details" class="delivery-topup-payment-details" style="display: none;">
              <div class="delivery-topup-payment-header">
                <i class="fas fa-receipt"></i>
                <h4>Detail Pembayaran</h4>
              </div>
              <div class="delivery-topup-payment-info">
                <div class="delivery-topup-payment-item">
                  <span class="delivery-topup-payment-label">Nominal Top Up</span>
                  <span class="delivery-topup-payment-value" id="payment-nominal">-</span>
                </div>
                <div class="delivery-topup-payment-item">
                  <span class="delivery-topup-payment-label">Kode Unik</span>
                  <span class="delivery-topup-payment-value">+ ${kodeUnik}</span>
                </div>
                <div class="delivery-topup-payment-divider"></div>
                <div class="delivery-topup-payment-total">
                  <span class="delivery-topup-payment-label">Total Transfer</span>
                  <span class="delivery-topup-payment-total-value" id="payment-total">-</span>
                </div>
              </div>
            </div>

            <!-- Catatan -->
            <div class="delivery-form-group">
              <label class="delivery-form-label">
                <i class="fas fa-sticky-note"></i>
                Catatan (Opsional)
              </label>
              <input 
                id="topup-catatan" 
                type="text" 
                class="delivery-form-input" 
                placeholder="Contoh: Top up untuk belanja bulanan"
                maxlength="100"
              >
              <div class="delivery-form-helper">
                Maksimal 100 karakter
              </div>
            </div>

            <!-- Pesan Status -->
            <div id="modal-message" class="delivery-modal-message"></div>
          </form>
        </div>

        <div class="delivery-modal-footer">
          <button class="delivery-modal-btn-secondary" onclick="closeTopupModal()">
            <i class="fas fa-times"></i>
            Batal
          </button>
          <button class="delivery-modal-btn-primary" id="btn-kirim" onclick="kirimTopupRequest({
            userId: '${userId}',
            idToko: '${idToko}',
            idDriver: '${idDriver}',
            role: '${role}',
            rekeningAktif: ${JSON.stringify(rekeningAktif)},
            kodeUnik: ${kodeUnik}
          })">
            <i class="fas fa-paper-plane"></i>
            Ajukan Top Up
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  setupTopupEventListeners({ rekeningAktif, kodeUnik });
}

// Update CSS untuk modal center dan floating effect
const topupStyles = `
  <style>
    /* Modal Overlay - Fixed Position untuk Center */
    .delivery-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      animation: modalFadeIn 0.3s ease;
      backdrop-filter: blur(5px);
    }

    @keyframes modalFadeIn {
      from { 
        opacity: 0; 
        backdrop-filter: blur(0px);
      }
      to { 
        opacity: 1; 
        backdrop-filter: blur(5px);
      }
    }

    @keyframes modalFadeOut {
      from { 
        opacity: 1; 
        backdrop-filter: blur(5px);
      }
      to { 
        opacity: 0; 
        backdrop-filter: blur(0px);
      }
    }

    /* Modal Container - Floating Effect */
    .delivery-modal-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .delivery-modal-content {
      background: white;
      border-radius: 24px;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 100px rgba(59, 130, 246, 0.1);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      pointer-events: all;
      animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      transform-style: preserve-3d;
      perspective: 1000px;
    }

    @keyframes modalSlideIn {
      from { 
        transform: translateY(-50px) scale(0.9) rotateX(-5deg);
        opacity: 0; 
      }
      to { 
        transform: translateY(0) scale(1) rotateX(0);
        opacity: 1; 
      }
    }

    @keyframes modalSlideOut {
      from { 
        transform: translateY(0) scale(1) rotateX(0);
        opacity: 1; 
      }
      to { 
        transform: translateY(-50px) scale(0.9) rotateX(-5deg);
        opacity: 0; 
      }
    }

    /* Floating Animation */
    .delivery-modal-content::before {
      content: '';
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      background: linear-gradient(45deg, #667eea, #764ba2, #f093fb);
      border-radius: 28px;
      z-index: -1;
      opacity: 0.1;
      filter: blur(20px);
      animation: floatShadow 3s ease-in-out infinite;
    }

    @keyframes floatShadow {
      0%, 100% { 
        transform: translateY(0px) scale(1);
        opacity: 0.1;
      }
      50% { 
        transform: translateY(-10px) scale(1.02);
        opacity: 0.15;
      }
    }

    /* Modal Header */
    .delivery-modal-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 2rem 2rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      position: relative;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 24px 24px 0 0;
    }

    .delivery-modal-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 2rem;
      right: 2rem;
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
    }

    .delivery-modal-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      flex-shrink: 0;
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      animation: iconPulse 2s ease-in-out infinite;
    }

    @keyframes iconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .delivery-modal-title {
      flex: 1;
    }

    .delivery-modal-title h3 {
      margin: 0 0 0.5rem 0;
      color: #1e293b;
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #334155, #1e293b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .delivery-modal-title p {
      margin: 0;
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .delivery-modal-close {
      background: white;
      border: 2px solid #f1f5f9;
      color: #64748b;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 12px;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .delivery-modal-close:hover {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #475569;
      transform: rotate(90deg);
    }

    /* Modal Body */
    .delivery-modal-body {
      padding: 2rem;
      background: white;
    }

    /* Modal Footer */
    .delivery-modal-footer {
      padding: 1.5rem 2rem 2rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 1rem;
      background: white;
      border-radius: 0 0 24px 24px;
    }

    /* Role Info */
    .delivery-topup-role-info {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .delivery-topup-role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      animation: badgeGlow 2s ease-in-out infinite;
    }

    @keyframes badgeGlow {
      0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
      50% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); }
    }

    .delivery-topup-role-seller {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }

    .delivery-topup-role-driver {
      background: linear-gradient(135deg, #10b981, #047857);
      color: white;
    }

    .delivery-topup-role-user {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
    }

    /* Form Styles */
    .delivery-form-group {
      margin-bottom: 1.5rem;
    }

    .delivery-form-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .delivery-form-required {
      color: #ef4444;
    }

    .delivery-form-input,
    .delivery-form-select {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      background: white;
    }

    .delivery-form-input:focus,
    .delivery-form-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }

    .delivery-form-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }

    .delivery-form-input-prefix {
      position: absolute;
      left: 1rem;
      color: #6b7280;
      font-weight: 500;
      z-index: 2;
    }

    .delivery-form-input-with-prefix {
      padding-left: 3rem;
    }

    /* Rekening Section */
    .delivery-topup-rekening {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 16px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      border: 1px solid #e2e8f0;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from { 
        opacity: 0;
        transform: translateY(-10px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .delivery-topup-rekening-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .delivery-topup-rekening-header h4 {
      margin: 0;
      color: #1e293b;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .delivery-topup-rekening-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .delivery-topup-rekening-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .delivery-topup-rekening-item:last-child {
      border-bottom: none;
    }

    .delivery-topup-rekening-label {
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .delivery-topup-rekening-value {
      color: #1e293b;
      font-weight: 600;
    }

    .delivery-topup-rekening-value.copyable {
      cursor: pointer;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      transition: all 0.2s ease;
      background: white;
      border: 1px solid #e2e8f0;
      font-family: 'Courier New', monospace;
    }

    .delivery-topup-rekening-value.copyable:hover {
      background: #f8fafc;
      border-color: #3b82f6;
      transform: translateY(-1px);
    }

    .delivery-copy-success {
      background: #dcfce7 !important;
      border-color: #22c55e !important;
      color: #166534 !important;
    }

    /* Payment Details */
    .delivery-topup-payment-details {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 16px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      color: white;
      animation: slideDown 0.3s ease;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .delivery-topup-payment-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .delivery-topup-payment-header h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .delivery-topup-payment-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .delivery-topup-payment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .delivery-topup-payment-label {
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .delivery-topup-payment-value {
      font-weight: 600;
    }

    .delivery-topup-payment-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.3);
      margin: 0.75rem 0;
    }

    .delivery-topup-payment-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 2px solid rgba(255, 255, 255, 0.5);
    }

    .delivery-topup-payment-total-value {
      font-size: 1.3rem;
      font-weight: 700;
    }

    /* Modal Message */
    .delivery-modal-message {
      padding: 1rem;
      border-radius: 12px;
      margin: 1rem 0;
      font-size: 0.9rem;
      font-weight: 500;
      display: none;
      animation: slideDown 0.3s ease;
    }

    .delivery-modal-message-success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .delivery-modal-message-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .delivery-modal-message-info {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }

    /* Modal Buttons */
    .delivery-modal-btn-primary,
    .delivery-modal-btn-secondary {
      flex: 1;
      padding: 1rem 1.5rem;
      border: none;
      border-radius: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      transition: all 0.3s ease;
      font-size: 0.95rem;
    }

    .delivery-modal-btn-primary {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }

    .delivery-modal-btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.6);
    }

    .delivery-modal-btn-secondary {
      background: white;
      color: #64748b;
      border: 2px solid #e2e8f0;
    }

    .delivery-modal-btn-secondary:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }

    .delivery-modal-btn-disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .delivery-modal-overlay {
        padding: 10px;
      }

      .delivery-modal-content {
        max-height: 95vh;
        border-radius: 20px;
      }

      .delivery-modal-header {
        padding: 1.5rem 1.5rem 1rem;
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .delivery-modal-body {
        padding: 1.5rem;
      }

      .delivery-modal-footer {
        padding: 1.5rem;
        flex-direction: column;
      }

      .delivery-modal-icon {
        width: 50px;
        height: 50px;
        font-size: 1.25rem;
      }

      .delivery-topup-rekening-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .delivery-topup-role-badge {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
      }
    }

    /* Scrollbar Styling */
    .delivery-modal-content::-webkit-scrollbar {
      width: 6px;
    }

    .delivery-modal-content::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }

    .delivery-modal-content::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .delivery-modal-content::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-topup-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-topup-styles';
  styleElement.textContent = topupStyles;
  document.head.appendChild(styleElement);
}

// Update close function dengan animasi
function closeTopupModal() {
  const modal = document.querySelector(".delivery-modal-overlay");
  if (modal) {
    const modalContent = modal.querySelector('.delivery-modal-content');
    modalContent.style.animation = 'modalSlideOut 0.3s ease forwards';
    modal.style.animation = 'modalFadeOut 0.3s ease forwards';
    
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

// Helper functions (tetap sama)
function getRoleIcon(role) {
  const icons = {
    seller: "store",
    driver: "motorcycle",
    user: "user"
  };
  return icons[role] || "user";
}

function getRoleLabel(role) {
  const labels = {
    seller: "Seller",
    driver: "Driver",
    user: "Customer"
  };
  return labels[role] || "User";
}

function getBankIcon(bankName) {
  const bank = bankName.toLowerCase();
  if (bank.includes("bca")) return "🏦";
  if (bank.includes("bni")) return "🏛️";
  if (bank.includes("bri")) return "🏢";
  if (bank.includes("mandiri")) return "🏣";
  if (bank.includes("bsi")) return "🕌";
  return "🏦";
}

function formatRupiah(angka) {
  if (!angka) return "Rp 0";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
}

async function kirimTopupRequest({ userId, idToko, idDriver, role, rekeningAktif, modal, kodeUnik }) {
  const nominalInput = Number(document.getElementById("topup-nominal").value);
  const metodeIndex = document.getElementById("topup-metode").value;
  const catatan = document.getElementById("topup-catatan").value.trim();

  if (!nominalInput || nominalInput < 10000) {
    return alert("❌ Nominal topup minimal Rp10.000.");
  }
  if (!metodeIndex) {
    return alert("❌ Pilih metode pembayaran.");
  }

  const metode = rekeningAktif[Number(metodeIndex)];
  const total = nominalInput + kodeUnik;
  const db = firebase.firestore();

  try {
    await db.collection("topup_request").add({
      userId,
      idToko: idToko || null,
      idDriver: idDriver || null,
      role,
      metode: metode.bank || "-",
      jumlah: nominalInput,
      kodeUnik,
      total,
      catatan: catatan || "-",
      status: "Menunggu",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      expiredAt: firebase.firestore.Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000),
    });

    alert("✅ Permintaan topup berhasil dikirim.");
    document.body.removeChild(modal);
  } catch (e) {
    console.error(e);
    alert("❌ Gagal mengirim permintaan topup.");
  }
}






async function simpanJamLayanan() {
  const buka = document.getElementById("jam-buka").value;
  const tutup = document.getElementById("jam-tutup").value;
  const aktif = document.getElementById("status-layanan").value === "true";
  const mode = document.getElementById("mode-layanan").value;

  await firebase.firestore().collection("pengaturan").doc("jam_layanan").set({
    buka,
    tutup,
    aktif,
    mode
  });

  alert("✅ Jam layanan berhasil diperbarui.");
  loadContent("jam-layanan");
}




async function konfirmasiWithdraw(docId, uid, nominal) {
  const db = firebase.firestore();
  const withdrawRef = db.collection("withdraw_request").doc(docId);
  const withdrawSnap = await withdrawRef.get();

  if (!withdrawSnap.exists) return alert("❌ Data permintaan tidak ditemukan.");

  const withdrawData = withdrawSnap.data();
  if (withdrawData.status !== "Pending") {
    return alert("❌ Permintaan sudah diproses sebelumnya.");
  }

  const tipe = withdrawData.tipe || "users"; // default "users"
  let targetRef;

  if (tipe === "users") {
    targetRef = db.collection("users").doc(uid);
  } else if (tipe === "toko") {
    targetRef = db.collection("toko").doc(uid);
  } else if (tipe === "driver") {
    // Cari dokumen driver berdasarkan idDriver
    const driverSnap = await db.collection("driver").where("idDriver", "==", uid).limit(1).get();
    if (driverSnap.empty) return alert("❌ Driver tidak ditemukan.");

    const driverDoc = driverSnap.docs[0];
    targetRef = driverDoc.ref;
  } else {
    return alert("❌ Tipe tidak dikenali.");
  }

  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    return alert("❌ Data saldo tidak ditemukan.");
  }

  const saldoLama = parseInt(targetSnap.data().saldo || 0);
  if (saldoLama < nominal) {
    return alert("❌ Saldo tidak mencukupi.");
  }

  try {
    await targetRef.update({ saldo: saldoLama - nominal });

    await withdrawRef.update({
      status: "Selesai",
      approvedBy: firebase.auth().currentUser.uid,
      approvedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Withdraw berhasil dikonfirmasi.");
    loadContent("permintaan-withdraw");
  } catch (err) {
    console.error("❌ Gagal mengonfirmasi penarikan:", err);
    alert("❌ Gagal memproses permintaan.");
  }
}


async function tolakWithdraw(docId) {
  await firebase.firestore().collection("withdraw_request").doc(docId).update({
    status: "Dibatalkan",
    rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("❌ Withdraw ditolak.");
  loadContent("permintaan-withdraw");
}



function toggleDropdown(button) {
  // Tutup semua dropdown yang lain
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (menu !== button.nextElementSibling) menu.style.display = "none";
  });

  const menu = button.nextElementSibling;
  const visible = menu.style.display === "block";
  menu.style.display = visible ? "none" : "block";
}

// Tutup dropdown saat klik di luar
document.addEventListener("click", function (e) {
  if (!e.target.closest(".dropdown-container")) {
    document.querySelectorAll(".dropdown-menu").forEach(menu => {
      menu.style.display = "none";
    });
  }
});


function gantiRole(uid, currentRole = '') {
  const pilihan = ['user', 'driver', 'seller', 'admin']; // ✅ tambah seller
  const selectOptions = pilihan.map(role => {
    const selected = role === currentRole.toLowerCase() ? 'selected' : '';
    return `<option value="${role}" ${selected}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`;
  }).join('');

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🔁 Ganti Role Pengguna</h3>
      <select id="select-role" style="margin: 12px 0; padding: 8px 12px; width: 100%; font-size: 14px;">
        ${selectOptions}
      </select>
      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <button class="btn-mini" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Batal</button>
        <button class="btn-mini" onclick="konfirmasiGantiRole('${uid}')">Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function konfirmasiGantiRole(uid) {
  const newRole = document.getElementById("select-role").value;
  if (!newRole) return alert("❌ Silakan pilih role terlebih dahulu.");

  const db = firebase.firestore();

  try {
    await db.collection("users").doc(uid).update({ role: newRole });
    alert("✅ Role berhasil diperbarui ke: " + newRole);
    document.querySelector(".modal-overlay").remove();
    loadContent("users-management"); // ⟳ refresh halaman
  } catch (err) {
    console.error("Gagal update role:", err);
    alert("❌ Gagal memperbarui role.");
  }
}



function resetPin(uid) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🔐 Reset PIN</h3>
      <input id="new-pin" type="text" maxlength="6" placeholder="PIN Baru (6 digit)" style="width:100%;padding:8px 10px;margin:10px 0;" />
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <button class="btn-mini" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Batal</button>
        <button class="btn-mini" onclick="konfirmasiResetPin('${uid}')">Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function konfirmasiResetPin(uid) {
  const pinBaru = document.getElementById("new-pin").value.trim();

  if (!/^\d{6}$/.test(pinBaru)) {
    alert("❌ PIN harus 6 digit angka.");
    return;
  }

  const db = firebase.firestore();
  await db.collection("users").doc(uid).update({ pin: pinBaru });

  alert("✅ PIN berhasil direset ke: " + pinBaru);
  document.querySelector(".modal-overlay").remove();
  loadContent("users-management"); // Refresh halaman
}


function transferSaldo(uid) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>💰 Transfer Saldo ke User</h3>
      <input id="jumlah-saldo" type="number" placeholder="Nominal (Rp)" style="width:100%;padding:8px 10px;margin:8px 0;" />
      <input id="catatan-saldo" type="text" placeholder="Catatan (Opsional)" style="width:100%;padding:8px 10px;margin-bottom:10px;" />
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <button class="btn-mini" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Batal</button>
        <button class="btn-mini" onclick="konfirmasiTransferSaldo('${uid}')">Transfer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function konfirmasiTransferSaldo(uid) {
  const jumlah = parseInt(document.getElementById("jumlah-saldo").value);
  const catatan = document.getElementById("catatan-saldo").value || "-";

  if (isNaN(jumlah) || jumlah <= 0) {
    alert("❌ Nominal tidak valid.");
    return;
  }

  const db = firebase.firestore();
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    alert("❌ Pengguna tidak ditemukan.");
    return;
  }

  const data = userDoc.data();
  const saldoLama = parseInt(data.saldo || 0);
  const saldoBaru = saldoLama + jumlah;

  await userRef.update({ saldo: saldoBaru });

  // Tambah ke log transaksi (opsional)
  await db.collection("transaksi_admin").add({
    userId: uid,
    jumlah,
    catatan,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("✅ Saldo berhasil ditransfer.");
  document.querySelector(".modal-overlay").remove();
  loadContent("users-management"); // refresh
}


function toggleStatus(uid) {
  alert("Suspend/Aktifkan/Banned UID: " + uid);
}

function lihatRiwayat(uid) {
  alert("Menampilkan riwayat transaksi UID: " + uid);
}


async function simpanPINBaru() {
  const pinLama = document.getElementById("pin-lama").value.trim();
  const pinBaru = document.getElementById("pin-baru").value.trim();
  const pinBaru2 = document.getElementById("pin-baru2").value.trim();

  // Validasi input dasar
  if (!pinLama || !pinBaru || !pinBaru2) {
    alert("⚠️ Semua field PIN wajib diisi.");
    return;
  }

  if (pinLama.length !== 6 || pinBaru.length !== 6 || pinBaru2.length !== 6 || isNaN(pinLama) || isNaN(pinBaru) || isNaN(pinBaru2)) {
    alert("⚠️ PIN harus 6 digit angka.");
    return;
  }

  if (pinBaru !== pinBaru2) {
    alert("❌ PIN baru tidak cocok.");
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    alert("⚠️ Silakan login ulang.");
    return;
  }

  const db = firebase.firestore();
  const userDocRef = db.collection("users").doc(user.uid);
  const doc = await userDocRef.get({ source: "server" });

  if (!doc.exists) {
    alert("❌ Data pengguna tidak ditemukan.");
    return;
  }

  const data = doc.data();
  const pinTersimpan = Number(data.pin || 0);
  const pinLamaInput = Number(pinLama);

  if (pinTersimpan !== pinLamaInput) {
    alert("❌ PIN lama salah.");
    return;
  }

  await userDocRef.update({ pin: Number(pinBaru) });

  alert("✅ PIN berhasil diperbarui.");
  loadContent("user");
}




function handleKlikCheckout() {
  prosesCheckout(); // langsung proses, tidak pakai PIN
}





async function renderDetailRiwayat(item) {
  const container = document.getElementById("riwayat-detail-container");
  if (!container) return;

  const now = Date.now();
  const db = firebase.firestore();

  // Ambil stepsLog terbaru dari Firestore
  let stepsLog = [];
  try {
    const doc = await db.collection("pesanan").doc(item.id).get();
    if (doc.exists) {
      const data = doc.data();
      stepsLog = Array.isArray(data.stepsLog) ? data.stepsLog : [];
    }
  } catch (err) {
    console.error("❌ Gagal mengambil data stepsLog dari Firestore:", err);
  }

  const waktuSelesaiFormatted = item.waktuSelesai
    ? new Date(item.waktuSelesai).toLocaleString("id-ID", {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : "-";

  const statusClass = {
    Berhasil: "status-selesai",
    Diproses: "status-proses",
    Dibatalkan: "status-batal",
    "Menunggu Pembayaran": "status-menunggu"
  }[item.status] || "status-unknown";

  let html = `
    <div class="riwayat-detail">
      <h3>Status: <span class="status-text ${statusClass}">${item.status}</span></h3>
      <p>🕐 Selesai pada: ${waktuSelesaiFormatted}</p>
      <h4>📋 Timeline Pengiriman:</h4>
      <ul class="timeline-log">
  `;

  const visibleSteps = stepsLog.filter(step => step.timestamp <= now);

  if (visibleSteps.length > 0) {
    visibleSteps.forEach(step => {
      const stepTime = new Date(step.timestamp).toLocaleTimeString("id-ID", {
        hour: '2-digit',
        minute: '2-digit'
      });
      html += `<li><strong>${stepTime}</strong> - ${step.label}</li>`;
    });
  } else {
    html += `<li><em>Belum ada log berjalan.</em></li>`;
  }

  html += `</ul></div>`;
  container.innerHTML = html;
}





async function renderRiwayat() {
  const list = document.getElementById("riwayat-list");
  if (!list) return;

  list.innerHTML = `<p>Memuat riwayat...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return;

  let namaCustomer = "Anda";
  const userDoc = await db.collection("users").doc(user.uid).get();
  if (userDoc.exists) {
    namaCustomer = userDoc.data().nama || "Anda";
  }

  db.collection("pesanan")
    .where("userId", "==", user.uid)
    .orderBy("waktuPesan", "desc")
    .onSnapshot(async (snapshot) => {
      const riwayat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const now = Date.now();

      if (riwayat.length === 0) {
        list.innerHTML = `<p class="riwayat-kosong-riwayat-transaksi">Belum ada pesanan sebelumnya.</p>`;
        return;
      }

      const driverSnapshot = await db.collection("pesanan_driver").get();
      const mapDriverByPesanan = {};
      driverSnapshot.forEach(doc => {
        const data = doc.data();
        if (data?.idPesanan && data?.idDriver) {
          mapDriverByPesanan[data.idPesanan] = data.idDriver;
        }
      });

      list.innerHTML = "";

      for (let i = 0; i < riwayat.length; i++) {
        const item = riwayat[i];
        const waktuPesan = new Date(item.waktuPesan || now);
        const waktuFormatted = waktuPesan.toLocaleTimeString("id-ID", {
          hour: "2-digit", minute: "2-digit"
        });

        const statusClass = {
          Pending: "status-menunggu-pesanan",
          Menunggu_Pembayaran: "status-menunggu-pesanan",
          Diproses: "status-menuju-resto",
          Selesai: "status-pesanan-diterima",
          Berhasil: "status-pesanan-diterima",
          Dibatalkan: "status-dibatalkan",
          Menuju_Resto: "status-menuju-resto",
          Menunggu_Pesanan: "status-menunggu-pesanan",
          Pickup_Pesanan: "status-pickup-pesanan",
          Menuju_Customer: "status-menuju-customer",
          Pesanan_Diterima: "status-pesanan-diterima"
        }[item.status.replace(/\s/g, "_")] || "status-menunggu-pesanan";

        const stepLog = Array.isArray(item.stepsLog) ? item.stepsLog : [];
        const historyList = stepLog.length > 0
          ? stepLog.map(log => `🕒 ${log.status || log.label || JSON.stringify(log)}<br>`).join("")
          : `<i>Belum ada langkah berjalan</i>`;

        const produkList = (item.produk || []).map(p => `
          <div class="riwayat-item-produk-riwayat-transaksi">
            <img src="${p.gambar || "https://via.placeholder.com/60"}" alt="${p.nama}" class="riwayat-item-img-riwayat-transaksi" />
            <div class="riwayat-item-info-riwayat-transaksi">
              <div class="riwayat-item-nama-riwayat-transaksi">${p.nama}</div>
              <div class="riwayat-item-jumlah-riwayat-transaksi">Jumlah: x${p.jumlah}</div>
              <div class="riwayat-item-harga-riwayat-transaksi">Total: Rp${(p.harga * p.jumlah).toLocaleString()}</div>
            </div>
          </div>
        `).join("");

        const idDriver = mapDriverByPesanan[item.id] || null;
        let namaDriver = "-";
        if (idDriver) {
          try {
            const driverDoc = await db.collection("driver").doc(idDriver).get();
            if (driverDoc.exists) {
              namaDriver = driverDoc.data().nama || "-";
            }
          } catch (e) {
            console.warn("Gagal mengambil nama driver:", e.message);
          }
        }

        const waktuSelesai = new Date(item.waktuPesan).getTime();
        const selisihWaktu = now - waktuSelesai;

        const isDibatalkan = item.status === "Dibatalkan";
        const isPending = ["Pending"].includes(item.status);
        const isDriverProcess = ["Menuju Resto", "Menunggu Pesanan", "Pickup Pesanan", "Menuju Customer", "Pesanan Diterima"].includes(item.status);
        const isSelesai = ["Selesai", "Berhasil"].includes(item.status);

        // Multi order label
        const multiStatus = item.multiStatus || {};
        const jumlahToko = Object.keys(multiStatus).length;
        const statusToko = Object.values(multiStatus);
        const sudahRespon = statusToko.filter(s => s === "Konfirmasi" || s === "Tolak").length;
        const statusMultiToko = jumlahToko > 1
          ? `🛍️ ${sudahRespon}/${jumlahToko} toko sudah merespon`
          : null;

        // Tombol aksi
        let tombolAction = "";

        if (!isDibatalkan) {
  if (isPending) {
    tombolAction += `
      <div class="riwayat-chat-actions-riwayat-transaksi">
        <button class="btn-chat-driver-riwayat-transaksi" onclick="renderChatSeller({ 
          idPesanan: '${item.id}', 
          idCustomer: '${item.userId}',
          namaCustomer: '${namaCustomer}',
          namaToko: '${(item.namaToko || "Seller").replace(/'/g, "\\'")}'})">💬 Chat Seller</button>
        <button class="btn-batal-pesanan-riwayat-transaksi" onclick="bukaModalPembatalan('${item.id}')">❌ Batalkan Pesanan</button>
      </div>
    `;
  } else if (isDriverProcess) {
    tombolAction += `
      <div class="riwayat-chat-actions-riwayat-transaksi">
        <button class="btn-chat-driver-riwayat-transaksi" onclick="renderChatCustomer({ 
          idPesanan: '${item.id}', 
          idDriver: '${idDriver}', 
          idCustomer: '${item.userId}',
          namaDriver: '${namaDriver}',
          namaCustomer: '${namaCustomer}'
        })">💬 Chat Driver</button>
        <button class="btn-laporkan-driver-riwayat-transaksi" onclick="laporkanDriver('${item.id}', '${idDriver}')">⚠️ Laporkan Driver</button>
      </div>
    `;
  } else if (isSelesai && selisihWaktu > 10 * 1000 && !item.ratingDiberikan) {
    tombolAction += `
      <div class="riwayat-rating-riwayat-transaksi">
        <button onclick="formRatingRestoDriver('${item.id}')" class="btn-rating-resto-riwayat-transaksi">🌟 Beri Rating</button>
      </div>
    `;
  }
}


        const box = document.createElement("div");
        box.className = "riwayat-box-riwayat-transaksi";
        box.innerHTML = `
          <div class="riwayat-header-riwayat-transaksi">
            <h4 class="riwayat-id-riwayat-transaksi">🆔 ${item.id}</h4>
            <span class="riwayat-status-riwayat-transaksi ${statusClass}">${item.status}</span>
            ${statusMultiToko ? `<small class="riwayat-status-multitoko">${statusMultiToko}</small>` : ""}
          </div>

          <div class="riwayat-produk-list-riwayat-transaksi">${produkList}</div>
          <p class="riwayat-subtotal-riwayat-transaksi"><strong>Subtotal:</strong> Rp${item.total?.toLocaleString() || 0}</p>
          <p class="riwayat-metode-riwayat-transaksi"><strong>Metode Pembayaran:</strong> ${item.metode?.toUpperCase() || "-"}</p>
          <p class="riwayat-tanggal-riwayat-transaksi"><small>Waktu Pesan: ${waktuFormatted}</small></p>

          <div class="riwayat-btn-group-riwayat-transaksi">
            <button class="btn-lihat-detail-riwayat-transaksi" onclick="toggleDetail(${i})">Lihat Detail</button>
          </div>

          ${tombolAction}

          <div class="riwayat-detail-riwayat-transaksi" id="detail-${i}" style="display: none;">
            <p><strong>History Waktu:</strong></p>
            <ul class="riwayat-steps-riwayat-transaksi">${historyList}</ul>
          </div>
        `;

        list.appendChild(box);
      }
    });
}


async function renderChatSeller({ idPesanan, idCustomer, namaCustomer = "Anda" }) {
  try {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
    
    // Validasi user
    if (!user) {
      alert("❌ Silakan login terlebih dahulu.");
      return;
    }
    
    if (user.uid !== idCustomer) {
      alert("❌ Anda tidak memiliki akses ke chat ini.");
      return;
    }

    // Cari modal dengan berbagai cara
    let modal = document.getElementById("modal-detail");
    
    // Jika modal tidak ditemukan, coba buat modal baru
    if (!modal) {
      console.warn("Modal tidak ditemukan, membuat modal baru...");
      modal = document.createElement('div');
      modal.id = 'modal-detail';
      modal.className = 'modal';
      modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
    }

    // Cari container dengan berbagai cara
    let container = modal.querySelector(".modal-content");
    if (!container) {
      // Jika tidak ada class modal-content, cari element lain atau buat baru
      container = modal.querySelector('div');
      if (!container) {
        container = document.createElement('div');
        container.className = 'modal-content';
        container.style.cssText = `
          background: white;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        `;
        modal.appendChild(container);
      }
    }

    // Tampilkan loading
    container.innerHTML = `
      <div class="flex items-center justify-center py-8">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-gray-600">Memuat chat...</p>
        </div>
      </div>
    `;

    modal.style.display = "flex";

    // Tambahkan event listener untuk close modal ketika klik di luar
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        // Cleanup Firebase listener jika ada
        if (modal._unsubscribeChat) {
          modal._unsubscribeChat();
        }
      }
    });

    // Ambil data pesanan untuk mendapatkan tokoId
    let tokoId = null;
    let namaToko = "Seller";
    
    try {
      const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
      if (!pesananDoc.exists) {
        container.innerHTML = `
          <div class="text-center py-8">
            <div class="bg-red-50 rounded-xl p-6">
              <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
              <h3 class="text-red-700 font-semibold mb-2">Pesanan Tidak Ditemukan</h3>
              <p class="text-red-600 text-sm">Data pesanan tidak dapat ditemukan.</p>
              <button 
                onclick="document.getElementById('modal-detail').style.display='none'" 
                class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        `;
        return;
      }

      const dataPesanan = pesananDoc.data();
      tokoId = dataPesanan.tokoId || null;

      if (tokoId) {
        try {
          const tokoDoc = await db.collection("toko").doc(tokoId).get();
          if (tokoDoc.exists) {
            namaToko = tokoDoc.data().nama || "Seller";
          }
        } catch (e) {
          console.warn("Gagal mengambil data toko:", e.message);
        }
      }
    } catch (error) {
      console.error("Error mengambil data pesanan:", error);
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="bg-red-50 rounded-xl p-6">
            <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
            <h3 class="text-red-700 font-semibold mb-2">Error</h3>
            <p class="text-red-600 text-sm">Gagal memuat data pesanan.</p>
            <button 
              onclick="document.getElementById('modal-detail').style.display='none'" 
              class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Render chat interface
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-white/20 p-2 rounded-lg">
                <i class="fas fa-store text-lg"></i>
              </div>
              <div>
                <h2 class="font-bold text-lg">Chat dengan ${namaToko}</h2>
                <p class="text-blue-100 text-sm">Order #${idPesanan.substring(0, 8)}</p>
              </div>
            </div>
            <button 
              onclick="closeChatModal()" 
              class="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Info -->
        <div class="p-4 border-b border-gray-200">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex items-center space-x-2">
              <i class="fas fa-user text-blue-500"></i>
              <span class="text-gray-600">Anda:</span>
              <span class="font-semibold">${namaCustomer}</span>
            </div>
            <div class="flex items-center space-x-2">
              <i class="fas fa-store text-green-500"></i>
              <span class="text-gray-600">Seller:</span>
              <span class="font-semibold">${namaToko}</span>
            </div>
          </div>
        </div>

        <!-- Chat Messages -->
        <div 
          id="chat-box-seller" 
          class="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          <div class="text-center text-gray-500 text-sm">
            <i class="fas fa-comments text-gray-300 text-xl mb-2"></i>
            <p>Memuat pesan...</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 border-t border-gray-200 bg-white">
          <div class="flex items-start space-x-2">
            <!-- Upload Button -->
            <button 
              id="upload-btn-seller"
              class="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-lg transition-colors"
              title="Upload Gambar"
              type="button"
            >
              <i class="fas fa-image"></i>
            </button>
            
            <!-- Hidden File Input -->
            <input 
              type="file" 
              id="file-input-seller" 
              accept="image/*" 
              class="hidden"
            />
            
            <!-- Message Input -->
            <input 
              type="text" 
              id="chat-input-seller" 
              placeholder="Ketik pesan..." 
              class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <!-- Send Button -->
            <button 
              id="send-btn-seller"
              class="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
              type="button"
            >
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          
          <!-- Upload Progress -->
          <div id="upload-progress-seller" class="mt-2 hidden">
            <div class="flex items-center space-x-2 text-sm text-blue-600">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Mengupload gambar...</span>
              <span id="upload-percent-seller">0%</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup event listeners
    const chatInput = document.getElementById('chat-input-seller');
    const sendBtn = document.getElementById('send-btn-seller');

    if (chatInput && sendBtn) {
      const sendMessage = () => {
        kirimPesanSeller(idPesanan, idCustomer, namaToko);
      };

      chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          sendMessage();
        }
      });

      sendBtn.addEventListener('click', sendMessage);
    }

    // Setup file upload
    const uploadBtn = document.getElementById('upload-btn-seller');
    const fileInput = document.getElementById('file-input-seller');
    const uploadProgress = document.getElementById('upload-progress-seller');
    const uploadPercent = document.getElementById('upload-percent-seller');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          await uploadImageToChat(file, idPesanan, idCustomer, namaToko, uploadProgress, uploadPercent);
          fileInput.value = '';
        }
      });
    }

    const chatBox = document.getElementById("chat-box-seller");
    if (!chatBox) {
      console.error("Chat box element tidak ditemukan");
      return;
    }

    // Listen for messages
    const unsubscribe = db.collection("chat_seller")
      .doc(idPesanan)
      .collection("pesan")
      .orderBy("waktu", "asc")
      .onSnapshot(snapshot => {
        if (!chatBox) return;

        chatBox.innerHTML = "";

        if (snapshot.empty) {
          chatBox.innerHTML = `
            <div class="text-center text-gray-500 py-8">
              <i class="fas fa-comments text-gray-300 text-3xl mb-3"></i>
              <p class="text-sm">Belum ada pesan</p>
              <p class="text-xs text-gray-400 mt-1">Mulai percakapan dengan ${namaToko}</p>
            </div>
          `;
          return;
        }

        snapshot.forEach(doc => {
          const data = doc.data();
          const isSenderCustomer = data.dari === idCustomer;
          const waktu = data.waktu?.toDate?.() || new Date();
          const waktuFormatted = waktu.toLocaleTimeString("id-ID", { 
            hour: '2-digit', 
            minute: '2-digit' 
          });

          const messageDiv = document.createElement("div");
          messageDiv.className = `flex ${isSenderCustomer ? 'justify-end' : 'justify-start'}`;
          
          let messageContent = '';
          if (data.tipe === 'gambar') {
            messageContent = `
              <div class="mb-2">
                <img 
                  src="${data.pesan}" 
                  alt="Gambar chat" 
                  class="rounded-lg max-w-full h-auto cursor-pointer max-h-48"
                  onerror="this.src='https://via.placeholder.com/200x150?text=Gambar+Error'"
                />
              </div>
            `;
          } else {
            messageContent = `
              <div class="${isSenderCustomer ? 'text-white' : 'text-gray-800'} break-words">
                ${escapeHTML(data.pesan)}
              </div>
            `;
          }
          
          messageDiv.innerHTML = `
            <div class="max-w-xs lg:max-w-md ${isSenderCustomer ? 'bg-blue-500' : 'bg-white border border-gray-200'} rounded-2xl p-3 shadow-sm">
              <div class="flex items-center space-x-2 mb-1">
                <span class="font-semibold text-xs ${isSenderCustomer ? 'text-blue-100' : 'text-gray-600'}">
                  ${isSenderCustomer ? 'Anda' : namaToko}
                </span>
              </div>
              ${messageContent}
              <div class="text-right mt-1">
                <span class="text-xs ${isSenderCustomer ? 'text-blue-200' : 'text-gray-400'}">
                  ${waktuFormatted}
                </span>
              </div>
            </div>
          `;

          // Add click event for images
          if (data.tipe === 'gambar') {
            const img = messageDiv.querySelector('img');
            if (img) {
              img.addEventListener('click', () => {
                bukaGambarModal(data.pesan, idPesanan, idCustomer, namaCustomer);
              });
            }
          }

          chatBox.appendChild(messageDiv);
        });

        // Auto scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
      }, error => {
        console.error("Error listening to messages:", error);
        if (chatBox) {
          chatBox.innerHTML = `
            <div class="text-center text-red-500 py-8">
              <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>
              <p class="text-sm">Gagal memuat pesan</p>
              <p class="text-xs text-red-400 mt-1">Coba refresh halaman</p>
            </div>
          `;
        }
      });

    // Simpan unsubscribe function untuk cleanup
    modal._unsubscribeChat = unsubscribe;

  } catch (error) {
    console.error("Error in renderChatSeller:", error);
    const modal = document.getElementById("modal-detail");
    if (modal) {
      const container = modal.querySelector(".modal-content") || modal.querySelector('div');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <div class="bg-red-50 rounded-xl p-6">
              <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
              <h3 class="text-red-700 font-semibold mb-2">Terjadi Kesalahan</h3>
              <p class="text-red-600 text-sm">Gagal memuat chat. Silakan coba lagi.</p>
              <button 
                onclick="closeChatModal()" 
                class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        `;
      }
    }
  }
}

// Fungsi untuk close modal
function closeChatModal() {
  const modal = document.getElementById("modal-detail");
  if (modal) {
    // Cleanup Firebase listener jika ada
    if (modal._unsubscribeChat) {
      modal._unsubscribeChat();
      delete modal._unsubscribeChat;
    }
    modal.style.display = 'none';
  }
}

// Fungsi untuk upload gambar
async function uploadImageToChat(file, idPesanan, idCustomer, namaToko, progressElement, percentElement) {
  try {
    if (!file || !file.type.startsWith('image/')) {
      alert('❌ Harap pilih file gambar yang valid');
      return;
    }

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Ukuran file terlalu besar. Maksimal 5MB');
      return;
    }

    // Tampilkan progress
    if (progressElement && percentElement) {
      progressElement.classList.remove('hidden');
      percentElement.textContent = '0%';
    }

    const storage = firebase.storage();
    const storageRef = storage.ref();
    const fileRef = storageRef.child('chat_images/' + idPesanan + '/' + Date.now() + '_' + file.name);
    
    const uploadTask = fileRef.put(file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (percentElement) {
            percentElement.textContent = Math.round(progress) + '%';
          }
        },
        (error) => {
          console.error('Upload error:', error);
          if (progressElement) {
            progressElement.classList.add('hidden');
          }
          alert('❌ Gagal mengupload gambar');
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            await kirimPesanGambar(idPesanan, idCustomer, namaToko, downloadURL);
            
            if (progressElement) {
              progressElement.classList.add('hidden');
            }
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            if (progressElement) {
              progressElement.classList.add('hidden');
            }
            alert('❌ Gagal mengirim gambar');
            reject(error);
          }
        }
      );
    });

  } catch (error) {
    console.error('Error in uploadImageToChat:', error);
    if (progressElement) {
      progressElement.classList.add('hidden');
    }
    alert('❌ Terjadi kesalahan saat upload gambar');
    throw error;
  }
}

// Fungsi untuk kirim pesan gambar
async function kirimPesanGambar(idPesanan, idCustomer, namaToko, imageUrl) {
  try {
    const db = firebase.firestore();
    
    await db.collection("chat_seller")
      .doc(idPesanan)
      .collection("pesan")
      .add({
        dari: idCustomer,
        pesan: imageUrl,
        tipe: 'gambar',
        waktu: firebase.firestore.FieldValue.serverTimestamp(),
        namaPengirim: namaCustomer || "Customer"
      });

  } catch (error) {
    console.error('Error sending image message:', error);
    alert('❌ Gagal mengirim gambar');
    throw error;
  }
}

// Fungsi untuk buka gambar modal
function bukaGambarModal(imageUrl, idPesanan, idCustomer, namaCustomer) {
  const modal = document.getElementById('modal-detail');
  if (modal) {
    const container = modal.querySelector('.modal-content') || modal.querySelector('div');
    if (container) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-4 max-w-2xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg">Preview Gambar</h3>
            <button 
              onclick="renderChatSeller({ idPesanan: '${idPesanan}', idCustomer: '${idCustomer}', namaCustomer: '${namaCustomer}' })"
              class="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i class="fas fa-times text-lg"></i>
            </button>
          </div>
          <div class="flex justify-center mb-4">
            <img 
              src="${imageUrl}" 
              alt="Gambar preview" 
              class="max-w-full max-h-96 rounded-lg shadow-lg"
              onerror="this.src='https://via.placeholder.com/400x300?text=Gambar+Tidak+Ditemukan'"
            />
          </div>
          <div class="flex justify-center space-x-3">
            <a 
              href="${imageUrl}" 
              target="_blank" 
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <i class="fas fa-external-link-alt"></i>
              <span>Buka di Tab Baru</span>
            </a>
            <button 
              onclick="renderChatSeller({ idPesanan: '${idPesanan}', idCustomer: '${idCustomer}', namaCustomer: '${namaCustomer}' })"
              class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <i class="fas fa-arrow-left"></i>
              <span>Kembali ke Chat</span>
            </button>
          </div>
        </div>
      `;
    }
  }
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;', 
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

// Fungsi kirim pesan teks
async function kirimPesanSeller(idPesanan, idCustomer, namaToko) {
  try {
    const input = document.getElementById('chat-input-seller');
    if (!input) return;

    const pesan = input.value.trim();
    if (!pesan) return;

    const db = firebase.firestore();
    
    await db.collection("chat_seller")
      .doc(idPesanan)
      .collection("pesan")
      .add({
        dari: idCustomer,
        pesan: pesan,
        tipe: 'teks',
        waktu: firebase.firestore.FieldValue.serverTimestamp(),
        namaPengirim: namaCustomer || "Customer"
      });

    input.value = '';
    input.focus();
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('❌ Gagal mengirim pesan');
  }
}


async function kirimPesanTemplateSeller(pesan, idPesanan, idCustomer, namaToko) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Anda belum login.");

  await db.collection("chat_seller").doc(idPesanan).collection("pesan").add({
    dari: user.uid,
    ke: idCustomer,
    nama: namaToko,
    pesan,
    waktu: new Date()
  });
}


function escapeHTML(str) {
  return (str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[m]);
}


async function renderChatCustomer({ idPesanan, idDriver, idCustomer, namaDriver = "Driver", namaCustomer = "Anda" }) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user || user.uid !== idCustomer) return alert("❌ Anda tidak memiliki akses.");

  const modal = document.getElementById("modal-detail");
  const container = modal.querySelector(".modal-content");

  container.innerHTML = `
    <div class="chat-header-chat" style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">💬 Chat dengan ${namaDriver}</h2>
      <button onclick="document.getElementById('modal-detail').style.display='none'" style="font-size:18px;">❌</button>
    </div>

    <div style="margin:5px 0;"><strong>Order ID:</strong> ${idPesanan}</div>
    <div class="chat-info-chat" style="margin-bottom:10px; font-size:14px;">
      <p><strong>Anda:</strong> ${namaCustomer}</p>
      <p><strong>Driver:</strong> ${namaDriver}</p>
    </div>

    <div id="chat-box-customer" class="chat-box-chat" style="max-height:300px; overflow-y:auto; padding:10px; border:1px solid #ccc; border-radius:8px; background:#f9f9f9; margin-bottom:10px;"></div>

    <div class="chat-form-chat" style="display:flex; gap:8px; margin-bottom:10px;">
      <input type="text" id="chat-input-customer" placeholder="Ketik pesan..." style="flex:1; padding:6px 10px; border-radius:6px; border:1px solid #ccc;" />
      <button onclick="kirimPesanCustomer('${idPesanan}', '${idCustomer}', '${idDriver}', '${namaCustomer}')">Kirim</button>
    </div>

    <div class="chat-templates-chat">
      <p><strong>📋 Template Cepat:</strong></p>
      <div class="template-buttons-chat" style="display:flex; flex-wrap:wrap; gap:6px;">
        <button class="mini-btn-chat" onclick="kirimPesanTemplateCustomer('Lokasi saya ada di sini, apakah sudah dekat?', '${idPesanan}', '${idCustomer}', '${idDriver}', '${namaCustomer}')">📍 Lokasi Saya</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplateCustomer('Berapa lama lagi sampai?', '${idPesanan}', '${idCustomer}', '${idDriver}', '${namaCustomer}')">🕒 Lama Sampai</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplateCustomer('Tolong letakkan di depan pintu ya', '${idPesanan}', '${idCustomer}', '${idDriver}', '${namaCustomer}')">🚪 Di Depan</button>
        <button class="mini-btn-chat" onclick="kirimPesanTemplateCustomer('Terima kasih ya, pesanannya sudah saya terima.', '${idPesanan}', '${idCustomer}', '${idDriver}', '${namaCustomer}')">✅ Terima Kasih</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";

  const chatBox = container.querySelector("#chat-box-customer");

  db.collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .orderBy("waktu", "asc")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";

      if (snapshot.empty) {
        chatBox.innerHTML = "<p style='text-align:center; color:gray;'>Belum ada pesan.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const isSenderCustomer = data.dari === idCustomer;
        const posisi = isSenderCustomer ? "flex-end" : "flex-start";
        const bgColor = isSenderCustomer ? "#d1f1ff" : "#f1f1f1";
        const waktu = data.waktu?.toDate?.() || new Date();

        const bubble = document.createElement("div");
        bubble.style = `
          align-self: ${posisi};
          background: ${bgColor};
          padding: 10px;
          border-radius: 10px;
          margin-bottom: 8px;
          max-width: 70%;
        `;
        bubble.innerHTML = `
          <div style="font-weight:bold; margin-bottom:3px;">${isSenderCustomer ? "Anda" : namaDriver}</div>
          <div>${escapeHTML(data.pesan)}</div>
          <div style="text-align:right; font-size:11px; color:#777;">${waktu.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        chatBox.appendChild(bubble);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}



function toggleDetail(index) {
  const el = document.getElementById(`detail-${index}`);
  if (!el) return;

  const isHidden = el.style.display === "none" || el.style.display === "";
  document.querySelectorAll(".riwayat-detail-riwayat-transaksi").forEach(detail => {
    detail.style.display = "none";
  });

  if (isHidden) el.style.display = "block";
}

function filterProduk() {
  const input = document.getElementById("search-input");
  const wrapper = document.getElementById("produk-list-wrapper");

  if (!input || !wrapper || !Array.isArray(window.produkData)) return;

  const keyword = input.value.trim().toLowerCase();

  const hasilFilter = window.produkData.filter(produk =>
    (produk.namaProduk || "").toLowerCase().includes(keyword)
  );

  if (hasilFilter.length === 0) {
    wrapper.innerHTML = `<p style="text-align:center; padding: 1rem; color: #888;">❌ Produk tidak ditemukan.</p>`;
    return;
  }

  const hasilUrut = hasilFilter.sort((a, b) => {
    const rA = parseFloat((a.ratingDisplay || "").replace(/[^\d.]/g, "")) || 0;
    const rB = parseFloat((b.ratingDisplay || "").replace(/[^\d.]/g, "")) || 0;
    return rB - rA;
  });

  wrapper.innerHTML = hasilUrut.map((produk, index) => {
    const stokHabis = (produk.stok || 0) <= 0;
    const layananTidakTersedia = produk.jarakNumber > 20;
    const disabledAttr = (!produk.isOpen || stokHabis || layananTidakTersedia) ? 'disabled' : '';
    let btnText = 'Lihat Detail';
    if (layananTidakTersedia) btnText = 'Layanan Tidak Tersedia';
    else if (!produk.isOpen) btnText = 'Toko Tutup';
    else if (stokHabis) btnText = 'Stok Habis';

    return `
      <div class="produk-horizontal">
        <div class="produk-toko-bar" onclick="renderTokoPage('${produk.idToko}')">
          <i class="fa-solid fa-shop"></i>
          <span class="produk-toko-nama">${produk.tokoNama}</span>
          <span class="produk-toko-arrow">›</span>
        </div>
        <div class="produk-body">
          <img src="${produk.urlGambar || './img/toko-pict.png'}" alt="${produk.namaProduk}" class="produk-img" />
          <div class="produk-info">
            <p class="produk-nama">${produk.namaProduk}</p>
            <p class="produk-meta">Kategori: ${produk.kategori || '-'}</p>
            <p class="produk-meta">
              ${produk.ratingDisplay || '⭐ -'} |
              ${produk.jarak || '-'} |
              ${produk.estimasi || '-'} Menit
            </p>
            <div class="produk-action">
              <strong>Rp ${Number(produk.harga || 0).toLocaleString()}</strong>
              <button class="beli-btn" data-index="${index}" ${disabledAttr}>${btnText}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}



async function renderKategoriPage(kategori) {
  const bannerWrapper = document.getElementById("home-banner-wrapper");
  if (bannerWrapper) {
    bannerWrapper.innerHTML = `
      <div class="kategori-banner-full">
        <img src="./img/banner-bg.png" alt="${kategori}" class="kategori-banner-img" />
      </div>
      <div class="breadcrumb">
        <span>Beranda</span> / Kategori / <strong>${kategori}</strong>
      </div>
    `;
  }

  const main = document.getElementById("page-container");
  main.innerHTML = `
    <div class="kategori-page">
      <nav class="breadcrumb"></nav>
      <div id="produk-container"><div class="loader">⏳ Memuat produk...</div></div>
    </div>
  `;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    document.getElementById("produk-container").innerHTML = "<p>❌ Harap login terlebih dahulu.</p>";
    return;
  }

  try {
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      document.getElementById("produk-container").innerHTML = "<p>❌ Silahkan tambahkan Alamat terlebih dahulu.</p>";
      return;
    }

    const { latitude: lat1, longitude: lon1 } = alamatDoc.data().lokasi;

    const produkSnapshot = await db.collection("produk").get();
    const tokoSnapshot = await db.collection("toko").get();

    const tokoMap = {};
    tokoSnapshot.docs.forEach(doc => {
      const data = doc.data();
      tokoMap[doc.id] = {
        namaToko: data.namaToko || 'Toko',
        isOpen: data.isOpen ?? false,
        koordinat: data.koordinat instanceof firebase.firestore.GeoPoint
          ? { lat: data.koordinat.latitude, lng: data.koordinat.longitude }
          : { lat: 0, lng: 0 }
      };
    });

    const hitungJarak = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const produkGabung = [];

    for (const doc of produkSnapshot.docs) {
      const p = doc.data();
      const id = doc.id;
      const toko = tokoMap[p.idToko];
      if (!toko) continue;

      const jarakKm = hitungJarak(lat1, lon1, toko.koordinat.lat, toko.koordinat.lng);

      const cocok =
        kategori.toLowerCase() === "terdekat" ||
        (kategori.toLowerCase() === "bestseller" && (p.totalTerjual || 0) > 0) ||
        (kategori.toLowerCase() === "promo" && (p.promo || p.diskon > 0)) ||
        (kategori.toLowerCase() === "hemat" && (p.harga || 0) <= 10000) ||
        (kategori.toLowerCase() === (p.kategori || "").toLowerCase());

      if (cocok) {
        const ratingSnap = await db.collection("produk").doc(id).collection("rating").get();
        let total = 0, count = 0;
        ratingSnap.forEach(r => {
          const d = r.data();
          if (typeof d.rating === "number") {
            total += d.rating;
            count++;
          }
        });

        produkGabung.push({
          ...p,
          id,
          tokoNama: toko.namaToko,
          isOpen: toko.isOpen,
          jarak: `${jarakKm.toFixed(2)} km`,
          jarakNumber: jarakKm,
          urlGambar: p.urlGambar || './img/toko-pict.png',
          ratingDisplay: count > 0 ? `⭐ ${(total / count).toFixed(1)} <span style="color:#888;">(${count})</span>` : "⭐ -",
          diLuarJangkauan: jarakKm > 20
        });
      }
    }

    const produkFinal = kategori.toLowerCase() === "terdekat"
      ? produkGabung.sort((a, b) => a.jarakNumber - b.jarakNumber)
      : produkGabung;

    const produkHTML = produkFinal.map(p => {
      const stokHabis = (p.stok || 0) <= 0;
      const luarJangkauan = p.diLuarJangkauan;
      const disabledAttr = (!p.isOpen || stokHabis || luarJangkauan) ? 'disabled' : '';
      let btnText = 'Lihat Detail';
      if (!p.isOpen) btnText = 'Toko Tutup';
      else if (stokHabis) btnText = 'Stok Habis';
      else if (luarJangkauan) btnText = 'Tidak tersedia';

      return `
        <div class="produk-horizontal">
          <div class="produk-toko-bar" onclick="renderTokoPage('${p.idToko}')">
            <i class="fa-solid fa-shop"></i>
            <span class="produk-toko-nama">${p.tokoNama}</span>
            <span class="produk-toko-arrow">›</span>
          </div>
          <div class="produk-body">
            <img src="${p.urlGambar}" alt="${p.namaProduk}" class="produk-img" />
            <div class="produk-info">
              <p class="produk-nama">${p.namaProduk}</p>
              <p class="produk-meta">${p.ratingDisplay} | ${p.jarak || '-'} | ${p.estimasi || '-'} Menit</p>
              <div class="produk-action">
                <strong>Rp ${Number(p.harga || 0).toLocaleString()}</strong>
                <button class="beli-btn" ${disabledAttr} onclick='${luarJangkauan ? `alert("Layanan belum tersedia di lokasi anda")` : `tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, "&quot;")})`}'>${btnText}</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("produk-container").innerHTML = produkFinal.length
      ? produkHTML
      : `<p style="text-align:center;">❌ Belum ada produk untuk kategori <strong>${kategori}</strong>.</p>`;

  } catch (err) {
    console.error("❌ Gagal renderKategoriPage:", err);
    document.getElementById("produk-container").innerHTML = `<p style="color:red;">❌ Terjadi kesalahan saat memuat produk.</p>`;
  }
}


async function renderTokoPage(idToko) {
  document.getElementById("home-banner-wrapper").innerHTML = "";
  document.getElementById("home-banner-wrapper").style.display = "none";

  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="delivery-loading">
      <div class="delivery-spinner"></div>
      <p>Memuat halaman toko...</p>
    </div>
  `;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = `
      <div class="delivery-error">
        <div class="delivery-error-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3>Login Diperlukan</h3>
        <p>Silakan login terlebih dahulu untuk melihat halaman toko</p>
        <button class="delivery-admin-btn-primary" onclick="loadContent('login')">
          <i class="fas fa-sign-in-alt"></i>
          Login Sekarang
        </button>
      </div>
    `;
    return;
  }

  try {
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      container.innerHTML = `
        <div class="delivery-error">
          <div class="delivery-error-icon">
            <i class="fas fa-map-marker-alt"></i>
          </div>
          <h3>Lokasi Tidak Ditemukan</h3>
          <p>Atur lokasi pengiriman Anda terlebih dahulu</p>
          <button class="delivery-admin-btn-primary" onclick="loadContent('alamat')">
            <i class="fas fa-map-pin"></i>
            Atur Lokasi
          </button>
        </div>
      `;
      return;
    }

    const lokasiUser = alamatDoc.data().lokasi;
    const lat1 = lokasiUser.latitude;
    const lon1 = lokasiUser.longitude;

    const tokoDoc = await db.collection("toko").doc(idToko).get();
    if (!tokoDoc.exists) {
      container.innerHTML = `
        <div class="delivery-error">
          <div class="delivery-error-icon">
            <i class="fas fa-store-slash"></i>
          </div>
          <h3>Toko Tidak Ditemukan</h3>
          <p>Toko yang Anda cari tidak ditemukan atau mungkin sudah tidak aktif</p>
          <button class="delivery-admin-btn-secondary" onclick="loadContent('home')">
            <i class="fas fa-arrow-left"></i>
            Kembali ke Beranda
          </button>
        </div>
      `;
      return;
    }

    const toko = tokoDoc.data();

    // Get store rating
    const ratingSnapshot = await db.collection("toko").doc(idToko).collection("rating").get();
    let totalRatingToko = 0;
    let countRatingToko = 0;

    ratingSnapshot.forEach(doc => {
      const data = doc.data();
      if (typeof data.rating === "number") {
        totalRatingToko += data.rating;
        countRatingToko++;
      }
    });

    const rataToko = countRatingToko > 0 ? (totalRatingToko / countRatingToko).toFixed(1) : null;

    // Calculate distance
    const hitungJarak = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Get products
    const produkSnapshot = await db.collection("produk").where("idToko", "==", idToko).get();

    const produkPromises = produkSnapshot.docs.map(async doc => {
      const produk = doc.data();
      const idProduk = doc.id;

      // Get product rating
      const ratingSnap = await db.collection("produk").doc(idProduk).collection("rating").get();
      let total = 0, count = 0;
      ratingSnap.forEach(r => {
        const data = r.data();
        if (typeof data.rating === "number") {
          total += data.rating;
          count++;
        }
      });

      const rataRating = count > 0 ? (total / count).toFixed(1) : "-";
      const lat2 = toko.koordinat?.latitude || 0;
      const lon2 = toko.koordinat?.longitude || 0;
      const jarakKm = (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2))
        ? hitungJarak(lat1, lon1, lat2, lon2)
        : 0;

      return {
        id: idProduk,
        ...produk,
        rating: rataRating,
        tokoNama: toko.namaToko,
        isOpen: toko.isOpen ?? false,
        jarak: `${jarakKm.toFixed(1)} km`,
        jarakNumber: jarakKm,
        urlGambar: produk.urlGambar || './img/toko-pict.png',
        diLuarJangkauan: jarakKm > 20,
        reviewCount: count
      };
    });

    const produkTokoFull = await Promise.all(produkPromises);
    const gambarToko = toko.logo || toko.foto || './img/toko-pict.png';

    // Check store status
    const sekarang = new Date();
    const jamSekarang = sekarang.getHours();
    const isTokoBuka = toko.isOpen && jamSekarang >= (toko.jamBuka || 0) && jamSekarang < (toko.jamTutup || 24);

    let html = `
      <div class="delivery-toko-container">
        <!-- Store Header -->
        <div class="delivery-toko-header">
          <div class="delivery-toko-cover">
            <div class="delivery-toko-cover-overlay"></div>
            <div class="delivery-toko-profile">
              <div class="delivery-toko-avatar">
                <img src="${gambarToko}" alt="${toko.namaToko}" 
                     onerror="this.src='./img/toko-pict.png'" />
                <div class="delivery-toko-status ${isTokoBuka ? 'delivery-toko-open' : 'delivery-toko-closed'}">
                  <i class="fas fa-${isTokoBuka ? 'check' : 'times'}"></i>
                </div>
              </div>
              <div class="delivery-toko-info">
                <h1 class="delivery-toko-name">${toko.namaToko}</h1>
                <div class="delivery-toko-meta">
                  ${rataToko ? `
                    <div class="delivery-toko-rating">
                      <i class="fas fa-star"></i>
                      <span>${rataToko}</span>
                      <span class="delivery-toko-review-count">(${countRatingToko} ulasan)</span>
                    </div>
                  ` : `
                    <div class="delivery-toko-no-rating">
                      <i class="fas fa-star"></i>
                      <span>Belum ada rating</span>
                    </div>
                  `}
                  <div class="delivery-toko-distance">
                    <i class="fas fa-location-dot"></i>
                    <span>${produkTokoFull[0]?.jarak || '0 km'}</span>
                  </div>
                  <div class="delivery-toko-hours">
                    <i class="fas fa-clock"></i>
                    <span>${toko.jamBuka || 0}:00 - ${toko.jamTutup || 24}:00</span>
                  </div>
                </div>
                <div class="delivery-toko-status-badge ${isTokoBuka ? 'delivery-status-open' : 'delivery-status-closed'}">
                  <i class="fas fa-${isTokoBuka ? 'check-circle' : 'times-circle'}"></i>
                  ${isTokoBuka ? 'Sedang Buka' : 'Sedang Tutup'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Store Description -->
        <div class="delivery-toko-description">
          <div class="delivery-toko-description-header">
            <i class="fas fa-info-circle"></i>
            <h3>Tentang Toko</h3>
          </div>
          <p class="delivery-toko-description-text">${toko.deskripsiToko || 'Toko ini belum memiliki deskripsi.'}</p>
          <div class="delivery-toko-address">
            <i class="fas fa-map-marker-alt"></i>
            <span>${toko.alamatToko || 'Alamat belum tersedia'}</span>
          </div>
        </div>

        <!-- Products Section -->
        <div class="delivery-toko-products">
          <div class="delivery-toko-products-header">
            <div class="delivery-toko-products-title">
              <i class="fas fa-utensils"></i>
              <h2>Menu Produk</h2>
              <span class="delivery-toko-products-count">${produkTokoFull.length} item</span>
            </div>
            <div class="delivery-toko-products-actions">
              <button class="delivery-toko-filter-btn" onclick="showTokoFilter()">
                <i class="fas fa-filter"></i>
                Filter
              </button>
            </div>
          </div>
    `;

    if (produkTokoFull.length === 0) {
      html += `
        <div class="delivery-toko-empty">
          <div class="delivery-toko-empty-icon">
            <i class="fas fa-box-open"></i>
          </div>
          <h3>Belum Ada Produk</h3>
          <p>Toko ini belum memiliki produk yang tersedia</p>
        </div>
      `;
    } else {
      html += `<div class="delivery-toko-products-grid">`;
      
      produkTokoFull.forEach((produk, index) => {
        const tokoAktif = produk.isOpen;
        const stokHabis = (produk.stok || 0) <= 0;
        const luarJangkauan = produk.diLuarJangkauan;
        
        let btnText = 'Pesan Sekarang';
        let btnClass = 'delivery-product-btn-primary';
        let disabledAttr = '';
        
        if (!tokoAktif) {
          btnText = 'Toko Tutup';
          btnClass = 'delivery-product-btn-disabled';
          disabledAttr = 'disabled';
        } else if (stokHabis) {
          btnText = 'Stok Habis';
          btnClass = 'delivery-product-btn-disabled';
          disabledAttr = 'disabled';
        } else if (luarJangkauan) {
          btnText = 'Diluar Jangkauan';
          btnClass = 'delivery-product-btn-disabled';
          disabledAttr = 'disabled';
        }

        const estimasiText = produk.estimasi ? `${produk.estimasi} menit` : '10 menit';
        const harga = Number(produk.harga || 0);
        const showDiskon = produk.hargaDiskon && produk.hargaDiskon < harga;

        html += `
          <div class="delivery-toko-product-card ${!tokoAktif ? 'delivery-product-disabled' : ''}">
            <div class="delivery-toko-product-image">
              <img src="${produk.urlGambar}" alt="${produk.namaProduk}" 
                   onerror="this.src='./img/toko-pict.png'" />
              ${showDiskon ? `
                <div class="delivery-product-discount-badge">
                  <i class="fas fa-tag"></i>
                  Diskon
                </div>
              ` : ''}
              ${stokHabis ? `
                <div class="delivery-product-outstock-overlay">
                  <span>Stok Habis</span>
                </div>
              ` : ''}
            </div>
            
            <div class="delivery-toko-product-info">
              <h3 class="delivery-toko-product-name">${produk.namaProduk}</h3>
              <p class="delivery-toko-product-description">${produk.deskripsi || 'Produk berkualitas dari toko kami'}</p>
              
              <div class="delivery-toko-product-meta">
                <div class="delivery-toko-product-rating">
                  <i class="fas fa-star"></i>
                  <span>${produk.rating}</span>
                  <span class="delivery-toko-product-review-count">(${produk.reviewCount})</span>
                </div>
                <div class="delivery-toko-product-time">
                  <i class="fas fa-clock"></i>
                  <span>${estimasiText}</span>
                </div>
              </div>

              <div class="delivery-toko-product-price">
                ${showDiskon ? `
                  <div class="delivery-toko-product-price-discount">
                    <span class="delivery-toko-product-price-current">Rp ${produk.hargaDiskon.toLocaleString('id-ID')}</span>
                    <span class="delivery-toko-product-price-original">Rp ${harga.toLocaleString('id-ID')}</span>
                  </div>
                ` : `
                  <span class="delivery-toko-product-price-normal">Rp ${harga.toLocaleString('id-ID')}</span>
                `}
              </div>

              <div class="delivery-toko-product-actions">
                <button class="${btnClass}" ${disabledAttr} 
                        onclick="handleTokoProductClick(${index}, ${JSON.stringify(produk).replace(/"/g, '&quot;')})">
                  <i class="fas fa-shopping-cart"></i>
                  ${btnText}
                </button>
              </div>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Add event listeners for product buttons
    window.handleTokoProductClick = function(index, produk) {
      if (produk.diLuarJangkauan) {
        showNotification('Layanan belum tersedia di lokasi Anda', 'error');
        return;
      }
      
      if (typeof tampilkanPopupDetail === 'function') {
        tampilkanPopupDetail(produk);
      }
    };

  } catch (err) {
    console.error("❌ Gagal memuat toko:", err);
    container.innerHTML = `
      <div class="delivery-error">
        <div class="delivery-error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Gagal Memuat Toko</h3>
        <p>Terjadi kesalahan saat memuat halaman toko. Silakan coba lagi.</p>
        <div class="delivery-error-actions">
          <button class="delivery-admin-btn-primary" onclick="renderTokoPage('${idToko}')">
            <i class="fas fa-redo"></i>
            Coba Lagi
          </button>
          <button class="delivery-admin-btn-secondary" onclick="loadContent('home')">
            <i class="fas fa-arrow-left"></i>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    `;
  }
}

// Add CSS styles for toko page
const tokoPageStyles = `
  <style>
    /* Toko Container */
    .delivery-toko-container {
      max-width: 100%;
      margin: 0 auto;
      background: white;
      min-height: 100vh;
    }

    /* Toko Header */
    .delivery-toko-header {
      position: relative;
    }

    .delivery-toko-cover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem 1rem;
      position: relative;
      overflow: hidden;
    }

    .delivery-toko-cover-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
    }

    .delivery-toko-profile {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .delivery-toko-avatar {
      position: relative;
      flex-shrink: 0;
    }

    .delivery-toko-avatar img {
      width: 120px;
      height: 120px;
      border-radius: 20px;
      object-fit: cover;
      border: 4px solid white;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .delivery-toko-status {
      position: absolute;
      bottom: -5px;
      right: -5px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }

    .delivery-toko-open {
      background: #10b981;
      color: white;
    }

    .delivery-toko-closed {
      background: #ef4444;
      color: white;
    }

    .delivery-toko-info {
      flex: 1;
      color: white;
      padding-bottom: 1rem;
    }

    .delivery-toko-name {
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0 0 1rem 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .delivery-toko-meta {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .delivery-toko-rating,
    .delivery-toko-no-rating,
    .delivery-toko-distance,
    .delivery-toko-hours {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .delivery-toko-rating {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 50px;
      backdrop-filter: blur(10px);
    }

    .delivery-toko-review-count {
      opacity: 0.8;
      font-size: 0.8rem;
    }

    .delivery-toko-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 50px;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .delivery-status-open {
      background: rgba(16, 185, 129, 0.9);
      color: white;
    }

    .delivery-status-closed {
      background: rgba(239, 68, 68, 0.9);
      color: white;
    }

    /* Toko Description */
    .delivery-toko-description {
      padding: 2rem 1rem;
      max-width: 1200px;
      margin: 0 auto;
      border-bottom: 1px solid #e5e7eb;
    }

    .delivery-toko-description-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .delivery-toko-description-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin: 0;
    }

    .delivery-toko-description-header i {
      color: #3b82f6;
      font-size: 1.25rem;
    }

    .delivery-toko-description-text {
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .delivery-toko-address {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .delivery-toko-address i {
      color: #ef4444;
    }

    /* Products Section */
    .delivery-toko-products {
      padding: 2rem 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .delivery-toko-products-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .delivery-toko-products-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .delivery-toko-products-title h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .delivery-toko-products-title i {
      color: #f59e0b;
      font-size: 1.5rem;
    }

    .delivery-toko-products-count {
      background: #e5e7eb;
      color: #6b7280;
      padding: 0.25rem 0.75rem;
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .delivery-toko-filter-btn {
      background: white;
      border: 2px solid #e5e7eb;
      color: #6b7280;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .delivery-toko-filter-btn:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }

    /* Products Grid */
    .delivery-toko-products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    /* Product Card */
    .delivery-toko-product-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      border: 1px solid #f3f4f6;
      position: relative;
    }

    .delivery-toko-product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .delivery-product-disabled {
      opacity: 0.6;
    }

    .delivery-product-disabled:hover {
      transform: none;
    }

    .delivery-toko-product-image {
      position: relative;
      height: 200px;
      overflow: hidden;
    }

    .delivery-toko-product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .delivery-toko-product-card:hover .delivery-toko-product-image img {
      transform: scale(1.05);
    }

    .delivery-product-discount-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .delivery-product-outstock-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 1rem;
    }

    .delivery-toko-product-info {
      padding: 1.25rem;
    }

    .delivery-toko-product-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      line-height: 1.4;
    }

    .delivery-toko-product-description {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1rem 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .delivery-toko-product-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .delivery-toko-product-rating,
    .delivery-toko-product-time {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .delivery-toko-product-rating i {
      color: #f59e0b;
    }

    .delivery-toko-product-time i {
      color: #3b82f6;
    }

    .delivery-toko-product-review-count {
      color: #9ca3af;
    }

    .delivery-toko-product-price {
      margin-bottom: 1rem;
    }

    .delivery-toko-product-price-normal {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }

    .delivery-toko-product-price-discount {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .delivery-toko-product-price-current {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ef4444;
    }

    .delivery-toko-product-price-original {
      font-size: 0.875rem;
      color: #9ca3af;
      text-decoration: line-through;
    }

    .delivery-toko-product-actions {
      display: flex;
    }

    .delivery-product-btn-primary,
    .delivery-product-btn-disabled {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      font-size: 0.875rem;
    }

    .delivery-product-btn-primary {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }

    .delivery-product-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .delivery-product-btn-disabled {
      background: #e5e7eb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    /* Empty State */
    .delivery-toko-empty {
      text-align: center;
      padding: 4rem 2rem;
    }

    .delivery-toko-empty-icon {
      font-size: 4rem;
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .delivery-toko-empty h3 {
      font-size: 1.5rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .delivery-toko-empty p {
      color: #9ca3af;
      margin: 0;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .delivery-toko-profile {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1rem;
      }

      .delivery-toko-avatar img {
        width: 100px;
        height: 100px;
      }

      .delivery-toko-meta {
        justify-content: center;
        gap: 1rem;
      }

      .delivery-toko-products-grid {
        grid-template-columns: 1fr;
      }

      .delivery-toko-products-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
    }

    @media (max-width: 480px) {
      .delivery-toko-cover {
        padding: 1.5rem 1rem 1rem;
      }

      .delivery-toko-name {
        font-size: 1.5rem;
      }

      .delivery-toko-meta {
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }

      .delivery-toko-description,
      .delivery-toko-products {
        padding: 1.5rem 1rem;
      }
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-toko-page-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-toko-page-styles';
  styleElement.textContent = tokoPageStyles;
  document.head.appendChild(styleElement);
}

// Helper function for notifications
function showNotification(message, type = 'info') {
  // Implementation for showing notifications
  console.log(`${type}: ${message}`);
}

async function prosesCheckout() {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");
  const uid = user.uid;
  const db = firebase.firestore();

  const metodePembayaran = document.getElementById("metode-pembayaran")?.value || "saldo";
  const metodePengiriman = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  const catatanPesanan = document.getElementById("catatan-pesanan")?.value.trim() || "-";

  const alamatDoc = await db.collection("alamat").doc(uid).get();
  if (!alamatDoc.exists) return alert("❌ Alamat belum tersedia.");
  const { nama, noHp, alamat, lokasi } = alamatDoc.data();

  const keranjangDoc = await db.collection("keranjang").doc(uid).get();
  const produk = keranjangDoc.exists ? keranjangDoc.data().items || [] : [];
  if (produk.length === 0) return alert("❌ Keranjang kosong.");

  for (let i = 0; i < produk.length; i++) {
    const item = produk[i];
    const produkDoc = await db.collection("produk").doc(item.id).get();
    produk[i].estimasi = produkDoc.exists ? (parseInt(produkDoc.data().estimasi) || 10) : 10;
  }

  const estimasiMasakTotal = produk.reduce((t, i) => t + (i.estimasi * i.jumlah), 0);
  const subtotalProduk = produk.reduce((t, i) => t + (i.harga * i.jumlah), 0);
  const totalOngkir = [...new Set(produk.map(p => p.idToko))].reduce((sum, idToko) => {
    const item = produk.find(p => p.idToko === idToko);
    return sum + (item?.ongkir || 0);
  }, 0);

  const tokoUtama = produk[0].idToko;
  const tokoDoc = await db.collection("toko").doc(tokoUtama).get();
  const lokasiToko = tokoDoc.exists ? tokoDoc.data().koordinat : null;
  if (!lokasiToko) return alert("❌ Lokasi toko belum tersedia.");

  const geoToLatLng = (geo) => geo.latitude ? { lat: geo.latitude, lng: geo.longitude } : geo;
  const hitungJarakKM = (a, b) => {
    a = geoToLatLng(a); b = geoToLatLng(b);
    if (!a || !b) return Infinity;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 100) / 100;
  };

  const jarakKM = hitungJarakKM(lokasiToko, lokasi);
  const estimasiKirim = metodePengiriman === "priority"
    ? jarakKM * 5 * 0.75
    : jarakKM * 5;

  const estimasiTotal = Math.round(estimasiMasakTotal + estimasiKirim);

  let potongan = 0;
  let kodeVoucher = null;
  const voucher = window.voucherTerpakai;
  if (voucher?.kode && voucher.potongan) {
    if (voucher.digunakanOleh?.includes(uid)) return alert("❌ Voucher sudah digunakan.");
    if (new Date() > voucher.expired?.toDate?.()) return alert("❌ Voucher expired.");
    if (voucher.kuota <= 0) return alert("❌ Kuota habis.");
    if (subtotalProduk < voucher.minimal) return alert(`❌ Minimal order Rp${voucher.minimal.toLocaleString()}`);
    kodeVoucher = voucher.kode;
    const dasar = voucher.tipePotongan === "ongkir" ? totalOngkir : subtotalProduk;
    potongan = voucher.tipe === "persen"
      ? Math.round(dasar * (parseFloat(voucher.potongan) / 100))
      : parseInt(voucher.potongan);
    if (potongan > dasar) potongan = dasar;
  }

  const biayaLayanan = Math.round((subtotalProduk + totalOngkir - potongan) * 0.01);
  const totalBayar = subtotalProduk + totalOngkir + biayaLayanan - potongan;
  if (totalBayar <= 0) return alert("❌ Total bayar tidak valid.");

  // ✅ Cek dan potong saldo jika metode saldo
  if (metodePembayaran === "saldo") {
    try {
      await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(uid);
        const userSnap = await tx.get(userRef);
        const saldo = userSnap.exists ? (userSnap.data().saldo || 0) : 0;
        if (saldo < totalBayar) throw new Error("Saldo tidak cukup.");

        const saldoBaru = saldo - totalBayar;
        tx.update(userRef, { saldo: saldoBaru });

        const logRef = db.collection("transaksi_saldo").doc();
        tx.set(logRef, {
          userId: uid,
          jenis: "pengurangan",
          jumlah: totalBayar,
          deskripsi: `Pembayaran pesanan`,
          waktu: firebase.firestore.FieldValue.serverTimestamp(),
          saldoSetelah: saldoBaru
        });
      });
    } catch (e) {
      return alert(`❌ ${e.message}`);
    }
  }

  const now = Date.now();
  const today = new Date();
  const random = Math.floor(Math.random() * 100000);
  const idPesanan = `ORD-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${random}`;
  const wa = noHp.startsWith("08") ? "628" + noHp.slice(2) : noHp;

  const dataPesanan = {
    id: idPesanan,
    userId: uid,
    nama,
    noHp: wa,
    alamat,
    lokasi,
    produk,
    catatan: catatanPesanan,
    metode: metodePembayaran,
    pengiriman: metodePengiriman,
    estimasiMasak: Math.round(estimasiMasakTotal),
    estimasiKirim: Math.round(estimasiKirim),
    estimasiTotal,
    status: "Pending",
    stepsLog: [`${new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} Pesanan dibuat (Pending)`],
    waktuPesan: now,
    subtotalProduk,
    totalOngkir,
    biayaLayanan,
    potongan,
    total: totalBayar,
    kodeVoucher,
    tipePotongan: voucher?.tipePotongan || null,
    sudahDiprosesPembayaran: metodePembayaran === "saldo" ? true : false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("pesanan").doc(idPesanan).set(dataPesanan);
  await db.collection("keranjang").doc(uid).delete();

  // ✅ Simpan ke pesanan_penjual per toko
  const produkPerToko = {};
  produk.forEach(item => {
    if (!produkPerToko[item.idToko]) produkPerToko[item.idToko] = [];
    produkPerToko[item.idToko].push(item);
  });

  for (const idToko in produkPerToko) {
    const produkToko = produkPerToko[idToko];
    const subtotalToko = produkToko.reduce((t, i) => t + (i.harga * i.jumlah), 0);
    const ongkirToko = produkToko[0].ongkir || 0;
    const estimasiMasakToko = produkToko.reduce((t, i) => t + (i.estimasi * i.jumlah), 0);
    const estimasiTotalToko = estimasiMasakToko + estimasiKirim;

    await db.collection("pesanan_penjual").doc(`${idPesanan}-${idToko}`).set({
      idPesanan,
      idToko,
      metode: metodePembayaran,
      namaPembeli: nama,
      noHpPembeli: wa,
      alamatPembeli: alamat,
      lokasiPembeli: lokasi,
      produk: produkToko.map(i => ({
        nama: i.nama,
        harga: i.harga,
        qty: i.jumlah,
        ongkir: i.ongkir || 0
      })),
      subtotalProduk: subtotalToko,
      totalOngkir: ongkirToko,
      biayaLayanan: 0,
      potongan: 0,
      total: subtotalToko + ongkirToko,
      catatan: catatanPesanan,
      pengiriman: metodePengiriman,
      status: "Pending",
      estimasiMasak: estimasiMasakToko,
      estimasiKirim: Math.round(estimasiKirim),
      estimasiTotal: estimasiTotalToko,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  if (voucher?.id) {
    await db.collection("voucher").doc(voucher.id).update({
      kuota: firebase.firestore.FieldValue.increment(-1),
      digunakanOleh: firebase.firestore.FieldValue.arrayUnion(uid)
    });
  }

  window.voucherTerpakai = null;
  if (document.getElementById("voucher")) document.getElementById("voucher").value = "";
  if (document.getElementById("voucher-feedback")) document.getElementById("voucher-feedback").innerText = "";

  alert("✅ Pesanan berhasil dibuat!");
  renderCheckoutItems();
  if (document.getElementById("riwayat-list")) renderRiwayat();
  loadContent(metodePembayaran);
}













// === Daftar Voucher ===
const voucherList = {
  "VLCRAVE": 0.10,
  "ONGKIR20": 0.20
};

let currentDiskon = 0;

async function cekVoucher() {
  const user = firebase.auth().currentUser;
  if (!user) {
    Swal.fire({
      icon: 'warning',
      title: 'Login Diperlukan',
      text: 'Silakan login untuk menggunakan voucher',
      confirmButtonText: 'Mengerti'
    });
    return;
  }

  try {
    const db = firebase.firestore();
    
    // Ambil semua voucher aktif dari toko
    const snapshot = await db.collection("voucher")
      .where("status", "==", "aktif")
      .where("expired", ">", new Date())
      .get();

    if (snapshot.empty) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Voucher',
        text: 'Tidak ada voucher aktif yang tersedia saat ini',
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    const vouchers = [];
    const uid = user.uid;
    const now = new Date();

    snapshot.forEach(doc => {
      const voucher = doc.data();
      const voucherId = doc.id;
      
      // Cek apakah voucher memenuhi syarat
      let canUse = true;
      let reason = "";

      if (voucher.digunakanOleh?.includes(uid)) {
        canUse = false;
        reason = "Sudah pernah digunakan";
      } else if (voucher.kuota <= 0) {
        canUse = false;
        reason = "Kuota habis";
      } else if (voucher.expired?.toDate?.() && now > voucher.expired.toDate()) {
        canUse = false;
        reason = "Sudah expired";
      } else if (voucher.minimumPembelian) {
        const subtotal = window.subtotalCheckout || 0;
        if (subtotal < voucher.minimumPembelian) {
          canUse = false;
          reason = `Min. pembelian Rp ${voucher.minimumPembelian.toLocaleString()}`;
        }
      }

      vouchers.push({
        id: voucherId,
        kode: voucher.kode,
        nama: voucher.nama || voucher.kode,
        potongan: voucher.potongan,
        tipe: voucher.tipe,
        tipePotongan: voucher.tipePotongan || "produk",
        minimumPembelian: voucher.minimumPembelian || 0,
        expired: voucher.expired?.toDate?.() || voucher.expired,
        kuota: voucher.kuota,
        canUse,
        reason
      });
    });

    // Tampilkan semua voucher dalam modal
    let voucherListHTML = `
      <div class="max-h-96 overflow-y-auto space-y-3">
        ${vouchers.map(voucher => `
          <div class="border rounded-lg p-4 ${voucher.canUse ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-bold text-gray-800">${voucher.kode}</h4>
                <p class="text-sm text-gray-600">${voucher.nama}</p>
              </div>
              <span class="px-2 py-1 text-xs rounded-full ${voucher.canUse ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                ${voucher.canUse ? 'Dapat Digunakan' : 'Tidak Dapat Digunakan'}
              </span>
            </div>
            
            <div class="text-sm mb-2">
              <span class="font-semibold text-green-600">
                ${voucher.tipe === 'persen' 
                  ? `Diskon ${voucher.potongan}%` 
                  : `Potongan Rp ${parseInt(voucher.potongan).toLocaleString()}`
                }
              </span>
              <span class="text-gray-500 ml-2">
                • ${voucher.tipePotongan === 'ongkir' ? 'Untuk ongkir' : 'Untuk produk'}
              </span>
            </div>
            
            ${voucher.minimumPembelian > 0 ? `
              <div class="text-xs text-gray-500 mb-1">
                Min. pembelian: Rp ${voucher.minimumPembelian.toLocaleString()}
              </div>
            ` : ''}
            
            <div class="text-xs text-gray-500">
              Berlaku hingga: ${voucher.expired.toLocaleDateString('id-ID')}
              ${!voucher.canUse && voucher.reason ? ` • ${voucher.reason}` : ''}
            </div>
            
            ${voucher.canUse ? `
              <button 
                onclick="pilihVoucher('${voucher.kode}')"
                class="w-full mt-3 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Gunakan Voucher
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    Swal.fire({
      title: 'Pilih Voucher',
      html: voucherListHTML,
      width: 600,
      showConfirmButton: false,
      showCloseButton: true
    });

  } catch (err) {
    console.error("Error mengambil voucher:", err);
    Swal.fire({
      icon: 'error',
      title: 'Terjadi Kesalahan',
      text: 'Gagal memuat daftar voucher',
      confirmButtonText: 'Mengerti'
    });
  }
}

// Fungsi untuk memilih voucher
async function pilihVoucher(kode) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("voucher")
      .where("kode", "==", kode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      Swal.fire({
        icon: 'error',
        title: 'Voucher Tidak Ditemukan',
        text: 'Voucher tidak tersedia',
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    const doc = snapshot.docs[0];
    const voucher = doc.data();
    const uid = user.uid;
    const now = new Date();

    // Validasi akhir sebelum menggunakan
    if (voucher.digunakanOleh?.includes(uid)) {
      Swal.fire({
        icon: 'warning',
        title: 'Voucher Sudah Digunakan',
        text: 'Anda sudah menggunakan voucher ini sebelumnya',
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    if (voucher.expired?.toDate?.() && now > voucher.expired.toDate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Voucher Expired',
        text: 'Voucher sudah tidak berlaku',
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    if (voucher.kuota <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Kuota Habis',
        text: 'Kuota voucher sudah habis',
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    // Cek minimum pembelian
    if (voucher.minimumPembelian) {
      const subtotal = window.subtotalCheckout || 0;
      if (subtotal < voucher.minimumPembelian) {
        Swal.fire({
          icon: 'warning',
          title: 'Minimum Pembelian',
          text: `Voucher ini membutuhkan minimum pembelian Rp ${voucher.minimumPembelian.toLocaleString()}`,
          confirmButtonText: 'Mengerti'
        });
        return;
      }
    }

    // Set voucher yang dipilih
    window.voucherTerpakai = {
      ...voucher,
      id: doc.id,
      tipePotongan: voucher.tipePotongan || "produk"
    };

    // Update input voucher
    const voucherInput = document.getElementById('voucher');
    if (voucherInput) voucherInput.value = kode;

    // Tampilkan feedback sukses
    const feedback = document.getElementById('voucher-feedback');
    if (feedback) {
      let info = "✅ Voucher aktif!";
      if (voucher.tipe === "persen") {
        info += ` Diskon ${voucher.potongan}% untuk ${voucher.tipePotongan === "ongkir" ? "ongkir" : "produk"}.`;
      } else {
        info += ` Potongan Rp${parseInt(voucher.potongan).toLocaleString()} untuk ${voucher.tipePotongan}.`;
      }
      feedback.textContent = info;
      feedback.className = 'text-sm text-green-600 mt-2';
    }

    Swal.close();
    renderCheckoutItems();

  } catch (err) {
    console.error("Error menggunakan voucher:", err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menggunakan Voucher',
      text: 'Terjadi kesalahan saat menggunakan voucher',
      confirmButtonText: 'Mengerti'
    });
  }
}

// Fungsi untuk menghapus voucher
function hapusVoucher() {
  window.voucherTerpakai = null;
  const voucherInput = document.getElementById('voucher');
  if (voucherInput) voucherInput.value = '';
  
  const feedback = document.getElementById('voucher-feedback');
  if (feedback) {
    feedback.textContent = '';
    feedback.className = 'text-sm mt-2';
  }
  
  renderCheckoutItems();
  
  Swal.fire({
    icon: 'success',
    title: 'Voucher Dihapus',
    text: 'Voucher berhasil dihapus dari pesanan',
    confirmButtonText: 'Mengerti',
    timer: 1500
  });
}



function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // dalam kilometer
}


// === Hitung Ongkir ===
function hitungOngkirDenganTipe(tipe, jarak = 0) {
  let ongkir = 8000;
  if (jarak > 2) ongkir += Math.ceil(jarak - 2) * 1500;
  if (tipe === "priority") ongkir += 3500;
  return ongkir;
}



// === Hitung ongkir dari pilihan radio
function hitungOngkir() {
  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  return hitungOngkirDenganTipe(metode);
}


// === Update Jumlah Produk di Keranjang ===
async function updateJumlah(namaProduk, change) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login dulu.");

  const db = firebase.firestore();
  const keranjangRef = db.collection("keranjang").doc(user.uid);

  try {
    const snap = await keranjangRef.get();
    let items = snap.exists ? snap.data().items || [] : [];

    const index = items.findIndex(item => item.nama === namaProduk);
    if (index === -1) return;

    items[index].jumlah += change;

    // Tambahkan log perubahan
    items[index].stepslog = items[index].stepslog || [];
    items[index].stepslog.push({
      waktu: new Date().toISOString(),
      pesan: `Jumlah diubah menjadi ${items[index].jumlah}`
    });

    if (items[index].jumlah <= 0) {
      items.splice(index, 1); // Hapus jika 0
    }

    await keranjangRef.set({ items }, { merge: true });

    if (typeof renderCheckoutItems === "function") renderCheckoutItems();
    if (typeof updateCartBadge === "function") updateCartBadge();
  } catch (error) {
    console.error("❌ Gagal update jumlah:", error.message);
  }
}


// === Render daftar item checkout dan update total ===
async function renderCheckoutItems() {
  const listEl = document.getElementById("cart-items-list");
  const totalEl = document.getElementById("total-checkout");
  const footerTotalEl = document.getElementById("footer-total");
  const footerDiskonEl = document.getElementById("footer-diskon");
  const elSubtotal = document.getElementById("rincian-subtotal");
  const elOngkir = document.getElementById("rincian-ongkir");
  const elDiskon = document.getElementById("rincian-diskon");
  const elLayanan = document.querySelector(".rincian-item.biaya-layanan span:last-child");

  const user = firebase.auth().currentUser;
  if (!user || !listEl || !totalEl) return;

  const db = firebase.firestore();
  const doc = await db.collection("keranjang").doc(user.uid).get();
  const cart = doc.exists ? (doc.data().items || []) : [];

  if (cart.length === 0) {
    listEl.innerHTML = "<p style='text-align:center;'>🛒 Keranjang kosong.</p>";
    ['standard', 'priority'].forEach(mode => {
      document.getElementById(`jarak-${mode}`).textContent = "Jarak: -";
      document.getElementById(`ongkir-${mode}`).textContent = "-";
      document.getElementById(`estimasi-${mode}`).textContent = "Estimasi: -";
    });
    footerTotalEl.textContent = "0";
    footerDiskonEl.textContent = "0";
    elSubtotal.textContent = "Rp 0";
    elOngkir.textContent = "Rp 0";
    elDiskon.textContent = "- Rp 0";
    if (elLayanan) elLayanan.textContent = "Rp 0";
    return;
  }

  // Ambil data toko berdasarkan idToko
  const tokoCache = {};
  const idTokoUnik = [...new Set(cart.map(i => i.idToko))];
  for (const idToko of idTokoUnik) {
    const tokoDoc = await db.collection("toko").doc(idToko).get();
    tokoCache[idToko] = tokoDoc.exists ? tokoDoc.data().namaToko || "Toko Tanpa Nama" : "Toko Tidak Diketahui";
  }

  // Kelompokkan item berdasarkan idToko
  const grupToko = {};
  cart.forEach(item => {
    const idToko = item.idToko;
    if (!grupToko[idToko]) grupToko[idToko] = [];
    grupToko[idToko].push(item);
  });

  listEl.innerHTML = "";
  let subtotal = 0;
  let totalOngkir = 0;

  for (const idToko in grupToko) {
    const namaToko = tokoCache[idToko] || "Toko Tidak Diketahui";
    listEl.innerHTML += `<li><strong>🛍️ ${namaToko}</strong></li>`;

    const firstItem = grupToko[idToko][0];
    totalOngkir += parseInt(firstItem.ongkir || 0);

    grupToko[idToko].forEach(item => {
      const hargaTotal = item.harga * item.jumlah;
      subtotal += hargaTotal;
      listEl.innerHTML += `
        <li style="display: flex; gap: 12px; margin-bottom: 10px;">
          <img src="${item.gambar}" style="width: 60px; height: 60px; object-fit: cover;">
          <div>
            <strong>${item.nama}</strong><br/>
            Jumlah:
            <button onclick="updateJumlahFirestore('${item.nama}', -1)">➖</button>
            ${item.jumlah}
            <button onclick="updateJumlahFirestore('${item.nama}', 1)">➕</button><br/>
            <small>Total: Rp ${hargaTotal.toLocaleString()}</small>
          </div>
        </li>`;
    });

    listEl.innerHTML += `<hr style="margin: 8px 0;">`;
  }

  // Hitung estimasi dan jarak
  const alamatDoc = await db.collection("alamat").doc(user.uid).get();
  const lokasi = alamatDoc.exists ? alamatDoc.data().lokasi : null;
  const tokoPertama = cart[0]?.idToko;

  let estimasiMasakTotal = 0;
  let estimasiStandard = 0;
  let estimasiPriority = 0;
  let jarakToko = 0;

  if (lokasi?.latitude && tokoPertama) {
    const tokoDoc = await db.collection("toko").doc(tokoPertama).get();
    if (tokoDoc.exists && tokoDoc.data().koordinat instanceof firebase.firestore.GeoPoint) {
      const tokoGeo = tokoDoc.data().koordinat;
      const jarak = getDistanceFromLatLonInKm(
        tokoGeo.latitude,
        tokoGeo.longitude,
        lokasi.latitude,
        lokasi.longitude
      );
      jarakToko = jarak;

      for (const item of cart) {
        const idProduk = item.idProduk || item.id;
        let estimasi = 5;
        if (idProduk) {
          const produkDoc = await db.collection("produk").doc(idProduk).get();
          if (produkDoc.exists) {
            estimasi = produkDoc.data().estimasi || 5;
          }
        }
        estimasiMasakTotal += estimasi * item.jumlah;
      }

      const waktuKirimStandard = jarak * 5;
      const waktuKirimPriority = jarak * 3;

      estimasiStandard = Math.round(estimasiMasakTotal + waktuKirimStandard);
      estimasiPriority = Math.round((estimasiMasakTotal * 0.75) + waktuKirimPriority);

      await db.collection("keranjang").doc(user.uid).update({
        estimasiMenit: estimasiStandard
      });
    }
  }

  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || 'standard';
  let ongkir = totalOngkir;
  if (metode === 'priority') ongkir += 3500;

  // Voucher / Diskon
  let potongan = 0;
  const voucher = window.voucherTerpakai;
  const nowTime = new Date();

  if (voucher?.kode && voucher.potongan) {
    const isValid =
      (!voucher.digunakanOleh || !voucher.digunakanOleh.includes(user.uid)) &&
      (!voucher.expired?.toDate || nowTime <= voucher.expired.toDate()) &&
      (voucher.kuota > 0) &&
      (subtotal >= voucher.minimal);

    if (isValid) {
      const tipePotongan = voucher.tipePotongan || "produk";
      const dasarPotongan = tipePotongan === "ongkir" ? ongkir : subtotal;

      if (voucher.tipe === "persen") {
        potongan = Math.round(dasarPotongan * (parseFloat(voucher.potongan) / 100));
      } else {
        potongan = parseInt(voucher.potongan);
      }

      if (potongan > dasarPotongan) potongan = dasarPotongan;
    }
  }

  const biayaLayanan = Math.round((subtotal + ongkir - potongan) * 0.01);
  const totalBayar = subtotal + ongkir - potongan + biayaLayanan;

  // Update UI
  ['standard', 'priority'].forEach(mode => {
    const est = mode === 'standard' ? estimasiStandard : estimasiPriority;
    const ongkirX = totalOngkir + (mode === 'priority' ? 3500 : 0);
    document.getElementById(`jarak-${mode}`).textContent = `Jarak: ${jarakToko.toFixed(2)} km`;
    document.getElementById(`ongkir-${mode}`).textContent = `Rp ${ongkirX.toLocaleString()}`;
    document.getElementById(`estimasi-${mode}`).textContent = `Estimasi: ±${est} menit`;
  });

  totalEl.innerHTML = `<p><strong>Subtotal:</strong> Rp ${subtotal.toLocaleString()}</p>`;
  elSubtotal.textContent = `Rp ${subtotal.toLocaleString()}`;
  elOngkir.textContent = `Rp ${ongkir.toLocaleString()}`;
  elDiskon.textContent = `- Rp ${potongan.toLocaleString()} (${voucher?.tipePotongan === "ongkir" ? "Ongkir" : "Produk"})`;
  footerTotalEl.textContent = totalBayar.toLocaleString();
  footerDiskonEl.textContent = potongan.toLocaleString();
  if (elLayanan) elLayanan.textContent = `Rp ${biayaLayanan.toLocaleString()}`;

  if (cart.length > 8 || ongkir > 20000) {
    const notifBox = document.createElement('div');
    notifBox.className = "checkout-note";
    notifBox.style = "color:#d9534f; padding: 6px 12px;";
    notifBox.innerHTML = "⚠️ Pesanan mungkin akan telat karena antrian sedang tinggi di toko.";
    totalEl.appendChild(notifBox);
  }
}



async function updateJumlahFirestore(namaProduk, change) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const db = firebase.firestore();
  const ref = db.collection("keranjang").doc(user.uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const items = doc.data().items || [];
  const index = items.findIndex(i => i.nama === namaProduk);
  if (index === -1) return;

  items[index].jumlah += change;
  if (items[index].jumlah <= 0) items.splice(index, 1);

  await ref.set({ items }, { merge: true });
  renderCheckoutItems();
  updateCartBadge?.();
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cekSaldoUser() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const db = firebase.firestore();
  db.collection("users").doc(user.uid).get().then(doc => {
    if (doc.exists) {
      const saldo = doc.data().saldo || 0;
      window.userSaldo = saldo; // Simpan global

      const select = document.getElementById("metode-pembayaran");
      if (select) {
        // Cari opsi saldo, jika belum ada, tambahkan
        let optionSaldo = select.querySelector("option[value='saldo']");
        if (!optionSaldo) {
          optionSaldo = document.createElement("option");
          optionSaldo.value = "saldo";
          select.appendChild(optionSaldo);
        }

        // Perbarui teks opsi saldo dengan jumlah saldo
        optionSaldo.textContent = `Saldo (Rp ${saldo.toLocaleString()})`;
      }
    } else {
      console.warn("❌ Data user tidak ditemukan.");
    }
  }).catch(err => {
    console.error("❌ Gagal mengambil saldo:", err);
  });
}


async function renderAlamatCheckout() {
  const alamatBox = document.getElementById('alamat-terpilih');
  const user = firebase.auth().currentUser;

  if (!user) {
    alamatBox.innerHTML = `<p>🔒 Harap login terlebih dahulu untuk melihat alamat.</p>`;
    return;
  }

  try {
    const db = firebase.firestore();
    const docRef = db.collection("alamat").doc(user.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      alamatBox.innerHTML = `<p>⚠️ Alamat belum diisi. Silakan lengkapi di menu Alamat.</p>`;
      return;
    }

    const data = doc.data();
    const nama = data.nama || '-';
    const phone = data.noHp || '-';
    const alamat = data.alamat || 'Alamat belum diisi';
    const note = data.catatan || '-';
    const lokasi = data.lokasi;

    let lokasiLink = '';
    if (lokasi && lokasi.lat && lokasi.lng) {
      lokasiLink = `<br/><a href="https://www.google.com/maps?q=${lokasi.lat},${lokasi.lng}" target="_blank">📍 Lihat Lokasi di Google Maps</a>`;
    }

    // Simpan global jika diperlukan untuk hitung jarak
    window.customerLocation = lokasi;

    alamatBox.innerHTML = `
      <p>👤 ${nama}<br/>📱 ${phone}<br/>🏠 ${alamat}</p>
      <p class="checkout-note">📦 Catatan: ${note}</p>
      ${lokasiLink}
    `;
  } catch (error) {
    console.error("❌ Gagal mengambil alamat:", error);
    alamatBox.innerHTML = `<p style="color:red;">❌ Gagal memuat alamat pengguna.</p>`;
  }
}


function cekTokoBuka(jamSekarang, buka, tutup) {
  if (buka === tutup) return true; // anggap buka 24 jam
  if (buka < tutup) return jamSekarang >= buka && jamSekarang < tutup;
  return jamSekarang >= buka || jamSekarang < tutup; // buka malam - tutup pagi
}

async function renderProductList() {
  const produkContainer = document.getElementById('produk-container');
  if (!produkContainer) return;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  if (!user) {
    produkContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div class="text-center max-w-md">
          <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-100">
            <i class="fas fa-exclamation-triangle text-orange-500 text-2xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">Akses Dibatasi</h2>
          <p class="text-gray-600 mb-6">Silakan login untuk menjelajahi menu makanan kami</p>
          <button onclick="loadContent('alamat')" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg">
            Login Sekarang
          </button>
        </div>
      </div>
    `;
    return;
  }

  produkContainer.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Enhanced Loading Skeleton -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Header Skeleton -->
        <div class="mb-8">
          <div class="h-8 bg-gray-300 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div class="h-4 bg-gray-300 rounded w-48 animate-pulse"></div>
        </div>

        <!-- Category Skeletons -->
        <div class="mb-8">
          <div class="flex space-x-4 overflow-hidden pb-4">
            ${Array.from({length: 6}, () => `
              <div class="flex-shrink-0 w-28">
                <div class="bg-gray-300 rounded-2xl p-4 h-32 animate-pulse">
                  <div class="w-12 h-12 bg-gray-400 rounded-xl mx-auto mb-3"></div>
                  <div class="h-3 bg-gray-400 rounded w-16 mx-auto"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Product Skeletons -->
        <div class="space-y-4">
          ${Array.from({length: 4}, () => `
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div class="flex space-x-4">
                <div class="w-24 h-24 bg-gray-300 rounded-xl flex-shrink-0"></div>
                <div class="flex-1 space-y-3">
                  <div class="h-5 bg-gray-300 rounded w-3/4"></div>
                  <div class="h-4 bg-gray-300 rounded w-1/2"></div>
                  <div class="flex space-x-4">
                    <div class="h-4 bg-gray-300 rounded w-16"></div>
                    <div class="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                  <div class="flex justify-between items-center">
                    <div class="h-6 bg-gray-300 rounded w-20"></div>
                    <div class="h-10 bg-gray-300 rounded-xl w-20"></div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  try {
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      produkContainer.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
          <div class="text-center max-w-md">
            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-100">
              <i class="fas fa-map-marker-alt text-blue-500 text-2xl"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-3">Atur Lokasi Pengiriman</h2>
            <p class="text-gray-600 mb-6">Tambahkan lokasi Anda untuk menemukan restoran terdekat</p>
            <div class="space-y-3">
              <button onclick="loadContent('alamat')" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg">
                Tambah Lokasi
              </button>
              <button onclick="renderProductList()" class="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-xl transition-all duration-300 border border-gray-300">
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const lokasiUser = alamatDoc.data().lokasi;
    const lat1 = lokasiUser.latitude;
    const lon1 = lokasiUser.longitude;

    const waktu = new Date().getHours();
    const waktuMenu = waktu < 11 ? 'Sarapan' : (waktu < 17 ? 'Makan Siang' : 'Makan Malam');
    const waktuIcon = waktu < 11 ? 'fas fa-sun' : (waktu < 17 ? 'fas fa-cloud-sun' : 'fas fa-moon');

    const kategoriUnggulan = [
      { label: "Menu Hemat", value: "Hemat", image: "./img/kategori/hemat.png", icon: "fas fa-piggy-bank", color: "from-green-500 to-emerald-600", bgColor: "bg-gradient-to-r from-green-500 to-emerald-600" },
      { label: "Menu Sehat", value: "Sehat", image: "./img/kategori/sehat.png", icon: "fas fa-heart-pulse", color: "from-blue-500 to-cyan-600", bgColor: "bg-gradient-to-r from-blue-500 to-cyan-600" },
      { label: "Promo Spesial", value: "Promo", image: "./img/kategori/promo.png", icon: "fas fa-badge-percent", color: "from-red-500 to-pink-600", bgColor: "bg-gradient-to-r from-red-500 to-pink-600" },
      { label: "Terdekat", value: "Terdekat", image: "./img/kategori/terdekat.png", icon: "fas fa-location-dot", color: "from-orange-500 to-yellow-600", bgColor: "bg-gradient-to-r from-orange-500 to-yellow-600" },
      { label: "Terlaris", value: "bestseller", image: "./img/kategori/bestseller.png", icon: "fas fa-crown", color: "from-purple-500 to-indigo-600", bgColor: "bg-gradient-to-r from-purple-500 to-indigo-600" },
      { label: "Cepat Saji", value: "Cepat", image: "./img/kategori/cepat.png", icon: "fas fa-bolt", color: "from-teal-500 to-green-600", bgColor: "bg-gradient-to-r from-teal-500 to-green-600" }
    ];

    const kategoriKuliner = [
      { label: "Martabak", value: "Martabak", image: "./img/kategori/martabak.png", icon: "fas fa-pizza-slice", color: "text-orange-500" },
      { label: "Bakso", value: "Bakso", image: "./img/kategori/bakso.png", icon: "fas fa-utensils", color: "text-red-500" },
      { label: "Roti", value: "Roti", image: "./img/kategori/roti.png", icon: "fas fa-bread-slice", color: "text-yellow-600" },
      { label: "Minuman", value: "Minuman", image: "./img/kategori/minuman.png", icon: "fas fa-mug-hot", color: "text-blue-500" },
      { label: "Kue", value: "Kue", image: "./img/kategori/kue.png", icon: "fas fa-cake-candles", color: "text-pink-500" },
      { label: "Jajanan", value: "Jajanan", image: "./img/kategori/jajanan.png", icon: "fas fa-cookie", color: "text-amber-600" },
      { label: "Sate", value: "Sate", image: "./img/kategori/sate.png", icon: "fas fa-drumstick-bite", color: "text-orange-600" },
      { label: "Aneka Nasi", value: "Nasi", image: "./img/kategori/nasi.png", icon: "fas fa-bowl-food", color: "text-emerald-600" }
    ];

    produkContainer.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Enhanced Header with Location -->
        <div class="bg-white shadow-sm border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="py-4">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Selamat ${waktu < 12 ? 'Pagi' : waktu < 18 ? 'Siang' : 'Malam'}!</h1>
                  <p class="text-gray-600 mt-1 flex items-center">
                    <i class="fas fa-map-marker-alt text-red-500 mr-2"></i>
                    <span class="truncate max-w-xs">Delivery ke lokasi Anda</span>
                  </p>
                </div>
                <div class="relative">
                  <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <i class="fas fa-user text-white text-sm"></i>
                  </div>
                </div>
              </div>
              
              <!-- Search Bar -->
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-search text-gray-400"></i>
                </div>
                <input 
                  type="text" 
                  placeholder="Cari makanan atau restoran..." 
                  class="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-300"
                  id="search-input"
                >
              </div>
            </div>
          </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <!-- Promo Banner -->
          <div class="mb-8">
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-bold mb-2">Gratis Ongkir!</h3>
                  <p class="text-blue-100">Min. pembelian Rp 25.000 • Berlaku hari ini</p>
                </div>
                <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <i class="fas fa-gift text-2xl"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Kategori Unggulan -->
          <section class="mb-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900">Kategori Unggulan</h2>
              <button class="text-sm text-blue-500 font-semibold hover:text-blue-600 transition-colors flex items-center">
                Lihat Semua <i class="fas fa-chevron-right ml-1 text-xs"></i>
              </button>
            </div>
            <div id="kategori-filter-container" class="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2"></div>
          </section>

          <!-- Kategori Kuliner -->
          <section class="mb-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900">Jelajahi Kategori</h2>
              <button class="text-sm text-blue-500 font-semibold hover:text-blue-600 transition-colors flex items-center">
                Semua <i class="fas fa-chevron-right ml-1 text-xs"></i>
              </button>
            </div>
            <div id="kategori-kuliner-container" class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3"></div>
          </section>

          <!-- Menu Rekomendasi Waktu -->
          <section>
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i class="${waktuIcon} text-white text-sm"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-gray-900">Rekomendasi ${waktuMenu}</h2>
                  <p class="text-sm text-gray-600">Menu spesial untuk ${waktuMenu.toLowerCase()} Anda</p>
                </div>
              </div>
              <span class="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${produkUrut.length} items</span>
            </div>
            <div id="produk-list-wrapper" class="space-y-4"></div>
          </section>
        </div>
      </div>
    `;

    // ... (rest of your existing logic for fetching products and stores remains the same)

    function renderKategoriCards() {
      const filterContainer = document.getElementById('kategori-filter-container');
      const kulinerContainer = document.getElementById('kategori-kuliner-container');

      // Enhanced Kategori Unggulan
      filterContainer.innerHTML = kategoriUnggulan.map(k => `
        <div class="kategori-card-unggulan flex-shrink-0 w-28 cursor-pointer group" data-kategori="${k.value}">
          <div class="bg-gradient-to-r ${k.color} rounded-2xl p-4 text-white shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl h-32 flex flex-col items-center justify-center">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm transform group-hover:scale-110 transition-transform duration-300">
              <i class="${k.icon} text-lg"></i>
            </div>
            <span class="text-xs font-semibold text-center block">${k.label}</span>
          </div>
        </div>
      `).join("");

      // Enhanced Kategori Kuliner
      kulinerContainer.innerHTML = kategoriKuliner.map(k => `
        <div class="kategori-card-kuliner cursor-pointer group" data-kategori="${k.value}">
          <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-200 transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:border-blue-200 text-center h-24 flex flex-col items-center justify-center">
            <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-50 transition-colors duration-300">
              <i class="${k.icon} ${k.color} text-base"></i>
            </div>
            <span class="text-xs font-medium text-gray-700 block truncate group-hover:text-blue-600 transition-colors duration-300">${k.label}</span>
          </div>
        </div>
      `).join("");

      // ... (rest of your existing event handlers remain the same)
    }

    // Enhanced product display function
    window.tampilkanProdukFilter = function (kategori = "all", containerId = "produk-list-wrapper") {
      const wrapper = document.getElementById(containerId);
      
      // ... (your existing filtering logic remains the same)

      wrapper.innerHTML = produkFilter.map(p => {
        const tokoAktif = p.isOpen;
        const stokHabis = (p.stok || 0) <= 0;
        const luarJangkauan = p.diLuarJangkauan;
        const disabledAttr = (!tokoAktif || stokHabis || luarJangkauan) ? 'disabled' : '';
        
        let btnText = 'Pesan';
        let btnClass = 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg';
        
        if (!tokoAktif) {
          btnText = 'Toko Tutup';
          btnClass = 'bg-gray-300 text-gray-500 cursor-not-allowed';
        } else if (stokHabis) {
          btnText = 'Stok Habis';
          btnClass = 'bg-gray-300 text-gray-500 cursor-not-allowed';
        } else if (luarJangkauan) {
          btnText = 'Diluar Jangkauan';
          btnClass = 'bg-gray-300 text-gray-500 cursor-not-allowed';
        }

        const hargaAsli = Number(p.hargaAwal || p.harga || 0);
        const hargaDiskon = Number(p.hargaDiskon || p.harga || 0);
        const showDiskon = hargaDiskon < hargaAsli && hargaAsli > 0;
        const persenDiskon = showDiskon ? Math.round(((hargaAsli - hargaDiskon) / hargaAsli) * 100) : 0;

        return `
          <div class="produk-card bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-200 group">
            <!-- Enhanced Store Header -->
            <div class="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:from-blue-50 hover:to-white transition-all duration-300" onclick="renderTokoPage('${p.idToko}')">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <i class="fas fa-store text-white text-xs"></i>
                  </div>
                  <div>
                    <span class="text-sm font-semibold text-gray-900">${p.tokoNama}</span>
                    <div class="flex items-center space-x-2 mt-1">
                      <span class="text-xs ${tokoAktif ? 'text-green-600 bg-green-50 px-2 py-1 rounded-full' : 'text-red-600 bg-red-50 px-2 py-1 rounded-full'}">
                        <i class="fas fa-circle text-xs mr-1"></i>
                        ${tokoAktif ? 'Buka' : 'Tutup'}
                      </span>
                      <span class="text-xs text-gray-500">• ${p.jarak}</span>
                    </div>
                  </div>
                </div>
                <i class="fas fa-chevron-right text-gray-400 group-hover:text-blue-500 transition-colors duration-300"></i>
              </div>
            </div>

            <!-- Enhanced Product Body -->
            <div class="p-5">
              <div class="flex space-x-4">
                <!-- Enhanced Product Image -->
                <div class="relative flex-shrink-0">
                  <div class="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-300">
                    <img src="${p.urlGambar}" alt="${p.namaProduk}" 
                         class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                         onerror="this.src='./img/toko-pict.png'" />
                  </div>
                  ${showDiskon ? `
                    <div class="absolute -top-2 -left-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                      -${persenDiskon}%
                    </div>
                  ` : ""}
                  ${p.iklan ? `
                    <div class="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-yellow-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                      <i class="fas fa-bullhorn mr-1"></i>Promo
                    </div>
                  ` : ""}
                </div>

                <!-- Enhanced Product Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">${p.namaProduk}</h3>
                  
                  <!-- Enhanced Rating & Info -->
                  <div class="flex items-center space-x-4 mb-3">
                    <div class="flex items-center space-x-1 text-sm text-gray-600 bg-yellow-50 px-2 py-1 rounded-full">
                      <i class="fas fa-star text-yellow-400"></i>
                      <span class="font-semibold">${p.ratingValue}</span>
                      <span class="text-gray-400">(${p.reviewCount})</span>
                    </div>
                    <div class="flex items-center space-x-1 text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded-full">
                      <i class="fas fa-clock text-blue-500"></i>
                      <span>${p.estimasi || '15'}mnt</span>
                    </div>
                  </div>

                  <!-- Enhanced Price & Action -->
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col">
                      ${showDiskon ? `
                        <div class="flex items-center space-x-2">
                          <span class="text-xl font-bold text-red-600">Rp ${hargaDiskon.toLocaleString("id-ID")}</span>
                          <span class="text-sm text-gray-500 line-through">Rp ${hargaAsli.toLocaleString("id-ID")}</span>
                        </div>
                        <span class="text-xs text-green-600 font-semibold mt-1">Hemat Rp ${(hargaAsli - hargaDiskon).toLocaleString("id-ID")}</span>
                      ` : `
                        <span class="text-xl font-bold text-gray-900">Rp ${hargaAsli.toLocaleString("id-ID")}</span>
                      `}
                    </div>
                    <button 
                      class="beli-btn px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${btnClass} disabled:transform-none disabled:hover:scale-100" 
                      ${disabledAttr}
                      onclick="${luarJangkauan ? `showNotification('Layanan belum tersedia di lokasi Anda', 'error')` : `tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})`}"
                    >
                      <span class="flex items-center space-x-2">
                        <i class="fas fa-shopping-cart"></i>
                        <span>${btnText}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderKategoriCards();
    window.tampilkanProdukFilter("all", "produk-list-wrapper");

    // Add search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = produkUrut.filter(p => 
          p.namaProduk.toLowerCase().includes(searchTerm) ||
          p.tokoNama.toLowerCase().includes(searchTerm) ||
          (p.kategori && p.kategori.toLowerCase().includes(searchTerm))
        );
        
        if (searchTerm) {
          window.tampilkanProdukFilter.call({ 
            produkUrut: filteredProducts,
            produkIklan: produkIklan.filter(p => 
              p.namaProduk.toLowerCase().includes(searchTerm) ||
              p.tokoNama.toLowerCase().includes(searchTerm)
            )
          }, "all", "produk-list-wrapper");
        } else {
          window.tampilkanProdukFilter("all", "produk-list-wrapper");
        }
      });
    }

  } catch (error) {
    console.error("Error loading products:", error);
    produkContainer.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div class="text-center max-w-md">
          <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-gray-100">
            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">Gagal Memuat</h2>
          <p class="text-gray-600 mb-6">Terjadi kesalahan saat memuat daftar produk</p>
          <div class="space-y-3">
            <button onclick="renderProductList()" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg">
              Coba Lagi
            </button>
            <button onclick="loadContent('home')" class="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-xl transition-all duration-300 border border-gray-300">
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Add CSS for enhanced styling
const enhancedStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .transform-gpu {
    transform: translateZ(0);
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in {
    animation: fadeIn 0.5s ease-out;
  }
`;

if (!document.querySelector('style[data-enhanced-delivery]')) {
  const style = document.createElement('style');
  style.setAttribute('data-enhanced-delivery', '');
  style.textContent = enhancedStyles;
  document.head.appendChild(style);

}

function renderIklanSlider(produkIklanList) {
  if (!produkIklanList || produkIklanList.length === 0) return;

  if (!document.getElementById("iklan-slider-style")) {
    const style = document.createElement("style");
    style.id = "iklan-slider-style";
    style.textContent = `
      .iklan-produk-container {
        margin: 20px auto;
        max-width: 100%;
        padding: 0 10px;
      }

      .section-titlee {
        font-size: 1.2rem;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #ff6f00;
      }

      .iklan-produk-slider {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        gap: 12px;
        padding-bottom: 10px;
        -webkit-overflow-scrolling: touch;
      }

      .produk-horizontal-iklan {
        background: linear-gradient(135deg, #fff3e0, #ffe0b2);
        border: 2px solid #ff9800;
        border-radius: 14px;
        min-width: 80%;
        max-width: 80%;
        scroll-snap-align: start;
        color: #333;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: transform 0.2s ease;
        flex-shrink: 0;
        position: relative;
      }

      @media (min-width: 480px) {
        .produk-horizontal-iklan {
          min-width: 240px;
          max-width: 240px;
        }
      }

      .produk-horizontal-iklan:hover {
        transform: scale(1.03);
      }

      .produk-toko-bar-iklan {
        background: rgba(255, 111, 0, 0.1);
        padding: 6px 10px;
        border-top-left-radius: 14px;
        border-top-right-radius: 14px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #d35400;
      }

      .produk-img-iklan {
        width: 100%;
        height: 140px;
        object-fit: cover;
        border-bottom: 1px solid rgba(0,0,0,0.05);
      }

      .produk-info-iklan {
        padding: 10px;
        background: rgba(255, 255, 255, 0.95);
        border-bottom-left-radius: 14px;
        border-bottom-right-radius: 14px;
      }

      .produk-namaa {
        font-weight: bold;
        font-size: 1rem;
        margin-bottom: 4px;
        color: #e65c00;
      }

      .produk-metaa {
        font-size: 0.8rem;
        color: #666;
        margin-bottom: 8px;
      }

      .produk-harga-diskon {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 4px;
      }

      .harga-awal {
        font-size: 0.85rem;
        color: #999;
        text-decoration: line-through;
      }

      .harga-diskon {
        font-size: 1rem;
        color: #e53935;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .badge-diskon-persentase {
        background: #e53935;
        color: white;
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 6px;
        font-weight: bold;
      }

      .produk-action-iklan {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .beli-btn.disabled {
        background: #ffd180;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 4px 10px;
        cursor: not-allowed;
        font-size: 0.85rem;
      }
    `;
    document.head.appendChild(style);
  }

  const kategoriDisplay = produkIklanList[0]?.iklanKategori || "Rekomendasi";
  const kategoriNama = kategoriDisplay.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());

  const sliderHTML = `
    <div class="iklan-produk-container">
      <h2 class="section-titlee"><i class="fa-solid fa-bullhorn"></i> ${kategoriNama}</h2>
      <div class="iklan-produk-slider" id="iklan-slider-auto">
        ${produkIklanList.map(p => {
          const hargaAsli = Number(p.hargaAwal || p.harga || 0);
          const hargaDiskon = Number(p.hargaDiskon || p.harga || 0);
          const showDiskon = hargaDiskon < hargaAsli && hargaAsli > 0;
          const persenDiskon = showDiskon
            ? Math.round(((hargaAsli - hargaDiskon) / hargaAsli) * 100)
            : 0;

          return `
            <div class="produk-horizontal produk-horizontal-iklan" onclick="tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})">
              <div class="produk-toko-bar produk-toko-bar-iklan">
                <span><i class="fa-solid fa-shop"></i> ${p.tokoNama || '-'}</span>
                <span>›</span>
              </div>
              <img src="${p.urlGambar}" alt="${p.namaProduk}" class="produk-img produk-img-iklan" />
              <div class="produk-info produk-info-iklan">
                <p class="produk-namaa">${p.namaProduk}</p>
                <p class="produk-metaa">${p.ratingDisplay} | ${p.jarak || '-'} | ${p.estimasi || '-'} Menit</p>
                <div class="produk-harga-diskon">
                  ${showDiskon
                    ? `<span class="harga-awal">Rp ${hargaAsli.toLocaleString("id-ID")}</span>
                       <span class="harga-diskon">Rp ${hargaDiskon.toLocaleString("id-ID")}
                         <span class="badge-diskon-persentase">-${persenDiskon}%</span>
                       </span>`
                    : `<strong>Rp ${hargaAsli.toLocaleString("id-ID")}</strong>`}
                </div>
                <div class="produk-action produk-action-iklan">
                  <span class="beli-btn disabled">Iklan</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  const produkContainer = document.getElementById("produk-container");
  if (!produkContainer) return;

  const temp = document.createElement("div");
  temp.innerHTML = sliderHTML;
  produkContainer.prepend(temp.firstElementChild);

  autoSlidePerItem("iklan-slider-auto");
}

function autoSlidePerItem(containerId) {
  const slider = document.getElementById(containerId);
  if (!slider) return;

  const items = slider.querySelectorAll(".produk-horizontal-iklan");
  let index = 0;
  let userInteracted = false;
  let autoSlidePausedUntil = 0;

  slider.addEventListener("scroll", () => {
    userInteracted = true;
    autoSlidePausedUntil = Date.now() + 5000; // Jeda 5 detik
  });

  setInterval(() => {
    if (!items.length) return;
    if (Date.now() < autoSlidePausedUntil) return;

    index = (index + 1) % items.length;
    items[index].scrollIntoView({ behavior: "smooth", inline: "start" });
  }, 3500);
}

function initAutoScrollSlider() {
  const slider = document.querySelector(".iklan-produk-slider");
  if (!slider) return;

  let scrollSpeed = 1; // px per frame
  let intervalId;

  function startScroll() {
    intervalId = setInterval(() => {
      slider.scrollLeft += scrollSpeed;
      if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth) {
        slider.scrollLeft = 0;
      }
    }, 16); // ~60fps
  }

  function stopScroll() {
    clearInterval(intervalId);
  }

  startScroll();
  slider.addEventListener("mouseenter", stopScroll);
  slider.addEventListener("mouseleave", startScroll);
}

// Fungsi utama yang sudah diperbaiki
// Add responsive CSS styles
const responsiveStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  /* Mobile-first responsive design */
  @media (max-width: 640px) {
    .mobile-padding {
      padding-left: 1rem;
      padding-right: 1rem;
    }
    .mobile-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .mobile-text-sm {
      font-size: 0.875rem;
    }
    .mobile-text-xs {
      font-size: 0.75rem;
    }
  }
`;

if (!document.querySelector('style[data-responsive-delivery]')) {
  const style = document.createElement('style');
  style.setAttribute('data-responsive-delivery', '');
  style.textContent = responsiveStyles;
  document.head.appendChild(style);
}

// Enhanced Iklan Slider with responsive design and auto-slide
function renderIklanSlider(produkIklanList) {
  if (!produkIklanList || !Array.isArray(produkIklanList) || produkIklanList.length === 0) {
    console.log('Tidak ada produk iklan untuk ditampilkan');
    return;
  }

  // Create enhanced slider HTML
  const sliderHTML = `
    <section class="iklan-produk-container mb-8 fade-in" aria-label="Rekomendasi produk spesial">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900 flex items-center">
          <div class="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-2">
            <i class="fas fa-bullhorn text-white text-sm"></i>
          </div>
          Rekomendasi Spesial
        </h2>
        <button class="text-sm text-blue-500 font-semibold hover:text-blue-600 transition-colors flex items-center group">
          Lihat Semua 
          <i class="fas fa-chevron-right ml-1 text-xs group-hover:translate-x-0.5 transition-transform duration-300"></i>
        </button>
      </div>
      
      <div class="relative">
        <!-- Slider Container -->
        <div class="iklan-produk-slider flex space-x-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 snap-x snap-mandatory" 
             id="iklan-slider-auto"
             aria-live="polite">
          ${produkIklanList.map((p, index) => {
            const hargaAsli = Number(p.hargaAwal || p.harga || 0);
            const hargaDiskon = Number(p.hargaDiskon || p.harga || 0);
            const showDiskon = hargaDiskon < hargaAsli && hargaAsli > 0;
            const persenDiskon = showDiskon ? Math.round(((hargaAsli - hargaDiskon) / hargaAsli) * 100) : 0;
            const tokoAktif = p.isOpen !== false;
            const stokHabis = (p.stok || 0) <= 0;

            return `
              <div class="produk-iklan-card flex-shrink-0 w-64 sm:w-72 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg group relative snap-start"
                   onclick="tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                   role="button"
                   tabindex="0"
                   aria-label="${p.namaProduk} dari ${p.tokoNama}, harga ${showDiskon ? hargaDiskon.toLocaleString("id-ID") : hargaAsli.toLocaleString("id-ID")} rupiah"
                   onkeypress="if(event.key === 'Enter') tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                
                <!-- Badge Iklan -->
                <div class="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg z-10 flex items-center space-x-1">
                  <i class="fas fa-star text-xs"></i>
                  <span>Promo</span>
                </div>
                
                <!-- Status Badge -->
                ${!tokoAktif ? `
                  <div class="absolute top-3 right-3 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg z-10">
                    <i class="fas fa-store-slash mr-1"></i>Tutup
                  </div>
                ` : stokHabis ? `
                  <div class="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg z-10">
                    <i class="fas fa-box mr-1"></i>Habis
                  </div>
                ` : ''}
                
                <!-- Store Info -->
                <div class="px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-orange-100">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0 flex-1">
                      <div class="w-6 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-store text-white text-xs"></i>
                      </div>
                      <span class="text-sm font-semibold text-gray-900 truncate">${p.tokoNama || 'Toko'}</span>
                    </div>
                    <i class="fas fa-chevron-right text-orange-400 text-xs group-hover:text-orange-600 transition-colors flex-shrink-0 ml-2"></i>
                  </div>
                </div>

                <!-- Product Image -->
                <div class="relative h-32 sm:h-36 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <img src="${p.urlGambar || './img/toko-pict.png'}" 
                       alt="${p.namaProduk || 'Produk'}" 
                       class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                       onerror="this.src='./img/toko-pict.png'"
                       loading="lazy" />
                  
                  ${showDiskon ? `
                    <div class="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                      -${persenDiskon}%
                    </div>
                  ` : ""}
                </div>

                <!-- Product Info -->
                <div class="p-4">
                  <h3 class="font-bold text-gray-900 text-sm sm:text-base mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors duration-300 min-h-[3rem]">
                    ${p.namaProduk || 'Nama Produk'}
                  </h3>
                  
                  <!-- Rating & Info -->
                  <div class="flex items-center space-x-3 mb-3 flex-wrap gap-2">
                    <div class="flex items-center space-x-1 text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded-full">
                      <i class="fas fa-star text-yellow-400"></i>
                      <span class="font-semibold">${p.ratingValue || '4.5'}</span>
                      <span class="text-gray-400">(${p.reviewCount || '0'})</span>
                    </div>
                    <div class="flex items-center space-x-1 text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded-full">
                      <i class="fas fa-location-dot text-blue-500"></i>
                      <span>${p.jarak || '1.2 km'}</span>
                    </div>
                    <div class="flex items-center space-x-1 text-xs text-gray-600 bg-green-50 px-2 py-1 rounded-full">
                      <i class="fas fa-clock text-green-500"></i>
                      <span>${p.estimasi || '15'}mnt</span>
                    </div>
                  </div>

                  <!-- Price & CTA -->
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col min-w-0 flex-1">
                      ${showDiskon ? `
                        <div class="flex items-center space-x-2">
                          <span class="text-lg font-bold text-red-600 truncate">Rp ${hargaDiskon.toLocaleString("id-ID")}</span>
                          <span class="text-sm text-gray-500 line-through flex-shrink-0">Rp ${hargaAsli.toLocaleString("id-ID")}</span>
                        </div>
                        <span class="text-xs text-green-600 font-semibold mt-1 truncate">
                          Hemat Rp ${(hargaAsli - hargaDiskon).toLocaleString("id-ID")}
                        </span>
                      ` : `
                        <span class="text-lg font-bold text-gray-900">Rp ${hargaAsli.toLocaleString("id-ID")}</span>
                      `}
                    </div>
                    <span class="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transform group-hover:scale-105 transition-transform duration-300 flex items-center space-x-1 ml-3 flex-shrink-0">
                      <i class="fas fa-eye text-xs"></i>
                      <span>Detail</span>
                    </span>
                  </div>
                </div>

                <!-- Hover Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Navigation Indicators -->
        ${produkIklanList.length > 1 ? `
          <div class="flex justify-center space-x-2 mt-4" aria-label="Slider navigation">
            ${produkIklanList.map((_, index) => `
              <button class="w-2 h-2 rounded-full bg-gray-300 transition-all duration-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      aria-label="Go to slide ${index + 1}"
                      onclick="slideToIklan(${index})">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </section>
  `;

  const produkContainer = document.getElementById("produk-container");
  if (!produkContainer) {
    console.error('Produk container tidak ditemukan');
    return;
  }

  // Remove existing slider if any
  const existingSlider = document.querySelector('.iklan-produk-container');
  if (existingSlider) {
    existingSlider.remove();
  }

  // Insert slider at the correct position
  const produkListWrapper = document.getElementById("produk-list-wrapper");
  if (produkListWrapper && produkListWrapper.parentNode) {
    produkListWrapper.parentNode.insertBefore(createElementFromHTML(sliderHTML), produkListWrapper);
  } else {
    // Fallback: insert at the beginning of main content
    const mainContent = produkContainer.querySelector('.max-w-7xl');
    if (mainContent) {
      mainContent.insertAdjacentHTML('afterbegin', sliderHTML);
    } else {
      produkContainer.insertAdjacentHTML('afterbegin', sliderHTML);
    }
  }

  // Initialize auto slide
  setTimeout(() => {
    initializeIklanSlider("iklan-slider-auto");
  }, 100);
}

// Helper function to create DOM element from HTML string
function createElementFromHTML(htmlString) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

// Enhanced auto-slide functionality
function initializeIklanSlider(sliderId) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;

  let slideInterval;
  let currentSlide = 0;
  const slides = slider.querySelectorAll('.produk-iklan-card');
  const indicators = document.querySelectorAll('.iklan-produk-container [aria-label^="Go to slide"]');
  
  if (slides.length <= 1) return;

  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    
    currentSlide = index;
    
    // Scroll to slide
    slides[index].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
    
    // Update indicators
    updateIndicators();
  }

  function updateIndicators() {
    indicators.forEach((indicator, index) => {
      if (index === currentSlide) {
        indicator.classList.remove('bg-gray-300');
        indicator.classList.add('bg-orange-500', 'w-4');
      } else {
        indicator.classList.remove('bg-orange-500', 'w-4');
        indicator.classList.add('bg-gray-300');
        indicator.style.width = '8px';
      }
    });
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  // Start auto-slide
  function startAutoSlide() {
    slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
  }

  function stopAutoSlide() {
    if (slideInterval) {
      clearInterval(slideInterval);
    }
  }

  // Pause auto-slide on hover
  slider.addEventListener('mouseenter', stopAutoSlide);
  slider.addEventListener('mouseleave', startAutoSlide);
  
  // Pause auto-slide on focus
  slider.addEventListener('focusin', stopAutoSlide);
  slider.addEventListener('focusout', startAutoSlide);

  // Touch events for mobile
  let startX = 0;
  let endX = 0;

  slider.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    stopAutoSlide();
  });

  slider.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
    startAutoSlide();
  });

  function handleSwipe() {
    const diff = startX - endX;
    const swipeThreshold = 50;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide(); // Swipe left
      } else {
        goToSlide(currentSlide - 1); // Swipe right
      }
    }
  }

  // Initialize
  startAutoSlide();
  updateIndicators();
}

// Manual slide navigation
function slideToIklan(index) {
  const slider = document.getElementById('iklan-slider-auto');
  if (!slider) return;
  
  const slides = slider.querySelectorAll('.produk-iklan-card');
  if (index >= 0 && index < slides.length) {
    slides[index].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
    
    // Update current slide for auto-slide
    const indicators = document.querySelectorAll('.iklan-produk-container [aria-label^="Go to slide"]');
    indicators.forEach((indicator, i) => {
      if (i === index) {
        indicator.classList.remove('bg-gray-300');
        indicator.classList.add('bg-orange-500', 'w-4');
      } else {
        indicator.classList.remove('bg-orange-500', 'w-4');
        indicator.classList.add('bg-gray-300');
        indicator.style.width = '8px';
      }
    });
  }
}

// Enhanced CSS for iklan slider
const iklanSliderStyles = `
  .iklan-produk-slider {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  
  .iklan-produk-slider::-webkit-scrollbar {
    display: none;
  }
  
  .produk-iklan-card {
    scroll-snap-align: start;
  }
  
  .fade-in {
    animation: fadeInUp 0.6s ease-out;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 640px) {
    .produk-iklan-card {
      width: 280px;
    }
  }
  
  @media (max-width: 480px) {
    .produk-iklan-card {
      width: 260px;
    }
  }
`;

// Add styles to document
if (!document.querySelector('style[data-iklan-slider]')) {
  const style = document.createElement('style');
  style.setAttribute('data-iklan-slider', '');
  style.textContent = iklanSliderStyles;
  document.head.appendChild(style);
}

function autoSlidePerItem(containerId) {
  const slider = document.getElementById(containerId);
  if (!slider) return;

  const items = slider.querySelectorAll(".produk-iklan-card");
  let index = 0;
  let autoSlidePausedUntil = 0;

  slider.addEventListener("scroll", () => {
    autoSlidePausedUntil = Date.now() + 5000;
  });

  slider.addEventListener("touchstart", () => {
    autoSlidePausedUntil = Date.now() + 5000;
  });

  setInterval(() => {
    if (!items.length) return;
    if (Date.now() < autoSlidePausedUntil) return;

    index = (index + 1) % items.length;
    const item = items[index];
    if (item) {
      item.scrollIntoView({ 
        behavior: "smooth", 
        inline: "start",
        block: "nearest"
      });
    }
  }, 4000);
}

// Main Function dengan Firebase Integration yang Lebih Baik
async function renderProductList() {
  const produkContainer = document.getElementById('produk-container');
  if (!produkContainer) return;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  // Tambah CSS dengan namespace vlc- (GoFood Style)
  if (!document.getElementById('vlc-styles')) {
    const style = document.createElement('style');
    style.id = 'vlc-styles';
    style.textContent = `
      /* Main Container - GoFood Style */
      .vlc-container {
        padding: 0;
        max-width: 100%;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: #f8f9fa;
        min-height: 100vh;
      }

      /* Header Style */
      .vlc-header {
        background: linear-gradient(135deg, #ff6f00, #ff8f00);
        color: white;
        padding: 1rem;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      .vlc-header-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .vlc-location-selector {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255,255,255,0.2);
        padding: 0.75rem 1rem;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .vlc-location-selector:hover {
        background: rgba(255,255,255,0.3);
      }

      .vlc-location-text {
        flex: 1;
        font-size: 0.9rem;
      }

      .vlc-location-arrow {
        font-size: 1.2rem;
      }

      /* Search Bar */
      .vlc-search-container {
        padding: 1rem;
        background: white;
        position: sticky;
        top: 72px;
        z-index: 99;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }

      .vlc-search-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: #f8f9fa;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        border: 1px solid #e9ecef;
      }

      .vlc-search-bar i {
        color: #6c757d;
      }

      .vlc-search-input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 0.9rem;
        outline: none;
      }

      /* Banner Slider */
      .vlc-banner-container {
        padding: 1rem;
        background: white;
      }

      .vlc-banner-slider {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        gap: 0.75rem;
        padding-bottom: 0.5rem;
        -webkit-overflow-scrolling: touch;
      }

      .vlc-banner-slider::-webkit-scrollbar {
        display: none;
      }

      .vlc-banner-item {
        min-width: 85%;
        scroll-snap-align: start;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      }

      .vlc-banner-img {
        width: 100%;
        height: 120px;
        object-fit: cover;
      }

      /* Quick Actions */
      .vlc-quick-actions {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        padding: 1.5rem 1rem;
        background: white;
      }

      .vlc-quick-action {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: transform 0.2s ease;
      }

      .vlc-quick-action:hover {
        transform: translateY(-2px);
      }

      .vlc-quick-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        background: linear-gradient(135deg, #ff6f00, #ff8f00);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.2rem;
      }

      .vlc-quick-text {
        font-size: 0.75rem;
        font-weight: 600;
        color: #333;
        text-align: center;
        line-height: 1.2;
      }

      /* Section Titles */
      .vlc-section-title {
        font-size: 1.3rem;
        margin: 1.5rem 1rem 1rem;
        color: #1a1a1a;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 700;
      }

      .vlc-section-link {
        font-size: 0.85rem;
        color: #ff6f00;
        font-weight: 600;
        text-decoration: none;
      }

      /* Kategori Scroll */
      .vlc-kategori-scroll {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding: 0.5rem 1rem;
        scrollbar-width: none;
        -ms-overflow-style: none;
        background: white;
      }

      .vlc-kategori-scroll::-webkit-scrollbar {
        display: none;
      }

      /* Kategori Cards */
      .vlc-kategori-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 0.75rem;
        background: white;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 80px;
        border: 1px solid #f0f0f0;
        flex-shrink: 0;
      }

      .vlc-kategori-card.active {
        background: linear-gradient(135deg, #fff3e0, #ffe0b2);
        border-color: #ff6f00;
      }

      .vlc-kategori-img-wrapper {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        overflow: hidden;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .vlc-kategori-card img {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }

      .vlc-kategori-card span {
        font-size: 0.75rem;
        font-weight: 600;
        color: #333;
        text-align: center;
        line-height: 1.2;
      }

      /* Product Cards - GoFood Style */
      .vlc-produk-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
        padding: 0 1rem 1rem;
        background: #f8f9fa;
      }

      .vlc-produk-card {
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        transition: all 0.3s ease;
        border: 1px solid #f0f0f0;
      }

      .vlc-produk-card:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        transform: translateY(-2px);
      }

      .vlc-produk-img-container {
        position: relative;
        width: 100%;
        height: 160px;
        overflow: hidden;
      }

      .vlc-produk-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .vlc-produk-card:hover .vlc-produk-img {
        transform: scale(1.05);
      }

      .vlc-diskon-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background: linear-gradient(135deg, #e53935, #d32f2f);
        color: white;
        font-size: 0.7rem;
        padding: 4px 8px;
        border-radius: 8px;
        font-weight: 700;
        z-index: 2;
        box-shadow: 0 2px 8px rgba(229, 57, 53, 0.3);
      }

      .vlc-toko-badge {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: rgba(0,0,0,0.7);
        color: white;
        font-size: 0.7rem;
        padding: 4px 8px;
        border-radius: 8px;
        font-weight: 600;
      }

      .vlc-produk-info {
        padding: 1rem;
      }

      .vlc-produk-nama {
        font-weight: 700;
        font-size: 0.95rem;
        color: #1a1a1a;
        margin-bottom: 0.5rem;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .vlc-produk-meta {
        font-size: 0.75rem;
        color: #666;
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .vlc-rating {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: #ff6f00;
      }

      .vlc-produk-action {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .vlc-harga-container {
        display: flex;
        flex-direction: column;
      }

      .vlc-harga-asli {
        text-decoration: line-through;
        font-size: 0.75rem;
        color: #999;
      }

      .vlc-harga-diskon {
        color: #e53935;
        font-size: 1rem;
        font-weight: 700;
      }

      .vlc-harga-normal {
        color: #1a1a1a;
        font-size: 1rem;
        font-weight: 700;
      }

      .vlc-beli-btn {
        background: linear-gradient(135deg, #ff6f00, #ff8f00);
        color: white;
        border: none;
        padding: 0.6rem 1.2rem;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(255, 111, 0, 0.3);
        font-size: 0.85rem;
      }

      .vlc-beli-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 111, 0, 0.4);
      }

      .vlc-beli-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }

      /* Restaurant Cards */
      .vlc-resto-card {
        background: white;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        border: 1px solid #f0f0f0;
      }

      .vlc-resto-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .vlc-resto-header:hover {
        background: #f8f9fa;
      }

      .vlc-resto-avatar {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        object-fit: cover;
        border: 2px solid #ffecb3;
      }

      .vlc-resto-info {
        flex: 1;
      }

      .vlc-resto-nama {
        font-weight: 700;
        font-size: 1rem;
        color: #1a1a1a;
        margin-bottom: 0.25rem;
      }

      .vlc-resto-meta {
        font-size: 0.8rem;
        color: #666;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .vlc-resto-status {
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
        font-size: 0.7rem;
        font-weight: 600;
      }

      .vlc-resto-open {
        background: #e8f5e8;
        color: #2e7d32;
      }

      .vlc-resto-closed {
        background: #ffebee;
        color: #c62828;
      }

      .vlc-resto-arrow {
        color: #666;
        font-size: 1.2rem;
      }

      /* Loader States */
      .vlc-loader {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 3rem;
        color: #666;
        font-size: 1rem;
      }

      .vlc-loader::before {
        content: '';
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #ff6f00;
        border-radius: 50%;
        animation: vlc-spin 1s linear infinite;
        margin-right: 0.5rem;
      }

      @keyframes vlc-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Error States */
      .vlc-error {
        text-align: center;
        padding: 2rem;
        color: #e53935;
        background: #ffebee;
        border-radius: 12px;
        margin: 1rem;
      }

      /* Floating Cart */
      .vlc-floating-cart {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, #ff6f00, #ff8f00);
        color: white;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        box-shadow: 0 4px 20px rgba(255, 111, 0, 0.4);
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
      }

      .vlc-floating-cart:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(255, 111, 0, 0.6);
      }

      .vlc-cart-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #e53935;
        color: white;
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
        border-radius: 10px;
        font-weight: 700;
        min-width: 20px;
        text-align: center;
      }

      /* Responsive Design */
      @media (min-width: 768px) {
        .vlc-produk-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .vlc-banner-item {
          min-width: 60%;
        }
        
        .vlc-quick-actions {
          grid-template-columns: repeat(8, 1fr);
        }
      }

      @media (min-width: 1024px) {
        .vlc-produk-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .vlc-banner-item {
          min-width: 40%;
        }
      }

      @media (max-width: 480px) {
        .vlc-kategori-card {
          min-width: 70px;
          padding: 0.75rem 0.5rem;
        }
        
        .vlc-quick-actions {
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }
        
        .vlc-quick-icon {
          width: 45px;
          height: 45px;
        }
        
        .vlc-floating-cart {
          bottom: 1rem;
          right: 1rem;
          width: 50px;
          height: 50px;
          font-size: 1.2rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (!user) {
    produkContainer.innerHTML = `
      <div class="vlc-container">
        <div class="vlc-error">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Harap login terlebih dahulu untuk melihat produk</p>
        </div>
      </div>
    `;
    return;
  }

  produkContainer.innerHTML = `
    <div class="vlc-container">
      <div class="vlc-loader">Memuat produk...</div>
    </div>
  `;

  try {
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      produkContainer.innerHTML = `
        <div class="vlc-container">
          <div class="vlc-error">
            <i class="fas fa-map-marker-alt" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Lokasi pengguna tidak ditemukan</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #666;">Silakan perbarui lokasi Anda</p>
          </div>
        </div>
      `;
      return;
    }

    const lokasiUser = alamatDoc.data().lokasi;
    const lat1 = lokasiUser.latitude;
    const lon1 = lokasiUser.longitude;

    const waktu = new Date().getHours();
    const waktuMenu = waktu < 11 ? 'Sarapan' : (waktu < 17 ? 'Makan Siang' : 'Makan Malam');

    // Data untuk UI GoFood style
    const quickActions = [
      { label: "Food", value: "all", icon: "fa-utensils" },
      { label: "Martabak", value: "Martabak", icon: "fa-pizza-slice" },
      { label: "Minuman", value: "Minuman", icon: "fa-martini-glass" },
      { label: "Promo", value: "Promo", icon: "fa-percent" },
      { label: "Terdekat", value: "Terdekat", icon: "fa-location-dot" },
      { label: "Rating", value: "Bestseller", icon: "fa-star" },
      { label: "Hemat", value: "Hemat", icon: "fa-wallet" },
      { label: "Sehat", value: "Sehat", icon: "fa-heart" }
    ];

    const kategoriKuliner = [
      { label: "Martabak", value: "Martabak", image: "./img/kategori/martabak.png" },
      { label: "Bakso", value: "Bakso", image: "./img/kategori/bakso.png" },
      { label: "Roti", value: "Roti", image: "./img/kategori/roti.png" },
      { label: "Minuman", value: "Minuman", image: "./img/kategori/minuman.png" },
      { label: "Kue", value: "Kue", image: "./img/kategori/kue.png" },
      { label: "Jajanan", value: "Jajanan", image: "./img/kategori/jajanan.png" },
      { label: "Sate", value: "Sate", image: "./img/kategori/sate.png" },
      { label: "Nasi", value: "Nasi", image: "./img/kategori/nasi.png" },
      { label: "Ayam", value: "Ayam", image: "./img/kategori/ayam.png" }
    ];

    // Render main UI structure
    produkContainer.innerHTML = `
      <div class="vlc-container">
        
        <!-- Kategori Section -->
        <h2 class="vlc-section-title">
          Kategori
          <a href="#" class="vlc-section-link">Lihat Semua</a>
        </h2>
        <div id="vlc-kategori-container" class="vlc-kategori-scroll"></div>

        <!-- Recommended Section -->
        <h2 class="vlc-section-title">
          <i class="fas fa-bell-concierge"></i> Menu ${waktuMenu}
          <a href="#" class="vlc-section-link">Lihat Semua</a>
        </h2>
        <div id="vlc-produk-list-wrapper" class="vlc-produk-grid">
          <div class="vlc-loader">Memuat produk...</div>
        </div>

        <!-- Floating Cart -->
        <div class="vlc-floating-cart" onclick="openCart()">
          <i class="fas fa-shopping-cart"></i>
          <div class="vlc-cart-badge">0</div>
        </div>
      </div>
    `;

    // Load data from Firestore
    const produkSnapshot = await db.collection("produk").get();
    const produkList = produkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const tokoSnapshot = await db.collection("toko").get();
    const tokoMap = {};
    tokoSnapshot.docs.forEach(doc => {
      const data = doc.data();
      tokoMap[doc.id] = {
        namaToko: data.namaToko || 'Toko',
        isOpen: data.isOpen ?? false,
        urlGambar: data.urlGambar || './img/toko-pict.png',
        koordinat: data.koordinat instanceof firebase.firestore.GeoPoint
          ? { lat: data.koordinat.latitude, lng: data.koordinat.longitude }
          : { lat: 0, lng: 0 }
      };
    });

    function hitungJarak(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const produkGabung = [];
    for (const produk of produkList) {
      const toko = tokoMap[produk.idToko] || {
        namaToko: 'Toko', isOpen: false, koordinat: { lat: 0, lng: 0 }, urlGambar: './img/toko-pict.png'
      };
      const lat2 = toko.koordinat.lat;
      const lon2 = toko.koordinat.lng;
      const jarakKm = lat2 !== 0 ? hitungJarak(lat1, lon1, lat2, lon2) : 0;

      const ratingSnap = await db.collection("produk").doc(produk.id).collection("rating").get();
      let total = 0, count = 0;
      ratingSnap.forEach(r => {
        const data = r.data();
        if (typeof data.rating === "number") {
          total += data.rating;
          count++;
        }
      });

      produkGabung.push({
        ...produk,
        tokoNama: toko.namaToko,
        tokoGambar: toko.urlGambar,
        isOpen: toko.isOpen,
        jarakNumber: jarakKm,
        jarak: jarakKm < 1 ? `${Math.round(jarakKm * 1000)} m` : `${jarakKm.toFixed(1)} km`,
        rating: count > 0 ? (total / count).toFixed(1) : 0,
        ratingCount: count,
        ratingDisplay: count > 0 ? `${(total / count).toFixed(1)} (${count})` : "Baru",
        urlGambar: produk.urlGambar || './img/toko-pict.png',
        diLuarJangkauan: jarakKm > 20
      });
    }

    const produkUrut = produkGabung.sort((a, b) => a.jarakNumber - b.jarakNumber);
    const produkIklan = produkGabung.filter(p => p.iklan === true);

    // Render kategori
    function renderKategori() {
      const kategoriContainer = document.getElementById('vlc-kategori-container');
      kategoriContainer.innerHTML = kategoriKuliner.map(k => `
        <div class="vlc-kategori-card" data-kategori="${k.value}">
          <div class="vlc-kategori-img-wrapper">
            <img src="${k.image}" alt="${k.label}" onerror="this.src='./img/toko-pict.png'" />
          </div>
          <span>${k.label}</span>
        </div>
      `).join("");

      // Add event listeners
      document.querySelectorAll('.vlc-kategori-card').forEach(card => {
        card.addEventListener('click', () => {
          const kategori = card.getAttribute('data-kategori');
          document.querySelectorAll('.vlc-kategori-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          tampilkanProdukFilter(kategori);
        });
      });

      // Add event listeners for quick actions
      document.querySelectorAll('.vlc-quick-action').forEach(action => {
        action.addEventListener('click', () => {
          const actionType = action.getAttribute('data-action');
          tampilkanProdukFilter(actionType);
        });
      });
    }

    // Enhanced product display function
    window.tampilkanProdukFilter = function (kategori = "all", containerId = "vlc-produk-list-wrapper") {
      const wrapper = document.getElementById(containerId);
      let produkFilter = produkUrut;

      switch (kategori.toLowerCase()) {
        case "bestseller":
          produkFilter = produkUrut.filter(p => p.rating > 4.0).sort((a, b) => b.rating - a.rating);
          break;
        case "terdekat":
          produkFilter = [...produkUrut].slice(0, 10);
          break;
        case "promo":
          produkFilter = produkUrut.filter(p => p.promo || p.diskon > 0 || (p.hargaDiskon && p.hargaDiskon < p.harga));
          break;
        case "hemat":
          produkFilter = produkUrut.filter(p => p.harga <= 15000).sort((a, b) => a.harga - b.harga);
          break;
        case "sehat":
          produkFilter = produkUrut.filter(p => (p.kategori || "").toLowerCase().includes("sehat") || (p.deskripsi || "").toLowerCase().includes("sehat"));
          break;
        case "all":
          produkFilter = produkUrut.slice(0, 12); // Limit for better performance
          break;
        default:
          produkFilter = produkUrut.filter(p => (p.kategori || "").toLowerCase() === kategori.toLowerCase());
      }

      if (produkFilter.length === 0) {
        wrapper.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>Tidak ada produk untuk <strong>${kategori}</strong></p>
          </div>
        `;
        return;
      }

      wrapper.innerHTML = produkFilter.map(p => {
        const tokoAktif = p.isOpen;
        const stokHabis = (p.stok || 0) <= 0;
        const luarJangkauan = p.diLuarJangkauan;
        const disabledAttr = (!tokoAktif || stokHabis || luarJangkauan) ? 'disabled' : '';
        let btnText = 'Pesan';
        if (!tokoAktif) btnText = 'Tutup';
        else if (stokHabis) btnText = 'Habis';
        else if (luarJangkauan) btnText = '⛔';

        const hargaAsli = Number(p.hargaAwal || p.harga || 0);
        const hargaDiskon = Number(p.hargaDiskon || p.harga || 0);
        const showDiskon = hargaDiskon < hargaAsli && hargaAsli > 0;
        const persenDiskon = showDiskon ? Math.round(((hargaAsli - hargaDiskon) / hargaAsli) * 100) : 0;

        return `
          <div class="vlc-produk-card">
            <div class="vlc-produk-img-container">
              ${showDiskon ? `<div class="vlc-diskon-badge">-${persenDiskon}%</div>` : ""}
              <img src="${p.urlGambar}" alt="${p.namaProduk}" class="vlc-produk-img" />
              <div class="vlc-toko-badge">${p.tokoNama}</div>
            </div>
            <div class="vlc-produk-info">
              <p class="vlc-produk-nama">${p.namaProduk}</p>
              <div class="vlc-produk-meta">
                <span class="vlc-rating">
                  <i class="fas fa-star"></i> ${p.ratingDisplay}
                </span>
                <span>•</span>
                <span>${p.jarak}</span>
                <span>•</span>
                <span>${p.estimasi || '15-30'} min</span>
              </div>
              <div class="vlc-produk-action">
                <div class="vlc-harga-container">
                  ${showDiskon
                    ? `<span class="vlc-harga-asli">Rp ${hargaAsli.toLocaleString("id-ID")}</span>
                       <span class="vlc-harga-diskon">Rp ${hargaDiskon.toLocaleString("id-ID")}</span>`
                    : `<span class="vlc-harga-normal">Rp ${hargaAsli.toLocaleString("id-ID")}</span>`}
                </div>
                <button class="vlc-beli-btn" ${disabledAttr} 
                  onclick="${!disabledAttr ? `tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})` : ''}">
                  ${btnText}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    // Initialize
    renderKategori();
    tampilkanProdukFilter("all");

    // Add search functionality
    const searchInput = document.querySelector('.vlc-search-input');
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      if (searchTerm.length >= 2) {
        const filtered = produkUrut.filter(p => 
          p.namaProduk.toLowerCase().includes(searchTerm) ||
          p.tokoNama.toLowerCase().includes(searchTerm) ||
          (p.kategori || '').toLowerCase().includes(searchTerm)
        );
        document.getElementById('vlc-produk-list-wrapper').innerHTML = filtered.map(p => `
          <div class="vlc-produk-card">
            <div class="vlc-produk-img-container">
              <img src="${p.urlGambar}" alt="${p.namaProduk}" class="vlc-produk-img" />
              <div class="vlc-toko-badge">${p.tokoNama}</div>
            </div>
            <div class="vlc-produk-info">
              <p class="vlc-produk-nama">${p.namaProduk}</p>
              <div class="vlc-produk-meta">
                <span class="vlc-rating">
                  <i class="fas fa-star"></i> ${p.ratingDisplay}
                </span>
                <span>•</span>
                <span>${p.jarak}</span>
              </div>
              <div class="vlc-produk-action">
                <span class="vlc-harga-normal">Rp ${Number(p.harga).toLocaleString("id-ID")}</span>
                <button class="vlc-beli-btn" onclick="tampilkanPopupDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                  Pesan
                </button>
              </div>
            </div>
          </div>
        `).join('');
      } else if (searchTerm.length === 0) {
        tampilkanProdukFilter("all");
      }
    });

  } catch (err) {
    console.error("Gagal memuat produk:", err);
    produkContainer.innerHTML = `
      <div class="vlc-container">
        <div class="vlc-error">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>Terjadi kesalahan saat memuat produk</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #666;">Silakan refresh halaman</p>
        </div>
      </div>
    `;
  }
}
renderProductList();


// Fungsi untuk menampilkan modal
function showVlxModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

// Fungsi untuk menutup modal
function closeVlxModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Close modal dengan Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.vlx-modal-overlay:not(.hidden)');
    openModals.forEach(modal => {
      closeVlxModal(modal.id);
    });
  }
});

// Close modal dengan klik outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('vlx-modal-overlay')) {
    closeVlxModal(e.target.id);
  }
});

function showAllReviewsModal({ idProduk, snap }) {
  const modal = document.createElement("div");
  modal.className = "delivery-modal-overlay delivery-reviews-modal";
  
  let reviewsHTML = '';
  let totalRating = 0;
  let ratingCounts = Array(5).fill(0); // [1-star, 2-star, 3-star, 4-star, 5-star]

  if (snap.empty) {
    reviewsHTML = `
      <div class="delivery-reviews-empty">
        <div class="delivery-reviews-empty-icon">
          <i class="fas fa-comment-dots"></i>
        </div>
        <h3>Belum Ada Ulasan</h3>
        <p>Produk ini belum memiliki ulasan dari pelanggan</p>
      </div>
    `;
  } else {
    // Calculate rating statistics
    snap.forEach(doc => {
      const r = doc.data();
      const rating = r.rating || 0;
      if (rating >= 1 && rating <= 5) {
        totalRating += rating;
        ratingCounts[5 - rating]++; // Reverse index for display
      }
    });

    const averageRating = snap.size > 0 ? (totalRating / snap.size).toFixed(1) : 0;
    const totalReviews = snap.size;

    // Generate reviews list
    const reviewsList = snap.docs.map(doc => {
      const r = doc.data();
      const waktu = r.waktu?.toDate?.()
        ? r.waktu.toDate()
        : new Date(r.waktu || Date.now());
      
      const rating = r.rating || 0;
      const komentar = (r.ulasan || r.komentar || "-").trim();
      const namaUser = r.namaUser || r.nama || "Pelanggan";
      const idPesanan = r.idPesanan ? `#${r.idPesanan}` : "-";

      return {
        namaUser,
        rating,
        komentar,
        idPesanan,
        waktu,
        starRating: generateStarRating(rating)
      };
    });

    // Rating distribution
    const ratingDistributionHTML = `
      <div class="delivery-reviews-stats">
        <div class="delivery-reviews-overview">
          <div class="delivery-reviews-average">
            <div class="delivery-reviews-average-rating">${averageRating}</div>
            <div class="delivery-reviews-average-stars">
              ${generateStarRating(averageRating)}
            </div>
            <div class="delivery-reviews-average-count">${totalReviews} ulasan</div>
          </div>
          <div class="delivery-reviews-distribution">
            ${[5, 4, 3, 2, 1].map((stars, index) => {
              const count = ratingCounts[index];
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return `
                <div class="delivery-reviews-distribution-item">
                  <span class="delivery-reviews-distribution-stars">
                    ${stars} <i class="fas fa-star"></i>
                  </span>
                  <div class="delivery-reviews-distribution-bar">
                    <div class="delivery-reviews-distribution-progress" 
                         style="width: ${percentage}%"></div>
                  </div>
                  <span class="delivery-reviews-distribution-count">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    reviewsHTML = `
      ${ratingDistributionHTML}
      <div class="delivery-reviews-list">
        ${reviewsList.map(review => `
          <div class="delivery-review-item">
            <div class="delivery-review-header">
              <div class="delivery-review-user">
                <div class="delivery-review-avatar">
                  <i class="fas fa-user"></i>
                </div>
                <div class="delivery-review-user-info">
                  <div class="delivery-review-name">${review.namaUser}</div>
                  <div class="delivery-review-order">${review.idPesanan}</div>
                </div>
              </div>
              <div class="delivery-review-meta">
                <div class="delivery-review-rating">
                  ${review.starRating}
                </div>
                <div class="delivery-review-time">
                  ${formatReviewTime(review.waktu)}
                </div>
              </div>
            </div>
            <div class="delivery-review-content">
              <p class="delivery-review-comment">${review.komentar}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="delivery-modal-container delivery-reviews-modal-container">
      <div class="delivery-reviews-modal-content">
        <!-- Header -->
        <div class="delivery-reviews-modal-header">
          <div class="delivery-reviews-modal-title">
            <i class="fas fa-star"></i>
            <h2>Semua Ulasan</h2>
            ${!snap.empty ? `<span class="delivery-reviews-count">${snap.size} ulasan</span>` : ''}
          </div>
          <button class="delivery-reviews-modal-close" onclick="closeReviewsModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="delivery-reviews-modal-body">
          ${reviewsHTML}
        </div>

        <!-- Footer -->
        <div class="delivery-reviews-modal-footer">
          <button class="delivery-reviews-modal-close-btn" onclick="closeReviewsModal()">
            <i class="fas fa-times"></i>
            Tutup
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeReviewsModal() {
  const modal = document.querySelector('.delivery-reviews-modal');
  if (modal) {
    modal.style.animation = 'modalFadeOut 0.3s ease';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

// Add CSS styles for reviews modal
const reviewsModalStyles = `
  <style>
    /* Reviews Modal */
    .delivery-reviews-modal .delivery-modal-container {
      max-width: 600px;
      max-height: 90vh;
    }

    .delivery-reviews-modal-content {
      background: white;
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Header */
    .delivery-reviews-modal-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .delivery-reviews-modal-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .delivery-reviews-modal-title h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }

    .delivery-reviews-modal-title i {
      color: #f59e0b;
      font-size: 1.5rem;
    }

    .delivery-reviews-count {
      background: #e5e7eb;
      color: #6b7280;
      padding: 0.25rem 0.75rem;
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .delivery-reviews-modal-close {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .delivery-reviews-modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    /* Body */
    .delivery-reviews-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    /* Reviews Stats */
    .delivery-reviews-stats {
      padding: 2rem;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
    }

    .delivery-reviews-overview {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2rem;
      align-items: start;
    }

    .delivery-reviews-average {
      text-align: center;
    }

    .delivery-reviews-average-rating {
      font-size: 3rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .delivery-reviews-average-stars {
      margin-bottom: 0.5rem;
    }

    .delivery-reviews-average-count {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .delivery-reviews-distribution {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .delivery-reviews-distribution-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }

    .delivery-reviews-distribution-stars {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #6b7280;
      min-width: 60px;
    }

    .delivery-reviews-distribution-stars i {
      color: #f59e0b;
      font-size: 0.75rem;
    }

    .delivery-reviews-distribution-bar {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .delivery-reviews-distribution-progress {
      height: 100%;
      background: #f59e0b;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .delivery-reviews-distribution-count {
      color: #6b7280;
      min-width: 20px;
      text-align: right;
      font-size: 0.75rem;
    }

    /* Reviews List */
    .delivery-reviews-list {
      padding: 2rem;
    }

    .delivery-review-item {
      padding: 1.5rem 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .delivery-review-item:last-child {
      border-bottom: none;
    }

    .delivery-review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .delivery-review-user {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
    }

    .delivery-review-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .delivery-review-user-info {
      flex: 1;
    }

    .delivery-review-name {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.25rem;
    }

    .delivery-review-order {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .delivery-review-meta {
      text-align: right;
      flex-shrink: 0;
    }

    .delivery-review-rating {
      margin-bottom: 0.5rem;
    }

    .delivery-review-time {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .delivery-review-content {
      margin-left: 3.25rem;
    }

    .delivery-review-comment {
      color: #6b7280;
      line-height: 1.6;
      margin: 0;
      font-size: 0.95rem;
    }

    /* Empty State */
    .delivery-reviews-empty {
      text-align: center;
      padding: 4rem 2rem;
    }

    .delivery-reviews-empty-icon {
      font-size: 4rem;
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .delivery-reviews-empty h3 {
      font-size: 1.5rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .delivery-reviews-empty p {
      color: #9ca3af;
      margin: 0;
    }

    /* Footer */
    .delivery-reviews-modal-footer {
      padding: 1.5rem 2rem;
      border-top: 1px solid #e5e7eb;
      background: white;
      display: flex;
      justify-content: center;
    }

    .delivery-reviews-modal-close-btn {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .delivery-reviews-modal-close-btn:hover {
      background: #374151;
      transform: translateY(-1px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .delivery-reviews-modal .delivery-modal-container {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .delivery-reviews-modal-content {
        border-radius: 0;
      }

      .delivery-reviews-modal-header {
        padding: 1rem 1.5rem;
      }

      .delivery-reviews-stats {
        padding: 1.5rem;
      }

      .delivery-reviews-overview {
        grid-template-columns: 1fr;
        gap: 1.5rem;
        text-align: center;
      }

      .delivery-reviews-list {
        padding: 1.5rem;
      }

      .delivery-reviews-modal-footer {
        padding: 1rem 1.5rem;
      }

      .delivery-review-header {
        flex-direction: column;
        gap: 1rem;
      }

      .delivery-review-meta {
        text-align: left;
        width: 100%;
      }

      .delivery-review-content {
        margin-left: 0;
        margin-top: 1rem;
      }
    }

    @media (max-width: 480px) {
      .delivery-reviews-modal-header {
        padding: 1rem;
      }

      .delivery-reviews-stats {
        padding: 1rem;
      }

      .delivery-reviews-list {
        padding: 1rem;
      }

      .delivery-reviews-average-rating {
        font-size: 2.5rem;
      }

      .delivery-review-item {
        padding: 1rem 0;
      }
    }

    /* Scrollbar Styling */
    .delivery-reviews-modal-body::-webkit-scrollbar {
      width: 6px;
    }

    .delivery-reviews-modal-body::-webkit-scrollbar-track {
      background: #f1f5f9;
    }

    .delivery-reviews-modal-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .delivery-reviews-modal-body::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  </style>
`;

// Inject styles
if (!document.querySelector('#delivery-reviews-modal-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'delivery-reviews-modal-styles';
  styleElement.textContent = reviewsModalStyles;
  document.head.appendChild(styleElement);
}

// Reuse existing helper functions
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = '';
  
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star delivery-star-full"></i>';
  }
  
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt delivery-star-half"></i>';
  }
  
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star delivery-star-empty"></i>';
  }
  
  return starsHTML;
}

function formatReviewTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showLoading(message) {
  // Implementation for showing loading state
  console.log("Loading:", message);
}

function hideLoading() {
  // Implementation for hiding loading state
  console.log("Hide loading");
}

function showNotification(message, type = "info") {
  // Implementation for showing notifications
  console.log(`${type}:`, message);
}



function hitungSubtotal(hargaProduk) {
  const checkboxes = document.querySelectorAll(".addon-checkbox");
  let subtotal = hargaProduk;

  checkboxes.forEach(cb => {
    if (cb.checked) {
      subtotal += parseInt(cb.dataset.harga || "0");
    }
  });

  // Update tampilan subtotal jika ada
  const subtotalText = document.getElementById("subtotal");
  if (subtotalText) {
    subtotalText.innerText = subtotal.toLocaleString("id-ID");
  }

  // Update tombol dua baris
  const tombol = document.getElementById("tombol-tambah-keranjang");
  if (tombol) {
    tombol.innerHTML = `
      <div style="font-weight: 500;">Tambah ke Keranjang</div>
      <div style="font-weight: bold;">Rp ${subtotal.toLocaleString("id-ID")}</div>
    `;
  }
}





function parseGeoPointString(coordStr) {
  // Contoh input: "[1.63468° S, 105.77276° E]"
  if (!coordStr) return null;

  // Hilangkan kurung siku dan spasi berlebih
  coordStr = coordStr.replace(/[\[\]]/g, '').trim();

  // Pisah dengan koma
  const parts = coordStr.split(',');

  if (parts.length !== 2) return null;

  // Parsing lat
  let latPart = parts[0].trim(); // "1.63468° S"
  let latValue = parseFloat(latPart);
  if (latPart.toUpperCase().includes('S')) latValue = -Math.abs(latValue);
  else if (latPart.toUpperCase().includes('N')) latValue = Math.abs(latValue);
  else return null; // kalau gak ada N/S, error

  // Parsing lng
  let lngPart = parts[1].trim(); // "105.77276° E"
  let lngValue = parseFloat(lngPart);
  if (lngPart.toUpperCase().includes('W')) lngValue = -Math.abs(lngValue);
  else if (lngPart.toUpperCase().includes('E')) lngValue = Math.abs(lngValue);
  else return null; // kalau gak ada E/W, error

  return { lat: latValue, lng: lngValue };
}


function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fungsi untuk rating parsing
function parseRating(val) {
  return isNaN(parseFloat(val)) ? 0 : parseFloat(val);
}



async function tambahKeKeranjangDenganAddon(produk, addons = []) {
  try {
    const checkboxes = document.querySelectorAll(".addon-checkbox");
    const addonTerpilih = [];
    let totalAddon = 0;

    checkboxes.forEach(cb => {
      if (cb.checked) {
        const hargaAddon = parseInt(cb.dataset.harga || "0");
        addonTerpilih.push({
          nama: cb.dataset.nama,
          harga: hargaAddon
        });
        totalAddon += hargaAddon;
      }
    });

    // Ambil catatan dari textarea
    const catatanElem = document.querySelector(".popup-text-detail-produk textarea");
    const catatan = catatanElem ? catatanElem.value.trim() : "";

    // Pastikan fungsi tambahKeKeranjang tersedia
    if (typeof tambahKeKeranjang !== "function") {
      throw new Error("Fungsi tambahKeKeranjang tidak ditemukan.");
    }

    // Kirim catatan ke fungsi tambahKeKeranjang
    await tambahKeKeranjang(produk, addonTerpilih, catatan);
    tutupPopup();
    alert("✅ Produk berhasil ditambahkan ke keranjang.");
    
    // Setelah sukses, load halaman checkout
    if (typeof loadContent === "function") {
      loadContent('checkout');
    } else {
      console.warn("Fungsi loadContent tidak ditemukan, tidak dapat pindah ke checkout.");
    }
  } catch (err) {
    console.error("❌ Gagal proses keranjang:", err.message || err);
    alert("❌ Gagal menambahkan ke keranjang.");
  }
}

async function batalkanPesananDriver(idDocDriver, idPesanan) {
  const alasan = prompt("Tulis alasan pembatalan pesanan:");
  if (!alasan || alasan.trim() === "") return alert("❌ Alasan pembatalan wajib diisi.");

  const db = firebase.firestore();
  const now = Date.now();

  try {
    // Ambil data pesanan
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");
    const dataPesanan = pesananDoc.data();
    const idUser = dataPesanan.userId;

    // Update status di pesanan_driver
    await db.collection("pesanan_driver").doc(idDocDriver).update({
      status: "Dibatalkan",
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: `❌ Dibatalkan - ${alasan}`,
        waktu: now
      })
    });

    // Update status di pesanan utama
    await pesananRef.update({
      status: "Dibatalkan",
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: `❌ Dibatalkan oleh driver - ${alasan}`,
        waktu: now
      })
    });

    // ✅ Kirim notifikasi ke chatbox (subkoleksi `chat`)
    await pesananRef.collection("chat").add({
      pengirim: "driver",
      pesan: `❌ Pesanan dibatalkan oleh driver. Alasan: ${alasan}`,
      waktu: firebase.firestore.FieldValue.serverTimestamp(),
      tipe: "notifikasi"
    });

    alert("✅ Pesanan berhasil dibatalkan dan notifikasi dikirim ke chat.");
    loadContent("driver-dashboard");

  } catch (err) {
    console.error("❌ Gagal membatalkan pesanan:", err);
    alert("❌ Terjadi kesalahan saat membatalkan pesanan.");
  }
}

function tutupPopup() {
  document.getElementById("popup-greeting").style.display = "none";
  document.getElementById("popup-overlay").style.display = "none";
  document.body.classList.remove("popup-active");
}


async function tambahKeKeranjang(produk, addonTerpilih = [], catatanPenjual = "") {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("❌ Harap login terlebih dahulu.");
    return;
  }

  const db = firebase.firestore();
  const keranjangRef = db.collection("keranjang").doc(user.uid);

  try {
    // Ambil lokasi user dari koleksi "alamat"
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      throw new Error("Lokasi belum lengkap");
    }

    const lokasiUser = alamatDoc.data().lokasi;
    if (typeof lokasiUser.latitude !== "number" || typeof lokasiUser.longitude !== "number") {
      throw new Error("Lokasi pengguna tidak valid");
    }

    const cust = {
      lat: lokasiUser.latitude,
      lng: lokasiUser.longitude
    };

    // Validasi produk punya idToko
    if (!produk.idToko) throw new Error("Produk tidak memiliki idToko");

    // Ambil lokasi toko
    const tokoDoc = await db.collection("toko").doc(produk.idToko).get();
    if (!tokoDoc.exists) throw new Error("Toko tidak ditemukan");

    const tokoData = tokoDoc.data();
    const koordinatToko = tokoData.koordinat;

    if (!koordinatToko || typeof koordinatToko.latitude !== "number" || typeof koordinatToko.longitude !== "number") {
      throw new Error("Koordinat toko tidak valid");
    }

    const toko = {
      lat: koordinatToko.latitude,
      lng: koordinatToko.longitude
    };

    // Hitung jarak (km)
    const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, cust.lat, cust.lng);

    // Estimasi waktu (masak + kirim)
    const estimasiMasak = parseInt(produk.estimasi) || 10;
    const estimasiKirim = Math.ceil(jarak * 4); // 4 menit/km
    const totalEstimasi = estimasiMasak + estimasiKirim;

    // Hitung ongkir
    let ongkir = 8000;
    if (jarak > 2) {
      ongkir += Math.ceil(jarak - 2) * 1500;
    }

    // Total harga add-on
    const totalAddon = addonTerpilih.reduce((sum, addon) => sum + parseInt(addon.harga || 0), 0);
    const totalHarga = (produk.harga || 0) + totalAddon;

    // Ambil isi keranjang
    const snap = await keranjangRef.get();
    let items = snap.exists ? snap.data().items || [] : [];

    // Gabungkan nama produk + add-on untuk pembeda
    const namaGabungan = produk.namaProduk + (addonTerpilih.length ? ` + ${addonTerpilih.map(a => a.nama).join(', ')}` : '');

    // Cek apakah produk ini sudah ada di keranjang
    const index = items.findIndex(item =>
      item.nama === namaGabungan &&
      item.idToko === produk.idToko &&
      JSON.stringify(item.addon || []) === JSON.stringify(addonTerpilih) &&
      (item.catatanPenjual || "") === catatanPenjual
    );

    if (index !== -1) {
      items[index].jumlah += 1;
    } else {
      items.push({
        idProduk: produk.id || produk.idProduk, // ✅ Tambahkan idProduk
        nama: namaGabungan,
        idToko: produk.idToko,
        harga: totalHarga,
        gambar: produk.urlGambar || './img/toko-pict.png',
        jumlah: 1,
        estimasi: totalEstimasi,
        ongkir: ongkir,
        jarak: jarak.toFixed(2),
        addon: addonTerpilih,
        catatanPenjual: catatanPenjual,
        status: "Menunggu Ambil",
        stepslog: [
          {
            waktu: new Date().toISOString(),
            pesan: "Produk dimasukkan ke keranjang"
          }
        ]
      });
    }

    await keranjangRef.set({ items }, { merge: true });

    if (typeof updateCartBadge === "function") updateCartBadge();
    if (window.toast) toast(`✅ ${produk.namaProduk} ditambahkan ke keranjang`);

  } catch (error) {
    console.error("❌ Gagal tambah ke keranjang:", error.message || error);
    alert("❌ Gagal menambahkan ke keranjang: " + (error.message || error));
  }
}


async function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  const icon = document.querySelector('.footer-cart-icon');

  if (!badge || !icon) return;

  const user = firebase.auth().currentUser;
  if (!user) {
    badge.style.display = 'none';
    icon.classList.remove('fa-bounce');
    return;
  }

  try {
    const db = firebase.firestore();
    const doc = await db.collection("keranjang").doc(user.uid).get();
    const items = doc.exists ? (doc.data().items || []) : [];

    const total = items.reduce((sum, item) => sum + (parseInt(item.jumlah) || 0), 0);

    if (total > 0) {
      badge.textContent = total;
      badge.style.display = 'inline-block';
      icon.classList.add('fa-bounce');
    } else {
      badge.style.display = 'none';
      badge.textContent = '';
      icon.classList.remove('fa-bounce');
    }

  } catch (e) {
    console.error("❌ Gagal memperbarui badge keranjang:", e.message);
  }
}





