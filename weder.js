const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
let appSettings = JSON.parse(localStorage.getItem('wx_settings') || '{"lang":"id","unit":"c"}');
let _pendingHighlightAnim = false;
let _currentLoadSession = 0; // Anti-spam token

function syncDeviceThemeTags() {
  const rootStyles = getComputedStyle(document.documentElement);
  const gradTopValue = rootStyles.getPropertyValue('--bg-grad-top').trim();
  
  const metaTag = document.getElementById('native-theme-meta');
  if (metaTag && gradTopValue) {
    // Sets the browser frame block to precisely match the top of your gradient
    metaTag.setAttribute('content', gradTopValue);
  }
}

// Fire when document layers settle
window.addEventListener('DOMContentLoaded', syncDeviceThemeTags);

// Function to update static UI labels dynamically
function updateStaticLabels() {
  const en = appSettings.lang === 'en';
  
  const lblLokasi = document.getElementById('lblLokasi');
  if (lblLokasi) lblLokasi.textContent = en ? 'Locations' : 'Lokasi';
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.placeholder = en ? 'Search city...' : 'Cari kota...';
  
  const lblPrakiraan = document.getElementById('lblPrakiraan');
  if (lblPrakiraan) lblPrakiraan.textContent = en ? 'Forecast' : 'Prakiraan';
  
  const lblLimaHari = document.getElementById('lblLimaHari');
  if (lblLimaHari) lblLimaHari.textContent = en ? '5-Day Forecast' : '5 Hari Kedepan';
  
  const lblUV = document.getElementById('lblUV');
  if (lblUV) lblUV.textContent = en ? 'UV Index' : 'Indeks UV';
  
  const lblHujan = document.getElementById('lblHujan');
  if (lblHujan) lblHujan.textContent = en ? 'Chance of Rain' : 'Peluang Hujan';
  
  const lblAI = document.getElementById('lblAI');
  if (lblAI) lblAI.textContent = en ? 'AI Recommendations' : 'Rekomendasi dari AI';
  
  const lblTitle = document.getElementById('lblSettingsTitle');
  if (lblTitle) lblTitle.textContent = en ? 'Settings' : 'Pengaturan';
  
  const lblLang = document.getElementById('lblLang');
  if (lblLang) lblLang.textContent = en ? 'Language' : 'Bahasa';
  
  const lblUnit = document.getElementById('lblUnit');
  if (lblUnit) lblUnit.textContent = en ? 'Temperature Unit' : 'Satuan Suhu';
  
  const btnLocText = document.getElementById('btnCheckLocText');
  if (btnLocText && !btnLocText.classList.contains('changing')) {
    btnLocText.textContent = en ? 'Check location permission' : 'Periksa izin lokasi';
  }
}

if (sidebar && window.innerWidth <= 768) {
  sidebar.classList.remove('open');
}

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    if (!sidebar.classList.contains('open') && window.innerWidth <= 768) {
      document.getElementById('searchInput').value = '';
      showLocationList(true);
      // Fade out main content first, then slide sidebar in
      document.getElementById('mainEl').classList.add('content-blurred');
      setTimeout(() => {
        sidebar.classList.add('open');
      }, 150);
    } else {
      sidebar.classList.remove('open');
      document.getElementById('mainEl').classList.remove('content-blurred');
    }
  });
}

if (sidebar) {
  sidebar.addEventListener('click', (e) => {
    const locationItem = e.target.closest('.location-item');
    if (!locationItem && e.target === sidebar && window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      document.getElementById('mainEl').classList.remove('content-blurred');
    }
  });
}

let _lastWinWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth !== _lastWinWidth) {
    _lastWinWidth = window.innerWidth;
    if (window.innerWidth <= 768 && sidebar) {
      sidebar.classList.remove('open');
      document.getElementById('mainEl').classList.remove('content-blurred');
    }
  }
});

const hero = document.querySelector('.hero');
const cardsWrapper = document.querySelector('.cards-wrapper');

if (hero && cardsWrapper) {
  hero.addEventListener('wheel', (e) => {
    if (window.innerWidth > 768) {
      cardsWrapper.scrollTop += e.deltaY;
    }
  });
}

const forecastScroll = document.querySelector('.forecast-scroll-area');
if (forecastScroll) {
  forecastScroll.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.stopPropagation();
      forecastScroll.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

// ─── WeatherGL — WebGL rain + badai on #rainCanvas ──────
const WeatherGL = (() => {
  const VERT = `
    attribute vec2 a_pos;
    varying   vec2 v_uv;
    void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG_HUJAN = `
    precision highp float;
    uniform float u_time; varying vec2 v_uv;
    float hash1(float n){ return fract(sin(n)*43758.5453); }
    float streak(vec2 uv, float id, float t){
      float x = hash1(id), speed = 1.4 + hash1(id+0.1)*1.6;
      float len = 0.055 + hash1(id+0.2)*0.090, w = 0.0007 + hash1(id+0.3)*0.0007;
      float phase = hash1(id+0.4);
      float y = mod(uv.y + t*speed*0.22 + phase, 1.0+len) - len;
      float dx = (uv.x - x) / w; float lat = exp(-dx*dx*0.5);
      float body = step(0.0,y)*step(y,len);
      float taper = smoothstep(len,len*0.45,y)*smoothstep(0.0,len*0.18,y);
      return lat*body*taper;
    }
    void main(){
      vec2 uv = v_uv; float t = u_time; float rain = 0.0;
      for(int i=0;i<60;i++) rain += streak(uv, float(i)*0.137, t);
      gl_FragColor = vec4(vec3(1.0), clamp(rain, 0.0, 1.0) * 0.72);
    }
  `;

  const FRAG_BADAI = `
    precision highp float;
    uniform float u_time; varying vec2 v_uv;
    float hash1(float n){ return fract(sin(n)*43758.5453); }
    float streak(vec2 uv, float id, float t){
      float x=hash1(id), speed=1.6+hash1(id+0.1)*1.8;
      float len=0.055+hash1(id+0.2)*0.095, w=0.0006+hash1(id+0.3)*0.0008;
      float y=mod(uv.y+t*speed*0.22+hash1(id+0.4),1.0+len)-len;
      return exp(-((uv.x-x)/w)*((uv.x-x)/w)*0.5)*step(0.0,y)*step(y,len)*smoothstep(len,len*0.45,y)*smoothstep(0.0,len*0.18,y);
    }
    float bolt(vec2 uv, float t){
      float cycle=5.5+hash1(floor(t/5.5))*3.0, within=mod(t,cycle);
      float flash=smoothstep(0.0,0.03,within)*smoothstep(0.18,0.08,within);
      if(flash<0.001) return 0.0;
      float seed=floor(t/cycle);
      vec2 pts[5]; 
      pts[0]=vec2(0.35+hash1(seed)*0.30,1.00);
      pts[1]=vec2(pts[0].x+(hash1(seed+1.0)-0.5)*0.18,0.78);
      pts[2]=vec2(pts[1].x+(hash1(seed+2.0)-0.5)*0.22,0.58);
      pts[3]=vec2(pts[2].x+(hash1(seed+3.0)-0.5)*0.18,0.38);
      pts[4]=vec2(pts[3].x+(hash1(seed+4.0)-0.5)*0.14,0.20);
      float md=1e9;
      for(int i=0;i<4;i++){
        vec2 pa=uv-pts[i], ba=pts[i+1]-pts[i];
        float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
        md=min(md,length(pa-ba*h));
      }
      return (smoothstep(0.004,0.0,md)+smoothstep(0.030,0.002,md)*0.4)*flash;
    }
    void main(){
      vec2 uv = v_uv; float t = u_time; float rain=0.0;
      for(int i=0;i<50;i++) rain+=streak(uv,float(i)*0.137,t);
      float within=mod(t,5.5+hash1(floor(t/5.5))*3.0);
      float lum = clamp(clamp(rain,0.0,1.0)*0.55+bolt(uv,t)+smoothstep(0.0,0.04,within)*smoothstep(0.22,0.08,within)*0.35,0.0,1.0);
      gl_FragColor=vec4(vec3(1.0),lum*0.85);
    }
  `;

  const MODES = { hujan: FRAG_HUJAN, badai: FRAG_BADAI };
  let canvas = null, gl = null, quadBuf = null;
  let curProg = null, raf = null;
  const t0 = performance.now();
  const cache = {};

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  function buildProg(fSrc) {
    const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, fSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    p._aPos = gl.getAttribLocation(p, 'a_pos'); p._uTime = gl.getUniformLocation(p, 'u_time');
    return p;
  }
  function getProg(name) { if (!cache[name]) cache[name] = buildProg(MODES[name]); return cache[name]; }
  function resize() {
    if (!canvas) return; const dpr = Math.min(window.devicePixelRatio || 1, 1.5); 
    canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function initGL() {
    if (gl) return true; canvas = document.getElementById('rainCanvas'); if (!canvas) return false;
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return false; gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);
    resize(); window.addEventListener('resize', resize); return true;
  }
  function loop() {
    raf = requestAnimationFrame(loop); 
    // GANTI: Pengecekan display menjadi visibility
    if (!gl || !curProg || canvas.style.visibility === 'hidden') return;
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(curProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(curProg._aPos);
    gl.vertexAttribPointer(curProg._aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(curProg._uTime, (performance.now() - t0) * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function setMode(name) {
    // GANTI: display: block menjadi visibility: visible
    if (!initGL()) return; canvas.style.visibility = 'visible'; curProg = getProg(name); if (!raf) loop();
  }
  function hide() {
    // GANTI: display: none menjadi visibility: hidden
    if (canvas) canvas.style.visibility = 'hidden'; if (raf) { cancelAnimationFrame(raf); raf = null; } curProg = null;
  }
  return { setMode, hide };
})();

function getIconSvg(code) {
  if (code === 0 || code === 1) return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  if (code === 2 || code === 3 || (code >= 45 && code <= 48)) return `<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
  if (code >= 51 && code <= 82) return `<svg viewBox="0 0 24 24"><path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
  if (code >= 95) return `<svg viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>`;
  return `<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
}

const WMO_ID = {
  0:  ['Cerah', 'Clear'],
  1:  ['Cerah Berawan', 'Mostly Clear'],
  2:  ['Berawan Sebagian', 'Partly Cloudy'],
  3:  ['Mendung', 'Overcast'],
  45: ['Berkabut', 'Foggy'],
  48: ['Berkabut Beku', 'Icy Fog'],
  51: ['Gerimis Ringan', 'Light Drizzle'],
  53: ['Gerimis', 'Drizzle'],
  55: ['Gerimis Lebat', 'Heavy Drizzle'],
  61: ['Hujan Ringan', 'Light Rain'],
  63: ['Hujan', 'Rain'],
  65: ['Hujan Lebat', 'Heavy Rain'],
  71: ['Salju', 'Snow'],
  80: ['Hujan Lokal', 'Rain Showers'],
  82: ['Hujan Lebat', 'Heavy Showers'],
  95: ['Hujan dan Petir', 'Thunderstorm'],
  99: ['Badai Hebat', 'Severe Thunderstorm']
};
function wmo(code) {
  const entry = WMO_ID[code];
  if (!entry) return [appSettings.lang === 'en' ? 'Unknown' : 'Tidak Diketahui', getIconSvg(3)];
  return [entry[appSettings.lang === 'en' ? 1 : 0], getIconSvg(code)];
}
function getOverlayName(code) {
  if (code === 0 || code === 1) return 'cerah';
  if (code === 2) return 'sebagian';
  if (code === 3 || (code >= 45 && code <= 48)) return 'berawan';
  if (code >= 51) return 'hujan';
  return 'berawan';
}

function weatherTheme(code, rain) {
  if (code >= 95)                              return ['#150e28', '#2d1a50', 'rgba(255,255,255,0.12)', '#ffffff', 'rgba(255,255,255,0.7)'];
  if (code >= 80 || (code >= 61 && code <= 65)) return ['#1e2f48', '#4a6a96', 'rgba(255,255,255,0.15)', '#ffffff', 'rgba(255,255,255,0.75)'];
  if (code >= 51 || (code >= 45 && code <= 48)) return ['#2e3d50', '#6a829a', 'rgba(255,255,255,0.15)', '#ffffff', 'rgba(255,255,255,0.75)'];
  if (code === 3)                              return ['#304060', '#738fae', 'rgba(255,255,255,0.2)',  '#ffffff', 'rgba(255,255,255,0.8)'];
  if (code === 2 || rain >= 40)               return ['#1e4880', '#5a90ca', 'rgba(255,255,255,0.25)', '#ffffff', 'rgba(255,255,255,0.85)'];
  if (code === 1)                              return ['#174ea8', '#6eb1f0', 'rgba(255,255,255,0.4)',  '#0a2d63', '#3A5A86'];
  return                                              ['#1359C5', '#7EB9F1', 'rgba(255,255,255,0.45)', '#0a2d63', '#3A5A86'];
}

function applyTheme(code, rain) {
  const [top, bot, cardBg, cardTxt, cardSub] = weatherTheme(code, rain);
  const r = document.documentElement.style;
  r.setProperty('--bg-grad-top', top); r.setProperty('--bg-grad-bot', bot);
  r.setProperty('--card-bg', cardBg); r.setProperty('--card-text', cardTxt); r.setProperty('--card-subtext', cardSub);
}

function uvLabel(v) {
  const en = appSettings.lang === 'en';
  if (v <= 2)  return en ? 'Low'       : 'Rendah';
  if (v <= 5)  return en ? 'Moderate'  : 'Sedang';
  if (v <= 7)  return en ? 'High'      : 'Tinggi';
  if (v <= 10) return en ? 'Very High' : 'Sangat Tinggi';
  return en ? 'Extreme' : 'Ekstrem';
}
function rainLabel(p) {
  const en = appSettings.lang === 'en';
  if (p < 20) return en ? 'Unlikely'      : 'Kemungkinan kecil';
  if (p < 50) return en ? 'Possible'      : 'Mungkin terjadi';
  if (p < 80) return en ? 'Likely'        : 'Cukup tinggi';
  return en ? 'Very likely' : 'Sangat tinggi';
}
function aiRec(temp, rain, uv, cond) {
  const en = appSettings.lang === 'en';
  const hasil = []; const rnd = Math.floor(Math.random() * 3);
  if (rain >= 60) hasil.push([
    ['Sangat mungkin terjadi hujan hari ini.', 'Curah hujan diprediksi cukup intens.', 'Peluang hujan lebat mendominasi hari ini.'],
    ['Heavy rain is very likely today.', 'Rainfall is expected to be quite intense.', 'High chance of heavy rain dominating the day.']
  ][en?1:0][rnd]);
  else if (rain >= 30) hasil.push([
    ['Ada kemungkinan hujan, tetap waspada.', 'Gerimis berpeluang membasahi area Anda.', 'Sebaiknya bersiap untuk perubahan cuaca mendadak.'],
    ['Some chance of rain, stay alert.', 'Drizzle may dampen your area.', 'Be prepared for sudden weather changes.']
  ][en?1:0][rnd]);
  else hasil.push([
    ['Cuaca cenderung bersahabat hari ini.', 'Langit diprediksi cerah tanpa hujan berarti.', 'Kondisi langit cukup kondusif sepanjang hari.'],
    ['Weather looks friendly today.', 'Skies are predicted clear with little rain.', 'Conditions are quite favorable throughout the day.']
  ][en?1:0][rnd]);

  if (rain >= 40) hasil.push([
    ['Pastikan membawa payung agar tidak kehujanan.', 'Sedia jas hujan jika Anda akan bepergian keluar.', 'Lindungi barang berharga dari kemungkinan basah hujan.'],
    ['Make sure to bring an umbrella.', 'Carry a raincoat if heading outside.', 'Protect valuables from possible rain.']
  ][en?1:0][rnd]);
  else if (uv >= 6) hasil.push([
    ['Gunakan tabir surya jika beraktivitas di luar.', 'Sinar UV cukup menyengat, sangat disarankan pakai topi.', 'Hindari paparan sinar matahari langsung di terik siang.'],
    ['Apply sunscreen if going outdoors.', 'UV is quite strong, wearing a hat is highly recommended.', 'Avoid direct sunlight during peak hours.']
  ][en?1:0][rnd]);
  else if (temp >= 35) hasil.push([
    ['Suhu ekstrem, perbanyak minum air putih.', 'Cuaca sangat panas, kurangi aktivitas fisik berat di luar.', 'Tetap berada di tempat teduh atau ruang ber-AC.'],
    ['Extreme heat, drink plenty of water.', 'Very hot weather, reduce heavy outdoor activity.', 'Stay in the shade or air-conditioned spaces.']
  ][en?1:0][rnd]);
  else if (temp >= 30) hasil.push([
    ['Cukup hangat, pastikan tubuh tetap terhidrasi.', 'Gunakan pakaian berbahan katun yang mudah menyerap keringat.', 'Minum air yang cukup untuk menjaga daya tahan tubuh.'],
    ['Quite warm, stay hydrated.', 'Wear light cotton clothing to absorb sweat.', 'Drink enough water to keep your energy up.']
  ][en?1:0][rnd]);
  else if (cond.toLowerCase().includes(en ? 'thunder' : 'badai') || cond.toLowerCase().includes(en ? 'storm' : 'petir')) hasil.push([
    ['Hindari tempat terbuka saat badai berlangsung.', 'Cabut colokan elektronik yang tidak perlu demi keamanan.', 'Sebaiknya tetap berada di dalam bangunan yang aman.'],
    ['Avoid open areas during the storm.', 'Unplug unnecessary electronics for safety.', 'Stay inside a safe building.']
  ][en?1:0][rnd]);
  else hasil.push([
    ['Kondisi udara cukup nyaman untuk beraktivitas.', 'Nikmati waktu Anda untuk bersantai di luar ruangan.', 'Suhu udara sangat mendukung untuk kegiatan harian Anda.'],
    ['Air conditions are comfortable for activity.', 'Enjoy some time relaxing outdoors.', 'Temperature is great for your daily activities.']
  ][en?1:0][rnd]);
  return hasil;
}

function getUvColor(v) {
  if (v <= 2) return '#4ade80'; if (v <= 5) return '#facc15';
  if (v <= 7) return '#f97316'; if (v <= 10) return '#ef4444';
  return '#c026d3';
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${appSettings.lang}`);
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || (appSettings.lang === 'en' ? 'My Location' : 'Lokasi Saya');
  } catch { return appSettings.lang === 'en' ? 'My Location' : 'Lokasi Saya'; }
}

let savedLocations = JSON.parse(localStorage.getItem('wx_locs') || 'null');
let activeIdx = parseInt(localStorage.getItem('wx_active') || '0');
let weatherCache = JSON.parse(localStorage.getItem('wx_cache') || '{}');
let _lastActiveIdx = activeIdx;

async function init() {
  updateStaticLabels();
  if (!savedLocations) {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 }));
      const { latitude: lat, longitude: lon } = pos.coords;
      const name = await reverseGeocode(lat, lon);
      savedLocations = [{ name, lat, lon }];
    } catch {
      savedLocations = [{name: 'Melbourne', lat: -37.8136, lon: 144.9631}];
    }
    saveLocs();
  }
  if (activeIdx >= savedLocations.length) activeIdx = 0;
  showLocationList(true); 
  loadWeather(activeIdx);
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,precipitation_probability,uv_index&hourly=temperature_2m,weathercode,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode,uv_index_max,precipitation_probability_max&timezone=auto&forecast_days=6`;
  
  // Batas waktu 10 detik agar tidak stuck
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId); // Bersihkan timeout jika sukses
    if (!res.ok) throw new Error('Gagal mengambil data cuaca');
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err; // Lempar error agar ditangkap & loading diselesaikan
  }
}

async function geocode(q) {
  const lang = appSettings.lang === 'en' ? 'en' : 'id';
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=${lang}&format=json`);
  const data = await res.json();
  return data.results || [];
}

function showLocationList(animate = false) {
  const list = document.getElementById('locationList');

  // seed temp/code/rain from cache for locations not yet fetched
  savedLocations.forEach((loc, i) => {
    if (loc.temp == null && weatherCache[i]) {
      const d = weatherCache[i];
      loc.temp = Math.round(d.current.temperature_2m);
      loc.code = d.current.weathercode;
      loc.rain = d.daily.precipitation_probability_max[0];
    }
  });

  if (animate) {
    list.classList.remove('animating'); 
    void list.offsetWidth; 
    list.classList.add('animating');
  }
  
  list.innerHTML = '';
  savedLocations.forEach((loc, i) => {
    let displayName = loc.name;
    if (displayName === 'Lokasi Saya' || displayName === 'My Location') {
      displayName = appSettings.lang === 'en' ? 'My Location' : 'Lokasi Saya';
    }

    const iconHtml = loc.code !== undefined ? getIconSvg(loc.code) : `<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
    const overlayName = loc.code !== undefined ? getOverlayName(loc.code) : 'berawan';

    let bgStyle = '';
    if (loc.code !== undefined) {
      const [top, bot] = weatherTheme(loc.code, loc.rain ?? 0);
      const mid = (a, b) => {
        const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        const r = Math.round(((pa >> 16 & 255) + (pb >> 16 & 255)) / 2);
        const g = Math.round(((pa >> 8  & 255) + (pb >> 8  & 255)) / 2);
        const bl= Math.round(((pa       & 255) + (pb       & 255)) / 2);
        return `rgb(${r},${g},${bl})`;
      };
      bgStyle = `background: ${mid(top, bot)};`;
    }

    const d = document.createElement('div');
    d.className = 'location-item' + (i === activeIdx ? ' active' + (i === activeIdx && i === _lastActiveIdx ? ' no-anim' : '') : '');
    d.setAttribute('style', bgStyle);
    d.innerHTML = `
      <div class="loc-bg-overlay" style="background-image: url('bgOverlay/${overlayName}-mini.png');"></div>
      <span class="location-icon">${iconHtml}</span>
      <div class="location-info">
        <div class="location-name">${displayName}</div>
        <div class="location-temp">${loc.temp != null ? (appSettings.unit === 'f' ? Math.round(loc.temp * 9/5 + 32) : loc.temp) + (appSettings.unit === 'f' ? '°F' : '°C') : '...'}</div>
      </div>
      ${i > 0 ? `<span class="location-remove" onclick="removeLocation(event,${i})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>` : ''}
    `;
    if (i === activeIdx && _pendingHighlightAnim) {
      d.style.animation = 'highlightIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both';
      _pendingHighlightAnim = false;
    }
    d.addEventListener('click', () => switchLocation(i));
    list.appendChild(d);
  });

  if (animate) {
    list.addEventListener('animationend', () => list.classList.remove('animating'), { once: true });
  }
}

function removeLocation(e, i) {
  e.stopPropagation();
  savedLocations.splice(i, 1);
  if (activeIdx >= savedLocations.length) activeIdx = Math.max(0, savedLocations.length - 1);
  saveLocs();
  showLocationList(false);
  if (savedLocations.length > 0) loadWeather(activeIdx);
}

function saveLocs() {
  localStorage.setItem('wx_locs', JSON.stringify(savedLocations));
  localStorage.setItem('wx_active', activeIdx);
}

async function switchLocation(i) {
  const isSame = (i === activeIdx);
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    document.getElementById('sidebar').classList.remove('open');
  }

  // If user clicks the currently active location on desktop/tablet, strictly ignore it to avoid spam.
  if (isSame && !isMobile) {
    return;
  }

  if (!isSame) {
    _pendingHighlightAnim = true;
    activeIdx = i;
    saveLocs();
    showLocationList(false);
  }
  
  await loadWeather(i);
}

function showLoading(aktif) {
  const el = document.getElementById('loadingOverlay');
  const main = document.getElementById('mainEl');
  if (aktif) {
    el.classList.add('active');
    main.classList.add('is-loading');
  } else {
    el.classList.remove('active');
    main.classList.remove('is-loading');
  }
}

let _searchTimer = null;
let _lastSearchResults = [];

function showSearchResults(results, status) {
  const list = document.getElementById('locationList');
  const en = appSettings.lang === 'en';
  list.classList.remove('animating'); void list.offsetWidth; list.classList.add('animating');

  if (status === 'searching') {
    list.innerHTML = `<div class="search-status">${en ? 'Searching location...' : 'Mencari lokasi...'}</div>`;
  } else if (status === 'empty') {
    list.innerHTML = `<div class="search-status">${en ? 'City not found.' : 'Kota tidak ditemukan.'}</div>`;
  } else if (status === 'error') {
    list.innerHTML = `<div class="search-status">${en ? 'No internet connection.' : 'Tidak ada koneksi internet.'}</div>`;
  } else {
    const pinSvg = `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    list.innerHTML = results.map((r, i) => `
      <div class="search-result-item${i === 0 ? ' first-result' : ''}" onclick="pickResult(${i})">
        <div class="search-result-icon">${pinSvg}</div>
        <div class="search-result-info">
          <div class="search-result-name">${r.name}</div>
          <div class="search-result-sub">${[r.admin1, r.country_code].filter(Boolean).join(', ')}</div>
        </div>
      </div>
    `).join('');
  }
  list.addEventListener('animationend', () => list.classList.remove('animating'), { once: true });
}

document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.trim();
  clearTimeout(_searchTimer);

  if (!q) {
    _lastSearchResults = [];
    showLocationList(true); 
    return;
  }

  showSearchResults([], 'searching');

  _searchTimer = setTimeout(async () => {
    try {
      const results = await geocode(q);
      _lastSearchResults = results;
      if (!results.length) {
        showSearchResults([], 'empty');
      } else {
        showSearchResults(results, 'results');
      }
    } catch {
      showSearchResults([], 'error');
    }
  }, 400);
});

function pickResult(idx) {
  const r = _lastSearchResults[idx];
  if (!r) return;
  
  // Clear search field
  document.getElementById('searchInput').value = '';
  showLocationList(true); 

  const existing = savedLocations.findIndex(l => Math.abs(l.lat - r.latitude) < 0.01 && Math.abs(l.lon - r.longitude) < 0.01);
  if (existing >= 0) {
    switchLocation(existing);
    return; 
  }

  savedLocations.push({ name: r.name, lat: r.latitude, lon: r.longitude });
  activeIdx = savedLocations.length - 1;
  saveLocs();
  showLocationList(true);

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
  loadWeather(activeIdx);
}

// Fungsi bantuan untuk animasi yang konsisten
function triggerEnter(el) {
  if (!el) return;
  el.classList.remove('exiting'); // Bersihkan status keluar
  el.classList.remove('entering'); 
  void el.offsetWidth; // Force reflow
  el.classList.add('entering');
  el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
}

function triggerExit(el) {
  if (!el) return;
  el.classList.remove('entering'); // Hentikan paksa jika sedang masuk
  el.classList.remove('exiting');
  void el.offsetWidth; // Force reflow
  el.classList.add('exiting');
}

async function loadWeather(idx) {
  const loc = savedLocations[idx];
  if (!loc) return;
  
  const currentSession = ++_currentLoadSession; // Anti-spam token

  // Eksekusi Animasi Keluar
  triggerExit(document.getElementById('mainBgOverlay'));
  triggerExit(document.getElementById('rainCanvas'));
  triggerExit(document.querySelector('.location-label'));
  triggerExit(document.querySelector('.hero-left'));
  triggerExit(document.getElementById('menuBtn'));
  triggerExit(document.querySelector('.cards-grid'));
  triggerExit(document.getElementById('mainEl'));

  showLoading(true);

  let data;
  try {
    const fetchPromise = fetchWeather(loc.lat, loc.lon).then(d => {
      weatherCache[idx] = d;
      localStorage.setItem('wx_cache', JSON.stringify(weatherCache));
      return d;
    });

    // Tunggu animasi Exiting selesai (sekitar 450ms)
    const delayPromise = new Promise(r => setTimeout(r, 450));
    
    const results = await Promise.all([
      fetchPromise.catch(err => {
        if (weatherCache[idx]) return weatherCache[idx];
        throw err;
      }), 
      delayPromise
    ]);
    
    if (currentSession !== _currentLoadSession) return;
    
    data = results[0];
  } catch (err) {
    if (currentSession !== _currentLoadSession) return;
    document.getElementById('conditionText').textContent = appSettings.lang === 'en' ? 'No internet connection.' : 'Tidak ada koneksi internet.';
    document.getElementById('tempDisplay').textContent = '—';
    showLoading(false);
    if (window.innerWidth <= 768 && !document.getElementById('sidebar').classList.contains('open')) {
      document.getElementById('mainEl').classList.remove('content-blurred');
    }
    return;
  }

  const cur = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  const temp = Math.round(cur.temperature_2m);
  const code = cur.weathercode;
  const [cond] = wmo(code);
  const hiTemp = Math.round(daily.temperature_2m_max[0]);
  const loTemp = Math.round(daily.temperature_2m_min[0]);
  const uvIdx = Math.round(daily.uv_index_max[0]);
  const rainProb = daily.precipitation_probability_max[0];
  const toDisplay = (t) => appSettings.unit === 'f' ? Math.round(t * 9/5 + 32) : t;
  const unitSym = appSettings.unit === 'f' ? '°F' : '°C';

  applyTheme(code, rainProb);
  
  const overlayName = getOverlayName(code);
  const mainBg = document.getElementById('mainBgOverlay');
  const isGlMode = overlayName === 'hujan' || code >= 95;
  if (isGlMode) {
    mainBg.style.backgroundImage = 'none';
    WeatherGL.setMode(code >= 95 ? 'badai' : 'hujan');
  } else {
    WeatherGL.hide();
    mainBg.style.backgroundImage = `url('bgOverlay/${overlayName}.png')`;
  }

  savedLocations[idx].temp = temp;
  savedLocations[idx].code = code;
  savedLocations[idx].rain = rainProb;
  saveLocs();
  
  if (!document.getElementById('searchInput').value.trim()) {
    showLocationList(false); 
  }

  const isCurrentLoc = (idx === 0);
  let currentCityName = loc.name;
  if (currentCityName === 'Lokasi Saya' || currentCityName === 'My Location') {
    currentCityName = appSettings.lang === 'en' ? 'My Location' : 'Lokasi Saya';
  }
  document.getElementById('currentCity').textContent = currentCityName; 
  document.getElementById('topLocationIcon').style.display = isCurrentLoc ? 'block' : 'none';

  document.getElementById('tempDisplay').textContent = toDisplay(temp) + unitSym;
  document.getElementById('conditionText').textContent = cond;
  document.getElementById('hiLoText').textContent = `↑ ${toDisplay(hiTemp)}° / ↓ ${toDisplay(loTemp)}°`;

  document.getElementById('uvValue').textContent = uvLabel(uvIdx);
  const uvPct = Math.min((uvIdx / 11) * 100, 100);
  const dot = document.getElementById('uvDot');
  dot.style.left = uvPct + '%'; dot.textContent = uvIdx;
  dot.style.background = getUvColor(uvIdx); dot.classList.add('visible');

  document.getElementById('rainValue').textContent = rainProb + '%';
  document.getElementById('rainSub').textContent = rainLabel(rainProb);

  const forecastRow = document.getElementById('forecastRow');
  forecastRow.innerHTML = '';
  const temps = [];

  const currentApiTime = cur.time;
  const currentApiHour = currentApiTime.substring(0, 13) + ":00";
  let si = hourly.time.indexOf(currentApiHour);
  if (si < 0) si = 0;

  hourly.time.slice(si, si + 12).forEach((t, ii) => {
    const hi = si + ii; const hT = toDisplay(Math.round(hourly.temperature_2m[hi]));
    const [, hIcon] = wmo(hourly.weathercode[hi]); const hH = t.substring(11, 16);
    temps.push(hT);
    const div = document.createElement('div');
    div.className = 'forecast-item';
    div.innerHTML = `<div class="forecast-time">${hH}</div><div class="forecast-icon">${hIcon}</div><div class="forecast-temp">${hT}°</div>`;
    forecastRow.appendChild(div);
  });

  const svg = document.getElementById('forecastChart');
  if (temps.length > 1) {
    const mn = Math.min(...temps); const mx = Math.max(...temps); const range = mx - mn || 1;
    const itemW = 72; const W = temps.length * itemW; const H = 30, p = 6;
    const pts = temps.map((t, i) => [(i * itemW) + (itemW / 2), H - p - ((t - mn) / range) * (H - 2 * p)]);
    const dots = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="var(--card-bg)" stroke-width="2"/>`).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
  } else { svg.innerHTML = ''; }

  const bul = document.getElementById('forecastBullets');
  bul.innerHTML = '';
  const en = appSettings.lang === 'en';
  const rndIdx = Math.floor(Math.random() * 3);

  if (code >= 95) {
    const txt = en
      ? ['Heavy rain with lightning may strike today.', 'Watch out for potential thunderstorms in your area.', 'Storm conditions today; secure outdoor items.']
      : ['Hujan lebat disertai petir berpotensi melanda hari ini.', 'Waspada potensi kilat dan badai petir di area Anda.', 'Kondisi rawan badai hari ini, amankan barang-barang luar.'];
    bul.innerHTML += `<li><strong>${txt[rndIdx]}</strong></li>`;
  } else if (rainProb >= 60) {
    const txt = en
      ? ['Very high chance of rain; bring protection.', 'Rain is predicted to be quite heavy.', 'Consider postponing outdoor plans due to high rainfall.']
      : ['Peluang hujan sangat kuat, sediakan alat pelindung hujan.', 'Hujan diprediksi akan turun cukup lebat.', 'Sebaiknya tunda kegiatan outdoor karena curah hujan tinggi.'];
    bul.innerHTML += `<li><strong>${txt[rndIdx]}</strong></li>`;
  } else if (rainProb >= 30) {
    const txt = en
      ? ['Rain may fall later in the day.', 'There is a chance of drizzle ahead.', 'Keep an umbrella handy just in case.']
      : ['Hujan berpotensi turun di waktu mendatang.', 'Ada kemungkinan cuaca berubah menjadi gerimis.', 'Sedia payung sebelum hujan sebagai langkah antisipasi.'];
    bul.innerHTML += `<li><strong>${txt[rndIdx]}</strong></li>`;
  } else {
    const txt = en
      ? ['Low chance of rain; mostly clear skies.', 'A great day for outdoor activities.', 'No significant rain threat in the near term.']
      : ['Peluang hujan minim, cuaca relatif cerah hari ini.', 'Hari yang tepat untuk aktivitas luar ruangan.', 'Tampaknya tidak ada ancaman hujan dalam waktu dekat.'];
    bul.innerHTML += `<li><strong>${txt[rndIdx]}</strong></li>`;
  }
  bul.innerHTML += `<li>${en ? `Temperatures will range from ${toDisplay(loTemp)}${unitSym} up to ${toDisplay(hiTemp)}${unitSym}.` : `Suhu akan bergerak di rentang ${toDisplay(loTemp)}${unitSym} hingga puncaknya di ${toDisplay(hiTemp)}${unitSym}.`}</li>`;

  const rekomendasiList = aiRec(temp, rainProb, uvIdx, cond);
  document.getElementById('aiBullets').innerHTML = rekomendasiList.map(r => `<li>${r}</li>`).join('');

  const dailyWrapper = document.getElementById('dailyForecast');
  dailyWrapper.innerHTML = '';
  const dayNames = en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  for (let i = 1; i <= 5; i++) {
    const dDate = new Date(daily.time[i] + "T12:00:00");
    const dayName = dayNames[dDate.getDay()];
    const dMin = toDisplay(Math.round(daily.temperature_2m_min[i]));
    const dMax = toDisplay(Math.round(daily.temperature_2m_max[i]));
    const [, dIcon] = wmo(daily.weathercode[i]);

    dailyWrapper.innerHTML += `
      <div class="daily-row">
        <div class="daily-day">${dayName}</div>
        <div class="daily-icon">${dIcon}</div>
        <div class="daily-temp">${dMax}° <span>${dMin}°</span></div>
      </div>
    `;
  }

  const cWrap = document.querySelector('.cards-wrapper');
  if (cWrap) cWrap.scrollTop = 0;
  const hWrap = document.querySelector('.hero');
  if (hWrap) hWrap.scrollTop = 0;

  if (window.innerWidth <= 768) {
    document.getElementById('mainEl').classList.remove('content-blurred');
  }

  // Eksekusi Animasi Masuk
  triggerEnter(document.getElementById('mainBgOverlay'));
  triggerEnter(document.getElementById('rainCanvas'));
  triggerEnter(document.querySelector('.location-label'));
  triggerEnter(document.querySelector('.hero-left'));
  triggerEnter(document.getElementById('menuBtn'));
  triggerEnter(document.querySelector('.cards-grid'));

  showLoading(false);
}

// ─── Settings Modal ─────────────────────────────────────────────────────────
(function() {
  const overlay   = document.getElementById('settingsModal');
  const openBtn   = document.getElementById('settingsBtn');
  const closeBtn  = document.getElementById('settingsClose');
  const langSel   = document.getElementById('langCustomSelect');
  const unitSel   = document.getElementById('unitCustomSelect');
  const btnLoc    = document.getElementById('btnCheckLoc');
  const contentWrap = document.getElementById('settingsContentWrap');

  function openSettings() {
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.classList.add('settings-open'); 
    if (contentWrap) {
      contentWrap.classList.remove('anim-in');
      void contentWrap.offsetWidth;
      contentWrap.classList.add('anim-in');
    }
  }

  function closeSettings() {
    if (!overlay) return;
    document.body.classList.remove('settings-open'); 
    if (contentWrap) {
      contentWrap.classList.remove('anim-in');
      contentWrap.classList.add('anim-out');
    }
    overlay.classList.remove('active');
    document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('open'));
    setTimeout(() => {
      if (contentWrap) contentWrap.classList.remove('anim-out');
    }, 350);
  }

  if (openBtn)  openBtn.addEventListener('click', openSettings);
  if (closeBtn) closeBtn.addEventListener('click', closeSettings);
  if (overlay)  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeSettings();
  });

  // Custom Dropdown Setup
  function setupCustomSelect(el, currentVal, onChange) {
    if (!el) return;
    const trigger = el.querySelector('.select-trigger');
    const label = el.querySelector('.select-label');
    const options = el.querySelectorAll('.select-option');

    function setValue(val) {
      el.setAttribute('data-value', val);
      options.forEach(o => {
        if (o.getAttribute('data-value') === val) {
          o.classList.add('selected');
          label.textContent = o.textContent;
        } else {
          o.classList.remove('selected');
        }
      });
    }

    setValue(currentVal);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = el.classList.contains('open');
      document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('open'));
      if (!isOpen) el.classList.add('open');
    });

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        setValue(val);
        el.classList.remove('open');
        onChange(val);
      });
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('open'));
  });

// Jadi ini:
  function langBlurTransition(callback) {
    const items = document.querySelectorAll(
      '.settings-header .card-title, .settings-body label, .settings-body .select-trigger, .settings-body .settings-btn-action'
    );
    items.forEach(el => {
      el.style.transition = 'opacity 0.2s ease, filter 0.2s ease';
      el.style.opacity = '0';
      el.style.filter = 'blur(8px)';
    });
    setTimeout(() => {
      callback();
      requestAnimationFrame(() => {
        items.forEach(el => {
          el.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
          el.style.opacity = '';
          el.style.filter = '';
          setTimeout(() => { el.style.transition = ''; }, 300);
        });
      });
    }, 220);
  }

  if (langSel) {
    setupCustomSelect(langSel, appSettings.lang, (val) => {
      langBlurTransition(() => {
        appSettings.lang = val;
        localStorage.setItem('wx_settings', JSON.stringify(appSettings));
        updateStaticLabels();
        // Sync label dropdown setelah bahasa berubah
        const langLabel = langSel.querySelector('.select-label');
        if (langLabel) langLabel.textContent = val === 'en' ? 'English' : 'Indonesia';
        if (unitSel) {
          const unitLabel = unitSel.querySelector('.select-label');
          if (unitLabel) unitLabel.textContent = appSettings.unit === 'f' ? 'Fahrenheit (°F)' : 'Celsius (°C)';
        }
        if (savedLocations && savedLocations.length > 0) {
          showLocationList(false);
          if (window.innerWidth > 768 || !document.getElementById('sidebar').classList.contains('open')) {
            loadWeather(activeIdx);
          }
        }
      });
    });
  }

  if (unitSel) {
    setupCustomSelect(unitSel, appSettings.unit, (val) => {
      appSettings.unit = val;
      localStorage.setItem('wx_settings', JSON.stringify(appSettings));
      if (savedLocations && savedLocations.length > 0) {
        showLocationList(false);
        if (window.innerWidth > 768 || !document.getElementById('sidebar').classList.contains('open')) {
          loadWeather(activeIdx);
        }
      }
    });
  }

  if (btnLoc) {
    let _locTimer = null;
    const btnLocText = document.getElementById('btnCheckLocText');
    
    function defaultLocLabel() {
      return appSettings.lang === 'en' ? 'Check location permission' : 'Periksa izin lokasi';
    }

    function setBtnText(text) {
      btnLocText.classList.add('changing');
      setTimeout(() => { btnLocText.textContent = text; btnLocText.classList.remove('changing'); }, 300);
    }

    btnLoc.addEventListener('click', async () => {
      if (btnLoc.disabled) return;
      btnLoc.disabled = true;
      const en = appSettings.lang === 'en';
      clearTimeout(_locTimer);
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(
            () => { setBtnText(en ? 'Permission already granted' : 'Izin sudah diberikan'); _locTimer = setTimeout(() => { setBtnText(defaultLocLabel()); btnLoc.disabled = false; }, 3000); },
            () => { setBtnText(en ? 'Permission was denied' : 'Izin ditolak sebelumnya'); _locTimer = setTimeout(() => { setBtnText(defaultLocLabel()); btnLoc.disabled = false; }, 3000); }
          );
          return;
        }
        setBtnText(result.state === 'granted' ? (en ? 'Permission already granted' : 'Izin sudah diberikan') : (en ? 'Permission was denied' : 'Izin ditolak sebelumnya'));
      } catch { setBtnText('Error'); }
      _locTimer = setTimeout(() => { setBtnText(defaultLocLabel()); btnLoc.disabled = false; }, 3000);
    });
  }
})();

init();
