/* Urban 3D WebGIS · Vietflexmap
 * CesiumJS 1.145
 * Public demo works with OpenStreetMap imagery and an ellipsoid terrain.
 * Cesium ion token + asset IDs are supplied at runtime and are never committed here.
 */

const DEMO = {
  longitude: 106.7302,
  latitude: 10.7727,
  height: 2600,
};

const els = Object.fromEntries(
  [
    "ionToken", "saveTokenBtn", "clearTokenBtn", "terrainAssetId", "loadTerrainBtn", "ellipsoidBtn",
    "imageryAssetId", "loadImageryBtn", "imageryAlpha", "alphaValue", "buildingsBtn", "planningBtn",
    "clearPlanningBtn", "wireframeBtn", "observerHeight", "losBtn", "clearLosBtn", "timelineAssets",
    "loadTimelineBtn", "prevTimeBtn", "nextTimeBtn", "timelineLabel", "geojsonFile", "homeBtn",
    "togglePanelBtn", "controlPanel", "sceneStatus", "cameraReadout", "toast"
  ].map((id) => [id, document.getElementById(id)])
);

let toastTimer;
let customImageryLayer = null;
let osmBuildings = null;
let planningEntities = [];
let losEntities = [];
let losHandler = null;
let losPoints = [];
let timelineLayers = [];
let timelineIndex = -1;
let wireframeEnabled = false;

function toast(message, type = "success") {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast show ${type}`;
  toastTimer = setTimeout(() => { els.toast.className = "toast"; }, 3600);
}

function setStatus(text) {
  els.sceneStatus.textContent = text;
}

function getIonToken() {
  return els.ionToken.value.trim() || sessionStorage.getItem("urban3d.cesiumToken") || "";
}

function applyIonToken(showMessage = false) {
  const token = getIonToken();
  if (!token) {
    if (showMessage) toast("Hãy dán Cesium ion access token trước khi nạp asset riêng.", "error");
    return false;
  }
  Cesium.Ion.defaultAccessToken = token;
  sessionStorage.setItem("urban3d.cesiumToken", token);
  els.ionToken.value = token;
  if (showMessage) toast("Đã kích hoạt Cesium ion token cho phiên trình duyệt này.");
  return true;
}

const storedToken = sessionStorage.getItem("urban3d.cesiumToken");
if (storedToken) {
  els.ionToken.value = storedToken;
  Cesium.Ion.defaultAccessToken = storedToken;
}

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: false,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  geocoder: false,
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  navigationHelpButton: false,
  homeButton: false,
  sceneModePicker: true,
  fullscreenButton: true,
  selectionIndicator: true,
  infoBox: true,
});

viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.highDynamicRange = true;
viewer.scene.pickTranslucentDepth = true;
viewer.scene.globe.enableLighting = true;
viewer.scene.fog.enabled = true;

const osmProvider = new Cesium.UrlTemplateImageryProvider({
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  maximumLevel: 19,
  credit: "© OpenStreetMap contributors",
});
viewer.imageryLayers.addImageryProvider(osmProvider);

function flyHome() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(DEMO.longitude, DEMO.latitude, DEMO.height),
    orientation: {
      heading: Cesium.Math.toRadians(12),
      pitch: Cesium.Math.toRadians(-42),
      roll: 0,
    },
    duration: 1.2,
  });
}
flyHome();

viewer.camera.changed.addEventListener(() => {
  const c = viewer.camera.positionCartographic;
  if (!c) return;
  const lon = Cesium.Math.toDegrees(c.longitude).toFixed(4);
  const lat = Cesium.Math.toDegrees(c.latitude).toFixed(4);
  const h = Math.max(0, c.height).toFixed(0);
  els.cameraReadout.textContent = `${lat}, ${lon} · ${h} m`;
});
viewer.camera.percentageChanged = 0.04;

els.saveTokenBtn.addEventListener("click", () => applyIonToken(true));
els.clearTokenBtn.addEventListener("click", () => {
  sessionStorage.removeItem("urban3d.cesiumToken");
  els.ionToken.value = "";
  Cesium.Ion.defaultAccessToken = "";
  toast("Đã xóa token khỏi phiên trình duyệt.");
});

els.loadTerrainBtn.addEventListener("click", async () => {
  if (!applyIonToken()) return toast("Cần Cesium ion token để nạp DEM asset.", "error");
  const assetId = Number(els.terrainAssetId.value.trim());
  if (!Number.isFinite(assetId) || assetId <= 0) return toast("Terrain Asset ID không hợp lệ.", "error");

  setStatus(`ĐANG NẠP TERRAIN · ${assetId}`);
  try {
    viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(assetId, {
      requestVertexNormals: true,
      requestWaterMask: true,
    });
    setStatus(`TERRAIN · ION ${assetId}`);
    toast(`Đã nạp DEM terrain asset ${assetId}.`);
  } catch (quantizedMeshError) {
    try {
      viewer.terrainProvider = await Cesium.Cesium3DTilesTerrainProvider.fromIonAssetId(assetId, {
        requestVertexNormals: true,
      });
      setStatus(`3D TILES TERRAIN · ION ${assetId}`);
      toast(`Đã nạp terrain 3D Tiles asset ${assetId}.`);
    } catch (tilesError) {
      console.error(quantizedMeshError, tilesError);
      setStatus("DEMO · OSM 2D");
      toast("Không nạp được terrain. Kiểm tra token, quyền asset và loại dữ liệu DEM đã tile trên ion.", "error");
    }
  }
});

els.ellipsoidBtn.addEventListener("click", () => {
  viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  setStatus("ELLIPSOID · OSM 2D");
  toast("Đã chuyển về mặt cầu ellipsoid.");
});

els.loadImageryBtn.addEventListener("click", async () => {
  if (!applyIonToken()) return toast("Cần Cesium ion token để nạp imagery asset.", "error");
  const assetId = Number(els.imageryAssetId.value.trim());
  if (!Number.isFinite(assetId) || assetId <= 0) return toast("Imagery Asset ID không hợp lệ.", "error");

  try {
    if (customImageryLayer && viewer.imageryLayers.contains(customImageryLayer)) {
      viewer.imageryLayers.remove(customImageryLayer, true);
    }
    const provider = await Cesium.IonImageryProvider.fromAssetId(assetId);
    customImageryLayer = viewer.imageryLayers.addImageryProvider(provider);
    customImageryLayer.alpha = Number(els.imageryAlpha.value) / 100;
    setStatus(`GEOTIFF · ION ${assetId}`);
    toast(`Đã phủ imagery asset ${assetId} lên địa hình.`);
  } catch (error) {
    console.error(error);
    toast("Không nạp được ảnh. Hãy kiểm tra asset có được tile kiểu Imagery và token có quyền truy cập.", "error");
  }
});

els.imageryAlpha.addEventListener("input", () => {
  const alpha = Number(els.imageryAlpha.value) / 100;
  els.alphaValue.value = `${Math.round(alpha * 100)}%`;
  if (customImageryLayer) customImageryLayer.alpha = alpha;
  timelineLayers.forEach((item) => { item.layer.alpha = alpha; });
});

els.buildingsBtn.addEventListener("click", async () => {
  if (osmBuildings) {
    osmBuildings.show = !osmBuildings.show;
    els.buildingsBtn.classList.toggle("active", osmBuildings.show);
    return toast(osmBuildings.show ? "Đã bật OSM Buildings." : "Đã ẩn OSM Buildings.");
  }
  if (getIonToken()) applyIonToken();
  try {
    osmBuildings = await Cesium.createOsmBuildingsAsync();
    viewer.scene.primitives.add(osmBuildings);
    els.buildingsBtn.classList.add("active");
    toast("Đã nạp Cesium OSM Buildings 3D.");
  } catch (error) {
    console.error(error);
    toast("OSM Buildings cần truy cập Cesium ion. Hãy nhập token nếu lớp chưa nạp được.", "error");
  }
});

function addPlanningEntity(entity) {
  const created = viewer.entities.add(entity);
  planningEntities.push(created);
  return created;
}

function addDemoPlanning() {
  if (planningEntities.length) {
    planningEntities.forEach((entity) => { entity.show = true; });
    viewer.flyTo(planningEntities, { duration: 1.2, offset: new Cesium.HeadingPitchRange(0, -0.55, 1600) });
    return;
  }

  const blocks = [
    [106.72915, 10.77310, 52, 42, 85, "Khu ở A", Cesium.Color.fromCssColorString("#57b8ff")],
    [106.72975, 10.77322, 64, 48, 120, "Hỗn hợp B", Cesium.Color.fromCssColorString("#ffb657")],
    [106.73040, 10.77312, 48, 42, 72, "Khu ở C", Cesium.Color.fromCssColorString("#57b8ff")],
    [106.73105, 10.77302, 70, 52, 150, "Tháp hỗn hợp D", Cesium.Color.fromCssColorString("#ffb657")],
    [106.72940, 10.77230, 48, 44, 65, "Khu ở E", Cesium.Color.fromCssColorString("#57b8ff")],
    [106.73010, 10.77222, 58, 46, 105, "Hỗn hợp F", Cesium.Color.fromCssColorString("#ffb657")],
    [106.73085, 10.77218, 44, 40, 78, "Khu ở G", Cesium.Color.fromCssColorString("#57b8ff")],
  ];

  blocks.forEach(([lon, lat, width, depth, height, name, color]) => {
    addPlanningEntity({
      name,
      position: Cesium.Cartesian3.fromDegrees(lon, lat, height / 2),
      box: {
        dimensions: new Cesium.Cartesian3(width, depth, height),
        material: color.withAlpha(0.68),
        outline: true,
        outlineColor: color.brighten(0.3, new Cesium.Color()),
      },
      description: `<b>${name}</b><br>Chiều cao mô phỏng: ${height} m`,
    });
  });

  addPlanningEntity({
    name: "Trục giao thông chính",
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        106.72855, 10.77175,
        106.72965, 10.77262,
        106.73165, 10.77348,
      ]),
      width: 11,
      material: Cesium.Color.fromCssColorString("#f3f7fb").withAlpha(0.84),
      clampToGround: true,
    },
  });

  addPlanningEntity({
    name: "Không gian xanh trung tâm",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        106.73065, 10.77145,
        106.73140, 10.77158,
        106.73152, 10.77200,
        106.73070, 10.77202,
      ]),
      material: Cesium.Color.fromCssColorString("#4ee1a0").withAlpha(0.48),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#4ee1a0"),
      height: 2,
    },
  });

  els.planningBtn.classList.add("active");
  viewer.flyTo(planningEntities, { duration: 1.2, offset: new Cesium.HeadingPitchRange(0.1, -0.55, 1600) });
  toast("Đã dựng mô hình quy hoạch minh họa: khối công trình, trục đường và không gian xanh.");
}

els.planningBtn.addEventListener("click", addDemoPlanning);
els.clearPlanningBtn.addEventListener("click", () => {
  planningEntities.forEach((entity) => viewer.entities.remove(entity));
  planningEntities = [];
  els.planningBtn.classList.remove("active");
  toast("Đã xóa mô hình quy hoạch minh họa.");
});

els.wireframeBtn.addEventListener("click", () => {
  try {
    wireframeEnabled = !wireframeEnabled;
    viewer.scene.globe._surface.tileProvider._debug.wireframe = wireframeEnabled;
    els.wireframeBtn.classList.toggle("active", wireframeEnabled);
    toast(wireframeEnabled ? "Đã bật chế độ wireframe địa hình." : "Đã tắt wireframe địa hình.");
  } catch (error) {
    console.error(error);
    toast("Wireframe debug không khả dụng trên cấu hình Cesium hiện tại.", "error");
  }
});

function pickGlobePosition(windowPosition) {
  const ray = viewer.camera.getPickRay(windowPosition);
  if (!ray) return null;
  return viewer.scene.globe.pick(ray, viewer.scene) || viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid);
}

function clearLos() {
  losEntities.forEach((entity) => viewer.entities.remove(entity));
  losEntities = [];
  losPoints = [];
}

function addLosMarker(position, label, color) {
  const entity = viewer.entities.add({
    position,
    point: { pixelSize: 11, color, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: {
      text: label,
      font: "12px sans-serif",
      pixelOffset: new Cesium.Cartesian2(0, -20),
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.62),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  losEntities.push(entity);
}

async function sampleTerrainSafe(cartographics) {
  try {
    const samples = cartographics.map((c) => new Cesium.Cartographic(c.longitude, c.latitude, 0));
    return await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, samples);
  } catch (error) {
    console.warn("Terrain sampling fallback", error);
    return cartographics.map((c) => new Cesium.Cartographic(c.longitude, c.latitude, 0));
  }
}

async function analyzeLos(startCartesian, endCartesian) {
  const start = Cesium.Cartographic.fromCartesian(startCartesian);
  const end = Cesium.Cartographic.fromCartesian(endCartesian);
  const geodesic = new Cesium.EllipsoidGeodesic(start, end);
  const sampleCount = Math.max(48, Math.min(180, Math.ceil(geodesic.surfaceDistance / 20)));
  const cartographics = [];
  for (let i = 0; i <= sampleCount; i++) {
    cartographics.push(geodesic.interpolateUsingFraction(i / sampleCount));
  }

  const sampled = await sampleTerrainSafe(cartographics);
  const observerExtra = Math.max(1, Number(els.observerHeight.value) || 15);
  const startGround = sampled[0].height || 0;
  const endGround = sampled[sampled.length - 1].height || 0;
  const startHeight = startGround + observerExtra;
  const endHeight = endGround + 2;
  let blockedAt = -1;

  for (let i = 1; i < sampled.length - 1; i++) {
    const fraction = i / (sampled.length - 1);
    const sightHeight = Cesium.Math.lerp(startHeight, endHeight, fraction);
    if ((sampled[i].height || 0) > sightHeight + 0.75) {
      blockedAt = i;
      break;
    }
  }

  clearLos();
  const startPos = Cesium.Cartesian3.fromRadians(start.longitude, start.latitude, startHeight);
  const endPos = Cesium.Cartesian3.fromRadians(end.longitude, end.latitude, endHeight);
  const visible = blockedAt < 0;
  const lineColor = visible ? Cesium.Color.fromCssColorString("#4ee1a0") : Cesium.Color.fromCssColorString("#ff6b6b");

  const line = viewer.entities.add({
    name: "Line of sight",
    polyline: { positions: [startPos, endPos], width: 4, material: lineColor },
  });
  losEntities.push(line);
  addLosMarker(startPos, `Observer +${observerExtra} m`, Cesium.Color.fromCssColorString("#57b8ff"));
  addLosMarker(endPos, visible ? "VISIBLE" : "BLOCKED", lineColor);

  if (!visible) {
    const obstacle = sampled[blockedAt];
    const obstaclePos = Cesium.Cartesian3.fromRadians(obstacle.longitude, obstacle.latitude, (obstacle.height || 0) + 1.5);
    addLosMarker(obstaclePos, "Terrain obstruction", Cesium.Color.fromCssColorString("#ffb657"));
  }

  viewer.flyTo(losEntities, { duration: 0.9 });
  toast(visible ? "Kết quả LOS: mục tiêu nhìn thấy theo DEM." : "Kết quả LOS: địa hình che khuất đường ngắm.", visible ? "success" : "error");
}

function stopLosMode() {
  if (losHandler) {
    losHandler.destroy();
    losHandler = null;
  }
  els.losBtn.classList.remove("active");
}

els.losBtn.addEventListener("click", () => {
  stopLosMode();
  clearLos();
  losPoints = [];
  els.losBtn.classList.add("active");
  toast("LOS: bấm điểm quan sát, sau đó bấm điểm mục tiêu.");
  losHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  losHandler.setInputAction(async (movement) => {
    const position = pickGlobePosition(movement.position);
    if (!position) return;
    losPoints.push(position);
    if (losPoints.length === 1) {
      addLosMarker(position, "Observer", Cesium.Color.fromCssColorString("#57b8ff"));
      toast("Đã chọn điểm quan sát. Bấm điểm mục tiêu.");
      return;
    }
    const [start, end] = losPoints;
    stopLosMode();
    await analyzeLos(start, end);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
});

els.clearLosBtn.addEventListener("click", () => {
  stopLosMode();
  clearLos();
  toast("Đã xóa kết quả LOS.");
});

function parseTimelineInput(text) {
  return text.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [idText, labelText] = part.split("|").map((s) => s.trim());
    return { id: Number(idText), label: labelText || `Asset ${idText}` };
  }).filter((item) => Number.isFinite(item.id) && item.id > 0);
}

function showTimeline(index) {
  if (!timelineLayers.length) return;
  timelineIndex = (index + timelineLayers.length) % timelineLayers.length;
  timelineLayers.forEach((item, i) => { item.layer.show = i === timelineIndex; });
  els.timelineLabel.textContent = timelineLayers[timelineIndex].label;
  setStatus(`TIME · ${timelineLayers[timelineIndex].label}`);
}

els.loadTimelineBtn.addEventListener("click", async () => {
  if (!applyIonToken()) return toast("Cần Cesium ion token để nạp chuỗi imagery.", "error");
  const items = parseTimelineInput(els.timelineAssets.value);
  if (!items.length) return toast("Nhập ít nhất một Asset ID hợp lệ. Có thể dùng dạng 12345|2025-01.", "error");

  timelineLayers.forEach((item) => {
    if (viewer.imageryLayers.contains(item.layer)) viewer.imageryLayers.remove(item.layer, true);
  });
  timelineLayers = [];
  timelineIndex = -1;

  try {
    for (const item of items) {
      const provider = await Cesium.IonImageryProvider.fromAssetId(item.id);
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = Number(els.imageryAlpha.value) / 100;
      layer.show = false;
      timelineLayers.push({ ...item, layer });
    }
    showTimeline(0);
    toast(`Đã nạp ${timelineLayers.length} lớp ảnh để so sánh biến động.`);
  } catch (error) {
    console.error(error);
    toast("Có asset trong chuỗi ảnh không nạp được. Kiểm tra ID và quyền token.", "error");
  }
});
els.prevTimeBtn.addEventListener("click", () => showTimeline(timelineIndex - 1));
els.nextTimeBtn.addEventListener("click", () => showTimeline(timelineIndex + 1));

els.geojsonFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    const dataSource = await Cesium.GeoJsonDataSource.load(json, {
      clampToGround: true,
      stroke: Cesium.Color.fromCssColorString("#4ee1a0"),
      fill: Cesium.Color.fromCssColorString("#57b8ff").withAlpha(0.28),
      strokeWidth: 3,
      markerColor: Cesium.Color.fromCssColorString("#ffb657"),
    });
    viewer.dataSources.add(dataSource);
    await viewer.flyTo(dataSource, { duration: 1.1 });
    toast(`Đã nạp GeoJSON: ${file.name}`);
  } catch (error) {
    console.error(error);
    toast("Không đọc được GeoJSON. Kiểm tra cấu trúc JSON/WGS84.", "error");
  } finally {
    event.target.value = "";
  }
});

els.homeBtn.addEventListener("click", flyHome);
els.togglePanelBtn.addEventListener("click", () => els.controlPanel.classList.toggle("hidden"));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    stopLosMode();
    losPoints = [];
  }
  if (event.key.toLowerCase() === "h") flyHome();
});

window.addEventListener("beforeunload", () => {
  if (losHandler && !losHandler.isDestroyed()) losHandler.destroy();
});

toast("Urban 3D WebGIS sẵn sàng. Demo đang dùng nền OpenStreetMap; nhập Cesium ion token để nạp dữ liệu riêng.");
