// Counter-clockwise outward faces: both roof planes face the sky, gable ends face out.
export function pitchedRoofPositions(x0, x1, z0, z1, base, ridge) {
  const xc = (x0 + x1) / 2,
    vertices = [
      [x0, base, z0],
      [x1, base, z0],
      [xc, ridge, z0],
      [x0, base, z1],
      [x1, base, z1],
      [xc, ridge, z1],
    ];
  return [0, 3, 2, 3, 5, 2, 2, 5, 1, 5, 4, 1, 0, 2, 1, 3, 4, 5].flatMap(
    (i) => vertices[i],
  );
}
