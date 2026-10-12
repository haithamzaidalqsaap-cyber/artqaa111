import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { collections } from "./firebase";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const STORE_PATH = isServerless
  ? resolve("/tmp", "store.json")
  : resolve(process.cwd(), "data/store.json");

export function parseSafeDate(v: any, fallback = new Date()): Date {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (v && typeof v.toDate === "function") {
    try {
      const d = v.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {}
  }
  if (v && typeof v === "object") {
    if (typeof v._seconds === "number") {
      const d = new Date(v._seconds * 1000 + (v._nanoseconds ? Math.round(v._nanoseconds / 1e6) : 0));
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof v.seconds === "number") {
      const d = new Date(v.seconds * 1000 + (v.nanoseconds ? Math.round(v.nanoseconds / 1e6) : 0));
      if (!isNaN(d.getTime())) return d;
    }
  }
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof v === "string" && v.trim().length > 0) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

// Persistent local + Firestore data store
class DataStore {
  members = new Map<string, any>();
  sessions = new Map<string, any>();
  authAttempts = new Map<string, any>();
  plans = new Map<string, any>();
  subscriptions = new Map<string, any>();
  deposits = new Map<string, any>();
  withdrawals = new Map<string, any>();
  activities = new Map<string, any>();
  settings = new Map<string, any>();
  taskDefinitions = new Map<string, any>();
  taskAssignments = new Map<string, any>();
  dailyCredits = new Map<string, any>();
  receiptUploads = new Map<string, any>();
  audits = new Map<string, any>();

  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initDefaults();
    this.loadFromLocalFile();
    this.syncFromFirestore().catch(() => {});
  }

  initDefaults() {
    // Default system settings
    this.settings.set("main", {
      id: "main",
      telegramUrl: "https://t.me/irtiqa_support",
      minHonorToWithdraw: 60,
      binanceAddress: "0x71C83e2840004185fe0D5FE87756f7C99F94a1d4",
      okxAddress: "0x39a164b38d3566144e59103e3a537f71B8497F87",
      depositsEnabled: true,
      fundingDescription: "إيداع USDT على شبكة Polygon للاشتراك في عضوية ارتقاء ذات العائد اليومي الثابت.",
      terms: "تخضع العضوية للمراجعة اليدوية والاعتماد الرسمي قبل تفعيل الأرباح اليومية.",
    });

    // Default investment plans
    const defaultPlans = [
      {
        id: "starter",
        name: "الباقة المجانية",
        description: "باقة مجانية للأعضاء الجدد بربح يومي 0.50 USDT (توثيق الحساب 4 USDT).",
        annualPriceCents: 0,
        dailyProfitCents: 50, // 0.50 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
      {
        id: "bronze",
        name: "الباقة البرونزية (25 USDT)",
        description: "عضوية سنوية بقيمة 25 USDT مع ربح يومي ثابت قدره 1.00 USDT.",
        annualPriceCents: 2500, // 25 USDT
        dailyProfitCents: 100, // 1.00 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
      {
        id: "silver",
        name: "الباقة الفضية (50 USDT)",
        description: "عضوية سنوية بقيمة 50 USDT مع ربح يومي ثابت قدره 2.00 USDT.",
        annualPriceCents: 5000, // 50 USDT
        dailyProfitCents: 200, // 2.00 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
      {
        id: "gold",
        name: "الباقة الذهبية (100 USDT)",
        description: "عضوية سنوية بقيمة 100 USDT مع ربح يومي ثابت قدره 4.00 USDT.",
        annualPriceCents: 10000, // 100 USDT
        dailyProfitCents: 400, // 4.00 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
      {
        id: "diamond",
        name: "الباقة الماسية (250 USDT)",
        description: "عضوية سنوية بقيمة 250 USDT مع ربح يومي ثابت قدره 9.00 USDT.",
        annualPriceCents: 25000, // 250 USDT
        dailyProfitCents: 900, // 9.00 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
      {
        id: "vip",
        name: "باقة كبار الشخصيات VIP (500 USDT)",
        description: "عضوية سنوية بقيمة 500 USDT مع ربح يومي ثابت قدره 18.00 USDT.",
        annualPriceCents: 50000, // 500 USDT
        dailyProfitCents: 1800, // 18.00 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
      {
        id: "elite",
        name: "باقة النخبة Elite (1000 USDT)",
        description: "أعلى مستويات العضوية السنوية بقيمة 1000 USDT مع ربح يومي ثابت قدره 36.00 USDT.",
        annualPriceCents: 100000, // 1000 USDT
        dailyProfitCents: 3600, // 36.00 USDT
        dailyTasks: 0,
        taskRewardCents: 0,
        configured: true,
        active: true,
      },
    ];

    for (const p of defaultPlans) {
      this.plans.set(p.id, p);
    }
  }

  loadFromLocalFile() {
    try {
      const candidates = [
        STORE_PATH,
        resolve(process.cwd(), "data/store.json"),
      ];
      for (const filePath of candidates) {
        if (existsSync(filePath)) {
          const raw = readFileSync(filePath, "utf-8");
          const data = JSON.parse(raw);
          if (data.members) {
            for (const [k, v] of Object.entries(data.members)) {
              const m: any = { ...(v as any) };
              const digits = String(m.phone || "").replace(/[^0-9]/g, "");
              if (digits.length >= 5) {
                m.memberId = digits.slice(-5);
              }
              m.createdAt = parseSafeDate(m.createdAt);
              this.members.set(k, m);
            }
          }
        if (data.sessions) for (const [k, v] of Object.entries(data.sessions)) this.sessions.set(k, v);
        if (data.plans) for (const [k, v] of Object.entries(data.plans)) this.plans.set(k, v);
        if (data.subscriptions) for (const [k, v] of Object.entries(data.subscriptions)) this.subscriptions.set(k, v);
        if (data.deposits) for (const [k, v] of Object.entries(data.deposits)) this.deposits.set(k, v);
        if (data.withdrawals) for (const [k, v] of Object.entries(data.withdrawals)) this.withdrawals.set(k, v);
        if (data.activities) for (const [k, v] of Object.entries(data.activities)) this.activities.set(k, v);
        if (data.settings) for (const [k, v] of Object.entries(data.settings)) this.settings.set(k, v);
        if (data.taskDefinitions) for (const [k, v] of Object.entries(data.taskDefinitions)) this.taskDefinitions.set(k, v);
        if (data.taskAssignments) for (const [k, v] of Object.entries(data.taskAssignments)) this.taskAssignments.set(k, v);
        break;
      }
    }
  } catch {}
}

  scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const dir = dirname(STORE_PATH);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const obj = {
          members: Object.fromEntries(this.members),
          sessions: Object.fromEntries(this.sessions),
          plans: Object.fromEntries(this.plans),
          subscriptions: Object.fromEntries(this.subscriptions),
          deposits: Object.fromEntries(this.deposits),
          withdrawals: Object.fromEntries(this.withdrawals),
          activities: Object.fromEntries(this.activities),
          settings: Object.fromEntries(this.settings),
          taskDefinitions: Object.fromEntries(this.taskDefinitions),
          taskAssignments: Object.fromEntries(this.taskAssignments),
        };
        writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), "utf-8");
      } catch {}
    }, 100);
  }

  async syncFromFirestore() {
    try {
      if (collections.settings) {
        const snap = await collections.settings.get().catch(() => null);
        if (snap) {
          snap.forEach((doc: any) => {
            this.settings.set(doc.id, { id: doc.id, ...doc.data() });
          });
        }
      }
      if (collections.plans) {
        const snap = await collections.plans.get().catch(() => null);
        if (snap) {
          snap.forEach((doc: any) => {
            const d = doc.data();
            const annualPriceCents = Number.isFinite(Number(d.annualPriceCents))
              ? Number(d.annualPriceCents)
              : Math.round((Number(d.annualPrice) || 0) * 100);
            const dailyProfitCents = Number.isFinite(Number(d.dailyProfitCents))
              ? Number(d.dailyProfitCents)
              : Math.round((Number(d.dailyProfit) || 0) * 100);

            this.plans.set(doc.id, {
              id: doc.id,
              name: d.name || "",
              description: d.description || "",
              annualPriceCents,
              dailyProfitCents,
              configured: d.configured ?? true,
              active: d.active ?? true,
            });
          });
        }
      }
      if (collections.users) {
        const snap = await collections.users.get().catch(() => null);
        if (snap) {
          snap.forEach((doc: any) => {
            const d = doc.data();
            const balanceCents = Number.isFinite(Number(d.balanceCents))
              ? Number(d.balanceCents)
              : Number.isFinite(Number(d.balance))
              ? Math.round(Number(d.balance) * 100)
              : 0;
            const earnedCents = Number.isFinite(Number(d.earnedCents))
              ? Number(d.earnedCents)
              : Number.isFinite(Number(d.totalEarned))
              ? Math.round(Number(d.totalEarned) * 100)
              : 0;
            const realBalanceCents = Number.isFinite(Number(d.realBalanceCents))
              ? Number(d.realBalanceCents)
              : balanceCents;
            const realEarnedCents = Number.isFinite(Number(d.realEarnedCents))
              ? Number(d.realEarnedCents)
              : earnedCents;

            this.members.set(doc.id, {
              id: doc.id,
              name: String(d.name || ""),
              phone: String(d.phone || ""),
              payoutAddress: d.payoutAddress ? String(d.payoutAddress) : null,
              passwordHash: String(d.passwordHash || ""),
              memberId: String(d.memberId || ""),
              referralCode: String(d.referralCode || ""),
              inviterId: d.inviterId ? String(d.inviterId) : null,
              role: d.role === "admin" ? "admin" : "member",
              honorPoints: Number(d.honorPoints) || 0,
              balanceCents,
              earnedCents,
              realBalanceCents,
              realEarnedCents,
              active: d.active !== false,
              createdAt: parseSafeDate(d.createdAt),
            });
          });
        }
      }
      if (collections.sessions) {
        const snap = await collections.sessions.get().catch(() => null);
        if (snap) {
          snap.forEach((doc: any) => {
            const d = doc.data();
            this.sessions.set(doc.id, {
              id: doc.id,
              tokenHash: d.tokenHash || doc.id,
              memberId: d.memberId,
              expiresAt: parseSafeDate(d.expiresAt, new Date(Date.now() + 7 * 86400000)),
              createdAt: parseSafeDate(d.createdAt),
            });
          });
        }
      }
    } catch {}
  }
}

const store = new DataStore();

function matchesFilter(item: any, where: any): boolean {
  if (!where || typeof where !== "object") return true;
  for (const [key, val] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(val)) {
      const orMatched = val.some((subWhere) => matchesFilter(item, subWhere));
      if (!orMatched) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(val)) {
      const andMatched = val.every((subWhere) => matchesFilter(item, subWhere));
      if (!andMatched) return false;
      continue;
    }
    if (val !== null && typeof val === "object" && !(val instanceof Date)) {
      const itemVal = item[key];
      const valObj = val as any;
      if ("in" in valObj && Array.isArray(valObj.in)) {
        if (!valObj.in.includes(itemVal)) return false;
      }
      if ("not" in valObj) {
        if (itemVal === valObj.not) return false;
      }
      if ("lt" in valObj) {
        const target = valObj.lt instanceof Date ? valObj.lt.getTime() : valObj.lt;
        const current = itemVal instanceof Date ? itemVal.getTime() : itemVal;
        if (!(current < target)) return false;
      }
      if ("lte" in valObj) {
        const target = valObj.lte instanceof Date ? valObj.lte.getTime() : valObj.lte;
        const current = itemVal instanceof Date ? itemVal.getTime() : itemVal;
        if (!(current <= target)) return false;
      }
      if ("gt" in valObj) {
        const target = valObj.gt instanceof Date ? valObj.gt.getTime() : valObj.gt;
        const current = itemVal instanceof Date ? itemVal.getTime() : itemVal;
        if (!(current > target)) return false;
      }
      if ("gte" in valObj) {
        const target = valObj.gte instanceof Date ? valObj.gte.getTime() : valObj.gte;
        const current = itemVal instanceof Date ? itemVal.getTime() : itemVal;
        if (!(current >= target)) return false;
      }
      continue;
    }

    if (item[key] !== val) return false;
  }
  return true;
}

function createModelHandler(map: Map<string, any>, firestoreCollectionName?: string) {
  return {
    findUnique: async ({ where }: { where: any }) => {
      for (const item of map.values()) {
        if (matchesFilter(item, where)) return { ...item };
      }
      return null;
    },
    findUniqueOrThrow: async ({ where }: { where: any }) => {
      for (const item of map.values()) {
        if (matchesFilter(item, where)) return { ...item };
      }
      throw new Error("Record not found");
    },
    findFirst: async ({ where, orderBy }: { where?: any; orderBy?: any } = {}) => {
      const items = Array.from(map.values()).filter((item) => matchesFilter(item, where));
      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] as [string, string];
        items.sort((a, b) => {
          const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
          const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
          return dir === "desc" ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
        });
      }
      return items[0] ? { ...items[0] } : null;
    },
    findMany: async ({ where, orderBy, take, skip }: { where?: any; orderBy?: any; take?: number; skip?: number } = {}) => {
      let items = Array.from(map.values()).filter((item) => matchesFilter(item, where));
      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] as [string, string];
        items.sort((a, b) => {
          const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
          const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
          return dir === "desc" ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
        });
      }
      if (skip) items = items.slice(skip);
      if (take) items = items.slice(0, take);
      return items.map((i) => ({ ...i }));
    },
    create: async ({ data }: { data: any }) => {
      const id = data.id || data.tokenHash || data.key || randomUUID();
      const record = {
        ...data,
        id,
        createdAt: data.createdAt || new Date(),
        startsAt: data.startsAt || new Date(),
      };
      map.set(id, record);
      store.scheduleSave();

      if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
        try {
          const serialized: any = {};
          for (const [k, v] of Object.entries(record)) {
            if (v instanceof Date) {
              serialized[k] = !isNaN(v.getTime()) ? v.toISOString() : new Date().toISOString();
            } else if (v !== undefined) {
              serialized[k] = v;
            }
          }
          await (collections as any)[firestoreCollectionName].doc(id).set(serialized).catch(() => {});
        } catch {}
      }
      return { ...record };
    },
    createMany: async ({ data }: { data: any[] }) => {
      for (const d of data) {
        const id = d.id || randomUUID();
        const record = { ...d, id, createdAt: d.createdAt || new Date() };
        map.set(id, record);
      }
      store.scheduleSave();
      return { count: data.length };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      let target: any = null;
      let targetKey: string | null = null;
      for (const [k, item] of map.entries()) {
        if (matchesFilter(item, where)) {
          target = item;
          targetKey = k;
          break;
        }
      }
      if (!target || !targetKey) throw new Error("Record to update not found");

      const updated = { ...target };
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && typeof v === "object" && "increment" in (v as any)) {
          updated[k] = (Number(updated[k]) || 0) + (v as any).increment;
        } else if (v !== null && typeof v === "object" && "decrement" in (v as any)) {
          updated[k] = (Number(updated[k]) || 0) - (v as any).decrement;
        } else {
          updated[k] = v;
        }
      }
      map.set(targetKey, updated);
      store.scheduleSave();

      if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
        try {
          const serialized: any = {};
          for (const [k, v] of Object.entries(updated)) {
            if (v instanceof Date) {
              serialized[k] = !isNaN(v.getTime()) ? v.toISOString() : new Date().toISOString();
            } else if (v !== undefined) {
              serialized[k] = v;
            }
          }
          await (collections as any)[firestoreCollectionName].doc(targetKey).set(serialized, { merge: true }).catch(() => {});
        } catch {}
      }
      return { ...updated };
    },
    delete: async ({ where }: { where: any }) => {
      for (const [k, item] of map.entries()) {
        if (matchesFilter(item, where)) {
          map.delete(k);
          store.scheduleSave();
          if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
            try { await (collections as any)[firestoreCollectionName].doc(k).delete().catch(() => {}); } catch {}
          }
          return { ...item };
        }
      }
      return {};
    },
    deleteMany: async ({ where }: { where?: any } = {}) => {
      let count = 0;
      for (const [k, item] of Array.from(map.entries())) {
        if (matchesFilter(item, where)) {
          map.delete(k);
          count++;
          if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
            try { await (collections as any)[firestoreCollectionName].doc(k).delete().catch(() => {}); } catch {}
          }
        }
      }
      if (count > 0) store.scheduleSave();
      return { count };
    },
    updateMany: async ({ where, data }: { where?: any; data: any } = {}) => {
      let count = 0;
      for (const [k, item] of Array.from(map.entries())) {
        if (matchesFilter(item, where)) {
          const updated = { ...item };
          for (const [prop, v] of Object.entries(data)) {
            if (v !== null && typeof v === "object" && "increment" in (v as any)) {
              updated[prop] = (Number(updated[prop]) || 0) + (v as any).increment;
            } else if (v !== null && typeof v === "object" && "decrement" in (v as any)) {
              updated[prop] = (Number(updated[prop]) || 0) - (v as any).decrement;
            } else {
              updated[prop] = v;
            }
          }
          map.set(k, updated);
          count++;
          if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
            try {
              const serialized: any = {};
              for (const [prop, v] of Object.entries(updated)) {
                if (v instanceof Date) {
                  serialized[prop] = !isNaN(v.getTime()) ? v.toISOString() : new Date().toISOString();
                } else if (v !== undefined) {
                  serialized[prop] = v;
                }
              }
              await (collections as any)[firestoreCollectionName].doc(k).set(serialized, { merge: true }).catch(() => {});
            } catch {}
          }
        }
      }
      if (count > 0) store.scheduleSave();
      return { count };
    },
    count: async ({ where }: { where?: any } = {}) => {
      return Array.from(map.values()).filter((item) => matchesFilter(item, where)).length;
    },
    aggregate: async ({ where, _sum }: { where?: any; _sum?: Record<string, boolean> } = {}) => {
      const items = Array.from(map.values()).filter((item) => matchesFilter(item, where));
      const sumResult: Record<string, number> = {};
      if (_sum) {
        for (const field of Object.keys(_sum)) {
          sumResult[field] = items.reduce((acc, curr) => acc + (Number(curr[field]) || 0), 0);
        }
      }
      return { _sum: sumResult };
    },
    upsert: async ({ where, create, update }: { where: any; create: any; update: any }) => {
      for (const [k, item] of map.entries()) {
        if (matchesFilter(item, where)) {
          const updated = { ...item, ...update };
          map.set(k, updated);
          store.scheduleSave();
          if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
            try { await (collections as any)[firestoreCollectionName].doc(k).set(updated, { merge: true }).catch(() => {}); } catch {}
          }
          return { ...updated };
        }
      }
      const id = create.id || create.key || where.id || where.key || randomUUID();
      const record = { ...create, id, createdAt: create.createdAt || new Date() };
      map.set(id, record);
      store.scheduleSave();
      if (firestoreCollectionName && (collections as any)[firestoreCollectionName]) {
        try { await (collections as any)[firestoreCollectionName].doc(id).set(record).catch(() => {}); } catch {}
      }
      return { ...record };
    },
  };
}

export const prisma: any = {
  member: createModelHandler(store.members, "users"),
  session: createModelHandler(store.sessions, "sessions"),
  authAttempt: createModelHandler(store.authAttempts),
  plan: createModelHandler(store.plans, "plans"),
  subscription: createModelHandler(store.subscriptions, "subscriptions"),
  deposit: createModelHandler(store.deposits, "deposits"),
  withdrawal: createModelHandler(store.withdrawals, "withdrawals"),
  activity: createModelHandler(store.activities, "activities"),
  setting: createModelHandler(store.settings, "settings"),
  taskDefinition: createModelHandler(store.taskDefinitions, "tasks"),
  taskAssignment: createModelHandler(store.taskAssignments, "taskAssignments"),
  dailyCredit: createModelHandler(store.dailyCredits),
  receiptUpload: createModelHandler(store.receiptUploads),
  audit: createModelHandler(store.audits),

  $transaction: async (cb: any) => {
    if (typeof cb === "function") {
      return cb(prisma);
    }
    if (Array.isArray(cb)) {
      return Promise.all(cb);
    }
    return cb;
  },

  $queryRaw: async () => [],
  $executeRaw: async () => 1,
};
