import { prisma } from "@/lib/prisma";

const DEFAULT_BUCKETS = [
  {
    name: "Needs Action",
    description:
      "Emails requiring a response, decision, or action from the user within 24-48 hours. Includes direct asks, approvals, scheduling requests, and time-sensitive items.",
    sortOrder: 0,
  },
  {
    name: "FYI",
    description:
      "Informational emails that are relevant but don't require a response. Updates from colleagues, shared documents, project status updates, announcements.",
    sortOrder: 1,
  },
  {
    name: "Newsletters",
    description:
      "Subscriptions, digests, marketing emails, content updates, and promotional content from brands or publications the user has subscribed to.",
    sortOrder: 2,
  },
  {
    name: "Notifications",
    description:
      "Automated messages from apps and services: GitHub notifications, calendar reminders, shipping updates, social media alerts, security alerts, two-factor codes.",
    sortOrder: 3,
  },
  {
    name: "Auto-Archive",
    description:
      "Low-value automated emails: receipts, order confirmations, password reset confirmations, unsubscribe confirmations, out-of-office replies, and other emails that can be safely archived.",
    sortOrder: 4,
  },
];

export async function seedDefaultBuckets(userId: string) {
  const existing = await prisma.bucket.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.bucket.createMany({
    data: DEFAULT_BUCKETS.map((b) => ({
      ...b,
      isDefault: true,
      userId,
    })),
  });
}

export { DEFAULT_BUCKETS };
