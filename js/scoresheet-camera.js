/**
 * 分紙拍照元件（含即時定位點偵測）
 *
 * 用法：
 *     const shot = await ScoresheetCamera.open();     // 使用者取消會回傳 null
 *     if (shot) console.log(shot.dataUrl, shot.width, shot.height);
 *
 * 為什麼要自己接相機而不用 <input capture>：系統相機無法疊圖層，也就無法在
 * 按快門前告訴使用者「四個定位點都抓到了」。實測顯示只要有一個定位點沒入鏡，
 * 伺服器端的透視校正就會整個失敗，塗黑框判讀得退回給語言模型，正確率從
 * 九成掉到五成——與其拍完才發現要重拍，不如在按下快門前就擋住。
 *
 * 偵測成本（iPhone 實測，1080x1920 相機、400 寬偵測）：
 *     getImageData 35~37ms、演算法 4~5ms，每 120ms 跑一次，預覽維持 52fps。
 *     瓶頸在把畫面從 GPU 讀回 CPU，不在演算法本身。
 */
(function (global) {
    'use strict';

    // ===== 定位點偵測 =====
    //
    // 演算法與門檻刻意與 api/_lib/deskew.js 保持一致，只是降低解析度做即時預覽。
    // 預覽只需要判斷「四個角有沒有抓到」，不需要最終校正那種 2~4px 的精度。
    //
    // ⚠️ 目前是與伺服器端各自維護的兩份實作。門檻若有調整，兩邊都要改。

    const SHEET_MARK_ASPECT = 1.403; // 四個定位點中心構成的矩形，高/寬
    const PROC_WIDTH = 400;          // 偵測解析度（實測誤差 5px、演算 4~5ms）
    const GUIDE_MARGIN = 0.10;       // 導引框離畫面邊緣的比例
    const DETECT_INTERVAL = 120;     // 偵測間隔（ms）

    function buildIntegrals(gray, W, H) {
        const S = new Float64Array((W + 1) * (H + 1));
        for (let y = 0; y < H; y++) {
            let rowSum = 0;
            for (let x = 0; x < W; x++) {
                rowSum += gray[y * W + x];
                S[(y + 1) * (W + 1) + (x + 1)] = S[y * (W + 1) + (x + 1)] + rowSum;
            }
        }
        return S;
    }

    function regionMean(S, W, H, x1, y1, x2, y2) {
        x1 = Math.max(0, Math.floor(x1)); y1 = Math.max(0, Math.floor(y1));
        x2 = Math.min(W, Math.ceil(x2)); y2 = Math.min(H, Math.ceil(y2));
        const w1 = W + 1;
        const area = (x2 - x1) * (y2 - y1);
        if (area <= 0) return 255;
        return (S[y2 * w1 + x2] - S[y1 * w1 + x2] - S[y2 * w1 + x1] + S[y1 * w1 + x1]) / area;
    }

    function darkRun(S, W, H, cx, cy, dx, dy, thickness, maxDist, step, bright) {
        let d = 0;
        while (d < maxDist) {
            const nx = cx + dx * d, ny = cy + dy * d;
            const m = dx !== 0
                ? regionMean(S, W, H, nx - step / 2, ny - thickness / 2, nx + step / 2, ny + thickness / 2)
                : regionMean(S, W, H, nx - thickness / 2, ny - step / 2, nx + thickness / 2, ny + step / 2);
            if (m > bright) break;
            d += step;
        }
        return d;
    }

    function markScore(S, W, H, cx, cy, half, ringOuter) {
        const centerMean = regionMean(S, W, H, cx - half, cy - half, cx + half, cy + half);
        if (centerMean > 170) return null;
        const outerMean = regionMean(S, W, H, cx - ringOuter / 2, cy - ringOuter / 2, cx + ringOuter / 2, cy + ringOuter / 2);
        const contrast = outerMean - centerMean;
        if (contrast < 30) return null;

        // 亮暗分界依當地亮度算，不能寫死——同一張照片不同角落的紙面亮度差很多
        // （實測上方 224、左下角只有 110~143）
        const bright = centerMean + contrast * 0.6;
        const thickness = half * 1.2, step = Math.max(2, half * 0.4), maxDist = half * 6;
        // 定位點四周都留白，往四個方向走都該很快碰到亮色；
        // 紙張的外角落只有兩個方向是亮的，用這點把它排除
        if (darkRun(S, W, H, cx, cy, -1, 0, thickness, maxDist, step, bright) >= maxDist) return null;
        if (darkRun(S, W, H, cx, cy, 1, 0, thickness, maxDist, step, bright) >= maxDist) return null;
        if (darkRun(S, W, H, cx, cy, 0, -1, thickness, maxDist, step, bright) >= maxDist) return null;
        if (darkRun(S, W, H, cx, cy, 0, 1, thickness, maxDist, step, bright) >= maxDist) return null;

        return { x: cx, y: cy, contrast };
    }

    function collect(S, W, H, x1, y1, x2, y2, markSize, out) {
        const half = markSize / 2, ringOuter = markSize * 1.8;
        const step = Math.max(2, Math.round(markSize / 4));
        for (let cy = Math.max(half, y1); cy < Math.min(H - half, y2); cy += step) {
            for (let cx = Math.max(half, x1); cx < Math.min(W - half, x2); cx += step) {
                const r = markScore(S, W, H, cx, cy, half, ringOuter);
                if (r) out.push(r);
            }
        }
    }

    /**
     * 給四個候選點評分。anchors 是導引框四角，當作位置先驗。
     *
     * 為什麼用導引框而不是「用已知三點推第四點」：拍歪的紙是梯形不是平行四邊形，
     * 用 bl = tl + br - tr 推算，實測誤差達畫面寬度的 19%（上下邊長差 25% 造成），
     * 遠大於定位點本身的大小。既然畫面上已經要求使用者把定位點對進框裡，
     * 框的位置就是更可靠的先驗——但只當作偏好而非硬性條件。
     */
    function scoreQuad(tl, tr, bl, br, anchors) {
        if (!(tl.x < tr.x && bl.x < br.x && tl.y < bl.y && tr.y < br.y)) return null;
        const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
        const top = d(tl, tr), bot = d(bl, br), left = d(tl, bl), right = d(tr, br);
        if (top < 1 || left < 1) return null;
        if (Math.min(top, bot) / Math.max(top, bot) < 0.65) return null;
        if (Math.min(left, right) / Math.max(left, right) < 0.65) return null;

        const w = (top + bot) / 2, h = (left + right) / 2;
        const aspectErr = Math.abs(h / w - SHEET_MARK_ASPECT) / SHEET_MARK_ASPECT;
        if (aspectErr > 0.3) return null;

        let score = w * h * (1 + (tl.contrast + tr.contrast + bl.contrast + br.contrast) / 400) / (1 + aspectErr * 5);
        if (anchors) {
            const diag = Math.hypot(anchors.br.x - anchors.tl.x, anchors.br.y - anchors.tl.y) || 1;
            const off = (d(tl, anchors.tl) + d(tr, anchors.tr) + d(bl, anchors.bl) + d(br, anchors.br)) / (4 * diag);
            score /= (1 + off * 2.5);
        }
        return score;
    }

    function detectMarks(gray, W, H, anchors) {
        const S = buildIntegrals(gray, W, H);
        const sizes = [W * 0.018, W * 0.025, W * 0.035, W * 0.05];
        const M = 0.38;
        const wins = {
            tl: [0, 0, W * M, H * M],
            tr: [W * (1 - M), 0, W, H * M],
            bl: [0, H * (1 - M), W * M, H],
            br: [W * (1 - M), H * (1 - M), W, H],
        };
        const per = {};
        for (const k in wins) {
            const [a, b, c, dd] = wins[k];
            const all = [];
            for (const ms of sizes) collect(S, W, H, a, b, c, dd, ms, all);
            all.sort((p, q) => q.contrast - p.contrast);
            const picked = [];
            for (const cand of all) {
                if (picked.some(p => Math.hypot(p.x - cand.x, p.y - cand.y) < sizes[1])) continue;
                picked.push(cand);
                if (picked.length >= 6) break; // 多留候選，交給 scoreQuad 挑
            }
            per[k] = picked;
        }
        let best = null;
        for (const tl of per.tl) for (const tr of per.tr) for (const bl of per.bl) for (const br of per.br) {
            const s = scoreQuad(tl, tr, bl, br, anchors);
            if (s !== null && (!best || s > best.score)) best = { score: s, tl, tr, bl, br };
        }
        return { corners: best, counts: { tl: per.tl.length, tr: per.tr.length, bl: per.bl.length, br: per.br.length } };
    }

    function guideRect(vw, vh) {
        const availW = vw * (1 - GUIDE_MARGIN * 2), availH = vh * (1 - GUIDE_MARGIN * 2);
        let gw = availW, gh = gw * SHEET_MARK_ASPECT;
        if (gh > availH) { gh = availH; gw = gh / SHEET_MARK_ASPECT; }
        return { x: (vw - gw) / 2, y: (vh - gh) / 2, w: gw, h: gh };
    }

    // ===== 介面 =====

    const CSS = `
.sc-root{position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;
  font-family:"Noto Sans TC","PingFang TC",-apple-system,sans-serif;color:#eee;height:100dvh;width:100vw;overflow:hidden}
.sc-stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000}
.sc-stage video,.sc-stage img{width:100%;height:100%;object-fit:cover;display:block}
.sc-overlay{position:absolute;pointer-events:none}
.sc-close-btn{position:absolute;top:calc(12px + env(safe-area-inset-top));right:16px;width:38px;height:38px;border-radius:50%;
  background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.25);
  color:#fff;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:25;
  transition:transform 0.15s ease,background 0.15s ease}
.sc-close-btn:active{transform:scale(0.9);background:rgba(0,0,0,0.8)}
.sc-tip{position:absolute;top:0;left:0;right:0;padding:calc(12px + env(safe-area-inset-top)) 60px 14px 16px;
  background:linear-gradient(to bottom,rgba(0,0,0,0.85),rgba(0,0,0,0));font-size:12px;line-height:1.5;text-align:center;
  pointer-events:none;z-index:10;color:rgba(255,255,255,0.95)}
.sc-status{position:absolute;bottom:calc(105px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);
  z-index:15;font-size:13.5px;font-weight:700;padding:8px 20px;border-radius:20px;text-align:center;white-space:nowrap;
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none;
  transition:all 0.25s ease}
.sc-ok{background:rgba(20,83,45,0.9);color:#86efac;border:1px solid rgba(134,239,172,0.35)}
.sc-bad{background:rgba(76,29,29,0.9);color:#fca5a5;border:1px solid rgba(252,165,165,0.35)}

.sc-controls-overlay{position:absolute;bottom:0;left:0;right:0;padding:12px 28px calc(24px + env(safe-area-inset-bottom));
  background:linear-gradient(to top,rgba(0,0,0,0.85),rgba(0,0,0,0));z-index:15;display:flex;justify-content:center;
  align-items:center;pointer-events:none}
.sc-controls-row{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:320px;pointer-events:auto}
.sc-side-spacer{width:48px;height:48px}

.sc-shutter-btn{width:72px;height:72px;border-radius:50%;border:4px solid #fff;background:transparent;padding:3px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.15s ease;
  box-shadow:0 4px 14px rgba(0,0,0,0.35);-webkit-tap-highlight-color:transparent}
.sc-shutter-inner{width:100%;height:100%;border-radius:50%;background:#fff;display:block;transition:transform 0.15s ease,background 0.15s ease}
.sc-shutter-btn:disabled{opacity:0.45;cursor:not-allowed}
.sc-shutter-btn:not(:disabled):active{transform:scale(0.93)}
.sc-shutter-btn:not(:disabled):active .sc-shutter-inner{transform:scale(0.88);background:#e2e8f0}

.sc-torch-btn{width:48px;height:48px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.4);background:rgba(0,0,0,0.4);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;font-size:20px;display:flex;align-items:center;
  justify-content:center;cursor:pointer;transition:all 0.2s ease;-webkit-tap-highlight-color:transparent}
.sc-torch-btn:disabled{opacity:0.3;cursor:not-allowed}
.sc-torch-btn.sc-torch-on{background:#eab308;color:#000;border-color:#eab308;box-shadow:0 0 14px rgba(234,179,8,0.65)}
.sc-torch-btn:not(:disabled):active{transform:scale(0.9)}

.sc-preview-btns{display:flex;gap:16px;width:100%;max-width:320px;pointer-events:auto}
.sc-action-btn{flex:1;height:48px;font:inherit;font-size:15px;font-weight:600;border-radius:24px;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:transform 0.15s ease,background 0.15s ease}
.sc-action-retake{background:rgba(255,255,255,0.22);color:#fff;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.sc-action-retake:active{background:rgba(255,255,255,0.38);transform:scale(0.96)}
.sc-action-use{background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,0.45)}
.sc-action-use:active{background:#1d4ed8;transform:scale(0.96)}
.sc-stats{position:absolute;bottom:140px;left:10px;right:10px;background:rgba(0,0,0,0.8);border:1px solid #333;
  border-radius:6px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.5;
  white-space:pre-wrap;pointer-events:none;z-index:20}
`;

    let cssInjected = false;
    function injectCss() {
        if (cssInjected) return;
        const el = document.createElement('style');
        el.textContent = CSS;
        document.head.appendChild(el);
        cssInjected = true;
    }

    /**
     * 開啟拍照介面。回傳 Promise：
     *   使用者確認 → { dataUrl, width, height }
     *   使用者取消 → null
     */
    function open(options) {
        options = options || {};
        injectCss();

        return new Promise((resolve) => {
            const root = document.createElement('div');
            root.className = 'sc-root';
            root.innerHTML = `
<div class="sc-stage">
  <video playsinline muted autoplay></video>
  <img hidden alt="">
  <canvas class="sc-overlay"></canvas>
  <button class="sc-close-btn" data-act="cancel" title="關閉">✕</button>
  <div class="sc-tip">把分紙<b>攤平壓好</b>，四個角的黑方塊對進綠色框內<br>光線不足時可開啟閃光燈，但紙面若出現反光白斑請關掉</div>
  <div class="sc-status sc-bad">啟動相機中…</div>
  <div class="sc-controls-overlay">
    <div class="sc-controls-row" id="scControlsRow">
      <div class="sc-side-spacer"></div>
      <button class="sc-shutter-btn" data-act="shoot" disabled title="拍照">
        <span class="sc-shutter-inner"></span>
      </button>
      <button class="sc-torch-btn" data-act="torch" disabled title="閃光燈">⚡</button>
    </div>
  </div>
</div>`;
            document.body.appendChild(root);

            const stage = root.querySelector('.sc-stage');
            const video = root.querySelector('video');
            const photo = root.querySelector('img');
            const overlay = root.querySelector('.sc-overlay');
            const octx = overlay.getContext('2d');
            const tip = root.querySelector('.sc-tip');
            const statusEl = root.querySelector('.sc-status');
            const controlsRow = root.querySelector('#scControlsRow');
            const btn = (a) => root.querySelector(`[data-act="${a}"]`);

            let statsEl = null;
            if (options.showStats) {
                statsEl = document.createElement('div');
                statsEl.className = 'sc-stats';
                stage.appendChild(statsEl);
            }

            const work = document.createElement('canvas');
            const wctx = work.getContext('2d', { willReadFrequently: true });

            let stream = null, track = null, torchOn = false, torchOk = false;
            let running = false, lastDetect = 0, lastResult = null, capturing = false;
            let timings = { read: 0, detect: 0, fps: 0 };
            let frameCount = 0, fpsMark = performance.now();

            function cleanup() {
                running = false;
                if (stream) stream.getTracks().forEach(t => t.stop());
                root.remove();
            }

            function finish(value) {
                cleanup();
                resolve(value);
            }

            (async function start() {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: { ideal: 'environment' },
                            width: { ideal: 1920 }, height: { ideal: 1080 },
                        },
                        audio: false,
                    });
                } catch (err) {
                    statusEl.className = 'sc-status sc-bad';
                    statusEl.textContent = '無法開啟相機：' + err.name;
                    tip.innerHTML = '請確認已允許相機權限。<br>若是從 LINE 或其他 App 內開啟，請改用 Safari 或 Chrome。';
                    return;
                }
                video.srcObject = stream;
                await video.play();
                track = stream.getVideoTracks()[0];

                const caps = track.getCapabilities ? track.getCapabilities() : null;
                torchOk = !!(caps && caps.torch);
                if (btn('torch')) btn('torch').disabled = !torchOk;
                if (btn('shoot')) btn('shoot').disabled = false;

                running = true;
                requestAnimationFrame(loop);
            })();

            root.onclick = async (e) => {
                const target = e.target.closest ? e.target.closest('[data-act]') : null;
                if (!target) return;
                const act = target.getAttribute('data-act');
                if (!act) return;

                if (act === 'cancel') return finish(null);

                if (act === 'torch') {
                    torchOn = !torchOn;
                    try {
                        await track.applyConstraints({ advanced: [{ torch: torchOn }] });
                        if (btn('torch')) btn('torch').classList.toggle('sc-torch-on', torchOn);
                    } catch (err) {
                        if (btn('torch')) btn('torch').disabled = true;
                    }
                    return;
                }

                if (act === 'shoot') return capture();
                if (act === 'retake') return retake();
                if (act === 'use') return finish(capturing);
            };

            // 拍下目前畫面後停在預覽狀態，讓使用者決定重拍或採用
            function capture() {
                const c = document.createElement('canvas');
                c.width = video.videoWidth;
                c.height = video.videoHeight;
                c.getContext('2d').drawImage(video, 0, 0);
                capturing = {
                    dataUrl: c.toDataURL('image/jpeg', 0.92),
                    width: c.width,
                    height: c.height,
                };

                running = false;
                photo.src = capturing.dataUrl;
                photo.hidden = false;
                video.hidden = true;
                overlay.style.display = 'none';
                tip.style.display = 'none';

                statusEl.className = 'sc-status sc-ok';
                statusEl.textContent = '這張可以嗎？';
                controlsRow.innerHTML =
                    '<div class="sc-preview-btns">' +
                    '  <button class="sc-action-btn sc-action-retake" data-act="retake">重拍</button>' +
                    '  <button class="sc-action-btn sc-action-use" data-act="use">使用這張</button>' +
                    '</div>';
            }

            function retake() {
                capturing = false;
                photo.hidden = true;
                video.hidden = false;
                overlay.style.display = '';
                tip.style.display = '';
                controlsRow.innerHTML =
                    '<div class="sc-side-spacer"></div>' +
                    '<button class="sc-shutter-btn" data-act="shoot" title="拍照"><span class="sc-shutter-inner"></span></button>' +
                    '<button class="sc-torch-btn' + (torchOn ? ' sc-torch-on' : '') + '" data-act="torch"' + (torchOk ? '' : ' disabled') + ' title="閃光燈">⚡</button>';
                running = true;
                lastDetect = 0;
                requestAnimationFrame(loop);
            }

            function loop() {
                if (!running) return;
                frameCount++;
                const now = performance.now();
                if (now - fpsMark > 1000) {
                    timings.fps = frameCount * 1000 / (now - fpsMark);
                    frameCount = 0; fpsMark = now;
                }
                if (now - lastDetect > DETECT_INTERVAL && video.videoWidth) {
                    lastDetect = now;
                    runDetection();
                }
                requestAnimationFrame(loop);
            }

            function runDetection() {
                const vw = video.videoWidth, vh = video.videoHeight;
                const W = PROC_WIDTH, H = Math.round(PROC_WIDTH * vh / vw);
                work.width = W; work.height = H;

                const t0 = performance.now();
                wctx.drawImage(video, 0, 0, W, H);
                const img = wctx.getImageData(0, 0, W, H);
                const t1 = performance.now();

                const gray = new Uint8Array(W * H);
                const d = img.data;
                for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
                    gray[i] = (d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) / 1000;
                }

                const g = guideRect(W, H);
                const anchors = {
                    tl: { x: g.x, y: g.y }, tr: { x: g.x + g.w, y: g.y },
                    bl: { x: g.x, y: g.y + g.h }, br: { x: g.x + g.w, y: g.y + g.h },
                };
                const res = detectMarks(gray, W, H, anchors);
                const t2 = performance.now();

                timings.read = t1 - t0;
                timings.detect = t2 - t1;
                lastResult = { res, W, H, vw, vh };
                draw();
            }

            function draw() {
                if (!lastResult) return;
                const { res, W, H, vw, vh } = lastResult;

                // 疊圖層要對齊 video 實際渲染出來的方框（影像會等比縮放置中）
                const vr = video.getBoundingClientRect(), sr = stage.getBoundingClientRect();
                overlay.style.left = (vr.left - sr.left) + 'px';
                overlay.style.top = (vr.top - sr.top) + 'px';
                overlay.style.width = vr.width + 'px';
                overlay.style.height = vr.height + 'px';
                overlay.width = vw; overlay.height = vh;
                octx.clearRect(0, 0, vw, vh);

                const sx = vw / W, sy = vh / H;
                const found = !!res.corners;

                const g = guideRect(vw, vh);
                const lw = Math.max(3, vw * 0.005);
                octx.strokeStyle = found ? 'rgba(80,220,120,0.55)' : 'rgba(255,255,255,0.4)';
                octx.lineWidth = lw;
                octx.setLineDash([vw * 0.02, vw * 0.02]);
                octx.strokeRect(g.x, g.y, g.w, g.h);
                octx.setLineDash([]);

                const arm = Math.min(g.w, g.h) * 0.12;
                octx.lineWidth = lw * 1.8;
                for (const [cx, cy, dx, dy] of [
                    [g.x, g.y, 1, 1], [g.x + g.w, g.y, -1, 1],
                    [g.x, g.y + g.h, 1, -1], [g.x + g.w, g.y + g.h, -1, -1],
                ]) {
                    octx.beginPath();
                    octx.moveTo(cx + dx * arm, cy);
                    octx.lineTo(cx, cy);
                    octx.lineTo(cx, cy + dy * arm);
                    octx.stroke();
                }

                if (found) {
                    const c = res.corners;
                    octx.strokeStyle = 'rgba(80,220,120,1)';
                    octx.lineWidth = lw;
                    octx.beginPath();
                    octx.moveTo(c.tl.x * sx, c.tl.y * sy);
                    octx.lineTo(c.tr.x * sx, c.tr.y * sy);
                    octx.lineTo(c.br.x * sx, c.br.y * sy);
                    octx.lineTo(c.bl.x * sx, c.bl.y * sy);
                    octx.closePath();
                    octx.stroke();
                    octx.fillStyle = 'rgba(80,220,120,0.95)';
                    for (const k of ['tl', 'tr', 'bl', 'br']) {
                        octx.beginPath();
                        octx.arc(c[k].x * sx, c[k].y * sy, vw * 0.011, 0, Math.PI * 2);
                        octx.fill();
                    }
                }

                statusEl.className = 'sc-status ' + (found ? 'sc-ok' : 'sc-bad');
                statusEl.textContent = found ? '✓ 四個定位點都抓到了，可以拍' : '✗ 尚未抓到四個定位點';

                if (statsEl) {
                    const cc = res.counts;
                    statsEl.textContent =
                        `相機 ${vw}x${vh}   偵測 ${W}x${H}   ${timings.fps.toFixed(0)} fps\n` +
                        `讀取畫面 ${timings.read.toFixed(1)} ms  (getImageData)\n` +
                        `偵測演算 ${timings.detect.toFixed(1)} ms\n` +
                        `候選數   tl=${cc.tl} tr=${cc.tr} bl=${cc.bl} br=${cc.br}`;
                }
            }
        });
    }

    global.ScoresheetCamera = { open, _internal: { detectMarks, guideRect, SHEET_MARK_ASPECT } };
})(window);
