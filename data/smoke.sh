#!/usr/bin/env bash
# ExitOS 업로드(A) → 분석·보고서·매물·인수인계(B) 흐름 점검 (소유: B)
# 먼저 다른 터미널에서 `DEMO_MODE=true npm run dev` 를 켜 둔다 (래블업 키가 있으면 DEMO_MODE 없이도 된다)
# 사용: bash data/smoke.sh [주소]   (기본 http://localhost:3000)
# 실행할 때마다 새 브라우저(새 매장)처럼 쿠키를 받아 쓴다. 데이터는 Supabase 에 남으므로 테스트 매장 id 를 마지막에 출력한다
set -euo pipefail
cd "$(dirname "$0")/.."
H=${1:-http://localhost:3000}
A=$H/api; J='content-type: application/json'
show() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));$1"; }
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
JAR=$(mktemp); JAR2=$(mktemp); trap 'rm -f "$JAR" "$JAR2"' EXIT
store_of() { curl -s -o /dev/null -c "$1" "$H/seller/diagnose"; awk '$6=="store_id"{print $7}' "$1"; }

step "0. 판매자 화면 첫 방문 → 브라우저별 매장 id 발급"
STORE=$(store_of "$JAR"); STORE2=$(store_of "$JAR2")
echo "브라우저 1: $STORE"; echo "브라우저 2: $STORE2"
[ -n "$STORE" ] && [ "$STORE" != "$STORE2" ] && echo "서로 다른 매장 ✓" || { echo "매장 id 발급 실패 ✗"; exit 1; }
S=$A/stores/$STORE
C=(-b "$JAR")

step "1. 재무 CSV 6종 업로드 (A의 업로드 → LLM 열 매핑 → 재무 행)"
for k in pos:pos_sales card_settlement:card_settlement delivery:delivery_settlement purchases:purchases fixed:fixed_costs payroll:payroll; do
  printf '%-16s ' "${k%%:*}"; curl -s "${C[@]}" -X POST -F requestedKind=${k%%:*} -F file=@data/sample/${k#*:}.csv $S/upload | show '
console.log(d.error ? "실패: " + d.error : d.recordCount + "행 → " + d.document.detectedKind)'
done

step "2. 분석"
curl -s "${C[@]}" -X POST $S/analyze | show '
console.log("월평균 매출", d.avgRevenue.value.toLocaleString(), d.avgRevenue.provenance, "| 영업이익", d.avgOperatingProfit.value.toLocaleString(), "| 이익률", d.margin, "| 중복 제거", d.dedupeCount);
console.log("점수", JSON.stringify(d.scores), "| 권리금 추정", d.valuation.premiumLow.toLocaleString(), "~", d.valuation.premiumHigh.toLocaleString());
console.log("월별 출처", d.months.map(m => m.month.slice(2) + ":" + {verified:"🟢",user_input:"🔵",needs_check:"🟠"}[m.revenue.provenance]).join(" "));
for (const a of d.anomalies) console.log(" -", a.severity.padEnd(6), a.detail);'

step "2-1. 같은 POS 파일을 한 번 더 올려도 매출이 그대로인지"
curl -s -o /dev/null "${C[@]}" -X POST -F requestedKind=pos -F file=@data/sample/pos_sales.csv $S/upload
curl -s "${C[@]}" -X POST $S/analyze | show 'console.log("월평균 매출", d.avgRevenue.value.toLocaleString(), d.avgRevenue.value === 28300000 ? "(그대로 ✓)" : "(바뀜 ✗)")'

step "3. 매각 보고서"
curl -s "${C[@]}" -X POST -H "$J" -d "{\"storeId\":\"$STORE\"}" $A/ai/report | show 'console.log(d.headline); console.log(d.summary)'

step "4. 판매 페이지 게시 (희망 권리금 1억 6,000만)"
LISTING=$(curl -s "${C[@]}" -X POST -H "$J" -d "{\"storeId\":\"$STORE\",\"premiumAsk\":160000000,\"deposit\":50000000,\"monthlyRent\":3000000,\"maintenanceFee\":350000,\"estInitialCost\":15000000,\"premiumBreakdown\":{\"facility\":40000000,\"goodwill\":110000000,\"other\":10000000},\"premiumBreakdownLevel\":\"approved\"}" $A/listings | show 'console.log(d.listingId ?? "")')
echo "listingId: $LISTING"
curl -s $A/listings | show "console.log(d.listings.some(l => l.id === '$LISTING') ? '매물 목록에 보임 ✓' : '매물 목록에 없음 ✗')"

step "5. 같은 매물을 역할별로 조회 (서버 공개 범위 필터)"
for r in buyer buyer_subscribed buyer_approved; do
  curl -s -H "Cookie: demo_role=$r" $A/listings/$LISTING | show "
const f=d.fields, s=(v)=>v&&v.locked?'🔒 '+v.level:'열림';
console.log('$r'.padEnd(17), '월평균 매출:', s(f.avgRevenue).padEnd(14), '권리금 구성:', s(f.premiumBreakdown).padEnd(12), '잠긴 항목:', JSON.stringify(d.lockedCount))"
done

step "6. 구매자 리스크 보고서 (구독 전 / 구독 후)"
for r in buyer buyer_subscribed; do
  echo "[$r]"; curl -s -X POST -H "$J" -H "Cookie: demo_role=$r" -d "{\"listingId\":\"$LISTING\"}" $A/ai/risk | show '
console.log(" 전체:", d.overall.level, "-", d.overall.one_liner);
for (const r of d.risks) console.log(" -", r.level.padEnd(6), r.title);'
done

step "7. 다른 브라우저는 이 매장을 못 건드리는지"
echo -n "브라우저 2 → 브라우저 1 facts 조회 → "; curl -s -o /dev/null -w '%{http_code}\n' -b "$JAR2" $S/facts
echo -n "브라우저 2 → 브라우저 1 분석       → "; curl -s -o /dev/null -w '%{http_code}\n' -b "$JAR2" -X POST $S/analyze
echo -n "쿠키 없이 → 브라우저 1 업로드      → "; curl -s -o /dev/null -w '%{http_code}\n' -X POST -F requestedKind=pos -F file=@data/sample/pos_sales.csv $S/upload
echo -n "브라우저 2 자기 매장 facts        → "; curl -s -b "$JAR2" $A/stores/$STORE2/facts | show 'console.log(Object.keys(d.facts).length + "개 (빈 상태에서 시작 ✓)")'

step "8. 잘못된 입력은 거절되는지"
echo -n "빈 파일 업로드     → "; curl -s "${C[@]}" -X POST -F requestedKind=pos -F file=@/dev/null $S/upload; echo
echo -n "권리금 구성 합 틀림 → "; curl -s "${C[@]}" -X POST -H "$J" -d "{\"storeId\":\"$STORE\",\"premiumAsk\":100,\"deposit\":0,\"monthlyRent\":0,\"maintenanceFee\":0,\"estInitialCost\":0,\"premiumBreakdown\":{\"facility\":1,\"goodwill\":1,\"other\":1},\"premiumBreakdownLevel\":\"public\"}" $A/listings; echo
echo -n "없는 매물         → "; curl -s -o /dev/null -w '%{http_code}\n' $A/listings/nope

printf '\n완료. 테스트 매장(Supabase에 남음): %s %s\n' "$STORE" "$STORE2"
