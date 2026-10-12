import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import * as V from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { HttpError, input } from "../lib/http";
import { endSession, hashPassword, normalizePhone, rateLimit, startSession, verifyPassword } from "../lib/auth";
import { userView, safeIso } from "../lib/platform";
import { collections } from "../lib/firebase";

const router: IRouter = Router();

router.get("/auth/session", (req, res) => {
  res.json(V.GetSessionResponse.parse({user: req.member ? userView(req.member) : null}));
});

router.post("/auth/register", rateLimit, async (req, res): Promise<void> => {
  const data = input(V.RegisterBody, req.body);
  const phone = normalizePhone(data.phone);
  const verificationToken = typeof req.body?.verificationToken === "string" ? req.body.verificationToken : undefined;

  // WhatsApp verification removed as requested
  // Registration proceeds directly with valid name, phone, password and referral code

  const name = data.name.trim();
  if (name.length < 2) throw new HttpError(400, "يرجى إدخال الاسم الكامل.");
  const passwordHash = await hashPassword(data.password);
  
  const member = await prisma.$transaction(async (tx: any) => {
    try {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(748291)`;
    } catch {
      // ignore lock errors in mock mode
    }

    const referralCode = data.referralCode.trim().toLowerCase();
    const totalMembers = await tx.member.count().catch(() => 0);
    const isFirstMember = totalMembers === 0;

    let inviterId: string | null = null;
    let role = "member";
    let honorPoints = 0;

    if (isFirstMember) {
      role = "admin";
      honorPoints = 100;
    } else {
      if (!/^[a-z0-9]{6}$/.test(referralCode)) {
        throw new HttpError(400, "يجب أن يتكوّن رمز الدعوة من 6 أحرف أو أرقام.");
      }
      const inviter = await tx.member.findUnique({where: {referralCode}});
      if (!inviter?.active) {
        throw new HttpError(400, "كود الدعوة غير صالح أو حساب صاحب الدعوة موقوف.");
      }
      inviterId = inviter.id;
    }

    if (await tx.member.findUnique({where: {phone}})) {
      throw new HttpError(409, "تعذر إنشاء الحساب بهذا الرقم. جرّب تسجيل الدخول.");
    }

    const digits = phone.replace(/[^0-9]/g, "");
    const base = digits.length >= 5 ? digits.slice(-5) : digits.padStart(5, "0");
    let memberId = base;
    let suffix = 1;
    while (await tx.member.findUnique({where: {memberId}})) memberId = `${base}-${suffix++}`;

    let newCode = randomBytes(4).toString("hex").slice(0, 6);
    while (await tx.member.findUnique({where: {referralCode: newCode}})) newCode = randomBytes(4).toString("hex").slice(0, 6);

    const created = await tx.member.create({
      data: {
        name,
        phone,
        passwordHash,
        memberId,
        referralCode: newCode,
        inviterId,
        role,
        honorPoints,
        balanceCents: 0,
        earnedCents: 0,
        realBalanceCents: 0,
        realEarnedCents: 0,
        payoutAddress: null,
        active: true,
        createdAt: new Date(),
      },
    });

    await tx.activity.create({
      data: {
        memberId: created.id,
        mode: "live",
        kind: "account",
        title: role === "admin"
          ? "مرحباً بك في ارتقاء — تم إنشاء حساب المسؤول الإداري"
          : "مرحباً بك في ارتقاء — تم إنشاء حسابك",
      },
    });

    if (collections.users) {
      await collections.users.doc(created.id).set({
        id: created.id,
        name: created.name,
        phone: created.phone,
        memberId: created.memberId,
        role: created.role,
        honorPoints: created.honorPoints,
        createdAt: safeIso(created.createdAt),
      }).catch(() => {});
    }

    return created;
  });

  await startSession(req, res, member.id);
  res.json(V.RegisterResponse.parse({user: userView(member)}));
});

router.post("/auth/login", rateLimit, async (req, res): Promise<void> => {
  const data = input(V.LoginBody, req.body);
  const phone = normalizePhone(data.phone);
  const phoneWithoutZero = phone.startsWith("0") ? phone.slice(1) : phone;
  const phoneLast10 = phone.slice(-10);

  let member = await prisma.member.findFirst({
    where: {
      OR: [
        { phone },
        { phone: data.phone.trim() },
        { phone: `+${phoneWithoutZero}` },
        { phone: `0${phoneWithoutZero}` },
        { phone: phoneWithoutZero },
      ],
    },
  });

  if (!member) {
    const allMembers = await prisma.member.findMany();
    member = allMembers.find((m: any) => {
      const p = String(m.phone || "").replace(/[^0-9]/g, "");
      const searchP = phone.replace(/[^0-9]/g, "");
      return p === searchP || (phoneLast10.length >= 8 && p.endsWith(phoneLast10)) || (p.length >= 8 && searchP.endsWith(p.slice(-8)));
    }) || null;
  }

  const valid = await verifyPassword(data.password, member?.passwordHash);
  if (!member || !valid || !member.active) {
    throw new HttpError(401, "بيانات الدخول غير صحيحة أو الحساب غير متاح.");
  } else if (member) {
    const digits = String(member.phone || "").replace(/[^0-9]/g, "");
    if (digits.length >= 5 && member.memberId !== digits.slice(-5)) {
      member = await prisma.member.update({
        where: { id: member.id },
        data: { memberId: digits.slice(-5) },
      });
    }
  }

  await startSession(req, res, member.id);
  res.json(V.LoginResponse.parse({user: userView(member)}));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await endSession(req, res);
  res.json(V.LogoutResponse.parse({message: "تم تسجيل الخروج."}));
});

export default router;
