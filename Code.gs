const SPREADSHEET_ID = '1_iaQ5gpJpYxVKAz2hmYmiVij6JirzgLH9bwdjfKPmvs';
const SHEET_TRAB = 'Trabajadores';
const SHEET_REP = 'Reportes';
const SHEET_EMP = 'Empresas';
const DOCTORA_UNACEM = 'lizette.cersso@unacem.pe';

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    setup_();
    let res;
    if(body.action === 'buscarTrabajador') res = buscarTrabajador_(body.dni);
    else if(body.action === 'guardarTrabajador') res = guardarTrabajador_(body.trabajador);
    else if(body.action === 'listarTrabajadores') res = listarTrabajadores_(body.empresa);
    else if(body.action === 'eliminarTrabajador') res = eliminarTrabajador_(body.dni);
    else if(body.action === 'guardarEmpresa') res = guardarEmpresa_(body.empresa);
    else if(body.action === 'listarEmpresas') res = listarEmpresas_();
    else if(body.action === 'guardarReporte') res = guardarReporte_(body.reporte);
    else if(body.action === 'dashboard') res = dashboard_(body.fecha, body.empresa, body.condicion);
    else if(body.action === 'validarPermiso') res = validarPermiso_(body.dnis || [], body.fecha, body.empresa);
    else throw new Error('Acción no válida');
    return json_({ok:true, ...res});
  }catch(err){ return json_({ok:false, error:String(err.message || err)}); }
}
function doGet(){ setup_(); return json_({ok:true, message:'API Salud UNACEM V4 activa'}); }
function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sheet_(name){ return ss_().getSheetByName(name) || ss_().insertSheet(name); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function setup_(){
  const t=sheet_(SHEET_TRAB); if(t.getLastRow()<1) t.appendRow(['DNI','Nombres','Cargo','Empresa','Sede','Rubro','Correo','Estado','FechaRegistro']);
  const r=sheet_(SHEET_REP); if(r.getLastRow()<1) r.appendRow(['Fecha','DNI','Nombres','Cargo','Empresa','Sede','Rubro','Correo','Condicion','ActividadesJSON','SintomasJSON','ComentarioAdicional','PDF_URL']);
  const e=sheet_(SHEET_EMP); if(e.getLastRow()<1) e.appendRow(['Empresa','CorreoDoctor']);
}
function rows_(sh){ const v=sh.getDataRange().getValues(); if(v.length<2)return []; const h=v.shift(); return v.filter(x=>x.join('')!=='').map(row=>Object.fromEntries(h.map((k,i)=>[k,row[i]]))); }
function buscarTrabajador_(dni){ const d=String(dni||'').trim(); const found=rows_(sheet_(SHEET_TRAB)).find(r=>String(r.DNI).trim()===d && String(r.Estado||'ACTIVO').toUpperCase()!=='INACTIVO'); return {trabajador: found || null}; }
function listarEmpresas_(){ return {empresas: rows_(sheet_(SHEET_EMP)).filter(e=>e.Empresa)}; }
function guardarEmpresa_(e){ if(!e||!e.Empresa||!e.CorreoDoctor) throw new Error('Empresa y correo doctor obligatorios'); const sh=sheet_(SHEET_EMP), data=sh.getDataRange().getValues(); let row=-1; for(let i=1;i<data.length;i++) if(String(data[i][0]).trim().toLowerCase()===String(e.Empresa).trim().toLowerCase()){row=i+1;break;} const values=[String(e.Empresa).trim(),String(e.CorreoDoctor).trim()]; if(row>0) sh.getRange(row,1,1,2).setValues([values]); else sh.appendRow(values); return {saved:true}; }
function guardarTrabajador_(t){
  if(!t || !/^\d{8}$/.test(String(t.DNI||'').trim())) throw new Error('DNI debe tener 8 dígitos');
  ['Nombres','Cargo','Empresa','Sede','Rubro','Correo','Estado'].forEach(k=>{ if(!String(t[k]||'').trim()) throw new Error('Campos obligatorios incompletos'); });
  const sh=sheet_(SHEET_TRAB), data=sh.getDataRange().getValues(); const dni=String(t.DNI).trim(); let row=-1;
  for(let i=1;i<data.length;i++) if(String(data[i][0]).trim()===dni){ row=i+1; break; }
  const values=[dni,t.Nombres,t.Cargo,t.Empresa,t.Sede,t.Rubro,t.Correo,t.Estado,new Date()];
  if(row>0) sh.getRange(row,1,1,values.length).setValues([values]); else sh.appendRow(values);
  return {saved:true};
}
function listarTrabajadores_(empresa){ let arr=rows_(sheet_(SHEET_TRAB)); if(empresa) arr=arr.filter(t=>String(t.Empresa).toLowerCase().includes(String(empresa).toLowerCase())); return {trabajadores:arr}; }
function eliminarTrabajador_(dni){ const sh=sheet_(SHEET_TRAB), data=sh.getDataRange().getValues(); for(let i=1;i<data.length;i++){ if(String(data[i][0]).trim()===String(dni).trim()){ sh.deleteRow(i+1); return {deleted:true}; }} return {deleted:false}; }
function guardarReporte_(r){
  if(!r || !/^\d{8}$/.test(String(r.DNI||'').trim())) throw new Error('Reporte sin DNI válido');
  if(!r.Observacion) throw new Error('Comentario Adicional obligatorio');
  const pdfUrl = crearPdfReporte_(r);
  sheet_(SHEET_REP).appendRow([new Date(),r.DNI,r.Nombres||'',r.Cargo||'',r.Empresa||'',r.Sede||'',r.Rubro||'',r.Correo||'',r.Condicion||'',JSON.stringify(r.Actividades||{}),JSON.stringify(r.Sintomas||{}),r.Observacion||'',pdfUrl]);
  enviarCorreos_(r, pdfUrl);
  return {saved:true, pdfUrl};
}
function crearPdfReporte_(r){
  const html = `<h2>Registro de Síntomas</h2><p><b>Fecha:</b> ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}</p><p><b>Trabajador:</b> ${r.Nombres}</p><p><b>DNI:</b> ${r.DNI}</p><p><b>Empresa:</b> ${r.Empresa}</p><p><b>Cargo:</b> ${r.Cargo}</p><p><b>Condición:</b> ${r.Condicion}</p><h3>Actividades</h3><pre>${JSON.stringify(r.Actividades||{},null,2)}</pre><h3>Síntomas</h3><pre>${JSON.stringify(r.Sintomas||{},null,2)}</pre><p><b>Comentario Adicional:</b> ${r.Observacion||''}</p>`;
  const blob = Utilities.newBlob(html, 'text/html', 'reporte.html').getAs('application/pdf').setName(`Registro-Sintomas-${r.DNI}-${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd')}.pdf`);
  const file = DriveApp.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return file.getUrl();
}
function enviarCorreos_(r, pdfUrl){
  const subject = 'Registro de Sintomas ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const body = `Se generó el registro de síntomas de ${r.Nombres} / DNI ${r.DNI}.\nCondición: ${r.Condicion}\nPDF: ${pdfUrl}`;
  const emails=[]; if(r.Correo) emails.push(r.Correo);
  if(String(r.Condicion).includes('SÍNTOMAS')){ const emp=rows_(sheet_(SHEET_EMP)).find(e=>String(e.Empresa).toLowerCase()===String(r.Empresa).toLowerCase()); if(emp&&emp.CorreoDoctor) emails.push(emp.CorreoDoctor); emails.push(DOCTORA_UNACEM); }
  [...new Set(emails.filter(Boolean))].forEach(to=>MailApp.sendEmail(to, subject, body));
}
function dashboard_(fecha, empresa, condicion){
  const trabajadores=rows_(sheet_(SHEET_TRAB)).filter(t=>String(t.Estado||'ACTIVO').toUpperCase()!=='INACTIVO' && (!empresa || String(t.Empresa).toLowerCase().includes(String(empresa).toLowerCase())));
  let reportes=rows_(sheet_(SHEET_REP)); if(empresa) reportes=reportes.filter(r=>String(r.Empresa).toLowerCase().includes(String(empresa).toLowerCase())); if(condicion) reportes=reportes.filter(r=>String(r.Condicion).toUpperCase().includes(String(condicion).toUpperCase()));
  if(fecha){ const target=Utilities.formatDate(new Date(fecha+'T00:00:00'), Session.getScriptTimeZone(), 'yyyy-MM-dd'); reportes=reportes.filter(r=>Utilities.formatDate(new Date(r.Fecha), Session.getScriptTimeZone(), 'yyyy-MM-dd')===target); }
  const conSintomas=reportes.filter(r=>String(r.Condicion).includes('SÍNTOMAS') || String(r.Condicion).includes('ALERTA')).length; const cumplimiento=trabajadores.length ? Math.round((new Set(reportes.map(r=>String(r.DNI))).size / trabajadores.length)*100) : 0;
  reportes=reportes.map(r=>({...r, Fecha: Utilities.formatDate(new Date(r.Fecha), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')})).reverse(); return {totalTrabajadores:trabajadores.length,totalReportes:reportes.length,conSintomas,cumplimiento,reportes};
}
function validarPermiso_(dnis, fecha, empresa){
  if(!dnis || !dnis.length) throw new Error('No hay DNI para validar'); const target=Utilities.formatDate(new Date(fecha+'T00:00:00'), Session.getScriptTimeZone(), 'yyyy-MM-dd'); const trabajadores=rows_(sheet_(SHEET_TRAB)); let reportes=rows_(sheet_(SHEET_REP)).filter(r=>Utilities.formatDate(new Date(r.Fecha), Session.getScriptTimeZone(), 'yyyy-MM-dd')===target); if(empresa) reportes=reportes.filter(r=>String(r.Empresa).toLowerCase().includes(String(empresa).toLowerCase()));
  const resultado=dnis.map(d=>{const dni=String(d).trim(); const t=trabajadores.find(x=>String(x.DNI).trim()===dni); if(!t) return {DNI:dni,estado:'NO_MASTER'}; const rep=reportes.find(x=>String(x.DNI).trim()===dni); if(!rep) return {DNI:dni,Nombres:t.Nombres,Empresa:t.Empresa,estado:'NO_REPORTO'}; return {DNI:dni,Nombres:t.Nombres,Empresa:t.Empresa,estado:'REPORTO',condicion:rep.Condicion};}); return {resultado};
}
