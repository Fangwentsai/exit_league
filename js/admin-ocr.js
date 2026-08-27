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

    // 用 Canvas 壓縮圖片，避免手機高畫質相片 (6MB~15MB+) 突破 Vercel 4.5MB Payload 限制
    function compressImage(dataUrl, maxDim = 2048, quality = 0.85) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }

    // 解析 API 回應，若非 JSON (例如 413 / 504 HTML Error 頁面) 則捕捉中文提示
    async function parseApiResponse(resp) {
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await resp.json();
        }
        const text = await resp.text();
        if (resp.status === 413 || text.includes('Request Entity Too Large')) {
            throw new Error('相片檔案過大 (HTTP 413)，請重新拍攝或選擇較小檔案');
        }
        if (resp.status === 504 || resp.status === 502) {
            throw new Error('伺服器處理超時 (HTTP ' + resp.status + ')，請重新嘗試');
        }
        throw new Error(`伺服器回應異常 (HTTP ${resp.status})`);
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

        setStatus('圖檔處理與辨識中…（約需 5~15 秒）', 'busy');
        showOcrProgressModal();

        try {
            const compressedImage = await compressImage(shot.dataUrl);
            const resp = await fetch('/api/analyze-scoresheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: compressedImage,
                    gameCode: game.id,
                    homeTeam: game.home,
                    awayTeam: game.away,
                    homeRoster,
                    awayRoster,
                }),
            });
            const data = await parseApiResponse(resp);
            setOcrProgressComplete(() => {
                if (!resp.ok) {
                    setStatus('辨識失敗：' + (data.error || resp.status), 'bad');
                    return;
                }
                applyResult(data);
            });
        } catch (err) {
            hideOcrProgressModal();
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

        // 彈出 AI 辨識分析結果視窗（提醒使用者請勿重複上傳，並列出無法判讀項目與建議）
        showOcrResultModal(data, summary, alerts, warn, miss);
    }

    // 彈出視窗（Modal）：顯示分析結果、無法判讀項目與分析建議
    function showOcrResultModal(data, summary, alerts, warn, miss) {
        let modal = el('ocrResultModalOverlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ocrResultModalOverlay';
            modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:999999; padding:20px;';
            document.body.appendChild(modal);
        }

        // 收集判讀不出來/疑慮的項目
        const missDetails = [];
        const sets = (data && data.sets) || [];
        for (const s of sets) {
            const missingHome = (s.homePlayers || []).filter(p => !p.name);
            const missingAway = (s.awayPlayers || []).filter(p => !p.name);
            if (missingHome.length) missDetails.push(`SET${s.set} 主隊選手筆跡不清晰或無對應名冊`);
            if (missingAway.length) missDetails.push(`SET${s.set} 客隊選手筆跡不清晰或無對應名冊`);
            if (s.firstAttack && s.firstAttack.value === 'unclear') missDetails.push(`SET${s.set} 先攻方框不清晰`);
            if (s.winner && s.winner.value === 'unclear') missDetails.push(`SET${s.set} 勝負方框不清晰`);
        }

        // 收集實際辨識出的名單外手寫暱稱（未對應到名冊者）
        const unmappedNames = Array.from(new Set(
            sets.flatMap(s => [...(s.homePlayers || []), ...(s.awayPlayers || [])])
                .filter(p => p && p.notInRoster && p.name)
                .map(p => p.name)
        ));

        // 收集動態 AI 分析建議 (根據本次量測數據產生，不使用死板寫死的範例)
        const recommendations = [];
        if (data.deskew && !data.deskew.applied) {
            recommendations.push('📸 <b>拍攝建議</b>：四角定位點未完整入鏡，致使透視校正未啟用。下次請將照片四角落黑色方塊完整拍入。');
        }
        if (missDetails.some(d => d.includes('方框不清晰'))) {
            recommendations.push('🖋️ <b>填寫建議</b>：部分先攻/勝負方框筆跡偏淡或使用原子筆勾選，建議提醒記錄員使用<b>深色水性筆塗滿</b>。');
        }
        if (unmappedNames.length > 0) {
            recommendations.push(`🔤 <b>名冊別名建議</b>：手寫字 <b>${unmappedNames.join('、')}</b> 在名冊中未找到直接對應，若為隊員常用暱稱，可於選手資料庫補齊別名檔。`);
        }
        if (data.crossCheck && !data.crossCheck.sumValid) {
            recommendations.push(`⚠️ <b>總分驗算提醒</b>：逐局推算比賽得分為 ${data.crossCheck.computedHomePoints}:${data.crossCheck.computedAwayPoints}，合計不等於 30 分，請優先確認紅底與黃底欄位。`);
        }

        const alertsHtml = alerts.length
            ? `<div style="background:#fff3cd; border:1px solid #ffeba2; color:#856404; padding:10px 14px; border-radius:6px; margin-top:10px; font-size:13px; text-align:left;">` +
              alerts.map(a => `<div style="margin-bottom:4px;">⚠️ ${a}</div>`).join('') +
              `</div>`
            : '';

        const missHtml = missDetails.length
            ? `<div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 14px; border-radius:6px; margin-top:10px; font-size:13px; text-align:left; max-height:120px; overflow-y:auto;">` +
              `<div style="font-weight:bold; margin-bottom:4px;">🔍 待補充與人工確認項目 (${missDetails.length} 項)：</div>` +
              missDetails.map(m => `<div style="margin-bottom:2px;">• ${m}</div>`).join('') +
              `</div>`
            : '';

        const recHtml = recommendations.length
            ? `<div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:10px 14px; border-radius:6px; margin-top:10px; font-size:13px; text-align:left;">` +
              `<div style="font-weight:bold; margin-bottom:4px;">💡 AI 分析與改善建議：</div>` +
              recommendations.map(r => `<div style="margin-bottom:4px;">${r}</div>`).join('') +
              `</div>`
            : '';

        modal.innerHTML = `
            <div style="background:#fff; width:100%; max-width:500px; border-radius:12px; padding:24px; box-shadow:0 12px 30px rgba(0,0,0,0.4); text-align:center; font-family:sans-serif; line-height:1.5; max-height:90vh; overflow-y:auto;">
                <div style="font-size:36px; margin-bottom:6px;">🤖</div>
                <h3 style="margin:0 0 12px; color:#222; font-size:20px; font-weight:700;">AI 分紙辨識分析完成</h3>
                
                <!-- 醒目提醒框：強烈提醒勿重複上傳 -->
                <div style="background:#f8d7da; border:2px solid #f5c6cb; color:#721c24; padding:12px 14px; border-radius:8px; font-weight:bold; font-size:14px; margin-bottom:14px; text-align:left;">
                    <div style="font-size:15px; color:#721c24; margin-bottom:2px; font-weight:bold;">⚠️ 重要提醒：數據已自動寫入下方表單</div>
                    <div style="font-size:13.5px; color:#495057; font-weight:normal; line-height:1.4;">
                        辨識數據已帶入下方比賽表單，<b>請勿重複上傳照片或重新拍攝</b>！請直接在下方表單進行確認或微調。
                    </div>
                </div>

                <div style="background:#f8f9fa; border:1px solid #e9ecef; padding:12px 14px; border-radius:8px; font-size:13.5px; color:#333; text-align:left;">
                    <div>📊 <b>辨識統計</b>：${summary}</div>
                    ${alertsHtml}
                    ${missHtml}
                    ${recHtml}
                </div>

                <div style="margin-top:16px;">
                    <button onclick="document.getElementById('ocrResultModalOverlay').style.display='none'" style="background:#1769d6; color:#fff; border:none; padding:11px 24px; font-size:15px; border-radius:6px; font-weight:bold; cursor:pointer; width:100%;">
                        瞭解，前往確認與微調下方表單
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    // 相片檔案上傳處理功能
    function startUpload() {
        if (!window.currentGame && typeof currentGame === 'undefined') {
            alert('請先選擇比賽場次');
            return;
        }
        const game = window.currentGame || currentGame;
        if (!game) {
            alert('請先選擇比賽場次');
            return;
        }

        const fileInput = el('scoresheetFileInput');
        if (fileInput) fileInput.click();
    }

    async function handleFileSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

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

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const rawDataUrl = evt.target.result;
            setStatus('相片壓縮與分析中…（約需 5~15 秒）', 'busy');
            showOcrProgressModal();

            try {
                const compressedImage = await compressImage(rawDataUrl);
                const resp = await fetch('/api/analyze-scoresheet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: compressedImage,
                        gameCode: game.id,
                        homeTeam: game.home,
                        awayTeam: game.away,
                        homeRoster,
                        awayRoster,
                    }),
                });
                const data = await parseApiResponse(resp);
                setOcrProgressComplete(() => {
                    if (!resp.ok) {
                        setStatus('辨識失敗：' + (data.error || resp.status), 'bad');
                        return;
                    }
                    applyResult(data);
                });
            } catch (err) {
                hideOcrProgressModal();
                setStatus('連線失敗：' + err.message, 'bad');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    // ===== 動態進度條 Pop-up 視窗 =====
    let ocrProgressTimer = null;
    let currentPercent = 0;
    let targetPercent = 0;
    let currentStageText = '';
    let currentStageIcon = '📤';

    function showOcrProgressModal() {
        let modal = el('ocrProgressModalOverlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ocrProgressModalOverlay';
            modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:999999; padding:20px;';
            document.body.appendChild(modal);
        }

        // 單一主視覺色 #1769d6，無漸層
        modal.innerHTML = `
            <div style="background:#fff; width:100%; max-width:440px; border-radius:12px; padding:28px 24px; box-shadow:0 12px 30px rgba(0,0,0,0.4); text-align:center; font-family:sans-serif;">
                <div style="font-size:40px; margin-bottom:12px;" id="ocrProgressIcon">📤</div>
                <h3 style="margin:0 0 16px; color:#222; font-size:19px; font-weight:700;" id="ocrProgressTitle">AI 分紙分析中...</h3>
                
                <div style="background:#e9ecef; border-radius:10px; height:12px; width:100%; overflow:hidden; margin-bottom:16px; position:relative;">
                    <div id="ocrProgressBarFill" style="background:#1769d6; height:100%; width:0%; transition:width 0.1s linear;"></div>
                </div>

                <div style="font-size:14px; color:#495057; font-weight:600; min-height:24px;" id="ocrProgressStepLabel">
                    照片上傳與預處理中... (0%)
                </div>
            </div>
        `;
        modal.style.display = 'flex';

        currentPercent = 0;
        targetPercent = 10;
        currentStageText = '照片上傳與透視校正中...';
        currentStageIcon = '📤';

        if (ocrProgressTimer) clearInterval(ocrProgressTimer);
        let elapsedMs = 0;

        ocrProgressTimer = setInterval(() => {
            elapsedMs += 70;

            // 依指示重配進度條比例：
            // 1. 照片上傳校正：0% ~ 10% (前 0.8 秒)
            // 2. AI 辨識分析：10% ~ 70% (耗時主體 0.8~8 秒，佔據 60%~70% 比例)
            // 3. 準備帶入表單：70% ~ 98% (8 秒後，佔據 30% 比例)
            if (elapsedMs < 800) {
                targetPercent = 10;
                currentStageText = '照片上傳與透視校正中...';
                currentStageIcon = '📤';
            } else if (elapsedMs < 8000) {
                targetPercent = 70;
                currentStageText = 'AI 辨識選手姓名與先攻勝負中...';
                currentStageIcon = '🧠';
            } else {
                targetPercent = 98;
                currentStageText = '準備自動帶入表單...';
                currentStageIcon = '⏳';
            }

            // 平滑以 1% 為單位累加
            if (currentPercent < targetPercent) {
                currentPercent++;
                renderProgressUI();
            }
        }, 70);
    }

    function renderProgressUI() {
        const fill = el('ocrProgressBarFill');
        const text = el('ocrProgressStepLabel');
        const iconEl = el('ocrProgressIcon');
        if (fill) fill.style.width = currentPercent + '%';
        if (text) text.textContent = `${currentStageText} (${currentPercent}%)`;
        if (iconEl && currentStageIcon) iconEl.textContent = currentStageIcon;
    }

    function setOcrProgressComplete(callback) {
        if (ocrProgressTimer) {
            clearInterval(ocrProgressTimer);
            ocrProgressTimer = null;
        }

        currentStageText = '解析完成，自動寫入表單中...';
        currentStageIcon = '✅';

        // 快速平滑推到 100%
        const finishTimer = setInterval(() => {
            if (currentPercent < 100) {
                currentPercent += 2;
                if (currentPercent > 100) currentPercent = 100;
                renderProgressUI();
            } else {
                clearInterval(finishTimer);
                setTimeout(() => {
                    hideOcrProgressModal();
                    if (callback) callback();
                }, 400);
            }
        }, 30);
    }

    function hideOcrProgressModal() {
        if (ocrProgressTimer) {
            clearInterval(ocrProgressTimer);
            ocrProgressTimer = null;
        }
        const modal = el('ocrProgressModalOverlay');
        if (modal) modal.style.display = 'none';
    }

    // 點過就當作已確認，把標色拿掉
    document.addEventListener('click', (e) => {
        const t = e.target.closest && e.target.closest('.ocr-warn, .ocr-miss');
        if (t) t.classList.remove('ocr-warn', 'ocr-miss');
    }, true);

    window.startScoresheetCapture = startCapture;
    window.startScoresheetUpload = startUpload;
    window.handleScoresheetFileSelect = handleFileSelect;
})();
