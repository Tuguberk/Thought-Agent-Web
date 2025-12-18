import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const openai = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

const prisma = new PrismaClient();

// Schema for the blog post generation
const blogPostSchema = z.object({
    title: z.string().describe("The SEO-optimized title of the blog post"),
    slug: z.string().describe("A URL-friendly slug for the post"),
    summary: z.string().describe("A short, engaging summary for search results (approx 160 chars)"),
    content: z.string().describe("The full blog post content in Markdown format, with headings, bullet points, and code examples if relevant."),
    keywords: z.array(z.string()).describe("List of 5-8 SEO keywords related to the post"),
});

async function main() {
    const ideasPath = path.join(process.cwd(), "ideas.txt");

    if (!fs.existsSync(ideasPath)) {
        console.error("ideas.txt not found in project root.");
        process.exit(1);
    }

    const fileContent = fs.readFileSync(ideasPath, "utf-8");
    const topics = fileContent.split("\n").filter((line) => line.trim() !== "");

    console.log(`Found ${topics.length} topics to process.`);

    for (const topic of topics) {
        if (!topic.trim()) continue;

        const existingTitle = await prisma.blogPost.findFirst({
            where: { title: { contains: topic, mode: 'insensitive' } } // Simple check to avoid re-running widely
        });

        if (existingTitle) {
            console.log(`Skipping potential duplicate for topic: "${topic}"`);
            continue;
        }

        console.log(`Generating content for: "${topic}"...`);

        try {
            const prompt = `
          Write a comprehensive, SEO-optimized blog post about "${topic}".
          Target Audience: Knowledge workers, students, productivity enthusiasts.
          Tone: Professional, insightful, and practical.
          Context: This is for the "Thought Agent" website, an app for AI-assisted note taking and brainstorming.
          
          Requirements:
          - Use H2 and H3 headers for structure.
          - Include practical tips.
          - Mention "Thought Agent" subtly as a tool that can help.
          - Format in clean Markdown.
        `;

            const result = await generateObject({
                model: openai("gpt-4o"),
                schema: blogPostSchema,
                prompt,
            });

            const postData = result.object;

            // Check for duplicate slug
            let uniqueSlug = postData.slug;
            let counter = 1;
            while (await prisma.blogPost.findUnique({ where: { slug: uniqueSlug } })) {
                uniqueSlug = `${postData.slug}-${counter}`;
                counter++;
            }

            await prisma.blogPost.create({
                data: {
                    title: postData.title,
                    slug: uniqueSlug,
                    content: postData.content,
                    summary: postData.summary,
                    keywords: postData.keywords,
                    published: true,
                },
            });

            console.log(`✅ Created post: ${postData.title} (${uniqueSlug})`);

        } catch (error) {
            console.error(`❌ Failed to generate for "${topic}":`, error);
        }
    }

    console.log("Batch processing complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
