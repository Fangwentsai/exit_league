/**
 * Admin：拍照辨識分紙
 *
 * 流程：選好場次 → 拍照（含即時定位點偵測）→ 送 /api/analyze-scoresheet
 *      → 顯示逐局辨識結果 → 使用者確認後才套用到表單
 *
 * 為什麼不自動套用：辨識品質目前是兩種等級（見 SCORESHEET_OCR.md）——
 *   先攻／勝負走影像處理，93.8%／87.5%，判不出來會誠實回 unclear，可以信任；
 *   姓名走 Gemini，信心分數不論對錯都落在 90~95，還沒有鑑別力。
 * 所以套用時只填「有把握」的欄位，其餘留空讓人工補，並且整批要使用者按下確認。
 */
(function () {
    'use strict';

    // 姓名要達到這個信心才自動填入。塗改過的格子在伺服器端已扣 50 分，
    // 會自動落在這個門檻之下（見 SCORESHEET_OCR.md 發現 15）。
    const NAME_CONFIDENCE_MIN = 85;

    const TEAM_NAME_MAP = {
        'VIVI朝酒晚舞': 'Vivi朝酒晚舞',
        'Vivi朝酒晚舞': 'Vivi朝酒晚舞',
    };
    const normalizeTeam = (n) => TEAM_NAME_MAP[n] || n;

    let lastResult = null;

    function el(id) { return document.getElementById(id); }

    function setStatus(html, kind) {
        const box = el('ocrStatus');
        if (!box) return;
        box.className = 'ocr-status' + (kind ? ' ocr-' + kind : '');
        box.innerHTML = html;
    }

    async function startCapture() {
        if (!window.currentGame && typeof currentGame === 'undefined') {
            alert('請先選擇比賽場次');
            return;
        }
        const game = window.currentGame || currentGame;
        if (!game) {
            alert('請先選擇比賽場次');
            return;
        }

        const players = window.playersData || (typeof playersData !== 'undefined' ? playersData : {});
        const homeRoster = players[normalizeTeam(game.home)];
        const awayRoster = players[normalizeTeam(game.away)];
        if (!homeRoster || !awayRoster) {
            alert(`找不到隊伍名單\n主隊：${game.home}\n客隊：${game.away}`);
            return;
        }

        const shot = await ScoresheetCamera.open();
        if (!shot) return;

        setStatus('辨識中…（約需 5~15 秒）', 'busy');
        el('ocrResult').innerHTML = '';

        try {
            const resp = await fetch('/api/analyze-scoresheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: shot.dataUrl,
                    gameCode: game.id,
                    homeTeam: game.home,
                    awayTeam: game.away,
                    homeRoster,
                    awayRoster,
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                setStatus('辨識失敗：' + (data.error || resp.status), 'bad');
                return;
            }
            lastResult = data;
            renderResult(data);
        } catch (err) {
            setStatus('連線失敗：' + err.message, 'bad');
        }
    }

    function renderResult(data) {
        const sets = data.sets || [];
        const cc = data.crossCheck || {};

        // 先讓使用者知道整體狀況，再看逐局細節
        const notes = [];
        if (data.deskew && !data.deskew.applied) {
            notes.push('⚠️ 四角定位點沒抓到，這張沒有做透視校正，先攻／勝負的可信度會明顯下降，建議重拍');
        }
        if (data.checkboxSource === 'gemini') {
            notes.push('⚠️ 塗黑框改由語言模型判讀（因為沒有校正成功），準確率大約只有五成');
        }
        if (!cc.sumValid) {
            notes.push(`⚠️ 逐局勝負推算出的比賽得分是 ${cc.computedHomePoints}:${cc.computedAwayPoints}，兩隊合計不等於 30 分，代表至少有一局讀錯或讀不出來`);
        }
        if ((cc.repeatViolations || []).length) {
            const v = cc.repeatViolations.map(r => `${r.name}（SET${r.sets.join('、')}）`).join('、');
            notes.push(`⚠️ 同組重複出賽：${v}，違反出賽限制，代表有認錯人`);
        }
        if ((cc.unclearSets || []).length) {
            notes.push(`ℹ️ SET${cc.unclearSets.join('、')} 的勝負判讀不出來，需要手動選`);
        }

        const rows = sets.map(s => {
            const fa = s.firstAttack || {}, w = s.winner || {};
            const names = (arr) => (arr || []).map(p => {
                const cls = p.name === null ? 'ocr-miss'
                    : (p.strikethrough || p.notInRoster || p.confidence < NAME_CONFIDENCE_MIN) ? 'ocr-low' : 'ocr-hi';
                const mark = p.strikethrough ? '✎' : '';
                return `<span class="${cls}">${p.name === null ? '？' : p.name}${mark}</span>`;
            }).join(' ');
            const side = (f) => {
                if (!f || f.value === 'unclear') return '<span class="ocr-miss">？</span>';
                const cls = f.confidence >= 60 ? 'ocr-hi' : 'ocr-low';
                return `<span class="${cls}">${f.value === 'home' ? '主' : '客'}</span>`;
            };
            return `<tr><td>${s.set}</td><td>${names(s.homePlayers)}</td>` +
                `<td>${side(fa)}</td><td>${side(w)}</td>` +
                `<td>${names(s.awayPlayers)}</td></tr>`;
        }).join('');

        setStatus('辨識完成，請先核對再套用', 'ok');
        el('ocrResult').innerHTML =
            (notes.length ? `<div class="ocr-notes">${notes.map(n => `<div>${n}</div>`).join('')}</div>` : '') +
            `<table class="ocr-table"><thead><tr><th>SET</th><th>主隊</th><th>先攻</th><th>勝</th><th>客隊</th></tr></thead>` +
            `<tbody>${rows}</tbody></table>` +
            `<div class="ocr-legend"><span class="ocr-hi">綠</span>=可信　<span class="ocr-low">黃</span>=需確認（含塗改 ✎）　<span class="ocr-miss">？</span>=讀不出來，會留空</div>` +
            `<button class="ocr-apply" id="ocrApplyBtn">套用到表單（只填有把握的欄位）</button>`;

        el('ocrApplyBtn').onclick = applyToForm;
    }

    function applyToForm() {
        if (!lastResult) return;
        const filled = { name: 0, fa: 0, win: 0 };
        const skipped = [];

        for (const s of lastResult.sets || []) {
            const i = s.set;

            for (const [team, arr] of [['home', s.homePlayers], ['away', s.awayPlayers]]) {
                const good = (arr || [])
                    .filter(p => p.name && !p.strikethrough && !p.notInRoster && p.confidence >= NAME_CONFIDENCE_MIN)
                    .map(p => p.name);
                // 只有整局的人都讀到才填——多人局填一半反而更難檢查
                if (good.length === (arr || []).length && good.length > 0) {
                    selectedPlayers[`${team}-${i}`] = good;
                    filled.name += good.length;
                } else {
                    skipped.push(`SET${i} ${team === 'home' ? '主' : '客'}隊選手`);
                }
            }

            if (s.firstAttack && s.firstAttack.value !== 'unclear') {
                firstAttackData[i] = s.firstAttack.value;
                filled.fa++;
            } else {
                skipped.push(`SET${i} 先攻`);
            }

            if (s.winner && s.winner.value !== 'unclear') {
                winLoseData[i] = s.winner.value;
                filled.win++;
            } else {
                skipped.push(`SET${i} 勝負`);
            }
        }

        if (lastResult.drinkingBonus && ['home', 'away'].includes(lastResult.drinkingBonus.value)) {
            bonusTeam = lastResult.drinkingBonus.value;
        }

        updateAllDisplays();
        markAsChanged();

        alert(
            `已填入：選手 ${filled.name} 人次、先攻 ${filled.fa}/16、勝負 ${filled.win}/16\n\n` +
            (skipped.length
                ? `以下欄位辨識不夠有把握，留空給你手動填（共 ${skipped.length} 項）：\n` + skipped.slice(0, 12).join('\n') + (skipped.length > 12 ? `\n…等 ${skipped.length} 項` : '')
                : '全部欄位都已填入，仍請核對一次再送出。')
        );
    }

    window.startScoresheetCapture = startCapture;
})();
