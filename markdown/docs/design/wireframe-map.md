# Wireframe & Route Architecture Map

---

## 1. Consolidated 6-Route Information Architecture

| Route | Key Layout Structure | Core Components |
|---|---|---|
| `/` **Landing** | Asymmetric 12-col Hero (Left: Display H1, clear value prop, primary CTA *"Analyze Resume"* + secondary *"Build Resume"* + *"Try Demo Sample"*; Right: Lazy 3D Document Prism / Static SVG fallback). Below fold: 3-Metric Explainer, 4-Role Preview Grid, Honest Methodology Strip, Footer. | `HeroPrismCanvas`, `StaticPrismFallback`, `MetricComparisonStrip`, `WorkflowSteps` |
| `/builder` **Resume Builder** | Split 50/50 Desktop Workspace (Left: Section Accordion & Form Controls; Right: Sticky Scaled White Paper Live Preview + Template Switcher + Version Bar + *"Analyze This Resume"* CTA). Mobile toggles `Edit` / `Preview` tabs. | `OnboardingBanner`, `SectionEditor`, `PaperPreview`, `TemplateSelector`, `ExportMenu` |
| `/analyze` **Analysis Studio** | 2-Stage Guided Flow: Stage 1 (Upload Dropzone OR Pick Built/Sample Resume → Editable Section Verification & Parse Warning Banner); Stage 2 (Experience Track + 4 Core Roles Grid OR Custom JD Paste + Keyword Preview). | `WarmupStatusPill`, `ResumeDropzone`, `ParsePreviewEditor`, `RolePicker`, `CustomJDInput` |
| `/results/:id` **Analysis Workspace** | Sticky KPI Header (Quality Score /100, ATS Estimate /100, Skill Match %, Export PDF button) + Tabbed View (`?tab=overview|quality|ats|skills|feedback`) + Slide-over Evidence Inspector. | `ScoreRingGauge`, `QualityBreakdown`, `ATSAuditPanel`, `SkillGapMatrix`, `EvidenceDrawer`, `FeedbackList` |
| `/history` **Progress & History** | Filterable History Table + Side-by-Side Score Progression Chart (v1 vs v2) + Workspace Privacy Purge action. | `VersionTrendChart`, `HistoryTable`, `VersionDiffDrawer`, `DeleteConfirmModal` |
| `/about` **Methodology** | Transparent Rubik Table (100-pt Breakdown), ATS Simulation Disclaimer, NLP & Privacy Architecture summary, SkillOrbit Capstone Reference. | `RubricReferenceTable`, `DisclaimerCallout` |
