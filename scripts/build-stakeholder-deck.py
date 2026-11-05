"""Build a native, editable product review and an identical SVG web presentation."""

from html import escape
from pathlib import Path
import json

from PIL import Image, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
IMAGES = PUBLIC / "deck-images"
PPTX = PUBLIC / "Mathify-stakeholder-evidence.pptx"
INK = "#202124"
GRAY = "#5f6368"
BLUE = "#1a73e8"
GREEN = "#13795b"
AMBER = "#a14400"
LINE = "#dadce0"
PALE = "#f8fafd"
BLUE_PALE = "#eaf2ff"
GREEN_PALE = "#e7f4ed"
AMBER_PALE = "#fff1e5"
FONT = "Segoe UI"
FONT_PATH = Path(r"C:\Windows\Fonts")
W, H = 1600, 900
THAKUR = "https://aclanthology.org/2025.gem-1.33/"
YAMAUCHI = "https://aclanthology.org/2026.gem-main.19/"
FRONTIERS = "https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1837523/full"
GOOGLE = "https://services.google.com/fh/files/misc/goldman_sachs_keynote_google_cloud_thomas_kurian_021120.pdf"
SPARKS = "https://www.wearesparks.com/our-work/google-cloud-next/"
TEMPLATE = "https://www.slidescarnival.com/template/beatrice-free-presentation-template/66"
DEEPSEEK = "https://arxiv.org/html/2501.12948v1"
DEEPSEEK_RESULTS = "https://github.com/deepseek-ai/DeepSeek-R1#evaluation-results"
LANGSMITH = "https://docs.langchain.com/langsmith/evaluation"
PROMPTFOO = "https://www.promptfoo.dev/docs/configuration/expected-outputs/"
DEEPEVAL = "https://deepeval.com/docs/getting-started"
OPENMATH = "https://huggingface.co/datasets/nvidia/OpenMathReasoning"
OPENMATH_PAPER = "https://arxiv.org/abs/2504.16891"
ALPHAEVOLVE = "https://arxiv.org/abs/2506.13131"
SELF_VERIFY = "https://arxiv.org/abs/2212.09561"
COBBE = "https://arxiv.org/abs/2110.14168"
CITATIONS = [
    (
        "Cobbe, Karl, et al. \"Training Verifiers to Solve Math Word Problems.\"",
        "arXiv, 2021, arxiv.org/abs/2110.14168.",
        COBBE,
    ),
    (
        "DeepSeek-AI. \"DeepSeek-R1: Incentivizing Reasoning Capability in LLMs",
        "via Reinforcement Learning.\" arXiv, 2025, arxiv.org/abs/2501.12948.",
        "https://arxiv.org/abs/2501.12948",
    ),
    (
        "Moshkov, Ivan, et al. \"AIMO-2 Winning Solution: Building State-of-the-Art Mathematical",
        "Reasoning Models with OpenMathReasoning Dataset.\" arXiv, 2025, arxiv.org/abs/2504.16891.",
        OPENMATH_PAPER,
    ),
    (
        "Novikov, Alexander, et al. \"AlphaEvolve: A Coding Agent for Scientific",
        "and Algorithmic Discovery.\" arXiv, 2025, arxiv.org/abs/2506.13131.",
        ALPHAEVOLVE,
    ),
    (
        "NVIDIA. \"OpenMathReasoning.\" Hugging Face,",
        "huggingface.co/datasets/nvidia/OpenMathReasoning. Accessed 5 Nov. 2026.",
        OPENMATH,
    ),
    (
        "Weng, Yixuan, et al. \"Large Language Models Are Better Reasoners",
        "with Self-Verification.\" arXiv, 2023, arxiv.org/abs/2212.09561.",
        SELF_VERIFY,
    ),
    (
        "Confident AI. \"DeepEval 5-min Quickstart.\" DeepEval,",
        "deepeval.com/docs/getting-started. Accessed 5 Nov. 2026.",
        DEEPEVAL,
    ),
    (
        "LangChain. \"LangSmith Evaluation.\" LangChain Docs,",
        "docs.langchain.com/langsmith/evaluation. Accessed 5 Nov. 2026.",
        LANGSMITH,
    ),
    (
        "Promptfoo. \"Assertions and Metrics.\" Promptfoo,",
        "promptfoo.dev/docs/configuration/expected-outputs/. Accessed 5 Nov. 2026.",
        PROMPTFOO,
    ),
    (
        "Thakur, Aman Singh, et al. \"Judging the Judges: Evaluating Alignment",
        "and Vulnerabilities in LLMs-as-Judges.\" GEM, 2025, aclanthology.org/2025.gem-1.33/.",
        THAKUR,
    ),
    (
        "Yamauchi, Yusuke, et al. \"An Empirical Study of LLM-as-a-Judge: How Design Choices",
        "Impact Evaluation Reliability.\" GEM, 2026, aclanthology.org/2026.gem-main.19/.",
        YAMAUCHI,
    ),
    (
        "SlidesCarnival. \"Beatrice.\" SlidesCarnival, CC BY 4.0,",
        "slidescarnival.com/template/beatrice-free-presentation-template/66. Accessed 5 Nov. 2026.",
        TEMPLATE,
    ),
]
SLIDES = [
    {
        "section": "AI ARCHITECTURE",
        "title": "Generate, check, then review.",
        "source": "Intended automatic flow with API access. Checker exists; automatic triggering is not yet wired.",
        "script": "Alec has shown the product, so I'll focus on what happens behind the AI part. Read this diagram from left to right. The first AI call breaks the original problem into concepts and creates the first probe pair. Later pairs are generated as the student moves through the session. Code checks the format, and a separate AI call can review the content against the original problem. The architecture we're aiming for makes that review automatic after generation. The checker itself is built, but connecting it automatically is still work to do. This diagram is the intended flow with API access, not a claim that we've run it.",
    },
    {
        "section": "MATHEMATICAL CAPABILITY",
        "title": "AI has a strong foundation in mathematics.",
        "source": "Training scale, benchmark accuracy and research discovery are different kinds of evidence.",
        "script": "There are three reasons we're taking AI's maths capability seriously. First, the training resources are large. NVIDIA's OpenMathReasoning release contains 3.2 million generated reasoning solutions across 306,000 distinct problems from maths forums, including high-school olympiad material. Those are training examples, not millions of independently verified curriculum questions.\n\nSecond, there's measured performance. DeepSeek-R1 reports 97.3 percent pass@1 on MATH-500. That's a 500-problem competition-maths evaluation, not a million-problem test. Part of R1's training rewards correct mathematical answers, so the model learns from a concrete correctness signal.\n\nThird, these systems are contributing to research. In 2025, AlphaEvolve found a way to multiply two four-by-four complex matrices using 48 scalar multiplications rather than 49. That improved a record dating to Strassen's 1969 algorithm, after 56 years. It used a search system with automatic evaluation. That's a specific research advance, not a claim that a chatbot can solve any open proof.\n\nTogether, that's strong evidence of mathematical capability. It doesn't mean errors are impossible. These are different systems, and Mathify uses Claude. We still need to validate our generated questions and the tutor workflow. A few target-user sample cases and a short meeting with tutors would give us a much more relevant check. No tutor questionnaire responses have been received.\n\nIf asked about the benchmark: pass@1 is not success in any one of 64 attempts. The authors sample 64 responses per query to estimate pass@1 where sampling is required. The OpenMathReasoning authors also corrected their original 540,000-problem figure to 306,000 problems in the released solution set. We use the corrected number. We do not have live outputs and review records to substantiate a few-dozen-case 100 percent Mathify accuracy figure.",
        "links": [
            ["DeepSeek-R1 paper, January 2025", DEEPSEEK],
            ["Official evaluation results and sampling settings", DEEPSEEK_RESULTS],
            ["OpenMathReasoning dataset card, corrected problem count", OPENMATH],
            ["OpenMathReasoning paper", OPENMATH_PAPER],
            ["AlphaEvolve paper, abstract and section 3.1", ALPHAEVOLVE],
        ],
    },
    {
        "section": "AI CHECKER",
        "title": "A second pass can catch mistakes the first missed.",
        "source": "Weng et al.: GSM8K, code-davinci-002. Published experiment, not a Mathify improvement.",
        "script": "The checker's job is simple: look for mistakes before we rely on the generated material. It gets the original problem and checks the breakdown, answer keys, options, explanations, hints and whether the retry is actually simpler. It flags issues; it doesn't automatically fix them.\n\nThere's research behind separating writing an answer from checking it. Weng and colleagues tested self-verification on maths word problems. With code-davinci-002, their GSM8K result went from 60.81 percent to 65.14 percent, a gain of 4.33 percentage points. They generated candidate answers, worked backwards to see whether those answers fit the problem's conditions, and used that check to select an answer. That is more specific than just asking the model to try again.\n\nIn machine-learning terms, it's generate-and-verify: give the checking stage its own task and criteria. Checking an answer against constraints can be easier than finding it from scratch. Comparing several candidates also uses extra computation at answer time rather than changing the model's training. Earlier work by Cobbe and colleagues trained verifiers to select among candidate solutions and also found a benefit.\n\nOur checker follows the idea of a separate, criteria-based review, but it does not implement those papers' trained verifier or backward-selection method. We can't transfer their improvement figure to Mathify. It uses the same provider as generation, so both calls may share a blind spot. That's why we need to measure errors caught and good questions wrongly flagged, not just count how often it says everything is fine.",
        "links": [
            ["Weng et al., self-verification, table 1", SELF_VERIFY],
            ["Cobbe et al., trained verifier selection", COBBE],
            ["Thakur et al., 2025", THAKUR],
            ["Yamauchi et al., 2026", YAMAUCHI],
        ],
    },
    {
        "section": "EVALUATION TOOLS",
        "title": "Repeated tests make failures visible.",
        "source": "Available tooling, not current integrations or measured improvements.",
        "script": "This is where evaluation fits. A test harness is just a repeatable way to run the same problems, keep the outputs, and see what changed. It lets us measure both the generator and the checker instead of treating them as one black box.\n\nWe'd start with reviewed examples, run the generator and checker, inspect failures, change a prompt, then run the same tests again. We'd track correct answers, concept match, errors caught and false alarms. We'd also keep held-out examples for final evaluation, so we're not just tuning to the questions we've already seen.\n\nThere are tools for different parts of that work. LangSmith keeps traces of individual calls and compares runs. promptfoo repeats examples and checks expected outputs or rules. DeepEval organizes scoring against evaluation criteria. They're options, not three integrations we need at once, and they're not currently connected to Mathify. We already have a small local runner to build on.\n\nWe can start without tutor-labelled examples: check output structure, use problems with known answers, create deliberate mistakes and explore edge cases. Synthetic examples help us discover failures, but they don't independently validate real tutor use. Tutors don't block all technical testing; they are needed to judge whether our questions and workflow fit their work.\n\nThe useful ask is permission to pursue this, a small set of de-identified sample cases supplied with permission, and a short tutor meeting. Qualified reviewers would confirm the reference answers and probing pairs. We'd accept valid alternatives rather than exact wording. That would give us a manageable starting point, not a promise of effortless completion or guaranteed accuracy. These tools help us observe inputs, outputs and failures; they don't reveal every internal model calculation or improve the system automatically.",
        "links": [
            ["LangSmith evaluation", LANGSMITH],
            ["promptfoo assertions", PROMPTFOO],
            ["DeepEval quickstart", DEEPEVAL],
        ],
    },
    {
        "section": "WORKS CITED / 1 OF 2",
        "title": "Works cited: mathematics and verification.",
        "source": "MLA-style references. Links are clickable; full references are also in the notes.",
        "script": "These are the main research references. The dataset card gives the corrected OpenMathReasoning count; the original paper has a larger initial count, so it's important not to mix the two. The self-verification number is from Weng and colleagues' table one, for a specific model on GSM8K. AlphaEvolve's result concerns a specific matrix-multiplication algorithm, not a general claim that all AI reasoning is correct.",
        "links": [[f"{first} {second}", url] for first, second, url in CITATIONS[:6]],
    },
    {
        "section": "WORKS CITED / 2 OF 2",
        "title": "Works cited: evaluation tools and limits.",
        "source": "MLA-style references. No live Mathify accuracy claim or tutor questionnaire responses.",
        "links": [[f"{first} {second}", url] for first, second, url in CITATIONS[6:]] + [
            ["DeepSeek-R1 official evaluation settings", DEEPSEEK_RESULTS],
            ["Mathify research and test plan", "https://github.com/Jeff15321/mathify-brief/blob/feat/luke-excalidraw/docs/prompt-research.md"],
        ],
        "script": "These references cover the practical evaluation options and the limitations of AI judging. Tool documentation tells us what we could use; it isn't evidence that we've integrated a tool or measured a benefit. The judge papers are why we keep human-reviewed cases in the plan. Our project notes distinguish offline software checks from live accuracy evidence. The template attribution is retained here as well. There are still no tutor questionnaire responses.",
    },
]


class Canvas:
    def __init__(self):
        self.items = []

    def text(self, x, y, text, size=28, color=INK, bold=False, width=1456, url=None):
        self.items.append(dict(kind="text", x=x, y=y, text=text, size=size, color=color, bold=bold, width=width, url=url))

    def rect(self, x, y, width, height, fill="white", stroke=None, radius=0):
        self.items.append(dict(kind="rect", x=x, y=y, width=width, height=height, fill=fill, stroke=stroke, radius=radius))

    def line(self, x, y, x2, y2, color=LINE, weight=2):
        self.items.append(dict(kind="line", x=x, y=y, x2=x2, y2=y2, color=color, weight=weight))

    def circle(self, x, y, diameter, fill):
        self.items.append(dict(kind="circle", x=x, y=y, width=diameter, height=diameter, fill=fill))

    def image(self, x, y, width, height, name, alt):
        path = IMAGES / f"{name}.png"
        with Image.open(path) as image:
            scale = min(width / image.width, height / image.height)
            actual_w, actual_h = image.width * scale, image.height * scale
        self.items.append(dict(kind="image", x=x, y=y, width=actual_w, height=actual_h, name=name, alt=alt))


def header(c, data, number, background="white"):
    c.rect(0, 0, W, H, background)
    c.text(72, 40, f"MATHIFY   /   {data['section']}", 16, GRAY, width=1200)
    c.text(72, 100, data["title"], 50, width=1456)
    c.line(72, 829, 1528, 829)
    c.text(72, 847, data.get("source", "CSC308  /  Stakeholder review  /  November 2026"), 15, GRAY, width=1330)
    c.text(1470, 847, f"{number:02d}", 15, GRAY, width=58)


def tag(c, x, y, text, color=BLUE, fill=BLUE_PALE, width=210):
    c.rect(x, y, width, 38, fill, radius=10)
    c.text(x + 14, y + 6, text, 18, color, width=width - 28)


def make_scenes():
    scenes = []
    for i, data in enumerate(SLIDES, 1):
        c = Canvas()
        header(c, data, i, PALE if i == 1 else "white")
        if i == 1:
            c.text(72, 245, "INTENDED AUTOMATIC FLOW", 20, BLUE, width=1300)
            nodes = [
                (72, "Original problem", "Text + attachments", PALE),
                (452, "AI generator", "Concepts + probe pairs", BLUE_PALE),
                (832, "Code checks", "Fields + option IDs", GREEN_PALE),
                (1212, "AI checker", "Content review", BLUE_PALE),
            ]
            for x, name, detail, fill in nodes:
                c.rect(x, 325, 316, 165, fill, LINE, 12)
                c.text(x + 20, 356, name, 29, width=276)
                c.text(x + 20, 420, detail, 21, GRAY, width=276)
                if x < 1212:
                    c.text(x + 330, 380, "→", 30, BLUE, width=46)
            c.line(230, 490, 230, 570, GRAY)
            c.line(230, 570, 1370, 570, GRAY)
            c.line(1370, 570, 1370, 490, GRAY)
            c.text(463, 533, "Original problem also supplied to the checker", 21, GRAY, width=850)
            c.line(1370, 570, 1370, 640, BLUE)
            c.text(1356, 621, "↓", 28, BLUE, width=40)
            c.rect(913, 675, 615, 104, "white", LINE, 12)
            c.text(937, 695, "Review findings: flag issues for inspection", 24, width=565)
            c.text(72, 662, "First pair with analysis;\nlater pairs generated as needed.", 24, GRAY, width=780)
        elif i == 2:
            for x, stat, label, detail in [
                (72, "3.2M", "TRAINING SOLUTIONS", "306K distinct problems\nOpenMathReasoning\nIncludes high-school olympiad maths"),
                (572, "97.3%", "BENCHMARK ACCURACY", "DeepSeek-R1 / reported pass@1\nMATH-500: 500 problems\nNot a million-problem evaluation"),
                (1072, "56 years", "RESEARCH ADVANCE", "AlphaEvolve, 2025\n4 x 4 complex matrix product\n48 multiplications instead of 49"),
            ]:
                c.rect(x, 290, 456, 405, PALE, radius=12)
                c.text(x + 24, 317, stat, 70, BLUE, width=408)
                c.text(x + 24, 425, label, 19, BLUE, width=408)
                c.text(x + 24, 491, detail, 21, GRAY, width=408)
            c.text(72, 735, "Mathify uses Claude. These results show capability, not zero risk.", 27, width=1456)
            c.text(72, 782, "Target-use validation still needs reviewed sample cases and tutor input.", 22, GRAY, width=1456)
        elif i == 3:
            c.text(72, 245, "Purpose: flag wrong answers, unclear probes and misleading hints.", 28, width=1456)
            c.rect(72, 335, 730, 345, BLUE_PALE, radius=12)
            tag(c, 100, 360, "PUBLISHED SELF-VERIFICATION", width=390)
            c.text(100, 431, "60.81% → 65.14%", 55, BLUE, width=674)
            c.text(100, 522, "+4.33 percentage points on GSM8K", 29, width=674)
            c.text(100, 592, "Weng et al., 2023 / code-davinci-002", 23, GRAY, width=674)
            c.text(874, 343, "WHY A CHECKING PASS HELPS", 20, BLUE, width=654)
            for y, label in [
                (420, "Separate writing from checking"),
                (502, "Test against the original problem"),
                (584, "Use explicit criteria, not intuition"),
            ]:
                c.circle(877, y + 10, 10, BLUE)
                c.text(904, y, label, 26, width=624)
            c.text(72, 732, "The paper checks and selects candidate answers. Our checker flags issues.", 25, width=1456)
            c.text(72, 780, "Different method and model: the gain is not a Mathify result.", 23, GRAY, width=1456)
        elif i == 4:
            c.text(72, 245, "A repeatable test loop measures the generator and checker separately.", 28, width=1456)
            for y, tool, description in [
                (367, "LangSmith", "Inspect calls and compare prompt versions"),
                (487, "promptfoo", "Repeat examples; check answers and output rules"),
                (607, "DeepEval", "Score outputs against explicit criteria"),
            ]:
                c.text(72, y, tool, 30, BLUE, width=770)
                c.text(72, y + 50, description, 24, GRAY, width=770)
            c.line(874, 340, 874, 715)
            for j, label in enumerate([
                "Known-answer + reviewed examples",
                "Run generator + checker",
                "Inspect mistakes and edge cases",
                "Compare scores across versions",
                "Revise prompts, then test again",
            ]):
                y = 333 + j * 80
                c.rect(926, y, 602, 57, BLUE_PALE if j == 1 else PALE, radius=10)
                c.text(946, y + 12, label, 24, width=562)
                if j < 4:
                    c.text(1205, y + 55, "↓", 18, BLUE, width=44)
            c.text(72, 742, "Next: sample cases + a short tutor meeting + approval to pursue this.", 26, width=1456)
            c.text(72, 787, "We can start technical checks now. Tutors validate target-user fit.", 21, GRAY, width=1456)
        elif i in {5, 6}:
            citations = CITATIONS[:6] if i == 5 else CITATIONS[6:]
            for j, (first, second, url) in enumerate(citations):
                y = 235 + j * 94
                c.text(72, y, first, 23, width=1456, url=url)
                c.text(102, y + 34, second, 21, BLUE, width=1426, url=url)
        scenes.append(c)
    return scenes


def text_height(item):
    return len(item["text"].split("\n")) * item["size"] * 1.38 + 4


def validate_scene(canvas, index):
    for item in canvas.items:
        kind = item["kind"]
        if kind == "text":
            font = ImageFont.truetype(str(FONT_PATH / ("segoeuib.ttf" if item["bold"] else "segoeui.ttf")), item["size"])
            for line in item["text"].split("\n"):
                measured = font.getlength(line)
                if measured > item["width"] + 1:
                    raise ValueError(f"Slide {index}: text exceeds authored width: {line} ({measured:.0f} > {item['width']})")
            height = text_height(item)
        elif kind == "line":
            assert 0 <= item["x2"] <= W and 0 <= item["y2"] <= H
            continue
        else:
            height = item["height"]
        if item["x"] < 0 or item["y"] < 0 or item["x"] + item["width"] > W + 1 or item["y"] + height > H + 1:
            raise ValueError(f"Slide {index}: element outside slide: {item}")


def rgb(value):
    return RGBColor.from_string("FFFFFF" if value == "white" else value.lstrip("#"))


def inch(px):
    return Inches(px / 120)


def render_ppt(presentation, scenes):
    for slide_id in list(presentation.slides._sldIdLst):
        presentation.part.drop_rel(slide_id.rId)
        presentation.slides._sldIdLst.remove(slide_id)
    presentation.slide_width = inch(W)
    presentation.slide_height = inch(H)
    for index, (canvas, data) in enumerate(zip(scenes, SLIDES), 1):
        slide = presentation.slides.add_slide(presentation.slide_layouts[8])
        slide._element.set("showMasterSp", "0")
        for shape in list(slide.shapes):
            shape._element.getparent().remove(shape._element)
        for item in canvas.items:
            kind, x, y = item["kind"], inch(item["x"]), inch(item["y"])
            if kind == "image":
                picture = slide.shapes.add_picture(str(IMAGES / f"{item['name']}.png"), x, y, inch(item["width"]), inch(item["height"]))
                picture._element.xpath(".//p:cNvPr")[0].set("descr", item["alt"])
            elif kind == "text":
                shape = slide.shapes.add_textbox(x, y, inch(item["width"]), inch(text_height(item)))
                frame = shape.text_frame
                frame.word_wrap = False
                frame.margin_top = frame.margin_bottom = frame.margin_left = frame.margin_right = 0
                for j, line in enumerate(item["text"].split("\n")):
                    p = frame.paragraphs[0] if j == 0 else frame.add_paragraph()
                    p.text = line
                    p.alignment = PP_ALIGN.LEFT
                    p.space_before = p.space_after = Pt(0)
                    p.line_spacing = Pt(item["size"] * .6 * 1.38)
                    for run in p.runs:
                        run.font.name = FONT
                        run.font.size = Pt(item["size"] * .6)
                        run.font.bold = item["bold"]
                        run.font.color.rgb = rgb(item["color"])
                        if item.get("url"):
                            run.hyperlink.address = item["url"]
            elif kind == "line":
                shape = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x, y, inch(item["x2"]), inch(item["y2"]))
                shape.line.color.rgb = rgb(item["color"])
                shape.line.width = Pt(item["weight"] * .6)
            else:
                shape_type = MSO_SHAPE.OVAL if kind == "circle" else MSO_SHAPE.ROUNDED_RECTANGLE if item.get("radius") else MSO_SHAPE.RECTANGLE
                shape = slide.shapes.add_shape(shape_type, x, y, inch(item["width"]), inch(item["height"]))
                if kind == "rect" and item.get("radius"):
                    shape.adjustments[0] = min(.5, item["radius"] / min(item["width"], item["height"]))
                shape.fill.solid()
                shape.fill.fore_color.rgb = rgb(item["fill"])
                if item.get("stroke"):
                    shape.line.color.rgb = rgb(item["stroke"])
                    shape.line.width = Pt(1)
                else:
                    shape.line.fill.background()
        for shape in slide.shapes:
            for style in shape._element.xpath("./p:style"):
                shape._element.remove(style)
        notes = data["script"]
        if data.get("links"):
            notes += "\n\nReferences:\n" + "\n".join(f"{label}: {url}" for label, url in data["links"])
        slide.notes_slide.notes_text_frame.text = notes
    presentation.core_properties.title = "Mathify: AI reliability review"
    presentation.core_properties.subject = "AI reliability, evaluation limits, and workflow. Zero tutor responses."
    presentation.core_properties.comments = "Original layouts. Beatrice template lineage by SlidesCarnival, CC BY 4.0. Google design references only; no endorsement."
    presentation.save(PPTX)


def render_svg(canvas, index):
    content = []
    for item in canvas.items:
        kind, x, y = item["kind"], item["x"], item["y"]
        if kind == "text":
            lines = item["text"].split("\n")
            tspans = "".join(f'<tspan x="{x}" dy="{0 if j == 0 else item["size"] * 1.38}">{escape(line)}</tspan>' for j, line in enumerate(lines))
            text = f'<text x="{x}" y="{y + item["size"]}" font-size="{item["size"]}" font-weight="{600 if item["bold"] else 400}" fill="{item["color"]}">{tspans}</text>'
            if item.get("url"):
                text = f'<a href="{escape(item["url"], quote=True)}" target="_blank" rel="noopener noreferrer">{text}</a>'
            content.append(text)
        elif kind == "line":
            content.append(f'<line x1="{x}" y1="{y}" x2="{item["x2"]}" y2="{item["y2"]}" stroke="{item["color"]}" stroke-width="{item["weight"]}"/>')
        elif kind == "circle":
            content.append(f'<circle cx="{x + item["width"] / 2}" cy="{y + item["height"] / 2}" r="{item["width"] / 2}" fill="{item["fill"]}"/>')
        elif kind == "image":
            content.append(f'<image x="{x}" y="{y}" width="{item["width"]}" height="{item["height"]}" href="deck-images/{item["name"]}.png"><title>{escape(item["alt"])}</title></image>')
        else:
            content.append(f'<rect x="{x}" y="{y}" width="{item["width"]}" height="{item["height"]}" rx="{item["radius"]}" fill="{item["fill"]}" stroke="{item["stroke"] or "none"}"/>')
    return f'<svg class="slide-canvas" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title-{index:02d}" style="font-family:\'Segoe UI\',Arial,sans-serif">{"".join(content)}</svg>'


def render_html(scenes):
    sections = []
    for index, (canvas, data) in enumerate(zip(scenes, SLIDES), 1):
        refs = "".join(f'<li><a href="{escape(url)}">{escape(label)}</a></li>' for label, url in data.get("links", []))
        sections.append(f"""<section class="slide" id="slide-{index:02d}" aria-labelledby="title-{index:02d}">
<h2 id="title-{index:02d}" class="sr-only" tabindex="-1">{escape(data["title"].replace(chr(10), " "))}</h2>
{render_svg(canvas, index)}
<aside class="notes"><h3>Speaker script</h3>{''.join(f'<p>{escape(p)}</p>' for p in data["script"].split(chr(10) + chr(10)))}{f'<ul>{refs}</ul>' if refs else ''}</aside>
</section>""")
    html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mathify: AI reliability review</title><style>
*{box-sizing:border-box}body{margin:0;background:#e8eaed;color:#202124;font-family:"Segoe UI",Arial,sans-serif}
.toolbar{min-height:60px;display:flex;justify-content:center;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 16px}
button{font:inherit;font-size:14px;padding:8px 13px;border:1px solid #dadce0;border-radius:5px;background:white;color:#202124;cursor:pointer}
button:disabled{opacity:.4;cursor:default}a{color:#1764c0;text-underline-offset:3px}
button:focus-visible,a:focus-visible{outline:3px solid #1a73e8;outline-offset:3px}
main{width:min(1600px,calc(100vw - 32px),calc((100vh - 86px) * 1.777778));margin:0 auto 16px}
.slide{margin-bottom:24px;background:white}.js .slide[hidden]{display:none}
.slide-canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:white}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.notes{display:none;padding:28px 40px;border-top:1px solid #dadce0;max-width:1100px}
.show-notes .notes{display:block}.notes h3{font-size:21px;margin:0 0 16px}.notes p{font-size:19px;line-height:1.65}
.notes ul{font-size:16px;line-height:1.8;overflow-wrap:anywhere}#counter{font-size:14px;min-width:108px;text-align:center}
.toolbar a{font-size:14px}@media(max-width:600px){main{width:100%;margin-bottom:0}.toolbar{gap:6px;padding:8px}button,.toolbar a{font-size:12px}.notes{padding:20px}.notes p{font-size:17px}}
@media print{@page{size:A4 landscape;margin:0}body{background:white}.toolbar{display:none}main{width:100%;margin:0}.slide,.js .slide[hidden]{display:block!important;width:297mm;height:210mm;margin:0;break-after:page;page-break-after:always}.slide:last-child{break-after:auto;page-break-after:auto}.slide-canvas{width:297mm;height:167.0625mm;max-height:none;margin-top:21.46875mm}.notes{display:none!important}}
</style></head><body><nav class="toolbar" aria-label="Presentation controls">
<button id="prev" type="button">Previous</button><span id="counter" aria-live="polite"></span><button id="next" type="button">Next</button>
<button id="notes" type="button" aria-pressed="false">Speaker notes</button><button id="print" type="button">Print / Save PDF</button>
<a href="Mathify-stakeholder-evidence.pptx" download>Download PowerPoint</a></nav><main aria-label="Stakeholder presentation">
""" + "".join(sections) + """
</main><script>
(() => {
  const slides = [...document.querySelectorAll(".slide")];
  const previous = document.getElementById("prev"), next = document.getElementById("next");
  const notes = document.getElementById("notes"), counter = document.getElementById("counter");
  let index = 0;
  document.documentElement.classList.add("js");
  function show(target, focus = false) {
    index = Math.max(0, Math.min(slides.length - 1, target));
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    previous.disabled = index === 0; next.disabled = index === slides.length - 1;
    counter.textContent = `Slide ${index + 1} of ${slides.length}`;
    history.replaceState(null, "", `#${slides[index].id}`);
    if (focus) slides[index].querySelector("h2").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function fromHash() {
    const target = slides.findIndex(slide => `#${slide.id}` === location.hash);
    show(target < 0 ? 0 : target);
  }
  function toggleNotes() { notes.setAttribute("aria-pressed", String(document.body.classList.toggle("show-notes"))); }
  previous.addEventListener("click", () => show(index - 1, true));
  next.addEventListener("click", () => show(index + 1, true));
  notes.addEventListener("click", toggleNotes);
  document.getElementById("print").addEventListener("click", () => window.print());
  window.addEventListener("hashchange", fromHash);
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest("input,textarea,select,button,a")) return;
    if (["ArrowRight","PageDown","ArrowLeft","PageUp","Home","End","n","N","p","P"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowRight" || event.key === "PageDown") show(index + 1, true);
    if (event.key === "ArrowLeft" || event.key === "PageUp") show(index - 1, true);
    if (event.key === "Home") show(0, true);
    if (event.key === "End") show(slides.length - 1, true);
    if (event.key.toLowerCase() === "n") toggleNotes();
    if (event.key.toLowerCase() === "p") window.print();
  });
  fromHash();
})();
</script></body></html>"""
    (PUBLIC / "stakeholder-deck.html").write_text(html, encoding="utf-8")


def build():
    if len(SLIDES) != 6:
        raise ValueError("Expected six authored slides.")
    scenes = make_scenes()
    for index, canvas in enumerate(scenes, 1):
        validate_scene(canvas, index)
    if "\u2014" in json.dumps(SLIDES, ensure_ascii=False):
        raise ValueError("Speaker script contains an em dash.")
    render_ppt(Presentation(PPTX), scenes)
    render_html(scenes)
    print("Built 6 AI-research slides with editable diagrams and conversational speaker scripts.")


if __name__ == "__main__":
    build()
