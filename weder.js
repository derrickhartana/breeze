function getIconSvg(code) {
  if (code === 0 || code === 1) {
    return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  }
  if (code === 2 || code === 3 || (code >= 45 && code <= 48)) {
    return `<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
  }
  if (code >= 51 && code <= 82) {
    return `<svg viewBox="0 0 24 24"><path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
  }
  if (code >= 95) {
    return `<svg viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
}

const WMO_MAP = {
  0:  ['Cerah', getIconSvg(0)],
  1:  ['Cerah Berawan', getIconSvg(1)],
  2:  ['Berawan Sebagian', getIconSvg(2)],
  3:  ['Mendung', getIconSvg(3)],
  45: ['Berkabut', getIconSvg(45)],
  48: ['Berkabut Beku', getIconSvg(48)],
  51: ['Gerimis Ringan', getIconSvg(51)],
  53: ['Gerimis', getIconSvg(53)],
  55: ['Gerimis Lebat', getIconSvg(55)],
  61: ['Hujan Ringan', getIconSvg(61)],
  63: ['Hujan', getIconSvg(63)],
  65: ['Hujan Lebat', getIconSvg(65)],
  71: ['Salju', getIconSvg(71)],
  80: ['Hujan Lokal', getIconSvg(80)],
  82: ['Hujan Lebat', getIconSvg(82)],
  95: ['Hujan dan Petir', getIconSvg(95)],
  99: ['Badai Hebat', getIconSvg(99)]
};

function wmo(code) {
  return WMO_MAP[code] || ['Tidak Diketahui', getIconSvg(3)];
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
  r.setProperty('--bg-grad-top', top);
  r.setProperty('--bg-grad-bot', bot);
  r.setProperty('--card-bg', cardBg);
  r.setProperty('--card-text', cardTxt);
  r.setProperty('--card-subtext', cardSub);
  document.getElementById('mainEl').style.background = `linear-gradient(160deg, ${top} 0%, ${bot} 100%)`;
}

function uvLabel(v) {
  if (v <= 2)  return 'Rendah';
  if (v <= 5)  return 'Sedang';
  if (v <= 7)  return 'Tinggi';
  if (v <= 10) return 'Sangat Tinggi';
  return 'Ekstrem';
}

function rainLabel(p) {
  if (p < 20) return 'Kemungkinan kecil';
  if (p < 50) return 'Mungkin terjadi';
  if (p < 80) return 'Cukup tinggi';
  return 'Sangat tinggi';
}

// Rekomendasi AI yang diacak dan lebih dinamis tergantung cuaca
function aiRec(temp, rain, uv, cond) {
  const hasil = [];
  const rnd = Math.floor(Math.random() * 3); // Pengacak untuk variasi kalimat

  // Peluang hujan primer
  if (rain >= 60) {
    hasil.push(['Sangat mungkin terjadi hujan hari ini.', 'Curah hujan diprediksi cukup intens.', 'Peluang hujan lebat mendominasi hari ini.'][rnd]);
  } else if (rain >= 30) {
    hasil.push(['Ada kemungkinan hujan, tetap waspada.', 'Gerimis berpeluang membasahi area Anda.', 'Sebaiknya bersiap untuk perubahan cuaca mendadak.'][rnd]);
  } else {
    hasil.push(['Cuaca cenderung bersahabat hari ini.', 'Langit diprediksi cerah tanpa hujan berarti.', 'Kondisi langit cukup kondusif sepanjang hari.'][rnd]);
  }

  // Rekomendasi tambahan
  if (rain >= 40) {
    hasil.push(['Pastikan membawa payung agar tidak kehujanan.', 'Sedia jas hujan jika Anda akan bepergian keluar.', 'Lindungi barang berharga dari kemungkinan basah hujan.'][rnd]);
  } else if (uv >= 6) {
    hasil.push(['Gunakan tabir surya jika beraktivitas di luar.', 'Sinar UV cukup menyengat, sangat disarankan pakai topi.', 'Hindari paparan sinar matahari langsung di terik siang.'][rnd]);
  } else if (temp >= 35) {
    hasil.push(['Suhu ekstrem, perbanyak minum air putih.', 'Cuaca sangat panas, kurangi aktivitas fisik berat di luar.', 'Tetap berada di tempat teduh atau ruang ber-AC.'][rnd]);
  } else if (temp >= 30) {
    hasil.push(['Cukup hangat, pastikan tubuh tetap terhidrasi.', 'Gunakan pakaian berbahan katun yang mudah menyerap keringat.', 'Minum air yang cukup untuk menjaga daya tahan tubuh.'][rnd]);
  } else if (cond.toLowerCase().includes('badai') || cond.toLowerCase().includes('petir')) {
    hasil.push(['Hindari tempat terbuka saat badai berlangsung.', 'Cabut colokan elektronik yang tidak perlu demi keamanan.', 'Sebaiknya tetap berada di dalam bangunan yang aman.'][rnd]);
  } else {
    hasil.push(['Kondisi udara cukup nyaman untuk beraktivitas.', 'Nikmati waktu Anda untuk bersantai di luar ruangan.', 'Suhu udara sangat mendukung untuk kegiatan harian Anda.'][rnd]);
  }
  return hasil;
}

function getUvColor(v) {
  if (v <= 2)  return '#4ade80';
  if (v <= 5)  return '#facc15';
  if (v <= 7)  return '#f97316';
  if (v <= 10) return '#ef4444';
  return '#c026d3';
}

let savedLocations = JSON.parse(localStorage.getItem('wx_locs') || 'null') || [{name: 'Bekasi', lat: -6.2383, lon: 106.9756}];
let activeIdx = parseInt(localStorage.getItem('wx_active') || '0');
if (activeIdx >= savedLocations.length) activeIdx = 0;

// Update forecast_days menjadi 6 agar bisa mencakup 5 hari setelah hari ini
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,precipitation_probability,uv_index&hourly=temperature_2m,weathercode,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode,uv_index_max,precipitation_probability_max&timezone=auto&forecast_days=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal mengambil data cuaca');
  return res.json();
}

async function geocode(q) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=id&format=json`);
  const data = await res.json();
  return data.results || [];
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function renderLocationList() {
  const list = document.getElementById('locationList');
  list.innerHTML = '';
  
  const pinSvg = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const defaultCloud = `<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;

  savedLocations.forEach((loc, i) => {
    const isCurrentLoc = (i === 0);
    const displayName = loc.name; 
    
    let iconHtml = '';
    if (isCurrentLoc) {
      iconHtml = pinSvg;
    } else if (loc.code !== undefined) {
      iconHtml = getIconSvg(loc.code);
    } else {
      iconHtml = defaultCloud;
    }

    const d = document.createElement('div');
    d.className = 'location-item' + (i === activeIdx ? ' active' : '');
    d.innerHTML = `
      <span class="location-icon">${iconHtml}</span>
      <div class="location-info">
        <div class="location-name">${displayName}</div>
        <div class="location-temp">${loc.temp != null ? loc.temp + '°C' : '...'}</div>
      </div>
      ${i > 0 ? `<span class="location-remove" onclick="removeLocation(event,${i})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>` : ''}
    `;
    d.addEventListener('click', () => switchLocation(i));
    list.appendChild(d);
  });
}

function removeLocation(e, i) {
  e.stopPropagation();
  savedLocations.splice(i, 1);
  if (activeIdx >= savedLocations.length) activeIdx = savedLocations.length - 1;
  saveLocs();
  renderLocationList();
  if (activeIdx >= 0) loadWeather(activeIdx);
}

function saveLocs() {
  localStorage.setItem('wx_locs', JSON.stringify(savedLocations));
  localStorage.setItem('wx_active', activeIdx);
}

async function switchLocation(i) {
  activeIdx = i;
  saveLocs();
  renderLocationList();
  document.getElementById('sidebar').classList.remove('open');
  await loadWeather(i);
}

function showLoading(aktif) {
  const el = document.getElementById('loadingOverlay');
  const mainEl = document.getElementById('mainEl');
  if (aktif) {
    el.classList.add('active');
    // Matikan scroll saat loading
    mainEl.classList.add('no-scroll');
  } else {
    el.classList.remove('active');
    // Kembalikan scroll setelah selesai
    mainEl.classList.remove('no-scroll');
  }
}

async function loadWeather(idx) {
  const loc = savedLocations[idx];
  if (!loc) return;
  showLoading(true);

  try {
    const data = await fetchWeather(loc.lat, loc.lon);
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

    applyTheme(code, rainProb);

    savedLocations[idx].temp = temp;
    savedLocations[idx].code = code;
    saveLocs();
    renderLocationList();

    const isCurrentLoc = (idx === 0);
    document.getElementById('currentCity').textContent = loc.name; 
    document.getElementById('topLocationIcon').style.display = isCurrentLoc ? 'block' : 'none';

    document.getElementById('tempDisplay').textContent = temp + '°C';
    document.getElementById('conditionText').textContent = cond;
    document.getElementById('hiLoText').textContent = `↑ ${hiTemp}° / ↓ ${loTemp}°`;

    document.getElementById('uvValue').textContent = uvLabel(uvIdx);
    const uvPct = Math.min((uvIdx / 11) * 100, 100);
    const dot = document.getElementById('uvDot');
    dot.style.left = uvPct + '%';
    dot.textContent = uvIdx;
    dot.style.background = getUvColor(uvIdx);
    dot.classList.add('visible');

    document.getElementById('rainValue').textContent = rainProb + '%';
    document.getElementById('rainSub').textContent = rainLabel(rainProb);

    const forecastRow = document.getElementById('forecastRow');
    forecastRow.innerHTML = '';
    const temps = [];

    // Ambil waktu dari API yang sudah menggunakan zona waktu kota pencarian (bukan browser)
    // Format `cur.time` adalah "YYYY-MM-DDTHH:MM" dari Open-Meteo
    const currentApiTime = cur.time;
    // Potong untuk mendapatkan format jam "YYYY-MM-DDTHH:00" sebagai patokan array hourly
    const currentApiHour = currentApiTime.substring(0, 13) + ":00";
    
    let si = hourly.time.indexOf(currentApiHour);
    if (si < 0) si = 0;

    hourly.time.slice(si, si + 12).forEach((t, ii) => {
      const hi = si + ii;
      const hT = Math.round(hourly.temperature_2m[hi]);
      const [, hIcon] = wmo(hourly.weathercode[hi]);
      // Ekstrak jam murni dari string (contoh: "2026-05-07T14:00" -> "14:00")
      // Hal ini mencegah browser mengkonversi ke zona waktu lokal secara otomatis
      const hH = t.substring(11, 16);
      temps.push(hT);

      const div = document.createElement('div');
      div.className = 'forecast-item';
      div.innerHTML = `
        <div class="forecast-time">${hH}</div>
        <div class="forecast-icon">${hIcon}</div>
        <div class="forecast-temp">${hT}°</div>
      `;
      forecastRow.appendChild(div);
    });

    const svg = document.getElementById('forecastChart');
    if (temps.length > 1) {
      const mn = Math.min(...temps);
      const mx = Math.max(...temps);
      const range = mx - mn || 1;
      
      const itemW = 72; 
      const W = temps.length * itemW;
      const H = 30, p = 6;
      
      const pts = temps.map((t, i) => [
        (i * itemW) + (itemW / 2),
        H - p - ((t - mn) / range) * (H - 2 * p)
      ]);
      
      const dots = pts.map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="var(--card-bg)" stroke-width="2"/>`
      ).join('');
      
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML = `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    } else {
      svg.innerHTML = '';
    }

    // Variasi peluru (bullets) prediksi agar dinamis
    const bul = document.getElementById('forecastBullets');
    bul.innerHTML = '';
    const rndIdx = Math.floor(Math.random() * 3);

    if (code >= 95) {
      const textPetir = ['Hujan lebat disertai petir berpotensi melanda hari ini.', 'Waspada potensi kilat dan badai petir di area Anda.', 'Kondisi rawan badai hari ini, amankan barang-barang luar.'];
      const li = document.createElement('li');
      li.innerHTML = `<strong>${textPetir[rndIdx]}</strong>`;
      bul.appendChild(li);
    } else if (rainProb >= 60) {
      const textHujanLebat = ['Peluang hujan sangat kuat, sediakan alat pelindung hujan.', 'Hujan diprediksi akan turun cukup lebat.', 'Sebaiknya tunda kegiatan outdoor karena curah hujan tinggi.'];
      const li = document.createElement('li');
      li.innerHTML = `<strong>${textHujanLebat[rndIdx]}</strong>`;
      bul.appendChild(li);
    } else if (rainProb >= 30) {
      const textHujanRingan = ['Hujan berpotensi turun di waktu mendatang.', 'Ada kemungkinan cuaca berubah menjadi gerimis.', 'Sedia payung sebelum hujan sebagai langkah antisipasi.'];
      const li = document.createElement('li');
      li.innerHTML = `<strong>${textHujanRingan[rndIdx]}</strong>`;
      bul.appendChild(li);
    } else {
      const textCerah = ['Peluang hujan minim, cuaca relatif cerah hari ini.', 'Hari yang tepat untuk aktivitas luar ruangan.', 'Tampaknya tidak ada ancaman hujan dalam waktu dekat.'];
      const li = document.createElement('li');
      li.innerHTML = `<strong>${textCerah[rndIdx]}</strong>`;
      bul.appendChild(li);
    }

    const liSuhu = document.createElement('li');
    liSuhu.textContent = `Suhu akan bergerak di rentang ${loTemp}°C hingga puncaknya di ${hiTemp}°C.`;
    bul.appendChild(liSuhu);

    // AI Rec
    const rekomendasiList = aiRec(temp, rainProb, uvIdx, cond);
    document.getElementById('aiBullets').innerHTML = rekomendasiList.map(r => `<li>${r}</li>`).join('');

    // Forecast 5 Hari Kedepan (Hanya mengambil array index 1 s.d 5)
    const dailyWrapper = document.getElementById('dailyForecast');
    dailyWrapper.innerHTML = '';
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 1; i <= 5; i++) {
      // Set string ISO ditambah waktu tengah hari (T12:00) untuk mencegah kesalahan interpretasi zona waktu
      const dDate = new Date(daily.time[i] + "T12:00:00");
      const dayName = dayNames[dDate.getDay()];
      const dMin = Math.round(daily.temperature_2m_min[i]);
      const dMax = Math.round(daily.temperature_2m_max[i]);
      const [, dIcon] = wmo(daily.weathercode[i]);

      dailyWrapper.innerHTML += `
        <div class="daily-row">
          <div class="daily-day">${dayName}</div>
          <div class="daily-icon">${dIcon}</div>
          <div class="daily-temp">${dMax}° <span>${dMin}°</span></div>
        </div>
      `;
    }

  } catch (err) {
    console.error(err);
    document.getElementById('conditionText').textContent = 'Koneksi terganggu.';
    document.getElementById('tempDisplay').textContent = '—';
  }

  showLoading(false);
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;

  const err = document.getElementById('searchError');
  const res = document.getElementById('searchResults');
  err.style.display = 'none';
  res.style.display = 'block';
  res.innerHTML = '<div class="search-result-item" style="opacity:0.6;pointer-events:none;">Mencari lokasi...</div>';

  try {
    const results = await geocode(q);
    if (!results.length) {
      res.innerHTML = '<div class="search-result-item" style="opacity:0.6;pointer-events:none;">Kota tidak ditemukan</div>';
      return;
    }
    res.innerHTML = results.map(r =>
      `<div class="search-result-item" onclick="addLocation('${r.name.replace(/'/g, "\\'")}',${r.latitude},${r.longitude})">
        ${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country_code ? ', ' + r.country_code : ''}
      </div>`
    ).join('');
  } catch (e) {
    err.textContent = 'Sistem gagal mencari lokasi.';
    err.style.display = 'block';
    res.style.display = 'none';
  }
}

function addLocation(name, lat, lon) {
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('searchInput').value = '';

  const existing = savedLocations.findIndex(l => Math.abs(l.lat - lat) < 0.01 && Math.abs(l.lon - lon) < 0.01);
  if (existing >= 0) {
    switchLocation(existing);
    return;
  }

  savedLocations.push({ name, lat, lon });
  activeIdx = savedLocations.length - 1;
  saveLocs();
  renderLocationList();
  document.getElementById('sidebar').classList.remove('open');
  loadWeather(activeIdx);
}

document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-relative')) {
    document.getElementById('searchResults').style.display = 'none';
  }
});

renderLocationList();
loadWeather(activeIdx);