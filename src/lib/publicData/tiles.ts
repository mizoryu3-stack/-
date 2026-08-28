/**
 * 緯度経度 → スリッピーマップ方式のXYZタイル座標への変換。
 * 不動産情報ライブラリのGIS系API（用途地域・駅・災害リスク等）は、
 * 緯度経度そのものではなくこのタイル座標でリクエストする仕様になっている。
 * 参考: https://www.reinfolib.mlit.go.jp/help/apiManual/
 */
export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

export function latLngToTile(lat: number, lng: number, zoom: number): TileCoordinate {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { z: zoom, x, y };
}
