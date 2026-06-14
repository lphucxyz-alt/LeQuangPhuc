// ===== SMART DAY/NIGHT THEME SYSTEM =====
// Tự động chọn theme theo giờ nếu chưa có lựa chọn thủ công
// 6:00 - 18:00 → sáng/ngày → light
// 18:00 - 6:00 → tối/đêm → dark

function getAutoTheme() {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? 'light' : 'dark';
}

const themeToggleBtn = document.getElementById('theme-toggle');

function setTheme(themeName, save = true) {
  const isLight = themeName === 'light';
  if (isLight) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.setAttribute('data-theme', 'light');
    if (themeToggleBtn) themeToggleBtn.innerHTML = '🌙';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
    if (themeToggleBtn) themeToggleBtn.innerHTML = '☀️';
  }
  if (save) localStorage.setItem('portfolio_theme', themeName);
  if (typeof window.reinitParticles === 'function') {
    window.reinitParticles?.();
  }
}

// Khởi tạo: dùng thủ công nếu có, nếu không dùng auto
const savedTheme = localStorage.getItem('portfolio_theme');
const isManual = localStorage.getItem('portfolio_theme_manual') === '1';
const initTheme = (savedTheme && isManual) ? savedTheme : getAutoTheme();
setTheme(initTheme, false);

// Nút toggle: khi nhấn → đánh dấu thủ công
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = (
      document.documentElement.getAttribute('data-theme') === 'light' ||
      document.body.getAttribute('data-theme') === 'light'
    ) ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('portfolio_theme', newTheme);
    localStorage.setItem('portfolio_theme_manual', '1');
    setTheme(newTheme, true);
    document.body.classList.add('theme-switching');
    setTimeout(() => document.body.classList.remove('theme-switching'), 500);
  });
}

// Đồng bộ tab
window.addEventListener('storage', (event) => {
  if (event.key === 'portfolio_theme') setTheme(event.newValue, false);
});

// Tự động re-check mỗi phút nếu không manual (khi chạy qua đêm/sáng)
setInterval(() => {
  const manual = localStorage.getItem('portfolio_theme_manual') === '1';
  if (!manual) {
    const autoTheme = getAutoTheme();
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (autoTheme !== current) setTheme(autoTheme, false);
  }
}, 60000);

// ===== INTRO SCREEN =====
const introScreen = document.getElementById('intro-screen');
if (introScreen) {
  if (sessionStorage.getItem('portfolio_intro_seen')) {
    // Inline script ở <head> đã display:none rồi — chỉ đảm bảo thêm
    introScreen.style.display = 'none';
  } else {
    sessionStorage.setItem('portfolio_intro_seen', 'true');
    setTimeout(() => introScreen.classList.add('fade-out'), 2200);
  }
}

// ===== CUSTOM CURSOR =====
const cursorDot = document.getElementById('cursor-dot');
let lastWaveTime = 0;
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

if (isTouchDevice) {
  if (cursorDot) cursorDot.style.display = 'none';
  document.body.style.cursor = 'auto';
} else {
  // [VĐ2-F] will-change giúp GPU tạo composite layer riêng cho cursor
  if (cursorDot) cursorDot.style.willChange = 'transform, left, top';
}

document.addEventListener('mousemove', (e) => {
  if (cursorDot) {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
  }
  const now = Date.now();
  if (now - lastWaveTime > 120) {
    createRipple(e.clientX, e.clientY, false);
    lastWaveTime = now;
  }
});

document.addEventListener('mousedown', (e) => createRipple(e.clientX, e.clientY, true));

const MAX_WAVES = 3;
function createRipple(x, y, isClick) {
  // [Fix #9] Giới hạn tối đa 3 wave elements trong DOM
  const existingWaves = document.querySelectorAll('.cursor-wave');
  if (existingWaves.length >= MAX_WAVES) existingWaves[0].remove();
  const wave = document.createElement('div');
  wave.className = isClick ? 'cursor-wave click' : 'cursor-wave';
  wave.style.left = x + 'px';
  wave.style.top = y + 'px';
  document.body.appendChild(wave);
  setTimeout(() => wave.remove(), isClick ? 1000 : 800);
}

document.addEventListener('mouseover', (e) => {
  const hoverable = e.target.closest(
    'a, button, .task-item, .chapter-card, .tool-pill, .skill-card, .challenge-card, .future-list li, .timeline-item, #back-to-top, .sub-nav a'
  );
  if (hoverable && cursorDot) cursorDot.classList.add('hover');
});

document.addEventListener('mouseout', (e) => {
  const hoverable = e.target.closest(
    'a, button, .task-item, .chapter-card, .tool-pill, .skill-card, .challenge-card, .future-list li, .timeline-item, #back-to-top, .sub-nav a'
  );
  if (!hoverable && cursorDot) cursorDot.classList.remove('hover');
});

// ===== PARTICLES =====
// [Fix #13] Global getter — tránh race condition khi đổi theme
function isCurrentlyLight() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    || document.body.getAttribute('data-theme') === 'light';
}

const canvas = document.getElementById('particles-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrameId = null;
  let isPageVisible = true;

  // [VĐ2-D] Debounce resize — tránh gọi lại mỗi pixel khi resize/bàn phím ảo mobile
  let resizeTimer;
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 200);
  });

  // [VĐ2-E] Page Visibility API — dừng animation khi tab bị ẩn
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible && !animFrameId) {
      animateParticles();
    }
  });

  // [VĐ2-B] Số lượng particle: 30 trên mobile, 55 trên desktop
  const PARTICLE_COUNT = isTouchDevice ? 30 : 55;

  class Particle {
    constructor() { this.init(); }
    init() {
      this.isLight = document.documentElement.getAttribute('data-theme') === 'light'
        || document.body.getAttribute('data-theme') === 'light';
      this.x = Math.random() * canvas.width;
      if (this.isLight) {
        this.y = Math.random() * -canvas.height;
        this.size = Math.random() * 4 + 3;
        this.speedY = Math.random() * 1.2 + 0.8;
        this.speedX = Math.random() * 2 - 1;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = Math.random() * 0.04 - 0.02;
        const colors = ['#f59e0b', '#d97706', '#fbbf24', '#ea580c', '#b45309'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      } else {
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedY = -(Math.random() * 0.4 + 0.1);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = Math.random() * 0.03 + 0.01;
        const colors = ['#4fc3f7', '#7c83f5', '#a78bfa', '#f0f4ff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
    }
    update() {
      if (isCurrentlyLight()) {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
        this.angle += this.spin;
        if (this.y > canvas.height + 20) { this.init(); this.y = -20; }
      } else {
        this.y += this.speedY;
        this.x += this.speedX;
        this.twinkle += this.twinkleSpeed;
        if (this.y < -10) { this.init(); this.y = canvas.height + 10; }
      }
    }
    draw() {
      ctx.save();
      if (isCurrentlyLight()) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // [VĐ2-A] Bỏ shadowBlur (nặng GPU nhất) — dùng 2 vòng tròn lồng nhau để giả glow
        const opacity = 0.3 + 0.7 * Math.sin(this.twinkle);
        // Hào quang mềm bên ngoài (giả glow, không dùng shadowBlur)
        ctx.globalAlpha = Math.max(0, opacity * 0.25);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.8, 0, Math.PI * 2);
        ctx.fill();
        // Hạt nhân sáng bên trong
        ctx.globalAlpha = Math.max(0, opacity);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.reinitParticles = function () { particles.forEach(p => p.init()); };
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  function animateParticles() {
    // [VĐ2-E] Không render khi tab ẩn
    if (!isPageVisible) {
      animFrameId = null;
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    // [Fix #1] Hook cho hiệu ứng bổ sung (sao băng, ngôi sao nền) — dùng chung 1 rAF
    if (typeof window.drawExtraHook === 'function') window.drawExtraHook(ctx, canvas);
    animFrameId = requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===== SMOOTH SCROLL CHO NAVBAR LINKS =====
// Dùng scrollIntoView() kết hợp CSS scroll-padding-top để offset navbar chuẩn
document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href').slice(1);
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener('click', () => navLinks.classList.toggle('show'));
  // [Fix #5] Đóng menu ngay lập tức — tránh flash khi navigate sang trang khác
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('show');
    });
  });
  // [Fix #15] Keyboard Escape để đóng mobile menu (WCAG 2.1)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') navLinks.classList.remove('show');
  });
}

// ===== BACK TO TOP =====
let backToTopBtn = document.getElementById('back-to-top');
if (!backToTopBtn) {
  backToTopBtn = document.createElement('button');
  backToTopBtn.id = 'back-to-top';
  backToTopBtn.innerHTML = '↑';
  backToTopBtn.setAttribute('aria-label', 'Lên đầu trang');
  document.body.appendChild(backToTopBtn);
}
window.addEventListener('scroll', () => {
  backToTopBtn.classList.toggle('show', window.scrollY > 400);
}, { passive: true });
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== READING PROGRESS =====
let progressBar = document.getElementById('reading-progress');
if (!progressBar) {
  progressBar = document.createElement('div');
  progressBar.id = 'reading-progress';
  document.body.prepend(progressBar);
}
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = progress + '%';
}, { passive: true });

// ===== PREFETCHING ON HOVER =====
document.querySelectorAll('a[href]').forEach(link => {
  link.addEventListener('mouseenter', () => {
    const href = link.getAttribute('href');
    if (href && href.endsWith('.html') && !link.hasAttribute('data-prefetched')) {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = href;
      document.head.appendChild(prefetchLink);
      link.setAttribute('data-prefetched', 'true');
    }
  }, { once: true });
});

// ===== SLIDING PILL NAV INDICATOR =====
function initNavPill(navLinksEl) {
  if (!navLinksEl) return;

  // Tạo pill element và chèn vào .nav-links
  const pill = document.createElement('span');
  pill.className = 'nav-pill';
  navLinksEl.appendChild(pill);

  // Di chuyển pill đến đúng vị trí + kích thước của một <a>
  function movePillTo(target, instant) {
    if (!target) { pill.style.opacity = '0'; return; }
    const parentRect = navLinksEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    pill.style.left   = (targetRect.left - parentRect.left) + 'px';
    pill.style.top    = (targetRect.top  - parentRect.top)  + 'px';
    pill.style.width  = targetRect.width  + 'px';
    pill.style.height = targetRect.height + 'px';
    pill.style.opacity = '1';
    if (instant) {
      pill.classList.add('no-transition');
      // Force reflow để trình duyệt áp dụng no-transition trước khi gỡ
      pill.offsetHeight; // eslint-disable-line no-unused-expressions
      requestAnimationFrame(() => pill.classList.remove('no-transition'));
    }
  }

  // Lấy tab .active hiện tại
  function getActiveLink() {
    return navLinksEl.querySelector('a.active');
  }

  // Quay pill về tab active
  function returnToActive() {
    movePillTo(getActiveLink(), false);
  }

  // Khởi tạo ngay tại tab active — KHÔNG có transition
  movePillTo(getActiveLink(), true);

  // Hover: pill di chuyển tới tab đang hover
  const links = navLinksEl.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('mouseenter', () => movePillTo(link, false));
  });

  // Mouseout khỏi .nav-links → quay về tab active
  navLinksEl.addEventListener('mouseleave', returnToActive);

  // MutationObserver: theo dõi thay đổi class trên các <a> trong .nav-links
  // (scroll listener tự động đổi .active theo section)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        // Chỉ cập nhật khi không đang hover trong nav
        if (!navLinksEl.matches(':hover')) {
          returnToActive();
        }
        break;
      }
    }
  });
  links.forEach(link => {
    observer.observe(link, { attributes: true, attributeFilter: ['class'] });
  });

  // Resize: cập nhật vị trí pill khi cửa sổ thay đổi kích thước
  let pillResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(pillResizeTimer);
    pillResizeTimer = setTimeout(() => movePillTo(getActiveLink(), true), 150);
  });
}

// Tự động khởi tạo cho .nav-links mặc định
initNavPill(document.querySelector('.nav-links'));
