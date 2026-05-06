import { NextRequest, NextResponse } from "next/server";

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(request: NextRequest) {
  if (!apiUrl) {
    return NextResponse.json({ message: "API URL is not configured" }, { status: 500 });
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "application/json";
  const body = await response.text();
  const proxiedResponse = new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    proxiedResponse.headers.set("set-cookie", setCookie);
  }

  return proxiedResponse;
}
