// SSP1: dictionary, structural metadata, and separate decimetre X/Z delta streams.
// Decoding preserves the existing JSON shape; no coordinate quantization is introduced here.
const MAX_BYTES = 8 * 1024 * 1024, MAX_ITEMS = 500000;
const invalid = () => new Error('Seattle map data is invalid. Reload or choose the place again to retry.');
export function decodeSeattle(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 16 || bytes.length > MAX_BYTES) throw invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x31505353) throw invalid();
  const dl = view.getUint32(4, true), ml = view.getUint32(8, true), xl = view.getUint32(12, true);
  const bounds = [16 + dl, 16 + dl + ml, 16 + dl + ml + xl, bytes.length];
  if (!dl || dl > 1024 * 1024 || !ml || bounds[2] > bytes.length) throw invalid();
  let dictionary;
  try { dictionary = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes.subarray(16, bounds[0]))); }
  catch { throw invalid(); }
  if (!Array.isArray(dictionary) || dictionary.length > 50000 || dictionary.some(s => typeof s !== 'string')) throw invalid();
  const p = bounds.slice(0, 3); let x = 0, z = 0, items = 0;
  const uint = s => {
    let n = 0, scale = 1;
    for (let i = 0; i < 8; i++) {
      if (p[s] >= bounds[s + 1]) throw invalid();
      const b = bytes[p[s]++]; n += (b & 127) * scale;
      if (!Number.isSafeInteger(n)) throw invalid();
      if (b < 128) { if (i && b === 0) throw invalid(); return n; }
      scale *= 128;
    }
    throw invalid();
  };
  const signed = s => { const n = uint(s); return n % 2 ? -(n + 1) / 2 : n / 2; };
  const string = () => { const i = uint(0); if (i >= dictionary.length) throw invalid(); return dictionary[i]; };
  function value(depth = 0) {
    if (++items > MAX_ITEMS || depth > 64 || p[0] >= bounds[1]) throw invalid();
    switch (bytes[p[0]++]) {
      case 0: return null;
      case 1: return false;
      case 2: return true;
      case 3: return signed(0);
      case 4: return signed(0) / 10;
      case 5: {
        if (p[0] + 8 > bounds[1]) throw invalid();
        const n = view.getFloat64(p[0], true); p[0] += 8;
        if (!Number.isFinite(n)) throw invalid(); return n;
      }
      case 6: return string();
      case 7: {
        const n = uint(0);
        if (n > 100000 || n > bounds[1] - p[0] || items + n > MAX_ITEMS) throw invalid();
        const a = new Array(n); for (let i = 0; i < n; i++) a[i] = value(depth + 1); return a;
      }
      case 8: {
        const n = uint(0);
        if (n > 50000 || n * 2 > bounds[1] - p[0] || items + n > MAX_ITEMS) throw invalid();
        const o = {};
        for (let i = 0; i < n; i++) {
          const key = string(); if (Object.hasOwn(o, key)) throw invalid();
          Object.defineProperty(o, key, {value:value(depth + 1), enumerable:true, configurable:true, writable:true});
        }
        return o;
      }
      case 9: {
        x += signed(1); z += signed(2);
        if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z)) throw invalid();
        return [x / 10, z / 10];
      }
      default: throw invalid();
    }
  }
  const result = value();
  if (p.some((v, i) => v !== bounds[i + 1])) throw invalid();
  return result;
}

async function boundedBody(stream, max) {
  if (!stream) throw invalid();
  const reader = stream.getReader(), chunks = []; let size = 0;
  try {
    for (;;) {
      const {value, done} = await reader.read(); if (done) break;
      size += value.length; if (size > max) throw invalid(); chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const out = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

export async function readSeattleResponse(response) {
  if (!response.ok) throw new Error(`Seattle map data could not load (${response.status}). Reload or choose the place again to retry.`);
  let bytes = await boundedBody(response.body, 4 * 1024 * 1024);
  // Some hosts deliver .gz already inflated via Content-Encoding. Inspect bytes, not the extension/header.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // Small compressed chunks bound expansion queued inside the native transform as well as our output.
    const compressed=bytes;let cursor=0;
    const source=new ReadableStream({pull(controller){if(cursor===compressed.length){controller.close();return;}const end=Math.min(cursor+1024,compressed.length);controller.enqueue(compressed.subarray(cursor,end));cursor=end;}});
    try { bytes = await boundedBody(source.pipeThrough(new DecompressionStream('gzip')), MAX_BYTES); }
    catch { throw invalid(); }
  }
  return decodeSeattle(bytes);
}
