<?php
// ipaymu_callback.php - Handle payment notification from iPaymu
require 'vendor/autoload.php'; // Jika menggunakan Composer

use Google\Cloud\Firestore\FirestoreClient;

class FirestoreHelper {
    private $firestore;
    
    public function __construct() {
        $this->firestore = new FirestoreClient([
            'keyFilePath' => 'path/to/your/service-account-key.json',
            'projectId' => 'your-firebase-project-id'
        ]);
    }
    
    public function activatePremiumUser($userId, $transactionData) {
        try {
            $userRef = $this->firestore->collection('users')->document($userId);
            
            $updateData = [
                'status' => true,
                'premium' => true,
                'premiumSince' => new \DateTime(),
                'lastPayment' => [
                    'transactionId' => $transactionData['trx_id'],
                    'amount' => $transactionData['amount'],
                    'date' => new \DateTime(),
                    'method' => $transactionData['payment_method'] ?? 'iPaymu'
                ],
                'updatedAt' => new \DateTime()
            ];
            
            $userRef->set($updateData, ['merge' => true]);
            
            // Log the activation
            error_log("Premium activated for user: " . $userId);
            return true;
            
        } catch (Exception $e) {
            error_log("Firestore update error: " . $e->getMessage());
            return false;
        }
    }
    
    public function findUserByReference($referenceId) {
        // Reference format: VLF-1234567890-userId
        $parts = explode('-', $referenceId);
        if (count($parts) >= 3) {
            return $parts[2]; // userId is the third part
        }
        return null;
    }
}

// Main callback handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Log incoming data
    file_put_contents('ipaymu_callback.log', 
        date('Y-m-d H:i:s') . " - " . json_encode($_POST) . "\n", 
        FILE_APPEND
    );
    
    $firestoreHelper = new FirestoreHelper();
    
    // Extract data from iPaymu callback
    $status = $_POST['status'] ?? '';
    $transactionId = $_POST['trx_id'] ?? '';
    $referenceId = $_POST['reference_id'] ?? '';
    $amount = $_POST['amount'] ?? 0;
    $paymentMethod = $_POST['payment_method'] ?? '';
    
    // Check if payment is successful
    if ($status === 'berhasil') {
        
        // Find user ID from reference ID
        $userId = $firestoreHelper->findUserByReference($referenceId);
        
        if ($userId) {
            $transactionData = [
                'trx_id' => $transactionId,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'reference_id' => $referenceId
            ];
            
            // Update user status in Firestore
            $success = $firestoreHelper->activatePremiumUser($userId, $transactionData);
            
            if ($success) {
                http_response_code(200);
                echo 'RECEIVED_OK';
                
                // Additional: Send email notification or other actions
                $this->sendPremiumActivationEmail($userId);
                
            } else {
                http_response_code(500);
                echo 'UPDATE_FAILED';
            }
        } else {
            http_response_code(400);
            echo 'USER_NOT_FOUND';
        }
    } else {
        // Payment failed or pending
        http_response_code(200);
        echo 'RECEIVED_NOT_SUCCESS';
    }
} else {
    http_response_code(405);
    echo 'METHOD_NOT_ALLOWED';
}

// Optional: Email notification function
function sendPremiumActivationEmail($userId) {
    // Implement your email sending logic here
    // You can fetch user email from Firestore and send confirmation
}
?>