# Urban Terrain Studio

**1 DEM → bộ sản phẩm địa hình hoàn chỉnh + 3D WebGIS**

Urban Terrain Studio là lớp tích hợp của Vietflexmap, xây dựng quanh workflow mã nguồn mở **Terrain Product Studio** cho QGIS. Mục tiêu là biến một DEM thành bộ sản phẩm dùng cho quy hoạch, địa hình, địa mạo, thủy văn, đánh giá nguy cơ và trình bày WebGIS.

## Kiến trúc

```text
DEM GeoTIFF
   │
   ├─ Web companion (GitHub Pages)
   │   ├─ đọc GeoTIFF cục bộ bằng GeoTIFF.js
   │   ├─ preview Elevation / Slope / Hillshade
   │   ├─ dựng mesh 3D bằng Three.js
   │   └─ tạo cấu hình chạy QGIS
   │
   └─ QGIS + Terrain Product Studio
       └─ terrainstudio:buildterrainpackage
           ├─ Topographic map
           ├─ Slope / Aspect / TRI / TPI / Roughness
           ├─ Profile / Planform curvature
           ├─ Geomorphon
           ├─ Hydrology / Streams / Basins / TWI
           ├─ SPI / STI
           ├─ Suitability / Landslide / Multihazard
           ├─ GeoPackage bundle
           ├─ Analytics HTML report
           ├─ 3D WebGIS HTML
           └─ STL / OBJ qua công cụ 3D export của plugin
```

## Vì sao tách Web và QGIS?

GitHub Pages là ứng dụng tĩnh trong trình duyệt, không có QGIS Processing, GDAL native provider hay các thuật toán desktop cần cho hydrology/hazard. Vì vậy trang web chỉ làm **preview + cấu hình + trình bày**, còn pipeline kỹ thuật đầy đủ chạy bằng QGIS. Cách này giữ đúng thuật toán upstream thay vì mô phỏng sai trong JavaScript.

## Chạy nhanh

1. Cài QGIS 3.34+ hoặc QGIS 4.x tương thích.
2. Cài/enable Terrain Product Studio từ upstream:
   https://github.com/hulauwa/terrain-product-studio
3. Clone repo này.
4. Trong QGIS Python Console, thêm repo vào `sys.path`, sau đó:

```python
from qgis.urban_one_click import run_terrain_studio

result = run_terrain_studio(
    r"C:\GIS\dem.tif",
    r"C:\GIS\output",
    prefix="urban_terrain",
)
print(result)
```

Bridge gọi trực tiếp Processing algorithm:

```text
terrainstudio:buildterrainpackage
```

## Sản phẩm mặc định được bật

- Color relief
- Hillshade + multi-direction hillshade
- Slope
- Aspect
- TRI
- TPI
- Roughness
- Profile curvature
- Planform curvature
- Contours
- Spot elevations
- Geomorphon
- Hydrology
- Watershed basins
- TWI
- SPI
- STI
- Construction suitability
- Landslide hazard
- Multihazard
- GeoPackage bundle
- Portable DEM copy
- 3D WebGIS viewer
- Topographic intelligence report

## Web application

Trang `index.html` dùng cùng họ công nghệ WebGIS 3D mà upstream sử dụng cho viewer: **Three.js + GeoTIFF.js**. DEM được đọc bằng `File.arrayBuffer()` và xử lý cục bộ trong browser; app không upload DEM lên server.

Preview browser cố ý resample DEM xuống lưới nhỏ để giữ hiệu năng. Đây không phải kết quả phân tích kỹ thuật cuối cùng.

## Các file chính

```text
index.html                  # giao diện web companion
styles.css                  # responsive dark UI
app.js                      # đọc GeoTIFF + 3D mesh + preview
qgis/__init__.py
qgis/urban_one_click.py     # bridge QGIS → terrainstudio:buildterrainpackage
UPSTREAM.md                 # nguồn, giấy phép, attribution
.github/workflows/pages.yml # kiểm tra JS + deploy GitHub Pages
```

## Nguồn upstream và giấy phép

Workflow được xây dựng dựa trên Terrain Product Studio của **Nguyễn Văn Tín / hulauwa**:

https://github.com/hulauwa/terrain-product-studio

Upstream công bố **GPL v2+**. Phần tích hợp này được duy trì theo hướng tương thích GPL-2.0-or-later. Xem `UPSTREAM.md` để biết chi tiết nguồn và các phần được tái sử dụng về kiến trúc/API.

## Ghi chú kỹ thuật

- Nếu DEM ở hệ tọa độ địa lý, Terrain Product Studio có cơ chế auto-reproject trước các phép tính địa hình.
- Hydrology phải chạy theo dependency pipeline trước các chỉ số dùng flow accumulation.
- STL/OBJ được tạo bởi công cụ 3D export của plugin; bridge không giả định mọi phiên bản upstream đều expose mesh qua master Processing algorithm.
- Với DEM lớn, nên chạy full pipeline trong QGIS thay vì browser.

---

**Vietflexmap · Urban Terrain Studio**
