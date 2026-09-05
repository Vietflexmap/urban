# Upstream attribution

Urban Terrain Studio integrates and adapts the workflow of:

- **Project:** Terrain Product Studio
- **Repository:** https://github.com/hulauwa/terrain-product-studio
- **Author:** Nguyễn Văn Tín (`hulauwa`)
- **License:** GNU General Public License v2 or later (GPL-2.0-or-later)

## What is reused

This repository deliberately reuses the upstream public processing contract and architecture instead of reimplementing the scientific pipeline in JavaScript:

- QGIS Processing provider id: `terrainstudio`
- Master algorithm id: `terrainstudio:buildterrainpackage`
- Product groups and dependency workflow for cartography, geomorphometry, hydrology, hazard, bundle, intelligence report and 3D WebGIS
- Browser-side 3D companion follows the same dependency family documented by upstream WebGIS: Three.js + GeoTIFF.js

The file `qgis/urban_one_click.py` is an integration bridge that calls the installed upstream provider. It does not replace the scientific algorithms implemented by Terrain Product Studio.

## License compatibility

Terrain Product Studio identifies itself as GPL v2+. Any copied or modified upstream code must preserve applicable copyright and GPL terms. This integration is intended to remain GPL-2.0-or-later compatible.

The canonical upstream license text is available in:

https://github.com/hulauwa/terrain-product-studio/blob/main/terrain_product_studio/LICENSE

## No endorsement

Vietflexmap Urban Terrain Studio is an independent integration/companion project and should not be interpreted as an official release or endorsement by the upstream author.
