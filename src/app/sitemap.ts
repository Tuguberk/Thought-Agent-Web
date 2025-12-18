import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://thought-agent.com' // Should be env var

    // Get all blog posts
    let blogUrls: MetadataRoute.Sitemap = [];
    try {
        const posts = await prisma.blogPost.findMany({
            where: { published: true },
            select: { slug: true, updatedAt: true },
        })

        blogUrls = posts.map((post) => ({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: post.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }))
    } catch (e) {
        console.warn("Could not fetch blog posts for sitemap (likely during build). Returning static routes only.");
    }

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...blogUrls,
    ]
}
