<?php
// success.php - Handle redirect after successful payment
$referenceId = $_GET['ref'] ?? '';

// Optional: Verify payment status immediately
if (!empty($referenceId)) {
    // You can call iPaymu API to verify payment status
    // and update Firestore immediately if needed
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Payment Success</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore-compat.js"></script>
</head>
<body class="bg-green-50 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-check text-green-600 text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-gray-800 mb-2">Pembayaran Berhasil!</h1>
        <p class="text-gray-600 mb-4">Akun premium Anda sedang diaktifkan...</p>
        
        <div id="activationStatus" class="mb-4">
            <div class="flex items-center justify-center space-x-2 text-gray-600">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Mengaktifkan fitur premium</span>
            </div>
        </div>
        
        <button onclick="checkPremiumStatus()" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors mb-2">
            Cek Status
        </button>
        <br>
        <button onclick="window.close()" class="text-gray-600 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            Tutup Halaman
        </button>
    </div>

    <script>
        // Optional: Check premium status in real-time
        async function checkPremiumStatus() {
            // Implement Firebase check to verify user premium status
            console.log('Checking premium status...');
        }
        
        // Auto-check after 3 seconds
        setTimeout(() => {
            checkPremiumStatus();
        }, 3000);
    </script>
</body>
</html>