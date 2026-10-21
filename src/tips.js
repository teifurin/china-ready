'use strict';
/**
 * Practical inbound tips. GENERAL INFORMATION ONLY — each item cites the official page it was
 * summarised from (checked 2026-10-20). Policies change; the UI tells users to verify at the source.
 * Items of kind "general" are common-practice reminders without a specific policy claim.
 */
const CHECKED = '2026-10-20';
const SRC = {
  mfaFaq: { title: '外交部 · 单方面免签政策常见问题解答 / FAQs on Visa-free Entry', url: 'https://www.mfa.gov.cn/wjbzwfwpt/kzx/tzgg/202511/t20251110_11749824.html' },
  nia240: { title: '国家移民管理局 · 过境免签政策 (NIA)', url: 'https://www.nia.gov.cn/n741440/n741577/c1731205/content.html' },
  niaRegistration: { title: '国家移民管理局 · 网上办理外国人旅馆以外住宿登记政策解读 (2026-09-21)', url: 'https://www.nia.gov.cn/n741440/n741577/c1806139/content.html' },
  niaPress: { title: '国家移民管理局 · 放宽优化过境免签政策新闻发布会 (2024-12-17)', url: 'https://www.nia.gov.cn/n741435/n1194535/n1689182/index.html' },
  niaEn: { title: 'National Immigration Administration (English)', url: 'https://en.nia.gov.cn/' },
  govGuide: { title: 'english.gov.cn · Visit China guidelines', url: 'https://english.www.gov.cn/services/visitchina/641d29fec6d0f528699dc1df' },
  jpEmb: { title: '在中国日本国大使館 · 中国渡航に必要な手続', url: 'https://www.cn.emb-japan.go.jp/itpr_ja/00_000918.html' },
  govPay: { title: '中国政府网 · 便利外籍来华人员、老年人等群体，这些支付场景已优化（新华社 2024-07-27）', url: 'https://www.gov.cn/zhengce/202407/content_6964811.htm' },
};

const TIPS = [
  {
    id: 'visa-free-30', kind: 'official', sources: [SRC.mfaFaq],
    text: {
      en: 'Unilateral visa-free entry: ordinary-passport holders of the listed countries (incl. Japan and Korea) may enter for up to 30 days for business, tourism, visiting family/friends, exchanges or transit. For most listed countries the policy runs until 2026-12-31. Work, study and reporting still need a visa.',
      ja: '単方面ビザ免除：日本・韓国などリスト掲載国の一般旅券保持者は、商用・観光・親族訪問・交流・トランジット目的で30日以内ならビザ不要。多くの対象国で2026年12月31日まで実施。就労・留学・取材はビザが必要です。',
      ko: '일방적 무비자 입국: 한국·일본 등 명단 국가의 일반여권 소지자는 비즈니스·관광·친지 방문·교류·경유 목적으로 30일 이내 무비자 입국 가능. 대부분 국가는 2026-12-31까지 시행. 취업·유학·취재는 비자 필요.',
      zh: '单方面免签：名单内国家（含日本、韩国）普通护照持有人来华经商、旅游观光、探亲访友、交流访问、过境不超过30天可免签入境；多数国家施行至2026年12月31日。工作、学习、采访仍需签证。',
    },
  },
  {
    id: 'transit-240', kind: 'official', sources: [SRC.nia240, SRC.niaEn],
    text: {
      en: '240-hour visa-free transit (57 countries, e.g. USA, UK, Japan, Korea): you need an onward ticket with confirmed date/seat to a THIRD country or region, enter at one of 65 designated ports, and stay within designated areas for up to 10 days. A round trip back to your departure country does not count as transit.',
      ja: '240時間トランジット免除（米・英・日・韓など57か国）：日時・座席確定の「第三国・地域」への乗継航空券が必要、指定の65口岸から入国し、指定区域内で最大10日間滞在可。出発国へ戻る往復はトランジットに該当しません。',
      ko: '240시간 경유 무비자(미국·영국·일본·한국 등 57개국): 날짜·좌석이 확정된 "제3국·지역"행 연결 항공권이 필요하며, 지정된 65개 출입국 항구로 입국해 지정 지역에서 최대 10일 체류 가능. 출발국으로 돌아가는 왕복은 경유가 아닙니다.',
      zh: '240小时过境免签（美、英、日、韩等57国）：需持确定日期及座位、前往第三国或地区的联程客票，从65个指定口岸入境，在规定区域停留不超过10天。原路返回出发国不属于过境。',
    },
  },
  {
    id: 'registration', kind: 'official', sources: [SRC.niaRegistration], checked: '2026-10-21',
    text: {
      en: 'Accommodation registration: hotels register their foreign guests. If you stay somewhere other than a hotel, you or your host must register with the local public security authority within 24 hours of checking in.',
      ja: '宿泊登記：ホテルに泊まる場合はホテルが登記します。ホテル以外に泊まる場合は、宿泊開始から24時間以内に本人または宿泊先の提供者が所在地の公安機関で登記する必要があります。',
      ko: '숙박 등록: 호텔에 머무르면 호텔이 등록합니다. 호텔 외의 장소에 머무르면 체크인 후 24시간 이내에 본인 또는 숙소 제공자가 관할 공안기관에 등록해야 합니다.',
      zh: '住宿登记：在旅馆住宿的，由旅馆办理登记。在旅馆以外的其他住所住宿的，应当在入住后24小时内由本人或者留宿人向居住地的公安机关办理登记。',
    },
  },
  {
    id: 'arrival-card', kind: 'official', sources: [SRC.jpEmb, SRC.niaEn],
    text: {
      en: 'Arrival card can be filed online in advance (NIA website / "移民局12367" app / WeChat or Alipay mini-program). NIA hotline 12367 (from abroad +86 12367) answers policy questions.',
      ja: '外国人入国カードは事前オンライン申告可（国家移民管理局サイト／「移民局12367」アプリ／WeChat・Alipay内アプリ）。政策の問い合わせは12367（海外から +86 12367）。',
      ko: '외국인 입국카드는 사전 온라인 신고 가능(국가이민관리국 웹사이트 / "移民局12367" 앱 / 위챗·알리페이 미니프로그램). 정책 문의 12367(해외에서 +86 12367).',
      zh: '外国人入境卡可提前在线申报（国家移民管理局网站／“移民局12367”App／微信、支付宝小程序）。政策咨询可拨打12367（境外拨 +86 12367）。',
    },
  },
  {
    // facts from the gov.cn 2024-07-27 item, read on 2026-10-20; card brands and wallet names appear only as "check in the app"
    id: 'payment', kind: 'general', sources: [SRC.govPay, SRC.govGuide],
    text: {
      en: 'Payment (general info): mobile payment is the norm. China\'s central bank has widened both linking foreign bank cards to Chinese payment apps and using overseas e-wallets in China, and raised the limits. Foreign-card acceptance at major merchants has improved, but not every shop takes cards. Refusing yuan cash is illegal and being rectified; you can exchange money at international airports, bank branches, ATMs and hotels of four stars and up. Before the trip, link your card to Alipay or WeChat Pay by following the apps\' own instructions, and keep a card and some cash as backup.',
      ja: '支払い（一般情報）：モバイル決済が主流。中国人民銀行は、海外カードを中国の決済アプリに登録する仕組みと、海外の電子ウォレットを中国で使う仕組みの両方を広げ、限度額も引き上げました。主要な店舗での海外カード受付は改善していますが、すべての店でカードが使えるわけではありません。人民元現金の受け取り拒否は違法とされ是正が進められており、国際空港・銀行・ATM・四つ星以上のホテルで両替できます。出発前にAlipayかWeChat Payにカードを登録し（JCBなど日本のカードが使えるかは各アプリの案内で確認）、カードと少額の現金も予備に。',
      ko: '결제(일반 정보): 모바일 결제가 일반적입니다. 중국 인민은행은 해외 카드를 중국 결제 앱에 등록하는 방식과 해외 전자지갑을 중국에서 쓰는 방식을 모두 넓히고 한도도 올렸습니다. 주요 가맹점의 해외 카드 결제는 개선되었지만 모든 가게가 카드를 받지는 않습니다. 인민폐 현금 수취 거부는 위법으로 시정이 진행 중이며, 국제공항·은행·ATM·4성급 이상 호텔에서 환전할 수 있습니다. 출발 전 알리페이나 위챗페이에 카드를 등록하고(카카오페이·네이버페이·토스 등 한국 간편결제를 중국에서 쓸 수 있는지는 각 앱에서 확인), 카드와 약간의 현금도 준비하세요.',
      zh: '支付（一般信息）：国内以移动支付为主。中国人民银行扩大了“外卡内绑”（境外银行卡绑定国内支付App）和“外包内用”（境外电子钱包在境内使用）的范围，并提高了交易限额。重点商户受理外卡的情况明显改善，但并非所有商户都能刷卡。拒收人民币现金属于违法行为，正在持续整治；国际机场、银行网点、ATM和四星级以上酒店都可以兑换人民币。出发前请按支付宝或微信支付的官方说明绑定银行卡，并备好银行卡和少量现金。',
    },
  },
  {
    id: 'foreign-guest', kind: 'general', sources: [],
    text: {
      en: 'Before you check in, confirm with the hotel that it accepts foreign guests. Fliggy listings do not say whether a property can register a foreign passport.',
      ja: 'チェックイン前に、外国籍の宿泊を受け付けているかホテルへ確認してください。飛猪の掲載情報からは、外国パスポートで登記できるかは分かりません。',
      ko: '체크인 전에 외국인 숙박이 되는지 호텔에 확인하세요. Fliggy 목록만으로는 외국 여권 등록이 되는지를 알 수 없습니다.',
      zh: '入住前请向酒店确认是否接待外籍旅客。飞猪结果无法判断该店能否为外国护照办理入住登记。',
    },
  },
  {
    id: 'realname', kind: 'general', sources: [],
    text: {
      en: 'Train and many attraction tickets are real-name: book with your passport name/number exactly as printed, and bring the same passport.',
      ja: '鉄道や多くの観光地のチケットは実名制。パスポート記載どおりの氏名・番号で予約し、当日も同じパスポートを持参してください。',
      ko: '기차표와 많은 관광지 표는 실명제입니다. 여권에 적힌 그대로 이름·번호로 예매하고 같은 여권을 지참하세요.',
      zh: '火车票及很多景区门票为实名制：请按护照上的姓名和号码预订，当天携带同一本护照。',
    },
  },
];

function tipsFor(lang) {
  const L = ['en', 'ja', 'ko', 'zh'].includes(lang) ? lang : 'en';
  return TIPS.map((t) => ({ id: t.id, kind: t.kind, text: t.text[L], sources: t.sources, checked: t.checked || CHECKED }));
}

module.exports = { tipsFor };
