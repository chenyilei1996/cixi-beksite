/**
 * 共享工具层
 * - 导航壳渲染
 * - 考试倒计时
 * - localStorage 持久化（答题记录、错题本、学习进度）
 * - 通用 UI 函数
 */

/* ========== 导航壳（所有页面共用的顶部导航） ========== */
function renderNav(activePage) {
  const NAV_ITEMS = [
    { id: "home", label: "首页", href: "index.html" },
    { id: "knowledge", label: "知识库", href: "knowledge.html" },
    { id: "practice", label: "刷题", href: "practice.html" },
    { id: "exam", label: "模拟考试", href: "exam.html" },
    { id: "mistakes", label: "错题本", href: "mistakes.html" },
  ];
  const navHtml = `
    <nav class="nav">
      <div class="container nav-inner">
        <a href="index.html" class="brand">
          <div class="brand-logo">慈</div>
          <span>慈溪事业单位备考</span>
        </a>
        <div class="nav-links" id="navLinks">
          ${NAV_ITEMS.map(item =>
            `<a href="${item.href}" class="${activePage === item.id ? "active" : ""}">${item.label}</a>`
          ).join("")}
        </div>
        <button class="menu-btn" id="menuBtn" aria-label="菜单" style="display:none;">☰</button>
        <span class="nav-hint">综合知识 · 100 分</span>
      </div>
    </nav>
  `;
  document.body.insertAdjacentHTML("afterbegin", navHtml);

  // 移动端菜单
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  if (menuBtn) {
    menuBtn.style.display = "block";
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
}

/* ========== 考试倒计时 ========== */
function startCountdown(targetEl) {
  if (!targetEl) return;
  const examDate = new Date(EXAM_CONFIG.examDate.replace(" ", "T"));

  function tick() {
    const now = new Date();
    const diff = examDate - now;
    if (diff <= 0) {
      targetEl.innerHTML = `
        <div class="countdown-left">
          <div class="countdown-label">考试已到！</div>
          <div class="countdown-title">2026 年 12 月 26 日</div>
          <div class="countdown-sub">慈溪市事业单位公开招聘 · 综合知识笔试</div>
        </div>
      `;
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    targetEl.innerHTML = `
      <div class="countdown-left">
        <div class="countdown-label">距离笔试还有</div>
        <div class="countdown-title">2026 年 12 月 26 日 · 9:00</div>
        <div class="countdown-sub">慈溪市事业单位公开招聘 · 综合知识笔试</div>
      </div>
      <div class="countdown-right">
        <div class="cd-block"><div class="cd-num">${days}</div><div class="cd-unit">天</div></div>
        <div class="cd-block"><div class="cd-num">${String(hours).padStart(2, "0")}</div><div class="cd-unit">时</div></div>
        <div class="cd-block"><div class="cd-num">${String(minutes).padStart(2, "0")}</div><div class="cd-unit">分</div></div>
        <div class="cd-block"><div class="cd-num">${String(seconds).padStart(2, "0")}</div><div class="cd-unit">秒</div></div>
      </div>
    `;
  }
  tick();
  setInterval(tick, 1000);
}

/* ========== localStorage 持久化 ========== */
const Store = {
  KEY: "cixi_exam_data_v1",

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || this.default();
    } catch { return this.default(); }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  default() {
    return {
      // 每道题的答题记录：{ [qid]: { answer: idx|idx[], correct: bool, time: ts } }
      answers: {},
      // 错题本：{ [qid]: count }
      mistakes: {},
      // 各章节累计答题数和正确数：{ [section]: { total, correct } }
      chapter: {},
      // 模拟考试记录：[{ score, total, correct, time: ts }]
      exams: [],
      // 今日已练题目 id 列表（用于每日推荐去重）
      dailyDone: [],
      // 学习天数（连续打卡）
      streak: { lastDate: "", days: 0 },
    };
  },

  // 记录一次答题
  recordAnswer(qid, userAnswer, correct) {
    const data = this.load();
    const q = QUESTIONS.find(q => q.id === qid);
    if (!q) return;

    // 答过的题目不重复累计章节统计（避免刷新刷数据）
    const firstTime = !data.answers[qid];
    data.answers[qid] = { answer: userAnswer, correct, time: Date.now() };

    // 错题本
    if (!correct) {
      data.mistakes[qid] = (data.mistakes[qid] || 0) + 1;
    } else {
      // 答对后从错题本移除（可选策略：一次答对即移除）
      delete data.mistakes[qid];
    }

    // 章节统计
    if (firstTime) {
      const sec = q.section;
      if (!data.chapter[sec]) data.chapter[sec] = { total: 0, correct: 0 };
      data.chapter[sec].total++;
      if (correct) data.chapter[sec].correct++;
    }

    this.save(data);
    return data;
  },

  // 记录一次模拟考试
  recordExam(score, total, correct) {
    const data = this.load();
    data.exams.push({ score, total, correct, time: Date.now() });
    this.save(data);
    return data;
  },

  // 打卡
  checkIn() {
    const data = this.load();
    const today = new Date().toISOString().slice(0, 10);
    if (data.streak.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      data.streak.days = data.streak.lastDate === yesterday ? data.streak.days + 1 : 1;
      data.streak.lastDate = today;
      this.save(data);
    }
    return data.streak;
  },

  // 清除所有数据
  reset() {
    localStorage.removeItem(this.KEY);
  },
};

/* ========== 学习进度汇总 ========== */
function getProgress() {
  const data = Store.load();
  const answered = Object.keys(data.answers).length;
  const correct = Object.values(data.answers).filter(a => a.correct).length;
  const total = QUESTIONS.length;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const mistakeCount = Object.keys(data.mistakes).length;

  return {
    answered, correct, total, accuracy, mistakeCount,
    chapterStats: data.chapter,
    examCount: data.exams.length,
    bestScore: data.exams.length ? Math.max(...data.exams.map(e => e.score)) : 0,
    streak: data.streak.days,
  };
}

/* ========== 选项渲染辅助 ========== */
function renderOptions(q, state) {
  // state: { selected: idx|null, showResult: bool }
  const ans = state.selected;
  const correctIdx = q.type === "multi" ? q.answer : q.answer; // multi 是数组

  return q.options.map((opt, i) => {
    let cls = "option";
    let keyCls = "";
    if (state.showResult) {
      // 显示结果时的样式
      if (q.type === "multi") {
        const isUserAns = Array.isArray(ans) && ans.includes(i);
        const isCorrectAns = correctIdx.includes(i);
        if (isUserAns && isCorrectAns) { cls += " correct"; }
        else if (isUserAns && !isCorrectAns) { cls += " wrong"; }
        else if (!isUserAns && isCorrectAns) { cls += " correct"; }
      } else {
        if (i === correctIdx) cls += " correct";
        else if (i === ans) cls += " wrong";
      }
      cls += " disabled";
    } else if (ans !== null && ans !== undefined) {
      if (q.type === "multi") {
        if (ans.includes(i)) cls += " selected";
      } else {
        if (i === ans) cls += " selected";
      }
    }
    const letter = String.fromCharCode(65 + i);
    return `
      <div class="${cls}" data-idx="${i}">
        <div class="option-key">${letter}</div>
        <div class="option-text">${opt.replace(/^[A-D]\.\s*/, "")}</div>
      </div>
    `;
  }).join("");
}

/* ========== 判断对错辅助 ========== */
function checkAnswer(q, userAnswer) {
  if (q.type === "multi") {
    const correct = q.answer; // 数组
    const ua = userAnswer || [];
    if (ua.length !== correct.length) return false;
    return correct.every(c => ua.includes(c));
  } else {
    return userAnswer === q.answer;
  }
}

/* ========== 章节中文名 ========== */
function sectionLabel(key) {
  return { politics: "政治", economy: "经济", law: "法律", management: "管理与公文", culture: "人文科技" }[key] || key;
}

/* ========== 随机洗牌 ========== */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
