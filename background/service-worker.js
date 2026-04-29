const SITE_CATEGORIES = [
  {
    name: "Social",
    icon: "💬",
    color: "#1DA1F2",
    hostnames: [
      "twitter.com", "x.com", "facebook.com", "instagram.com",
      "linkedin.com", "reddit.com", "threads.net", "weibo.com", "tiktok.com"
    ],
    patterns: [/mastodon/]
  },
  {
    name: "Video",
    icon: "🎬",
    color: "#FF0000",
    hostnames: [
      "youtube.com", "youtu.be", "bilibili.com", "b23.tv",
      "netflix.com", "twitch.tv", "vimeo.com", "iqiyi.com",
      "v.qq.com", "youku.com", "hulu.com", "disneyplus.com"
    ],
    patterns: []
  },
  {
    name: "Dev & Code",
    icon: "💻",
    color: "#6e40c9",
    hostnames: [
      "github.com", "gitlab.com", "stackoverflow.com", "codepen.io",
      "npmjs.com", "vercel.app", "netlify.app", "codesandbox.io",
      "replit.com", "jsfiddle.net", "leetcode.com"
    ],
    patterns: [/localhost/, /127\.0\.0\.1/, /0\.0\.0\.0/]
  },
  {
    name: "Work & Productivity",
    icon: "💼",
    color: "#0F9D58",
    hostnames: [
      "notion.so", "slack.com", "zoom.us",
      "meet.google.com", "docs.google.com", "sheets.google.com",
      "slides.google.com", "drive.google.com", "gmail.com",
      "office.com", "teams.microsoft.com", "figma.com", "miro.com",
      "trello.com", "asana.com", "linear.app", "airtable.com",
      "lark.com", "larksuite.com", "feishu.cn"
    ],
    patterns: [/confluence/, /jira/]
  },
  {
    name: "Shopping",
    icon: "🛍️",
    color: "#FF6900",
    hostnames: [
      "amazon.com", "amazon.co.jp", "amazon.co.uk",
      "ebay.com", "taobao.com", "tmall.com", "jd.com",
      "pinduoduo.com", "aliexpress.com", "etsy.com",
      "shopee.com", "lazada.com", "rakuten.com"
    ],
    patterns: []
  },
  {
    name: "News & Reading",
    icon: "📰",
    color: "#4A90E2",
    hostnames: [
      "medium.com", "substack.com", "nytimes.com", "bbc.com",
      "cnn.com", "theguardian.com", "36kr.com", "huxiu.com",
      "zhihu.com", "jianshu.com", "juejin.cn", "sspai.com",
      "少数派.com", "infoq.cn", "oschina.net"
    ],
    patterns: [/news\./]
  },
  {
    name: "AI & Tools",
    icon: "🤖",
    color: "#7C3AED",
    hostnames: [
      "chat.openai.com", "chatgpt.com", "claude.ai", "gemini.google.com",
      "perplexity.ai", "midjourney.com", "huggingface.co",
      "anthropic.com", "openai.com", "poe.com", "you.com",
      "copilot.microsoft.com", "bard.google.com", "deepseek.com",
      "kimi.ai", "tongyi.aliyun.com"
    ],
    patterns: []
  },
  {
    name: "Search",
    icon: "🔍",
    color: "#EA4335",
    hostnames: [
      "google.com", "bing.com", "baidu.com", "duckduckgo.com",
      "yahoo.com", "yandex.com", "sogou.com", "so.com"
    ],
    patterns: []
  },
];

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostnameMatchesEntry(hostname, entry) {
  // exact match
  if (entry.hostnames.includes(hostname)) return true;
  // subdomain match: e.g. "km.sankuai.com" matches "sankuai.com"
  for (const h of entry.hostnames) {
    if (hostname === h || hostname.endsWith("." + h)) return true;
  }
  return false;
}

function shouldSkipTab(tab) {
  if (!tab.url) return true;
  if (tab.url.startsWith("chrome://newtab")) return true;
  if (tab.url.startsWith("chrome-extension://")) return true;
  if (tab.url.startsWith("chrome://")) return true;
  if (tab.url.startsWith("about:")) return true;
  return false;
}

// Extract the root domain for grouping unknowns: "km.sankuai.com" → "sankuai.com"
function getRootDomain(hostname) {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  // Handle known two-part TLDs: co.uk, com.cn, net.cn, etc.
  const twoPartTLDs = ["co.uk", "com.cn", "net.cn", "org.cn", "com.au", "co.jp"];
  const last2 = parts.slice(-2).join(".");
  if (twoPartTLDs.includes(last2)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

// For unknown domains, use the full hostname as a group key so
// km.sankuai.com and es.sankuai.com each get their own card.
// Only collapse to root domain if there are 3+ subdomains of the same root
// AND each subdomain only has a small number of tabs (i.e. they're truly distinct services).
function categorizeTab(tab) {
  if (!tab.url) return "Other";
  const hostname = getHostname(tab.url);
  if (!hostname) return "Other";

  for (const category of SITE_CATEGORIES) {
    if (hostnameMatchesEntry(hostname, category)) return category.name;
    for (const pattern of category.patterns) {
      if (pattern.test(hostname) || pattern.test(tab.url)) return category.name;
    }
  }
  // Not matched by any predefined category → group by full hostname
  return hostname;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TABS") {
    // Load custom name mappings first, then categorize
    chrome.storage.local.get("categoryNames", (data) => {
      const nameMap = data.categoryNames || {}; // { "km.sankuai.com": "学城", ... }
      chrome.tabs.query({}, (tabs) => {
        const grouped = {};
        for (const tab of tabs) {
          if (shouldSkipTab(tab)) continue;
          const rawKey = categorizeTab(tab);          // hostname or predefined name
          const displayName = nameMap[rawKey] || rawKey; // apply custom name if any
          if (!grouped[displayName]) grouped[displayName] = [];
          grouped[displayName].push({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
            active: tab.active,
            windowId: tab.windowId,
            index: tab.index,
            category: displayName,
            rawKey
          });
        }
        sendResponse({ tabs: grouped, categories: SITE_CATEGORIES, nameMap });
      });
    });
    return true;
  }

  if (message.type === "RENAME_CATEGORY") {
    // { rawKey: "km.sankuai.com", newName: "学城" }
    chrome.storage.local.get("categoryNames", (data) => {
      const nameMap = data.categoryNames || {};
      if (message.newName && message.newName.trim()) {
        nameMap[message.rawKey] = message.newName.trim();
      } else {
        delete nameMap[message.rawKey]; // reset to default
      }
      chrome.storage.local.set({ categoryNames: nameMap }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (message.type === "CLOSE_TAB") {
    chrome.tabs.remove(message.tabId, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "FOCUS_TAB") {
    chrome.tabs.update(message.tabId, { active: true });
    chrome.windows.update(message.windowId, { focused: true });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CLOSE_TABS") {
    chrome.tabs.remove(message.tabIds, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "TOGGLE_BOOKMARK") {
    const { url, title } = message;
    chrome.bookmarks.search({ url }, (results) => {
      if (results && results.length > 0) {
        // Already bookmarked — remove all matching entries
        Promise.all(results.map(b => new Promise(r => chrome.bookmarks.remove(b.id, r))))
          .then(() => sendResponse({ bookmarked: false }));
      } else {
        // parentId "1" = Bookmarks bar (same as browser's native "Add bookmark")
        chrome.bookmarks.create({ parentId: "1", title: title || url, url }, () => {
          sendResponse({ bookmarked: true });
        });
      }
    });
    return true;
  }

  if (message.type === "GET_BOOKMARK_INFO") {
    // { url } → { id, title, parentId, parentTitle, folderPath }
    chrome.bookmarks.search({ url: message.url }, (results) => {
      if (!results || results.length === 0) { sendResponse(null); return; }
      const bm = results[0];
      // Walk up to build folder path
      function buildPath(nodeId, parts, cb) {
        if (!nodeId) { cb(parts.reverse().join(" / ")); return; }
        chrome.bookmarks.get(nodeId, (nodes) => {
          if (chrome.runtime.lastError || !nodes || !nodes[0]) { cb(parts.reverse().join(" / ")); return; }
          const node = nodes[0];
          if (node.title) parts.push(node.title);
          buildPath(node.parentId, parts, cb);
        });
      }
      buildPath(bm.parentId, [], (folderPath) => {
        chrome.bookmarks.get(bm.parentId, (parents) => {
          sendResponse({
            id: bm.id,
            title: bm.title,
            url: bm.url,
            parentId: bm.parentId,
            parentTitle: parents?.[0]?.title || "",
            folderPath
          });
        });
      });
    });
    return true;
  }

  if (message.type === "GET_BOOKMARK_FOLDERS") {
    // Returns flat list of all bookmark folders for the folder picker
    const folders = [];
    function walk(nodes) {
      for (const node of nodes) {
        if (!node.url) { // it's a folder
          folders.push({ id: node.id, title: node.title || "Bookmarks bar", parentId: node.parentId });
          if (node.children) walk(node.children);
        }
      }
    }
    chrome.bookmarks.getTree((tree) => {
      walk(tree);
      sendResponse({ folders });
    });
    return true;
  }

  if (message.type === "UPDATE_BOOKMARK") {
    // { id, title, parentId } → move + rename
    const { id, title, parentId } = message;
    chrome.bookmarks.update(id, { title }, () => {
      chrome.bookmarks.move(id, { parentId }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (message.type === "REMOVE_BOOKMARK") {
    chrome.bookmarks.remove(message.id, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "CHECK_BOOKMARKS") {
    // { urls: string[] } → returns Set of bookmarked urls
    const urls = message.urls || [];
    if (urls.length === 0) { sendResponse({ bookmarked: [] }); return true; }
    const bookmarked = [];
    let pending = urls.length;
    for (const url of urls) {
      chrome.bookmarks.search({ url }, (results) => {
        if (results && results.length > 0) bookmarked.push(url);
        if (--pending === 0) sendResponse({ bookmarked });
      });
    }
    return true;
  }
});
