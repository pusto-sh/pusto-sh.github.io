#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
layout(std140) uniform Uniforms {
  vec4 frame;
  vec4 view;
  vec4 pointer;
  vec4 interaction;
  vec4 pulses[4];
};
uniform sampler2D brush;
const vec2 WORLD = vec2(1536., 1024.);
const vec2 CENTER = vec2(1168., 437.);
const vec4 REAR = vec4(786.,710.,814.,782.);
const vec4 FRONT = vec4(820.,830.,790.,817.);
float hash(vec2 p) {
  vec3 q=fract(vec3(p.x,p.y,p.x)*.1031);
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p), s=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),s.x),mix(hash(i+vec2(0,1)),hash(i+1.),s.x),s.y);
}
float fbm(vec2 p) { return noise(p)*.57+noise(p*2.03+19.7)*.28+noise(p*4.11+41.3)*.15; }
float bell(float x,float w) { return exp(-x*x/(w*w)); }
vec3 iridescence(float phase) {
  return vec3(.59,.54,.55)+vec3(.37,.34,.34)*cos(6.283185*(phase+vec3(0.,.28,.54)));
}
vec4 warmWave(vec2 point) {
  vec2 local=point-CENTER;
  float radius=length(local);
  if(radius<=120.||interaction.z==0.) return vec4(0.);
  vec2 radial=local/radius,tangent=vec2(-radial.y,radial.x);
  float shape=dot(radial,vec2(.065,-.04))+(noise(point*.0035)-.5)*.08;
  float distance=radius*(1.+shape),curl=(noise(point*.004+29.)-.5)*.35;
  vec2 displacement=vec2(0.);
  float light=0.,depth=0.;
  for(int i=0;i<4;i++) {
    float age=frame.z-pulses[i].x;
    if(age>=0.&&age<7.5) {
      // Critically damped step response.
      float springTime=age*1.05,travel=1.-(1.+springTime)*exp(-springTime);
      float front=132.+travel*1560.,delta=distance-front;
      float span=mix(230.+travel*140.,115.+travel*100.,smoothstep(-90.,110.,delta));
      float body=bell(delta,span),recovery=bell(delta+span*1.15,span*.82)*.12;
      float envelope=smoothstep(0.,.22,age)*exp(-age*.28)*(1.-smoothstep(5.,7.5,age))*pulses[i].y;
      displacement-=(radial+tangent*curl)*(body-recovery)*envelope*62.;
      light+=body*envelope;
      depth+=clamp(delta/span,-1.,1.)*body*envelope;
    }
  }
  float outside=smoothstep(120.,190.,radius);
  displacement*=outside;
  displacement*=min(1.,140./max(length(displacement),.001));
  return vec4(displacement,min(light,1.8)*outside,clamp(depth,-.8,.8)*outside);
}
float hill(float x,bool front) {
  float t=clamp(x/WORLD.x,0.,1.),s=1.-t;
  return dot(front?FRONT:REAR,vec4(s*s*s,3.*s*s*t,3.*s*t*t,t*t*t));
}
vec3 skyIllumination(float time) {
  vec2 anchor=vec2(1040.,620.);
  float air=fbm(anchor*.0035+vec2(time*.018,-time*.009));
  float flow=fbm(anchor*.0024+vec2(air*1.6,-air*1.2)+vec2(time*.018,-time*.011));
  float distance=length((anchor-CENTER)*vec2(1.,.86));
  float phase=distance*.0046+flow*3.6-time*.12;
  return iridescence(phase*.16-time*.008);
}
vec3 groundIllumination(float time) {
  // Delayed temporal average of the ambient sky color.
  vec3 hue=skyIllumination(time-8.)*.25+skyIllumination(time-21.)*.5+skyIllumination(time-34.)*.25;
  return (hue-vec3(.59,.54,.55))*.012;
}
float mineralNoise(vec2 p) {
  vec2 q=p;
  float value=noise(q)*.53;
  q=vec2(q.x*.8-q.y*.6,q.x*.6+q.y*.8)*2.07+13.9;
  value+=noise(q)*.27;
  q=vec2(q.x*.8-q.y*.6,q.x*.6+q.y*.8)*2.11+31.7;
  value+=noise(q)*.13;
  q=vec2(q.x*.8-q.y*.6,q.x*.6+q.y*.8)*2.03+7.3;
  return value+noise(q)*.07;
}
const vec2 WASH_SAGE[8] = vec2[8](
  vec2(-220.0, 9.0), vec2(85.0, 15.0),
  vec2(243.0, 46.0), vec2(457.0, 64.0),
  vec2(405.0, 108.0), vec2(170.0, 128.0),
  vec2(-45.0, 115.0), vec2(-220.0, 75.0));
const vec2 WASH_STONE[8] = vec2[8](
  vec2(306.0, -16.0), vec2(597.0, -9.0),
  vec2(813.0, 17.0), vec2(1086.0, 22.0),
  vec2(1160.0, 64.0), vec2(941.0, 107.0),
  vec2(668.0, 117.0), vec2(402.0, 80.0));
const vec2 WASH_EAST[8] = vec2[8](
  vec2(1024.0, 24.0), vec2(1202.0, 3.0),
  vec2(1412.0, 23.0), vec2(1700.0, 9.0),
  vec2(1710.0, 168.0), vec2(1471.0, 191.0),
  vec2(1239.0, 129.0), vec2(1110.0, 78.0));
const vec2 WASH_SAGE_POOL[8] = vec2[8](
  vec2(-120.0, 91.0), vec2(70.0, 72.0),
  vec2(201.0, 81.0), vec2(343.0, 125.0),
  vec2(282.0, 174.0), vec2(117.0, 198.0),
  vec2(-18.0, 177.0), vec2(-120.0, 135.0));
const vec2 WASH_STONE_POOL[8] = vec2[8](
  vec2(396.0, 118.0), vec2(572.0, 88.0),
  vec2(670.0, 95.0), vec2(791.0, 154.0),
  vec2(951.0, 180.0), vec2(867.0, 264.0),
  vec2(604.0, 271.0), vec2(422.0, 211.0));
const vec2 WASH_EAST_POOL[8] = vec2[8](
  vec2(1155.0, 71.0), vec2(1240.0, 48.0),
  vec2(1300.0, 39.0), vec2(1399.0, 65.0),
  vec2(1512.0, 77.0), vec2(1465.0, 111.0),
  vec2(1321.0, 122.0), vec2(1190.0, 97.0));
const vec2 WASH_CHALK[8] = vec2[8](
  vec2(809.0, 106.0), vec2(963.0, 82.0),
  vec2(1094.0, 91.0), vec2(1216.0, 119.0),
  vec2(1198.0, 161.0), vec2(1050.0, 177.0),
  vec2(951.0, 155.0), vec2(866.0, 166.0));

float washDistance(vec2 p, vec2 points[8]) {
  float closest=1.0e9;
  bool inside=false;
  for(int i=0;i<8;i++) {
    vec2 a=points[i],b=points[(i+1)%8],edge=b-a,relative=p-a;
    vec2 nearest=relative-edge*clamp(dot(relative,edge)/dot(edge,edge),0.,1.);
    closest=min(closest,dot(nearest,nearest));
    if((a.y>p.y)!=(b.y>p.y)) {
      float crossing=a.x+(p.y-a.y)*(b.x-a.x)/(b.y-a.y);
      if(p.x<crossing) inside=!inside;
    }
  }
  return (inside?-1.:1.)*sqrt(closest);
}
vec3 pigmentWash(float distance,float settling,vec3 tint,float seed,float time) {
  float wetEdge=1.-smoothstep(-1.8,3.2,distance);
  float feather=1.-smoothstep(-18.,22.,distance);
  float absorption=smoothstep(.28,.70,settling);
  float coverage=mix(wetEdge,feather,.35+absorption*.50);
  float pooled=bell(distance+.8,2.1)*smoothstep(.48,.68,settling);
  float density=1.+.085*sin(time*6.283185/(139.+seed*37.)+seed*2.3)
    +.035*sin(time*6.283185/(179.+seed*23.)+seed*4.1);
  float temperature=sin(time*6.283185/(167.+seed*29.)+seed*3.2);
  vec3 pigment=tint*(.57+absorption*.78)*density;
  return coverage*(pigment+vec3(.0012,.0002,-.0010)*temperature)
    -vec3(.0045,.0041,.0032)*pooled*density;
}
vec3 mineralWashes(vec2 point,float depth,bool near,float time) {
  vec2 paper=vec2(point.x,depth)+(near?vec2(0.):vec2(73.,48.));
  float offset=near?0.:19.7;
  vec2 broad=vec2(mineralNoise(paper*vec2(.006,.019)+offset+8.2),
    mineralNoise(paper*vec2(.008,.024)+offset+37.6))-.5;
  float edgeNoise=mineralNoise(paper*vec2(.072,.16)+offset+52.3)-.5;
  vec2 p=paper+broad*vec2(140.,64.);
  float ragged=edgeNoise*6.+(noise(paper*.48+offset)-.5)*1.2;
  float settling=mineralNoise(paper*vec2(.031,.074)+offset+71.2)*.64
    +mineralNoise(paper*vec2(.009,.023)+offset+24.8)*.36;
  float washTime=time+(near?0.:41.),seedOffset=near?0.:.23;
  vec3 sage=pigmentWash(washDistance(p,WASH_SAGE)+ragged,settling,vec3(-0.053, -0.029, -0.034),0.17+seedOffset,washTime);
  vec3 stone=pigmentWash(washDistance(p,WASH_STONE)+ragged,settling,vec3(-0.003, -0.013, -0.032),0.83+seedOffset,washTime);
  vec3 east=pigmentWash(washDistance(p,WASH_EAST)+ragged,settling,vec3(-0.035, -0.018, -0.024),1.61+seedOffset,washTime);
  vec3 washes=sage+stone+east;
  if(near) {
    washes+=pigmentWash(washDistance(p,WASH_SAGE_POOL)+ragged,settling,vec3(-0.024, -0.014, -0.018),2.39,washTime);
    washes+=pigmentWash(washDistance(p,WASH_STONE_POOL)+ragged,settling,vec3(-0.025, -0.032, -0.042),1.04,washTime);
    washes+=pigmentWash(washDistance(p,WASH_EAST_POOL)+ragged,settling,vec3(-0.029, -0.017, -0.022),1.95,washTime);
    washes+=pigmentWash(washDistance(p,WASH_CHALK)+ragged,settling,vec3(0.014, 0.012, 0.009),2.65,washTime);
  }
  float fibres=noise(paper*vec2(.60,.85)+offset)-.5;
  float fine=mineralNoise(paper*vec2(.23,.38)+offset+91.5)-.5;
  vec3 paperColor=vec3((settling-.5)*.018+fine*.027+fibres*.011);
  return washes*(near?1.:.28)+paperColor*(near?1.:.70);
}
vec3 meadow(vec2 point,float depth,bool near,float time,vec3 skyLight) {
  vec3 surface=mix(vec3(.768,.777,.740),vec3(.780,.790,.752),exp(-depth/650.));
  if(near) surface=mix(vec3(.745,.753,.712),vec3(.759,.765,.724),exp(-depth/850.));
  float horizonWarmth=bell(point.x-1160.,760.)*exp(-depth/420.);
  surface+=vec3(.020,.010,-.001)*horizonWarmth*(near?.2:1.);
  surface+=mineralWashes(point,depth,near,time);
  // Animate intensity only; light centers stay fixed.
  float lightTime=time-(near?26.:0.);
  float west=bell(point.x-220.,1100.)*sin(lightTime*6.283185/137.+.35);
  float east=bell(point.x-1240.,1050.)*sin(lightTime*6.283185/173.+2.1);
  float middle=bell(point.x-760.,1800.)*sin(lightTime*6.283185/157.+4.3);
  vec3 ambient=vec3(.009,.005,-.002)*west+vec3(-.003,.003,.008)*east+vec3(.003)*middle;
  return surface+(ambient+skyLight*exp(-depth/500.))*(near?.15:.30);
}
vec2 brushFibres(vec2 p,float time) {
  vec2 local=p-CENTER;
  float radius=length(local);
  if(radius<65.||radius>122.) return vec2(0.);
  vec2 direction=local/max(radius,1.);
  float along=dot(direction,vec2(2.4,-3.2));
  // Animate fibre shading without displacing the SVG mask.
  float bend=.30*sin(dot(direction,vec2(3.,-2.))+radius*.31+time*.34)
    +.12*sin(dot(direction,vec2(-5.,3.))+radius*.67-time*.24);
  float lane=radius*.48+bend+noise(vec2(radius*.16,dot(direction,vec2(2.1,1.7))))*.7;
  float seed=hash(vec2(floor(lane),19.4));
  float aa=max(.018,.24*view.x/frame.x/view.z);
  float thread=1.-smoothstep(.10-aa,.10+aa,abs(fract(lane)-.5));
  float broken=.3+.7*smoothstep(.25,.8,noise(vec2(radius*.62,along*.65)));
  float glint=pow(max(0.,sin(along+time*(.24+seed*.15)+seed*6.283185)),10.);
  return vec2((thread-.2)*broken,thread*broken*glint);
}
float ink(vec2 p) {
  vec2 q=(p-vec2(1048,324))/vec2(240,230);
  float inside=float(all(greaterThanEqual(q,vec2(0)))&&all(lessThanEqual(q,vec2(1))));
  return textureLod(brush,q,0.).a*inside;
}
void main() {
  float time=frame.z*interaction.z;
  vec2 size=WORLD*view.z, offset=(view.xy-size)*vec2(.82,.5);
  vec2 point=(uv*view.xy-offset)/view.z;
  vec2 toward=(pointer.xy-CENTER)*.014*pointer.z*interaction.z;
  float breath=sin(time*.43)*.5+.5;
  float energy=pointer.w*.85;
  vec4 wave=warmWave(point);
  vec2 refracted=point+wave.xy;
  float air=fbm(refracted*.0035+vec2(time*.018,-time*.009));
  float flow=fbm(refracted*.0024+vec2(air*1.6,-air*1.2)+vec2(time*.018,-time*.011));
  float proximity=exp(-dot((point-CENTER)/440.,(point-CENTER)/440.));
  vec2 fluid=vec2(sin(refracted.y*.008+flow*6.+time*.16),cos(refracted.x*.006+flow*5.-time*.12));
  vec2 p=refracted+(vec2(sin(refracted.y*.021+air*5.+time*.32),air-.5)*3.+fluid*(3.+energy*18.))*proximity*interaction.z;
  vec2 lightCenter=vec2(1144,443)+toward+vec2(sin(time*.12)*5.,cos(time*.09)*4.);
  vec2 q=(p-lightCenter)/vec2(810,740);
  float sunlight=exp(-dot(q,q)*4.5);
  vec3 color=mix(mix(vec3(.40,.52,.54),vec3(.70,.62,.55),p.y/1024.),vec3(1.,.83,.64),sunlight*.99);
  color+=(air-.5)*vec3(.027,.023,.017)*(.35+sunlight);
  color+=proximity*vec3(.030,.019,.008)*(breath+pointer.w*2.);
  color+=proximity*vec3(.027,.016,.006)*(pointer.z+interaction.w*.35);
  float distance=length((p-CENTER)*vec2(1.,.86));
  float phase=distance*.0046+flow*3.6-time*.12;
  float ribbon=pow(.5+.5*sin(phase*2.5),2.);
  vec3 spectrum=iridescence(phase*.16-time*.008+energy*.19);
  float tint=(.24+proximity*.16+energy*.38)*(.3+ribbon*.7);
  color=mix(color,.25+spectrum*.75,min(tint,.78));
  float caustic=pow(.5+.5*cos(phase*6.283185),24.);
  color+=spectrum*caustic*(.018+energy*.12)*proximity;
  color*=1.+wave.w*.045;
  color=mix(color,vec3(1.,.77,.48),wave.z*.075);
  color+=vec3(.024,.012,.003)*wave.z;
  float rear=hill(point.x,false),front=hill(point.x,true),edgeWidth=max(.45,fwidth(point.y)*.65);
  float rearMask=smoothstep(rear-edgeWidth,rear+edgeWidth,point.y);
  float frontMask=smoothstep(front-edgeWidth,front+edgeWidth,point.y);
  if(rearMask>0.) {
    vec3 skyLight=groundIllumination(time);
    if(frontMask<1.) {
      vec3 rearColor=meadow(point,max(0.,point.y-rear),false,time,skyLight);
      color=mix(color,rearColor,rearMask);
    }
    if(frontMask>0.) {
      vec3 frontColor=meadow(point,max(0.,point.y-front),true,time,skyLight);
      color=mix(color,frontColor,frontMask);
    }
  }
  vec2 ringPoint=point;
  float radius=length(ringPoint-CENTER),angle=atan(ringPoint.y-CENTER.y,ringPoint.x-CENTER.x);
  vec3 film=iridescence(angle/6.283185+radius*.009-time*.035+flow*.4);
  float split=(.3+pointer.w*2.2)*interaction.z*view.x/frame.x/view.z;
  vec2 radial=normalize(ringPoint-CENTER+vec2(.001));
  vec3 mask=vec3(ink(ringPoint+radial*split),ink(ringPoint),ink(ringPoint-radial*split));
  float grain=noise(ringPoint*.74);
  vec2 fibres=brushFibres(ringPoint,time);
  vec2 rim=vec2(ink(ringPoint+vec2(.8,0))-ink(ringPoint-vec2(.8,0)),ink(ringPoint+vec2(0,.8))-ink(ringPoint-vec2(0,.8)));
  float relief=dot(rim,normalize(vec2(-.7,-.8)));
  float glint=pow(max(0.,sin(angle-time*.16+.8)),18.);
  float warmth=.1+breath*.1;
  vec3 pigment=vec3(.726,.393,.252)+vec3(.084,.055,.028)*(grain+.5);
  pigment=mix(pigment,film*(.8+grain*.2),min(.32+energy*.50,.9));
  pigment+=relief*vec3(.4,.28,.11)+vec3(.2,.115,.040)*glint;
  pigment+=vec3(.11,.075,.045)*fibres.x;
  pigment+=mix(vec3(1.,.77,.46),film,.35)*fibres.y*.10;
  color=mix(color,pigment,mask);
  color+=mask*(bell(radius-99.,13.)*.6+glint*.7+max(0.,relief)*.8)*mix(vec3(1.55,.79,.27),film*1.7,.65)*warmth;
  color+=film*.10*bell(radius-104.,38.)*warmth;
  float edge=clamp(length(rim)*1.4,0.,1.);
  float edgeLight=pointer.z*.7+pointer.w*.9+interaction.y*.5;
  color+=edge*vec3(1.3,.95,.56)*edgeLight;
  // Alpha-derived halo approximates the WebGPU bloom pass.
  float halo=max(0.,(ink(ringPoint+vec2(4,0))+ink(ringPoint-vec2(4,0))
    +ink(ringPoint+vec2(0,4))+ink(ringPoint-vec2(0,4)))*.25-mask.g);
  color+=halo*vec3(.40,.28,.13)*edgeLight;
  color+=((noise(point*.5)-.5)*.007+(hash(point*1.7)-.5)*.004)*mix(1.,.15,rearMask);
  float peak=max(color.r,max(color.g,color.b));
  float shoulder=.94+.06*(1.-exp(-max(peak-.94,0.)/.06));
  color*=min(1.,shoulder/max(peak,.0001));
  color*=1.-dot(uv-.5,uv-.5)*.07;
  float skyGrain=hash(gl_FragCoord.xy+fract(time*.07)*73.)-.5;
  float landGrain=(hash(point*1.7+83.2)-.5)*.45;
  color+=mix(skyGrain,landGrain,rearMask)/255.;
  outColor=vec4(color,1);
}
