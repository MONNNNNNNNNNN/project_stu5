# GrowTH — System Diagrams

Mermaid source for the three project diagrams. These describe the system **as built**
(updated 2026-08-18), not the original proposal — where the two differ, the difference is
called out.

Rendered exports, regenerated from this file:

| Diagram | SVG |
| --- | --- |
| System architecture | [`diagram-system-architecture.svg`](./diagram-system-architecture.svg) |
| App structure | [`diagram-app-structure.svg`](./diagram-app-structure.svg) |
| User flow | [`diagram-user-flow.svg`](./diagram-user-flow.svg) |

```bash
npx -y @mermaid-js/mermaid-cli -i docs/diagrams.md -o docs/diagram.svg -b white
```

> The earlier exports `app-overview-diagram.svg/png` and `system-architecture.svg/png` were
> deleted on 2026-08-18. They pre-dated the ai-service, the rate limiter and the auth changes,
> and a stale architecture diagram is worse than none — someone reads it and believes it.

---

## 1. System Architecture

```mermaid
flowchart TB
    subgraph client["Browser — parent / caregiver"]
        UI["React 19 + Vite 8<br/>MUI 9 · Tailwind 4 · Recharts 3"]
        LS[("localStorage<br/>refreshToken · selectedChildId · theme")]
        UI <--> LS
    end

    subgraph vercel["Vercel — static hosting"]
        BUNDLE["SPA bundle<br/>single chunk, ~1.30 MB"]
    end

    subgraph render["Render — free tier, both services sleep after 15 min idle"]
        subgraph api["growth-backend · NestJS 11"]
            GUARD["Global guards, in order<br/>1 ProxyAwareThrottlerGuard<br/>2 JwtAuthGuard"]
            MOD["Modules<br/>auth · users · children · growth<br/>puberty · bone-age · articles<br/>notifications · support"]
            LMS["GrowthReferenceService<br/>LMS tables — CDC 2000, in-process<br/>Thai reference pending"]
            GUARD --> MOD
            MOD --> LMS
        end
        subgraph ai["growth-ai · FastAPI"]
            ORT["ONNX Runtime<br/>EfficientNet-B0 + sex input<br/>~100 MB RSS · ~24 ms"]
        end
        DISK[("uploads/ on local disk<br/>EPHEMERAL — lost on redeploy")]
    end

    NEON[("Neon Postgres<br/>via Prisma 5<br/>+ rate_limits, shared throttle counters")]
    RESEND["Resend HTTP API<br/>password-reset mail"]
    REL[("GitHub Release model-v1<br/>bone_age.onnx, 16 MB<br/>fetched at build")]

    UI -- "HTTPS · Bearer JWT" --> GUARD
    BUNDLE -.-> UI
    MOD --> NEON
    MOD --> DISK
    MOD -- "outbound HTTPS<br/>SMTP ports are blocked here" --> RESEND
    MOD -- "BONE_AGE_SERVICE_URL<br/>image + sex, async" --> ORT
    REL -.-> ORT

    classDef gap stroke-dasharray: 5 4
    class DISK,ORT gap
```

**Notes on what this shows**

- **Auth** — 15-minute access JWT in memory; refresh token is 48 random bytes, stored
  SHA-256-hashed in `sessions`, and rotated on every use. Only the refresh token touches
  `localStorage`.
- **Guard order matters.** The throttler runs before `JwtAuthGuard`, so a credential flood is
  rejected before it costs a passport verify and a bcrypt compare. Its counters live in
  Postgres, not in the process — Render serves more than one instance, and per-process tallies
  multiplied the limit by the instance count.
- **Percentile maths runs in-process**, not in the database and not in a service — the LMS
  tables are JSON bundled with the API. They are currently **CDC 2000 (US)**; the Thai
  reference swap is pending (see `research-checklist.md` §D1).
- **The model is not in the repo.** `bone_age.onnx` is a GitHub Release asset that
  `growth-ai` fetches at build time. A 16 MB binary in git would be carried by every clone
  forever and duplicated on each retrain.
- **ONNX, not torch.** torch needs 635 MB on disk and 374 MB resident, which does not fit a
  512 MB instance alongside uvicorn. ONNX Runtime is ~100 MB at ~24 ms per inference and
  matches torch to 3e-06.
- **Two dashed boxes are the remaining gaps**: `growth-ai` is deployed but **uncalibrated** —
  the checkpoint's training target was normalised, so it needs `AGE_MEAN`/`AGE_STD` from the
  training run before it will return months, and refuses to guess until then. And Render's
  disk does not survive a redeploy, so uploaded X-rays outlive their files.

---

## 2. App structure — routes and layout

```mermaid
flowchart TD
    ROOT["/ HomeRoute"] -->|"signed in"| DASH_R["redirect → /dashboard"]
    ROOT -->|"signed out"| HOME["Home — PublicHeader + Footer"]

    subgraph pub["Public routes — no session required"]
        HOME
        ABOUT["/about"]
        CONTACT["/contact"]
        LOGIN["/login"]
        REG["/register"]
        FORGOT["/forgot-password"]
        RESET["/reset-password"]
        PRIV["/privacy"]
        LEARN["/learn"]
        ART["/learn/:id"]
        NF["* → NotFound"]
    end

    subgraph prot["ProtectedRoute — redirects to / when signed out"]
        ADDCHILD["/children/new<br/>/children/:id/edit<br/>(no AppShell — focused task)"]
        subgraph shell["AppShell — top nav + mobile bottom nav + footer"]
            DASH["/dashboard"]
            GROWTH["/growth"]
            PUB["/puberty"]
            BONE["/bone-age"]
            CHILDREN["/children"]
            NOTIF["/notifications"]
            PROFILE["/profile"]
            SETTINGS["/settings"]
            MILE["/milestones — Placeholder"]
            HELP["/help — Placeholder"]
        end
    end

    LEARN --> ART
    ART -->|"back, via router state"| HOME
    ART -->|"back, via router state"| DASH
    ART -->|"back, fallback"| LEARN

    classDef dead fill:#eee,stroke:#999,stroke-dasharray: 4 3
    class MILE,HELP dead
```

**Notes**

- `/learn` and `/contact` sit **outside** `ProtectedRoute` but re-enter the app chrome via
  `PageChrome` when a session exists — so a signed-in reader keeps the nav instead of
  appearing logged out.
- `ArticleDetail`'s back link follows router state stamped by `ArticleCard`, so it returns
  to Home, Dashboard or Learn depending on where the reader came from. It used to be
  hardcoded to `/learn`.
- **`/milestones` and `/help` are dead** (greyed above): both render a "Coming soon"
  placeholder and neither appears in any navigation — unreachable except by typing the URL.

---

## 3. User flow

```mermaid
flowchart TD
    START([Parent lands on GrowTH]) --> SEEN{"Has an account?"}
    SEEN -->|no| REG["Register<br/>name · email · phone · password"]
    REG --> TERMS{"Accept terms<br/>+ privacy notice?"}
    TERMS -->|no| REG
    TERMS -->|"yes — FR-2"| ADD["Add first child<br/>name · sex · DOB · relationship"]
    SEEN -->|yes| LOGIN["Log in"]
    LOGIN --> DASH
    ADD --> DASH["Dashboard<br/>latest stats · chart · screening · resources"]

    DASH --> A["Record a measurement<br/>height and/or weight + date"]
    DASH --> B["Puberty screening<br/>sex-specific questionnaire"]
    DASH --> C["Upload hand X-ray"]
    DASH --> D["Read an article"]
    DASH --> E["Switch / add child"]

    A --> A1["Server computes<br/>percentile · SDS · BMI-for-age 5y+"]
    A1 --> A2{"Outside ±2 SD?"}
    A2 -->|yes| A3["Flagged guidance:<br/>'screening signal, not a diagnosis —<br/>consider seeing a paediatrician'"]
    A2 -->|no| A4["'Within the typical range'"]
    A3 --> CHART["Trend chart vs P3/P50/P97<br/>framed on the child's own age range"]
    A4 --> CHART

    B --> B1{"Outcome"}
    B1 -->|EARLY_SIGNS| B2["See a doctor<br/>+ 3-round follow-up plan, every 4 months"]
    B1 -->|DELAYED_ONSET| B3["Mention at next visit"]
    B1 -->|"TYPICAL / NO_SIGNS"| B4["No action needed"]
    B2 --> BHIST["Screening history — FR-14"]
    B3 --> BHIST
    B4 --> BHIST

    C --> C1["Validated: JPEG/PNG, ≤10 MB"]
    C1 --> C2["Row saved as PENDING"]
    C2 -.->|"backend not wired yet"| C3["Inference → COMPLETED<br/>bone age ± MAE months"]
    C3 -.-> C4["Shown beside chronological age<br/>'screening aid, not a diagnosis'"]

    E --> DASH
    D --> D1["Article — back link returns<br/>to wherever you came from"]

    classDef gap fill:#eee,stroke:#999,stroke-dasharray: 4 3
    class C3,C4 gap
```

**Notes**

- The **terms gate is enforced server-side** (`@Equals(true)` on the register DTO), not just
  in the form — FR-2.
- Every clinical-looking output is worded as a screening signal. No path in this flow
  produces anything phrased as a diagnosis.
- The dashed branch is the bone-age prediction. Upload, validation and history all work today,
  and the `growth-ai` service is deployed and serving. Two things remain: the backend does not
  yet call it (`BONE_AGE_SERVICE_URL` unset), and the model is uncalibrated — it cannot convert
  its raw output to months until `AGE_MEAN`/`AGE_STD` arrive from the training run. It returns
  503 rather than fabricating a value. See `ai-integration.md`.

---

## Rendering these

GitHub renders Mermaid in Markdown natively. For standalone files:

```bash
npx -y @mermaid-js/mermaid-cli -i docs/diagrams.md -o docs/diagrams.svg
```
