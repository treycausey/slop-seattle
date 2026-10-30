import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {decodeSeattle,readSeattleResponse} from '../js/seattle-codec.js';
import {encodeSeattle} from '../tools/seattle-encode.mjs';

test('all 90 shipped geographic datasets exactly match the pre-SSP1 content hashes',()=>{
 const hashes=JSON.parse(readFileSync(new URL('./fixtures/seattle-data-hashes.json',import.meta.url)));
 assert.equal(Object.keys(hashes).length,90);
 for(const [path,hash]of Object.entries(hashes)){
  const bytes=gunzipSync(readFileSync(new URL('../'+path,import.meta.url))),data=decodeSeattle(bytes);
  const canonicalZeros=v=>{if(typeof v==='number')assert.equal(Object.is(v,-0),false,path+': preserve the original JSON zero');else if(v&&typeof v==='object')for(const child of Object.values(v))canonicalZeros(child);};canonicalZeros(data);
  assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),hash,path);
  assert.deepEqual(decodeSeattle(encodeSeattle(data)),data,path);
 }
});
test('SSP1 preserves precision, Unicode, signed zero, empty structures and safe object keys',()=>{
 const data=JSON.parse('{"__proto__":{"safe":true},"constructor":"own","日本語":[null,false,true,"☔",[],{},[1.1,-2.3]],"f":[0.123456789,-0,9007199254740991,-9007199254740991]}');
 data.f[1]=-0;
 assert.deepEqual(decodeSeattle(encodeSeattle(data)),data);
 assert.equal({}.safe,undefined);
 assert.throws(()=>encodeSeattle([Infinity]),/Non-finite/);
});
test('SSP1 rejects truncation, invalid version/lengths/tags/references and trailing bytes',()=>{
 const bytes=encodeSeattle({name:'Seattle',ring:[[1.1,2.2],[3.3,4.4]],empty:[]});
 for(let n=0;n<bytes.length;n++)assert.throws(()=>decodeSeattle(bytes.subarray(0,n)));
 for(const offset of [0,4,8,12]){const bad=Buffer.from(bytes);bad.writeUInt32LE(0xffffffff,offset);assert.throws(()=>decodeSeattle(bad));}
 assert.throws(()=>decodeSeattle(Buffer.concat([bytes,Buffer.from([0])])));
 const tag=16+bytes.readUInt32LE(4),bad=Buffer.from(bytes);bad[tag]=255;assert.throws(()=>decodeSeattle(bad));
 const string=encodeSeattle('one');string[16+string.readUInt32LE(4)+1]=127;assert.throws(()=>decodeSeattle(string));
 const deep=encodeSeattle(Array.from({length:1},()=>null));deep[16+deep.readUInt32LE(4)+1]=127;assert.throws(()=>decodeSeattle(deep));
});
test('SSP1 limits nesting and allocation and validates non-finite float payloads',()=>{
 let deep=null;for(let i=0;i<66;i++)deep=[deep];assert.throws(()=>decodeSeattle(encodeSeattle(deep)));
 const oversized=encodeSeattle(new Array(100001).fill(null));assert.throws(()=>decodeSeattle(oversized));
 const number=encodeSeattle(1/3);number.writeDoubleLE(NaN,16+number.readUInt32LE(4)+1);assert.throws(()=>decodeSeattle(number));
 assert.throws(()=>decodeSeattle(new Uint8Array(8*1024*1024+1)));
});
test('native response decoding handles gzip and already-inflated hosts, HTTP failure and corrupt streams',async()=>{
 const data={ring:[[12.3,-45.6],[78.9,0]],name:'Green Lake'},bytes=encodeSeattle(data);
 for(const body of [bytes,gzipSync(bytes)])assert.deepEqual(await readSeattleResponse(new Response(body)),data);
 await assert.rejects(readSeattleResponse(new Response('offline',{status:503})),/503.*retry/);
 await assert.rejects(readSeattleResponse(new Response(new Uint8Array([0x1f,0x8b,1]))));
 let cancelled=false;
 const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}});
 await assert.rejects(readSeattleResponse(new Response(stream)),/invalid/);assert.equal(cancelled,true);
 const bomb=gzipSync(new Uint8Array(8*1024*1024+1));await assert.rejects(readSeattleResponse(new Response(bomb)),/invalid/);
});
