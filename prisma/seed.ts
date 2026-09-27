import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "demo-admin@t-shoot.local";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Demo Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash("ChangeMe123!", 12),
        role: "GLOBAL_ADMIN",
      },
    });
    console.log(`Created demo admin: ${adminEmail} / ChangeMe123! — CHANGE THIS PASSWORD.`);
  } else {
    console.log("Demo admin already exists, skipping user creation.");
  }

  const categoryNames = [
    "Windows", "Active Directory", "Networking", "Printers", "Hardware",
    "Software", "Applications", "ITSM", "Security", "User Support",
    "Servers", "Cloud", "Banking Systems", "Mobile Devices",
    "Troubleshooting", "SOPs", "Quick Fixes", "Commands", "Escalations", "Vendor Procedures",
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = c.id;
  }

  async function tagIds(names: string[]) {
    const ids: string[] = [];
    for (const name of names) {
      const t = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
      ids.push(t.id);
    }
    return ids;
  }

  async function upsertDemoArticle(opts: {
    title: string;
    description: string;
    type: any;
    category: string;
    tags: string[];
    steps: any[];
  }) {
    const existing = await prisma.article.findFirst({ where: { title: opts.title, isDemo: true } });
    if (existing) return existing;

    const tIds = await tagIds(opts.tags);
    const article = await prisma.article.create({
      data: {
        title: opts.title,
        description: opts.description,
        type: opts.type,
        categoryId: categories[opts.category],
        authorId: admin!.id,
        status: "PUBLISHED",
        visibility: "PUBLIC_TO_TEAM",
        isDemo: true,
        publishedAt: new Date(),
        difficulty: "Beginner",
        estimatedTime: "10 minutes",
        tags: { create: tIds.map((tagId) => ({ tagId })) },
        steps: {
          create: opts.steps.map((s, i) => ({ order: i, ...s })),
        },
      },
    });
    await prisma.articleVersion.create({
      data: {
        articleId: article.id,
        versionNumber: 1,
        snapshot: JSON.stringify({ title: opts.title }),
        changeSummary: "Initial publish (seed data)",
        createdById: admin!.id,
      },
    });
    return article;
  }

  await upsertDemoArticle({
    title: "Network Printer Troubleshooting",
    description: 'Printer appears as "ICT Printer / 10.200.1.11" and won\'t print. Diagnose connectivity, spooler, and driver issues.',
    type: "TROUBLESHOOTING",
    category: "Printers",
    tags: ["printer", "spooler", "networking"],
    steps: [
      { type: "TEXT", title: "Check power and network cable", content: "Confirm the printer is powered on and connected to the network." },
      { type: "COMMAND", title: "Ping the printer", shell: "CMD", command: "ping 10.200.1.11", expectedResult: "The printer should respond to the ping." },
      { type: "DECISION", content: "Is the printer reachable?", decisionYesStepOrder: 2, decisionNoStepOrder: 3 },
      { type: "CHECKPOINT", content: "Reachable — continue to spooler troubleshooting." },
      { type: "TEXT", content: "Not reachable — check the printer's network cable, Wi-Fi connection, and power cycle it." },
      { type: "WARNING", warning: "Do not rename the shared printer on the print server unless you intend to change the shared printer name." },
    ],
  });

  await upsertDemoArticle({
    title: "Windows Account Lockout Troubleshooting",
    description: "A user's Windows domain account keeps locking out. Identify the source and resolve it.",
    type: "TROUBLESHOOTING",
    category: "Active Directory",
    tags: ["account lockout", "active directory", "4740"],
    steps: [
      { type: "COMMAND", title: "Check account status", shell: "PowerShell", command: "Get-ADUser username -Properties LockedOut, LastBadPasswordAttempt", expectedResult: "Shows whether the account is currently locked and the last bad attempt time." },
      { type: "TEXT", title: "Check domain controller Event ID 4740", content: "Search the security event log on domain controllers for Event ID 4740 to find the Caller Computer Name responsible for the lockout." },
      { type: "TEXT", content: "Check for saved credentials in Credential Manager, mapped drives, scheduled tasks, and old RDP sessions using the old password." },
      { type: "NOTE", notes: "This procedure applies to on-premises Active Directory domain-joined machines." },
    ],
  });

  await upsertDemoArticle({
    title: "Clearing a Stuck Print Queue",
    description: "A print job is stuck and blocking the queue for everyone.",
    type: "QUICK_FIX",
    category: "Printers",
    tags: ["printer", "spooler", "quick fix"],
    steps: [
      { type: "COMMAND", title: "Stop the Print Spooler service", shell: "PowerShell", command: "Stop-Service -Name Spooler -Force" },
      { type: "TEXT", title: "Clear the spool folder", content: "Delete all files inside C:\\Windows\\System32\\spool\\PRINTERS\\" },
      { type: "COMMAND", title: "Start the Print Spooler service", shell: "PowerShell", command: "Start-Service -Name Spooler" },
      { type: "CHECKPOINT", content: "Re-print a test document to confirm the queue is clear." },
    ],
  });

  await upsertDemoArticle({
    title: "Checking Windows Services",
    description: "Quickly check the status of a Windows service, filtered by name or account.",
    type: "COMMAND",
    category: "Commands",
    tags: ["powershell", "services", "windows"],
    steps: [
      {
        type: "COMMAND",
        title: "List services running under a specific account",
        shell: "PowerShell",
        command: `Get-CimInstance Win32_Service |\n  Where-Object {$_.StartName -like "*username*"} |\n  Select-Object Name, DisplayName, State, StartMode, StartName`,
        expectedResult: "Returns all services configured to run under an account matching the given username.",
      },
    ],
  });

  await upsertDemoArticle({
    title: "Checking Active Directory Account Status",
    description: "Reference commands for checking whether an AD account is locked, disabled, or expired.",
    type: "COMMAND",
    category: "Active Directory",
    tags: ["active directory", "powershell"],
    steps: [
      { type: "COMMAND", title: "Full account status", shell: "PowerShell", command: "Get-ADUser username -Properties LockedOut, Enabled, PasswordExpired, AccountExpirationDate" },
      { type: "COMMAND", title: "Unlock an account", shell: "PowerShell", command: "Unlock-ADAccount -Identity username" },
    ],
  });

  await upsertDemoArticle({
    title: "Windows 11 In-Place Upgrade",
    description: "Standard SOP for upgrading a domain-joined Windows 10 machine to Windows 11 in place.",
    type: "SOP",
    category: "Windows",
    tags: ["windows 11", "upgrade", "sop"],
    steps: [
      { type: "TEXT", title: "Confirm hardware compatibility", content: "Verify TPM 2.0, Secure Boot capability, and supported CPU." },
      { type: "TEXT", title: "Back up user data", content: "Confirm OneDrive/profile redirection is current, or take a manual backup of the user profile." },
      { type: "TEXT", title: "Run the upgrade", content: "Launch the Windows 11 installation media or use Windows Update, and follow the prompts." },
      { type: "CHECKPOINT", content: "Confirm the machine boots, domain login works, and key line-of-business apps launch correctly." },
    ],
  });

  await upsertDemoArticle({
    title: "Network Connectivity Troubleshooting",
    description: "General first-response checklist for 'no network access' reports.",
    type: "CHECKLIST",
    category: "Networking",
    tags: ["networking", "checklist"],
    steps: [
      { type: "TEXT", content: "Check physical cable / Wi-Fi connection." },
      { type: "COMMAND", title: "Check IP configuration", shell: "CMD", command: "ipconfig /all" },
      { type: "COMMAND", title: "Test DNS resolution", shell: "CMD", command: "nslookup google.com" },
      { type: "COMMAND", title: "Test gateway connectivity", shell: "CMD", command: "ping <default gateway>" },
      { type: "TEXT", content: "If all else fails, release/renew the IP and restart the network adapter." },
    ],
  });

  await upsertDemoArticle({
    title: "PowerShell Command Reference",
    description: "A running list of frequently used PowerShell one-liners for IT support.",
    type: "COMMAND",
    category: "Commands",
    tags: ["powershell", "reference"],
    steps: [
      { type: "COMMAND", title: "List locked-out AD accounts", shell: "PowerShell", command: "Search-ADAccount -LockedOut" },
      { type: "COMMAND", title: "Get local admin group members", shell: "PowerShell", command: 'Get-LocalGroupMember -Group "Administrators"' },
      { type: "COMMAND", title: "Restart a remote computer", shell: "PowerShell", command: "Restart-Computer -ComputerName HOSTNAME -Force" },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
