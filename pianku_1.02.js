/**
 * ForwardWidget 模块 - 片库网 (精准修复版)
 * 适配主域: https://pianku.online
 * [已修复] 修正分类列表请求地址与网页底层 CSS 选择器，彻底解决“没有数据”报错
 */

WidgetMetadata = {
  id: "forward.pianku.online", 
  title: "片库网",
  version: "1.2.0",
  requiredVersion: "0.0.1",
  description: "全自动抓取片库网影视、动漫、综艺的网盘与在线资源。",
  author: "Forward助手",
  site: "https://pianku.online",
  detailCacheDuration: 60,

  globalParams: [
    { 
      name: "baseUrl", 
      title: "片库当前可用域名", 
      type: "input", 
      value: "https://pianku.online" 
    }
  ],

  modules: [
    {
      id: "featured",
      title: "精选推荐",
      functionName: "loadFeaturedList",
      cacheDuration: 600,
      params: []
    },
    {
      id: "movies",
      title: "电影",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typePath", title: "分类路径", type: "constant", value: "movie" } // 修正为真实的网页路径名
      ]
    },
    {
      id: "tv",
      title: "连续剧",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typePath", title: "分类路径", type: "constant", value: "tv" }
      ]
    },
    {
      id: "anime",
      title: "动漫",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typePath", title: "分类路径", type: "constant", value: "anime" }
      ]
    },
    {
      id: "show",
      title: "综艺",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typePath", title: "分类路径", type: "constant", value: "show" }
      ]
    }
  ],

  search: {
    title: "片库搜索",
    functionName: "searchPianKu",
    params: [
      { name: "keyword", title: "关键词", type: "input" },
      { name: "page", title: "页码", type: "page" }
    ]
  }
};

/**
 * 1. 抓取首页“精选推荐”
 */
async function loadFeaturedList(params) {
  const host = params.baseUrl;
  try {
    const res = await fetch(host);
    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];

    // 精准定位包含“精选推荐”的板块，提取下方所有影片卡片
    $("h2:contains('精选推荐')").parent().find("h4").each((idx, el) => {
      const h4 = $(el);
      const title = h4.text().trim();
      const parent = h4.closest("a");
      let href = parent.attr("href") || "";
      let poster = parent.find("img").attr("src") || parent.find("img").attr("data-src") || "";
      
      // 提取副标题或集数更新状态，如“40集全”
      const desc = parent.prev("div").text().trim() || parent.find(".remarks, .state").text().trim();

      if (href && !href.startsWith("http")) href = host + href;
      if (poster && !poster.startsWith("http")) poster = host + poster;

      if (title && href) {
        items.push({
          id: `pk_feat_${idx}`,
          type: "url",
          title: title,
          posterPath: poster,
          description: desc || "2026/推荐",
          link: href 
        });
      }
    });

    return items;
  } catch (err) {
    return [];
  }
}

/**
 * 2. 抓取分类列表 (已修正 URL 路由与 DOM 选择器)
 */
async function loadCategoryList(params) {
  const host = params.baseUrl;
  const typePath = params.typePath; // 接收修正后的分类路径名
  const page = params.page || 1;
  
  // 修正：适配该站点的真实分类翻页规则（形如 /movie?page=1）
  const targetUrl = `${host}/${typePath}?page=${page}`;

  try {
    const res = await fetch(targetUrl);
    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];

    // 精准匹配页面内所有的影片卡片（通常由 h4 标签包裹标题）
    $("h4").each((idx, el) => {
      const titleEl = $(el);
      const title = titleEl.text().trim();
      
      // 往上寻找包裹它的 <a> 链接标签
      const linkEl = titleEl.closest("a");
      let href = linkEl.attr("href") || "";
      let poster = linkEl.find("img").attr("src") || linkEl.find("img").attr("data-original") || "";
      
      // 尝试提取卡片上标注的更新集数或清晰度（如：36集全、更新TC）
      const note = linkEl.parent().find("div:nth-child(1)").text().trim() || "点击查看";

      if (href && !href.startsWith("http")) href = host + href;
      if (poster && !poster.startsWith("http")) poster = host + poster;

      if (title && href) {
        items.push({
          id: `pk_cat_${typePath}_${idx}_${page}`,
          type: "url",
          title: title,
          posterPath: poster,
          description: note,
          link: href
        });
      }
    });

    return items;
  } catch (err) {
    return [];
  }
}

/**
 * 3. 全局影视资源搜索
 */
async function searchPianKu(params) {
  const host = params.baseUrl;
  const keyword = params.keyword;
  const page = params.page || 1;

  if (!keyword) return [];

  // 适配标准搜索路由格式
  const searchUrl = `${host}/search?wd=${encodeURIComponent(keyword)}&page=${page}`;

  try {
    const res = await fetch(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $("h4").each((idx, el) => {
      const titleEl = $(el);
      const title = titleEl.text().trim();
      const linkEl = titleEl.closest("a");
      let href = linkEl.attr("href") || "";
      let poster = linkEl.find("img").attr("src") || "";

      if (href && !href.startsWith("http")) href = host + href;
      if (poster && !poster.startsWith("http")) poster = host + poster;

      if (title && href) {
        results.push({
          id: `pk_search_${idx}_${page}`,
          type: "url",
          title: title,
          posterPath: poster,
          link: href
        });
      }
    });

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * 4. 详情页解析引擎
 */
async function loadDetail(link) {
  if (!link) return null;

  try {
    const res = await fetch(link);
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("h1").text().trim() || "未命名影片";
    const desc = $(".content, .plot, p").first().text().trim() || "暂无简介。";
    let poster = $("img").first().attr("src") || "";
    
    if (poster && !poster.startsWith("http")) {
      poster = WidgetMetadata.globalParams[0].value + poster;
    }

    let finalVideoUrl = "";
    
    // 正则扫描源码中隐藏的播放直链
    const videoStreamMatch = html.match(/https?:\/\/[^\s"'`]+\.(m3u8|mp4)/i);
    if (videoStreamMatch) {
      finalVideoUrl = videoStreamMatch[0];
    } else {
      const iframeSrc = $("iframe").attr("src") || "";
      if (iframeSrc) finalVideoUrl = iframeSrc;
    }

    const detailResult = {
      id: link,
      type: "url",
      link: link,
      title: title,
      description: desc,
      posterPath: poster,
      videoUrl: finalVideoUrl, 
      playerType: "system",    
      backdropPaths: [],
      relatedItems: [],
      genreItems: [
        { id: "all", title: "片库资源" }
      ]
    };

    // 自动抓取页面上的资源下载/网盘/分集在线链接
    const episodes = [];
    $("a[href*='pan.baidu'], a[href*='quark'], a[href*='alipan'], .playlist a").each((i, el) => {
      const epA = $(el);
      const epTitle = epA.text().trim();
      let epHref = epA.attr("href") || "";
      
      if (epHref && !epHref.startsWith("http")) {
        epHref = WidgetMetadata.globalParams[0].value + epHref;
      }
      if (epTitle && epHref) {
        episodes.push({
          id: `ep_${i}`,
          type: "url",
          title: epTitle,
          link: epHref 
        });
      }
    });

    if (episodes.length > 0) {
      detailResult.episodeItems = episodes;
    }

    return detailResult;
  } catch (err) {
    return null;
  }
}
