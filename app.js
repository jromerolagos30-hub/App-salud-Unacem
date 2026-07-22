const ACTIVIDADES_ALTO_RIESGO=['Trabajos en Altura','Trabajos en Caliente','Trabajos en Espacio Confinado','Trabajos en Izaje mecánico de cargas','Trabajos de Excavación o Demolición','Trabajos con Aislamiento de Energía','Conducción de Equipos Móviles'];
const ACTIVIDAD_SIN_ALTO_RIESGO='No realizo trabajos de alto riesgo';
const ACTIVIDADES=[...ACTIVIDADES_ALTO_RIESGO,ACTIVIDAD_SIN_ALTO_RIESGO];
const SINTOMAS=['Dolor de cabeza','Mareos o sensación de inestabilidad','Visión borrosa o doble','Náuseas o vómitos','Falta de aire / dificultad para respirar','Dolor en alguna parte del cuerpo','Dolor o presión en el pecho','Palpitaciones o taquicardia','Fiebre o escalofríos','Fatiga o Cansancio Excesivo','Malestar General','Pérdida de equilibrio','Zumbido/dolor de oídos','Sensación de desmayo','No presento ninguna molestia o síntomas'];
let trabajadorActual=null,empresasCache=[],chartCum=null,chartSint=null;
function today(){return new Date().toISOString().slice(0,10)}
function showView(id){document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));document.getElementById(id).classList.remove('hidden')}
function salirTrabajador(){trabajadorActual=null;dniBuscar.value='';datosTrab.classList.add('hidden');formReporte.reset();formReporte.classList.add('hidden');actualizarVistaActividad();showView('trabajador')}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),4500)}
async function api(action,data={}){if(typeof API_URL==='undefined'||!API_URL||API_URL.includes('PEGA_AQUI'))throw new Error('Falta configurar API_URL');const r=await fetch(API_URL,{method:'POST',body:JSON.stringify({action,...data})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Operación no válida');return j}
function dniOk(v){return /^\d{8}$/.test(String(v||'').trim())}
async function loadEmpresas(){const r=await api('listarEmpresas');empresasCache=r.empresas||[];return empresasCache}
function fillSelect(id,all=false){const s=document.getElementById(id);if(!s)return;s.innerHTML=all?'<option value="">Todas las empresas</option>':'<option value="">Empresa *</option>';empresasCache.forEach(e=>s.innerHTML+=`<option>${e.Empresa}</option>`)}
function initChecks(){
  acts.innerHTML=ACTIVIDADES.map(a=>`<label class="check"><input type="checkbox" data-act="${a}"> <span>${a}</span></label>`).join('');
  sints.innerHTML=SINTOMAS.map(a=>`<label class="check"><input type="checkbox" data-sint="${a}"> <span>${a}</span></label>`).join('');

  document.querySelectorAll('[data-sint]').forEach(ch=>ch.addEventListener('change',()=>{
    const none=document.querySelector(`[data-sint="No presento ninguna molestia o síntomas"]`);
    if(ch===none&&ch.checked)document.querySelectorAll('[data-sint]').forEach(x=>{if(x!==none)x.checked=false});
    if(ch!==none&&ch.checked&&none)none.checked=false;
  }));

  document.querySelectorAll('[data-act]').forEach(ch=>ch.addEventListener('change',()=>{
    const noAlto=document.querySelector(`[data-act="${ACTIVIDAD_SIN_ALTO_RIESGO}"]`);
    if(ch===noAlto&&ch.checked){
      document.querySelectorAll('[data-act]').forEach(x=>{if(x!==noAlto)x.checked=false});
    }else if(ch!==noAlto&&ch.checked&&noAlto){
      noAlto.checked=false;
    }
    actualizarVistaActividad();
  }));

  actualizarVistaActividad();
}

function actualizarVistaActividad(){
  const noAlto=document.querySelector(`[data-act="${ACTIVIDAD_SIN_ALTO_RIESGO}"]`);
  const ocultar=!!(noAlto&&noAlto.checked);
  const bloque=document.getElementById('bloqueSintomas');
  if(bloque)bloque.classList.toggle('hidden',ocultar);
  if(ocultar)document.querySelectorAll('[data-sint]').forEach(x=>x.checked=false);
}

async function buscarTrabajador(){try{const d=dniBuscar.value.trim();if(!dniOk(d))return toast('DNI debe tener 8 dígitos');const r=await api('buscarTrabajador',{dni:d});if(!r.trabajador){datosTrab.classList.remove('hidden');datosTrab.innerHTML='<b>DNI no se encuentra activo en la master.</b>';formReporte.classList.add('hidden');return}trabajadorActual=r.trabajador;datosTrab.classList.remove('hidden');datosTrab.innerHTML=`<b>${r.trabajador.Nombres}</b><br>${r.trabajador.Cargo} · ${r.trabajador.Empresa} · ${r.trabajador.Sede}<br>Celular: ${r.trabajador.Celular||''}`;formReporte.classList.remove('hidden');formReporte.reset();actualizarVistaActividad()}catch(e){toast(e.message)}}
formReporte.onsubmit=async ev=>{
  ev.preventDefault();
  try{
    if(!trabajadorActual)return toast('Busque primero al trabajador');

    const Actividades={};
    const Sintomas={};
    document.querySelectorAll('[data-act]:checked').forEach(x=>Actividades[x.dataset.act]='SI');
    document.querySelectorAll('[data-sint]:checked').forEach(x=>Sintomas[x.dataset.sint]='SI');

    if(!Object.keys(Actividades).length)return toast('Debe seleccionar al menos una actividad');

    const noRealizaAlto=!!Actividades[ACTIVIDAD_SIN_ALTO_RIESGO];

    if(!noRealizaAlto&&!Object.keys(Sintomas).length){
      return toast('Debe seleccionar los síntomas que presenta o indicar que no presenta molestias');
    }

    if(!declara.checked)return toast('Debe aceptar la declaración');

    const ejecutaAlto=noRealizaAlto?'NO':'SI';
    const sinMolestia=noRealizaAlto||!!Sintomas['No presento ninguna molestia o síntomas'];
    const condicion=sinMolestia?'SIN SÍNTOMAS':'CON SÍNTOMAS';

    const reporte={
      ...trabajadorActual,
      DNI:String(trabajadorActual.DNI),
      EjecutaAltoRiesgo:ejecutaAlto,
      Actividades,
      Sintomas,
      Observacion:noRealizaAlto?'No realiza trabajos de alto riesgo':(sinMolestia?'No presenta síntomas':''),
      Condicion:condicion,
      DeclaracionVeraz:'SI'
    };

    await api('guardarReporte',{reporte});

    if(condicion==='CON SÍNTOMAS'){
      alert('Registro finalizado. Informar a su supervisor inmediatamente y contactar al área médica de UNACEM (UME) - Cel.: 987466352 antes de iniciar cualquier actividad.');
    }else if(noRealizaAlto){
      alert('Registro finalizado. Si durante la jornada le asignan una tarea de alto riesgo, deberá volver a realizar el registro de síntomas antes de ejecutar dicho trabajo.');
    }else{
      alert('Registro finalizado. Si durante su jornada presenta algún síntoma, deberá comunicarlo inmediatamente a su supervisor y acercarse al Tópico o Ambulancia de la Planta.');
    }

    formReporte.reset();
    formReporte.classList.add('hidden');
    datosTrab.classList.add('hidden');
    dniBuscar.value='';
    trabajadorActual=null;
    actualizarVistaActividad();
  }catch(e){
    toast(e.message);
  }
}

async function initEmpresa(){await loadEmpresas();fillSelect('temp');fillSelect('fempGestion',true);listarTrabajadores()}
async function guardarTrabajador(){try{const t={DNI:tdni.value.trim(),Nombres:tnom.value.trim(),Cargo:tcargo.value.trim(),Empresa:temp.value,Sede:tsede.value.trim(),Correo:tcorreo.value.trim(),Celular:tcelular.value.trim(),Estado:test.value};if(!dniOk(t.DNI))return toast('DNI debe tener 8 dígitos');if(Object.values(t).some(v=>!v))return toast('Todos los campos son obligatorios');await api('guardarTrabajador',{trabajador:t});toast('Trabajador guardado');tdni.value=tnom.value=tcargo.value=tcorreo.value=tcelular.value='';tsede.value='';temp.value='';test.value='ACTIVO';listarTrabajadores()}catch(e){toast(e.message)}}
async function listarTrabajadores(){try{const r=await api('listarTrabajadores',{empresa:fempGestion.value});const arr=r.trabajadores||[];tablaTrab.innerHTML='<table class="table"><tr><th>DNI</th><th>Nombres</th><th>Cargo</th><th>Empresa</th><th>Celular</th><th>Estado</th><th>Acción</th></tr>'+arr.map(x=>`<tr><td>${x.DNI}</td><td>${x.Nombres}</td><td>${x.Cargo}</td><td>${x.Empresa}</td><td>${x.Celular||''}</td><td>${x.Estado}</td><td><button onclick='editTrab(${JSON.stringify(x).replace(/'/g,"&#39;")})'>Editar</button></td></tr>`).join('')+'</table>'}catch(e){toast(e.message)}}
function editTrab(x){if(!confirm(`Está editando los datos de:\n\nTrabajador: ${x.Nombres}\nDNI: ${x.DNI}\nEmpresa: ${x.Empresa}\n\n¿Desea continuar?`))return;tdni.value=x.DNI||'';tnom.value=x.Nombres||'';tcargo.value=x.Cargo||'';temp.value=x.Empresa||'';tsede.value=x.Sede||'';tcorreo.value=x.Correo||'';tcelular.value=x.Celular||'';test.value=x.Estado||'ACTIVO';scrollTo(0,0)}
async function initEmpresas(){await loadEmpresas();tablaEmp.innerHTML='<table class="table"><tr><th>Empresa</th><th>Correo doctor o personal de Salud</th></tr>'+empresasCache.map(e=>`<tr><td>${e.Empresa}</td><td>${e.CorreoDoctor}</td></tr>`).join('')+'</table>'}
async function guardarEmpresa(){try{if(!enombre.value.trim()||!edoctor.value.trim())return toast('Complete empresa y correo médico');await api('guardarEmpresa',{empresa:{Empresa:enombre.value.trim(),CorreoDoctor:edoctor.value.trim()}});toast('Empresa guardada');enombre.value=edoctor.value='';initEmpresas()}catch(e){toast(e.message)}}
async function initDashboard(){await loadEmpresas();fillSelect('dashEmp',true);dashFecha.value=today();loadDashboard()}
function drawCharts(r){if(chartCum)chartCum.destroy();if(chartSint)chartSint.destroy();const cumData=r.cumplimientoPorEmpresa||[];chartCum=new Chart(chartCumplimiento,{type:'bar',data:{labels:cumData.map(x=>x.Empresa),datasets:[{label:'Cumplimiento %',data:cumData.map(x=>x.Cumplimiento)}]},options:{responsive:true,scales:{y:{beginAtZero:true,max:100}},animation:{onComplete(){const ctx=this.ctx;ctx.save();ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillStyle='#0b1b33';this.data.datasets[0].data.forEach((v,i)=>{const meta=this.getDatasetMeta(0).data[i];if(meta)ctx.fillText(v+'%',meta.x,meta.y-6)});ctx.restore()}}}});const sintData=r.sintomasResumen||[];chartSint=new Chart(chartSintomas,{type:'bar',data:{labels:sintData.map(x=>x.Sintoma),datasets:[{label:'Reportes con síntoma',data:sintData.map(x=>x.Cantidad)}]},options:{indexAxis:'y',responsive:true,scales:{x:{beginAtZero:true,ticks:{precision:0}}}}})}
async function loadDashboard(){try{const modo=dashFechaModo.value;const fecha=modo==='dia'?dashFecha.value:'';const mes=modo==='mes'?dashMes.value:'';const r=await api('dashboard',{fecha,mes,empresa:dashEmp.value,condicion:dashCond.value});kpis.innerHTML=`<div class="kpi"><b>${r.totalTrabajadores}</b><br>Master activa</div><div class="kpi"><b>${r.totalReportes}</b><br>Reportes</div><div class="kpi"><b>${r.conSintomas}</b><br>Con síntomas</div><div class="kpi"><b>${r.cumplimiento}%</b><br>Cumplimiento</div>`;drawCharts(r);tablaDash.innerHTML='<table class="table"><tr><th>Fecha</th><th>DNI</th><th>Trabajador</th><th>Empresa</th><th>Celular</th><th>Condición</th></tr>'+(r.reportes||[]).map(x=>`<tr><td>${x.Fecha}</td><td>${x.DNI}</td><td>${x.Nombres}</td><td>${x.Empresa}</td><td>${x.Celular||''}</td><td>${x.Condicion}</td></tr>`).join('')+'</table>'}catch(e){toast(e.message)}}
async function initValidar(){await loadEmpresas();fillSelect('valEmp',true);valFecha.value=today()}
async function validarPermiso(){try{const dnis=(valDnis.value.match(/\d{8}/g)||[]);if(!dnis.length)return toast('Ingrese al menos un DNI válido de 8 dígitos');const r=await api('validarPermiso',{dnis,fecha:valFecha.value,empresa:valEmp.value});resValidacion.innerHTML=(r.resultado||[]).map(x=>{if(x.estado==='NO_MASTER')return `<div class="bad">❌ DNI ${x.DNI} no se encuentra en la Master</div>`;if(x.estado==='NO_REPORTO')return `<div class="warn">⚠️ Trabajador no generó reporte de síntomas: <b>${x.Nombres}</b> / DNI ${x.DNI}</div>`;if(String(x.condicion).includes('CON SÍNTOMAS'))return `<div class="bad">🚨 Trabajador <b>${x.Nombres}</b> / DNI ${x.DNI} presenta síntomas</div>`;return `<div class="ok">✅ ${x.Nombres} / DNI ${x.DNI}: trabajador no reporta síntomas para hoy</div>`}).join('')}catch(e){toast(e.message)}}
window.onload=()=>{initChecks();const v=new URL(location.href).searchParams.get('view');if(v==='trabajador')showView('trabajador');else if(v==='admin')showView('admin');else showView('home');if(document.getElementById('dashFecha'))dashFecha.value=today();if(document.getElementById('valFecha'))valFecha.value=today()}
