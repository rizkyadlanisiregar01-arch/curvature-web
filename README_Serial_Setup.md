# Sistem Deteksi Kelengkungan dengan Load Cell

Sistem web untuk deteksi kelengkungan objek real-time menggunakan computer vision dan sensor berat load cell 5 ton via ESP32C3 Mini.

## 🔧 Hardware Requirements

### ESP32C3 Mini Setup
- **ESP32C3 Mini Development Board**
- **HX711 Load Cell Amplifier**
- **Load Cell 5 Ton** (dengan 4 kabel: Red, Black, White, Green)
- **Kabel jumper**
- **Breadboard** (opsional)

### Koneksi Hardware

```
ESP32C3 Mini    ->    HX711
3.3V           ->    VCC
GND            ->    GND
GPIO 2         ->    DT (Data)
GPIO 3         ->    SCK (Clock)

Load Cell      ->    HX711
Red (E+)       ->    E+
Black (E-)     ->    E-
White (A-)     ->    A-
Green (A+)     ->    A+
```

## 💻 Software Requirements

### Arduino IDE Setup
1. Install Arduino IDE 2.0+
2. Install ESP32 board package:
   - File → Preferences
   - Additional Board Manager URLs: `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

3. Install HX711 Library:
   - Tools → Manage Libraries
   - Search "HX711" by Bogdan Necula
   - Install library

### Browser Requirements
- **Chrome/Chromium 89+** atau **Edge 89+**
- Web Serial API harus diaktifkan
- HTTPS atau localhost untuk akses Web Serial API

## 🚀 Setup dan Penggunaan

### 1. Upload Program ke ESP32C3

1. Buka file `ESP32C3_LoadCell_HX711.ino` di Arduino IDE
2. Pilih board: Tools → Board → ESP32 Arduino → ESP32C3 Dev Module
3. Pilih port yang sesuai: Tools → Port → COMx (Windows) atau /dev/ttyUSBx (Linux)
4. Upload program ke ESP32C3

### 2. Kalibrasi Load Cell

1. Buka Serial Monitor (115200 baud)
2. Pastikan tidak ada beban di load cell
3. Kirim command `t` untuk tare (zero) scale
4. Untuk kalibrasi dengan berat diketahui:
   ```
   c                    // Mulai kalibrasi
   ok                   // Konfirmasi after removing weight
   10.5                 // Enter known weight in kg
   ```

### 3. Menjalankan Website

1. Buka browser Chrome/Edge
2. Buka file `index.html`
3. Atau jalankan local server:
   ```bash
   python -m http.server 8000
   # Akses: http://localhost:8000
   ```

### 4. Koneksi Serial di Website

1. Klik tombol **"Hubungkan Serial"**
2. Pilih port COM ESP32C3 dari dialog
3. Pastikan status berubah menjadi "Terhubung"
4. Data berat akan mulai muncul secara real-time

## 📊 Cara Penggunaan Sistem

### Step 1: Setup Kamera
1. Klik "Mulai Kamera"
2. Izinkan akses webcam

### Step 2: Pilih Warna Objek
1. Klik "Pilih Warna dari Video"
2. Klik pada objek yang ingin dideteksi kelengkungannya
3. Sesuaikan toleransi warna jika diperlukan

### Step 3: Koneksi Load Cell
1. Pastikan ESP32C3 terhubung via USB
2. Klik "Hubungkan Serial"
3. Pilih port COM yang sesuai

### Step 4: Kalibrasi Baseline
1. Posisikan objek dalam kondisi horizontal/datar
2. Klik "Kalibrasi Baseline"
3. Sistem akan menetapkan referensi horizontal

### Step 5: Monitoring Real-time
- Grafik akan menampilkan kelengkungan (mm) vs berat (kg)
- Data diupdate secara real-time
- Export data ke CSV jika diperlukan

## 🔧 Troubleshooting

### Load Cell Issues
```
Problem: Pembacaan tidak stabil
Solution: 
- Periksa koneksi kabel
- Pastikan load cell terpasang dengan benar
- Lakukan kalibrasi ulang

Problem: Nilai selalu 0
Solution:
- Periksa wiring HX711
- Pastikan power supply 3.3V stabil
- Reset ESP32C3
```

### Web Serial Issues
```
Problem: "Web Serial API tidak didukung"
Solution:
- Gunakan Chrome/Edge terbaru
- Akses via HTTPS atau localhost
- Enable experimental features jika perlu

Problem: Port tidak muncul
Solution:
- Install driver ESP32C3
- Restart browser
- Periksa Device Manager (Windows)
```

### Computer Vision Issues
```
Problem: Objek tidak terdeteksi
Solution:
- Pilih warna yang kontras dengan background
- Sesuaikan toleransi warna
- Pastikan pencahayaan yang cukup

Problem: Kelengkungan tidak akurat
Solution:
- Lakukan kalibrasi baseline dengan objek datar
- Pastikan kamera posisi stabil
- Sesuaikan sensitivitas deteksi
```

## 📈 Data Format

### Serial Data Format (ESP32C3 → Website)
```
WEIGHT:1234.56    // Format lengkap
W:1234.56         // Format pendek
1234.56           // Format minimal
```

### Export CSV Format
```
Waktu (detik),Kelengkungan (mm),Berat (kg)
0.0,0.00,0.00
0.1,0.15,125.50
0.2,0.32,250.75
...
```

## 🔐 Serial Commands (ESP32C3)

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `t` atau `tare` | Zero scale | `t` |
| `c` atau `calibrate` | Kalibrasi manual | `c` |
| `r` atau `reset` | Reset ke default | `r` |
| `cal:XXXX` | Set faktor kalibrasi | `cal:-7050` |
| `info` | Tampilkan info sistem | `info` |

## 🎯 Spesifikasi Teknis

### Load Cell 5 Ton
- **Kapasitas**: 5000 kg
- **Sensitivitas**: 1.0-2.0 mV/V
- **Akurasi**: ±0.02% FS
- **Material**: Alloy steel

### ESP32C3 Mini
- **CPU**: RISC-V single-core 160MHz
- **RAM**: 400KB SRAM
- **Flash**: 4MB
- **Connectivity**: USB-C, WiFi, Bluetooth LE

### Website Performance
- **Sampling Rate**: 10 Hz (configurable)
- **Data Points**: 100 max (rolling window)
- **Latency**: <100ms end-to-end
- **Accuracy**: Sub-millimeter (dependent on setup)

## 📝 Notes

1. **Kalibrasi** sangat penting untuk akurasi pembacaan berat
2. **Posisi load cell** harus stabil dan tidak bergerak
3. **Pencahayaan** mempengaruhi akurasi deteksi computer vision
4. **Browser compatibility** terbatas pada Chrome/Edge dengan Web Serial API
5. **USB connection** lebih stabil daripada WiFi untuk transfer data real-time

## 🆘 Support

Jika mengalami masalah:
1. Periksa wiring dan koneksi hardware
2. Pastikan driver ESP32C3 terinstall
3. Gunakan browser yang kompatibel
4. Periksa console browser untuk error messages
5. Test dengan Serial Monitor Arduino IDE terlebih dahulu

---

**Developed by AI Assistant - 2024**