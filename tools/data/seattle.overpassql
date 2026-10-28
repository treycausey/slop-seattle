[out:json][timeout:90];
(
  way[building](47.589,-122.365,47.632,-122.32);
  way[highway~"^(primary|secondary|tertiary|residential|pedestrian)$"](47.589,-122.365,47.632,-122.32);
  way[leisure=park](47.589,-122.365,47.632,-122.32);
);
out geom;
