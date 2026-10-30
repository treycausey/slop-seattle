// Build-time encoder for js/seattle-codec.js. Keep the browser free of encoder/Node code.
export function encodeSeattle(obj) {
  const streams = [[], [], []], meta = streams[0], strings = [], lookup = new Map(); let x = 0, z = 0;
  const uint = (out, v) => {
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('Invalid Seattle integer');
    while (v > 127) { out.push(v % 128 + 128); v = Math.floor(v / 128); } out.push(v);
  };
  const signed = (out, v) => uint(out, v < 0 ? -v * 2 - 1 : v * 2);
  const string = s => { if (!lookup.has(s)) { lookup.set(s, strings.length); strings.push(s); } uint(meta, lookup.get(s)); };
  const tenth = n => Math.abs(n) < 2 ** 47 && Math.round(n * 10) / 10 === n && !Object.is(n, -0);
  function value(v) {
    if (v === null) meta.push(0);
    else if (v === false) meta.push(1);
    else if (v === true) meta.push(2);
    else if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new Error('Non-finite Seattle number');
      if (Number.isSafeInteger(v) && Math.abs(v) < 2 ** 51 && !Object.is(v, -0)) { meta.push(3); signed(meta, v); }
      else if (tenth(v)) { meta.push(4); signed(meta, Math.round(v * 10)); }
      else { meta.push(5); const b = Buffer.alloc(8); b.writeDoubleLE(v); meta.push(...b); }
    } else if (typeof v === 'string') { meta.push(6); string(v); }
    else if (Array.isArray(v)) {
      if (v.length === 2 && v.every(n => typeof n === 'number' && tenth(n))) {
        meta.push(9); const a = Math.round(v[0] * 10), b = Math.round(v[1] * 10);
        signed(streams[1], a - x); signed(streams[2], b - z); x = a; z = b;
      } else { meta.push(7); uint(meta, v.length); for (const item of v) value(item); }
    } else if (v && typeof v === 'object') {
      meta.push(8); const entries = Object.entries(v); uint(meta, entries.length);
      for (const [k, item] of entries) { string(k); value(item); }
    } else throw new Error('Unsupported Seattle value');
  }
  value(obj);
  const dict = Buffer.from(JSON.stringify(strings)), header = Buffer.alloc(16); header.write('SSP1');
  [dict.length, meta.length, streams[1].length].forEach((v, i) => header.writeUInt32LE(v, 4 + i * 4));
  return Buffer.concat([header, dict, ...streams.map(s => Buffer.from(s))]);
}
