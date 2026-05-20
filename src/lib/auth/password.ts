import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validateEmail(email: string): string | null {
  const t = email.trim().toLowerCase();
  if (!t || t.length > 254) return "请输入有效邮箱。";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "邮箱格式不正确。";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "密码至少 8 位。";
  if (password.length > 128) return "密码过长。";
  return null;
}
