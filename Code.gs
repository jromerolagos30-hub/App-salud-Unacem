const SPREADSHEET_ID = '1_iaQ5gpJpYxVKAz2hmYmiVij6JirzgLH9bwdjfKPmvs';
const SHEET_TRAB = 'Trabajadores';
const SHEET_REP = 'Reportes';

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    setup_();
    let res;
    if(body.action === 'buscarTrabajador') res = buscarTrabajador_(body.dni);
    else if(body.action === 'guardarTrabajador') res = guardarTrabajador_(body.trabajador);
    else if(body.action === 'cargaMasiva') res = cargaMasiva_(body.trabajadores || []);
    else if(body.action === 'guardarReporte') res = guardarReporte_(body.reporte);
    else if(body.action === 'dashboard') res = dashboard_(body.fecha, body.empresa);
    else throw new Error('Acción no válida');
    return json_({ok:true, ...res});
  }catch(err){ return json_({ok:false, error:String(err.message || err)}); }
}
function doGet(){ setup_(); return json_({ok:true, message:'API Salud UNACEM activa'}); }
function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sheet_(name){ return ss_().getSheetByName(name) || ss_().insertSheet(name); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function setup_(){
  const t=sheet_(SHEET_TRAB); if(t.getLastRow()<1) t.appendRow(['DNI','Nombres','Cargo','Empresa','Sede','Rubro','Correo','Estado','FechaRegistro']);
  const r=sheet_(SHEET_REP); if(r.getLastRow()<1) r.appendRow(['Fecha','DNI','Nombres','Cargo','Empresa','Sede','Rubro','Correo','Condicion','ActividadesJSON','SintomasJSON','Observacion','FirmaBase64']);
}
function rows_(sh){ const v=sh.getDataRange().getValues(); const h=v.shift(); return v.filter(x=>x.join('')!=='').map(row=>Object.fromEntries(h.map((k,i)=>[k,row[i]]))); }
function buscarTrabajador_(dni){
  const d=String(dni||'').trim();
  const found=rows_(sheet_(SHEET_TRAB)).find(r=>String(r.DNI).trim()===d && String(r.Estado||'ACTIVO').toUpperCase()!=='INACTIVO');
  return {trabajador: found || null};
}
function guardarTrabajador_(t){
  if(!t || !t.DNI) throw new Error('DNI obligatorio');
  const sh=sheet_(SHEET_TRAB), data=sh.getDataRange().getValues();
  const dni=String(t.DNI).trim(); let row=-1;
  for(let i=1;i<data.length;i++) if(String(data[i][0]).trim()===dni){ row=i+1; break; }
  const values=[dni,t.Nombres||'',t.Cargo||'',t.Empresa||'',t.Sede||'',t.Rubro||'',t.Correo||'',t.Estado||'ACTIVO',new Date()];
  if(row>0) sh.getRange(row,1,1,values.length).setValues([values]); else sh.appendRow(values);
  return {saved:true};
}
function cargaMasiva_(arr){ arr.forEach(guardarTrabajador_); return {count:arr.length}; }
function guardarReporte_(r){
  if(!r || !r.DNI) throw new Error('Reporte sin DNI');
  sheet_(SHEET_REP).appendRow([new Date(),r.DNI,r.Nombres||'',r.Cargo||'',r.Empresa||'',r.Sede||'',r.Rubro||'',r.Correo||'',r.Condicion||'',JSON.stringify(r.Actividades||{}),JSON.stringify(r.Sintomas||{}),r.Observacion||'',r.Firma||'']);
  return {saved:true};
}
function dashboard_(fecha, empresa){
  const trabajadores=rows_(sheet_(SHEET_TRAB)).filter(t=>String(t.Estado||'ACTIVO').toUpperCase()!=='INACTIVO' && (!empresa || String(t.Empresa).toLowerCase().includes(String(empresa).toLowerCase())));
  let reportes=rows_(sheet_(SHEET_REP));
  if(empresa) reportes=reportes.filter(r=>String(r.Empresa).toLowerCase().includes(String(empresa).toLowerCase()));
  if(fecha){
    const target=Utilities.formatDate(new Date(fecha+'T00:00:00'), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    reportes=reportes.filter(r=>Utilities.formatDate(new Date(r.Fecha), Session.getScriptTimeZone(), 'yyyy-MM-dd')===target);
  }
  const conSintomas=reportes.filter(r=>String(r.Condicion).includes('SÍNTOMAS') || String(r.Condicion).includes('ALERTA')).length;
  const cumplimiento=trabajadores.length ? Math.round((new Set(reportes.map(r=>String(r.DNI))).size / trabajadores.length)*100) : 0;
  reportes=reportes.map(r=>({...r, Fecha: Utilities.formatDate(new Date(r.Fecha), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')})).reverse();
  return {totalTrabajadores:trabajadores.length,totalReportes:reportes.length,conSintomas,cumplimiento,reportes};
}
