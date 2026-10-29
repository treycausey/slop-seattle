import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARK_CATALOG,DESTINATIONS,landmarkClearance,landmarkReplacesFootprint} from '../js/seattle-config.js';
test('fivefold Places catalog preserves the original 19 and adds 76 sourced architectural sites',()=>{
  assert.equal(DESTINATIONS.length,95);assert.equal(LANDMARK_CATALOG.length,76);
  assert.equal(new Set(DESTINATIONS.map(d=>d.id)).size,95);
  assert.ok(new Set(LANDMARK_CATALOG.map(d=>d.kind)).size>=20);
  for(const d of LANDMARK_CATALOG){
    assert.ok(Number.isInteger(d.source));assert.ok(d.signature.length>30);
    assert.ok([d.lat,d.lon,d.w,d.h,d.d,...d.arrival].every(Number.isFinite));
  }
  for(const area of ['Queen Anne','Magnolia','Eastlake','University District','Licton Springs','Sunset Hill'])
    assert.ok(LANDMARK_CATALOG.some(d=>d.area===area),area);
});
test('spatial landmark replacement matches the full catalog including footprint corners and long outlines',()=>{
  const reference=b=>DESTINATIONS.some(d=>d.id!=='lake'&&(Math.hypot(d.x-b.x,d.z-b.z)<landmarkClearance(d.id)||
    (d.kind&&Math.min(...b.ring.map(p=>p[0]))<d.x+d.w/2+8&&Math.max(...b.ring.map(p=>p[0]))>d.x-d.w/2-8&&
      Math.min(...b.ring.map(p=>p[1]))<d.z+d.d/2+8&&Math.max(...b.ring.map(p=>p[1]))>d.z-d.d/2-8)));
  for(let i=0;i<800;i++){
    const x=-5200+(i*769%8000),z=-10500+(i*431%12700),w=i%19===0?1300:8+i%60,depth=12+i%80;
    const b={x,z,ring:[[x-w/2,z-depth/2],[x+w/2,z-depth/2],[x+w/2,z+depth/2],[x-w/2,z+depth/2]]};
    assert.equal(landmarkReplacesFootprint(b),reference(b),`outline ${i}`);
  }
});
