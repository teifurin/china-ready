'use strict';
/**
 * "Show-to-staff" cards: big Simplified Chinese text for staff + gloss in the traveller's language.
 * Templates are fixed, human-written phrases (no LLM needed, so they work in mock mode too).
 * Place names/addresses are inserted verbatim from flyai data, so staff see the official Chinese name.
 */
const T = {
  taxi: {
    zh: (p) => `师傅您好，请带我去这里：\n${p.name}${p.address ? `\n地址：${p.address}` : ''}`,
    en: (p) => `Hello driver, please take me here: ${p.label || p.name}`,
    ja: (p) => `運転手さん、ここまでお願いします：${p.label || p.name}`,
    ko: (p) => `기사님, 여기로 가 주세요: ${p.label || p.name}`,
  },
  ticket: {
    zh: (p) => `您好，我想买 ${p.count} 张票：\n${p.ticketName || '门票'}\n（${p.name}）\n我用外国护照，可以买吗？`,
    en: (p) => `Hello, I'd like ${p.count} ticket(s): ${p.ticketName || 'admission'} (${p.label || p.name}). I have a foreign passport — can I buy with it?`,
    ja: (p) => `こんにちは。チケットを${p.count}枚ください：${p.ticketName || '入場券'}（${p.label || p.name}）。外国のパスポートで購入できますか？`,
    ko: (p) => `안녕하세요. 표 ${p.count}장 사고 싶어요: ${p.ticketName || '입장권'} (${p.label || p.name}). 외국 여권으로 살 수 있나요?`,
  },
  directions: {
    zh: (p) => `您好，请问去「${p.name}」怎么走？\n可以在地图上指给我看吗？谢谢！`,
    en: (p) => `Excuse me, how do I get to "${p.label || p.name}"? Could you show me on the map? Thank you!`,
    ja: (p) => `すみません、「${p.label || p.name}」へはどう行けばいいですか？地図で教えていただけますか？`,
    ko: (p) => `실례합니다, "${p.label || p.name}"에 어떻게 가나요? 지도로 알려 주실 수 있나요? 감사합니다!`,
  },
  checkin: {
    zh: (p) => `您好，我在飞猪预订了房间，这是我的护照。\n酒店：${p.name}\n入住 ${p.checkIn} ～ 退房 ${p.checkOut}`,
    en: (p) => `Hello, I booked a room on Fliggy. Here is my passport. Hotel: ${p.label || p.name}, ${p.checkIn} – ${p.checkOut}.`,
    ja: (p) => `こんにちは。Fliggy（飛猪）で予約しました。パスポートです。ホテル：${p.label || p.name}、${p.checkIn}〜${p.checkOut}`,
    ko: (p) => `안녕하세요. Fliggy(페이주)에서 예약했어요. 여권 여기 있습니다. 호텔: ${p.label || p.name}, ${p.checkIn} ~ ${p.checkOut}`,
  },
  train: {
    zh: (p) => `您好，请问 ${p.no} 次列车（${p.from} → ${p.to}，${p.time} 开）\n在哪个检票口？我是用护照买的票。`,
    en: (p) => `Hello, which gate is train ${p.no} (${p.from} → ${p.to}, departs ${p.time})? I bought the ticket with my passport.`,
    ja: (p) => `すみません、${p.no}列車（${p.from}→${p.to}、${p.time}発）の改札はどこですか？パスポートで切符を買いました。`,
    ko: (p) => `실례합니다, ${p.no} 열차(${p.from} → ${p.to}, ${p.time} 출발) 개찰구가 어디예요? 여권으로 표를 샀어요.`,
  },
  ordering: {
    zh: () => `您好，请推荐一两道本店的招牌菜。\n我不太能吃辣，谢谢！\n可以用支付宝 / 微信付款吗？`,
    en: () => `Hello, could you recommend one or two signature dishes? I can't eat very spicy food. Can I pay with Alipay / WeChat Pay?`,
    ja: () => `こんにちは。お店のおすすめ料理を1〜2品教えてください。辛いものはあまり食べられません。Alipay／WeChat Payで払えますか？`,
    ko: () => `안녕하세요. 이 집 대표 메뉴 한두 가지 추천해 주세요. 매운 건 잘 못 먹어요. 알리페이/위챗페이로 결제할 수 있나요?`,
  },
  // a question for the cashier to point at; it names card brands but claims nothing about what is accepted
  payment: {
    zh: () => `您好，我是外国游客。\n请问怎么付款？\n① 支付宝 / 微信支付（扫码）\n② 外国银行卡（Visa / Mastercard / JCB 等）\n③ 现金\n请指给我看，谢谢！`,
    en: () => `Hello, I'm a foreign visitor. How can I pay? ① Alipay / WeChat Pay (QR code) ② Foreign bank card (Visa / Mastercard / JCB, etc.) ③ Cash. Please point to one. Thank you!`,
    ja: () => `こんにちは。外国人旅行者です。どうやって支払えますか？① Alipay／WeChat Pay（QRコード）② 海外のカード（Visa／Mastercard／JCB など）③ 現金。指で示してください。ありがとうございます。`,
    ko: () => `안녕하세요, 외국인 관광객입니다. 어떻게 결제하면 되나요? ① 알리페이/위챗페이(QR 코드) ② 해외 카드(Visa/Mastercard/JCB 등) ③ 현금. 손으로 가리켜 주세요. 감사합니다!`,
  },
  help: {
    zh: () => `您好，我是外国游客，不会说中文。\n可以用手机翻译和您沟通吗？谢谢！`,
    en: () => `Hello, I'm a foreign visitor and don't speak Chinese. May I use a translation app to talk with you? Thank you!`,
    ja: () => `こんにちは。外国人旅行者で中国語が話せません。翻訳アプリでお話ししてもいいですか？`,
    ko: () => `안녕하세요. 외국인 관광객이라 중국어를 못해요. 번역 앱으로 이야기해도 될까요? 감사합니다!`,
  },
};

const TITLES = {
  taxi: { en: 'Taxi destination', ja: 'タクシーの行き先', ko: '택시 목적지', zh: '打车目的地' },
  ticket: { en: 'Buy tickets', ja: 'チケット購入', ko: '표 구매', zh: '购票' },
  directions: { en: 'Ask directions', ja: '道をたずねる', ko: '길 묻기', zh: '问路' },
  checkin: { en: 'Hotel check-in', ja: 'ホテルのチェックイン', ko: '호텔 체크인', zh: '酒店入住' },
  train: { en: 'Find the train gate', ja: '改札をたずねる', ko: '개찰구 찾기', zh: '找检票口' },
  ordering: { en: 'Ordering food', ja: '料理を注文', ko: '음식 주문', zh: '点餐' },
  payment: { en: 'Paying', ja: '支払い方法', ko: '결제 방법', zh: '付款方式' },
  help: { en: 'I need help', ja: '助けてください', ko: '도움 요청', zh: '求助' },
};

function card(type, lang, params) {
  const t = T[type];
  const L = t[lang] ? lang : 'en';
  return { type, title: TITLES[type][L], zh: t.zh(params), gloss: lang === 'zh' ? null : t[L](params) };
}

module.exports = { card, TYPES: Object.keys(T) };
