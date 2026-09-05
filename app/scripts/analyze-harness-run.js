#!/usr/bin/env node

const fs = require("node:fs");

function seconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(3)}s`;
}

function parseRuns(contents) {
  const runs = new Map();
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (line.trim() === "") continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}`);
    }
    if (record?.recordType === "run" && record.run?.id) {
      runs.set(record.run.id, { ...record.run, events: [] });
    } else if (record?.recordType === "event" && runs.has(record.runId)) {
      runs.get(record.runId).events.push(record.event);
    }
  }
  return [...runs.values()];
}

function signalLayers(events) {
  const seen = new Set();
  const layers = [];
  for (const event of events) {
    if (event?.type !== "signal") continue;
    const key = `${event.source}\0${event.track}`;
    if (!seen.has(key)) {
      seen.add(key);
      layers.push({ source: event.source, track: event.track });
    }
  }
  return layers;
}

function formatRun(run) {
  const lines = [
    `Run ${run.id} (${run.testId})`,
    `Build: ${run.buildCommit}`,
  ];
  if (typeof run.endedAtMs !== "number") {
    lines.push("Ended: run is incomplete (no end time)");
  } else {
    const duration = seconds(run.endedAtMs - run.startedAtMs);
    lines.push(
      run.endReason === "stopped"
        ? `Ended: stopped early after ${duration}`
        : run.endReason === "stranded"
          ? `Ended: stranded after ${duration} (end reconstructed, not observed)`
          : `Ended: timed out after ${duration}`,
    );
  }

  const events = Array.isArray(run.events) ? run.events : [];
  const markers = events.filter((event) => event?.type === "marker");
  const layers = signalLayers(events);
  lines.push("");
  if (markers.length === 0) {
    lines.push("No declared transitions recorded.");
    if (layers.length === 0) lines.push("No signal layers recorded.");
    return lines.join("\n");
  }
  if (layers.length === 0) {
    lines.push("No signal layers recorded; declared transitions have no responses.");
    for (const marker of markers) {
      lines.push(
        `Declared @ +${seconds(marker.atMs - run.startedAtMs)}: ${JSON.stringify(marker.label)}`,
      );
    }
    return lines.join("\n");
  }

  markers.forEach((marker, markerIndex) => {
    const nextMarkerAt = markers[markerIndex + 1]?.atMs ?? Infinity;
    lines.push(
      `Declared @ +${seconds(marker.atMs - run.startedAtMs)}: ${JSON.stringify(marker.label)}`,
    );
    for (const layer of layers) {
      const response = events.find(
        (event) =>
          event?.type === "signal" &&
          event.source === layer.source &&
          event.track === layer.track &&
          event.atMs >= marker.atMs &&
          event.atMs < nextMarkerAt,
      );
      if (response === undefined) {
        lines.push(
          `  ${layer.source} / ${layer.track}: never responded before the run ended`,
        );
      } else {
        lines.push(
          `  ${layer.source} / ${layer.track}: +${seconds(response.atMs - marker.atMs)} => ${JSON.stringify(response.payload)}`,
        );
      }
    }
    if (markerIndex < markers.length - 1) lines.push("");
  });
  return lines.join("\n");
}

function main(argv) {
  const file = argv[2];
  if (file === undefined) {
    process.stderr.write("Usage: node scripts/analyze-harness-run.js <export.jsonl>\n");
    process.exitCode = 1;
    return;
  }
  const runs = parseRuns(fs.readFileSync(file, "utf8"));
  process.stdout.write(
    runs.length === 0
      ? "No runs found.\n"
      : `${runs.map(formatRun).join("\n---\n")}\n`,
  );
}

if (require.main === module) main(process.argv);

module.exports = { formatRun, parseRuns };
