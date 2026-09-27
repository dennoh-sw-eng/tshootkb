import { prisma } from "./prisma";

/**
 * Creates an immutable snapshot of the article (with its steps) as a new
 * version row, and bumps the article's currentVersion counter. Called on
 * publish and on any save of a meaningful edit to an already-published
 * article. Existing versions are never modified or deleted.
 */
export async function createVersionSnapshot(
  articleId: string,
  userId: string,
  changeSummary?: string
) {
  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    include: { steps: { orderBy: { order: "asc" } }, tags: { include: { tag: true } } },
  });

  const versionNumber = article.currentVersion;

  await prisma.$transaction([
    prisma.articleVersion.create({
      data: {
        articleId,
        versionNumber,
        snapshot: JSON.stringify({
          title: article.title,
          description: article.description,
          type: article.type,
          status: article.status,
          visibility: article.visibility,
          priority: article.priority,
          difficulty: article.difficulty,
          audience: article.audience,
          estimatedTime: article.estimatedTime,
          tags: article.tags.map((t) => t.tag.name),
          steps: article.steps,
        }),
        changeSummary: changeSummary ?? null,
        createdById: userId,
      },
    }),
    prisma.article.update({
      where: { id: articleId },
      data: { currentVersion: { increment: 1 } },
    }),
  ]);

  return versionNumber;
}
