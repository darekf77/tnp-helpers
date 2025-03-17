const iso = {
    aar: 'aa',
    abk: 'ab',
    afr: 'af',
    aka: 'ak',
    alb: 'sq',
    amh: 'am',
    ara: 'ar',
    arg: 'an',
    arm: 'hy',
    asm: 'as',
    ava: 'av',
    ave: 'ae',
    aym: 'ay',
    aze: 'az',
    bak: 'ba',
    bam: 'bm',
    baq: 'eu',
    bel: 'be',
    ben: 'bn',
    bih: 'bh',
    bis: 'bi',
    bos: 'bs',
    bre: 'br',
    bul: 'bg',
    bur: 'my',
    cat: 'ca',
    cha: 'ch',
    che: 'ce',
    chi: 'zh',
    chu: 'cu',
    chv: 'cv',
    cor: 'kw',
    cos: 'co',
    cre: 'cr',
    cze: 'cs',
    dan: 'da',
    div: 'dv',
    dut: 'nl',
    dzo: 'dz',
    eng: 'en',
    epo: 'eo',
    est: 'et',
    ewe: 'ee',
    fao: 'fo',
    fij: 'fj',
    fin: 'fi',
    fre: 'fr',
    fry: 'fy',
    ful: 'ff',
    geo: 'ka',
    ger: 'de',
    gla: 'gd',
    gle: 'ga',
    glg: 'gl',
    glv: 'gv',
    gre: 'el',
    grn: 'gn',
    guj: 'gu',
    hat: 'ht',
    hau: 'ha',
    heb: 'he',
    her: 'hz',
    hin: 'hi',
    hmo: 'ho',
    hrv: 'hr',
    hun: 'hu',
    ibo: 'ig',
    ice: 'is',
    ido: 'io',
    iii: 'ii',
    iku: 'iu',
    ile: 'ie',
    ina: 'ia',
    ind: 'id',
    ipk: 'ik',
    ita: 'it',
    jav: 'jv',
    jpn: 'ja',
    kal: 'kl',
    kan: 'kn',
    kas: 'ks',
    kau: 'kr',
    kaz: 'kk',
    khm: 'km',
    kik: 'ki',
    kin: 'rw',
    kir: 'ky',
    kom: 'kv',
    kon: 'kg',
    kor: 'ko',
    kua: 'kj',
    kur: 'ku',
    lao: 'lo',
    lat: 'la',
    lav: 'lv',
    lim: 'li',
    lin: 'ln',
    lit: 'lt',
    ltz: 'lb',
    lub: 'lu',
    lug: 'lg',
    mac: 'mk',
    mah: 'mh',
    mal: 'ml',
    mao: 'mi',
    mar: 'mr',
    may: 'ms',
    mlg: 'mg',
    mlt: 'mt',
    mon: 'mn',
    nau: 'na',
    nav: 'nv',
    nbl: 'nr',
    nde: 'nd',
    ndo: 'ng',
    nep: 'ne',
    nno: 'nn',
    nob: 'nb',
    nor: 'no',
    nya: 'ny',
    oci: 'oc',
    oji: 'oj',
    ori: 'or',
    orm: 'om',
    oss: 'os',
    pan: 'pa',
    per: 'fa',
    pli: 'pi',
    pol: 'pl',
    por: 'pt',
    pus: 'ps',
    que: 'qu',
    roh: 'rm',
    rum: 'ro',
    run: 'rn',
    rus: 'ru',
    sag: 'sg',
    san: 'sa',
    sin: 'si',
    slo: 'sk',
    slv: 'sl',
    sme: 'se',
    smo: 'sm',
    sna: 'sn',
    snd: 'sd',
    som: 'so',
    sot: 'st',
    spa: 'es',
    srd: 'sc',
    srp: 'sr',
    ssw: 'ss',
    sun: 'su',
    swa: 'sw',
    swe: 'sv',
    tah: 'ty',
    tam: 'ta',
    tat: 'tt',
    tel: 'te',
    tgk: 'tg',
    tgl: 'tl',
    tha: 'th',
    tib: 'bo',
    tir: 'ti',
    ton: 'to',
    tsn: 'tn',
    tso: 'ts',
    tuk: 'tk',
    tur: 'tr',
    twi: 'tw',
    uig: 'ug',
    ukr: 'uk',
    urd: 'ur',
    uzb: 'uz',
    ven: 've',
    vie: 'vi',
    vol: 'vo',
    wel: 'cy',
    wln: 'wa',
    wol: 'wo',
    xho: 'xh',
    yid: 'yi',
    yor: 'yo',
    zha: 'za',
    zul: 'zu',
  },
  names = {
    afar: 'aa',
    abkhazian: 'ab',
    afrikaans: 'af',
    akan: 'ak',
    albanian: 'sq',
    amharic: 'am',
    arabic: 'ar',
    aragonese: 'an',
    armenian: 'hy',
    assamese: 'as',
    avaric: 'av',
    avestan: 'ae',
    aymara: 'ay',
    azerbaijani: 'az',
    bashkir: 'ba',
    bambara: 'bm',
    basque: 'eu',
    belarusian: 'be',
    bengali: 'bn',
    'bihari languages': 'bh',
    bislama: 'bi',
    tibetan: 'bo',
    bosnian: 'bs',
    breton: 'br',
    bulgarian: 'bg',
    burmese: 'my',
    catalan: 'ca',
    valencian: 'ca',
    czech: 'cs',
    chamorro: 'ch',
    chechen: 'ce',
    chinese: 'zh',
    'church slavic': 'cu',
    'old slavonic': 'cu',
    'church slavonic': 'cu',
    'old bulgarian': 'cu',
    'old church slavonic': 'cu',
    chuvash: 'cv',
    cornish: 'kw',
    corsican: 'co',
    cree: 'cr',
    welsh: 'cy',
    danish: 'da',
    german: 'de',
    divehi: 'dv',
    dhivehi: 'dv',
    maldivian: 'dv',
    dutch: 'nl',
    flemish: 'nl',
    dzongkha: 'dz',
    greek: 'el',
    english: 'en',
    esperanto: 'eo',
    estonian: 'et',
    ewe: 'ee',
    faroese: 'fo',
    persian: 'fa',
    fijian: 'fj',
    finnish: 'fi',
    french: 'fr',
    'western frisian': 'fy',
    fulah: 'ff',
    georgian: 'ka',
    gaelic: 'gd',
    'scottish gaelic': 'gd',
    irish: 'ga',
    galician: 'gl',
    manx: 'gv',
    guarani: 'gn',
    gujarati: 'gu',
    haitian: 'ht',
    'haitian creole': 'ht',
    hausa: 'ha',
    hebrew: 'he',
    herero: 'hz',
    hindi: 'hi',
    'hiri motu': 'ho',
    croatian: 'hr',
    hungarian: 'hu',
    igbo: 'ig',
    icelandic: 'is',
    ido: 'io',
    'sichuan yi': 'ii',
    nuosu: 'ii',
    inuktitut: 'iu',
    interlingue: 'ie',
    occidental: 'ie',
    interlingua: 'ia',
    indonesian: 'id',
    inupiaq: 'ik',
    italian: 'it',
    javanese: 'jv',
    japanese: 'ja',
    kalaallisut: 'kl',
    greenlandic: 'kl',
    kannada: 'kn',
    kashmiri: 'ks',
    kanuri: 'kr',
    kazakh: 'kk',
    'central khmer': 'km',
    kikuyu: 'ki',
    gikuyu: 'ki',
    kinyarwanda: 'rw',
    kirghiz: 'ky',
    kyrgyz: 'ky',
    komi: 'kv',
    kongo: 'kg',
    korean: 'ko',
    kuanyama: 'kj',
    kwanyama: 'kj',
    kurdish: 'ku',
    lao: 'lo',
    latin: 'la',
    latvian: 'lv',
    limburgan: 'li',
    limburger: 'li',
    limburgish: 'li',
    lingala: 'ln',
    lithuanian: 'lt',
    luxembourgish: 'lb',
    letzeburgesch: 'lb',
    'luba-katanga': 'lu',
    ganda: 'lg',
    macedonian: 'mk',
    marshallese: 'mh',
    malayalam: 'ml',
    maori: 'mi',
    marathi: 'mr',
    malay: 'ms',
    malagasy: 'mg',
    maltese: 'mt',
    mongolian: 'mn',
    nauru: 'na',
    navajo: 'nv',
    navaho: 'nv',
    'ndebele, south': 'nr',
    'south ndebele': 'nr',
    'ndebele, north': 'nd',
    'north ndebele': 'nd',
    ndonga: 'ng',
    nepali: 'ne',
    'norwegian nynorsk': 'nn',
    'nynorsk, norwegian': 'nn',
    'norwegian bokmål': 'nb',
    'bokmål, norwegian': 'nb',
    norwegian: 'no',
    chichewa: 'ny',
    chewa: 'ny',
    nyanja: 'ny',
    occitan: 'oc',
    ojibwa: 'oj',
    oriya: 'or',
    oromo: 'om',
    ossetian: 'os',
    ossetic: 'os',
    panjabi: 'pa',
    punjabi: 'pa',
    pali: 'pi',
    polish: 'pl',
    portuguese: 'pt',
    pushto: 'ps',
    pashto: 'ps',
    quechua: 'qu',
    romansh: 'rm',
    romanian: 'ro',
    moldavian: 'ro',
    moldovan: 'ro',
    rundi: 'rn',
    russian: 'ru',
    sango: 'sg',
    sanskrit: 'sa',
    sinhala: 'si',
    sinhalese: 'si',
    slovak: 'sk',
    slovenian: 'sl',
    'northern sami': 'se',
    samoan: 'sm',
    shona: 'sn',
    sindhi: 'sd',
    somali: 'so',
    'sotho, southern': 'st',
    spanish: 'es',
    castilian: 'es',
    sardinian: 'sc',
    serbian: 'sr',
    swati: 'ss',
    sundanese: 'su',
    swahili: 'sw',
    swedish: 'sv',
    tahitian: 'ty',
    tamil: 'ta',
    tatar: 'tt',
    telugu: 'te',
    tajik: 'tg',
    tagalog: 'tl',
    thai: 'th',
    tigrinya: 'ti',
    tonga: 'to',
    tswana: 'tn',
    tsonga: 'ts',
    turkmen: 'tk',
    turkish: 'tr',
    twi: 'tw',
    uighur: 'ug',
    uyghur: 'ug',
    ukrainian: 'uk',
    urdu: 'ur',
    uzbek: 'uz',
    venda: 've',
    vietnamese: 'vi',
    volapük: 'vo',
    walloon: 'wa',
    wolof: 'wo',
    xhosa: 'xh',
    yiddish: 'yi',
    yoruba: 'yo',
    zhuang: 'za',
    chuang: 'za',
    zulu: 'zu',
  } as const;
// @ts-ignore
const isoKeys = Object.values(iso).sort();
var languages = e => {
  if ('string' != typeof e)
    throw new Error('The "language" must be a string, received ' + typeof e);
  if (e.length > 100)
    throw new Error(`The "language" is too long at ${e.length} characters`);
  if (
    ((e = e.toLowerCase()), (e = names[e] || iso[e] || e), !isoKeys.includes(e))
  )
    throw new Error(`The language "${e}" is not part of the ISO 639-1`);
  return e;
};

function Cache() {
  var e = Object.create(null);
  function a(a) {
    delete e[a];
  }
  (this.set = function (n, i, r) {
    if (void 0 !== r && ('number' != typeof r || isNaN(r) || r <= 0))
      throw new Error('Cache timeout must be a positive number');
    var t = e[n];
    t && clearTimeout(t.timeout);
    var o = { value: i, expire: r + Date.now() };
    return (
      // @ts-ignore
      isNaN(o.expire) || (o.timeout = setTimeout(() => a(n), r)), (e[n] = o), i
    );
  }),
    (this.del = function (n) {
      var i = !0,
        r = e[n];
      return (
        r
          ? (clearTimeout(r.timeout),
            !isNaN(r.expire) && r.expire < Date.now() && (i = !1))
          : (i = !1),
        i && a(n),
        i
      );
    }),
    (this.clear = function () {
      for (var a in e) clearTimeout(e[a].timeout);
      e = Object.create(null);
    }),
    (this.get = function (a) {
      var n = e[a];
      if (void 0 !== n) {
        if (isNaN(n.expire) || n.expire >= Date.now()) return n.value;
        delete e[a];
      }
      return null;
    });
}
const exp$1 = new Cache();
exp$1.Cache = Cache;
const base = 'https://translate.googleapis.com/translate_a/single';
var google = {
    fetch: ({ key: e, from: a, to: n, text: i }) => [
      `${base}?client=gtx&sl=${a}&tl=${n}&dt=t&q=${encodeURI(i)}`,
    ],
    parse: e =>
      e.json().then(e => {
        if (!(e = e && e[0] && e[0][0] && e[0].map(e => e[0]).join('')))
          throw new Error('Translation not found');
        return e;
      }),
  },
  yandex = {
    needkey: !0,
    fetch: ({ key: e, from: a, to: n, text: i }) => [
      `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${e}&lang=${a}-${n}&text=${encodeURIComponent(i)}`,
      { method: 'POST', body: '' },
    ],
    parse: e =>
      e.json().then(e => {
        if (200 !== e.code) throw new Error(e.message);
        return e.text[0];
      }),
  };
const libreUrl = 'https://libretranslate.com/translate';
var libre = {
    needkey: !1,
    fetch: ({ url: e = libreUrl, key: a, from: n, to: i, text: r }) => [
      e,
      {
        method: 'POST',
        body: JSON.stringify({ q: r, source: n, target: i, api_key: a }),
        headers: { 'Content-Type': 'application/json' },
      },
    ],
    parse: e =>
      e.json().then(e => {
        if (!e) throw new Error('No response found');
        if (e.error) throw new Error(e.error);
        if (!e.translatedText) throw new Error('No response found');
        return e.translatedText;
      }),
  },
  deepl = {
    needkey: !0,
    fetch: ({ key: e, from: a, to: n, text: i }) => [
      `https://api${/:fx$/.test(e) ? '-free' : ''}.deepl.com/v2/translate?auth_key=${e}&source_lang=${a}&target_lang=${n}&text=${(i = encodeURIComponent(i))}`,
      { method: 'POST', body: '' },
    ],
    parse: async e => {
      if (!e.ok) {
        if (403 === e.status)
          throw new Error('Auth Error, please review the key for DeepL');
        throw new Error(`Error ${e.status}`);
      }
      return e.json().then(e => e.translations[0].text);
    },
  },
  engines = { google: google, yandex: yandex, libre: libre, deepl: deepl };
const Translate = function (e = {}) {
    // @ts-ignore
    if (!(this instanceof Translate)) return new Translate(e);
    const a = {
        from: 'en',
        to: 'en',
        cache: void 0,
        languages: languages,
        engines: engines,
        engine: 'google',
        keys: {},
      },
      n = async (e, a = {}) => {
        'string' == typeof a && (a = { to: a }), // @ts-ignore
          (a.text = e), // @ts-ignore
          (a.from = languages(a.from || n.from)), // @ts-ignore
          (a.to = languages(a.to || n.to)), // @ts-ignore
          (a.cache = a.cache || n.cache), // @ts-ignore
          (a.engines = a.engines || {}), // @ts-ignore
          (a.engine = a.engine || n.engine), // @ts-ignore
          (a.url = a.url || n.url), // @ts-ignore
          (a.id = a.id || `${a.url}:${a.from}:${a.to}:${a.engine}:${a.text}`), // @ts-ignore
          (a.keys = a.keys || n.keys || {}); // @ts-ignore
        for (let e in n.keys) a.keys[e] = a.keys[e] || n.keys[e]; // @ts-ignore
        a.key = a.key || n.key || a.keys[a.engine]; // @ts-ignore
        const i = a.engines[a.engine] || n.engines[a.engine], // @ts-ignore
          r = exp$1.get(a.id);
        if (r) return Promise.resolve(r); // @ts-ignore
        if (a.to === a.from) return Promise.resolve(a.text); // @ts-ignore
        if (i.needkey && !a.key)
          // @ts-ignore
          throw new Error( // @ts-ignore
            `The engine "${a.engine}" needs a key, please provide it`,
          );
        const t = i.fetch(a); // @ts-ignore
        return fetch(...t)
          .then(i.parse) // @ts-ignore
          .then(e => exp$1.set(a.id, e, a.cache));
      };
    for (let i in a) n[i] = void 0 === e[i] ? a[i] : e[i];
    return n;
  }, // @ts-ignore
  exp = new Translate();
exp.Translate = Translate;
export type LangType = (typeof names)[keyof typeof names];
export const translate = exp as (
  textToTranslate: string,
  options: { to: LangType; from: LangType },
) => string;
// export { exp as default };

// translate('Hello', { to: 'pl', from: 'en' });
