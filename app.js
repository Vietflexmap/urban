/*
 * Urban Terrain Studio web companion.
 * Workflow adapted around Terrain Product Studio concepts (GPL-2.0-or-later).
 * Original Terrain Product Studio: https://github.com/hulauwa/terrain-product-studio
 * Browser preview uses Three.js r128 + GeoTIFF.js 2.1.3, mirroring the upstream WebGIS dependency family.
 */

const $ = (id) => document.getElementById(id);

const products = [
  ["topography", "🗺️", "Topographic map", "Color relief · hillshade · contours"],
  ["geomorphometry", "📐", "Geomorphometry", "Slope · aspect · TRI · TPI · roughness"],
  ["hydrology", "💧", "Hydrology", "Flow · streams · basins · TWI"],
  ["hazard", "⚠️", "Hazard", "Landslide · LS · SPI/STI · multihazard"],
  ["web3d", "🌐", "3D WebGIS", "Interactive terrain HTML viewer"],
  ["report", "📊", "Analytics report", "Topographic intelligence HTML"],
  ["geopackage", "📦", "GeoPackage", "Raster + vector bundle"],
  ["mesh", "🖨️", "STL / OBJ", "3D-printable terrain model"]
];

const selected = new Set(products.map(([key]) => key));
let demState = null;
let scene, camera, renderer, controls, terrainMesh, resizeObserver;
let currentMode = "elevation";

function renderProducts() {
  const grid = $("productGrid");
  grid.innerHTML = "";
  for (const [key, icon, name, desc] of products) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `product-card ${selected.has(key) ? "active" : ""}`;
    card.dataset.key = key;
    card.innerHTML = `<span class="icon">${icon}</span><strong>${name}</strong><small>${desc}</small>`;
    card.addEventListener("click", () => {
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      renderProducts();
      updateRunMessage();
    });
    grid.appendChild(card);
  }
}

function updateRunMessage(message) {
  $("runMessage").textContent = message || `${selected.size}/${products.length} nhóm sản phẩm được chọn. Full processing chạy trong QGIS.`;
}

function setStatus(text) {
  $("engineStatus").textContent = text;
}

function formatNumber(v, digits = 1) {
  return Number.isFinite(v) ? v.toLocaleString("vi-VN", { maximumFractionDigits: digits }) : "—";
}

function initThree() {
  if (renderer) return;
  const host = $("viewer");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081019);
  camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 5000);
  camera.position.set(110, -125, 105);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x1a2630, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(-80, -120, 180);
  scene.add(sun);
  scene.add(new THREE.GridHelper(260, 20, 0x28445c, 0x172b3c));

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  resizeObserver = new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(host);
}

function resetCamera() {
  if (!camera || !controls) return;
  camera.position.set(110, -125, 105);
  controls.target.set(0, 0, 0);
  controls.update();
}

function colorElevation(t) {
  const c = new THREE.Color();
  const hue = 0.60 - 0.48 * t;
  c.setHSL(hue, 0.62, 0.28 + 0.32 * t);
  return c;
}

function colorSlope(t) {
  const c = new THREE.Color();
  c.setHSL(0.33 - 0.33 * Math.min(1, t), 0.72, 0.42);
  return c;
}

function colorHillshade(v) {
  const g = Math.max(0.08, Math.min(0.94, v));
  return new THREE.Color(g, g, g);
}

function computeSlopeAndShade(values, w, h) {
  const slopes = new Float32Array(values.length);
  const shades = new Float32Array(values.length);
  let maxSlope = 0;
  const sample = (x, y) => values[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  const az = 315 * Math.PI / 180;
  const alt = 45 * Math.PI / 180;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dzdx = (sample(x + 1, y) - sample(x - 1, y)) * 0.5;
      const dzdy = (sample(x, y + 1) - sample(x, y - 1)) * 0.5;
      const slope = Math.atan(Math.hypot(dzdx, dzdy));
      slopes[i] = slope;
      maxSlope = Math.max(maxSlope, slope);
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - aspect);
      shades[i] = 0.25 + 0.75 * Math.max(0, shade);
    }
  }
  return { slopes, shades, maxSlope };
}

function updateTerrainColors() {
  if (!terrainMesh || !demState) return;
  const colors = terrainMesh.geometry.attributes.color;
  const { values, min, max, slopes, shades, maxSlope } = demState;
  const range = Math.max(1e-9, max - min);
  for (let i = 0; i < values.length; i++) {
    let c;
    if (currentMode === "slope") c = colorSlope(maxSlope ? slopes[i] / maxSlope : 0);
    else if (currentMode === "hillshade") c = colorHillshade(shades[i]);
    else c = colorElevation((values[i] - min) / range);
    colors.setXYZ(i, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
}

function buildTerrainMesh() {
  if (!demState) return;
  initThree();
  if (terrainMesh) {
    scene.remove(terrainMesh);
    terrainMesh.geometry.dispose();
    terrainMesh.material.dispose();
  }

  const { w, h, values, min, max } = demState;
  const aspect = h / w;
  const worldW = 190;
  const worldH = 190 * aspect;
  const geometry = new THREE.PlaneGeometry(worldW, worldH, w - 1, h - 1);
  const pos = geometry.attributes.position;
  const colorArray = new Float32Array(pos.count * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

  const relief = Math.max(1e-9, max - min);
  const zScale = Number($("zScale").value);
  const worldRelief = 48 * zScale;
  for (let i = 0; i < pos.count; i++) {
    const z = ((values[i] - min) / relief - 0.05) * worldRelief;
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide });
  terrainMesh = new THREE.Mesh(geometry, material);
  scene.add(terrainMesh);
  updateTerrainColors();
  controls.target.set(0, 0, worldRelief * 0.3);
  resetCamera();
}

async function loadDem(file) {
  if (!file) return;
  try {
    setStatus("READING GEOTIFF…");
    updateRunMessage("Đang đọc DEM cục bộ trong trình duyệt…");
    const buffer = await file.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(buffer);
    const image = await tiff.getImage();
    const srcW = image.getWidth(), srcH = image.getHeight();
    const maxDim = 180;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.max(2, Math.round(srcW * scale));
    const h = Math.max(2, Math.round(srcH * scale));
    const raster = await image.readRasters({ samples: [0], interleave: true, width: w, height: h, resampleMethod: "bilinear" });
    const nodataRaw = image.getGDALNoData();
    const nodata = nodataRaw == null ? null : Number(nodataRaw);
    const values = new Float32Array(raster.length);
    let min = Infinity, max = -Infinity, last = 0;
    for (let i = 0; i < raster.length; i++) {
      let v = Number(raster[i]);
      if (!Number.isFinite(v) || (nodata !== null && v === nodata)) v = last;
      else last = v;
      values[i] = v;
      min = Math.min(min, v); max = Math.max(max, v);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error("DEM không có giá trị cao độ hợp lệ");
    let bbox = null;
    try { bbox = image.getBoundingBox(); } catch (_) { bbox = null; }
    const derived = computeSlopeAndShade(values, w, h);
    demState = { fileName: file.name, srcW, srcH, w, h, values, min, max, bbox, ...derived };

    $("demSize").textContent = `${srcW} × ${srcH}`;
    $("demRange").textContent = `${formatNumber(min)} / ${formatNumber(max)} m`;
    $("demRelief").textContent = `${formatNumber(max - min)} m`;
    $("demBounds").textContent = bbox ? bbox.map(v => formatNumber(v, 4)).join(", ") : "Không đọc được";
    $("emptyState").style.display = "none";
    $("coordReadout").textContent = `${file.name} · preview ${w}×${h} · dữ liệu ở lại máy bạn`;
    buildTerrainMesh();
    setStatus("DEM READY · 3D PREVIEW");
    updateRunMessage(`Đã đọc ${file.name}. Chọn sản phẩm và tải cấu hình để chạy full pipeline trong QGIS.`);
  } catch (error) {
    console.error(error);
    setStatus("DEM ERROR");
    updateRunMessage(`Không đọc được DEM: ${error.message || error}`);
  }
}

function buildConfig() {
  return {
    schema: "vietflexmap.urban.terrain-studio/1",
    engine: "terrainstudio:buildterrainpackage",
    upstream: "https://github.com/hulauwa/terrain-product-studio",
    dem_filename: demState?.fileName || null,
    prefix: $("prefix").value.trim() || "urban_terrain",
    products: [...selected],
    web_preview: { vertical_exaggeration: Number($("zScale").value), mode: currentMode },
    note: "Set absolute DEM and output paths when calling qgis/urban_one_click.py inside QGIS."
  };
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(buildConfig(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${$("prefix").value.trim() || "urban_terrain"}.terrain.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  updateRunMessage("Đã tạo cấu hình. Mở QGIS, cài Terrain Product Studio và dùng qgis/urban_one_click.py trong repo.");
}

async function copyQgisCommand() {
  const prefix = $("prefix").value.trim() || "urban_terrain";
  const command = `from qgis.urban_one_click import run_terrain_studio\nrun_terrain_studio(r"C:\\\\path\\\\to\\\\${demState?.fileName || "dem.tif"}", r"C:\\\\path\\\\to\\\\output", prefix="${prefix}")`;
  try {
    await navigator.clipboard.writeText(command);
    updateRunMessage("Đã copy lệnh mẫu QGIS Python. Sửa hai đường dẫn DEM/output trước khi chạy.");
  } catch (_) {
    updateRunMessage(command);
  }
}

$("demFile").addEventListener("change", (e) => loadDem(e.target.files?.[0]));
const dz = $("dropzone");
["dragenter", "dragover"].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add("drag"); }));
["dragleave", "drop"].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove("drag"); }));
dz.addEventListener("drop", e => loadDem(e.dataTransfer.files?.[0]));

$("zScale").addEventListener("input", () => {
  $("zValue").value = `${Number($("zScale").value).toFixed(1)}×`;
  if (demState) buildTerrainMesh();
});
$("resetView").addEventListener("click", resetCamera);

document.querySelectorAll(".view-btn").forEach(btn => btn.addEventListener("click", () => {
  currentMode = btn.dataset.mode;
  document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b === btn));
  updateTerrainColors();
}));

$("toggleAll").addEventListener("click", () => {
  if (selected.size === products.length) selected.clear(); else products.forEach(([key]) => selected.add(key));
  renderProducts(); updateRunMessage();
});
$("downloadConfig").addEventListener("click", downloadJson);
$("copyCommand").addEventListener("click", copyQgisCommand);

renderProducts();
updateRunMessage();
