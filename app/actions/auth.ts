"use server";

import { verifySession } from "@/lib/auth/dal";
import {
  defaultRouteForRole,
  invitableRolesFor,
  type Role,
} from "@/lib/auth/roles";
import { createSession, deleteSession } from "@/lib/auth/session";
import {
  consumeRegistrationToken,
  createRegistrationToken,
  createUser,
  deleteRegistrationToken,
  deleteUser,
  getRegistrationToken,
  getUserById,
  getUserByIdentifier,
  usernameOrEmailExists,
  verifyPassword,
} from "@/lib/auth/users";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "");

  if (!identifier || !password) {
    return { error: "Please enter your username/email and password." };
  }

  const user = await getUserByIdentifier(identifier);
  if (!user) {
    return { error: "Invalid credentials." };
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { error: "Invalid credentials." };
  }

  await createSession({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  redirect(redirectTo || defaultRouteForRole(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export type RegisterState = { error?: string; success?: boolean } | undefined;

export async function registerWithToken(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const token = String(formData.get("token") || "");
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    return { error: "Missing registration token." };
  }
  if (!username || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const regToken = await getRegistrationToken(token);
  if (!regToken) {
    return { error: "This registration link is invalid." };
  }
  if (regToken.used_at) {
    return { error: "This registration link has already been used." };
  }

  const exists = await usernameOrEmailExists(username, email);
  if (exists) {
    return { error: "Username or email is already taken." };
  }

  const user = await createUser({
    username,
    email,
    password,
    role: regToken.role as Role,
  });

  const consumed = await consumeRegistrationToken(token, user.id);
  if (!consumed) {
    return {
      error:
        "This registration link has already been used. Please ask for a new one.",
    };
  }

  await createSession({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  redirect(defaultRouteForRole(user.role));
}

export type GenerateLinkState = { error?: string; link?: string } | undefined;

export async function generateRegistrationLink(
  _prevState: GenerateLinkState,
  formData: FormData,
): Promise<GenerateLinkState> {
  const session = await verifySession();
  const allowedRoles = invitableRolesFor(session.role);
  if (allowedRoles.length === 0) {
    return { error: "You are not allowed to invite new accounts." };
  }

  const role = String(formData.get("role") || "") as Role;
  if (!allowedRoles.includes(role)) {
    return { error: "Please select a valid role." };
  }

  const regToken = await createRegistrationToken(role, session.userId);
  return { link: `/register/${regToken.token}` };
}

export type RemoveLinkState = { error?: string; success?: boolean } | undefined;

export async function removeRegistrationLink(
  _prevState: RemoveLinkState,
  formData: FormData,
): Promise<RemoveLinkState> {
  const session = await verifySession();
  if (invitableRolesFor(session.role).length === 0) {
    return { error: "You are not allowed to remove invitations." };
  }

  const id = Number(formData.get("id"));
  if (!id || Number.isNaN(id)) {
    return { error: "Invalid link." };
  }

  const removed = await deleteRegistrationToken(id);
  if (!removed) {
    return {
      error: "This link could not be removed (it may already be used).",
    };
  }

  revalidatePath("/admin/accounts");
  return { success: true };
}

export type RemoveUserState = { error?: string; success?: boolean } | undefined;

export async function removeUser(
  _prevState: RemoveUserState,
  formData: FormData,
): Promise<RemoveUserState> {
  const session = await verifySession();
  const removableRoles = invitableRolesFor(session.role);
  if (removableRoles.length === 0) {
    return { error: "You are not allowed to remove accounts." };
  }

  const id = Number(formData.get("id"));
  if (!id || Number.isNaN(id)) {
    return { error: "Invalid account." };
  }

  if (id === session.userId) {
    return { error: "You cannot remove your own account." };
  }

  const target = await getUserById(id);
  if (!target || !removableRoles.includes(target.role)) {
    return { error: "You are not allowed to remove this account." };
  }

  const removed = await deleteUser(id);
  if (!removed) {
    return { error: "This account could not be removed." };
  }

  revalidatePath("/admin/accounts");
  return { success: true };
}
