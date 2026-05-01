// 공통 유틸리티
export const _storage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  remove: (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } },
};

export const SK = {
  // 마스터
  inspectors: 'master_inspectors_v1',  // 등록된 검수원 목록
  activeInspector: 'master_active_inspector_v1',  // 현재 활성 검수원
  // 양하
  dischargeVoyages: 'discharge_voyages_v1',
  dischargeActive: 'discharge_active_v1',
  dischargeCompleted: 'discharge_completed_v1',
  dischargeXray: 'discharge_xray_v1',
  dischargeXraySeals: 'discharge_xray_seals_v1',
  // 선적
  loadingVoyages: 'loading_voyages_v1',
  loadingActive: 'loading_active_v1',
  loadingCompleted: 'loading_completed_v1',
};

// === Helpers ===
export const fmtPos = (c) => `${c.bay}-${c.row}-${c.tier}`;
export const formatWt = (wt) => {
  if (!wt) return '0kg';
  if (wt > 1000) return `${(wt/1000).toFixed(1)}t`;
  return `${wt}kg`;
};
export const isoToLabel = (iso) => {
  if (!iso) return '';
  const p = iso.toUpperCase();
  if (p === '22GP' || p === '22G1' || p === '22G0') return '20DC';
  if (p === '42GP' || p === '44GP' || p === '42G1') return '40DC';
  if (p === '45GP' || p === '45G1') return '40HC';
  if (p.length >= 3 && p[2] === 'R') return p[0] === '2' ? '20RF' : '40RF';
  if (p.length >= 3 && p[2] === 'T') return p[0] === '2' ? '20TK' : '40TK';
  if (p.length >= 3 && p[2] === 'U') return p[0] === '2' ? '20OT' : '40OT';
  if (p[0] === '4') return '40' + p.substring(2, 3);
  if (p[0] === '2') return '20' + p.substring(2, 3);
  return p;
};

// === BAPLIE EDI Parser ===
export function parseBAPLIE(ediText) {
  const result = {
    vsl: '', voy: '', pol: '', etd: '', eta: '',
    containers: [], errors: [],
  };
  const text = ediText.replace(/\r?\n/g, '');
  const segments = text.split("'").filter(s => s.length > 0);
  let cur = null;
  
  for (const seg of segments) {
    if (seg.startsWith('TDT+')) {
      const parts = seg.split('+');
      result.voy = parts[2] || '';
      const lastField = parts[parts.length - 1] || '';
      const subTokens = lastField.split(':');
      for (let i = subTokens.length - 1; i >= 0; i--) {
        const t = subTokens[i].trim().replace(/['"]/g, '');
        if (t && !/^\d+$/.test(t) && /[A-Z]/.test(t)) { result.vsl = t; break; }
      }
    } else if (seg.startsWith('LOC+5+') && !cur) {
      result.pol = seg.substring(6).split(':')[0];
    } else if (seg.startsWith('DTM+178:') || seg.startsWith('DTM+136:')) {
      const v = seg.split(':')[1];
      if (v) result.etd = v.substring(0, 8);
    } else if (seg.startsWith('LOC+147+')) {
      if (cur) result.containers.push(cur);
      const slot = seg.substring(8).split(':')[0];
      cur = {
        cn: '', l4: '', iso: '', tp: '', fe: 'F',
        pol: '', pod: '',
        wt: 0, wtt: '',
        bay: '', row: '', tier: '',
        op: '',
        dg: false, dgc: '', un: '',
        rf: false, tk: false, oog: false,
        sl: '', sh: '', bl: '',
        tmp: '',
      };
      if (slot.length >= 7) {
        cur.bay = slot.substring(0, 3);
        cur.row = slot.substring(3, 5);
        cur.tier = slot.substring(5, 7);
      } else if (slot.length === 6) {
        cur.bay = '0' + slot.substring(0, 2);
        cur.row = slot.substring(2, 4);
        cur.tier = slot.substring(4, 6);
      }
    } else if (cur && seg.startsWith('EQD+CN+')) {
      const parts = seg.split('+');
      cur.cn = (parts[2] || '').trim();
      cur.l4 = cur.cn.slice(-4);
      const isoField = parts[3] || '';
      cur.iso = isoField.split(':')[0] || '';
      if (cur.iso.length >= 3) {
        const t = cur.iso[2];
        if (t === 'R') cur.rf = true;
        if (t === 'U') cur.oog = true;
        if (t === 'T' || (t >= '7' && t <= '9')) cur.tk = true;
      }
      const fe = (parts[5] || '').trim();
      cur.fe = (fe === 'E' || fe === '5') ? 'E' : 'F';
      if (cur.iso.startsWith('22')) cur.tp = "20'GP";
      else if (cur.iso.startsWith('42') || cur.iso.startsWith('44')) cur.tp = "40'GP";
      else if (cur.iso.startsWith('45')) cur.tp = "40'HC";
    } else if (cur && seg.startsWith('LOC+9+')) {
      cur.pol = seg.substring(6).split(':')[0];
    } else if (cur && seg.startsWith('LOC+11+')) {
      cur.pod = seg.substring(7).split(':')[0];
    } else if (cur && seg.startsWith('MEA+')) {
      const parts = seg.split(':');
      const last = parts[parts.length - 1];
      const num = parseInt(last);
      if (!isNaN(num) && num > 100) {
        cur.wt = num;
        cur.wtt = seg.includes('VGM') ? 'VGM' : 'WT';
      }
    } else if (cur && (seg.startsWith('TMP+2+') || seg.startsWith('TMP+'))) {
      const v = seg.substring(6).split(':')[0];
      if (v) { cur.tmp = v; cur.rf = true; }
    } else if (cur && seg.startsWith('RNG+5+')) {
      const parts = seg.split(':');
      if (parts.length >= 3) {
        cur.tmp = parts[2] + (parts[3] ? '~' + parts[3] : '');
        cur.rf = true;
      }
    } else if (cur && seg.startsWith('DGS+IMD+')) {
      cur.dg = true;
      const parts = seg.split('+');
      cur.dgc = parts[2] || '';
      cur.un = parts[3] || '';
    } else if (cur && seg.startsWith('DIM+')) {
      cur.oog = true;
    } else if (cur && seg.startsWith('FTX+AAY+++')) {
      cur.op = seg.substring(10).substring(0, 5).trim();
    } else if (cur && seg.startsWith('NAD+CF+')) {
      cur.op = seg.substring(7).split(':')[0];
    }
  }
  if (cur) result.containers.push(cur);
  if (!result.vsl) result.errors.push('선박명을 인식하지 못했습니다.');
  if (result.containers.length === 0) result.errors.push('컨테이너를 찾지 못했습니다.');
  return result;
}

// === ASC Parser ===
export function parseAscFile(text) {
  const lines = text.split(/\r?\n/);
  const containers = [];
  let vsl = '', voy = '';
  
  for (const ln of lines) {
    if (ln.startsWith('$604')) {
      const parts = ln.substring(4).split('/');
      if (parts.length >= 3) {
        vsl = (parts[1] || '').trim();
        voy = (parts[2] || '').trim();
      }
      break;
    }
  }
  
  for (const line of lines) {
    if (line.length < 50) continue;
    if (line.startsWith('$')) continue;
    const slot = line.substring(0, 6).trim();
    if (!/^\d{6}$/.test(slot)) continue;
    const cn = line.substring(7, 18).trim();
    if (!/^[A-Z]{4}\d{7}$/.test(cn)) continue;
    
    const bay = slot.substring(0, 2).padStart(3, '0');
    const row = slot.substring(2, 4);
    const tier = slot.substring(4, 6);
    const op = line.substring(19, 27).trim();
    const typeBlock = line.substring(44, 54).trim();
    
    let tp = '', iso = '', fe = 'F';
    let m = typeBlock.match(/^([A-Z]{2}\d{2})(\d{3})([FE])/);
    if (m) {
      tp = m[1]; iso = m[2] + 'GP'; fe = m[3];
      if (tp.startsWith('TK')) iso = '22T6';
      if (tp.startsWith('RF')) iso = tp.endsWith('20') ? '22R5' : '45R1';
      if (tp.startsWith('DC') && tp.endsWith('20')) iso = '22GP';
      if (tp.startsWith('DC') && tp.endsWith('40')) iso = '42GP';
      if (tp === 'HC40') iso = '45GP';
    }
    const wtMatch = line.substring(60, 100).match(/(\d{5})/);
    const wt = wtMatch ? parseInt(wtMatch[1]) : 0;
    const tail = line.replace(/\u0000/g, '').trim();
    const polPod = tail.match(/([A-Z]{5})([A-Z]{5})$/);
    let pol = 'KRINC', pod = '';
    if (polPod) { pol = polPod[1]; pod = polPod[2]; }
    
    containers.push({
      cn, bay, row, tier, iso, tp, fe, wt, op, pol, pod,
      dg: false, dgc: '', un: '',
      rf: tp.startsWith('RF'),
      tk: tp.startsWith('TK'),
      oog: false,
      sl: '', sh: '', bl: '', tmp: '',
    });
  }
  return { vsl, voy, containers };
}

// === SheetJS Loader ===
export async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.XLSX;
}

// === 양하 / 선적 리스트 Excel Parser ===
export async function parseListExcel(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const records = [];
  const seen = new Set();
  
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    
    let headerRow = -1, headers = null;
    for (let i = 0; i < Math.min(30, grid.length); i++) {
      const row = (grid[i] || []).map(s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' '));
      const hasCN = row.some(c => 
        /^container$/.test(c) || /container.*no/.test(c) || /cntr.*no/.test(c) || /^cntr$/.test(c)
      );
      if (hasCN) { headerRow = i; headers = (grid[i] || []).map(s => String(s || '').trim()); break; }
    }
    
    if (headerRow < 0) {
      for (const row of grid) {
        for (const cell of (row || [])) {
          const text = String(cell || '').replace(/[\s\-]/g, '').toUpperCase();
          const m = text.match(/^([A-Z]{4}\d{6,7})$/);
          if (m && !seen.has(m[1])) {
            seen.add(m[1]);
            records.push({ cn: m[1], l4: m[1].slice(-4) });
          }
        }
      }
      continue;
    }
    
    const findCol = (patterns) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase().replace(/\s+/g, ' ').trim();
        for (const p of patterns) if (p.test(h)) return i;
      }
      return -1;
    };
    
    const cn_i = findCol([/^container$/, /container.*no/, /cntr.*no/, /^cntr$/]);
    const sl_i = findCol([/^seal$/, /^seal\s*no$/, /^sealno$/, /seal.*no(?!\d)/]);
    const bl_i = findCol([/^b\/?l/, /^bl\s*no/]);
    const wt_i = findCol([/gross.*wt|t\.wgt|total.*wt|^weight/]);
    const sh_i = findCol([/shipper|forward/]);
    const gi_i = findCol([/gate.*in/]);
    const pol_i = findCol([/^pol$|load.*port/]);
    const pod_i = findCol([/^pod$|dis.*port|dis.*cy/]);
    
    if (cn_i < 0) continue;
    
    for (let i = headerRow + 1; i < grid.length; i++) {
      const row = grid[i] || [];
      const cn = String(row[cn_i] || '').replace(/[\s\-]/g, '').toUpperCase();
      if (!/^[A-Z]{4}\d{6,7}$/.test(cn)) continue;
      if (seen.has(cn)) continue;
      seen.add(cn);
      records.push({
        cn, l4: cn.slice(-4),
        sl: sl_i >= 0 ? String(row[sl_i] || '').trim() : '',
        bl: bl_i >= 0 ? String(row[bl_i] || '').trim() : '',
        sh: sh_i >= 0 ? String(row[sh_i] || '').trim() : '',
        gi: gi_i >= 0 ? String(row[gi_i] || '').trim() : '',
        wt: wt_i >= 0 ? (parseInt(String(row[wt_i] || '').replace(/,/g, '')) || 0) : 0,
        pol: pol_i >= 0 ? String(row[pol_i] || '').trim() : '',
        pod: pod_i >= 0 ? String(row[pod_i] || '').trim() : '',
      });
    }
  }
  return { records };
}

// === X-RAY Parser ===
export async function parseXrayList(arrayBuffer) {
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const containers = new Set();
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    for (const row of grid) {
      for (const cell of (row || [])) {
        const text = String(cell || '').replace(/[\s\-]/g, '').toUpperCase();
        const m = text.match(/([A-Z]{4}\d{6,7})/);
        if (m) containers.add(m[1]);
      }
    }
  }
  return { containers: Array.from(containers) };
}

// === POD 색깔 ===
export const podColorMap = {
  'CNTAG': { bg: 'bg-blue-600', text: 'text-blue-50' },
  'CNNTG': { bg: 'bg-green-600', text: 'text-green-50' },
  'CNSHA': { bg: 'bg-purple-600', text: 'text-purple-50' },
  'CNNGB': { bg: 'bg-pink-600', text: 'text-pink-50' },
  'CNQZH': { bg: 'bg-cyan-600', text: 'text-cyan-50' },
  'HKHKG': { bg: 'bg-indigo-600', text: 'text-indigo-50' },
  'JPHKT': { bg: 'bg-rose-600', text: 'text-rose-50' },
  'JPYOK': { bg: 'bg-teal-600', text: 'text-teal-50' },
  'KRPUS': { bg: 'bg-yellow-600', text: 'text-yellow-50' },
};
