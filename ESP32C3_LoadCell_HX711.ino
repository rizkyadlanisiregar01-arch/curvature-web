/*
  ESP32C3 Mini Load Cell dengan HX711
  Program untuk membaca data dari load cell 5 ton menggunakan sensor HX711
  dan mengirimkan data melalui Serial ke website
  
  Hardware Requirements:
  - ESP32C3 Mini
  - HX711 Load Cell Amplifier
  - Load Cell 5 ton
  
  Connections:
  HX711 VCC -> 3.3V
  HX711 GND -> GND
  HX711 DT  -> GPIO 2
  HX711 SCK -> GPIO 3
  
  Load Cell:
  Red    (E+) -> HX711 E+
  Black  (E-) -> HX711 E-
  White  (A-) -> HX711 A-
  Green  (A+) -> HX711 A+
  
  Author: AI Assistant
  Date: 2024
*/

#include "HX711.h"

// HX711 circuit wiring
const int LOADCELL_DOUT_PIN = 4;  // GPIO 2
const int LOADCELL_SCK_PIN = 5;   // GPIO 3

HX711 scale;

// Kalibrasi parameters (sesuaikan dengan load cell Anda)
float calibration_factor = -1300.43; // Faktor kalibrasi untuk load cell 5 ton
float zero_factor = 0;              // Offset untuk zeroing

// Timing variables
unsigned long lastReading = 0;
const unsigned long readingInterval = 100; // Baca setiap 100ms (10 Hz)

// Data filtering
const int numReadings = 5;
float readings[numReadings];
int readIndex = 0;
float total = 0;
float average = 0;

void setup() {
  // Initialize Serial communication
  Serial.begin(115200);
  
  // Wait for serial port to connect
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("ESP32C3 Load Cell System Starting...");
  
  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Check if HX711 is ready
  if (scale.is_ready()) {
    Serial.println("HX711 initialized successfully");
  } else {
    Serial.println("HX711 not found. Check wiring!");
    while(1); // Stop here if HX711 not found
  }
  
  // Set calibration factor
  scale.set_scale(calibration_factor);
  
  // Initialize reading array
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }
  
  // Tare the scale (zero it)
  Serial.println("Zeroing scale...");
  scale.tare(); // Reset scale to 0
  zero_factor = scale.read_average();
  
  Serial.println("Scale ready!");
  Serial.println("Commands:");
  Serial.println("  t - Tare (zero) the scale");
  Serial.println("  c - Calibrate with known weight");
  Serial.println("  r - Reset to defaults");
  Serial.println();
  
  delay(1000);
}

void loop() {
  // Check for serial commands
  if (Serial.available()) {
    handleSerialCommand();
  }
  
  // Read weight at specified interval
  if (millis() - lastReading >= readingInterval) {
    readAndSendWeight();
    lastReading = millis();
  }
  
  // Small delay to prevent watchdog reset
  delay(1);
}

void readAndSendWeight() {
  if (scale.is_ready()) {
    // Read raw weight
    float rawWeight = scale.get_units(1); // Average of 1 reading for speed
    
    // Apply moving average filter
    total = total - readings[readIndex];
    readings[readIndex] = rawWeight;
    total = total + readings[readIndex];
    readIndex = (readIndex + 1) % numReadings;
    average = total / numReadings;
    
    // Convert to kg and ensure positive values for display
    float weightKg = abs(average);
    
    // Send data in multiple formats for compatibility
    Serial.print("WEIGHT:");
    Serial.println(weightKg, 2);
    
    // Alternative format
    Serial.print("W:");
    Serial.println(weightKg, 2);
    
    // Simple format (just the number)
    Serial.println(weightKg, 2);
    
  } else {
    Serial.println("ERROR:HX711_NOT_READY");
  }
}

void handleSerialCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toLowerCase();
  
  if (command == "t" || command == "tare") {
    // Tare the scale
    Serial.println("Taring scale...");
    scale.tare();
    Serial.println("Scale tared (zeroed)");
    
  } else if (command == "c" || command == "calibrate") {
    // Calibration procedure
    calibrateScale();
    
  } else if (command == "r" || command == "reset") {
    // Reset to defaults
    Serial.println("Resetting to defaults...");
    calibration_factor = -7050.0;
    scale.set_scale(calibration_factor);
    scale.tare();
    Serial.println("Reset complete");
    
  } else if (command.startsWith("cal:")) {
    // Set calibration factor directly
    float newCal = command.substring(4).toFloat();
    if (newCal != 0) {
      calibration_factor = newCal;
      scale.set_scale(calibration_factor);
      Serial.print("Calibration factor set to: ");
      Serial.println(calibration_factor);
    }
    
  } else if (command == "info") {
    // Display system info
    printSystemInfo();
  }
}

void calibrateScale() {
  Serial.println("=== CALIBRATION PROCEDURE ===");
  Serial.println("1. Remove all weight from the scale");
  Serial.println("2. Send 'ok' when ready");
  
  // Wait for user confirmation
  while (!Serial.available()) {
    delay(100);
  }
  String response = Serial.readStringUntil('\n');
  
  if (response.indexOf("ok") >= 0) {
    // Tare the scale
    Serial.println("Taring scale...");
    scale.tare();
    
    Serial.println("3. Place a known weight on the scale");
    Serial.println("4. Enter the weight in kg (e.g., 10.5)");
    
    // Wait for weight input
    while (!Serial.available()) {
      delay(100);
    }
    
    float knownWeight = Serial.parseFloat();
    
    if (knownWeight > 0) {
      // Read the raw value
      float rawReading = scale.get_units(10); // Average of 10 readings
      
      // Calculate new calibration factor
      calibration_factor = rawReading / knownWeight;
      scale.set_scale(calibration_factor);
      
      Serial.print("New calibration factor: ");
      Serial.println(calibration_factor);
      Serial.println("Calibration complete!");
      
      // Test the calibration
      delay(1000);
      float testWeight = scale.get_units(5);
      Serial.print("Test reading: ");
      Serial.print(testWeight, 2);
      Serial.println(" kg");
      
    } else {
      Serial.println("Invalid weight entered. Calibration cancelled.");
    }
  } else {
    Serial.println("Calibration cancelled.");
  }
}

void printSystemInfo() {
  Serial.println("=== SYSTEM INFORMATION ===");
  Serial.print("ESP32 Chip Model: ");
  Serial.println(ESP.getChipModel());
  Serial.print("Chip Revision: ");
  Serial.println(ESP.getChipRevision());
  Serial.print("CPU Frequency: ");
  Serial.print(ESP.getCpuFreqMHz());
  Serial.println(" MHz");
  Serial.print("Flash Size: ");
  Serial.print(ESP.getFlashChipSize() / 1024 / 1024);
  Serial.println(" MB");
  Serial.print("Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.print("Calibration Factor: ");
  Serial.println(calibration_factor);
  Serial.print("Zero Factor: ");
  Serial.println(zero_factor);
  Serial.print("HX711 Status: ");
  Serial.println(scale.is_ready() ? "Ready" : "Not Ready");
  Serial.println("========================");
}

// Optional: Function to handle deep sleep for battery operation
void enterDeepSleep(int seconds) {
  Serial.print("Entering deep sleep for ");
  Serial.print(seconds);
  Serial.println(" seconds...");
  
  ESP.deepSleep(seconds * 1000000); // Convert to microseconds
}

// Optional: Function for WiFi connectivity (uncomment if needed)
/*
#include <WiFi.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("Connected! IP address: ");
  Serial.println(WiFi.localIP());
}
*/

/*
  CATATAN KALIBRASI:
  
  1. Faktor kalibrasi (-7050.0) adalah contoh untuk load cell 5 ton
     Anda perlu menyesuaikan dengan load cell spesifik Anda
  
  2. Untuk kalibrasi manual:
     - Letakkan beban yang diketahui (misal 10 kg)
     - Kirim command 'c' melalui serial monitor
     - Ikuti instruksi kalibrasi
  
  3. Untuk kalibrasi cepat:
     - Kirim "cal:XXXX" dimana XXXX adalah faktor kalibrasi
  
  4. Load cell 5 ton biasanya memiliki sensitivitas 1-2 mV/V
     Sesuaikan faktor kalibrasi berdasarkan hasil pengujian
  
  5. Pastikan koneksi yang baik antara load cell dan HX711
     Koneksi yang buruk dapat menyebabkan pembacaan yang tidak stabil
*/