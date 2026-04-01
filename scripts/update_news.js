const fs = require('fs');

let html = fs.readFileSync('pages/news.html', 'utf8');

// Replace 團隊總分排行
html = html.replace(
  /<th>總分<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
  `<th>總分</th>
                    </tr>
                    <tr><td>1</td><td>Vivi哈哈隊</td><td>201</td></tr>
                    <tr><td>2</td><td>酒空組</td><td>198</td></tr>
                    <tr><td>3</td><td>軟飯硬吃</td><td>185</td></tr>
                    <tr><td>4</td><td>人生揪難</td><td>184</td></tr>
                    <tr><td>5</td><td>Tonight29十三么</td><td>177</td></tr>
                    <tr><td>6</td><td>Vivi嘻嘻隊</td><td>165</td></tr>
                    <tr><td>7</td><td>人生揪亮</td><td>162</td></tr>
                    <tr><td>8</td><td>Tonight29大四喜</td><td>154</td></tr>
                    <tr><td>9</td><td>逃生入口</td><td>139</td></tr>
                    <tr><td>10</td><td>傑克黑桃</td><td>138</td></tr>
                    <tr><td>11</td><td>Tonight29大三元</td><td>124</td></tr>
                    <tr><td>12</td><td>傑克紅心</td><td>106</td></tr>
                </table>`
);

// Replace 個人勝場排行
html = html.replace(
  /<th>勝場數<\/th>\s*<\/tr>\s*<tr>\s*<td>[\s\S]*?<\/table>/,
  `<th>勝場數</th>
                    </tr>
                    <tr><td>Tonight29十三么</td><td>小齊</td><td>47</td></tr>
                    <tr><td>Tonight29十三么</td><td>猴猴</td><td>46</td></tr>
                    <tr><td>人生揪難</td><td>小蘇</td><td>41</td></tr>
                    <tr><td>Tonight29十三么</td><td>小飛</td><td>41</td></tr>
                    <tr><td>酒空組</td><td>瘦子</td><td>35</td></tr>
                </table>`
);

// Replace Top Lady
html = html.replace(
  /<h3 class="section-title">Top Lady 🌹<\/h3>\s*<table class="ranking-table">\s*<tr>\s*<th>隊名<\/th>\s*<th>姓名<\/th>\s*<th>勝場數<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
  `<h3 class="section-title">Top Lady 🌹</h3>
                <table class="ranking-table">
                    <tr>
                        <th>隊名</th>
                        <th>姓名</th>
                        <th>勝場數</th>
                    </tr>
                    <tr><td>Tonight29十三么</td><td>Keira</td><td>21</td></tr>
                    <tr><td>Tonight29大三元</td><td>+0</td><td>19</td></tr>
                    <tr><td>酒空組</td><td>羊羊</td><td>13</td></tr>
                    <tr><td>Tonight29大三元</td><td>貓咪</td><td>13</td></tr>
                    <tr><td>人生揪難</td><td>joy</td><td>12</td></tr>
                </table>`
);

// Replace 地獄倒霉鬼
html = html.replace(
  /<th>先攻機率<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
  `<th>先攻機率</th>
                    </tr>
                    <tr><td>VIVI哈哈隊</td><td>kelvin刺</td><td>21.43%</td></tr>
                    <tr><td>Tonight29十三么</td><td>朋朋</td><td>26.67%</td></tr>
                    <tr><td>逃生入口</td><td>小孟</td><td>27.27%</td></tr>
                    <tr><td>傑克黑桃</td><td>小琪</td><td>27.27%</td></tr>
                    <tr><td>Tonight29大四喜</td><td>小雨</td><td>28.57%</td></tr>
                </table>`
);

// Add News
const newNews = `                <div class="news-item collapsible">
                    <div class="news-header expanded">
                        <div class="news-date">2026/4/1</div>
                        <div class="news-title">🎯 第六屆難找的聯賽：Vivi哈哈隊突破200分大關穩居龍頭！十三么小齊正式超越猴猴登頂勝場王！</div>
                    </div>
                    <div class="news-text expanded">
                        各位選手與飛鏢同好們，本週賽事結束，戰況依舊激烈，各項排行榜也出現了令人驚豔的變化！讓我們來看看本週焦點：
                        <br><br>
                        <strong>🔥 本週焦點一：Vivi哈哈隊突破200分大關，酒空組緊追在後！</strong><br>
                        團隊排行榜上，<strong>Vivi哈哈隊</strong>以<strong>201分</strong>的分數持續霸佔龍頭，展現強大的全隊戰力！而<strong>酒空組</strong>也不遑多讓，以<strong>198分</strong>的微小差距緊追在後，隨時準備超車。中段班的競爭同樣白熱化，<strong>軟飯硬吃（185分）</strong>與<strong>人生揪難（184分）</strong>僅有1分之差，<strong>Tonight29十三么（177分）</strong>則名列第五，前五名的龍爭虎鬥讓整個聯賽充滿懸念！
                        <br><br>
                        <strong>🏆 本週焦點二：勝場王易主？！小齊以47勝正式超越猴猴！</strong><br>
                        個人勝場排行榜迎來了歷史性的一刻！Tonight29十三么的內戰中，<strong>小齊</strong>以<strong>47勝</strong>的傲人成績，正式超越隊友<strong>猴猴（46勝）</strong>登頂榜首！而人生揪難的<strong>小蘇</strong>與十三么的<strong>小飛</strong>則以<strong>41勝</strong>並列第三，酒空組的<strong>瘦子（35勝）</strong>卡位第五。隨著賽季推進，這場神仙打架只會越來越精彩！
                        <br><br>
                        <strong>🌹 Top Lady 動態：Keira 21勝穩坐后座，+0緊咬不放！</strong><br>
                        女子組的競爭依舊激烈，Tonight29十三么的<strong>Keira</strong>以突破二字頭的<strong>21勝</strong>繼續稱后，但大三元的<strong>+0（19勝）</strong>僅有2勝的差距，隨時可能翻盤！酒空組的<strong>羊羊</strong>與大三元的<strong>貓咪</strong>同以13勝並列第三，人生揪難的<strong>joy（12勝）</strong>也強勢上榜卡位第五。
                        <br><br>
                        <strong>💀 地獄倒霉鬼：kelvin刺搶下衰神寶座！</strong><br>
                        本週地獄倒霉鬼排行榜大洗牌，VIVI哈哈隊的<strong>kelvin刺</strong>以<strong>21.43%</strong>的可憐先攻機率「榮登」榜首，Tonight29十三么的<strong>朋朋（26.67%）</strong>居次。雖然常被對手搶到先攻，但這也是展現後手逆轉實力的好機會！
                        <br><br>
                        <strong>📊 賽事展望：下週賽程大預測（4/7）</strong><br>
                        下週4/7的賽程絕對是火星撞地球！<br>
                        首推<strong>軟飯硬吃 vs Tonight29十三么</strong>：目前排名第三對上第五，十三么神仙打架的火力能否壓制住近況極佳的軟飯硬吃？這絕對是一場不容錯過的巔峰對決！<br>
                        另外<strong>人生揪難 vs Vivi哈哈隊</strong>：排名前段班的強力碰撞，揪難能否撼動哈哈隊的霸主地位？<br>
                        其他焦點賽事：<br>
                        - Vivi嘻嘻隊 vs Tonight29大四喜<br>
                        - Tonight29大三元 vs 人生揪亮<br>
                        - 酒空組 vs 傑克黑桃<br>
                        - 逃生入口 vs 傑克紅心<br>
                        強強碰撞，誰能笑到最後？讓我們拭目以待！
                        <br><br>
                        <em>※ 本新聞由 AI 自動生成，賽事數據以官方公告為準</em>
                    </div>
                </div>\n`;

html = html.replace(/<div class="news-content" id="newsContent">\s*<div class="news-item collapsible">/, '<div class="news-content" id="newsContent">\n' + newNews + '                <div class="news-item collapsible">');

// Collapse the previous latest news
html = html.replace(
  /<div class="news-header expanded">\s*<div class="news-date">2026\/3\/25<\/div>/,
  '<div class="news-header">\n                        <div class="news-date">2026/3/25</div>'
);
html = html.replace(
  /<div class="news-text expanded">\s*各位選手與飛鏢同好們，本週激戰過後，排行榜迎來了/,
  '<div class="news-text collapsed">\n                        各位選手與飛鏢同好們，本週激戰過後，排行榜迎來了'
);

fs.writeFileSync('pages/news.html', html, 'utf8');
console.log('Update Complete!');
