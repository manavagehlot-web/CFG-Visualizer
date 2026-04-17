/* ============================================================
   CFG Derivation & Parse Tree Visualizer -- Main JS
   View modes: LMD | RMD | Parse Tree | All
   ============================================================ */

(() => {
    "use strict";

    // ---- DOM refs ----
    const grammarInput    = document.getElementById("grammar-input");
    const stringInput     = document.getElementById("string-input");
    const deriveBtn       = document.getElementById("derive-btn");
    const animateBtn      = document.getElementById("animate-btn");
    const pauseBtn        = document.getElementById("pause-btn");
    const speedSlider     = document.getElementById("speed-slider");
    const speedVal        = document.getElementById("speed-val");
    const animSettings    = document.getElementById("anim-settings");
    const resetBtn        = document.getElementById("reset-btn");
    const prevBtn         = document.getElementById("prev-btn");
    const nextBtn         = document.getElementById("next-btn");
    const stepCounter     = document.getElementById("step-counter");
    const errorMsg        = document.getElementById("error-msg");
    const outputSection   = document.getElementById("output-section");
    const examplesDropdown = document.getElementById("examples-dropdown");

    const panelLmd  = document.getElementById("panel-lmd");
    const panelRmd  = document.getElementById("panel-rmd");
    const panelTree = document.getElementById("panel-tree");
    const panelAll  = document.getElementById("panel-all");

    const lmdContainer  = document.getElementById("lmd-steps");
    const lmdNone       = document.getElementById("lmd-none");
    const rmdContainer  = document.getElementById("rmd-steps");
    const rmdNone       = document.getElementById("rmd-none");
    const treeSvg       = document.getElementById("tree-svg");
    const treeTabBtns   = document.querySelectorAll(".tree-tab");

    const lmdContainerAll = document.getElementById("lmd-steps-all");
    const rmdContainerAll = document.getElementById("rmd-steps-all");
    const lmdNoneAll      = document.getElementById("lmd-none-all");
    const rmdNoneAll      = document.getElementById("rmd-none-all");
    const treeSvgAll      = document.getElementById("tree-svg-all");
    const treeTabBtnsAll  = document.querySelectorAll(".tree-tab-all");

    const inlineTreeList = document.getElementById("inline-tree-list");
    const expTreeList    = document.getElementById("exp-tree-list");

    const inlineTreeToggle = document.getElementById("inline-tree-toggle");
    const inlineTreeBody   = document.getElementById("inline-tree-body");

    const explanationToggleBtn = document.getElementById("explanation-toggle-btn");
    const explanationBody      = document.getElementById("explanation-body");

    const viewModeBtns = document.querySelectorAll(".view-mode-btn");

    // ---- State ----
    let currentData   = null;
    let currentStep   = 0;
    let maxSteps      = 0;
    let animTimer     = null;
    let animating     = false;
    let activeTree    = "lmd";
    let activeTreeAll = "lmd";
    let animSpeed     = 600;
    let currentView   = "lmd";
    let nonTerminals  = [];

    // ================================================================
    // Speed slider
    // ================================================================
    if (speedSlider) {
        speedSlider.addEventListener("input", (e) => {
            animSpeed = parseInt(e.target.value);
            if (speedVal) speedVal.textContent = animSpeed + "ms";
        });
    }

    // ================================================================
    // Grammar Examples
    // ================================================================
    const GRAMMAR_EXAMPLES = [
        { name: "1. Simple Ambiguous Grammar",
          grammar: "E \u2192 E + E | E * E | id",
          string:  "id + id * id" },
        { name: "2. Even Palindrome Grammar",
          grammar: "P \u2192 a P a | b P b | \u03b5",
          string:  "a b b a" },
        { name: "3. Balanced Parentheses",
          grammar: "S \u2192 ( S ) S | \u03b5",
          string:  "( ( ) ) ( )" },
        { name: "4. Left Recursive Grammar",
          grammar: "A \u2192 A a | b",
          string:  "b a a a" },
        { name: "5. Right Recursive Grammar",
          grammar: "A \u2192 a A | b",
          string:  "a a a b" },
        { name: "6. Non-Derivable String",
          grammar: "S \u2192 a S b | \u03b5",
          string:  "a b b" },
        { name: "7. Empty String (\u03b5) Generation",
          grammar: "S \u2192 A B\nA \u2192 \u03b5\nB \u2192 \u03b5",
          string:  "\u03b5" },
        { name: "8. Highly Ambiguous Recursive",
          grammar: "S \u2192 S S | a",
          string:  "a a a a" },
        { name: "9. Mixed Nullable Productions",
          grammar: "S \u2192 A B | B A\nA \u2192 a A | \u03b5\nB \u2192 b B | \u03b5",
          string:  "a a b b" },
        { name: "10. Complex Multi-Terminal Grammar",
          grammar: "S \u2192 A B C D | S S\nA \u2192 a A | a | \u03b5\nB \u2192 b B | b | \u03b5\nC \u2192 c C | c | \u03b5\nD \u2192 d D | d | \u03b5",
          string:  "a a a a a b b b b b c c c c c d d d d d" },
    ];

    if (examplesDropdown) {
        GRAMMAR_EXAMPLES.forEach((ex, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = ex.name;
            examplesDropdown.appendChild(opt);
        });
        examplesDropdown.addEventListener("change", (e) => {
            const idx = e.target.value;
            if (idx === "") return;
            const ex = GRAMMAR_EXAMPLES[idx];
            grammarInput.value = ex.grammar;
            stringInput.value  = ex.string;
            formatGrammarInput();
            setTimeout(() => { formatStringInput(); clearOutput(); }, 50);
        });
    }

    // ================================================================
    // Smart Input Formatting
    // ================================================================
    function formatGrammarInput() {
        const el = grammarInput;
        let oldVal = el.value;
        let pos = el.selectionStart;
        const re = /-[ \t]*>/g;
        let oldSub = oldVal.substring(0, pos);
        let shortenCount = 0, match;
        while ((match = re.exec(oldSub)) !== null) shortenCount += match[0].length - 1;
        oldVal = oldVal.replace(re, "\u2192");
        pos -= shortenCount;
        let charsBeforeCursor = 0;
        for (let i = 0; i < pos; i++) {
            if (!/[ \t]/.test(oldVal[i]) || oldVal[i] === '\n') charsBeforeCursor++;
        }
        let noSpaceStr = oldVal.replace(/[ \t]+/g, "");
        let newVal = "", newPos = 0, charCount = 0;
        for (let i = 0; i < noSpaceStr.length; i++) {
            const char = noSpaceStr[i];
            if (char === '\n') {
                newVal = newVal.replace(/[ \t]+$/, "") + "\n";
                charCount++;
                if (charCount === charsBeforeCursor) newPos = newVal.length;
            } else {
                newVal += char + " ";
                charCount++;
                if (charCount === charsBeforeCursor) newPos = newVal.length;
            }
        }
        if (charsBeforeCursor === 0) newPos = 0;
        el.value = newVal;
        el.selectionStart = el.selectionEnd = newPos;
        setTimeout(() => formatStringInput(), 0);
    }
    grammarInput.addEventListener("keydown", (e) => {
        if (e.key === " ") { e.preventDefault(); }
        else if (e.key === "Backspace") {
            const pos = grammarInput.selectionStart, end = grammarInput.selectionEnd;
            if (pos !== end || pos === 0) return;
            if (grammarInput.value[pos - 1] === " ") {
                e.preventDefault();
                const val = grammarInput.value;
                let i = pos - 1;
                while (i >= 0 && val[i] === " ") i--;
                if (i >= 0) { grammarInput.value = val.slice(0, i) + val.slice(pos); grammarInput.selectionStart = grammarInput.selectionEnd = i; formatGrammarInput(); }
            }
        }
    });
    grammarInput.addEventListener("input", formatGrammarInput);

    function getStringTerminals() {
        const text = grammarInput.value;
        const lines = text.split('\n');
        let nts = new Set(), allSymbols = new Set();
        lines.forEach(line => { line = line.replace(/->/g, "\u2192").replace(/::=/g, "\u2192"); if (line.includes("\u2192")) nts.add(line.split("\u2192")[0].trim()); });
        lines.forEach(line => { line = line.replace(/->/g, "\u2192").replace(/::=/g, "\u2192"); if (line.includes("\u2192")) { let body = line.split("\u2192")[1]; body.split("|").forEach(alt => { alt.trim().split(/\s+/).forEach(sym => { if (sym !== "\u03b5" && sym !== "" && !nts.has(sym)) allSymbols.add(sym); }); }); } });
        return Array.from(allSymbols).sort((a, b) => b.length - a.length);
    }

    function formatStringInput() {
        const el = stringInput;
        const oldVal = el.value, pos = el.selectionStart;
        let charsBeforeCursor = 0;
        for (let i = 0; i < pos; i++) { if (!/\s/.test(oldVal[i])) charsBeforeCursor++; }
        const terms = getStringTerminals();
        const noSpaceStr = oldVal.replace(/\s+/g, "");
        let newVal = "", newPos = 0, charCount = 0, idx = 0;
        while (idx < noSpaceStr.length) {
            let matched = false;
            for (let term of terms) { if (noSpaceStr.startsWith(term, idx)) { newVal += term + " "; for (let c = 0; c < term.length; c++) { charCount++; if (charCount === charsBeforeCursor) newPos = newVal.length; } idx += term.length; matched = true; break; } }
            if (!matched) { newVal += noSpaceStr[idx] + " "; charCount++; if (charCount === charsBeforeCursor) newPos = newVal.length; idx++; }
        }
        if (charsBeforeCursor === 0) newPos = 0;
        el.value = newVal;
        el.selectionStart = el.selectionEnd = newPos;
    }
    stringInput.addEventListener("keydown", (e) => {
        if (e.key === " ") { e.preventDefault(); }
        else if (e.key === "Backspace") {
            const pos = stringInput.selectionStart, end = stringInput.selectionEnd;
            if (pos !== end || pos === 0) return;
            if (stringInput.value[pos - 1] === " ") {
                e.preventDefault(); const val = stringInput.value; let i = pos - 1;
                while (i >= 0 && val[i] === " ") i--;
                if (i >= 0) { stringInput.value = val.slice(0, i) + val.slice(pos); stringInput.selectionStart = stringInput.selectionEnd = i; formatStringInput(); }
            }
        }
    });
    stringInput.addEventListener("input", formatStringInput);

    // ================================================================
    // Symbol Insertion
    // ================================================================
    let lastFocusedInput = grammarInput;
    grammarInput.addEventListener("focus", () => lastFocusedInput = grammarInput);
    stringInput.addEventListener("focus",  () => lastFocusedInput = stringInput);
    document.querySelectorAll(".sym-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const sym = btn.dataset.symbol, el = lastFocusedInput;
            const start = el.selectionStart, end = el.selectionEnd;
            el.value = el.value.slice(0, start) + sym + el.value.slice(end);
            el.selectionStart = el.selectionEnd = start + sym.length;
            el.focus();
            if (el === grammarInput) formatGrammarInput(); else formatStringInput();
        });
    });

    // ================================================================
    // Accordion Toggle Logic
    // ================================================================
    function setupToggle(triggerBtn, bodyEl) {
        if (!triggerBtn || !bodyEl) return;
        triggerBtn.addEventListener("click", () => {
            const isOpen = !bodyEl.classList.contains("exp-collapsed");
            if (isOpen) { bodyEl.classList.add("exp-collapsed"); triggerBtn.setAttribute("aria-expanded", "false"); }
            else { bodyEl.classList.remove("exp-collapsed"); triggerBtn.setAttribute("aria-expanded", "true"); }
        });
    }
    setupToggle(inlineTreeToggle, inlineTreeBody);
    setupToggle(explanationToggleBtn, explanationBody);

    // ================================================================
    // Unified Toggle All Button (single button that toggles state)
    // ================================================================
    document.addEventListener("click", (e) => {
        const toggleBtn = e.target.closest(".step-exp-toggle-all");
        if (!toggleBtn) return;
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (!container) return;
        const isExpanded = toggleBtn.textContent.trim() === "Collapse All";
        if (isExpanded) {
            container.querySelectorAll(".step-explanation-body").forEach(b => b.classList.add("step-exp-collapsed"));
            container.querySelectorAll(".step-exp-arrow").forEach(a => a.classList.remove("expanded"));
            toggleBtn.textContent = "Expand All";
        } else {
            container.querySelectorAll(".step-explanation-body").forEach(b => b.classList.remove("step-exp-collapsed"));
            container.querySelectorAll(".step-exp-arrow").forEach(a => a.classList.add("expanded"));
            toggleBtn.textContent = "Collapse All";
        }
    });

    // ================================================================
    // View Mode Switching
    // ================================================================
    const PANELS = { lmd: panelLmd, rmd: panelRmd, tree: panelTree, all: panelAll };
    function switchView(view) {
        currentView = view;
        viewModeBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
        Object.entries(PANELS).forEach(([k, el]) => { if (!el) return; if (k === view) el.classList.remove("hidden"); else el.classList.add("hidden"); });
        if (currentData) renderTreeForStep(currentStep);
    }
    viewModeBtns.forEach(btn => { btn.addEventListener("click", () => switchView(btn.dataset.view)); });

    // ================================================================
    // Reset / Clear
    // ================================================================
    resetBtn.addEventListener("click", () => { grammarInput.value = ""; stringInput.value = ""; if (examplesDropdown) examplesDropdown.value = ""; clearOutput(); });

    function collapseEl(bodyEl, toggleBtn) { if (!bodyEl) return; bodyEl.classList.add("exp-collapsed"); if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false"); }

    function clearOutput() {
        stopAnimation();
        outputSection.classList.add("hidden");
        animSettings.classList.add("hidden");
        errorMsg.classList.add("hidden");
        if (lmdContainer) lmdContainer.innerHTML = "";
        if (rmdContainer) rmdContainer.innerHTML = "";
        if (lmdNone) lmdNone.classList.add("hidden");
        if (rmdNone) rmdNone.classList.add("hidden");
        if (treeSvg) treeSvg.innerHTML = "";
        if (lmdContainerAll) lmdContainerAll.innerHTML = "";
        if (rmdContainerAll) rmdContainerAll.innerHTML = "";
        if (lmdNoneAll) lmdNoneAll.classList.add("hidden");
        if (rmdNoneAll) rmdNoneAll.classList.add("hidden");
        if (treeSvgAll) treeSvgAll.innerHTML = "";
        if (inlineTreeList) inlineTreeList.innerHTML = "";
        if (expTreeList) expTreeList.innerHTML = "";
        collapseEl(inlineTreeBody, inlineTreeToggle);
        collapseEl(explanationBody, explanationToggleBtn);
        // Reset toggle buttons text
        document.querySelectorAll(".step-exp-toggle-all").forEach(b => b.textContent = "Expand All");
        animateBtn.disabled = true;
        pauseBtn.disabled = true;
        pauseBtn.textContent = "Pause";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        stepCounter.textContent = "Step 0 / 0";
        currentData = null;
        currentStep = 0;
        maxSteps = 0;
        nonTerminals = [];
    }

    // ================================================================
    // Derive -- fetch + render
    // ================================================================
    deriveBtn.addEventListener("click", async () => {
        clearOutput();
        deriveBtn.disabled = true;
        deriveBtn.textContent = "Deriving\u2026";
        try {
            const res = await fetch("/derive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grammar: grammarInput.value, input_string: stringInput.value }),
            });
            const data = await res.json();
            if (data.error) { showError(data.error); return; }
            currentData = data;
            nonTerminals = data.non_terminals || [];
            renderAll(data);
            outputSection.classList.remove("hidden");
            animSettings.classList.remove("hidden");
            animateBtn.disabled = false;
            switchView("lmd");
            startAnimation();
        } catch (e) {
            showError("Network error -- is the server running?");
        } finally {
            deriveBtn.disabled = false;
            deriveBtn.textContent = "Derive";
        }
    });

    function showError(msg) { errorMsg.textContent = msg; errorMsg.classList.remove("hidden"); }

    // ================================================================
    // Render Everything
    // ================================================================
    function renderAll(data) {
        buildStepDom(data.lmd_steps, lmdContainer, lmdNone, data.lmd_explanations, "lmd");
        buildStepDom(data.rmd_steps, rmdContainer, rmdNone, data.rmd_explanations, "rmd");
        buildStepDom(data.lmd_steps, lmdContainerAll, lmdNoneAll, data.lmd_explanations, "lmd");
        buildStepDom(data.rmd_steps, rmdContainerAll, rmdNoneAll, data.rmd_explanations, "rmd");

        maxSteps = Math.max(
            data.lmd_steps ? data.lmd_steps.length : 0,
            data.rmd_steps ? data.rmd_steps.length : 0
        );
        buildExplanationList(data.tree_explanations || [], inlineTreeList);
        buildExplanationList(data.tree_explanations || [], expTreeList);
    }

    // ================================================================
    // Build Step DOM with color coding and inline explanations
    // ================================================================
    function buildStepDom(steps, container, noneEl, explanations, mode) {
        if (!container) return;
        container.innerHTML = "";
        if (!steps || steps.length === 0) { if (noneEl) noneEl.classList.remove("hidden"); return; }
        if (noneEl) noneEl.classList.add("hidden");
        const expArr = explanations || [];
        const nts = new Set(nonTerminals);

        steps.forEach((tokens, idx) => {
            const wrapper = document.createElement("div");
            wrapper.className = "step-wrapper";
            wrapper.dataset.step = idx;

            const div = document.createElement("div");
            div.className = "step-line";
            div.dataset.step = idx;

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

            // Find which NT will be expanded next (for highlighting)
            let expandingIdx = -1;
            if (idx < steps.length - 1) {
                if (mode === "lmd") {
                    for (let k = 0; k < tokens.length; k++) {
                        if (tokens[k].is_nt) { expandingIdx = k; break; }
                    }
                } else {
                    for (let k = tokens.length - 1; k >= 0; k--) {
                        if (tokens[k].is_nt) { expandingIdx = k; break; }
                    }
                }
            }

            tokens.forEach((t, ti) => {
                const s = document.createElement("span");
                s.textContent = t.sym + " ";
                // Base type class
                if (t.sym === "\u03b5") {
                    s.className = "sym-eps";
                } else if (t.is_nt) {
                    s.className = "sym-nt";
                } else {
                    s.className = "sym-terminal";
                }
                // Highlight newly produced
                if (t.hl) s.classList.add("hl-new");
                // Mark the NT being expanded next
                if (ti === expandingIdx) s.classList.add("sym-expanding");
                div.appendChild(s);
            });

            // Toggle arrow for explanation
            if (expArr[idx]) {
                const expToggle = document.createElement("button");
                expToggle.className = "step-exp-arrow";
                expToggle.innerHTML = "\u25bc";
                expToggle.title = "Toggle explanation";
                div.appendChild(expToggle);
            }

            // Make entire row clickable to toggle explanation
            div.addEventListener("click", (e) => {
                if (e.target.closest(".step-exp-arrow")) return; // arrow handles itself
                const expBody = wrapper.querySelector(".step-explanation-body");
                const expArrow = div.querySelector(".step-exp-arrow");
                if (expBody) {
                    const isCollapsed = expBody.classList.contains("step-exp-collapsed");
                    if (isCollapsed) { expBody.classList.remove("step-exp-collapsed"); if (expArrow) expArrow.classList.add("expanded"); }
                    else { expBody.classList.add("step-exp-collapsed"); if (expArrow) expArrow.classList.remove("expanded"); }
                }
            });

            // Arrow click handler
            if (expArr[idx]) {
                const expToggle = div.querySelector(".step-exp-arrow");
                expToggle.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const expBody = wrapper.querySelector(".step-explanation-body");
                    if (expBody) {
                        const isCollapsed = expBody.classList.contains("step-exp-collapsed");
                        if (isCollapsed) { expBody.classList.remove("step-exp-collapsed"); expToggle.classList.add("expanded"); }
                        else { expBody.classList.add("step-exp-collapsed"); expToggle.classList.remove("expanded"); }
                    }
                });
            }

            wrapper.appendChild(div);

            // Inline explanation body
            if (expArr[idx]) {
                const expBody = document.createElement("div");
                expBody.className = "step-explanation-body step-exp-collapsed";
                const expContent = document.createElement("div");
                expContent.className = "step-explanation-content";
                expContent.innerHTML = expArr[idx];
                expBody.appendChild(expContent);
                wrapper.appendChild(expBody);
            }

            container.appendChild(wrapper);
        });
    }

    // ================================================================
    // Explanation List Builder (parse tree only)
    // ================================================================
    function buildExplanationList(explanations, listEl) {
        if (!listEl) return;
        listEl.innerHTML = "";
        if (!explanations || explanations.length === 0) { const li = document.createElement("li"); li.textContent = "No explanation available."; listEl.appendChild(li); return; }
        explanations.forEach(text => { const li = document.createElement("li"); const span = document.createElement("span"); span.innerHTML = text; li.appendChild(span); listEl.appendChild(li); });
    }

    // ================================================================
    // Step Navigation
    // ================================================================
    function goToStep(idx) {
        if (idx < 0) idx = 0;
        if (idx >= maxSteps) idx = maxSteps - 1;
        currentStep = idx;
        [lmdContainer, rmdContainer, lmdContainerAll, rmdContainerAll].forEach(container => {
            if (!container) return;
            container.querySelectorAll(".step-wrapper").forEach(el => {
                const stepIdx = parseInt(el.dataset.step);
                const stepLine = el.querySelector(".step-line");
                if (stepLine) {
                    stepLine.classList.toggle("visible", stepIdx <= idx);
                    stepLine.classList.toggle("active", stepIdx === idx);
                }
            });
            const activeEl = container.querySelector(".step-line.active");
            if (activeEl) activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        renderTreeForStep(idx);
        updateNav();
    }

    // ================================================================
    // Tree rendering
    // ================================================================
    function renderTreeForStep(stepIdx) {
        if (!currentData) return;
        if (currentView === "tree") {
            const trees = activeTree === "lmd" ? currentData.lmd_trees : currentData.rmd_trees;
            renderTree(trees && stepIdx < trees.length ? trees[stepIdx] : null, treeSvg, "arrowhead-focused");
        }
        if (currentView === "all") {
            const trees = activeTreeAll === "lmd" ? currentData.lmd_trees : currentData.rmd_trees;
            renderTree(trees && stepIdx < trees.length ? trees[stepIdx] : null, treeSvgAll, "arrowhead-all");
        }
    }

    function showAllSteps() {
        [lmdContainer, rmdContainer, lmdContainerAll, rmdContainerAll].forEach(container => {
            if (!container) return;
            container.querySelectorAll(".step-wrapper").forEach(el => {
                const stepLine = el.querySelector(".step-line");
                if (stepLine) { stepLine.classList.add("visible"); stepLine.classList.remove("active"); }
            });
            const last = container.querySelector(`.step-wrapper[data-step="${maxSteps - 1}"] .step-line`);
            if (last) last.classList.add("active");
        });
        currentStep = maxSteps - 1;
        renderTreeForStep(currentStep);
        updateNav();
    }

    // ================================================================
    // Animation
    // ================================================================
    pauseBtn.addEventListener("click", () => {
        if (animating) { animating = false; clearTimeout(animTimer); pauseBtn.textContent = "Resume"; }
        else if (currentStep < maxSteps - 1 && animateBtn.textContent === "Stop") { animating = true; pauseBtn.textContent = "Pause"; revealNextStep(); }
    });
    animateBtn.addEventListener("click", () => {
        if (animating || pauseBtn.textContent === "Resume") { stopAnimation(); showAllSteps(); return; }
        startAnimation();
    });
    function startAnimation() {
        if (!currentData) return;
        animating = true; animateBtn.textContent = "Stop"; pauseBtn.disabled = false; pauseBtn.textContent = "Pause";
        [lmdContainer, rmdContainer, lmdContainerAll, rmdContainerAll].forEach(c => { if (c) c.querySelectorAll(".step-line").forEach(el => el.classList.remove("visible", "active")); });
        if (treeSvg) treeSvg.innerHTML = "";
        if (treeSvgAll) treeSvgAll.innerHTML = "";
        currentStep = -1;
        revealNextStep();
    }
    function revealNextStep() {
        if (!animating) return;
        const nextIdx = currentStep + 1;
        if (nextIdx >= maxSteps) { animating = false; animateBtn.textContent = "Start Animation"; pauseBtn.disabled = true; pauseBtn.textContent = "Pause"; return; }
        goToStep(nextIdx);
        animTimer = setTimeout(revealNextStep, animSpeed);
    }
    function stopAnimation() {
        animating = false; clearTimeout(animTimer); animateBtn.textContent = "Start Animation"; pauseBtn.disabled = true; pauseBtn.textContent = "Pause";
    }

    // ================================================================
    // Prev / Next
    // ================================================================
    prevBtn.addEventListener("click", () => { stopAnimation(); if (currentStep > 0) goToStep(currentStep - 1); });
    nextBtn.addEventListener("click", () => { stopAnimation(); if (currentStep < maxSteps - 1) goToStep(currentStep + 1); });
    function updateNav() {
        stepCounter.textContent = `Step ${currentStep + 1} / ${maxSteps}`;
        prevBtn.disabled = currentStep <= 0;
        nextBtn.disabled = currentStep >= maxSteps - 1;
    }

    // ================================================================
    // Tree Tab Toggles
    // ================================================================
    treeTabBtns.forEach(btn => {
        btn.addEventListener("click", () => { treeTabBtns.forEach(b => b.classList.remove("active")); btn.classList.add("active"); activeTree = btn.dataset.tree; if (currentData) renderTreeForStep(currentStep); });
    });
    treeTabBtnsAll.forEach(btn => {
        btn.addEventListener("click", () => { treeTabBtnsAll.forEach(b => b.classList.remove("active")); btn.classList.add("active"); activeTreeAll = btn.dataset.tree; if (currentData) renderTreeForStep(currentStep); });
    });

    // ================================================================
    // SVG Parse Tree Renderer
    // ================================================================
    const NODE_RADIUS = 18;
    const H_GAP       = 14;
    const V_GAP       = 70;
    const ARROW_SIZE  = 8;

    function renderTree(tree, svgEl, markerId) {
        if (!svgEl) return;
        svgEl.innerHTML = "";
        if (!tree) {
            svgEl.setAttribute("width", 200); svgEl.setAttribute("height", 50);
            const t = mkSvg("text", { x: 100, y: 30, "text-anchor": "middle" }); t.textContent = "No tree available"; svgEl.appendChild(t);
            return;
        }
        const defs = mkSvg("defs", {});
        const marker = mkSvg("marker", {
            id: markerId, markerWidth: ARROW_SIZE, markerHeight: ARROW_SIZE,
            refX: 0, refY: ARROW_SIZE / 2, orient: "auto", markerUnits: "userSpaceOnUse"
        });
        const arrowPath = mkSvg("path", { d: `M 0 0 L ${ARROW_SIZE} ${ARROW_SIZE / 2} L 0 ${ARROW_SIZE} Z`, class: "arrow-marker" });
        marker.appendChild(arrowPath); defs.appendChild(marker); svgEl.appendChild(defs);

        assignWidth(tree);
        const depth = treeDepth(tree);
        const svgW = tree._w + 40, svgH = depth * V_GAP + 60;
        svgEl.setAttribute("width", svgW); svgEl.setAttribute("height", svgH);
        svgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
        assignPos(tree, 20, 35, tree._w);
        drawEdges(tree, svgEl, markerId);
        drawNodes(tree, svgEl);

        requestAnimationFrame(() => {
            svgEl.querySelectorAll(".tree-node").forEach(el => el.classList.add("node-visible"));
            svgEl.querySelectorAll(".tree-edge-group").forEach(el => el.classList.add("edge-visible"));
        });
    }

    function assignWidth(node) {
        if (!node.children || node.children.length === 0) { node._w = NODE_RADIUS * 2 + H_GAP; return; }
        let total = 0;
        node.children.forEach(c => { assignWidth(c); total += c._w; });
        total += H_GAP * (node.children.length - 1);
        node._w = Math.max(total, NODE_RADIUS * 2 + H_GAP);
    }
    function assignPos(node, x, y, availW) {
        node._x = x + availW / 2; node._y = y;
        if (!node.children || node.children.length === 0) return;
        let childrenW = 0;
        node.children.forEach(c => childrenW += c._w);
        childrenW += H_GAP * (node.children.length - 1);
        let cx = x + (availW - childrenW) / 2;
        node.children.forEach(c => { assignPos(c, cx, y + V_GAP, c._w); cx += c._w + H_GAP; });
    }

    function drawEdges(node, svgEl, markerId) {
        if (!node.children) return;
        node.children.forEach(child => {
            const x1 = node._x, y1 = node._y + NODE_RADIUS;
            const x2 = child._x, y2 = child._y - NODE_RADIUS;
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const endX = x2 - (dx / len) * ARROW_SIZE;
            const endY = y2 - (dy / len) * ARROW_SIZE;
            const g = mkSvg("g", { class: "tree-edge-group" });
            const line = mkSvg("line", { x1, y1, x2: endX, y2: endY, class: "edge", "marker-end": `url(#${markerId})` });
            g.appendChild(line); svgEl.appendChild(g);
            drawEdges(child, svgEl, markerId);
        });
    }

    function drawNodes(node, svgEl) {
        const isTerminal = !node.children || node.children.length === 0;
        const isEpsilon  = node.symbol === "\u03b5";
        const g = mkSvg("g", { class: "tree-node " + (isEpsilon ? "node-epsilon" : (isTerminal ? "node-terminal" : "")) });
        const circle = mkSvg("circle", { cx: node._x, cy: node._y, r: NODE_RADIUS, class: "node-circle" });
        g.appendChild(circle);
        const text = mkSvg("text", { x: node._x, y: node._y + 5, "text-anchor": "middle" });
        text.textContent = node.symbol;
        g.appendChild(text);
        svgEl.appendChild(g);
        if (node.children) node.children.forEach(c => drawNodes(c, svgEl));
    }

    function mkSvg(tag, attrs) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v));
        return el;
    }
    function treeDepth(node) {
        if (!node.children || node.children.length === 0) return 1;
        return 1 + Math.max(...node.children.map(treeDepth));
    }
})();
