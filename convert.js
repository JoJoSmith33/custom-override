/*!
powerfullz 的 Substore 订阅转换脚本
https://github.com/powerfullz/override-rules

支持的传入参数：
- loadbalance: 启用负载均衡（url-test/load-balance，默认 false）
- landing: 启用落地节点功能（如机场家宽/星链/落地分组，默认 false）
- ipv6: 启用 IPv6 支持（默认 false）
- full: 输出完整配置（适合纯内核启动，默认 false）
- keepalive: 启用 tcp-keep-alive（默认 false）
- fakeip: DNS 使用 FakeIP 模式（默认 true，false 为 RedirHost）
- quic: 允许 QUIC 流量（UDP 443，默认 false）
- threshold: 地区节点数量小于该值时不显示分组 (默认 0)
- regex: 使用正则过滤模式（include-all + filter）写入各地区代理组，而非直接枚举节点名称（默认 false）
*/
const NODE_SUFFIX = "节点",
    CDN_URL = "https://gcore.jsdelivr.net",
    LOW_COST_FILTER = "0\\.[0-5]|低倍率|省流|实验性",
    LOW_COST_REGEX = new RegExp(LOW_COST_FILTER, "i"),
    LANDING_REGEX = /家宽|家庭宽带|商宽|商业宽带|星链|Starlink|落地/i,
    LANDING_PATTERN = "(?i)家宽|家庭宽带|商宽|商业宽带|星链|Starlink|落地",
    FEATURE_FLAG_DEFAULTS = {
        loadBalance: !1,
        landing: !1,
        ipv6Enabled: !1,
        fullConfig: !1,
        keepAliveEnabled: !1,
        fakeIPEnabled: !0,
        quicEnabled: !1,
        regexFilter: !1
    },
    rawArgs = (() => {
        try {
            return $arguments
        } catch {
            return console.log("[powerfullz 的覆写脚本] 未检测到传入参数，使用默认参数。", {}), {}
        }
    })(),
    {
        loadBalance: loadBalance,
        landing: landing,
        ipv6Enabled: ipv6Enabled,
        fullConfig: fullConfig,
        keepAliveEnabled: keepAliveEnabled,
        fakeIPEnabled: fakeIPEnabled,
        quicEnabled: quicEnabled,
        regexFilter: regexFilter,
        countryThreshold: countryThreshold
    } = buildFeatureFlags(rawArgs),
    PROXY_GROUPS = {
        SELECT: "选择代理",
        MANUAL: "手动选择",
        AUTO: "自动选择",
        FALLBACK: "故障转移",
        DIRECT: "直连",
        LANDING: "落地节点",
        LOW_COST: "低倍率节点",
        FRONT_PROXY: "前置代理",
        STATIC_RESOURCES: "静态资源",
        AI_SERVICE: "AI服务",
        CRYPTO: "加密货币",
        APPLE: "苹果服务",
        GOOGLE: "谷歌服务",
        MICROSOFT: "微软服务",
        BILIBILI: "哔哩哔哩",
        BAHAMUT: "巴哈姆特",
        YOUTUBE: "YouTube",
        NETFLIX: "Netflix",
        TIKTOK: "TikTok",
        SPOTIFY: "Spotify",
        EHENTAI: "E-Hentai",
        TELEGRAM: "Telegram",
        TRUTH_SOCIAL: "真相社交",
        PIKPAK: "PikPak网盘",
        SSH: "SSH(22端口)",
        SOGOU_INPUT: "搜狗输入法",
        AD_BLOCK: "广告拦截",
        GLOBAL: "GLOBAL"
    },
    buildList = (...e) => e.flat().filter(Boolean),
    ruleProviders = {
        ADBlock: {
            type: "http",
            behavior: "domain",
            format: "mrs",
            interval: 86400,
            url: `${CDN_URL}/gh/217heidai/adblockfilters@main/rules/adblockmihomolite.mrs`,
            path: "./ruleset/ADBlock.mrs"
        },
        SogouInput: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: "https://ruleset.skk.moe/Clash/non_ip/sogouinput.txt",
            path: "./ruleset/SogouInput.txt"
        },
        StaticResources: {
            type: "http",
            behavior: "domain",
            format: "text",
            interval: 86400,
            url: "https://ruleset.skk.moe/Clash/domainset/cdn.txt",
            path: "./ruleset/StaticResources.txt"
        },
        CDNResources: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: "https://ruleset.skk.moe/Clash/non_ip/cdn.txt",
            path: "./ruleset/CDNResources.txt"
        },
        TikTok: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/TikTok.list`,
            path: "./ruleset/TikTok.list"
        },
        EHentai: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/EHentai.list`,
            path: "./ruleset/EHentai.list"
        },
        SteamFix: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/SteamFix.list`,
            path: "./ruleset/SteamFix.list"
        },
        GoogleFCM: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/FirebaseCloudMessaging.list`,
            path: "./ruleset/FirebaseCloudMessaging.list"
        },
        AdditionalFilter: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/AdditionalFilter.list`,
            path: "./ruleset/AdditionalFilter.list"
        },
        AdditionalCDNResources: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/AdditionalCDNResources.list`,
            path: "./ruleset/AdditionalCDNResources.list"
        },
        Crypto: {
            type: "http",
            behavior: "classical",
            format: "text",
            interval: 86400,
            url: `${CDN_URL}/gh/powerfullz/override-rules@master/ruleset/Crypto.list`,
            path: "./ruleset/Crypto.list"
        }
    },
    whiteListRules = [
        `DOMAIN-SUFFIX,umeng.com,${PROXY_GROUPS.DIRECT}`,
        `DOMAIN-SUFFIX,picgo.app,${PROXY_GROUPS.DIRECT}`,
        `DOMAIN-SUFFIX,zijieapi.com,${PROXY_GROUPS.DIRECT}`,
        `DOMAIN-SUFFIX,doubao.com,${PROXY_GROUPS.DIRECT}`,
        `DOMAIN-SUFFIX,datasink.sensorsdata.cn,${PROXY_GROUPS.DIRECT}`,
        `DOMAIN-SUFFIX,polyfill.io,${PROXY_GROUPS.DIRECT}`
    ],
    baseRules = [`RULE-SET,ADBlock,${PROXY_GROUPS.AD_BLOCK}`, `RULE-SET,AdditionalFilter,${PROXY_GROUPS.AD_BLOCK}`, `RULE-SET,SogouInput,${PROXY_GROUPS.SOGOU_INPUT}`, `DOMAIN-SUFFIX,truthsocial.com,${PROXY_GROUPS.TRUTH_SOCIAL}`, `RULE-SET,StaticResources,${PROXY_GROUPS.STATIC_RESOURCES}`, `RULE-SET,CDNResources,${PROXY_GROUPS.STATIC_RESOURCES}`, `RULE-SET,AdditionalCDNResources,${PROXY_GROUPS.STATIC_RESOURCES}`, `RULE-SET,Crypto,${PROXY_GROUPS.CRYPTO}`, `RULE-SET,EHentai,${PROXY_GROUPS.EHENTAI}`, `RULE-SET,TikTok,${PROXY_GROUPS.TIKTOK}`, `RULE-SET,SteamFix,${PROXY_GROUPS.DIRECT}`, `RULE-SET,GoogleFCM,${PROXY_GROUPS.DIRECT}`, `GEOSITE,YOUTUBE,${PROXY_GROUPS.YOUTUBE}`, `GEOSITE,TELEGRAM,${PROXY_GROUPS.TELEGRAM}`, `GEOSITE,CATEGORY-AI-!CN,${PROXY_GROUPS.AI_SERVICE}`, `GEOSITE,GOOGLE-PLAY@CN,${PROXY_GROUPS.DIRECT}`, `GEOSITE,MICROSOFT@CN,${PROXY_GROUPS.DIRECT}`, `GEOSITE,APPLE,${PROXY_GROUPS.APPLE}`, `GEOSITE,MICROSOFT,${PROXY_GROUPS.MICROSOFT}`, `GEOSITE,GOOGLE,${PROXY_GROUPS.GOOGLE}`, `GEOSITE,NETFLIX,${PROXY_GROUPS.NETFLIX}`, `GEOSITE,SPOTIFY,${PROXY_GROUPS.SPOTIFY}`, `GEOSITE,BAHAMUT,${PROXY_GROUPS.BAHAMUT}`, `GEOSITE,BILIBILI,${PROXY_GROUPS.BILIBILI}`, `GEOSITE,PIKPAK,${PROXY_GROUPS.PIKPAK}`, `GEOSITE,GFW,${PROXY_GROUPS.SELECT}`, `DOMAIN-SUFFIX,cn,${PROXY_GROUPS.DIRECT}`, `GEOSITE,CN,${PROXY_GROUPS.DIRECT}`, `GEOSITE,PRIVATE,${PROXY_GROUPS.DIRECT}`, `GEOIP,NETFLIX,${PROXY_GROUPS.NETFLIX},no-resolve`, `GEOIP,TELEGRAM,${PROXY_GROUPS.TELEGRAM},no-resolve`, `GEOIP,CN,${PROXY_GROUPS.DIRECT}`, `GEOIP,PRIVATE,${PROXY_GROUPS.DIRECT}`, `DST-PORT,22,${PROXY_GROUPS.SSH}`, `MATCH,${PROXY_GROUPS.SELECT}`],
    snifferConfig = {
        sniff: {
            TLS: {
                ports: [443, 8443]
            },
            HTTP: {
                ports: [80, 8080, 8880]
            },
            QUIC: {
                ports: [443, 8443]
            }
        },
        "override-destination": !1,
        enable: !0,
        "force-dns-mapping": !0,
        "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"]
    },
    dnsConfig = buildDnsConfig({
        mode: "redir-host"
    }),
    dnsConfigFakeIp = buildDnsConfig({
        mode: "fake-ip",
        fakeIpFilter: ["+.cn", "geosite:private", "geosite:connectivity-check", "geosite:cn", "Mijia Cloud", "dlg.io.mi.com", "dig.io.mi.com", "localhost.ptlogin2.qq.com", "*.icloud.com", "*.stun.*.*", "*.stun.*.*.*"]
    }),
    geoxURL = {
        geoip: `${CDN_URL}/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat`,
        geosite: `${CDN_URL}/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat`,
        mmdb: `${CDN_URL}/gh/Loyalsoldier/geoip@release/Country.mmdb`,
        asn: `${CDN_URL}/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb`
    },
    countriesMeta = {
        "香港": {
            weight: 10,
            pattern: "(?i)香港|HK|HKG|Hong ?Kong|Hongkong|🇭🇰",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png`
        },
        "澳门": {
            pattern: "(?i)澳门|MO|Macau|🇲🇴",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Macao.png`
        },
        "台湾": {
            weight: 20,
            pattern: "(?i)台湾|台|\\bTW\\b|Taiwan|Taipei|台北|新北|新台|彰化|🇹🇼|(深|沪|呼|京|广|杭)台",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png`
        },
        "新加坡": {
            weight: 30,
            pattern: "(?i)新加坡|坡|狮城|\\bSG\\b|Singapore|🇸🇬|(深|沪|呼|京|广|杭)新",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Singapore.png`
        },
        "日本": {
            weight: 40,
            pattern: "(?i)日本|\\bJP\\b|Japan|东京|大阪|大坂|埼玉|Tokyo|Osaka|川日|泉日|(深|沪|呼|京|广|杭|中|辽)日|🇯🇵",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Japan.png`
        },
        "韩国": {
            pattern: "(?i)韩国|KR|\\bKOR\\b|Korea|首尔|春川|韩|韓|🇰🇷",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Korea.png`
        },
        "美国": {
            weight: 50,
            pattern: "(?i)美国|美|\\bUS\\b|\\bUSA\\b|United ?States|America|🇺🇸|洛杉矶|圣何塞|圣荷西|硅谷|西雅图|纽约|达拉斯|波特兰|芝加哥|哥伦布|俄勒冈|密歇根|拉斯维加斯|凤凰城|费利蒙|阿什本|Los ?Angeles|San ?Jose|Silicon ?Valley|Seattle|New ?York|Dallas|Portland|Chicago|Columbus|Oregon|Michigan|Ashburn|(深|沪|呼|京|广|杭)美",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/United_States.png`
        },
        "加拿大": {
            pattern: "(?i)加拿大|Canada|\\bCA\\b|多伦多|温哥华|🇨🇦",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Canada.png`
        },
        "英国": {
            weight: 60,
            pattern: "(?i)英国|\\bUK\\b|United ?Kingdom|Great ?Britain|伦敦|London|(深|沪|呼|京|广|杭)英|🇬🇧",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png`
        },
        "澳大利亚": {
            pattern: "(?i)澳洲|澳大利亚|\\bAU\\b|Australia|墨尔本|悉尼|土澳|(深|沪|呼|京|广|杭)澳|🇦🇺",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Australia.png`
        },
        "德国": {
            weight: 70,
            pattern: "(?i)德国|德|\\bDE\\b|Germany|法兰克福|Frankfurt|(深|沪|呼|京|广|杭)德|🇩🇪",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Germany.png`
        },
        "法国": {
            weight: 80,
            pattern: "(?i)法国|法|\\bFR\\b|France|巴黎|Paris|🇫🇷",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/France.png`
        },
        "俄罗斯": {
            pattern: "(?i)俄罗斯|俄|\\bRU\\b|Russia|莫斯科|Moscow|🇷🇺",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Russia.png`
        },
        "泰国": {
            pattern: "(?i)泰国|泰|TH|Thailand|曼谷|🇹🇭",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Thailand.png`
        },
        "印度": {
            pattern: "(?i)印度|IN|India|孟买|Mumbai|🇮🇳",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/India.png`
        },
        "马来西亚": {
            pattern: "(?i)马来西亚|马来|MY|Malaysia|吉隆坡|🇲🇾",
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png`
        }
    };

function parseBool(e) {
    return "boolean" == typeof e ? e : "string" == typeof e && ("true" === e.toLowerCase() || "1" === e)
}

function parseNumber(e, o = 0) {
    if (null == e) return o;
    const t = parseInt(e, 10);
    return isNaN(t) ? o : t
}

function buildFeatureFlags(e) {
    const o = {
            loadbalance: "loadBalance",
            landing: "landing",
            ipv6: "ipv6Enabled",
            full: "fullConfig",
            keepalive: "keepAliveEnabled",
            fakeip: "fakeIPEnabled",
            quic: "quicEnabled",
            regex: "regexFilter"
        },
        t = {};
    for (const [r, n] of Object.entries(o)) {
        const o = e[r];
        t[n] = null == o ? FEATURE_FLAG_DEFAULTS[n] : parseBool(o)
    }
    return t.countryThreshold = parseNumber(e.threshold, 0), t
}

function getCountryGroupNames(e, o) {
    const t = e.filter(e => e.nodes.length >= o);
    return t.sort((e, o) => (countriesMeta[e.country]?.weight ?? 1 / 0) - (countriesMeta[o.country]?.weight ?? 1 / 0)), t.map(e => e.country + "节点")
}

function stripNodeSuffix(e) {
    const o = new RegExp("节点$");
    return e.map(e => e.replace(o, ""))
}

function buildBaseLists({
    landing: e,
    lowCostNodes: o,
    countryGroupNames: t,
    nonLandingNodes: r,
    tagGroupNames: T = []
}) {
    const n = o.length > 0 || regexFilter,
        l = buildList(PROXY_GROUPS.AUTO, PROXY_GROUPS.FALLBACK, e && PROXY_GROUPS.LANDING, T, t, n && PROXY_GROUPS.LOW_COST, PROXY_GROUPS.MANUAL, "DIRECT");
    return {
        defaultProxies: buildList(PROXY_GROUPS.SELECT, e && PROXY_GROUPS.LANDING, T, t, n && PROXY_GROUPS.LOW_COST, PROXY_GROUPS.MANUAL, PROXY_GROUPS.DIRECT),
        defaultProxiesDirect: buildList(PROXY_GROUPS.DIRECT, e && PROXY_GROUPS.LANDING, T, t, n && PROXY_GROUPS.LOW_COST, PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL),
        defaultSelector: l,
        defaultFallback: buildList(e && PROXY_GROUPS.LANDING, T, t, n && PROXY_GROUPS.LOW_COST, PROXY_GROUPS.MANUAL, "DIRECT"),
        frontProxySelector: buildList(T, t, "DIRECT", !regexFilter && r)
    }
}

function buildRules({
    quicEnabled: e
}) {
    const o = [...whiteListRules];
    e || o.push("AND,((DST-PORT,443),(NETWORK,UDP)),REJECT");
    return o.push(...baseRules), o
}

function buildDnsConfig({
    mode: e,
    fakeIpFilter: o
}) {
    const t = {
        enable: !0,
        ipv6: ipv6Enabled,
        "prefer-h3": !0,
        "enhanced-mode": e,
        "default-nameserver": ["119.29.29.29", "223.5.5.5"],
        nameserver: ["system", "223.5.5.5", "119.29.29.29", "180.184.1.1"],
        fallback: ["quic://dns0.eu", "https://dns.cloudflare.com/dns-query", "https://dns.sb/dns-query", "tcp://208.67.222.222", "tcp://8.26.56.2"],
        "proxy-server-nameserver": ["https://dns.alidns.com/dns-query", "tls://dot.pub"],
        "nameserver-policy": {
            "geosite:cn,private": [
                "https://dns.alidns.com/dns-query",
                "https://doh.pub/dns-query"
            ],
            "+.cn": [
                "https://dns.alidns.com/dns-query",
                "https://doh.pub/dns-query"
            ]
        }
    };
    return o && (t["fake-ip-filter"] = o), t
}

function parseLowCost(e) {
    return (e.proxies || []).filter(e => LOW_COST_REGEX.test(e.name)).map(e => e.name)
}

function parseTags(e) {
    const o = {};
    const untagged = [];
    for (const t of e.proxies || []) {
        const e = t.name || "",
            r = e.match(/\[Tag:(.*?)\]/i);
        if (r && r[1]) {
            const t = r[1];
            o[t] || (o[t] = []), o[t].push(e)
        } else {
            untagged.push(t)
        }
    }
    return { tagMap: o, untagged: untagged }
}

function parseNodesByLanding(e) {
    const o = [],
        t = [];
    for (const r of e.proxies || []) {
        const e = r.name;
        e && (LANDING_REGEX.test(e) ? o.push(e) : t.push(e))
    }
    return {
        landingNodes: o,
        nonLandingNodes: t
    }
}

function parseCountries(e) {
    const o = e.proxies || [],
        t = Object.create(null),
        r = {};
    for (const [e, o] of Object.entries(countriesMeta)) {
        const isIgnoreCase = o.pattern.startsWith("(?i)");
        const cleanPattern = isIgnoreCase ? o.pattern.slice(4) : o.pattern;
        r[e] = new RegExp(cleanPattern, isIgnoreCase ? "i" : undefined);
    }
    for (const e of o) {
        const o = e.name || "";
        if (!LANDING_REGEX.test(o) && !LOW_COST_REGEX.test(o))
            for (const [e, n] of Object.entries(r))
                if (n.test(o)) {
                    t[e] || (t[e] = []), t[e].push(o);
                    break
                }
    }
    const n = [];
    for (const [e, o] of Object.entries(t)) n.push({
        country: e,
        nodes: o
    });
    return n
}

function buildCountryProxyGroups({
    countries: e,
    landing: o,
    loadBalance: t,
    regexFilter: r,
    countryInfo: n
}) {
    const l = [],
        s = t ? "load-balance" : "url-test",
        a = r ? null : Object.fromEntries(n.map(e => [e.country, e.nodes]));
    for (const n of e) {
        const e = countriesMeta[n];
        if (!e) continue;
        let i;
        if (r) i = {
            name: `${n}节点`,
            icon: e.icon,
            "include-all": !0,
            filter: e.pattern,
            "exclude-filter": o ? `${LANDING_PATTERN}|${LOW_COST_FILTER}` : LOW_COST_FILTER,
            type: s
        };
        else {
            const o = a[n] || [];
            i = {
                name: `${n}节点`,
                icon: e.icon,
                type: s,
                proxies: o
            }
        }
        t || Object.assign(i, {
            url: "https://cp.cloudflare.com/generate_204",
            interval: 60,
            tolerance: 20,
            lazy: !1
        }), l.push(i)
    }
    return l
}

function buildProxyGroups({
    landing: e,
    countries: o,
    countryProxyGroups: t,
    lowCostNodes: r,
    landingNodes: n,
    defaultProxies: l,
    defaultProxiesDirect: s,
    defaultSelector: a,
    defaultFallback: i,
    frontProxySelector: R,
    tagGroupsMap: T = {}
}) {
    const c = o.includes("台湾"),
        u = o.includes("香港"),
        O = o.includes("美国");
    const tagGroups = Object.entries(T).map(([tag, nodes]) => ({
        name: tag,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bot.png`,
        type: "url-test",
        url: "https://cp.cloudflare.com/generate_204",
        interval: 60,
        tolerance: 20,
        lazy: !1,
        ...regexFilter ? {
            "include-all": !0,
            filter: `\\[Tag:${tag}\\]`
        } : {
            proxies: nodes
        }
    }));
    return [{
        name: PROXY_GROUPS.SELECT,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
        type: "select",
        proxies: a
    }, {
        name: PROXY_GROUPS.MANUAL,
        icon: `${CDN_URL}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
        "include-all": !0,
        type: "select"
    }, e ? {
        name: PROXY_GROUPS.FRONT_PROXY,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Area.png`,
        type: "select",
        ...regexFilter ? {
            "include-all": !0,
            "exclude-filter": LANDING_PATTERN,
            proxies: R
        } : {
            proxies: R
        }
    } : null, e ? {
        name: PROXY_GROUPS.LANDING,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Airport.png`,
        type: "select",
        ...regexFilter ? {
            "include-all": !0,
            filter: LANDING_PATTERN
        } : {
            proxies: n
        }
    } : null, {
        name: PROXY_GROUPS.STATIC_RESOURCES,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.AI_SERVICE,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/chatgpt.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.CRYPTO,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_3.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.APPLE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Apple.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.GOOGLE,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Google.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.MICROSOFT,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Microsoft_Copilot.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.BILIBILI,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/bilibili.png`,
        type: "select",
        proxies: c && u ? [PROXY_GROUPS.DIRECT, "台湾节点", "香港节点"] : s
    }, {
        name: PROXY_GROUPS.BAHAMUT,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png`,
        type: "select",
        proxies: c ? ["台湾节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL, PROXY_GROUPS.DIRECT] : l
    }, {
        name: PROXY_GROUPS.YOUTUBE,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/YouTube.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.NETFLIX,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Netflix.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.TIKTOK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/TikTok.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.SPOTIFY,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Spotify.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.EHENTAI,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Ehentai.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.TELEGRAM,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Telegram.png`,
        type: "select",
        proxies: l
    },
    ...tagGroups,
    {
        name: PROXY_GROUPS.TRUTH_SOCIAL,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/TruthSocial.png`,
        type: "select",
        proxies: O ? ["美国节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL] : l
    }, {
        name: PROXY_GROUPS.PIKPAK,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/PikPak.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.SSH,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Server.png`,
        type: "select",
        proxies: l
    }, {
        name: PROXY_GROUPS.SOGOU_INPUT,
        icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Sougou.png`,
        type: "select",
        proxies: [PROXY_GROUPS.DIRECT, "REJECT"]
    }, {
        name: PROXY_GROUPS.DIRECT,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Direct.png`,
        type: "select",
        proxies: ["DIRECT", PROXY_GROUPS.SELECT]
    }, {
        name: PROXY_GROUPS.AD_BLOCK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png`,
        type: "select",
        proxies: ["REJECT", "REJECT-DROP", PROXY_GROUPS.DIRECT]
    }, r.length > 0 || regexFilter ? {
        name: PROXY_GROUPS.LOW_COST,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
        type: "url-test",
        url: "https://cp.cloudflare.com/generate_204",
        ...regexFilter ? {
            "include-all": !0,
            filter: "(?i)0\\.[0-5]|低倍率|省流|大流量|实验性"
        } : {
            proxies: r
        }
    } : null, {
        name: PROXY_GROUPS.AUTO,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
        type: "url-test",
        url: "https://cp.cloudflare.com/generate_204",
        proxies: i,
        interval: 60,
        tolerance: 20,
        lazy: !1
    }, {
        name: PROXY_GROUPS.FALLBACK,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
        type: "fallback",
        url: "https://cp.cloudflare.com/generate_204",
        proxies: i,
        interval: 60,
        tolerance: 20,
        lazy: !1
    }, ...t].filter(Boolean)
}

function main(e) {
    const o = {
            proxies: e.proxies
        },
        { tagMap: tagMap, untagged: untagged } = parseTags(o),
        fakeO = { proxies: untagged },
        t = parseCountries(fakeO),
        r = parseLowCost(fakeO),
        n = getCountryGroupNames(t, countryThreshold),
        l = stripNodeSuffix(n),
        {
            landingNodes: s,
            nonLandingNodes: a
        } = landing ? parseNodesByLanding(fakeO) : {
            landingNodes: [],
            nonLandingNodes: []
        },
        {
            defaultProxies: i,
            defaultProxiesDirect: R,
            defaultSelector: c,
            defaultFallback: u,
            frontProxySelector: O
        } = buildBaseLists({
            landing: landing,
            lowCostNodes: r,
            countryGroupNames: n,
            nonLandingNodes: a,
            tagGroupNames: Object.keys(tagMap)
        }),
        p = buildCountryProxyGroups({
            countries: l,
            landing: landing,
            loadBalance: loadBalance,
            regexFilter: regexFilter,
            countryInfo: t
        }),
        S = buildProxyGroups({
            landing: landing,
            countries: l,
            countryProxyGroups: p,
            lowCostNodes: r,
            landingNodes: s,
            defaultProxies: i,
            defaultProxiesDirect: R,
            defaultSelector: c,
            defaultFallback: u,
            frontProxySelector: O,
            tagGroupsMap: tagMap
        }),
        d = S.map(e => e.name);
    S.push({
        name: PROXY_GROUPS.GLOBAL,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Global.png`,
        "include-all": !0,
        type: "select",
        proxies: d
    });
    const P = buildRules({
        quicEnabled: quicEnabled
    });
    return fullConfig && Object.assign(o, {
        "mixed-port": 7890,
        "redir-port": 7892,
        "tproxy-port": 7893,
        "routing-mark": 7894,
        "allow-lan": !0,
        "bind-address": "*",
        ipv6: ipv6Enabled,
        mode: "rule",
        "unified-delay": !0,
        "tcp-concurrent": !0,
        "find-process-mode": "off",
        "log-level": "info",
        "geodata-loader": "standard",
        "external-controller": ":9999",
        "disable-keep-alive": !keepAliveEnabled,
        profile: {
            "store-selected": !0
        }
    }), Object.assign(o, {
        "proxy-groups": S,
        "rule-providers": ruleProviders,
        rules: P,
        sniffer: snifferConfig,
        dns: fakeIPEnabled ? dnsConfigFakeIp : dnsConfig,
        "geodata-mode": !0,
        "geox-url": geoxURL
    }), o
}
