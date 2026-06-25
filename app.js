const ALL_CATEGORY = 'すべて';

let features = [];
let currentCategory = ALL_CATEGORY;
let userLocation = null;

const statusEl = document.getElementById('status');
const categoryBar = document.getElementById('category-bar');
const cardList = document.getElementById('card-list');
const locateBtn = document.getElementById('locate-btn');
const cardTemplate = document.getElementById('card-template');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

async function loadData() {
  features = PINS_DATA.features;
  setStatus(`${features.length}件のスポットを読み込みました`);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function buildCategoryBar() {
  const categories = [ALL_CATEGORY, ...new Set(features.map((f) => f.properties.category))];
  categoryBar.innerHTML = '';
  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat === currentCategory ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      currentCategory = cat;
      document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
    categoryBar.appendChild(btn);
  });
}

function render() {
  let list = features;
  if (currentCategory !== ALL_CATEGORY) {
    list = list.filter((f) => f.properties.category === currentCategory);
  }

  if (userLocation) {
    list = list
      .map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        const dist = haversineMeters(userLocation.lat, userLocation.lon, lat, lon);
        return { f, dist };
      })
      .sort((a, b) => a.dist - b.dist);
  } else {
    list = list.map((f) => ({ f, dist: null }));
  }

  cardList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'スポットが見つかりませんでした';
    cardList.appendChild(empty);
    return;
  }

  list.forEach(({ f, dist }) => {
    const node = cardTemplate.content.cloneNode(true);
    const card = node.querySelector('.card');
    const props = f.properties;
    card.href = props.google_maps_url;
    node.querySelector('.card-emoji').textContent = props.category.split(' ')[0];
    node.querySelector('.card-name').textContent = props.location.name;
    node.querySelector('.card-distance').textContent =
      dist !== null ? `📍 ${formatDistance(dist)}` : '現在地を取得すると距離を表示';
    node.querySelector('.card-address').textContent = props.location.address || '';
    cardList.appendChild(node);
  });
}

function locate() {
  if (!navigator.geolocation) {
    setStatus('このブラウザは位置情報に対応していません');
    return;
  }
  setStatus('現在地を取得中...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setStatus('現在地を取得しました。距離順に並んでいます。');
      render();
    },
    (err) => {
      setStatus(`現在地の取得に失敗しました（${err.message}）`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

locateBtn.addEventListener('click', locate);

(async function init() {
  await loadData();
  buildCategoryBar();
  render();
})();
