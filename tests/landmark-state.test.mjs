import test from 'node:test';
import assert from 'node:assert/strict';
import * as state from '../js/landmark-state.js';
test('landmark lawn bounds remain a live binding without importing city generation',()=>{
  const bounds={minX:1,maxX:2,minZ:3,maxZ:4,top:1.3};
  try{state.setBryantParkLawn(bounds);assert.equal(state.bryantParkLawn,bounds);
    state.setBryantParkLawn({...bounds,top:2});assert.equal(state.bryantParkLawn.top,2);
  }finally{state.setBryantParkLawn(undefined);}
});
