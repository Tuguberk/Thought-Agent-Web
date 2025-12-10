const BASE_URL = process.env.REPROCESS_BASE_URL || "http://localhost:3001";

async function fetchJson(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    throw new Error(`${options?.method || "GET"} ${path} failed: ${res.status}`);
  }
  return res.json();
}

async function main() {
  const notes = await fetchJson("/api/notes");
  console.log(`Found ${notes.length} notes`);
  for (const note of notes) {
    if (note.kind && note.kind !== "entry") {
      console.log(`Skipping ${note.title || note.id} (${note.kind})`);
      continue;
    }
    const detail = await fetchJson(`/api/notes/${note.id}`);
    await fetchJson(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: detail.content,
        title: detail.title,
      }),
    });
    console.log(`Reprocessed ${detail.title || note.id}`);
  }
  console.log("Reprocessing complete.");
}

main().catch((err) => {
  console.error("Reprocessing failed", err);
  process.exitCode = 1;
});
