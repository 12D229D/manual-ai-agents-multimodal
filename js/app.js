/**
 * Manual de Agentes IA Multimodales & VLA
 * app.js — Motor SPA: scroll-spy, búsqueda, simulador, tabs de código, benchmarks
 */

'use strict';

// ════════════════════════════════════════════════
//  READING PROGRESS BAR
// ════════════════════════════════════════════════

function initReadingProgress() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct));
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ════════════════════════════════════════════════
//  SCROLL-SPY SIDEBAR (IntersectionObserver)
// ════════════════════════════════════════════════

function initScrollSpy() {
  const sections = document.querySelectorAll('section.section-card[id]');
  const navLinks  = document.querySelectorAll('.sidebar-link');
  if (!sections.length || !navLinks.length) return;

  const activeMap = {};
  navLinks.forEach(a => {
    const id = a.getAttribute('href')?.replace('#', '');
    if (id) activeMap[id] = a;
  });

  let lastActive = null;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = activeMap[id];
      if (!link) return;

      if (entry.isIntersecting) {
        // deactivate previous
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        lastActive = link;
      }
    });
  }, {
    rootMargin: '-20% 0px -65% 0px',
    threshold: 0
  });

  sections.forEach(s => observer.observe(s));
}

// ════════════════════════════════════════════════
//  SECTION FADE-IN (IntersectionObserver)
// ════════════════════════════════════════════════

function initFadeInSections() {
  const cards = document.querySelectorAll('.section-card');
  if (!cards.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  cards.forEach(c => observer.observe(c));
}

// ════════════════════════════════════════════════
//  SEARCH ENGINE
// ════════════════════════════════════════════════

function initSearch() {
  const input      = document.getElementById('search-input');
  const clearBtn   = document.getElementById('search-clear');
  const resultsBox = document.getElementById('search-results');
  if (!input || !resultsBox) return;

  // Index all searchable text
  const sections = Array.from(document.querySelectorAll('section.section-card[id]'));
  const index    = sections.map(sec => {
    const heading = sec.querySelector('h2')?.textContent.trim() || '';
    const text    = sec.textContent.trim();
    return { id: sec.id, heading, text };
  });

  function escapeRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, query) {
    const re = new RegExp(`(${escapeRe(query)})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  function extractSnippet(text, query, len = 120) {
    const lower = text.toLowerCase();
    const idx   = lower.indexOf(query.toLowerCase());
    if (idx === -1) return text.slice(0, len) + '…';
    const start = Math.max(0, idx - 40);
    const end   = Math.min(text.length, idx + len);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  }

  function doSearch(query) {
    query = query.trim();

    if (query.length < 2) {
      resultsBox.innerHTML = '';
      resultsBox.classList.remove('visible');
      clearBtn.classList.remove('visible');
      return;
    }

    clearBtn.classList.add('visible');

    const results = index.filter(item =>
      item.text.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

    if (!results.length) {
      resultsBox.innerHTML = `<div class="search-result-item"><div class="result-text" style="color:var(--txt-muted)">Sin resultados para "<strong>${query}</strong>"</div></div>`;
      resultsBox.classList.add('visible');
      return;
    }

    resultsBox.innerHTML = results.map(r => {
      const snippet  = extractSnippet(r.text, query);
      const snippetH = highlight(snippet, query);
      return `
        <div class="search-result-item" data-target="#${r.id}" role="button" tabindex="0" aria-label="Ir a sección ${r.heading}">
          <div class="result-section">📍 ${r.heading}</div>
          <div class="result-text">${snippetH}</div>
        </div>`;
    }).join('');

    resultsBox.classList.add('visible');

    // Click handlers
    resultsBox.querySelectorAll('.search-result-item').forEach(el => {
      const onClick = () => {
        const targetId = el.dataset.target;
        const target   = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          input.value = '';
          resultsBox.innerHTML = '';
          resultsBox.classList.remove('visible');
          clearBtn.classList.remove('visible');
        }
      };
      el.addEventListener('click', onClick);
      el.addEventListener('keydown', e => { if (e.key === 'Enter') onClick(); });
    });
  }

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(input.value), 200);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    resultsBox.innerHTML = '';
    resultsBox.classList.remove('visible');
    clearBtn.classList.remove('visible');
    input.focus();
  });

  // Keyboard: Esc to close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      resultsBox.innerHTML = '';
      resultsBox.classList.remove('visible');
      clearBtn.classList.remove('visible');
    }
  });
}

// ════════════════════════════════════════════════
//  CODE TABS + COPY TO CLIPBOARD
// ════════════════════════════════════════════════

function initCodeTabs() {
  // Handle tabs per container
  document.querySelectorAll('.code-container').forEach(container => {
    const tabBtns = container.querySelectorAll('.code-tab-btn');
    const panels  = container.querySelectorAll('.code-panel');
    const copyBtn = container.querySelector('.copy-btn');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update tab buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update panels
        panels.forEach(p => {
          p.classList.toggle('active', p.id === tabId);
        });
      });
    });

    // Copy button
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const activePanel = container.querySelector('.code-panel.active');
        if (!activePanel) return;

        const text = activePanel.querySelector('pre')?.innerText || '';
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✅ Copiado';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = '📋 Copiar';
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          // Fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity  = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.textContent = '✅ Copiado';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = '📋 Copiar';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });
    }
  });
}

// ════════════════════════════════════════════════
//  BENCHMARK BARS ANIMATION
// ════════════════════════════════════════════════

function initBenchmarkBars() {
  const grid = document.getElementById('benchmark-grid');
  if (!grid) return;

  const rows = grid.querySelectorAll('.benchmark-row');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fills = entry.target.querySelectorAll('.bar-fill');
        fills.forEach(fill => {
          const score = parseFloat(fill.dataset.score || 0);
          // Delay slightly to stagger
          setTimeout(() => {
            fill.style.width = score + '%';
          }, 100);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  rows.forEach(r => observer.observe(r));
}

// ════════════════════════════════════════════════
//  PATCH EMBEDDING SIMULATOR
// ════════════════════════════════════════════════

const PatchSim = (() => {
  let canvas, ctx;
  let currentPatchSize  = 16;
  let currentImage      = 'gradient';
  let animationId       = null;
  let animatingPatchIdx = -1;

  const CANVAS_SIZE = 448; // pixels

  // Palettes for synthetic images
  const images = {
    gradient: drawGradient,
    landscape: drawLandscape,
    noise: drawNoise,
    face: drawFace
  };

  function drawGradient(ctx, size) {
    const gx = ctx.createLinearGradient(0, 0, size, size);
    gx.addColorStop(0,   'hsl(250,80%,35%)');
    gx.addColorStop(0.33,'hsl(190,85%,35%)');
    gx.addColorStop(0.66,'hsl(320,80%,35%)');
    gx.addColorStop(1,   'hsl(40,90%,35%)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, size, size);

    // Add some circles for visual interest
    const colors = ['hsla(250,80%,65%,0.4)', 'hsla(190,85%,55%,0.35)', 'hsla(320,80%,62%,0.35)'];
    [[120, 100, 80], [280, 200, 60], [200, 350, 70], [380, 120, 50]].forEach(([cx, cy, r], i) => {
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, colors[i % 3]);
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawLandscape(ctx, size) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, size * 0.55);
    sky.addColorStop(0, 'hsl(215,60%,20%)');
    sky.addColorStop(1, 'hsl(210,50%,30%)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size * 0.55);

    // Stars
    ctx.fillStyle = 'hsla(220,10%,90%,0.8)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size * 0.45;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Mountains
    ctx.fillStyle = 'hsl(220,25%,18%)';
    ctx.beginPath(); ctx.moveTo(0, size * 0.55);
    ctx.lineTo(80, size * 0.3); ctx.lineTo(160, size * 0.5);
    ctx.lineTo(240, size * 0.25); ctx.lineTo(320, size * 0.45);
    ctx.lineTo(400, size * 0.2); ctx.lineTo(size, size * 0.4);
    ctx.lineTo(size, size * 0.55); ctx.closePath();
    ctx.fill();

    // Ground
    const ground = ctx.createLinearGradient(0, size * 0.55, 0, size);
    ground.addColorStop(0, 'hsl(145,40%,15%)');
    ground.addColorStop(1, 'hsl(145,30%,10%)');
    ctx.fillStyle = ground;
    ctx.fillRect(0, size * 0.55, size, size * 0.45);

    // Moon
    ctx.fillStyle = 'hsl(50,80%,80%)';
    ctx.beginPath();
    ctx.arc(size * 0.8, size * 0.15, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'hsl(215,60%,20%)';
    ctx.beginPath();
    ctx.arc(size * 0.82, size * 0.13, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNoise(ctx, size) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const x  = (i / 4) % size;
      const y  = Math.floor((i / 4) / size);
      const v  = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 127 + 128;
      const v2 = Math.sin(x * 0.03 + y * 0.04) * 60 + 60;
      data[i]   = (v * 0.3 + v2) | 0;         // R
      data[i+1] = (v * 0.1 + v2 * 0.5) | 0;   // G
      data[i+2] = (v * 0.8 + 40) | 0;          // B
      data[i+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function drawFace(ctx, size) {
    // Dark background
    ctx.fillStyle = 'hsl(222,30%,8%)';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;

    // Head glow
    const headGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, 160);
    headGlow.addColorStop(0, 'hsla(250,70%,50%,0.15)');
    headGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = headGlow;
    ctx.fillRect(0, 0, size, size);

    // Head
    ctx.fillStyle = 'hsl(222,25%,18%)';
    ctx.beginPath(); ctx.ellipse(cx, cy, 120, 140, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'hsla(250,80%,65%,0.4)'; ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    [cx - 42, cx + 42].forEach((ex, i) => {
      const eyeGlow = ctx.createRadialGradient(ex, cy - 20, 0, ex, cy - 20, 28);
      eyeGlow.addColorStop(0, i === 0 ? 'hsl(190,85%,60%)' : 'hsl(250,80%,65%)');
      eyeGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGlow;
      ctx.fillRect(ex - 30, cy - 50, 60, 60);
      ctx.fillStyle = i === 0 ? 'hsl(190,85%,55%)' : 'hsl(250,80%,65%)';
      ctx.beginPath(); ctx.ellipse(ex, cy - 20, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'hsl(222,30%,8%)';
      ctx.beginPath(); ctx.arc(ex, cy - 20, 6, 0, Math.PI * 2); ctx.fill();
    });

    // Mouth
    ctx.strokeStyle = 'hsla(320,80%,62%,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy + 40, 35, 0.2, Math.PI - 0.2); ctx.stroke();

    // Circuit lines
    ctx.strokeStyle = 'hsla(250,80%,65%,0.2)'; ctx.lineWidth = 1;
    [[cx - 120, cy - 30, cx - 70, cy - 20], [cx + 70, cy - 20, cx + 120, cy - 30],
     [cx - 50, cy + 100, cx - 80, cy + 140], [cx + 50, cy + 100, cx + 80, cy + 140]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = 'hsl(250,80%,65%)';
      ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  function renderGrid(highlight = -1) {
    if (!ctx) return;

    const size      = CANVAS_SIZE;
    const patchSize = currentPatchSize;
    const cols      = Math.floor(size / patchSize);
    const rows      = Math.floor(size / patchSize);

    // Draw base image
    ctx.clearRect(0, 0, size, size);
    images[currentImage](ctx, size);

    // Draw dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, size, size);

    // Redraw clear patches
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = size;
    tempCanvas.height = size;
    const tempCtx    = tempCanvas.getContext('2d');
    images[currentImage](tempCtx, size);

    // Draw patches
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const x   = col * patchSize;
        const y   = row * patchSize;

        if (highlight === -1 || idx <= highlight) {
          // Show patch clearly
          ctx.drawImage(tempCanvas, x, y, patchSize, patchSize, x, y, patchSize, patchSize);

          // Grid line
          ctx.strokeStyle = 'hsla(190,85%,55%,0.5)';
          ctx.lineWidth   = 0.5;
          ctx.strokeRect(x + 0.25, y + 0.25, patchSize - 0.5, patchSize - 0.5);

          if (highlight !== -1 && idx === highlight) {
            // Active patch highlight
            ctx.strokeStyle = 'hsla(250,80%,65%,0.9)';
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(x + 0.75, y + 0.75, patchSize - 1.5, patchSize - 1.5);

            // Token index label
            ctx.fillStyle   = 'hsla(250,80%,65%,0.8)';
            ctx.font        = `bold ${Math.min(patchSize * 0.3, 9)}px monospace`;
            ctx.textAlign   = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`t${idx}`, x + patchSize / 2, y + patchSize / 2);
          }
        }
      }
    }
  }

  function updateInfoPanel() {
    const size      = CANVAS_SIZE;
    const patchSize = currentPatchSize;
    const cols      = Math.floor(size / patchSize);
    const totalToks = cols * cols;
    const dim       = patchSize <= 16 ? 768 : 512;

    document.getElementById('info-res').textContent   = `${size} × ${size} px`;
    document.getElementById('info-patch').textContent = `${patchSize} × ${patchSize} px`;
    document.getElementById('info-grid').textContent  = `${cols} × ${cols}`;
    document.getElementById('info-tokens').textContent= `${totalToks} tokens`;
    document.getElementById('info-dim').textContent   = `${dim} (ViT-${dim === 768 ? 'B' : 'L'})`;
    document.getElementById('info-seq').textContent   = `${totalToks} × ${dim} = ${(totalToks * dim).toLocaleString()}`;
  }

  function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);

    const size   = CANVAS_SIZE;
    const cols   = Math.floor(size / currentPatchSize);
    const total  = cols * cols;
    animatingPatchIdx = 0;

    const speed  = Math.max(4, Math.floor(30 / (size / currentPatchSize)));

    let frameCount = 0;
    function step() {
      if (animatingPatchIdx >= total) {
        renderGrid(-1);
        animatingPatchIdx = -1;
        return;
      }
      frameCount++;
      if (frameCount % speed === 0) {
        renderGrid(animatingPatchIdx);
        animatingPatchIdx++;
      }
      animationId = requestAnimationFrame(step);
    }

    renderGrid(0);
    animationId = requestAnimationFrame(step);
  }

  function init() {
    canvas = document.getElementById('patch-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');

    const sizeSelect  = document.getElementById('patch-size-select');
    const imageSelect = document.getElementById('image-select');
    const btnRender   = document.getElementById('btn-render');
    const btnAnimate  = document.getElementById('btn-animate');

    function applySelections() {
      currentPatchSize = parseInt(sizeSelect?.value || '16');
      currentImage     = imageSelect?.value || 'gradient';
    }

    btnRender?.addEventListener('click', () => {
      applySelections();
      if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
      renderGrid(-1);
      updateInfoPanel();
    });

    btnAnimate?.addEventListener('click', () => {
      applySelections();
      updateInfoPanel();
      startAnimation();
    });

    // Initial render
    renderGrid(-1);
    updateInfoPanel();
  }

  return { init };
})();

// ════════════════════════════════════════════════
//  SIDEBAR SMOOTH SCROLL (prevent hash jump)
// ════════════════════════════════════════════════

function initSmoothScrollLinks() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();

      const target = document.querySelector(href);
      if (target) {
        const offset = 80; // account for sticky header
        const top    = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initReadingProgress();
  initFadeInSections();
  initScrollSpy();
  initSearch();
  initCodeTabs();
  initBenchmarkBars();
  initSmoothScrollLinks();
  PatchSim.init();

  // Activate first nav link immediately
  const firstLink = document.querySelector('.sidebar-link');
  if (firstLink) firstLink.classList.add('active');

  console.log('%c🧠 Manual IA Multimodal — Cargado', 'color:hsl(250,80%,70%); font-weight:bold; font-size:14px;');
});
