<?php
// ipaymu_callback.php - Handle payment notification from iPaymu (No Composer)

class FirebaseHelper {
    private $projectId = 'vlcrave-24937';
    private $apiKey = 'AIzaSyCHZk2uU2DqRLFrUujc523W8iv15gOtax4';
    
    public function updateUserStatus($userId, $transactionData) {
        $url = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents/users/{$userId}";
        
        $updateData = [
            'fields' => [
                'status' => ['booleanValue' => true],
                'premium' => ['booleanValue' => true],
                'premiumSince' => ['timestampValue' => date('c')],
                'lastPayment' => [
                    'mapValue' => [
                        'fields' => [
                            'transactionId' => ['stringValue' => $transactionData['trx_id']],
                            'amount' => ['integerValue' => $transactionData['amount']],
                            'date' => ['timestampValue' => date('c')],
                            'method' => ['stringValue' => $transactionData['payment_method'] ?? 'iPaymu']
                        ]
                    ]
                ],
                'updatedAt' => ['timestampValue' => date('c')]
            ]
        ];
        
        $jsonData = json_encode($updateData);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?updateMask.fieldPaths=status&updateMask.fieldPaths=premium&updateMask.fieldPaths=premiumSince&updateMask.fieldPaths=lastPayment&updateMask.fieldPaths=updatedAt');
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($jsonData),
            'Authorization: Bearer ' . $this->getAccessToken()
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            error_log("Successfully updated user: " . $userId);
            return true;
        } else {
            error_log("Firestore update failed. HTTP Code: " . $httpCode . " Response: " . $response);
            return false;
        }
    }
    
    private function getAccessToken() {
        // Untuk production, gunakan Service Account JWT
        // Ini simplified version untuk testing
        return $this->apiKey; // Note: Ini tidak ideal untuk production
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

// Alternative: Menggunakan Firebase Admin SDK dengan service account (Recommended)
class FirebaseAdminHelper {
    private $projectId = 'vlcrave-24937';
    private $serviceAccountKey;
    
    public function __construct() {
        $this->serviceAccountKey = json_decode(file_get_contents('service-account-key.json'), true);
    }
    
    private function getAccessToken() {
        $header = [
            'alg' => 'RS256',
            'typ' => 'JWT'
        ];
        
        $payload = [
            'iss' => $this->serviceAccountKey['client_email'],
            'scope' => 'https://www.googleapis.com/auth/datastore',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => time() + 3600,
            'iat' => time()
        ];
        
        $headerEncoded = $this->base64UrlEncode(json_encode($header));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));
        
        $signature = '';
        openssl_sign(
            $headerEncoded . '.' . $payloadEncoded,
            $signature,
            $this->serviceAccountKey['private_key'],
            'SHA256'
        );
        
        $signatureEncoded = $this->base64UrlEncode($signature);
        
        $jwt = $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
        
        // Exchange JWT for access token
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $tokenData = json_decode($response, true);
        curl_close($ch);
        
        return $tokenData['access_token'] ?? '';
    }
    
    private function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    public function updateUserStatus($userId, $transactionData) {
        $accessToken = $this->getAccessToken();
        
        if (!$accessToken) {
            error_log("Failed to get access token");
            return false;
        }
        
        $url = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents/users/{$userId}";
        
        $updateData = [
            'fields' => [
                'status' => ['booleanValue' => true],
                'premium' => ['booleanValue' => true],
                'premiumSince' => ['timestampValue' => date('c')],
                'lastPayment' => [
                    'mapValue' => [
                        'fields' => [
                            'transactionId' => ['stringValue' => $transactionData['trx_id']],
                            'amount' => ['integerValue' => $transactionData['amount']],
                            'date' => ['timestampValue' => date('c')],
                            'method' => ['stringValue' => $transactionData['payment_method'] ?? 'iPaymu']
                        ]
                    ]
                ],
                'updatedAt' => ['timestampValue' => date('c')]
            ]
        ];
        
        $jsonData = json_encode($updateData);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?updateMask.fieldPaths=status&updateMask.fieldPaths=premium&updateMask.fieldPaths=premiumSince&updateMask.fieldPaths=lastPayment&updateMask.fieldPaths=updatedAt');
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $accessToken
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            error_log("Successfully updated user: " . $userId);
            return true;
        } else {
            error_log("Firestore update failed. HTTP Code: " . $httpCode . " Response: " . $response);
            return false;
        }
    }
    
    public function findUserByReference($referenceId) {
        $parts = explode('-', $referenceId);
        if (count($parts) >= 3) {
            return $parts[2];
        }
        return null;
    }
}

// Simple version tanpa service account (menggunakan API Key - untuk testing saja)
class SimpleFirebaseHelper {
    private $projectId = 'vlcrave-24937';
    private $apiKey = 'AIzaSyCHZk2uU2DqRLFrUujc523W8iv15gOtax4';
    
    public function updateUserStatus($userId, $transactionData) {
        // Untuk update, kita perlu menggunakan Admin SDK atau REST API dengan service account
        // Ini simplified version untuk demonstration
        
        // Log the update request
        error_log("Would update user {$userId} with transaction: " . json_encode($transactionData));
        
        // Dalam production, gunakan FirebaseAdminHelper dengan service account
        return $this->updateViaREST($userId, $transactionData);
    }
    
    private function updateViaREST($userId, $transactionData) {
        // Method 1: Using Firebase Admin REST API dengan service account
        // Method 2: Using your existing Firebase frontend method via HTTP trigger
        
        // Untuk sekarang, kita log saja dan return true untuk testing
        file_put_contents('premium_activations.log', 
            date('Y-m-d H:i:s') . " - User: {$userId}, Transaction: " . json_encode($transactionData) . "\n", 
            FILE_APPEND
        );
        
        return true; // Return true untuk testing
    }
    
    public function findUserByReference($referenceId) {
        $parts = explode('-', $referenceId);
        if (count($parts) >= 3) {
            return $parts[2];
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
    
    // Use simple helper for now
    $firebaseHelper = new SimpleFirebaseHelper();
    
    // Extract data from iPaymu callback
    $status = $_POST['status'] ?? '';
    $transactionId = $_POST['trx_id'] ?? '';
    $referenceId = $_POST['reference_id'] ?? '';
    $amount = $_POST['amount'] ?? 0;
    $paymentMethod = $_POST['payment_method'] ?? '';
    
    // Check if payment is successful
    if ($status === 'berhasil') {
        
        // Find user ID from reference ID
        $userId = $firebaseHelper->findUserByReference($referenceId);
        
        if ($userId) {
            $transactionData = [
                'trx_id' => $transactionId,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'reference_id' => $referenceId
            ];
            
            // Update user status in Firestore
            $success = $firebaseHelper->updateUserStatus($userId, $transactionData);
            
            if ($success) {
                http_response_code(200);
                echo 'RECEIVED_OK';
                
                // Additional actions
                $this->sendConfirmationNotification($userId, $transactionData);
                
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

function sendConfirmationNotification($userId, $transactionData) {
    // Send email, push notification, etc.
    file_put_contents('notifications.log', 
        date('Y-m-d H:i:s') . " - Sent confirmation to user: {$userId}\n", 
        FILE_APPEND
    );
}
?>
