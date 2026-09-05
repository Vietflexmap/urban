# Urban 3D WebGIS · Vietflexmap

WebGIS 3D chạy trực tiếp trên trình duyệt, xây dựng với **CesiumJS + Cesium ion**, dành cho trực quan hóa ảnh GeoTIFF, DEM/terrain, dữ liệu quy hoạch và mô hình đô thị 3D.

> Upstream engine: https://github.com/CesiumGS/cesium  
> Ứng dụng: https://vietflexmap.github.io/urban/

## 1. Mục tiêu

Quy trình chính:

```text
GeoTIFF / ảnh vệ tinh ─┐
                       ├─> Upload Cesium ion ─> Asset ID ─┐
DEM / heightmap ───────┘                                  │
                                                          ├─> CesiumJS WebGIS 3D
GeoJSON / quy hoạch / mô hình 3D ─────────────────────────┘
```

Khi GeoTIFF và DEM đã được gắn hệ tọa độ đúng, Cesium ion thực hiện bước lưu trữ/tiling/streaming. Ứng dụng web chỉ cần **ion access token + Asset ID** để tải dữ liệu lên quả địa cầu 3D.

## 2. Chức năng hiện có

- Nền WebGIS 3D CesiumJS 1.145.
- Chạy demo ngay với OpenStreetMap, không bắt buộc token.
- Nhập Cesium ion token tại runtime; token không được commit trong source.
- Nạp DEM/terrain từ Cesium ion Asset ID.
- Hỗ trợ cả Cesium Terrain (quantized-mesh/heightmap) và fallback 3D Tiles terrain.
- Phủ ảnh GeoTIFF đã tile thành Imagery asset lên terrain.
- Điều chỉnh opacity lớp ảnh.
- Bật/tắt Cesium OSM Buildings.
- Dựng mô hình quy hoạch minh họa: khối nhà, tuyến đường, không gian xanh.
- Phân tích **Line of Sight (LOS)** dựa trên lấy mẫu cao độ dọc đường ngắm.
- So sánh imagery nhiều thời điểm bằng chuỗi Asset ID.
- Nạp GeoJSON cục bộ, clamp lên địa hình.
- Wireframe terrain debug.
- Giao diện responsive cho desktop và mobile.
- GitHub Actions deploy tự động lên GitHub Pages.

## 3. Cấu trúc mã nguồn

```text
urban/
├── index.html                  # giao diện ứng dụng
├── styles.css                  # UI responsive / dark WebGIS
├── app.js                      # toàn bộ logic CesiumJS
├── .nojekyll                   # phục vụ static asset trực tiếp
├── .github/
│   └── workflows/
│       └── pages.yml           # deploy GitHub Pages
└── README.md
```

Ứng dụng dùng CesiumJS từ CDN chính thức, vì vậy repo này không fork/copy toàn bộ CesiumJS. Cách này giữ mã ứng dụng nhỏ, dễ cập nhật và vẫn dựa trên engine mã nguồn mở CesiumJS.

## 4. Quy trình GeoTIFF + DEM

### Bước A — Chuẩn bị dữ liệu

**GeoTIFF**
- Ảnh vệ tinh / orthophoto / bản đồ quy hoạch raster.
- Phải có georeference chính xác.
- Nên kiểm tra CRS, extent, NoData và độ phân giải trước khi upload.

**DEM**
- GeoTIFF elevation hoặc định dạng terrain mà Cesium ion chấp nhận.
- Đảm bảo đơn vị cao độ và hệ tọa độ đúng.

### Bước B — Upload lên Cesium ion

1. Đăng nhập Cesium ion.
2. Upload GeoTIFF ảnh và chọn xử lý thành **Imagery**.
3. Upload DEM và chọn xử lý thành **Terrain**.
4. Chờ ion hoàn tất tiling.
5. Ghi lại **Asset ID** của từng lớp.
6. Tạo access token riêng cho ứng dụng.

Khuyến nghị bảo mật token:
- dùng token riêng cho `urban`;
- chỉ cấp asset cần thiết;
- giới hạn Allowed URLs/domain cho GitHub Pages;
- không commit token có quyền rộng vào repo public.

## 5. Chạy ứng dụng

### Cách 1 — GitHub Pages

Push lên nhánh `main`. Workflow `.github/workflows/pages.yml` sẽ build/deploy static site.

Nếu Pages chưa được bật cho repo:

1. GitHub → **Settings** → **Pages**.
2. Source → chọn **GitHub Actions**.
3. Chạy lại workflow `Deploy Urban 3D WebGIS to Pages` nếu cần.

Trang dự kiến:

```text
https://vietflexmap.github.io/urban/
```

### Cách 2 — Chạy local

Không mở `index.html` bằng `file://` nếu trình duyệt chặn request. Dùng HTTP server đơn giản:

```bash
python -m http.server 8080
```

Mở:

```text
http://localhost:8080
```

## 6. Nạp asset riêng

Trong sidebar ứng dụng:

1. Dán **Cesium ion access token** → `Kích hoạt token`.
2. Điền Terrain Asset ID → `Nạp DEM terrain`.
3. Điền Imagery Asset ID → `Phủ ảnh lên địa hình`.
4. Điều chỉnh opacity để so sánh ảnh với nền.

Token được lưu trong `sessionStorage`, tức chỉ tồn tại trong phiên tab/trình duyệt hiện tại.

## 7. Ảnh nhiều thời điểm

Nhập dạng:

```text
12345|2024-01, 23456|2025-01, 34567|2026-01
```

Sau đó bấm **Nạp chuỗi ảnh** và dùng nút `Trước / Sau` để chuyển thời điểm.

Ứng dụng này phù hợp để:
- theo dõi đô thị hóa;
- theo dõi san lấp / mở đường;
- so sánh hiện trạng trước–sau dự án;
- theo dõi thay đổi sử dụng đất.

## 8. Phân tích tầm nhìn (LOS)

1. Nạp DEM terrain.
2. Chọn chiều cao mắt quan sát, ví dụ `15 m`.
3. Bấm `Chọn điểm quan sát + mục tiêu`.
4. Click điểm quan sát trên bản đồ.
5. Click điểm mục tiêu.

Ứng dụng tạo tuyến trắc địa giữa hai điểm, lấy mẫu cao độ terrain bằng CesiumJS và so sánh đường ngắm lý thuyết với địa hình.

- Xanh: nhìn thấy theo DEM.
- Đỏ: bị địa hình che.
- Điểm cam: vị trí terrain gây che khuất đầu tiên.

> Đây là LOS terrain-level. Muốn phân tích tầm nhìn có xét tòa nhà/cây/công trình 3D cần bổ sung ray casting hoặc viewshed/shadow-map chuyên sâu trên 3D Tiles.

## 9. Ứng dụng quy hoạch đô thị

### Mô phỏng dự án
Đưa bản vẽ quy hoạch raster lên terrain thật để kiểm tra quan hệ giữa cao độ, địa hình và bố cục dự án.

### Trình bày chiến lược phát triển
Kết hợp polygon quy hoạch, khối 3D, hành lang giao thông và không gian xanh để tạo sơ đồ đô thị trực quan.

### Digital Twin
Có thể mở rộng để nạp:
- 3D Tiles / BIM / CityGML đã chuyển đổi;
- point cloud LiDAR;
- camera / IoT realtime;
- lớp công trình theo giai đoạn;
- dữ liệu giao thông;
- dữ liệu môi trường;
- dữ liệu quy hoạch và địa chính.

## 10. API CesiumJS được dùng

```js
// Terrain từ DEM asset
viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(assetId);

// Imagery từ GeoTIFF asset
const provider = await Cesium.IonImageryProvider.fromAssetId(assetId);
viewer.imageryLayers.addImageryProvider(provider);

// OSM Buildings
const buildings = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildings);
```

## 11. Nâng cấp tiếp theo

Các module phù hợp để phát triển tiếp:

- kéo/thả KML, CZML, GPX, Shapefile đã convert;
- panel quản lý layer chuyên nghiệp;
- geocoding / tìm địa điểm;
- đo khoảng cách, diện tích, cao độ;
- mặt cắt địa hình;
- viewshed dạng vùng 360°;
- flood simulation theo DEM;
- cut/fill san nền;
- clipping 3D Tiles;
- BIM/CAD + 3D Tiles;
- timeline vệ tinh có thanh slider;
- API backend lưu project, layer, camera bookmark;
- phân quyền người dùng và dashboard dự án.

## 12. Công nghệ

- CesiumJS 1.145
- Cesium ion
- HTML5 / CSS3 / JavaScript
- OpenStreetMap
- GitHub Pages / GitHub Actions

## 13. Giấy phép và attribution

CesiumJS là dự án mã nguồn mở của CesiumGS. Repo này sử dụng CesiumJS như dependency từ CDN và không thay đổi giấy phép upstream. Khi dùng dữ liệu hoặc dịch vụ bên thứ ba, cần giữ attribution tương ứng và tuân thủ điều khoản của từng nhà cung cấp dữ liệu.

---

**Vietflexmap · Urban 3D WebGIS**  
GeoTIFF + DEM + 3D Tiles + CesiumJS → môi trường quy hoạch đô thị 3D trên trình duyệt.
