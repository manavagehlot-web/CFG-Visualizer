"""
CFG Derivation & Parse Tree Visualizer
Flask backend — Earley parser for recognition + derivation extraction.
Handles ambiguous and recursive grammars efficiently (O(n^3)).
Includes grammar ambiguity detection.
"""

from flask import Flask, render_template, request, jsonify
import copy, time
from collections import defaultdict, deque

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Grammar Parsing
# ---------------------------------------------------------------------------

def parse_grammar(raw_text: str):
    grammar = {}
    start_symbol = None
    non_terminals = set()

    lines = [l.strip() for l in raw_text.strip().splitlines() if l.strip()]
    if not lines:
        return None, None, None, "Grammar is empty."

    for line in lines:
        line = line.replace("->", "\u2192").replace("::=", "\u2192")
        if "\u2192" not in line:
            return None, None, None, f"Invalid rule (missing \u2192): {line}"

        head, body = line.split("\u2192", 1)
        head = head.strip()
        if not head:
            return None, None, None, f"Rule has empty left-hand side: {line}"

        non_terminals.add(head)
        if start_symbol is None:
            start_symbol = head

        alternatives = body.split("|")
        for alt in alternatives:
            symbols = alt.strip().split()
            symbols = [s if s not in ("\u03b5", "epsilon", "eps", "\u03f5") else "\u03b5" for s in symbols]
            if not symbols:
                symbols = ["\u03b5"]
            grammar.setdefault(head, []).append(symbols)

    return grammar, start_symbol, non_terminals, None


def is_nt(symbol, non_terminals):
    return symbol in non_terminals


# ---------------------------------------------------------------------------
# Earley Parser -- recognition + parse tree extraction
# ---------------------------------------------------------------------------

class EarleyItem:
    """An Earley item: [head -> pre_dot . post_dot, origin]"""
    __slots__ = ['head', 'rule', 'dot', 'origin', 'tree']

    def __init__(self, head, rule, dot, origin, tree=None):
        self.head = head
        self.rule = rule      # tuple of symbols
        self.dot = dot        # position of dot in rule
        self.origin = origin  # chart position where this item started
        self.tree = tree      # parse tree node

    def next_symbol(self):
        if self.dot < len(self.rule):
            sym = self.rule[self.dot]
            if sym == "\u03b5":
                return None  # epsilon counts as completed
            return sym
        return None

    def is_complete(self):
        for i in range(self.dot, len(self.rule)):
            if self.rule[i] != "\u03b5":
                return False
        return True

    def key(self):
        return (self.head, self.rule, self.dot, self.origin)

    def __eq__(self, other):
        return self.key() == other.key()

    def __hash__(self):
        return hash(self.key())


def earley_parse(grammar, start, tokens, non_terminals):
    """
    Earley parser. Returns a parse tree or None.
    tokens = list of terminal symbols (already split by spaces).
    """
    n = len(tokens)

    # Chart: list of sets, one per position 0..n
    chart = [dict() for _ in range(n + 1)]  # key -> EarleyItem

    def add_item(item, pos):
        k = item.key()
        if k not in chart[pos]:
            chart[pos][k] = item
            return True
        return False

    # Initialize: S' -> . S, 0
    for prod in grammar.get(start, []):
        prod_t = tuple(prod)
        tree = {"symbol": start, "children": [], "_prod": prod_t}
        item = EarleyItem(start, prod_t, 0, 0, tree)
        add_item(item, 0)

    for i in range(n + 1):
        changed = True
        while changed:
            changed = False
            items = list(chart[i].values())
            for item in items:
                if item.is_complete():
                    for prev_item in list(chart[item.origin].values()):
                        ns = prev_item.next_symbol()
                        if ns == item.head:
                            new_tree = _copy_tree(prev_item.tree)
                            new_tree["children"].append(_copy_tree(item.tree))
                            new_item = EarleyItem(
                                prev_item.head, prev_item.rule,
                                prev_item.dot + 1, prev_item.origin,
                                new_tree
                            )
                            if add_item(new_item, i):
                                changed = True
                else:
                    ns = item.next_symbol()
                    if ns is None:
                        continue
                    if is_nt(ns, non_terminals):
                        for prod in grammar.get(ns, []):
                            prod_t = tuple(prod)
                            tree = {"symbol": ns, "children": [], "_prod": prod_t}
                            new_item = EarleyItem(ns, prod_t, 0, i, tree)
                            if add_item(new_item, i):
                                changed = True
                    else:
                        pass

        if i < n:
            tok = tokens[i]
            for item in list(chart[i].values()):
                ns = item.next_symbol()
                if ns is not None and not is_nt(ns, non_terminals) and ns == tok:
                    new_tree = _copy_tree(item.tree)
                    new_tree["children"].append({"symbol": tok, "children": []})
                    new_item = EarleyItem(
                        item.head, item.rule,
                        item.dot + 1, item.origin,
                        new_tree
                    )
                    add_item(new_item, i + 1)

    for item in chart[n].values():
        if item.head == start and item.origin == 0 and item.is_complete():
            return _clean_tree(item.tree)

    return None


def _copy_tree(tree):
    """Shallow copy of a tree node with deep-copied children list."""
    return {
        "symbol": tree["symbol"],
        "children": list(tree["children"]),  # shallow copy of list
        "_prod": tree.get("_prod"),
    }


def _clean_tree(tree):
    """Remove internal _prod keys and handle epsilon children."""
    result = {"symbol": tree["symbol"], "children": []}
    if tree.get("_prod"):
        if tree["_prod"] == ("\u03b5",) and not tree["children"]:
            result["children"] = [{"symbol": "\u03b5", "children": []}]
            return result
    for child in tree["children"]:
        result["children"].append(_clean_tree(child))
    if tree.get("_prod"):
        for sym in tree["_prod"]:
            if sym == "\u03b5":
                has_epsilon = any(c["symbol"] == "\u03b5" for c in result["children"])
                if not has_epsilon:
                    result["children"].append({"symbol": "\u03b5", "children": []})
    return result


# ---------------------------------------------------------------------------
# Earley parser that finds multiple parse trees (for ambiguity detection)
# ---------------------------------------------------------------------------

def _trees_structurally_equal(t1, t2):
    """Check if two parse trees have the same structure."""
    if t1["symbol"] != t2["symbol"]:
        return False
    c1 = t1.get("children", [])
    c2 = t2.get("children", [])
    if len(c1) != len(c2):
        return False
    for a, b in zip(c1, c2):
        if not _trees_structurally_equal(a, b):
            return False
    return True


def earley_parse_multi(grammar, start, tokens, non_terminals, max_trees=2):
    """
    Modified Earley parser that finds up to max_trees distinct parse trees.
    Returns a list of cleaned parse trees.
    """
    n = len(tokens)

    # chart[pos] maps key -> list of EarleyItems (up to max_trees per key)
    chart = [defaultdict(list) for _ in range(n + 1)]

    def add_item(item, pos):
        k = item.key()
        items_list = chart[pos][k]
        if len(items_list) >= max_trees:
            return False
        for existing in items_list:
            if _trees_structurally_equal(existing.tree, item.tree):
                return False
        items_list.append(item)
        return True

    for prod in grammar.get(start, []):
        prod_t = tuple(prod)
        tree = {"symbol": start, "children": [], "_prod": prod_t}
        item = EarleyItem(start, prod_t, 0, 0, tree)
        add_item(item, 0)

    for i in range(n + 1):
        changed = True
        safety = 0
        while changed and safety < 8000:
            changed = False
            safety += 1
            all_items = []
            for key_items in chart[i].values():
                all_items.extend(list(key_items))

            for item in all_items:
                if item.is_complete():
                    for key_items in list(chart[item.origin].values()):
                        for prev_item in list(key_items):
                            ns = prev_item.next_symbol()
                            if ns == item.head:
                                new_tree = _copy_tree(prev_item.tree)
                                new_tree["children"].append(_copy_tree(item.tree))
                                new_item = EarleyItem(
                                    prev_item.head, prev_item.rule,
                                    prev_item.dot + 1, prev_item.origin,
                                    new_tree
                                )
                                if add_item(new_item, i):
                                    changed = True
                else:
                    ns = item.next_symbol()
                    if ns is None:
                        continue
                    if is_nt(ns, non_terminals):
                        for prod in grammar.get(ns, []):
                            prod_t = tuple(prod)
                            tree = {"symbol": ns, "children": [], "_prod": prod_t}
                            new_item = EarleyItem(ns, prod_t, 0, i, tree)
                            if add_item(new_item, i):
                                changed = True

        if i < n:
            tok = tokens[i]
            all_items = []
            for key_items in chart[i].values():
                all_items.extend(list(key_items))
            for item in all_items:
                ns = item.next_symbol()
                if ns is not None and not is_nt(ns, non_terminals) and ns == tok:
                    new_tree = _copy_tree(item.tree)
                    new_tree["children"].append({"symbol": tok, "children": []})
                    new_item = EarleyItem(
                        item.head, item.rule,
                        item.dot + 1, item.origin,
                        new_tree
                    )
                    add_item(new_item, i + 1)

    results = []
    seen_trees = []
    for key, items_list in chart[n].items():
        for item in items_list:
            if item.head == start and item.origin == 0 and item.is_complete():
                cleaned = _clean_tree(item.tree)
                is_dup = False
                for existing in seen_trees:
                    if _trees_structurally_equal(existing, cleaned):
                        is_dup = True
                        break
                if not is_dup:
                    seen_trees.append(cleaned)
                    results.append(cleaned)
                    if len(results) >= max_trees:
                        return results

    return results


# ---------------------------------------------------------------------------
# Generate strings from grammar for ambiguity testing
# ---------------------------------------------------------------------------

def generate_strings(grammar, start, non_terminals, max_length=6,
                     max_count=200, max_iter=30000):
    """
    Generate terminal strings derivable from the grammar using BFS
    over leftmost derivation. Returns a list of token lists.
    """
    queue = deque()
    initial = tuple([start])
    queue.append(initial)

    seen = set()
    seen.add(initial)
    strings = []
    strings_set = set()
    iterations = 0

    while queue and len(strings) < max_count and iterations < max_iter:
        iterations += 1
        form = queue.popleft()

        has_nt_sym = any(s in non_terminals for s in form)

        if not has_nt_sym:
            clean = tuple(s for s in form if s != "\u03b5")
            if clean not in strings_set:
                strings_set.add(clean)
                strings.append(list(clean))
            continue

        terminal_count = sum(1 for s in form if s not in non_terminals and s != "\u03b5")
        if terminal_count > max_length:
            continue

        if len(form) > max_length + 10:
            continue

        for i, sym in enumerate(form):
            if sym in non_terminals:
                for prod in grammar.get(sym, []):
                    new_form = form[:i] + tuple(prod) + form[i+1:]
                    if new_form not in seen:
                        seen.add(new_form)
                        queue.append(new_form)
                break

    strings.sort(key=len)
    return strings


# ---------------------------------------------------------------------------
# Ambiguity detection
# ---------------------------------------------------------------------------

def check_grammar_ambiguity(grammar, start, non_terminals, max_length=6):
    """
    Check if a grammar is ambiguous by generating strings and looking
    for ones that have multiple distinct parse trees.
    """
    strings = generate_strings(grammar, start, non_terminals,
                               max_length=max_length)

    for tokens in strings:
        try:
            trees = earley_parse_multi(grammar, start, tokens,
                                       non_terminals, max_trees=2)
        except Exception:
            continue

        if len(trees) >= 2:
            try:
                lmd1_raw = extract_derivation(trees[0], non_terminals, leftmost=True)
                lmd1 = [[{"sym": s, "hl": h, "is_nt": s in non_terminals}
                         for s, h in step] for step in lmd1_raw]

                lmd2_raw = extract_derivation(trees[1], non_terminals, leftmost=True)
                lmd2 = [[{"sym": s, "hl": h, "is_nt": s in non_terminals}
                         for s, h in step] for step in lmd2_raw]
            except Exception:
                lmd1, lmd2 = None, None

            diverge_idx = 0
            if lmd1 and lmd2:
                min_len = min(len(lmd1), len(lmd2))
                for j in range(min_len):
                    step1_syms = [t["sym"] for t in lmd1[j]]
                    step2_syms = [t["sym"] for t in lmd2[j]]
                    if step1_syms != step2_syms:
                        diverge_idx = j
                        break
                    diverge_idx = j + 1

            return {
                "ambiguous": True,
                "string": " ".join(tokens) if tokens else "\u03b5",
                "derivation1": lmd1,
                "derivation2": lmd2,
                "tree1": trees[0],
                "tree2": trees[1],
                "diverge_index": diverge_idx,
                "non_terminals": sorted(list(non_terminals)),
            }

    return {
        "ambiguous": False,
        "strings_tested": len(strings),
        "message": f"No ambiguity detected. Tested {len(strings)} strings up to length {max_length}."
    }


# ---------------------------------------------------------------------------
# Extract LMD / RMD step-by-step derivation from parse tree
# ---------------------------------------------------------------------------

def extract_derivation(tree, non_terminals, leftmost=True):
    """
    Given a parse tree, extract a step-by-step derivation.
    Returns list of (sentential_form, highlighted_indices).
    """
    def get_leaves(node):
        """Get leaf symbols of a subtree."""
        if not node["children"]:
            return [node["symbol"]]
        result = []
        for child in node["children"]:
            result.extend(get_leaves(child))
        return result

    initial = [("nt", tree)]
    steps = []

    form_display = [(tree["symbol"], False)]
    steps.append(form_display)

    current_form = initial

    while True:
        nt_idx = None
        if leftmost:
            for i, (kind, val) in enumerate(current_form):
                if kind == "nt":
                    nt_idx = i
                    break
        else:
            for i in range(len(current_form) - 1, -1, -1):
                if current_form[i][0] == "nt":
                    nt_idx = i
                    break

        if nt_idx is None:
            break

        _, nt_node = current_form[nt_idx]
        children = nt_node["children"]

        replacement = []
        for child in children:
            if child["children"]:
                replacement.append(("nt", child))
            else:
                replacement.append(("terminal", child["symbol"]))

        new_form = current_form[:nt_idx] + replacement + current_form[nt_idx + 1:]

        display = []
        for i, (kind, val) in enumerate(new_form):
            if kind == "nt":
                sym = val["symbol"]
            else:
                sym = val
            is_new = nt_idx <= i < nt_idx + len(replacement)
            display.append((sym, is_new))

        steps.append(display)
        current_form = new_form

    return steps


# ---------------------------------------------------------------------------
# Build per-step tree snapshots from derivation steps
# ---------------------------------------------------------------------------

def build_tree_snapshots(tree, non_terminals, leftmost=True):
    """
    Given a full parse tree, build incremental tree snapshots that
    show the tree growing step by step as each NT is expanded.
    """
    def make_node(sym):
        return {"symbol": sym, "children": []}

    expansion_order = []

    def collect_expansion_order(node):
        if not node["children"]:
            return
        expansion_order.append(id(node))
        if leftmost:
            for child in node["children"]:
                collect_expansion_order(child)
        else:
            for child in reversed(node["children"]):
                collect_expansion_order(child)

    collect_expansion_order(tree)

    expanded_set = set()
    snapshots = []

    snapshots.append(make_node(tree["symbol"]))

    def build_partial(full_node):
        """Build partial tree showing only expanded NTs."""
        partial = make_node(full_node["symbol"])
        if id(full_node) in expanded_set and full_node["children"]:
            for child in full_node["children"]:
                partial["children"].append(build_partial(child))
        return partial

    for node_id in expansion_order:
        expanded_set.add(node_id)
        snapshots.append(build_partial(tree))

    return snapshots


# ---------------------------------------------------------------------------
# Generate human-readable explanations for derivation steps
# ---------------------------------------------------------------------------

def generate_derivation_explanation(steps_raw, grammar, non_terminals, leftmost=True):
    """
    Given the raw derivation steps (list of (symbol, highlighted) pairs per step),
    produce a list of human-readable explanation strings -- one per step-transition.
    """
    mode = "leftmost" if leftmost else "rightmost"
    direction = "left" if leftmost else "right"
    explanations = []

    if steps_raw:
        start_sym = steps_raw[0][0][0]  # first symbol of first step
        explanations.append(
            f"We begin with the start symbol <b>{start_sym}</b>. "
            f"In a {mode} derivation, at every step we always expand "
            f"the {direction}most non-terminal in the current sentential form."
        )

    for i in range(1, len(steps_raw)):
        prev = steps_raw[i - 1]   # list of (sym, hl)
        curr = steps_raw[i]

        prev_syms = [s for s, _ in prev]
        curr_syms = [s for s, _ in curr]
        highlighted = [s for s, h in curr if h]

        hl_start = next((j for j, (_, h) in enumerate(curr) if h), None)
        hl_end   = len(curr) - 1
        for j in range(len(curr) - 1, -1, -1):
            if curr[j][1]:
                hl_end = j
                break

        expanded_nt = prev_syms[hl_start] if hl_start is not None and hl_start < len(prev_syms) else "?"
        rhs = " ".join(highlighted) if highlighted else "\u03b5"

        nt_positions = [j for j, s in enumerate(prev_syms) if s in non_terminals]
        nt_count = len(nt_positions)

        if nt_count == 0:
            note = ""
        elif nt_count == 1:
            note = f"There is only one non-terminal (<b>{expanded_nt}</b>) in the sentential form, so it must be expanded next. "
        else:
            if leftmost:
                note = (
                    f"The sentential form has {nt_count} non-terminals. "
                    f"Following the leftmost rule, we pick the first one from the left: <b>{expanded_nt}</b>. "
                )
            else:
                note = (
                    f"The sentential form has {nt_count} non-terminals. "
                    f"Following the rightmost rule, we pick the last one from the right: <b>{expanded_nt}</b>. "
                )

        rule_str = f"{expanded_nt} \u2192 {rhs}"
        if highlighted == ["\u03b5"]:
            rule_note = (
                f"<b>{expanded_nt}</b> maps to <b>\u03b5</b> (the empty string), "
                f"meaning it produces nothing and is simply removed from the sentential form."
            )
        else:
            rule_note = (
                f"We apply the rule <b>{rule_str}</b>, replacing <b>{expanded_nt}</b> "
                f"with the sequence <b>{rhs}</b> in the sentential form."
            )

        new_terminals = [s for s in highlighted if s not in non_terminals and s != "\u03b5"]
        new_nts = [s for s in highlighted if s in non_terminals]
        result_note = ""
        if new_terminals and new_nts:
            result_note = (
                f" The new sentential form now contains terminals "
                f"({', '.join(f'<b>{t}</b>' for t in new_terminals)}) "
                f"and non-terminals "
                f"({', '.join(f'<b>{n}</b>' for n in new_nts)}) "
                f"that will need further expansion."
            )
        elif new_terminals:
            result_note = (
                f" The replacement consists entirely of terminals "
                f"({', '.join(f'<b>{t}</b>' for t in new_terminals)}), "
                f"so no further expansion is needed for this part."
            )
        elif new_nts:
            result_note = (
                f" The replacement is all non-terminals "
                f"({', '.join(f'<b>{n}</b>' for n in new_nts)}), "
                f"each of which will need to be expanded in future steps."
            )

        full_explanation = note + rule_note + result_note

        remaining_nts = [s for s, _ in curr if s in non_terminals]
        if not remaining_nts:
            full_explanation += (
                f" All non-terminals have now been fully expanded -- "
                f"the sentential form consists only of terminals, "
                f"completing the derivation."
            )

        explanations.append(full_explanation)

    return explanations


def generate_tree_explanation(snapshots, grammar, non_terminals):
    """
    Generate step-by-step explanations for how the parse tree was built,
    corresponding to each tree snapshot.
    """
    explanations = []
    if not snapshots:
        return explanations

    root_sym = snapshots[0]["symbol"] if snapshots else "S"
    explanations.append(
        f"The parse tree starts with a single root node: <b>{root_sym}</b>. "
        f"This is the start symbol of the grammar. "
        f"Every parse tree for this grammar must have <b>{root_sym}</b> as its root, "
        f"because all derivations begin from the start symbol."
    )

    def collect_leaves(node, path=""):
        """Collect leaf nodes (nodes with no children) as (symbol, path) pairs."""
        if not node.get("children"):
            return [(node["symbol"], path)]
        result = []
        for i, child in enumerate(node["children"]):
            result.extend(collect_leaves(child, path + f".{i}"))
        return result

    def find_expanded_node(prev, curr):
        """Find which leaf in prev was expanded (gained children) in curr."""
        def find_new_children(p_node, c_node):
            if not p_node.get("children") and c_node.get("children"):
                return p_node["symbol"], [ch["symbol"] for ch in c_node["children"]]
            for p_child, c_child in zip(p_node.get("children", []), c_node.get("children", [])):
                result = find_new_children(p_child, c_child)
                if result:
                    return result
            return None

        return find_new_children(prev, curr)

    for step_idx in range(1, len(snapshots)):
        prev_snap = snapshots[step_idx - 1]
        curr_snap = snapshots[step_idx]

        result = find_expanded_node(prev_snap, curr_snap)
        if result:
            parent_sym, children_syms = result
            children_display = " ".join(f"<b>{c}</b>" for c in children_syms)
            rhs = " ".join(children_syms)

            terminal_children = [c for c in children_syms if c not in non_terminals and c != "\u03b5"]
            nt_children = [c for c in children_syms if c in non_terminals]

            if children_syms == ["\u03b5"]:
                explanation = (
                    f"The node <b>{parent_sym}</b> (a leaf in the previous step) is now expanded "
                    f"using the rule <b>{parent_sym} \u2192 \u03b5</b>. "
                    f"An \u03b5-child is drawn beneath <b>{parent_sym}</b> to indicate it produces the empty string -- "
                    f"it contributes no actual tokens to the final string."
                )
            else:
                explanation = (
                    f"The node <b>{parent_sym}</b> is expanded using the rule "
                    f"<b>{parent_sym} \u2192 {rhs}</b>. "
                    f"Child nodes {children_display} are drawn beneath <b>{parent_sym}</b>. "
                )
                if terminal_children and nt_children:
                    explanation += (
                        f"Terminals ({', '.join(f'<b>{t}</b>' for t in terminal_children)}) "
                        f"are leaf nodes -- they appear at the bottom of the tree and can't be expanded further. "
                        f"Non-terminals ({', '.join(f'<b>{n}</b>' for n in nt_children)}) "
                        f"are internal nodes that still need to be expanded in subsequent steps."
                    )
                elif terminal_children:
                    explanation += (
                        f"All children ({', '.join(f'<b>{t}</b>' for t in terminal_children)}) "
                        f"are terminals -- they are leaf nodes and the tree is complete for this branch."
                    )
                elif nt_children:
                    explanation += (
                        f"All children ({', '.join(f'<b>{n}</b>' for n in nt_children)}) "
                        f"are non-terminals that will be expanded further in upcoming steps."
                    )
        else:
            explanation = "The tree is updated with the next expansion step."

        explanations.append(explanation)

    return explanations


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/tutorial")
def tutorial():
    return render_template("tutorial.html")

@app.route("/ambiguity")
def ambiguity():
    return render_template("ambiguity.html")


@app.route("/derive", methods=["POST"])
def derive():
    data = request.get_json(force=True)
    grammar_text = data.get("grammar", "").strip()
    input_string = data.get("input_string", "").strip()

    if not grammar_text:
        return jsonify({"error": "Please enter grammar rules."})

    grammar, start, non_terminals, err = parse_grammar(grammar_text)
    if err:
        return jsonify({"error": err})

    target_tokens = []
    epsilon_variants = {"\u03b5", "epsilon", "eps", "\u03f5", ""}
    if input_string in epsilon_variants or all(c in ' \t' for c in input_string):
        pass
    elif input_string:
        terminals = set()
        for rules in grammar.values():
            for rule in rules:
                for sym in rule:
                    if sym not in non_terminals and sym != "\u03b5":
                        terminals.add(sym)

        terminals_sorted = sorted(list(terminals), key=len, reverse=True)

        idx = 0
        while idx < len(input_string):
            while idx < len(input_string) and input_string[idx].isspace():
                idx += 1
            if idx >= len(input_string):
                break

            matched = False
            for term in terminals_sorted:
                if input_string.startswith(term, idx):
                    target_tokens.append(term)
                    idx += len(term)
                    matched = True
                    break

            if not matched:
                target_tokens.append(input_string[idx])
                idx += 1

    for tok in target_tokens:
        if tok in non_terminals:
            return jsonify({
                "error": f'Input symbol "{tok}" is a non-terminal. '
                         f'Input string should only contain terminal symbols.'
            })

    t0 = time.time()
    try:
        parse_tree = earley_parse(grammar, start, target_tokens, non_terminals)
    except Exception as e:
        parse_tree = None

    if parse_tree is None:
        return jsonify({
            "error": f'Derivation not possible: the string "{input_string}" '
                     f'cannot be derived from the given grammar. '
                     f'Please check your grammar rules and input string.'
        })

    try:
        lmd_steps_raw = extract_derivation(parse_tree, non_terminals, leftmost=True)
        lmd_steps = [[{"sym": s, "hl": h, "is_nt": s in non_terminals}
                      for s, h in step] for step in lmd_steps_raw]
        lmd_trees = build_tree_snapshots(parse_tree, non_terminals, leftmost=True)
    except Exception:
        lmd_steps, lmd_trees = None, None

    try:
        rmd_steps_raw = extract_derivation(parse_tree, non_terminals, leftmost=False)
        rmd_steps = [[{"sym": s, "hl": h, "is_nt": s in non_terminals}
                      for s, h in step] for step in rmd_steps_raw]
        rmd_trees = build_tree_snapshots(parse_tree, non_terminals, leftmost=False)
    except Exception:
        rmd_steps, rmd_trees = None, None

    if lmd_steps is None and rmd_steps is None:
        return jsonify({
            "error": f'Parse tree found but could not extract derivation steps.'
        })

    try:
        lmd_explanations = generate_derivation_explanation(
            lmd_steps_raw, grammar, non_terminals, leftmost=True
        ) if lmd_steps_raw else []
        rmd_explanations = generate_derivation_explanation(
            rmd_steps_raw, grammar, non_terminals, leftmost=False
        ) if rmd_steps_raw else []
        tree_explanations = generate_tree_explanation(
            lmd_trees, grammar, non_terminals
        ) if lmd_trees else []
    except Exception:
        lmd_explanations, rmd_explanations, tree_explanations = [], [], []

    return jsonify({
        "lmd_steps": lmd_steps,
        "rmd_steps": rmd_steps,
        "lmd_trees": lmd_trees,
        "rmd_trees": rmd_trees,
        "lmd_explanations": lmd_explanations,
        "rmd_explanations": rmd_explanations,
        "tree_explanations": tree_explanations,
        "non_terminals": sorted(list(non_terminals)),
        "error": None,
    })


@app.route("/check_ambiguity", methods=["POST"])
def check_ambiguity():
    data = request.get_json(force=True)
    grammar_text = data.get("grammar", "").strip()

    if not grammar_text:
        return jsonify({"error": "Please enter grammar rules."})

    grammar, start, non_terminals, err = parse_grammar(grammar_text)
    if err:
        return jsonify({"error": err})

    try:
        result = check_grammar_ambiguity(grammar, start, non_terminals,
                                         max_length=6)
    except Exception as e:
        return jsonify({"error": f"Ambiguity check failed: {str(e)}"})

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
