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
  const p = String(iso).toUpperCase().trim().replace(/\s+/g, '');
  
  // === 우선 처리: 명확한 ISO 형식 (긴 패턴 먼저!) ===
  // 40' HC 리퍼: 40HR (사용자 약식), 45R*, 4xR*
  if (/^40HR/.test(p)) return '40RF';
  if (/^4[245]R/.test(p)) return '40RF';
  if (/^40R/.test(p)) return '40RF';
  // 40' Flat Rack: 40FP, 40FR, 4[24]P
  if (/^40F[PR]/.test(p)) return '40FR';
  if (/^4[24]P/.test(p)) return '40FR';
  // 45' Open Top: 45OT, 45OH, 4[24]U
  if (/^4[245]O/.test(p)) return '40OT';
  if (/^4[24]U/.test(p)) return '40OT';
  // 40' Tank: 40TK, 4[24]T
  if (/^40T/.test(p)) return '40TK';
  if (/^4[24]T/.test(p)) return '40TK';
  // 40' HC (general): 40HC, 4[24]H, 45G*, 43*
  if (/^40HC/.test(p)) return '40HC';
  if (/^4[24]H/.test(p)) return '40HC';
  if (/^45G/.test(p)) return '40HC';
  if (/^43/.test(p)) return '40HC';
  // 40' DC: 40DC, 40GP, 4[24]GP
  if (/^40[DG]/.test(p)) return '40DC';
  if (/^4[24][G][P012]/.test(p)) return '40DC';
  
  // === 20피트 (긴 패턴 먼저) ===
  // 리퍼: 20RF, 22R*
  if (/^20R/.test(p)) return '20RF';
  if (/^2[02][R]/.test(p)) return '20RF';
  // Flat Rack: 20FR, 20FP, 2[02]P
  if (/^20F[PR]/.test(p)) return '20FR';
  if (/^2[02][P]/.test(p)) return '20FR';
  // Open Top: 20OT, 20OH, 2[02]U
  if (/^20O/.test(p)) return '20OT';
  if (/^2[02][U]/.test(p)) return '20OT';
  // Tank: 20TK, 2[02]T
  if (/^20T/.test(p)) return '20TK';
  if (/^2[02][T]/.test(p)) return '20TK';
  // DC: 20GP, 20DC, 22GP
  if (/^20[GD]/.test(p)) return '20DC';
  if (/^2[02][G][P0-9]/.test(p)) return '20DC';
  
  // === fallback ===
  if (p[0] === '4') {
    const t = p[2];
    if (t === 'R') return '40RF';
    if (t === 'P' || t === 'F') return '40FR';
    if (t === 'O' || t === 'U') return '40OT';
    if (t === 'T') return '40TK';
    if (t === 'H') return '40HC';
    if (t === 'G' || t === 'D') return '40DC';
    return '40' + (t || '?');
  }
  if (p[0] === '2') {
    const t = p[2];
    if (t === 'R') return '20RF';
    if (t === 'P' || t === 'F') return '20FR';
    if (t === 'O' || t === 'U') return '20OT';
    if (t === 'T') return '20TK';
    if (t === 'G' || t === 'D') return '20DC';
    return '20' + (t || '?');
  }
  return p;
};

// PDF 베이플랜 형식의 타입 라벨 (셀 표시용)
// PDF 에서는 raw 코드 그대로 사용: DC20, DCHC, RFHC, TK20 등
export const isoToPdfLabel = (iso, tp) => {
  // tp (TYPE 블록) 가 있으면 그대로 사용 (DC20, DCHC, RFHC 등)
  if (tp && tp.length >= 3) return tp.toUpperCase().trim();
  // 없으면 isoToLabel 결과를 PDF 형식으로 변환
  const lbl = isoToLabel(iso);
  if (!lbl) return '';
  // 20DC → DC20, 40HC → DCHC, 40RF → RFHC, 20RF → RF20, 20TK → TK20
  if (lbl === '20DC') return 'DC20';
  if (lbl === '40DC') return 'DC40';
  if (lbl === '40HC') return 'DCHC';
  if (lbl === '20RF') return 'RF20';
  if (lbl === '40RF') return 'RFHC';
  if (lbl === '20TK') return 'TK20';
  if (lbl === '40TK') return 'TK40';
  if (lbl === '20FR') return 'FR20';
  if (lbl === '40FR') return 'FR40';
  if (lbl === '20OT') return 'OT20';
  if (lbl === '40OT') return 'OT40';
  return lbl;
};

// 규격 카테고리 (통계용)
export const isoCategory = (iso) => {
  const lbl = isoToLabel(iso);
  if (!lbl) return '?';
  // 그룹화: 20DC / 40DC / 40HC / RF / DG / TK / FR / OT / 기타
  if (lbl === '20DC' || lbl === '20GP') return '20DC';
  if (lbl === '40DC' || lbl === '40GP') return '40DC';
  if (lbl === '40HC') return '40HC';
  if (lbl.endsWith('RF')) return 'RF';
  if (lbl.endsWith('TK')) return 'TK';
  if (lbl.endsWith('FR')) return 'FR';
  if (lbl.endsWith('OT')) return 'OT';
  return lbl;
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
      // 컨번호의 공백/하이픈 제거 (예: "DWSU 2406569" → "DWSU2406569")
      cur.cn = (parts[2] || '').replace(/[\s\-]/g, '').toUpperCase().trim();
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
  
  // 무게 기반 F/E 검증 (실제 작업자 경험)
  // 20피트 Empty ≈ 2.2톤, 40피트 Empty ≈ 3.8톤
  for (const c of result.containers) {
    if (c.wt > 0) {
      const is20 = c.iso && c.iso.startsWith('22');
      const is40 = c.iso && (c.iso.startsWith('42') || c.iso.startsWith('44') || c.iso.startsWith('45'));
      if (is20 && c.wt <= 2500) c.fe = 'E';
      else if (is40 && c.wt <= 4500) c.fe = 'E';
      else if (c.wt > 5000) c.fe = 'F';
    }
  }
  
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
    const cn = line.substring(7, 18).replace(/[\s\-]/g, '').toUpperCase();
    if (!/^[A-Z]{4}\d{7}$/.test(cn)) continue;
    
    const bay = slot.substring(0, 2).padStart(3, '0');
    const row = slot.substring(2, 4);
    const tier = slot.substring(4, 6);
    const op = line.substring(19, 27).trim();
    const typeBlock = line.substring(44, 54).trim();
    
    let tp = '', iso = '', fe = 'F', wt = 0;
    
    // 형식 1: DC20234F (TYPE2 + WT3 + F/E) - KKAK 형식
    let m1 = typeBlock.match(/^([A-Z]{2}\d{2})(\d{3})([FE])/);
    // 형식 2: 20GP193F (ISO2글자숫자 + WT3 + F/E) - STSE 형식
    let m2 = typeBlock.match(/^(\d{2}[A-Z]{2})(\d{3})([FE])/);
    // 형식 4: DCHC209F, RFHC265F (TYPE 4글자영문 + WT3 + F/E) - SWCP 형식  
    let m4 = typeBlock.match(/^([A-Z]{4})(\d{3})([FE])/);
    
    if (m1) {
      tp = m1[1]; iso = m1[2] + 'GP'; fe = m1[3];
      if (tp.startsWith('TK')) iso = '22T6';
      if (tp.startsWith('RF')) iso = tp.endsWith('20') ? '22R5' : '45R1';
      if (tp.startsWith('DC') && tp.endsWith('20')) iso = '22GP';
      if (tp.startsWith('DC') && tp.endsWith('40')) iso = '42GP';
      if (tp === 'HC40') iso = '45GP';
      // KKAK 형식의 무게는 끝쪽 5자리
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      wt = wtMatch ? parseInt(wtMatch[1]) : 0;
    } else if (m4) {
      // SWCP 형식: DCHC, RFHC, RFHQ 등 4글자 TYPE
      tp = m4[1];
      fe = m4[3];
      // ISO 매핑
      if (tp === 'DCHC') iso = '45GP';        // 40' DC High Cube
      else if (tp === 'RFHC') iso = '45R1';   // 40' Reefer HC
      else if (tp === 'RFHQ') iso = '45R1';
      else if (tp === 'DCDC') iso = '42GP';   // 40' DC
      else iso = tp;
      // 무게: 같은 줄 끝쪽 5자리 우선
      const wtMatch = line.substring(54, 100).match(/(\d{5})/);
      if (wtMatch) {
        wt = parseInt(wtMatch[1]);
      } else {
        // 없으면 m4[2] * 100
        wt = parseInt(m4[2]) * 100;
      }
    } else if (m2) {
      // STSE 형식: 20GP193F, 40HC172F, 40HR265F, 40FP356F, 45OT179F
      iso = m2[1];
      wt = parseInt(m2[2]) * 100;
      fe = m2[3];
      tp = iso;
    }
    
    // POL/POD 추출 - SWCP/STSE/KKAK 모든 형식 처리
    let pol = '', pod = '';
    
    // V33: 형식 우선순위 변경 — POL3+POD3 (SWCP) 먼저, 그 다음 POL5+POD5 (KKAK)
    // SWCP: "SGNPTK      KRPTK" (POL3+POD3 + 공백 + T_POD5)
    // KKAK: "INCPUS      KRPUS" (POL5+공백+POD5)
    
    // 형식 A: 첫 6자가 영문 6자 = POL3+POD3 (SWCP/STSE)
    const first6 = line.substring(27, 33);
    if (/^[A-Z]{6}$/.test(first6)) {
      // POL3+POD3 형식
      pol = first6.substring(0, 3);
      pod = first6.substring(3, 6);
      // T_POD 도 있으면 (위치 33-44 의 KRPTK 같은 거) 추후 사용 가능
    } else {
      // 형식 B: POL5 + 공백 + POD5 (KKAK)
      const posBlock1 = line.substring(27, 44);
      const m_polpod1 = posBlock1.match(/^([A-Z]{5})\s+([A-Z]{5})/);
      if (m_polpod1) {
        pol = m_polpod1[1];
        pod = m_polpod1[2];
      } else {
        // 형식 C: 끝 fallback
        const tail = line.replace(/\u0000/g, '').trim();
        const polPod = tail.match(/([A-Z]{5})([A-Z]{5})$/);
        if (polPod) { pol = polPod[1]; pod = polPod[2]; }
      }
    }
    
    // 무게 기반 F/E 검증 (실제 작업자 경험)
    let feFinal = fe;
    if (wt > 0) {
      const is20 = (tp && (tp.endsWith('20') || tp === 'DC20' || tp === 'RF20' || tp === 'TK20'))
                || (iso && iso.startsWith('22'));
      const is40 = (tp && (tp.endsWith('40') || tp === 'DC40' || tp === 'RF40' || tp === 'HC40'))
                || (iso && (iso.startsWith('42') || iso.startsWith('44') || iso.startsWith('45')));
      if (is20 && wt <= 2500) feFinal = 'E';
      else if (is40 && wt <= 4500) feFinal = 'E';
      else if (wt > 5000) feFinal = 'F';
    }
    
    containers.push({
      cn, bay, row, tier, iso, tp, 
      fe: feFinal, 
      wt, op, pol, pod,
      dg: false, dgc: '', un: '',
      rf: (tp && tp.startsWith('RF')) || (iso && iso[2] === 'R'),
      tk: (tp && tp.startsWith('TK')) || (iso && iso[2] === 'T'),
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
    
    // 1단계: 헤더 행 찾기 (검색 범위 확대 50줄)
    let headerRow = -1, headers = null;
    for (let i = 0; i < Math.min(50, grid.length); i++) {
      const row = (grid[i] || []).map(s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' '));
      const hasCN = row.some(c => 
        /^container$/.test(c) || /container.*no/.test(c) || /cntr.*no/.test(c) || /^cntr$/.test(c)
        || /컨테이너.*번호/.test(c) || /^컨테이너$/.test(c)
        || /^c\/?no$/.test(c) || /^cont.*no$/.test(c) || /^cnt.*no$/.test(c)
      );
      if (hasCN) { headerRow = i; headers = (grid[i] || []).map(s => String(s || '').trim()); break; }
    }
    
    // 2단계: 헤더 못 찾으면 → 모든 셀에서 컨번호 패턴 스캔 (CLL 파일 fallback)
    if (headerRow < 0) {
      for (const row of grid) {
        if (!row) continue;
        // 한 행에서 컨번호 + 그 옆 셀들에서 추가 정보
        for (let ci = 0; ci < row.length; ci++) {
          const cellRaw = String(row[ci] || '');
          const cell = cellRaw.replace(/[\s\-]/g, '').toUpperCase();
          const m = cell.match(/^([A-Z]{4}\d{6,7})$/);
          if (m && !seen.has(m[1])) {
            seen.add(m[1]);
            const cn = m[1];
            
            // 같은 행에서 추가 정보 자동 추출
            const allCells = row.map(v => String(v || '').trim());
            
            // 실번호: 컨번호 옆 (보통 다음 1~3 컬럼 안에 있음)
            let sl = '';
            for (let j = ci + 1; j < Math.min(ci + 5, allCells.length); j++) {
              const v = allCells[j];
              // 실번호 패턴: 영문+숫자 또는 순수 숫자 5자리 이상
              if (/^[A-Z]{0,5}\d{5,}$/i.test(v.replace(/[\s\-]/g, ''))) {
                sl = v.replace(/[\s\-]/g, '').toUpperCase();
                break;
              }
            }
            
            // 무게: 1000 이상의 숫자
            let wt = 0;
            for (const v of allCells) {
              const n = parseInt(String(v).replace(/[,\s]/g, ''));
              if (!isNaN(n) && n >= 1000 && n <= 50000) {
                wt = n;
                break;
              }
            }
            
            // ISO 코드: 22GP, 42GP, 45GP, 22R5 등
            let iso = '';
            for (const v of allCells) {
              const t = String(v).trim().toUpperCase();
              if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$/.test(t)) {
                iso = t;
                break;
              }
            }
            
            // POL/POD: 5자리 영문 (KRPTK, CNJIU 등)
            let pol = '', pod = '';
            for (const v of allCells) {
              const p = String(v).trim().toUpperCase();
              if (/^[A-Z]{5}$/.test(p) && p !== cn.slice(0,4)) {
                if (!pol) pol = p;
                else if (!pod && p !== pol) { pod = p; break; }
              }
            }
            
            records.push({ cn, l4: cn.slice(-4), sl, wt, iso, pol, pod, op: '', bl: '', sh: '', gi: '', fe: '', dg: false, rf: false, tmp: '' });
            break; // 한 행에서 컨번호 1개만 (중복 방지)
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
    
    // 영문 + 한글 컬럼 인식 (확장)
    const cn_i = findCol([/^container$/, /container.*no/, /cntr.*no/, /^cntr$/, /컨테이너.*번호/, /^컨테이너$/, /^c\/?no$/, /^cnt.*no$/]);
    const sl_i = findCol([/^seal$/, /^seal\s*no$/, /^sealno$/, /seal.*no(?!\d)/, /seal.*no.*1/, /^실번호/, /^실$/]);
    const bl_i = findCol([/^b\/?l/, /^bl\s*no/, /^m-?b\/?l/, /master.*b\/?l/]);
    const wt_i = findCol([/gross.*wt|t\.wgt|total.*wt|^weight/, /무게/, /중량/, /^kg/, /^kgs/]);
    const sh_i = findCol([/shipper|forward/, /화주/]);
    const gi_i = findCol([/gate.*in/, /반입/]);
    const pol_i = findCol([/^pol$|load.*port/, /적재항/, /선적항/, /^lp$/]);
    const pod_i = findCol([/^pod$|dis.*port|dis.*cy/, /최종항/, /양하항/, /도착항/, /^dp$/]);
    const fe_i = findCol([/^f\/?e$|^full\/?empty$|^fe$/, /^적공$/, /^empty\/full$/]);
    const type_i = findCol([/^type$|^cntr.*type|^iso/, /^규격$/, /^타입$/, /^컨.*규격/, /^size$/]);
    const op_i = findCol([/^op$|^operator|^carrier|^line/, /^선사/, /선사부호/]);
    const dg_i = findCol([/^dg$|hazmat|imdg/, /위험물/]);
    const tmp_i = findCol([/^temp|^temperature|^reefer/, /온도/, /냉장/]);
    
    if (cn_i < 0) continue;
    
    for (let i = headerRow + 1; i < grid.length; i++) {
      const row = grid[i] || [];
      const cn = String(row[cn_i] || '').replace(/[\s\-]/g, '').toUpperCase();
      if (!/^[A-Z]{4}\d{6,7}$/.test(cn)) continue;
      if (seen.has(cn)) continue;
      seen.add(cn);
      
      // F/E 추출 (있으면)
      let fe = '';
      if (fe_i >= 0) {
        const feRaw = String(row[fe_i] || '').trim().toUpperCase();
        if (feRaw === 'F' || feRaw === 'FULL' || feRaw === 'L' || feRaw === 'LOADED') fe = 'F';
        else if (feRaw === 'E' || feRaw === 'EMPTY' || feRaw === 'MT') fe = 'E';
      }
      
      // 타입 추출
      let iso = '';
      let isoRaw = type_i >= 0 ? String(row[type_i] || '').trim().toUpperCase() : '';
      // 표준 ISO 코드 (22GP, 42GP, 45GP, 22R5 등)
      if (/^\d{2}[A-Z]\d$|^\d{2}[A-Z]{2}$/.test(isoRaw)) iso = isoRaw;
      // 단순 표기 (20DC, 40HC 등)
      else if (/20.*DC|20.*GP/.test(isoRaw)) iso = '22GP';
      else if (/40.*HC/.test(isoRaw)) iso = '45GP';
      else if (/40.*DC|40.*GP/.test(isoRaw)) iso = '42GP';
      else if (/RF|REEFER/.test(isoRaw)) iso = isoRaw.includes('20') ? '22R5' : '45R1';
      else if (/TK|TANK/.test(isoRaw)) iso = '22T6';
      
      const dgVal = dg_i >= 0 ? String(row[dg_i] || '').trim() : '';
      const isDg = dgVal && /^(Y|YES|TRUE|1|DG|HAZ)/i.test(dgVal);
      
      const tmpVal = tmp_i >= 0 ? String(row[tmp_i] || '').trim() : '';
      const isRf = tmpVal && tmpVal !== '0' && tmpVal !== '-';
      
      records.push({
        cn, l4: cn.slice(-4),
        sl: sl_i >= 0 ? String(row[sl_i] || '').trim() : '',
        bl: bl_i >= 0 ? String(row[bl_i] || '').trim() : '',
        sh: sh_i >= 0 ? String(row[sh_i] || '').trim() : '',
        gi: gi_i >= 0 ? String(row[gi_i] || '').trim() : '',
        wt: wt_i >= 0 ? (parseInt(String(row[wt_i] || '').replace(/,/g, '')) || 0) : 0,
        pol: pol_i >= 0 ? String(row[pol_i] || '').trim() : '',
        pod: pod_i >= 0 ? String(row[pod_i] || '').trim() : '',
        fe, // 리스트에서 직접 가져온 F/E (있으면)
        iso, // 리스트에서 직접 가져온 타입 (있으면)
        op: op_i >= 0 ? String(row[op_i] || '').trim() : '',
        dg: isDg,
        rf: isRf,
        tmp: tmpVal,
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
