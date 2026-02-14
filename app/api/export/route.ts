import { NextResponse } from "next/server"
import { getCaseById, updateCase } from "@/lib/store"

export async function POST(request: Request) {
  const body = await request.json()
  const { caseId } = body

  if (!caseId) {
    return NextResponse.json({ error: "caseId is required" }, { status: 400 })
  }

  const caseData = getCaseById(caseId)
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  // Simulate Excel generation delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Update case status to complete
  updateCase(caseId, { status: "complete" })

  // In production, this would generate a real .xlsx file using openpyxl
  // and return it as a blob. For MVP, we return a success response.
  return NextResponse.json({
    success: true,
    fileName: `${caseData.name.replace(/\s+/g, "_")}_Checklist_filled.xlsx`,
    message: "Excel file generated successfully",
    fieldsFilled: calculateFieldsFilled(caseData),
    totalFields: 32,
  })
}

function calculateFieldsFilled(caseData: ReturnType<typeof getCaseById>): number {
  if (!caseData) return 0
  let count = 0

  for (const director of caseData.directors) {
    if (director.panData?.name) count++
    if (director.panData?.fathers_name) count++
    if (director.panData?.date_of_birth) count++
    if (director.panData?.pan_number) count++
    if (director.aadhaarData?.aadhaar_number) count++
    if (director.aadhaarData?.address) count++
    if (director.placeOfBirth) count++
    if (director.occupation) count++
    if (director.education) count++
    if (director.email) count++
    if (director.mobile) count++
    if (director.dinNumber) count++
    if (director.sharesSubscribed) count++
    if (director.durationAtAddress) count++
  }

  if (caseData.companyInfo.officeEmail) count++
  if (caseData.companyInfo.officeMobile) count++
  if (caseData.companyInfo.authorizedShareCapital) count++
  if (caseData.companyInfo.paidUpShareCapital) count++
  if (caseData.professionalInfo.name) count++
  if (caseData.professionalInfo.membershipNo) count++
  if (caseData.professionalInfo.address) count++

  return count
}
