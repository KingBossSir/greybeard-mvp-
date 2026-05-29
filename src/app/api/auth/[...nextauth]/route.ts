import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "auth_route_disabled" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "auth_route_disabled" }, { status: 404 });
}
