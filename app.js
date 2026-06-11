const ACTIVIDADES=['Trabajos en Altura','Trabajos en Caliente','Trabajos en Espacio Confinado','Trabajos en Izaje mecánico de cargas','Trabajos de Excavación o Demolición'];
const SINTOMAS=['Dolor de cabeza','Mareos o sensación de inestabilidad','Visión borrosa o doble','Náuseas o vómitos','Falta de aire / dificultad para respirar','Dolor en el pecho','Palpitaciones o taquicardia','Fiebre o escalofríos','Fatiga o somnolencia','Pérdida de equilibrio','Zumbido/dolor de oídos','Sensación de desmayo','Consumo de alcohol o drogas'];

const MODO = new URL(location.href).searchParams.get('view');
let trabajadorActual=null, empresasCache=[];

function today(){return new Date().toISOString().slice(0,10)}

function showView(id){
  if(MODO === 'trabajador' && id !== 'trabajador'){
    id = 'trabajador';
  }

  document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));

  const target = document.getElementById(id);
  if(target) target.classList.remove('hidden');

  if(MODO === 'trabajador'){
    document.querySelectorAll('#trabajador a').forEach(a=>a.style.display='none');
    const home = document.getElementById('home');
    const admin = document.getElementById('admin');
    if(home) home.remove();
    if(admin) admin.remove();
  }
}

function toast(m){
  const t=document.getElementById('toast');
  t.textContent=m;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'),3500);
}

async function api(action,data={}){
  if(!API_URL)throw new Error('Falta API_URL');
  const r=await fetch(API_URL,{method:'POST',body:JSON.stringify({action,...data})});
  const j=await r.json();
  if(!j.ok)throw new Error(j.error||'Operación no válida');
  return j;
}

function dniOk(v){return /^\d{8}$/.test(String(v||'').trim())}

async function loadEmpresas(){
  const r=await api('listarEmpresas');
  empresasCache=r.empresas||[];
  return empresasCache;
}

function fillSelect(id,all=false){
  const s=document.getElementById(id);
  if(!s) return;
  s.innerHTML=all?'<option value="">Todas las empresas</option>':'';
  empresasCache.forEach(e=>s.innerHTML+=`<option>${e.Empresa}</option>`);
}

function initChecks(){
  const actsEl=document.getElementById('acts');
  const sintsEl=document.getElementById('sints');

  if(actsEl){
    actsEl.innerHTML=ACTIVIDADES.map(a=>`<div class="check"><span>${a}</span><select data-act="${a}" required><option value="">Seleccione</option><option>SI</option><option>NO</option></select></div>`).join('');
  }

  if(sintsEl){
    sintsEl.innerHTML=SINTOMAS.map(a=>`<div class="check"><span>${a}</span><select data-sint="${a}" required><option value="">Seleccione</option><option>SI</option><option>NO</option></select></div>`).join('');
  }
}

async function buscarTrabajador(){
  try{
    const d=dniBuscar.value.trim();
    if(!dniOk(d))return toast('DNI debe tener 8 dígitos');

    const r=await api('buscarTrabajador',{dni:d});

    if(!r.trabajador){
      datosTrab.classList.remove('hidden');
      datosTrab.innerHTML='<b>DNI no se encuentra activo en la master.</b>';
      formReporte.classList.add('hidden');
      return;
    }

    trabajadorActual=r.trabajador;
    datosTrab.classList.remove('hidden');
    datosTrab.innerHTML=`<b>${r.trabajador.Nombres}</b><br>${r.trabajador.Cargo} · ${r.trabajador.Empresa} · ${r.trabajador.Sede}`;
    formReporte.classList.remove('hidden');
  }catch(e){toast(e.message)}
}

formReporte.onsubmit=async ev=>{
  ev.preventDefault();
  try{
    if(!trabajadorActual)return toast('Busque primero al trabajador');

    let Actividades={},Sintomas={},missing=false;

    document.querySelectorAll('[data-act]').forEach(x=>{
      if(!x.value)missing=true;
      Actividades[x.dataset.act]=x.value;
    });

    document.querySelectorAll('[data-sint]').forEach(x=>{
      if(!x.value)missing=true;
      Sintomas[x.dataset.sint]=x.value;
    });

    if(missing||!obs.value.trim())return toast('Todos los campos son obligatorios');

    const con=Object.values(Sintomas).some(v=>v==='SI');

    const reporte={
      ...trabajadorActual,
      DNI:String(trabajadorActual.DNI),
      Actividades,
      Sintomas,
      Observacion:obs.value.trim(),
      Condicion:con?'CON SÍNTOMAS':'SIN SÍNTOMAS'
    };

    await api('guardarReporte',{reporte});
    toast('Reporte registrado y PDF enviado al correo');

    formReporte.reset();
    formReporte.classList.add('hidden');
    datosTrab.classList.add('hidden');
    dniBuscar.value='';
    trabajadorActual=null;
  }catch(e){toast(e.message)}
}

async function initEmpresa(){
  await loadEmpresas();
  fillSelect('temp');
  fillSelect('fempGestion',true);
  listarTrabajadores();
}

async function guardarTrabajador(){
  try{
    const t={
      DNI:tdni.value.trim(),
      Nombres:tnom.value.trim(),
      Cargo:tcargo.value.trim(),
      Empresa:temp.value,
      Sede:tsede.value.trim(),
      Rubro:trubro.value.trim(),
      Correo:tcorreo.value.trim(),
      Estado:test.value
    };

    if(!dniOk(t.DNI))return toast('DNI debe tener 8 dígitos');
    if(Object.values(t).some(v=>!v))return toast('Todos los campos son obligatorios');

    await api('guardarTrabajador',{trabajador:t});
    toast('Trabajador guardado');
    listarTrabajadores();
  }catch(e){toast(e.message)}
}

async function listarTrabajadores(){
  try{
    const r=await api('listarTrabajadores',{empresa:fempGestion.value});
    const arr=r.trabajadores||[];

    tablaTrab.innerHTML='<table class="table"><tr><th>DNI</th><th>Nombres</th><th>Cargo</th><th>Empresa</th><th>Estado</th><th>Acción</th></tr>'+
    arr.map(x=>`<tr><td>${x.DNI}</td><td>${x.Nombres}</td><td>${x.Cargo}</td><td>${x.Empresa}</td><td>${x.Estado}</td><td><button onclick='editTrab(${JSON.stringify(x)})'>Editar</button> <button class="danger" onclick="eliminarTrabajador('${x.DNI}')">Eliminar</button></td></tr>`).join('')+
    '</table>';
  }catch(e){toast(e.message)}
}

function editTrab(x){
  tdni.value=x.DNI;
  tnom.value=x.Nombres;
  tcargo.value=x.Cargo;
  temp.value=x.Empresa;
  tsede.value=x.Sede;
  trubro.value=x.Rubro;
  tcorreo.value=x.Correo;
  test.value=x.Estado;
  scrollTo(0,0);
}

async function eliminarTrabajador(dni){
  if(confirm('¿Eliminar trabajador?')){
    await api('eliminarTrabajador',{dni});
    toast('Eliminado');
    listarTrabajadores();
  }
}

async function initEmpresas(){
  await loadEmpresas();
  tablaEmp.innerHTML='<table class="table"><tr><th>Empresa</th><th>Correo doctor</th></tr>'+
  empresasCache.map(e=>`<tr><td>${e.Empresa}</td><td>${e.CorreoDoctor}</td></tr>`).join('')+
  '</table>';
}

async function guardarEmpresa(){
  try{
    if(!enombre.value.trim()||!edoctor.value.trim())return toast('Complete empresa y correo médico');

    await api('guardarEmpresa',{empresa:{Empresa:enombre.value.trim(),CorreoDoctor:edoctor.value.trim()}});
    toast('Empresa guardada');
    enombre.value=edoctor.value='';
    initEmpresas();
  }catch(e){toast(e.message)}
}

async function initDashboard(){
  await loadEmpresas();
  fillSelect('dashEmp',true);
  dashFecha.value=today();
  loadDashboard();
}

async function loadDashboard(){
  try{
    if(!dashFecha.value)dashFecha.value=today();
    if(dashFechaModo.value==='hoy')dashFecha.value=today();

    const fecha=dashFechaModo.value==='todos'?'':dashFecha.value;
    const r=await api('dashboard',{fecha,empresa:dashEmp.value,condicion:dashCond.value});

    kpis.innerHTML=`<div class="kpi"><b>${r.totalTrabajadores}</b><br>Master activa</div><div class="kpi"><b>${r.totalReportes}</b><br>Reportes</div><div class="kpi"><b>${r.conSintomas}</b><br>Con síntomas</div><div class="kpi"><b>${r.cumplimiento}%</b><br>Cumplimiento</div>`;

    tablaDash.innerHTML='<table class="table"><tr><th>Fecha</th><th>DNI</th><th>Trabajador</th><th>Empresa</th><th>Condición</th></tr>'+
    (r.reportes||[]).map(x=>`<tr><td>${x.Fecha}</td><td>${x.DNI}</td><td>${x.Nombres}</td><td>${x.Empresa}</td><td>${x.Condicion}</td></tr>`).join('')+
    '</table>';
  }catch(e){toast(e.message)}
}

async function initValidar(){
  await loadEmpresas();
  fillSelect('valEmp',true);
  valFecha.value=today();
}

async function validarPermiso(){
  try{
    const dnis=(valDnis.value.match(/\d{8}/g)||[]);
    if(!dnis.length)return toast('Ingrese al menos un DNI válido de 8 dígitos');

    const r=await api('validarPermiso',{dnis,fecha:valFecha.value,empresa:valEmp.value});

    resValidacion.innerHTML=(r.resultado||[]).map(x=>{
      if(x.estado==='NO_MASTER')return `<div class="bad">❌ DNI ${x.DNI} no se encuentra en la Master</div>`;
      if(x.estado==='NO_REPORTO')return `<div class="warn">⚠️ Trabajador no generó reporte de síntomas: <b>${x.Nombres}</b> / DNI ${x.DNI}</div>`;
      if(String(x.condicion).includes('CON SÍNTOMAS'))return `<div class="bad">🚨 Trabajador <b>${x.Nombres}</b> / DNI ${x.DNI} presenta síntomas</div>`;
      return `<div class="ok">✅ ${x.Nombres} / DNI ${x.DNI}: trabajador no reporta síntomas para hoy</div>`;
    }).join('');
  }catch(e){toast(e.message)}
}

window.onload=()=>{
  initChecks();

  if(MODO === 'trabajador'){
    showView('trabajador');
  } 
  else if(MODO === 'admin'){
    showView('admin');
  } 
  else {
    showView('home');
  }

  if(document.getElementById('dashFecha')) dashFecha.value=today();
  if(document.getElementById('valFecha')) valFecha.value=today();
}