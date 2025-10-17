async function adminSetup(){
  const opts = await fetch('/admin/setup/options').then(r=>r.json());
  opts.challenge = base64ToBuf(opts.challenge);
  if (opts.user) opts.user.id = new TextEncoder().encode(String(opts.user.id));
  if (opts.excludeCredentials) opts.excludeCredentials = opts.excludeCredentials.map(c=>({ ...c, id: base64ToBuf(c.id) }));

  const cred = await navigator.credentials.create({ publicKey: opts });
  const att = await fetch('/admin/setup/verify',{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(credentialToJSON(cred))
  }).then(r=>r.json());
  alert(att.verified ? 'Admin passkey enrolled' : 'Enrollment failed');
}

async function adminLogin(){
  const opts = await fetch('/admin/login/options').then(r=>r.json());
  opts.challenge = base64ToBuf(opts.challenge);
  if (opts.allowCredentials) opts.allowCredentials = opts.allowCredentials.map(c=>({ ...c, id: base64ToBuf(c.id) }));

  const assertion = await navigator.credentials.get({ publicKey: opts });
  const res = await fetch('/admin/login/verify',{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(credentialToJSON(assertion))
  }).then(r=>r.json());
  if(res.verified){ window.location.href = '/dashboard'; } else { alert('Failed'); }
}

function base64ToBuf(b64){ return Uint8Array.from(atob(b64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)); }
function bufToBase64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function credentialToJSON(cred){
  const clientDataJSON = bufToBase64(cred.response.clientDataJSON);
  if (cred.response.attestationObject){
    return { id: cred.id, rawId: bufToBase64(cred.rawId), type: cred.type, response: { clientDataJSON, attestationObject: bufToBase64(cred.response.attestationObject) } };
  } else {
    return { id: cred.id, rawId: bufToBase64(cred.rawId), type: cred.type, response: { clientDataJSON, authenticatorData: bufToBase64(cred.response.authenticatorData), signature: bufToBase64(cred.response.signature), userHandle: cred.response.userHandle ? bufToBase64(cred.response.userHandle) : null } };
  }
}
