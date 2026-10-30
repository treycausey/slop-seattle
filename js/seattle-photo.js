import {Vector3} from 'three/webgpu';

// One lazy viewer, no render targets, timers, geometry or per-frame allocations.
export function createPhotoMode(camera, trigger, getTarget, reset, cycleTime, groundAt) {
  const target=new Vector3(),eye=new Vector3(),look=new Vector3();
  let active=false,yaw,pitch,zoom,azimuth,elevation,radius;
  const tools=document.createElement('nav');tools.id='photo-tools';tools.hidden=true;tools.setAttribute('aria-label','Photo controls');
  const time=document.createElement('button'),exit=document.createElement('button');
  time.type=exit.type='button';time.textContent='Change light';exit.textContent='Back · Esc';
  tools.append(time,exit);document.body.append(tools);
  time.onclick=cycleTime;exit.onclick=()=>toggle();
  function toggle(){
    active=!active;reset();tools.hidden=!active;document.body.classList.toggle('photo-mode',active);
    trigger.setAttribute('aria-pressed',String(active));
    if(active){
      target.copy(getTarget());eye.copy(camera.camera.position);look.copy(camera.currentLookAt);
      // Follow the actual rendered ray, including skyline and formation cameras.
      const distance=Math.max(1,eye.distanceTo(target));camera.camera.getWorldDirection(target).multiplyScalar(distance).add(eye);
      yaw=camera.orbitYawOffset;pitch=camera.orbitPitchOffset;zoom=camera.zoomMultiplier;
      const x=eye.x-target.x,y=eye.y-target.y,z=eye.z-target.z;
      radius=Math.max(1,Math.hypot(x,y,z));azimuth=Math.atan2(x,z);elevation=Math.asin(y/radius);exit.focus();
    }else{
      camera.orbitYawOffset=yaw;camera.orbitPitchOffset=pitch;camera.zoomMultiplier=zoom;
      camera.currentPos.copy(eye);camera.currentLookAt.copy(look);trigger.focus();
    }
  }
  document.addEventListener('keydown',event=>{
    if(!active||event.metaKey||event.ctrlKey||event.altKey)return;
    event.stopImmediatePropagation();
    if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(!event.repeat)toggle();}
    else if(!['Tab','Enter','Space'].includes(event.code))event.preventDefault();
  },true);
  return {get active(){return active;},toggle,update(){
    const a=azimuth+camera.orbitYawOffset-yaw,b=Math.max(-1.4,Math.min(1.4,elevation+camera.orbitPitchOffset-pitch)),r=radius*camera.zoomMultiplier/zoom;
    camera.currentPos.set(target.x+Math.sin(a)*Math.cos(b)*r,target.y+Math.sin(b)*r,target.z+Math.cos(a)*Math.cos(b)*r);
    camera.currentPos.y=Math.max(camera.currentPos.y,groundAt(camera.currentPos.x,camera.currentPos.z)+1);
    camera.camera.position.copy(camera.currentPos);camera.camera.lookAt(target);
  }};
}
