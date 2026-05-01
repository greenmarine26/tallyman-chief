// 그린마린 수석검수 통계앱 (PC용)
// 모든 검수원의 양하/선적 작업 실시간 통계
// 개발자: 연지아빠

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3, RefreshCw, Users, ArrowDownToLine, ArrowUpFromLine,
  Clock, AlertTriangle, Cloud, CloudOff, Trash2
} from 'lucide-react';
import { isoToLabel } from './utils.js';
import {
  fbSubscribeVoyages, fbSubscribeAllCompleted, fbDeleteVoyage,
  db, ref, onValue
} from './firebase.js';

export default function App() {
  const [voyages, setVoyages] = useState({});
  const [completed, setCompleted] = useState({});
  const [xrayAll, setXrayAll] = useState({});
  const [online, setOnline] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [now, setNow] = useState(Date.now());
  
  // 실시간 시계
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  
  // Firebase 실시간 구독
  useEffect(() => {
    const unsubV = fbSubscribeVoyages((data) => {
      setVoyages(data);
      setOnline(true);
    });
    const unsubC = fbSubscribeAllCompleted((data) => setCompleted(data));
    const unsubX = onValue(ref(db, 'xray'), (snapshot) => {
      setXrayAll(snapshot.val() || {});
    });
    return () => { unsubV(); unsubC(); unsubX(); };
  }, []);
  
  // 첫 활성 항차 자동 선택
  useEffect(() => {
    if (!selectedKey && Object.keys(voyages).length > 0) {
      setSelectedKey(Object.keys(voyages)[0]);
    }
  }, [voyages, selectedKey]);
  
  // 시간 포맷
  const fmtTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const fmtDuration = (start, end) => {
    if (!start || !end) return '-';
    const ms = new Date(end) - new Date(start);
    if (ms < 0) return '-';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };
  
  // 항차 분석
  const analyzeVoyage = (key) => {
    const v = voyages[key];
    if (!v) return null;
    
    const isDischarge = v.type === 'discharge';
    const completedMap = completed[key] || {};
    const xrayMap = xrayAll[key] || {};
    
    const containerByCn = {};
    if (isDischarge) {
      for (const c of (v.ediContainers || [])) containerByCn[c.cn] = c;
    } else {
      for (const c of (v.ediContainers || [])) containerByCn[c.cn] = c;
      for (const c of (v.ascContainers || [])) {
        if (!containerByCn[c.cn]) containerByCn[c.cn] = c;
      }
    }
    
    let targetCns;
    if (isDischarge) {
      targetCns = new Set((v.dischargeRecords || []).map(r => r.cn));
    } else {
      targetCns = new Set(Object.values(containerByCn).filter(c => c.pol === 'KRPTK').map(c => c.cn));
    }
    
    const total = targetCns.size;
    const completedCount = Object.keys(completedMap).filter(cn => targetCns.has(cn)).length;
    const damagedCount = Object.entries(completedMap).filter(([cn, info]) => targetCns.has(cn) && info.damaged).length;
    
    // 검수원별 분석
    const byInspector = {};
    for (const [cn, info] of Object.entries(completedMap)) {
      if (!targetCns.has(cn)) continue;
      const by = info.by || '미상';
      if (!byInspector[by]) {
        byInspector[by] = {
          count: 0, damaged: 0, normal: 0,
          firstAt: null, lastAt: null,
          byFE: { F: 0, E: 0 },
          bySize: { '20': 0, '40': 0, '40HC': 0, etc: 0 },
          containers: [],
        };
      }
      const s = byInspector[by];
      s.count++;
      if (info.damaged) s.damaged++; else s.normal++;
      const at = new Date(info.at);
      if (!s.firstAt || at < new Date(s.firstAt)) s.firstAt = info.at;
      if (!s.lastAt || at > new Date(s.lastAt)) s.lastAt = info.at;
      
      const c = containerByCn[cn];
      if (c) {
        if (c.fe === 'E') s.byFE.E++; else s.byFE.F++;
        const lbl = isoToLabel(c.iso);
        if (lbl === '20DC' || lbl === '20RF' || lbl === '20TK' || lbl === '20OT') s.bySize['20']++;
        else if (lbl === '40HC') s.bySize['40HC']++;
        else if (lbl.startsWith('40')) s.bySize['40']++;
        else s.bySize.etc++;
        s.containers.push({ cn, at: info.at, damaged: info.damaged });
      }
    }
    
    // 규격별 전체
    const overallSpec = { F20: 0, E20: 0, F40: 0, E40: 0, F40HC: 0, E40HC: 0, RF: 0, TK: 0, DG: 0 };
    const podBreakdown = {};
    for (const cn of targetCns) {
      const c = containerByCn[cn]; if (!c) continue;
      const lbl = isoToLabel(c.iso);
      const isE = c.fe === 'E';
      if (lbl === '20DC') (isE ? overallSpec.E20++ : overallSpec.F20++);
      else if (lbl === '40HC') (isE ? overallSpec.E40HC++ : overallSpec.F40HC++);
      else if (lbl === '40DC') (isE ? overallSpec.E40++ : overallSpec.F40++);
      if (c.rf) overallSpec.RF++;
      if (c.tk) overallSpec.TK++;
      if (c.dg) overallSpec.DG++;
      if (!isDischarge && c.pod) podBreakdown[c.pod] = (podBreakdown[c.pod] || 0) + 1;
    }
    
    // X-RAY (양하만)
    let xrayInfo = null;
    if (isDischarge) {
      const xrayCns = Object.keys(xrayMap).filter(cn => targetCns.has(cn));
      const xrayCompleted = xrayCns.filter(cn => completedMap[cn]);
      xrayInfo = {
        total: xrayCns.length,
        completed: xrayCompleted.length,
      };
    }
    
    return {
      v, isDischarge,
      total, completedCount, damagedCount,
      remaining: total - completedCount,
      progress: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      byInspector,
      overallSpec,
      podBreakdown,
      xrayInfo,
    };
  };
  
  const analysis = selectedKey ? analyzeVoyage(selectedKey) : null;
  
  // 전체 합계 (모든 항차)
  const totalSummary = useMemo(() => {
    let totalTarget = 0, totalCompleted = 0, totalDamaged = 0;
    const allInspectors = new Set();
    let dischargeCount = 0, loadingCount = 0;
    
    for (const key of Object.keys(voyages)) {
      const a = analyzeVoyage(key);
      if (!a) continue;
      totalTarget += a.total;
      totalCompleted += a.completedCount;
      totalDamaged += a.damagedCount;
      Object.keys(a.byInspector).forEach(name => allInspectors.add(name));
      if (a.isDischarge) dischargeCount += a.completedCount;
      else loadingCount += a.completedCount;
    }
    
    return {
      totalTarget, totalCompleted, totalDamaged,
      inspectorCount: allInspectors.size,
      dischargeCount, loadingCount,
      voyageCount: Object.keys(voyages).length,
    };
  }, [voyages, completed, xrayAll]);
  
  // 항차 삭제
  const handleDelete = async (key) => {
    const v = voyages[key];
    if (!confirm(`항차 "${v?.vsl} ${v?.voy}" 를 Firebase 에서 영구 삭제하시겠습니까?\n\n⚠ 모든 데이터 (양하리스트, 완료내역, X-RAY 등) 가 삭제됩니다`)) return;
    try {
      await fbDeleteVoyage(key);
      if (selectedKey === key) setSelectedKey(null);
    } catch (e) { alert('실패: ' + e.message); }
  };
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-gradient-to-r from-purple-900 to-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-purple-300"/>
            <div>
              <div className="font-black text-xl text-white">수석검수 통계</div>
              <div className="text-[10px] text-purple-300">그린마린 · 평택항</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400">실시간 동기화</div>
              <div className="text-xs font-bold text-emerald-300">
                {online ? <><Cloud className="w-3.5 h-3.5 inline"/> 연결됨</> : <><CloudOff className="w-3.5 h-3.5 inline"/> 오프라인</>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">현재 시각</div>
              <div className="text-xs font-bold mono text-amber-300">{new Date(now).toLocaleTimeString('ko-KR')}</div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* 전체 합계 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="활성 항차" value={totalSummary.voyageCount} color="amber"/>
          <SummaryCard label="총 검수 대상" value={totalSummary.totalTarget} color="blue"/>
          <SummaryCard label="총 완료" value={totalSummary.totalCompleted} color="emerald"
            sub={totalSummary.totalTarget > 0 ? `${Math.round((totalSummary.totalCompleted/totalSummary.totalTarget)*100)}%` : ''}/>
          <SummaryCard label="총 데미지" value={totalSummary.totalDamaged} color="orange"/>
          <SummaryCard label="검수원" value={totalSummary.inspectorCount} color="purple" icon={<Users className="w-4 h-4"/>}/>
        </div>
        
        {/* 양하/선적 분리 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3 flex items-center gap-3">
            <ArrowDownToLine className="w-8 h-8 text-blue-400"/>
            <div>
              <div className="text-xs text-slate-400">양하 처리 합계</div>
              <div className="text-2xl font-black text-blue-200">{totalSummary.dischargeCount}대</div>
            </div>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 flex items-center gap-3">
            <ArrowUpFromLine className="w-8 h-8 text-emerald-400"/>
            <div>
              <div className="text-xs text-slate-400">선적 처리 합계</div>
              <div className="text-2xl font-black text-emerald-200">{totalSummary.loadingCount}대</div>
            </div>
          </div>
        </div>
        
        {/* 항차 선택 */}
        {Object.keys(voyages).length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-500">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30"/>
            아직 등록된 항차가 없습니다.<br/>
            <span className="text-xs">검수원이 양하/선적앱에서 EDI 를 업로드하면 여기에 표시됩니다.</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2 font-bold">항차 선택 ({Object.keys(voyages).length}개)</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(voyages).map(([key, v]) => {
                const a = analyzeVoyage(key);
                return (
                  <div key={key} className="flex items-center gap-1">
                    <button onClick={() => setSelectedKey(key)}
                      className={`px-3 py-2 rounded text-xs font-bold flex items-center gap-1.5 ${
                        selectedKey === key 
                          ? (v.type === 'discharge' ? 'bg-blue-500 text-slate-900' : 'bg-emerald-500 text-slate-900')
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}>
                      {v.type === 'discharge' ? '⬇' : '⬆'} {v.vsl} {v.voy}
                      {a && <span className="text-[10px] opacity-70">({a.completedCount}/{a.total})</span>}
                    </button>
                    <button onClick={() => handleDelete(key)} className="w-7 h-7 bg-red-900/40 hover:bg-red-900/60 rounded text-red-300 flex items-center justify-center" title="항차 삭제">
                      <Trash2 className="w-3 h-3"/>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* 선택된 항차 상세 */}
        {analysis && (
          <div className={`border rounded-lg p-4 space-y-4 ${
            analysis.isDischarge 
              ? 'bg-blue-900/20 border-blue-700/40' 
              : 'bg-emerald-900/20 border-emerald-700/40'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-lg flex items-center gap-2">
                {analysis.isDischarge ? '⬇ 양하' : '⬆ 선적'} 
                <span className={analysis.isDischarge ? 'text-blue-200' : 'text-emerald-200'}>
                  {analysis.v.vsl} {analysis.v.voy}
                </span>
              </div>
              <div className="text-2xl font-black text-amber-300">{analysis.progress}%</div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-[10px] text-slate-400">총 대상</div>
                <div className="text-xl font-bold">{analysis.total}</div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-[10px] text-slate-400">완료</div>
                <div className="text-xl font-bold text-emerald-300">{analysis.completedCount}</div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-[10px] text-slate-400">잔여</div>
                <div className="text-xl font-bold text-blue-300">{analysis.remaining}</div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-[10px] text-slate-400">데미지</div>
                <div className="text-xl font-bold text-orange-300">{analysis.damagedCount}</div>
              </div>
            </div>
            
            {/* 규격별 / 특수 / 특이사항 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-800/50 p-3 rounded">
                <div className="text-slate-400 text-[10px] font-bold mb-1.5">📦 규격별</div>
                <div className="mono space-y-0.5 text-[11px]">
                  <div>20F: <span className="text-emerald-300">{analysis.overallSpec.F20}</span> / 20E: <span className="text-slate-400">{analysis.overallSpec.E20}</span></div>
                  <div>40F: <span className="text-emerald-300">{analysis.overallSpec.F40}</span> / 40E: <span className="text-slate-400">{analysis.overallSpec.E40}</span></div>
                  <div>40HC F: <span className="text-emerald-300">{analysis.overallSpec.F40HC}</span> / E: <span className="text-slate-400">{analysis.overallSpec.E40HC}</span></div>
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded">
                <div className="text-slate-400 text-[10px] font-bold mb-1.5">⚡ 특수화물</div>
                <div className="mono space-y-0.5 text-[11px]">
                  <div>❄ REEFER: <span className="text-cyan-300">{analysis.overallSpec.RF}</span></div>
                  <div>⬛ TANK: <span className="text-orange-300">{analysis.overallSpec.TK}</span></div>
                  <div>🔥 DG: <span className="text-red-300">{analysis.overallSpec.DG}</span></div>
                </div>
              </div>
              
              {analysis.isDischarge && analysis.xrayInfo ? (
                <div className="bg-slate-800/50 p-3 rounded">
                  <div className="text-slate-400 text-[10px] font-bold mb-1.5">📡 X-RAY</div>
                  <div className="mono space-y-0.5 text-[11px]">
                    <div>대상: <span className="text-amber-300">{analysis.xrayInfo.total}</span></div>
                    <div>완료: <span className="text-emerald-300">{analysis.xrayInfo.completed}</span></div>
                    <div>잔여: <span className="text-amber-200">{analysis.xrayInfo.total - analysis.xrayInfo.completed}</span></div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 p-3 rounded">
                  <div className="text-slate-400 text-[10px] font-bold mb-1.5">🌐 POD별 (선적)</div>
                  <div className="mono space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                    {Object.entries(analysis.podBreakdown).sort((a, b) => b[1] - a[1]).map(([pod, n]) => (
                      <div key={pod}>{pod}: <span className="text-blue-300">{n}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* 검수원별 처리 */}
            {Object.keys(analysis.byInspector).length > 0 && (
              <div className="bg-slate-800/30 rounded p-3">
                <div className="text-sm text-slate-300 mb-2 font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400"/>
                  검수원별 처리 ({Object.keys(analysis.byInspector).length}명)
                </div>
                <div className="space-y-2">
                  {Object.entries(analysis.byInspector).sort((a, b) => b[1].count - a[1].count).map(([name, s]) => (
                    <div key={name} className="bg-slate-900 rounded px-3 py-2">
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-slate-900 font-black">{name[0]}</div>
                          <div className="font-bold text-amber-300 mono text-base">{name}</div>
                        </div>
                        <div className="text-lg font-black text-emerald-300">{s.count}대</div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] mono">
                        <div className="bg-slate-800/50 p-1.5 rounded">
                          <div className="text-slate-500 text-[9px]">근무 시간</div>
                          <div className="text-slate-200 font-bold">{fmtTime(s.firstAt)}~{fmtTime(s.lastAt)}</div>
                          <div className="text-amber-300 text-[9px]">⏱ {fmtDuration(s.firstAt, s.lastAt)}</div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                          <div className="text-slate-500 text-[9px]">상태</div>
                          <div>정상 <span className="text-emerald-300 font-bold">{s.normal}</span></div>
                          <div>데미지 <span className="text-orange-300 font-bold">{s.damaged}</span></div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                          <div className="text-slate-500 text-[9px]">F/E</div>
                          <div>F: <span className="text-emerald-300 font-bold">{s.byFE.F}</span></div>
                          <div>E: <span className="text-slate-300 font-bold">{s.byFE.E}</span></div>
                        </div>
                        <div className="bg-slate-800/50 p-1.5 rounded">
                          <div className="text-slate-500 text-[9px]">규격</div>
                          <div>20: <span className="font-bold">{s.bySize['20']}</span></div>
                          <div>40: <span className="font-bold">{s.bySize['40']}</span> / HC: <span className="font-bold">{s.bySize['40HC']}</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-center text-[10px] text-slate-500 py-2">
          ☁ Firebase 실시간 자동 업데이트 · 마지막 갱신: {new Date(now).toLocaleString('ko-KR')}
        </div>
        
        <footer className="text-center text-[10px] text-slate-500 py-3">
          그린마린 수석검수 · 개발자: <span className="text-amber-400">연지아빠</span>
        </footer>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, color, sub, icon }) {
  const colorMap = {
    amber: 'bg-amber-900/30 border-amber-700/40 text-amber-300',
    blue: 'bg-blue-900/30 border-blue-700/40 text-blue-300',
    emerald: 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300',
    orange: 'bg-orange-900/30 border-orange-700/40 text-orange-300',
    purple: 'bg-purple-900/30 border-purple-700/40 text-purple-300',
  };
  return (
    <div className={`${colorMap[color]} border rounded-lg p-3`}>
      <div className="text-[10px] text-slate-400 flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-black">{value}</div>
      {sub && <div className="text-[10px] text-amber-300 font-bold">{sub}</div>}
    </div>
  );
}
