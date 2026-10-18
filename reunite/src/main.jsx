import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import QRCode from 'qrcode'
import './styles.css'

const seedPet = {
  id: 'pet_8f4a9c2e', name: 'Milo', breed: 'Golden Retriever', species: 'Dog',
  age: '3 years', photo: '🐕', note: 'Milo is friendly but may be nervous around traffic.',
  publicPhoto: true, publicNote: true, missing: false
}

function loadPet() {
  try { return JSON.parse(localStorage.getItem('reunite-pet')) || seedPet } catch { return seedPet }
}

function App() {
  const [pet, setPet] = useState(loadPet)
  const [screen, setScreen] = useState(location.hash.startsWith('#/pet/') ? 'scan' : 'home')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { localStorage.setItem('reunite-pet', JSON.stringify(pet)) }, [pet])
  useEffect(() => {
    const onHash = () => setScreen(location.hash.startsWith('#/pet/') ? 'scan' : 'home')
    window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const publicUrl = `${location.origin}${location.pathname}#/pet/${pet.id}`
  const go = (next) => { if (next === 'scan') location.hash = `/pet/${pet.id}`; else { history.replaceState(null, '', location.pathname); setScreen(next) } }

  const update = (key, value) => { setPet(current => ({ ...current, [key]: value })); setSaved(false) }
  const saveProfile = () => { localStorage.setItem('reunite-pet', JSON.stringify(pet)); setSaved(true) }

  if (screen === 'scan') return <ScanPage pet={pet} publicUrl={publicUrl} message={message} setMessage={setMessage} sent={sent} setSent={setSent} />
  if (screen === 'edit') return <EditPage pet={pet} update={update} saveProfile={saveProfile} saved={saved} go={go} />
  return <Dashboard pet={pet} publicUrl={publicUrl} go={go} />
}

function Shell({ children, go }) {
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => go('home')}><span className="brand-mark">R</span><span>reunite</span></button><nav><button onClick={() => go('home')}>Dashboard</button><button onClick={() => go('edit')}>Pet profile</button><span className="avatar">RD</span></nav></header>{children}</div>
}

function Dashboard({ pet, publicUrl, go }) {
  return <Shell go={go}><main className="dashboard page"><div className="eyebrow">YOUR PET IDENTITY</div><div className="hero-row"><div><h1>A safer way<br /><em>home.</em></h1><p className="lead">A private digital identity for the pet you never want to lose.</p></div><div className="status-pill"><i /> Profile active</div></div>
    <section className="dashboard-grid"><article className="pet-card"><div className="pet-card-top"><div className="pet-avatar">{pet.photo}</div><div><div className="card-label">YOUR PET</div><h2>{pet.name}</h2><p>{pet.breed} · {pet.age}</p></div><button className="icon-btn" onClick={() => go('edit')} aria-label="Edit profile">↗</button></div><div className="privacy-row"><span><i className="lock">⌁</i> Private contact enabled</span><span className="online-dot">●</span></div></article>
    <QRCard publicUrl={publicUrl} />
    </section><section className="lower-grid"><div className="section-heading"><div><div className="eyebrow">A SIMPLE PROMISE</div><h3>Ready when it matters.</h3></div><button className="text-btn" onClick={() => go('edit')}>Manage profile <span>→</span></button></div><div className="steps"><Step n="01" title="Create" text="Keep the essentials in one trusted place."/><Step n="02" title="Attach" text="Print the QR or add it to any tag."/><Step n="03" title="Reconnect" text="A finder can reach you without seeing your details."/></div></section>
    <div className="demo-note"><span>DEMO MODE</span> This prototype stores data only in this browser. Production accounts, encrypted storage and real messaging still need a backend.</div></main></Shell>
}

function QRCard({ publicUrl }) {
  const [data, setData] = useState('')
  useEffect(() => { QRCode.toDataURL(publicUrl, { width: 220, margin: 1, color: { dark: '#20211f', light: '#ffffff' } }).then(setData) }, [publicUrl])
  return <article className="qr-card"><div className="card-label">YOUR REUNITE QR</div>{data ? <img className="qr" src={data} alt="QR code for the pet profile" /> : <div className="qr-placeholder">Generating…</div>}<p>Scan to view {publicUrl.includes('pet_') ? 'a safe contact page' : 'profile'}</p><div className="qr-actions"><a className="outline-btn" href={data} download="reunite-pet-qr.png">Download QR</a><button className="outline-btn" onClick={() => navigator.clipboard?.writeText(publicUrl)}>Copy link</button></div></article>
}

function Step({ n, title, text }) { return <div className="step"><span>{n}</span><div><h4>{title}</h4><p>{text}</p></div></div> }

function EditPage({ pet, update, saveProfile, saved, go }) {
  return <Shell go={go}><main className="page edit-page"><button className="back-btn" onClick={() => go('home')}>← Back to dashboard</button><div className="eyebrow">PET PROFILE</div><h1>Tell their story.</h1><p className="lead">Only the information you choose to share will appear when someone scans the QR.</p><form onSubmit={e => { e.preventDefault(); saveProfile() }}><div className="form-grid"><label>Pet name<input value={pet.name} onChange={e => update('name', e.target.value)} required /></label><label>Breed<input value={pet.breed} onChange={e => update('breed', e.target.value)} required /></label><label>Species<select value={pet.species} onChange={e => update('species', e.target.value)}><option>Dog</option><option>Cat</option><option>Other</option></select></label><label>Age<input value={pet.age} onChange={e => update('age', e.target.value)} /></label></div><label>Safety note<textarea value={pet.note} onChange={e => update('note', e.target.value)} placeholder="Anything a finder should know?" /></label><div className="visibility"><div><h3>Public profile</h3><p>These settings control what a finder can see.</p></div><label className="switch-row"><input type="checkbox" checked={pet.publicPhoto} onChange={e => update('publicPhoto', e.target.checked)} /><span>Pet photo</span></label><label className="switch-row"><input type="checkbox" checked={pet.publicNote} onChange={e => update('publicNote', e.target.checked)} /><span>Safety note</span></label></div><div className="form-footer"><span className="private-handle">Owner handle: <strong>@rishabh_reunite</strong> <small>public</small></span><button className="primary-btn" type="submit">{saved ? 'Saved ✓' : 'Save profile'}</button></div></form></main></Shell>
}

function ScanPage({ pet, message, setMessage, sent, setSent }) {
  return <div className="scan-page"><div className="scan-brand"><span className="brand-mark">R</span> reunite</div><main className="scan-main"><div className="scan-eyebrow"><span className="scan-dot" /> You found a pet profile</div><div className="scan-pet-avatar">{pet.photo}</div><h1>Meet {pet.name}.</h1><p className="scan-sub">{pet.publicPhoto ? `${pet.breed} · ${pet.age}` : 'A pet who may need a little help getting home.'}</p>{pet.publicNote && <div className="safety-note"><span>✦</span><div><strong>A note from their family</strong><p>{pet.note}</p></div></div>}<div className="owner-card"><div className="owner-initial">R</div><div><div className="card-label">THEIR PERSON</div><strong>@rishabh_reunite</strong><p>Contact is private and secure</p></div></div>{sent ? <div className="sent-state"><span>✓</span><div><strong>Message sent safely</strong><p>Their person will receive it in their Reunite inbox.</p></div></div> : <div className="message-box"><label htmlFor="message">Send a private message</label><textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Where did you find them?" /><button className="primary-btn wide" disabled={!message.trim()} onClick={() => setSent(true)}>Contact owner privately <span>→</span></button><small>Your email and phone number stay hidden.</small></div>}<p className="scan-foot">Powered by <strong>reunite</strong> · privacy first</p></main></div>
}

createRoot(document.getElementById('root')).render(<App />)
