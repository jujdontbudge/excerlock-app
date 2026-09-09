---
status: accepted
date: 2026-09-09
---

# 0006: Route web extraction by source type

## Decision

Prefer the shared agent-web CLI for known content URLs: Readability for articles and documentation, Crawl4AI for JavaScript pages, yt-dlp for video and subtitles, gallery-dl for social posts and images, and PyMuPDF for PDFs. Preserve search for discovery and citations, structured APIs when they fit better, and browser or ordinary fetch fallbacks. Verify completeness before treating extracted content as authoritative.

## Context

The user requested efficient, high-quality extraction across articles, social media, video, dynamic pages and PDFs. Isolated local benchmarks supported different tools for different source types; no tool reliably covered every case. The user selected this five-tool set. A shared wrapper and pinned dependencies were installed under `/Users/johansardar/.local/share/agent-web`, exposed through `/Users/johansardar/.local/bin/agent-web`. Smoke checks exercised all five routes, including media metadata; this was not proof of full coverage across social platforms.

## Consequences

A common entry point makes routing and retained outputs consistent without adding a broad MCP catalog. Readability can omit relevant page sections; social extractors can return partial posts, comments or metadata; native PDF extraction does not replace OCR for scans. Native subtitles are not automatically verified transcripts. Authentication, access restrictions and changing websites can still block retrieval. Do not silently export browser cookies, buy a fallback or claim that metadata proves a media download. The runtime and benchmark evidence are machine-local, not repository dependencies.

## References

- [Repository extraction instructions](../../AGENTS.md)
- Local operating guide: `/Users/johansardar/.local/share/agent-web/GUIDE.md`
- Benchmark report: `/Users/johansardar/Documents/Codex/2026-09-08/i/outputs/scraping-benchmark/REPORT.md`
