// Fallback: 如果外部脚本或 3D 库加载失败，1 秒后仍无卡片，则渲染本地占位卡片
(function(){
  function renderFallback(){
    try {
      var grid = document.getElementById('gallery-grid');
      if (!grid || (grid.children && grid.children.length > 0)) return;
      var titles = Array.from({length:10}, function(_, i){ return 'Inspiration ' + (i+1); });
      titles.forEach(function(t){
        var card = document.createElement('div');
        card.className = 'gallery-item';

        var img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '160px';
        img.style.objectFit = 'cover';
        // 生成简易占位图（与 gallery.js 的占位样式一致）
        try {
          var c = document.createElement('canvas');
          c.width = 256; c.height = 160;
          var ctx = c.getContext('2d');
          var grad = ctx.createLinearGradient(0,0,256,160);
          grad.addColorStop(0,'#ffffff');
          grad.addColorStop(1,'#f3f5f7');
          ctx.fillStyle = grad; ctx.fillRect(0,0,256,160);
          ctx.fillStyle = '#4a6cf7';
          ctx.font = 'bold 16px system-ui, -apple-system, Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(t, 128, 72);
          ctx.fillStyle = '#6c757d';
          ctx.font = '12px system-ui, -apple-system, Segoe UI, sans-serif';
          ctx.fillText('Click to preview 3D', 128, 96);
          img.src = c.toDataURL('image/png');
        } catch(e) {
          img.alt = t;
          img.style.background = '#f6f7f9';
        }

        var title = document.createElement('div');
        title.className = 'gallery-title';
        title.textContent = t;

        var actions = document.createElement('div');
        actions.className = 'gallery-actions';

        var downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-download-glb';
        downloadBtn.textContent = 'Download GLB';
        downloadBtn.onclick = function(){
          var a = document.createElement('a');
          a.href = 'assets/models/inspiration-1.glb';
          a.download = 'inspiration-1.glb';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };

        actions.appendChild(downloadBtn);

        // Like (heart) toggle with localStorage persistence (SVG for stable size)
        var likeBtn = document.createElement('button');
        likeBtn.className = 'btn btn-icon like-btn';
        var key = t;
        var likes = {};
        try { likes = JSON.parse(localStorage.getItem('galleryLikes') || '{}'); } catch(_) {}
        var liked = !!likes[key];
        likeBtn.innerHTML = '<svg class="icon-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5c0-2.6 2.03-4.5 4.5-4.5 1.74 0 3.41 1.01 4.1 2.5.69-1.49 2.36-2.5 4.1-2.5 2.47 0 4.5 1.9 4.5 4.5 0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>';
        if (liked) likeBtn.classList.add('liked');
        likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
        likeBtn.setAttribute('aria-label', liked ? 'Unlike' : 'Like');
        likeBtn.onclick = function(){
          var now = !likes[key];
          likes[key] = now;
          try { localStorage.setItem('galleryLikes', JSON.stringify(likes)); } catch(_) {}
          likeBtn.classList.toggle('liked', now);
          likeBtn.setAttribute('aria-pressed', now ? 'true' : 'false');
          likeBtn.setAttribute('aria-label', now ? 'Unlike' : 'Like');
        };
        actions.appendChild(likeBtn);

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(actions);
        grid.appendChild(card);
      });
    } catch (e) {
      // ignore
    }
  }

  var start = function(){ setTimeout(renderFallback, 1000); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();