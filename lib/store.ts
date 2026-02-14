import { Case, createEmptyCase } from "./types"

// In-memory store for MVP (will be replaced with database)
const cases: Map<string, Case> = new Map()

// Seed with demo data
const demoCase = createEmptyCase("ABC Pvt Ltd")
demoCase.status = "reviewing"
demoCase.directors[0].panData = {
  name: "KISHORE SHEIK AHAMED M R",
  fathers_name: "MOHAMMED RAHAMATHULLA",
  date_of_birth: "15/08/1990",
  pan_number: "BQJPK6347Q",
}
demoCase.directors[0].aadhaarData = {
  name: "KISHORE SHEIK AHAMED M R",
  aadhaar_number: "8765 4321 0987",
  date_of_birth: "15/08/1990",
  gender: "MALE",
  address: "No 12, 3rd Cross Street, Anna Nagar, Chennai, Tamil Nadu - 600040",
}
demoCase.directors[0].documents = [
  {
    id: "doc-1",
    type: "pan",
    fileName: "pan.jpg",
    fileUrl: "/placeholder-pan.jpg",
    status: "done",
  },
  {
    id: "doc-2",
    type: "aadhaar",
    fileName: "aadhar.jpg",
    fileUrl: "/placeholder-aadhaar.jpg",
    status: "done",
  },
]
cases.set(demoCase.id, demoCase)

const demoCase2 = createEmptyCase("XYZ Technologies Pvt Ltd")
demoCase2.status = "draft"
cases.set(demoCase2.id, demoCase2)

const demoCase3 = createEmptyCase("GlobalTech Solutions Pvt Ltd")
demoCase3.status = "complete"
demoCase3.directors[0].validated = true
demoCase3.directors[1].validated = true
demoCase3.directors[0].panData = {
  name: "RAJESH KUMAR",
  fathers_name: "SURESH KUMAR",
  date_of_birth: "01/03/1985",
  pan_number: "ABCDE1234F",
}
demoCase3.directors[0].aadhaarData = {
  name: "RAJESH KUMAR",
  aadhaar_number: "1234 5678 9012",
  date_of_birth: "01/03/1985",
  gender: "MALE",
  address: "42 MG Road, Bengaluru, Karnataka - 560001",
}
cases.set(demoCase3.id, demoCase3)

export function getAllCases(): Case[] {
  return Array.from(cases.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getCaseById(id: string): Case | undefined {
  return cases.get(id)
}

export function createCase(name: string): Case {
  const newCase = createEmptyCase(name)
  cases.set(newCase.id, newCase)
  return newCase
}

export function updateCase(id: string, updates: Partial<Case>): Case | undefined {
  const existing = cases.get(id)
  if (!existing) return undefined
  const updated = { ...existing, ...updates }
  cases.set(id, updated)
  return updated
}

export function deleteCase(id: string): boolean {
  return cases.delete(id)
}
