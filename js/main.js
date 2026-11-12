(function () {
  "use strict";

  const body = document.body;
  const html = document.documentElement;
  const header = document.getElementById("header");
  const main = document.getElementById("main");
  const footer = document.querySelector(".footer");
  const menu = document.getElementById("site-menu");
  const menuBtn = document.querySelector(".menu-btn");
  const soundBtn = document.querySelector(".sound-toggle");
  const progressBar = document.querySelector(".page-progress__bar");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const yearEls = document.querySelectorAll("[data-year]");
  const nextServiceEl = document.querySelector("[data-next-service]");

  let menuOpen = false;
  let soundOn = false;
  let ambient = null;
  let revealObserver = null;
  let scrollQueued = false;

  yearEls.forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  if (nextServiceEl) {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    next.setDate(now.getDate() + daysUntilSunday);
    if (daysUntilSunday === 0 && now >= next) {
      next.setDate(next.getDate() + 7);
    }
    nextServiceEl.textContent = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(next);
  }

  function initReveals() {
    if (revealObserver) {
      return;
    }
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) {
      return;
    }
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (item) {
        item.classList.add("is-inview");
      });
      return;
    }
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach(function (item) {
      revealObserver.observe(item);
    });
  }

  function setMenu(open, options) {
    const opts = options || {};
    if (open === menuOpen) {
      return;
    }
    menuOpen = open;
    body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    const label = menuBtn.querySelector(".sr-only");
    if (label) {
      label.textContent = open ? "Close menu" : "Open menu";
    }
    if (open) {
      menu.inert = false;
      main.inert = true;
      if (footer) {
        footer.inert = true;
      }
      window.setTimeout(function () {
        if (menuOpen) {
          menu.focus({ preventScroll: true });
        }
      }, 420);
    } else {
      menu.inert = true;
      main.inert = false;
      if (footer) {
        footer.inert = false;
      }
      if (opts.returnFocus !== false) {
        menuBtn.focus({ preventScroll: true });
      }
    }
    requestScroll();
  }

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      setMenu(!menuOpen);
    });

    menu.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false, { returnFocus: false });
      });
    });

    const menuBackdrop = menu.querySelector(".menu__backdrop");
    if (menuBackdrop) {
      menuBackdrop.addEventListener("click", function () {
        setMenu(false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!menuOpen) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusables = Array.from(
        menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!focusables.length) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!menu.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (document.activeElement === menu) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  document.querySelectorAll("[data-to-top]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (menuOpen) {
        setMenu(false, { returnFocus: false });
      }
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      const brand = document.querySelector(".brand");
      if (brand) {
        brand.focus({ preventScroll: true });
      }
    });
  });

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function buildImpulse(ctx, seconds, decay) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const fade = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * fade;
      }
    }
    return impulse;
  }

  function makeAmbient() {
    if (ambient) {
      return ambient;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    const ctx = new AudioCtx();
    const chordLength = 9;
    const progression = [
      { bass: 38, notes: [50, 57, 64, 66], motif: [[0.5, 69], [3.25, 74], [5.9, 76]] },
      { bass: 35, notes: [47, 54, 57, 62], motif: [[1.1, 78], [3.8, 74], [6.2, 69]] },
      { bass: 43, notes: [43, 50, 59, 66], motif: [[0.7, 79], [3.1, 74], [5.8, 71]] },
      { bass: 45, notes: [45, 52, 59, 64], motif: [[1.2, 76], [4, 73], [6.5, 69]] }
    ];

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.4;
    master.connect(compressor);
    compressor.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = buildImpulse(ctx, 3.8, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.46;
    reverb.connect(wet);
    wet.connect(master);

    function makePan(value) {
      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = value;
        return panner;
      }
      return ctx.createGain();
    }

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 1350;
    padFilter.Q.value = 0.55;
    const padBus = ctx.createGain();
    padBus.gain.value = 0.75;
    padFilter.connect(padBus);
    padBus.connect(master);
    padBus.connect(reverb);

    const pianoBus = ctx.createGain();
    pianoBus.gain.value = 0.9;
    pianoBus.connect(master);
    pianoBus.connect(reverb);

    const noiseBuffer = ctx.createBuffer(2, ctx.sampleRate * 5, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = noiseBuffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    const air = ctx.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 1650;
    airFilter.Q.value = 0.3;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.0032;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(master);
    airGain.connect(reverb);
    air.start();

    function schedulePad(start, midi, index) {
      const pan = makePan(index % 2 === 0 ? -0.24 : 0.24);
      const gain = ctx.createGain();
      const level = 0.022;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + 3.4);
      gain.gain.setValueAtTime(level, start + chordLength - 1.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + chordLength + 2.6);
      [-4, 4].forEach(function (detune) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = midiToFrequency(midi);
        osc.detune.value = detune;
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + chordLength + 2.7);
      });
      gain.connect(pan);
      pan.connect(padFilter);
    }

    function scheduleBass(start, midi) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = midiToFrequency(midi);
      filter.type = "lowpass";
      filter.frequency.value = 240;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.04, start + 2.8);
      gain.gain.setValueAtTime(0.04, start + chordLength - 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + chordLength + 2.4);
      osc.connect(gain);
      gain.connect(filter);
      filter.connect(master);
      osc.start(start);
      osc.stop(start + chordLength + 2.5);
    }

    function schedulePiano(start, midi, level) {
      const frequency = midiToFrequency(midi);
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const pan = makePan(((midi % 3) - 1) * 0.16);
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      overtone.type = "sine";
      overtone.frequency.value = frequency * 2.002;
      overtoneGain.gain.value = 0.13;
      filter.type = "lowpass";
      filter.frequency.value = 3100;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 4.6);
      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(filter);
      filter.connect(pan);
      pan.connect(pianoBus);
      osc.start(start);
      overtone.start(start);
      osc.stop(start + 4.7);
      overtone.stop(start + 4.7);
    }

    let chordIndex = 0;
    let loopTimer = null;

    function playChord() {
      const start = ctx.currentTime + 0.08;
      const chord = progression[chordIndex % progression.length];
      chord.notes.forEach(function (midi, index) {
        schedulePad(start, midi, index);
      });
      scheduleBass(start, chord.bass);
      chord.motif.forEach(function (note, index) {
        schedulePiano(start + note[0], note[1], index === 0 ? 0.062 : 0.046);
      });
      chordIndex += 1;
    }

    function startLoop() {
      if (loopTimer) {
        return;
      }
      playChord();
      loopTimer = window.setInterval(playChord, chordLength * 1000);
    }

    function stopLoop() {
      if (!loopTimer) {
        return;
      }
      window.clearInterval(loopTimer);
      loopTimer = null;
    }

    ambient = {
      ctx: ctx,
      master: master,
      start: function () {
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        startLoop();
      },
      stop: stopLoop
    };
    return ambient;
  }

  function paintSound(on) {
    if (!soundBtn) {
      return;
    }
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.setAttribute("aria-label", on ? "Turn background music off" : "Turn background music on");
    const label = soundBtn.querySelector(".sound-toggle__label");
    if (label) {
      label.textContent = on ? "Music on" : "Music off";
    }
  }

  function setSound(on) {
    if (on) {
      const audio = makeAmbient();
      if (!audio) {
        soundOn = false;
        paintSound(false);
        return;
      }
      audio.start();
      const now = audio.ctx.currentTime;
      audio.master.gain.cancelScheduledValues(now);
      audio.master.gain.setValueAtTime(Math.max(audio.master.gain.value, 0.0001), now);
      audio.master.gain.exponentialRampToValueAtTime(0.8, now + 2.6);
      soundOn = true;
    } else {
      if (ambient) {
        ambient.stop();
        const now = ambient.ctx.currentTime;
        ambient.master.gain.cancelScheduledValues(now);
        ambient.master.gain.setValueAtTime(Math.max(ambient.master.gain.value, 0.0001), now);
        ambient.master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      }
      soundOn = false;
    }
    paintSound(on);
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      setSound(!soundOn);
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!ambient) {
      return;
    }
    if (document.hidden) {
      ambient.stop();
    } else if (soundOn) {
      ambient.start();
    }
  });

  body.classList.remove("is-loading");
  body.classList.add("is-ready");
  initReveals();

  const parallaxEls = Array.from(document.querySelectorAll(".js-parallax"));
  const darkZones = Array.from(document.querySelectorAll(".verse, .visit, .word, .library, .footer"));

  function updateScroll() {
    scrollQueued = false;
    const y = window.scrollY || window.pageYOffset;
    if (header) {
      const scrolled = y > 40;
      header.classList.toggle("is-scrolled", scrolled);
      const probe = header.getBoundingClientRect().height + 16;
      const overDark = darkZones.some(function (zone) {
        const rect = zone.getBoundingClientRect();
        return rect.top <= probe && rect.bottom > probe;
      });
      header.classList.toggle("is-inverted", overDark && scrolled && !menuOpen);
    }
    if (progressBar) {
      const distance = html.scrollHeight - window.innerHeight;
      const amount = distance > 0 ? Math.min(100, Math.max(0, (y / distance) * 100)) : 0;
      progressBar.style.width = amount + "%";
    }
    if (!reduceMotion) {
      parallaxEls.forEach(function (el) {
        const holder = el.closest(".hero__media") || el;
        const rect = holder.getBoundingClientRect();
        if (rect.bottom < -160 || rect.top > window.innerHeight + 160) {
          return;
        }
        const speed = parseFloat(el.getAttribute("data-speed")) || -0.04;
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.setProperty("--parallax-y", Math.max(-70, Math.min(70, offset)).toFixed(2) + "px");
      });
    }
  }

  function requestScroll() {
    if (scrollQueued) {
      return;
    }
    scrollQueued = true;
    window.requestAnimationFrame(updateScroll);
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);
  updateScroll();

  const dustCanvas = document.querySelector(".hero__dust");

  if (dustCanvas && dustCanvas.getContext) {
    const dustContext = dustCanvas.getContext("2d");
    let particles = [];
    let dustWidth = 0;
    let dustHeight = 0;
    let dustFrame = null;
    let lastTime = 0;
    let dustVisible = true;

    function seedDust() {
      const count = Math.max(18, Math.min(52, Math.round((dustWidth * dustHeight) / 17000)));
      particles = [];
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * dustWidth,
          y: Math.random() * dustHeight,
          radius: 0.5 + Math.random() * 1.6,
          speed: 0.6 + Math.random() * 1.6,
          drift: 0.15 + Math.random() * 0.7,
          alpha: 0.12 + Math.random() * 0.38,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function sizeDust() {
      const rect = dustCanvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      dustWidth = rect.width;
      dustHeight = rect.height;
      dustCanvas.width = Math.round(dustWidth * ratio);
      dustCanvas.height = Math.round(dustHeight * ratio);
      dustContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      seedDust();
    }

    function drawDust(time) {
      const delta = lastTime ? Math.min(time - lastTime, 50) : 16;
      lastTime = time;
      dustContext.clearRect(0, 0, dustWidth, dustHeight);
      dustContext.globalCompositeOperation = "lighter";
      particles.forEach(function (particle) {
        if (!reduceMotion) {
          particle.y -= particle.speed * delta * 0.006;
          particle.x += Math.sin(time * 0.00018 + particle.phase) * particle.drift * delta * 0.004;
          if (particle.y < -10) {
            particle.y = dustHeight + 10;
            particle.x = Math.random() * dustWidth;
          }
          if (particle.x < -10) {
            particle.x = dustWidth + 10;
          }
          if (particle.x > dustWidth + 10) {
            particle.x = -10;
          }
        }
        dustContext.beginPath();
        dustContext.fillStyle = "rgba(255, 226, 178, " + particle.alpha + ")";
        dustContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        dustContext.fill();
      });
      dustContext.globalCompositeOperation = "source-over";
      if (!reduceMotion && dustVisible) {
        dustFrame = window.requestAnimationFrame(drawDust);
      }
    }

    function startDust() {
      if (dustFrame || reduceMotion) {
        return;
      }
      lastTime = 0;
      dustFrame = window.requestAnimationFrame(drawDust);
    }

    function stopDust() {
      if (dustFrame) {
        window.cancelAnimationFrame(dustFrame);
        dustFrame = null;
      }
    }

    sizeDust();
    drawDust(0);

    if ("IntersectionObserver" in window && !reduceMotion) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            dustVisible = entry.isIntersecting;
            if (dustVisible && !document.hidden) {
              startDust();
            } else {
              stopDust();
            }
          });
        },
        { threshold: 0.05 }
      ).observe(dustCanvas);
    } else {
      startDust();
    }

    window.addEventListener("resize", function () {
      sizeDust();
      if (reduceMotion) {
        drawDust(0);
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopDust();
      } else if (dustVisible) {
        startDust();
      }
    });
  }

  const verse = document.querySelector(".verse");

  if (verse && !reduceMotion) {
    const verseFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const verseStart = { x: 60, y: 35 };
    const verseState = {
      x: verseStart.x,
      y: verseStart.y,
      targetX: verseStart.x,
      targetY: verseStart.y,
      awake: 0,
      awakeTarget: 0,
      lit: 0,
      litTarget: 0,
      frame: 0,
      last: 0,
      inView: false
    };
    let verseLitTimer = 0;

    function smoothStep(value) {
      return value * value * (3 - 2 * value);
    }

    function paintVerseLight(now) {
      verseState.frame = 0;
      const elapsed = verseState.last ? Math.min(64, now - verseState.last) : 16.7;
      verseState.last = now;
      const follow = 1 - Math.exp(-elapsed * 0.0046);
      const settle = 1 - Math.exp(-elapsed * 0.0018);

      if (!verseFinePointer.matches) {
        const t = now / 1000;
        verseState.targetX = 58 + Math.sin(t * 0.17) * 12 + Math.sin(t * 0.071 + 1.4) * 4;
        verseState.targetY = 36 + Math.cos(t * 0.13 + 0.6) * 10;
      }

      verseState.x += (verseState.targetX - verseState.x) * follow;
      verseState.y += (verseState.targetY - verseState.y) * follow;
      verseState.awake += (verseState.awakeTarget - verseState.awake) * settle;
      verseState.lit += (verseState.litTarget - verseState.lit) * settle;

      const awake = Math.max(0, Math.min(1, verseState.awake));
      const lit = smoothStep(Math.max(0, Math.min(1, verseState.lit)));
      const baseRadius = Math.max(160, Math.min(340, Math.min(window.innerWidth, window.innerHeight) * 0.3));
      const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.28;
      const radius = awake * (baseRadius + (maxRadius - baseRadius) * lit);
      const glowSize = baseRadius * 1.55 + (maxRadius * 0.32 - baseRadius * 1.55) * lit;

      verse.style.setProperty("--spot-x", verseState.x.toFixed(2) + "%");
      verse.style.setProperty("--spot-y", verseState.y.toFixed(2) + "%");
      verse.style.setProperty("--reveal-size", radius.toFixed(1) + "px");
      verse.style.setProperty("--glow-size", glowSize.toFixed(1) + "px");
      verse.style.setProperty("--glow-opacity", (awake * (0.32 + 0.2 * lit)).toFixed(3));

      if (verseState.inView && !document.hidden) {
        verseState.frame = window.requestAnimationFrame(paintVerseLight);
      } else {
        verseState.last = 0;
      }
    }

    function startVerseLight() {
      if (verseState.frame || document.hidden) {
        return;
      }
      verseState.last = 0;
      verseState.frame = window.requestAnimationFrame(paintVerseLight);
    }

    verse.addEventListener(
      "pointermove",
      function (event) {
        if (!verseFinePointer.matches || event.pointerType === "touch") {
          return;
        }
        const rect = verse.getBoundingClientRect();
        verseState.targetX = Math.max(10, Math.min(90, ((event.clientX - rect.left) / rect.width) * 100));
        verseState.targetY = Math.max(10, Math.min(90, ((event.clientY - rect.top) / rect.height) * 100));
      },
      { passive: true }
    );

    verse.addEventListener("pointerleave", function () {
      if (verseFinePointer.matches) {
        verseState.targetX = verseStart.x;
        verseState.targetY = verseStart.y;
      }
    });

    if ("IntersectionObserver" in window) {
      const verseObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              verseState.inView = true;
              verseState.awakeTarget = 1;
              verse.classList.add("is-awake");
              startVerseLight();
              if (entry.intersectionRatio >= 0.45 && !verseLitTimer && verseState.litTarget === 0) {
                verseLitTimer = window.setTimeout(function () {
                  verseState.litTarget = 1;
                  verse.classList.add("is-lit");
                  verseLitTimer = 0;
                }, 2400);
              }
              return;
            }

            verseState.inView = false;
            verseState.awakeTarget = 0;
            verseState.litTarget = 0;
            verseState.awake = 0;
            verseState.lit = 0;
            verseState.x = verseStart.x;
            verseState.y = verseStart.y;
            verseState.targetX = verseStart.x;
            verseState.targetY = verseStart.y;
            verse.classList.remove("is-awake", "is-lit");
            if (verseLitTimer) {
              window.clearTimeout(verseLitTimer);
              verseLitTimer = 0;
            }
            if (verseState.frame) {
              window.cancelAnimationFrame(verseState.frame);
              verseState.frame = 0;
            }
            verseState.last = 0;
          });
        },
        { threshold: [0, 0.2, 0.45, 0.75] }
      );
      verseObserver.observe(verse);
    } else {
      verse.classList.add("is-awake", "is-lit");
      verse.style.setProperty("--reveal-size", "80vmax");
      verse.style.setProperty("--glow-opacity", "0.38");
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (verseState.frame) {
          window.cancelAnimationFrame(verseState.frame);
          verseState.frame = 0;
        }
        verseState.last = 0;
      } else if (verseState.inView) {
        startVerseLight();
      }
    });
  }

  const beliefs = Array.from(document.querySelectorAll(".belief"));

  function paintBelief(belief, open) {
    const trigger = belief.querySelector(".belief__trigger");
    const panel = belief.querySelector(".belief__panel");
    belief.classList.toggle("is-open", open);
    if (trigger) {
      trigger.setAttribute("aria-expanded", String(open));
    }
    if (panel) {
      panel.setAttribute("aria-hidden", String(!open));
      panel.inert = !open;
    }
  }

  beliefs.forEach(function (belief) {
    const trigger = belief.querySelector(".belief__trigger");
    if (!trigger) {
      return;
    }
    trigger.addEventListener("click", function () {
      const isOpen = belief.classList.contains("is-open");
      beliefs.forEach(function (other) {
        if (other !== belief && other.classList.contains("is-open")) {
          paintBelief(other, false);
        }
      });
      paintBelief(belief, !isOpen);
    });
  });

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const cursor = document.querySelector(".cursor");

  if (cursor && finePointer.matches && !reduceMotion) {
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let cursorSeen = false;

    body.classList.add("has-custom-cursor");
    cursor.classList.add("is-enabled");
    cursor.style.opacity = "0";

    window.addEventListener(
      "pointermove",
      function (event) {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!cursorSeen) {
          cursorSeen = true;
          ringX = pointerX;
          ringY = pointerY;
          cursor.style.opacity = "1";
        }
      },
      { passive: true }
    );

    function moveCursor() {
      ringX += (pointerX - ringX) * 0.16;
      ringY += (pointerY - ringY) * 0.16;
      cursor.style.transform = "translate3d(" + ringX.toFixed(2) + "px, " + ringY.toFixed(2) + "px, 0)";
      window.requestAnimationFrame(moveCursor);
    }
    moveCursor();

    const hoverSelector = "a, button, [data-cursor], .sermon-row, .belief__trigger, .menu__link";

    document.addEventListener("pointerover", function (event) {
      if (event.target.closest(hoverSelector)) {
        cursor.classList.add("is-hover");
      }
    });

    document.addEventListener("pointerout", function (event) {
      const from = event.target.closest ? event.target.closest(hoverSelector) : null;
      const to = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(hoverSelector) : null;
      if (from && !to) {
        cursor.classList.remove("is-hover");
      }
    });

    document.addEventListener("pointerdown", function () {
      cursor.classList.add("is-pressed");
    });

    document.addEventListener("pointerup", function () {
      cursor.classList.remove("is-pressed");
    });

    document.addEventListener("mouseleave", function () {
      cursor.style.opacity = "0";
    });

    document.addEventListener("mouseenter", function () {
      cursor.style.opacity = "1";
    });
  }
})();
