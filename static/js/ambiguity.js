/* ============================================================
   Grammar Ambiguity Checker -- JS
   ============================================================ */

(() => {
    "use strict";

    // DOM
    const grammarInput   = document.getElementById("ambig-grammar");
    const checkBtn       = document.getElementById("check-btn");
    const resetBtn       = document.getElementById("ambig-reset-btn");
    const errorMsg       = document.getElementById("ambig-error");
    const resultsSection = document.getElementById("ambig-results");
    const bannerIcon     = document.getElementById("ambig-banner-icon");
    const bannerTitle    = document.getElementById("ambig-banner-title");
    const bannerSub      = document.getElementById("ambig-banner-sub");
    const stringBox      = document.getElementById("ambig-string-box");
    const stringDisplay  = document.getElementById("ambig-string");
    const overlay        = document.getElementById("ambig-overlay");
    const animControls   = document.getElementById("ambig-anim-controls");
    const derivationsDiv = document.getElementById("ambig-derivations");
    const deriv1Container = document.getElementById("ambig-deriv1");
    const deriv2Container = document.getElementById("ambig-deriv2");
    const replayBtn      = document.getElementById("ambig-replay-btn");
    const speedSlider    = document.getElementById("ambig-speed");
    const speedVal       = document.getElementById("ambig-speed-val");
    const examplesDropdown = document.getElementById("ambig-examples");

    let animTimer = null;
    let animSpeed = 700;
    let currentResult = null;

    // Speed slider
    if (speedSlider) {
        speedSlider.addEventListener("input", (e) => {
            animSpeed = parseInt(e.target.value);
            if (speedVal) speedVal.textContent = animSpeed + "ms";
        });
    }

    // Examples
    const EXAMPLES = [
        { name: "1. Ambiguous Expression Grammar",
          grammar: "E \u2192 E + E | E * E | id" },
        { name: "2. Ambiguous If-Else",
          grammar: "S \u2192 if C then S else S | if C then S | a\nC \u2192 b" },
        { name: "3. Highly Ambiguous Recursive",
          grammar: "S \u2192 S S | a" },
        { name: "4. Unambiguous Arithmetic",
          grammar: "E \u2192 E + T | T\nT \u2192 T * F | F\nF \u2192 ( E ) | id" },
        { name: "5. Unambiguous Balanced Parens",
          grammar: "S \u2192 ( S ) S | \u03b5" },
        { name: "6. Ambiguous Nullable",
          grammar: "S \u2192 A B | C\nA \u2192 a | \u03b5\nB \u2192 b | \u03b5\nC \u2192 a | b | \u03b5" },
        { name: "7. Unambiguous Left Recursive",
          grammar: "A \u2192 A a | b" },
    ];

    if (examplesDropdown) {
        EXAMPLES.forEach((ex, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = ex.name;
            examplesDropdown.appendChild(opt);
        });
        examplesDropdown.addEventListener("change", (e) => {
            const idx = e.target.value;
            if (idx === "") return;
            grammarInput.value = EXAMPLES[idx].grammar;
            formatGrammar();
            clearResults();
        });
    }

    // Grammar formatting
    function formatGrammar() {
        const el = grammarInput;
        let val = el.value;
        const pos = el.selectionStart;
        val = val.replace(/-[ \t]*>/g, "\u2192");
        let noSpace = val.replace(/[ \t]+/g, "");
        let newVal = "", charCount = 0;
        for (let i = 0; i < noSpace.length; i++) {
            const c = noSpace[i];
            if (c === '\n') { newVal = newVal.replace(/[ \t]+$/, "") + "\n"; }
            else { newVal += c + " "; }
        }
        el.value = newVal;
    }
    grammarInput.addEventListener("input", formatGrammar);
    grammarInput.addEventListener("keydown", (e) => { if (e.key === " ") e.preventDefault(); });

    // Symbol buttons
    document.querySelectorAll(".sym-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const sym = btn.dataset.symbol;
            const el = grammarInput;
            const start = el.selectionStart, end = el.selectionEnd;
            el.value = el.value.slice(0, start) + sym + el.value.slice(end);
            el.selectionStart = el.selectionEnd = start + sym.length;
            el.focus();
            formatGrammar();
        });
    });

    // Clear
    resetBtn.addEventListener("click", () => {
        grammarInput.value = "";
        if (examplesDropdown) examplesDropdown.value = "";
        clearResults();
    });

    function clearResults() {
        stopAnim();
        resultsSection.classList.add("hidden");
        errorMsg.classList.add("hidden");
        overlay.classList.add("hidden");
        overlay.className = "hidden";
        if (animControls) animControls.classList.add("hidden");
        if (derivationsDiv) derivationsDiv.classList.add("hidden");
        stringBox.classList.add("hidden");
        if (deriv1Container) deriv1Container.innerHTML = "";
        if (deriv2Container) deriv2Container.innerHTML = "";
        currentResult = null;
    }

    // Check ambiguity
    checkBtn.addEventListener("click", async () => {
        clearResults();
        checkBtn.disabled = true;
        checkBtn.textContent = "Checking\u2026";
        try {
            const res = await fetch("/check_ambiguity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grammar: grammarInput.value }),
            });
            const data = await res.json();
            if (data.error) { showError(data.error); return; }
            currentResult = data;
            displayResult(data);
        } catch (e) {
            showError("Network error -- is the server running?");
        } finally {
            checkBtn.disabled = false;
            checkBtn.textContent = "Check Ambiguity";
        }
    });

    function showError(msg) { errorMsg.textContent = msg; errorMsg.classList.remove("hidden"); }

    function displayResult(data) {
        resultsSection.classList.remove("hidden");

        if (!data.ambiguous) {
            // NOT ambiguous
            bannerIcon.textContent = "\u2713";
            bannerTitle.textContent = "Grammar is NOT Ambiguous";
            bannerTitle.className = "green";
            bannerSub.textContent = data.message || `Tested strings up to length 6.`;
            stringBox.classList.add("hidden");
            animControls.classList.add("hidden");
            derivationsDiv.classList.add("hidden");

            // Show green overlay popup
            showNonAmbiguousPopup();
        } else {
            // AMBIGUOUS
            bannerIcon.textContent = "\u26a0\ufe0f";
            bannerTitle.textContent = "Grammar is AMBIGUOUS!";
            bannerTitle.className = "red";
            bannerSub.textContent = `The string below has two distinct leftmost derivations:`;
            stringBox.classList.remove("hidden");
            stringDisplay.textContent = data.string || "\u03b5";

            // Build derivation displays
            if (data.derivation1 && data.derivation2) {
                buildAmbiguitySteps(data.derivation1, deriv1Container, data.diverge_index, data.non_terminals || []);
                buildAmbiguitySteps(data.derivation2, deriv2Container, data.diverge_index, data.non_terminals || []);
                animControls.classList.remove("hidden");
                animControls.style.display = "flex";
                derivationsDiv.classList.remove("hidden");
                // Auto-start animation
                setTimeout(() => startAmbiguityAnimation(), 600);
            }
        }
    }

    // Non-ambiguous popup
    function showNonAmbiguousPopup() {
        overlay.className = "ambiguity-overlay overlay-green";
        overlay.innerHTML = `
            <div class="ambiguity-popup">
                <div class="popup-icon">\u2705</div>
                <div class="popup-title green">Grammar is NOT Ambiguous</div>
                <div class="popup-subtitle">No string with multiple distinct parse trees was found.</div>
            </div>
        `;
        document.body.classList.add("body-green-flash");

        setTimeout(() => {
            overlay.classList.add("overlay-fade-out");
            setTimeout(() => {
                overlay.classList.add("hidden");
                overlay.innerHTML = "";
                overlay.className = "hidden";
                document.body.classList.remove("body-green-flash");
            }, 600);
        }, 4500);
    }

    // Build ambiguity step DOM
    function buildAmbiguitySteps(steps, container, divergeIdx, nonTerminals) {
        container.innerHTML = "";
        const nts = new Set(nonTerminals);

        steps.forEach((tokens, idx) => {
            const div = document.createElement("div");
            div.className = "ambiguity-step-line";
            div.dataset.step = idx;
            if (idx >= divergeIdx) div.classList.add("diverged");

            const numSpan = document.createElement("span");
            numSpan.className = "step-num";
            numSpan.textContent = idx === 0 ? "Start" : `Step ${idx}`;
            div.appendChild(numSpan);

            if (idx > 0) {
                const arrow = document.createElement("span");
                arrow.className = "arrow-sep";
                arrow.textContent = " \u21d2 ";
                div.appendChild(arrow);
            }

            tokens.forEach(t => {
                const s = document.createElement("span");
                s.textContent = t.sym + " ";
                if (t.sym === "\u03b5") {
                    s.className = "sym-eps";
                } else if (t.is_nt) {
                    s.className = "sym-nt";
                } else {
                    s.className = "sym-terminal";
                }
                // Mark diverged symbols
                if (idx >= divergeIdx && t.hl) {
                    s.classList.add("sym-diverged");
                }
                div.appendChild(s);
            });

            container.appendChild(div);
        });
    }

    // Ambiguity animation
    let ambigAnimStep = -1;
    function startAmbiguityAnimation() {
        stopAnim();
        // Hide all steps first
        [deriv1Container, deriv2Container].forEach(c => {
            c.querySelectorAll(".ambiguity-step-line").forEach(el => {
                el.classList.remove("visible", "active");
            });
        });
        ambigAnimStep = -1;
        animateNextAmbigStep();
    }

    function animateNextAmbigStep() {
        ambigAnimStep++;
        const steps1 = deriv1Container.querySelectorAll(".ambiguity-step-line");
        const steps2 = deriv2Container.querySelectorAll(".ambiguity-step-line");
        const maxLen = Math.max(steps1.length, steps2.length);

        if (ambigAnimStep >= maxLen) {
            // Animation complete -- highlight last step
            return;
        }

        // Show current step in both
        [steps1, steps2].forEach(steps => {
            steps.forEach((el, idx) => {
                if (idx <= ambigAnimStep) {
                    el.classList.add("visible");
                    el.classList.toggle("active", idx === ambigAnimStep);
                }
            });
        });

        // Scroll active into view
        [deriv1Container, deriv2Container].forEach(c => {
            const activeEl = c.querySelector(".ambiguity-step-line.active");
            if (activeEl) activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });

        animTimer = setTimeout(animateNextAmbigStep, animSpeed);
    }

    function stopAnim() {
        if (animTimer) clearTimeout(animTimer);
        animTimer = null;
    }

    if (replayBtn) {
        replayBtn.addEventListener("click", () => {
            if (currentResult && currentResult.ambiguous) {
                startAmbiguityAnimation();
            }
        });
    }
})();
