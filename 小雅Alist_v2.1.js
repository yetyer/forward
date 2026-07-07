// @name 小雅AList
// @description 小雅AList Forward 模块：海报分类、目录下钻、搜索和播放
// @version 2.1

var DEFAULT_SERVER = "http://192.168.31.3:5678";
var REQUEST_TIMEOUT = 20000;
var DEFAULT_USERNAME = "dav";
var DEFAULT_PASSWORD = "M2k9S2@dAaqZzM";
var CURRENT_AUTH = { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

var VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|rmvb|flv|wmv|mov|ts|m4v|iso|mpg|mpeg|webm|vob|m2ts|3gp|asf|m3u8|rm|ram|swf|ogv|f4v|divx|xvid)$/i;
var SUBTITLE_EXTENSIONS = /\.(srt|ass|ssa|vtt)$/i;
var DEFAULT_POSTER = "https://img.xiaoya.pro/xiaoya.jpg";

var CATEGORY_LIST = [
  { id: "xy_daily", title: "每日更新", cat: "daily" },
  { id: "xy_tv_china", title: "国产剧", cat: "tv.china" },
  { id: "xy_tv_hktw", title: "港台剧", cat: "tv.hktw" },
  { id: "xy_tv_korea", title: "韩剧", cat: "tv.korea" },
  { id: "xy_tv_us", title: "美剧", cat: "tv.us" },
  { id: "xy_tv_uk", title: "英剧", cat: "tv.uk" },
  { id: "xy_tv_japan", title: "日剧", cat: "tv.japan" },
  { id: "xy_movie_china", title: "中国电影", cat: "movie.china" },
  { id: "xy_movie_top", title: "豆瓣TOP榜", cat: "movie.top" },
  { id: "xy_movie_thai", title: "泰国电影", cat: "movie.thai" },
  { id: "xy_movie_hktw", title: "港台电影", cat: "movie.hktw" },
  { id: "xy_movie_western", title: "欧美电影", cat: "movie.western" },
  { id: "xy_movie_japan", title: "日本电影", cat: "movie.japan" },
  { id: "xy_movie_korea", title: "韩国电影", cat: "movie.korea" },
  { id: "xy_movie_india", title: "印度电影", cat: "movie.india" },
  { id: "xy_movie_dolby", title: "杜比视界", cat: "movie.dolby" },
  { id: "xy_movie_4k", title: "4K REMUX", cat: "movie.4kremux" },
  { id: "xy_comics", title: "动漫", cat: "comics" },
  { id: "xy_comics_china", title: "国漫", cat: "comics.china" },
  { id: "xy_comics_japan", title: "日漫", cat: "comics.japan" },
  { id: "xy_comics_child", title: "儿童动漫", cat: "comics.child" },
  { id: "xy_docu", title: "纪录片", cat: "docu" },
  { id: "xy_docu_history", title: "纪录片·历史", cat: "docu.history" },
  { id: "xy_docu_food", title: "纪录片·美食", cat: "docu.food" },
  { id: "xy_docu_archeology", title: "纪录片·考古", cat: "docu.archeology" },
  { id: "xy_docu_explore", title: "纪录片·探索发现", cat: "docu.explore" },
  { id: "xy_docu_natgeo", title: "纪录片·国家地理", cat: "docu.natgeo" },
  { id: "xy_docu_bbc", title: "纪录片·BBC", cat: "docu.bbc" },
  { id: "xy_docu_nhk", title: "纪录片·NHK", cat: "docu.nhk" },
  { id: "xy_reality", title: "综艺", cat: "reality" }
];

function logInfo(message, data) {
  if (data !== undefined) console.log("[小雅AList] " + message + ": " + safeStringify(data));
  else console.log("[小雅AList] " + message);
}

function logError(message, error) {
  console.error("[小雅AList] " + message + ": " + (error && error.message ? error.message : safeStringify(error)));
}

function safeStringify(value) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch (e) { return String(value); }
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getServer(params) {
  rememberAuth(params);
  var server = params && (params.Server || params.server) ? (params.Server || params.server) : DEFAULT_SERVER;
  return trimSlash(server || DEFAULT_SERVER);
}

function rememberAuth(params) {
  params = params || {};
  CURRENT_AUTH = {
    username: params.Username || params.username || CURRENT_AUTH.username || DEFAULT_USERNAME || "",
    password: params.Password || params.password || CURRENT_AUTH.password || DEFAULT_PASSWORD || ""
  };
}

function parseHttpBody(res) {
  var data = res && res.data !== undefined ? res.data : res;
  if (typeof data !== "string") return data;
  try { return JSON.parse(data); } catch (e) { return data; }
}

function tokenCacheKey(server) {
  return "xiaoya.v2.1.token:" + trimSlash(server) + ":" + (CURRENT_AUTH.username || "");
}

async function alistToken(server, refresh) {
  if (!CURRENT_AUTH || !CURRENT_AUTH.username) return "";
  var key = tokenCacheKey(server);
  if (!refresh && Widget.storage && Widget.storage.get) {
    var cached = Widget.storage.get(key);
    if (cached) return cached;
  }
  var res = await Widget.http.post(trimSlash(server) + "/api/auth/login", JSON.stringify({ username: CURRENT_AUTH.username, password: CURRENT_AUTH.password || "" }), {
    headers: buildHeaders("application/json", ""),
    timeout: REQUEST_TIMEOUT
  });
  var data = parseHttpBody(res);
  var token = data && data.code === 200 && data.data && data.data.token ? data.data.token : "";
  if (token && Widget.storage && Widget.storage.set) Widget.storage.set(key, token);
  return token;
}

function isVideoFile(name) {
  return VIDEO_EXTENSIONS.test(name || "");
}

function isSubtitleFile(name) {
  return SUBTITLE_EXTENSIONS.test(name || "");
}

function cleanFileName(name) {
  return String(name || "").replace(VIDEO_EXTENSIONS, "").replace(/[._]+/g, " ").trim();
}

function formatEpisodeTitle(name) {
  var cleaned = cleanFileName(name);
  if (/^\d{1,4}$/.test(cleaned)) return "第" + parseInt(cleaned, 10) + "集";
  return cleaned;
}

function joinPath(base, name) {
  base = base || "/";
  if (base === "/") return "/" + name;
  return base.replace(/\/+$/, "") + "/" + name;
}

function normalizePath(path) {
  path = decodeURIComponent(String(path || "/"));
  if (!path) return "/";
  if (path.charAt(0) !== "/") path = "/" + path;
  return path.replace(/\/{2,}/g, "/");
}

function formatFileSize(bytes) {
  bytes = Number(bytes || 0);
  if (!bytes) return "";
  var units = ["B", "KB", "MB", "GB", "TB"];
  var i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes = bytes / 1024;
    i++;
  }
  return bytes.toFixed(i ? 1 : 0) + " " + units[i];
}

function encodePathForUrl(path) {
  return encodeURI(normalizePath(path)).replace(/#/g, "%23").replace(/\?/g, "%3F");
}

function encodeLinkParams(params) {
  var parts = [];
  for (var key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== undefined && params[key] !== null) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(params[key])));
    }
  }
  return parts.join("&");
}

function parseLinkParams(link) {
  var result = {};
  var query = String(link || "").split("?")[1] || "";
  var pairs = query.split("&");
  for (var i = 0; i < pairs.length; i++) {
    if (!pairs[i]) continue;
    var index = pairs[i].indexOf("=");
    var key = index >= 0 ? pairs[i].slice(0, index) : pairs[i];
    var value = index >= 0 ? pairs[i].slice(index + 1) : "";
    result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
}

function makeXiaoyaLink(kind, params) {
  return "xiaoya://" + kind + "?" + encodeLinkParams(params);
}

function buildHeaders(contentType, authValue) {
  var headers = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*"
  };
  if (authValue) headers["Authorization"] = authValue;
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

async function httpGet(url, retry) {
  try {
    var server = url.match(/^https?:\/\/[^/]+/i);
    var token = server ? await alistToken(server[0], retry) : "";
    var res = await Widget.http.get(url, { headers: buildHeaders("", token), timeout: REQUEST_TIMEOUT });
    return res && res.data !== undefined ? res.data : res;
  } catch (error) {
    if (CURRENT_AUTH.username && !retry) return httpGet(url, true);
    logError("GET 请求失败 " + url, error);
    return null;
  }
}

async function httpPostJson(url, body, retry) {
  try {
    var server = url.match(/^https?:\/\/[^/]+/i);
    var token = server ? await alistToken(server[0], retry) : "";
    var res = await Widget.http.post(url, JSON.stringify(body || {}), {
      headers: buildHeaders("application/json", token),
      timeout: REQUEST_TIMEOUT
    });
    var data = parseHttpBody(res);
    if (data && data.code && data.code !== 200 && CURRENT_AUTH.username && !retry) {
      if (server && Widget.storage && Widget.storage.set) Widget.storage.set(tokenCacheKey(server[0]), "");
      return httpPostJson(url, body, true);
    }
    return data;
  } catch (error) {
    if (CURRENT_AUTH.username && !retry) return httpPostJson(url, body, true);
    logError("POST 请求失败 " + url, error);
    return null;
  }
}

async function alistListDir(server, path, page, perPage) {
  var url = trimSlash(server) + "/api/fs/list";
  var res = await httpPostJson(url, {
    path: normalizePath(path),
    password: "",
    page: page || 1,
    per_page: perPage || 200,
    refresh: false
  });
  if (!res || res.code !== 200 || !res.data) return { content: [], total: 0 };
  return res.data;
}

async function alistSearchApi(server, keyword, page, perPage) {
  var url = trimSlash(server) + "/api/fs/search";
  var res = await httpPostJson(url, {
    parent: "/",
    keywords: keyword,
    password: "",
    page: page || 1,
    per_page: perPage || 100
  });
  if (!res || res.code !== 200 || !res.data) return { content: [], total: 0 };
  return res.data;
}

function getItemIsDir(item) {
  return item && (item.is_dir === true || item.type === 1);
}

function getItemIsVideo(item) {
  if (!item || getItemIsDir(item)) return false;
  return item.type === 2 || item.type === 0 || isVideoFile(item.name);
}

function addAuthToUrl(url) {
  if (!CURRENT_AUTH || !CURRENT_AUTH.username) return url;
  return String(url).replace(/^(https?:\/\/)(.*)$/i, function(_, scheme, rest) {
    if (rest.indexOf("@") >= 0 && rest.indexOf("/") > rest.indexOf("@")) return scheme + rest;
    return scheme + encodeURIComponent(CURRENT_AUTH.username) + ":" + encodeURIComponent(CURRENT_AUTH.password || "") + "@" + rest;
  });
}

function buildPlayUrl(server, path) {
  server = trimSlash(server);
  path = normalizePath(path);
  return addAuthToUrl(server + "/dav" + encodePathForUrl(path));
}

function makeListItemFromPath(server, title, path, poster, description, isFile) {
  var link = makeXiaoyaLink(isFile ? "file" : "dir", {
    server: server,
    path: normalizePath(path)
  });
  return {
    id: link,
    type: "link",
    title: title,
    posterPath: poster || "",
    backdropPath: poster || "",
    description: description || "",
    mediaType: "movie",
    link: link
  };
}

function emptyItem(title, description) {
  return [{ id: "empty", type: "text", title: title, description: description || "" }];
}

function sortByNaturalName(a, b) {
  return String(a.name || a.title || "").localeCompare(String(b.name || b.title || ""), "zh-CN", { numeric: true });
}

async function fetchWhatsnewCards(server, cat) {
  var url = trimSlash(server) + "/whatsnew?num=200&type=video&filter=last&cat=" + encodeURIComponent(cat);
  var html = await httpGet(url);
  if (!html || typeof html !== "string") return [];

  var $ = Widget.html.load(html);
  var cards = [];
  $("body > div > ul > figure").each(function(_, e) {
    var href = ($(e).find("figcaption > a").attr("href") || "").replace(/%20/g, " ").split("#")[0];
    var name = ($(e).find("figcaption > a").text() || "").trim();
    var img = $(e).find("img").attr("src") || "";
    var text = $(e).find("figcaption").text() || "";
    var scoreMatch = text.match(/豆瓣评分：\s*([\d.]+)/);
    var score = scoreMatch ? scoreMatch[1] : "";
    var poster = "";
    if (img) {
      if (/^https?:\/\//i.test(img) && img.indexOf("/image/") >= 0) poster = img;
      else if (/^https?:\/\//i.test(img)) poster = trimSlash(server) + "/image/" + img.replace(/^https?:\/\//i, "");
      else poster = trimSlash(server) + "/image/" + img.replace(/^\/+/, "");
    }
    if (href && name) cards.push({ path: normalizePath(href), name: name, poster: poster, score: score });
  });
  return cards;
}

function createCategoryLoader(cat) {
  return async function(params) {
    var server = getServer(params);
    var cards = await fetchWhatsnewCards(server, cat);
    if (!cards.length) return emptyItem("暂无数据", "请检查小雅地址是否可访问：" + server);
    return cards.map(function(card, index) {
      return makeListItemFromPath(
        server,
        card.name,
        card.path,
        card.poster || DEFAULT_POSTER,
        card.score ? "豆瓣 " + card.score : "",
        false
      );
    });
  };
}

async function loadDirectory(params) {
  var server = getServer(params);
  var path = params && params.path ? params.path : "/";
  var data = await alistListDir(server, path, params && params.page ? Number(params.page) : 1, 200);
  var content = (data.content || []).slice().sort(sortByNaturalName);
  var items = [];
  for (var i = 0; i < content.length; i++) {
    var item = content[i];
    var itemPath = joinPath(path, item.name);
    if (getItemIsDir(item)) {
      items.push(makeListItemFromPath(server, item.name, itemPath, item.thumb || "", "目录", false));
    } else if (getItemIsVideo(item)) {
      items.push(makeListItemFromPath(server, cleanFileName(item.name), itemPath, item.thumb || "", formatFileSize(item.size), true));
    }
  }
  return items.length ? items : emptyItem("目录为空", normalizePath(path));
}

async function collectVideos(server, path, maxDepth, currentDepth, maxCount) {
  currentDepth = currentDepth || 0;
  maxDepth = maxDepth || 2;
  maxCount = maxCount || 120;
  if (currentDepth > maxDepth) return [];

  var indent = Array(currentDepth + 1).join("  ");
  var data = await alistListDir(server, path, 1, 200);
  var content = (data.content || []).slice().sort(sortByNaturalName);
  var pageTotal = data.total || 0;

  logInfo(indent + "[collectVideos] depth=" + currentDepth + " path=" + normalizePath(path) +
    " pageContent=" + content.length + " totalServer=" + pageTotal);

  var videos = [];
  var folders = [];
  var subtitles = [];
  var skippedTypes = {};
  var skippedOther = [];

  for (var i = 0; i < content.length; i++) {
    var item = content[i];
    var itemPath = joinPath(path, item.name);
    if (getItemIsDir(item)) {
      folders.push(itemPath);
    } else if (getItemIsVideo(item)) {
      videos.push({ name: item.name, path: itemPath, size: item.size, thumb: item.thumb || "" });
    } else if (isSubtitleFile(item.name)) {
      subtitles.push({ name: item.name, path: itemPath });
    } else {
      var t = item.type !== undefined ? item.type : "undefined";
      skippedTypes[t] = (skippedTypes[t] || 0) + 1;
      if (skippedOther.length < 5) skippedOther.push(item.name);
    }
    if (videos.length >= maxCount) break;
  }

  logInfo(indent + "[collectVideos] 结果: videos=" + videos.length + " folders=" + folders.length +
    " subtitles=" + subtitles.length + " skippedTypes=" + safeStringify(skippedTypes) +
    (skippedOther.length ? " skipped例=" + safeStringify(skippedOther) : ""));

  if (pageTotal > content.length && videos.length === 0) {
    logInfo(indent + "[collectVideos] ⚠ 总条目" + pageTotal + "超过本页" + content.length +
      "，视频可能在第2页，当前页无视频！");
  }

  if (videos.length < maxCount && currentDepth < maxDepth) {
    for (var f = 0; f < folders.length && videos.length < maxCount; f++) {
      var subVideos = await collectVideos(server, folders[f], maxDepth, currentDepth + 1, maxCount - videos.length);
      videos = videos.concat(subVideos);
    }
  }

  logInfo(indent + "[collectVideos] 合计(depth=" + currentDepth + " path=" + normalizePath(path) + ") videos=" + videos.length);
  return videos.slice(0, maxCount);
}

// ==================== 播放列表构建（核心修改） ====================
// selectedIndex: 根据选集参数匹配视频，放到第一位作为默认播放项
// episode item 只保留文件路径，实际播放时再生成最终一个 videoUrl
async function buildEpisodeItems(server, videos, selectedIndex) {
  selectedIndex = selectedIndex !== undefined ? Number(selectedIndex) : 0;
  if (selectedIndex < 0 || selectedIndex >= videos.length) selectedIndex = 0;

  // 将选中的视频移到第一位，其余保持原有顺序
  var orderedVideos = videos.slice();
  if (selectedIndex > 0) {
    var selected = orderedVideos.splice(selectedIndex, 1)[0];
    orderedVideos.unshift(selected);
  }

  var episodeItems = [];
  var playItem = null;
  for (var i = 0; i < orderedVideos.length; i++) {
    var video = orderedVideos[i];
    var fileLink = makeXiaoyaLink("file", {
      server: server,
      path: normalizePath(video.path)
    });
    var item = {
      id: fileLink,
      type: "url",
      title: formatEpisodeTitle(video.name) || ("第" + (i + 1) + "集"),
      mediaType: "episode",
      path: normalizePath(video.path),
      link: fileLink
    };

    if (i === 0) {
      playItem = {
        id: "play_first_" + encodeURIComponent(video.path),
        title: item.title,
        description: formatFileSize(video.size),
        path: normalizePath(video.path),
        link: fileLink
      };
    }

    episodeItems.push(item);
  }
  return { playItem: playItem, episodeItems: episodeItems };
}

async function loadDetail(params) {
  var link = "";
  if (typeof params === "string") link = params;
  else if (params) link = params.link || params.id || "";
  if (!link) throw new Error("无效的详情请求");

  if (link.indexOf("xiaoya://dir") === 0) return loadDirDetail(link);
  if (link.indexOf("xiaoya://file") === 0) return loadFileDetail(link);

  return {
    id: link,
    type: "url",
    title: "播放",
    mediaType: "movie",
    videoUrl: link,
    playerType: "system"
  };
}

// ==================== 目录详情（核心修改） ====================
// 支持 index (0-based) 和 episode (剧集号) 参数指定默认播放项
async function loadDirDetail(link) {
  var p = parseLinkParams(link);
  var server = trimSlash(p.server || DEFAULT_SERVER);
  var path = normalizePath(p.path || "/");
  var title = path.split("/").filter(Boolean).pop() || "小雅AList";

  var videos = await collectVideos(server, path, 2, 0, 120);
  videos.sort(sortByNaturalName);

  // 解析选集参数，确定默认播放的视频索引
  // 支持 season + episode 联合匹配，文件名无季信息时从目录名推断
  var selectIndex = 0;
  if (p.index !== undefined) {
    selectIndex = Number(p.index);
  } else if (p.episode !== undefined || p.season !== undefined) {
    var targetSeason = p.season !== undefined ? Number(p.season) : null;
    var targetEp = p.episode !== undefined ? Number(p.episode) : null;
    var pathSeason = extractSeasonFromPath(path);
    // 优先用参数季号，否则用目录季号，再否则不限季
    var effectiveSeason = targetSeason !== null ? targetSeason : pathSeason;

    var bestMatch = -1, bestScore = -1;
    for (var i = 0; i < videos.length; i++) {
      var se = extractSeasonEpisode(videos[i].name);
      // 文件季号优先文件名，否则用目录季号
      var fileSeason = se.season !== null ? se.season : pathSeason;
      var fileEp = se.episode;
      var score = 0;

      // 季匹配：effectiveSeason 存在时，季不匹配的跳过
      if (effectiveSeason !== null && fileSeason !== null && fileSeason !== effectiveSeason) continue;
      if (fileSeason !== null) score += 100;

      // 集匹配
      if (targetEp !== null) {
        if (fileEp === targetEp) score += 10;
        else continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = i;
      }
    }

    if (bestMatch >= 0) selectIndex = bestMatch;
    else if (targetEp !== null && targetEp > 0) selectIndex = targetEp - 1;
  }

  if (!videos.length) {
    var children = await loadDirectory({ Server: server, path: path });
    return {
      id: link,
      type: "link",
      title: title,
      description: "未找到可播放视频，可继续浏览子目录",
      mediaType: "tv",
      link: link,
      childItems: children
    };
  }

  var videoResult = await buildEpisodeItems(server, videos, selectIndex);

  logInfo("[loadDirDetail] 最终视频数=" + videos.length + " selectIndex=" + selectIndex +
    " 前5个=" + safeStringify(videos.slice(0, 5).map(function(v) { return v.name; })));
  if (!videoResult.playItem) {
    return {
      id: link,
      type: "url",
      title: title,
      description: "无法获取播放地址",
      mediaType: "movie",
      videoUrl: ""
    };
  }

  var isTV = videoResult.episodeItems.length > 1;

  return {
    id: link,
    type: "url",
    title: title,
    description: isTV ? ("共 " + videoResult.episodeItems.length + " 集，默认：" + videoResult.playItem.title) : "",
    mediaType: isTV ? "tv" : "movie",
    episode: isTV ? videoResult.episodeItems.length : undefined,
    episodeItems: isTV ? videoResult.episodeItems : [],
    videoUrl: null,
    path: isTV ? undefined : videoResult.playItem.path,
    link: isTV ? link : videoResult.playItem.link,
    playerType: "system"
  };
}

async function loadFileDetail(link) {
  var p = parseLinkParams(link);
  var server = trimSlash(p.server || DEFAULT_SERVER);
  var path = normalizePath(p.path || "");
  var fileName = path.split("/").pop() || "播放";

  return {
    id: link,
    type: "url",
    title: formatEpisodeTitle(fileName) || fileName,
    description: "",
    mediaType: "movie",
    videoUrl: null,
    path: path,
    link: link,
    playerType: "system"
  };
}

async function searchBySouPage(server, keyword, page) {
  var encoded = encodeURIComponent(keyword);
  var url = page && Number(page) > 1
    ? trimSlash(server) + "/sou?box=&type=video&url="
    : trimSlash(server) + "/sou?box=" + encoded + "&type=video&url=";
  var html = await httpGet(url);
  if (!html || typeof html !== "string") return [];

  var $ = Widget.html.load(html);
  var items = [];
  $("body > div > ul > a").each(function(_, e) {
    var href = ($(e).attr("href") || $(e).text() || "").trim();
    if (!href) return;
    var parts = href.split("#");
    var path = parts[0] || "";
    var name = parts[1] || path.split("/").filter(Boolean).pop() || path;
    var score = parts[3] || "";
    var poster = parts[4] || "";
    if (!path) return;
    items.push(makeListItemFromPath(
      server,
      name,
      path,
      poster || DEFAULT_POSTER,
      score ? "豆瓣 " + score : normalizePath(path),
      isVideoFile(path)
    ));
  });
  return items;
}

async function searchByApi(server, keyword, page) {
  var data = await alistSearchApi(server, keyword, page, 100);
  var content = data.content || [];
  var items = [];
  for (var i = 0; i < content.length; i++) {
    var item = content[i];
    var parent = item.parent || "/";
    var path = joinPath(parent, item.name);
    if (getItemIsDir(item)) {
      items.push(makeListItemFromPath(server, item.name, path, item.thumb || DEFAULT_POSTER, normalizePath(parent), false));
    } else if (getItemIsVideo(item)) {
      items.push(makeListItemFromPath(server, cleanFileName(item.name), path, item.thumb || DEFAULT_POSTER, formatFileSize(item.size), true));
    }
  }
  return items;
}

async function searchXiaoya(params) {
  params = params || {};
  var server = getServer(params);
  var keyword = params.wd || params.keyword || params.text || "";
  var page = Number(params.pg || params.page || 1);
  if (!String(keyword).trim()) return emptyItem("请输入搜索关键词");

  var items = await searchBySouPage(server, keyword, page);
  if (!items.length) items = await searchByApi(server, keyword, page);
  return items.length ? items : emptyItem("未找到：" + keyword);
}

function normalizeTitle(title) {
  return String(title || "").toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
}

// 从文件名提取季和集信息，返回 { season: number|null, episode: number|null }
function extractSeasonEpisode(name) {
  var text = String(name || "");
  var season = null;
  var episode = null;

  // S05E03 / s5e3 / S5 EP03 / Season 5 Episode 3
  var seMatch = text.match(/[Ss](?:eason\s*)?(\d{1,3})\s*[Ee](?:p(?:isode)?\s*)?(\d{1,4})/i);
  if (seMatch) return { season: Number(seMatch[1]), episode: Number(seMatch[2]) };

  // 第5季第03集
  var chSeMatch = text.match(/第\s*(\d{1,3})\s*季\s*第\s*(\d{1,4})\s*[集话期]/);
  if (chSeMatch) return { season: Number(chSeMatch[1]), episode: Number(chSeMatch[2]) };

  // 纯 episode: E03 / EP03
  var eMatch = text.match(/[Ee][Pp]?\s*(\d{1,4})/);
  if (eMatch) return { season: null, episode: Number(eMatch[1]) };

  // 第03集
  var chEpMatch = text.match(/第\s*(\d{1,4})\s*[集话期]/);
  if (chEpMatch) return { season: null, episode: Number(chEpMatch[1]) };

  // 三位数回退: 503 → S5E03, 101 → S1E01
  var numMatch = text.match(/(?:^|[^\d])(\d{2,4})(?:[^\d]|$)/);
  if (numMatch && !/^(480|720|1080|2160|4)$/i.test(numMatch[1])) {
    var num = Number(numMatch[1]);
    if (num >= 100 && num <= 9999) {
      var s = Math.floor(num / 100);
      var ep = num % 100;
      if (s > 0 && ep > 0 && ep <= 99) return { season: s, episode: ep };
    }
    return { season: null, episode: num };
  }

  return { season: null, episode: null };
}

// 从目录路径向上查找季信息（如 Season5 / S5 / 第5季）
function extractSeasonFromPath(path) {
  var parts = normalizePath(String(path || "")).split("/").filter(Boolean);
  for (var i = parts.length - 1; i >= 0; i--) {
    var folder = parts[i];
    var match = folder.match(/[Ss](?:eason\s*)?(\d{1,3})/i);
    if (match) return Number(match[1]);
    match = folder.match(/第\s*(\d{1,3})\s*季/);
    if (match) return Number(match[1]);
  }
  return null;
}

// 兼容旧调用：只返回 episode 数字（内部走 extractSeasonEpisode）
function extractEpisodeNumber(name) {
  return extractSeasonEpisode(name).episode;
}

async function loadResource(params) {
  params = params || {};
  var server = getServer(params);
  var seriesName = params.seriesName || params.title || params.name || params.keyword || params.TestTitle || "";
  var type = params.type === "movie" ? "movie" : "tv";
  var episode = params.episode ? Number(params.episode) : null;
  var season = params.season ? Number(params.season) : null;
  if (!seriesName) return [];

  var results = await searchBySouPage(server, seriesName, 1);
  if (!results.length) results = await searchByApi(server, seriesName, 1);
  if (!results.length) return [];

  var target = normalizeTitle(seriesName);
  results.sort(function(a, b) {
    var aTitle = normalizeTitle(a.title);
    var bTitle = normalizeTitle(b.title);
    var aScore = aTitle === target ? 100 : (aTitle.indexOf(target) >= 0 || target.indexOf(aTitle) >= 0 ? 80 : 0);
    var bScore = bTitle === target ? 100 : (bTitle.indexOf(target) >= 0 || target.indexOf(bTitle) >= 0 ? 80 : 0);
    return bScore - aScore;
  });

  // 将 season + episode 参数传递给 loadDetail
  var detailLink = results[0].link;
  if (episode !== null) detailLink = detailLink + "&episode=" + episode;
  if (season !== null) detailLink = detailLink + "&season=" + season;
  var detail = await loadDetail(detailLink);
  var candidates = [];
  if (detail.path) {
    candidates.push({ title: detail.title, path: detail.path });
  }
  var eps = detail.episodeItems || detail.childItems || [];
  for (var i = 0; i < eps.length; i++) {
    if (!eps[i].path) continue;
    if (type === "movie") {
      candidates.push({ title: eps[i].title, path: eps[i].path });
      break;
    }
    var se = extractSeasonEpisode(eps[i].title);
    var epMatch = (episode === null || se.episode === episode);
    var seasonMatch = (season === null || se.season === null || se.season === season);
    if (epMatch && seasonMatch) {
      candidates.push({ title: eps[i].title, path: eps[i].path });
    }
  }

  return candidates.map(function(item, index) {
    return {
      id: "xiaoya_resource_" + index,
      name: "小雅AList",
      type: type,
      description: item.title || seriesName,
      url: buildPlayUrl(server, item.path)
    };
  });
}

var loadDaily = createCategoryLoader("daily");
var loadTVChina = createCategoryLoader("tv.china");
var loadTVHKTW = createCategoryLoader("tv.hktw");
var loadTVKorea = createCategoryLoader("tv.korea");
var loadTVUS = createCategoryLoader("tv.us");
var loadTVUK = createCategoryLoader("tv.uk");
var loadTVJapan = createCategoryLoader("tv.japan");
var loadMovieChina = createCategoryLoader("movie.china");
var loadMovieTop = createCategoryLoader("movie.top");
var loadMovieThai = createCategoryLoader("movie.thai");
var loadMovieHKTW = createCategoryLoader("movie.hktw");
var loadMovieWestern = createCategoryLoader("movie.western");
var loadMovieJapan = createCategoryLoader("movie.japan");
var loadMovieKorea = createCategoryLoader("movie.korea");
var loadMovieIndia = createCategoryLoader("movie.india");
var loadMovieDolby = createCategoryLoader("movie.dolby");
var loadMovie4KRemux = createCategoryLoader("movie.4kremux");
var loadComics = createCategoryLoader("comics");
var loadComicsChina = createCategoryLoader("comics.china");
var loadComicsJapan = createCategoryLoader("comics.japan");
var loadComicsChild = createCategoryLoader("comics.child");
var loadDocu = createCategoryLoader("docu");
var loadDocuHistory = createCategoryLoader("docu.history");
var loadDocuFood = createCategoryLoader("docu.food");
var loadDocuArcheology = createCategoryLoader("docu.archeology");
var loadDocuExplore = createCategoryLoader("docu.explore");
var loadDocuNatgeo = createCategoryLoader("docu.natgeo");
var loadDocuBBC = createCategoryLoader("docu.bbc");
var loadDocuNHK = createCategoryLoader("docu.nhk");
var loadReality = createCategoryLoader("reality");

WidgetMetadata = {
  id: "xiaoya.alist",
  title: "小雅AList",
  icon: DEFAULT_POSTER,
  version: "2.1",
  requiredVersion: "0.0.1",
  description: "小雅AList：海报分类、目录下钻、搜索和播放",
  author: "Custom",
  detailCacheDuration: 60,

  globalParams: [
    { name: "Server", title: "小雅AList地址", type: "input", value: DEFAULT_SERVER, description: "示例：http://192.168.1.10:5678" },
    { name: "Username", title: "AList用户名", type: "input", value: DEFAULT_USERNAME },
    { name: "Password", title: "AList密码", type: "input", value: DEFAULT_PASSWORD }
  ],
  search: {
    title: "搜索",
    functionName: "searchXiaoya",
    params: [
      { name: "wd", title: "关键词", type: "input", value: "" },
      { name: "pg", title: "页码", type: "page", value: "1" }
    ]
  },
  modules: [
    { id: "xy_daily", title: "每日更新", functionName: "loadDaily", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_tv_china", title: "国产剧", functionName: "loadTVChina", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_tv_hktw", title: "港台剧", functionName: "loadTVHKTW", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_tv_korea", title: "韩剧", functionName: "loadTVKorea", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_tv_us", title: "美剧", functionName: "loadTVUS", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_tv_uk", title: "英剧", functionName: "loadTVUK", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_tv_japan", title: "日剧", functionName: "loadTVJapan", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_china", title: "中国电影", functionName: "loadMovieChina", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_top", title: "豆瓣TOP榜", functionName: "loadMovieTop", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_thai", title: "泰国电影", functionName: "loadMovieThai", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_hktw", title: "港台电影", functionName: "loadMovieHKTW", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_western", title: "欧美电影", functionName: "loadMovieWestern", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_japan", title: "日本电影", functionName: "loadMovieJapan", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_korea", title: "韩国电影", functionName: "loadMovieKorea", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_india", title: "印度电影", functionName: "loadMovieIndia", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_dolby", title: "杜比视界", functionName: "loadMovieDolby", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_movie_4k", title: "4K REMUX", functionName: "loadMovie4KRemux", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_comics", title: "动漫", functionName: "loadComics", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_comics_china", title: "国漫", functionName: "loadComicsChina", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_comics_japan", title: "日漫", functionName: "loadComicsJapan", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_comics_child", title: "儿童动漫", functionName: "loadComicsChild", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu", title: "纪录片", functionName: "loadDocu", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_history", title: "纪录片·历史", functionName: "loadDocuHistory", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_food", title: "纪录片·美食", functionName: "loadDocuFood", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_archeology", title: "纪录片·考古", functionName: "loadDocuArcheology", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_explore", title: "纪录片·探索发现", functionName: "loadDocuExplore", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_natgeo", title: "纪录片·国家地理", functionName: "loadDocuNatgeo", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_bbc", title: "纪录片·BBC", functionName: "loadDocuBBC", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_docu_nhk", title: "纪录片·NHK", functionName: "loadDocuNHK", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_reality", title: "综艺", functionName: "loadReality", type: "video", cacheDuration: 1800, params: [] },
    { id: "xy_search", title: "搜索", functionName: "searchXiaoya", type: "video", cacheDuration: 300, params: [
      { name: "wd", title: "关键词", type: "input", value: "" },
      { name: "pg", title: "页码", type: "page", value: "1" }
    ] },
    { id: "loadDetail", title: "加载详情", functionName: "loadDetail", type: "video", cacheDuration: 60, params: [] },
    { id: "loadResource", title: "智能匹配", functionName: "loadResource", type: "stream", cacheDuration: 300, params: [
      { name: "TestTitle", title: "测试片名", type: "input", value: "" }
    ] },
    { id: "xy_browse", title: "目录浏览", functionName: "loadDirectory", type: "video", cacheDuration: 300, params: [
      { name: "path", title: "目录路径", type: "input", value: "/" },
      { name: "page", title: "页码", type: "page", value: "1" }
    ] }
  ]
};
