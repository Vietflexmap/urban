"""Vietflexmap Urban Terrain Studio bridge for QGIS.

Requires the Terrain Product Studio QGIS plugin/provider to be installed and
loaded. The upstream provider id is ``terrainstudio`` and the master algorithm
id is ``terrainstudio:buildterrainpackage``.

This integration file is released under GPL-2.0-or-later to remain compatible
with Terrain Product Studio.
"""

from __future__ import annotations

from qgis import processing
from qgis.core import QgsApplication, QgsProcessingException


def _ensure_provider() -> None:
    provider = QgsApplication.processingRegistry().providerById("terrainstudio")
    if provider is None:
        raise QgsProcessingException(
            "Terrain Product Studio chưa được nạp. Cài/enable plugin từ "
            "https://github.com/hulauwa/terrain-product-studio rồi mở lại QGIS."
        )


def run_terrain_studio(
    dem_path: str,
    output_folder: str,
    prefix: str = "urban_terrain",
    *,
    contour_interval: float = 10.0,
    stream_threshold_ha: float = 25.0,
    web_3d_quality: int = 1,
    vertical_exaggeration: float = 1.5,
    create_mesh_after: bool = False,
):
    """Run the full DEM-to-products pipeline with urban-oriented defaults.

    Parameters omitted from ``params`` intentionally fall back to the upstream
    algorithm defaults, reducing coupling to plugin version changes.
    """
    _ensure_provider()

    params = {
        "INPUT": dem_path,
        "BAND": 1,
        "OUTPUT_FOLDER": output_folder,
        "PREFIX": prefix,
        "AUTO_REPROJECT": True,
        "CONTOUR_INTERVAL": contour_interval,
        "STREAM_THRESHOLD_HA": stream_threshold_ha,
        "WEB_3D_QUALITY": web_3d_quality,
        "VERTICAL_EXAGGERATION": vertical_exaggeration,

        # Cartography / geomorphometry
        "CREATE_COLOR_RELIEF": True,
        "CREATE_HILLSHADE": True,
        "CREATE_MULTI_HILLSHADE": True,
        "CREATE_SLOPE": True,
        "CREATE_ASPECT": True,
        "CREATE_TRI": True,
        "CREATE_TPI": True,
        "CREATE_ROUGHNESS": True,
        "CREATE_PROFILE_CURVATURE": True,
        "CREATE_PLANFORM_CURVATURE": True,
        "CREATE_CONTOURS": True,
        "CREATE_SPOT_ELEVATIONS": True,
        "CREATE_GEOMORPHON": True,

        # Hydrology
        "CREATE_HYDROLOGY": True,
        "CREATE_BASINS": True,
        "CREATE_TWI": True,
        "CREATE_SPI": True,
        "CREATE_STI": True,

        # Urban / hazard intelligence
        "CREATE_SUITABILITY": True,
        "CREATE_LANDSLIDE": True,
        "CREATE_MULTIHAZARD": True,

        # Deliverables
        "CREATE_BUNDLE": True,
        "CREATE_3D_VIEWER": True,
        "CREATE_INTELLIGENCE_REPORT": True,
        "PORTABLE_DEM_COPY": True,
    }

    result = processing.run("terrainstudio:buildterrainpackage", params)

    # STL/OBJ export is exposed by the upstream UI/core rather than by the
    # master Processing algorithm in all versions. Keep this flag explicit so
    # callers do not assume a mesh file was generated when it was not.
    if create_mesh_after:
        result["MESH_NOTE"] = (
            "Use Terrain Product Studio → 3D export to create STL/OBJ from the "
            "processed DEM; mesh export availability depends on plugin version."
        )

    return result


__all__ = ["run_terrain_studio"]
