<?php
// ipaymu_create.php - Backend untuk create payment
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

class IPaymuProcessor {
    private $va = '1179002181670112';
    private $apiKey = '3D535899-D600-4CE7-AFC9-BCC85348137F';
    private $url = 'https://sandbox.ipaymu.com/api/v2/payment'; // Sandbox
    // private $url = 'https://my.ipaymu.com/api/v2/payment'; // Production

    public function createPayment($data) {
        // Generate reference ID dengan format: VLF-timestamp-userId
        $referenceId = 'VLF-' . time() . '-' . ($data['userId'] ?? 'unknown');
        
        $body = [
            'product' => [$data['product']],
            'qty' => [1],
            'price' => [$data['amount']],
            'amount' => $data['amount'],
            'returnUrl' => 'https://vlcrave.github.io/vlfinance/success.php?ref=' . $referenceId,
            'cancelUrl' => 'https://vlcrave.github.io/vlfinance/cancel.php?ref=' . $referenceId,
            'notifyUrl' => 'https://vlcrave.github.io/vlfinance/ipaymu_callback.php',
            'referenceId' => $referenceId, // Include userId in reference
            'paymentMethod' => $data['paymentMethod'],
            'buyerName' => $data['name'],
            'buyerPhone' => $data['phone'],
            'buyerEmail' => $data['email']
        ];

        // Generate signature
        $jsonBody = json_encode($body, JSON_UNESCAPED_SLASHES);
        $requestBody = strtolower(hash('sha256', $jsonBody));
        $stringToSign = 'POST:' . $this->va . ':' . $requestBody . ':' . $this->apiKey;
        $signature = hash_hmac('sha256', $stringToSign, $this->apiKey);

        $headers = [
            'Content-Type: application/json',
            'va: ' . $this->va,
            'signature: ' . $signature,
            'timestamp: ' . date('YmdHis')
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return json_decode($response, true);
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $ipaymu = new IPaymuProcessor();
    $result = $ipaymu->createPayment($input);
    
    if (isset($result['Data']['Url'])) {
        echo json_encode([
            'success' => true,
            'redirectUrl' => $result['Data']['Url'],
            'sessionId' => $result['Data']['SessionID'],
            'reference' => $input['referenceId']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $result['Message'] ?? 'Unknown error from iPaymu'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed'
    ]);
}
?>