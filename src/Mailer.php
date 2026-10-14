<?php
// src/Mailer.php
// Cliente de Resend API (HTTP REST con cURL)

class Mailer {
    
    public function sendHtml(string $to, string $subject, string $html): bool {
        if (!defined('RESEND_API_KEY')) {
            error_log('Error: RESEND_API_KEY no está definida en config.php');
            return false;
        }

        $url = 'https://api.resend.com/emails';
        
        $payload = [
            'from' => RESEND_FROM_NAME . ' <' . RESEND_FROM_EMAIL . '>',
            'to' => [$to],
            'subject' => $subject,
            'html' => $html,
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . RESEND_API_KEY,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            error_log('Resend cURL error: ' . $error);
            return false;
        }
        
        if ($httpCode !== 200) {
            error_log('Resend API error (HTTP ' . $httpCode . '): ' . $response);
            return false;
        }
        
        return true;
    }
}