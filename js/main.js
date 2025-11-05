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
            showNotification('Please upload a valid image file.', 'error');
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
    // 放宽类型校验：接受所有 image/*；若缺少 MIME，则按扩展名兜底
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const name = (file.name || '').toLowerCase();
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name);
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
    
    // Always compress image to control payload size (avoid Vercel 413)
    previewLoadingText && (previewLoadingText.textContent = 'Compressing image...');
    const baseIsSameOrigin = (window.POLLY_API && window.POLLY_API.BASE === '/');
    // For same-origin proxy (Vercel function), use tighter compression
    let maxDim = baseIsSameOrigin ? 900 : 1280;
    let quality = baseIsSameOrigin ? 0.7 : 0.85;
    let compressedDataUrl = compressImageToDataURL(uploadedImage, maxDim, quality, true);
    // If still large, step down progressively
    const sizeLimitChars = 1800000; // ~1.8MB in base64 characters to stay well under limits
    let base64Len = (compressedDataUrl || '').length;
    if (base64Len > sizeLimitChars) {
      maxDim = 720; quality = 0.62;
      compressedDataUrl = compressImageToDataURL(uploadedImage, maxDim, quality, true);
      base64Len = compressedDataUrl.length;
    }
    if (base64Len > sizeLimitChars) {
      maxDim = 640; quality = 0.55;
      compressedDataUrl = compressImageToDataURL(uploadedImage, maxDim, quality, true);
      base64Len = compressedDataUrl.length;
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
    
    // Extract base64 data from the compressed Data URL
    const base64Data = compressedDataUrl.split(',')[1];
    
    // Prepare the request data (兼容不同后端约定)
    const faceParams = new URLSearchParams(window.location.search);
    const facesOverrideStr = faceParams.get('faceCount') || faceParams.get('faces');
    const faceCountOverride = facesOverrideStr ? Math.max(10000, parseInt(facesOverrideStr, 10) || 0) : null;
    const requestData = {
        // 后端约定：image 字段使用纯 base64 字符串
        image: base64Data
    };
    if (faceCountOverride && isFinite(faceCountOverride)) {
        requestData.face_count = faceCountOverride;
    }
    
    // Build API endpoints from runtime config (default same-origin)
    const primaryUrl = (window.POLLY_API && typeof window.POLLY_API.url === 'function')
      ? window.POLLY_API.url('generate')
      : '/generate';
    const fallbackUrl = (window.POLLY_API && typeof window.POLLY_API.urlFrom === 'function' && window.POLLY_API.hasFallback && window.POLLY_API.hasFallback())
      ? window.POLLY_API.urlFrom(window.POLLY_API.FALLBACK_BASE, 'generate')
      : null;

    // 若目标是你提供的 IP 后端且未显式传 faces，则默认附带 face_count=80000
    try {
      if (!requestData.face_count && primaryUrl) {
        const purl = new URL(primaryUrl, window.location.origin);
        if ((purl.host || '').includes('111.229.71.58:8086')) {
          requestData.face_count = 80000;
        }
      }
    } catch(_) {}

    // Timeout control (configurable via URL ?timeout or global window.POLLY_TIMEOUT_MS)
    const controller = new AbortController();
    const searchParams = new URLSearchParams(window.location.search);
    const timeoutOverrideStr = searchParams.get('timeout') || searchParams.get('timeoutMs');
    const timeoutOverride = timeoutOverrideStr ? parseInt(timeoutOverrideStr, 10) : null;
    const runtimeTimeout = (typeof window.POLLY_TIMEOUT_MS === 'number' && window.POLLY_TIMEOUT_MS > 0)
      ? window.POLLY_TIMEOUT_MS
      : null;
    const timeoutMs = (timeoutOverride && timeoutOverride > 0)
      ? timeoutOverride
      : (runtimeTimeout || 300000); // default 5 min
    let timeoutId = null;
    if (timeoutMs && timeoutMs > 0 && isFinite(timeoutMs)) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    if (previewEstimateEl) {
      let estimateText = '≈ 20–60s';
      if (timeoutMs >= 300000) estimateText = '≈ 3–5 min';
      else if (timeoutMs >= 180000) estimateText = '≈ 1–3 min';
      previewEstimateEl.textContent = estimateText;
    }
    previewLoadingText && (previewLoadingText.textContent = 'Generating...');

    // Async task mode: create task and poll status until completion
    const asyncMode = (searchParams.get('async') === '1') || (window.POLLY_ASYNC_MODE === true);
    if (asyncMode) {
      const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const extraHeaders = (window.POLLY_AUTH && typeof window.POLLY_AUTH.buildExtraHeaders === 'function')
        ? window.POLLY_AUTH.buildExtraHeaders()
        : ((window.POLLY_AUTH && typeof window.POLLY_AUTH.buildBypassHeaders === 'function') ? window.POLLY_AUTH.buildBypassHeaders() : {});
      const createUrl = (window.POLLY_API && typeof window.POLLY_API.url === 'function')
        ? window.POLLY_API.url('tasks')
        : '/tasks';
      const statusUrlFromId = (id) => {
        if (window.POLLY_API && typeof window.POLLY_API.url === 'function') {
          return window.POLLY_API.url('tasks/' + String(id));
        }
        return '/tasks/' + String(id);
      };
      const fetchOptsCreate = {
        method: 'POST',
        headers: Object.assign({}, baseHeaders, extraHeaders),
        body: JSON.stringify(requestData),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
      };

      previewLoadingText && (previewLoadingText.textContent = 'Submitting task...');
      const startCreate = Date.now();
      fetch(createUrl, fetchOptsCreate)
        .then(async (res) => {
          const duration = Date.now() - startCreate;
          window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
          window.POLLY_DEBUG_LAST.attempts.push({ url: createUrl, status: res.status, statusText: res.statusText, durationMs: duration });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Task create failed: HTTP ${res.status} ${res.statusText}${text ? ' - ' + text : ''}`);
          }
          const data = await res.json().catch(() => ({}));
          const taskId = data.task_id || data.id || data.job_id || data.jobId;
          if (!taskId) throw new Error('No task id returned from backend');
          // Start polling
          let pollIntervalMs = 5000;
          let timer = null;
          let overallStart = Date.now();
          previewLoadingText && (previewLoadingText.textContent = 'Queued...');
          return await new Promise((resolve, reject) => {
            const pollOnce = async () => {
              if (Date.now() - overallStart > timeoutMs) {
                return reject(new Error('Task polling timeout'));
              }
              const su = statusUrlFromId(taskId);
              const startPoll = Date.now();
              try {
                const pollRes = await fetch(su, { method: 'GET', headers: Object.assign({}, extraHeaders), cache: 'no-store', mode: 'cors', signal: controller.signal });
                const durationPoll = Date.now() - startPoll;
                window.POLLY_DEBUG_LAST = window.POLLY_DEBUG_LAST || { attempts: [] };
                window.POLLY_DEBUG_LAST.attempts.push({ url: su, status: pollRes.status, statusText: pollRes.statusText, durationMs: durationPoll });
                const text = await pollRes.text();
                let json = {};
                try { json = JSON.parse(text); } catch (_) {}
                // Backend status conventions: status/state: queued|processing|succeeded|completed|failed
                const st = json.status || json.state || json.phase;
                const eta = json.eta_seconds || json.eta || null;
                if (previewLoadingText) {
                  if (st === 'queued') previewLoadingText.textContent = 'Queued...';
                  else if (st === 'processing' || st === 'running') previewLoadingText.textContent = 'Processing...';
                  else if (eta && isFinite(eta)) previewLoadingText.textContent = `Processing... (≈ ${eta}s)`;
                }
                if (st === 'succeeded' || st === 'completed') {
                  // Resolve result
                  const url = json.result_url || json.glb_url || json.url;
                  const base64 = (json.result && (json.result.glb_base64 || json.result.glb_data_url)) || json.glb_base64 || json.glb_data_url;
                  if (url) {
                    const bstart = Date.now();
                    const bres = await fetch(url, { cache: 'no-store', mode: 'cors' });
                    const bd = Date.now() - bstart;
                    window.POLLY_DEBUG_LAST.attempts.push({ url, status: bres.status, statusText: bres.statusText, durationMs: bd });
                    if (!bres.ok) {
                      const t = await bres.text().catch(() => '');
                      return reject(new Error(`Result fetch failed: HTTP ${bres.status} ${bres.statusText}${t ? ' - ' + t : ''}`));
                    }
                    const blob = await bres.blob();
                    return resolve(blob);
                  } else if (base64) {
                    try {
                      const raw = base64.includes(',') ? base64.split(',')[1] : base64;
                      const bytes = atob(raw);
                      const arr = new Uint8Array(bytes.length);
                      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                      const blob = new Blob([arr], { type: 'model/gltf-binary' });
                      return resolve(blob);
                    } catch (e) {
                      return reject(new Error('Invalid base64 result from backend'));
                    }
                  } else if (json.result && json.result.bytes) {
                    const blob = new Blob([json.result.bytes], { type: 'model/gltf-binary' });
                    return resolve(blob);
                  } else {
                    return reject(new Error('No result in completed task'));
                  }
                }
                if (st === 'failed' || st === 'error') {
                  const msg = json.error || json.message || 'Task failed';
                  return reject(new Error(msg));
                }
                // Continue polling
                if (!timer) {
                  timer = setInterval(pollOnce, pollIntervalMs);
                }
              } catch (e) {
                return reject(e);
              }
            };
            pollOnce();
          });
        })
        .then(blob => {
          if (timeoutId) clearTimeout(timeoutId);
          const modelUrl = URL.createObjectURL(blob);
          window.modelUrl = modelUrl;
          loadGLBModel(modelUrl);
          generateButton.disabled = false;
          generateButton.textContent = 'Generate';
          showNotification('Model generated successfully!', 'success');
          updateDebugPanel();
        })
        .catch(err => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('Async flow error:', err);
          setPreviewState('default');
          generateButton.disabled = false;
          generateButton.textContent = 'Generate';
          const msg = (err && err.message) ? err.message : 'Failed to generate 3D model.';
          showNotification(msg + ' Please try again.', 'error');
          updateDebugPanel(err);
        });
      return;
    }

    // Common fetch options
    const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'model/gltf-binary,application/octet-stream'
    };
    const extraHeaders = (window.POLLY_AUTH && typeof window.POLLY_AUTH.buildExtraHeaders === 'function')
      ? window.POLLY_AUTH.buildExtraHeaders()
      : ((window.POLLY_AUTH && typeof window.POLLY_AUTH.buildBypassHeaders === 'function') ? window.POLLY_AUTH.buildBypassHeaders() : {});
    const fetchOpts = {
        method: 'POST',
        headers: Object.assign({}, baseHeaders, extraHeaders),
        body: JSON.stringify(requestData),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
    };

    // Same-origin now proxies to real backend: send full JSON payload

    // Try primary; on failure or timeout, try fallback once (if provided)
    makeRequestWithFallback(primaryUrl, fallbackUrl, fetchOpts)
      .then(blob => {
        if (timeoutId) clearTimeout(timeoutId);
        const modelUrl = URL.createObjectURL(blob);
        window.modelUrl = modelUrl;
        loadGLBModel(modelUrl);
        generateButton.disabled = false;
        generateButton.textContent = 'Generate';
        showNotification('Model generated successfully!', 'success');
        updateDebugPanel();
      })
      .catch(err => {
        if (timeoutId) clearTimeout(timeoutId);
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
function compressImageToDataURL(imgEl, maxDim = 1280, quality = 0.85, preferWebp = false) {
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
    // Prefer WebP for better compression if supported, fall back to JPEG
    try {
      if (preferWebp) {
        const webp = canvas.toDataURL('image/webp', quality);
        if (typeof webp === 'string' && webp.startsWith('data:image/webp')) {
          return webp;
        }
      }
    } catch(_) {}
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