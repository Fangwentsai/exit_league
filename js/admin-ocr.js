/**
 * Admin：拍照辨識分紙
 *
 * 流程：選好場次 → 拍照（含即時定位點偵測）→ 送 /api/analyze-scoresheet
 *      → 直接寫進 16 局表單，並在欄位上標色
 *
 * 辨識品質目前是兩種等級（見 SCORESHEET_OCR.md），所以標色而不是一律照填：
 *   先攻／勝負走影像處理，93.8%／87.5%，判不出來會誠實回 unclear，可以信任；
 *   姓名走 Gemini，信心分數不論對錯都落在 90~95，還沒有鑑別力。
 * 沒把握的填了但標黃底、讀不出來的留空標紅底，兩者都要人工過目。
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
            applyResult(data);
        } catch (err) {
            setStatus('連線失敗：' + err.message, 'bad');
        }
    }

    // 直接寫進表單，並在欄位上標色：
    //   黃底 = 讀到了但沒把握，請人工確認
    //   紅底 = 讀不出來，欄位留空，必須人工選
    // 使用者點過該欄位（不論是否真的改值）就視為已確認，標色消除。
    function mark(elem, level) {
        if (!elem) return;
        elem.classList.remove('ocr-warn', 'ocr-miss');
        if (level) elem.classList.add(level === 'warn' ? 'ocr-warn' : 'ocr-miss');
    }

    function playerCell(team, setNum) {
        return document.querySelector(`.team-button[data-set="${setNum}"][data-team="${team}"]`);
    }

    function applyResult(data) {
        lastResult = data;
        const sets = data.sets || [];
        let warn = 0, miss = 0;

        for (const s of sets) {
            const i = s.set;

            for (const [team, arr] of [['home', s.homePlayers], ['away', s.awayPlayers]]) {
                const list = arr || [];
                const readable = list.filter(p => p.name);
                const shaky = list.some(p => !p.name || p.strikethrough || p.notInRoster || p.confidence < NAME_CONFIDENCE_MIN);

                if (readable.length === list.length && list.length > 0) {
                    selectedPlayers[`${team}-${i}`] = readable.map(p => p.name);
                    mark(playerCell(team, i), shaky ? 'warn' : null);
                    if (shaky) warn++;
                } else {
                    // 有人讀不出來就整局留空——多人局只填一半，比空著更難檢查
                    delete selectedPlayers[`${team}-${i}`];
                    mark(playerCell(team, i), 'miss');
                    miss++;
                }
            }

            for (const [field, store, id] of [
                ['firstAttack', firstAttackData, `attack-set${i}`],
                ['winner', winLoseData, `win-set${i}`],
            ]) {
                const f = s[field];
                if (f && f.value !== 'unclear') {
                    store[i] = f.value;
                    // 影像判讀的信心來自兩格墨水覆蓋率的差距，差距小代表兩格看起來接近
                    const shaky = f.confidence < 60;
                    mark(el(id), shaky ? 'warn' : null);
                    if (shaky) warn++;
                } else {
                    delete store[i];
                    mark(el(id), 'miss');
                    miss++;
                }
            }
        }

        if (data.drinkingBonus && ['home', 'away'].includes(data.drinkingBonus.value)) {
            bonusTeam = data.drinkingBonus.value;
        }

        updateAllDisplays();
        markAsChanged();

        // 客觀驗算的結果比模型自報的信心可靠，優先講
        const cc = data.crossCheck || {};
        const alerts = [];
        if (data.deskew && !data.deskew.applied) {
            alerts.push('四角定位點沒抓到，這張沒做透視校正，先攻／勝負可信度會明顯下降，建議重拍');
        }
        if (!cc.sumValid) {
            alerts.push(`逐局勝負推算的比賽得分是 ${cc.computedHomePoints}:${cc.computedAwayPoints}，合計不等於 30 分，至少有一局讀錯或讀不出來`);
        }
        if ((cc.repeatViolations || []).length) {
            alerts.push('同組重複出賽：' + cc.repeatViolations.map(r => `${r.name}（SET${r.sets.join('、')}）`).join('、'));
        }

        const summary = `已填入表單。<b>黃底 ${warn} 項</b>請確認、<b>紅底 ${miss} 項</b>需自行選擇。點過該欄位即視為已確認。`;
        setStatus(
            summary + (alerts.length ? '<div class="ocr-notes">' + alerts.map(a => `<div>⚠️ ${a}</div>`).join('') + '</div>' : ''),
            miss || alerts.length ? 'bad' : 'ok'
        );
    }

    // 點過就當作已確認，把標色拿掉
    document.addEventListener('click', (e) => {
        const t = e.target.closest && e.target.closest('.ocr-warn, .ocr-miss');
        if (t) t.classList.remove('ocr-warn', 'ocr-miss');
    }, true);

    window.startScoresheetCapture = startCapture;
})();
