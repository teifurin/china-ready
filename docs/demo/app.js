'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// flyai's systemMessage carries markdown links; only https ones become anchors
function sysHtml(s) {
  const parts = String(s || '').replace(/\*/g, '').split(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/);
  let html = '';
  for (let i = 0; i < parts.length; i += 3) {
    html += esc(parts[i] || '');
    if (parts[i + 2]) html += `<a href="${esc(parts[i + 2])}" target="_blank" rel="noopener">${esc(parts[i + 1])}</a>`;
  }
  return html;
}

const I = {
  ja: {
    name: '日本語',
    heroTitle: '中国旅行、|ことばの壁なしで。',
    heroSub: '行きたい旅を日本語で書くだけ。|飛猪（Fliggy）の実データで|航空券・高速鉄道・ホテル・観光地を組み立て、|スタッフに見せる中国語カードも用意します。',
    placeholder: '例：東京から上海と杭州へ4日間。11月7日出発、大人1人。歴史と美味しいものが好き。',
    go: '旅程をつくる', working: '飛猪のリアルタイムデータを検索中…',
    tabs: ['旅程', '見せるカード', '写真で調べる', '入国のヒント'],
    book: '飛猪で予約', alts: 'ほかの候補', masked: '体験モードで一部伏字', known: '確定している価格の合計',
    hotelsNote: 'ホテル・鉄道・チケットの価格は体験モードで伏字（FLYAI_API_KEYで表示）', free: '無料', noResult: '飛猪で該当なし',
    photoTitle: 'メニュー・看板・展示・料理を写真で', photoSub: 'Qwen ビジョンモデルが写真の中国語を読み、何が写っているかを説明します。展示品と説明札のように、同じ対象の写真は3枚までまとめて送れます。',
    pick: '写真を選ぶ／撮る', pickHint: '3枚まで', translate: '調べる',
    tipsNote: '一般情報です。政策は変わるため、必ず出典の公式ページで確認してください。', source: '出典', checked: '確認日', general: '一般的な注意', official: '公式情報',
    mockBanner: 'デモ（モック）モード：DASHSCOPE_API_KEY 未設定のため、文章はテンプレート、写真の解説は無効です。旅行データは飛猪の実データです。',
    cardsTitle: 'スタッフに見せるカード', returnFromFirst: '帰りの便は次の都市から出発します：', assume: '推定', kmHotel: 'ホテルから約{n}km',
    errGeneric: '旅程を作れませんでした。しばらくしてからもう一度お試しください。', errTimeout: '飛猪の検索がタイムアウトしました。もう一度お試しください。', errFlyai: '一部の飛猪検索が失敗しました',
    saveImg: '画像を保存',
    tokenBanner: 'Token Plan のキーはアプリから使えません。従量課金の DASHSCOPE_API_KEY（sk- で始まり、sk-sp- ではないもの）を設定してください。',
    pausedNote: '飛猪から利用制限（{r}）が返ったため、{t}まで実データの検索を止めています。下の結果には保存済みのデータが含まれることがあります（取得時刻はページ下部の検索記録を参照）。',
    fallbackNote: '下の結果の一部は、以前に保存したデータです（取得時刻はページ下部の検索記録を参照）。',
    dayN: '{n}日目', spots: '{n}か所', nights: '{n}泊', perNight: '/泊', direct: '直行便', connecting: '乗継便', tripDays: '{n}日間', adults: '大人{n}人',
    mapTitle: '位置関係（縮尺どおり）', mapNote: '点線はホテルからの直線距離。座標は飛猪のデータ。', hotelShort: 'ホテル',
    costTitle: '料金の内訳', costNote: '交通・チケットは人数分、ホテルは1室×泊数で計算。伏字の価格は合計に含めません。', maskedRow: '伏字のため合計外',
    phrases: '使えるフレーズ', anywhere: 'どこでも使える', staffHint: 'カードをタップすると全画面で大きく表示されます。「反転」で向かいの人が読みやすい向きになります。', flip: '反転', close: '閉じる',
    photoEmpty: '結果はここに表示されます。サンプル写真を選ぶと、記録済みの結果を見られます。', unavailable: '写真の解説は現在使えません', colPinyin: 'ピンイン', colMeaning: '意味',
    dataTitle: 'データの出典', dataLine: '航空券・鉄道・ホテル・観光地・価格・予約リンクは、すべて飛猪 flyai の検索結果です。',
    staticIntro: 'これは静的サンプルページです。記録済みの旅程を表示します（リアルタイム検索ではありません）。',
    staticBanner: '静的サンプルページ：この旅程は {t} に飛猪の実データで記録したもので、リアルタイム検索ではありません。価格や空きは飛猪のページで確認してください。自分の文章での旅程作成と、自分の写真の解説は、アプリをローカルで起動すると使えます。',
    staticOnly: 'このサンプルページで表示できるのは、記録済みの3つの例だけです。自分の文章で旅程を作るには、アプリをローカルで起動してください。',
    budgetLabel: '宿の予算（1泊・1室）', budgetNames: { economy: '節約', standard: 'スタンダード', upscale: 'ハイクラス' }, budgetBands: { economy: '¥300未満', standard: '¥300〜600', upscale: '¥600超' },
    stayFact: '宿：{name}（1泊{band}）', noBudgetNote: '{c}：飛猪の検索結果に予算内のホテルがなかったため、価格が最も近いホテルを選びました。',
    pickTitle: '言語を選んで、サンプル旅程を見る', pickNote: 'それぞれの言語で書いた一文から、アプリが組み立てた旅程です。', pickGo: '日本語で見る',
    staticPhoto: '自分の写真の解説はサーバーで Qwen を呼び出すため、このサンプルページでは使えません。サンプル写真を選ぶと、記録済みの結果を見られます。',
    samplesTitle: 'サンプル写真', samples: { exhibit: '博物館の展示品と説明札', menu: '食堂の看板メニュー', 'dish-a': '北方の料理（1）', 'dish-b': '北方の料理（2）' },
    kinds: { menu: 'メニュー', shopfront: '店の看板', sign: '標識', notice: 'お知らせ', exhibit: '展示品', dish: '料理', other: 'その他' },
    conf: { high: '確度：高', medium: '確度：中', low: '確度：低' }, basisPhoto: '写真から', basisGeneral: '一般知識',
    candTitle: 'ほかの可能性', adviceTitle: '選び方のヒント', adviceNote: '口コミや評価ではなく、写真から AI がまとめたヒントです。', aiNote: 'AI の読み取りは間違えることがあります。大事な点は写真の原文やスタッフに確認してください。',
    uncTitle: '写真からは分からないこと', textTitle: '写真の中の文字', recordedNote: '{t} に {m} で記録した結果です。', recordedLang: 'この結果は{l}で記録したものです。',
    tooMany: '写真は3枚までです。最初の3枚を使います。',
  },
  en: {
    name: 'English',
    heroTitle: 'Travel China without the language barrier.',
    heroSub: 'Describe your trip in your own language. We build it from real Fliggy data — flights, high-speed rail, hotels, attractions — plus show-to-staff Chinese cards for every stop.',
    placeholder: 'e.g. From Tokyo to Shanghai and Hangzhou, 4 days from Nov 7, 1 adult. I love history and food.',
    go: 'Plan my trip', working: 'Searching Fliggy real-time data…',
    tabs: ['Itinerary', 'Show-to-staff', 'Photo lookup', 'Entry tips'],
    book: 'Book on Fliggy', alts: 'Other options', masked: 'masked in experience mode', known: 'Sum of known prices',
    hotelsNote: 'Hotel/rail/ticket prices are masked in experience mode (set FLYAI_API_KEY to unlock)', free: 'Free', noResult: 'No Fliggy result',
    photoTitle: 'Snap a menu, sign, exhibit or dish', photoSub: 'A Qwen vision model reads the Chinese in your photos and explains what they show. Send up to 3 photos of the same thing together, such as an exhibit and its label.',
    pick: 'Choose / take photos', pickHint: 'Up to 3', translate: 'Explain',
    tipsNote: 'General information only. Policies change — always confirm on the official source pages.', source: 'Source', checked: 'checked', general: 'General reminder', official: 'Official info',
    mockBanner: 'Demo (mock) mode: no DASHSCOPE_API_KEY, so narrative uses templates and photo lookup is disabled. Travel data is real Fliggy data.',
    cardsTitle: 'Show-to-staff cards', returnFromFirst: 'Return flight departs from:', assume: 'assumed', kmHotel: '~{n} km from hotel',
    errGeneric: 'Could not build the itinerary. Please try again.', errTimeout: 'The Fliggy search timed out. Please try again.', errFlyai: 'Some Fliggy searches failed',
    saveImg: 'Save image',
    tokenBanner: 'A Token Plan key cannot be used by this app. Set a pay-as-you-go DASHSCOPE_API_KEY (starts with sk-, not sk-sp-).',
    pausedNote: 'Fliggy returned a usage limit ({r}), so live search is paused until {t}. Results below may include saved data (fetch times are in the query log at the bottom).',
    fallbackNote: 'Some results below are saved data from an earlier search (fetch times are in the query log at the bottom).',
    dayN: 'Day {n}', spots: '{n} stops', spots1: '1 stop', nights: '{n} nights', nights1: '1 night', perNight: '/night', direct: 'Nonstop', connecting: 'Connecting', tripDays: '{n} days', adults: '{n} adults', adults1: '1 adult',
    mapTitle: 'Where things are (to scale)', mapNote: 'Dashed lines: straight-line distance from the hotel. Coordinates from Fliggy.', hotelShort: 'Hotel',
    costTitle: 'Price breakdown', costNote: 'Transport and tickets are per traveller; hotels are one room × nights. Masked prices are left out of the total.', maskedRow: 'masked — not in the total',
    phrases: 'Handy phrases', anywhere: 'Anywhere', staffHint: 'Tap a card to show it full screen. “Flip” turns the text to face the person across the counter.', flip: 'Flip', close: 'Close',
    photoEmpty: 'Results appear here. Pick a sample photo to see a recorded result.', unavailable: 'Photo lookup is not available', colPinyin: 'Pinyin', colMeaning: 'Meaning',
    dataTitle: 'Where the data comes from', dataLine: 'Flights, trains, hotels, attractions, prices and booking links all come from Fliggy flyai searches.',
    staticIntro: 'This is a static sample page. It shows recorded itineraries, not live searches.',
    staticBanner: 'Static sample page: this itinerary was recorded from live Fliggy data at {t}; it is not a live search. Check prices and availability on Fliggy. Planning from your own sentence and explaining your own photos work when you run the app locally.',
    staticOnly: 'This sample page can only show the three recorded examples. To plan from your own sentence, run the app locally.',
    budgetLabel: 'Hotel budget (per night, one room)', budgetNames: { economy: 'Budget', standard: 'Standard', upscale: 'Upscale' }, budgetBands: { economy: 'under ¥300', standard: '¥300–600', upscale: 'over ¥600' },
    stayFact: 'Hotels: {name}, {band} a night', noBudgetNote: '{c}: Fliggy returned no hotel in this budget, so the closest price was chosen.',
    pickTitle: 'Pick a language to see a sample trip', pickNote: 'Each trip was built by the app from one sentence written in that language.', pickGo: 'View in English',
    staticPhoto: 'Explaining your own photos calls Qwen on the server, so it is not available on this sample page. Pick a sample photo to see a recorded result.',
    samplesTitle: 'Sample photos', samples: { exhibit: 'Museum piece and its label', menu: 'Restaurant menu board', 'dish-a': 'Northern dish (1)', 'dish-b': 'Northern dish (2)' },
    kinds: { menu: 'Menu', shopfront: 'Shop front', sign: 'Sign', notice: 'Notice', exhibit: 'Exhibit', dish: 'Dish', other: 'Other' },
    conf: { high: 'Confidence: high', medium: 'Confidence: medium', low: 'Confidence: low' }, basisPhoto: 'In the photo', basisGeneral: 'General knowledge',
    candTitle: 'It could also be', adviceTitle: 'How to choose', adviceNote: 'Tips the AI drew from the photo, not a review or rating.', aiNote: 'AI reading can be wrong. Check anything important against the original text in the photo or with staff.',
    uncTitle: 'What the photo can’t tell', textTitle: 'Text in the photo', recordedNote: 'Recorded on {t} with {m}.', recordedLang: 'This result was recorded in {l}.',
    tooMany: 'Up to 3 photos; the first 3 are used.',
  },
  ko: {
    name: '한국어',
    heroTitle: '말이 안 통해도 괜찮은 중국 여행.',
    // U+2060 (word joiner) keeps the "·" list on one line, so no line starts with a middle dot
    heroSub: '원하는 여행을 한국어로 적어 주세요.|Fliggy(페이주) 실데이터로 항공⁠·⁠고속철도⁠·⁠호텔⁠·⁠관광지를 짜고,|직원에게 보여 줄 중국어 카드도 만들어 드려요.',
    placeholder: '예: 서울에서 상하이·항저우 3박4일, 11월 7일 출발, 성인 1명. 역사와 맛집 좋아해요.',
    go: '일정 만들기', working: 'Fliggy 실시간 데이터 검색 중…',
    tabs: ['일정', '보여 주기 카드', '사진 해설', '입국 팁'],
    book: 'Fliggy 예약', alts: '다른 후보', masked: '체험 모드에서 일부 가림', known: '확정 가격 합계',
    hotelsNote: '호텔·기차·입장권 가격은 체험 모드에서 가려짐(FLYAI_API_KEY 설정 시 표시)', free: '무료', noResult: 'Fliggy 결과 없음',
    photoTitle: '메뉴·간판·전시품·음식을 사진으로', photoSub: 'Qwen 비전 모델이 사진 속 중국어를 읽고 무엇이 찍혔는지 설명합니다. 전시품과 설명판처럼 같은 대상의 사진은 3장까지 함께 보낼 수 있습니다.',
    pick: '사진 선택/촬영', pickHint: '최대 3장', translate: '알아보기',
    tipsNote: '일반 정보입니다. 정책은 바뀔 수 있으니 반드시 출처 공식 페이지를 확인하세요.', source: '출처', checked: '확인일', general: '일반 안내', official: '공식 정보',
    mockBanner: '데모(목) 모드: DASHSCOPE_API_KEY가 없어 문구는 템플릿, 사진 해설은 비활성. 여행 데이터는 Fliggy 실데이터입니다.',
    cardsTitle: '직원에게 보여 주기 카드', returnFromFirst: '귀국편 출발 도시:', assume: '추정', kmHotel: '호텔에서 약 {n}km',
    errGeneric: '일정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.', errTimeout: 'Fliggy 검색 시간이 초과되었습니다. 다시 시도해 주세요.', errFlyai: '일부 Fliggy 검색이 실패했습니다',
    saveImg: '이미지 저장',
    tokenBanner: 'Token Plan 키는 이 앱에서 쓸 수 없습니다. 종량제 DASHSCOPE_API_KEY(sk- 로 시작하고 sk-sp- 가 아닌 키)를 설정하세요.',
    pausedNote: 'Fliggy가 이용 제한({r})을 반환해 {t}까지 실시간 검색을 멈췄습니다. 아래 결과에는 저장된 데이터가 포함될 수 있습니다(조회 시각은 맨 아래 검색 기록 참고).',
    fallbackNote: '아래 결과 중 일부는 이전에 저장한 데이터입니다(조회 시각은 맨 아래 검색 기록 참고).',
    dayN: '{n}일차', spots: '{n}곳', nights: '{n}박', perNight: '/박', direct: '직항', connecting: '경유', tripDays: '{n}일', adults: '성인 {n}명',
    mapTitle: '위치 관계(축척 그대로)', mapNote: '점선은 호텔에서의 직선거리입니다. 좌표는 Fliggy 데이터입니다.', hotelShort: '호텔',
    costTitle: '요금 내역', costNote: '교통·입장권은 인원수만큼, 호텔은 객실 1개 × 박수로 계산합니다. 가려진 가격은 합계에서 뺍니다.', maskedRow: '가려져 합계에서 제외',
    phrases: '유용한 문장', anywhere: '어디서나', staffHint: '카드를 누르면 전체 화면으로 크게 표시됩니다. "뒤집기"를 누르면 맞은편 사람이 읽기 쉬운 방향이 됩니다.', flip: '뒤집기', close: '닫기',
    photoEmpty: '결과가 여기에 표시됩니다. 샘플 사진을 고르면 기록된 결과를 볼 수 있습니다.', unavailable: '지금은 사진 해설을 쓸 수 없습니다', colPinyin: '병음', colMeaning: '뜻',
    dataTitle: '데이터 출처', dataLine: '항공·기차·호텔·관광지·가격·예약 링크는 모두 Fliggy flyai 검색 결과입니다.',
    staticIntro: '정적 샘플 페이지입니다. 기록된 일정을 보여 주며 실시간 검색이 아닙니다.',
    staticBanner: '정적 샘플 페이지: 이 일정은 {t}에 Fliggy 실데이터로 기록한 것이며 실시간 검색이 아닙니다. 가격과 예약 가능 여부는 Fliggy 페이지에서 확인하세요. 직접 쓴 문장으로 일정 만들기와 직접 찍은 사진 해설은 앱을 로컬에서 실행하면 쓸 수 있습니다.',
    staticOnly: '이 샘플 페이지에서는 기록된 예시 3개만 볼 수 있습니다. 직접 쓴 문장으로 일정을 만들려면 앱을 로컬에서 실행하세요.',
    budgetLabel: '숙소 예산(1박·객실 1개)', budgetNames: { economy: '알뜰', standard: '스탠더드', upscale: '고급' }, budgetBands: { economy: '¥300 미만', standard: '¥300~600', upscale: '¥600 초과' },
    stayFact: '숙소: {name}, 1박 {band}', noBudgetNote: '{c}: Fliggy 검색 결과에 예산 안의 호텔이 없어 가격이 가장 가까운 호텔을 골랐습니다.',
    pickTitle: '언어를 고르면 샘플 일정을 보여 드려요', pickNote: '각 언어로 쓴 한 문장으로 앱이 짠 일정입니다.', pickGo: '한국어로 보기',
    staticPhoto: '직접 찍은 사진의 해설은 서버에서 Qwen을 호출하므로 이 샘플 페이지에서는 쓸 수 없습니다. 샘플 사진을 고르면 기록된 결과를 볼 수 있습니다.',
    samplesTitle: '샘플 사진', samples: { exhibit: '박물관 전시품과 설명판', menu: '식당 메뉴판', 'dish-a': '북방 요리 (1)', 'dish-b': '북방 요리 (2)' },
    kinds: { menu: '메뉴', shopfront: '가게 간판', sign: '표지판', notice: '안내문', exhibit: '전시품', dish: '음식', other: '기타' },
    conf: { high: '확신도: 높음', medium: '확신도: 보통', low: '확신도: 낮음' }, basisPhoto: '사진에서', basisGeneral: '일반 지식',
    candTitle: '다른 가능성', adviceTitle: '고르는 팁', adviceNote: '후기나 평점이 아니라 AI가 사진을 보고 정리한 팁입니다.', aiNote: 'AI의 판독은 틀릴 수 있습니다. 중요한 내용은 사진 속 원문이나 직원에게 확인하세요.',
    uncTitle: '사진만으로는 알 수 없는 것', textTitle: '사진 속 글자', recordedNote: '{t}에 {m}(으)로 기록한 결과입니다.', recordedLang: '이 결과는 {l}로 기록했습니다.',
    tooMany: '사진은 최대 3장입니다. 처음 3장을 씁니다.',
  },
  zh: {
    name: '中文',
    heroTitle: '外国朋友来中国，|一句话搞定行程。',
    heroSub: '用母语描述旅行需求，|基于飞猪实时数据生成航班、高铁、酒店、景点行程，|并为每一站生成“给工作人员看”的中文卡片。',
    placeholder: '例：从东京去上海和杭州玩4天，11月7日出发，1位成人，喜欢历史和美食。',
    go: '生成行程', working: '正在查询飞猪实时数据…',
    tabs: ['行程', '出示卡片', '拍照识别', '入境须知'],
    book: '去飞猪预订', alts: '其他选择', masked: '体验模式部分打码', known: '已知价格合计',
    hotelsNote: '体验模式下酒店/火车/门票价格打码（配置 FLYAI_API_KEY 可显示）', free: '免费', noResult: '飞猪无结果',
    photoTitle: '拍菜单、招牌、展品、菜品', photoSub: 'Qwen 视觉模型读取照片里的中文，并说明拍到的是什么。同一对象（如展品和说明牌）最多可一起发 3 张。',
    pick: '选择/拍摄照片', pickHint: '最多 3 张', translate: '识别',
    tipsNote: '以下为一般信息，政策可能变化，请以出处官方页面为准。', source: '出处', checked: '核对日期', general: '一般提醒', official: '官方信息',
    mockBanner: '演示（Mock）模式：未配置 DASHSCOPE_API_KEY，文案用模板、拍照识别不可用；旅行数据为飞猪真实数据。',
    cardsTitle: '给工作人员看的卡片', returnFromFirst: '返程航班出发城市：', assume: '推测', kmHotel: '距酒店约{n}公里',
    errGeneric: '没能生成行程，请稍后再试。', errTimeout: '飞猪查询超时，请再试一次。', errFlyai: '部分飞猪查询失败',
    saveImg: '保存图片',
    tokenBanner: '不能在应用里使用 Token Plan Key。请配置按量付费的 DASHSCOPE_API_KEY（sk- 开头，不能是 sk-sp-）。',
    pausedNote: '飞猪返回了限流（{r}），{t} 前暂停实时查询。下面的结果可能包含之前保存的数据（获取时间见页面底部的查询记录）。',
    fallbackNote: '下面部分结果是之前保存的数据（获取时间见页面底部的查询记录）。',
    dayN: '第{n}天', spots: '{n}个景点', nights: '{n}晚', perNight: '/晚', direct: '直飞', connecting: '中转', tripDays: '{n}天', adults: '{n}位成人',
    mapTitle: '位置关系（按比例）', mapNote: '虚线为距酒店的直线距离，坐标来自飞猪。', hotelShort: '酒店',
    costTitle: '费用明细', costNote: '交通和门票按人数计算，酒店按 1 间房 × 晚数计算。打码价不计入合计。', maskedRow: '打码，不计入合计',
    phrases: '常用短句', anywhere: '随时可用', staffHint: '点击卡片可全屏放大显示；点“翻转”后，文字朝向对面的人。', flip: '翻转', close: '关闭',
    photoEmpty: '结果会显示在这里。选一张示例照片，可以查看录制好的结果。', unavailable: '拍照识别暂不可用', colPinyin: '拼音', colMeaning: '含义',
    dataTitle: '数据来源', dataLine: '航班、火车、酒店、景点、价格和预订链接全部来自飞猪 flyai 查询结果。',
    staticIntro: '这是静态示例页，展示录制好的行程，不是实时查询。',
    staticBanner: '这是静态示例页：这份行程是 {t} 用飞猪实时数据录制的，不是实时查询。价格和余量请以飞猪页面为准。用自己的句子生成行程、识别自己的照片，需要在本地运行应用。',
    staticOnly: '示例页只能查看录制好的 3 个例子。要用自己的句子生成行程，请在本地运行应用。',
    budgetLabel: '住宿预算（每晚·1 间）', budgetNames: { economy: '节省', standard: '标准', upscale: '高档' }, budgetBands: { economy: '¥300 以下', standard: '¥300–600', upscale: '¥600 以上' },
    stayFact: '住宿：{name}，每晚 {band}', noBudgetNote: '{c}：飞猪返回的结果里没有这个价位的酒店，选了价格最接近的一家。',
    pickTitle: '选一种语言，查看示例行程', pickNote: '每个行程都是应用根据一句该语言写的话生成的。',
    staticPhoto: '识别自己的照片需要在服务器上调用 Qwen，示例页里不能使用。选一张示例照片，可以查看录制好的结果。',
    samplesTitle: '示例照片', samples: { exhibit: '博物馆展品和说明牌', menu: '餐馆招牌菜单', 'dish-a': '北方菜品（1）', 'dish-b': '北方菜品（2）' },
    kinds: { menu: '菜单', shopfront: '店铺招牌', sign: '指示牌', notice: '告示', exhibit: '展品', dish: '菜品', other: '其他' },
    conf: { high: '把握：高', medium: '把握：中', low: '把握：低' }, basisPhoto: '照片可见', basisGeneral: '常识',
    candTitle: '也可能是', adviceTitle: '怎么选', adviceNote: '这是 AI 根据照片整理的建议，不是点评或评分。', aiNote: 'AI 识别可能出错，重要内容请对照照片上的原文或向工作人员确认。',
    uncTitle: '照片看不出来的', textTitle: '照片里的文字', recordedNote: '{t} 用 {m} 录制的结果。', recordedLang: '这条结果是用{l}录制的。',
    tooMany: '最多 3 张，只用前 3 张。',
  },
};
const EXAMPLES = [
  { lang: 'ja', label: '東京 → 上海 → 杭州 4日間', text: '東京から上海と杭州へ4日間の旅行をしたいです。11月7日出発、大人1人。歴史と美味しいものが好きです。' },
  { lang: 'en', label: "Seoul → Beijing → Xi'an", text: "From Seoul to Beijing and Xi'an, 5 days from Dec 3, 2 adults, we love history and food." },
  { lang: 'ko', label: '서울 → 상하이 3박4일', text: '서울에서 상하이 3박4일, 11월 14일 출발, 성인 1명. 야경이랑 맛집 좋아해요.' },
];
// Fliggy's hotel classes, shown in the reader's language (display only; the data keeps the Chinese value)
const STAR = {
  经济型: { ja: 'エコノミー', en: 'Economy', ko: '이코노미' },
  舒适型: { ja: 'スタンダード', en: 'Comfort', ko: '컴포트' },
  高档型: { ja: 'ハイクラス', en: 'Upscale', ko: '고급' },
  豪华型: { ja: 'ラグジュアリー', en: 'Luxury', ko: '럭셔리' },
};

// 24px line icons, stroked with currentColor
const ICONS = {
  plane: '<path d="M12 2.6c.8 0 1.4.7 1.4 1.5v5.2l7.1 4.2v1.9l-7.1-2.1v4.6l2.2 1.6v1.6L12 20.1l-3.6 1v-1.6l2.2-1.6v-4.6l-7.1 2.1v-1.9l7.1-4.2V4.1c0-.8.6-1.5 1.4-1.5z"/>',
  train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10.5h14M9 17l-2 4M15 17l2 4M8.5 14h.01M15.5 14h.01"/>',
  bed: '<path d="M3 20V6M3 16h18v4M21 16v-3.5a2.5 2.5 0 0 0-2.5-2.5H11v6"/><circle cx="7" cy="12.5" r="1.8"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  ticket: '<path d="M3.5 8A1.5 1.5 0 0 1 5 6.5h14A1.5 1.5 0 0 1 20.5 8v2a2 2 0 0 0 0 4v2a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16v-2a2 2 0 0 0 0-4z"/><path d="M14 7.5v9" stroke-dasharray="1.5 2.2"/>',
  car: '<path d="M5 16.5V12l1.8-4.2A2 2 0 0 1 8.6 6.5h6.8a2 2 0 0 1 1.8 1.3L19 12v4.5"/><path d="M4 12h16v4.5H4zM6.5 16.5V19M17.5 16.5V19M7.5 14.2h.01M16.5 14.2h.01"/>',
  signpost: '<path d="M12 3v18M6 5h10l2.5 2.5L16 10H6zM18 12H8l-2.5 2.5L8 17h10z"/>',
  utensils: '<path d="M5 3v5a2 2 0 0 0 4 0V3M7 10v11M16.5 21V3c-2.2 1.6-3.5 4.6-3.5 8h3.5"/>',
  help: '<path d="M4.5 5.5h15V16H10l-4.5 3.5V16h-1z"/><path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.3M12 14v.01"/>',
  creditcard: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 9.8h18M6.5 14.5h4"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  shield: '<path d="M12 3l7 2.8v5.7c0 4.4-2.9 7.9-7 9.5-4.1-1.6-7-5.1-7-9.5V5.8z"/><path d="M9 12l2 2 4-4"/>',
  cards: '<rect x="3.5" y="7" width="13" height="13" rx="2"/><path d="M7.5 4h11a2 2 0 0 1 2 2v11"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>',
  alert: '<path d="M10.3 4.5L2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0z"/><path d="M12 9.5V14M12 17v.01"/>',
  chevron: '<path d="M6 9.5l6 6 6-6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
  museum: '<path d="M3.5 9L12 4l8.5 5M4.5 9h15M6.5 9v8.5M10 9v8.5M14 9v8.5M17.5 9v8.5M3.5 20.5h17M4.5 17.5h15"/>',
};
const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const TYPE_ICON = { flight: 'plane', train: 'train', hotel: 'bed', poi: 'pin', note: 'alert' };
const CARD_ICON = { taxi: 'car', ticket: 'ticket', directions: 'signpost', checkin: 'bed', train: 'train', ordering: 'utensils', payment: 'creditcard', help: 'help' };
const TAB_ICON = ['route', 'cards', 'camera', 'shield'];

const params = new URLSearchParams(location.search);
// The static build (docs/demo, made by scripts/build-static.js) has no server: it shows recorded plans from data/plan-<lang>.json
const STATIC = document.documentElement.dataset.mode === 'static';
let lang = params.get('lang') || (navigator.language || 'en').slice(0, 2);
if (!I[lang]) lang = 'en';
let plan = null; let status = null; let currentTab = 0;
// nightly hotel budget picked on the page; null = take it from the sentence, else the planner assumes "standard"
let budgetSel = null;
const t = (k) => I[lang][k] ?? I.en[k];
const tn = (k, n) => String((n === 1 && I[lang][k + '1']) || t(k)).replace('{n}', n);
const locale = () => (lang === 'zh' ? 'zh-CN' : lang);
const zh = (s) => `<span lang="zh-CN">${esc(s)}</span>`;
const money = (v) => '¥' + Number(v).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2, maximumFractionDigits: 2 });
const clock = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
const when = (iso) => new Date(iso).toLocaleString(locale(), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
const nightsOf = (a, b) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86400000) || 1);
const dur = (m) => (m ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : '');
function fmtDate(d) {
  try { return new Intl.DateTimeFormat(locale(), { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z')); } catch (_) { return d; }
}
const starLabel = (s) => (STAR[s] && STAR[s][lang] ? `${STAR[s][lang]} · ${s}` : s || '');

function renderStatic() {
  document.documentElement.lang = locale();
  document.querySelectorAll('[data-i]').forEach((el) => {
    const s = String(t(el.dataset.i));
    // "|" marks a preferred line break between clauses; pieces are joined by a space in languages that use spaces
    if (s.includes('|')) el.innerHTML = s.split('|').map((c) => `<span class="chunk">${esc(c)}</span>`).join(lang === 'ja' || lang === 'zh' ? '' : ' ');
    else el.textContent = s;
  });
  $('#q').placeholder = t('placeholder');
  $('#langs').innerHTML = Object.keys(I).map((k) => `<button type="button" class="${k === lang ? 'on' : ''}" data-l="${k}" lang="${k === 'zh' ? 'zh-CN' : k}" aria-pressed="${k === lang}">${I[k].name}</button>`).join('');
  $('#examples').innerHTML = EXAMPLES.map((e, i) => `<button type="button" class="chip" data-ex="${i}"><span class="chip-tag">${e.lang.toUpperCase()}</span>${esc(e.label)}</button>`).join('');
  paintBudget();
  const recorded = plan && plan.static && plan.static.recordedAt;
  const msg = STATIC ? (recorded ? t('staticBanner').replace('{t}', when(recorded)) : t('staticIntro'))
    : status && status.llm.blocked ? t('tokenBanner') : status && status.llm.mode !== 'live' ? t('mockBanner') : '';
  $('#banner').hidden = !msg;
  if (msg) $('#banner').innerHTML = `<div class="banner-in">${icon('info')}<span>${esc(msg)}</span></div>`;
  // the static page opens on a choice of language: one recorded sample trip per language
  $('#chooser').hidden = !STATIC || Boolean(plan);
  if (STATIC && !plan) $('#chooser').innerHTML = chooserHtml();
  if (plan) renderPlan();
}
// the static page only shows recorded plans, so it has no budget picker; the trip header still says which budget was used
function paintBudget() {
  $('#budget').hidden = STATIC;
  if (STATIC) return;
  $('#budget').innerHTML = `<span id="budget-label">${esc(t('budgetLabel'))}</span>${['economy', 'standard', 'upscale'].map((k) => `<button type="button" class="bchip" data-budget="${k}" aria-pressed="${budgetSel === k}">${esc(t('budgetNames')[k])}<small>${esc(t('budgetBands')[k])}</small></button>`).join('')}`;
}
$('#budget').addEventListener('click', (e) => {
  const b = e.target.closest('[data-budget]'); if (!b) return;
  budgetSel = budgetSel === b.dataset.budget ? null : b.dataset.budget;
  paintBudget();
});
function chooserHtml() {
  const arrow = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  return `<h2>${esc(t('pickTitle'))}</h2><p class="muted">${esc(t('pickNote'))}</p>
    <div class="pick-grid">${EXAMPLES.map((e, i) => `<button type="button" class="pick" data-pick="${i}" lang="${e.lang}"><span class="pick-lang">${esc(I[e.lang].name)}</span><span class="pick-route">${esc(e.label)}</span><span class="pick-text">${esc(e.text)}</span><span class="pick-go">${esc(I[e.lang].pickGo)}${arrow}</span></button>`).join('')}</div>`;
}
$('#chooser').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pick]'); if (!b) return;
  const ex = EXAMPLES[b.dataset.pick];
  lang = ex.lang; $('#q').value = ex.text; renderStatic();
  await run();
  if (!$('#result').hidden) $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#langs').addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) { lang = b.dataset.l; renderStatic(); } });
$('#examples').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (!b) return; const ex = EXAMPLES[b.dataset.ex]; lang = ex.lang; $('#q').value = ex.text; renderStatic(); });
$('#go').addEventListener('click', () => run());
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); });

function showError(msg, notice) {
  $('#error').hidden = false;
  $('#error').classList.toggle('error', !notice); // a notice (e.g. "only the recorded examples") is not an error
  $('#error').innerHTML = `<div class="banner-in">${icon(notice ? 'info' : 'alert')}<span>${esc(msg)}</span></div>`;
}
function paintSteps(steps) {
  const all = [...steps.entries()];
  const done = all.filter(([, st]) => st === 'done' || st === 'error').length;
  $('#pcount').textContent = all.length ? `${done} / ${all.length}` : '';
  $('#pbar').style.width = all.length ? `${Math.round((done / all.length) * 100)}%` : '0';
  $('#steps').innerHTML = all.map(([s, st]) => `<li class="${st === 'done' ? 'done' : st === 'error' ? 'err' : ''}">${icon(st === 'done' ? 'check' : st === 'error' ? 'x' : 'clock')}<span>${esc(s)}</span></li>`).join('');
}
function readSse(buf, onEvent) {
  const blocks = buf.split('\n\n');
  const rest = blocks.pop();
  for (const block of blocks) {
    let event = 'message', data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (data) onEvent(event, JSON.parse(data));
  }
  return rest;
}
async function run() {
  const text = $('#q').value.trim() || EXAMPLES[0].text;
  $('#q').value = text;
  $('#error').hidden = true;
  const recordedExample = STATIC ? EXAMPLES.find((e) => e.text === text) : null;
  if (STATIC && !recordedExample) { showError(t('staticOnly'), true); return; }
  $('#go').disabled = true; $('#progress').hidden = false; $('#result').hidden = true;
  const steps = new Map();
  paintSteps(steps);
  try {
    if (STATIC) {
      const r = await fetch(`data/plan-${recordedExample.lang}.json`);
      if (!r.ok) throw new Error(t('errGeneric'));
      plan = await r.json();
      lang = plan.lang || lang; renderStatic(); $('#result').hidden = false;
      showTab(Number(params.get('tab') || 0));
      const c = params.get('card'); if (c) openCardById(c);
      return;
    }
    const r = await fetch('api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang, stream: true, budget: budgetSel || undefined }) });
    const ctype = r.headers.get('content-type') || '';
    if (!ctype.includes('text/event-stream')) {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      plan = j;
    } else {
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', result = null, err = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        buf = readSse(buf, (event, payload) => {
          if (event === 'progress') { steps.set(payload.step, payload.state || 'start'); paintSteps(steps); }
          else if (event === 'result') result = payload;
          else if (event === 'error') err = payload.error || t('errGeneric');
        });
      }
      if (err) throw new Error(err);
      if (!result) throw new Error(t('errGeneric'));
      plan = result;
    }
    lang = plan.lang || lang; renderStatic(); $('#result').hidden = false;
    showTab(Number(params.get('tab') || 0));
    const c = params.get('card'); if (c) openCardById(c);
  } catch (e) {
    const raw = String(e.message || e);
    showError(/timed out/i.test(raw) ? t('errTimeout') : raw);
  } finally { $('#go').disabled = false; $('#progress').hidden = true; }
}

// ---- rendering ---------------------------------------------------------------
function priceHtml(o) {
  if (o.free) return `<span class="price free">${esc(t('free'))}</span>`;
  if (o.price == null) return '';
  const p = String(o.price).replace(/^¥/, '');
  return o.priceMasked ? `<span class="price masked" title="${esc(t('masked'))}">¥${esc(p)}*</span>` : `<span class="price">${esc(money(p))}</span>`;
}
function cardBtns(cards, sid) {
  return (cards || []).map((c, i) => `<button type="button" class="cardbtn" data-card="${sid}:${i}">${icon(CARD_ICON[c.type] || 'cards')}<span>${esc(c.title)}</span></button>`).join('');
}
function altHtml(a) {
  const label = a.no
    ? `<b>${esc(a.no)}</b> ${esc(a.depTime)}–${esc(a.arrTime)} ${zh(`${a.from} → ${a.to}`)}`
    : `${zh(a.name)}${a.star ? ` <span class="muted">${esc(starLabel(a.star))}</span>` : ''}`;
  return `<li><span class="alt-l">${label}</span>${priceHtml(a)}${a.url ? `<a class="alt-link" href="${esc(a.url)}" target="_blank" rel="noopener" aria-label="${esc(t('book'))}">${icon('external')}</a>` : ''}</li>`;
}
function actionsHtml(s) {
  const o = s.option;
  const book = o.url ? `<a class="book" href="${esc(o.url)}" target="_blank" rel="noopener">${esc(t('book'))}${icon('external')}</a>` : '';
  const alts = (s.alternatives || []).length ? `<details class="alts"><summary>${esc(t('alts'))} (${s.alternatives.length})${icon('chevron')}</summary><ul>${s.alternatives.map(altHtml).join('')}</ul></details>` : '';
  return `<div class="actions">${book}${cardBtns(s.cards, s.id)}</div>${alts}`;
}
function passHtml(s) {
  const o = s.option; const flight = s.type === 'flight';
  const kind = flight ? ` · ${esc(o.direct ? t('direct') : t('connecting'))}` : '';
  return `<div class="pass">
    <div class="pass-top"><span class="pass-no">${icon(flight ? 'plane' : 'train')}<b>${esc(o.no)}</b></span><span class="pass-meta">${zh([o.carrier, o.seat].filter(Boolean).join(' · '))}${kind}</span>${priceHtml(o)}</div>
    <div class="pass-route">
      <div class="end"><time>${esc(o.depTime)}</time>${zh(o.from)}</div>
      <div class="line"><span>${esc(dur(o.durationMin))}</span><i></i></div>
      <div class="end to"><time>${esc(o.arrTime)}</time>${zh(o.to)}</div>
    </div>
  </div>`;
}
function hotelHtml(s) {
  const o = s.option; const n = nightsOf(s.checkIn, s.checkOut);
  const price = o.priceMasked || o.priceValue == null
    ? priceHtml(o)
    : `<span class="price">${esc(money(o.priceValue))}<small>${esc(t('perNight'))}</small></span><span class="price-sub">× ${esc(tn('nights', n))} = ${esc(money(o.priceValue * n))}</span>`;
  return `<div class="media">${o.img ? `<img class="thumb" src="${esc(o.img)}" alt="">` : ''}<div class="media-body">
    <div class="titlerow"><h4>${zh(o.name)}</h4><div class="pricecol">${price}</div></div>
    <div class="meta">${o.star ? `<span class="tag">${esc(starLabel(o.star))}</span>` : ''}<span class="tag">${esc(tn('nights', n))}</span><span>${esc(fmtDate(s.checkIn))} → ${esc(fmtDate(s.checkOut))}</span></div>
    <div class="meta addr">${zh((o.address || '') + (o.near ? ' · ' + o.near : ''))}</div>
  </div></div>`;
}
function poiHtml(s) {
  const o = s.option; const nm = (plan.narrative.names || {})[s.id];
  const name = nm ? `${esc(nm.name)}${nm.name !== o.name ? `<span class="sub" lang="zh-CN">${esc(o.name)}</span>` : ''}` : zh(o.name);
  const blurb = nm && nm.blurb ? esc(nm.blurb) : zh(o.description || '');
  const meta = [
    o.category ? `<span class="tag" lang="zh-CN">${esc(o.category)}</span>` : '',
    o.level ? `<span class="tag">${o.level}A</span>` : '',
    o.kmFromHotel != null ? `<span>${icon('bed')}${esc(t('kmHotel').replace('{n}', o.kmFromHotel))}</span>` : '',
  ].join('');
  return `<div class="media">${o.img ? `<img class="thumb" src="${esc(o.img)}" alt="">` : ''}<div class="media-body">
    <div class="titlerow"><h4>${name}</h4><div class="pricecol">${priceHtml(o)}</div></div>
    <div class="meta">${meta}</div>
    ${blurb ? `<p class="desc">${blurb}</p>` : ''}
  </div></div>`;
}
function stopHtml(s, nums) {
  const o = s.option;
  if (s.type === 'note') return `<li class="stop note-stop"><span class="rail">${icon('alert')}</span><div class="item">${esc(t('returnFromFirst'))} ${zh(s.city)}</div></li>`;
  if (!o) return `<li class="stop"><span class="rail">${icon(TYPE_ICON[s.type])}</span><div class="item empty">${esc(t('noResult'))}</div></li>`;
  const body = s.type === 'flight' || s.type === 'train' ? passHtml(s) : s.type === 'hotel' ? hotelHtml(s) : poiHtml(s);
  const rail = s.type === 'poi' ? `<span class="rail num">${nums.get(s.id)}</span>` : `<span class="rail">${icon(TYPE_ICON[s.type])}</span>`;
  return `<li class="stop ${s.type}">${rail}<div class="item">${body}${actionsHtml(s)}</div></li>`;
}

// Schematic map: hotel and attractions placed by their Fliggy coordinates on a true-scale km grid (no tiles, no network).
function niceStep(v) {
  if (!(v > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(v)); const f = v / e;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e;
}
const kmText = (v) => (v < 1 ? `${Math.round(v * 1000)} m` : `${Number(v.toFixed(1))} km`);
const coord = (p) => `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? 'N' : 'S'} ${Math.abs(p.lng).toFixed(4)}°${p.lng >= 0 ? 'E' : 'W'}`;
function mapHtml(d, nums) {
  const hasXY = (o) => o && Number(o.lat) && Number(o.lng);
  const pois = d.stops.filter((s) => s.type === 'poi' && hasXY(s.option));
  if (!pois.length) return '';
  const names = plan.narrative.names || {};
  const hs = plan.days.filter((x) => x.city === d.city).flatMap((x) => x.stops).find((s) => s.type === 'hotel' && hasXY(s.option));
  const h = hs ? { lat: Number(hs.option.lat), lng: Number(hs.option.lng), label: t('hotelShort') } : null;
  const pts = pois.map((s) => ({ lat: Number(s.option.lat), lng: Number(s.option.lng), n: nums.get(s.id), km: s.option.kmFromHotel, label: (names[s.id] && names[s.id].name) || s.option.name }));
  const all = h ? [h, ...pts] : pts;
  const lat0 = all.reduce((a, p) => a + p.lat, 0) / all.length;
  const lng0 = all.reduce((a, p) => a + p.lng, 0) / all.length;
  const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180); const ky = 110.574;
  for (const p of all) { p.x = (p.lng - lng0) * kx; p.y = (lat0 - p.lat) * ky; }
  const W = 340, H = 250, pad = 38;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min((W - 2 * pad) / Math.max(maxX - minX, 0.3), (H - 2 * pad) / Math.max(maxY - minY, 0.3));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const X = (x) => +(W / 2 + (x - cx) * s).toFixed(1);
  const Y = (y) => +(H / 2 + (y - cy) * s).toFixed(1);
  const step = niceStep(W / s / 4);
  let grid = '';
  for (let i = Math.ceil((cx - W / 2 / s) / step); i * step <= cx + W / 2 / s; i++) grid += `<line x1="${X(i * step)}" y1="0" x2="${X(i * step)}" y2="${H}"/>`;
  for (let i = Math.ceil((cy - H / 2 / s) / step); i * step <= cy + H / 2 / s; i++) grid += `<line x1="0" y1="${Y(i * step)}" x2="${W}" y2="${Y(i * step)}"/>`;
  const bar = +(step * s).toFixed(1);
  // labels never cover a marker, the scale bar, the north arrow or another label; one that cannot be placed is dropped
  // (the numbered marker still matches the numbered list on the left)
  const boxes = all.map((p) => ({ x0: X(p.x) - 11, x1: X(p.x) + 11, y0: Y(p.y) - 11, y1: Y(p.y) + 11 }));
  boxes.push({ x0: 0, x1: 24 + bar, y0: H - 34, y1: H }, { x0: W - 32, x1: W, y0: 0, y1: 40 });
  const textW = (str, px) => [...str].reduce((a, ch) => a + (/[⺀-鿿가-힯＀-￯]/.test(ch) ? px : px * 0.62), 0);
  const free = (b) => b.x0 >= 2 && b.x1 <= W - 2 && b.y0 >= 2 && b.y1 <= H - 2 && !boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const place = (cls, text, px, spots) => {
    for (const [x, y, anchor] of spots) {
      const w = textW(text, px); const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      const b = { x0, x1: x0 + w, y0: y - px, y1: y + 3 };
      if (!free(b)) continue;
      boxes.push(b);
      return `<text class="${cls} halo" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" lang="zh-CN">${esc(text)}</text>`;
    }
    return '';
  };
  const nameSpots = (p) => { const x = X(p.x), y = Y(p.y); return [[x + 14, y + 4, 'start'], [x - 14, y + 4, 'end'], [x, y - 15, 'middle'], [x, y + 24, 'middle']]; };
  const short = (str) => (str.length > 11 ? str.slice(0, 10) + '…' : str);
  let links = '', dists = '', marks = '', labels = '';
  for (const p of pts) if (h) links += `<line class="link" x1="${X(h.x)}" y1="${Y(h.y)}" x2="${X(p.x)}" y2="${Y(p.y)}"/>`;
  // drawn last-first so that, where two places nearly coincide, the lower number stays on top
  for (const p of [...pts].reverse()) marks += `<g class="poi"><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="9"/><text x="${X(p.x)}" y="${(Y(p.y) + 3.8).toFixed(1)}" text-anchor="middle">${p.n}</text></g>`;
  if (h) marks += `<g class="hotel"><rect x="${X(h.x) - 8}" y="${Y(h.y) - 8}" width="16" height="16" rx="4"/><text x="${X(h.x)}" y="${(Y(h.y) + 3.8).toFixed(1)}" text-anchor="middle">H</text></g>`;
  if (h) labels += place('lbl', h.label, 11, nameSpots(h));
  for (const p of pts) labels += place('lbl', short(p.label), 11, nameSpots(p));
  if (h) {
    for (const p of pts) {
      const km = p.km != null ? Number(p.km) : Math.hypot(p.x - h.x, p.y - h.y);
      const mx = (X(h.x) + X(p.x)) / 2, my = (Y(h.y) + Y(p.y)) / 2;
      dists += place('dist', kmText(km), 10.5, [[mx, my - 5, 'middle'], [mx, my + 13, 'middle'], [mx + 6, my + 4, 'start'], [mx - 6, my + 4, 'end']]);
    }
  }
  const scale = `<g class="scale"><line x1="12" y1="${H - 14}" x2="${12 + bar}" y2="${H - 14}"/><line x1="12" y1="${H - 18}" x2="12" y2="${H - 10}"/><line x1="${12 + bar}" y1="${H - 18}" x2="${12 + bar}" y2="${H - 10}"/><text x="${12 + bar / 2}" y="${H - 21}" text-anchor="middle">${esc(kmText(step))}</text></g>`;
  const north = `<g class="north" transform="translate(${W - 18} 12)"><path d="M0 0l5 12-5-3-5 3z"/><text x="0" y="24" text-anchor="middle">N</text></g>`;
  const svg = `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('mapTitle'))}"><g class="grid">${grid}</g>${links}${dists}${marks}${labels}${scale}${north}</svg>`;
  return `<figure class="mapcard"><div class="map-title">${icon('pin')}${esc(t('mapTitle'))}</div>${svg}<figcaption class="map-note">${esc(t('mapNote'))}${h ? ` ${esc(t('hotelShort'))}: ${coord(h)}` : ''}</figcaption></figure>`;
}

function dayHtml(d) {
  const h = plan.narrative.days.find((x) => x.index === d.index) || {};
  const nums = new Map(); let k = 0;
  for (const s of d.stops) if (s.type === 'poi' && s.option) nums.set(s.id, ++k);
  const map = mapHtml(d, nums);
  return `<section class="day" id="day-${d.index}">
    <header class="dayhead"><span class="dnum">${esc(tn('dayN', d.index))}</span><h3>${esc(h.headline || d.city)}</h3><span class="date">${esc(fmtDate(d.date))} · ${zh(d.city)}</span></header>
    ${h.tip ? `<p class="tip">${icon('info')}<span>${esc(h.tip)}</span></p>` : ''}
    <div class="daybody${map ? '' : ' nomap'}"><ol class="stops">${d.stops.map((s) => stopHtml(s, nums)).join('')}</ol>${map}</div>
    <div class="dayphrases"><span>${esc(t('phrases'))}</span>${cardBtns(d.cards, 'day' + d.index)}</div>
  </section>`;
}

function costHtml() {
  const tot = plan.totals;
  const typeIcon = { flight: 'plane', train: 'train', hotel: 'bed', poi: 'ticket' };
  const rows = (tot.priced || []).filter((p) => p.value > 0).map((p) => {
    const qty = p.type === 'hotel' ? tn('nights', p.qty) : String(p.qty);
    const calc = p.unit != null && p.qty != null ? `<small>${esc(money(p.unit))} × ${esc(qty)}</small>` : '';
    return `<tr><td>${icon(typeIcon[p.type] || 'ticket')}</td><td class="lbl">${zh(p.label)}${calc}</td><td class="num">${esc(money(p.value))}</td></tr>`;
  });
  const masked = (tot.masked || []).map((m) => `<tr class="masked"><td>${icon('alert')}</td><td class="lbl">${zh(m.label)}<small>${esc(t('maskedRow'))}</small></td><td class="num">¥${esc(String(m.price).replace(/^¥/, ''))}*</td></tr>`);
  return `<aside class="cost"><div class="cost-head">${esc(t('costTitle'))}</div>
    <table>${rows.join('')}${masked.join('')}</table>
    <div class="total"><span>${esc(t('known'))}</span><b>${esc(money(tot.knownSum))}</b></div>
    <p class="cost-note">${esc(t('costNote'))}</p>${tot.masked && tot.masked.length ? `<p class="cost-note warn">* ${esc(t('hotelsNote'))}</p>` : ''}</aside>`;
}

function tripHtml() {
  const n = plan.narrative; const it = plan.intent; const A = new Set(it.assumptions || []);
  const assumed = (...keys) => (keys.some((k) => A.has(k)) ? `<span class="assumed">${esc(t('assume'))}</span>` : '');
  const facts = [
    [icon('route'), `${zh([it.origin, ...it.destinations].join(' → '))}${assumed('origin_default', 'dest_default')}`],
    [icon('calendar'), `${esc(fmtDate(it.startDate))} – ${esc(fmtDate(it.endDate))} · ${esc(tn('tripDays', it.days))}${assumed('date_default', 'days_default')}`],
    [icon('user'), esc(tn('adults', it.adults || 1))],
  ];
  if ((it.interests || []).length) facts.push([icon('heart'), zh(it.interests.join('・'))]);
  const stay = plan.stay;
  if (stay) facts.push([icon('bed'), `${esc(t('stayFact').replace('{name}', (t('budgetNames') || {})[stay.budget] || stay.budget).replace('{band}', (t('budgetBands') || {})[stay.budget] || ''))}${assumed('budget_default')}`]);
  const fixtures = plan.data.sources.some((s) => s.source === 'fixture' || s.source === 'fixture-fallback');
  const feizhu = plan.days.some((d) => d.stops.some((s) => s.option && s.option.url && /feizhu\.com/.test(s.option.url)));
  const notes = [];
  if ((plan.data.errors || []).length) notes.push(`<p class="note">${icon('alert')}<span>${esc(t('errFlyai'))}: ${plan.data.errors.map((e) => esc(e.command + ' — ' + (e.error || ''))).join(' · ')}</span></p>`);
  if (plan.data.paused) notes.push(`<p class="note">${icon('pause')}<span>${esc(t('pausedNote').replace('{r}', plan.data.paused.reason).replace('{t}', clock(plan.data.paused.until)))}</span></p>`);
  else if (plan.data.fallback) notes.push(`<p class="note">${icon('info')}<span>${esc(t('fallbackNote'))}</span></p>`);
  for (const c of (stay && stay.cities) || []) if (!c.inBudget) notes.push(`<p class="note">${icon('info')}<span>${esc(t('noBudgetNote')).replace('{c}', zh(c.city))}</span></p>`);
  const dayline = plan.days.map((d) => {
    const h = n.days.find((x) => x.index === d.index) || {};
    const moves = d.stops.filter((s) => (s.type === 'flight' || s.type === 'train') && s.option).map((s) => s.option.no);
    const spots = d.stops.filter((s) => s.type === 'poi' && s.option).length;
    const sub = [fmtDate(d.date), ...moves, spots ? tn('spots', spots) : ''].filter(Boolean);
    return `<li><a href="#day-${d.index}"><span class="dnum">${esc(tn('dayN', d.index))}</span><b>${esc(h.headline || d.city)}</b><small>${sub.map((x) => `<span>${esc(x)}</span>`).join(' · ')}</small></a></li>`;
  }).join('');
  return `<div class="planhead">
    <div class="ph-main">
      <h2>${esc(n.title)}</h2>
      <p class="overview">${esc(n.overview)}</p>
      <ul class="facts">${facts.map(([i, html]) => `<li>${i}<span>${html}</span></li>`).join('')}</ul>
      <ol class="dayline">${dayline}</ol>
      <div class="badges">
        <span class="badge ${plan.data.experienceMode ? 'warn' : 'ok'}">${icon('database')}flyai: ${plan.data.experienceMode ? 'experience mode' : 'API key'}${fixtures ? ' · recorded fixtures' : ''}</span>
        ${feizhu ? `<span class="badge ok">${icon('link')}router.feizhu.com</span>` : ''}
        <span class="badge ${plan.llm.mode === 'live' ? 'ok' : 'warn'}">LLM: ${esc(plan.llm.mode === 'live' ? plan.llm.textModel : 'mock')} · ${esc(n.source)}</span>
        <span class="badge">intent: ${esc(it.extractor)}</span>
      </div>
      ${notes.length ? `<div class="notes">${notes.join('')}</div>` : ''}
    </div>
    ${costHtml()}
  </div>`;
}

function cardsTabHtml() {
  const tile = ({ c, id }) => `<button type="button" class="pcard" data-card="${id}"><span class="t">${icon(CARD_ICON[c.type] || 'cards')}${esc(c.title)}</span><span class="z" lang="zh-CN">${esc(c.zh)}</span>${c.gloss ? `<span class="g">${esc(c.gloss)}</span>` : ''}</button>`;
  // the day-level phrases (ordering, help) are the same every day: show them once, first
  const anywhere = plan.days.length ? plan.days[0].cards.map((c, i) => ({ c, id: `day${plan.days[0].index}:${i}` })) : [];
  const groups = plan.days.map((d) => {
    const seen = new Set(); const items = [];
    d.stops.forEach((s) => (s.cards || []).forEach((c, i) => { if (!seen.has(c.zh)) { seen.add(c.zh); items.push({ c, id: `${s.id}:${i}` }); } }));
    return items.length ? `<section class="cardgroup"><h3><span class="dnum">${esc(tn('dayN', d.index))}</span>${esc(fmtDate(d.date))} · ${zh(d.city)}</h3><div class="cardgrid">${items.map(tile).join('')}</div></section>` : '';
  });
  return `<div class="tabintro"><h3>${esc(t('cardsTitle'))}</h3><p>${esc(t('staffHint'))}</p></div>
    ${anywhere.length ? `<section class="cardgroup"><h3><span class="dnum alt">${esc(t('anywhere'))}</span></h3><div class="cardgrid">${anywhere.map(tile).join('')}</div></section>` : ''}${groups.join('')}`;
}
function photoTabHtml() {
  const live = plan.llm.mode === 'live';
  // the static page cannot call the model, so it shows no model badge; its samples carry their own recording note
  const model = STATIC ? '<span></span>' : `<span class="badge ${live ? 'ok' : 'warn'}">${esc(plan.llm.vlModel)}${live ? '' : ' · mock'}</span>`;
  return `<div class="photo-grid">
    <div class="panel">
      <h3>${esc(t('photoTitle'))}</h3><p>${esc(t('photoSub'))}</p>
      <label class="drop"><input id="ph" type="file" accept="image/*" multiple hidden>${icon('camera')}<b>${esc(t('pick'))}</b><span class="small muted">${esc(t('pickHint'))}</span></label>
      <div class="ph-thumbs" id="phprev"></div>
      <div class="row">${model}<button class="btn primary" id="phgo" type="button">${esc(t('translate'))}</button></div>
      <div class="ph-samples" hidden><h4>${esc(t('samplesTitle'))}</h4><div class="ph-samplelist" id="phsamples"></div></div>
    </div>
    <div class="panel" aria-live="polite"><div class="ph-empty" id="phempty">${esc(t('photoEmpty'))}</div><div id="phout"></div></div>
  </div>`;
}
function tipsTabHtml() {
  return `<div class="tabintro"><p class="warnline">${icon('alert')}<span>${esc(t('tipsNote'))}</span></p></div>
    <div class="tiplist">${plan.tips.map((x) => `<article class="tipitem"><span class="badge ${x.kind === 'official' ? 'red' : ''}">${icon(x.kind === 'official' ? 'shield' : 'info')}${esc(t(x.kind))}</span><p>${esc(x.text)}</p>${x.sources.length ? `<div class="src">${icon('link')}<span>${esc(t('source'))}:</span>${x.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`).join('<span>·</span>')}<span class="checked">${esc(t('checked'))} ${esc(x.checked)}</span></div>` : ''}</article>`).join('')}</div>`;
}
function sourcesHtml() {
  const args = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `--${k} ${v}`).join(' ');
  return `<h3>${icon('database')}${esc(t('dataTitle'))}</h3><p class="muted small">${esc(t('dataLine'))}</p>
    <details><summary>flyai queries (${plan.data.sources.length}) · ${esc(plan.createdAt)}</summary><ul class="qlog">${plan.data.sources.map((s) => `<li><code>flyai ${esc(s.command)} ${esc(args(s.args))}</code><span>${s.count} items · ${esc(s.source)} · ${esc(s.fetchedAt)}</span></li>`).join('')}</ul></details>
    ${plan.data.systemMessage ? `<div class="sys">${sysHtml(plan.data.systemMessage)}</div>` : ''}`;
}

function renderPlan() {
  $('#trip').innerHTML = tripHtml();
  $('#tabs').innerHTML = t('tabs').map((x, i) => `<button type="button" role="tab" data-tab="${i}" class="${i === currentTab ? 'on' : ''}" aria-selected="${i === currentTab}">${icon(TAB_ICON[i])}<span>${esc(x)}</span></button>`).join('');
  $('#tab-plan').innerHTML = plan.days.map(dayHtml).join('');
  $('#tab-cards').innerHTML = cardsTabHtml();
  $('#tab-photo').innerHTML = photoTabHtml();
  $('#ph').addEventListener('change', onPhoto); $('#phgo').addEventListener('click', explainPhoto);
  $('#phsamples').addEventListener('click', (e) => { const b = e.target.closest('[data-sample]'); if (b) pickSample(b.dataset.sample); });
  fillSamples();
  $('#tab-tips').innerHTML = tipsTabHtml();
  $('#sources').innerHTML = sourcesHtml();
  showTab(currentTab);
}

function showTab(i) {
  currentTab = i;
  ['plan', 'cards', 'photo', 'tips'].forEach((k, j) => { $('#tab-' + k).hidden = j !== i; });
  document.querySelectorAll('#tabs button').forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); });
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) showTab(Number(b.dataset.tab)); });
// a day link in the trip header always lands on the itinerary tab
$('#trip').addEventListener('click', (e) => { if (e.target.closest('a[href^="#day-"]')) showTab(0); });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-card]'); if (b) openCardById(b.dataset.card); });

// ---- full-screen show-to-staff card ------------------------------------------
function findCard(id) {
  const [sid, i] = id.split(':');
  for (const d of plan.days) { if (sid === 'day' + d.index) return d.cards[i]; const s = d.stops.find((x) => x.id === sid); if (s) return s.cards[i]; }
  return null;
}
function openCardById(id) {
  const c = findCard(id); if (!c) return;
  $('#m-title').innerHTML = `${icon(CARD_ICON[c.type] || 'cards')}<span>${esc(c.title)}</span>`;
  $('#m-zh').textContent = c.zh; $('#m-gloss').textContent = c.gloss || '';
  $('#m-zh').classList.remove('rot'); $('#m-gloss').classList.remove('rot');
  $('#modal').hidden = false;
}
$('#m-close').addEventListener('click', () => { $('#modal').hidden = true; });
$('#m-rot').addEventListener('click', () => { $('#m-zh').classList.toggle('rot'); $('#m-gloss').classList.toggle('rot'); });
$('#m-save').addEventListener('click', saveCardPng);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) $('#modal').hidden = true; });
function wrapText(ctx, text, max) {
  const out = [];
  for (const para of String(text || '').split('\n')) {
    let cur = '';
    for (const ch of para) {
      if (cur && ctx.measureText(cur + ch).width > max) { out.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) out.push(cur);
  }
  return out;
}
function saveCardPng() {
  const zhText = $('#m-zh').textContent || '';
  const gloss = $('#m-gloss').textContent || '';
  const title = $('#m-title').textContent || 'card';
  const canvas = document.createElement('canvas');
  const w = 1080;
  const ctx = canvas.getContext('2d');
  const zhFont = '700 72px "PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC",sans-serif';
  ctx.font = zhFont;
  const lines = wrapText(ctx, zhText, w - 120);
  ctx.font = '28px sans-serif';
  const glines = gloss ? wrapText(ctx, gloss, w - 120) : [];
  canvas.width = w;
  canvas.height = Math.max(640, 200 + lines.length * 100 + 48 + glines.length * 42 + 60);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#b3321e';
  ctx.font = '600 28px sans-serif';
  ctx.fillText(title, 60, 80);
  ctx.fillStyle = '#15171c';
  ctx.font = zhFont;
  let y = 200;
  for (const line of lines) { ctx.fillText(line, 60, y); y += 100; }
  ctx.fillStyle = '#757a84';
  ctx.font = '28px sans-serif';
  y += 16;
  for (const line of glines) { ctx.fillText(line, 60, y); y += 42; }
  ctx.fillStyle = '#a5a9b1';
  ctx.font = '22px sans-serif';
  ctx.fillText('China Ready · 入境中国随身通', 60, canvas.height - 40);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'china-ready-card.png';
  a.click();
}

// ---- photo lookup ------------------------------------------------------------
// The selection is either your own photos (resized JPEG data URLs) or a sample from photos/samples.json,
// whose full images are fetched only when it is sent to the model.
let photoSel = { sample: null, photos: [] };
let photoSamples = null;
const KIND_ICON = { menu: 'utensils', shopfront: 'utensils', sign: 'signpost', notice: 'info', exhibit: 'museum', dish: 'utensils', other: 'camera' };
const stateHtml = (ic, title, msg) => `<div class="state">${icon(ic)}<div>${title ? `<b>${esc(title)}</b>` : ''}<p>${esc(msg)}</p></div></div>`;
const thumbOf = (f) => 'photos/' + f.replace(/\.jpg$/, '-thumb.jpg');

async function fillSamples() {
  if (!photoSamples) {
    try { const r = await fetch('photos/samples.json'); photoSamples = r.ok ? (await r.json()).samples || [] : []; } catch (_) { photoSamples = []; }
  }
  const el = $('#phsamples'); if (!el) return;
  el.innerHTML = photoSamples.map((x) => `<button type="button" class="ph-sample" data-sample="${esc(x.id)}" aria-pressed="false"><span class="ph-sthumbs">${x.files.map((f) => `<img src="${esc(thumbOf(f))}" alt="">`).join('')}</span><span class="ph-slabel">${esc((t('samples') || {})[x.id] || x.id)}</span></button>`).join('');
  el.closest('.ph-samples').hidden = !photoSamples.length;
  // after a re-render (e.g. a language switch) a picked sample shows its answer again
  if (photoSel.sample) pickSample(photoSel.sample); else paintSelection();
}
function paintSelection() {
  $('#phprev').innerHTML = photoSel.photos.map((p) => `<img src="${esc(p.thumb)}" alt="">`).join('');
  document.querySelectorAll('.ph-sample').forEach((b) => { const on = b.dataset.sample === photoSel.sample; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
}
function pickSample(id) {
  const x = (photoSamples || []).find((p) => p.id === id); if (!x) return;
  photoSel = { sample: id, photos: x.files.map((f) => ({ thumb: thumbOf(f), src: 'photos/' + f, data: null })) };
  paintSelection();
  // a recorded answer in the reader's language, else in any language it was recorded in (and the page says which)
  const rl = x.results[lang] ? lang : ['ja', 'en', 'ko', 'zh'].find((l) => x.results[l]);
  if (rl) showPhotoResult(x.results[rl], { recordedAt: x.results[rl].recordedAt, lang: rl });
  else { $('#phout').innerHTML = ''; $('#phempty').hidden = false; }
}
function resized(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(rd.error);
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(t('errGeneric')));
      // redrawing on a canvas also drops the photo's EXIF data (camera, time, location) before upload
      img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); resolve(cv.toDataURL('image/jpeg', 0.85)); };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}
async function onPhoto(e) {
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  try {
    const datas = await Promise.all(files.slice(0, 3).map(resized));
    photoSel = { sample: null, photos: datas.map((d) => ({ thumb: d, data: d })) };
    paintSelection();
    $('#phout').innerHTML = files.length > 3 ? `<p class="small muted">${esc(t('tooMany'))}</p>` : '';
    $('#phempty').hidden = files.length > 3;
  } catch (err) { $('#phempty').hidden = true; $('#phout').innerHTML = stateHtml('alert', '', err.message || t('errGeneric')); }
}
async function asDataUrl(src) {
  const blob = await (await fetch(src)).blob();
  return new Promise((resolve, reject) => { const rd = new FileReader(); rd.onload = () => resolve(rd.result); rd.onerror = () => reject(rd.error); rd.readAsDataURL(blob); });
}
async function explainPhoto() {
  if (!photoSel.photos.length) { $('#ph').click(); return; }
  if (STATIC) {
    if (photoSel.sample) pickSample(photoSel.sample);
    else { $('#phempty').hidden = true; $('#phout').innerHTML = stateHtml('info', t('unavailable'), t('staticPhoto')); }
    return;
  }
  $('#phempty').hidden = true;
  $('#phout').innerHTML = '<div class="ph-empty"><span class="spinner"></span></div>';
  $('#phgo').disabled = true;
  try {
    for (const p of photoSel.photos) if (!p.data) p.data = await asDataUrl(p.src);
    const r = await fetch('api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: photoSel.photos.map((p) => p.data), lang }) });
    const j = await r.json();
    if (!r.ok) { $('#phout').innerHTML = stateHtml('alert', '', j.error || t('errGeneric')); return; }
    if (!j.available) { $('#phout').innerHTML = stateHtml('info', t('unavailable'), j.message); return; }
    showPhotoResult(j, null);
  } catch (e) { $('#phout').innerHTML = stateHtml('alert', '', e.message || t('errGeneric')); }
  finally { $('#phgo').disabled = false; }
}
function showPhotoResult(j, rec) {
  $('#phempty').hidden = true;
  $('#phout').innerHTML = photoResultHtml(j, rec);
}
function photoResultHtml(j, rec) {
  const conf = j.confidence ? `<span class="badge ${j.confidence === 'high' ? 'ok' : j.confidence === 'low' ? 'warn' : ''}">${esc((t('conf') || {})[j.confidence] || j.confidence)}</span>` : '';
  const head = `<div class="ph-head"><span class="badge">${icon(KIND_ICON[j.kind] || 'camera')}${esc((t('kinds') || {})[j.kind] || j.kind || '')}</span>${conf}</div>`;
  const list = (title, items) => (items.length ? `<div class="ph-block"><h5>${esc(title)}</h5><ul class="ph-list">${items.join('')}</ul></div>` : '');
  const warns = (j.warnings || []).length ? `<div class="warns">${j.warnings.map((w) => `<span class="badge warn">${icon('alert')}${esc(w)}</span>`).join('')}</div>` : '';
  const details = (j.details || []).length ? `<ul class="ph-details">${j.details.map((d) => `<li><span class="tag ${d.basis === 'photo' ? 'photo' : 'general'}">${esc(t(d.basis === 'photo' ? 'basisPhoto' : 'basisGeneral'))}</span><span>${esc(d.text)}</span></li>`).join('')}</ul>` : '';
  const advice = j.advice ? `<div class="ph-advice"><h5>${icon('info')}${esc(t('adviceTitle'))}</h5><p>${esc(j.advice)}</p><p class="small muted">${esc(t('adviceNote'))}</p></div>` : '';
  const cands = list(t('candTitle'), (j.candidates || []).map((c) => `<li><b lang="zh-CN">${esc(c.zh)}</b> <span class="muted">${esc(c.pinyin)}</span> — ${esc(c.meaning)}</li>`));
  const unc = list(t('uncTitle'), (j.uncertain || []).map((u) => `<li>${esc(u)}</li>`));
  const priced = (j.items || []).some((x) => x.price);
  // pinyin sits under the Chinese, so the Chinese column stays wide enough for a dish name on one line
  const rows = (j.items || []).map((x) => `<tr><td><b lang="zh-CN">${esc(x.zh)}</b>${x.pinyin ? `<div class="py">${esc(x.pinyin)}</div>` : ''}</td><td>${esc(x.meaning)}${x.note ? `<div class="small muted">${esc(x.note)}</div>` : ''}</td>${priced ? `<td class="num">${esc(x.price || '')}</td>` : ''}</tr>`).join('');
  const table = rows ? `<div class="ph-block"><h5>${esc(t('textTitle'))}</h5><table class="tr ph-table"><thead><tr><th>中文 · ${esc(t('colPinyin'))}</th><th>${esc(t('colMeaning'))}</th>${priced ? '<th class="num">¥</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>` : '';
  const foot = rec
    ? esc(t('recordedNote').replace('{t}', when(rec.recordedAt)).replace('{m}', j.model)) + (rec.lang !== lang ? ' ' + esc(t('recordedLang').replace('{l}', I[rec.lang].name)) : '')
    : esc(j.model);
  return `${head}${j.title ? `<h4 class="ph-title">${esc(j.title)}</h4>` : ''}${j.summary ? `<p class="ph-sum">${esc(j.summary)}</p>` : ''}${warns}${advice}${details}${cands}${unc}${table}<p class="small muted ph-foot">${esc(t('aiNote'))}<br>${foot}</p>`;
}

(async function init() {
  if (!STATIC) { try { status = await (await fetch('api/status')).json(); } catch (_) {} }
  renderStatic();
  // ?demo=1|2|3 opens an example directly; otherwise the static sample shows the language chooser
  const demo = params.get('demo');
  if (demo) { const ex = EXAMPLES[Number(demo) - 1] || EXAMPLES[0]; if (!params.get('lang')) lang = ex.lang; $('#q').value = ex.text; renderStatic(); run(); }
})();
