import { NextResponse } from "next/server"
import { getAllCases, createCase } from "@/lib/store"

export async function GET() {
  const cases = getAllCases()
  return NextResponse.json(cases)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Case name is required" }, { status: 400 })
  }

  const newCase = createCase(name.trim())
  return NextResponse.json(newCase, { status: 201 })
}
