import { Point, Polygon } from './types'
const ch = require('monotone-convex-hull-2d')

export function convexHull(points: Point[]) {
  return (ch(points.map(point => [point.x, point.y])) as number[]).map(index => points[index])
}

export function calcPolygonArea(points: Point[]) {
  var total = 0;

  for (var i = 0, l = points.length; i < l; i++) {
    var addX = points[i].x;
    var addY = points[i == points.length - 1 ? 0 : i + 1].y;
    var subX = points[i == points.length - 1 ? 0 : i + 1].x;
    var subY = points[i].y;

    total += (addX * addY * 0.5);
    total -= (subX * subY * 0.5);
  }

  return Math.abs(total);
}