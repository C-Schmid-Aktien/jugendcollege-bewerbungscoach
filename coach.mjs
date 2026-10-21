// Server-side OpenAI integration. NEVER place the secret key in public/index.html.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export default async (request)=>{
 if(request.method!=='POST')return json({error:'Nur POST erlaubt.'},405);
 const key=process.env.OPENAI_API_KEY;
 if(!key)return json({error:'Die KI-Anbindung ist noch nicht aktiviert. Bitte den Betreiber kontaktieren.'},503);
 let data;try{data=await request.json()}catch{return json({error:'Ungültige Eingabe.'},400)}
 if(JSON.stringify(data).length>40000)return json({error:'Eingabe zu lang.'},413);
 if(!['letter','feedback'].includes(data.mode))return json({error:'Unbekannter Modus.'},400);
 const rules='Du bist ein sorgfältiger, freundlicher Bewerbungscoach für Jugendliche in Österreich. Schreibe auf Deutsch (B1/B2), einfach, individuell, respektvoll. Keine erfundenen Daten, Qualifikationen oder Erfahrungen. Migrationshintergrund nicht automatisch thematisieren. Keine erfundenen Firmendetails. Vermeide Standardfloskeln. Weise bei fehlenden relevanten Informationen auf die Lücke hin. Verwende keine personenbezogenen Daten in Beispielen. Gib ausschließlich gültiges JSON in der verlangten Form aus.';
 const user=data.mode==='letter'?`Erstelle ein Bewerbungsanschreiben von maximal 300 Wörtern und eine kurze E-Mail. Falls Angaben fehlen, nutze neutrale Platzhalter wie [Name] oder [Ansprechperson], nie erfundene Behauptungen. Antworte als JSON {"letter":"...","email":"..."}. Angaben nach sieben Fragen: ${JSON.stringify(data.answers||[])}`:`Gib genau fünf konkrete, freundliche, umsetzbare Tipps auf Deutsch als einen nummerierten Text. Kein unnötiges Lob. Antworte als JSON {"feedback":"..."}. Ergebnis: ${JSON.stringify({role:data.role,job:data.job,company:data.company,total:data.total,sections:data.sections,missing:data.missing})}`;
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),28000);
  let response;try{response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.6,response_format:{type:'json_object'},messages:[{role:'system',content:rules},{role:'user',content:user}]})})}finally{clearTimeout(timeout)}
  if(!response.ok)return json({error:'Der KI-Dienst ist momentan nicht erreichbar. Bitte später erneut versuchen.'},502);
  const out=await response.json();const parsed=JSON.parse(out.choices?.[0]?.message?.content||'{}');
  if(data.mode==='letter'&&typeof parsed.letter==='string'&&typeof parsed.email==='string')return json({letter:parsed.letter,email:parsed.email});
  if(data.mode==='feedback'&&typeof parsed.feedback==='string')return json({feedback:parsed.feedback});
  return json({error:'Die KI-Antwort hatte nicht das erwartete Format.'},502);
 }catch{return json({error:'Die Anfrage konnte nicht abgeschlossen werden.'},502)}
};
