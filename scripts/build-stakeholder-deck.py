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
        "section": "PRODUCT CONTEXT",
        "title": "A focused tutor handoff starts with one problem.",
        "source": "Product goal, not a measured student outcome.",
        "script": "Mathify takes a student's math problem and prepares a short handoff for a tutor. The goal is to make it easier to choose a useful first question. That is the product promise, not a proven improvement in learning or tutor time. I will give a quick refresher on the workflow, then focus on the harder question: how do we know the AI-generated material is correct?",
    },
    {
        "section": "WORKFLOW",
        "title": "Question in. Evidence out.",
        "script": "The student submits a question, Mathify breaks it into prerequisite concepts, and it generates a main probe plus an easier retry for each step. A wrong or unsure response can lead to that retry. The answers and any whiteboard work are retained in a tutor brief. This is a refresher of the workflow only; the rest of the presentation is about the reliability of the generated content.",
    },
    {
        "section": "THE TRUST QUESTION",
        "title": "How can we trust each AI-written probe?",
        "source": "Synthetic prototype example. Not a live-model output.",
        "script": "In this synthetic example, the student misses the main distribution question and gets the easier retry correct. That gives the tutor a possible place to start, not a confirmed diagnosis. More importantly for this presentation, both questions and their answer keys are AI-generated in the real workflow. A polished report is only trustworthy if those underlying pieces are right. The rest of the talk is about what is checked, what we can measure, and what remains unknown.",
    },
    {
        "section": "GENERATION SAFEGUARDS",
        "title": "Valid structure does not prove correct maths.",
        "source": "Implemented schema and structural checks. Semantic accuracy is unmeasured.",
        "script": "The generator has useful engineering checks. It must return the expected fields, a plan of three to five steps, a breakdown of two to six steps, and four option IDs A through D with a key ID that exists. Those checks catch malformed output. They do not prove the marked answer is mathematically correct, that only one choice is right, that distractors diagnose a misconception, or that a hint does not reveal the answer. Structure is a gate, not evidence of correctness.",
    },
    {
        "section": "OPTIONAL AI REVIEW",
        "title": "A second AI can flag issues. It cannot certify correctness.",
        "source": "Manual opt-in, off by default, same provider as generation.",
        "script": "There is a second AI review path for the breakdown and generated probes. Its rubric now checks prerequisites, answer keys, distractors, concept alignment, explanations, hints, and whether the retry is simpler while testing the same concept. It is optional and disabled by default, not an automatic student-flow safeguard. It also uses the same provider as generation, so both calls may share the same blind spots. We should treat its findings as review signals, not ground truth.",
        "links": [
            ["Thakur et al., 2025: LLM judge alignment and vulnerabilities", THAKUR],
            ["Yamauchi et al., 2026: judge evaluation design", YAMAUCHI],
        ],
    },
    {
        "section": "RESEARCH ON AI JUDGES",
        "title": "AI judges need checks against people.",
        "source": "Related evidence only. None of these studies validates Mathify.",
        "links": [
            ["Thakur et al., 2025", THAKUR],
            ["Yamauchi et al., 2026", YAMAUCHI],
            ["Frontiers education study, 2026", FRONTIERS],
        ],
        "script": "The research changes how confidently we should interpret a second AI opinion. Thakur and colleagues found that judge models can differ from human ratings, with sensitivity to prompt complexity and a tendency toward leniency. Yamauchi and colleagues found that clear evaluation criteria matter, while chain-of-thought added little when criteria were already clear. A 2026 education study compared expert-validated AI and human multiple-choice questions in one Operating Systems course with 42 students; that is bounded evidence in a different subject, not proof about Mathify's math probes. The takeaway is not that AI questions are unusable. It is that rubric-based, human-checked evaluation is necessary.",
    },
    {
        "section": "CHECKER BENCHMARK",
        "title": "Ten fixtures separate misses from false alarms.",
        "source": "Two unmodified controls plus eight scripted faults. One fixed equation.",
        "script": "The checker benchmark is now implemented. It sends two unmodified fixture controls and eight cases with one planted fault each: missing or unrelated prerequisites, a wrong key, ambiguous options, a concept mismatch, a wrong explanation, a leaking hint, or an easier question that is not easier. The report separates per-category fault detection, flags on completed controls, unclassified findings, and API failures. This is a small exploratory harness, not a representative reliability study; the fixture itself still needs an independent educator review.",
    },
    {
        "section": "LIVE BENCHMARK STATUS",
        "title": "No live checker result yet.",
        "source": "No ANTHROPIC_API_KEY is configured in this workspace.",
        "script": "I attempted to move from harness design to a live checker result. This environment has no Anthropic API key configured, so I did not send any benchmark calls. That is an access blocker, not a successful or failed model evaluation. The benchmark refuses to run in mock mode, because the mock checker always returns an empty issue list. The implementation and offline scoring tests can be verified here, but we must not present them as evidence of live checker reliability.",
    },
    {
        "section": "GENERATION EVALUATION",
        "title": "Every generated probe pair is now retained.",
        "source": "Eight project-authored examples. Generated content still needs expert scoring.",
        "script": "The generation harness now keeps the full analysis and every planned main/easier pair across the eight project-authored examples. It records follow-up call latency and failures separately from the analysis call. Topic matching and breakdown length remain sanity checks only. The harness does not decide whether the math, answer key, distractors, concept mapping, hint, or retry is good. A math educator must score those artifacts independently, and a live run still requires credentials.",
    },
    {
        "section": "EVIDENCE BOUNDARY",
        "title": "Software checks are not AI accuracy evidence.",
        "source": "Eight reference answers checked. Zero live benchmark results. Zero tutor responses.",
        "script": "Here is what we can say today. Offline tests verify software behavior, and eight authored reference problems have checked solutions. There are zero live checker benchmark results and zero tutor questionnaire responses. The report confidence label is a deterministic heuristic based on answer patterns and completion, not an AI confidence score or a calibrated probability that the report is accurate. Before making an accuracy claim, we need a live sample, independent math review, and tutor review. Until then, effectiveness remains unknown.\n\nFor reference, the checked answers are x = 4; (x + 2)(x + 3); hypotenuse 5 cm; sin θ = 5/13; 5 cups; (x, y) = (2, 5); circle area 153.9 cm²; x⁴; x ≠ 0. These solve the fixed examples. They are not generated-model results.",
    },
    {
        "section": "SOURCES",
        "title": "Research, implementation, and scope.",
        "links": [
            ["Thakur et al., GEM 2025", THAKUR],
            ["Yamauchi et al., GEM 2026", YAMAUCHI],
            ["Frontiers education study, 2026", FRONTIERS],
            ["Mathify AI reliability research and protocol", "https://github.com/Jeff15321/mathify-brief/blob/feat/luke-excalidraw/docs/prompt-research.md"],
            ["Public Google Cloud executive deck, February 2020", GOOGLE],
            ["Sparks: Google Cloud Next keynote design case study", SPARKS],
            ["Beatrice template lineage, SlidesCarnival", TEMPLATE],
            ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
        ],
        "script": "The three research sources are relevant to the limits of AI evaluation and educational question generation. None validates Mathify. The evaluation details are in the project research document, and the implementation is visible in the generator and checker harnesses. For design, I inspected a public Google Cloud executive deck and a Google Cloud Next case study; the layouts are original and do not imply Google endorsement. The PowerPoint retains the Beatrice template lineage and CC BY 4.0 attribution. Screenshots use synthetic data.",
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
            c.text(72, 310, "STUDENT QUESTION", 18, BLUE, width=600)
            c.rect(72, 350, 630, 360, "white", LINE, 16)
            c.text(104, 402, "2(x + 3) = 14", 49, width=560)
            c.text(104, 560, "Question or photo", 24, GRAY, width=500)
            c.line(750, 530, 842, 530, BLUE, 3)
            c.rect(890, 350, 638, 360, BLUE_PALE, radius=16)
            c.text(924, 385, "TUTOR STARTING POINT", 18, BLUE, width=560)
            c.text(924, 447, "Possible gap:\ndistributive property", 37, width=560)
            c.text(924, 625, "Evidence to confirm, not a diagnosis.", 21, GRAY, width=560)
        elif i == 2:
            labels = [
                ("Question", "Text or photo"),
                ("Breakdown", "Ordered concepts"),
                ("Probes", "Main + easier retry"),
                ("Responses", "Answers + work"),
                ("Tutor brief", "Priority + evidence"),
            ]
            for j, (name, detail) in enumerate(labels):
                x = 72 + j * 293
                c.rect(x, 330, 250, 178, BLUE_PALE if j in {1, 2} else PALE, radius=12)
                c.text(x + 22, 353, f"0{j + 1}", 18, BLUE, width=205)
                c.text(x + 22, 395, name, 26, width=212)
                c.text(x + 22, 447, detail, 18, GRAY, width=214)
                if j < 4:
                    c.text(x + 258, 401, "→", 28, BLUE, width=35)
            c.text(72, 575, "ADAPTIVE STEP", 18, GRAY, width=400)
            for x, label, color, width in [
                (72, "Main probe", INK, 250),
                (383, "Wrong / IDK", AMBER, 250),
                (752, "Easier retry", INK, 280),
                (1175, "Both answers saved", GREEN, 350),
            ]:
                c.text(x, 631, label, 28, color, width=width)
            c.text(657, 632, "→", 30, BLUE, width=55)
            c.text(1081, 632, "→", 30, BLUE, width=55)
            c.line(72, 710, 1528, 710)
            c.text(72, 746, "The report keeps the evidence for the tutor to inspect.", 23, GRAY, width=1200)
        elif i == 3:
            c.rect(72, 320, 650, 410, PALE, radius=16)
            tag(c, 103, 345, "MAIN PROBE")
            c.text(103, 410, "Expand 2(x + 3)", 37, width=570)
            c.text(103, 492, "Student chose", 19, GRAY, width=235)
            c.text(405, 492, "Key says", 19, GRAY, width=235)
            c.text(103, 537, "2x + 3", 44, AMBER, width=250)
            c.text(405, 537, "2x + 6", 44, GREEN, width=250)
            c.text(103, 640, "The second term was not multiplied.", 22, AMBER, width=575)
            c.image(784, 307, 744, 427, "retry", "Synthetic easier-probe example from the prototype.")
            c.text(72, 766, "How can we trust each AI-written question and answer key?", 22, GRAY, width=1300)
        elif i == 4:
            c.rect(72, 320, 700, 410, GREEN_PALE, radius=16)
            c.rect(828, 320, 700, 410, AMBER_PALE, radius=16)
            tag(c, 102, 345, "CODE ENFORCES", GREEN, "white", 265)
            tag(c, 858, 345, "NOT PROVEN", AMBER, "white", 265)
            for y, item in [
                (420, "Valid fields and types"),
                (512, "3-5 probe steps; 2-6 breakdown steps"),
                (604, "Four A-D IDs; key ID must exist"),
            ]:
                c.circle(105, y + 8, 12, GREEN)
                c.text(132, y, item, 22, width=600)
            for y, item in [
                (414, "The marked math answer is correct"),
                (485, "Only one option is correct"),
                (556, "Distractors and hints are sound"),
                (627, "The easier retry is actually easier"),
            ]:
                c.circle(861, y + 8, 12, AMBER)
                c.text(888, y, item, 22, width=600)
            c.text(72, 770, "Schema and structural checks are gates, not correctness evidence.", 22, GRAY, width=1300)
        elif i == 5:
            c.rect(72, 320, 650, 410, PALE, radius=16)
            c.rect(778, 320, 750, 410, BLUE_PALE, radius=16)
            tag(c, 102, 345, "REVIEW TARGETS")
            for y, text in [
                (414, "Prerequisites and breakdown"),
                (492, "Keys, options, and concept match"),
                (570, "Explanations, hints, and retry level"),
            ]:
                c.circle(105, y + 8, 11, BLUE)
                c.text(132, y, text, 23, width=540)
            tag(c, 808, 345, "LIMITS")
            c.text(808, 415, "Off by default", 29, width=650)
            c.text(808, 458, "Same provider as generation", 24, GRAY, width=650)
            c.line(808, 512, 1498, 512)
            c.text(808, 540, "Review signal, not independent proof.", 26, width=650)
            c.text(808, 600, "Not part of the automatic student flow.", 22, GRAY, width=650)
            c.text(72, 770, "A second AI can miss the same mistake as the first.", 22, GRAY, width=1300)
        elif i == 6:
            studies = [
                (
                    72,
                    "LLM-AS-JUDGE",
                    "Thakur et al., 2025",
                    "Human ratings differed.\nPrompt sensitivity and\nleniency were observed.",
                ),
                (
                    572,
                    "EVALUATION DESIGN",
                    "Yamauchi et al., 2026",
                    "Clear criteria mattered.\nChain-of-thought added little\nwhen criteria were clear.",
                ),
                (
                    1072,
                    "EDUCATION EXAMPLE",
                    "Frontiers, 2026",
                    "42 Operating Systems students.\nExpert-reviewed MCQs,\nnot math tutoring.",
                ),
            ]
            for x, label, citation, detail in studies:
                c.rect(x, 320, 456, 420, PALE, radius=16)
                tag(c, x + 24, 345, label, BLUE, BLUE_PALE, 270)
                c.text(x + 24, 414, citation, 26, width=408)
                c.text(x + 24, 474, detail, 22, GRAY, width=408)
            c.text(72, 774, "Related research informs our method. It does not validate Mathify.", 22, GRAY, width=1300)
        elif i == 7:
            c.rect(72, 320, 375, 420, GREEN_PALE, radius=16)
            tag(c, 102, 345, "2 CONTROLS", GREEN, "white", 215)
            c.text(102, 420, "Breakdown\nProbe pairs", 34, width=310)
            c.text(102, 575, "Unmodified fixed fixture", 21, GRAY, width=310)
            c.rect(477, 320, 1051, 420, PALE, radius=16)
            tag(c, 507, 345, "8 SEEDED FAULTS", AMBER, AMBER_PALE, 250)
            faults = [
                (507, 414, "Missing prerequisite"),
                (507, 488, "Unrelated prerequisite"),
                (507, 562, "Wrong answer key"),
                (507, 636, "Ambiguous options"),
                (1038, 414, "Concept mismatch"),
                (1038, 488, "Wrong explanation"),
                (1038, 562, "Hint gives away answer"),
                (1038, 636, "Retry not easier"),
            ]
            for x, y, label in faults:
                c.circle(x + 4, y + 9, 10, AMBER)
                c.text(x + 28, y, label, 21, width=440)
            c.text(72, 775, "Measure category detection, false flags on controls, and failed calls.", 22, GRAY, width=1300)
        elif i == 8:
            c.rect(72, 320, 535, 420, AMBER_PALE, radius=16)
            tag(c, 102, 345, "LIVE MODEL", AMBER, "white", 210)
            c.text(102, 420, "NOT RUN", 66, AMBER, width=450)
            c.text(102, 535, "No API key is configured.", 27, width=450)
            c.rect(653, 320, 875, 420, PALE, radius=16)
            tag(c, 683, 345, "HARNESS STATUS")
            for y, item in [
                (420, "10-case benchmark is implemented"),
                (500, "Offline scoring tests are available"),
                (580, "Mock output is excluded as evidence"),
            ]:
                c.circle(686, y + 9, 11, BLUE)
                c.text(713, y, item, 25, width=760)
            c.text(72, 775, "No request was sent. No live model result is claimed.", 22, GRAY, width=1300)
        elif i == 9:
            blocks = [
                (72, "8 CASES", "Project-authored\nreference problems"),
                (574, "3-5 PAIRS", "Every planned main and\neasier probe retained"),
                (1076, "REVIEW", "Math and teaching quality\nstill need human scoring"),
            ]
            for x, label, detail in blocks:
                c.rect(x, 350, 452, 265, BLUE_PALE if x == 574 else PALE, radius=16)
                tag(c, x + 24, 375, label, BLUE, "white", 220)
                c.text(x + 24, 448, detail, 29, width=400)
            c.text(72, 678, "Captured separately", 19, GRAY, width=350)
            c.text(72, 718, "Analysis time  /  follow-up probe time  /  failures", 24, width=1456)
            c.text(72, 774, "Topic matches and step counts are sanity checks only.", 22, GRAY, width=1300)
        elif i == 10:
            metrics = [
                (72, "PASS", "Offline software\ntests"),
                (434, "8", "Reference answers\nchecked"),
                (796, "0", "Live AI results"),
                (1158, "0", "Tutor responses"),
            ]
            for x, number, label in metrics:
                c.rect(x, 340, 320, 210, PALE, radius=16)
                c.text(x + 24, 370, number, 58, BLUE if number != "0" else AMBER, width=272)
                c.text(x + 24, 462, label, 22, GRAY, width=272)
            c.text(72, 614, "Report confidence is a rule-based heuristic, not calibrated accuracy.", 27, width=1456)
            c.line(72, 677, 1528, 677)
            c.text(72, 710, "Before an accuracy claim: live cases + independent math review + tutor review.", 24, GRAY, width=1456)
        elif i == 11:
            c.text(72, 270, "AI RELIABILITY RESEARCH", 18, BLUE, width=690)
            for y, title, detail in [
                (327, "Thakur et al., GEM 2025", "Judge models differ from human ratings."),
                (418, "Yamauchi et al., GEM 2026", "Evaluation criteria affect judge reliability."),
                (509, "Frontiers, 2026", "Expert-validated MCQs in one 42-student course."),
                (600, "Mathify research notes", "Harness design and limits of current evidence."),
                (691, "SlidesCarnival", "Beatrice template lineage, CC BY 4.0."),
            ]:
                c.text(72, y, title, 25, width=690)
                c.text(72, y + 39, detail, 19, GRAY, width=690)
            c.line(811, 270, 811, 786)
            c.text(870, 270, "DESIGN REFERENCES + ATTRIBUTION", 18, BLUE, width=660)
            for y, title, detail in [
                (327, "Google Cloud public deck, 2020", "Hierarchy, whitespace, and diagram-led layouts."),
                (443, "Sparks / Google Cloud Next", "A coherent visual system for complex ideas."),
                (559, "Original Mathify compositions", "Native diagrams and synthetic UI screenshots."),
                (675, "No Google branding", "Design references only; no endorsement."),
            ]:
                c.text(870, y, title, 25, width=658)
                c.text(870, y + 43, detail, 20, GRAY, width=658)
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
    if len(SLIDES) != 11:
        raise ValueError("Expected eleven authored slides.")
    scenes = make_scenes()
    for index, canvas in enumerate(scenes, 1):
        validate_scene(canvas, index)
    if "\u2014" in json.dumps(SLIDES, ensure_ascii=False):
        raise ValueError("Speaker script contains an em dash.")
    render_ppt(Presentation(PPTX), scenes)
    render_html(scenes)
    print("Built 11 original 16:9 reliability-review layouts with editable shapes and speaker scripts.")


if __name__ == "__main__":
    build()
