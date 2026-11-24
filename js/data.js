// ============================================================
// 《四季旅行记忆》 · 数据层
// 所有城市、日期、日记均为虚构示例内容，由程序生成。
// ============================================================

export const JOURNEY = {
  title: '四季旅行记忆',
  titleEn: 'A POP-UP JOURNEY',
  subtitle: '立体旅行手帖',
  year: '2024 — 2025',
};

// 四个章节：冬 → 春 → 夏 → 秋（按时间顺序）
export const CHAPTERS = [
  {
    id: 'winter', no: '01', season: '冬', seasonEn: 'WINTER',
    title: '雪国列车', city: '白泷町', region: '北雪原 · 雪国线',
    date: '2024.12.21 — 12.23', dateShort: '2024.12', weather: '小雪 · −6°C',
    accent: '#5b7fae', wash: '#dfe9f2',
    note: '十二月的白泷町，雪国线缓缓进站。站台、雪山与一张舍不得用掉的车票，都在书页里等着被打开。',
  },
  {
    id: 'spring', no: '02', season: '春', seasonEn: 'SPRING',
    title: '江南古镇', city: '杏花镇', region: '江南 · 杏水沿岸',
    date: '2025.03.28 — 03.30', dateShort: '2025.03', weather: '多云 · 14°C',
    accent: '#d989a4', wash: '#f6e7ec',
    note: '三月底的杏花镇，石桥把两岸的白墙民居缝在一起。摇橹船划过河道，樱花落在船头，像谁把春天折进了书页。',
  },
  {
    id: 'summer', no: '03', season: '夏', seasonEn: 'SUMMER',
    title: '夏日海岛', city: '青屿岛', region: '东海 · 屿南角',
    date: '2025.07.11 — 07.14', dateShort: '2025.07', weather: '晴 · 29°C',
    accent: '#3d96a8', wash: '#e2f0ee',
    note: '七月的青屿岛，渡轮的汽笛把夏天拉开。灯塔、白帆和一层层升起来的海浪，都被夹进了这本相册。',
  },
  {
    id: 'autumn', no: '04', season: '秋', seasonEn: 'AUTUMN',
    title: '秋日山野', city: '栎霜岭', region: '西岭 · 十里枫道',
    date: '2025.10.17 — 10.19', dateShort: '2025.10', weather: '晴转多云 · 12°C',
    accent: '#c4763a', wash: '#f4e8d8',
    note: '十月的栎霜岭，整座山都在慢慢变成琥珀色。帐篷、树林、山峰和一小堆篝火——旅程的最后一页，折成了完整的纸艺场景。',
  },
];

// 每章 4 张“与书页相连的照片”：拍立得 / 明信片 / 票根
// type: polaroid | postcard | ticket
export const PHOTOS = {
  // —— 冬 · 雪国列车 ——
  'winter-ticket': {
    chapter: 0, type: 'ticket',
    title: '雪国线 · 车票根', date: '2024.12.21', loc: '白泷町站 · 3号站台',
    diary: '08:15 的雪国线。检票员在票根上敲下小雪印章时，第一片雪正好落在我的肩上。我把票根夹进手帖——旅程从这一枚小小的纸片开始。',
    facts: ['车次 C-07 · 08:15 开', '12车 03F 靠窗', '终点 汤泽原'],
  },
  'winter-platform': {
    chapter: 0, type: 'polaroid',
    title: '站台的第一场雪', date: '2024.12.21', loc: '白泷町站',
    diary: '列车进站前，站台安静得能听见雪落。暖黄的站灯一盏盏亮起，我呵出的白气糊住了镜头——这张拍糊了，却是整个冬天最清楚的记忆。',
    facts: ['拍立得 · 胶卷 №03', '气温 −6°C'],
  },
  'winter-window': {
    chapter: 0, type: 'polaroid',
    title: '车窗外的雪山', date: '2024.12.22', loc: '雪国线 C-07 · 12车',
    diary: '列车爬坡时，整面车窗忽然被雪山填满。对面的老奶奶递给我一颗橘子：“看见这种山的人，一整年都会平平安安。”',
    facts: ['海拔 1,240 m', '车窗座位 03F'],
  },
  'winter-inn': {
    chapter: 0, type: 'postcard',
    title: '汤泽原温泉邮便', date: '2024.12.23', loc: '汤泽原 · 山之际旅馆',
    diary: '泡完露天风吕，发梢结了小小的冰。给朋友写这张明信片时我只写了一句：“雪把所有声音都收走了，只剩温泉在咕嘟咕嘟。”',
    facts: ['邮票 雪轮 63¥', '销戳 12.23 · 白泷町'],
  },

  // —— 春 · 江南古镇 ——
  'spring-bridge': {
    chapter: 1, type: 'postcard',
    title: '望杏桥邮便', date: '2025.03.28', loc: '杏花镇 · 望杏桥',
    diary: '桥头卖麦芽糖的阿婆说，这座桥比镇上最老的房子还要老。我把明信片投进桥边的绿色邮筒，收件人写了自己。',
    facts: ['邮票 杏花 80分', '销戳 03.28 · 杏花镇'],
  },
  'spring-boat': {
    chapter: 1, type: 'polaroid',
    title: '摇橹船', date: '2025.03.29', loc: '杏水河 · 石桥下',
    diary: '船娘摇橹的手势像在写毛笔字。倒影被橹切碎又拼好，樱瓣一路跟在船尾，追了我们半条河。',
    facts: ['拍立得 · 胶卷 №07', '水温 12°C'],
  },
  'spring-ticket': {
    chapter: 1, type: 'ticket',
    title: '摇橹船 · 票根', date: '2025.03.29', loc: '杏水码头',
    diary: '票根上印着“单程 · 石桥—杏林渡”。其实我们都坐了往返——船娘说，春天坐船的人，没有人舍得只看一遍。',
    facts: ['航线 石桥 → 杏林渡', '座位 东3', '票价 ¥45'],
  },
  'spring-lane': {
    chapter: 1, type: 'polaroid',
    title: '樱花巷', date: '2025.03.30', loc: '杏花镇 · 后街',
    diary: '窄巷深处的樱花开得比河边更疯。晾衣绳、蓝布门帘和粉白的花挤在一起——江南的春天从来不讲究留白。',
    facts: ['拍立得 · 胶卷 №09', '花开七分'],
  },

  // —— 夏 · 海岛 ——
  'summer-ticket': {
    chapter: 2, type: 'ticket',
    title: '青屿渡轮 · 票根', date: '2025.07.11', loc: '杏花镇渡口 → 青屿岛',
    diary: '渡轮离开杏花镇渡口时，我把江南的绿色留在了身后。两小时的甲板、咸咸的风——票根皱了，夏天从此开始。',
    facts: ['航线 杏花镇 → 青屿岛', '开航 09:30', '席别 甲板'],
  },
  'summer-lighthouse': {
    chapter: 2, type: 'polaroid',
    title: '屿南灯塔', date: '2025.07.12', loc: '青屿岛 · 屿南角',
    diary: '守塔人说灯塔已经亮了一百一十年。爬完 108 级旋转楼梯，风把汗水吹干——那一刻觉得，全世界的船都知道该往哪儿走。',
    facts: ['拍立得 · 胶卷 №12', '塔高 23 m'],
  },
  'summer-sail': {
    chapter: 2, type: 'postcard',
    title: '白帆湾邮便', date: '2025.07.13', loc: '青屿岛 · 白帆湾',
    diary: '船长让我把了十分钟舵，盖了邮戳的明信片在岛上小卖部就能寄出。我写：“浪是立起来的，我亲眼看见。”',
    facts: ['邮票 鲸浪 100分', '销戳 07.13 · 青屿岛'],
  },
  'summer-wave': {
    chapter: 2, type: 'polaroid',
    title: '追浪', date: '2025.07.14', loc: '月牙沙滩',
    diary: '退潮时浪会在沙滩上留下一层一层的白边，像这本书的折页。我们追着浪跑，谁也没抓得住夏天，但谁都没有输。',
    facts: ['拍立得 · 胶卷 №15', '潮位 退潮'],
  },

  // —— 秋 · 山野 ——
  'autumn-ticket': {
    chapter: 3, type: 'ticket',
    title: '林道巴士 · 票根', date: '2025.10.17', loc: '栎霜岭游客中心',
    diary: '末班林道巴士只到下午四点。司机大叔收走票根时说：“山里冷得快，帐篷要扎在背风的地方。”我把这句也记进了手帖。',
    facts: ['区间 游客中心 → 枫道口', '班次 15:40', '票价 ¥20'],
  },
  'autumn-camp': {
    chapter: 3, type: 'polaroid',
    title: '背风坡的营地', date: '2025.10.18', loc: '栎霜岭 · 二号营地',
    diary: '帐篷搭好的时候，正好有一阵风把整面山坡吹成金色。帐篷是明黄色的，像秋天故意留给我的一个小小的太阳。',
    facts: ['拍立得 · 胶卷 №18', '海拔 1,650 m'],
  },
  'autumn-fire': {
    chapter: 3, type: 'polaroid',
    title: '篝火与星', date: '2025.10.18', loc: '二号营地',
    diary: '篝火噼啪作响，火星往银河的方向飞。我们轮流讲这一年最想忘掉又最舍不得忘的事——火光把每张脸都照得很软。',
    facts: ['拍立得 · 胶卷 №19', '柴堆 松枝'],
  },
  'autumn-dawn': {
    chapter: 3, type: 'postcard',
    title: '望霜台日出邮便', date: '2025.10.19', loc: '栎霜岭 · 望霜台',
    diary: '凌晨五点半爬上望霜台，日出把三层山染成三种颜色。下山后寄出这张明信片，收件人写着：“明年，换个季节再见。”',
    facts: ['邮票 枫叶 120分', '销戳 10.19 · 栎霜岭'],
  },
};

// 章节之间的旅行路线（自动播放翻页时展示）
export const ROUTE = {
  stops: [
    { city: '白泷町', label: '冬 · 雪国列车', date: '2024.12', ch: 0 },
    { city: '杏花镇', label: '春 · 江南古镇', date: '2025.03', ch: 1 },
    { city: '青屿岛', label: '夏 · 海岛', date: '2025.07', ch: 2 },
    { city: '栎霜岭', label: '秋 · 山野', date: '2025.10', ch: 3 },
  ],
  legs: [
    { from: 0, to: 1, by: '列车', note: '雪国线 C-07 → 杏水快轮', hours: '约 6 小时' },
    { from: 1, to: 2, by: '渡轮', note: '青屿线 · 甲板席', hours: '约 2 小时' },
    { from: 2, to: 3, by: '巴士', note: '林道巴士 · 枫道口', hours: '约 4 小时' },
  ],
};
