(function () {
	const readRuntimeConfig = () => {
		const node = document.querySelector("#mete0r-runtime-config");
		if (!node) return {};
		try {
			return JSON.parse(node.textContent || "{}");
		} catch (error) {
			return {};
		}
	};

	const runtimeConfig = readRuntimeConfig();
	const FRIENDS_API = runtimeConfig.api?.friends || "https://api.xscnet.cn/data.json";
	const MOMENTS_API = runtimeConfig.api?.moments || "https://talk.xscnet.cn/api/echo/page";
	const LATEST_COMMENTS_API = runtimeConfig.api?.latestComments || "https://artalk.xscnet.cn/api/v2/stats/latest_comments?site_name=Mete0rBlog&limit=20";
	const LOCATION_API = runtimeConfig.api?.location || "https://v1.nsuuu.com/api/ipip?key=d608352ca1ca5e3c";
	const SLOGAN_API = runtimeConfig.api?.slogan || "https://region.xscnet.cn/api/slogan";
	const AVATAR = runtimeConfig.assets?.avatar || "https://img.xscnet.cn//i/2026/06/28/6a40e72d6a01e.jpg";
	const ECH0_BASE = runtimeConfig.api?.momentsBase || "https://talk.xscnet.cn";
	const FRIEND_FALLBACK = runtimeConfig.assets?.friendFallbackAvatar || "https://img.xscnet.cn//i/2026/06/28/6a41079e1eda1.png";
	const CACHE_MINUTES = Number(runtimeConfig.cache?.runtimeMinutes || 15);
	const FRIENDS_CACHE_KEY = runtimeConfig.cache?.friendsKey || "mete0r:friends:v1";
	const MOMENTS_CACHE_KEY = runtimeConfig.cache?.momentsKey || "mete0r:moments:v1";
	const LATEST_COMMENTS_CACHE_KEY = runtimeConfig.cache?.latestCommentsKey || "mete0r:latest-comments:v1";
	const PROJECT_INTERVAL = Number(runtimeConfig.ui?.projectShowcase?.intervalMs || 4200);
	const MARKDOWN_CONFIG = runtimeConfig.ui?.markdown || {};
	const SPLASH_CONFIG = runtimeConfig.ui?.splash || {};
	const CONTEXT_CONFIG = runtimeConfig.ui?.contextMenu || {};
	const AUTO_DARK_CONFIG = runtimeConfig.ui?.autoDarkMode || {};
	const SOCIAL_DOCK_CONFIG = runtimeConfig.ui?.socialDock || {};
	const POLICY_CONSENT_CONFIG = runtimeConfig.ui?.policyConsent || {};
	const POST_TRANSITION_CONFIG = runtimeConfig.ui?.postTransition || {};
	const SAFE_LINKS_CONFIG = runtimeConfig.safeLinks || {};
	const STELLAR_CONFIG = runtimeConfig.stellar || {};
	const MOTION_CONFIG = runtimeConfig.motion || {};
	const SEARCH_CONFIG = runtimeConfig.search || {};
	const FRIEND_ACTIVITY_CONFIG = runtimeConfig.friendActivity || {};
	const FRIEND_APPLY_CONFIG = runtimeConfig.friendApply || {};
	const MUSIC_CONFIG = runtimeConfig.musicPlayer || {};
	const KONAMI_SNOW_CONFIG = runtimeConfig.ui?.konamiSnow || {};
	const RUNTIME_CACHE_CONFIG = runtimeConfig.runtimeCache || {};
	const MERMAID_URL = MARKDOWN_CONFIG.mermaidJs || "https://cdn.jsdmirror.com/npm/mermaid@v9/dist/mermaid.min.js";
	const FANCYBOX_JS = MARKDOWN_CONFIG.fancyboxJs || "https://cdn.jsdmirror.com/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js";
	const FANCYBOX_CSS = MARKDOWN_CONFIG.fancyboxCss || "https://cdn.jsdmirror.com/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.css";

	const state = window.__astroBlogRuntime || (window.__astroBlogRuntime = {
		lightboxBound: false,
		markedLoading: null,
		metingLoading: null,
		mermaidLoading: null,
		fancyboxLoading: null,
		friendsContainer: null,
		momentsContainer: null,
		latestCommentsContainer: null,
		welcomeNode: null,
		projectTimer: null,
		artalkInstance: null,
		tocObserver: null,
		tocScrollHandler: null,
		tocScrollFrame: null,
		planeObserver: null,
		artalkImageObserver: null,
		artalkImagePreviewBound: false,
		postTransitionBound: false,
		postTransitionActive: false,
		postTransitionTimers: new Set(),
		planeTimer: null,
		mobileDrawerBound: false,
		contextMenuBound: false,
		autoDarkToastBound: false,
		policyConsentBound: false,
		policyImagesRejected: false,
		socialDockBound: false,
		toastTimer: null,
		friendActivityContainer: null,
		pageAbortControllers: new Set(),
		pageDisposers: new Set(),
		motionObserver: null,
		stellarDisposer: null,
		stellarModuleLoading: null,
		searchIndexPromise: null,
		headerSearchBound: false,
		friendsMenuBound: false,
		musicInitialized: false,
		musicObserver: null,
		musicInstance: null,
		musicTracks: null,
		musicPlaylistPromise: null,
		konamiBound: false,
		konamiBuffer: [],
		snowLayer: null,
		snowTimer: null,
		scriptLoads: new Map(),
	});
	state.postTransitionTimers ||= new Set();
	state.pageAbortControllers ||= new Set();
	state.pageDisposers ||= new Set();
	state.scriptLoads ||= new Map();
	state.konamiBuffer ||= [];

	const escapeHtml = (value) =>
		String(value ?? "").replace(/[&<>"']/g, (char) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#039;",
		})[char]);

	const sanitizeCommentHtml = (html) => {
		const template = document.createElement("template");
		template.innerHTML = String(html || "");
		const allowedTags = new Set(["P", "BR", "A", "STRONG", "B", "EM", "I", "CODE", "PRE", "BLOCKQUOTE", "UL", "OL", "LI", "S"]);
		template.content.querySelectorAll("*").forEach((node) => {
			if (!allowedTags.has(node.tagName)) {
				node.replaceWith(document.createTextNode(node.textContent || ""));
				return;
			}
			[...node.attributes].forEach((attr) => {
				if (node.tagName === "A" && attr.name === "href") return;
				node.removeAttribute(attr.name);
			});
			if (node.tagName === "A") {
				const href = node.getAttribute("href") || "";
				if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) {
					node.removeAttribute("href");
				}
				node.setAttribute("target", "_blank");
				node.setAttribute("rel", "noopener noreferrer");
			}
		});
		return template.innerHTML;
	};

	const getPathValue = (source, path) => {
		if (!path) return undefined;
		return String(path).split(".").reduce((value, key) => value?.[key], source);
	};

	const encodeBase64Url = (value) => {
		const bytes = new TextEncoder().encode(String(value));
		let binary = "";
		bytes.forEach((byte) => {
			binary += String.fromCharCode(byte);
		});
		return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
	};

	const isAllowedArticleLinkDomain = (hostname) => {
		const domains = [
			window.location.hostname,
			...(SAFE_LINKS_CONFIG.allowDomains || []),
		].map((domain) => String(domain).toLowerCase());
		const normalized = String(hostname || "").toLowerCase();
		return domains.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
	};

	const isIgnoredArticleHref = (href) => {
		if (!href || href.startsWith("#")) return true;
		const safePage = SAFE_LINKS_CONFIG.page || "/safe.html";
		if (href.startsWith(safePage)) return true;
		const protocolMatch = href.match(/^[a-zA-Z][a-zA-Z\d+.-]*:/);
		if (!protocolMatch) return false;
		const ignored = new Set([
			"mailto:",
			"tel:",
			"javascript:",
			"data:",
			"blob:",
			...(SAFE_LINKS_CONFIG.ignoredProtocols || []),
		].map((protocol) => String(protocol).toLowerCase()));
		return ignored.has(protocolMatch[0].toLowerCase());
	};

	const bindArticleSafeLinks = () => {
		if (SAFE_LINKS_CONFIG.enabled === false) return;
		document.querySelectorAll(".article-body a[href]:not([data-article-safe-ready])").forEach((link) => {
			link.dataset.articleSafeReady = "true";
			const href = link.getAttribute("href");
			if (!href || isIgnoredArticleHref(href)) return;
			let url;
			try {
				url = new URL(href, window.location.origin);
			} catch (error) {
				return;
			}
			if (!["http:", "https:"].includes(url.protocol)) return;
			link.setAttribute("target", "_blank");
			const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
			rel.add("noopener");
			rel.add("noreferrer");
			link.setAttribute("rel", [...rel].join(" "));
			if (url.origin === window.location.origin || isAllowedArticleLinkDomain(url.hostname)) return;
			const safePage = SAFE_LINKS_CONFIG.page || "/safe.html";
			const queryParam = SAFE_LINKS_CONFIG.queryParam || "Base64Url";
			link.setAttribute("href", `${safePage}?${queryParam}=${encodeURIComponent(encodeBase64Url(url.href))}`);
		});
	};

	const loadScript = (src) => {
		if (state.scriptLoads.has(src)) return state.scriptLoads.get(src);
		const promise = new Promise((resolve, reject) => {
			const existing = document.querySelector(`script[src="${src}"]`);
			if (existing) {
				resolve();
				return;
			}
			const script = document.createElement("script");
			script.src = src;
			script.async = true;
			script.addEventListener("load", () => {
				script.dataset.runtimeLoaded = "true";
				resolve();
			}, { once: true });
			script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
			document.head.appendChild(script);
		});
		state.scriptLoads.set(src, promise);
		promise.catch(() => state.scriptLoads.delete(src));
		return promise;
	};

	const loadStyle = (href) => {
		if (document.querySelector(`link[href="${href}"]`)) return;
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		document.head.appendChild(link);
	};

	const readCache = (key, minutes = CACHE_MINUTES) => {
		try {
			const cached = JSON.parse(localStorage.getItem(key) || "null");
			if (!cached || Date.now() - cached.time > Number(minutes || CACHE_MINUTES) * 60 * 1000) return null;
			return cached.value;
		} catch (error) {
			return null;
		}
	};

	const writeCache = (key, value) => {
		try {
			const serialized = JSON.stringify({ time: Date.now(), value });
			const maxChars = Math.max(10000, Number(RUNTIME_CACHE_CONFIG.maxEntryChars || 600000));
			if (serialized.length <= maxChars) localStorage.setItem(key, serialized);
		} catch (error) {
			// localStorage may be full or disabled; runtime fetch can still continue.
		}
	};

	const createPageAbortController = () => {
		const max = Math.max(1, Number(RUNTIME_CACHE_CONFIG.maxActiveRequests || 12));
		while (state.pageAbortControllers.size >= max) {
			const oldest = state.pageAbortControllers.values().next().value;
			oldest?.abort?.();
			state.pageAbortControllers.delete(oldest);
		}
		const controller = new AbortController();
		state.pageAbortControllers.add(controller);
		controller.signal.addEventListener("abort", () => state.pageAbortControllers.delete(controller), { once: true });
		return controller;
	};

	const addPageDisposer = (disposer) => {
		if (typeof disposer === "function") state.pageDisposers.add(disposer);
		return disposer;
	};

	const fetchPage = async (input, options = {}) => {
		const controller = createPageAbortController();
		try {
			return await fetch(input, { ...options, signal: controller.signal });
		} finally {
			state.pageAbortControllers.delete(controller);
		}
	};

	const ensureMarked = async () => {
		if (window.marked) return window.marked;
		state.markedLoading ||= loadScript("https://cdn.jsdmirror.com/npm/marked@12.0.2/marked.min.js");
		await state.markedLoading;
		return window.marked;
	};

	const ensureMeting = async () => {
		if (window.customElements?.get("meting-js")) return;
		await ensureAPlayer();
		const assets = MUSIC_CONFIG.assets || {};
		state.metingLoading ||= loadScript(assets.metingJs || "https://cdn.jsdmirror.com/npm/meting@2.0.1/dist/Meting.min.js");
		await state.metingLoading;
	};

	const ensureAPlayer = async () => {
		if (window.APlayer) return window.APlayer;
		const assets = MUSIC_CONFIG.assets || {};
		loadStyle(assets.aplayerCss || "https://cdn.jsdmirror.com/npm/aplayer@1.10.1/dist/APlayer.min.css");
		state.aplayerLoading ||= loadScript(assets.aplayerJs || "https://cdn.jsdmirror.com/npm/aplayer@1.10.1/dist/APlayer.min.js");
		await state.aplayerLoading;
		return window.APlayer;
	};

	const buildMetingApiUrl = (server, type, id) => {
		const template = String(MUSIC_CONFIG.metingApi || "").trim();
		if (!template) throw new Error("Meting API is not configured");
		return template
			.replaceAll(":server", encodeURIComponent(server))
			.replaceAll(":type", encodeURIComponent(type))
			.replaceAll(":id", encodeURIComponent(id))
			.replaceAll(":r", String(Date.now()));
	};

	const normalizeMusicUrl = (value) => {
		const url = String(value || "").trim();
		return MUSIC_CONFIG.forceHttps !== false ? url.replace(/^http:\/\//i, "https://") : url;
	};

	const formatMusicTime = (seconds) => {
		const value = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
		const minutes = Math.floor(value / 60);
		const remainder = Math.floor(value % 60);
		return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
	};

	const ensureMermaid = async () => {
		if (window.mermaid) return window.mermaid;
		state.mermaidLoading ||= loadScript(MERMAID_URL);
		await state.mermaidLoading;
		return window.mermaid;
	};

	const ensureFancybox = async () => {
		if (window.Fancybox) return window.Fancybox;
		loadStyle(FANCYBOX_CSS);
		state.fancyboxLoading ||= loadScript(FANCYBOX_JS);
		await state.fancyboxLoading;
		return window.Fancybox;
	};

	const formatDate = (value) => {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "刚刚";
		const pad = (number) => String(number).padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	};

	const normalizeFileUrl = (url) => {
		if (!url) return "";
		return url.startsWith("/api/files/") ? `${ECH0_BASE}${url}` : url;
	};

	const parseMusic = (payload) => {
		const url = payload?.url || "";
		const id = url.match(/id=(\d+)/)?.[1];
		if (!id) return "";
		const server = url.includes("music.163.com") ? "netease" : url.includes("y.qq.com") ? "tencent" : "";
		return server ? `<meting-js server="${server}" type="song" id="${id}" mini="false"></meting-js>` : "";
	};

	const renderVideo = (text, payload) => {
		const source = payload?.videoId || payload?.url || text || "";
		const bilibili = source.match(/(?:bilibili\.com\/video\/|^)(BV[0-9A-Za-z]+)/);
		if (bilibili) {
			return `<div class="video-wrapper"><iframe src="https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${bilibili[1]}&as_wide=1&high_quality=1&danmaku=0" loading="lazy" allowfullscreen></iframe></div>`;
		}
		const youtube = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
		if (youtube) {
			return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${youtube[1]}" loading="lazy" allowfullscreen></iframe></div>`;
		}
		return "";
	};

	const getMomentCommentMeta = (moment) => {
		const id = moment.id || moment.echo_id || moment.uuid || moment.public_id || moment.key || "";
		const quote = String(moment.content || "")
			.replace(/\[live\](https?:\/\/[^\s<]+)/g, "")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim()
			.slice(0, 280);
		const url = moment.url || moment.link || moment.permalink || (id ? `${ECH0_BASE}/?id=${encodeURIComponent(id)}` : ECH0_BASE);
		const count = moment.comment_count ?? moment.comments_count ?? moment.reply_count ?? moment.replies_count ?? 0;
		return { id, quote, url, count };
	};

	const getMomentImages = (moment) =>
		(moment.echo_files || [])
			.map((item) => item.file || item)
			.filter((file) => String(file?.category || file?.content_type || "").toLowerCase().includes("image"))
			.map((file) => normalizeFileUrl(file.url))
			.filter(Boolean);

	const renderCarousel = (images, liveVideos) => {
		if (!images.length) return "";
		const slides = images.map((image, index) => {
			const live = liveVideos[index];
			return `
				<div class="carousel-slide${index === 0 ? " active" : ""}${live ? " has-live" : ""}">
					<img class="runtime-image" src="${image}" alt="说说图片" loading="lazy" data-full-src="${image}" />
					${live ? `<video class="live-video" src="${live}" loop muted playsinline preload="metadata"></video><span class="live-badge">LIVE</span>` : ""}
				</div>`;
		}).join("");

		if (images.length === 1) {
			return `<div class="image-carousel single-image">${slides}</div>`;
		}

		return `
			<div class="image-carousel">
				<div class="carousel-track">${slides}</div>
				<button class="carousel-btn prev-btn" type="button" aria-label="上一张">‹</button>
				<button class="carousel-btn next-btn" type="button" aria-label="下一张">›</button>
				<div class="carousel-indicators">
					${images.map((_, index) => `<button type="button" class="${index === 0 ? "active" : ""}" data-index="${index}" aria-label="第 ${index + 1} 张"></button>`).join("")}
				</div>
			</div>`;
	};

	const initCarousels = (root = document) => {
		root.querySelectorAll(".image-carousel:not([data-ready])").forEach((carousel) => {
			carousel.dataset.ready = "true";
			const slides = [...carousel.querySelectorAll(".carousel-slide")];
			if (slides.length <= 1) return;
			let current = 0;
			const show = (index) => {
				current = (index + slides.length) % slides.length;
				slides.forEach((slide, itemIndex) => slide.classList.toggle("active", itemIndex === current));
				carousel.querySelectorAll(".carousel-indicators button").forEach((button, itemIndex) => {
					button.classList.toggle("active", itemIndex === current);
				});
			};
			carousel.querySelector(".prev-btn")?.addEventListener("click", (event) => {
				event.preventDefault();
				show(current - 1);
			});
			carousel.querySelector(".next-btn")?.addEventListener("click", (event) => {
				event.preventDefault();
				show(current + 1);
			});
			carousel.querySelectorAll(".carousel-indicators button").forEach((button) => {
				button.addEventListener("click", () => show(Number(button.dataset.index || 0)));
			});
		});

		root.querySelectorAll(".carousel-slide.has-live:not([data-live-ready])").forEach((slide) => {
			slide.dataset.liveReady = "true";
			const video = slide.querySelector("video");
			slide.addEventListener("mouseenter", () => video?.play().catch(() => {}));
			slide.addEventListener("mouseleave", () => {
				if (!video) return;
				video.pause();
				video.currentTime = 0;
			});
		});
	};

	const renderFriends = async () => {
		const container = document.querySelector("[data-friends-list]");
		if (!container) return;
		if (state.friendsContainer === container && container.dataset.ready === "true") return;
		state.friendsContainer = container;
		container.dataset.ready = "true";

		try {
			let data = readCache(FRIENDS_CACHE_KEY);
			if (!data) {
				const response = await fetchPage(FRIENDS_API, { cache: "no-store" });
				if (!response.ok) throw new Error(`Friends ${response.status}`);
				data = await response.json();
				writeCache(FRIENDS_CACHE_KEY, data);
			}
			const friends = Array.isArray(data.content) ? data.content : [];

			container.innerHTML = friends.map((friend, index) => {
				const avatar = friend.icon || friend.avatar || friend.snapshot || FRIEND_FALLBACK;
				return `
				<article class="friend-card glass-panel runtime-card" style="--delay:${Math.min(index, 18) * 45}ms">
					<a class="friend-avatar" href="${friend.url || "#"}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(friend.title)}">
						<img src="${avatar}" data-fallback="${FRIEND_FALLBACK}" alt="${escapeHtml(friend.title || "friend")}" loading="lazy" decoding="async" />
					</a>
					<div class="friend-main">
						<div class="friend-title-row">
							<a href="${friend.url || "#"}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(friend.title || "未命名站点")}</strong></a>
							${(friend.labels || []).slice(0, 2).map((label) => `<span>${escapeHtml(label.name)}</span>`).join("")}
						</div>
						<p>${escapeHtml(friend.description || "")}</p>
						${Array.isArray(friend.posts) && friend.posts.length ? `
							<div class="friend-posts">
								${friend.posts.slice(0, 3).map((post) => `
									<a href="${post.link || "#"}" target="_blank" rel="noopener noreferrer">
										<span>${escapeHtml(post.published || "最近更新")}</span>
										${escapeHtml(post.title || "未命名文章")}
									</a>`).join("")}
							</div>` : ""}
					</div>
				</article>`;
			}).join("");

			container.querySelectorAll(".friend-avatar img").forEach((image) => {
				const fallback = image.dataset.fallback || FRIEND_FALLBACK;
				const markReady = () => image.classList.add("is-ready");
				image.addEventListener("load", markReady, { once: true });
				image.addEventListener("error", () => {
					if (image.src !== fallback) {
						image.src = fallback;
					}
					image.classList.add("is-fallback", "is-ready");
				}, { once: true });
				if (image.complete && image.naturalWidth > 0) markReady();
				if (image.complete && image.naturalWidth === 0) image.src = fallback;
			});
		} catch (error) {
			container.innerHTML = `<p class="empty-state glass-panel">友链数据暂时没有获取到。</p>`;
		}
	};

	const getSearchIndex = async () => {
		if (state.searchIndexPromise) return state.searchIndexPromise;
		const indexUrl = SEARCH_CONFIG.indexUrl || "/search-index.json";
		state.searchIndexPromise = fetch(indexUrl, { headers: { Accept: "application/json" } })
			.then((response) => {
				if (!response.ok) throw new Error(`Search index ${response.status}`);
				return response.json();
			})
			.then((items) => Array.isArray(items) ? items : [])
			.catch((error) => {
				state.searchIndexPromise = null;
				throw error;
			});
		return state.searchIndexPromise;
	};

	const matchSearchPosts = (posts, query, limit) => {
		const keyword = String(query || "").trim().toLowerCase();
		if (!keyword) return posts.slice(0, limit);
		const terms = keyword.split(/\s+/).filter(Boolean);
		return posts
			.map((post, index) => {
				const title = String(post.title || "").toLowerCase();
				const text = String(post.searchText || "").toLowerCase();
				if (!terms.every((term) => text.includes(term) || title.includes(term))) return null;
				const score = terms.reduce((total, term) => total + (title === term ? 12 : title.startsWith(term) ? 8 : title.includes(term) ? 5 : 1), 0);
				return { post, score, index };
			})
			.filter(Boolean)
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.slice(0, limit)
			.map((entry) => entry.post);
	};

	const searchResultMarkup = (post, compact = false) => `
		<a class="search-result${compact ? " compact" : ""}" href="${escapeHtml(post.url || "#")}">
			<span>${escapeHtml(post.date || "")}</span>
			<strong>${escapeHtml(post.title || "未命名文章")}</strong>
			${compact ? "" : `<p>${escapeHtml(post.excerpt || "")}</p>`}
		</a>`;

	const initFriendsMenu = () => {
		if (state.friendsMenuBound) return;
		const menu = document.querySelector("[data-friends-menu]");
		const trigger = menu?.querySelector("[data-friends-menu-trigger]");
		if (!menu || !trigger) return;
		state.friendsMenuBound = true;
		const setOpen = (open) => {
			menu.classList.toggle("is-open", open);
			trigger.setAttribute("aria-expanded", String(open));
		};
		trigger.addEventListener("click", (event) => {
			event.stopPropagation();
			setOpen(!menu.classList.contains("is-open"));
		});
		document.addEventListener("click", (event) => {
			if (!menu.contains(event.target)) setOpen(false);
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") setOpen(false);
		});
	};

	const isMobilePerformanceViewport = () => {
		const breakpoint = Number(runtimeConfig.ui?.mobilePerformance?.maxWidthPx || 900);
		return window.matchMedia(`(max-width: ${breakpoint}px)`).matches
			|| window.matchMedia("(hover: none), (pointer: coarse)").matches;
	};

	const initHeaderSearch = () => {
		if (state.headerSearchBound || SEARCH_CONFIG.enabled === false) return;
		const shell = document.querySelector("[data-header-search]");
		const trigger = shell?.querySelector("[data-header-search-trigger]");
		const input = shell?.querySelector("[data-header-search-input]");
		const results = shell?.querySelector("[data-header-search-results]");
		if (!shell || !trigger || !input || !results) return;
		state.headerSearchBound = true;
		const setOpen = (open) => {
			shell.classList.toggle("is-open", open);
			trigger.setAttribute("aria-expanded", String(open));
			if (open) window.setTimeout(() => input.focus(), 30);
		};
		const render = async () => {
			const query = input.value.trim();
			if (!query) {
				results.innerHTML = "";
				return;
			}
			results.innerHTML = `<p class="header-search-state">搜索中...</p>`;
			try {
				const posts = await getSearchIndex();
				const matches = matchSearchPosts(posts, query, Number(SEARCH_CONFIG.headerLimit || 3));
				results.innerHTML = matches.length
					? matches.map((post) => searchResultMarkup(post, true)).join("")
					: `<p class="header-search-state">没有找到匹配文章</p>`;
			} catch {
				results.innerHTML = `<p class="header-search-state">搜索索引暂时不可用</p>`;
			}
		};
		trigger.addEventListener("click", (event) => {
			event.stopPropagation();
			setOpen(!shell.classList.contains("is-open"));
		});
		input.addEventListener("input", render);
		input.addEventListener("keydown", (event) => {
			if (event.key === "Escape") setOpen(false);
			if (event.key !== "Enter") return;
			event.preventDefault();
			const query = input.value.trim();
			if (!query) return;
			const target = `/search/?q=${encodeURIComponent(query)}`;
			if (window.__mete0rSwup?.navigate) window.__mete0rSwup.navigate(target);
			else window.location.assign(target);
			setOpen(false);
		});
		document.addEventListener("click", (event) => {
			if (!shell.contains(event.target)) setOpen(false);
		});
	};

	const initSearchPage = async () => {
		const input = document.querySelector("[data-search-page-input]");
		const results = document.querySelector("[data-search-page-results]");
		if (!input || !results || input.dataset.ready === "true") return;
		input.dataset.ready = "true";
		const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
		input.value = initialQuery;
		let posts = [];
		const render = () => {
			const query = input.value.trim();
			const limit = query ? Number(SEARCH_CONFIG.pageLimit || 50) : Number(SEARCH_CONFIG.initialLimit || 12);
			const matches = matchSearchPosts(posts, query, limit);
			results.innerHTML = matches.length
				? matches.map((post) => searchResultMarkup(post)).join("")
				: `<p class="empty-state">没有找到匹配的文章。</p>`;
		};
		results.innerHTML = `<p class="empty-state">正在载入搜索索引...</p>`;
		try {
			posts = await getSearchIndex();
			render();
		} catch {
			results.innerHTML = `<p class="empty-state">搜索索引暂时不可用。</p>`;
			return;
		}
		input.addEventListener("input", render);
	};

	const renderFriendActivity = async () => {
		const container = document.querySelector("[data-friend-activity]");
		if (!container || FRIEND_ACTIVITY_CONFIG.enabled === false) return;
		if (state.friendActivityContainer === container && container.dataset.ready === "true") return;
		state.friendActivityContainer = container;
		container.dataset.ready = "true";
		const controller = createPageAbortController();
		try {
			const cacheMinutes = Number(FRIEND_ACTIVITY_CONFIG.cacheMinutes || CACHE_MINUTES);
			let data = readCache(FRIENDS_CACHE_KEY, cacheMinutes);
			if (!data) {
				const response = await fetch(FRIENDS_API, { cache: "no-store", signal: controller.signal });
				if (!response.ok) throw new Error(`Friends ${response.status}`);
				data = await response.json();
				writeCache(FRIENDS_CACHE_KEY, data);
			}
			const items = (Array.isArray(data.content) ? data.content : [])
				.flatMap((friend) => (Array.isArray(friend.posts) ? friend.posts : []).map((post) => ({
					friend: friend.title || friend.name || "朋友",
					avatar: friend.icon || friend.avatar || FRIEND_FALLBACK,
					friendUrl: friend.url || "#",
					title: post.title || "未命名文章",
					url: post.link || post.url || "#",
					published: post.published || post.date || post.updated || "",
					time: new Date(post.published || post.date || post.updated || 0).valueOf() || 0,
				})))
				.sort((a, b) => b.time - a.time)
				.slice(0, Math.max(1, Number(FRIEND_ACTIVITY_CONFIG.maxItems || 80)));
			container.innerHTML = items.length ? items.map((item, index) => `
				<article class="friend-activity-card glass-panel runtime-card" style="--delay:${Math.min(index, 18) * 35}ms">
					<a class="friend-activity-avatar" href="${escapeHtml(item.friendUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(item.avatar)}" alt="" loading="lazy" decoding="async"></a>
					<div><span>${escapeHtml(item.friend)}</span><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(item.title)}</strong></a><time>${escapeHtml(item.published || "最近更新")}</time></div>
				</article>`).join("") : `<p class="empty-state glass-panel">暂时没有可展示的朋友动态。</p>`;
		} catch (error) {
			if (error?.name !== "AbortError" && container.isConnected) container.innerHTML = `<p class="empty-state glass-panel">朋友动态暂时无法获取。</p>`;
		} finally {
			state.pageAbortControllers.delete(controller);
		}
	};

	const initFriendApplyForm = () => {
		const form = document.querySelector("[data-friend-apply-form]");
		const status = form?.querySelector("[data-friend-apply-status]");
		if (!form || !status || form.dataset.ready === "true") return;
		form.dataset.ready = "true";
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			if (!form.reportValidity()) return;
			const button = form.querySelector("button[type='submit']");
			const data = new FormData(form);
			const payload = Object.fromEntries(data.entries());
			["legalCommitment", "crawlCommitment", "originalContent", "independentDomain", "threeYears", "priorInteraction"].forEach((key) => {
				payload[key] = data.has(key);
			});
			payload.turnstileToken = data.get("cf-turnstile-response") || "";
			status.textContent = "正在提交申请...";
			status.className = "friend-apply-status is-loading";
			if (button) button.disabled = true;
			const controller = createPageAbortController();
			try {
				const response = await fetch(form.dataset.endpoint || FRIEND_APPLY_CONFIG.endpoint || "/api/friend-apply", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
					signal: controller.signal,
				});
				const result = await response.json().catch(() => ({}));
				if (!response.ok) throw Object.assign(new Error(result.message || "提交失败"), { result });
				status.className = "friend-apply-status is-success";
				status.innerHTML = `${escapeHtml(result.message || "申请已提交。")} ${result.issueUrl ? `<a href="${escapeHtml(result.issueUrl)}" target="_blank" rel="noopener noreferrer">查看 Issue</a>` : ""}`;
				form.reset();
				window.turnstile?.reset?.();
			} catch (error) {
				if (error?.name !== "AbortError") {
					status.className = "friend-apply-status is-error";
					status.textContent = error?.result?.message || "提交失败，请稍后重试。";
				}
			} finally {
				state.pageAbortControllers.delete(controller);
				if (button) button.disabled = false;
			}
		});
	};

	const renderMoments = async () => {
		const container = document.querySelector("[data-moments-list]");
		if (!container) return;
		if (state.momentsContainer === container && container.dataset.ready === "true") return;
		state.momentsContainer = container;
		container.dataset.ready = "true";

		try {
			const marked = await ensureMarked();
			let data = readCache(MOMENTS_CACHE_KEY);
			if (!data) {
				const response = await fetchPage(MOMENTS_API, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ page: 1, pageSize: 30 }),
				});
				if (!response.ok) throw new Error(`Moments ${response.status}`);
				data = await response.json();
				writeCache(MOMENTS_CACHE_KEY, data);
			}
			const moments = Array.isArray(data.data?.items) ? data.data.items : [];
			const needsMusic = moments.some((moment) => moment.extension?.type === "MUSIC");
			if (needsMusic) await ensureMeting();

			container.innerHTML = moments.map((moment, index) => {
				const extension = moment.extension || {};
				const payload = extension.payload || {};
				const liveVideos = [];
				const cleanContent = String(moment.content || "").replace(/\[live\](https?:\/\/[^\s<]+)/g, (_, url) => {
					liveVideos.push(url);
					return "";
				}).trim();
				const images = getMomentImages(moment);
				const markdown = cleanContent ? marked.parse(cleanContent, { breaks: true }) : "";
				const music = extension.type === "MUSIC" ? parseMusic(payload) : "";
				const video = extension.type === "VIDEO" ? renderVideo(cleanContent, payload) : renderVideo(cleanContent, null);
				const comments = getMomentCommentMeta(moment);

				return `
					<article class="moment-card glass-panel runtime-card" style="--delay:${Math.min(index, 18) * 45}ms">
						<header class="moment-header">
							<img class="no-lightbox" src="${AVATAR}" alt="${escapeHtml(moment.username || "Mete0r")}" />
							<div>
								<strong>${escapeHtml(moment.username || "Mete0r")}</strong>
								<time datetime="${escapeHtml(moment.created_at || "")}">${formatDate(moment.created_at)}</time>
							</div>
						</header>
						${markdown ? `<div class="moment-content">${markdown}</div>` : ""}
						${video}
						${renderCarousel(images, liveVideos)}
						${music}
						${extension.type === "WEBSITE" && payload.url ? `<a class="moment-extension" href="${payload.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.title || payload.url)}</a>` : ""}
						<div class="moment-actions">
							<span>${moment.fav_count || 0} 喜欢</span>
							<button class="moment-comment-button" type="button" data-moment-comment data-moment-id="${escapeHtml(comments.id)}" data-moment-quote="${escapeHtml(comments.quote)}">评论${Number(comments.count) ? ` ${escapeHtml(comments.count)}` : ""}</button>
						</div>
					</article>`;
			}).join("");

			initCarousels(container);
			bindMomentComments();
			bindFancybox();
			setTimeout(() => initCarousels(container), 500);
		} catch (error) {
			container.innerHTML = `<p class="empty-state glass-panel">说说数据暂时没有获取到。</p>`;
		}
	};

	const renderLatestComments = async () => {
		const container = document.querySelector("[data-latest-comments]");
		if (!container) return;
		if (state.latestCommentsContainer === container && container.dataset.ready === "true") return;
		state.latestCommentsContainer = container;
		container.dataset.ready = "true";

		try {
			let data = readCache(LATEST_COMMENTS_CACHE_KEY);
			if (!data) {
				const response = await fetchPage(LATEST_COMMENTS_API, { cache: "no-store" });
				if (!response.ok) throw new Error(`Comments ${response.status}`);
				data = await response.json();
				writeCache(LATEST_COMMENTS_CACHE_KEY, data);
			}
			const comments = (Array.isArray(data.data) ? data.data : [])
				.filter((comment) => comment && comment.is_pending === false && Number(comment.user_id) !== 1 && comment.visible !== false)
				.sort(() => Math.random() - 0.5)
				.slice(0, 20);

			if (!comments.length) {
				container.innerHTML = `<p class="empty-state glass-panel">暂时还没有可以展示的站内评论。</p>`;
				return;
			}

			container.innerHTML = comments.map((comment, index) => {
				const nick = comment.nick || "匿名访客";
				const content = String(comment.content || "").replace(/\s+/g, " ").trim();
				const pageUrl = comment.page_url || comment.page_key || "#comments";
				const lane = index % 6;
				const duration = 18 + (index % 5) * 2;
				const delay = index * 1.2;
				return `
					<a class="chat-barrage-item" href="${escapeHtml(pageUrl)}" target="_blank" rel="noopener noreferrer" style="--lane:${lane};--duration:${duration}s;--delay:${delay}s;">
						<span>${escapeHtml(nick)}</span>
						<b class="chat-barrage-text">${escapeHtml(content)}</b>
					</a>`;
			}).join("");
		} catch (error) {
			container.innerHTML = `<p class="empty-state glass-panel">最新评论暂时没有获取到。</p>`;
		}
	};

	const initProjectShowcase = () => {
		const showcase = document.querySelector("[data-project-showcase]");
		if (!showcase || showcase.dataset.ready === "true") return;
		const slides = [...showcase.querySelectorAll("[data-project-slide]")];
		const dots = [...showcase.querySelectorAll("[data-project-dot]")];
		if (slides.length <= 1) return;

		showcase.dataset.ready = "true";
		let index = 0;
		const show = (nextIndex = index) => {
			index = (nextIndex + slides.length) % slides.length;
			slides.forEach((slide, itemIndex) => slide.classList.toggle("active", itemIndex === index));
			dots.forEach((dot, itemIndex) => dot.classList.toggle("active", itemIndex === index));
		};
		const next = () => {
			show(index + 1);
		};
		dots.forEach((dot) => {
			dot.addEventListener("click", (event) => {
				event.preventDefault();
				show(Number(dot.dataset.index || 0));
				state.projectTimer && window.clearInterval(state.projectTimer);
				state.projectTimer = window.setInterval(next, PROJECT_INTERVAL);
			});
		});
		state.projectTimer && window.clearInterval(state.projectTimer);
		state.projectTimer = window.setInterval(next, PROJECT_INTERVAL);
	};

	const createArtalkUploader = (config) => {
		if (!config?.endpoint) return undefined;
		return async (file) => {
			const formData = new FormData();
			formData.append(config.fileField || "file", file);
			const headers = new Headers({ Accept: "application/json" });
			if (config.authHeader && config.authToken) {
				headers.set(config.authHeader, config.authToken);
			}
			const response = await fetchPage(config.endpoint, {
				method: "POST",
				headers,
				body: formData,
			});
			const payload = await response.json();
			const url = getPathValue(payload, config.resp || "data.links.url");
			if (!url) {
				throw new Error("Artalk image uploader response does not include an image URL.");
			}
			return url;
		};
	};

	const setArtalkStatus = (container, status, config = {}) => {
		const wrapper = container?.closest?.("[data-artalk-wrapper]");
		if (!wrapper || config.loading?.enabled === false) return;
		const isLoading = status === "loading";
		const isReady = status === "ready";
		const isError = status === "error";
		wrapper.classList.toggle("is-loading", isLoading);
		wrapper.classList.toggle("is-ready", isReady);
		wrapper.classList.toggle("is-error", isError);

		const text = wrapper.querySelector("[data-artalk-loading-text]");
		if (text) {
			text.textContent = isError
				? config.loading?.errorText || "评论区暂时没有加载成功，请稍后刷新重试。"
				: config.loading?.text || "评论区加载中...";
		}
	};

	const withTimeout = (promise, timeoutMs, message) =>
		new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
			promise.then(
				(value) => {
					window.clearTimeout(timeout);
					resolve(value);
				},
				(error) => {
					window.clearTimeout(timeout);
					reject(error);
				},
			);
		});

	const waitForArtalkDom = (container, timeoutMs) =>
		new Promise((resolve, reject) => {
			const isReady = () => container.querySelector(".atk, .atk-main-editor, .atk-list, .atk-editor");
			if (isReady()) {
				resolve();
				return;
			}

			const observer = new MutationObserver(() => {
				if (!isReady()) return;
				window.clearTimeout(timeout);
				observer.disconnect();
				resolve();
			});
			const timeout = window.setTimeout(() => {
				observer.disconnect();
				reject(new Error("Artalk render timeout."));
			}, timeoutMs);
			observer.observe(container, { childList: true, subtree: true });
		});

	const initArtalk = async () => {
		const container = document.querySelector("[data-artalk]");
		const configNode = document.querySelector("#artalk-config");
		if (!container || !configNode || ["true", "loading", "error"].includes(container.dataset.ready)) return;
		let config;
		try {
			config = JSON.parse(configNode.textContent || "{}");
		} catch (error) {
			return;
		}
		if (!config.enabled) return;

		const timeoutMs = Number(config.loading?.timeoutMs || 12000);
		const safeTimeoutMs = Number.isFinite(timeoutMs) ? Math.max(2500, timeoutMs) : 12000;
		container.dataset.ready = "loading";
		setArtalkStatus(container, "loading", config);

		try {
			loadStyle(config.css);
			await withTimeout(loadScript(config.js), safeTimeoutMs, "Artalk script load timeout.");
			if (!window.Artalk) throw new Error("Artalk is not available.");
			const isDark = document.documentElement.dataset.theme === "dark";
			state.artalkInstance?.destroy?.();
			state.artalkInstance = window.Artalk.init({
				el: "#artalk-comments",
				pageKey: config.pageKey,
				pageTitle: config.pageTitle,
				server: config.server,
				site: config.site,
				darkMode: isDark,
				fancybox: config.fancybox,
				imgUploader: createArtalkUploader(config.imageUploader),
			});
			await waitForArtalkDom(container, safeTimeoutMs);
			syncArtalkTheme();
			initArtalkPlane();
			container.dataset.ready = "true";
			setArtalkStatus(container, "ready", config);
			observeArtalkImages(container);
			window.setTimeout(() => bindFancybox(), 80);
		} catch (error) {
			container.dataset.ready = "error";
			setArtalkStatus(container, "error", config);
		}
	};

	const syncArtalkTheme = () => {
		const isDark = document.documentElement.dataset.theme === "dark";
		document.querySelectorAll("[data-artalk-wrapper]").forEach((wrapper) => {
			wrapper.dataset.artalkTheme = isDark ? "dark" : "light";
		});
		state.artalkInstance?.setDarkMode?.(isDark);
	};

	const initArtalkPlane = () => {
		const configNode = document.querySelector("#artalk-plane-config");
		if (!configNode) return;
		let config;
		try {
			config = JSON.parse(configNode.textContent || "{}");
		} catch (error) {
			return;
		}
		if (!config.enabled || !config.imageUrl) return;

		const inject = () => {
			const textarea = document.querySelector("textarea.atk-textarea");
			if (!textarea) return false;
			const wrap = textarea.closest(".atk-textarea-wrap");
			if (!wrap || wrap.querySelector("[data-artalk-plane]")) return Boolean(wrap);
			if (getComputedStyle(wrap).position === "static") {
				wrap.style.position = "relative";
			}

			const decoration = document.createElement("div");
			decoration.dataset.artalkPlane = "true";
			decoration.className = "artalk-plane-decoration";
			decoration.style.right = config.right || "12px";
			decoration.style.top = config.top || "12px";

			const image = document.createElement("img");
			image.src = config.imageUrl;
			image.alt = "";
			image.setAttribute("aria-hidden", "true");
			image.style.width = config.width || "100px";
			image.style.height = config.height || "100px";
			if (config.maxWidth) image.style.maxWidth = config.maxWidth;
			if (config.maxHeight) image.style.maxHeight = config.maxHeight;
			image.style.opacity = String(config.opacity ?? 0.7);
			image.style.borderRadius = config.borderRadius || "6px";
			image.addEventListener("error", () => {
				decoration.hidden = true;
			}, { once: true });

			decoration.appendChild(image);
			wrap.appendChild(decoration);

			const width = Number.parseInt(config.width || config.maxWidth || "100", 10);
			const right = Number.parseInt(config.right || "12", 10);
			const currentPadding = Number.parseInt(getComputedStyle(textarea).paddingRight || "0", 10);
			if (Number.isFinite(width) && currentPadding < width + right) {
				textarea.style.paddingRight = `${width + right}px`;
			}
			return true;
		};

		if (inject()) return;
		state.planeObserver?.disconnect?.();
		state.planeObserver = new MutationObserver(() => {
			if (inject()) {
				state.planeObserver?.disconnect?.();
			}
		});
		state.planeObserver.observe(document.body, { childList: true, subtree: true });
		window.clearTimeout(state.planeTimer);
		state.planeTimer = window.setTimeout(() => state.planeObserver?.disconnect?.(), 10000);
	};

	const observeArtalkImages = (container) => {
		if (!container || state.artalkImageObserver) return;
		let frame = null;
		state.artalkImageObserver = new MutationObserver(() => {
			if (frame) return;
			frame = window.requestAnimationFrame(() => {
				frame = null;
				bindFancybox();
			});
		});
		state.artalkImageObserver.observe(container, { childList: true, subtree: true });
	};

	const initWelcome = async () => {
		const locationNode = document.querySelector("#visitor-location");
		const ipNode = document.querySelector("#visitor-ip");
		const sloganNode = document.querySelector("#welcome-slogan");
		if (!locationNode || !ipNode || !sloganNode) return;
		if (state.welcomeNode === locationNode && locationNode.dataset.ready === "true") return;
		state.welcomeNode = locationNode;
		locationNode.dataset.ready = "true";

		try {
			const response = await fetchPage(LOCATION_API, { cache: "no-store" });
			if (!response.ok) throw new Error(`Location ${response.status}`);
			const data = await response.json();
			if (data.code !== 200 || !data.data) return;

			const { country = "", province = "", city = "", ip = "" } = data.data;
			const locationText = `${country}${province}${city}` || "神秘地区";
			locationNode.textContent = locationText;
			ipNode.textContent = ip || "未知";

			const region = country === "中国" ? `${country}${province || ""}` : country;
			if (!region) return;
			const sloganResponse = await fetchPage(`${SLOGAN_API}?region=${encodeURIComponent(region)}`, { cache: "no-store" });
			if (!sloganResponse.ok) throw new Error(`Slogan ${sloganResponse.status}`);
			const sloganData = await sloganResponse.json();
			sloganNode.textContent = sloganData.slogan || sloganData.content || "欢迎来到我的博客。";
		} catch (error) {
			locationNode.textContent = "神秘地区";
			sloganNode.textContent = "欢迎来到我的博客。";
		}
	};

	const initScrollProgress = () => {
		const bar = document.querySelector("[data-scroll-progress]");
		if (!bar) return;
		const update = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			const progress = max > 0 ? window.scrollY / max : 0;
			bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
		};
		window.removeEventListener("scroll", state.scrollHandler);
		state.scrollHandler = update;
		window.addEventListener("scroll", update, { passive: true });
		update();
	};

	const initBackToTop = () => {
		const button = document.querySelector("[data-back-to-top]");
		if (!button) return;
		if (button.dataset.ready !== "true") {
			button.dataset.ready = "true";
			button.addEventListener("click", (event) => {
				event.preventDefault();
				window.scrollTo({ top: 0, behavior: "smooth" });
				history.replaceState(history.state, "", window.location.pathname + window.location.search);
			});
		}

		const update = () => {
			button.classList.toggle("is-visible", window.scrollY > 360);
		};
		if (state.backToTopHandler) {
			window.removeEventListener("scroll", state.backToTopHandler);
		}
		state.backToTopHandler = update;
		window.addEventListener("scroll", update, { passive: true });
		update();
	};

	const closeToast = (toast) => {
		if (!toast) return;
		toast.classList.remove("is-visible", "has-action", "is-persistent");
		toast.querySelector(".mete0r-toast-actions")?.remove();
		delete toast.dataset.toastMode;
	};

	const showToast = (message, duration = 5000, options = {}) => {
		const safeDuration = Number.isFinite(Number(duration)) ? Math.max(1000, Number(duration)) : 5000;
		let toast = document.querySelector("[data-mete0r-toast]");
		if (!toast) {
			toast = document.createElement("div");
			toast.className = "mete0r-toast";
			toast.dataset.mete0rToast = "true";
			toast.innerHTML = `<div class="mete0r-toast-progress" aria-hidden="true"></div><span class="mete0r-toast-text"></span>`;
			document.body.appendChild(toast);
		}
		const progress = toast.querySelector(".mete0r-toast-progress");
		const text = toast.querySelector(".mete0r-toast-text");
		if (text) {
			if (options.html) {
				text.innerHTML = message;
			} else {
				text.textContent = message;
			}
		}
		toast.dataset.toastMode = options.mode || "";
		toast.style.setProperty("--toast-duration", `${safeDuration}ms`);
		toast.classList.remove("is-visible", "has-action", "is-persistent");
		toast.classList.toggle("is-persistent", options.persistent === true);
		toast.querySelector(".mete0r-toast-actions")?.remove();
		const actions = Array.isArray(options.actions) ? options.actions : options.actionText ? [{
			text: options.actionText,
			variant: options.actionVariant,
			onClick: options.onAction,
		}] : [];
		if (actions.length) {
			const actionsWrap = document.createElement("div");
			actionsWrap.className = "mete0r-toast-actions";
			actions.forEach((item) => {
				const action = document.createElement("button");
				action.type = "button";
				action.className = `mete0r-toast-action${item.variant ? ` is-${item.variant}` : ""}`;
				action.textContent = item.text || "";
				action.addEventListener("click", () => {
					window.clearTimeout(state.toastTimer);
					closeToast(toast);
					item.onClick?.();
				});
				actionsWrap.appendChild(action);
			});
			toast.appendChild(actionsWrap);
			toast.classList.add("has-action");
		}
		if (progress) {
			progress.style.animation = "none";
			progress.offsetHeight;
			progress.style.animation = options.persistent === true ? "none" : "";
		}
		window.clearTimeout(state.toastTimer);
		requestAnimationFrame(() => toast.classList.add("is-visible"));
		if (options.persistent !== true) {
			state.toastTimer = window.setTimeout(() => {
				options.onAutoClose?.();
				closeToast(toast);
			}, safeDuration);
		}
		return toast;
	};

	window.Mete0rToast = window.Mete0rToast || {};
	window.Mete0rToast.show = showToast;
	window.addEventListener("mete0r:toast", (event) => {
		const detail = event.detail || {};
		showToast(detail.message || "", detail.duration || 5000);
	});

	const initToastNotices = () => {
		document.querySelectorAll("[data-toast-notice]:not([data-ready])").forEach((node) => {
			node.dataset.ready = "true";
			if (node.dataset.auto === "false") return;
			showToast(node.dataset.message || "", Number(node.dataset.duration || 5000));
		});
	};

	const initAutoDarkToast = () => {
		if (AUTO_DARK_CONFIG.enabled === false || state.autoDarkToastBound) return;
		const shouldShow = sessionStorage.getItem("mete0r:auto-dark-toast") === "true";
		if (!shouldShow || document.documentElement.dataset.theme !== "dark") return;
		state.autoDarkToastBound = true;
		sessionStorage.removeItem("mete0r:auto-dark-toast");
		showToast(AUTO_DARK_CONFIG.message || "当前时段23:00~4:00已为您自动开启夜间模式", Number(AUTO_DARK_CONFIG.durationMs || 3600));
	};

	const applyPolicyImageRejection = () => {
		if (POLICY_CONSENT_CONFIG.enabled === false || !state.policyImagesRejected) return;
		document.documentElement.dataset.policyImages = "removed";
		document.querySelectorAll("img, picture, svg image, canvas, video, source").forEach((node) => {
			node.remove();
		});
		document.querySelectorAll("[style*='background-image'], [style*='--article-cover'], [style*='--post-cover']").forEach((node) => {
			node.style.removeProperty("background-image");
			node.style.removeProperty("--article-cover");
			node.style.removeProperty("--post-cover");
		});
	};

	const initPolicyConsentToast = () => {
		if (POLICY_CONSENT_CONFIG.enabled === false || state.policyConsentBound) return;
		const storageKey = POLICY_CONSENT_CONFIG.storageKey || "mete0r:policy-consent:v1";
		if (localStorage.getItem(storageKey) === "accepted") return;
		state.policyConsentBound = true;
		const privacyUrl = POLICY_CONSENT_CONFIG.privacyUrl || "/about/privacy/";
		const copyrightUrl = POLICY_CONSENT_CONFIG.copyrightUrl || "/about/copyright/";
		const accept = () => {
			localStorage.setItem(storageKey, "accepted");
			localStorage.setItem(`${storageKey}:time`, new Date().toISOString());
		};
		const reject = () => {
			state.policyImagesRejected = true;
			applyPolicyImageRejection();
			showToast(POLICY_CONSENT_CONFIG.rejectToast || "已按您的选择移除站内图片元素。刷新即可重置状态。", 5000);
		};
		const privacyLink = `<a href="${escapeHtml(privacyUrl)}">隐私政策</a>`;
		const copyrightLink = `<a href="${escapeHtml(copyrightUrl)}">版权政策</a>`;
		const messageTemplate = POLICY_CONSENT_CONFIG.message || "继续访问本站前，请阅读并选择是否同意 {privacy} 与 {copyright}。";
		const message = messageTemplate
			.replaceAll("{privacy}", privacyLink)
			.replaceAll("{copyright}", copyrightLink);
		showToast(message, Number(POLICY_CONSENT_CONFIG.durationMs || 20000), {
			html: true,
			mode: "policy",
			persistent: true,
			actions: [
				{
					text: POLICY_CONSENT_CONFIG.rejectButtonText || "拒绝",
					variant: "danger",
					onClick: reject,
				},
				{
					text: POLICY_CONSENT_CONFIG.buttonText || "同意",
					onClick: accept,
				},
			],
		});
	};

	const initSocialDockEasterEgg = () => {
		if (state.socialDockBound) return;
		state.socialDockBound = true;
		const messages = Array.isArray(SOCIAL_DOCK_CONFIG.messages) && SOCIAL_DOCK_CONFIG.messages.length ? SOCIAL_DOCK_CONFIG.messages : [
			"今天也要 Trust the process!",
			"嘿嘿，被你点到啦。",
			"记得喝水，别熬太狠。",
			"欢迎来到 Mete0r 的小宇宙。",
			"代码会乖乖跑起来的。",
			"别急，慢慢来就很厉害。",
		];
		document.addEventListener("click", (event) => {
			const character = event.target.closest?.("[data-social-character]");
			if (!character) return;
			const dock = character.closest(".social-dock");
			const bubble = dock?.querySelector("[data-social-bubble]");
			if (!bubble) return;
			bubble.textContent = messages[Math.floor(Math.random() * messages.length)];
			bubble.classList.remove("is-visible");
			window.clearTimeout(bubble._hideTimer);
			requestAnimationFrame(() => bubble.classList.add("is-visible"));
			bubble._hideTimer = window.setTimeout(() => bubble.classList.remove("is-visible"), 2400);
		});
	};

	const setMobileDrawerOpen = (open) => {
		const drawer = document.querySelector("[data-mobile-drawer]");
		const toggle = document.querySelector("[data-mobile-menu-toggle]");
		if (!drawer || !toggle) return;
		if (open) {
			const scroll = drawer.querySelector(".mobile-drawer-scroll");
			if (scroll) scroll.scrollTop = 0;
			syncMobileToc();
			window.requestAnimationFrame(() => {
				if (typeof initTocBar === "function") initTocBar();
			});
		}
		drawer.classList.toggle("is-open", open);
		toggle.classList.toggle("is-open", open);
		drawer.setAttribute("aria-hidden", open ? "false" : "true");
		toggle.setAttribute("aria-expanded", open ? "true" : "false");
		document.documentElement.classList.toggle("mobile-drawer-open", open);
	};

	const initMobileDrawer = () => {
		const drawer = document.querySelector("[data-mobile-drawer]");
		const toggle = document.querySelector("[data-mobile-menu-toggle]");
		if (!drawer || !toggle || state.mobileDrawerBound) return;
		state.mobileDrawerBound = true;

		toggle.addEventListener("click", (event) => {
			event.preventDefault();
			setMobileDrawerOpen(!drawer.classList.contains("is-open"));
		});
		document.querySelectorAll("[data-mobile-menu-close]").forEach((button) => {
			button.addEventListener("click", () => setMobileDrawerOpen(false));
		});
		drawer.addEventListener("click", (event) => {
			const link = event.target.closest?.("a[href]");
			if (link) setMobileDrawerOpen(false);
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") setMobileDrawerOpen(false);
		});
	};

	const initCodeBlocks = () => {
		if (MARKDOWN_CONFIG.copyCode === false) return;
		document.querySelectorAll(".article-body pre:not([data-code-ready])").forEach((pre) => {
			pre.dataset.codeReady = "true";
			const code = pre.querySelector("code");
			if (code) {
				const lineNodes = [...code.querySelectorAll(":scope > .line")];
				while (lineNodes.length > 1 && !(lineNodes[lineNodes.length - 1].textContent || "").trim()) {
					lineNodes.pop().remove();
				}
			}
			if (MARKDOWN_CONFIG.lineNumbers !== false && code && !pre.querySelector(".code-line-numbers")) {
				const raw = code.textContent || "";
				const lines = raw.replace(/\s+$/g, "").split("\n");
				const gutter = document.createElement("span");
				gutter.className = "code-line-numbers";
				gutter.setAttribute("aria-hidden", "true");
				gutter.innerHTML = lines.map((_, index) => "<span>" + (index + 1) + "</span>").join("");
				pre.insertBefore(gutter, code);
				pre.classList.add("has-line-numbers");
			}
			const button = document.createElement("button");
			button.type = "button";
			button.className = "code-copy-button";
			button.textContent = "copy";
			button.addEventListener("click", async () => {
				const code = pre.querySelector("code");
				const text = (code?.textContent || pre.innerText.replace(/^copy\s*/, "")).replace(/\s+$/g, "");
				try {
					await navigator.clipboard.writeText(text);
					button.textContent = "copied";
					window.setTimeout(() => {
						button.textContent = "copy";
					}, 1400);
				} catch (error) {
					button.textContent = "failed";
				}
			});
			pre.appendChild(button);
		});
		document.querySelectorAll(".stellar-copy:not([data-copy-ready])").forEach((node) => {
			node.dataset.copyReady = "true";
			node.title = "点击复制";
			node.addEventListener("click", async () => {
				const original = node.textContent;
				try {
					await navigator.clipboard.writeText(node.dataset.copyText || original || "");
					node.textContent = "copied";
					window.setTimeout(() => {
						node.textContent = original;
					}, 1200);
				} catch (error) {
					node.textContent = "copy failed";
				}
			});
		});
	};

	const initStellarImages = () => {
		document.querySelectorAll(".article-body .stellar-image:not([data-image-ready])").forEach((figure) => {
			figure.dataset.imageReady = "true";
			const bg = figure.querySelector(".image-bg");
			const image = figure.querySelector("img");
			if (!bg || !image) return;
			const applyRatio = () => {
				if (bg.style.aspectRatio || !image.naturalWidth || !image.naturalHeight) return;
				bg.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
			};
			image.addEventListener("load", applyRatio, { once: true });
			if (image.complete) applyRatio();
		});
	};

	const initMermaid = async () => {
		if (MARKDOWN_CONFIG.mermaid === false) return;
		const blocks = [...document.querySelectorAll(".article-body pre > code.language-mermaid, .article-body pre > code[class*='language-mermaid']")];
		if (!blocks.length) return;
		const mermaid = await ensureMermaid();
		mermaid.initialize({
			startOnLoad: false,
			theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default",
			securityLevel: "loose",
		});
		const nodes = blocks.map((code, index) => {
			const pre = code.closest("pre");
			const wrapper = document.createElement("div");
			wrapper.className = "mermaid";
			wrapper.id = "mermaid-" + Date.now() + "-" + index;
			wrapper.textContent = code.textContent || "";
			pre.replaceWith(wrapper);
			return wrapper;
		});
		if (typeof mermaid.run === "function") {
			await mermaid.run({ nodes });
		} else if (typeof mermaid.init === "function") {
			mermaid.init(undefined, nodes);
		}
	};

	const getTocTargetId = (link) => {
		const href = link.getAttribute("href") || "";
		if (!href.startsWith("#")) return "";
		try {
			return decodeURIComponent(href.slice(1));
		} catch (error) {
			return href.slice(1);
		}
	};

	const readCssPx = (name, fallback = 0) => {
		const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
		return Number.isFinite(value) ? value : fallback;
	};

	const syncDesktopTocPosition = () => {
		const article = document.querySelector(".article-main-column") || document.querySelector(".article-body");
		const header = document.querySelector(".site-header");
		if (!article || isMobilePerformanceViewport()) return;
		const articleRect = article.getBoundingClientRect();
		const headerRect = header?.getBoundingClientRect();
		const gap = readCssPx("--toc-gap", 24);
		const viewportGap = Math.max(12, readCssPx("--toc-right", 32));
		const headerGap = readCssPx("--toc-header-gap", 12);
		const top = Math.max(16, (headerRect?.bottom ?? 0) + headerGap);
		document.querySelectorAll(".article-content-shell > .toc-bar").forEach((toc) => {
			const computed = getComputedStyle(toc);
			const translateX = Number.parseFloat(computed.translate) || 0;
			const minLeft = viewportGap - Math.min(0, translateX);
			const maxLeft = window.innerWidth - toc.offsetWidth - viewportGap - Math.max(0, translateX);
			const preferredLeft = articleRect.right + gap;
			toc.style.left = `${Math.round(Math.max(minLeft, Math.min(preferredLeft, maxLeft)))}px`;
			toc.style.right = "auto";
			toc.style.top = `${Math.round(top)}px`;
			toc.style.maxHeight = `min(calc(100vh * var(--toc-max-viewport-ratio, 0.5)), calc(100vh - ${Math.round(top)}px - 24px))`;
		});
	};

	const scrollTocLinkIntoView = (link, smooth = true) => {
		const toc = link?.closest?.(".toc-bar");
		if (!toc) return;
		const maxScroll = Math.max(0, toc.scrollHeight - toc.clientHeight);
		if (!maxScroll) return;
		const target = Math.max(0, Math.min(maxScroll, link.offsetTop - toc.clientHeight * 0.38));
		if (Math.abs(toc.scrollTop - target) < 2) return;
		toc.scrollTo({
			top: target,
			behavior: smooth ? "smooth" : "auto",
		});
	};

	const syncMobileToc = () => {
		const target = document.querySelector("[data-mobile-toc]");
		const panel = document.querySelector("[data-mobile-toc-panel]");
		if (!target || !panel) return;

		const desktopToc = document.querySelector("#swup .article-content-shell > .toc-bar");
		const buildFallbackToc = () => {
			const headings = [...document.querySelectorAll("#swup .article-body :is(h2, h3, h4)")].filter((heading) => heading.id);
			if (!headings.length) return null;
			const aside = document.createElement("aside");
			aside.className = "toc-bar toc-bar-mobile";
			const title = document.createElement("strong");
			title.textContent = "目录";
			const nav = document.createElement("nav");
			nav.setAttribute("aria-label", "文章目录");
			headings.forEach((heading) => {
				const link = document.createElement("a");
				link.href = `#${heading.id}`;
				link.textContent = heading.textContent?.trim() || heading.id;
				link.style.setProperty("--toc-depth", String(Math.max(0, Number(heading.tagName.slice(1)) - 2)));
				nav.appendChild(link);
			});
			const divider = document.createElement("div");
			divider.className = "toc-divider";
			divider.setAttribute("aria-hidden", "true");
			const actions = document.createElement("div");
			actions.className = "toc-actions";
			actions.setAttribute("aria-label", "文章操作");
			actions.innerHTML = `<a href="#top" data-scroll-top>回到顶部</a><a href="#comments">参与讨论</a>`;
			aside.append(title, nav, divider, actions);
			return aside;
		};

		if (!desktopToc && !document.querySelector("#swup .article-body :is(h2, h3, h4)[id]")) {
			target.replaceChildren();
			panel.hidden = true;
			panel.classList.add("is-empty");
			return;
		}

		const clone = desktopToc ? desktopToc.cloneNode(true) : buildFallbackToc();
		if (!clone || !clone.querySelector("nav a")) {
			target.replaceChildren();
			panel.hidden = true;
			panel.classList.add("is-empty");
			return;
		}
		clone.classList.add("toc-bar-mobile");
		clone.removeAttribute("style");
		clone.querySelectorAll("[data-ready]").forEach((node) => {
			node.removeAttribute("data-ready");
		});
		target.replaceChildren(clone);
		panel.hidden = false;
		panel.classList.remove("is-empty");
	};

	const initTocBar = () => {
		const tocs = [...document.querySelectorAll(".toc-bar")];
		if (!tocs.length) return;
		const links = tocs.flatMap((toc) => [...toc.querySelectorAll("nav a[href^='#']")]);
		const headingIds = [...new Set(links.map(getTocTargetId).filter(Boolean))];
		const headings = headingIds
			.map((id) => document.getElementById(id))
			.filter(Boolean);
		if (!headings.length) return;

		state.tocObserver?.disconnect?.();
		if (state.tocScrollHandler) {
			window.removeEventListener("scroll", state.tocScrollHandler);
			window.removeEventListener("resize", state.tocScrollHandler);
		}
		if (state.tocScrollFrame) {
			window.cancelAnimationFrame(state.tocScrollFrame);
			state.tocScrollFrame = null;
		}

		const syncTocByScroll = () => {
			const marker = window.scrollY + Math.max(120, window.innerHeight * 0.22);
			let activeHeading = headings[0];
			for (const heading of headings) {
				if (heading.offsetTop <= marker) {
					activeHeading = heading;
				} else {
					break;
				}
			}
			if (!activeHeading) return;
			const activeHref = `#${activeHeading.id}`;
			const activeLinks = [];
			links.forEach((link) => {
				const isActive = link.getAttribute("href") === activeHref;
				link.classList.toggle("active", isActive);
				if (isActive) activeLinks.push(link);
			});
			activeLinks.forEach((link) => scrollTocLinkIntoView(link, false));
		};

		state.tocScrollHandler = () => {
			if (state.tocScrollFrame) return;
			state.tocScrollFrame = window.requestAnimationFrame(() => {
				state.tocScrollFrame = null;
				syncDesktopTocPosition();
				syncTocByScroll();
			});
		};
		window.addEventListener("scroll", state.tocScrollHandler, { passive: true });
		window.addEventListener("resize", state.tocScrollHandler);
		syncDesktopTocPosition();
		syncTocByScroll();

		tocs.forEach((toc) => {
			const topButton = toc.querySelector("[data-scroll-top]");
			if (topButton && topButton.dataset.ready !== "true") {
				topButton.dataset.ready = "true";
				topButton.addEventListener("click", (event) => {
					event.preventDefault();
					window.scrollTo({ top: 0, behavior: "smooth" });
					history.replaceState(history.state, "", window.location.pathname + window.location.search);
					setMobileDrawerOpen(false);
				});
			}

			toc.querySelectorAll("nav a[href^='#'], .toc-actions a[href^='#']").forEach((link) => {
				if (link.dataset.drawerReady === "true") return;
				link.dataset.drawerReady = "true";
				link.addEventListener("click", () => setMobileDrawerOpen(false));
			});
		});
	};

	const initStellarMedia = async () => {
		if (document.querySelector(".article-body meting-js")) {
			await ensureMeting();
		}
		document.querySelectorAll(".stellar-livephoto:not([data-live-ready])").forEach((node) => {
			node.dataset.liveReady = "true";
			const video = node.querySelector("video");
			node.addEventListener("mouseenter", () => video?.play().catch(() => {}));
			node.addEventListener("mouseleave", () => {
				if (!video) return;
				video.pause();
				video.currentTime = 0;
			});
		});
	};

	const initMusicPlayer = () => {
		const shell = document.querySelector("[data-music-player]");
		if (!shell || state.musicInitialized || !String(MUSIC_CONFIG.playlistId || "").trim()) return;
		state.musicInitialized = true;
		const trigger = shell.querySelector("[data-music-toggle]");
		const mount = shell.querySelector("[data-music-mount]");
		const cover = shell.querySelector("[data-music-cover]");
		const coverFallback = shell.querySelector("[data-music-cover-fallback]");
		const title = shell.querySelector("[data-music-title]");
		const currentTime = shell.querySelector("[data-music-current]");
		const durationTime = shell.querySelector("[data-music-duration]");
		const progress = shell.querySelector("[data-music-progress]");
		const collapsed = MUSIC_CONFIG.collapsed !== false;
		const failedTracks = new Set();
		let seeking = false;
		let activationPending = false;
		shell.classList.toggle("is-collapsed", collapsed);
		trigger?.setAttribute("aria-expanded", String(!collapsed));
		const setCollapsed = (value) => {
			shell.classList.toggle("is-collapsed", value);
			trigger?.setAttribute("aria-expanded", String(!value));
			trigger?.setAttribute("aria-label", value ? "播放当前歌曲" : "暂停当前歌曲");
		};
		const setProgress = (ratio, displaySeconds) => {
			const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
			shell.style.setProperty("--music-progress", `${safeRatio * 100}%`);
			if (progress) progress.value = String(Math.round(safeRatio * 1000));
			if (currentTime && Number.isFinite(displaySeconds)) currentTime.textContent = formatMusicTime(displaySeconds);
		};
		const showCover = (url) => {
			if (!cover || !coverFallback) return;
			if (!url) {
				cover.hidden = true;
				cover.removeAttribute("src");
				coverFallback.hidden = false;
				return;
			}
			cover.hidden = false;
			coverFallback.hidden = true;
			cover.src = url;
		};
		cover?.addEventListener("error", () => showCover(""));
		const syncTrack = (index = 0) => {
			const tracks = state.musicTracks || [];
			const track = tracks[Math.max(0, Number(index) || 0)] || tracks[0];
			if (!track) return;
			showCover(track.cover);
			if (title) title.textContent = track.name;
			trigger?.setAttribute("title", `${track.name} - ${track.artist}`);
			trigger?.setAttribute("aria-label", state.musicInstance?.audio?.paused === false ? `暂停 ${track.name}` : `播放 ${track.name}`);
		};
		const loadPlaylist = async () => {
			if (Array.isArray(state.musicTracks) && state.musicTracks.length) return state.musicTracks;
			if (state.musicPlaylistPromise) return state.musicPlaylistPromise;
			shell.classList.add("is-loading");
			state.musicPlaylistPromise = (async () => {
				const controller = new AbortController();
				const timeout = window.setTimeout(() => controller.abort(), Math.max(1000, Number(MUSIC_CONFIG.requestTimeoutMs || 8000)));
				let response;
				try {
					response = await fetch(buildMetingApiUrl(
						MUSIC_CONFIG.server || "netease",
						MUSIC_CONFIG.type || "playlist",
						String(MUSIC_CONFIG.playlistId),
					), { signal: controller.signal, headers: { Accept: "application/json" } });
				} finally {
					window.clearTimeout(timeout);
				}
				if (!response.ok) throw new Error(`Meting API ${response.status}`);
				const parsed = await response.json();
				const audio = (Array.isArray(parsed) ? parsed : []).map((track) => ({
					name: String(track.name || "未命名歌曲"),
					artist: String(track.artist || "未知歌手"),
					url: normalizeMusicUrl(track.url),
					cover: normalizeMusicUrl(track.pic || track.cover),
					lrc: normalizeMusicUrl(track.lrc),
				})).filter((track) => track.url);
				if (!audio.length) throw new Error("Meting API returned an empty playlist");
				state.musicTracks = audio;
				syncTrack(0);
				return audio;
			})().catch((error) => {
				state.musicPlaylistPromise = null;
				state.musicTracks = null;
				if (title) title.textContent = "歌单解析失败，点击重试";
				throw error;
			}).finally(() => shell.classList.remove("is-loading"));
			return state.musicPlaylistPromise;
		};
		const syncPlaybackTime = () => {
			const player = state.musicInstance;
			if (!player?.audio || seeking) return;
			const duration = player.duration || 0;
			const elapsed = player.audio.currentTime || 0;
			setProgress(duration ? elapsed / duration : 0, elapsed);
			if (durationTime) durationTime.textContent = formatMusicTime(duration);
		};
		const mountPlayer = async () => {
			if (state.musicInstance) return state.musicInstance;
			if (!mount) throw new Error("Music player mount is unavailable");
			shell.classList.add("is-loading");
			try {
				const [APlayer, audio] = await Promise.all([ensureAPlayer(), loadPlaylist()]);
				mount.replaceChildren();
				const player = new APlayer({
					container: mount,
					audio,
					autoplay: MUSIC_CONFIG.autoplay === true,
					volume: Math.max(0, Math.min(1, Number(MUSIC_CONFIG.volume ?? 0.7))),
					preload: "metadata",
					loop: MUSIC_CONFIG.autoNext === false ? "none" : "all",
					order: MUSIC_CONFIG.sequential === false ? "random" : "list",
					listFolded: true,
				});
				state.musicInstance = player;
				player.on("play", () => {
					failedTracks.delete(player.list.index);
					shell.classList.add("is-playing");
					shell.classList.remove("is-error");
					setCollapsed(false);
					syncTrack(player.list.index);
				});
				player.on("pause", () => {
					shell.classList.remove("is-playing");
					if (MUSIC_CONFIG.collapseOnPause !== false && !(MUSIC_CONFIG.autoNext !== false && player.audio?.ended)) {
						setCollapsed(true);
					}
				});
				player.on("listswitch", (event) => {
					setProgress(0, 0);
					if (durationTime) durationTime.textContent = "00:00";
					syncTrack(event?.index ?? player.list.index);
				});
				player.on("timeupdate", syncPlaybackTime);
				player.on("loadedmetadata", syncPlaybackTime);
				player.on("durationchange", syncPlaybackTime);
				player.on("error", () => {
					failedTracks.add(player.list.index);
					if (failedTracks.size < audio.length) {
						player.skipForward();
						player.play();
						return;
					}
					shell.classList.add("is-error");
					setCollapsed(true);
					if (title) title.textContent = "歌曲暂时无法播放";
					showToast("当前歌单暂时无法播放，请稍后重试。", 3600);
				});
				syncTrack(player.list.index);
				syncPlaybackTime();
				return player;
			} finally {
				shell.classList.remove("is-loading");
			}
		};
		trigger?.addEventListener("click", async () => {
			if (activationPending) return;
			activationPending = true;
			try {
				const player = await mountPlayer();
				if (player.audio?.paused) player.play();
				else player.pause();
			} catch {
				shell.classList.add("is-error");
				setCollapsed(true);
				showToast("播放器载入失败，请稍后重试。", 3600);
			} finally {
				activationPending = false;
			}
		});
		progress?.addEventListener("pointerdown", () => { seeking = true; });
		progress?.addEventListener("input", () => {
			const player = state.musicInstance;
			const ratio = Math.max(0, Math.min(1, Number(progress.value) / 1000));
			setProgress(ratio, (player?.duration || 0) * ratio);
		});
		progress?.addEventListener("change", () => {
			const player = state.musicInstance;
			const ratio = Math.max(0, Math.min(1, Number(progress.value) / 1000));
			if (player?.duration) player.seek(player.duration * ratio);
			seeking = false;
			syncPlaybackTime();
		});
		progress?.addEventListener("pointerup", () => { seeking = false; });
		loadPlaylist().catch(() => {});
		if (!collapsed || MUSIC_CONFIG.autoplay === true) {
			mountPlayer().then((player) => {
				if (MUSIC_CONFIG.autoplay === true) player.play();
			}).catch(() => {});
		}
	};

	const initPageMotion = () => {
		if (MOTION_CONFIG.enabled === false) return;
		const root = document.querySelector("#swup");
		if (!root) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const mobile = isMobilePerformanceViewport();
		if (mobile && MOTION_CONFIG.mobileReduceEffects !== false) {
			root.querySelectorAll(".motion-reveal").forEach((node) => {
				node.classList.remove("motion-reveal");
				node.classList.add("motion-visible");
			});
			return;
		}
		const max = Math.max(0, Number(mobile ? MOTION_CONFIG.mobileMaxAnimatedItems ?? 8 : MOTION_CONFIG.maxAnimatedItems ?? 18));
		const stagger = Math.max(0, Number(MOTION_CONFIG.staggerMs ?? 55));
		const candidates = [...root.querySelectorAll(":scope > *, .post-card, .timeline-year, .taxonomy-card")]
			.filter((node, index, list) => (
				list.indexOf(node) === index
				&& !node.matches(".article-page")
				&& node.getBoundingClientRect().height <= window.innerHeight * 2.5
			))
			.slice(0, max);
		state.motionObserver?.disconnect?.();
		if (reduced || !candidates.length) {
			candidates.forEach((node) => node.classList.add("motion-visible"));
			return;
		}
		state.motionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add("motion-visible");
				observer.unobserve(entry.target);
			});
		}, { rootMargin: "0px 0px -7%", threshold: 0 });
		candidates.forEach((node, index) => {
			node.classList.add("motion-reveal");
			node.style.setProperty("--motion-delay", `${Math.min(index, 10) * stagger}ms`);
			state.motionObserver.observe(node);
		});
	};

	const initStellarRuntime = async () => {
		const root = document.querySelector(".article-body");
		if (!root || !root.querySelector("[class*='stellar-'], .ds-rating, .ds-vote, .tag-plugin.tabs, .tag-plugin.swiper, .stellar-data-service")) return;
		try {
			state.stellarModuleLoading ||= import("/scripts/runtime-stellar.js");
			const module = await state.stellarModuleLoading;
			state.stellarDisposer?.();
			state.stellarDisposer = module.initStellarRuntime(root, STELLAR_CONFIG, {
				ensureMarked,
				ensureMeting,
				escapeHtml,
				loadScript,
				loadStyle,
			});
		} catch (error) {
			console.warn("[stellar] runtime initialization failed", error);
		}
	};

	const bindMomentComments = () => {
		document.querySelectorAll("[data-moment-comment]:not([data-ready])").forEach((button) => {
			button.dataset.ready = "true";
			button.addEventListener("click", (event) => {
				const comments = document.querySelector("#comments");
				if (!comments) return;
				event.preventDefault();
				comments.scrollIntoView({ behavior: "smooth", block: "start" });
				const quote = button.dataset.momentQuote;
				if (!quote) return;
				const quotedText = quote
					.split(/\r?\n/)
					.map((line) => `> ${line}`)
					.join("\n");
				const fill = () => {
					const textarea = comments.querySelector("textarea.atk-textarea, textarea");
					if (!textarea) return false;
					const text = `${quotedText}\n\n`;
					if (!textarea.value.includes(text)) {
						textarea.value = `${text}${textarea.value || ""}`;
						textarea.dispatchEvent(new Event("input", { bubbles: true }));
						textarea.dispatchEvent(new Event("change", { bubbles: true }));
					}
					textarea.focus();
					return true;
				};
				let tries = 0;
				const tryFill = () => {
					tries += 1;
					if (fill() || tries >= 12) return;
					window.setTimeout(tryFill, 350);
				};
				tryFill();
			});
		});
	};

	const schedulePostTransition = (callback, delay) => {
		const timer = window.setTimeout(() => {
			state.postTransitionTimers.delete(timer);
			callback();
		}, delay);
		state.postTransitionTimers.add(timer);
		return timer;
	};

	const clearPostTransitionVisuals = () => {
		state.postTransitionTimers.forEach((timer) => window.clearTimeout(timer));
		state.postTransitionTimers.clear();
		state.postTransitionActive = false;
		document.querySelectorAll(".post-card.is-opening").forEach((card) => {
			card.classList.remove("is-opening", "is-mobile-opening");
		});
		document.querySelectorAll(".post-dust-layer").forEach((layer) => layer.remove());
	};

	const removeKonamiSnow = () => {
		window.clearTimeout(state.snowTimer);
		state.snowTimer = null;
		state.snowLayer?.remove?.();
		state.snowLayer = null;
	};

	const startKonamiSnow = () => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const duration = Math.max(1000, Number(KONAMI_SNOW_CONFIG.durationMs || 10000));
		if (!state.snowLayer?.isConnected) {
			const layer = document.createElement("div");
			layer.className = "konami-snow-layer";
			layer.setAttribute("aria-hidden", "true");
			const mobile = isMobilePerformanceViewport();
			const count = Math.max(1, Number(mobile
				? KONAMI_SNOW_CONFIG.mobileFlakeCount ?? 24
				: KONAMI_SNOW_CONFIG.flakeCount ?? 48));
			const fragment = document.createDocumentFragment();
			for (let index = 0; index < count; index += 1) {
				const flake = document.createElement("span");
				flake.className = "konami-snowflake";
				flake.textContent = "❄";
				flake.style.setProperty("--snow-left", `${Math.random() * 100}%`);
				flake.style.setProperty("--snow-size", `${8 + Math.random() * 16}px`);
				flake.style.setProperty("--snow-duration", `${4.2 + Math.random() * 4.8}s`);
				flake.style.setProperty("--snow-delay", `${-Math.random() * 8}s`);
				flake.style.setProperty("--snow-drift", `${-9 + Math.random() * 18}vw`);
				flake.style.setProperty("--snow-opacity", String(0.46 + Math.random() * 0.5));
				fragment.appendChild(flake);
			}
			layer.appendChild(fragment);
			document.body.appendChild(layer);
			state.snowLayer = layer;
		}
		window.clearTimeout(state.snowTimer);
		state.snowTimer = window.setTimeout(removeKonamiSnow, duration);
	};

	const initKonamiSnow = () => {
		if (state.konamiBound || KONAMI_SNOW_CONFIG.enabled === false) return;
		state.konamiBound = true;
		const sequence = (Array.isArray(KONAMI_SNOW_CONFIG.sequence) && KONAMI_SNOW_CONFIG.sequence.length
			? KONAMI_SNOW_CONFIG.sequence
			: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"])
			.map((key) => String(key).length === 1 ? String(key).toLowerCase() : String(key));
		document.addEventListener("keydown", (event) => {
			if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
			if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) {
				state.konamiBuffer = [];
				return;
			}
			const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
			if (currentPath !== "/") {
				state.konamiBuffer = [];
				return;
			}
			const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
			state.konamiBuffer.push(key);
			state.konamiBuffer = state.konamiBuffer.slice(-sequence.length);
			if (state.konamiBuffer.length === sequence.length && sequence.every((expected, index) => expected === state.konamiBuffer[index])) {
				state.konamiBuffer = [];
				startKonamiSnow();
			}
		});
	};

	const cleanupPageRuntime = () => {
		removeKonamiSnow();
		state.konamiBuffer = [];
		state.pageAbortControllers.forEach((controller) => controller.abort());
		state.pageAbortControllers.clear();
		state.pageDisposers.forEach((dispose) => {
			try { dispose(); } catch (error) { /* page cleanup is best effort */ }
		});
		state.pageDisposers.clear();
		state.motionObserver?.disconnect?.();
		state.motionObserver = null;
		state.stellarDisposer?.();
		state.stellarDisposer = null;
		state.friendsContainer = null;
		state.friendActivityContainer = null;
		state.momentsContainer = null;
		state.latestCommentsContainer = null;
		state.welcomeNode = null;
		state.projectTimer && window.clearInterval(state.projectTimer);
		state.projectTimer = null;
		window.clearTimeout(state.planeTimer);
		state.planeTimer = null;
		state.tocObserver?.disconnect?.();
		state.tocObserver = null;
		state.planeObserver?.disconnect?.();
		state.planeObserver = null;
		state.artalkImageObserver?.disconnect?.();
		state.artalkImageObserver = null;
		if (state.tocScrollHandler) {
			window.removeEventListener("scroll", state.tocScrollHandler);
			window.removeEventListener("resize", state.tocScrollHandler);
			state.tocScrollHandler = null;
		}
		if (state.tocScrollFrame) {
			window.cancelAnimationFrame(state.tocScrollFrame);
			state.tocScrollFrame = null;
		}
		if (state.scrollHandler) {
			window.removeEventListener("scroll", state.scrollHandler);
			state.scrollHandler = null;
		}
		if (state.backToTopHandler) {
			window.removeEventListener("scroll", state.backToTopHandler);
			state.backToTopHandler = null;
		}
		state.artalkInstance?.destroy?.();
		state.artalkInstance = null;
		clearPostTransitionVisuals();
	};

	const createPostCardShatter = (card) => {
		const rect = card.getBoundingClientRect();
		if (rect.width < 40 || rect.height < 40) return null;
		clearPostTransitionVisuals();
		const mobileConfig = POST_TRANSITION_CONFIG.mobile || {};
		const isMobile = isMobilePerformanceViewport();
		if (isMobile && mobileConfig.enabled === false) return null;
		const particleMin = isMobile
			? Number(mobileConfig.particleMin ?? 24)
			: Number(POST_TRANSITION_CONFIG.desktopParticleMin ?? 72);
		const particleMax = isMobile
			? Number(mobileConfig.particleMax ?? 42)
			: Number(POST_TRANSITION_CONFIG.desktopParticleMax ?? 150);
		const navigationDelay = isMobile
			? Number(mobileConfig.navigationDelayMs ?? 70)
			: Number(POST_TRANSITION_CONFIG.desktopNavigationDelayMs ?? 180);
		const cleanupDelay = isMobile
			? Number(mobileConfig.cleanupDelayMs ?? 900)
			: Number(POST_TRANSITION_CONFIG.desktopCleanupDelayMs ?? 2200);
		const animationDuration = isMobile ? Number(mobileConfig.animationDurationMs ?? 260) : 1700;
		const layer = document.createElement("div");
		layer.className = "post-dust-layer";
		layer.classList.toggle("is-mobile-lite", isMobile);
		layer.style.setProperty("--post-dust-duration", `${animationDuration}ms`);

		const hazeEnabled = isMobile
			? mobileConfig.hazeEnabled === true
			: POST_TRANSITION_CONFIG.hazeEnabled !== false;
		if (hazeEnabled) {
			const haze = document.createElement("span");
			haze.className = "post-dust-haze";
			haze.style.left = `${rect.left + rect.width / 2}px`;
			haze.style.top = `${rect.top + rect.height / 2}px`;
			haze.style.width = `${rect.width * 1.12}px`;
			haze.style.height = `${rect.height * 1.12}px`;
			layer.appendChild(haze);
		}

		const fragment = document.createDocumentFragment();
		const safeParticleMin = Math.max(0, Math.min(particleMin, particleMax));
		const safeParticleMax = Math.max(safeParticleMin, particleMax);
		const densityDivisor = isMobile ? 9000 : 5600;
		const particleCount = Math.min(safeParticleMax, Math.max(safeParticleMin, Math.round((rect.width * rect.height) / densityDivisor)));
		for (let index = 0; index < particleCount; index += 1) {
			const particle = document.createElement("span");
			const size = 3 + Math.random() * (isMobile ? 6 : 10);
			const x = rect.left + Math.random() * rect.width;
			const y = rect.top + Math.random() * rect.height;
			const verticalProgress = (y - rect.top) / rect.height;
			const wave = Math.sin((x - rect.left) / rect.width * Math.PI * 2 + Math.random() * 0.9) * (isMobile ? 6 : 32);
			const delay = (1 - verticalProgress) * (isMobile ? 24 : 140) + Math.random() * (isMobile ? 28 : 120) + wave;
			const driftX = (Math.random() - 0.5) * (isMobile ? 72 : 95 + verticalProgress * 120);
			const driftY = isMobile ? -24 - Math.random() * 58 : -38 - Math.random() * 130 - verticalProgress * 70;
			particle.className = "post-dust-particle";
			particle.style.left = `${x}px`;
			particle.style.top = `${y}px`;
			particle.style.width = `${size}px`;
			particle.style.height = `${size}px`;
			particle.style.setProperty("--dx", `${driftX}px`);
			particle.style.setProperty("--dy", `${driftY}px`);
			particle.style.setProperty("--scale", `${1.2 + Math.random() * 1.8}`);
			particle.style.setProperty("--delay", `${Math.max(0, delay)}ms`);
			particle.style.setProperty("--alpha", `${0.58 + Math.random() * 0.28}`);
			fragment.appendChild(particle);
		}
		layer.appendChild(fragment);
		document.body.appendChild(layer);
		schedulePostTransition(() => layer.remove(), cleanupDelay);
		return { layer, isMobile, navigationDelay, cleanupDelay };
	};

	const navigateToPost = (url) => {
		const target = url.pathname + url.search + url.hash;
		if (window.__mete0rSwup?.navigate) {
			window.__mete0rSwup.navigate(target);
			return;
		}
		window.location.href = url.href;
	};

	const bindPostCardTransition = () => {
		if (state.postTransitionBound) return;
		state.postTransitionBound = true;
		window.addEventListener("click", (event) => {
			if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			const card = event.target.closest?.(".post-card");
			if (!card) return;
			const clickedLink = event.target.closest?.("a[href]");
			const postLink = clickedLink?.closest(".post-card") === card
				? clickedLink
				: card.querySelector(".post-card-cover[href], .post-title-link[href]");
			if (!postLink) return;
			const url = new URL(postLink.href, window.location.href);
			if (url.origin !== window.location.origin || !url.pathname.startsWith("/posts/")) return;
			if (isMobilePerformanceViewport() && POST_TRANSITION_CONFIG.mobile?.enabled === false) return;
			event.preventDefault();
			event.stopImmediatePropagation();
			if (state.postTransitionActive) return;
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				navigateToPost(url);
				return;
			}
			const transition = createPostCardShatter(card);
			state.postTransitionActive = true;
			if (transition) {
				card.classList.add("is-opening");
				card.classList.toggle("is-mobile-opening", transition.isMobile);
			}
			schedulePostTransition(() => {
				state.postTransitionActive = false;
				navigateToPost(url);
			}, transition?.navigationDelay ?? 0);
			schedulePostTransition(() => {
				state.postTransitionActive = false;
			}, transition?.cleanupDelay ?? 2000);
		}, { capture: true });
	};

	const bindFancybox = async () => {
		if (MARKDOWN_CONFIG.fancybox === false) return;
		const images = [...document.querySelectorAll(".article-body img, .moment-card img, .image-carousel img, .stellar-livephoto img, .comment-section .atk-comment-content img, .comment-section .atk-content img")]
			.filter((image) => {
				if (image.closest(".site-header,.social-dock,.footer-container,.site-footer,.brand,.friend-card,.no-lightbox")) return false;
				if (image.closest(".atk-avatar,.atk-gravatar,.atk-emoticons,.atk-plug-panel,.artalk-plane-decoration,.artalk-loading-mask")) return false;
				return image.currentSrc || image.src || image.dataset.fullSrc;
			});
		if (!images.length) return;
		const Fancybox = await ensureFancybox();
		images.forEach((image) => {
			if (image.closest("a[data-fancybox]")) return;
			const anchor = document.createElement("a");
			anchor.href = image.dataset.fullSrc || image.currentSrc || image.src;
			anchor.dataset.fancybox = image.closest(".comment-section") ? "artalk-gallery" : image.closest(".article-body") ? "article-gallery" : "runtime-gallery";
			anchor.dataset.caption = image.alt || "";
			anchor.className = "fancybox-image-link";
			image.replaceWith(anchor);
			anchor.appendChild(image);
		});
		Fancybox.bind("[data-fancybox]", {
			animated: true,
			dragToClose: true,
			compact: false,
		});
	};

	const bindArtalkImagePreview = () => {
		if (MARKDOWN_CONFIG.fancybox === false || state.artalkImagePreviewBound) return;
		state.artalkImagePreviewBound = true;
		document.addEventListener("click", async (event) => {
			const image = event.target.closest?.(".comment-section .atk-comment-content img, .comment-section .atk-content img");
			if (!image) return;
			if (image.closest(".atk-avatar,.atk-gravatar,.atk-emoticons,.atk-plug-panel,.artalk-plane-decoration,.artalk-loading-mask,.no-lightbox")) return;
			const src = image.dataset.fullSrc || image.currentSrc || image.src;
			if (!src) return;
			event.preventDefault();
			event.stopPropagation();
			const Fancybox = await ensureFancybox();
			Fancybox.show([{
				src,
				type: "image",
				caption: image.alt || "",
			}], {
				animated: true,
				dragToClose: true,
				compact: false,
			});
		}, true);
	};

	const closeContextMenu = () => {
		document.querySelector(".custom-context-menu")?.classList.remove("is-open");
	};

	const runContextAction = (action) => {
		if (action === "back") history.back();
		if (action === "forward") history.forward();
		if (action === "reload") window.location.reload();
		if (action === "home") window.location.href = "/";
		if (action === "print") window.print();
	};

	const initContextMenu = () => {
		if (CONTEXT_CONFIG.enabled === false || state.contextMenuBound) return;
		state.contextMenuBound = true;

		const menu = document.createElement("div");
		menu.className = "custom-context-menu";
		menu.innerHTML = `
			<div class="context-menu-nav">
				<button type="button" data-context-action="back" aria-label="返回">←</button>
				<button type="button" data-context-action="forward" aria-label="前进">→</button>
				<button type="button" data-context-action="reload" aria-label="刷新">↻</button>
				<button type="button" data-context-action="home" aria-label="首页">⌂</button>
			</div>
			<div class="context-menu-list"></div>
		`;
		document.body.appendChild(menu);

		const navButtons = [...menu.querySelectorAll(".context-menu-nav button")];
		const navConfig = {
			back: CONTEXT_CONFIG.showBack !== false,
			forward: CONTEXT_CONFIG.showForward !== false,
			reload: CONTEXT_CONFIG.showReload !== false,
			home: CONTEXT_CONFIG.showHome !== false,
		};
		navButtons.forEach((button) => {
			button.hidden = !navConfig[button.dataset.contextAction];
		});
		menu.querySelector(".context-menu-nav").hidden = navButtons.every((button) => button.hidden);

		menu.addEventListener("click", (event) => {
			const item = event.target.closest("[data-context-action], a[href]");
			if (!item) return;
			closeContextMenu();
			const action = item.dataset.contextAction;
			if (action) runContextAction(action);
		});
		document.addEventListener("click", closeContextMenu);
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") closeContextMenu();
		});
		document.addEventListener("contextmenu", (event) => {
			if (event.ctrlKey) {
				closeContextMenu();
				return;
			}
			if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
			event.preventDefault();
			try {
				if (localStorage.getItem("mete0r:context-menu-tip-shown") !== "true") {
					localStorage.setItem("mete0r:context-menu-tip-shown", "true");
					showToast("温馨提示：按住Ctrl再点击右键即可用浏览器自带右键菜单", 5000);
				}
			} catch (error) {
				showToast("温馨提示：按住Ctrl再点击右键即可用浏览器自带右键菜单", 5000);
			}
			const list = menu.querySelector(".context-menu-list");
			const hasComments = Boolean(document.querySelector("#comments"));
			const items = [
				CONTEXT_CONFIG.showTimeline !== false && { label: "文章时间线", icon: "▣", href: CONTEXT_CONFIG.timelineUrl || "/archive/" },
				CONTEXT_CONFIG.showCategories !== false && { label: "文章分大类", icon: "■", href: CONTEXT_CONFIG.categoriesUrl || "/categories/" },
				CONTEXT_CONFIG.showTags !== false && { label: "文章小标签", icon: "#", href: CONTEXT_CONFIG.tagsUrl || "/tags/" },
				CONTEXT_CONFIG.showComments !== false && hasComments && { label: "跳转评论区", icon: "☵", href: CONTEXT_CONFIG.commentsUrl || "#comments" },
				CONTEXT_CONFIG.showPrint !== false && { label: "打印整个页面", icon: "▤", action: "print" },
				CONTEXT_CONFIG.showStatement !== false && { label: "网站声明", icon: "●", href: CONTEXT_CONFIG.statementUrl || "/about/" },
			].filter(Boolean);
			list.innerHTML = items.map((item) => item.href
				? `<a href="${escapeHtml(item.href)}"><span>${escapeHtml(item.icon)}</span>${escapeHtml(item.label)}</a>`
				: `<button type="button" data-context-action="${escapeHtml(item.action)}"><span>${escapeHtml(item.icon)}</span>${escapeHtml(item.label)}</button>`
			).join("");

			menu.classList.add("is-open");
			const padding = 12;
			const rect = menu.getBoundingClientRect();
			const left = Math.max(padding, Math.min(event.clientX, window.innerWidth - rect.width - padding));
			const top = Math.max(padding, Math.min(event.clientY, window.innerHeight - rect.height - padding));
			menu.style.left = `${left}px`;
			menu.style.top = `${top}px`;
		});
	};

	const runSplash = () => {
		const splash = document.querySelector("[data-splash]");
		if (!splash || splash.dataset.ready === "true") return;

		const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
		const homeOnly = SPLASH_CONFIG.homeOnly !== false;
		const disableOnMobile = MOTION_CONFIG.mobileDisableSplash !== false && isMobilePerformanceViewport();
		if (SPLASH_CONFIG.enabled === false || disableOnMobile || (homeOnly && currentPath !== "/")) {
			splash.remove();
			document.documentElement.classList.remove("splash-active");
			return;
		}

		if ((SPLASH_CONFIG.frequency || "page") === "session") {
			try {
				if (sessionStorage.getItem("mete0r:splash-shown") === "true") {
					splash.remove();
					document.documentElement.classList.remove("splash-active");
					return;
				}
				sessionStorage.setItem("mete0r:splash-shown", "true");
			} catch (error) {
				// If sessionStorage is unavailable, the data-ready guard still prevents duplicate runs on the same page.
			}
		}

		const exitDelay = Number(SPLASH_CONFIG.exitDelayMs ?? 2600);
		const removeDelay = Number(SPLASH_CONFIG.removeDelayMs ?? 3400);
		const safeExitDelay = Number.isFinite(exitDelay) ? Math.max(0, exitDelay) : 2600;
		const safeRemoveDelay = Number.isFinite(removeDelay) ? Math.max(safeExitDelay + 100, removeDelay) : 3400;

		splash.dataset.ready = "true";
		document.documentElement.classList.add("splash-active");
		window.setTimeout(() => {
			if (!splash.isConnected) return;
			splash.classList.add("is-done");
			document.documentElement.classList.remove("splash-active");
		}, safeExitDelay);
		window.setTimeout(() => {
			if (splash.isConnected) {
				splash.remove();
				document.documentElement.classList.remove("splash-active");
			}
		}, safeRemoveDelay);
	};

	const init = () => {
		cleanupPageRuntime();
		setMobileDrawerOpen(false);
		initFriendsMenu();
		initHeaderSearch();
		initMusicPlayer();
		runSplash();
		renderFriends();
		renderFriendActivity();
		renderMoments();
		renderLatestComments();
		initCarousels();
		initProjectShowcase();
		initWelcome();
		initScrollProgress();
		initBackToTop();
		initToastNotices();
		initAutoDarkToast();
		initPolicyConsentToast();
		applyPolicyImageRejection();
		initSocialDockEasterEgg();
		initKonamiSnow();
		initCodeBlocks();
		initStellarImages();
		initMermaid();
		syncMobileToc();
		initTocBar();
		initMobileDrawer();
		initStellarMedia();
		initStellarRuntime();
		initSearchPage();
		initFriendApplyForm();
		initPageMotion();
		bindPostCardTransition();
		bindArticleSafeLinks();
		bindMomentComments();
		initArtalk();
		syncArtalkTheme();
		bindFancybox();
		bindArtalkImagePreview();
		initContextMenu();
	};

	document.addEventListener("DOMContentLoaded", init);
	window.addEventListener("astroblog:page-load", init);
	window.addEventListener("astroblog:cleanup-page", cleanupPageRuntime);
	window.addEventListener("astroblog:theme-change", syncArtalkTheme);
})();
