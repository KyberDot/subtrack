import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") || "";
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = [
    `https://logo.clearbit.com/${clean}.com`,
    `https://www.google.com/s2/favicons?sz=128&domain=${clean}.com`,
    `https://icons.duckduckgo.com/ip3/${clean}.com.ico`,
  ];
  return NextResponse.json({ urls: candidates, primary: candidates[0] });
}
