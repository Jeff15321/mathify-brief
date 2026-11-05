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
SLIDES = [
    {
        "section": "AI ARCHITECTURE",
        "title": "Generate, check, then review.",
        "source": "Intended automatic flow with API access. Checker exists; automatic triggering is not yet wired.",
        "script": "Alec has shown the product, so I'll focus on what happens behind the AI part. Read this diagram from left to right. The first AI call breaks the original problem into concepts and creates the first probe pair. Later pairs are generated as the student moves through the session. Code checks the format, and a separate AI call can review the content against the original problem. The architecture we're aiming for makes that review automatic after generation. The checker itself is built, but connecting it automatically is still work to do. This diagram is the intended flow with API access, not a claim that we've run it.",
    },
    {
        "section": "GENERATION",
        "title": "What does the generator actually produce?",
        "source": "Illustrative example, not a live-model result.",
        "script": "Take this equation as a simple example. The generator identifies the concepts involved, such as distribution and inverse operations, then writes a main question and an easier version for each planned step. For distribution, the main question might ask the student to expand two times x plus three. The retry could use smaller numbers, like two times x plus one. Each question also needs options, an answer key, a hint and an explanation. That gives the checker specific things to inspect. Getting the JSON format right is useful, but it doesn't tell us whether the maths is right.",
    },
    {
        "section": "AI CHECKER",
        "title": "The checker gets the problem, not just the answer key.",
        "source": "Separate review call, same provider. Findings are warnings, not automatic corrections.",
        "script": "The checker isn't just asked whether the output looks good. It gets the original problem and the generated material, then uses a checklist. For the breakdown, it looks for missing or unnecessary prerequisites. For the probes, it checks the answer key, options, concept match, explanation, hint and retry difficulty. Here's an example: if the generator marks two x plus three as the expansion of two times x plus three, the checker should flag the answer key because the correct result is two x plus six. That's the behaviour we want to measure, not a result we're claiming. It returns findings; it doesn't automatically rewrite the question.",
    },
    {
        "section": "RESEARCH",
        "title": "A second AI opinion still needs a reference.",
        "source": "Related research informs the design. It does not establish Mathify's accuracy.",
        "script": "So why not just trust the checker? Research on AI judges gives us a reason to be careful. Thakur and colleagues found differences between model judgements and human ratings, including leniency and sensitivity to the prompt. Yamauchi and colleagues found that clear evaluation criteria mattered. For us, that means asking specific questions like 'is the marked answer correct?' rather than 'is this a good question?' It also means comparing the checker with answers reviewed by a person. Using a second call is another chance to catch a mistake, but using the same provider means it can also repeat the first call's mistake.",
        "links": [
            ["Thakur et al., 2025", THAKUR],
            ["Yamauchi et al., 2026", YAMAUCHI],
        ],
    },
    {
        "section": "TESTING RELIABILITY",
        "title": "Can it catch a mistake we already know is there?",
        "source": "Test runner built. No live accuracy result or tutor feedback is claimed.",
        "script": "Here's the test in plain terms. Start with a question and answer that a maths educator has checked. Make a copy and deliberately put one mistake in it, like marking the wrong answer. Send both versions to the checker. We want it to flag the changed version and leave the correct version alone. We have built a small runner with two unchanged examples and eight deliberately changed examples, all based on one equation. We haven't run it against the live model, and the examples still need independent educator review. Even a good result on that small set would only be a first check. We'd need more topics and real tutor feedback before making a broader reliability claim.",
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
            ["Thakur et al., 2025", THAKUR],
            ["Yamauchi et al., 2026", YAMAUCHI],
            ["Frontiers education study, 2026 (background only)", FRONTIERS],
            ["Mathify research and test plan", "https://github.com/Jeff15321/mathify-brief/blob/feat/luke-excalidraw/docs/prompt-research.md"],
            ["Beatrice template lineage, SlidesCarnival, CC BY 4.0", TEMPLATE],
        ],
        "script": "These are the references behind this section. The two AI-judge papers are the most relevant to the checker discussion. The education paper is background only; it studied a different subject and doesn't validate our maths questions. The implementation and test plan are in our project research notes. The main point I'd leave you with is that we can explain what the checker looks for, but we shouldn't call it reliable until we compare its decisions with independently reviewed examples. We also don't have tutor questionnaire responses yet.",
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
            c.text(72, 265, "Solve 2(x + 3) = 14", 39, width=1300)
            c.rect(72, 370, 420, 350, PALE, radius=12)
            tag(c, 96, 394, "CONCEPTS")
            c.text(96, 475, "Distribution\nInverse operations", 28, width=370)
            c.text(508, 505, "→", 32, BLUE, width=50)
            for x, label, question, key in [
                (578, "MAIN PROBE", "Expand 2(x + 3)", "Key: 2x + 6"),
                (1068, "EASIER RETRY", "Expand 2(x + 1)", "Key: 2x + 2"),
            ]:
                c.rect(x, 370, 460, 350, BLUE_PALE, radius=12)
                tag(c, x + 24, 394, label)
                c.text(x + 24, 477, question, 30, width=412)
                c.text(x + 24, 547, key, 27, GREEN, width=412)
            c.text(72, 764, "Each probe also includes four options, a hint and an explanation.", 25, GRAY, width=1456)
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
            for x, citation, finding, action in [
                (72, "Thakur et al., 2025", "AI judges can disagree\nwith human ratings.", "Compare with human-reviewed answers."),
                (828, "Yamauchi et al., 2026", "Clear evaluation\ncriteria matter.", "Use a specific checklist, not 'looks good'."),
            ]:
                c.rect(x, 320, 700, 390, PALE, radius=12)
                c.text(x + 28, 352, citation, 26, BLUE, width=644)
                c.text(x + 28, 425, finding, 34, width=644)
                c.text(x + 28, 604, action, 25, width=644)
            c.text(72, 760, "Same-provider review can repeat the generator's mistakes.", 27, GRAY, width=1456)
        elif i == 5:
            for x, label, example, expectation, fill in [
                (72, "UNCHANGED EXAMPLE", "Expand 2(x + 3)\nKey: 2x + 6", "Should not flag an error", GREEN_PALE),
                (828, "PLANTED MISTAKE", "Expand 2(x + 3)\nKey: 2x + 3", "Should flag the wrong key", AMBER_PALE),
            ]:
                c.rect(x, 300, 700, 340, fill, radius=12)
                tag(c, x + 28, 325, label, width=310)
                c.text(x + 28, 405, example, 34, width=644)
                c.text(x + 28, 561, expectation, 28, width=644)
            c.text(72, 690, "Built: small test runner with 2 unchanged + 8 altered examples.", 26, width=1456)
            c.text(72, 755, "Still needed: live run, independent maths review, broader examples.", 25, GRAY, width=1456)
        elif i == 6:
            studies = [
                (
                    72,
                    "AI JUDGES",
                    "Thakur et al., 2025",
                    "Human agreement,\nprompt sensitivity\nand leniency.",
                ),
                (
                    572,
                    "EVALUATION DESIGN",
                    "Yamauchi et al., 2026",
                    "Clear criteria mattered.\nChain-of-thought added little\nwhen criteria were clear.",
                ),
                (
                    1072,
                    "PROJECT REFERENCES",
                    "Mathify research notes",
                    "Implementation + test plan.\nBeatrice / SlidesCarnival:\nCC BY 4.0 template lineage.",
                ),
            ]
            for x, label, citation, detail in studies:
                c.rect(x, 320, 456, 420, PALE, radius=16)
                tag(c, x + 24, 345, label, BLUE, BLUE_PALE, 270)
                c.text(x + 24, 414, citation, 26, width=408)
                c.text(x + 24, 474, detail, 22, GRAY, width=408)
            c.text(72, 774, "Research informs the design. Accuracy still needs independent testing.", 22, GRAY, width=1456)
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
