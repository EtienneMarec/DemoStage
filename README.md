# Internship demo: software for marine fire detection

Interactive demo of the work I did during my second-year engineering internship (TELECOM Nancy), from June 15 to August 20, 2026, at Marinelec Technologies in Quimper, France.

**This repository contains neither the source code of the delivered applications nor any company data.** Each tool is a simulation rewritten for the browser: the use cases are faithful, while the formats and data are made up.

The demo is available in English and French.

## Running the demo

Nothing to install. Open `index.html` in a recent browser, or serve the folder:

```bash
python -m http.server 8765
```

The page works offline and sends no data anywhere. It follows your browser's language; use the button in the top bar to switch, or add `?lang=en` or `?lang=fr` to the URL.

## The projects

| Project | Purpose | Original stack | In the demo |
|---|---|---|---|
| **FOX_Soft** (main project) | Desktop application that describes, validates, archives and transfers a ship's complete fire-detection configuration | C#, .NET, WPF, MVVM | Topology, spreadsheet-style device editing, Cause & Effects editor, loop current calculation, pre-export checks, assisted import, real screenshots |
| **FoxBinVisualizer** | Decodes a binary file field by field and compares two files | C#, WPF | Decoding of a made-up format, differences, detection of a corrupted byte |
| **FoxFrameGenerator** | Builds, sends and decodes serial frames to test firmware | C#, WPF | Configurable envelope, deframer, merged multi-source stream on a virtual port |
| **Alarm log analyser** | Rates alarm ergonomics against EEMUA 191 and ISA 18.2 and replays the panel state | HTML, JavaScript | Point-in-time reconstruction, diagnosis, alarm floods, before/after comparison |
| **PhoenixConfigAnalizer** | Finds logic reused across a batch of configurations | C#, WPF | Canonical signatures on a fictional fleet |
| **FireDeck** | Fire-detection quotes from ship deck plans | C#, WPF, .NET 8 | Placement on an imaginary plan, bill of materials, CSV and SVG export |

## The internship in numbers

- About 67,000 lines of code delivered, including 48,000 for FOX_Soft.
- 1,255 automated tests passing on FOX_Soft at version 0.5.0.
- Four major FOX_Soft releases in ten weeks, from 0.2.0 to 0.5.0.
- AI-assisted development (Claude Code), framed by sprints, human validation, tests and cross-reviews.

## What is hidden

| Topic | In this demo |
|---|---|
| Source code | Not published. All the JavaScript was written for this repository. |
| Control panel file format | Replaced by a made-up "DEMO" format. |
| Integrity check | Public algorithms only. |
| Internal serial protocol | Replaced by a fictional protocol. Only Modbus RTU follows a standard. |
| Licensing, encryption, security audit | Not described. |
| Ships, plans, configurations and logs | Generated from scratch. |
| Power consumption figures and conversion tables | Demo values. |
| Internship report, documents and internal information | Not included. |

The screenshots in `assets/img/` show the real application, with synthetic test data.

## Structure

```
index.html            Entry point
assets/css/style.css  Styles, light and dark themes
assets/js/core.js     Router, helpers, public CRCs
assets/js/ce.js       Shared Cause & Effects grid
assets/js/*.js        One page per project
assets/img/           Screenshots of the real application
```

The C#/WPF prototype from the first week is still available in the Git history, up to commit `4b441d9`.

## Disclaimer

These simulations are only meant to illustrate the work done. They must not be used to configure or test a real fire-detection system. Marinelec, PHOENIX and FOX refer to a third-party company and products; all related rights remain with their owners.
