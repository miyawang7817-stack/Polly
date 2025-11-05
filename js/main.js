// DOM Elements
const uploadBox = document.getElementById('upload-box');
const fileInput = document.getElementById('file-input');
const uploadedImageContainer = document.getElementById('uploaded-image-container');
const uploadedImage = document.getElementById('uploaded-image');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const resetButton = document.getElementById('reset-button');
const generateButton = document.getElementById('generate-button');
const previewContainer = document.getElementById('preview-container');
const uploadClose = document.getElementById('upload-close');
const previewPlaceholder = document.getElementById('preview-placeholder');
const modelViewer = document.getElementById('model-viewer');
const previewControls = document.getElementById('preview-controls');
const solidModeBtn = document.getElementById('solid-view');
const wireframeModeBtn = document.getElementById('wireframe-view');
const resetViewBtn = document.getElementById('reset-view');
const downloadBtn = document.getElementById('download-button');
const modelInfo = document.getElementById('model-info');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const previewLoading = document.getElementById('preview-loading');
const previewLoadingText = document.getElementById('preview-loading-text');
const previewEstimateEl = document.getElementById('preview-estimate-seconds');
const debugPanel = document.getElementById('debug-panel');
const debugContent = document.getElementById('debug-content');
const isDebug = (new URLSearchParams(window.location.search).get('debug') === '1');
const isMock = (new URLSearchParams(window.location.search).get('mock') === '1');
// Show debug panel immediately when ?debug=1 is present
if (isDebug && debugPanel && debugContent) {
  debugPanel.style.display = 'block';
  debugContent.textContent = 'Debug mode is ON. Upload an image and click Generate to capture request details here.';
}

// Three.js variables
let scene, camera, renderer, controls, model, wireframeMaterial;
let imageData = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
uploadBox.addEventListener('dragover', handleDragOver);
uploadBox.addEventListener('dragleave', handleDragLeave);
uploadBox.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
resetButton.addEventListener('click', resetUpload);
generateButton.addEventListener('click', generate3DModel);
uploadClose && uploadClose.addEventListener('click', resetUpload);
 solidModeBtn && solidModeBtn.addEventListener('click', () => setModelMode('solid'));
 wireframeModeBtn && wireframeModeBtn.addEventListener('click', () => setModelMode('wireframe'));
 resetViewBtn && resetViewBtn.addEventListener('click', resetView);
 downloadBtn && downloadBtn.addEventListener('click', downloadModel);

// Initialize the application
function initApp() {
    // Initialize Three.js scene
    initThreeJS();
    // Default preview state when no model has been generated
    setPreviewState('default');
}

// File Upload Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('drag-over');
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (isValidImageFile(file)) {
            processImageFile(file);
        } else {
            showNotification('Please upload a valid image file (JPEG, PNG, or WebP).', 'error');
        }
    }
}

function handleFileSelect(e) {
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (isValidImageFile(file)) {
            processImageFile(file);
        } else {
            showNotification('Please upload a valid image file (JPEG, PNG, or WebP).', 'error');
        }
    }
}

function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
}

function processImageFile(file) {
    // Check image resolution
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = function() {
        if (img.width < 500 || img.height < 500) {
            if (confirm('Low resolution may affect model accuracy. Continue?')) {
                displayUploadedImage(objectUrl);
                // Convert image to base64 for API request
                const reader = new FileReader();
                reader.onload = (e) => {
                    imageData = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                URL.revokeObjectURL(objectUrl);
            }
        } else {
            displayUploadedImage(objectUrl);
            // Convert image to base64 for API request
            const reader = new FileReader();
            reader.onload = (e) => {
                imageData = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    
    img.src = objectUrl;
}

function displayUploadedImage(src) {
    uploadedImage.src = src;
    uploadedImageContainer.style.display = 'block';
    document.querySelector('.upload-placeholder').style.display = 'none';
    // 使用右上角关闭按钮，隐藏旧 Reset
    resetButton.style.display = 'none';
    generateButton.style.display = 'inline-block';
    // Update button copy after upload
    resetButton.textContent = 'Delete';
    generateButton.textContent = 'Generate';
}

function resetUpload() {
    uploadedImageContainer.style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    fileInput.value = '';
    uploadedImage.src = '';
    imageData = null;
    // Optional: revert button text when no upload is present
    if (resetButton) resetButton.textContent = 'Reset';
    if (generateButton) generateButton.textContent = 'Generate 3D Model';
    // Hide result image section
    const resultSection = document.getElementById('result-section');
    const resultImage = document.getElementById('result-image');
    const downloadImageButton = document.getElementById('download-image-button');
    if (resultSection) resultSection.style.display = 'none';
    if (resultImage) resultImage.src = '';
    if (downloadImageButton) downloadImageButton.disabled = true;
    // Reset preview area to default state
    setPreviewState('default');
}

function removeBackground() {
    // In a real implementation, this would call an API to remove the background
    // For demo purposes, we'll simulate a loading state and then show a success message
    removeBgBtn.disabled = true;
    removeBgBtn.textContent = 'Processing...';
    
    setTimeout(() => {
        // Simulate background removal (in a real app, this would be an actual API call)
        showNotification('Background removed successfully!', 'success');
        removeBgBtn.disabled = false;
        removeBgBtn.textContent = 'Remove Background';
    }, 2000);
}

// 3D Model Generation
function generate3DModel() {
    if (!uploadedImage.src) {
        showNotification('Please upload an image first.', 'error');
        return;
    }
    
    // Change button state
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
    
    // Move preview area to loading state
    setPreviewState('loading');
    
    // Convert & compress image to base64 if not already done
    if (!imageData) {
        previewLoadingText && (previewLoadingText.textContent = 'Compressing image...');
        imageData = compressImageToDataURL(uploadedImage, 1280, 0.85);
    }

    // Mock mode: skip network, load a local sample GLB to verify frontend
    if (isMock) {
        previewLoadingText && (previewLoadingText.textContent = 'Loading sample model (mock)...');
        try {
            const start = Date.now();
            // Use a bundled GLB from repo root
            const sample = '/inspiration-1.glb';
            loadGLBModel(sample);
            const duration = Date.now() - start;
            // Record a mock attempt for debug panel
            window.POLLY_DEBUG_LAST = {
              attempts: [{
                url: 'mock://local-sample-glb',
                status: 200,
                statusText: 'OK (mock)',
                durationMs: duration,
                blobSize: null
              }]
            };
            updateDebugPanel();
            generateButton.disabled = false;
            generateButton.textContent = 'Generate';
            showNotification('Model generated successfully! (mock)', 'success');
            return;
        } catch (e) {
            console.error('Mock load failed', e);
            showNotification('Mock model load failed. Check local GLB files.', 'error');
            setPreviewState('default');
            generateButton.disabled = false;
            generateButton.textContent = 'Generate';
            updateDebugPanel(e);
            return;
        }
    }
    
    // Extract base64 data from the Data URL
    const base64Data = imageData.split(',')[1];
    
    // Prepare the request data
    const requestData = {
        image: base64Data,
        face_count: 80000
    };
    
    // Build API endpoints from runtime config (default same-origin)
    const primaryUrl = (window.POLLY_API && typeof window.POLLY_API.url === 'function')
      ? window.POLLY_API.url('generate')
      : '/generate';
    const fallbackUrl = (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function' && window.POLLY_API.hasFallback && window.POLLY_API.hasFallback())
      ? window.POLLY_API.urlFrom(window.POLLY_API.FALLBACK_BASE, 'generate')
      : null;

    // Timeout control
    const controller = new AbortController();
    const timeoutMs = 60000; // 60s to better tolerate generation
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    previewEstimateEl && (previewEstimateEl.textContent = '≈ 20–60s');
    previewLoadingText && (previewLoadingText.textContent = 'Generating...');

    // Common fetch options
    const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'model/gltf-binary,application/octet-stream'
    };
    const bypassHeaders = (window.POLLY_AUTH && typeof window.POLLY_AUTH.buildBypassHeaders === 'function')
      ? window.POLLY_AUTH.buildBypassHeaders()
      : {};
    const fetchOpts = {
        method: 'POST',
        headers: Object.assign({}, baseHeaders, bypassHeaders),
        body: JSON.stringify(requestData),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
    };

    // Try primary; on failure or timeout, try fallback once (if provided)
    makeRequestWithFallback(primaryUrl, fallbackUrl, fetchOpts)
      .then(blob => {
        clearTimeout(timeoutId);
        const modelUrl = URL.createObjectURL(blob);
        window.modelUrl = modelUrl;
        loadGLBModel(modelUrl);
        generateButton.disabled = false;
        generateButton.textContent = 'Generate';
        showNotification('Model generated successfully!', 'success');
        updateDebugPanel();
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.error('Error generating 3D model:', err);
        setPreviewState('default');
        generateButton.disabled = false;
        generateButton.textContent = 'Generate';
        const msg = (err && err.message) ? err.message : 'Failed to generate 3D model.';
        showNotification(msg + ' Please try again.', 'error');
        updateDebugPanel(err);
      });
}

// Three.js Functions
function initThreeJS() {
    scene = new THREE.Scene();
    // 使用更亮的背景提高整体观感
    scene.background = new THREE.Color(0xffffff);
    
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;
    
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    // 色彩与光照设置：更贴近真实并提升亮度
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // 可按需微调 1.2~1.6
    renderer.physicallyCorrectLights = true;
    // Initial size may be 0 when modelViewer is hidden; use previewContainer as fallback
    const initialW = modelViewer.clientWidth || previewContainer.clientWidth || 600;
    const initialH = modelViewer.clientHeight || previewContainer.clientHeight || 400;
    renderer.setSize(initialW, initialH);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    
    // 多光源布局：主灯、辅灯、边缘灯 + 半球光
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.85);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 2, 2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-2, 1, -1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -1, 2);
    scene.add(rimLight);
    
    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);
    camera.lookAt(controls.target);
    
    // Create wireframe material for later use
    wireframeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        wireframe: true 
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();

    // Handle window resize to keep renderer sized correctly
    window.addEventListener('resize', updateRendererSize);
}

function showModelPreview() {
    // Clear previous model if exists
    if (model) {
        scene.remove(model);
    }
    
    // In a real implementation, we would load the GLB file from the API response
    // For demo purposes, we'll create a simple cube as a placeholder
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x6495ED });
    model = new THREE.Mesh(geometry, material);
    scene.add(model);
    
    // Completed state UI
    setPreviewState('completed');
    if (renderer && renderer.domElement && !modelViewer.contains(renderer.domElement)) {
        modelViewer.appendChild(renderer.domElement);
    }
    updateRendererSize();
    
    // Reset camera view
    resetView();
}

// Load GLB model from URL
function loadGLBModel(url) {
    // Clear previous model if exists
    if (model) {
        scene.remove(model);
    }
    
    // Keep UI in loading; attach canvas only when completed
    updateRendererSize();
    
    // Load the GLB model using GLTFLoader
    const loader = new THREE.GLTFLoader();
    loader.load(url, 
        // Success callback
        (gltf) => {
            model = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Reset model position
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            // Add model to scene
            scene.add(model);
            
            // Reset camera view
            resetView();

            // Switch to completed state and attach renderer canvas
            setPreviewState('completed');
            if (renderer && renderer.domElement && !modelViewer.contains(renderer.domElement)) {
                modelViewer.appendChild(renderer.domElement);
            }
            
            // Enable download button
            downloadBtn.disabled = false;
            // 不再生成下方的“Generated Image”截图，专注于 3D 预览
        },
        // Progress callback
        (xhr) => {
            const percent = (xhr.total ? (xhr.loaded / xhr.total) * 100 : 0);
            if (previewLoadingText) {
                previewLoadingText.textContent = `已处理：${Math.round(percent)}%`;
            }
        },
        // Error callback
        (error) => {
            console.error('Error loading GLB model:', error);
            showNotification('Failed to load 3D model', 'error');
            setPreviewState('default');
        }
    );
}

// Centralized preview state manager
function setPreviewState(state) {
    switch (state) {
        case 'default':
            if (previewPlaceholder) previewPlaceholder.style.display = 'block';
            if (modelViewer) modelViewer.style.display = 'none';
            if (previewControls) previewControls.style.display = 'none';
            if (modelInfo) modelInfo.style.display = 'none';
            if (previewLoading) previewLoading.style.display = 'none';
            if (downloadBtn) downloadBtn.disabled = true;
            break;
        case 'loading':
            if (previewPlaceholder) previewPlaceholder.style.display = 'none';
            if (modelViewer) modelViewer.style.display = 'none';
            if (previewControls) previewControls.style.display = 'none';
            if (modelInfo) modelInfo.style.display = 'none';
            if (previewContainer) previewContainer.style.position = 'relative';
            if (previewLoading) {
                if (!previewContainer.contains(previewLoading)) previewContainer.appendChild(previewLoading);
                previewLoading.style.display = 'flex';
                previewLoading.style.zIndex = '10';
            }
            if (previewLoadingText) previewLoadingText.textContent = 'It may take a moment to generate.';
            break;
        case 'completed':
            if (previewPlaceholder) previewPlaceholder.style.display = 'none';
            if (previewLoading) previewLoading.style.display = 'none';
            if (modelViewer) modelViewer.style.display = 'block';
            if (previewControls) previewControls.style.display = 'flex';
            if (modelInfo) modelInfo.style.display = 'block';
            break;
        default:
            break;
    }
}

function setModelMode(mode) {
    if (!model) return;
    
    if (mode === 'wireframe') {
        model.material = wireframeMaterial;
        wireframeModeBtn.classList.add('active');
        solidModeBtn.classList.remove('active');
    } else {
        model.material = new THREE.MeshStandardMaterial({ color: 0x6495ED });
        solidModeBtn.classList.add('active');
        wireframeModeBtn.classList.remove('active');
    }
}

function resetView() {
    if (!controls) return;
    
    camera.position.set(0, 0, 5);
    controls.reset();
}

function downloadModel() {
    // In a real implementation, this would download the actual GLB file
    // For demo purposes, we'll show a notification
    showNotification('Download started. Check your downloads folder', 'success');
    
    // If we have a model URL from the API response, create a download link
    if (window.modelUrl) {
        const link = document.createElement('a');
        link.href = window.modelUrl;
        link.download = 'model.glb';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Utility Functions
function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    
    // Set notification color based on type
    if (type === 'error') {
        notification.style.backgroundColor = 'var(--danger)';
    } else if (type === 'warning') {
        notification.style.backgroundColor = 'var(--warning)';
    } else {
        notification.style.backgroundColor = 'var(--success)';
    }
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}
// Ensure renderer size matches the visible container
function updateRendererSize() {
    if (!renderer) return;
    // Prefer modelViewer size if visible, otherwise use previewContainer
    const targetW = (modelViewer.offsetWidth || previewContainer.offsetWidth || 600);
    const targetH = (modelViewer.offsetHeight || previewContainer.offsetHeight || 400);
    renderer.setSize(targetW, targetH);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    // Update camera aspect ratio and projection
    const aspect = targetW / targetH;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
}
// Helper: compress image with max dimension and quality, return dataURL
function compressImageToDataURL(imgEl, maxDim = 1280, quality = 0.85) {
    const nw = imgEl.naturalWidth || imgEl.width;
    const nh = imgEl.naturalHeight || imgEl.height;
    let tw = nw, th = nh;
    if (nw > nh && nw > maxDim) {
        const scale = maxDim / nw;
        tw = Math.round(nw * scale);
        th = Math.round(nh * scale);
    } else if (nh >= nw && nh > maxDim) {
        const scale = maxDim / nh;
        tw = Math.round(nh * scale) * (nw / nh);
        th = Math.round(nh * scale);
        tw = Math.round(tw);
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(tw));
    canvas.height = Math.max(1, Math.round(th));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
}

// Helper: request with one fallback attempt
async function makeRequestWithFallback(primaryUrl, fallbackUrl, opts) {
    const tryFetch = async (url) => {
        const start = Date.now();
        let res;
        try {
          res = await fetch(url, opts);
        } catch (err) {
          const duration = Date.now() - start;
          const attempt = {
            url,
            status: 0,
            statusText: (err && err.name) ? err.name : 'FetchError',
            durationMs: duration,
            responseTextSample: (err && err.message) ? String(err.message).slice(0, 2000) : ''
          };
          window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
          window.POLLY_DEBUG_LAST.attempts.push(attempt);
          throw err;
        }
        const duration = Date.now() - start;
        const attempt = {
            url,
            status: res.status,
            statusText: res.statusText,
            durationMs: duration
        };
        window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
        window.POLLY_DEBUG_LAST.attempts.push(attempt);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            attempt.responseTextSample = text ? text.slice(0, 2000) : '';
            throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ' - ' + text : ''}`);
        }
        const blob = await res.blob();
        attempt.blobSize = blob.size || null;
        return blob;
    };
    try {
        return await tryFetch(primaryUrl);
    } catch (e) {
        // If aborted or timeout or non-2xx, try fallback once
        if (fallbackUrl) {
            console.warn('Primary request failed, trying fallback:', e.message);
            return await tryFetch(fallbackUrl);
        }
        throw e;
    }
}

function updateDebugPanel(err) {
    if (!debugPanel || !debugContent) return;
    if (!isDebug) {
        // Only show when ?debug=1 is present
        return;
    }
    debugPanel.style.display = 'block';
    const last = window.POLLY_DEBUG_LAST;
    const lines = [];
    lines.push(`[${new Date().toLocaleString()}] Attempts:`);
    if (last && last.attempts && last.attempts.length > 0) {
      last.attempts.forEach((a, i) => {
          lines.push(`#${i+1}`);
          lines.push(`URL: ${a.url}`);
          lines.push(`Status: ${a.status} ${a.statusText}`);
          if (typeof a.blobSize === 'number') lines.push(`Blob size: ${a.blobSize} bytes`);
          if (a.responseTextSample) lines.push(`Response text sample:\n${a.responseTextSample}`);
          lines.push(`Duration: ${a.durationMs} ms`);
          lines.push('');
      });
    } else {
      lines.push('No request attempts captured.');
      lines.push('');
    }
    if (err) {
      const errName = err.name || 'Error';
      const errMsg = err.message || String(err);
      lines.push(`Error: ${errName} - ${errMsg}`);
    }
    debugContent.textContent = lines.join('\n');
}