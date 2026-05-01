// Firebase 설정 (공유)
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, onValue, remove, update, get, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAQz9Y8kFzdJmhPrryd-nWNCTrCJrKebHg",
  authDomain: "tallyman-66f25.firebaseapp.com",
  databaseURL: "https://tallyman-66f25-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tallyman-66f25",
  storageBucket: "tallyman-66f25.firebasestorage.app",
  messagingSenderId: "446815033617",
  appId: "1:446815033617:web:bd3c5d789c1bf599a2d4b0"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// 데이터베이스 헬퍼
export { ref, push, set, onValue, remove, update, get, child };

// === 데이터 구조 (Firebase Realtime Database) ===
// /voyages/{key} = { vsl, voy, type: 'discharge'|'loading', containers, etc }
// /completed/{voyageKey}/{cn} = { by, at, damaged, side: 'discharge'|'loading' }
// /xray/{voyageKey}/{cn} = true
// /xraySeals/{voyageKey}/{cn} = { seal, eseal }

// 항차 키 만들기
export const makeVoyageKey = (vsl, voy, type) => 
  `${type}_${vsl.replace(/[^a-zA-Z0-9가-힣]/g, '')}_${voy.replace(/[^a-zA-Z0-9]/g, '')}`;

// === 양하 / 선적 / 수석 공통 함수 ===

// 항차 등록
export async function fbAddVoyage(key, data) {
  await set(ref(db, `voyages/${key}`), {
    ...data,
    uploadedAt: new Date().toISOString(),
  });
}

// 항차 업데이트
export async function fbUpdateVoyage(key, patch) {
  await update(ref(db, `voyages/${key}`), patch);
}

// 항차 삭제
export async function fbDeleteVoyage(key) {
  await remove(ref(db, `voyages/${key}`));
  await remove(ref(db, `completed/${key}`));
  await remove(ref(db, `xray/${key}`));
  await remove(ref(db, `xraySeals/${key}`));
}

// 컨테이너 완료 처리
export async function fbCompleteContainer(voyageKey, cn, data) {
  await set(ref(db, `completed/${voyageKey}/${cn}`), {
    ...data,
    at: new Date().toISOString(),
  });
}

// 완료 취소
export async function fbCancelComplete(voyageKey, cn) {
  await remove(ref(db, `completed/${voyageKey}/${cn}`));
}

// X-RAY 토글
export async function fbToggleXray(voyageKey, cn, value) {
  if (value) {
    await set(ref(db, `xray/${voyageKey}/${cn}`), true);
  } else {
    await remove(ref(db, `xray/${voyageKey}/${cn}`));
  }
}

// X-RAY 일괄 추가
export async function fbAddXrayBulk(voyageKey, cnList) {
  const updates = {};
  for (const cn of cnList) {
    updates[`xray/${voyageKey}/${cn}`] = true;
  }
  await update(ref(db), updates);
}

// X-RAY 실 정보
export async function fbSetXraySeal(voyageKey, cn, seal, eseal) {
  await set(ref(db, `xraySeals/${voyageKey}/${cn}`), { seal, eseal });
}

// 실시간 구독 함수들
export function fbSubscribeVoyages(callback) {
  const r = ref(db, 'voyages');
  return onValue(r, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

export function fbSubscribeCompleted(voyageKey, callback) {
  const r = ref(db, `completed/${voyageKey}`);
  return onValue(r, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

export function fbSubscribeAllCompleted(callback) {
  const r = ref(db, 'completed');
  return onValue(r, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

export function fbSubscribeXray(voyageKey, callback) {
  const r = ref(db, `xray/${voyageKey}`);
  return onValue(r, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

export function fbSubscribeXraySeals(voyageKey, callback) {
  const r = ref(db, `xraySeals/${voyageKey}`);
  return onValue(r, (snapshot) => {
    callback(snapshot.val() || {});
  });
}
