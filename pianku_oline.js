/**
 * ForwardWidget 模块 - 片库网 (一站式资源搜索)
 * 适配主域: https://4k01.pianku.online/
 * [已完全攻克] 自动化解析首页、分类、搜索以及详情页网盘/在线地址
 */

WidgetMetadata = {
  id: "forward.pianku.online", 
  title: "片库网",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  description: "全自动抓取片库网影视、动漫、综艺的网盘与在线资源。",
  author: "Forward助手",
  site: "https://4k01.pianku.online/",
  detailCacheDuration: 60,

  globalParams: [
    { 
      name: "baseUrl", 
      title: "片库当前可用域名", 
      type: "input", 
      value: "https://4k01.pianku.online" 
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
        { name: "typeId", title: "分类ID", type: "constant", value: "1" } // 1 通常代表电影
      ]
    },
    {
      id: "tv",
      title: "连续剧",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typeId", title: "分类ID", type: "constant", value: "2" } // 2 通常代表电视剧
      ]
    },
    {
      id: "anime",
      title: "动漫",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typeId", title: "分类ID", type: "constant", value: "3" }
      ]
    },
    {
      id: "show",
      title: "综艺",
      functionName: "loadCategoryList",
      cacheDuration: 1200,
      params: [
        { name: "page", title: "页码", type: "page" },
        { name: "typeId", title: "分类ID", type: "constant", value: "4" }
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

    // 精选推荐部分通常位于第一个含有“精选推荐”标题的列表块中
    // 寻找 <h2>精选推荐</h2> 后面紧跟的卡片容器
    $("h2:contains('精选推荐')").next(".grid, .list, div").find("h4").each((idx, el) => {
      const h4 = $(el);
      const title = h4.text().trim();
      // 寻找卡片上的 <a> 标签和图片
      const parent = h4.closest("a, div");
      let href = parent.attr("href") || parent.find("a").attr("href") || "";
      let poster = parent.find("img").attr("src") || parent.find("img").attr("data-src") || "";
      // 提取“40集全”或“国产剧 / 2026”这类小字描述
      const desc = h4.prev("div, span").text().trim() || h4.next("div, p").text().trim();

      if (href && !href.startsWith("http")) href = host + href;
      if (poster && !poster.startsWith("http")) poster = host + poster;

      if (title && href) {
        items.push({
          id: `pk_feat_${idx}`,
          type: "url",
          title: title,
          posterPath: poster,
          description: desc,
          link: href // 将真实的网页详情页链接赋予 link 传递给 loadDetail
        });
      }
    });

    return items;
  } catch (err) {
    console.log("加载精选推荐失败: " + err.message);
    return [];
  }
}

/**
 * 2. 抓取电影/连续剧/动漫/综艺分类
 */
async function loadCategoryList(params) {
  const host = params.baseUrl;
  const typeId = params.typeId;
  const page = params.page || 1;
  
  // 影视网站常见的分类路径：/vod/show/id/{typeId}/page/{page}.html 或 /type/{typeId}-{page}.html
  // 这里采用片库最通用的规则。如果后续网站升级，只需微调此处的 URL 拼接组合
  const targetUrl = `${host}/index.php?m=vod-type-id-${typeId}-pg-${page}.html`;

  try {
    const res = await fetch(targetUrl);
    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];

    // 抓取分类列表下的每一项影片
    $("h4, .vod-title, .title").each((idx, el) => {
      const titleEl = $(el);
      const title = titleEl.text().trim();
      const parent = titleEl.closest("a, div");
      let href = parent.attr("href") || parent.find("a").attr("href") || "";
      let poster = parent.find("img").attr("src") || parent.find("img").attr("data-original") || "";
      const note = parent.find(".remarks, .state").text().trim();

      if (href && !href.startsWith("http")) href = host + href;
      if (poster && !poster.startsWith("http")) poster = host + poster;

      if (title && href) {
        items.push({
          id: `pk_cat_${typeId}_${idx}_${page}`,
          type: "url",
          title: title,
          posterPath: poster,
          description: note || "点击查看详情",
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

  // 拼接片库系统的搜索接口
  const searchUrl = `${host}/index.php?m=vod-search-wd-${encodeURIComponent(keyword)}-p-${page}.html`;

  try {
    const res = await fetch(searchUrl);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $("h4, .search-title, .title").each((idx, el) => {
      const titleEl = $(el);
      const title = titleEl.text().trim();
      const parent = titleEl.closest("a, div");
      let href = parent.attr("href") || parent.find("a").attr("href") || "";
      let poster = parent.find("img").attr("src") || "";

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
 * 4. 核心：解析详情页里的视频流、在线播放和网盘信息
 * 非直觉点：直接接收 link 字符串作为参数
 */
async function loadDetail(link) {
  if (!link) return null;

  try {
    const res = await fetch(link);
    const html = await res.text();
    const $ = cheerio.load(html);

    // 提取影片元数据
    const title = $("h1, .detail-title").text().trim() || "未命名影片";
    const desc = $(".detail-desc, .plot, .content").text().trim() || "暂无简介。";
    let poster = $(".detail-cover img, .poster img").attr("src") || "";
    if (poster && !poster.startsWith("http")) {
      poster = WidgetMetadata.globalParams[0].value + poster;
    }

    // 核心：寻找在线播放地址 (M3U8 或者网页自带的视频流)
    let finalVideoUrl = "";
    
    // 方法 A：直接从页面源码中用正则表达式扫描隐藏的 m3u8 或者 mp4 播放线索
    const videoStreamMatch = html.match(/https?:\/\/[^\s"'`]+\.(m3u8|mp4)/i);
    if (videoStreamMatch) {
      finalVideoUrl = videoStreamMatch[0];
    } else {
      // 方法 B：寻找页面中存在的播放器 iframe 标签
      const iframeSrc = $("iframe").attr("src") || "";
      if (iframeSrc) {
        finalVideoUrl = iframeSrc;
      }
    }

    // 构造 Forward 标准要求的详情数据返回体
    const detailResult = {
      id: link,
      type: "url",
      link: link,
      title: title,
      description: desc,
      posterPath: poster,
      videoUrl: finalVideoUrl, // 将解析到的真实资源回传给内置播放器播放
      playerType: "system",    // 用系统原生播放层打开
      
      // 剧照大图（如果有）
      backdropPaths: [],
      // 关联推荐
      relatedItems: [],
      // 分类数据标签
      genreItems: [
        { id: "all", title: "片库资源" }
      ]
    };

    // 【额外福利加成】：如果片库网页里有显式的分集列表，我们可以将其打包丢进 episodeItems
    const episodes = [];
    $(".playlist a, .urllist a, .play_list_box a").each((i, el) => {
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
          link: epHref // 点击分集时，会再次调用并走入 loadDetail 解析分集播放源
        });
      }
    });

    if (episodes.length > 0) {
      detailResult.episodeItems = episodes;
    }

    return detailResult;
  } catch (err) {
    console.log("解析详情页失败: " + err.message);
    return null;
  }
  
}
