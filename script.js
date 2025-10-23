// Curvature Detection System - Main JavaScript File
class CurvatureDetector {
    constructor() {
        this.video = document.getElementById('videoInput');
        this.canvas = document.getElementById('canvasOutput');
        this.processCanvas = document.getElementById('processCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.processCtx = this.processCanvas.getContext('2d');
        
        // OpenCV variables
        this.src = null;
        this.dst = null;
        this.hsv = null;
        this.mask = null;
        
        // Calibration data
        this.isCalibrated = false;
        this.baselinePoints = [];
        this.baselineY = 0;
        
        // Detection parameters
        this.selectedColor = null;
        this.colorTolerance = 15;
        this.sensitivity = 5;
        this.showMask = true;
        this.colorPickerEnabled = false;
        
        // Chart data
        this.curvatureData = [];
        this.weightData = [];
        this.timeData = [];
        this.maxDataPoints = 100;
        this.startTime = Date.now();
        this.lastChartUpdate = 0;
        this.chartUpdateInterval = 100; // Update chart every 100ms
        
        // Serial communication
        this.serialPort = null;
        this.serialReader = null;
        this.serialWriter = null;
        this.isSerialConnected = false;
        this.currentWeight = 0;
        
        // Stream variables
        this.stream = null;
        this.isProcessing = false;
        this.animationId = null;
        this.chartUpdateTimer = null;
        
        this.initializeElements();
        this.initializeChart();
        this.bindEvents();
        this.waitForOpenCV();
    }

    initializeElements() {
        // Get UI elements
        this.startCameraBtn = document.getElementById('startCamera');
        this.calibrateBtn = document.getElementById('calibrate');
        this.resetCalibrationBtn = document.getElementById('resetCalibration');
        this.clearChartBtn = document.getElementById('clearChart');
        this.exportDataBtn = document.getElementById('exportData');
        this.enableColorPickerBtn = document.getElementById('enableColorPicker');
        
        // Serial elements
        this.connectSerialBtn = document.getElementById('connectSerial');
        this.disconnectSerialBtn = document.getElementById('disconnectSerial');
        this.serialStatus = document.getElementById('serialStatus');
        this.weightValue = document.getElementById('weightValue');
        
        // Color picker elements
        this.selectedColorDisplay = document.getElementById('selectedColor');
        this.colorValuesDisplay = document.getElementById('colorValues');
        this.colorToleranceSlider = document.getElementById('colorTolerance');
        this.sensitivitySlider = document.getElementById('sensitivity');
        this.showMaskCheckbox = document.getElementById('showMask');
        
        // Status elements
        this.cameraStatus = document.getElementById('cameraStatus');
        this.calibrationStatus = document.getElementById('calibrationStatus');
        this.colorSelectedStatus = document.getElementById('colorSelectedStatus');
        this.objectStatus = document.getElementById('objectStatus');
        this.curvatureValue = document.getElementById('curvatureValue');
        this.serialPortStatus = document.getElementById('serialPortStatus');
        this.loadCellValue = document.getElementById('loadCellValue');
    }

    waitForOpenCV() {
        if (typeof cv !== 'undefined' && cv.Mat) {
            console.log('OpenCV.js loaded successfully');
            this.initializeOpenCV();
        } else {
            console.log('Waiting for OpenCV.js to load...');
            setTimeout(() => this.waitForOpenCV(), 100);
        }
    }

    initializeOpenCV() {
        // Initialize OpenCV matrices with default size (will be resized when video loads)
        this.src = new cv.Mat(480, 640, cv.CV_8UC4);
        this.dst = new cv.Mat(480, 640, cv.CV_8UC4);
        this.hsv = new cv.Mat(480, 640, cv.CV_8UC3);
        this.mask = new cv.Mat(480, 640, cv.CV_8UC1);
        console.log('OpenCV matrices initialized');
    }

    resizeOpenCVMatrices() {
        try {
            // Clean up existing matrices
            if (this.src) this.src.delete();
            if (this.dst) this.dst.delete();
            if (this.hsv) this.hsv.delete();
            if (this.mask) this.mask.delete();
            
            // Create new matrices with correct dimensions
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            this.src = new cv.Mat(height, width, cv.CV_8UC4);
            this.dst = new cv.Mat(height, width, cv.CV_8UC4);
            this.hsv = new cv.Mat(height, width, cv.CV_8UC3);
            this.mask = new cv.Mat(height, width, cv.CV_8UC1);
            
            console.log(`OpenCV matrices resized to ${width}x${height}`);
        } catch (error) {
            console.error('Error resizing OpenCV matrices:', error);
        }
    }

    initializeChart() {
        const ctx = document.getElementById('curvatureChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.timeData,
                datasets: [{
                    label: 'Kelengkungan (mm)',
                    data: this.curvatureData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    yAxisID: 'y'
                }, {
                    label: 'Berat (kg)',
                    data: this.weightData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f8fafc',
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Waktu (detik)',
                            color: '#cbd5e1',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.2)',
                            lineWidth: 1
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Kelengkungan (mm)',
                            color: '#3b82f6',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#3b82f6',
                            callback: function(value) {
                                return value.toFixed(1) + ' mm';
                            }
                        },
                        grid: {
                            color: 'rgba(59, 130, 246, 0.1)',
                            lineWidth: 1
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Berat (kg)',
                            color: '#10b981',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: '#10b981',
                            callback: function(value) {
                                return value.toFixed(2) + ' kg';
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(16, 185, 129, 0.1)',
                            lineWidth: 1
                        }
                    }
                },
                animation: {
                    duration: 250,
                    easing: 'easeInOutQuart'
                },
                elements: {
                    line: {
                        borderJoinStyle: 'round'
                    },
                    point: {
                        hoverBorderWidth: 3
                    }
                }
            }
        });
        
        console.log('Chart initialized successfully');
    }

    bindEvents() {
        // Camera controls
        this.startCameraBtn.addEventListener('click', () => this.toggleCamera());
        this.calibrateBtn.addEventListener('click', () => this.calibrateBaseline());
        this.resetCalibrationBtn.addEventListener('click', () => this.resetCalibration());
        
        // Chart controls
        this.clearChartBtn.addEventListener('click', () => this.clearChartData());
        this.exportDataBtn.addEventListener('click', () => this.exportData());
        
        // Serial controls
        this.connectSerialBtn.addEventListener('click', () => this.connectSerial());
        this.disconnectSerialBtn.addEventListener('click', () => this.disconnectSerial());
        
        // Add test data for debugging (remove in production)
        setTimeout(() => {
            if (this.curvatureData.length === 0) {
                console.log('Adding test data to chart...');
                this.addTestData();
            }
        }, 2000);
        
        // Color picker controls
        this.enableColorPickerBtn.addEventListener('click', () => this.toggleColorPicker());
        
        // Canvas click event for color picking - multiple events for better compatibility
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('pointerdown', (e) => this.handleCanvasClick(e));
        
        // Add test click event to video container
        this.video.addEventListener('click', (e) => {
            console.log('Video clicked - this should not happen if canvas is on top');
            if (this.colorPickerEnabled) {
                e.preventDefault();
                e.stopPropagation();
                // Forward to canvas click handler
                this.handleCanvasClick(e);
            }
        });
        
        // Slider events
        this.colorToleranceSlider.addEventListener('input', (e) => {
            this.colorTolerance = parseInt(e.target.value);
            this.updateSliderValue('colorTolerance', this.colorTolerance);
        });
        
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.sensitivity = parseInt(e.target.value);
            this.updateSliderValue('sensitivity', this.sensitivity);
        });
        
        // Checkbox events
        this.showMaskCheckbox.addEventListener('change', (e) => {
            this.showMask = e.target.checked;
        });
    }

    updateSliderValue(sliderId, value) {
        const slider = document.querySelector(`#${sliderId}`).parentElement.querySelector('.slider-value');
        if (slider) slider.textContent = value;
    }

    toggleColorPicker() {
        if (!this.stream) {
            alert('Mohon nyalakan kamera terlebih dahulu');
            return;
        }
        
        this.colorPickerEnabled = !this.colorPickerEnabled;
        
        console.log('Color picker toggled:', this.colorPickerEnabled);
        
        if (this.colorPickerEnabled) {
            this.enableColorPickerBtn.innerHTML = '<span class="icon">❌</span>Batal Pilih Warna';
            this.enableColorPickerBtn.classList.add('btn-warning');
            this.enableColorPickerBtn.classList.remove('btn-primary');
            this.canvas.classList.add('color-picker-active');
            this.colorValuesDisplay.textContent = 'Klik pada objek di video untuk memilih warna';
            
            // Ensure canvas is on top and clickable
            this.canvas.style.zIndex = '10';
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.position = 'absolute';
            
            // Add visual indicator
            this.canvas.style.border = '2px solid #00ff00';
            
            console.log('Color picker activated - canvas should be clickable now');
            console.log('Canvas style:', {
                zIndex: this.canvas.style.zIndex,
                pointerEvents: this.canvas.style.pointerEvents,
                position: this.canvas.style.position
            });
        } else {
            this.enableColorPickerBtn.innerHTML = '<span class="icon">🎯</span>Pilih Warna dari Video';
            this.enableColorPickerBtn.classList.add('btn-primary');
            this.enableColorPickerBtn.classList.remove('btn-warning');
            this.canvas.classList.remove('color-picker-active');
            this.canvas.style.zIndex = '';
            this.canvas.style.border = '';
            
            if (!this.selectedColor) {
                this.colorValuesDisplay.textContent = 'Klik pada objek untuk memilih warna';
            }
        }
    }

    handleCanvasClick(event) {
        console.log('Canvas clicked, colorPickerEnabled:', this.colorPickerEnabled, 'stream:', !!this.stream);
        console.log('Event type:', event.type, 'Event target:', event.target.id);
        
        if (!this.colorPickerEnabled || !this.stream) {
            console.log('Color picker not enabled or no stream');
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Handle different event types (mouse, touch, pointer)
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            // Touch event
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            // Mouse or pointer event
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor((clientX - rect.left) * scaleX);
        const y = Math.floor((clientY - rect.top) * scaleY);
        
        console.log(`Click coordinates: (${x}, ${y}), Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        
        try {
            // First, ensure we have the latest video frame on the canvas
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get pixel color from the updated canvas
            const imageData = this.ctx.getImageData(x, y, 1, 1);
            const pixel = imageData.data;
            
            console.log('Pixel data at', x, y, ':', pixel);
            
            // Validate pixel data
            if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0) {
                console.log('Black/transparent pixel detected, trying alternative method');
                
                // Alternative: get from video element directly
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = this.video.videoWidth;
                tempCanvas.height = this.video.videoHeight;
                tempCtx.drawImage(this.video, 0, 0);
                
                // Scale coordinates to video resolution
                const videoX = Math.floor(x * (this.video.videoWidth / this.canvas.width));
                const videoY = Math.floor(y * (this.video.videoHeight / this.canvas.height));
                
                const videoImageData = tempCtx.getImageData(videoX, videoY, 1, 1);
                pixel[0] = videoImageData.data[0];
                pixel[1] = videoImageData.data[1];
                pixel[2] = videoImageData.data[2];
                pixel[3] = 255; // Set alpha to opaque
                
                console.log('Alternative pixel data:', pixel);
            }
            
            // Convert RGB to HSV
            const hsv = this.rgbToHsv(pixel[0], pixel[1], pixel[2]);
            
            this.selectedColor = {
                r: pixel[0],
                g: pixel[1],
                b: pixel[2],
                h: hsv.h,
                s: hsv.s,
                v: hsv.v
            };
            
            console.log('Selected color:', this.selectedColor);
            
            // Update UI
            this.selectedColorDisplay.style.backgroundColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            this.colorValuesDisplay.textContent = `RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]}) HSV(${hsv.h}, ${hsv.s}, ${hsv.v})`;
            
            // Update status
            this.updateColorSelectedStatus(true);
            
            // Disable color picker
            this.toggleColorPicker();
            
            // Visual feedback
            this.showColorPickFeedback(x, y);
            
        } catch (error) {
            console.error('Error picking color:', error);
            alert('Gagal mengambil warna. Coba lagi.');
        }
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        let s = max === 0 ? 0 : diff / max;
        let v = max;
        
        if (diff !== 0) {
            switch (max) {
                case r:
                    h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / diff + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / diff + 4) / 6;
                    break;
            }
        }
        
        return {
            h: Math.round(h * 179), // OpenCV uses 0-179 for hue
            s: Math.round(s * 255),
            v: Math.round(v * 255)
        };
    }

    showColorPickFeedback(x, y) {
        // Show visual feedback at click position
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Copy current canvas
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Draw crosshair at click position
        tempCtx.strokeStyle = '#00ff00';
        tempCtx.lineWidth = 2;
        tempCtx.beginPath();
        tempCtx.moveTo(x - 10, y);
        tempCtx.lineTo(x + 10, y);
        tempCtx.moveTo(x, y - 10);
        tempCtx.lineTo(x, y + 10);
        tempCtx.stroke();
        
        // Draw circle around point
        tempCtx.beginPath();
        tempCtx.arc(x, y, 5, 0, 2 * Math.PI);
        tempCtx.stroke();
        
        // Show feedback for 1 second
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        setTimeout(() => {
            // Redraw normal canvas after feedback
            if (this.isProcessing) {
                // Let the normal processing continue
            } else {
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            }
        }, 1000);
    }

    async toggleCamera() {
        if (this.stream) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: 640, 
                    height: 480,
                    facingMode: 'environment'
                }
            });
            
            this.video.srcObject = this.stream;
            this.video.play();
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.processCanvas.width = this.video.videoWidth;
                this.processCanvas.height = this.video.videoHeight;
                
                // Resize OpenCV matrices to match video dimensions
                this.resizeOpenCVMatrices();
                
                this.updateCameraStatus('online');
                this.startCameraBtn.innerHTML = '<span class="icon">⏹️</span>Stop Kamera';
                this.calibrateBtn.disabled = false;
                
                this.startProcessing();
            });
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Error mengakses kamera: ' + error.message);
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.stopProcessing();
        
        // Reset color picker state
        if (this.colorPickerEnabled) {
            this.toggleColorPicker();
        }
        
        this.updateCameraStatus('offline');
        this.startCameraBtn.innerHTML = '<span class="icon">📹</span>Mulai Kamera';
        this.calibrateBtn.disabled = true;
        this.resetCalibrationBtn.disabled = true;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    startProcessing() {
        this.isProcessing = true;
        this.processFrame();
        
        // Start chart update timer for consistent updates
        this.chartUpdateTimer = setInterval(() => {
            if (this.curvatureData.length > 0) {
                this.updateChart();
            }
        }, 500); // Update every 500ms
        
        console.log('Processing and chart updates started');
    }

    stopProcessing() {
        this.isProcessing = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.chartUpdateTimer) {
            clearInterval(this.chartUpdateTimer);
            this.chartUpdateTimer = null;
        }
        
        console.log('Processing and chart updates stopped');
    }

    processFrame() {
        if (!this.isProcessing || !this.src) return;
        
        try {
            // Capture frame from video
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Check if dimensions match
            if (this.src.rows !== this.canvas.height || this.src.cols !== this.canvas.width) {
                console.warn('Matrix dimensions mismatch, resizing...');
                this.resizeOpenCVMatrices();
            }
            
            // Convert to OpenCV format safely
            if (imageData.data.length === this.src.data.length) {
                this.src.data.set(imageData.data);
                
                // Process the frame
                this.detectColoredObject();
            } else {
                console.warn(`Size mismatch: ImageData(${imageData.data.length}) vs Matrix(${this.src.data.length})`);
            }
            
        } catch (error) {
            console.error('Error processing frame:', error);
            // Try to recover by resizing matrices
            try {
                this.resizeOpenCVMatrices();
            } catch (resizeError) {
                console.error('Failed to resize matrices:', resizeError);
            }
        }
        
        this.animationId = requestAnimationFrame(() => this.processFrame());
    }

    detectColoredObject() {
        if (!this.selectedColor) {
            // Clear canvas and show message
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Pilih warna objek terlebih dahulu', 10, 30);
            return;
        }
        
        try {
            // Convert BGR to HSV
            cv.cvtColor(this.src, this.hsv, cv.COLOR_RGBA2RGB);
            cv.cvtColor(this.hsv, this.hsv, cv.COLOR_RGB2HSV);
            
            // Calculate color range based on selected color and tolerance
            const hueRange = this.colorTolerance;
            const satRange = Math.min(50, this.selectedColor.s);
            const valRange = Math.min(50, this.selectedColor.v);
            
            const hueMin = Math.max(0, this.selectedColor.h - hueRange);
            const hueMax = Math.min(179, this.selectedColor.h + hueRange);
            const satMin = Math.max(0, this.selectedColor.s - satRange);
            const valMin = Math.max(0, this.selectedColor.v - valRange);
            
            // Create mask for color detection
            const lowerBound = new cv.Mat(this.hsv.rows, this.hsv.cols, this.hsv.type(), [hueMin, satMin, valMin, 0]);
            const upperBound = new cv.Mat(this.hsv.rows, this.hsv.cols, this.hsv.type(), [hueMax, 255, 255, 255]);
            
            cv.inRange(this.hsv, lowerBound, upperBound, this.mask);
            
            // Morphological operations to clean up the mask
            const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
            cv.morphologyEx(this.mask, this.mask, cv.MORPH_OPEN, kernel);
            cv.morphologyEx(this.mask, this.mask, cv.MORPH_CLOSE, kernel);
            
            // Find contours
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(this.mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            let objectDetected = false;
            let curvature = 0;
            let largestContour = null;
            
            if (contours.size() > 0) {
                // Find the largest contour
                let maxArea = 0;
                let maxContourIndex = 0;
                
                for (let i = 0; i < contours.size(); i++) {
                    const area = cv.contourArea(contours.get(i));
                    if (area > maxArea) {
                        maxArea = area;
                        maxContourIndex = i;
                    }
                }
                
                if (maxArea > 1000) { // Minimum area threshold
                    objectDetected = true;
                    largestContour = contours.get(maxContourIndex);
                    
                    // Calculate curvature
                    curvature = this.calculateCurvature(largestContour);
                }
            }
            
            // Draw analysis with marking area
            this.drawAnalysisWithMask(largestContour, curvature);
            
            // Update status
            this.updateObjectStatus(objectDetected);
            this.updateCurvatureValue(curvature);
            
            // Add data point if calibrated (regardless of object detection for baseline)
            if (this.isCalibrated) {
                this.addDataPoint(curvature);
            } else if (this.selectedColor) {
                // Even without calibration, show some data for testing
                this.addDataPoint(Math.abs(curvature));
            }
            
            // Cleanup
            lowerBound.delete();
            upperBound.delete();
            kernel.delete();
            contours.delete();
            hierarchy.delete();
            
        } catch (error) {
            console.error('Error in object detection:', error);
        }
    }

    calculateCurvature(contour) {
        try {
            // Get bounding rectangle
            const rect = cv.boundingRect(contour);
            
            // Find points along the top edge of the object
            const topPoints = [];
            
            for (let i = 0; i < contour.data32S.length; i += 2) {
                const x = contour.data32S[i];
                const y = contour.data32S[i + 1];
                
                // Collect points near the top of the bounding rectangle
                if (y <= rect.y + rect.height * 0.3) {
                    topPoints.push({ x, y });
                }
            }
            
            if (topPoints.length < 3) return 0;
            
            // Sort points by x coordinate
            topPoints.sort((a, b) => a.x - b.x);
            
            if (!this.isCalibrated) return 0;
            
            // Calculate deviation from baseline
            let maxDeviation = 0;
            
            for (const point of topPoints) {
                const deviation = Math.abs(point.y - this.baselineY);
                maxDeviation = Math.max(maxDeviation, deviation);
            }
            
            // Convert pixels to approximate millimeters (assuming standard webcam distance)
            // This is a rough approximation and should be calibrated for specific setups
            const pixelToMM = 0.3; // Adjust based on your setup
            return maxDeviation * pixelToMM;
            
        } catch (error) {
            console.error('Error calculating curvature:', error);
            return 0;
        }
    }

    drawAnalysisWithMask(contour, curvature) {
        try {
            // Clear previous drawings
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Draw mask overlay if enabled and contour exists
            if (this.showMask && contour && this.mask) {
                // Create colored mask overlay
                const maskImageData = new ImageData(this.canvas.width, this.canvas.height);
                
                // Convert mask to RGBA
                for (let i = 0; i < this.mask.data.length; i++) {
                    const maskValue = this.mask.data[i];
                    const pixelIndex = i * 4;
                    
                    if (maskValue > 0) {
                        // Semi-transparent blue overlay for detected areas
                        maskImageData.data[pixelIndex] = 59;     // R
                        maskImageData.data[pixelIndex + 1] = 130; // G
                        maskImageData.data[pixelIndex + 2] = 246; // B
                        maskImageData.data[pixelIndex + 3] = 100; // A (transparency)
                    } else {
                        maskImageData.data[pixelIndex + 3] = 0; // Fully transparent
                    }
                }
                
                // Draw mask overlay
                this.ctx.putImageData(maskImageData, 0, 0);
            }
            
            // Draw contour if exists
            if (contour) {
                const points = [];
                for (let i = 0; i < contour.data32S.length; i += 2) {
                    points.push({
                        x: contour.data32S[i],
                        y: contour.data32S[i + 1]
                    });
                }
                
                if (points.length > 0) {
                    // Draw filled contour area
                    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.moveTo(points[0].x, points[0].y);
                    
                    for (let i = 1; i < points.length; i++) {
                        this.ctx.lineTo(points[i].x, points[i].y);
                    }
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Draw contour outline
                    this.ctx.strokeStyle = '#3b82f6';
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                    
                    // Draw bounding rectangle
                    const rect = cv.boundingRect(contour);
                    this.ctx.strokeStyle = '#10b981';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                    this.ctx.setLineDash([]);
                }
            }
            
            // Draw baseline if calibrated
            if (this.isCalibrated) {
                this.ctx.strokeStyle = '#10b981';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.baselineY);
                this.ctx.lineTo(this.canvas.width, this.baselineY);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Draw baseline label
                this.ctx.fillStyle = '#10b981';
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText('Baseline', 10, this.baselineY - 10);
            }
            
            // Draw info panel background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, 10, 300, 80);
            
            // Draw curvature info
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText(`Kelengkungan: ${curvature.toFixed(2)} mm`, 20, 35);
            
            // Draw selected color info
            if (this.selectedColor) {
                this.ctx.font = '14px Arial';
                this.ctx.fillText(`Warna Target: RGB(${this.selectedColor.r}, ${this.selectedColor.g}, ${this.selectedColor.b})`, 20, 55);
                this.ctx.fillText(`Toleransi: ${this.colorTolerance}`, 20, 75);
            }
            
        } catch (error) {
            console.error('Error drawing analysis:', error);
        }
    }

    calibrateBaseline() {
        if (!this.stream) {
            alert('Mohon nyalakan kamera terlebih dahulu');
            return;
        }
        
        if (!this.selectedColor) {
            alert('Mohon pilih warna objek terlebih dahulu');
            return;
        }
        
        try {
            // Capture current frame for baseline
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Ensure matrix size matches before setting data
            if (imageData.data.length === this.src.data.length) {
                this.src.data.set(imageData.data);
            } else {
                console.error('Size mismatch during calibration');
                return;
            }
            
            // Detect object for baseline using selected color
            cv.cvtColor(this.src, this.hsv, cv.COLOR_RGBA2RGB);
            cv.cvtColor(this.hsv, this.hsv, cv.COLOR_RGB2HSV);
            
            // Calculate color range based on selected color and tolerance
            const hueRange = this.colorTolerance;
            const satRange = Math.min(50, this.selectedColor.s);
            const valRange = Math.min(50, this.selectedColor.v);
            
            const hueMin = Math.max(0, this.selectedColor.h - hueRange);
            const hueMax = Math.min(179, this.selectedColor.h + hueRange);
            const satMin = Math.max(0, this.selectedColor.s - satRange);
            const valMin = Math.max(0, this.selectedColor.v - valRange);
            
            const lowerBound = new cv.Mat(this.hsv.rows, this.hsv.cols, this.hsv.type(), [hueMin, satMin, valMin, 0]);
            const upperBound = new cv.Mat(this.hsv.rows, this.hsv.cols, this.hsv.type(), [hueMax, 255, 255, 255]);
            
            cv.inRange(this.hsv, lowerBound, upperBound, this.mask);
            
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(this.mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            if (contours.size() > 0) {
                // Find largest contour
                let maxArea = 0;
                let maxContourIndex = 0;
                
                for (let i = 0; i < contours.size(); i++) {
                    const area = cv.contourArea(contours.get(i));
                    if (area > maxArea) {
                        maxArea = area;
                        maxContourIndex = i;
                    }
                }
                
                if (maxArea > 1000) {
                    const contour = contours.get(maxContourIndex);
                    const rect = cv.boundingRect(contour);
                    
                    // Set baseline as the top of the object
                    this.baselineY = rect.y + rect.height * 0.1;
                    this.isCalibrated = true;
                    
                    this.updateCalibrationStatus('calibrated');
                    this.resetCalibrationBtn.disabled = false;
                    
                    // Clear previous data and force chart update
                    this.clearChartData();
                    
                    // Force chart to be visible and responsive
                    setTimeout(() => {
                        this.chart.resize();
                        this.updateChart();
                    }, 100);
                    
                    alert('Kalibrasi berhasil! Sistem siap mendeteksi kelengkungan.');
                } else {
                    alert('Objek tidak terdeteksi dengan warna yang dipilih. Coba sesuaikan toleransi warna atau pilih warna lain.');
                }
            } else {
                alert('Objek tidak terdeteksi dengan warna yang dipilih. Coba sesuaikan toleransi warna atau pilih warna lain.');
            }
            
            // Cleanup
            lowerBound.delete();
            upperBound.delete();
            contours.delete();
            hierarchy.delete();
            
        } catch (error) {
            console.error('Error during calibration:', error);
            alert('Terjadi kesalahan saat kalibrasi: ' + error.message);
        }
    }

    resetCalibration() {
        this.isCalibrated = false;
        this.baselinePoints = [];
        this.baselineY = 0;
        
        this.updateCalibrationStatus('not-calibrated');
        this.resetCalibrationBtn.disabled = true;
        
        this.clearChartData();
        
        alert('Kalibrasi telah direset. Silakan lakukan kalibrasi ulang.');
    }

    addDataPoint(curvature) {
        const currentTime = (Date.now() - this.startTime) / 1000; // Convert to seconds
        const now = Date.now();
        
        // Add data points
        this.curvatureData.push(curvature);
        this.weightData.push(this.currentWeight);
        this.timeData.push(parseFloat(currentTime.toFixed(1)));
        
        // Limit data points
       // if (this.curvatureData.length > this.maxDataPoints) {
       //     this.curvatureData.shift();
       //     this.weightData.shift();
       //     this.timeData.shift();
       // }
        
        // Throttle chart updates for better performance
        if (now - this.lastChartUpdate >= this.chartUpdateInterval) {
            this.updateChart();
            this.lastChartUpdate = now;
        }
        
        // Debug logging every 50 data points
        if (this.curvatureData.length % 50 === 0) {
            console.log(`Data points: ${this.curvatureData.length}, Latest: ${curvature.toFixed(2)}mm, ${this.currentWeight.toFixed(2)}kg at ${currentTime.toFixed(1)}s`);
        }
    }

    updateChart() {
        if (!this.chart) {
            console.warn('Chart not initialized');
            return;
        }
        
        try {
            // Update chart data
            this.chart.data.labels = [...this.timeData];
            this.chart.data.datasets[0].data = [...this.curvatureData];
            this.chart.data.datasets[1].data = [...this.weightData];
            
            // Update chart with smooth animation
            this.chart.update('none');
            
            console.log(`Chart updated with ${this.curvatureData.length} data points`);
        } catch (error) {
            console.error('Error updating chart:', error);
        }
    }

    clearChartData() {
        this.curvatureData = [];
        this.weightData = [];
        this.timeData = [];
        this.startTime = Date.now();
        this.lastChartUpdate = 0;
        
        // Update chart
        this.updateChart();
        
        console.log('Chart data cleared');
    }

    addTestData() {
        console.log('Adding test data to verify chart functionality...');
        
        // Add some test data points
        for (let i = 0; i < 20; i++) {
            const testCurvature = Math.sin(i * 0.3) * 5 + Math.random() * 2;
            this.addDataPoint(testCurvature);
        }
        
        // Force chart update
        this.updateChart();
        
        console.log('Test data added successfully');
    }

    // Serial Communication Methods
    async connectSerial() {
        if (!navigator.serial) {
            alert('Web Serial API tidak didukung di browser ini. Gunakan Chrome/Edge terbaru.');
            return;
        }

        try {
            // Request serial port
            this.serialPort = await navigator.serial.requestPort();
            
            // Open the serial port
            await this.serialPort.open({ 
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });

            console.log('Serial port connected successfully');
            
            // Update UI
            this.isSerialConnected = true;
            this.updateSerialStatus('connected');
            this.connectSerialBtn.disabled = true;
            this.disconnectSerialBtn.disabled = false;
            this.serialStatus.textContent = 'Terhubung';

            // Start reading data
            this.startSerialReading();

        } catch (error) {
            console.error('Error connecting to serial port:', error);
            alert('Gagal terhubung ke port serial: ' + error.message);
        }
    }

    async disconnectSerial() {
        try {
            if (this.serialReader) {
                this.serialReader.cancel();
                this.serialReader = null;
            }

            if (this.serialPort) {
                await this.serialPort.close();
                this.serialPort = null;
            }

            console.log('Serial port disconnected');
            
            // Update UI
            this.isSerialConnected = false;
            this.updateSerialStatus('disconnected');
            this.connectSerialBtn.disabled = false;
            this.disconnectSerialBtn.disabled = true;
            this.serialStatus.textContent = 'Tidak Terhubung';
            this.currentWeight = 0;
            this.updateWeightDisplay(0);

        } catch (error) {
            console.error('Error disconnecting serial port:', error);
        }
    }

    async startSerialReading() {
        if (!this.serialPort) return;

        try {
            this.serialReader = this.serialPort.readable.getReader();
            let buffer = '';

            while (this.isSerialConnected) {
                const { value, done } = await this.serialReader.read();
                
                if (done) {
                    console.log('Serial reader done');
                    break;
                }

                // Convert Uint8Array to string
                const text = new TextDecoder().decode(value);
                buffer += text;

                // Process complete lines
                let lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (let line of lines) {
                    line = line.trim();
                    if (line) {
                        this.processSerialData(line);
                    }
                }
            }

        } catch (error) {
            console.error('Error reading serial data:', error);
            if (error.name !== 'NetworkError') {
                alert('Error membaca data serial: ' + error.message);
            }
        } finally {
            if (this.serialReader) {
                this.serialReader.releaseLock();
                this.serialReader = null;
            }
        }
    }

    processSerialData(data) {
        try {
            // Expected format: "WEIGHT:1234.56" or just "1234.56"
            let weight = 0;
            
            if (data.startsWith('WEIGHT:')) {
                weight = parseFloat(data.substring(7));
            } else if (data.startsWith('W:')) {
                weight = parseFloat(data.substring(2));
            } else {
                // Try to parse as direct number
                weight = parseFloat(data);
            }

            if (!isNaN(weight)) {
                this.currentWeight = weight;
                this.updateWeightDisplay(weight);
                
                console.log(`Received weight: ${weight} kg`);
            } else {
                console.warn('Invalid weight data received:', data);
            }

        } catch (error) {
            console.error('Error processing serial data:', error);
        }
    }

    // Status update methods for serial
    updateSerialStatus(status) {
        this.serialPortStatus.textContent = status === 'connected' ? 'Online' : 'Offline';
        this.serialPortStatus.className = `status-value ${status === 'connected' ? 'online' : 'offline'}`;
    }

    updateWeightDisplay(weight) {
        this.weightValue.textContent = `${weight.toFixed(2)} kg`;
        this.loadCellValue.textContent = `${weight.toFixed(2)} kg`;
        
        // Color coding based on weight
        if (weight > 1000) {
            this.loadCellValue.style.color = '#ef4444'; // Red for high weight
        } else if (weight > 500) {
            this.loadCellValue.style.color = '#f59e0b'; // Orange for medium weight
        } else {
            this.loadCellValue.style.color = '#10b981'; // Green for normal weight
        }
    }

    exportData() {
        if (this.curvatureData.length === 0) {
            alert('Tidak ada data untuk diekspor');
            return;
        }
        
        const csvContent = 'Waktu (detik),Kelengkungan (mm),Berat (kg)\n' +
            this.timeData.map((time, index) => 
                `${time},${this.curvatureData[index].toFixed(2)},${this.weightData[index].toFixed(2)}`
            ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.style.display = 'none';
        a.href = url;
        a.download = `curvature_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Status update methods
    updateCameraStatus(status) {
        this.cameraStatus.textContent = status === 'online' ? 'Online' : 'Offline';
        this.cameraStatus.className = `status-value ${status}`;
    }

    updateCalibrationStatus(status) {
        this.calibrationStatus.textContent = status === 'calibrated' ? 'Dikalibrasi' : 'Belum Dikalibrasi';
        this.calibrationStatus.className = `status-value ${status}`;
    }

    updateColorSelectedStatus(selected) {
        this.colorSelectedStatus.textContent = selected ? 'Dipilih' : 'Belum Dipilih';
        this.colorSelectedStatus.className = `status-value ${selected ? 'detected' : 'not-detected'}`;
    }

    updateObjectStatus(detected) {
        this.objectStatus.textContent = detected ? 'Terdeteksi' : 'Tidak Terdeteksi';
        this.objectStatus.className = `status-value ${detected ? 'detected' : 'not-detected'}`;
    }

    updateCurvatureValue(value) {
        this.curvatureValue.textContent = `${value.toFixed(2)} mm`;
        
        // Color coding based on curvature level
        if (value > 10) {
            this.curvatureValue.style.color = '#ef4444'; // Red for high curvature
        } else if (value > 5) {
            this.curvatureValue.style.color = '#f59e0b'; // Orange for medium curvature
        } else {
            this.curvatureValue.style.color = '#10b981'; // Green for low curvature
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Curvature Detection System...');
    window.curvatureDetector = new CurvatureDetector();
});

// Handle page unload to clean up resources
window.addEventListener('beforeunload', () => {
    if (window.curvatureDetector) {
        window.curvatureDetector.stopCamera();
        
        // Clean up serial connection
        try {
            if (window.curvatureDetector.isSerialConnected) {
                window.curvatureDetector.disconnectSerial();
            }
        } catch (error) {
            console.log('Serial cleanup error:', error);
        }
        
        // Clean up OpenCV matrices
        try {
            if (window.curvatureDetector.src) window.curvatureDetector.src.delete();
            if (window.curvatureDetector.dst) window.curvatureDetector.dst.delete();
            if (window.curvatureDetector.hsv) window.curvatureDetector.hsv.delete();
            if (window.curvatureDetector.mask) window.curvatureDetector.mask.delete();
        } catch (error) {
            console.log('Cleanup error:', error);
        }
    }
});