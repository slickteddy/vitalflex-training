'use strict';

const KEY = 'vitalflex-training-v1';
const REST_KEY = 'vitalflex-rest-seconds-v12';
const DAYS = [
  {name:'Lundi', title:'Jour 1 — Haut du corps', focus:'Force et développement musculaire', ex:[['Pompes inclinées','Poitrine · triceps',3,'8–12'],['Rowing avec bande','Dos · biceps',3,'10–15'],['Chest press avec bande','Pectoraux · triceps',2,'10–12'],['Curl biceps avec bande','Biceps',2,'10–15'],['Extension triceps avec bande','Triceps',2,'10–15'],['Dead bug','Gainage',3,'8–10 / côté']]},
  {name:'Mardi', title:'Jour 2 — Bas du corps', focus:'Jambes, fessiers et équilibre', ex:[['Squat au poids du corps','Quadriceps · fessiers',3,'12–15'],['Fentes arrière assistées','Jambes · stabilité',3,'8–10 / jambe'],['Soulevé de terre roumain avec bande','Ischios · fessiers',3,'10–12'],['Glute bridge avec bande','Fessiers',3,'12–15'],['Mollets sur une jambe','Mollets · équilibre',2,'10–15 / jambe'],['Équilibre unipodal','Proprioception',3,'20–30 s / jambe']]},
  {name:'Jeudi', title:'Jour 3 — Haut du corps', focus:'Stabilité, contrôle, épaules', ex:[['Rowing inversé incliné (prise neutre)','Dos · biceps',3,'6–10'],['Pompes au mur ou sur banc élevé','Poitrine · triceps',3,'10–15'],['Band pull-apart léger','Haut du dos',2,'12–15'],['Curl marteau avec bande','Biceps · brachial',2,'10–15'],['Rotation externe légère, coude au corps','Coiffe des rotateurs',2,'10–12 / côté'],['Bird dog','Gainage',3,'8–10 / côté']]},
  {name:'Vendredi', title:'Jour 4 — Corps complet', focus:'Force fonctionnelle et mobilité', ex:[['Step-up sur marche basse','Jambes · équilibre',3,'10 / jambe'],['Rowing unilatéral avec bande','Dos · gainage',3,'10–12 / côté'],['Pompes inclinées faciles','Poitrine · triceps',2,'8–12'],['Marche latérale avec mini-bande','Hanches · fessiers',3,'10–12 pas / côté'],['Pallof press avec bande','Gainage antirotation',3,'10 / côté'],['Mobilité hanches / chevilles / thorax','Mobilité',1,'8–10 min']]} 
];

const TYPE_OPTIONS = [
  {value:'Bande', label:'Bande'},
  {value:'kg', label:'kg'},
  {value:'lb', label:'lb'},
  {value:'PDC', label:'PDC'},
  {value:'Assistance', label:'Assistance'},
  {value:'Autre', label:'Autre'}
];
const BAND_LEVELS = ['Très légère','Légère','Moyenne','Forte','Très forte','Double bande','Autre'];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function blank(){
  return {version:1,sessions:[],weights:[],drafts:{}};
}
function validate(v){
  return !!(v && v.version === 1 && Array.isArray(v.sessions) && Array.isArray(v.weights) && v.drafts && typeof v.drafts === 'object');
}
function load(){
  try{
    const v = JSON.parse(localStorage.getItem(KEY));
    return validate(v) ? v : blank();
  }catch{
    return blank();
  }
}
function persist(){
  try{
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  }catch(err){
    alert('Sauvegarde impossible. Exporte tes données puis réessaie.');
    return false;
  }
}
function text(t){
  const span = document.createElement('span');
  span.textContent = String(t ?? '');
  return span.innerHTML;
}
function localISO(d=new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function fmtDate(iso){
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-CA',{day:'numeric',month:'short',year:'numeric'});
}
function weekStart(date){
  const d = new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const dow = (d.getDay()+6)%7;
  d.setDate(d.getDate()-dow);
  return localISO(d);
}

let state = load();
let currentDay = 0;
let restSeconds = Number(localStorage.getItem(REST_KEY)) || 90;
let restEnd = 0;
let restInterval = null;
let audioContext = null;

function ensureDraft(dayIndex){
  const exs = DAYS[dayIndex].ex;
  const draft = state.drafts[dayIndex];
  if (!draft || !Array.isArray(draft.sets) || draft.sets.length !== exs.length) {
    return {notes:'',cursor:0,sets:exs.map(ex => Array.from({length:ex[2]}, () => ({reps:'', unit:'Bande', value:'Légère', resistance:'Bande: Légère', done:false}))) };
  }
  if (!Number.isInteger(draft.cursor) || draft.cursor < 0 || draft.cursor >= exs.length) draft.cursor = 0;
  draft.notes = draft.notes || '';
  draft.sets = exs.map((ex, ei) => Array.from({length:ex[2]}, (_, si) => {
    const existing = draft.sets?.[ei]?.[si] || {};
    const unit = existing.unit || 'Bande';
    const value = existing.value ?? (unit === 'Bande' ? 'Légère' : '');
    return {
      reps: existing.reps ?? '',
      unit,
      value,
      resistance: existing.resistance || formatResistance(unit, value),
      done: !!existing.done
    };
  }));
  return draft;
}
function getDraft(){
  const d = ensureDraft(currentDay);
  state.drafts[currentDay] = d;
  return d;
}
function saveDraft(){
  const draft = getDraft();
  const newSets = DAYS[currentDay].ex.map((ex, ei) => Array.from({length:ex[2]}, (_, si) => readSet(ei, si)));
  draft.sets = newSets;
  draft.notes = $('#sessionNotes').value;
  persist();
}
function formatResistance(unit, value){
  if (unit === 'PDC') return 'PDC';
  if (unit === 'Bande') return `Bande: ${value || 'Légère'}`;
  if (unit === 'kg' || unit === 'lb') return value === '' ? unit : `${value} ${unit}`;
  if (unit === 'Assistance') return value ? `Assistance: ${value}` : 'Assistance';
  return value ? `${unit}: ${value}` : unit;
}
function readSet(ei, si){
  const repsEl = $(`[data-e="${ei}"][data-s="${si}"][data-role="reps"]`);
  const unitEl = $(`[data-e="${ei}"][data-s="${si}"][data-role="unit"]`);
  const valueEl = $(`[data-e="${ei}"][data-s="${si}"][data-role="value"]`);
  const old = getDraft().sets?.[ei]?.[si] || {};
  const unit = unitEl?.value || old.unit || 'Bande';
  const value = valueEl ? valueEl.value : (old.value ?? '');
  return {
    reps: repsEl?.value ?? '',
    unit,
    value,
    resistance: formatResistance(unit, value),
    done: !!old.done
  };
}
function completedCountForExercise(sets){
  return (sets || []).filter(s => s.done).length;
}
function totalCompletedInDraft(draft){
  return draft.sets.flat().filter(s => s.done).length;
}
function totalSetCountForDay(dayIndex){
  return DAYS[dayIndex].ex.reduce((sum, ex) => sum + ex[2], 0);
}
function latestSessionForDay(dayIndex){
  return [...state.sessions].filter(s => s.day === dayIndex).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}
function previousSessionBefore(session){
  return [...state.sessions].filter(s => s.day === session.day && s.id !== session.id && s.createdAt < session.createdAt).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0] || null;
}
function latestExerciseHistory(dayIndex, exIndex){
  const latest = latestSessionForDay(dayIndex);
  if (!latest) return null;
  return {session: latest, sets: latest.sets?.[exIndex] || []};
}
function exerciseVolume(sets){
  return (sets || []).reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
}
function sessionVolume(session){
  return (session.sets || []).flat().reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
}
function comparisonText(session){
  const prev = previousSessionBefore(session);
  if (!prev) return 'Première séance enregistrée pour ce jour.';
  const a = sessionVolume(session);
  const b = sessionVolume(prev);
  const diff = a - b;
  return `Volume déclaré : ${a} vs ${b} (${diff > 0 ? '+' : ''}${diff}). Lecture indicative seulement.`;
}
function setLabel(set){
  if (!set) return '—';
  const reps = set.reps ? `${set.reps}` : '—';
  const res = set.resistance ? ` · ${set.resistance}` : '';
  return `${reps}${res}`;
}
function exerciseSummaryText(sets, targetCount){
  const labels = Array.from({length:targetCount}, (_, i) => {
    const s = sets?.[i];
    return s && s.reps ? `S${i+1}: ${s.reps}` : `S${i+1}: à faire`;
  });
  return labels.join(' · ');
}

function artKind(name){
  const n = name.toLowerCase();
  if (/pompe/.test(n)) return 'push';
  if (/rowing|tirage|pull-apart/.test(n)) return 'pull';
  if (/squat/.test(n)) return 'squat';
  if (/fente|step-up/.test(n)) return 'lunge';
  if (/soulevé/.test(n)) return 'hinge';
  if (/bridge/.test(n)) return 'bridge';
  if (/curl/.test(n)) return 'curl';
  if (/press|extension triceps/.test(n)) return 'press';
  if (/mobilité/.test(n)) return 'mobility';
  if (/équilibre|mollet/.test(n)) return 'balance';
  if (/dead bug|bird dog|pallof/.test(n)) return 'core';
  return 'band';
}
function illustration(name){
  const kind = artKind(name);
  const pose = {
    push:'M 35 76 L 61 62 L 93 68 M 61 62 L 69 80 M 93 68 L 111 83',
    pull:'M 61 40 L 61 67 L 46 85 M 61 67 L 78 85 M 61 48 L 30 60 M 61 48 L 93 60',
    squat:'M 65 44 L 67 67 L 47 77 L 38 95 M 67 67 L 87 78 L 95 95 M 65 49 L 45 60 M 65 49 L 88 60',
    lunge:'M 61 43 L 66 68 L 91 84 L 110 84 M 66 68 L 42 79 L 36 97 M 61 49 L 42 60 M 61 49 L 84 60',
    hinge:'M 88 55 L 65 71 L 49 94 M 65 71 L 89 94 M 87 55 L 104 70 M 87 55 L 72 47',
    bridge:'M 36 90 L 52 73 L 83 73 L 102 90 M 53 73 L 62 91 M 83 73 L 89 91',
    curl:'M 64 45 L 64 80 M 64 78 L 47 96 M 64 78 L 82 96 M 64 52 L 45 69 L 49 51 M 64 52 L 82 69 L 79 51',
    press:'M 64 43 L 64 79 M 64 79 L 46 97 M 64 79 L 82 97 M 64 50 L 39 33 L 39 13 M 64 50 L 89 33 L 89 13',
    core:'M 28 81 L 56 65 L 79 79 L 105 61 M 56 65 L 46 93 M 79 79 L 90 96',
    balance:'M 64 44 L 66 73 L 59 99 M 66 73 L 91 84 M 64 52 L 42 62 M 64 52 L 87 59',
    mobility:'M 67 46 L 49 71 L 34 92 M 49 71 L 93 77 L 107 89 M 67 46 L 89 35',
    band:'M 64 43 L 64 75 L 43 95 M 64 75 L 83 95 M 64 48 L 35 65 M 64 48 L 93 65'
  }[kind];
  const head = {
    push:[23,73], pull:[61,27], squat:[65,32], lunge:[61,31], hinge:[97,46], bridge:[24,90], curl:[64,31], press:[64,29], core:[17,86], balance:[64,32], mobility:[77,38], band:[64,29]
  }[kind];
  return `<svg class="exart" viewBox="0 0 140 110" role="img" aria-label="Schéma illustratif : ${text(name)}"><rect x="1" y="1" width="138" height="108" rx="14" fill="#1a1b1f" stroke="#3b4048"/><path d="M 12 100 H 128" stroke="#4c4130" stroke-width="2"/><path d="${pose}" stroke="#f7f5ef" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="${head[0]}" cy="${head[1]}" r="9" fill="none" stroke="#f7f5ef" stroke-width="4"/><path d="M 15 20 Q 48 5 80 20" stroke="#c8a45a" stroke-width="3" fill="none" stroke-dasharray="5 5"/></svg>`;
}

function resistanceControl(set, ei, si, name){
  const currentUnit = set.unit || 'Bande';
  const currentValue = set.value ?? (currentUnit === 'Bande' ? 'Légère' : '');
  const unitOptions = TYPE_OPTIONS.map(opt => `<option value="${text(opt.value)}" ${opt.value===currentUnit?'selected':''}>${text(opt.label)}</option>`).join('');
  let detail = '';
  if (currentUnit === 'Bande') {
    detail = `<select class="input" data-e="${ei}" data-s="${si}" data-role="value" aria-label="${text(name)} série ${si+1} niveau de bande">${BAND_LEVELS.map(b => `<option value="${text(b)}" ${b===currentValue?'selected':''}>${text(b)}</option>`).join('')}</select>`;
  } else if (currentUnit === 'kg' || currentUnit === 'lb') {
    detail = `<input class="input" type="number" min="0" step="0.5" data-e="${ei}" data-s="${si}" data-role="value" value="${text(currentValue)}" placeholder="0" aria-label="Charge ${text(currentUnit)}">`;
  } else if (currentUnit === 'PDC') {
    detail = `<div class="hint">Poids du corps</div>`;
  } else {
    detail = `<input class="input" type="text" maxlength="60" data-e="${ei}" data-s="${si}" data-role="value" value="${text(currentValue)}" placeholder="Précision" aria-label="${text(name)} série ${si+1} précision">`;
  }
  return `<div class="compound resBox"><select class="input" data-e="${ei}" data-s="${si}" data-role="unit" aria-label="${text(name)} série ${si+1} type de résistance">${unitOptions}</select>${detail}</div>`;
}

function showTab(id){
  $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  ['dashboard','training','history','body','settings'].forEach(sec => { const el = document.getElementById(sec); if (el) el.hidden = sec !== id; });
  if (id === 'dashboard') renderDashboard();
  if (id === 'training') renderTraining();
  if (id === 'history') renderHistory();
  if (id === 'body') renderWeights();
  if (id === 'settings') renderSettings();
}

function renderDashboard(){
  const ws = weekStart(new Date());
  $('#totalSessions').textContent = state.sessions.length;
  $('#thisWeek').textContent = `${state.sessions.filter(s => s.date >= ws && s.date <= localISO()).length}/4`;
  const latestWeight = [...state.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];
  $('#latestWeight').textContent = latestWeight ? latestWeight.value.toFixed(1) : '—';
  $('#weekOverview').innerHTML = DAYS.map((d,i) => `<div class="row" style="padding:14px 0;border-top:1px solid var(--line)"><div><strong>${text(d.name)}</strong><div class="hint">${text(d.title)} · ${text(d.focus)}</div></div><button class="btn small secondary" data-open-day="${i}">Ouvrir</button></div>`).join('');
  $$('[data-open-day]').forEach(btn => btn.onclick = () => { currentDay = Number(btn.dataset.openDay); showTab('training'); });
}

function renderTraining(){
  const draft = getDraft();
  const day = DAYS[currentDay];
  $('#dayTabs').innerHTML = DAYS.map((d,i) => `<button class="${i===currentDay?'active':''}" data-day-index="${i}">${text(d.name)}</button>`).join('');
  $$('[data-day-index]').forEach(btn => btn.onclick = () => { saveDraft(); currentDay = Number(btn.dataset.dayIndex); stopRest(); renderTraining(); });
  $('#dayTitle').textContent = day.title;
  $('#dayFocus').textContent = day.focus;
  $('#dayTag').textContent = `${day.ex.length} exercices`;
  $('#restDuration').value = String(restSeconds);
  $('#sessionNotes').value = draft.notes || '';
  renderDayPreviousSummary();
  renderExerciseCard();
  renderRightColumn();
}

function renderDayPreviousSummary(){
  const latest = latestSessionForDay(currentDay);
  const box = $('#dayPreviousSummary');
  if (!latest) {
    box.innerHTML = `<div class="row wrap"><div><h2>Repère précédent</h2><p class="hint">Aucune séance précédente enregistrée pour ${text(DAYS[currentDay].name.toLowerCase())}.</p></div><span class="tag">Point de départ</span></div>`;
    return;
  }
  const prev = previousSessionBefore(latest);
  const volume = sessionVolume(latest);
  const previousVolume = prev ? sessionVolume(prev) : null;
  box.innerHTML = `
    <div class="row wrap">
      <div>
        <h2>Dernier ${text(DAYS[currentDay].name)}</h2>
        <p class="hint">${fmtDate(latest.date)} · ${latest.sets.flat().filter(s => s.reps !== '').length} séries saisies · volume déclaré ${volume}</p>
      </div>
      <span class="tag">${prev ? ((volume - previousVolume) > 0 ? '+' : '') + (volume - previousVolume) : 'Première référence'}</span>
    </div>
    <div class="summaryChips">
      ${DAYS[currentDay].ex.map((ex, ei) => {
        const sets = latest.sets?.[ei] || [];
        const reps = sets.filter(s => s.reps !== '').map((s, idx) => `S${idx+1} ${s.reps}`).join(' · ') || '—';
        return `<span class="summaryChip">${text(ex[0])}: ${text(reps)}</span>`;
      }).join('')}
    </div>`;
}

function renderExerciseCard(){
  const draft = getDraft();
  const exerciseIndex = draft.cursor || 0;
  const [name, muscles, setCount, target] = DAYS[currentDay].ex[exerciseIndex];
  const sets = draft.sets[exerciseIndex] || [];
  const doneCount = completedCountForExercise(sets);
  const prevData = latestExerciseHistory(currentDay, exerciseIndex);
  const prevText = prevData ? exerciseSummaryText(prevData.sets, setCount) : 'Aucune référence précédente.';
  const prevRes = prevData ? prevData.sets.filter(Boolean).map((s, i) => `S${i+1}: ${s.resistance || '—'}`).join(' · ') : '';
  const summaryChips = Array.from({length:setCount}, (_, si) => {
    const s = sets[si] || {};
    const label = s.done ? `S${si+1} · ${s.reps || '0'} ${s.unit === 'PDC' ? 'PDC' : ''}`.trim() : `S${si+1} · à faire`;
    return `<span class="summaryChip ${s.done?'done':''}">${text(label)}</span>`;
  }).join('');

  $('#exerciseCard').innerHTML = `
    <div class="exerciseTop">
      <div class="exerciseIdentity">
        ${illustration(name)}
        <div class="exerciseText">
          <div class="eyebrow">Exercice ${exerciseIndex+1} / ${DAYS[currentDay].ex.length}</div>
          <h2>${text(name)}</h2>
          <p class="hint">${text(muscles)}</p>
          <div class="exerciseMeta">
            <span class="kv">Objectif : ${text(target)}</span>
            <span class="kv">Séries : ${setCount}</span>
            <span class="kv">Complétées : ${doneCount}/${setCount}</span>
          </div>
        </div>
      </div>
      <span class="tag">${Math.round((doneCount/setCount)*100) || 0}%</span>
    </div>

    <div class="card" style="padding:14px;margin-top:14px;border-radius:18px;background:var(--surface2)">
      <strong>Dernière fois</strong>
      <p class="hint" style="margin-top:6px">${text(prevText)}</p>
      <p class="hint" style="margin-top:6px">${text(prevRes || '')}</p>
    </div>

    <div style="margin-top:14px">
      <div class="row wrap" style="margin-bottom:8px">
        <strong>Entrer mes séries</strong>
        <span class="hint">Confirme une série pour démarrer le repos</span>
      </div>
      <div class="setList">
        ${Array.from({length:setCount}, (_, si) => {
          const set = sets[si] || {};
          return `<div class="setRow ${set.done?'completed':''}" data-row="${exerciseIndex}-${si}">
            <div class="setNo">S${si+1}</div>
            <div class="compound repsBox">
              <label class="hint">Répétitions / sec</label>
              <input class="input" type="number" min="0" max="10000" step="1" data-e="${exerciseIndex}" data-s="${si}" data-role="reps" value="${text(set.reps ?? '')}" placeholder="0" aria-label="${text(name)} série ${si+1} répétitions ou secondes">
            </div>
            ${resistanceControl(set, exerciseIndex, si, name)}
            <button type="button" class="btn small ${set.done?'secondary':''} completeSet" data-ei="${exerciseIndex}" data-si="${si}">${set.done?'✓ Terminé':'✓ Confirmer'}</button>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div style="margin-top:16px">
      <div class="row wrap">
        <strong>Résumé de l’exercice</strong>
        <span class="hint">${doneCount} série(s) terminée(s) sur ${setCount}</span>
      </div>
      <div class="progress"><div style="width:${(doneCount/setCount)*100}%"></div></div>
      <div class="summaryChips">${summaryChips}</div>
    </div>

    <div class="row wrap" style="margin-top:16px">
      <button class="btn secondary" id="prevExerciseBtn" ${exerciseIndex===0?'disabled':''}>← Exercice précédent</button>
      <button class="btn ghost" id="jumpNextIncompleteBtn">Aller au prochain à faire</button>
      <button class="btn" id="nextExerciseBtn">${exerciseIndex===DAYS[currentDay].ex.length-1?'Dernier exercice':'Exercice suivant →'}</button>
    </div>
  `;

  bindExerciseInputs();
}

function renderRightColumn(){
  const draft = getDraft();
  const totalSets = totalSetCountForDay(currentDay);
  const completed = totalCompletedInDraft(draft);
  $('#sessionProgressText').textContent = `${completed} série(s) sur ${totalSets} terminée(s)`;
  $('#sessionProgressBar').style.width = `${(completed/totalSets)*100}%`;
  $('#sessionQuickStats').innerHTML = `
    <span class="summaryChip done">Repos : ${restSeconds}s</span>
    <span class="summaryChip">Jour : ${text(DAYS[currentDay].name)}</span>
    <span class="summaryChip">Objectif : ${text(DAYS[currentDay].focus)}</span>
  `;
  $('#exerciseCounter').textContent = `${(draft.cursor||0)+1} / ${DAYS[currentDay].ex.length}`;
  $('#exerciseMiniList').innerHTML = DAYS[currentDay].ex.map((ex, i) => {
    const exSets = draft.sets[i] || [];
    const done = completedCountForExercise(exSets);
    const total = ex[2];
    return `<button class="miniExercise ${i===draft.cursor?'active':''}" data-go-ex="${i}"><div style="text-align:left"><strong style="display:block">${text(ex[0])}</strong><div class="miniMeta">${done}/${total} série(s) terminée(s)</div></div><span class="tag">${i+1}</span></button>`;
  }).join('');
  $$('[data-go-ex]').forEach(btn => btn.onclick = () => { saveDraft(); getDraft().cursor = Number(btn.dataset.goEx); persist(); renderExerciseCard(); renderRightColumn(); window.scrollTo({top:0,behavior:'smooth'}); });
}

function bindExerciseInputs(){
  $$('[data-role="reps"]').forEach(el => el.addEventListener('input', () => { refreshSetStatus(el); saveDraft(); renderRightColumn(); }));
  $$('[data-role="unit"]').forEach(el => el.addEventListener('change', () => { handleUnitChange(el); }));
  $$('[data-role="value"]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { refreshSetStatus(el); saveDraft(); renderRightColumn(); }));
  $$('.completeSet').forEach(btn => btn.onclick = () => toggleComplete(Number(btn.dataset.ei), Number(btn.dataset.si)));
  $('#prevExerciseBtn').onclick = () => moveExercise(-1);
  $('#nextExerciseBtn').onclick = () => moveExercise(1);
  $('#jumpNextIncompleteBtn').onclick = jumpNextIncomplete;
}

function handleUnitChange(selectEl){
  saveDraft();
  const ei = Number(selectEl.dataset.e);
  const si = Number(selectEl.dataset.s);
  const entry = getDraft().sets[ei][si];
  entry.unit = selectEl.value;
  entry.value = selectEl.value === 'Bande' ? 'Légère' : '';
  entry.resistance = formatResistance(entry.unit, entry.value);
  entry.done = false;
  persist();
  renderExerciseCard();
  renderRightColumn();
}

function refreshSetStatus(inputEl){
  const row = inputEl.closest('.setRow');
  if (!row) return;
  const ei = Number(inputEl.dataset.e);
  const si = Number(inputEl.dataset.s);
  const entry = getDraft().sets?.[ei]?.[si];
  if (entry?.done) {
    entry.done = false;
    persist();
  }
}

function toggleComplete(ei, si){
  saveDraft();
  const entry = getDraft().sets[ei][si];
  if (!entry.done) {
    if (entry.reps === '' || !Number.isFinite(Number(entry.reps)) || Number(entry.reps) <= 0) {
      alert('Entre un nombre de répétitions ou de secondes valide avant de confirmer la série.');
      return;
    }
    if ((entry.unit === 'kg' || entry.unit === 'lb') && (entry.value === '' || !Number.isFinite(Number(entry.value)) || Number(entry.value) < 0)) {
      alert('Entre une charge valide avant de confirmer la série.');
      return;
    }
    entry.done = true;
    entry.resistance = formatResistance(entry.unit, entry.value);
    startRest();
  } else {
    entry.done = false;
  }
  persist();
  renderExerciseCard();
  renderRightColumn();
}

function moveExercise(direction){
  saveDraft();
  const draft = getDraft();
  const next = Math.max(0, Math.min(DAYS[currentDay].ex.length-1, (draft.cursor||0) + direction));
  draft.cursor = next;
  persist();
  renderExerciseCard();
  renderRightColumn();
  window.scrollTo({top:0, behavior:'smooth'});
}

function jumpNextIncomplete(){
  saveDraft();
  const draft = getDraft();
  const start = draft.cursor || 0;
  const found = draft.sets.findIndex((sets, idx) => idx > start && completedCountForExercise(sets) < sets.length);
  if (found !== -1) {
    draft.cursor = found;
  } else {
    const firstAny = draft.sets.findIndex(sets => completedCountForExercise(sets) < sets.length);
    if (firstAny !== -1) draft.cursor = firstAny;
  }
  persist();
  renderExerciseCard();
  renderRightColumn();
}

function chime(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioContext = audioContext || new Ctx();
    audioContext.resume();
    [0, .18, .36].forEach((offset, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const t = audioContext.currentTime + offset;
      osc.type = 'sine';
      osc.frequency.setValueAtTime([880, 1108, 1320][i], t);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.24, t + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, t + .25);
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(t); osc.stop(t + .27);
    });
  }catch{}
}
function updateRestDisplay(){
  const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
  $('#restPanel').hidden = !restEnd;
  $('#restTimer').textContent = `${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
  if (restEnd && left <= 0) {
    stopRest(false);
    $('#restPanel').hidden = false;
    $('#restMessage').textContent = '🔔 Repos terminé';
    $('#restTimer').textContent = 'GO';
    chime();
    if (navigator.vibrate) {
      try { navigator.vibrate([250,150,250]); } catch {}
    }
  }
}
function startRest(){
  stopRest(true);
  restEnd = Date.now() + restSeconds * 1000;
  $('#restMessage').textContent = 'Récupération en cours';
  $('#restPanel').hidden = false;
  updateRestDisplay();
  restInterval = setInterval(updateRestDisplay, 250);
}
function stopRest(hide=true){
  if (restInterval) clearInterval(restInterval);
  restInterval = null;
  restEnd = 0;
  if (hide) $('#restPanel').hidden = true;
}

function renderHistory(){
  const list = $('#historyList');
  const sessions = [...state.sessions].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  if (!sessions.length) {
    list.innerHTML = '<div class="empty">Aucune séance enregistrée pour le moment.</div>';
    return;
  }
  list.innerHTML = sessions.map(s => `
    <div class="historyItem">
      <div class="row wrap">
        <div>
          <strong>${text(DAYS[s.day]?.title || 'Séance')}</strong>
          <div class="hint">${fmtDate(s.date)} · ${s.sets.flat().filter(x => x.reps !== '').length} séries saisies</div>
        </div>
        <div class="row wrap">
          <span class="tag">${text(comparisonText(s))}</span>
          <button class="btn small secondary" data-show-session="${text(s.id)}">Détails</button>
        </div>
      </div>
      <div data-detail-session="${text(s.id)}" hidden style="margin-top:14px"></div>
    </div>
  `).join('');

  $$('[data-show-session]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.showSession;
    const session = state.sessions.find(s => s.id === id);
    const box = $(`[data-detail-session="${CSS.escape(id)}"]`);
    if (!session || !box) return;
    box.hidden = !box.hidden;
    if (!box.hidden) {
      const prev = previousSessionBefore(session);
      box.innerHTML = `
        <table>
          <tr><th>Exercice</th><th>Cette séance</th><th>Précédente</th></tr>
          ${DAYS[session.day].ex.map((ex, ei) => `<tr><td>${text(ex[0])}</td><td>${text(exerciseSummaryText(session.sets[ei], ex[2]))}</td><td>${text(prev ? exerciseSummaryText(prev.sets[ei], ex[2]) : '—')}</td></tr>`).join('')}
        </table>
        <p class="hint" style="margin-top:12px">Notes : ${text(session.notes || 'Aucune')}</p>
        <button class="btn danger small" data-delete-session="${text(session.id)}">Supprimer cette séance</button>
      `;
      box.querySelector('[data-delete-session]').onclick = () => {
        if (confirm('Supprimer définitivement cette séance ?')) {
          state.sessions = state.sessions.filter(x => x.id !== session.id);
          persist();
          renderHistory();
          renderDashboard();
        }
      };
    }
  });
}

function renderWeights(){
  const arr = [...state.weights].sort((a,b) => b.date.localeCompare(a.date));
  const box = $('#weightHistory');
  if (!arr.length) {
    box.innerHTML = '<div class="empty">Aucune pesée enregistrée.</div>';
    return;
  }
  box.innerHTML = `
    <table>
      <tr><th>Date</th><th>Poids</th><th>Évolution</th><th></th></tr>
      ${arr.map((w, i) => {
        const diff = i < arr.length-1 ? w.value - arr[i+1].value : null;
        return `<tr><td>${fmtDate(w.date)}</td><td>${w.value.toFixed(1)} lb</td><td>${diff===null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} lb`}</td><td><button class="btn small secondary" data-del-weight="${text(w.id)}">×</button></td></tr>`;
      }).join('')}
    </table>`;
  $$('[data-del-weight]').forEach(btn => btn.onclick = () => {
    if (confirm('Supprimer cette pesée ?')) {
      state.weights = state.weights.filter(w => w.id !== btn.dataset.delWeight);
      persist();
      renderWeights();
      renderDashboard();
    }
  });
}

function renderSettings(){
  $('#storageStatus').textContent = `${state.sessions.length} séance(s) et ${state.weights.length} pesée(s) enregistrées sur cet appareil.`;
}

$('#startButton').onclick = () => showTab('training');
$('#openHistoryButton').onclick = () => showTab('history');
$$('.nav button').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
$('#restDuration').addEventListener('change', (e) => {
  restSeconds = Number(e.target.value) || 90;
  localStorage.setItem(REST_KEY, String(restSeconds));
  renderRightColumn();
});
$('#restSkip').onclick = () => stopRest();
$('#sessionNotes').addEventListener('input', () => { getDraft().notes = $('#sessionNotes').value; persist(); });
$('#clearDraft').onclick = () => {
  if (!confirm('Réinitialiser cette séance non terminée ?')) return;
  delete state.drafts[currentDay];
  stopRest();
  persist();
  renderTraining();
};
$('#saveSession').onclick = () => {
  saveDraft();
  const draft = getDraft();
  const populated = draft.sets.flat().some(s => s.reps !== '' || s.done || (s.value && s.value !== ''));
  if (!populated) {
    alert('Renseigne au moins une série avant d’enregistrer la séance.');
    return;
  }
  if (!confirm('Terminer cette séance et l’ajouter à ton historique ?')) return;
  state.sessions.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    date: localISO(),
    createdAt: new Date().toISOString(),
    day: currentDay,
    sets: draft.sets,
    notes: draft.notes || ''
  });
  delete state.drafts[currentDay];
  stopRest();
  if (persist()) {
    renderDashboard();
    showTab('history');
  }
};

$('#weightDate').value = localISO();
$('#weightForm').onsubmit = (e) => {
  e.preventDefault();
  const date = $('#weightDate').value;
  const value = Number($('#weightValue').value);
  if (!/\d{4}-\d{2}-\d{2}/.test(date) || !Number.isFinite(value) || value < 40 || value > 1000) {
    alert('Vérifie la date et le poids.');
    return;
  }
  state.weights.push({id: String(Date.now()) + Math.random(), date, value});
  persist();
  $('#weightValue').value = '';
  renderWeights();
  renderDashboard();
};

$('#exportData').onclick = () => {
  const payload = {app:'VITALFLEX Training', exportedAt:new Date().toISOString(), data:state};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vitalflex-training-sauvegarde-${localISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
$('#importData').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try{
    const raw = JSON.parse(await file.text());
    if (!validate(raw.data)) throw new Error('Format non reconnu');
    if (!confirm('Importer ce fichier remplacera les données actuelles. Continuer ?')) return;
    state = raw.data;
    persist();
    renderDashboard();
    renderTraining();
    renderHistory();
    renderWeights();
    renderSettings();
    alert('Sauvegarde importée avec succès.');
  }catch(err){
    alert(`Importation impossible : ${err.message}`);
  }finally{
    e.target.value = '';
  }
};
$('#wipeData').onclick = () => {
  if (confirm('Effacer définitivement toutes les données locales ?') && confirm('Dernière confirmation : as-tu exporté une sauvegarde ?')) {
    state = blank();
    persist();
    stopRest();
    renderDashboard();
    showTab('dashboard');
  }
};

renderDashboard();
renderTraining();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
