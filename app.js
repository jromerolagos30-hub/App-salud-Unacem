const ACTIVIDADES = ['Altura','Caliente','Confinado','Riesgo eléctrico','Izaje','MAPTEL','Excavaciones','Otros riesgos'];
const SINTOMAS = ['Dolor de cabeza','Mareos','Visión borrosa','Náuseas o vómitos','Falta de aire','Dolor en el pecho','Palpitaciones','Fiebre','Fatiga extrema','Dolor articular','Pérdida de equilibrio','Zumbido/dolor de oídos','Sensación de desmayo','Somnolencia por medicamentos','Alcohol o drogas'];
let trabajadorActual=null, reportesCache=[];

function showView(id){document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3500)}
function api(action, data={}){if(!API_URL||API_URL.includes('PEGAR_AQUI')) throw new Error('Falta configurar API_URL en config.js'); return fetch(API_URL,{method:'POST',body:JSON.stringify({action,...data})}).then(r=>r.json()).then(j=>{if(!j.ok)throw new Error(j.error||'Error');return j;});}
function makeChecks(id, arr){document.getElementById(id).innerHTML=arr.map((x,i)=>`<div class="checkrow"><div>${x}</div><div class="opts"><label><input type="radio" name="${id}_${i}" value="SI" required> SI</label><label><input type="radio" name="${id}_${i}" value="NO" required> NO</label></div></div>`).join('');}
function readChecks(id, arr){let o={};arr.forEach((x,i)=>{const v=document.querySelector(`input[name="${id}_${i}"]:checked`)?.value||'NO';o[x]=v});return o;}
function init(){makeChecks('actividades',ACTIVIDADES);makeChecks('sintomas',SINTOMAS);document.getElementById('filtroFecha').valueAsDate=new Date(); const vf=document.getElementById('valFecha'); if(vf) vf.valueAsDate=new Date(); initFirma();}
async function buscarTrabajador(){const dni=document.getElementById('dniBuscar').value.trim(); if(!dni)return toast('Ingrese DNI'); try{const j=await api('buscarTrabajador',{dni}); trabajadorActual=j.trabajador; const d=document.getElementById('datosTrabajador'); if(!trabajadorActual){d.className='notice error';d.innerHTML='DNI no encontrado o trabajador inactivo.';document.getElementById('formReporte').classList.add('hidden');return;} d.className='notice';d.innerHTML=`<b>${trabajadorActual.Nombres}</b><br>DNI: ${trabajadorActual.DNI}<br>Cargo: ${trabajadorActual.Cargo}<br>Empresa: ${trabajadorActual.Empresa}<br>Sede: ${trabajadorActual.Sede}`;document.getElementById('formReporte').classList.remove('hidden');}catch(e){toast(e.message)}}
async function guardarReporte(ev){ev.preventDefault(); if(!trabajadorActual)return; const act=readChecks('actividades',ACTIVIDADES), sin=readChecks('sintomas',SINTOMAS); const conSintomas=Object.values(sin).includes('SI'); const criticos=['Falta de aire','Dolor en el pecho','Sensación de desmayo','Alcohol o drogas'].some(k=>sin[k]==='SI'); const data={...trabajadorActual, Fecha:new Date().toISOString(), Condicion:criticos?'ALERTA MÉDICA':(conSintomas?'CON SÍNTOMAS':'SIN SÍNTOMAS'), Observacion:document.getElementById('observacion').value, Firma:document.getElementById('firma').toDataURL('image/png'), Actividades:act, Sintomas:sin}; try{await api('guardarReporte',{reporte:data}); toast('Reporte registrado correctamente'); ev.target.reset(); limpiarFirma(); document.getElementById('formReporte').classList.add('hidden'); document.getElementById('datosTrabajador').classList.add('hidden'); trabajadorActual=null;}catch(e){toast(e.message)}}
async function guardarTrabajador(ev){ev.preventDefault(); const trabajador={DNI:t_dni.value.trim(),Nombres:t_nombres.value.trim(),Cargo:t_cargo.value.trim(),Empresa:t_empresa.value.trim(),Sede:t_sede.value.trim(),Rubro:t_rubro.value.trim(),Correo:t_correo.value.trim(),Estado:t_estado.value}; try{await api('guardarTrabajador',{trabajador}); toast('Trabajador guardado'); ev.target.reset();}catch(e){toast(e.message)}}
async function cargaMasiva(){const lines=document.getElementById('bulk').value.trim().split(/\n/).filter(Boolean); const trabajadores=lines.map(l=>{const p=l.split(/\t|;/);return {DNI:p[0]||'',Nombres:p[1]||'',Cargo:p[2]||'',Empresa:p[3]||'',Sede:p[4]||'',Rubro:p[5]||'',Correo:p[6]||'',Estado:'ACTIVO'}}); try{await api('cargaMasiva',{trabajadores}); toast(`${trabajadores.length} trabajadores cargados`); bulk.value='';}catch(e){toast(e.message)}}
async function loadDashboard(){try{const fecha=filtroFecha.value, empresa=filtroEmpresa.value.trim(); const j=await api('dashboard',{fecha,empresa}); reportesCache=j.reportes||[]; kpiTrabajadores.textContent=j.totalTrabajadores; kpiReportes.textContent=j.totalReportes; kpiSintomas.textContent=j.conSintomas; kpiCumplimiento.textContent=j.cumplimiento+'%'; renderTabla(reportesCache);}catch(e){toast(e.message)}}
function renderTabla(rows){tablaReportes.innerHTML='<tr><th>Fecha</th><th>DNI</th><th>Trabajador</th><th>Empresa</th><th>Cargo</th><th>Condición</th></tr>'+rows.map(r=>`<tr><td>${r.Fecha||''}</td><td>${r.DNI||''}</td><td>${r.Nombres||''}</td><td>${r.Empresa||''}</td><td>${r.Cargo||''}</td><td><b>${r.Condicion||''}</b></td></tr>`).join('');}
function exportCSV(){const csv=['Fecha,DNI,Nombres,Empresa,Cargo,Condicion',...reportesCache.map(r=>[r.Fecha,r.DNI,r.Nombres,r.Empresa,r.Cargo,r.Condicion].map(x=>'"'+String(x||'').replaceAll('"','""')+'"').join(','))].join('\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='reportes_salud.csv';a.click();}
function initFirma(){const c=document.getElementById('firma'), ctx=c.getContext('2d'); let down=false; const pos=e=>{const r=c.getBoundingClientRect(), t=e.touches?.[0]||e; return {x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)}}; const start=e=>{down=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault()}; const move=e=>{if(!down)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.lineWidth=2;ctx.strokeStyle='#001f60';ctx.stroke();e.preventDefault()}; ['mousedown','touchstart'].forEach(x=>c.addEventListener(x,start)); ['mousemove','touchmove'].forEach(x=>c.addEventListener(x,move)); ['mouseup','mouseleave','touchend'].forEach(x=>c.addEventListener(x,()=>down=false));}
function limpiarFirma(){const c=document.getElementById('firma');c.getContext('2d').clearRect(0,0,c.width,c.height)}
init();


function extraerDnis(texto){
  return [...new Set(String(texto||'').match(/\b\d{8}\b/g) || [])];
}
async function leerFotoPermiso(){
  const file=document.getElementById('fotoPermiso').files[0];
  if(!file) return toast('Seleccione o tome una foto');
  if(!window.Tesseract) return toast('No cargó el lector OCR. Verifique internet.');
  ocrEstado.textContent='Leyendo imagen, espere...';
  try{
    const r=await Tesseract.recognize(file,'eng',{logger:m=>{ if(m.status) ocrEstado.textContent=`OCR: ${m.status} ${Math.round((m.progress||0)*100)}%`; }});
    const dnis=extraerDnis(r.data.text);
    dniDetectados.value=dnis.join('\n');
    ocrEstado.textContent=dnis.length?`DNI detectados: ${dnis.length}`:'No se detectaron DNI. Puede pegarlos manualmente.';
  }catch(e){ ocrEstado.textContent='Error OCR. Puede pegar los DNI manualmente.'; toast(e.message); }
}
async function validarPermiso(){
  const dnis=extraerDnis(dniDetectados.value);
  if(!dnis.length) return toast('No hay DNI para validar');
  try{
    const j=await api('validarPermiso',{dnis,fecha:valFecha.value,empresa:valEmpresa.value.trim()});
    renderValidacion(j);
  }catch(e){toast(e.message)}
}
function renderValidacion(j){
  const faltan=j.noReportaron||[], sintomas=j.conSintomas||[], ok=j.reportaron||[];
  let html=`<h3>Resultado de validación</h3><p><b>Fecha:</b> ${j.fecha||''}</p><p><b>DNI leídos:</b> ${j.totalDni}</p>`;
  if(!faltan.length) html+=`<div class="ok">✅ Todos reportaron sus síntomas hoy.</div>`;
  else html+=`<div class="bad">❌ No reportaron síntomas hoy:</div><ul>`+faltan.map(x=>`<li>${x.Nombres||'No registrado'} / DNI ${x.DNI}</li>`).join('')+`</ul>`;
  if(sintomas.length) html+=`<div class="warn">⚠️ Reportaron con síntomas o alerta:</div><ul>`+sintomas.map(x=>`<li>${x.Nombres||''} / DNI ${x.DNI} / ${x.Condicion||''}</li>`).join('')+`</ul>`;
  if(ok.length && faltan.length) html+=`<details><summary>Ver quienes sí reportaron</summary><ul>`+ok.map(x=>`<li>${x.Nombres||''} / DNI ${x.DNI} / ${x.Condicion||''}</li>`).join('')+`</ul></details>`;
  resultadoValidacion.innerHTML=html;
}
