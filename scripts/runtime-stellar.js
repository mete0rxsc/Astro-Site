const safeUrl = (value, fallback = "#") => {
	try {
		const url = new URL(String(value || ""), window.location.origin);
		return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : fallback;
	} catch {
		return fallback;
	}
};

const asItems = (data) => Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];

export function initStellarRuntime(root, config = {}, helpers = {}) {
	const lifecycle = new AbortController();
	const { signal } = lifecycle;
	const aborters = new Set();
	const swipers = [];
	const escapeHtml = helpers.escapeHtml || ((value) => String(value ?? ""));
	const maxItems = Math.max(1, Number(config.maxItems || 100));
	const timeoutMs = Math.max(1000, Number(config.requestTimeoutMs || 8000));

	const request = async (url, options = {}) => {
		const controller = new AbortController();
		aborters.add(controller);
		const onAbort = () => controller.abort();
		signal.addEventListener("abort", onAbort, { once: true });
		const timer = window.setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await fetch(url, { ...options, signal: controller.signal });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return response;
		} finally {
			window.clearTimeout(timer);
			aborters.delete(controller);
			signal.removeEventListener("abort", onAbort);
		}
	};

	root.querySelectorAll(".stellar-tabs:not([data-runtime-ready])").forEach((tabs) => {
		tabs.dataset.runtimeReady = "true";
		const triggers = [...tabs.querySelectorAll(".nav-tabs [data-tab-target], .nav-tabs a[href^='#']")];
		const panes = [...tabs.querySelectorAll(".tab-pane")];
		const activate = (index) => {
			triggers.forEach((trigger, itemIndex) => {
				trigger.classList.toggle("active", itemIndex === index);
				trigger.parentElement?.classList.toggle("active", itemIndex === index);
				trigger.setAttribute("aria-selected", String(itemIndex === index));
			});
			panes.forEach((pane, itemIndex) => pane.classList.toggle("active", itemIndex === index));
		};
		triggers.forEach((trigger, index) => trigger.addEventListener("click", (event) => {
			event.preventDefault();
			activate(index);
		}, { signal }));
		activate(Math.max(0, Math.min(triggers.length - 1, Number(tabs.dataset.active || 1) - 1)));
	});

	const initSwipers = async () => {
		const nodes = [...root.querySelectorAll(".stellar-swiper:not([data-runtime-ready])")];
		if (!nodes.length) return;
		const assets = config.assets || {};
		helpers.loadStyle?.(assets.swiperCss || "https://cdn.jsdelivr.net/npm/swiper@10.3.1/swiper-bundle.min.css");
		if (!window.Swiper) await helpers.loadScript?.(assets.swiperJs || "https://cdn.jsdelivr.net/npm/swiper@10.3.1/swiper-bundle.min.js");
		nodes.forEach((node) => {
			node.dataset.runtimeReady = "true";
			const wrapper = node.querySelector(".swiper-wrapper") || node;
			[...wrapper.children].forEach((child) => {
				if (!child.classList.contains("swiper-slide")) child.classList.add("swiper-slide");
			});
			if (!window.Swiper) return;
			const instance = new window.Swiper(node, {
				effect: node.dataset.effect || "slide",
				grabCursor: true,
				loop: wrapper.children.length > 1,
				pagination: { el: node.querySelector(".swiper-pagination"), clickable: true },
				navigation: { nextEl: node.querySelector(".swiper-button-next"), prevEl: node.querySelector(".swiper-button-prev") },
			});
			swipers.push(instance);
		});
	};

	const renderDataService = (node, name, items) => {
		const target = node.querySelector(".grid-box") || node;
		const fallback = node.dataset.fallback || "";
		const group = node.dataset.group || "";
		const filtered = group ? items.filter((item) => item.group === group || item.category === group || (item.labels || []).some((label) => (label.name || label) === group)) : items;
		const html = filtered.slice(0, maxItems).map((item) => {
			const href = safeUrl(item.html_url || item.url);
			const title = escapeHtml(item.title || item.name || item.login || "未命名站点");
			const avatar = safeUrl(item.icon || item.avatar || item.avatar_url || item.snapshot || fallback, "");
			const cover = safeUrl(item.cover || item.snapshot || item.screenshot || avatar, "");
			if (name === "sites" || name === "albums" || name === "posters") return `
				<div class="grid-cell stellar-site-card"><a href="${href}" target="_blank" rel="noopener noreferrer">
					${cover ? `<img src="${cover}" alt="" loading="lazy" decoding="async">` : ""}
					<div><strong>${title}</strong><span>${escapeHtml(item.description || item.url || "")}</span></div>
				</a></div>`;
			const posts = node.dataset.posts === "true" && Array.isArray(item.posts) ? `<div class="stellar-friend-posts">${item.posts.slice(0, 3).map((post) => `<a href="${safeUrl(post.link || post.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.title || "文章")}</a>`).join("")}</div>` : "";
			return `<div class="grid-cell stellar-user-card"><a href="${href}" target="_blank" rel="noopener noreferrer">${avatar ? `<img src="${avatar}" alt="" loading="lazy" decoding="async">` : ""}<strong>${title}</strong></a>${posts}</div>`;
		}).join("");
		target.innerHTML = html || `<p class="stellar-service-state">没有可展示的数据。</p>`;
	};

	root.querySelectorAll(".stellar-data-service[data-api]:not([data-runtime-ready])").forEach(async (node) => {
		node.dataset.runtimeReady = "true";
		const name = node.dataset.stellarService || "friends";
		try {
			const response = await request(node.dataset.api, { headers: { Accept: "application/json" } });
			renderDataService(node, name, asItems(await response.json()));
		} catch (error) {
			if (error?.name !== "AbortError" && node.isConnected) {
				const target = node.querySelector(".grid-box") || node;
				target.innerHTML = `<p class="stellar-service-state">远程数据暂时不可用。</p>`;
			}
		}
	});

	root.querySelectorAll(".stellar-md[data-source]:not([data-runtime-ready])").forEach(async (node) => {
		node.dataset.runtimeReady = "true";
		try {
			const [response, marked] = await Promise.all([request(node.dataset.source), helpers.ensureMarked?.()]);
			const source = await response.text();
			node.innerHTML = marked?.parse ? marked.parse(source) : `<pre>${escapeHtml(source)}</pre>`;
		} catch (error) {
			if (error?.name !== "AbortError" && node.isConnected) node.textContent = "远程 Markdown 暂时不可用。";
		}
	});

	root.querySelectorAll(".stellar-timeline[data-api]:not([data-runtime-ready])").forEach(async (node) => {
		node.dataset.runtimeReady = "true";
		try {
			const data = await (await request(node.dataset.api, { headers: { Accept: "application/json" } })).json();
			const items = asItems(data).slice(0, maxItems);
			node.insertAdjacentHTML("beforeend", items.map((item) => `<div class="timenode"><div class="header"><span>${escapeHtml(item.title || item.name || item.date || "Timeline")}</span></div><div class="body">${escapeHtml(item.description || item.content || "")}</div></div>`).join(""));
		} catch { /* authored static timeline remains visible */ }
	});

	root.querySelectorAll(".stellar-chat a[data-chat-link]:not([data-runtime-ready])").forEach(async (link) => {
		link.dataset.runtimeReady = "true";
		const service = config.services?.chatLink;
		if (service?.enabled === false || !service?.endpoint) return;
		try {
			const separator = service.endpoint.includes("?") ? "&" : "?";
			const data = await (await request(`${service.endpoint}${separator}url=${encodeURIComponent(link.href)}`)).json();
			link.textContent = data.title || data.name || link.textContent;
			if (data.desc || data.description) link.setAttribute("title", data.desc || data.description);
		} catch { /* original chat link remains usable */ }
	});

	root.querySelectorAll(".stellar-inline-toc:not([data-runtime-ready])").forEach((node) => {
		node.dataset.runtimeReady = "true";
		const headings = [...root.querySelectorAll("h2[id], h3[id], h4[id]")];
		node.innerHTML = headings.length ? `<ul>${headings.map((heading) => `<li data-depth="${heading.tagName.slice(1)}"><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.textContent)}</a></li>`).join("")}</ul>` : "";
	});

	const calculateAverage = (rating = {}) => {
		const entries = Object.entries(rating).filter(([key]) => !Number.isNaN(Number(key)));
		const count = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
		const total = entries.reduce((sum, [key, value]) => sum + Number(key) * Number(value || 0), 0);
		return { count, average: count ? (total / count).toFixed(1) : "0.0" };
	};

	root.querySelectorAll(".ds-rating:not([data-runtime-ready])").forEach((node) => {
		node.dataset.runtimeReady = "true";
		const endpoint = node.dataset.api || config.services?.rating?.endpoint;
		const id = node.dataset.id;
		if (!endpoint || !id || config.services?.rating?.enabled === false) return;
		const load = async () => {
			try {
				const data = await (await request(`${endpoint}/info?id=${encodeURIComponent(id)}`)).json();
				const value = calculateAverage(data.rating || {});
				node.querySelector(".avg").textContent = `(${value.average})`;
				const count = node.querySelector(".count");
				if (count) count.textContent = String(value.count);
				node.querySelectorAll(".star").forEach((star) => star.classList.toggle("preview", Number(star.dataset.value) <= Math.floor(Number(value.average))));
			} catch { /* static fallback remains visible */ }
		};
		node.querySelectorAll(".star").forEach((star) => star.addEventListener("click", async () => {
			const key = `stellar:rating:${id}`;
			if (localStorage.getItem(key)) return;
			localStorage.setItem(key, star.dataset.value);
			node.classList.add("rated");
			try {
				await request(`${endpoint}/update?id=${encodeURIComponent(id)}&value=${encodeURIComponent(star.dataset.value)}`, { method: "POST" });
				load();
			} catch { localStorage.removeItem(key); node.classList.remove("rated"); }
		}, { signal }));
		if (localStorage.getItem(`stellar:rating:${id}`)) node.classList.add("rated");
		load();
	});

	root.querySelectorAll(".ds-vote:not([data-runtime-ready])").forEach((node) => {
		node.dataset.runtimeReady = "true";
		const endpoint = node.dataset.api || config.services?.vote?.endpoint;
		const id = node.dataset.id;
		if (!endpoint || !id || config.services?.vote?.enabled === false) return;
		const key = `stellar:vote:${id}`;
		const mark = (value) => {
			node.classList.toggle("voted", Boolean(value));
			node.querySelector(".vote-up")?.classList.toggle("active", value === "up");
			node.querySelector(".vote-down")?.classList.toggle("active", value === "down");
		};
		const load = async () => {
			try {
				const data = await (await request(`${endpoint}/info?id=${encodeURIComponent(id)}`)).json();
				node.querySelector(".up").textContent = String(data.votes?.up ?? 0);
				node.querySelector(".down").textContent = String(data.votes?.down ?? 0);
			} catch { /* static fallback remains visible */ }
		};
		["up", "down"].forEach((value) => node.querySelector(`.vote-${value}`)?.addEventListener("click", async () => {
			if (localStorage.getItem(key)) return;
			localStorage.setItem(key, value);
			mark(value);
			try { await request(`${endpoint}/update?id=${encodeURIComponent(id)}&value=${value}`, { method: "POST" }); load(); }
			catch { localStorage.removeItem(key); mark(""); }
		}, { signal }));
		mark(localStorage.getItem(key));
		load();
	});

	root.querySelectorAll(".stellar-link-card a[data-site-info]:not([data-runtime-ready])").forEach(async (link) => {
		link.dataset.runtimeReady = "true";
		const service = config.services?.siteInfo;
		if (service?.enabled === false || !service?.endpoint) return;
		try {
			const api = service.endpoint.replace("{href}", encodeURIComponent(link.href));
			const data = await (await request(api)).json();
			if (data.title) link.querySelector(".title").textContent = data.title;
			if (data.desc) link.querySelector(".desc").textContent = data.desc;
			if (data.icon && !link.querySelector("img")) link.insertAdjacentHTML("afterbegin", `<img src="${safeUrl(data.icon, "")}" alt="" loading="lazy">`);
		} catch { /* original link remains usable */ }
	});

	initSwipers().catch(() => {});
	return () => {
		lifecycle.abort();
		aborters.forEach((controller) => controller.abort());
		aborters.clear();
		swipers.forEach((swiper) => swiper.destroy?.(true, true));
	};
}
