import "dotenv/config";
import prisma from "../src/lib/prisma";
import { processNote } from "../src/lib/agent";

async function main() {
  const notes = await prisma.note.findMany({
    where: { kind: "entry" },
    select: { id: true, title: true, userId: true },
  });

  console.log(`Reprocessing ${notes.length} notes...`);

  for (const note of notes) {
    console.log(`→ Processing ${note.title || note.id}`);
    await processNote(note.id, note.userId);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Reprocessing failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
