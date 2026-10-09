import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, setLogLevel } from "firebase/firestore";

try {
  setLogLevel("silent");
} catch {}
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma";
import { depositView, withdrawalView } from "./finance";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getFirebaseConfig() {
  const paths = [
    resolve(__dirname, "../../../../firebase-applet-config.json"),
    resolve(__dirname, "../../../firebase-applet-config.json"),
    resolve(process.cwd(), "firebase-applet-config.json"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf-8"));
      } catch (err) {
        console.warn("Failed parsing firebase config:", err);
      }
    }
  }
  return {
    projectId: "practical-axon-t77bw",
    firestoreDatabaseId: "irtiqa-platform",
  };
}

const firebaseConfig = getFirebaseConfig();

let app: any;
if (getApps().length === 0) {
  try {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      authDomain: firebaseConfig.authDomain,
    });
  } catch (e) {
    console.warn("Error initializing firebase app:", e);
  }
} else {
  app = getApp();
}

export const firestore = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : ({} as any);

const createCollectionWrapper = (colName: string) => ({
  doc: (id: string) => ({
    get: async () => {
      try {
        const snap = await getDoc(doc(firestore, colName, id));
        return {
          exists: snap.exists(),
          id: snap.id,
          data: () => snap.data(),
        };
      } catch {
        return { exists: false, id, data: () => null };
      }
    },
    set: async (data: any, options?: any) => {
      try {
        return await setDoc(doc(firestore, colName, id), data, options);
      } catch {
        return null;
      }
    },
  }),
  get: async () => {
    try {
      const snap = await getDocs(collection(firestore, colName));
      return {
        forEach: (fn: (d: any) => void) => {
          snap.forEach((d) => fn({ id: d.id, data: () => d.data() }));
        },
      };
    } catch {
      return { forEach: () => {} };
    }
  },
});

export const collections = {
  users: firestore ? createCollectionWrapper("users") : null,
  plans: firestore ? createCollectionWrapper("plans") : null,
  subscriptions: firestore ? createCollectionWrapper("subscriptions") : null,
  deposits: firestore ? createCollectionWrapper("deposits") : null,
  withdrawals: firestore ? createCollectionWrapper("withdrawals") : null,
  activities: firestore ? createCollectionWrapper("activities") : null,
  settings: firestore ? createCollectionWrapper("settings") : null,
  tasks: firestore ? createCollectionWrapper("tasks") : null,
  taskAssignments: firestore ? createCollectionWrapper("taskAssignments") : null,
  admins: firestore ? createCollectionWrapper("admins") : null,
  sessions: firestore ? createCollectionWrapper("sessions") : null,
};

// Seed default plans and settings and sync current data to Firestore
export async function ensureInitialFirebaseData() {
  if (!collections.settings || !collections.plans) return;
  try {
    const settingsDoc = await collections.settings.doc("main").get();
    if (!settingsDoc.exists) {
      await collections.settings.doc("main").set({
        telegramUrl: "https://t.me/irtiqa_support",
        binanceAddress: "0x71C83e2840004185fe0D5FE87756f7C99F94a1d4",
        okxAddress: "0x39a164b38d3566144e59103e3a537f71B8497F87",
        depositsEnabled: true,
        fundingDescription: "إيداع USDT على شبكة Polygon للاشتراك في عضوية ارتقاء ذات العائد اليومي الثابت.",
        terms: "تخضع العضوية للمراجعة اليدوية والاعتماد الرسمي قبل تفعيل الأرباح اليومية.",
        minimumWithdrawal: 2,
        currency: "USDT",
        network: "Polygon",
      });
    }

    const defaultPlans = [
      {
        id: "starter",
        name: "الباقة المجانية",
        description: "باقة مجانية للأعضاء الجدد بربح يومي 0.50 USDT (توثيق الحساب 4 USDT).",
        annualPrice: 0,
        dailyProfit: 0.50,
        active: true,
        configured: true,
      },
      {
        id: "bronze",
        name: "الباقة البرونزية (25 USDT)",
        description: "عضوية سنوية بقيمة 25 USDT مع ربح يومي ثابت قدره 1.00 USDT.",
        annualPrice: 25,
        dailyProfit: 1.0,
        active: true,
        configured: true,
      },
      {
        id: "silver",
        name: "الباقة الفضية (50 USDT)",
        description: "عضوية سنوية بقيمة 50 USDT مع ربح يومي ثابت قدره 2.00 USDT.",
        annualPrice: 50,
        dailyProfit: 2.0,
        active: true,
        configured: true,
      },
      {
        id: "gold",
        name: "الباقة الذهبية (100 USDT)",
        description: "عضوية سنوية بقيمة 100 USDT مع ربح يومي ثابت قدره 4.00 USDT.",
        annualPrice: 100,
        dailyProfit: 4.0,
        active: true,
        configured: true,
      },
      {
        id: "diamond",
        name: "الباقة الماسية (250 USDT)",
        description: "عضوية سنوية بقيمة 250 USDT مع ربح يومي ثابت قدره 9.00 USDT.",
        annualPrice: 250,
        dailyProfit: 9.0,
        active: true,
        configured: true,
      },
      {
        id: "vip",
        name: "باقة كبار الشخصيات VIP (500 USDT)",
        description: "عضوية سنوية بقيمة 500 USDT مع ربح يومي ثابت قدره 18.00 USDT.",
        annualPrice: 500,
        dailyProfit: 18.0,
        active: true,
        configured: true,
      },
      {
        id: "elite",
        name: "باقة النخبة Elite (1000 USDT)",
        description: "أعلى مستويات العضوية السنوية بقيمة 1000 USDT مع ربح يومي ثابت قدره 36.00 USDT.",
        annualPrice: 1000,
        dailyProfit: 36.0,
        active: true,
        configured: true,
      },
    ];

    for (const p of defaultPlans) {
      await collections.plans.doc(p.id).set(p, { merge: true });
    }
  } catch (err) {
    // Graceful fallback
  }
}
