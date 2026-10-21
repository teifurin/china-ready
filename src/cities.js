'use strict';
// Multilingual city aliases -> Chinese name used by flyai. `cn: true` = mainland China destination.
const CITIES = [
  // origins abroad
  { zh: '东京', cn: false, aliases: ['東京', '东京', 'tokyo', '도쿄', 'とうきょう'] },
  { zh: '大阪', cn: false, aliases: ['大阪', 'osaka', '오사카'] },
  { zh: '名古屋', cn: false, aliases: ['名古屋', 'nagoya', '나고야'] },
  { zh: '福冈', cn: false, aliases: ['福岡', '福冈', 'fukuoka', '후쿠오카'] },
  { zh: '札幌', cn: false, aliases: ['札幌', 'sapporo', '삿포로'] },
  { zh: '首尔', cn: false, aliases: ['ソウル', '首尔', 'seoul', '서울'] },
  { zh: '釜山', cn: false, aliases: ['釜山', 'busan', '부산'] },
  { zh: '新加坡', cn: false, aliases: ['シンガポール', '新加坡', 'singapore', '싱가포르'] },
  { zh: '曼谷', cn: false, aliases: ['バンコク', '曼谷', 'bangkok', '방콕'] },
  { zh: '伦敦', cn: false, aliases: ['ロンドン', '伦敦', 'london', '런던'] },
  { zh: '巴黎', cn: false, aliases: ['パリ', '巴黎', 'paris', '파리'] },
  { zh: '法兰克福', cn: false, aliases: ['フランクフルト', '法兰克福', 'frankfurt', '프랑크푸르트'] },
  { zh: '纽约', cn: false, aliases: ['ニューヨーク', '纽约', 'new york', '뉴욕'] },
  { zh: '洛杉矶', cn: false, aliases: ['ロサンゼルス', '洛杉矶', 'los angeles', '로스앤젤레스'] },
  { zh: '旧金山', cn: false, aliases: ['サンフランシスコ', '旧金山', 'san francisco', '샌프란시스코'] },
  { zh: '悉尼', cn: false, aliases: ['シドニー', '悉尼', 'sydney', '시드니'] },
  // mainland China
  { zh: '上海', cn: true, aliases: ['上海', 'shanghai', '상하이', 'シャンハイ'] },
  { zh: '杭州', cn: true, aliases: ['杭州', 'hangzhou', '항저우', 'ハンジョウ'] },
  { zh: '北京', cn: true, aliases: ['北京', 'beijing', 'peking', '베이징', 'ペキン'] },
  { zh: '西安', cn: true, aliases: ['西安', "xi'an", 'xian', '시안', 'シーアン'] },
  { zh: '成都', cn: true, aliases: ['成都', 'chengdu', '청두'] },
  { zh: '重庆', cn: true, aliases: ['重慶', '重庆', 'chongqing', '충칭'] },
  { zh: '广州', cn: true, aliases: ['広州', '广州', 'guangzhou', '광저우'] },
  { zh: '深圳', cn: true, aliases: ['深セン', '深圳', 'shenzhen', '선전'] },
  { zh: '苏州', cn: true, aliases: ['蘇州', '苏州', 'suzhou', '쑤저우'] },
  { zh: '南京', cn: true, aliases: ['南京', 'nanjing', '난징'] },
  { zh: '桂林', cn: true, aliases: ['桂林', 'guilin', '구이린'] },
  { zh: '厦门', cn: true, aliases: ['厦門', '厦门', 'アモイ', 'xiamen', '샤먼'] },
  { zh: '青岛', cn: true, aliases: ['青島', '青岛', 'qingdao', '칭다오'] },
  { zh: '哈尔滨', cn: true, aliases: ['ハルビン', '哈尔滨', 'harbin', '하얼빈'] },
  { zh: '张家界', cn: true, aliases: ['張家界', '张家界', 'zhangjiajie', '장자제'] },
  { zh: '长沙', cn: true, aliases: ['長沙', '长沙', 'changsha', '창사'] },
  { zh: '武汉', cn: true, aliases: ['武漢', '武汉', 'wuhan', '우한'] },
  { zh: '昆明', cn: true, aliases: ['昆明', 'kunming', '쿤밍'] },
  { zh: '大理', cn: true, aliases: ['大理', 'dali', '다리'] },
  { zh: '丽江', cn: true, aliases: ['麗江', '丽江', 'lijiang', '리장'] },
  { zh: '三亚', cn: true, aliases: ['三亜', '三亚', 'sanya', '싼야'] },
  { zh: '天津', cn: true, aliases: ['天津', 'tianjin', '톈진'] },
];

function findCities(text) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const c of CITIES) {
    let best = -1;
    for (const a of c.aliases) {
      const i = lower.indexOf(a.toLowerCase());
      if (i >= 0 && (best < 0 || i < best)) best = i;
    }
    if (best >= 0) hits.push({ ...c, pos: best });
  }
  return hits.sort((a, b) => a.pos - b.pos);
}

const byZh = (zh) => CITIES.find((c) => c.zh === zh);
module.exports = { CITIES, findCities, byZh };
