const header = document.querySelector("[data-header]");
const motionForced = new URLSearchParams(window.location.search).get("motion") === "force";
const reduceMotion = !motionForced && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.toggle("motion-forced", motionForced);
const progress = document.querySelector("[data-scroll-progress]");
const siteIndex = document.querySelector("[data-site-index]");
const indexOpen = document.querySelector("[data-index-open]");
const indexCloseTargets = [...document.querySelectorAll("[data-index-close], [data-index-link]")];
const evidenceTargets = [...document.querySelectorAll("[data-evidence-link]")];
const counters = [...document.querySelectorAll("[data-counter]")];
const tocLinks = [...document.querySelectorAll("[data-toc-link]")];
const articleMedia = [...document.querySelectorAll("[data-article-media]")];
const inkMask = document.querySelector("[data-ink-mask]");
const pointerCards = [
  ...document.querySelectorAll(
    ".proof-card, .article-card, .library-card, .wechat-article-card, .practice-card",
  ),
];
let lastFocusedBeforeIndex = null;
let transitionSource = null;
let mediaTicking = false;
let progressTicking = false;
let lastProgressY = -1;

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 10);
};

const updateProgress = () => {
  if (!progress) return;

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable <= 0 ? 0 : window.scrollY / scrollable;
  progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
  lastProgressY = window.scrollY;
};

const requestProgressUpdate = () => {
  if (!progress || progressTicking) return;
  progressTicking = true;
  requestAnimationFrame(() => {
    progressTicking = false;
    updateProgress();
  });
};

const syncProgress = () => {
  if (progress && window.scrollY !== lastProgressY) {
    updateProgress();
  }
  requestAnimationFrame(syncProgress);
};

updateHeader();
updateProgress();
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("scroll", requestProgressUpdate, { passive: true });
document.addEventListener("scroll", requestProgressUpdate, { passive: true, capture: true });
window.addEventListener("resize", updateProgress);
if (!reduceMotion && progress) {
  requestAnimationFrame(syncProgress);
}

const openIndex = () => {
  if (!siteIndex) return;
  lastFocusedBeforeIndex = document.activeElement;
  siteIndex.hidden = false;
  document.documentElement.classList.add("has-index-open");
  indexOpen?.setAttribute("aria-expanded", "true");
  (siteIndex.querySelector(".index-grid a") || siteIndex.querySelector(".index-close"))?.focus();
};

const closeIndex = ({ restoreFocus = true } = {}) => {
  if (!siteIndex || siteIndex.hidden) return;
  siteIndex.hidden = true;
  document.documentElement.classList.remove("has-index-open");
  indexOpen?.setAttribute("aria-expanded", "false");

  if (restoreFocus && lastFocusedBeforeIndex instanceof HTMLElement) {
    lastFocusedBeforeIndex.focus();
  }
};

indexOpen?.addEventListener("click", openIndex);
indexCloseTargets.forEach((target) => {
  target.addEventListener("click", (event) => {
    closeIndex({ restoreFocus: !event.currentTarget.matches("[data-index-link]") });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeIndex();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (siteIndex?.hidden === false) {
      closeIndex();
    } else {
      openIndex();
    }
  }

  if (event.key !== "Tab" || siteIndex?.hidden !== false) return;

  const focusRoot = siteIndex.querySelector(".index-panel") || siteIndex;
  const focusable = [
    ...focusRoot.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => element.offsetParent !== null);

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

const sections = [...document.querySelectorAll("main section[id]")];
const links = [...document.querySelectorAll(".nav-links a")];

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    links.forEach((link) => {
      link.toggleAttribute(
        "aria-current",
        link.getAttribute("href") === `#${visible.target.id}`,
      );
    });
  },
  { rootMargin: "-20% 0px -55% 0px", threshold: [0.2, 0.5, 0.8] },
);

sections.forEach((section) => observer.observe(section));

const revealTargets = [
  ...document.querySelectorAll(
    [
      ".quick-grid article",
      ".section-intro",
      ".row",
      ".proof-system > *",
      ".proof-card",
      ".practice-card",
      ".article-card",
      ".library-card",
      ".wechat-article-card",
      ".library-section-head",
      ".article-library-stats",
      ".qr-card",
      ".method > *",
      ".career > *",
      ".operating-system > *",
      ".os-grid article",
      ".beliefs > *",
      ".belief-grid article",
      ".about > *",
      ".contact > *",
      ".article-hero",
      ".longform-meta",
      ".longform-head",
      ".longform-cover",
      ".longform-toc",
      ".longform-trail .trail-grid > *",
      ".article-body > *",
      ".article-full-body > *",
      ".article-trail > *",
      ".trail-card",
    ].join(","),
  ),
];

const bindFilter = ({ buttonSelector, cardSelector, attr }) => {
  const buttons = [...document.querySelectorAll(buttonSelector)];
  const cards = [...document.querySelectorAll(cardSelector)];

  if (!buttons.length || !cards.length) return;

  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");

    button.addEventListener("click", () => {
      const value = button.dataset[attr];

      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });

      cards.forEach((card) => {
        const type = card.dataset[attr.replace("Filter", "Type")];
        card.classList.toggle("is-hidden", value !== "all" && type !== value);
      });
    });
  });
};

const getEvidenceKeys = (target) =>
  String(target.dataset.evidenceLink || "")
    .split(/\s+/)
    .map((key) => key.trim())
    .filter(Boolean);

const clearEvidenceFocus = () => {
  document.documentElement.classList.remove("has-evidence-focus");
  evidenceTargets.forEach((target) => target.classList.remove("is-linked"));
};

const setEvidenceFocus = (source) => {
  const keys = getEvidenceKeys(source);
  if (!keys.length) return;

  document.documentElement.classList.add("has-evidence-focus");
  evidenceTargets.forEach((target) => {
    const targetKeys = getEvidenceKeys(target);
    target.classList.toggle("is-linked", targetKeys.some((key) => keys.includes(key)));
  });
};

evidenceTargets.forEach((target) => {
  target.addEventListener("pointerenter", () => setEvidenceFocus(target));
  target.addEventListener("focusin", () => setEvidenceFocus(target));
  target.addEventListener("pointerleave", clearEvidenceFocus);
  target.addEventListener("focusout", clearEvidenceFocus);
});

bindFilter({
  buttonSelector: "[data-proof-filter]",
  cardSelector: "[data-proof-type]",
  attr: "proofFilter",
});

bindFilter({
  buttonSelector: "[data-article-filter]",
  cardSelector: "[data-article-type]",
  attr: "articleFilter",
});

const animateCounter = (counter) => {
  const target = Number(counter.dataset.count || 0);
  const suffix = counter.dataset.suffix || "";
  if (!Number.isFinite(target) || target <= 0) return;

  if (reduceMotion) {
    counter.textContent = `${target}${suffix}`;
    return;
  }

  const start = performance.now();
  const duration = 820;

  const tick = (now) => {
    const progressRatio = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progressRatio, 3);
    counter.textContent = `${Math.round(target * eased)}${suffix}`;

    if (progressRatio < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.counted === "true") return;
      entry.target.dataset.counted = "true";
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.65 },
);

counters.forEach((counter) => counterObserver.observe(counter));

const clearTransitionSource = () => {
  transitionSource?.classList.remove("is-transition-source");
  transitionSource = null;
};

const markTransitionSource = (link) => {
  const source = link?.closest(".article-card, .library-card, .proof-card");
  if (!source) return;

  clearTransitionSource();
  transitionSource = source;
  transitionSource.classList.add("is-transition-source");
};

document.addEventListener("pointerdown", (event) => {
  markTransitionSource(event.target.closest("a[href]"));
});

if (tocLinks.length) {
  const tocTargets = tocLinks
    .map((link) => {
      const hash = link.getAttribute("href");
      return hash?.startsWith("#") ? document.querySelector(hash) : null;
    })
    .filter(Boolean);

  const setActiveToc = (id) => {
    tocLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
    });
  };

  const tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top)[0];

      if (visible?.target?.id) {
        setActiveToc(visible.target.id);
      }
    },
    { rootMargin: "-18% 0px -68% 0px", threshold: [0.01, 0.2, 0.6] },
  );

  tocTargets.forEach((target) => tocObserver.observe(target));
  if (tocTargets[0]?.id) {
    setActiveToc(tocTargets[0].id);
  }
}

if (!reduceMotion && pointerCards.length) {
  pointerCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--pointer-x", `${Math.min(Math.max(x, 0), 100)}%`);
      card.style.setProperty("--pointer-y", `${Math.min(Math.max(y, 0), 100)}%`);
    });
  });
}

const updateArticleMedia = () => {
  mediaTicking = false;
  if (!articleMedia.length) return;

  articleMedia.forEach((frame) => {
    const image = frame.querySelector("img");
    if (!image) return;

    const rect = frame.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const progressRatio = (rect.top + rect.height / 2 - viewport / 2) / viewport;
    const offset = Math.max(Math.min(progressRatio * -18, 18), -18);
    image.style.setProperty("--media-y", `${offset}px`);
  });
};

const requestMediaUpdate = () => {
  if (mediaTicking || reduceMotion || !articleMedia.length) return;
  mediaTicking = true;
  requestAnimationFrame(updateArticleMedia);
};

if (!reduceMotion && articleMedia.length) {
  updateArticleMedia();
  window.addEventListener("scroll", requestMediaUpdate, { passive: true });
  window.addEventListener("resize", requestMediaUpdate);
}

const setupInkMask = () => {
  if (
    !inkMask ||
    reduceMotion ||
    !window.matchMedia("(hover: hover)").matches ||
    window.matchMedia("(max-width: 700px)").matches
  ) {
    inkMask?.setAttribute("data-motion-ready", "reduced");
    return;
  }

  const hero = inkMask.closest(".hero");
  const context = inkMask.getContext("2d");
  if (!hero || !context) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const stamps = [];
  const maxStamps = 140;
  const lifetime = 560;
  const step = 14;
  let width = 0;
  let height = 0;
  let lastPoint = null;
  let running = false;

  const maskColor =
    getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#fbfbf8";

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    inkMask.width = Math.round(width * dpr);
    inkMask.height = Math.round(height * dpr);
    inkMask.style.width = `${width}px`;
    inkMask.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.fillStyle = maskColor;
    context.fillRect(0, 0, width, height);
  };

  const addStamp = (x, y) => {
    if (stamps.length >= maxStamps) stamps.shift();
    stamps.push({
      x,
      y,
      born: performance.now(),
      radius: 92 + Math.random() * 52,
    });
  };

  const stampBetween = (x, y) => {
    if (!lastPoint) {
      addStamp(x, y);
      lastPoint = { x, y };
      return;
    }

    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    for (let i = 1; i <= count; i += 1) {
      addStamp(lastPoint.x + (dx * i) / count, lastPoint.y + (dy * i) / count);
    }
    lastPoint = { x, y };
  };

  const carve = (stamp, progressRatio) => {
    const ease = 1 - Math.pow(1 - progressRatio, 3);
    const radius = 10 + (stamp.radius - 10) * ease;
    const alpha = 1 - progressRatio * progressRatio;
    const gradient = context.createRadialGradient(stamp.x, stamp.y, radius * 0.18, stamp.x, stamp.y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${0.95 * alpha})`);
    gradient.addColorStop(0.58, `rgba(0, 0, 0, ${0.82 * alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(stamp.x, stamp.y, radius, 0, Math.PI * 2);
    context.fill();
  };

  const loop = () => {
    const now = performance.now();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = maskColor;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "destination-out";

    for (let i = stamps.length - 1; i >= 0; i -= 1) {
      const progressRatio = (now - stamps[i].born) / lifetime;
      if (progressRatio >= 1) {
        stamps.splice(i, 1);
      } else {
        carve(stamps[i], progressRatio);
      }
    }

    if (stamps.length) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  };

  const handlePointer = (event) => {
    const rect = hero.getBoundingClientRect();
    stampBetween(event.clientX - rect.left, event.clientY - rect.top);
    start();
  };

  resize();
  window.addEventListener("resize", resize);
  hero.addEventListener("pointerenter", handlePointer);
  hero.addEventListener("pointermove", handlePointer);
  hero.addEventListener("pointerleave", () => {
    lastPoint = null;
  });
};

setupInkMask();

const setupTypewriter = () => {
  if (reduceMotion || window.matchMedia("(max-width: 700px)").matches) return;

  const targets = [
    ...document.querySelectorAll(
      [
        ".hero-summary",
        ".proof-card h3",
        ".article-card h3",
        ".library-card h2",
        ".wechat-card-body h3",
        ".longform-head h1",
      ].join(","),
    ),
  ].filter((target) => !target.closest("[hidden]"));

  if (!targets.length) return;

  const prepare = (target) => {
    if (target.dataset.typePrepared === "true") return;
    const text = target.textContent.trim();
    if (!text) return;

    target.dataset.typePrepared = "true";
    target.setAttribute("aria-label", text);
    target.textContent = "";
    target.classList.add("typewrite-ready");

    [...text].forEach((char) => {
      const span = document.createElement("span");
      span.className = "tw-char";
      span.textContent = char;
      target.appendChild(span);
    });

    const caret = document.createElement("span");
    caret.className = "tw-caret";
    caret.setAttribute("aria-hidden", "true");
    target.appendChild(caret);
  };

  const showNow = (target) => {
    target.querySelectorAll(".tw-char").forEach((char) => char.classList.add("is-typed"));
    target.classList.add("is-type-done");
  };

  const type = (target) => {
    if (target.dataset.typed === "true") return;
    target.dataset.typed = "true";
    const chars = [...target.querySelectorAll(".tw-char")];
    const delay = target.matches(".hero-summary") ? 18 : 28;
    chars.forEach((char, index) => {
      window.setTimeout(() => char.classList.add("is-typed"), index * delay);
    });
    window.setTimeout(() => target.classList.add("is-type-done"), chars.length * delay + 180);
  };

  targets.forEach(prepare);

  const typeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          type(entry.target);
          typeObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -18% 0px", threshold: 0.18 },
  );

  targets.forEach((target) => typeObserver.observe(target));

  window.addEventListener(
    "scroll",
    () => {
      const cutLine = window.innerHeight * 0.28;
      targets.forEach((target) => {
        if (target.dataset.typed === "true") return;
        if (target.getBoundingClientRect().bottom < cutLine) {
          target.dataset.typed = "true";
          showNow(target);
          typeObserver.unobserve(target);
        }
      });
    },
    { passive: true },
  );
};

setupTypewriter();

revealTargets.forEach((target, index) => {
  target.classList.add("reveal");
  target.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 45}ms`);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
);

if (reduceMotion) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  revealTargets.forEach((target) => revealObserver.observe(target));
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  markTransitionSource(link);

  const href = link.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;

  const targetUrl = new URL(href, window.location.href);
  const isSamePage =
    targetUrl.origin === window.location.origin &&
    targetUrl.pathname === window.location.pathname &&
    targetUrl.hash;

  if (isSamePage) {
    const target = document.querySelector(targetUrl.hash);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    history.pushState(null, "", targetUrl.hash);
    if (link.classList.contains("skip-link") || link.matches("[data-index-link]")) {
      target.focus({ preventScroll: true });
    }
    return;
  }

  const isSameSite =
    targetUrl.origin === window.location.origin &&
    !link.target &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;

  if (!isSameSite || reduceMotion) return;

  event.preventDefault();
  document.documentElement.classList.add("is-leaving");
  window.setTimeout(() => {
    window.location.href = targetUrl.href;
  }, 180);
});
