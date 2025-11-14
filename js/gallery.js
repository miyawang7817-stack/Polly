// GLB 模型图库：为每个卡片生成缩略图、支持 3D 预览与 GLB 下载。

const gridEl = document.getElementById('gallery-grid');
const modalEl = document.getElementById('model-modal');
const modalCloseEl = document.getElementById('modal-close');
const modal3DContainer = document.getElementById('modal-3d-container');
const modalDownloadGlbBtn = document.getElementById('modal-download-glb');
const modalDownloadSnapshotBtn = document.getElementById('modal-download-snapshot');

 // 直接依赖页面中的 model-viewer 脚本，取消按需导入

function isThreeAvailable() {
  return typeof window.THREE !== 'undefined' && !!window.GLTFLoader && !!window.OrbitControls;
}

// 使用提供的全部灵感 GLB：来自项目根目录
const GLB_PATHS = [
  'inspiration-1.glb',
  'inspiration-2.glb',
  'inspiration-3.glb',
  'inspiration-4.glb',
  'inspiration-5 (1).glb',
  'inspiration-6.glb',
  'inspiration-7.glb',
  'inspiration-8.glb',
  'inspiration-9.glb',
  'inspiration-10.glb',
  'inspiration-11.glb',
  'inspiration-12.glb',
  '775e1869-a572-425d-b570-1b5c889e85f7.glb',
];

// 在启用 cleanUrls 时，/gallery 会作为路径前缀；确保 GLB 使用根相对路径
const GLB_ROOT_PATHS = GLB_PATHS.map(p => p.startsWith('/') ? p : '/' + p);

function titleFromPath(p){
  const name = (p || '').split('/').pop() || '';
  let base = name.replace(/\.(glb|crdownload)$/i,'');
  // 清理压缩后缀与重复副本标记
  base = base.replace(/-draco$/i, '');
  base = base.replace(/\s*\(\d+\)\s*$/,'');
  // 特例：UUID 模型命名为 Helmet
  if (/^775e1869-a572-425d-b570-1b5c889e85f7$/i.test(base)) return 'Helmet';
  // inspiration-N → 使用用户自定义映射或默认格式
  const insp = base.match(/^inspiration-(\d+)$/i);
  if (insp) {
    const num = insp[1];
    const titleMap = {
      '1': 'LABUBU',
      '2': 'Motorcycle',
      '3': 'Ninja Turtle',
      '4': 'Off-Road Vehicle',
      '5': 'Vending Machine',
      '6': 'Landscape',
      '7': 'Caveman',
      '8': 'Robot',
      '9': 'General',
      '10': 'Monster',
      '11': 'Clock Tower',
      '12': 'Little Girl',
    };
    return titleMap[num] || `Inspiration ${num}`;
  }
  // 通用：kebab/snake 转 Title Case
  const words = base.split(/[-_]+/).filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1));
  return words.join(' ') || base;
}

function categoryFromPath(p){
  const name = (p || '').split('/').pop() || p;
  const base = name.replace(/\.(glb|crdownload)$/i,'');
  const m = base.match(/(\d+)/);
  const num = m ? parseInt(m[1], 10) : NaN;
  // 指定 UUID 文件归入 Helmet 分类
  if (/775e1869-a572-425d-b570-1b5c889e85f7\.glb$/i.test(name)) return 'helmet';
  // Role 分类：1、3、7、8、9、10、12
  const roleSet = new Set([1,3,7,8,9,10,12]);
  if (roleSet.has(num)) return 'role';
  // Car 分类：2、4
  if (num === 2 || num === 4) return 'car';
  // 其他归为 Object
  return 'object';
}

// Gallery 展示全部提供的 GLB 文件（将 2 和 4 分类为 car）
const models = GLB_ROOT_PATHS.map((p) => ({ title: titleFromPath(p), glb: p, category: categoryFromPath(p) }));

let currentFilter = 'all';
let visibleCount = 6; // initial cards
const pageStep = 4;   // load more step
let likes = {};
let lastFilteredItems = [];
let currentModalIndex = -1;
let io; // IntersectionObserver for infinite scroll
let isAutoLoading = false;
// 预览懒加载：并发控制与视口观察器
let previewIO;
const mvLoadQueue = [];
let mvLoadingCount = 0;
const mvMaxConcurrent = 2; // 同时加载的模型数量，避免高并发卡顿

function makeLighting(scene) {
  scene.background = new THREE.Color(0xffffff);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.7);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(2, 3, 4);
  keyLight.castShadow = false;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
  rimLight.position.set(0, 5, -5);
  scene.add(rimLight);
}

function createRenderer(width, height, preserve = true) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: preserve });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.physicallyCorrectLights = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  return renderer;
}

function generateThumbnailDataURL(glbPath, yaw = 0, pitch = Math.PI / 6, width = 256, height = 160) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  const renderer = createRenderer(width, height);

  makeLighting(scene);

  const loader = new window.GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(glbPath, (gltf) => {
      const root = gltf.scene;
      scene.add(root);

      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      root.position.sub(center);
      const maxSide = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxSide;
      root.scale.setScalar(scale);

      const radius = 2.8;
      const target = new THREE.Vector3(0, 0, 0);
      camera.position.set(
        target.x + radius * Math.cos(pitch) * Math.cos(yaw),
        target.y + radius * Math.sin(pitch),
        target.z + radius * Math.cos(pitch) * Math.sin(yaw)
      );
      camera.lookAt(target);

      renderer.render(scene, camera);
      resolve(renderer.domElement.toDataURL('image/png'));
      renderer.dispose();
    }, undefined, (err) => {
      reject(err);
      renderer.dispose();
    });
  });
}

function open3DModal(glbPath) {
  if (!modalEl || !modal3DContainer) return;
  modalEl.style.display = 'block';
  modal3DContainer.innerHTML = '';
  // 直接创建 model-viewer
  const mv = document.createElement('model-viewer');
  mv.setAttribute('src', glbPath);
  mv.setAttribute('camera-controls', '');
  mv.setAttribute('shadow-intensity', '0');
  mv.setAttribute('exposure', '1.0');
  mv.setAttribute('reveal', 'auto');
  mv.style.width = '100%';
  mv.style.height = '70vh';
  mv.style.background = 'transparent';
  mv.style.setProperty('--poster-color', 'transparent');
  mv.style.setProperty('--progress-mask', 'none');
  modal3DContainer.appendChild(mv);

  // 错误提示
  const errorHint = document.createElement('div');
  errorHint.style.display = 'none';
  errorHint.style.marginTop = '8px';
  errorHint.style.color = '#d32f2f';
  errorHint.style.font = '14px system-ui, -apple-system, Segoe UI, sans-serif';
  errorHint.textContent = 'Model failed to load. Check GLB path or file integrity.';
  modal3DContainer.appendChild(errorHint);

  mv.addEventListener('error', () => { errorHint.style.display = 'block'; });
  mv.addEventListener('load', () => { errorHint.style.display = 'none'; });

  // Download: GLB enabled; snapshot disabled under strict CSP
  if (modalDownloadGlbBtn) {
    modalDownloadGlbBtn.disabled = false;
    modalDownloadGlbBtn.onclick = () => downloadFile(glbPath);
  }
  if (modalDownloadSnapshotBtn) {
    modalDownloadSnapshotBtn.disabled = true;
    modalDownloadSnapshotBtn.onclick = null;
  }

  const _close = () => {
    modalEl.style.display = 'none';
    modal3DContainer.innerHTML = '';
    if (modalDownloadGlbBtn) {
      modalDownloadGlbBtn.disabled = true;
      modalDownloadGlbBtn.onclick = null;
    }
    if (modalDownloadSnapshotBtn) {
      modalDownloadSnapshotBtn.disabled = true;
      modalDownloadSnapshotBtn.onclick = null;
    }
  };

  if (modalCloseEl) modalCloseEl.onclick = _close;
  modalEl.onclick = (e) => { if (e.target === modalEl) _close(); };

  // Modal navigation buttons
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');
  if (prevBtn) prevBtn.onclick = () => navigateModal(-1);
  if (nextBtn) nextBtn.onclick = () => navigateModal(1);
  // Keyboard navigation
  const keyHandler = (ev) => {
    if (ev.key === 'Escape') _close();
    if (ev.key === 'ArrowLeft') navigateModal(-1);
    if (ev.key === 'ArrowRight') navigateModal(1);
  };
  document.addEventListener('keydown', keyHandler, { once: true });
}

function downloadFile(path) {
  const a = document.createElement('a');
  a.href = path;
  a.download = path.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadSnapshot(renderer, filename) {
  const dataURL = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename || 'snapshot.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function drawPlaceholderCanvas(canvasEl, title) {
  try {
    const w = canvasEl.width || 256;
    const h = canvasEl.height || 160;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    // 留空透明画布，不显示任何占位文本或背景
    ctx.clearRect(0, 0, w, h);
  } catch (_) {
    // ignore
  }
}

// 观察卡片进入视口后再触发模型加载（非点击）
function observePreview(mv) {
  if (!mv) return;
  // 不支持 IntersectionObserver 时直接加载
  if (!('IntersectionObserver' in window)) {
    mv.setAttribute('src', mv.dataset.src || mv.getAttribute('data-src'));
    return;
  }
  if (!previewIO) {
    previewIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        // 已设置 src 的跳过
        if (el.getAttribute('src')) {
          previewIO.unobserve(el);
          continue;
        }
        if (entry.isIntersecting) {
          // 入队，遵守并发限制
          mvLoadQueue.push(el);
          processMvQueue();
          previewIO.unobserve(el);
        }
      }
    }, { rootMargin: '200px 0px', threshold: 0.2 });
  }
  previewIO.observe(mv);
}

function processMvQueue() {
  while (mvLoadingCount < mvMaxConcurrent && mvLoadQueue.length) {
    const el = mvLoadQueue.shift();
    // Double-check，避免重复设置
    if (el.getAttribute('src')) continue;
    const src = el.dataset.src || el.getAttribute('data-src');
    if (!src) continue;
    mvLoadingCount++;
    el.setAttribute('src', src);
    const done = () => {
      mvLoadingCount = Math.max(0, mvLoadingCount - 1);
      processMvQueue();
    };
    el.addEventListener('load', done, { once: true });
    el.addEventListener('error', done, { once: true });
  }
}

async function renderGallery() {
  if (!gridEl) return;
  gridEl.innerHTML = '';
  let filtered = currentFilter === 'all' ? models.slice() : models.filter(m => m.category === currentFilter);
  lastFilteredItems = filtered;
  const items = filtered.slice(0, visibleCount);
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    // 直接在卡片内使用 model-viewer 预览
    const thumb = document.createElement('div');
    thumb.className = 'gallery-thumb';
    const mv = document.createElement('model-viewer');
    // 直接使用 src 立即加载，回到最初行为
    mv.src = item.glb;
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('shadow-intensity', '0');
    mv.setAttribute('exposure', '1.0');
    mv.setAttribute('reveal', 'auto');
    mv.setAttribute('poster', makePlaceholderDataURL(item.title));
    mv.style.width = '100%';
    mv.style.height = '100%';
    mv.style.background = 'transparent';
    mv.style.setProperty('--poster-color', 'transparent');
    mv.style.setProperty('--progress-mask', 'none');
    thumb.appendChild(mv);
    // 移除视口懒加载观察，恢复直接加载

    // 卡片内错误提示
    const errorHint = document.createElement('div');
    errorHint.style.display = 'none';
    errorHint.style.marginTop = '6px';
    errorHint.style.color = '#d32f2f';
    errorHint.style.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
    errorHint.textContent = '预览加载失败';
    thumb.appendChild(errorHint);
    mv.addEventListener('error', () => { errorHint.style.display = 'block'; });
    mv.addEventListener('load', () => { 
      errorHint.style.display = 'none';
      title.style.display = '';
    });

    const title = document.createElement('div');
    title.className = 'gallery-title';
    title.textContent = item.title;
    title.style.display = 'none';

    const actions = document.createElement('div');
    actions.className = 'gallery-actions';

    const downloadGlbBtn = document.createElement('button');
    downloadGlbBtn.className = 'btn btn-download-glb';
    // 使用不间断空格，避免在固定宽度下断行造成“乱码”效果
    downloadGlbBtn.textContent = 'Download\u00A0GLB';
    downloadGlbBtn.onclick = () => downloadFile(item.glb);

    // Like (heart) toggle (SVG keeps size constant)
    const likeBtn = document.createElement('button');
    likeBtn.className = 'btn btn-icon like-btn';
    const key = item.title;
    const liked = !!likes[key];
    likeBtn.innerHTML = '<svg class="icon-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5c0-2.6 2.03-4.5 4.5-4.5 1.74 0 3.41 1.01 4.1 2.5.69-1.49 2.36-2.5 4.1-2.5 2.47 0 4.5 1.9 4.5 4.5 0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>';
    if (liked) likeBtn.classList.add('liked');
    likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    likeBtn.setAttribute('aria-label', liked ? 'Unlike' : 'Like');
    likeBtn.onclick = () => {
      const now = !likes[key];
      likes[key] = now;
      saveLikes();
      likeBtn.setAttribute('aria-pressed', now ? 'true' : 'false');
      likeBtn.setAttribute('aria-label', now ? 'Unlike' : 'Like');
      likeBtn.classList.toggle('liked', now);
    };

    // 移除预览按钮，恢复直接卡片预览
    actions.appendChild(downloadGlbBtn);
    // 点赞按钮定位到卡片根节点，避免被 .gallery-actions 的定位上下文影响
    card.appendChild(likeBtn);

    // 移除 poster，避免 Chrome 下白色信箱空区

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(actions);
    // 立即绘制本地 2D 占位缩略图，确保不空白
    gridEl.appendChild(card);

    // Strict CSP: keep local placeholder, no external thumbnail generation.
  }
}

function makePlaceholderDataURL(title, w = 256, h = 160) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // 返回完全透明的占位 PNG，不显示任何文字或背景
  ctx.clearRect(0, 0, w, h);
  return canvas.toDataURL('image/png');
}

// Setup filter chips and Load More
function setupFiltersAndLoadMore(){
  const chips = document.querySelectorAll('#gallery-filters .filter-chip');
  const sentinel = document.getElementById('gallery-sentinel');
  const loader = document.getElementById('gallery-loader');
  // restore likes
  try { likes = JSON.parse(localStorage.getItem('galleryLikes') || '{}'); } catch(_) {}
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter') || 'all';
      visibleCount = 6; // reset pagination on filter change
      if (loader) { loader.style.display = 'none'; loader.setAttribute('aria-busy','false'); }
      renderGallery();
    });
  });
  // Infinite scroll via IntersectionObserver
  if ('IntersectionObserver' in window && sentinel){
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      if (isAutoLoading) return;
      // If all items already visible, stop observing
      const total = lastFilteredItems.length;
      if (visibleCount >= total) { io.disconnect(); return; }
      isAutoLoading = true;
      if (loader) { loader.style.display = 'block'; loader.setAttribute('aria-busy','true'); }
      visibleCount = Math.min(visibleCount + pageStep, total);
      renderGallery();
      // small delay to prevent rapid retrigger
      setTimeout(() => {
        isAutoLoading = false;
        if (loader) { loader.style.display = 'none'; loader.setAttribute('aria-busy','false'); }
      }, 200);
    }, { root: null, rootMargin: '200px 0px 400px 0px', threshold: 0 });
    io.observe(sentinel);
  }
  // Sorting removed
}

function ensureRender() {
  try {
    renderGallery();
    setupFiltersAndLoadMore();
  } catch (_) {}
}

function saveLikes(){
  try { localStorage.setItem('galleryLikes', JSON.stringify(likes)); } catch(_) {}
}

function navigateModal(step){
  if (!Array.isArray(lastFilteredItems) || lastFilteredItems.length === 0) return;
  if (currentModalIndex < 0) currentModalIndex = 0;
  currentModalIndex = (currentModalIndex + step + lastFilteredItems.length) % lastFilteredItems.length;
  const item = lastFilteredItems[currentModalIndex];
  if (item) open3DModal(item.glb);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureRender);
} else {
  ensureRender();
}