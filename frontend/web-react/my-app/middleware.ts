// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // ⚠️ Tạm thời tắt kiểm tra quyền admin
  // if (url.pathname.startsWith("/administrator")) {
  //   const role = req.cookies.get("role")?.value;
  //   if (role !== "admin") {
  //     url.pathname = "/signin";
  //     return NextResponse.redirect(url);
  //   }
  // }

  return NextResponse.next();
}
