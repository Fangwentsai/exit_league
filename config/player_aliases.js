// 選手改名／改暱稱對照表。
//
// 這個聯賽沒有選手 ID 系統，跨屆生涯資料只能靠「姓名」比對同一個人，
// 但暱稱常常會變（換隊、簡稱、結婚改稱呼...），單純比對姓名字串會把
// 同一個人的生涯拆成好幾筆、也可能把不同人的同名字串誤merge。
//
// 這裡手動記錄「已確認是同一個人」的姓名＋隊伍組合，用 id 當內部識別鍵
// （刻意跟任何真實姓名字串不同，避免跟未列在這裡的同名不同人衝突），
// canonicalName 是要顯示在生涯頁面上的名字（通常用該選手目前最新的暱稱）。
//
// 目前只收錄「已確認」的改名案例；沒有列在這裡的同名狀況（例如第4屆的
// 兩個「小孟」、兩個「小宇」）一律視為不同人，各自獨立顯示，不合併生涯數字。
const PLAYER_ALIASES = [
  {
    id: 'xiaomeng_taoshengrukou',
    canonicalName: '小孟',
    identities: [
      { name: '孟瑄', team: '逃生入口A' }, // 第4、5屆
      { name: '小孟', team: '逃生入口' },  // 第6屆
      { name: '小孟', team: '逃生Zoo口' }, // 第7屆（隊名又改了）
    ],
  },
  {
    id: 'fanjiangjie_vivi',
    canonicalName: '范姜',
    identities: [
      { name: '范姜姐', team: '酒空組' },     // 第4、5屆
      { name: '范姜姐', team: 'VIVI哈哈隊' }, // 第6屆，換隊
      { name: '范姜', team: '哈哈隊' },       // 第7屆，改叫范姜（隊名也簡化了）
    ],
  },
  {
    id: 'fanjianggege_jiukong',
    canonicalName: '范姜哥',
    identities: [
      { name: '范姜哥', team: '酒空組' }, // 第4、5屆
      { name: '范姜', team: '酒空組' },   // 第6屆，簡稱「范姜」，之後未再出賽
    ],
  },
  {
    id: 'jiexi_taoshengrukouc',
    canonicalName: '傑西',
    identities: [
      { name: 'Jesse', team: '逃生入口C' }, // 第4屆
      { name: '傑西', team: '逃生入口C' },  // 第5屆
      { name: 'Jesse', team: '逃生入口' },  // 第6屆
      { name: '傑西', team: '酒空組' },     // 第7屆，換隊
    ],
  },
  {
    id: 'sunge_taoshengrukouc',
    canonicalName: '隼哥',
    identities: [
      { name: '隼隼', team: '逃生入口C' }, // 第4屆
      { name: '阿隼', team: '逃生入口C' }, // 第5屆
      { name: '隼隼', team: '逃生入口' },  // 第6屆
      { name: '隼', team: '逃生Zoo口' },   // 第7屆
    ],
  },
  {
    id: 'mark_vivi',
    canonicalName: 'Mark',
    identities: [
      { name: '馬克', team: 'VIVI哈哈隊' }, // 第5、6屆
      { name: 'Mark', team: '哈哈隊' },     // 第7屆，改用英文拼法（隊名也簡化了）
    ],
  },
  {
    id: 'david_vivi',
    canonicalName: 'David',
    identities: [
      { name: 'david', team: 'VIVI哈哈隊' }, // 第6屆（小寫）
      { name: 'David', team: '哈哈隊' },     // 第7屆（改成大寫開頭）
    ],
  },
  {
    id: 'xiaofei_yibiaokaitianmen',
    canonicalName: '小飛',
    identities: [
      { name: '飛', team: '一鏢開天門' },        // 第4、5屆
      { name: '小飛', team: 'Tonight29十三么' },  // 第6屆，換隊
      { name: '小飛', team: '有點傻' },           // 第7屆，再換隊
    ],
  },
  {
    id: 'hong_yibiaokaitianmen',
    canonicalName: '宏',
    identities: [
      { name: '宏哥', team: '一鏢開天門' }, // 第4屆
      { name: '宏', team: '一鏢開天門' },   // 第5屆
      { name: '宏哥', team: '有點傻' },     // 第7屆，第6屆沒打，換隊又改回宏哥
    ],
  },
  {
    id: 'xiaodong_taoshengrukouc',
    canonicalName: '小東',
    identities: [
      { name: '偶素小東', team: '逃生入口C' }, // 第4屆
      { name: '小東', team: '逃生入口C' },     // 第5屆
    ],
  },
  {
    id: 'xiaoqi_yibiaokaitianmen',
    canonicalName: '小齊',
    identities: [
      { name: 'chi', team: '一鏢開天門' },       // 第4屆
      { name: 'Chi', team: '一鏢開天門' },       // 第5屆
      { name: '小齊', team: 'Tonight29十三么' }, // 第6屆，換隊改用中文名
      { name: '小齊', team: '有點傻' },          // 第7屆
    ],
  },
  {
    id: 'labaruo_huangbo',
    canonicalName: '黃渤',
    identities: [
      { name: '喇叭', team: '逃生入口A' }, // 第4、5屆
      { name: '黃渤', team: '哈哈隊' },    // 第7屆，第6屆沒打、換隊改名
    ],
  },
  {
    id: 'gan_vivi',
    canonicalName: '淦',
    identities: [
      { name: '阿淦', team: 'Vivi朝酒晚舞' }, // 第4屆
      { name: '阿淦', team: 'VIVI嘻嘻隊' },   // 第5、6屆
      { name: '淦', team: '嘻嘻隊' },         // 第7屆，去掉「阿」（隊名也簡化了）
    ],
  },
  {
    id: 'houhou_vivi',
    canonicalName: '猴猴',
    identities: [
      { name: '猴子', team: 'Vivi朝酒晚舞' },        // 第4屆
      { name: '猴子', team: 'VIVI嘻嘻隊' },          // 第5屆
      { name: '猴猴', team: 'Tonight29十三么' },     // 第6屆，換隊改名
      { name: '猴猴', team: 'Tonight29發財隊' },     // 第7屆
    ],
  },
  {
    // 注意：一鏢開天門也有一個「丹」（第4、5屆），跟這位是完全不同人，
    // 不要合併——這裡只收錄 Vivi 系列隊伍「老丹」這條線。
    id: 'laodan_vivi',
    canonicalName: '老丹',
    identities: [
      { name: '老丹', team: 'Vivi朝酒晚舞' }, // 第4屆
      { name: '老丹', team: 'VIVI嘻嘻隊' },   // 第5、6屆
      { name: '丹', team: '嘻嘻隊' },         // 第7屆，去掉「老」（隊名也簡化了）
    ],
  },
];
