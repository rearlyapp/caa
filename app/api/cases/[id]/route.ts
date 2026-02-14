import { NextResponse } from "next/server"
import { getCaseById, updateCase, deleteCase } from "@/lib/store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const caseData = getCaseById(id)

  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  return NextResponse.json(caseData)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const updated = updateCase(id, body)

  if (!updated) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleted = deleteCase(id)

  if (!deleted) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
