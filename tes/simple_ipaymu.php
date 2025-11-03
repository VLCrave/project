<?php
// simple_ipaymu.php - Backend untuk iPaymu
header('Content-Type: application/json');

// Ambil data dari POST
$product = $_POST['product'] ?? 'VLFinance Premium Membership';
$amount = $_POST['amount'] ?? 49000;
$paymentMethod = $_POST['paymentMethod'] ?? 'qris';
$name = $_POST['name'] ?? 'Customer';
$email = $_POST['email'] ?? 'customer@example.com';
$phone = $_POST['phone'] ?? '08123456789';
$userId = $_POST['userId'] ?? 'unknown';

// Log untuk debugging
file_put_contents('payment_log.txt', 
    date('Y-m-d H:i:s') . " - Payment Request: " . json_encode($_POST) . "\n", 
    FILE_APPEND
);

// iPaymu Configuration
$va = '1179002181670112';
$apiKey = '3D535899-D600-4CE7-AFC9-BCC85348137F';
$url = 'https://sandbox.ipaymu.com/api/v2/payment'; // Sandbox
// $url = 'https://my.ipaymu.com/api/v2/payment'; // Production

try {
    $referenceId = 'VLF-' . time() . '-' . $userId;
    
    $body = [
        'product' => [$product],
        'qty' => [1],
        'price' => [$amount],
        'amount' => $amount,
        'returnUrl' => 'https://vlcrave.github.io/project/tes/success.html?ref=' . $referenceId,
        'cancelUrl' => 'https://vlcrave.github.io/project/tes/cancel.html?ref=' . $referenceId,
        'notifyUrl' => 'https://vlcrave.github.io/project/tes/ipaymu_callback.php',
        'referenceId' => $referenceId,
        'paymentMethod' => $paymentMethod,
        'buyerName' => $name,
        'buyerPhone' => $phone,
        'buyerEmail' => $email
    ];

    // Generate signature
    $jsonBody = json_encode($body, JSON_UNESCAPED_SLASHES);
    $requestBody = strtolower(hash('sha256', $jsonBody));
    $stringToSign = 'POST:' . $va . ':' . $requestBody . ':' . $apiKey;
    $signature = hash_hmac('sha256', $stringToSign, $apiKey);

    $headers = [
        'Content-Type: application/json',
        'va: ' . $va,
        'signature: ' . $signature,
        'timestamp: ' . date('YmdHis')
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Log response
    file_put_contents('payment_log.txt', 
        date('Y-m-d H:i:s') . " - iPaymu Response: " . $response . " - HTTP: " . $httpCode . "\n", 
        FILE_APPEND
    );

    if ($curlError) {
        throw new Exception('cURL Error: ' . $curlError);
    }

    $result = json_decode($response, true);
    
    if (isset($result['Data']['Url'])) {
        echo json_encode([
            'success' => true,
            'redirectUrl' => $result['Data']['Url'],
            'sessionId' => $result['Data']['SessionID'],
            'reference' => $referenceId
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $result['Message'] ?? 'Payment creation failed',
            'debug' => $result
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
