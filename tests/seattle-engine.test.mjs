import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const entry of ['index.html','newyork.html'])test(`${entry}: aliases and add-on relative imports resolve to one minified engine graph`,()=>{
 const html=readFileSync(new URL('../'+entry,import.meta.url),'utf8');
 const {imports}=JSON.parse(html.match(/<script type="importmap">([^]*?)<\/script>/)[1]);
 assert.equal(imports.three,imports['three/webgpu']);
 assert.match(imports.three,/three\.webgpu\.min\.js$/);
 const base=imports.three.split('/build/')[0];
 for(const name of ['core','tsl','webgpu'])assert.equal(imports[base+`/build/three.${name}.js`],base+`/build/three.${name}.min.js`);
 assert.equal(imports['three/tsl'],base+'/build/three.tsl.min.js');
 assert.match(base,/@b3396270682287470d161658ac01084d25e8dba6$/);
});
