import { NextResponse } from "next/server"
import { getCaseById, updateCase } from "@/lib/store"
import type { PanData, AadhaarData } from "@/lib/types"

// Mock extraction - simulates AI extraction results
// In production, this would call the Modal GPU endpoint
function mockPanExtraction(): PanData {
  return {
    name: "KISHORE SHEIK AHAMED M R",
    fathers_name: "MOHAMMED RAHAMATHULLA",
    date_of_birth: "15/08/1990",
    pan_number: "BQJPK6347Q",
  }
}

function mockAadhaarExtraction(): AadhaarData {
  return {
    name: "KISHORE SHEIK AHAMED M R",
    aadhaar_number: "8765 4321 0987",
    date_of_birth: "15/08/1990",
    gender: "MALE",
    address:
      "No 12, 3rd Cross Street, Anna Nagar, Chennai, Tamil Nadu - 600040",
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { caseId, directorIndex, documentType } = body

  if (!caseId || directorIndex === undefined || !documentType) {
    return NextResponse.json(
      { error: "Missing required fields: caseId, directorIndex, documentType" },
      { status: 400 }
    )
  }

  const caseData = getCaseById(caseId)
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  // Simulate processing delay (2s instead of real 12-18s)
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const directors = [...caseData.directors] as [typeof caseData.directors[0], typeof caseData.directors[1]]

  if (documentType === "pan") {
    directors[directorIndex].panData = mockPanExtraction()
  } else if (documentType === "aadhaar") {
    directors[directorIndex].aadhaarData = mockAadhaarExtraction()
  }

  // Update document status
  directors[directorIndex].documents = directors[directorIndex].documents.map(
    (doc) => {
      if (doc.type === documentType) {
        return { ...doc, status: "done" as const }
      }
      return doc
    }
  )

  updateCase(caseId, {
    directors,
    status: "reviewing",
  })

  return NextResponse.json({
    success: true,
    extractedData:
      documentType === "pan" ? mockPanExtraction() : mockAadhaarExtraction(),
  })
}
