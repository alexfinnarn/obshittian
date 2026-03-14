# Archived Plans

Each archived plan lives in a numbered directory: `NN-plan-name/` (e.g., `08-qmd-search/`).
Use the next available number when archiving a new plan.

The directory contains the main plan file and all phase files.

For example, a plan before archiving:

```
plans/
├── README.md
├── zzz_archived/
│   └── README.md
├── MAIN_PLAN.md
├── main_plan-phase-01-start.md
├── main_plan-phase-02-middle.md
└── main_plan-phase-03-end.md
```

After archiving:

```
plans/
├── README.md
└── zzz_archived/
    ├── README.md
    └── 08-main-plan/
        ├── MAIN_PLAN.md
        ├── main_plan-phase-01-start.md
        ├── main_plan-phase-02-middle.md
        └── main_plan-phase-03-end.md
```