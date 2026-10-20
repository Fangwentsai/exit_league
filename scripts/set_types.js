// 全站唯一的「這一 SET 算 01 還是 Cricket」判斷來源。
//
// ⚠️ 這裡曾經出過事：某一版的 Apps Script 不讀資料裡的 type 欄位，
//    改用 SET 編號硬判，而且條件只寫了 6~10。結果 SET13（Cricket 雙人賽）、
//    SET14（Team Cricket）、SET16（四人賽 Cricket）全被算成 01，
//    第七屆 116 位出賽 10 局以上的選手有 107 位的 01/CR 拆分是錯的
//    （CR 出賽人次少算 53%）。合計場次與勝場不受影響，只有拆分會錯。
//
// 第六、七屆的對照完全一致，且每個 SET 的 type 都唯一，沒有例外：
const CR_SETS = [6, 7, 8, 9, 10, 13, 14, 16];
const O1_SETS = [1, 2, 3, 4, 5, 11, 12, 15];

function isCricketSet(set) {
    return CR_SETS.indexOf(Number(set)) !== -1;
}

// 判斷單一 SET。優先相信資料裡的 type —— game_result 的 type 欄位
// 第六、七屆共 180 場全部正確；沒有 type 時才用 SET 編號回推。
function isCricket(match) {
    if (match && typeof match.type === 'string' && match.type) {
        return match.type.toUpperCase() !== '01';
    }
    return isCricketSet(match && match.set);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CR_SETS, O1_SETS, isCricketSet, isCricket };
}
