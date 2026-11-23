(() => {
  "use strict";
  const workouts = {
    a: {
      title: "Pass A",
      subtitle: "Ben, rygg, bröst och bål",
      exercises: [
        [
          "Goblet squats",
          4,
          "8–12",
          "16 kg",
          "Håll kettlebellen framför bröstet och gör knäböj.",
        ],
        [
          "Enarmsrodd",
          3,
          "10–12 per arm",
          "16 kg",
          "Stöd ena handen mot en stabil möbel. Dra vikten mot höften.",
        ],
        [
          "Floor press",
          3,
          "8–12 per arm",
          "12–16 kg",
          "Ligg på golvet och pressa kettlebellen uppåt.",
        ],
        [
          "Rumänska marklyft",
          3,
          "10–15",
          "16 kg",
          "Skjut höften bakåt, håll ryggen neutral och res dig.",
        ],
        [
          "Planka",
          3,
          "30–45 sek",
          "Kroppsvikt",
          "Spänn mage och rumpa, håll kroppen rak.",
        ],
      ],
    },
    b: {
      title: "Pass B",
      subtitle: "Ben, axlar, rygg och bröst",
      exercises: [
        [
          "Reverse lunges",
          3,
          "8–12 per ben",
          "12 kg",
          "Ta ett steg bakåt, böj knäna och res dig.",
        ],
        [
          "Shoulder press",
          3,
          "6–10 per arm",
          "12 kg",
          "Pressa kettlebellen från axeln rakt upp.",
        ],
        [
          "Enarmsrodd",
          3,
          "10–12 per arm",
          "16 kg",
          "Dra vikten mot höften med stabil rygg.",
        ],
        [
          "Enbens rumänska marklyft",
          3,
          "8–12 per ben",
          "12–16 kg",
          "Fäll i höften med ett ben bakåt och håll balansen.",
        ],
        [
          "Armhävningar",
          3,
          "8–15",
          "Kroppsvikt",
          "Sänk bröstet kontrollerat och pressa upp.",
        ],
      ],
    },
  };
  const $ = (id) => document.getElementById(id),
    storageKey = "kettlebell-home-v1";
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {}
  let active = saved.active === "b" ? "b" : "a",
    checked = { a: saved.checked?.a || {}, b: saved.checked?.b || {} },
    auto = saved.auto !== false,
    preset = [60, 90, 120].includes(saved.preset) ? saved.preset : 90,
    remaining = preset,
    deadline = null,
    interval = null,
    running = false;
  function save() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ active, checked, auto, preset }),
      );
    } catch {}
  }
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2300);
  }
  function render() {
    const w = workouts[active];
    $("workout-title").textContent = w.title;
    $("workout-subtitle").textContent = w.subtitle;
    for (const key of ["a", "b"]) {
      $("tab-" + key).classList.toggle("active", key === active);
      $("tab-" + key).setAttribute("aria-pressed", String(key === active));
    }
    $("autostart").checked = auto;
    const list = $("exercise-list");
    list.replaceChildren();
    w.exercises.forEach((ex, i) => {
      const [name, sets, reps, weight, tip] = ex;
      const card = document.createElement("article");
      card.className = "exercise";
      const top = document.createElement("div");
      top.className = "ex-top";
      const left = document.createElement("div");
      const n = document.createElement("div");
      n.className = "number";
      n.textContent = `ÖVNING ${i + 1}`;
      const h = document.createElement("h3");
      h.textContent = name;
      const ins = document.createElement("p");
      ins.className = "instruction";
      ins.textContent = tip;
      left.append(n, h, ins);
      const wt = document.createElement("div");
      wt.className = "weight";
      wt.textContent = weight;
      top.append(left, wt);
      const rp = document.createElement("div");
      rp.className = "reps";
      rp.textContent = `${sets} set × ${reps}`;
      const buttons = document.createElement("div");
      buttons.className = "sets";
      for (let s = 0; s < sets; s++) {
        const btn = document.createElement("button");
        btn.className = "set" + (checked[active][`${i}-${s}`] ? " done" : "");
        btn.textContent =
          (checked[active][`${i}-${s}`] ? "✓ " : "") + `Set ${s + 1}`;
        btn.setAttribute(
          "aria-pressed",
          String(!!checked[active][`${i}-${s}`]),
        );
        btn.addEventListener("click", () => {
          const k = `${i}-${s}`,
            was = !!checked[active][k];
          checked[active][k] = !was;
          save();
          render();
          if (!was && auto) startTimer(true);
          if (
            !was &&
            Object.values(checked[active]).filter(Boolean).length ===
              totalSets()
          )
            toast("Snyggt jobbat! Passet är klart 🎉");
        });
        buttons.append(btn);
      }
      card.append(top, rp, buttons);
      list.append(card);
    });
    updateProgress();
  }
  function totalSets() {
    return workouts[active].exercises.reduce((sum, ex) => sum + ex[1], 0);
  }
  function updateProgress() {
    const done = Object.values(checked[active]).filter(Boolean).length,
      total = totalSets(),
      percentage = Math.round((done / total) * 100);
    $("progress-fill").style.width = percentage + "%";
    $("progress-text").textContent = `${done} av ${total} set klara`;
    $("progress-percent").textContent = percentage + " %";
    $("progress-track").setAttribute("aria-valuenow", String(percentage));
  }
  function fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
  function renderTimer() {
    $("timer-display").textContent = fmt(remaining);
    $("timer-toggle").textContent = running
      ? "Pausa"
      : remaining === 0
        ? "Starta"
        : "Starta";
    $("timer-status").textContent = running
      ? "· pågår"
      : remaining === 0
        ? "· klar"
        : "";
    document
      .querySelectorAll(".preset")
      .forEach((b) =>
        b.classList.toggle("active", Number(b.dataset.sec) === preset),
      );
  }
  function ping() {
    try {
      if (navigator.vibrate) navigator.vibrate([150, 90, 150]);
    } catch {}
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ac.currentTime);
      gain.gain.setValueAtTime(0.09, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.27);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.28);
      osc.onended = () => ac.close();
    } catch {}
  }
  function stopTicker() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }
  function tick() {
    if (!running) return;
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining === 0) {
      running = false;
      stopTicker();
      ping();
      toast("Pausen är slut! Dags för nästa set.");
    }
    renderTimer();
  }
  function startTimer(reset) {
    if (reset || remaining === 0) remaining = preset;
    running = true;
    deadline = Date.now() + remaining * 1000;
    stopTicker();
    interval = setInterval(tick, 200);
    renderTimer();
  }
  function pauseTimer() {
    if (!running) return;
    tick();
    running = false;
    stopTicker();
    renderTimer();
  }
  $("timer-toggle").addEventListener("click", () =>
    running ? pauseTimer() : startTimer(false),
  );
  $("timer-reset").addEventListener("click", () => {
    running = false;
    stopTicker();
    remaining = preset;
    renderTimer();
  });
  document.querySelectorAll(".preset").forEach((b) =>
    b.addEventListener("click", () => {
      preset = Number(b.dataset.sec);
      save();
      running = false;
      stopTicker();
      remaining = preset;
      renderTimer();
    }),
  );
  $("autostart").addEventListener("change", (e) => {
    auto = e.target.checked;
    save();
  });
  for (const key of ["a", "b"])
    $("tab-" + key).addEventListener("click", () => {
      active = key;
      save();
      render();
    });
  $("reset-workout").addEventListener("click", () => {
    if (confirm(`Nollställa alla avbockade set i ${workouts[active].title}?`)) {
      checked[active] = {};
      save();
      render();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  render();
  renderTimer();
})();
