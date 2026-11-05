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
SLIDES = [
    {
        "section": "AI ARCHITECTURE",
        "title": "Generate, check, then review.",
        "source": "Intended automatic flow with API access. Checker exists; automatic triggering is not yet wired.",
        "script": "Alec has shown the product, so I'll focus on what happens behind the AI part. Read this diagram from left to right. The first AI call breaks the original problem into concepts and creates the first probe pair. Later pairs are generated as the student moves through the session. Code checks the format, and a separate AI call can review the content against the original problem. The architecture we're aiming for makes that review automatic after generation. The checker itself is built, but connecting it automatically is still work to do. This diagram is the intended flow with API access, not a claim that we've run it.",
    },
    {
        "section": "MATHEMATICAL CAPABILITY",
        "title": "Leading models score highly on mathematics.",
        "source": "Published DeepSeek-R1 result, not a measured Mathify accuracy score.",
        "script": "The reason we think AI is a reasonable tool here is that mathematical reasoning has become a genuine strength of leading models. DeepSeek's R1 paper reports 97.3 percent on MATH-500, a benchmark drawn from competition mathematics.\n\nOne part of its training uses rewards for getting mathematical answers right. That gives the training process a concrete correctness signal, rather than only rewarding an answer that sounds convincing.\n\nThis is strong evidence that models can solve challenging mathematics. What it doesn't tell us is whether every question our application generates is correct, clearly worded, or useful for diagnosing a student's understanding. Those are the parts we still need to evaluate.\n\nA couple of details if someone asks: this is reported pass@1, not the chance of getting at least one correct answer in 64 attempts. The authors describe sampling 64 responses per query to estimate pass@1 where sampling is required. MATH-500 is not an Ontario curriculum assessment, and this result belongs to DeepSeek-R1, not the Claude model our application uses. We aren't claiming that AI outperforms every high-school student.",
        "links": [
            ["DeepSeek-R1 paper, January 2025", DEEPSEEK],
            ["Official evaluation results and sampling settings", DEEPSEEK_RESULTS],
        ],
    },
    {
        "section": "AI CHECKER",
        "title": "The checker gets the problem, not just the answer key.",
        "source": "Separate review call, same provider. Findings are warnings, not automatic corrections.",
        "script": "The checker isn't just asked whether the output looks good. It gets the original problem and the generated material, then uses a checklist. For the breakdown, it looks for missing or unnecessary prerequisites. For the probes, it checks the answer key, options, concept match, explanation, hint and retry difficulty. Here's an example: if the generator marks two x plus three as the expansion of two times x plus three, the checker should flag the answer key because the correct result is two x plus six. That's the behaviour we want to measure, not a result we're claiming. It returns findings; it doesn't automatically rewrite the question.\n\nResearch on AI judges helps explain that design choice. Thakur and colleagues found differences from human ratings, including leniency and prompt sensitivity. Yamauchi and colleagues found that clear criteria mattered. That supports using a specific checklist and checking the reviewer's decisions against human-reviewed examples. It doesn't prove that our reviewer is reliable. It uses the same provider as the generator, so it can share the same blind spots.",
        "links": [
            ["Thakur et al., 2025", THAKUR],
            ["Yamauchi et al., 2026", YAMAUCHI],
        ],
    },
    {
        "section": "EVALUATION TOOLS",
        "title": "Tools can help us measure and improve.",
        "source": "Available tooling, not current integrations or measured improvements.",
        "script": "We wouldn't need to build all the evaluation infrastructure ourselves. There are established tools for running examples repeatedly and comparing the results.\n\nWith Mathify, we could feed the same problems through different versions of the generation prompt. We'd check whether the answers are correct, whether the probes target the intended concept, and whether the reviewer catches mistakes.\n\nLangSmith could help us inspect the individual calls and compare runs. promptfoo could repeat a set of examples with automated checks. DeepEval could organize evaluation tests and scoring criteria.\n\nThe tools don't improve accuracy just by being there. They help us identify failures and find out whether a prompt or model change actually improves the result. These are available options, not three tools we're proposing to install together, and none is currently integrated into Mathify. If we use an AI judge for scoring, its ratings still need to be checked against qualified human review.",
        "links": [
            ["LangSmith evaluation", LANGSMITH],
            ["promptfoo assertions", PROMPTFOO],
            ["DeepEval quickstart", DEEPEVAL],
        ],
    },
    {
        "section": "REALISTIC VALIDATION",
        "title": "Mathify examples could ground our evaluation.",
        "source": "Proposed validation set, not a completed study. No tutor questionnaire responses yet.",
        "script": "A useful next step would be a set of examples from Mathify, if they're able to provide one. Ideally, that would include real curriculum-style problems, reviewed breakdowns, and examples of good probing-question pairs.\n\nThat would let us evaluate against the work this product actually needs to do, rather than relying only on general maths benchmarks. We wouldn't require the AI to copy the reference question word for word. We'd check whether its alternative is mathematically correct and tests the right concept.\n\nWe could also compare generation with review enabled and disabled, then measure whether the checker catches meaningful errors and how often it flags good material. We don't currently have those results or tutor responses, so this is a proposed validation route, not a completed study.\n\nAny supplied examples would be candidate reference material until qualified reviewers confirm their correctness and suitability. We'd keep some examples held out for final evaluation rather than tuning against the whole set. If examples come from student interactions, we'd need permission and de-identified material. Valid alternative solutions and probes should count, not just exact text matches. Our existing small test runner is a starting point, not a substitute for that review.",
        "links": [
            ["Thakur et al., 2025: LLM judge alignment and vulnerabilities", THAKUR],
            ["Yamauchi et al., 2026: judge evaluation design", YAMAUCHI],
        ],
    },
    {
        "section": "SOURCES",
        "title": "Research and implementation references.",
        "source": "Full references in speaker notes. No tutor questionnaire responses yet.",
        "links": [
            ["DeepSeek-R1 paper and MATH-500 result", DEEPSEEK],
            ["DeepSeek-R1 official evaluation settings", DEEPSEEK_RESULTS],
            ["Thakur et al., 2025", THAKUR],
            ["Yamauchi et al., 2026", YAMAUCHI],
            ["LangSmith evaluation", LANGSMITH],
            ["promptfoo assertions", PROMPTFOO],
            ["DeepEval quickstart", DEEPEVAL],
            ["Mathify research and test plan", "https://github.com/Jeff15321/mathify-brief/blob/feat/luke-excalidraw/docs/prompt-research.md"],
            ["Beatrice template lineage, SlidesCarnival, CC BY 4.0", TEMPLATE],
        ],
        "script": "Here's where the evidence comes from. DeepSeek's paper gives us a published result for mathematical solving. The AI-judge papers inform how we design the review step, including why we need clear criteria and human checks. The tool documentation shows what is available for running evaluations; it isn't evidence that we've already used those tools.\n\nThe overall pitch is that published results show strong mathematical capability, a review layer gives us another opportunity to catch errors, and reviewed Mathify examples could tell us how well our particular system performs. We haven't measured that accuracy yet, and we still have no tutor questionnaire responses.",
    },
]


class Canvas:
    def __init__(self):
        self.items = []

    def text(self, x, y, text, size=28, color=INK, bold=False, width=1456):
        self.items.append(dict(kind="text", x=x, y=y, text=text, size=size, color=color, bold=bold, width=width))

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
            c.text(72, 290, "97.3%", 150, BLUE, width=730)
            c.text(78, 493, "MATH-500 / DeepSeek-R1 / reported pass@1", 25, width=740)
            c.text(78, 561, "Competition-maths benchmark", 25, GRAY, width=740)
            c.line(854, 290, 854, 680)
            for y, item in [
                (310, "High accuracy on challenging maths"),
                (432, "RL rewards correct mathematical answers"),
                (554, "A foundation, not proof of probe quality"),
            ]:
                c.circle(902, y + 11, 11, BLUE)
                c.text(931, y, item, 25, width=597)
            c.text(72, 747, "Different model: Mathify uses Claude. Solving is not question generation.", 25, GRAY, width=1456)
        elif i == 3:
            c.rect(72, 290, 650, 435, PALE, radius=12)
            tag(c, 100, 318, "ILLUSTRATIVE ERROR", AMBER, AMBER_PALE, 280)
            c.text(100, 407, "Expand 2(x + 3)", 34, width=594)
            c.text(100, 481, "Wrong key: 2x + 3", 32, AMBER, width=594)
            c.text(100, 565, "Expected flag: answer-key error", 27, width=594)
            c.text(100, 625, "Correct expansion: 2x + 6", 27, GREEN, width=594)
            c.text(790, 302, "CHECKER'S CHECKLIST", 20, BLUE, width=738)
            for y, label in [
                (379, "Are the prerequisites relevant?"),
                (458, "Is exactly one option correct?"),
                (537, "Do the hint and explanation make sense?"),
                (616, "Is the retry simpler, on the same concept?"),
            ]:
                c.circle(793, y + 10, 10, BLUE)
                c.text(820, y, label, 25, width=708)
            c.text(72, 766, "This is a test expectation, not an observed checker result.", 24, GRAY, width=1456)
        elif i == 4:
            for y, tool, description in [
                (290, "LangSmith", "Trace runs and compare prompt versions"),
                (440, "promptfoo", "Repeat examples and check expected outputs"),
                (590, "DeepEval", "Automate scoring against evaluation criteria"),
            ]:
                c.text(72, y, tool, 34, BLUE, width=770)
                c.text(72, y + 62, description, 26, GRAY, width=770)
            c.line(874, 275, 874, 760)
            for j, label in enumerate([
                "Reviewed examples",
                "Run generator + checker",
                "Check answers + question quality",
                "Compare versions + inspect failures",
                "Revise prompts, then test again",
            ]):
                y = 266 + j * 105
                c.rect(926, y, 602, 69, BLUE_PALE if j == 1 else PALE, radius=10)
                c.text(946, y + 17, label, 25, width=562)
                if j < 4:
                    c.text(1205, y + 69, "↓", 23, BLUE, width=44)
        elif i == 5:
            c.text(72, 245, "Candidate examples from Mathify, confirmed by qualified reviewers.", 26, width=1456)
            c.rect(72, 325, 1456, 62, BLUE_PALE, radius=8)
            c.text(96, 340, "ONE PROPOSED EXAMPLE RECORD", 22, BLUE, width=700)
            c.text(855, 340, "WHAT WE WOULD CHECK", 22, BLUE, width=645)
            for y, example, check in [
                (420, "Problem: solve 2(x + 3) = 14", "Correct interpretation and solution"),
                (514, "Concepts: distribution, inverse operations", "Relevant and sufficient breakdown"),
                (608, "Reviewed main + easier probing pair", "Correct keys, wording and difficulty"),
            ]:
                c.text(96, y, example, 27, width=720)
                c.text(855, y, check, 27, width=645)
                c.line(96, y + 65, 1504, y + 65)
            c.text(72, 727, "Compare review on/off: errors caught and good questions wrongly flagged.", 25, width=1456)
            c.text(72, 774, "Accept valid alternatives. Keep held-out examples for final evaluation.", 22, GRAY, width=1456)
        elif i == 6:
            studies = [
                (
                    72,
                    "MATH CAPABILITY",
                    "DeepSeek-R1, 2025",
                    "97.3% MATH-500 pass@1.\nPublished model result,\nnot Mathify accuracy.",
                ),
                (
                    572,
                    "REVIEW DESIGN",
                    "AI-judge research",
                    "Thakur et al., 2025.\nYamauchi et al., 2026.\nHuman checks + clear criteria.",
                ),
                (
                    1072,
                    "AVAILABLE TOOLS",
                    "Evaluation documentation",
                    "LangSmith / promptfoo /\nDeepEval. Not integrated.\nProject + design links in notes.",
                ),
            ]
            for x, label, citation, detail in studies:
                c.rect(x, 320, 456, 420, PALE, radius=16)
                tag(c, x + 24, 345, label, BLUE, BLUE_PALE, 270)
                c.text(x + 24, 414, citation, 26, width=408)
                c.text(x + 24, 474, detail, 22, GRAY, width=408)
            c.text(72, 774, "Beatrice template lineage: SlidesCarnival, CC BY 4.0. Full source links in notes.", 22, GRAY, width=1456)
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
            content.append(f'<text x="{x}" y="{y + item["size"]}" font-size="{item["size"]}" font-weight="{600 if item["bold"] else 400}" fill="{item["color"]}">{tspans}</text>')
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
