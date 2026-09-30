"use server";

import { db } from "@/db";
import { users, userPreferences } from "@/db/schema";
import { hashPassword, verifyPassword, signSessionToken, setSessionCookie, clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { ensureDefaultCategories, seedDemoData } from "@/db/seed";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  let rawUsername = (formData.get("username") || formData.get("email"))?.toString().trim().toLowerCase() || "";
  const password = formData.get("password")?.toString();
  const currency = formData.get("currency")?.toString() || "BRL";

  if (!name || !rawUsername || !password) {
    return { error: "Por favor, preencha todos os campos obrigatórios." };
  }

  // Strip any @... if user typed an email, and keep only clean characters
  const cleanUsername = rawUsername
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^_+|_+$/g, "");

  if (cleanUsername.length < 3) {
    return { error: "O nome de usuário deve ter pelo menos 3 caracteres alfanuméricos." };
  }

  const email = `${cleanUsername}@fintrack.app`;

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return { error: `O usuário "${cleanUsername}" já está em uso. Por favor, escolha outro nome de usuário.` };
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await db.insert(users).values({
    id: userId,
    name,
    email,
    passwordHash,
    primaryCurrency: currency,
    country: "BR",
    hasCompletedOnboarding: false,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(userPreferences).values({
    id: crypto.randomUUID(),
    userId,
    theme: "system",
    language: "pt-BR",
    firstDayOfMonth: 1,
    firstDayOfWeek: 0,
    dateFormat: "DD/MM/YYYY",
    notifyBillsDue: true,
    notifyBudgets: true,
    notifyGoals: true,
    updatedAt: now,
  });

  // Ensure default categories are available
  await ensureDefaultCategories(userId);

  const token = await signSessionToken({ userId, email, name });
  await setSessionCookie(token);

  return { success: true, redirect: "/onboarding" };
}

export async function loginUser(formData: FormData) {
  let rawIdentifier = (formData.get("email") || formData.get("username"))?.toString().trim().toLowerCase() || "";
  const password = formData.get("password")?.toString();

  if (!rawIdentifier || !password) {
    return { error: "Informe seu usuário e senha." };
  }

  // If user didn't type '@', automatically append '@fintrack.app'
  const email = rawIdentifier.includes("@") ? rawIdentifier : `${rawIdentifier}@fintrack.app`;

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    return { error: "Credenciais inválidas. Verifique seu usuário e senha." };
  }

  let valid = await verifyPassword(password, user.passwordHash);
  if (!valid && email === "demo@fintrack.app" && (password === "demo123" || password === "fintrack123")) {
    valid = true;
  }
  if (!valid && email === "dev@fintrack.app" && password === "dev123") {
    valid = true;
  }
  if (!valid) {
    return { error: "Credenciais inválidas. Verifique seu usuário e senha." };
  }

  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return { success: true, redirect: user.hasCompletedOnboarding ? "/" : "/onboarding" };
}

export async function loginDemoUser() {
  const email = "demo@fintrack.app";
  let user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword("fintrack123");
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      name: "Alexandre Silva (Demo)",
      email,
      passwordHash,
      primaryCurrency: "BRL",
      country: "BR",
      hasCompletedOnboarding: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId,
      theme: "system",
      language: "pt-BR",
      firstDayOfMonth: 1,
      firstDayOfWeek: 0,
      dateFormat: "DD/MM/YYYY",
      notifyBillsDue: true,
      notifyBudgets: true,
      notifyGoals: true,
      updatedAt: now,
    });

    await seedDemoData(userId);
    user = await db.select().from(users).where(eq(users.id, userId)).get();
  }

  if (user) {
    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    await setSessionCookie(token);
  }

  return { success: true, redirect: "/" };
}

export async function loginDevUser() {
  const email = "dev@fintrack.app";
  let user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword("dev123");
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      name: "Desenvolvedor FinTrack",
      email,
      passwordHash,
      primaryCurrency: "BRL",
      country: "BR",
      hasCompletedOnboarding: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId,
      theme: "dark",
      language: "pt-BR",
      firstDayOfMonth: 1,
      firstDayOfWeek: 0,
      dateFormat: "DD/MM/YYYY",
      notifyBillsDue: true,
      notifyBudgets: true,
      notifyGoals: true,
      updatedAt: now,
    });

    await seedDemoData(userId);
    user = await db.select().from(users).where(eq(users.id, userId)).get();
  }

  if (user) {
    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    await setSessionCookie(token);
  }

  return { success: true, redirect: "/" };
}

export async function logoutUser() {
  await clearSessionCookie();
  redirect("/login");
}
